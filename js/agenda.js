import { renderizarCitas } from './dashboard.js';
import { obtenerFechaLocal } from './utils.js';

// ==========================================
// 🔗 VINCULACIÓN Y SUSCRIPCIÓN GOOGLE CALENDAR
// ==========================================
export async function vincularGoogleCalendar() {
    try {
        const { error } = await fisioNet.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.href,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                },
                scopes: 'https://www.googleapis.com/auth/calendar.events'
            }
        });

        if (error) {
            console.error("❌ Error al iniciar vinculación con Google:", error.message);
            alert("No se pudo iniciar sesión con Google. Inténtalo de nuevo.");
        }
    } catch (err) {
        console.error("❌ Error inesperado en vinculación:", err);
    }
}

export async function suscribirWebhookGoogle(token) {
    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        const clinicaId = localStorage.getItem('id_clinica_activa');

        if (!user || !clinicaId) return;

        const channelId = `fisiocid-channel-${user.id}-${Date.now()}`;
        const webhookUrl = `https://wboknacojtrfehlwswhh.supabase.co/functions/v1/sync-google-calendar`;

        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/watch', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: channelId,
                type: 'web_hook',
                address: webhookUrl
            })
        });

        if (response.ok) {
            const watchResult = await response.json();
            await fisioNet.from('google_calendar_watch').upsert({
                id_profesional: user.id,
                id_clinica: clinicaId,
                channel_id: watchResult.id,
                resource_id: watchResult.resourceId,
                expiration: parseInt(watchResult.expiration)
            }, { onConflict: 'channel_id' });

            console.log("⚡ Webhook de tiempo real de Google Calendar suscrito exitosamente.");
        }
    } catch (err) {
        console.warn("⚠️ No se pudo registrar la suscripción del Webhook de Google:", err);
    }
}

export async function verificarEstadoGoogle() {
    const { data: { session } } = await fisioNet.auth.getSession();
    const btnTexto = document.getElementById('textoVinculacion');
    const btnVincular = document.getElementById('btnVincularGoogle');

    if (session && session.provider_token) {
        localStorage.setItem('google_provider_token', session.provider_token);
        await suscribirWebhookGoogle(session.provider_token);
    }

    const tokenActivo = session?.provider_token || localStorage.getItem('google_provider_token');

    if (tokenActivo) {
        if (btnTexto) btnTexto.innerText = "Calendar Vinculado ✅";
        if (btnVincular) {
            btnVincular.style.borderColor = "#34A853";
            btnVincular.style.background = "#f0fdf4";
        }
    }
}

// ============================================================================
// 🔄 OPERACIONES GOOGLE CALENDAR (CREAR, EDITAR, ELIMINAR)
// ============================================================================

// agenda.js
export async function sincronizarConGoogleCalendar(citaObj, nombrePaciente, esExpress = false) {
    try {
        // 1. Obtener token de Google de la sesión o localStorage
        let googleAccessToken = localStorage.getItem('google_access_token');
        const { data: { session } } = await fisioNet.auth.getSession();

        if (session && session.provider_token) {
            googleAccessToken = session.provider_token;
            localStorage.setItem('google_access_token', googleAccessToken);
        }

        if (!googleAccessToken) {
            console.warn("⚠️ No hay token de Google disponible. Omitiendo sync.");
            return;
        }

        // 2. Obtener intervalo_cita de la base de datos si no viene en citaObj
        let duracionCita = citaObj.intervalo_cita;

        if (!duracionCita) {
            const { data: perfil } = await fisioNet
                .from('perfiles_profesionales')
                .select('intervalo_cita')
                .eq('id', citaObj.id_profesional)
                .maybeSingle();

            duracionCita = perfil?.intervalo_cita || 30;
        }

        // 3. Formatear la hora de inicio base (HH:MM:00)
        const horaInicioLimpia = citaObj.hora_inicio_cita.length === 5 
            ? `${citaObj.hora_inicio_cita}:00` 
            : citaObj.hora_inicio_cita;

        const fechaHoraBase = new Date(`${citaObj.fecha}T${horaInicioLimpia}`);

        // 4. Calcular tiempos considerando traslado si es a domicilio
        const esDomicilio = (citaObj.modalidad === 'DOMICILIO');
        const minTraslado = esDomicilio ? 30 : 0;

        // Hora de inicio en Google (30 min antes si es a domicilio)
        const fechaHoraInicioGoogle = new Date(fechaHoraBase.getTime() - (minTraslado * 60 * 1000));

        // Hora de fin en Google (duración de la cita + 30 min después si es a domicilio)
        const fechaHoraFinGoogle = new Date(fechaHoraBase.getTime() + ((duracionCita + minTraslado) * 60 * 1000));

        // Formateadores a ISO local
        const formatearISO = (fechaObj) => {
            const a = fechaObj.getFullYear();
            const m = String(fechaObj.getMonth() + 1).padStart(2, '0');
            const d = String(fechaObj.getDate()).padStart(2, '0');
            const h = String(fechaObj.getHours()).padStart(2, '0');
            const min = String(fechaObj.getMinutes()).padStart(2, '0');
            return `${a}-${m}-${d}T${h}:${min}:00`;
        };

        const startStr = formatearISO(fechaHoraInicioGoogle);
        const endStr = formatearISO(fechaHoraFinGoogle);

        // 5. Armar el payload del evento
        const descripcionServicio = esDomicilio 
            ? `🏡 SERVICIO A DOMICILIO (Incluye 30 min previos y posteriores de traslado)\nPaciente: ${nombrePaciente}\nGestionado desde FisioCid App.`
            : `🏥 CONSULTA EN CLINICA\nPaciente: ${nombrePaciente}\nGestionado desde FisioCid App.`;

        const evento = {
            summary: `${esExpress ? '⚡ [EXPRÉS] ' : ''}Cita: ${nombrePaciente}`,
            description: descripcionServicio,
            transparency: 'opaque', // Bloquea el espacio como OCUPADO
            start: {
                dateTime: startStr,
                timeZone: 'America/Mexico_City'
            },
            end: {
                dateTime: endStr,
                timeZone: 'America/Mexico_City'
            }
        };

        // 6. Enviar a Google Calendar
        const respuesta = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${googleAccessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(evento)
        });

        if (!respuesta.ok) {
            const errData = await respuesta.json();
            throw new Error(errData.error?.message || 'Error al crear evento en Google Calendar');
        }

        const data = await respuesta.json();
        console.log("✅ Evento sincronizado dinámicamente en Google Calendar:", data.id);
        return data;

    } catch (err) {
        console.error("❌ Error al sincronizar con Google Calendar:", err);
    }
}

export const actualizarCitaEnGoogle = async (googleEventId, nuevaFecha, nuevaHoraInicio, nombrePaciente, modalidad = 'CONSULTORIO') => {
    try {
        if (!googleEventId) return;

        const { data: { session } } = await fisioNet.auth.getSession();
        let token = session?.provider_token || localStorage.getItem('google_provider_token');

        if (!token) return;

        let horaInicio = nuevaHoraInicio.length === 5 ? `${nuevaHoraInicio}:00` : nuevaHoraInicio;
        const fechaHoraInicioStr = `${nuevaFecha}T${horaInicio}`;

        const fechaFinObj = new Date(`${nuevaFecha}T${horaInicio}`);
        fechaFinObj.setMinutes(fechaFinObj.getMinutes() + 30);

        const hFin = String(fechaFinObj.getHours()).padStart(2, '0');
        const mFin = String(fechaFinObj.getMinutes()).padStart(2, '0');
        const fechaHoraFinStr = `${nuevaFecha}T${hFin}:${mFin}:00`;

        const eventoPatch = {
            summary: `🩺 Cita FisioCid: ${nombrePaciente}`,
            description: `Modalidad: ${modalidad}\nPaciente: ${nombrePaciente}\nGestionado desde FisioCid App.`,
            start: { dateTime: fechaHoraInicioStr, timeZone: 'America/Mexico_City' },
            end: { dateTime: fechaHoraFinStr, timeZone: 'America/Mexico_City' }
        };

        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventoPatch)
        });

        if (response.ok) {
            console.log("🔄 Cita actualizada en Google Calendar.");
        } else {
            console.error("❌ Error al actualizar en Google Calendar:", await response.json());
        }
    } catch (error) {
        console.error("❌ Error al intentar editar evento de Google:", error);
    }
};

export const cancelarCitaEnGoogle = async (googleEventId) => {
    try {
        if (!googleEventId) return;

        const { data: { session } } = await fisioNet.auth.getSession();
        let token = session?.provider_token || localStorage.getItem('google_provider_token');

        if (!token) return;

        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok || response.status === 410) {
            console.log("🗑️ Cita eliminada de Google Calendar.");
        } else {
            console.error("❌ Error al eliminar evento en Google Calendar:", await response.json());
        }
    } catch (error) {
        console.error("❌ Error de red al intentar eliminar evento de Google:", error);
    }
};

// agenda.js
export async function reconectarGoogleCalendar() {
    const { error } = await fisioNet.auth.signInWithOAuth({
        provider: 'google',
        options: {
            scopes: 'https://www.googleapis.com/auth/calendar.events',
            redirectTo: window.location.href,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent'
            }
        }
    });
    if (error) console.error("Error al reconectar Google:", error);
}
// ==========================================
// 📅 GESTIÓN DE AGENDA MAESTRA
// ==========================================
export async function cargarAgenda(modo = 'semana', botonPresionado = null) {
    const tituloElemento = document.getElementById('tituloAgenda');
    let fechaInput = document.getElementById('filtroFechaAgenda')?.value;

    if (!fechaInput) {
        fechaInput = obtenerFechaLocal();
        if (document.getElementById('filtroFechaAgenda')) {
            document.getElementById('filtroFechaAgenda').value = fechaInput;
        }
    }

    if (botonPresionado) {
        document.querySelectorAll('.btn-filtro').forEach(btn => btn.classList.remove('active'));
        botonPresionado.classList.add('active');
    }

    const { data: { user } } = await fisioNet.auth.getUser();
    const clinicaId = localStorage.getItem('id_clinica_activa');

    if (!clinicaId) {
        localStorage.clear();
        window.location.href = 'login.html';
        return;
    }

    if (!user) return;

    // --- 1. CONSULTA CITAS OFICIALES ---
    let queryCitas = fisioNet
        .from('agenda_maestra')
        .select(`
            id_cita, 
            fecha, 
            hora_inicio_cita, 
            modalidad, 
            estatus,
            pago_status,
            monto_total,
            google_event_id,
            pacientes_maestros (id, nombre, apellido_paterno, apellido_materno, curp)
        `)
        .eq('id_profesional', user.id)
        .eq('id_clinica', clinicaId);

    // --- 2. CONSULTA SOLICITUDES EN SALA ---
    let querySol = fisioNet
        .from('solicitudes_citas')
        .select('*')
        .eq('estado', 'CONFIRMADO')
        .eq('id_clinica_solicitada', clinicaId)
        .eq('id_profesional_solicitado', user.id);

    // --- 3. FILTROS DE FECHA ---
    if (modo === 'dia') {
        queryCitas = queryCitas.eq('fecha', fechaInput);
        querySol = querySol.eq('fecha_cita', fechaInput);
    } else {
        const [a, m, d] = fechaInput.split('-').map(Number);
        const fInicioObj = new Date(a, m - 1, d);
        const fFinObj = new Date(a, m - 1, d);
        fFinObj.setDate(fFinObj.getDate() + 5);

        const fechaInicioStr = fInicioObj.toISOString().split('T')[0];
        const fechaFinStr = fFinObj.toISOString().split('T')[0];

        const f1 = fInicioObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
        const f2 = fFinObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

        if (tituloElemento) {
            tituloElemento.innerText = `PRÓXIMOS DÍAS: ${f1.toUpperCase()} AL ${f2.toUpperCase()}`;
        }

        queryCitas = queryCitas.gte('fecha', fechaInicioStr).lte('fecha', fechaFinStr);
        querySol = querySol.gte('fecha_cita', fechaInicioStr).lte('fecha_cita', fechaFinStr);
    }

    const [resCitas, resSol] = await Promise.all([queryCitas, querySol]);

    if (resCitas.error) {
        console.error("❌ Error al cargar agenda oficial:", resCitas.error.message);
        return;
    }

    const citasProspectos = (resSol.data || []).map(sol => ({
        id_cita: sol.id,
        es_prospecto: true,
        fecha: sol.fecha_cita,
        hora_inicio_cita: sol.hora_cita || '00:00:00',
        modalidad: 'SALA DE ESPERA',
        estatus: 'PENDIENTE',
        estado_cita: 'PROSPECTO',
        pago_status: 'PENDIENTE',
        google_event_id: sol.google_event_id || null,
        pacientes_maestros: {
            id: 'LIMBO',
            nombre: sol.nombre,
            apellido_paterno: sol.apellido_p,
            apellido_materno: sol.apellido_m ? `(${sol.apellido_m})` : '(EXPRÉS)',
            curp: null
        }
    }));

    let agendaCompleta = [...(resCitas.data || []), ...citasProspectos];

    agendaCompleta.sort((a, b) => {
        if (a.fecha === b.fecha) {
            return (a.hora_inicio_cita || '').localeCompare(b.hora_inicio_cita || '');
        }
        return (a.fecha || '').localeCompare(b.fecha || '');
    });

    if (modo === 'dia' && tituloElemento) {
        const total = agendaCompleta.length;
        const atendidos = agendaCompleta.filter(c => c.estatus === 'COMPLETADO' || c.estatus === 'ATENDIENDO').length;
        const pendientes = agendaCompleta.filter(c => c.estatus === 'PENDIENTE').length;
        const cancelados = agendaCompleta.filter(c => c.estatus === 'CANCELADO' || c.estatus === 'CANCELADA').length;
        const reagendados = agendaCompleta.filter(c => c.estatus === 'REAGENDADO').length;
        const noLlegaron = agendaCompleta.filter(c => c.estatus === 'NO_ASISTIO' || c.estatus === 'FALTO').length;

        const [a, m, d] = fechaInput.split('-').map(Number);
        const fechaObjParaTitulo = new Date(a, m - 1, d);
        const fechaBonita = fechaObjParaTitulo.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' }).toUpperCase();

        tituloElemento.innerHTML = `
            <div style="margin-bottom: 12px; font-size: 1.2rem;">CITAS DEL ${fechaBonita}</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; font-size: 0.75rem; font-weight: 800; font-family: sans-serif;">
                <span style="background: #f1f5f9; color: #475569; padding: 5px 12px; border-radius: 8px; border: 1px solid #e2e8f0;">📊 TOTAL: ${total}</span>
                <span style="background: #dcfce7; color: #15803d; padding: 5px 12px; border-radius: 8px; border: 1px solid #bbf7d0;">✅ ATENDIDOS: ${atendidos}</span>
                <span style="background: #fefce8; color: #a16207; padding: 5px 12px; border-radius: 8px; border: 1px solid #fef08a;">⏳ PENDIENTES: ${pendientes}</span>
                <span style="background: #ffedd5; color: #c2410c; padding: 5px 12px; border-radius: 8px; border: 1px solid #fed7aa;">🔄 REAGENDAR: ${reagendados}</span>
                <span style="background: #fee2e2; color: #b91c1c; padding: 5px 12px; border-radius: 8px; border: 1px solid #fecaca;">❌ CANCELADOS: ${cancelados}</span>
                <span style="background: #f3f4f6; color: #6b7280; padding: 5px 12px; border-radius: 8px; border: 1px solid #d1d5db;">👻 FALTARON: ${noLlegaron}</span>
            </div>
        `;
    }

    renderizarCitas(agendaCompleta, modo);
}

// Inicialización de escuchas de Google al cargar
window.addEventListener('DOMContentLoaded', () => {
    verificarEstadoGoogle();
});

// Exposición global
window.actualizarAgenda = cargarAgenda;
window.vincularGoogleCalendar = vincularGoogleCalendar;
window.sincronizarConGoogleCalendar = sincronizarConGoogleCalendar;
window.actualizarCitaEnGoogle = actualizarCitaEnGoogle;
window.cancelarCitaEnGoogle = cancelarCitaEnGoogle;
window.cargarAgenda = cargarAgenda;
window.reconectarGoogleCalendar = reconectarGoogleCalendar;