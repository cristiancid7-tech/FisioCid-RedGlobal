import { obtenerFechaLocal, formatearFechaCorta } from './utils.js';

// ============================================================================
// 🔄 SINCRONIZACIÓN AUTOMÁTICA CON GOOGLE CALENDAR / iPHONE
// ============================================================================
async function sincronizarConGoogleCalendar(cita, nombrePaciente) {
    try {
        const { data: { session } } = await fisioNet.auth.getSession();
        
        if (!session || !session.provider_token) {
            console.warn("⚠️ No hay token de Google Calendar activo. La cita se guardó en FisioCid pero no se sincronizó externamente.");
            return;
        }

        const token = session.provider_token;
        const fechaHoraInicio = `${cita.fecha}T${cita.hora_inicio_cita}:00`;
        
        const fechaFinObj = new Date(`${cita.fecha}T${cita.hora_inicio_cita}:00`);
        fechaFinObj.setMinutes(fechaFinObj.getMinutes() + 30);
        const horaFinStr = `${String(fechaFinObj.getHours()).padStart(2, '0')}:${String(fechaFinObj.getMinutes()).padStart(2, '0')}:00`;
        const fechaHoraFin = `${cita.fecha}T${horaFinStr}`;

        const eventoGoogle = {
            summary: `🩺 Cita FisioCid: ${nombrePaciente}`,
            description: `Modalidad: ${cita.modalidad}\nPaciente: ${nombrePaciente}\nGestionado desde la plataforma clínica FisioCid.`,
            start: { dateTime: fechaHoraInicio, timeZone: 'America/Mexico_City' },
            end: { dateTime: fechaHoraFin, timeZone: 'America/Mexico_City' }
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
        } else {
            console.log("✨ ¡Cita sincronizada en tiempo real con Google Calendar y tu iPhone!");
        }
    } catch (error) {
        console.error("❌ Error de red al conectar con Google Calendar:", error);
    }
}

// ==========================================
// 📅 GESTIÓN DE AGENDA MAESTRA
// ==========================================
async function cargarAgenda(modo = 'semana', botonPresionado = null) {
    const tituloElemento = document.getElementById('tituloAgenda');
    let fechaInput = document.getElementById('filtroFechaAgenda')?.value;
    
    if (!fechaInput) {
        fechaInput = obtenerFechaLocal();
        if(document.getElementById('filtroFechaAgenda')) {
            document.getElementById('filtroFechaAgenda').value = fechaInput;
        }
    }

    const fechaBase = new Date(fechaInput + "T00:00:00");

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
            pacientes_maestros (id, nombre, apellido_paterno, apellido_materno, curp)
        `)
        .eq('id_profesional', user.id)
        .eq('id_clinica', clinicaId);

    // --- 2. PREPARAMOS CONSULTA DEL "LIMBO" (PROSPECTOS EXPRÉS) ---
    // AHORA SOLO TRAEMOS A LOS QUE YA FUERON APROBADOS (CONFIRMADOS)
    let querySol = fisioNet
        .from('solicitudes_citas')
        .select('*')
        .eq('estado', 'CONFIRMADO') 
        .eq('id_clinica_solicitada', clinicaId)
        .eq('id_profesional_solicitado', user.id);

    // --- 3. APLICAMOS FILTROS DE FECHAS A AMBAS ---
    if (modo === 'dia') {
        // (El título lo armamos más abajo con los chochos)
        queryCitas = queryCitas.eq('fecha', fechaInput);
        querySol = querySol.eq('fecha_cita', fechaInput);
   } else {
        // RANGO DE 6 DÍAS HACIA ADELANTE
        const fechaFin = new Date(fechaBase);
        fechaFin.setDate(fechaBase.getDate() + 5); 

        const f1 = fechaBase.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
        const f2 = fechaFin.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
        if (tituloElemento) tituloElemento.innerText = `PRÓXIMOS DÍAS: ${f1.toUpperCase()} AL ${f2.toUpperCase()}`;

        const fechaInicioStr = fechaBase.toISOString().split('T')[0];
        const fechaFinStr = fechaFin.toISOString().split('T')[0];

        queryCitas = queryCitas.gte('fecha', fechaInicioStr).lte('fecha', fechaFinStr);
        querySol = querySol.gte('fecha_cita', fechaInicioStr).lte('fecha_cita', fechaFinStr);
    }

    // --- 4. EJECUTAMOS AMBAS AL MISMO TIEMPO ---
    const [resCitas, resSol] = await Promise.all([queryCitas, querySol]);

    if (resCitas.error) {
        console.error("❌ Error al cargar agenda oficial:", resCitas.error.message);
        return;
    }

    // --- 5. DISFRAZAMOS A LOS PROSPECTOS PARA QUE ENTREN A LA AGENDA ---
    const citasProspectos = (resSol.data || []).map(sol => ({
        id_cita: sol.id, // El ID de la solicitud (para abrir el modal de limpieza)
        es_prospecto: true, // 🚩 Bandera para pintarlos de amarillo en renderizarCitas
        fecha: sol.fecha_cita,
        hora_inicio_cita: sol.hora_cita || '00:00:00',
        modalidad: 'SALA DE ESPERA',
        estatus: 'PENDIENTE',
        estado_cita: 'PROSPECTO',
        pago_status: 'PENDIENTE',
        pacientes_maestros: {
            id: 'LIMBO',
            nombre: sol.nombre,
            apellido_paterno: sol.apellido_p,
            apellido_materno: '(EXPRÉS)',
            curp: null
        }
    }));

    // --- 6. UNIMOS Y ORDENAMOS TODO JUNTO ---
    let agendaCompleta = [...(resCitas.data || []), ...citasProspectos];
    
    agendaCompleta.sort((a, b) => {
        if (a.fecha === b.fecha) {
            return (a.hora_inicio_cita || '').localeCompare(b.hora_inicio_cita || '');
        }
        return (a.fecha || '').localeCompare(b.fecha || '');
    });

    // 🔥 METIÉNDOLE CHOCHOS: SÚPER RESUMEN DEL DÍA 🔥
    if (modo === 'dia' && tituloElemento) {
        const total = agendaCompleta.length;
        
        const atendidos = agendaCompleta.filter(c => c.estatus === 'COMPLETADO' || c.estatus === 'ATENDIENDO').length;
        const pendientes = agendaCompleta.filter(c => c.estatus === 'PENDIENTE').length;
        const cancelados = agendaCompleta.filter(c => c.estatus === 'CANCELADO').length;
        const reagendados = agendaCompleta.filter(c => c.estatus === 'REAGENDADO').length;
        const noLlegaron = agendaCompleta.filter(c => c.estatus === 'NO_ASISTIO' || c.estatus === 'FALTO').length;

        const fechaObjParaTitulo = new Date(fechaInput + "T00:00:00");
        const fechaBonita = fechaObjParaTitulo.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' }).toUpperCase();

        tituloElemento.innerHTML = `
            <div style="margin-bottom: 12px; font-size: 1.2rem;">CITAS DEL ${fechaBonita}</div>
            
            <div style="display: flex; gap: 8px; flex-wrap: wrap; font-size: 0.75rem; font-weight: 800; font-family: sans-serif;">
                <span style="background: #f1f5f9; color: #475569; padding: 5px 12px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    📊 TOTAL: ${total}
                </span>
                <span style="background: #dcfce7; color: #15803d; padding: 5px 12px; border-radius: 8px; border: 1px solid #bbf7d0; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    ✅ ATENDIDOS: ${atendidos}
                </span>
                <span style="background: #fefce8; color: #a16207; padding: 5px 12px; border-radius: 8px; border: 1px solid #fef08a; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    ⏳ PENDIENTES: ${pendientes}
                </span>
                <span style="background: #ffedd5; color: #c2410c; padding: 5px 12px; border-radius: 8px; border: 1px solid #fed7aa; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    🔄 REAGENDAR: ${reagendados}
                </span>
                <span style="background: #fee2e2; color: #b91c1c; padding: 5px 12px; border-radius: 8px; border: 1px solid #fecaca; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    ❌ CANCELADOS: ${cancelados}
                </span>
                <span style="background: #f3f4f6; color: #6b7280; padding: 5px 12px; border-radius: 8px; border: 1px solid #d1d5db; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    👻 FALTARON: ${noLlegaron}
                </span>
            </div>
        `;
    }

    // --- 7. MANDAMOS A PINTAR ---
    renderizarCitas(agendaCompleta, modo);
}