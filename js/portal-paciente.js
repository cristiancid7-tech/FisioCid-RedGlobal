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
// ==========================================
// ⚡ INICIALIZACIÓN CON AUTO-RECUPERACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Buscamos primero en el LocalStorage
        let idPaciente = localStorage.getItem('paciente_maestro_id') || localStorage.getItem('paciente_sesion_id');
        
        // 2. Si no hay en localStorage, buscamos si viene en la URL (?id=UUID)
        if (!idPaciente) {
            const urlParams = new URLSearchParams(window.location.search);
            idPaciente = urlParams.get('id');
        }

        // 3. AUTO-RECUPERACIÓN DESDE AUTH: Si sigue nulo, le preguntamos directo a Supabase Auth quién está logueado
        if (!idPaciente) {
            console.log("🔍 Intentando auto-recuperar ID desde la sesión activa de Supabase Auth...");
            const { data: { user } } = await fisioNet.auth.getUser();
            
            if (user) {
                // Buscamos el expediente maestro asociado a este usuario de Auth
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

        // 4. EVALUACIÓN FINAL DE IDENTIDAD
        if (idPaciente) {
            console.log("✅ Paciente identificado con éxito ID:", idPaciente);
            localStorage.setItem('paciente_maestro_id', idPaciente);
            
            await cargarExpedienteCompleto(idPaciente);
            escucharSolicitudesEnVivo(idPaciente);
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
        console.log("📥 Jalando datos de la DB para el paciente:", pacienteId);

        // A) NOTAS CLÍNICAS (Tabla: historial_clinico)
        const { data: notas, error: errNotas } = await fisioNet
            .from('historial_clinico')
            .select('id_nota, fecha_nota, motivo_consulta, diagnostico_principal, plan_tratamiento, nota_evolucion, especialidad_nota, nombre_clinica')
            .eq('id_paciente', pacienteId)
            .order('fecha_nota', { ascending: false });

        if (errNotas) console.error("❌ Error en historial_clinico:", errNotas);
        notasGlobales = notas || [];
        renderizarNotas(notasGlobales);

        // B) ESTUDIOS DE GABINETE / ULTRASONIDOS (Tabla: estudios_gabinete)
        const { data: gabinete, error: errGab } = await fisioNet
            .from('estudios_gabinete')
            .select('id, tipo_estudio, archivo_url, categoria, hallazgos_resumen, fecha_registro, especialista_nombre, diagnostico_radiologico')
            .eq('paciente_id', pacienteId)
            .order('fecha_registro', { ascending: false });

        if (errGab) console.error("❌ Error en estudios_gabinete:", errGab);

        // C) ESTUDIOS DE LABORATORIO (Tabla: estudios_laboratorio)
        const { data: lab, error: errLab } = await fisioNet
            .from('estudios_laboratorio')
            .select('id, tipo_estudio:estudios_etiquetas, archivo_url:archivo_pdf_url, observaciones, created_at, especialista_quimico')
            .eq('paciente_id', pacienteId)
            .order('created_at', { ascending: false });

        if (errLab) console.error("❌ Error en estudios_laboratorio:", errLab);

        // Combinamos gabinete y laboratorio en la pestaña de estudios
        const listaEstudiosCombinada = [
            ...(gabinete || []).map(g => ({ ...g, origen: 'GABINETE', fecha: g.fecha_registro })),
            ...(lab || []).map(l => ({ ...l, origen: 'LABORATORIO', fecha: l.created_at, tipo_estudio: l.estudios_etiquetas || 'Laboratorio', archivo_url: l.archivo_pdf_url, hallazgos_resumen: l.observaciones, especialista_nombre: l.especialista_quimico }))
        ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

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
       const titulo = e.tipo_estudio || (esLab ? 'Análisis Clínico' : 'Estudio de Imagen');
        const resumen = e.hallazgos_resumen || e.diagnostico_radiologico || 'Estudio registrado en sistema.';

        return `
            <div class="record-card fade-in">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="record-date"><i class="fas fa-calendar-alt me-1"></i> ${fecha}</span>
                    <span class="badge ${esLab ? 'bg-warning text-dark' : 'bg-primary'} rounded-pill">
                        <i class="fas ${esLab ? 'fa-vial' : 'fa-camera'} me-1"></i> ${e.origen}
                    </span>
                </div>
                <h6 class="record-doctor"><i class="fas ${icono} me-2"></i>${titulo.toUpperCase()}</h6>
                <p class="record-summary">${resumen}</p>
                ${e.especialista_nombre ? `<div class="text-muted small mb-2"><strong>Especialista:</strong> ${e.especialista_nombre}</div>` : ''}
                ${e.archivo_url ? `<a href="${e.archivo_url}" target="_blank" class="btn btn-sm btn-outline-primary rounded-pill mt-1"><i class="fas fa-file-pdf me-1"></i> Abrir Documento / PDF</a>` : ''}
            </div>
        `;
    }).join('');
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