// ==========================================
// 🚀 VARIABLES GLOBALES
// ==========================================
let notasGlobales = [];
let estudiosGlobales = [];
let perfilActivoId = null;
let pacienteLogueadoData = null;
let listaFamiliares = [];
let idSolicitudActiva = null;

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

function seleccionarPerfil(idPaciente) {
    perfilActivoId = idPaciente;
    const paciente = listaFamiliares.find(p => p.id === idPaciente);
    
    if (paciente) {
        const lblSaludo = document.getElementById('txtSaludo');
        if (lblSaludo) lblSaludo.innerText = `¡Hola, ${paciente.nombre.toUpperCase()}!`;
        
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

    if (!permiteNotas && !permiteEstudios) {
        alert("⚠️ Selecciona al menos una opción para compartir.");
        return;
    }

    try {
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

// ==========================================
// 📄 3. CARGA DE REGISTROS CLÍNICOS (SIN ACENTOS)
// ==========================================
async function cargarRegistrosClinicos(pacienteId) {
    try {
        console.log("📥 Consultando base de datos para el paciente ID:", pacienteId);

        // A) NOTAS CLÍNICAS (Tabla: historial_clinico)
        const { data: notas, error: errNotas } = await fisioNet
            .from('historial_clinico')
            .select('id_nota, fecha_nota, motivo_consulta, diagnostico_principal, plan_tratamiento, nota_evolucion, especialidad_nota, nombre_clinica, sintomas')
            .eq('id_paciente', pacienteId)
            .order('fecha_nota', { ascending: false });

        if (errNotas) console.error("❌ Error en historial_clinico:", errNotas);
        notasGlobales = notas || [];
        renderizarNotas(notasGlobales);

        // B) ESTUDIOS DE GABINETE (Tabla: estudios_gabinete)
        const { data: gabinete, error: errGab } = await fisioNet
            .from('estudios_gabinete')
            .select('id, tipo_estudio, archivo_url, categoria, hallazgos_resumen, fecha_registro, especialista_nombre, diagnostico_radiologico')
            .eq('paciente_id', pacienteId)
            .order('fecha_registro', { ascending: false });

        if (errGab) console.error("❌ Error en estudios_gabinete:", errGab);

        // C) ESTUDIOS DE LABORATORIO (Tabla: estudios_laboratorio)
        const { data: lab, error: errLab } = await fisioNet
            .from('estudios_laboratorio')
            .select('id, estudios_etiquetas, archivo_pdf_url, observaciones, created_at, especialista_quimico')
            .eq('paciente_id', pacienteId)
            .order('created_at', { ascending: false });

        if (errLab) console.error("❌ Error en estudios_laboratorio:", errLab);

        // COMBINAMOS Y UNIFICAMOS ESTUDIOS
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
// 🔍 4. FILTROS Y UTILIDADES
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

function cerrarSesion() {
    if (confirm("¿Deseas salir de tu expediente digital?")) {
        localStorage.removeItem('paciente_maestro_id');
        localStorage.removeItem('paciente_sesion_id');
        window.location.href = 'login.html';
    }
}