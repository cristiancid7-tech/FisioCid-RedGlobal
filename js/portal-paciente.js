// ==========================================
// 🚀 VARIABLES GLOBALES
// ==========================================
let notasGlobales = [];
let perfilActivoId = null;
let pacienteLogueadoData = null;
let listaFamiliares = [];
let idSolicitudActiva = null;

// ==========================================
// ⚡ INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificamos si hay un paciente en sesión (ID guardado en LocalStorage)
    const sesionGuardada = localStorage.getItem('paciente_sesion_id');
    
    if (sesionGuardada) {
        await cargarExpedienteCompleto(sesionGuardada);
        escucharSolicitudesEnVivo(sesionGuardada);
    } else {
        console.log("ℹ️ Esperando inicio de sesión o parámetro URL...");
        // Búsqueda alternativa si viene por ID en la URL (?id=UUID)
        const urlParams = new URLSearchParams(window.location.search);
        const idUrl = urlParams.get('id');
        if (idUrl) {
            localStorage.setItem('paciente_sesion_id', idUrl);
            await cargarExpedienteCompleto(idUrl);
            escucharSolicitudesEnVivo(idUrl);
        }
    }
});

// ==========================================
// 👨‍👩‍👧‍👦 1. CARGA DE EXPEDIENTE Y FAMILIARES
// ==========================================
async function cargarExpedienteCompleto(pacienteId) {
    try {
        console.log("⏳ Cargando expediente familiar para ID:", pacienteId);

        // Consultamos al paciente principal y sus hijos (vinculados por id_tutor)
        const { data: familia, error } = await fisioNet
            .from('pacientes_maestros')
            .select('*')
            .or(`id.eq.${pacienteId},id_tutor.eq.${pacienteId}`);

        if (error) throw error;

        if (familia && familia.length > 0) {
            listaFamiliares = familia;
            
            // Definir titular
            const titular = familia.find(p => p.id === pacienteId) || familia[0];
            pacienteLogueadoData = titular;

            // Inyectar nombres en Navbar
            const lblUser = document.getElementById('nombreUserActivo');
            const lblTutor = document.getElementById('nombreTutorMenu');
            if (lblUser) lblUser.innerText = `${titular.nombre} ${titular.apellido_paterno}`;
            if (lblTutor) lblTutor.innerText = `${titular.nombre} (Titular)`;

            // Inyectar hijos/familiares en el dropdown
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

            // Seleccionar por defecto al titular
            seleccionarPerfil(titular.id);
        }
    } catch (e) {
        console.error("❌ Error al cargar expediente familiar:", e);
    }
}

function seleccionarPerfil(idPaciente) {
    perfilActivoId = idPaciente;
    const paciente = listaFamiliares.find(p => p.id === idPaciente);
    
    if (paciente) {
        const lblSaludo = document.getElementById('txtSaludo');
        if (lblSaludo) lblSaludo.innerText = `¡Hola, ${paciente.nombre}!`;
        
        // Cargar registros correspondientes a este perfil
        cargarRegistrosClinicos(idPaciente);
    }
}

// ==========================================
// 📡 2. MOTOR DE AUTORIZACIÓN EN TIEMPO REAL (OTP)
// ==========================================
async function escucharSolicitudesEnVivo(pacienteId) {
    console.log("👂 Escuchando solicitudes médicas en tiempo real para:", pacienteId);

    // Búsqueda inicial de solicitudes pendientes de aprobación
    verificarSolicitudesPendientes(pacienteId);

    // Canal Realtime con Supabase
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

    // 🎯 Usamos la columna nombre_profesional
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

    if (!permiteNotas && !permiteEstudios) {
        alert("⚠️ Selecciona al menos una opción para compartir.");
        return;
    }

    try {
        // 🎯 Guardamos en la columna permisos_concedidos como JSON/Objeto
        const { error } = await fisioNet
            .from('solicitudes_acceso_otp')
            .update({
                estado_solicitud: 'APROBADO',
                permisos_concedidos: {
                    notas: permiteNotas,
                    estudios: permiteEstudios
                }
            })
            .eq('id', idSolicitudActiva);

        if (error) throw error;

        alert("✅ ¡Acceso Autorizado! Tu médico ya puede visualizar la información seleccionada.");
        
        const card = document.getElementById('cardSolicitudActiva');
        if (card) card.style.display = 'none';

    } catch (err) {
        console.error("❌ Error al autorizar acceso:", err.message);
        alert("Error al procesar la autorización: " + err.message);
    }
}

// 🎯 BOTÓN DEL PACIENTE: Aprobar y autorizar acceso al Doctor
async function aprobarAccesoDoctor() {
    if (!idSolicitudActiva) {
        alert("⚠️ No hay ninguna solicitud activa para autorizar.");
        return;
    }

    const permiteNotas = document.getElementById('chkPermisoNotas')?.checked || false;
    const permiteEstudios = document.getElementById('chkPermisoEstudios')?.checked || false;

    if (!permiteNotas && !permiteEstudios) {
        alert("⚠️ Debes seleccionar al menos una opción de información para compartir con tu médico.");
        return;
    }

    try {
        console.log("🚀 Autorizando acceso en Supabase para solicitud:", idSolicitudActiva);

        const { error } = await fisioNet
            .from('solicitudes_acceso_otp')
            .update({
                estado_solicitud: 'APROBADO',
                permite_notas: permiteNotas,
                permite_estudios: permiteEstudios,
                fecha_aprobacion: new Date().toISOString()
            })
            .eq('id', idSolicitudActiva);

        if (error) throw error;

        alert("✅ ¡Acceso Autorizado! Tu médico ya puede visualizar los registros seleccionados en su pantalla.");
        
        // Ocultamos el banner
        const card = document.getElementById('cardSolicitudActiva');
        if (card) card.style.display = 'none';

    } catch (err) {
        console.error("❌ Error al autorizar acceso:", err.message);
        alert("Ocurrió un error al procesar la autorización.");
    }
}

// ==========================================
// 📄 3. CARGA DE REGISTROS CLÍNICOS
// ==========================================
async function cargarRegistrosClinicos(pacienteId) {
    try {
        // Consultar Notas
        const { data: notas } = await fisioNet
            .from('historia_clinica_notas')
            .select('*')
            .eq('id_paciente', pacienteId)
            .order('fecha_consulta', { ascending: false });

        notasGlobales = notas || [];
        renderizarNotas(notasGlobales);

    } catch (err) {
        console.error("Error al cargar registros:", err);
    }
}

function renderizarNotas(lista) {
    const contenedor = document.getElementById('listaNotas');
    if (!contenedor) return;

    if (!lista || lista.length === 0) {
        contenedor.innerHTML = `<div class="text-center text-muted py-4"><i class="fas fa-folder-open fa-2x mb-2 d-block"></i> No hay notas clínicas registradas.</div>`;
        return;
    }

    contenedor.innerHTML = lista.map(n => `
        <div class="record-card fade-in">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="record-date"><i class="fas fa-calendar-alt me-1"></i> ${n.fecha_consulta || 'Fecha N/A'}</span>
                <span class="record-spec"><i class="fas fa-file-medical me-1 icon-note"></i> Nota de Evolución</span>
            </div>
            <h6 class="record-doctor"><i class="fas fa-user-md me-2 text-primary"></i>${n.nombre_profesional || 'FisioCid Red'}</h6>
            <p class="record-summary">${n.diagnostico_subjetivo || n.resumen_clinico || 'Sin observaciones adicionales.'}</p>
        </div>
    `).join('');
}

// ==========================================
// 🔍 4. FILTROS Y UTILIDADES
// ==========================================
function aplicarFiltros() {
    const esp = document.getElementById('filtroEspecialidad')?.value || "";
    const doc = document.getElementById('filtroDoctor')?.value.toLowerCase() || "";
    const fecha = document.getElementById('filtroFecha')?.value || "";

    const filtradas = notasGlobales.filter(n => {
        return (esp === "" || n.especialidad === esp) &&
               (doc === "" || (n.nombre_profesional && n.nombre_profesional.toLowerCase().includes(doc))) &&
               (fecha === "" || (n.fecha_consulta && n.fecha_consulta.startsWith(fecha)));
    });

    renderizarNotas(filtradas);
}

function cerrarSesion() {
    if (confirm("¿Deseas salir de tu expediente digital?")) {
        localStorage.removeItem('paciente_sesion_id');
        window.location.reload();
    }
}