import { renderizarCitas } from './dashboard.js';
import { obtenerFechaLocal, formatearFechaCorta } from './utils.js';

// ==========================================
// 🔗 VINCULACIÓN CON GOOGLE CALENDAR
// ==========================================
async function vincularGoogleCalendar() {
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

async function verificarEstadoGoogle() {
    const { data: { session } } = await fisioNet.auth.getSession();
    const btnTexto = document.getElementById('textoVinculacion');
    const btnVincular = document.getElementById('btnVincularGoogle');

    if (session && session.provider_token) {
        localStorage.setItem('google_provider_token', session.provider_token);
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

// Ejecutar verificación al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
    verificarEstadoGoogle();
});

// ============================================================================
// 🔄 FASE 1: OPERACIONES GOOGLE CALENDAR (CREAR, EDITAR, ELIMINAR)
// ============================================================================

// 1. CREAR CITA EN GOOGLE CALENDAR Y GUARDAR GOOGLE_EVENT_ID
const sincronizarConGoogleCalendar = async (cita, nombrePaciente, esSolicitud = false) => {
    try {
        const { data: { session } } = await fisioNet.auth.getSession();
        let token = session?.provider_token || localStorage.getItem('google_provider_token');

        if (!token) {
            console.warn("⚠️ No hay token de Google Calendar activo.");
            return null;
        }

        let horaInicio = cita.hora_inicio_cita || cita.hora_cita || "00:00:00";
        if (horaInicio.length === 5) horaInicio += ":00";

        const fechaStr = cita.fecha || cita.fecha_cita;
        const fechaHoraInicioStr = `${fechaStr}T${horaInicio}`;

        // Calculamos +30 minutos para el término de la consulta
        const fechaFinObj = new Date(`${fechaStr}T${horaInicio}`);
        fechaFinObj.setMinutes(fechaFinObj.getMinutes() + 30);

        const hFin = String(fechaFinObj.getHours()).padStart(2, '0');
        const mFin = String(fechaFinObj.getMinutes()).padStart(2, '0');
        const fechaHoraFinStr = `${fechaStr}T${hFin}:${mFin}:00`;

        const eventoGoogle = {
            summary: `🩺 Cita FisioCid: ${nombrePaciente}`,
            description: `Modalidad: ${cita.modalidad || 'CONSULTORIO'}\nPaciente: ${nombrePaciente}\nGestionado desde FisioCid App.`,
            start: { dateTime: fechaHoraInicioStr, timeZone: 'America/Mexico_City' },
            end: { dateTime: fechaHoraFinStr, timeZone: 'America/Mexico_City' },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 30 },
                    { method: 'popup', minutes: 10 }
                ]
            }
        };

        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventoGoogle)
        });

        if (!response.ok) {
            const errData = await response.json();
            console.error("❌ Error al sincronizar con Google Calendar:", errData);
            return null;
        }

        const dataGoogle = await response.json();

        // 🔑 Guardamos el ID de Google devuelto en Supabase
        if (dataGoogle.id) {
            const idRegistro = cita.id_cita || cita.id;
            const tablaDestino = esSolicitud ? 'solicitudes_citas' : 'agenda_maestra';
            const columnaId = esSolicitud ? 'id' : 'id_cita';

            const { error: errorUpdate } = await fisioNet
                .from(tablaDestino)
                .update({ google_event_id: dataGoogle.id })
                .eq(columnaId, idRegistro);

            if (errorUpdate) {
                console.error("❌ Error al guardar google_event_id en BD:", errorUpdate.message);
            } else {
                console.log("✨ ¡Cita sincronizada y google_event_id almacenado con éxito! ID:", dataGoogle.id);
            }

            return dataGoogle.id;
        }
    } catch (error) {
        console.error("❌ Error de red con Google Calendar:", error);
        return null;
    }
};

// 2. ACTUALIZAR CITA EN GOOGLE CALENDAR CUANDO REAGENDAS DESDE FISIOCID
const actualizarCitaEnGoogle = async (googleEventId, nuevaFecha, nuevaHoraInicio, nombrePaciente, modalidad = 'CONSULTORIO') => {
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
            console.log("🔄 Cita actualizada en Google Calendar correctamente.");
        } else {
            console.error("❌ Error al actualizar en Google Calendar:", await response.json());
        }
    } catch (error) {
        console.error("❌ Error al intentar editar evento de Google:", error);
    }
};

// 3. CANCELAR / ELIMINAR CITA DE GOOGLE CALENDAR
const cancelarCitaEnGoogle = async (googleEventId) => {
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

// ==========================================
// 📅 GESTIÓN DE AGENDA MAESTRA
// ==========================================
async function cargarAgenda(modo = 'semana', botonPresionado = null) {
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

    // --- 1. PREPARAMOS CONSULTA DE CITAS OFICIALES ---
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

    // --- 2. PREPARAMOS CONSULTA DEL "LIMBO" ---
    let querySol = fisioNet
        .from('solicitudes_citas')
        .select('*')
        .eq('estado', 'CONFIRMADO') 
        .eq('id_clinica_solicitada', clinicaId)
        .eq('id_profesional_solicitado', user.id);

    // --- 3. APLICAMOS FILTROS DE FECHAS A AMBAS ---
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

    // --- 4. EJECUTAMOS AMBAS EN PARALELO ---
    const [resCitas, resSol] = await Promise.all([queryCitas, querySol]);

    if (resCitas.error) {
        console.error("❌ Error al cargar agenda oficial:", resCitas.error.message);
        return;
    }

    // --- 5. DISFRAZAMOS A LOS PROSPECTOS PARA LA VISTA ---
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

    // --- 6. UNIMOS Y ORDENAMOS POR FECHA Y HORA ---
    let agendaCompleta = [...(resCitas.data || []), ...citasProspectos];
    
    agendaCompleta.sort((a, b) => {
        if (a.fecha === b.fecha) {
            return (a.hora_inicio_cita || '').localeCompare(b.hora_inicio_cita || '');
        }
        return (a.fecha || '').localeCompare(b.fecha || '');
    });

    // --- 7. RESUMEN EN MODO DÍA ---
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
                <span style="background: #f1f5f9; color: #475569; padding: 5px 12px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">📊 TOTAL: ${total}</span>
                <span style="background: #dcfce7; color: #15803d; padding: 5px 12px; border-radius: 8px; border: 1px solid #bbf7d0; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">✅ ATENDIDOS: ${atendidos}</span>
                <span style="background: #fefce8; color: #a16207; padding: 5px 12px; border-radius: 8px; border: 1px solid #fef08a; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">⏳ PENDIENTES: ${pendientes}</span>
                <span style="background: #ffedd5; color: #c2410c; padding: 5px 12px; border-radius: 8px; border: 1px solid #fed7aa; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">🔄 REAGENDAR: ${reagendados}</span>
                <span style="background: #fee2e2; color: #b91c1c; padding: 5px 12px; border-radius: 8px; border: 1px solid #fecaca; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">❌ CANCELADOS: ${cancelados}</span>
                <span style="background: #f3f4f6; color: #6b7280; padding: 5px 12px; border-radius: 8px; border: 1px solid #d1d5db; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">👻 FALTARON: ${noLlegaron}</span>
            </div>
        `;
    }

    // --- 8. MANDAMOS A RENDERIZAR EN DOM ---
    renderizarCitas(agendaCompleta, modo);
}

// ==========================================
// 🔄 CAMBIO DE ESTATUS DE CITA
// ==========================================
// ==========================================
// 🔄 CAMBIO DE ESTATUS DE CITA
// ==========================================
async function cambiarEstatusCita(idCita, nuevoEstatus, googleEventId) {
    try {
        const datosActualizar = { 
            estatus: nuevoEstatus,
            estado: nuevoEstatus // 👈 Sincronizamos 'estado' por si tu consulta de disponibilidad lee esta columna
        };

        // Si la cita se cancela, liberamos bloques y referencias de hora
        if (nuevoEstatus === 'CANCELADO' || nuevoEstatus === 'CANCELADA') {
            datosActualizar.inicio_bloqueo = null;
            datosActualizar.fin_bloqueo = null;
        }

        const { error } = await fisioNet
            .from('agenda_maestra')
            .update(datosActualizar)
            .eq('id_cita', idCita);

        if (error) throw error;

        // Si la cita fue cancelada y tiene id de Google Calendar, eliminarla
        if ((nuevoEstatus === 'CANCELADO' || nuevoEstatus === 'CANCELADA') && googleEventId) {
            await cancelarCitaEnGoogle(googleEventId);
        }

        // Recargar vista actual de la agenda inmediatamente
        const modoActual = document.querySelector('.btn-filtro.active')?.dataset.modo || 'semana';
        await cargarAgenda(modoActual);

    } catch (err) {
        console.error("❌ Error al cambiar estatus de la cita:", err);
    }
}

// ==========================================
// 🚀 EXPOSICIÓN GLOBAL
// ==========================================
window.actualizarAgenda = cargarAgenda; 
window.vincularGoogleCalendar = vincularGoogleCalendar;
window.sincronizarConGoogleCalendar = sincronizarConGoogleCalendar;
window.actualizarCitaEnGoogle = actualizarCitaEnGoogle;
window.cancelarCitaEnGoogle = cancelarCitaEnGoogle;
window.cambiarEstatusCita = cambiarEstatusCita;
window.cargarAgenda = cargarAgenda;