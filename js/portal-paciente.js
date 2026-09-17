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
            console.log("🔍 Intentando auto-recuperar ID desde la sesión activa de Supabase Auth...");
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
            console.log("✅ Paciente identificado con éxito ID:", idPaciente);
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
        console.log("⏳ Cargando expediente familiar para ID:", pacienteId);

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
    }
}

// ==========================================
// 📡 2. MOTOR DE AUTORIZACIÓN EN TIEMPO REAL (OTP)
// ==========================================
async function escucharSolicitudesEnVivo(pacienteId) {
    console.log("👂 Escuchando solicitudes médicas en tiempo real para:", pacienteId);
    verificarSolicitudesPendientes(pacienteId);

    fisioNet
        .channel('solicitudes_medicas_otp')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'solicitudes_acceso_otp',
            filter: `id_paciente=eq.${pacienteId}`
        }, payload => {
            console.log("🔔 ¡NUEVA SOLICITUD DETECTADA EN VIVO! Payload:", payload.new);
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
document.getElementById('formRegistro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnConfirmar');
    
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
                id_clinica_solicitada: window.clinicaSeleccionadaId,
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
// 📄 4. CARGA DE REGISTROS CLÍNICOS
// ==========================================
async function cargarRegistrosClinicos(pacienteId) {
    try {
        console.log("📥 Consultando base de datos para el paciente ID:", pacienteId);

        const { data: notas, error: errNotas } = await fisioNet
            .from('historial_clinico')
            .select('id_nota, fecha_nota, motivo_consulta, diagnostico_principal, plan_tratamiento, nota_evolucion, especialidad_nota, nombre_clinica, sintomas')
            .eq('id_paciente', pacienteId)
            .order('fecha_nota', { ascending: false });

        if (errNotas) console.error("❌ Error en historial_clinico:", errNotas);
        notasGlobales = notas || [];
        renderizarNotas(notasGlobales);

        const { data: gabinete, error: errGab } = await fisioNet
            .from('estudios_gabinete')
            .select('id, tipo_estudio, archivo_url, categoria, hallazgos_resumen, fecha_registro, especialista_nombre, diagnostico_radiologico')
            .eq('paciente_id', pacienteId)
            .order('fecha_registro', { ascending: false });

        if (errGab) console.error("❌ Error en estudios_gabinete:", errGab);

        const { data: lab, error: errLab } = await fisioNet
            .from('estudios_laboratorio')
            .select('id, estudios_etiquetas, archivo_pdf_url, observaciones, created_at, especialista_quimico')
            .eq('paciente_id', pacienteId)
            .order('created_at', { ascending: false });

        if (errLab) console.error("❌ Error en estudios_laboratorio:", errLab);

        const listaEstudiosCombinada = [
            ...(gabinete || []).map(g => ({
                id: g.id,
                origen: 'GABINETE',
                titulo: g.tipo_estudio || 'Estudio de Imagen',
                resumen: g.hallazgos_resumen || g.diagnostico_radiologico || 'Estudio adjunto al expediente.',
                url: g.archivo_url,
                especialista: g.especialista_nombre,
                fecha: g.fecha_registro
            })),
            ...(lab || []).map(l => ({
                id: l.id,
                origen: 'LABORATORIO',
                titulo: l.estudios_etiquetas || 'Análisis Clínico',
                resumen: l.observaciones || 'Resultados de laboratorio adjuntos.',
                url: l.archivo_pdf_url,
                especialista: l.especialista_quimico,
                fecha: l.created_at
            }))
        ].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

        estudiosGlobales = listaEstudiosCombinada;
        renderizarEstudios(estudiosGlobales);

    } catch (err) {
        console.error("💥 Error general al recuperar registros:", err);
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

function renderizarEstudios(lista) {
    const contenedor = document.getElementById('listaEstudios');
    if (!contenedor) return;

    if (!lista || lista.length === 0) {
        contenedor.innerHTML = `<div class="text-center text-muted py-5"><i class="fas fa-microscope fa-3x mb-3 text-secondary d-block"></i>No tienes estudios de gabinete o laboratorio adjuntos.</div>`;
        return;
    }

    contenedor.innerHTML = lista.map(e => {
        const fecha = e.fecha ? new Date(e.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente';
        const esLab = e.origen === 'LABORATORIO';
        const icono = esLab ? 'fa-vial icon-lab' : 'fa-x-ray icon-img';

        return `
            <div class="record-card fade-in">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="record-date"><i class="fas fa-calendar-alt me-1"></i> ${fecha}</span>
                    <span class="badge ${esLab ? 'bg-warning text-dark' : 'bg-primary'} rounded-pill">
                        <i class="fas ${esLab ? 'fa-vial' : 'fa-camera'} me-1"></i> ${e.origen}
                    </span>
                </div>
                <h6 class="record-doctor"><i class="fas ${icono} me-2"></i>${e.titulo.toUpperCase()}</h6>
                <p class="record-summary mb-2">${e.resumen}</p>
                ${e.especialista ? `<div class="text-muted small mb-2"><strong>Especialista:</strong> ${e.especialista}</div>` : ''}
                ${e.url ? `<a href="${e.url}" target="_blank" class="btn btn-sm btn-outline-primary rounded-pill mt-1"><i class="fas fa-file-pdf me-1"></i> Abrir Documento / PDF</a>` : '<span class="badge bg-light text-muted">Sin archivo adjunto</span>'}
            </div>
        `;
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