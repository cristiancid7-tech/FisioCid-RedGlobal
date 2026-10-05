// =========================================================================
// ⚙️ CONFIGURACIÓN GLOBAL Y VARIABLES DE CONTROL GEOGRÁFICO MAESTRO
// =========================================================================
let CONFIG_CLINICA = {
    intervalo: 30,
    horarios: [], // Se llenará dinámicamente desde la DB
    descanso: [0] // Por defecto domingo (0)
};

window.estadoSeleccionado = "";
window.clinicaSeleccionadaId = null;
window.especialistaSeleccionadoId = null;
window.fechaSeleccionada = "";
window.horaSeleccionada = "";

// --- 1. INICIALIZACIÓN AL CARGAR EL DOM ---
document.addEventListener('DOMContentLoaded', async () => {
    //console.log("🔥 Inicializando Buscador Híbrido de Citas FisioCid...");
    
    ['nombre', 'apellidoP', 'apellidoM'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', (e) => {
            let posicionCursor = e.target.selectionStart;
            e.target.value = e.target.value.toUpperCase().replace(/\s+/g, ' ');
            e.target.setSelectionRange(posicionCursor, posicionCursor);
        });
    });

    configurarEventosFiltros();
});

// =========================================================================
// 🔄 MOTOR DE FILTRADO HÍBRIDO EN CASCADA (USANDO VISTA SEGURA)
// =========================================================================
function configurarEventosFiltros() {
    const selectEdo = document.getElementById('filtro-estado');
    const selectEsp = document.getElementById('filtro-especialidad');
    const selectUbi = document.getElementById('filtro-ubicacion');
    const selectDoc = document.getElementById('filtro-especialista');

    if (!selectEdo || !selectEsp || !selectUbi || !selectDoc) {
        console.error("❌ Error: No se encontraron todos los selectores en el HTML.");
        return;
    }

    // 🟢 ESCUDO 1: Estado ➡️ Especialidades
    selectEdo.addEventListener('change', async () => {
        window.estadoSeleccionado = selectEdo.value;
        ocultarCalendarioYHoras();
        
        selectEsp.innerHTML = '<option value="">-- Selecciona Especialidad --</option>';
        selectUbi.innerHTML = '<option value="">Selecciona primero una especialidad...</option>';
        selectDoc.innerHTML = '<option value="TODOS">Cualquier especialista disponible 👨‍⚕️</option>';
        selectUbi.disabled = true;
        selectDoc.disabled = true;

        if (!window.estadoSeleccionado) {
            selectEsp.disabled = true;
            return;
        }

        selectEsp.disabled = false;
        selectEsp.innerHTML = '<option value="">Buscando especialidades en la región...</option>';

        try {
            // Consultamos directo las especialidades desde la vista filtrando por estado de la clínica
            const { data: directorio, error } = await fisioNet
                .from('vista_directorio_citas')
                .select('especialidad')
                .ilike('entidad_federativa', `%${window.estadoSeleccionado}%`);

            if (error) throw error;

            const especialidadesUnicas = [...new Set(directorio?.map(item => item.especialidad).filter(Boolean))];

            selectEsp.innerHTML = '<option value="">-- Selecciona Especialidad --</option>';
            if (especialidadesUnicas.length === 0) {
                selectEsp.innerHTML = '<option value="">No hay especialidades activas en este estado</option>';
                return;
            }

            especialidadesUnicas.forEach(esp => {
                selectEsp.innerHTML += `<option value="${esp}">${esp.toUpperCase()}</option>`;
            });

        } catch (err) {
            console.error("❌ Error en Escudo 1 (Estados):", err.message);
            selectEsp.innerHTML = '<option value="">Error al cargar especialidades</option>';
        }
    });

    // 🟢 ESCUDO 2: Especialidad ➡️ Clínicas / Sucursales
    selectEsp.addEventListener('change', async () => {
        const especialidad = selectEsp.value;
        ocultarCalendarioYHoras();

        selectUbi.innerHTML = '<option value="">-- Selecciona una sucursal --</option>';
        selectDoc.innerHTML = '<option value="TODOS">Cualquier especialista disponible 👨‍⚕️</option>';
        selectDoc.disabled = true;

        if (!especialidad) {
            selectUbi.disabled = true;
            return;
        }

        selectUbi.disabled = false;
        selectUbi.innerHTML = '<option value="">Buscando clínicas con este servicio...</option>';

        try {
            const { data: coincidencias, error } = await fisioNet
                .from('vista_directorio_citas')
                .select('id_clinica, nombre_clinica, direccion, entidad_federativa')
                .eq('especialidad', especialidad)
                .ilike('entidad_federativa', `%${window.estadoSeleccionado}%`);

            if (error) throw error;

            const clinicasFiltradas = [];
            const mapaId = new Set();
            
            coincidencias?.forEach(item => {
                if (item.id_clinica && !mapaId.has(item.id_clinica)) {
                    mapaId.add(item.id_clinica);
                    clinicasFiltradas.push(item);
                }
            });

            selectUbi.innerHTML = '<option value="">-- Selecciona una sucursal --</option>';
            if (clinicasFiltradas.length === 0) {
                selectUbi.innerHTML = '<option value="">Sin clínicas disponibles para este servicio</option>';
                return;
            }

            clinicasFiltradas.forEach(c => {
                selectUbi.innerHTML += `<option value="${c.id_clinica}">${c.nombre_clinica.toUpperCase()} (${c.direccion || 'Sin dirección'})</option>`;
            });

        } catch (err) {
            console.error("❌ Error en Escudo 2 (Especialidades):", err.message);
            selectUbi.innerHTML = '<option value="">Error al cargar clínicas</option>';
        }
    });

    // 🟢 ESCUDO 3: Sucursal ➡️ Especialistas
    selectUbi.addEventListener('change', async () => {
        window.clinicaSeleccionadaId = selectUbi.value;
        ocultarCalendarioYHoras();

        if (!window.clinicaSeleccionadaId) {
            selectDoc.disabled = true;
            return;
        }

        selectDoc.disabled = false;
        selectDoc.innerHTML = '<option value="">Filtrando personal de la sede...</option>';

        try {
            const { data: staff, error } = await fisioNet
                .from('vista_directorio_citas')
                .select('id_profesional, nombre_completo, especialidad')
                .eq('id_clinica', window.clinicaSeleccionadaId)
                .eq('especialidad', selectEsp.value);

            if (error) throw error;

            selectDoc.innerHTML = '<option value="TODOS">Cualquier especialista disponible 👨‍⚕️</option>';
            if (staff && staff.length > 0) {
                staff.forEach(s => {
                    if (s.id_profesional && s.nombre_completo) {
                        selectDoc.innerHTML += `<option value="${s.id_profesional}">${s.nombre_completo.toUpperCase()}</option>`;
                    }
                });
            }
            
            await activarCargaConfiguracionAgenda();

        } catch (err) {
            console.error("❌ Error en Escudo 3 (Sucursales):", err.message);
            selectDoc.innerHTML = '<option value="TODOS">Cualquier especialista disponible 👨‍⚕️</option>';
        }
    });

    selectDoc.addEventListener('change', async () => {
        await activarCargaConfiguracionAgenda();
    });
}

function ocultarCalendarioYHoras() {
    const step1 = document.getElementById('step1');
    if (step1) step1.style.display = 'none';
    window.fechaSeleccionada = "";
    window.horaSeleccionada = "";
}

// =========================================================================
// ⚙️ 2. CARGA DE CONFIGURACIÓN HORARIA DESDE LA DB (VISTA DIRECTORIO)
// =========================================================================
async function activarCargaConfiguracionAgenda() {
    const selectDocVal = document.getElementById('filtro-especialista').value;
    const selectEspVal = document.getElementById('filtro-especialidad').value;
    
    if (!selectEspVal || !window.clinicaSeleccionadaId) return;

    try {
        let perfil = null;

        if (selectDocVal && selectDocVal !== 'TODOS') {
            window.especialistaSeleccionadoId = selectDocVal;
            const { data, error } = await fisioNet
                .from('vista_directorio_citas')
                .select('*')
                .eq('id_profesional', selectDocVal)
                .maybeSingle();
            if (error) throw error;
            perfil = data;
        } else {
            window.especialistaSeleccionadoId = null;
            const { data, error } = await fisioNet
                .from('vista_directorio_citas')
                .select('*')
                .eq('id_clinica', window.clinicaSeleccionadaId)
                .eq('especialidad', selectEspVal)
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            perfil = data;
        }

        if (perfil) {
            CONFIG_CLINICA.intervalo = perfil.intervalo_cita || 30;
            
            // Lógica flexible por si dias_descanso o horario_atencion vienen en string o JSON
            let descansoParseado = [0];
            if (typeof perfil.dias_descanso === 'string') {
                try { descansoParseado = JSON.parse(perfil.dias_descanso); } catch(e) { descansoParseado = [0]; }
            } else if (Array.isArray(perfil.dias_descanso)) {
                descansoParseado = perfil.dias_descanso;
            }
            CONFIG_CLINICA.descanso = descansoParseado;
            
            let horariosParseados = [];
            if (typeof perfil.horario_atencion === 'string') {
                try { horariosParseados = JSON.parse(perfil.horario_atencion); } catch (e) { horariosParseados = []; }
            } else if (Array.isArray(perfil.horario_atencion)) {
                horariosParseados = perfil.horario_atencion;
            }
            CONFIG_CLINICA.horarios = horariosParseados;
        }

        const step1 = document.getElementById('step1');
        if (step1) step1.style.display = 'block';
        generarCalendario();

    } catch (err) {
        console.error("❌ Error al cargar configuración horaria:", err.message);
    }
}

// =========================================================================
// 📅 3. GENERADOR DE CALENDARIO (VISTA LOCAL 15 DÍAS)
// =========================================================================
function generarCalendario() {
    const contenedor = document.getElementById('calendario-dias');
    if (!contenedor) return;
    contenedor.innerHTML = ''; 
    
    const hoy = new Date();
    const MAX_DIAS_VISTA = 15; 

    for (let i = 0; i < MAX_DIAS_VISTA; i++) {
        const fecha = new Date();
        fecha.setDate(hoy.getDate() + i);
        
        const numeroDiaSemana = fecha.getDay(); 
        const esCerrado = CONFIG_CLINICA.descanso.some(d => Number(d) === numeroDiaSemana);

        const nombreDia = fecha.toLocaleDateString('es-MX', { weekday: 'short' }).toUpperCase();
        const numeroDia = fecha.getDate();
        
        const anio = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        const fechaISO = `${anio}-${mes}-${dia}`;

        const btnDia = document.createElement('div');
        btnDia.className = 'dia-item' + (esCerrado ? ' cerrado' : '');
        btnDia.innerHTML = `<span>${nombreDia}</span><strong>${numeroDia}</strong>${esCerrado ? '<small>Cerrado</small>' : ''}`;
        
        if (!esCerrado) {
            btnDia.onclick = () => {
                document.querySelectorAll('.dia-item').forEach(el => el.classList.remove('activo'));
                btnDia.classList.add('activo');
                window.fechaSeleccionada = fechaISO;
                renderizarHoras(); 
            };

            if (!window.fechaSeleccionada || window.fechaSeleccionada === "") {
                 btnDia.classList.add('activo');
                 window.fechaSeleccionada = fechaISO;
                 renderizarHoras();
            }
        }
        contenedor.appendChild(btnDia);
    }
}

// =========================================================================
// ⏱️ 4. GENERADOR MATEMÁTICO DE SLOTS
// =========================================================================
function generarSlots() {
    const slots = [];
    if (!window.fechaSeleccionada) return slots;

    const partes = window.fechaSeleccionada.split('-');
    const diaSemana = new Date(partes[0], partes[1] - 1, partes[2]).getDay();

    const turnosDelDia = CONFIG_CLINICA.horarios.filter(h => parseInt(h.dia) === diaSemana);

    turnosDelDia.forEach(rango => {
        let [hIni, mIni] = rango.inicio.split(':').map(Number);
        let [hFin, mFin] = rango.fin.split(':').map(Number);

        let minutosActuales = hIni * 60 + mIni;
        const minutosFin = hFin * 60 + mFin;

        while (minutosActuales + CONFIG_CLINICA.intervalo <= minutosFin) {
            let h = Math.floor(minutosActuales / 60);
            let m = minutosActuales % 60;
            
            let hStr = String(h).padStart(2, '0');
            let mStr = String(m).padStart(2, '0');
            
            slots.push(`${hStr}:${mStr}`);
            minutosActuales += CONFIG_CLINICA.intervalo;
        }
    });

    return slots;
}

// =========================================================================
// 🔍 5. CONSULTAR DISPONIBILIDAD REAL Y BLOQUEOS INTEGRADOS
// =========================================================================
async function renderizarHoras() {
    const grid = document.getElementById('grid-horas');
    if (!grid) return;
    grid.innerHTML = '<p style="grid-column: span 3; color:#64748b;">Consultando disponibilidad...</p>';

    try {
        const slotsDinamicos = generarSlots();
        if (slotsDinamicos.length === 0) {
            grid.innerHTML = '<p style="grid-column: span 3; color:#64748b;">No hay horarios configurados para este día.</p>';
            return;
        }

        // 1. Consultar Citas y Rangos de Bloqueo Logístico en agenda_maestra
        let queryAgenda = fisioNet
            .from('agenda_maestra')
            .select('hora_inicio_cita, inicio_bloqueo, fin_bloqueo, modalidad, estado, estatus')
            .eq('fecha', window.fechaSeleccionada)
            .eq('id_clinica', window.clinicaSeleccionadaId)
            .neq('estatus', 'CANCELADA'); // Ignoramos las citas canceladas

        if (window.especialistaSeleccionadoId) {
            queryAgenda = queryAgenda.eq('id_profesional', window.especialistaSeleccionadoId);
        }

        // 2. Consultar Bloqueos Personales/Vacaciones en bloqueos_agenda
        let queryBloqueos = fisioNet
            .from('bloqueos_agenda')
            .select('fecha_inicio, fecha_fin, tipo_bloqueo')
            .lte('fecha_inicio', `${window.fechaSeleccionada} 23:59:59`)
            .gte('fecha_fin', `${window.fechaSeleccionada} 00:00:00`);

        if (window.especialistaSeleccionadoId) {
            queryBloqueos = queryBloqueos.eq('id_profesional', window.especialistaSeleccionadoId);
        }

        // Ejecución en paralelo
        const [{ data: citasAgenda, error: errAgenda }, { data: bloqueosPersonales, error: errBloqueos }] = await Promise.all([
            queryAgenda,
            queryBloqueos
        ]);

        if (errAgenda) throw errAgenda;
        if (errBloqueos) throw errBloqueos;

        grid.innerHTML = ''; 

        slotsDinamicos.forEach(hora => {
            const timestampSlot = new Date(`${window.fechaSeleccionada}T${hora}:00`).getTime();

            // A) Validar si la hora choca con alguna Cita o Bloqueo Logístico (Domicilio) en agenda_maestra
            const estaOcupadoEnAgenda = (citasAgenda || []).some(cita => {
                // Si la cita tiene asignados rangos explícitos de inicio/fin de bloqueo (ej. domicilio)
                if (cita.inicio_bloqueo && cita.fin_bloqueo) {
                    const tInicioBloqueo = new Date(`${window.fechaSeleccionada}T${cita.inicio_bloqueo}`).getTime();
                    const tFinBloqueo = new Date(`${window.fechaSeleccionada}T${cita.fin_bloqueo}`).getTime();
                    return timestampSlot >= tInicioBloqueo && timestampSlot < tFinBloqueo;
                }
                
                // Si es una cita normal presencial sin rango extendido
                const horaLimpiaCita = cita.hora_inicio_cita ? cita.hora_inicio_cita.substring(0, 5) : '';
                return horaLimpiaCita === hora;
            });

            // B) Validar si la hora choca con Bloqueos Personales / Vacaciones
            const estaBloqueadoPersonal = (bloqueosPersonales || []).some(b => {
                const tInicio = new Date(b.fecha_inicio).getTime();
                const tFin = new Date(b.fecha_fin).getTime();
                return timestampSlot >= tInicio && timestampSlot < tFin;
            });

            const noDisponible = estaOcupadoEnAgenda || estaBloqueadoPersonal;

            const btn = document.createElement('button');
            btn.innerText = hora;
            btn.className = noDisponible ? 'hora-btn ocupado' : 'hora-btn disponible';
            
            if (!noDisponible) {
                btn.onclick = () => seleccionarHora(hora);
            }
            grid.appendChild(btn);
        });

    } catch (err) {
        console.error("❌ Error al renderizar disponibilidad integrada:", err);
        grid.innerHTML = '<p style="grid-column: span 3; color:red;">Error al cargar horarios.</p>';
    }
}

// =========================================================================
// 🔀 6. NAVEGACIÓN ENTRE PASOS (STEPS)
// =========================================================================
function seleccionarHora(hora) {
    window.horaSeleccionada = hora;
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'block';
}

function regresarAPaso1() {
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
}

// =========================================================================
// 💾 7. ENVÍO DE SOLICITUD A SUPABASE + REDIRECCIÓN A WHATSAPP (CON MODALIDAD)
// =========================================================================
document.getElementById('formRegistro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnConfirmar');
    
    btn.innerText = 'Guardando solicitud... ⏳';
    btn.disabled = true;
    
    const nombre = document.getElementById('nombre').value.trim().toUpperCase();
    const apP = document.getElementById('apellidoP').value.trim().toUpperCase();
    const apM = document.getElementById('apellidoM').value.trim().toUpperCase();
    const tel = document.getElementById('telefono').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    
    let curpInput = document.getElementById('curp')?.value.trim().toUpperCase() || "";

    if (curpInput !== "") {
        const regexCurp = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d$/;
        if (!regexCurp.test(curpInput)) {
            alert("⚠️ La CURP ingresada no tiene un formato válido de 18 caracteres. Por favor corrígela o déjala vacía.");
            btn.innerText = 'Enviar Solicitud ⚡';
            btn.disabled = false;
            return;
        }
    }
    
    const curpFinal = curpInput !== "" ? curpInput : null;
    const especialidadNombre = document.getElementById('filtro-especialidad').value;
    const modalidadSeleccionada = document.getElementById('filtro-modalidad')?.value || 'CONSULTORIO';

    try {
        // 1. Guardar la solicitud en Supabase registrando la modalidad
        const { error } = await fisioNet
            .from('solicitudes_citas')
            .insert([{
                nombre: nombre,      
                apellido_p: apP,     
                apellido_m: apM,     
                telefono: tel,
                email: email,        
                curp: curpFinal,     
                fecha_cita: window.fechaSeleccionada, 
                hora_cita: window.horaSeleccionada,   
                estado: 'PENDIENTE',
                id_clinica_solicitada: window.clinicaSeleccionadaId,
                id_profesional_solicitado: window.especialistaSeleccionadoId,
                especialidad_solicitada: especialidadNombre,
                modalidad: modalidadSeleccionada // 👈 Se guarda CONSULTORIO o DOMICILIO
            }]);

        if (error) throw error;

        // 2. Traer información de la clínica para obtener el teléfono oficial
        const { data: clinicaInfo } = await fisioNet
            .from('clinicas')
            .select('nombre_clinica, telefono_contacto')
            .eq('id', window.clinicaSeleccionadaId)
            .maybeSingle();

        const telefonoClinica = clinicaInfo?.telefono_contacto || "2381234567";

        const [anio, mes, dia] = window.fechaSeleccionada.split('-');
        const fechaLegible = `${dia}/${mes}/${anio}`;

        const textoModalidad = modalidadSeleccionada === 'DOMICILIO' ? '🏡 Servicio a Domicilio' : '🏥 En Consultorio';

        // 3. Crear mensaje formateado enriquecido con modalidad para WhatsApp
        const textoMensaje = `*¡HOLA FISIOCID! AGENDÉ UNA NUEVA CITA* 📅\n\n` +
            `👤 *Paciente:* ${nombre} ${apP} ${apM}\n` +
            `📱 *Teléfono:* ${tel}\n` +
            `🩺 *Servicio:* ${especialidadNombre}\n` +
            `📍 *Modalidad:* ${textoModalidad}\n` +
            `📅 *Fecha:* ${fechaLegible}\n` +
            `⏰ *Hora:* ${window.horaSeleccionada} HRS\n` +
            `🏥 *Sede:* ${clinicaInfo?.nombre_clinica || 'FisioCid'}\n\n` +
            `_Quedo al pendiente de su confirmación. ¡Muchas gracias!_`;

        const urlWhatsApp = `https://wa.me/52${telefonoClinica.replace(/\D/g, '')}?text=${encodeURIComponent(textoMensaje)}`;

        btn.innerText = 'Abriendo WhatsApp... 📲';

        // 4. Redirigir
        setTimeout(() => {
            window.location.href = urlWhatsApp;
        }, 800);

    } catch (err) {
        console.error("Error al guardar la solicitud:", err);
        alert("Hubo un error al procesar tu solicitud: " + err.message);
        btn.innerText = 'Enviar Solicitud ⚡';
        btn.disabled = false;
    }
});