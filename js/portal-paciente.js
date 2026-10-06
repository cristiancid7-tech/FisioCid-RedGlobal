// ==========================================
// 🚀 VARIABLES GLOBALES DE PACIENTE Y AGENDA
// ==========================================
let notasGlobales = [];
let estudiosGlobales = [];
let perfilActivoId = null;
let pacienteLogueadoData = null;
let listaFamiliares = [];
let idSolicitudActiva = null;

// Configuración global para el motor de citas
let CONFIG_CLINICA = {
    intervalo: 30,
    horarios: [],
    descanso: [0]
};

window.estadoSeleccionado = "";
window.clinicaSeleccionadaId = null;
window.especialistaSeleccionadoId = null;
window.fechaSeleccionada = "";
window.horaSeleccionada = "";

// ==========================================
// ⚡ INICIALIZACIÓN CON AUTO-RECUPERACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        let idPaciente = localStorage.getItem('paciente_maestro_id') || localStorage.getItem('paciente_sesion_id');
        
        if (!idPaciente) {
            const urlParams = new URLSearchParams(window.location.search);
            idPaciente = urlParams.get('id');
        }

        if (!idPaciente) {
            //console.log("🔍 Intentando auto-recuperar ID desde la sesión activa de Supabase Auth...");
            const { data: { user } } = await fisioNet.auth.getUser();
            
            if (user) {
                const { data: pac } = await fisioNet
                    .from('pacientes_maestros')
                    .select('id')
                    .or(`id_usuario_auth.eq.${user.id},correo_electronico.ilike.${user.email}`)
                    .maybeSingle();

                if (pac) {
                    idPaciente = pac.id;
                    localStorage.setItem('paciente_maestro_id', idPaciente);
                }
            }
        }

        if (idPaciente) {
            //console.log("✅ Paciente identificado con éxito ID:", idPaciente);
            localStorage.setItem('paciente_maestro_id', idPaciente);
            
            await cargarExpedienteCompleto(idPaciente);
            escucharSolicitudesEnVivo(idPaciente);

            // 🎯 Inicializar los escuchadores de eventos para el agendamiento
            configurarEventosFiltros();
            
            // Auto-formato para campos de texto del formulario de agendamiento
            ['nombre', 'apellidoP', 'apellidoM'].forEach(id => {
                document.getElementById(id)?.addEventListener('input', (e) => {
                    let posicionCursor = e.target.selectionStart;
                    e.target.value = e.target.value.toUpperCase().replace(/\s+/g, ' ');
                    e.target.setSelectionRange(posicionCursor, posicionCursor);
                });
            });

        } else {
            console.warn("⚠️ No hay sesión ni credenciales de paciente. Redirigiendo al Login.");
            window.location.href = 'login.html';
        }

    } catch (err) {
        console.error("💥 Error crítico en inicialización del portal:", err);
    }
});

// ==========================================
// 👨‍👩‍👧‍👦 1. CARGA DE EXPEDIENTE Y FAMILIARES
// ==========================================
async function cargarExpedienteCompleto(pacienteId) {
    try {
        //console.log("⏳ Cargando expediente familiar para ID:", pacienteId);

        const { data: familia, error } = await fisioNet
            .from('pacientes_maestros')
            .select('*')
            .or(`id.eq.${pacienteId},id_tutor.eq.${pacienteId}`);

        if (error) throw error;

        if (familia && familia.length > 0) {
            listaFamiliares = familia;
            
            const titular = familia.find(p => p.id === pacienteId) || familia[0];
            pacienteLogueadoData = titular;

            const lblUser = document.getElementById('nombreUserActivo');
            const lblTutor = document.getElementById('nombreTutorMenu');
            if (lblUser) lblUser.innerText = `${titular.nombre} ${titular.apellido_paterno}`.toUpperCase();
            if (lblTutor) lblTutor.innerText = `${titular.nombre} (Titular)`;

            // Auto-llenar campos en el formulario de citas con los datos del perfil activo
            autoRellenarDatosCita(titular);

            const contenedorFamilia = document.getElementById('listaFamiliaresMenu');
            if (contenedorFamilia) {
                const hijos = familia.filter(p => p.id !== titular.id);
                if (hijos.length > 0) {
                    contenedorFamilia.innerHTML = hijos.map(h => `
                        <li>
                            <a class="dropdown-item" href="#" onclick="seleccionarPerfil('${h.id}')">
                                <i class="fas fa-child me-2 text-info"></i> ${h.nombre} ${h.apellido_paterno}
                            </a>
                        </li>
                    `).join('');
                } else {
                    contenedorFamilia.innerHTML = `<div class="text-center text-muted small py-2">Sin familiares a cargo</div>`;
                }
            }

            seleccionarPerfil(titular.id);
        }
    } catch (e) {
        console.error("❌ Error al cargar expediente familiar:", e);
    }
}

function autoRellenarDatosCita(paciente) {
    const inputNom = document.getElementById('nombre');
    const inputApP = document.getElementById('apellidoP');
    const inputApM = document.getElementById('apellidoM');
    const inputTel = document.getElementById('telefono');
    const inputEmail = document.getElementById('email');
    const inputCurp = document.getElementById('curp');

    if (inputNom && paciente.nombre) inputNom.value = paciente.nombre.toUpperCase();
    if (inputApP && paciente.apellido_paterno) inputApP.value = paciente.apellido_paterno.toUpperCase();
    if (inputApM && paciente.apellido_materno) inputApM.value = paciente.apellido_materno.toUpperCase();
    if (inputTel && paciente.telefono) inputTel.value = paciente.telefono;
    if (inputEmail && paciente.correo_electronico) inputEmail.value = paciente.correo_electronico.toLowerCase();
    if (inputCurp && paciente.curp) inputCurp.value = paciente.curp.toUpperCase();
}

function seleccionarPerfil(idPaciente) {
    perfilActivoId = idPaciente;
    const paciente = listaFamiliares.find(p => p.id === idPaciente);
    
    if (paciente) {
        const lblSaludo = document.getElementById('txtSaludo');
        if (lblSaludo) lblSaludo.innerText = `¡Hola, ${paciente.nombre.toUpperCase()}!`;
        
        autoRellenarDatosCita(paciente);
        cargarRegistrosClinicos(idPaciente);
        
        // 🔥 ESTA ES LA LÍNEA NUEVA
        renderizarInfoPaciente(paciente);
    }
}

// ==========================================
// 📡 2. MOTOR DE AUTORIZACIÓN EN TIEMPO REAL (OTP)
// ==========================================
async function escucharSolicitudesEnVivo(pacienteId) {
    //console.log("👂 Escuchando solicitudes médicas en tiempo real para:", pacienteId);
    verificarSolicitudesPendientes(pacienteId);

    fisioNet
        .channel('solicitudes_medicas_otp')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'solicitudes_acceso_otp',
            filter: `id_paciente=eq.${pacienteId}`
        }, payload => {
            //console.log("🔔 ¡NUEVA SOLICITUD DETECTADA EN VIVO! Payload:", payload.new);
            mostrarBannerSolicitud(payload.new);
        })
        .subscribe();
}

async function verificarSolicitudesPendientes(pacienteId) {
    try {
        const { data: solicitudes, error } = await fisioNet
            .from('solicitudes_acceso_otp')
            .select('*')
            .eq('id_paciente', pacienteId)
            .eq('estado_solicitud', 'PENDIENTE')
            .order('creado_en', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (solicitudes && solicitudes.length > 0) {
            mostrarBannerSolicitud(solicitudes[0]);
        }
    } catch (err) {
        console.error("💥 Error al buscar solicitudes pendientes:", err.message);
    }
}

function mostrarBannerSolicitud(solicitud) {
    idSolicitudActiva = solicitud.id;
    
    const card = document.getElementById('cardSolicitudActiva');
    const lblDoctor = document.getElementById('lblNombreDoctorSolicitante');
    const lblCodigo = document.getElementById('lblCodigoOTPPaciente');

    if (lblDoctor) lblDoctor.innerText = solicitud.nombre_profesional || "Dr. Cristian";
    if (lblCodigo) lblCodigo.innerText = solicitud.codigo_otp || "000 000";
    
    if (card) {
        card.style.display = 'block';
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

async function aprobarAccesoDoctor() {
    if (!idSolicitudActiva) {
        alert("⚠️ No hay ninguna solicitud activa para autorizar.");
        return;
    }

    const permiteNotas = document.getElementById('chkPermisoNotas')?.checked || false;
    const permiteEstudios = document.getElementById('chkPermisoEstudios')?.checked || false;
    const permiteLab = document.getElementById('chkPermisoLab')?.checked || false;
    const permiteCitas = document.getElementById('chkPermisoCitas')?.checked || false;

    if (!permiteNotas && !permiteEstudios && !permiteLab && !permiteCitas) {
        alert("⚠️ Selecciona al menos una categoría de información para compartir con tu médico.");
        return;
    }

    try {
        const { error } = await fisioNet
            .from('solicitudes_acceso_otp')
            .update({
                estado_solicitud: 'APROBADO',
                permisos_concedidos: {
                    notas: permiteNotas,
                    estudios: permiteEstudios,
                    laboratorio: permiteLab,
                    citas: permiteCitas
                },
                fecha_autorizacion: new Date().toISOString()
            })
            .eq('id', idSolicitudActiva);

        if (error) throw error;

        alert("✅ ¡Acceso Autorizado! El profesional de la salud ya puede visualizar los registros seleccionados.");
        
        const card = document.getElementById('cardSolicitudActiva');
        if (card) card.style.display = 'none';

    } catch (err) {
        console.error("❌ Error al autorizar acceso:", err.message);
        alert("Error al procesar la autorización: " + err.message);
    }
}


// ==========================================
// 🔄 3. MOTOR DE BUSCADOR DE CITAS Y CALENDARIO (OPTIMIZADO CON VISTA SEGURA)
// ==========================================
function configurarEventosFiltros() {
    const selectEdo = document.getElementById('filtro-estado');
    const selectEsp = document.getElementById('filtro-especialidad');
    const selectUbi = document.getElementById('filtro-ubicacion');
    const selectDoc = document.getElementById('filtro-especialista');

    if (!selectEdo || !selectEsp || !selectUbi || !selectDoc) return;

    // =========================================================================
    // ESCUDO 1: Al cambiar ESTADO ➡️ Busca Especialidades disponibles
    // =========================================================================
    selectEdo.addEventListener('change', async () => {
        window.estadoSeleccionado = selectEdo.value ? selectEdo.value.trim() : "";
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
            // Consultamos la Vista Pública Segura
            const { data, error } = await fisioNet
                .from('vista_directorio_citas')
                .select('especialidad')
                .ilike('entidad_federativa', `%${window.estadoSeleccionado}%`);

            if (error) throw error;

            const especialidadesUnicas = [...new Set((data || []).map(d => d.especialidad).filter(Boolean))];

            selectEsp.innerHTML = '<option value="">-- Selecciona Especialidad --</option>';
            if (especialidadesUnicas.length === 0) {
                selectEsp.innerHTML = '<option value="">No hay especialidades registradas en este estado</option>';
                return;
            }

            especialidadesUnicas.forEach(esp => {
                selectEsp.innerHTML += `<option value="${esp}">${esp.toUpperCase()}</option>`;
            });

        } catch (err) {
            console.error("❌ Error en Escudo 1 (Estados):", err.message);
            selectEsp.innerHTML = '<option value="">Error al consultar especialidades</option>';
        }
    });

    // =========================================================================
    // ESCUDO 2: Al cambiar ESPECIALIDAD ➡️ Busca Sucursales/Clínicas
    // =========================================================================
    selectEsp.addEventListener('change', async () => {
    const especialidad = selectEsp.value ? selectEsp.value.trim() : "";
    ocultarCalendarioYHoras();

    selectUbi.innerHTML = '<option value="">-- Selecciona una sucursal --</option>';
    selectDoc.innerHTML = '<option value="TODOS">Cualquier especialista disponible 👨‍⚕️</option>';
    selectDoc.disabled = true;

    // Resetear la variable global para evitar arrastrar IDs previos
    window.clinicaSeleccionadaId = null;

    if (!especialidad) {
        selectUbi.disabled = true;
        return;
    }

    selectUbi.disabled = false;
    selectUbi.innerHTML = '<option value="">Buscando clínicas con este servicio...</option>';

    try {
        const { data, error } = await fisioNet
            .from('vista_directorio_citas')
            .select('id_clinica, nombre_clinica, direccion')
            .eq('especialidad', especialidad)
            .ilike('entidad_federativa', `%${window.estadoSeleccionado}%`);

        if (error) throw error;

        // Eliminar sucursales duplicadas en la lista
        const clinicasUnicas = [];
        const mapaId = new Set();
        (data || []).forEach(item => {
            if (!mapaId.has(item.id_clinica)) {
                mapaId.add(item.id_clinica);
                clinicasUnicas.push(item);
            }
        });

        selectUbi.innerHTML = '<option value="">-- Selecciona una sucursal --</option>';
        if (clinicasUnicas.length === 0) {
            selectUbi.innerHTML = '<option value="">Sin clínicas disponibles para este servicio</option>';
            return;
        }

        clinicasUnicas.forEach(c => {
            selectUbi.innerHTML += `<option value="${c.id_clinica}">${c.nombre_clinica.toUpperCase()} (${c.direccion || 'Sin dirección'})</option>`;
        });

        // 🎯 LÓGICA DE AUTO-ASIGNACIÓN Y DISPARO
        if (clinicasUnicas.length === 1) {
            // Si solo hay una sede en esa región/especialidad, la seleccionamos automáticamente
            selectUbi.value = clinicasUnicas[0].id_clinica;
            window.clinicaSeleccionadaId = clinicasUnicas[0].id_clinica;
            
            // Disparar manualmente el evento change para cargar los doctores de esa sede única
            selectUbi.dispatchEvent(new Event('change'));
        } else {
            // Si hay varias, tomar el valor actual por si ya hay alguna opción seleccionada por defecto
            window.clinicaSeleccionadaId = selectUbi.value || null;
        }

    } catch (err) {
        console.error("❌ Error en Escudo 2 (Especialidades):", err.message);
        selectUbi.innerHTML = '<option value="">Error al buscar sucursales</option>';
    }
});

    // =========================================================================
    // ESCUDO 3: Al cambiar SUCURSAL ➡️ Busca Doctores/Especialistas
    // =========================================================================
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
            const { data, error } = await fisioNet
                .from('vista_directorio_citas')
                .select('id_profesional, nombre_completo')
                .eq('id_clinica', window.clinicaSeleccionadaId)
                .eq('especialidad', selectEsp.value);

            if (error) throw error;

            selectDoc.innerHTML = '<option value="TODOS">Cualquier especialista disponible 👨‍⚕️</option>';
            
            if (data && data.length > 0) {
                data.forEach(doc => {
                    selectDoc.innerHTML += `<option value="${doc.id_profesional}">${doc.nombre_completo.toUpperCase()}</option>`;
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

// =========================================================================
// CARGAR CONFIGURACIÓN HORARIA (INTERVALOS Y DÍAS DE DESCANSO)
// =========================================================================
async function activarCargaConfiguracionAgenda() {
    const selectDocVal = document.getElementById('filtro-especialista')?.value;
    const selectEspVal = document.getElementById('filtro-especialidad')?.value;
    
    if (!selectEspVal || !window.clinicaSeleccionadaId) return;

    try {
        let perfil = null;

        let query = fisioNet
            .from('vista_directorio_citas')
            .select('intervalo_cita, dias_descanso, horario_atencion')
            .eq('id_clinica', window.clinicaSeleccionadaId)
            .eq('especialidad', selectEspVal);

        if (selectDocVal && selectDocVal !== 'TODOS') {
            window.especialistaSeleccionadoId = selectDocVal;
            query = query.eq('id_profesional', selectDocVal);
        } else {
            window.especialistaSeleccionadoId = null;
        }

        const { data, error } = await query.limit(1).maybeSingle();
        if (error) throw error;

        perfil = data;

        if (perfil) {
            CONFIG_CLINICA.intervalo = perfil.intervalo_cita || 30;
            CONFIG_CLINICA.descanso = perfil.dias_descanso || [0];
            
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

function ocultarCalendarioYHoras() {
    const step1 = document.getElementById('step1');
    if (step1) step1.style.display = 'none';
    window.fechaSeleccionada = "";
    window.horaSeleccionada = "";
}



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

async function renderizarHoras() {
    const grid = document.getElementById('grid-horas');
    if (!grid) return;
    grid.innerHTML = '<p style="grid-column: span 3; color:#64748b;">Consultando disponibilidad...</p>';

    try {
        const slotsDinamicos = generarSlots();
        
        let queryCitas = fisioNet
            .from('agenda_maestra')
            .select('hora_inicio_cita')
            .eq('fecha', window.fechaSeleccionada)
            .eq('id_clinica', window.clinicaSeleccionadaId);

        if (window.especialistaSeleccionadoId) {
            queryCitas = queryCitas.eq('id_profesional', window.especialistaSeleccionadoId);
        }

        const { data: citasOcupadas, error } = await queryCitas;
        if (error) throw error;

        const horasNoDisponibles = (citasOcupadas || []).map(c => c.hora_inicio_cita.substring(0, 5));
        grid.innerHTML = ''; 

        if (slotsDinamicos.length === 0) {
            grid.innerHTML = '<p style="grid-column: span 3; color:#64748b;">No hay horarios configurados para este día.</p>';
            return;
        }

        slotsDinamicos.forEach(hora => {
            const estaOcupado = horasNoDisponibles.includes(hora);
            const btn = document.createElement('button');
            btn.innerText = hora;
            btn.className = estaOcupado ? 'hora-btn ocupado' : 'hora-btn disponible';
            
            if (!estaOcupado) {
                btn.onclick = () => seleccionarHora(hora);
            }
            grid.appendChild(btn);
        });

    } catch (err) {
        console.error("Error en renderizarHoras:", err);
        grid.innerHTML = '<p style="grid-column: span 3; color:red;">Error al cargar horarios.</p>';
    }
}

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

// Envío de Solicitud de Cita desde el Portal
// Envío de Solicitud de Cita desde el Portal
document.getElementById('formRegistro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnConfirmar');
    
    // ✅ Validar y rescatar el ID de clínica (de la variable global, del select o de LocalStorage)
    const selectUbiVal = document.getElementById('filtro-ubicacion')?.value;
    const idClinicaFinal = window.clinicaSeleccionadaId || selectUbiVal || localStorage.getItem('id_clinica_activa');

    if (!idClinicaFinal) {
        alert("⚠️ Por favor selecciona una sucursal / clínica válida antes de enviar tu solicitud.");
        return;
    }
    
    btn.innerText = 'Enviando...';
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

    try {
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
                id_clinica_solicitada: idClinicaFinal, // ✅ Guarda el ID real validado
                id_profesional_solicitado: window.especialistaSeleccionadoId,
                especialidad_solicitada: document.getElementById('filtro-especialidad').value
            }]);

        if (error) throw error;

        alert("¡Tu solicitud de cita ha sido enviada con éxito! Espera la confirmación por WhatsApp.");
        location.reload(); 

    } catch (err) {
        console.error("Error al guardar la solicitud:", err);
        alert("Hubo un error al procesar tu solicitud: " + err.message);
        btn.innerText = 'Enviar Solicitud ⚡';
        btn.disabled = false;
    }
});


// ==========================================
// 📄 4. CARGA DE REGISTROS CLÍNICOS (MEJORADA)
// ==========================================
async function cargarRegistrosClinicos(pacienteId) {
    try {
        const contenedor = document.getElementById('listaEstudios');
        if (contenedor) {
            contenedor.innerHTML = `
                <div class="p-5 text-center text-muted">
                    <div class="spinner-border text-primary mb-3" role="status"></div>
                    <p>Sincronizando historial clínico, laboratorio e imágenes PACS...</p>
                </div>`;
        }

        // 1. Obtener la CURP del paciente para búsquedas más profundas
        const pacienteActual = listaFamiliares.find(p => p.id === pacienteId);
        const curpPaciente = (pacienteActual && pacienteActual.curp) ? pacienteActual.curp.toUpperCase() : null;

        let filtroGab = `paciente_id.eq.${pacienteId}`;
        let filtroLab = `paciente_id.eq.${pacienteId}`;
        if (curpPaciente) {
            filtroGab = `${filtroGab},curp.eq.${curpPaciente}`;
            filtroLab = `${filtroLab},paciente_curp.eq.${curpPaciente}`;
        }

        // 🚀 CONSULTA PARALELA MAESTRA (Las 3 tablas al mismo tiempo)
        const [promesaNotas, promesaGab, promesaLab] = await Promise.all([
            fisioNet.from('historial_clinico')
                .select('id_nota, fecha_nota, motivo_consulta, diagnostico_principal, plan_tratamiento, nota_evolucion, especialidad_nota, nombre_clinica, sintomas')
                .eq('id_paciente', pacienteId)
                .order('fecha_nota', { ascending: false }),

            fisioNet.from('estudios_gabinete')
                .select('id, paciente_id, fecha_registro, tipo_estudio, zona_anatomica, archivo_url, especialista_nombre, diagnostico_radiologico, estado_dictamen, hallazgos_resumen')
                .or(filtroGab)
                .order('fecha_registro', { ascending: false }),

            fisioNet.from('estudios_laboratorio')
                .select('id, paciente_id, created_at, estudios_etiquetas, archivo_pdf_url, especialista_quimico, observaciones, estado')
                .or(filtroLab)
                .order('created_at', { ascending: false })
        ]);

        if (promesaNotas.error) console.error("❌ Error Notas:", promesaNotas.error.message);
        if (promesaGab.error) console.error("❌ Error Gabinete:", promesaGab.error.message);
        if (promesaLab.error) console.error("❌ Error Laboratorio:", promesaLab.error.message);

        // --- CARGAR NOTAS ---
        notasGlobales = promesaNotas.data || [];
        renderizarNotas(notasGlobales);

        // --- UNIFICAR ESTUDIOS (GABINETE + LABORATORIO) ---
        const dataGab = promesaGab.data || [];
        const dataLab = promesaLab.data || [];

        const formGab = dataGab.map(g => ({
            id: g.id,
            origen: 'GABINETE',
            icono: 'fa-x-ray',
            color: '#00cfd5', // Color FisioCid
            titulo: g.tipo_estudio || 'ESTUDIO PACS',
            zona: g.zona_anatomica ? ` • ${g.zona_anatomica.toUpperCase()}` : '',
            resumen: g.hallazgos_resumen || g.diagnostico_radiologico || 'Estudio de imagen procesado en visor.',
            url: g.archivo_url,
            especialista: g.especialista_nombre || 'Radiología',
            fecha: g.fecha_registro,
            estado: g.estado_dictamen || 'PENDIENTE'
        }));

        const formLab = dataLab.map(l => ({
            id: l.id,
            origen: 'LABORATORIO',
            icono: 'fa-vial',
            color: '#8b5cf6', // Morado para lab
            titulo: l.estudios_etiquetas || 'ANÁLISIS CLÍNICO',
            zona: '',
            resumen: l.observaciones || 'Resultados de laboratorio químico adjuntos.',
            url: l.archivo_pdf_url,
            especialista: l.especialista_quimico || 'Laboratorio',
            fecha: l.created_at,
            estado: l.estado || 'COMPLETADO'
        }));

        // 🔀 FUSIÓN CRONOLÓGICA
        estudiosGlobales = [...formGab, ...formLab].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
        
        renderizarEstudios(estudiosGlobales);

    } catch (err) {
        console.error("💥 Error general al recuperar registros:", err);
        const contenedor = document.getElementById('listaEstudios');
        if (contenedor) contenedor.innerHTML = '<div class="p-3 text-center text-danger small">Error al compilar el expediente de estudios.</div>';
    }
}

function renderizarNotas(lista) {
    const contenedor = document.getElementById('listaNotas');
    if (!contenedor) return;

    if (!lista || lista.length === 0) {
        contenedor.innerHTML = `<div class="text-center text-muted py-5"><i class="fas fa-folder-open fa-3x mb-3 text-secondary d-block"></i>No hay notas clínicas registradas en tu expediente.</div>`;
        return;
    }

    contenedor.innerHTML = lista.map(n => {
        const fechaFormateada = n.fecha_nota ? new Date(n.fecha_nota).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Fecha N/A';
        const diagnostico = n.diagnostico_principal || 'Consulta de Valoración';
        const clinica = n.nombre_clinica || 'FisioCid Red Global';
        
        return `
            <div class="record-card fade-in">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="record-date"><i class="fas fa-calendar-alt me-1"></i> ${fechaFormateada}</span>
                    <span class="record-spec"><i class="fas fa-file-medical me-1 icon-note"></i> ${n.especialidad_nota || 'Fisioterapia'}</span>
                </div>
                <h6 class="record-doctor"><i class="fas fa-user-md me-2 text-primary"></i>${diagnostico.toUpperCase()}</h6>
                <p class="record-summary mb-2"><strong>Motivo:</strong> ${n.motivo_consulta || 'Sin especificar.'}</p>
                ${n.plan_tratamiento ? `<div class="p-2 bg-light rounded text-dark small mb-1"><strong>Plan:</strong> ${n.plan_tratamiento}</div>` : ''}
                <div class="text-end text-muted small"><i class="fas fa-clinic-medical me-1"></i> Sede: ${clinica}</div>
            </div>
        `;
    }).join('');
}


// ==========================================
// 🎨 RENDERIZADO VISUAL DE ESTUDIOS (ESTILO TIMELINE)
// ==========================================
function renderizarEstudios(registros) {
    const contenedor = document.getElementById('listaEstudios');
    if (!contenedor) return;

    if (registros.length === 0) {
        contenedor.innerHTML = `
            <div class="text-center text-muted py-5 fade-in">
                <i class="fas fa-microscope fa-3x mb-3" style="color: #cbd5e1;"></i>
                <p>No tienes estudios de gabinete o laboratorio adjuntos.</p>
            </div>`;
        return;
    }

    contenedor.innerHTML = registros.map(reg => {
        const fechaLegible = reg.fecha ? new Date(reg.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente';
        const estadoActual = reg.estado.toUpperCase();
        const colorEstado = estadoActual === 'PENDIENTE' ? 'bg-warning text-dark' : 'bg-success text-white';

        return `
        <div class="card mb-3 border-0 shadow-sm animate__animated animate__fadeIn" style="border-left: 4px solid ${reg.color} !important; text-align: left; border-radius: 12px;">
            <div class="card-body p-4">
                
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="d-flex gap-2 align-items-center">
                        <span class="badge text-white" style="background-color: ${reg.color}; font-size: 0.7rem; padding: 6px 10px;">
                            <i class="fas ${reg.icono} me-1"></i> ${reg.origen}
                        </span>
                        <span class="badge ${colorEstado}" style="font-size: 0.65rem; padding: 6px 10px;">
                            <i class="fas ${estadoActual === 'PENDIENTE' ? 'fa-clock' : 'fa-check-circle'}"></i> ${estadoActual}
                        </span>
                    </div>
                    <span class="text-muted fw-bold" style="font-size: 0.85rem;"><i class="fas fa-calendar-alt me-1"></i> ${fechaLegible}</span>
                </div>

                <h5 class="fw-bold mb-2 text-dark text-uppercase">
                    ${reg.titulo} <span class="text-muted" style="font-size: 0.9rem;">${reg.zona}</span>
                </h5>
                
                <div class="p-3 my-3 rounded" style="background: #f8fafc; border: 1px solid #e2e8f0; font-size: 0.9rem; line-height: 1.5; color: #334155;">
                    <strong><i class="fas fa-file-medical-alt me-1 text-secondary"></i> Conclusión / Hallazgos:</strong><br>
                    ${reg.resumen}
                </div>

                <div class="d-flex justify-content-between align-items-center border-top pt-3 mt-2">
                    ${reg.url 
                        ? `<button type="button" onclick="abrirVisorPaciente('${reg.url}')" class="btn btn-outline-dark fw-bold rounded-pill shadow-sm" style="font-size: 0.85rem; padding: 8px 20px;">
                            <i class="fas ${reg.origen === 'GABINETE' ? 'fa-expand-arrows-alt' : 'fa-file-pdf'} me-1"></i> 
                            ${reg.origen === 'GABINETE' ? 'Ver Imagen PACS' : 'Descargar PDF'}
                           </button>` 
                        : `<span class="badge bg-light text-muted border p-2"><i class="fas fa-eye-slash"></i> Sin archivo adjunto</span>`
                    }
                    <span class="text-muted fw-bold" style="font-size: 0.8rem;"><i class="fas fa-user-md text-primary me-1"></i> ${reg.especialista}</span>
                </div>
                
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// 🔍 5. FILTROS Y UTILIDADES
// ==========================================
function aplicarFiltros() {
    const esp = document.getElementById('filtroEspecialidad')?.value || "";
    const doc = document.getElementById('filtroDoctor')?.value.toLowerCase() || "";
    const fecha = document.getElementById('filtroFecha')?.value || "";

    const filtradas = notasGlobales.filter(n => {
        return (esp === "" || (n.especialidad_nota && n.especialidad_nota.includes(esp))) &&
               (doc === "" || (n.diagnostico_principal && n.diagnostico_principal.toLowerCase().includes(doc))) &&
               (fecha === "" || (n.fecha_nota && n.fecha_nota.startsWith(fecha)));
    });

    renderizarNotas(filtradas);
}

async function cerrarSesion() {
    if (confirm("¿Deseas salir de tu expediente digital?")) {
        try {
            await fisioNet.auth.signOut();
        } catch (err) {
            console.error("Error al cerrar sesión en Supabase:", err);
        } finally {
            localStorage.clear();
            window.location.href = 'login.html';
        }
    }
}
// ==========================================
// 👤 6. RENDERIZADO DE PERFIL DEL PACIENTE
// ==========================================
function renderizarInfoPaciente(paciente) {
    const contenedor = document.getElementById('tarjeta-info-paciente');
    if (!contenedor) return;

    // Calcular edad si tienes el campo 'fecha_nacimiento'
    let edadStr = "No registrada";
    if (paciente.fecha_nacimiento) {
        const nac = new Date(paciente.fecha_nacimiento);
        const hoy = new Date();
        let edad = hoy.getFullYear() - nac.getFullYear();
        if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) {
            edad--;
        }
        edadStr = `${edad} años`;
    }

    // Iniciales para el Avatar
    const inicialNombre = paciente.nombre ? paciente.nombre.charAt(0).toUpperCase() : '';
    const inicialApellido = paciente.apellido_paterno ? paciente.apellido_paterno.charAt(0).toUpperCase() : '';

    contenedor.innerHTML = `
        <div class="card shadow-sm border-0" style="border-radius: var(--radius-lg); overflow: hidden;">
            <div class="card-body p-4 bg-white">
                <div class="d-flex align-items-center mb-3">
                    <div class="text-white d-flex justify-content-center align-items-center rounded-circle me-3 shadow-sm" style="background: var(--primary-cid); width: 65px; height: 65px; font-size: 26px; font-weight: bold;">
                        ${inicialNombre}${inicialApellido}
                    </div>
                    <div>
                        <h4 class="mb-1 fw-bold text-dark">${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno || ''}</h4>
                       
                    </div>
                </div>
                
                <div class="row g-3 mt-2">
                    <div class="col-md-6 col-lg-3">
                        <div class="p-3 rounded-3" style="background: #f8fafc; border-left: 4px solid var(--primary-cid);">
                            <small class="text-muted d-block mb-1 fw-bold"><i class="fas fa-birthday-cake me-1"></i> Edad</small>
                            <strong class="text-dark" style="font-size: 1.1rem;">${edadStr}</strong>
                        </div>
                    </div>
                    <div class="col-md-6 col-lg-3">
                        <div class="p-3 rounded-3" style="background: #f8fafc; border-left: 4px solid #22c55e;">
                            <small class="text-muted d-block mb-1 fw-bold"><i class="fab fa-whatsapp me-1"></i> Teléfono</small>
                            <strong class="text-dark" style="font-size: 1.1rem;">${paciente.telefono || 'No registrado'}</strong>
                        </div>
                    </div>
                    <div class="col-md-6 col-lg-3">
                        <div class="p-3 rounded-3" style="background: #f8fafc; border-left: 4px solid #f59e0b;">
                            <small class="text-muted d-block mb-1 fw-bold"><i class="fas fa-envelope me-1"></i> Correo</small>
                            <strong class="text-dark d-block text-truncate" style="font-size: 1rem;" title="${paciente.correo_electronico || ''}">${paciente.correo_electronico || 'No registrado'}</strong>
                        </div>
                    </div>
                    <div class="col-md-6 col-lg-3">
                        <div class="p-3 rounded-3" style="background: #f8fafc; border-left: 4px solid #ef4444;">
                            <small class="text-muted d-block mb-1 fw-bold"><i class="fas fa-id-card me-1"></i> CURP</small>
                            <strong class="text-dark" style="font-size: 1rem;">${paciente.curp ? paciente.curp.toUpperCase() : 'No registrada'}</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==========================================
// 🩻 VISOR PACS ADAPTADO PARA EL PACIENTE (CON CARRUSEL)
// ==========================================
let panzoomPaciente = null;
let tomasPacienteActuales = []; // Guardará todas las fotos del estudio
let indiceTomaPaciente = 0;     // Recordará qué número de foto estamos viendo

async function abrirVisorPaciente(rutasComa) {
    if (!rutasComa) return;
    
    // 1. Guardar las rutas en las variables globales
    tomasPacienteActuales = rutasComa.split(',').map(r => r.trim());
    indiceTomaPaciente = 0; // Siempre iniciamos en la primera toma

    // 2. Inyectar el HTML del Visor oscuro con FLECHAS y CONTADOR
    if (!document.getElementById('visor-paciente-overlay')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="visor-paciente-overlay" class="d-none animate__animated animate__fadeIn" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(5px); z-index: 9999; display: flex; flex-direction: column;">
                
                <!-- Barra superior -->
                <div style="padding: 15px 20px; background: #0f172a; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);">
                    <div class="d-flex align-items-center">
                        <h5 class="text-white mb-0 fw-bold me-3"><i class="fas fa-x-ray text-info me-2"></i> Visor FisioCid</h5>
                        <span id="visor-paciente-contador" class="badge bg-dark border border-secondary" style="font-size: 0.8rem;"></span>
                    </div>
                    <div>
                        <button class="btn btn-outline-info btn-sm me-2 fw-bold" onclick="if(panzoomPaciente) panzoomPaciente.reset()"><i class="fas fa-search-minus"></i> RESET ZOOM</button>
                        <button class="btn btn-danger btn-sm fw-bold" onclick="cerrarVisorPaciente()"><i class="fas fa-times"></i> CERRAR</button>
                    </div>
                </div>
                
                <!-- Área de la Imagen y Flechas -->
                <div style="flex: 1; position: relative; display: flex;">
                    
                    <!-- Flecha Izquierda -->
                    <button id="btn-visor-prev" class="btn btn-dark shadow" style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); z-index: 10000; border-radius: 50%; width: 50px; height: 50px; opacity: 0.8;" onclick="cambiarTomaPaciente(-1)">
                        <i class="fas fa-chevron-left fa-lg"></i>
                    </button>

                    <div id="visor-paciente-lienzo" style="flex: 1; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center;"></div>
                    
                    <!-- Flecha Derecha -->
                    <button id="btn-visor-next" class="btn btn-dark shadow" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); z-index: 10000; border-radius: 50%; width: 50px; height: 50px; opacity: 0.8;" onclick="cambiarTomaPaciente(1)">
                        <i class="fas fa-chevron-right fa-lg"></i>
                    </button>

                </div>
            </div>
        `);
    }

    const visor = document.getElementById('visor-paciente-overlay');
    visor.classList.remove('d-none');
    visor.style.display = 'flex'; 

    // 3. Disparar el renderizado de la primera imagen
    await renderizarTomaPaciente();
}

async function renderizarTomaPaciente() {
    const lienzo = document.getElementById('visor-paciente-lienzo');
    const archivoRuta = tomasPacienteActuales[indiceTomaPaciente];

    // Actualizar Contador y Ocultar/Mostrar flechas si solo hay 1 foto
    document.getElementById('visor-paciente-contador').innerText = `Toma ${indiceTomaPaciente + 1} de ${tomasPacienteActuales.length}`;
    
    const mostrarFlechas = tomasPacienteActuales.length > 1 ? 'block' : 'none';
    document.getElementById('btn-visor-prev').style.display = mostrarFlechas;
    document.getElementById('btn-visor-next').style.display = mostrarFlechas;

    // Mostrar Spinner
    lienzo.innerHTML = '<div class="spinner-border text-info" role="status" style="width: 3rem; height: 3rem;"></div>';

    // Limpiar zoom anterior si existía
    if (panzoomPaciente) {
        panzoomPaciente.destroy();
        panzoomPaciente = null;
    }

    try {
        // Firmar la URL de Supabase para la toma actual
        const { data, error } = await fisioNet.storage.from('expedientes-clinicos').createSignedUrl(archivoRuta, 3600);
        if (error) throw error;

        // Cargar motor Panzoom si no existe
        if (typeof Panzoom === 'undefined') {
            await new Promise(resolve => {
                const script = document.createElement('script');
                script.src = "https://cdn.jsdelivr.net/npm/@panzoom/panzoom@4.5.1/dist/panzoom.min.js";
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }

        // Renderizar la foto o PDF
        lienzo.innerHTML = ''; 
        if (archivoRuta.toLowerCase().endsWith('.pdf')) {
            lienzo.innerHTML = `<embed src="${data.signedUrl}" type="application/pdf" width="100%" height="100%" style="border: none;">`;
        } else {
            lienzo.innerHTML = `<img id="img-visor-paciente" src="${data.signedUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">`;
            const img = document.getElementById('img-visor-paciente');
            
            setTimeout(() => {
                panzoomPaciente = Panzoom(img, { maxScale: 6, minScale: 1, contain: 'outside' });
                lienzo.addEventListener('wheel', (e) => { 
                    e.preventDefault(); 
                    panzoomPaciente.zoomWithWheel(e); 
                }, { passive: false });
            }, 150);
        }

    } catch (err) {
        console.error("Error en renderizado:", err);
        lienzo.innerHTML = `<div class="text-center text-white"><i class="fas fa-exclamation-triangle text-warning fa-3x mb-3"></i><h5>Archivo no disponible.</h5></div>`;
    }
}

// Conmutador del Carrusel (Ciclo infinito)
function cambiarTomaPaciente(direccion) {
    if (tomasPacienteActuales.length <= 1) return; // Si solo hay 1, no hace nada

    indiceTomaPaciente += direccion;

    // Lógica de ciclo infinito
    if (indiceTomaPaciente >= tomasPacienteActuales.length) indiceTomaPaciente = 0;
    if (indiceTomaPaciente < 0) indiceTomaPaciente = tomasPacienteActuales.length - 1;

    renderizarTomaPaciente();
}

function cerrarVisorPaciente() {
    const visor = document.getElementById('visor-paciente-overlay');
    if (visor) {
        visor.classList.add('d-none');
        setTimeout(() => visor.style.display = 'none', 300);
        document.getElementById('visor-paciente-lienzo').innerHTML = ''; 
    }
    
    // Limpieza total
    if (panzoomPaciente) {
        panzoomPaciente.destroy();
        panzoomPaciente = null;
    }
    tomasPacienteActuales = [];
    indiceTomaPaciente = 0;
}