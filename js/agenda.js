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

        if (!user || !clinicaId || !token) return;

        // 1. Generar un Channel ID 100% único usando timestamp
        const channelId = `fisiocid-channel-${user.id}-${Date.now()}`;
        const webhookUrl = `https://wboknacojtrfehlwswhh.supabase.co/functions/v1/sync-google-calendar`;

        console.log("📡 Solicitando nuevo canal a Google API:", channelId);

        // 2. Registrar el Webhook directo en Google Calendar API
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

            // 3. Eliminar canales antiguos en la base de datos para este profesional y clínica
            await fisioNet
                .from('google_calendar_watch')
                .delete()
                .eq('id_profesional', user.id)
                .eq('id_clinica', clinicaId);

            // 4. Insertar el nuevo canal activo y limpio
            const { error: errInsert } = await fisioNet
                .from('google_calendar_watch')
                .insert({
                    id_profesional: user.id,
                    id_clinica: clinicaId,
                    channel_id: watchResult.id,
                    resource_id: watchResult.resourceId,
                    expiration: parseInt(watchResult.expiration)
                });

            if (errInsert) {
                console.error("❌ Error guardando el canal en Supabase:", errInsert);
            } else {
                console.log("⚡ Webhook de tiempo real de Google Calendar registrado y guardado exitosamente.");
            }

        } else {
            const errGoogle = await response.json();
            console.warn("⚠️ Google rechazó la creación del Webhook:", errGoogle);
        }
    } catch (err) {
        console.warn("⚠️ No se pudo registrar la suscripción del Webhook de Google:", err);
    }
}

export async function verificarEstadoGoogle() {
    const { data: { session } } = await fisioNet.auth.getSession();
    const btnTexto = document.getElementById('textoVinculacion');
    const btnVincular = document.getElementById('btnVincularGoogle');

    let tokenGoogle = session?.provider_token;

    // 1. Si viene en el HASH de la URL tras la redirección de Google OAuth
    if (!tokenGoogle && window.location.hash) {
        const params = new URLSearchParams(window.location.hash.replace('#', '?'));
        tokenGoogle = params.get('provider_token') || params.get('access_token');
    }

    // 2. Fallback a localStorage si ya se había autenticado antes
    if (!tokenGoogle) {
        tokenGoogle = localStorage.getItem('google_access_token');
    }

    // 3. Guardado seguro del refresh token en la base de datos
    if (session?.provider_refresh_token && session?.user?.id) {
        try {
            await fisioNet.from('perfiles_profesionales')
                .update({ google_refresh_token: session.provider_refresh_token })
                .eq('id', session.user.id);
        } catch (errDb) {
            console.warn("⚠️ Omitiendo guardado de google_refresh_token en BD:", errDb);
        }
    }

    // 4. Si contamos con un token válido, suscribir Webhook y pintar botón en verde
    if (tokenGoogle) {
        localStorage.setItem('google_access_token', tokenGoogle);

        // Invocar suscripción al Webhook pasando el token activo
        await suscribirWebhookGoogle(tokenGoogle);

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

export async function sincronizarConGoogleCalendar(citaObj, nombrePaciente, esExpress = false) {
    try {
        const { data: { session } } = await fisioNet.auth.getSession();

        if (!citaObj.id_profesional && session?.user?.id) {
            citaObj.id_profesional = session.user.id;
        }

        console.log("⚡ Sincronizando con Google Calendar mediante servidor...");

        const response = await fetch("https://wboknacojtrfehlwswhh.supabase.co/functions/v1/agendar-cita", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({ citaObj, nombrePaciente, esExpress })
        });

        const result = await response.json();

        if (result.success) {
            console.log("✅ Evento sincronizado en Google Calendar desde la Edge Function.");
            return result;
        } else {
            console.warn("⚠️ No se pudo sincronizar en Google Calendar:", result);
            return null;
        }
    } catch (err) {
        console.error("❌ Error llamando a Edge Function agendar-cita:", err);
    }
}

export const actualizarCitaEnGoogle = async (googleEventId, nuevaFecha, nuevaHoraInicio, nombrePaciente, modalidad = 'CONSULTORIO') => {
    try {
        if (!googleEventId) return;

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

        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`;
        const response = await fetchGoogleCalendar(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventoPatch)
        });

        if (response && response.ok) {
            console.log("🔄 Cita actualizada en Google Calendar.");
        } else if (response) {
            console.error("❌ Error al actualizar en Google Calendar:", await response.json());
        }
    } catch (error) {
        console.error("❌ Error al intentar editar evento de Google:", error);
    }
};

async function obtenerAccessTokenValido(forzarRefresh = false) {
    if (forzarRefresh) {
        console.log("🔄 Renovando token a través de backend...");
        try {
            const { data: { user } } = await fisioNet.auth.getUser();
            if (!user) return null;

            const { data: perfil } = await fisioNet
                .from('perfiles_profesionales')
                .select('google_refresh_token')
                .eq('id', user.id)
                .single();

            if (!perfil?.google_refresh_token) {
                marcarBotonReconexion();
                return null;
            }

            const res = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: "707370691590-ol8ia8cola1u9kg3k7qd1il848bljbh2.apps.googleusercontent.com",
                    refresh_token: perfil.google_refresh_token,
                    grant_type: "refresh_token"
                })
            });

            if (res.ok) {
                const tokenData = await res.json();
                const nuevoToken = tokenData.access_token;
                localStorage.setItem('google_access_token', nuevoToken);
                return nuevoToken;
            } else {
                marcarBotonReconexion();
                return null;
            }
        } catch (e) {
            console.warn("⚠️ Error renovando token:", e);
            marcarBotonReconexion();
            return null;
        }
    }

    if (window.location.hash) {
        const params = new URLSearchParams(window.location.hash.replace('#', '?'));
        const tokenHash = params.get('provider_token') || params.get('access_token');
        if (tokenHash) {
            localStorage.setItem('google_access_token', tokenHash);
            return tokenHash;
        }
    }

    const { data: { session } } = await fisioNet.auth.getSession();
    if (session?.provider_token) {
        localStorage.setItem('google_access_token', session.provider_token);
        return session.provider_token;
    }

    return localStorage.getItem('google_access_token');
}

export async function cancelarCitaEnGoogle(idCita) {
    try {
        let tokenGoogle = await obtenerAccessTokenValido();
        const eventId = localStorage.getItem(`gcal_event_${idCita}`);

        if (!tokenGoogle || !eventId) return;

        let res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${tokenGoogle}` }
        });

        if (res.status === 401) {
            console.log("🔄 Token expirado. Renovando automáticamente...");
            const { data } = await fisioNet.auth.refreshSession();
            const nuevoToken = data?.session?.provider_token;

            if (nuevoToken) {
                localStorage.setItem('google_access_token', nuevoToken);
                res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${nuevoToken}` }
                });
            }
        }

        if (res.ok || res.status === 204) {
            console.log("✅ Cita eliminada de Google Calendar en segundo plano.");
            localStorage.removeItem(`gcal_event_${idCita}`);
        }
    } catch (error) {
        console.error("Error al cancelar cita en Google Calendar:", error);
    }
}

export async function eliminarEventoGoogleCalendar(googleEventId) {
    try {
        if (!googleEventId) return;

        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`;
        const respuesta = await fetchGoogleCalendar(url, { method: 'DELETE' });

        if (!respuesta) return;

        if (respuesta.ok || respuesta.status === 410 || respuesta.status === 204) {
            console.log("🗑️ Evento eliminado exitosamente de Google Calendar.");
        } else {
            const errData = await respuesta.json();
            console.error("❌ Error al eliminar evento de Google Calendar:", errData);
        }
    } catch (err) {
        console.error("❌ Error en petición DELETE a Google Calendar:", err);
    }
}

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

async function fetchGoogleCalendar(url, opciones = {}) {
    let token = await obtenerAccessTokenValido(false);

    if (!token) {
        console.warn("⚠️ Sin token activo de Google Calendar. Se requiere reconexión manual.");
        marcarBotonReconexion();
        return null;
    }

    opciones.headers = {
        ...(opciones.headers || {}),
        'Authorization': `Bearer ${token}`
    };

    let respuesta = await fetch(url, opciones);

    if (respuesta.status === 401) {
        console.warn("⚠️ Token de Google expirado (401). Reintentando...");
        const nuevoToken = await obtenerAccessTokenValido(true);

        if (nuevoToken) {
            opciones.headers['Authorization'] = `Bearer ${nuevoToken}`;
            respuesta = await fetch(url, opciones);
        } else {
            console.warn("⚠️ No se pudo renovar token de Google automáticamente.");
            marcarBotonReconexion();
        }
    }

    return respuesta;
}

function marcarBotonReconexion() {
    localStorage.removeItem('google_access_token');

    const btnTexto = document.getElementById('textoVinculacion');
    const btnVincular = document.getElementById('btnVincularGoogle');
    if (btnTexto) btnTexto.innerText = "Reconectar Calendar ⚠️";
    if (btnVincular) {
        btnVincular.style.borderColor = "#ea580c";
        btnVincular.style.background = "#fff7ed";
    }
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
        .eq('id_clinica', clinicaId)
        .neq('estatus', 'CANCELADO');

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

export async function manejarCambioEstatusCita(idCita, nuevoEstatus, citaObj) {
    try {
        const estatusLimpio = (nuevoEstatus || '').toUpperCase();

        if (estatusLimpio.includes('CANCELAD')) {
            const nombrePaciente = citaObj?.pacientes_maestros?.nombre || 'este paciente';
            const confirmacion = confirm(`⚠️ Se cambiará el estado a CANCELADO y se eliminará la cita de Google Calendar para ${nombrePaciente}.\n\n¿Estás seguro de que deseas eliminarla?`);

            if (!confirmacion) {
                if (typeof cargarAgenda === 'function') await cargarAgenda();
                return false;
            }

            const eventId = citaObj?.google_event_id;
            if (eventId) {
                await eliminarEventoGoogleCalendar(eventId);
            }
        }

        if (citaObj?.es_prospecto) {
            await fisioNet
                .from('solicitudes_citas')
                .update({ estado: 'CANCELADO', google_event_id: null })
                .eq('id', idCita);
        } else {
            await fisioNet
                .from('agenda_maestra')
                .update({ estatus: nuevoEstatus, google_event_id: null })
                .eq('id_cita', idCita);
        }

        console.log(`✅ Estado de cita ${idCita} actualizado a: ${nuevoEstatus}`);
        if (typeof cargarAgenda === 'function') await cargarAgenda();

        return true;

    } catch (err) {
        console.error("❌ Error al procesar cambio de estatus:", err);
        alert("Ocurrió un error al intentar cambiar el estado de la cita.");
    }
}

window.manejarCambioEstatusCita = manejarCambioEstatusCita;
window.actualizarAgenda = cargarAgenda;
window.vincularGoogleCalendar = vincularGoogleCalendar;
window.sincronizarConGoogleCalendar = sincronizarConGoogleCalendar;
window.actualizarCitaEnGoogle = actualizarCitaEnGoogle;
window.cancelarCitaEnGoogle = cancelarCitaEnGoogle;
window.cargarAgenda = cargarAgenda;
window.reconectarGoogleCalendar = reconectarGoogleCalendar;

window.addEventListener('DOMContentLoaded', () => {
    verificarEstadoGoogle();

    if (typeof fisioNet !== 'undefined') {
        const clinicaId = localStorage.getItem('id_clinica_activa');

        fisioNet
            .channel('cambios-agenda-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'agenda_maestra',
                    filter: `id_clinica=eq.${clinicaId}`
                },
                () => {
                    console.log("⚡ Cambio detectado en agenda_maestra, recargando...");
                    if (typeof cargarAgenda === 'function') cargarAgenda();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'solicitudes_citas',
                    filter: `id_clinica_solicitada=eq.${clinicaId}`
                },
                () => {
                    console.log("⚡ Cambio detectado en solicitudes_citas, recargando...");
                    if (typeof cargarAgenda === 'function') cargarAgenda();
                }
            )
            .subscribe();
    }
});