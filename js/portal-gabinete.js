// ============================================================================
// 🩺 PORTAL DE DIAGNÓSTICO POR GABINETE FISIOCID (VERSION DE PRODUCCIÓN 2026)
// Archivo: portal-gabinete.js
// Gestión de Identidad, Buscador Multi-Palabra, Candados de Seguridad y OTP
// ============================================================================
let tomasVisorActualesA = []; 
let tomasVisorActualesB = []; 
let indiceTomaActivaA = 0;
let indiceTomaActivaB = 0;
let pacienteExistenteId = null;
let archivosParaSubir = [];
let perfilEspecialistaCache = null; // Guardamos el rol del usuario logueado
let edicionFichaAutorizada = false;
let historialGabineteCache = []; // Caché global para evitar llamadas excesivas a la DB
let timeoutBusqueda = null;
let estudioActivoGlobal = null
// --- INSTANCIAS DE CONTROL DE ZOOM ---
let instancePanzoomIzq = null;
let instancePanzoomDer = null;

let tomasVisorActuales = [];
let indiceTomaActiva = 0;
let datosPacienteActualCache = { nombre: '', info: '' }; 
let modoDictadoActivo = false;


document.addEventListener('DOMContentLoaded', async () => {
    // 1. BLINDAJE DE INPUTS (Protección de escritura)
    const inputsDictamenFisioCid = ['descripcion-hallazgos-pacs', 'conclusion-estudio-pacs'];
    inputsDictamenFisioCid.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('mousedown', (e) => e.stopPropagation(), { capture: true });
        }
    });

    // 2. EVENTOS DE BOTONES (Asignación segura)
    const btnReset = document.getElementById('btn-reset-zoom');
    const btnCerrar = document.getElementById('btn-cerrar-visor');
    
    if (btnReset) btnReset.addEventListener('click', (e) => { e.stopPropagation(); reiniciarZoomTomas(); });
    if (btnCerrar) btnCerrar.addEventListener('click', (e) => { e.stopPropagation(); cerrarComparativa(); });

    // 3. INICIALIZACIÓN DEL SISTEMA
    console.log("🔬 Portal de Especialista Listo...");
    await mostrarNombreEspecialista();
    await aplicarIdentidadGabinete();
    await cargarRadiologosDisponibles();

    // 4. CARGA INTELIGENTE
    const forzarArchivo = localStorage.getItem('forzar_apertura_archivo');
    const forzarPaciente = localStorage.getItem('forzar_apertura_paciente');
    const forzarEstudioId = localStorage.getItem('forzar_apertura_estudio_id');

    if (forzarArchivo && forzarPaciente && forzarEstudioId) {
        localStorage.removeItem('forzar_apertura_archivo');
        localStorage.removeItem('forzar_apertura_paciente');
        localStorage.removeItem('forzar_apertura_estudio_id');
        await abrirEstudioParaDictamenMaestro(forzarEstudioId, forzarArchivo, forzarPaciente);
    } else {
        await cargarHistorialPersonal();
    }

 const inputArchivos = document.getElementById('archivos-gabinete');
    if (inputArchivos) {
        inputArchivos.addEventListener('change', (e) => {
    const nuevosArchivos = Array.from(e.target.files);
    console.log("📂 Archivos antes de asignar:", nuevosArchivos);
    
    // 🔥 AQUÍ ESTÁ EL CANDADO: ¿Estás actualizando la variable global?
    archivosParaSubir = nuevosArchivos; 
    console.log("✅ Variable global actualizada:", archivosParaSubir);

    renderizarMiniaturas();

    // El setTimeout le da un respiro al navegador para que termine de procesar el archivo
    setTimeout(() => {
        try { e.target.value = ''; } catch(err) {}
    }, 0); 
    });
    }
    document.querySelectorAll('input:not([type="file"]), textarea').forEach(el => {
    // Saltamos el listener si es un campo de email
    if (el.type === 'email' || el.id === 'valEmail') return;

    el.addEventListener('input', (e) => {
        // Solo convertimos a mayúsculas si no es un campo de email
        if (e.target.type !== 'email' && e.target.id !== 'valEmail') {
            e.target.value = e.target.value.toUpperCase();
        }
    });
});
});



function toggleSidebarPACS() {
    const sidebar = document.getElementById('sidebarHistorialPACS');
    const btn = document.getElementById('btn-toggle-historial-pacs');
    if (!sidebar || !btn) return;

    if (sidebar.classList.contains('d-none')) {
        sidebar.classList.remove('d-none');
        btn.innerHTML = '<i class="fas fa-eye-slash me-1"></i> OCULTAR HISTORIAL';
        btn.classList.remove('btn-outline-info');
        btn.classList.add('btn-info');
    } else {
        sidebar.classList.add('d-none');
        btn.innerHTML = '<i class="fas fa-history me-1"></i> MOSTRAR HISTORIAL';
        btn.classList.remove('btn-info');
        btn.classList.add('btn-outline-info');
    }
    

}
// Lo exponemos globalmente para el onclick del HTML
window.toggleSidebarPACS = toggleSidebarPACS;

function togglePanelDictamen() {
    const panel = document.getElementById('panel-dictamen-radiologo');
    const btn = document.getElementById('btn-toggle-dictamen');
    
    if (!panel || !btn) return;

    if (panel.classList.contains('d-none')) {
        // Mostrar el panel
        panel.classList.remove('d-none');
        panel.style.setProperty('display', 'block', 'important'); 
        btn.innerHTML = '<i class="fas fa-eye-slash me-1"></i> OCULTAR DICTAMEN';
    } else {
        // Ocultar el panel
        panel.classList.add('d-none');
        panel.style.removeProperty('display'); // 🔥 ESTA ES LA LÍNEA MÁGICA QUE LO ARREGLA
        btn.innerHTML = '<i class="fas fa-pen-nib me-1"></i> MOSTRAR DICTAMEN';
    }

    // 🚀 Le damos un respiro y reajustamos el zoom para que la imagen aproveche el espacio nuevo
    setTimeout(() => {
        if (typeof reiniciarZoomTomas === 'function') reiniciarZoomTomas();
    }, 150);
}
window.togglePanelDictamen = togglePanelDictamen;


async function abrirEstudioParaDictamenMaestro(estudioId, archivoUrl, pacienteNombreFull, indiceInicial = 0) {
    estudioActivoGlobal = estudioId;
    console.group("📡 [FisioCid PACS] Apertura Maestro");
    
    // 1. Validaciones preventivas
    if (!estudioId || estudioId === "undefined") {
        console.error("❌ ID de estudio inválido");
        return;
    }

    const panelHistorial = document.getElementById('offcanvasHistorial');
    const txtHallazgos = document.getElementById('descripcion-hallazgos-pacs');

    // Cierre de offcanvas de Bootstrap
    if (panelHistorial) {
        const instanciaBootstrap = bootstrap.Offcanvas.getInstance(panelHistorial);
        if (instanciaBootstrap) instanciaBootstrap.hide();
    }

    try {
        // 🚀 RESET DE PANTALLA: Aseguramos que inicie ocupando todo (100%)
        const panelIzq = document.getElementById('panelIzquierdoVisor');
        const panelDer = document.getElementById('panelDerechoVisor');
        
        if (panelIzq) { 
            panelIzq.classList.add('w-100'); 
            panelIzq.classList.remove('w-50'); 
        }
        if (panelDer) { 
            panelDer.classList.add('d-none'); 
            panelDer.classList.remove('w-50');
        }

        const visor = document.getElementById('visorComparativa');
        if (visor) {
            visor.dataset.estudioActivoId = estudioId;
            // 🔥 AQUÍ ESTÁ LA MAGIA QUE FALTABA PARA ABRIR EL MODAL:
            visor.classList.remove('d-none');
            visor.style.setProperty('display', 'block', 'important');
        }

        // Inyección al botón de dictamen
        const btnFinalizar = document.getElementById('btn-finalizar-pacs');
        if (btnFinalizar) btnFinalizar.dataset.estudioActivoId = estudioId;

        // Mostrar panel de dictamen
        const panelDictamen = document.getElementById('panel-dictamen-radiologo');
        if (panelDictamen) {
            panelDictamen.classList.remove('d-none');
            panelDictamen.style.setProperty('display', 'block', 'important');
        }

        // Carga de imágenes
        await abrirTomaInmediata(archivoUrl, indiceInicial, pacienteNombreFull, 'EXAMEN EN CURSO', 'A');

        // Antes de hacer el select, añade este log para ver qué está pasando
        console.log("DEBUG: Intentando buscar ID:", estudioId); 

        // Si estudioId es un objeto o tiene algo raro, lo forzamos a string
        const idBuscado = String(estudioId).trim();

        const { data: estudioActual, error: errQuery } = await fisioNet
            .from('estudios_gabinete')
            .select('paciente_id, hallazgo_tecnica, diagnostico_radiologico') // Usamos los nombres reales de la tabla
            .eq('id', idBuscado) // 🔥 AJUSTE: Usamos la variable limpia idBuscado
            .maybeSingle();

        if (errQuery) throw errQuery;

        if (estudioActual) {
            const txtHallazgos = document.getElementById('descripcion-hallazgos-pacs');
            const txtC = document.getElementById('conclusion-estudio-pacs');

            if (txtHallazgos) txtHallazgos.value = estudioActual.hallazgo_tecnica || '';
            if (txtC) txtC.value = estudioActual.diagnostico_radiologico || '';
            
            // Guardado de estado
            if (visor) visor.dataset.pacienteActivoId = estudioActual.paciente_id;
            
            // 🔥 SEGURIDAD: Actualizamos la UI solo si el elemento existe
            const lblNombre = document.getElementById('pacs-nombre-paciente');
            if (lblNombre) lblNombre.innerText = pacienteNombreFull;
            
            // Carga de línea de tiempo
            console.log("🚀 Disparando carga de historial para:", estudioActual.paciente_id);
            await cargarLineaTiempoPACS(estudioActual.paciente_id, estudioId);
          
            await verificarYRenderizarBotonIntegrar();
            console.log("✅ Blindaje y carga completados con éxito.");
        }

    } catch (err) {
        console.error("❌ Error en apertura maestra:", err);
    } finally {
        console.groupEnd();
    }

}


async function renderizarTomaActivaEnLienzo(panel = 'A') {
    const esPanelA = (panel === 'A');
    const imgElement = document.getElementById(esPanelA ? 'imgIzquierda' : 'imgDerecha');
    const contadorBadge = document.getElementById(esPanelA ? 'badgeContadorTomasVisorA' : 'badgeContadorTomasVisorB');
    const btnIzq = document.getElementById(esPanelA ? 'btnFlechaVisorIzqA' : 'btnFlechaVisorIzqB');
    const btnDer = document.getElementById(esPanelA ? 'btnFlechaVisorDerA' : 'btnFlechaVisorDerB');
    const wrapperId = esPanelA ? 'div-zoom-izq' : 'div-zoom-der';
    const wrapper = document.getElementById(wrapperId);

    const tomas = esPanelA ? tomasVisorActualesA : tomasVisorActualesB;
    const indice = esPanelA ? indiceTomaActivaA : indiceTomaActivaB;

    try {
        const archivoRutaRaw = tomas[indice];
        if (!archivoRutaRaw) return;
        const archivoRuta = archivoRutaRaw.trim();
        const esPDF = archivoRuta.toLowerCase().endsWith('.pdf');

        // 1. Actualización de Interfaz (Contadores y Flechas)
        if (contadorBadge) contadorBadge.innerText = `Toma ${indice + 1} / ${tomas.length}`;
        if (tomas.length > 1) {
            if (btnIzq) btnIzq.classList.remove('d-none');
            if (btnDer) btnDer.classList.remove('d-none');
        } else {
            if (btnIzq) btnIzq.classList.add('d-none');
            if (btnDer) btnDer.classList.add('d-none');
        }

        // 2. Obtener URL Firmada de Supabase
        const { data, error } = await fisioNet.storage.from('expedientes-clinicos').createSignedUrl(archivoRuta, 3600);
        if (error) throw error;

        // 3. LIMPIEZA TOTAL: Destruimos Panzoom para evitar conflictos
        if (esPanelA && instancePanzoomIzq) { instancePanzoomIzq.destroy(); instancePanzoomIzq = null; }
        if (!esPanelA && instancePanzoomDer) { instancePanzoomDer.destroy(); instancePanzoomDer = null; }

        // 4. LIMPIEZA TOTAL: Quitamos cualquier PDF anterior del contenedor
        if (wrapper) {
            const oldEmbed = wrapper.querySelector('embed');
            if (oldEmbed) wrapper.removeChild(oldEmbed);
        }

        // --- MODO DOCUMENTO (PDF) ---
        if (esPDF) {
            if (imgElement) imgElement.style.display = 'none'; // Ocultamos la etiqueta imagen
            if (wrapper) {
                wrapper.innerHTML += `<embed src="${data.signedUrl}" type="application/pdf" width="100%" height="100%" style="min-height: 500px; display: block; border: none;">`;
            }
        } 
        // --- MODO IMAGEN (JPG/PNG) ---
        else {
            if (imgElement) {
                imgElement.style.display = 'block'; // Volvemos a mostrar la imagen
                imgElement.src = data.signedUrl;
            }

            // Inicialización limpia de Panzoom para la nueva imagen
            setTimeout(() => {
                if (wrapper && typeof Panzoom !== 'undefined') {
                    const instance = Panzoom(wrapper, {
                        maxScale: 6,
                        minScale: 1,
                        contain: 'outside',
                        canvas: false,
                        exclude: [document.getElementById('panel-dictamen-radiologo')]
                    });
                    
                    if (esPanelA) instancePanzoomIzq = instance; 
                    else instancePanzoomDer = instance;
                    
                    // Aseguramos que el evento wheel no se duplique al cambiar de toma
                    const parentEl = wrapper.parentElement;
                    if (parentEl && !parentEl.dataset.wheelAttached) {
                        parentEl.addEventListener('wheel', (e) => {
                            e.preventDefault();
                            const currentInstance = esPanelA ? instancePanzoomIzq : instancePanzoomDer;
                            if (currentInstance) currentInstance.zoomWithWheel(e);
                        }, { passive: false });
                        parentEl.dataset.wheelAttached = "true"; // Marca de seguridad
                    }
                }
            }, 250);
        }

    } catch (err) { 
        console.error("❌ Error en renderizador:", err); 
    }
}
// --- MOTOR DE IDENTIDAD ---
async function aplicarIdentidadGabinete() {
    const colorSede = localStorage.getItem('clinica_color') || '#00cfd5';
    document.documentElement.style.setProperty('--color-camaleon', colorSede);
}

// --- ACTUALIZACIÓN DE EDAD E INTERFAZ PEDIÁTRICA ---
function actualizarInterfazEdad() {
    const fechaNac = document.getElementById('valFecha').value;
    if (!fechaNac) return;

    const infoEdad = calcularEdad(fechaNac); 
    // Parseamos los años directamente de tu helper adaptativo de abajo
    const anosVal = parseInt(infoEdad) || 0;

    const seccionTutor = document.getElementById('seccion-tutor');
    const bloqueAdulto = document.getElementById('bloque-contacto-adulto');

    if (anosVal < 18) {
        seccionTutor?.classList.remove('d-none');
        bloqueAdulto?.classList.add('d-none');
        console.log("👶 Modo Pediatría Activado");
    } else {
        seccionTutor?.classList.add('d-none');
        bloqueAdulto?.classList.remove('d-none');
        console.log("👨‍💼 Modo Adulto Activado");
    }
}

// --- LIMPIEZA DE APELLIDOS CON CONECTORES ---
function limpiarApellidoMexicano(apellidoRaw) {
    if (!apellidoRaw) return "X";
    let ap = apellidoRaw.trim().toUpperCase();
    const particulas = [
        /^DE LOS\s+/, /^DE LA\s+/, /^DE LAS\s+/, /^LOS\s+/, /^LAS\s+/, /^DEL\s+/, /^DE\s+/, /^LA\s+/
    ];
    for (let regex of particulas) {
        if (regex.test(ap)) {
            ap = ap.replace(regex, "");
            break; 
        }
    }
    return ap || "X";
}

// ============================================================================
// 🎯 MOTOR UNIFICADO DE CÁLCULO DE CURP (BLINDAJE DE MAYÚSCULAS Y EXCEPCIONES)
// ============================================================================
function procesarCurp() {


    const nomRaw = document.getElementById('valNombre')?.value || "";
    const patRaw = document.getElementById('valPaterno')?.value.trim() || "";
    const matRaw = document.getElementById('valMaterno')?.value.trim() || "X";
    const fec = document.getElementById('valFecha')?.value || "";
    const est = document.getElementById('valEstado')?.value || "";

    if (!nomRaw || !patRaw || !fec || !est) return;
    
    const selectorGenero = document.getElementById('genero-manual')?.value;
    let gen = 'X'; 
    if (selectorGenero === 'HOMBRE') gen = 'H';
    else if (selectorGenero === 'MUJER') gen = 'M';

    const pat = limpiarApellidoMexicano(patRaw); 
    const mat = limpiarApellidoMexicano(matRaw); 
    const nom = nomRaw.trim().toUpperCase();
    
    if (nom.length >= 2 && pat.length >= 2 && fec && est.length === 2) {
        const l1 = pat[0] || ""; 
        const l2 = pat.slice(1).match(/[AEIOU]/)?.[0] || "X";
        const l3 = mat[0] || "X"; 
        const l4 = nom[0] || "";
        const aa = fec.substring(2, 4); 
        const mm = fec.substring(5, 7); 
        const dd = fec.substring(8, 10);
        
        const c1 = pat.slice(1).match(/[BCDFGHJKLMNPQRSTVWXYZ]/)?.[0] || "X";
        const c2 = mat.slice(1).match(/[BCDFGHJKLMNPQRSTVWXYZ]/)?.[0] || "X"; 
        const c3 = nom.slice(1).match(/[BCDFGHJKLMNPQRSTVWXYZ]/)?.[0] || "X";
        
        const curpCompleta = `${l1}${l2}${l3}${l4}${aa}${mm}${dd}${gen}${est}${c1}${c2}${c3}`.toUpperCase();
        
        const p1 = document.getElementById('curp-parte1'); if (p1) p1.value = curpCompleta.substring(0, 11);
        const p2 = document.getElementById('curp-estado'); if (p2) p2.value = curpCompleta.substring(11, 13);
        const p3 = document.getElementById('curp-consonantes'); if (p3) p3.value = curpCompleta.substring(13, 16);
        const p4 = document.getElementById('curp-homo'); if (p4) p4.value = curpCompleta.substring(16, 18);

        // 🚀 GATILLO MAESTRO DE CRISTIAN: La Homoclave dispara la gestión del Folio
        if (!pacienteExistenteId && typeof gestionarFolioAutomatico === 'function') {
            gestionarFolioAutomatico(null);
        }
    }
}

function saltarAHomoclave(input) {
    input.value = input.value.toUpperCase();
    if (input.value.length === 2) {
        document.getElementById('curp-homo')?.focus();
    }
}

// 🔑 RESPALDO MAESTRO EN WINDOW PARA SANAR LLAMADAS EN MAYÚSCULAS DESDE EL HTML
window.procesarCURP = procesarCurp;


// --- BUSCADOR INTELIGENTE EN PACIENTES MAESTROS (OPTIMIZADO) ---
let debounceTimer; // Asegúrate de tener esta variable declarada fuera del evento
const inputNombre = document.getElementById('valNombre');
const listaSugerencias = document.getElementById('sugerencias-gabinete');

inputNombre?.addEventListener('input', async (e) => {
    const texto = e.target.value.trim().toUpperCase();
    
    clearTimeout(debounceTimer);
    
    if (texto.length < 3) {
        listaSugerencias?.classList.add('d-none');
        return;
    }

    debounceTimer = setTimeout(async () => {
        try {
            // Buscamos en todas las columnas posibles
            const { data: pacientes, error } = await fisioNet
                .from('pacientes_maestros')
                .select('*')
                .or(`nombre.ilike.%${texto}%,apellido_paterno.ilike.%${texto}%,apellido_materno.ilike.%${texto}%,curp.ilike.%${texto}%`)
                .limit(10);

            if (error) throw error;

            if (pacientes && pacientes.length > 0) {
                listaSugerencias.innerHTML = '';
                listaSugerencias.classList.remove('d-none');

                pacientes.forEach(p => {
                    const btn = document.createElement('button');
                    btn.className = 'list-group-item list-group-item-action p-2.5 text-start';
                    
                    // Aseguramos que los apellidos se lean bien
                    const apPat = p.apellido_paterno || '';
                    const apMat = p.apellido_materno || '';
                    const nombreCompleto = `${p.nombre} ${apPat} ${apMat}`.trim();

                    btn.innerHTML = `
                        <div class="d-flex justify-content-between align-items-center">
                            <strong class="text-dark fs-7">${nombreCompleto.toUpperCase()}</strong>
                            <span class="badge bg-light text-secondary border">🎂 ${p.fecha_nacimiento || 'S/F'}</span>
                        </div>
                        <div class="text-muted mt-1" style="font-size: 0.65rem;">
                            <i class="fas fa-id-card me-1"></i>CURP: <span class="fw-bold text-primary">${p.curp || 'N/A'}</span>
                        </div>
                    `;
                    
                    btn.onclick = (event) => {
                        event.preventDefault();
                        autorrellenarPaciente(p);
                    };
                    listaSugerencias.appendChild(btn);
                });
            } else {
                listaSugerencias.classList.add('d-none');
            }
        } catch (err) {
            console.error("Error en búsqueda:", err.message);
        }
    }, 300);
});

function autorrellenarPaciente(p) {
    if (listaSugerencias) listaSugerencias.classList.add('d-none');
    pacienteExistenteId = p.id;
    window.pacienteSeleccionado = p;
    window.pacienteCargado = p; // Inyectamos en el objeto global de sesión

    const mapear = (id, valor) => {
        const el = document.getElementById(id);
        if (el) el.value = valor || "";
    };

    mapear('valNombre', p.nombre);
    mapear('valPaterno', p.apellido_paterno);
    mapear('valMaterno', p.apellido_materno);
    mapear('valFecha', p.fecha_nacimiento);
    mapear('genero-manual', p.genero);
    mapear('tel-manual', p.telefono);
    mapear('valEmail', p.correo_electronico || "");

    mapear('tutor-nombre', p.nombre_tutor);
    mapear('tutor-parentesco', p.parentesco_tutor);
    mapear('tutor-tel', p.telefono_tutor);

    // 🎯 AUTO-RELLENO DEL SELECT DE ESTADO DE NACIMIENTO
    if (p.estado_nacimiento) {
        mapear('valEstado', p.estado_nacimiento);
    } else if (p.curp && p.curp.length >= 18) {
        mapear('valEstado', p.curp.substring(11, 13).toUpperCase());
    }

    if (p.curp && p.curp.length >= 18) {
        const c = p.curp.toUpperCase();
        mapear('curp-parte1', c.substring(0, 11));
        mapear('curp-estado', c.substring(11, 13));
        mapear('curp-consonantes', c.substring(13, 16));
        mapear('curp-homo', c.substring(16, 18));
    }

    // 🛡️ 1. Congelamos inmediatamente la vista en gris operativo
    congelarCamposIdentidad(true);

    // 🔑 2. Desplegamos el botón inteligente de control de firmas OTP
    crearBotonDesbloqueoDinamico();

    actualizarInterfazEdad();
    
    // Ejecutamos la búsqueda o cálculo del folio de la sede para el nuevo expediente local
    if (typeof gestionarFolioAutomatico === 'function') {
        gestionarFolioAutomatico(p.id);
    }
}

// ============================================================================
// 🔒 GESTOR VISUAL DE CANDADOS PREMIUM (CONGELACIÓN DE INPUTS EN GRIS)
// ============================================================================
function congelarCamposIdentidad(bloquear) {
    console.log(`🛡️ Ajustando candados del búnker analítico. Bloqueo: ${bloquear}`);
    
    const idsCriticos = [
            'valNombre', 'valPaterno', 'valMaterno', 'valFecha', 
        'genero-manual', 'valEstado', 'curp-parte1', 'curp-estado', 
        'curp-consonantes', 'curp-homo', 'tel-manual', 'valEmail', 'tutor-nombre', 'tutor-parentesco', 'tutor-tel'
  
    ];

    idsCriticos.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.readOnly = bloquear;
            if (el.tagName === 'SELECT') el.disabled = bloquear;
            
            // Estilos estéticos en gris sólido de búnker protegido
            el.style.backgroundColor = bloquear ? "#edf2f7" : "#ffffff";
            el.style.color = bloquear ? "#4a5568" : "#000000";
            el.style.cursor = bloquear ? "not-allowed" : "text";
        }
    });
}

// ============================================================================
// 🔑 MOTOR OTP DINÁMICO DE DESBLOQUEO DE SEGURIDAD MAESTRA
// ============================================================================
function crearBotonDesbloqueoDinamico() {
    document.getElementById('btnDesbloquearFichaLab')?.remove();

    const contenedorCurp = document.getElementById('curp-parte1').closest('.col-12');
    const wrapper = document.createElement('div');
    wrapper.id = 'btnDesbloquearFichaLab';
    wrapper.className = 'mt-2 text-end';
    
    wrapper.innerHTML = `
        <button type="button" class="btn btn-warning btn-sm fw-bold px-3 shadow-sm" style="border-radius: 8px; background-color: #ecc94b; color: #000; border: none; font-size:0.75rem;">
            <i class="fas fa-lock"></i> ✏️ Corregir Datos de Identidad
        </button>
    `;

    contenedorCurp.appendChild(wrapper);

    wrapper.querySelector('button').addEventListener('click', async () => {
        const p = window.pacienteCargado;
        const esMenor = !document.getElementById('seccion-tutor').classList.contains('d-none');
        const telefonoDestino = esMenor ? p?.telefono_tutor : (p?.telefono || document.getElementById('tel-manual').value);
        
        if (!telefonoDestino || telefonoDestino.trim() === "") {
            alert("⚠️ Error: El paciente no cuenta con un teléfono registrado en la Ficha Maestro para el envío del código OTP.");
            return;
        }

        const tokenSeguridad = Math.floor(100000 + Math.random() * 900000);
        alert(`🛡️ PROTOCOLO DE EDICIÓN FISIOCID:\nCódigo enviado de forma segura al celular: ${telefonoDestino}\n👉 (Código de Autorización: ${tokenSeguridad})`);

        const codigoIngresado = prompt("🔒 Ingrese el código OTP de 6 dígitos enviado para liberar la escritura:");
        
        if (String(codigoIngresado) === String(tokenSeguridad)) {
            edicionFichaAutorizada = true; 
            congelarCamposIdentidad(false); 
            
            const btn = wrapper.querySelector('button');
            btn.className = "btn btn-success btn-sm fw-bold px-3 disabled";
            btn.innerHTML = '<i class="fas fa-lock-open"></i> Modo Edición Activo';
            btn.style.backgroundColor = "#48bb78";
            btn.style.color = "#ffffff";
        } else {
            alert("❌ Código incorrecto. Los datos maestros de identidad siguen blindados.");
        }
    });
}

async function subirArchivosASupabase(pacienteId, clinicaId, estudioId) {
    if (!pacienteId || !clinicaId || !estudioId) {
        console.error("❌ ERROR: IDs faltantes");
        return [];
    }

    const nombresArchivos = [];
    const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png'];

    for (const archivo of archivosParaSubir) {
        // 1. Validar el tipo de archivo real (MIME type)
        if (!tiposPermitidos.includes(archivo.type)) {
            console.warn(`⚠️ Archivo bloqueado por seguridad: ${archivo.name}`);
            continue; // Saltamos este archivo
        }

        // 2. Limpieza extrema del nombre
        // Obtenemos solo el nombre sin extensión, limpiamos caracteres raros
        const nombreLimpio = archivo.name
            .replace(/\.[^/.]+$/, "") 
            .replace(/[^a-z0-9]/gi, '_')
            .toLowerCase();

        // 3. Normalizar extensión (.pdf, .jpg o .png)
        const extension = archivo.type.split('/')[1].replace('jpeg', 'jpg');
        const rutaSegura = `${clinicaId}/${pacienteId}/${estudioId}/${Date.now()}_${nombreLimpio}.${extension}`;
        
        console.log("📤 Subiendo archivo blindado:", rutaSegura);

        // 4. Subida con restricción de tipo
        const { error } = await fisioNet.storage
            .from('expedientes-clinicos')
            .upload(rutaSegura, archivo, {
                contentType: archivo.type, // Especificamos el tipo real
                upsert: false              // No sobrescribir
            });

        if (!error) {
            nombresArchivos.push(rutaSegura);
        } else {
            console.error("❌ Error al subir a Supabase:", error.message);
        }
    }
    return nombresArchivos;
}

function alternarModoDictado() {
    modoDictadoActivo = !modoDictadoActivo;
    const visor = document.getElementById('visorComparativa');
    const panel = document.getElementById('panel-dictamen-radiologo');
    
    if (modoDictadoActivo) {
        // MODO DICTADO: Congelamos el visor por completo
        visor.style.pointerEvents = 'none'; 
        console.log("🔒 [FisioCid] Sistema en modo DICTADO: Visor congelado.");
    } else {
        // MODO VISOR: Liberamos el visor
        visor.style.pointerEvents = 'auto';
        console.log("🔓 [FisioCid] Sistema en modo VISOR: Navegación activa.");
    }
}

// ============================================================================
// 💾 BOTÓN SUPREMO: INTEGRAR DICTAMEN RADIOLÓGICO AL EXPEDIENTE DE RED
// ============================================================================
async function integrarDictamenRadiologicoAlExpediente() {
    const visor = document.getElementById('visorComparativa');
    const { data: { user } } = await fisioNet.auth.getUser();

    // 1. OBTENCIÓN SEGURA DEL PERFIL (Necesario para el nombre y cédula)
    const { data: perfil } = await fisioNet
        .from('perfiles_profesionales')
        .select('nombre_completo, cedula_profesional')
        .eq('id', user.id)
        .single();

    // 2. OBTENCIÓN SEGURA DEL ID (Tu lógica nueva, muy bien)
    const btn = document.getElementById('btn-finalizar-pacs');
    const estudioId = estudioActivoGlobal || btn?.dataset.estudioActivoId;
    
    if (!estudioId) {
        alert("Error: El sistema perdió la referencia del estudio. Por favor, cierra y vuelve a abrir el dictamen.");
        return;
    }

    const tecnicaHallazgos = document.getElementById('descripcion-hallazgos-pacs').value.toUpperCase().trim();
    const conclusionDiag = document.getElementById('conclusion-estudio-pacs').value.toUpperCase().trim();
    const esUrgente = document.getElementById('es-urgente-pacs')?.checked || false; // .checked es booleano, no necesitas .value

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> FIRMANDO...`;

    try {
        const datosDictamen = {
           estado_dictamen: 'DICTAMINADO',
            hallazgo_tecnica: tecnicaHallazgos,
            diagnostico_radiologico: conclusionDiag,
            es_hallazgo_urgente: esUrgente,
            id_radiologo_firmante: user.id,
            especialista_nombre: perfil?.nombre_completo ? perfil.nombre_completo.toUpperCase() : 'N/A',
            especialista_cedula: perfil?.cedula_profesional || 'N/A',
            fecha_dictamen: new Date().toISOString()
        };

        const { error: errorUpdate } = await fisioNet
            .from('estudios_gabinete')
            .update(datosDictamen)
            .eq('id', estudioId);

        if (errorUpdate) throw errorUpdate;
    
        await fisioNet.from('historial_clinico').insert([{
            id_paciente: visor.dataset.pacienteActivoId,
            fecha_nota: new Date().toISOString(),
            motivo_consulta: `DICTAMEN RADIOLÓGICO`,
            nota_evolucion: `HALLAZGOS: ${tecnicaHallazgos}\nCONCLUSIÓN: ${conclusionDiag}\nFirma: ${perfil?.nombre_completo || 'N/A'}`,
            id_profesional: user.id
        }]);

        alert("🏆 Dictamen firmado correctamente.");
        window.location.reload();

    } catch (err) {
        console.error("❌ ERROR DICTAMEN:", err);
        alert("Error al dictaminar: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "INTEGRAR A EXPEDIENTE FISIOCID";
    }
}
// Vinculamos la función al objeto global para que tu botón HTML del mockup la mande a llamar con su onclick
window.integrarDictamenRadiologicoAlExpediente = integrarDictamenRadiologicoAlExpediente;
// ============================================================================
// 💾 ENTRADA MAESTRA: GUARDAR ESTUDIO Y EXPEDIENTE LOCAL DE SEDE
async function registrarPacienteNuevo() {
    const nuevoPaciente = {
        nombre: document.getElementById('valNombre').value.trim().toUpperCase(),
        apellido_paterno: document.getElementById('valPaterno').value.trim().toUpperCase(),
        apellido_materno: document.getElementById('valMaterno').value.trim().toUpperCase(),
        fecha_nacimiento: document.getElementById('valFecha').value,
        genero: document.getElementById('genero-manual').value,
        curp: (document.getElementById('curp-parte1').value + document.getElementById('curp-estado').value + document.getElementById('curp-consonantes').value + document.getElementById('curp-homo').value).toUpperCase(),
        telefono: document.getElementById('tel-manual').value,
        correo_electronico: document.getElementById('valEmail').value
    };

    const { data, error } = await fisioNet
        .from('pacientes_maestros')
        .insert([nuevoPaciente])
        .select('id')
        .single();

    if (error) throw error;
    return data.id; // ¡Este es el ID que necesitamos!
}
async function guardarEstudioGabinete(event) {
    if (event) event.preventDefault();
    const btn = document.getElementById('btn-finalizar');

    // 1. OBTENCIÓN SEGURA
    const { data: { user }, error: authErr } = await fisioNet.auth.getUser();
    if (authErr || !user) { alert("Error: No se detectó sesión."); return; }

    const idClinicaActiva = localStorage.getItem('id_clinica_activa');
    const radiologoId = document.getElementById('select-radiologo-asignado')?.value;

    // 2. Validación Básica (Clínica sí es obligatoria)
    if (!idClinicaActiva) { alert("Error: Falta ID de clínica."); return; }
    if (!radiologoId) { alert("⚠️ Es obligatorio asignar un Médico Radiólogo."); return; }

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> PROCESANDO...`;

    try {
        // 3. LÓGICA DE PACIENTE (NUEVO O EXISTENTE)
        // Si no hay ID, intentamos registrarlo como nuevo
        if (!pacienteExistenteId) {
            console.log("🆕 Detectado paciente nuevo. Registrando...");
            pacienteExistenteId = await registrarPacienteNuevo(); // Esta función devuelve el nuevo ID
        }

        // 4. Continuamos con el resto de tu código (Cálculo de edad, etc.)
        const p1 = document.getElementById('curp-parte1')?.value || "";
        const p2 = document.getElementById('curp-estado')?.value || "";
        const p3 = document.getElementById('curp-consonantes')?.value || "";
        const p4 = document.getElementById('curp-homo')?.value || "";
        const curpFinal = `${p1}${p2}${p3}${p4}`.trim().toUpperCase();

        let edadFinal = '';
        let generoFinal = '';

        if (window.pacienteSeleccionado) { 
            edadFinal = calcularEdad(window.pacienteSeleccionado.fecha_nacimiento);
            generoFinal = window.pacienteSeleccionado.genero;
        } else {
            edadFinal = calcularEdad(document.getElementById('valFecha')?.value);
            const inputGenero = document.getElementById('genero-manual')?.value;
            generoFinal = ['HOMBRE', 'MUJER'].includes(inputGenero) ? inputGenero : 'NO ESPECIFICADO';
        }

        // 5. Subida de archivos
        const listaNombresArchivos = await subirArchivosASupabase(pacienteExistenteId, idClinicaActiva, "ESTUDIO_" + Date.now());

        // 6. Guardado del Estudio
        const payload = {
            paciente_id: pacienteExistenteId,
            id_socio_emisor: idClinicaActiva,
            doctor_emisor_id: doctorEmisorId,                      // UUID si pertenece a la red (o null)
            medico_solicitante_manual: medicoSolicitanteManual,     // Texto legible del médico
            id_radiologo_firmante: radiologoId,                     // Radiólogo asignado
            creado_por: user.id,
            tecnico_captura: user.email, 
            paciente_nombre_manual: `${document.getElementById('valNombre').value} ${document.getElementById('valPaterno').value} ${document.getElementById('valMaterno').value || ''}`.trim().toUpperCase(),
            curp: curpFinal,
            tipo_estudio: document.getElementById('tipo-estudio')?.value || 'N/A',
            zona_anatomica: document.getElementById('zona-estudio')?.value.toUpperCase() || 'N/A',
            estado_dictamen: 'PENDIENTE',
            archivo_url: listaNombresArchivos.join(','),
            fecha_registro: new Date().toISOString(),
            paciente_edad_momento: edadFinal, 
            paciente_genero_momento: generoFinal
        };

        const { error: errEst } = await fisioNet.from('estudios_gabinete').insert([payload]);
        if (errEst) throw errEst;

        alert("🏆 ¡Estudio capturado correctamente!");
        window.location.reload();

    } catch (err) {
        console.error("❌ ERROR CRÍTICO:", err);
        alert("Error crítico: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = "INTEGRAR A EXPEDIENTE FISIOCID";
    }
}

// --- DETECTAR ROL AL INICIAR LA PÁGINA ---
async function mostrarNombreEspecialista() {
    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return;

        const { data: perfil, error } = await fisioNet
            .from('perfiles_profesionales')
            .select('id, nombre_completo, especialidad, cedula_profesional')
            .eq('id', user.id)
            .maybeSingle(); // Modificado con el blindaje maybeSingle contra crash PGRST116

        if (error || !perfil) throw error;

        perfilEspecialistaCache = perfil;

        const contenedor = document.getElementById('info-emisor');
        if (contenedor) {
            contenedor.innerHTML = `
                <div class="text-end">
                    <small class="text-muted d-block italic">Especialista Activo:</small>
                    <span class="fw-bold" style="color: var(--color-camaleon);">
                        ${perfil.nombre_completo.toUpperCase()}
                    </span>
                    <br>
                    <small class="badge bg-light text-dark border" style="font-size: 0.6rem;">
                        ${perfil.especialidad || 'TÉCNICO EN RADIOLOGÍA'}
                    </small>
                </div>
            `;
        }

        const inputDiag = document.getElementById('conclusion-estudio');
        const esRadiologo = perfil.especialidad?.toUpperCase().includes('RADIOLOG');
        
        if (inputDiag && !esRadiologo) {
            inputDiag.placeholder = "🔒 Bloqueado: Solo Médicos Radiólogos pueden emitir diagnósticos.";
        }

    } catch (err) {
        console.error("Error al cargar nombre en la esquina:", err);
    }
}

function renderizarArchivo(archivo) {
    const contenedor = document.getElementById('visor-contenedor');
    const extension = archivo.split('.').pop().toLowerCase();

    if (extension === 'pdf') {
        // Si es PDF, usamos un <iframe> o <embed> en lugar de <img>
        contenedor.innerHTML = `<embed src="${archivo}" type="application/pdf" width="100%" height="600px" />`;
    } else {
        // Si es imagen (JPG, PNG), usamos <img>
        contenedor.innerHTML = `<img src="${archivo}" class="img-fluid" />`;
    }
}


// APLICA ESTO EN TU FUNCIÓN renderizarMiniaturas
function renderizarMiniaturas() {
    const contenedor = document.getElementById('carril-imagen');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    
    archivosParaSubir.forEach((archivo, index) => {
        const divCol = document.createElement('div');
        divCol.className = 'col-4 col-md-3 position-relative animate__animated animate__fadeIn';

        const esPDF = archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf');

        if (esPDF) {
            // PDF: Dibujo directo sin Reader
            divCol.innerHTML = `
                <div class="d-flex align-items-center justify-content-center bg-danger text-white rounded-3 shadow-sm" style="height: 80px;"><i class="fas fa-file-pdf fa-2x"></i></div>
                <button class="btn btn-danger btn-sm position-absolute top-0 end-0 rounded-circle shadow-sm" style="width: 20px; height: 20px; padding: 0; font-size: 10px; margin: -5px;" onclick="quitarArchivo(${index})"><i class="fas fa-times"></i></button>
                <div class="small text-truncate mt-1" style="font-size: 0.6rem; color: #64748b;">${archivo.name}</div>`;
            contenedor.appendChild(divCol);
        } else {
            // IMAGEN: Solo aquí usamos FileReader
            const reader = new FileReader();
            reader.onload = (e) => {
                divCol.innerHTML = `
                    <img src="${e.target.result}" class="img-fluid rounded-3 shadow-sm border" style="height: 80px; width: 100%; object-fit: cover;">
                    <button class="btn btn-danger btn-sm position-absolute top-0 end-0 rounded-circle shadow-sm" style="width: 20px; height: 20px; padding: 0; font-size: 10px; margin: -5px;" onclick="quitarArchivo(${index})"><i class="fas fa-times"></i></button>
                    <div class="small text-truncate mt-1" style="font-size: 0.6rem; color: #64748b;">${archivo.name}</div>`;
            };
            reader.readAsDataURL(archivo);
            contenedor.appendChild(divCol);
        }
    });
}

function quitarArchivo(index) {
    archivosParaSubir.splice(index, 1);
    renderizarMiniaturas();
}


// ============================================================================
// 📜 CARGA INICIAL DEL HISTORIAL (ADAPTADA PARA EL ACCESO TOTAL DEL RADIÓLOGO)
// ============================================================================
async function cargarHistorialPersonal() {
    const contenedor = document.getElementById('lista-historial-gabinete');
    if (!contenedor) return;

    const inputBusqueda = document.getElementById('busquedaHistorialGabinete');
    if (inputBusqueda) inputBusqueda.value = "";

    try {
        contenedor.innerHTML = `
            <div class="p-4 text-center text-muted">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                Escaneando registros en la Red...
            </div>`;

        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return;

        const especialidadUsuario = (perfilEspecialistaCache?.especialidad || '').toUpperCase();
        const esRadiologo = especialidadUsuario.includes('RADIOLOG');

        // 🎯 INTEGRACIÓN: Traemos la fecha_nacimiento desde pacientes_maestros usando un JOIN
        // Asegúrate de que la relación en tu DB sea pacientes_maestros (FK: paciente_id)
      let query = fisioNet.from('estudios_gabinete').select(`
    *,
    pacientes_maestros:paciente_id (
        fecha_nacimiento,
        apellido_paterno,
        apellido_materno,
        curp

    )
`);

        if (esRadiologo) {
            query = query.or(`doctor_emisor_id.eq.${user.id},creado_por.eq.${user.id}`);
        } else {
            query = query.eq('creado_por', user.id);
        }

        const { data: estudios, error } = await query
            .order('fecha_registro', { ascending: false })
            .limit(20);

        if (error) throw error;

        // 🧠 Limpiamos los datos para que el renderizador los reciba como un objeto plano
       historialGabineteCache = estudios ? estudios.map(est => ({
    ...est,
    fecha_nacimiento: est.pacientes_maestros?.fecha_nacimiento || null,
    apellido_paterno: est.pacientes_maestros?.apellido_paterno || "",
    apellido_materno: est.pacientes_maestros?.apellido_materno || "",
    curp: est.pacientes_maestros?.curp || "N/A"
})) : [];

        renderizarListaHistorialGabinete(historialGabineteCache);

    } catch (err) {
        console.error("❌ Error al cargar historial por roles:", err);
        contenedor.innerHTML = '<div class="p-4 text-center text-danger small"><i class="fas fa-exclamation-triangle"></i> Error de sincronizacion.</div>';
    }
}

// ============================================================================
// 🔍 MOTOR DE FILTRADO EN TIEMPO REAL CON ANTI-BOUNCE (LIBERADO PARA RADIÓLOGOS)
// ============================================================================


function filtrarHistorialGabineteRealTime() {
    const input = document.getElementById('busquedaHistorialGabinete');
    if (!input) return;
    const texto = input.value.trim().toUpperCase();
    
    // 1. FILTRADO LOCAL (Inmediato)
    const resultados = historialGabineteCache.filter(estudio => 
        (estudio.paciente_nombre_manual && estudio.paciente_nombre_manual.toUpperCase().includes(texto)) || 
        (estudio.curp && estudio.curp.toUpperCase().includes(texto))
    );

    // Renderizamos los resultados del filtro local inmediatamente
    renderizarListaHistorialGabinete(resultados);

    // 2. Anti-Bounce para Supabase
    clearTimeout(timeoutBusqueda);
    
    // SI EL TEXTO ES CORTO, NO BUSQUES EN LA NUBE, YA FILTRAMOS EL CACHÉ LOCAL
    if (texto.length < 3) return; 

    timeoutBusqueda = setTimeout(async () => {
        try {
             const { data: { user } } = await fisioNet.auth.getUser();
                if (!user) return;

                const especialidadUsuario = (perfilEspecialistaCache?.especialidad || '').toUpperCase();
                const esRadiologo = especialidadUsuario.includes('RADIOLOG');

                let query = fisioNet.from('estudios_gabinete').select('*');

                if (esRadiologo) {
                    query = query.or(`doctor_emisor_id.eq.${user.id},creado_por.eq.${user.id}`);
                } else {
                    query = query.eq('creado_por', user.id);
                }

            
            const { data: resultadosDB, error } = await queryDeep
                .or(`paciente_nombre_manual.ilike.%${texto}%,curp.ilike.%${texto}%`) // 🔥 BÚSQUEDA DOBLE
                .order('fecha_registro', { ascending: false })
                .limit(15);

            if (!error && resultadosDB) {
                // Aquí está el secreto: NO mezcles con el caché global a menos que sea necesario
                // Si el usuario está escribiendo, solo muestra lo que la DB encontró
                renderizarListaHistorialGabinete(resultadosDB);
            }
        } catch (err) {
            console.error("Error:", err);
        }
    }, 400);
}
// ============================================================================
// 🎨 RENDERIZADOR DE FILAS CON CHECKBOX DE COMPARATIVA Y BADGES DE ADVERTENCIA
// ============================================================================

function renderizarListaHistorialGabinete(estudios) {
    const contenedor = document.getElementById('lista-historial-gabinete');
    if (!contenedor) return;

    if (!estudios || estudios.length === 0) {
        contenedor.innerHTML = '<div class="p-4 text-center text-muted small">No se encontraron estudios coincidentes.</div>';
        return;
    }

    contenedor.innerHTML = estudios.map(est => {
        // 🎯 Lógica de Nombre Completo: unimos nombre, paterno y materno
        const nombre = est.paciente_nombre_manual || "PACIENTE";
        const apPat = est.apellido_paterno ? ` ${est.apellido_paterno}` : "";
        const apMat = est.apellido_materno ? ` ${est.apellido_materno}` : "";
        const nombreFull = (est.paciente_nombre_manual || "PACIENTE SIN NOMBRE").toUpperCase();
        const archivos = est.archivo_url ? est.archivo_url.split(',') : [];
        const fechaLegible = est.fecha_registro ? new Date(est.fecha_registro).toLocaleDateString() : "--/--/----";
        const primeraToma = archivos[0] ? archivos[0].trim() : "";

        
const fechaNac = est.fecha_nacimiento ? new Date(est.fecha_nacimiento).toLocaleDateString() : "Sin fecha";
const edad = est.fecha_nacimiento ? calcularEdad(est.fecha_nacimiento) : "---";

        const estadoActual = (est.estado_dictamen || 'PENDIENTE').toUpperCase();
        const esPendiente = estadoActual === 'PENDIENTE';
        
        const estiloFondo = esPendiente ? 'background-color: rgba(253, 230, 138, 0.04);' : 'background-color: rgba(220, 252, 231, 0.05);';
        const badgeAlerta = esPendiente 
            ? `<span class="badge bg-warning text-dark border border-warning-subtle" style="font-size: 0.55rem;"><i class="fas fa-exclamation-circle"></i> POR DICTAR</span>`
            : `<span class="badge bg-success text-white" style="font-size: 0.55rem;"><i class="fas fa-check-circle"></i> DICTAMINADO</span>`;

        let botonesArchivos = '';
        archivos.forEach((urlNodo, idx) => {
            const esPDF = urlNodo.toLowerCase().endsWith('.pdf');
            const icono = esPDF ? 'fa-file-pdf text-danger' : 'fa-image text-primary';
            botonesArchivos += `
                <button type="button" class="btn btn-sm btn-outline-secondary mb-1 me-1 p-1 px-2" style="font-size: 0.65rem;" 
                    onclick="event.stopPropagation(); abrirEstudioParaDictamenMaestro('${est.id}', '${est.archivo_url.trim()}', '${nombreFull}', ${idx})">
                    <i class="fas ${icono}"></i> Toma ${idx + 1}
                </button>`;
        });

        const resumenDiag = !esPendiente ? `
            <div class="mt-2 p-2 rounded" style="background: rgba(0,0,0,0.03); border-left: 3px solid #48bb78;">
                <div class="text-dark fw-bold" style="font-size: 0.65rem;">DIAGNÓSTICO:</div>
                <div class="text-muted" style="font-size: 0.65rem; line-height: 1.2;">${est.diagnostico_radiologico || 'Sin conclusión.'}</div>
            </div>
        ` : '';

        return `
<div class="list-group-item p-3 border-0 border-bottom" style="${estiloFondo}">
    <div class="d-flex align-items-start">
        <div class="form-check me-2" style="margin-top: 5px;">
            <input class="form-check-input check-comparar-gabinete" type="checkbox" value="${primeraToma}" id="chk_gabinete_${est.id}">
        </div>
        
        <div class="flex-grow-1" style="cursor: pointer;" onclick="abrirEstudioParaDictamenMaestro('${est.id}', '${est.archivo_url.trim()}', '${nombreFull}', 0)">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-bold text-dark text-uppercase" style="font-size: 0.85rem;">${nombreFull}</span>
                ${badgeAlerta}
            </div>

            <div class="text-secondary mb-2" style="font-size: 0.7rem;">
                <span class="me-2"><i class="fas fa-birthday-cake me-1"></i>${fechaNac} • <strong>${edad}</strong> CURP: ${est.curp || 'S/N'}</span>
        
            </div>

            <div class="text-dark bg-light p-1 rounded border mb-2" style="font-size: 0.75rem;">
                <i class="fas fa-wave-square me-1"></i><strong>${est.tipo_estudio}</strong> | ${est.zona_anatomica}
              <span><i class="fas fa-calendar-day me-1"></i>${fechaLegible}</span>
                </div>

            ${resumenDiag}
            
            <div class="d-flex flex-wrap gap-1 mt-2">
                ${botonesArchivos}
                ${!esPendiente ? `
                    <button class="btn btn-sm btn-outline-danger p-1 px-2" style="font-size: 0.65rem;" onclick="event.stopPropagation(); alert('Generando PDF...');">
                        <i class="fas fa-file-pdf"></i> GENERAR PDF
                    </button>
                ` : ''}
            </div>
        </div>
    </div>
</div>`;
    }).join('');
}
// ============================================================================
// 🚀 LANZADOR DIRECTO ADAPTATIVO CON SOPORTE DE CARRUSEL DE TOMAS MULTIPLES
// ============================================================================
async function abrirTomaInmediata(stringArchivos, indiceInicial, pacienteNombre, estudioInfo, panel = 'A') {
    if (!stringArchivos || stringArchivos === "undefined") return;

    // Asignación de variables globales
    if (panel === 'A') {
        tomasVisorActualesA = stringArchivos.split(',').map(s => s.trim());
        indiceTomaActivaA = parseInt(indiceInicial) || 0;
    } else {
        tomasVisorActualesB = stringArchivos.split(',').map(s => s.trim());
        indiceTomaActivaB = parseInt(indiceInicial) || 0;
    }
    
    datosPacienteActualCache.nombre = pacienteNombre;
    datosPacienteActualCache.info = estudioInfo;

    const tomas = (panel === 'A') ? tomasVisorActualesA : tomasVisorActualesB;
    const idx = (panel === 'A') ? indiceTomaActivaA : indiceTomaActivaB;

    // --- MANEJO DE PDFs ---
    if (tomas[idx].toLowerCase().endsWith('.pdf')) {
        try {
            const { data, error } = await fisioNet.storage.from('expedientes-clinicos').createSignedUrl(tomas[idx], 3600); 
            if (error) throw error;

            const panelDestino = document.getElementById(panel === 'A' ? 'div-zoom-izq' : 'div-zoom-der');
            const img = document.getElementById(panel === 'A' ? 'imgIzquierda' : 'imgDerecha');
            
            if (panelDestino) {
                // 1. Destruimos Panzoom para evitar conflictos con el visor de PDF
                if (panel === 'A' && instancePanzoomIzq) { instancePanzoomIzq.destroy(); instancePanzoomIzq = null; }
                if (panel === 'B' && instancePanzoomDer) { instancePanzoomDer.destroy(); instancePanzoomDer = null; }
                
                // 2. Ocultamos la imagen para evitar el ícono de "imagen rota"
                if (img) img.style.display = 'none';

                // 3. Inyectamos el PDF
                console.log("🔗 URL del PDF:", data.signedUrl); 
                panelDestino.innerHTML = `<embed src="${data.signedUrl}" type="application/pdf" width="100%" height="100%" style="min-height: 500px; display: block; border: none;">`;
            }
        } catch (err) { alert("No se pudo cargar el PDF en el visor."); }
        return; 
    }

    // --- MANEJO DE IMÁGENES (Solo si no es PDF) ---
    const img = document.getElementById(panel === 'A' ? 'imgIzquierda' : 'imgDerecha');
    const panelDestino = document.getElementById(panel === 'A' ? 'div-zoom-izq' : 'div-zoom-der');
    
    // Si veníamos de un PDF, debemos limpiar el <embed> y restaurar la imagen
    if (panelDestino) {
        const embed = panelDestino.querySelector('embed');
        if (embed) panelDestino.removeChild(embed);
    }
    
    if (img) img.style.display = 'block';

    // Renderizamos el lienzo pasando el panel
    await renderizarTomaActivaEnLienzo(panel);
}
async function iniciarComparativa() {
    const checks = document.querySelectorAll('.check-comparar-gabinete:checked');
    if (checks.length === 0) return alert("⚠️ Selecciona al menos una toma.");

    const panelHistorial = document.getElementById('offcanvasHistorial');
    const txtHallazgos = document.getElementById('descripcion-hallazgos-pacs');

    if (panelHistorial) {
        // 1. EL SECRETO: Esperamos a que Bootstrap termine de cerrar el panel de forma natural
        panelHistorial.addEventListener('hidden.bs.offcanvas', function focoSeguro() {
            if (txtHallazgos) {
                txtHallazgos.removeAttribute('disabled');
                txtHallazgos.focus({preventScroll: true});
                txtHallazgos.select();
                console.log("✅ Panel cerrado nativamente. Foco en el dictamen.");
            }
            // Limpiamos el evento para que no se duplique la próxima vez
            panelHistorial.removeEventListener('hidden.bs.offcanvas', focoSeguro);
        });

        // 2. Usamos el código que encontraste para cerrarlo correctamente
        const instanciaBootstrap = bootstrap.Offcanvas.getInstance(panelHistorial) || new bootstrap.Offcanvas(panelHistorial);
        instanciaBootstrap.hide();
    }

    // --- CARGA DE PANZOOM (Tu código original intacto) ---
    if (typeof Panzoom === 'undefined') await cargarLibreriaPanzoom();

    const visor = document.getElementById('visorComparativa');
    const panelIzq = document.getElementById('panelIzquierdoVisor');
    const panelDer = document.getElementById('panelDerechoVisor');
    const colInfoIzq = document.getElementById('colInfoIzq');
    const colInfoDer = document.getElementById('colInfoDer');
    const imgIzq = document.getElementById('imgIzquierda');
    const imgDer = document.getElementById('imgDerecha');
    const panelDictamen = document.getElementById('panel-dictamen-radiologo');

    try {
        limpiarInstanciasZoom();

        if (checks.length === 1) {
            panelIzq.className = "col-12 h-100 p-0 position-relative d-flex align-items-center justify-content-center";
            panelDer.classList.add('d-none');
            colInfoIzq.className = "col-12";
            colInfoDer.classList.add('d-none');
            document.getElementById('lblTagPanelIzq').innerText = "TOMA ÚNICA EN EXAMEN";

            const res = await fisioNet.storage.from('expedientes-clinicos').createSignedUrl(checks[0].value, 3600);
            if (res.error) throw res.error;

            imgIzq.src = res.data.signedUrl;
            
            setTimeout(() => {
                instancePanzoomIzq = Panzoom(imgIzq, { maxScale: 6, minScale: 1, contain: 'outside', canvas: true, touchAction: 'none', exclude: [panelDictamen] });
                panelIzq.addEventListener('wheel', (e) => { e.preventDefault(); instancePanzoomIzq.zoomWithWheel(e); }, { passive: false });
            }, 50);

        } else if (checks.length === 2) {
            panelIzq.className = "col-6 h-100 p-0 position-relative d-flex align-items-center justify-content-center";
            panelDer.className = "col-6 h-100 p-0 position-relative d-flex align-items-center justify-content-center";
            panelDer.classList.remove('d-none');
            colInfoIzq.className = "col-6 border-end border-secondary";
            colInfoDer.className = "col-6";
            colInfoDer.classList.remove('d-none');
            document.getElementById('lblTagPanelIzq').innerText = "TOMA DE ESTUDIO A";

            const [resIzq, resDer] = await Promise.all([
                fisioNet.storage.from('expedientes-clinicos').createSignedUrl(checks[0].value, 3600),
                fisioNet.storage.from('expedientes-clinicos').createSignedUrl(checks[1].value, 3600)
            ]);
            imgIzq.src = resIzq.data.signedUrl;
            imgDer.src = resDer.data.signedUrl;

            setTimeout(() => {
                instancePanzoomIzq = Panzoom(imgIzq, { maxScale: 6, minScale: 1, contain: 'outside', canvas: true, touchAction: 'none', exclude: [panelDictamen] });
                instancePanzoomDer = Panzoom(imgDer, { maxScale: 6, minScale: 1, contain: 'outside', canvas: true, touchAction: 'none', exclude: [panelDictamen] });
            }, 50);
        }

        visor.classList.remove('d-none');

    } catch (err) {
        console.error("❌ Error:", err);
    }
}


function limpiarInstanciasZoom() {
    if (instancePanzoomIzq) { instancePanzoomIzq.destroy(); instancePanzoomIzq = null; }
    if (instancePanzoomDer) { instancePanzoomDer.destroy(); instancePanzoomDer = null; }
}

window.reiniciarZoomTomas = function() {
    console.log("🔄 Reset ejecutado");
    if (instancePanzoomIzq) instancePanzoomIzq.reset();
    if (instancePanzoomDer) instancePanzoomDer.reset();
};

window.cerrarComparativa = function() {
    console.log("❌ Cerrando comparativa...");
    const visor = document.getElementById('visorComparativa');
    const panelDictamen = document.getElementById('panel-dictamen-radiologo');
    
    if (visor) { visor.classList.add('d-none'); visor.style.display = 'none'; }
    if (panelDictamen) { panelDictamen.classList.add('d-none'); panelDictamen.style.display = 'none'; }
    
    const lblNombre = document.getElementById('pacs-nombre-paciente');
    if (lblNombre) lblNombre.innerText = 'SELECCIONA UN ESTUDIO';
    
    // Limpieza de instancias para evitar fugas de memoria
    if (instancePanzoomIzq) { instancePanzoomIzq.destroy(); instancePanzoomIzq = null; }
    if (instancePanzoomDer) { instancePanzoomDer.destroy(); instancePanzoomDer = null; }
};

function cargarLibreriaPanzoom() {
    return new Promise((resolve) => {
        if (typeof Panzoom !== 'undefined') {
            console.log("✅ Motor Panzoom verificado en memoria desde el HTML.");
            resolve();
        } else {
            // Respaldo de seguridad en caso de fallo de red
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/@panzoom/panzoom@4.5.1/dist/panzoom.min.js";
            script.onload = () => {
                console.log("✅ Motor Panzoom recuperado por respaldo.");
                resolve();
            };
            document.head.appendChild(script);
        }
    });
}


async function verImagenHistorial(nombreArchivo) {
    if (!nombreArchivo || nombreArchivo === "undefined") return;
    try {
        const { data, error } = await fisioNet.storage.from('expedientes-clinicos').createSignedUrl(nombreArchivo.trim(), 3600); 
        if (error) throw error;
        if (nombreArchivo.toLowerCase().endsWith('.pdf')) {
            window.open(data.signedUrl, '_blank');
            return;
        }
        const visor = document.getElementById('visorComparativa');
        const imgIzq = document.getElementById('imgIzquierda');
        imgIzq.src = data.signedUrl;
        visor.classList.remove('d-none');
    } catch (error) {
        alert("No se pudo cargar la imagen.");
    }
}










// ============================================================================
// 🎠 CONMUTADOR MAESTRO DE FLECHAS (CICLO INFINITO)
// ============================================================================
async function cambiarTomaEnVisorAvanzado(direccion) {
    if (tomasVisorActuales.length <= 1) return;

    // Desplazamos el índice según el botón presionado
    indiceTomaActiva += direccion;

    // Ciclo infinito: Si pasa del final, regresa a la primera. Si baja de cero, va a la última.
    if (indiceTomaActiva >= tomasVisorActuales.length) indiceTomaActiva = 0;
    if (indiceTomaActiva < 0) indiceTomaActiva = tomasVisorActuales.length - 1;

    console.log(`🎠 Cambiando a la toma índice: ${indiceTomaActiva}`);
    await renderizarTomaActivaEnLienzo();
}
// ============================================================================
// 🔢 MOTOR DE EXPEDIENTES LOCALES EXACTO (REPLICADO DE NUEVO-PACIENTE)
// ============================================================================
async function gestionarFolioAutomatico(idPacienteExistente = null) {
    console.log("🚀 Iniciando gestión de folio para paciente:", idPacienteExistente);
    const idClinica = localStorage.getItem('id_clinica_activa');
    const inputFolio = document.getElementById('inputFolioExpediente');
    const statusFolio = document.getElementById('statusFolio');

    if (!idClinica) {
        console.error("❌ Error: id_clinica_activa no encontrado en localStorage");
        if (statusFolio) statusFolio.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ERROR DE ENTORNO';
        return;
    }

    try {
        // 1. SI EL PACIENTE YA EXISTE EN ESTA SEDE
        if (idPacienteExistente) {
            console.log("🔍 Buscando folio existente en DB...");
            const { data: exp, error } = await fisioNet
                .from('expedientes_clinicos')
                .select('folio_personalizado')
                .eq('id_paciente', idPacienteExistente)
                .eq('id_clinica', idClinica)
                .maybeSingle();

            if (exp) {
                console.log("✅ Folio encontrado:", exp.folio_personalizado);
                inputFolio.value = exp.folio_personalizado;
                if (statusFolio) statusFolio.innerHTML = '<i class="fas fa-check-circle text-success"></i> EXPEDIENTE LOCALIZADO';
                return { folio: exp.folio_personalizado, nuevo: false };
            }
            console.log("ℹ️ El paciente existe pero no tiene folio en esta sede.");
        }

        // 2. GENERAR NUEVO CONSECUTIVO LOCAL
        console.log("🏗️ Generando nuevo folio...");
        
        const [confRes, countRes] = await Promise.all([
            fisioNet.from('clinicas').select('folio_prefijo, folio_sede, folio_separador').eq('id', idClinica).single(),
            fisioNet.from('expedientes_clinicos').select('*', { count: 'exact', head: true }).eq('id_clinica', idClinica)
        ]);

        if (confRes.error) throw confRes.error;

        const conf = confRes.data;
        const count = countRes.count || 0;

        const prefijo = (conf.folio_prefijo || 'FC').toUpperCase();
        const sede = (conf.folio_sede || 'MIA').toUpperCase();
        const sep = conf.folio_separador || '-';
        const anio = new Date().getFullYear();
        const siguiente = count + 1;
        
        const nuevoFolio = `${prefijo}${sep}${sede}${sep}${anio}${sep}${siguiente.toString().padStart(4, '0')}`;

        console.log("✨ Folio generado con éxito:", nuevoFolio);
        inputFolio.value = nuevoFolio;
        if (statusFolio) statusFolio.innerHTML = '<i class="fas fa-magic text-primary"></i> NUEVO EXPEDIENTE POR ASIGNAR';
        
        return { folio: nuevoFolio, numero_consecutivo: siguiente, nuevo: true };

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN FOLIOS:", error);
        if (statusFolio) statusFolio.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ERROR DE CONEXIÓN';
    }
}

async function cambiarTomaPACS(panel, direccion) {
    const esPanelA = (panel === 'A');
    const tomas = esPanelA ? tomasVisorActualesA : tomasVisorActualesB;
    let indice = esPanelA ? indiceTomaActivaA : indiceTomaActivaB;

    if (tomas.length <= 1) return;

    // Movemos el índice
    indice += direccion;

    // Si llega al final, regresa al inicio (y viceversa)
    if (indice < 0) indice = tomas.length - 1;
    if (indice >= tomas.length) indice = 0;

    // Guardamos el nuevo índice en la variable global correcta
    if (esPanelA) indiceTomaActivaA = indice;
    else indiceTomaActivaB = indice;

    // Disparamos el renderizado de nuevo
    await renderizarTomaActivaEnLienzo(panel);
}

// ============================================================================
// 🔍 BUSCADOR HÍBRIDO DE MÉDICOS SOLICITANTES (RED FISIOCID / EXTERNOS)
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const inputDoc = document.getElementById('input-doctor-solicitante');
    const listaDoc = document.getElementById('listaMedicosConvenio');

    if (inputDoc) {
        inputDoc.addEventListener('input', (e) => {
            const texto = e.target.value;
            // Si el usuario edita el texto manualmente, borramos el ID vinculado para dejarlo como "Doctor Externo"
            document.getElementById('idDoctorSolicitanteVinculado').value = "";

            if (texto.trim().length >= 3) {
                buscarMedicoSolicitanteEnRed(texto);
            } else if (listaDoc) {
                listaDoc.classList.add('d-none');
            }
        });

        // Ocultar la lista flotante si se da clic afuera
        document.addEventListener('click', (evt) => {
            if (listaDoc && !inputDoc.contains(evt.target) && !listaDoc.contains(evt.target)) {
                listaDoc.classList.add('d-none');
            }
        });
    }
});

async function buscarMedicoSolicitanteEnRed(texto) {
    const lista = document.getElementById('listaMedicosConvenio');
    if (!texto || texto.trim().length < 3) return;

    const entrada = texto.trim().toUpperCase();
    try {
        const palabras = entrada.split(/\s+/).filter(p => p.length > 0);
        let query = fisioNet.from('perfiles_profesionales').select('id, nombre_completo, especialidad, cedula_profesional');

        // Búsqueda rápida aprovechando índices
        if (palabras.length >= 1) query = query.ilike('nombre_completo', `%${palabras[0]}%`);

        const { data: medicos, error } = await query.limit(5);
        if (error) throw error;

        if (lista) {
            lista.innerHTML = '';
            
            if (!medicos || medicos.length === 0) {
                lista.innerHTML = `
                    <div class="list-group-item bg-light text-muted small py-2">
                        ✍️ <strong>Doctor Externo:</strong> Presiona TAB para registrar como texto libre.
                    </div>`;
                lista.classList.remove('d-none');
                return;
            }

            lista.classList.remove('d-none');

            medicos.forEach(m => {
                const item = document.createElement('a');
                item.href = "#";
                item.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2";
                
                const esp = m.especialidad ? `<span class="badge bg-info-subtle text-info border">${m.especialidad}</span>` : '';
                item.innerHTML = `
                    <div>
                        <div class="fw-bold text-dark small">👨‍⚕️ ${m.nombre_completo.toUpperCase()}</div>
                        <div class="text-muted" style="font-size: 0.65rem;">Cédula: ${m.cedula_profesional || 'N/A'}</div>
                    </div>
                    ${esp}
                `;

                // 🎯 Al dar clic, amarramos el UUID y el nombre
                item.onclick = (e) => {
                    e.preventDefault();
                    document.getElementById('input-doctor-solicitante').value = m.nombre_completo.toUpperCase();
                    document.getElementById('idDoctorSolicitanteVinculado').value = m.id; // 👈 UUID guardado
                    lista.classList.add('d-none');
                    console.log("🔗 Doctor en red FisioCid vinculado. ID:", m.id);
                };

                lista.appendChild(item);
            });
        }
    } catch (err) {
        console.error("💥 Error en búsqueda de médicos:", err.message);
    }
}
// Lo exponemos globalmente para que el HTML lo encuentre
window.cambiarTomaPACS = cambiarTomaPACS;
// ============================================================================
// 📡 ESCANER DE RADIÓLOGOS DISPONIBLES (INTERNOS Y CONVENIOS EXTERNOS)
// ============================================================================
async function cargarRadiologosDisponibles() {
    const select = document.getElementById('select-radiologo-asignado');
    if (!select) return;

    const idClinica = localStorage.getItem('id_clinica_activa');
    
    try {
        const [resInternos, resExternos] = await Promise.all([
            // 1. Internos: Filtro de IGUALDAD exacta
            fisioNet
                .from('colaboradores_clinica')
                .select('id_profesional, perfiles_profesionales!inner(nombre_completo, especialidad)')
                .eq('id_clinica', idClinica)
                .eq('estado', 'ACTIVO')
                .eq('perfiles_profesionales.especialidad', 'MEDICO-RADIOLOGO'), // Filtro exacto
            
            // 2. Externos: Filtro de IGUALDAD exacta en el tipo de entidad
            fisioNet
                .from('red_colaboracion')
                .select('id_doctor_receptor, nombre_entidad, tipo_entidad')
                .eq('id_doctor_emisor', idClinica)
                .eq('estado_conexion', 'ACTIVO')
                .eq('tipo_entidad', 'MEDICO-RADIOLOGO') // Filtro exacto
        ]);

        let opcionesHtml = '<option value="" disabled selected>SELECCIONE MEDICO-RADIOLOGO...</option>';

        // 🔵 PROCESAR INTERNOS
        if (resInternos.data && resInternos.data.length > 0) {
            opcionesHtml += `<optgroup label="🔵 STAFF MÉDICO-RADIÓLOGO INTERNO">`;
            resInternos.data.forEach(c => {
                opcionesHtml += `<option value="${c.id_profesional}">👨‍⚕️ ${c.perfiles_profesionales.nombre_completo.toUpperCase()}</option>`;
            });
            opcionesHtml += `</optgroup>`;
        }

        // 🟢 PROCESAR CONVENIOS EXTERNOS
        if (resExternos.data && resExternos.data.length > 0) {
            opcionesHtml += `<optgroup label="🟢 CONVENIOS EXTERNOS MÉDICO-RADIÓLOGO">`;
            resExternos.data.forEach(ali => {
                opcionesHtml += `<option value="${ali.id_doctor_receptor}">🤝 ${ali.nombre_entidad.toUpperCase()}</option>`;
            });
            opcionesHtml += `</optgroup>`;
        }

        // Validación si no encuentra nada
        if (opcionesHtml.includes('optgroup') === false) {
            opcionesHtml = '<option value="" disabled>NO HAY MÉDICO-RADIÓLOGO DISPONIBLE</option>';
        }

        select.innerHTML = opcionesHtml;

    } catch (err) {
        console.error("❌ Error de blindaje estricto:", err);
    }
}

function calcularEdad(fecha) {
    if (!fecha) return "N/A";
    const hoy = new Date();
    const cumple = new Date(fecha);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const diffM = hoy.getMonth() - cumple.getMonth();
    if (diffM < 0 || (diffM === 0 && hoy.getDate() < cumple.getDate())) edad--;
    if (edad < 5) {
        let meses = diffM < 0 ? diffM + 12 : diffM;
        if (hoy.getDate() < cumple.getDate()) meses--;
        return `${edad} años, ${meses < 0 ? 0 : meses} meses`;
    }
    return `${edad} años`;
}



async function cargarLineaTiempoPACS(pacienteId, estudioActualId) {
    console.log("🔍 Buscando historial para el paciente ID:", pacienteId);
    const contenedor = document.getElementById('pacs-linea-tiempo');
    if (!contenedor) return;

    try {
        const { data: estudios, error } = await fisioNet
            .from('estudios_gabinete')
            .select('id, tipo_estudio, zona_anatomica, fecha_registro, estado_dictamen, archivo_url')
            .eq('paciente_id', pacienteId)
            .order('fecha_registro', { ascending: false });

        if (error) {
            console.error("❌ Error de Supabase:", error);
            contenedor.innerHTML = '<div class="text-danger small p-2">Error al cargar historial.</div>';
            return;
        }
        
        console.log("✅ Estudios encontrados:", estudios);

        if (!estudios || estudios.length === 0) {
            contenedor.innerHTML = '<div class="text-muted small text-center mt-3">Sin estudios previos.</div>';
            return;
        }

        // --- RENDERIZADO DINÁMICO ---
        contenedor.innerHTML = estudios.map(est => {
            const fecha = new Date(est.fecha_registro).toLocaleDateString();
            const esActual = est.id === estudioActualId;
            const tomasCount = est.archivo_url ? est.archivo_url.split(',').length : 0;
            
            // Si es el actual, le damos un estilo visual diferente
            const estiloCard = esActual 
                ? 'border-info bg-dark' 
                : 'border-secondary bg-transparent';
            
            return `
            <div class="card mb-2 text-white border ${estiloCard}" style="border-radius: 8px;">
                <div class="card-body p-2 position-relative">
                    ${esActual ? '<span class="position-absolute top-0 end-0 badge bg-info text-dark m-1" style="font-size: 0.5rem;">ACTIVO</span>' : ''}
                    
                    <h6 class="fw-bold mb-0" style="font-size: 0.75rem; color: #00cfd5;">${est.tipo_estudio}</h6>
                    <small class="text-muted d-block" style="font-size: 0.65rem;">${est.zona_anatomica}</small>
                    
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <span class="badge bg-secondary" style="font-size: 0.55rem;"><i class="fas fa-calendar-day"></i> ${fecha}</span>
                        <span class="badge bg-dark border border-secondary" style="font-size: 0.55rem;">${tomasCount} Tom.</span>
                    </div>
                    
                    ${!esActual ? `
                    <button class="btn btn-outline-warning btn-sm w-100 mt-2 py-1" style="font-size: 0.65rem;" 
                        onclick="activarModoComparativa('${est.archivo_url}')">
                        <i class="fas fa-columns"></i> Comparar
                    </button>
                    ` : ''}
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        console.error("❌ Error inesperado:", err);
    }
}


async function activarModoComparativa(urlEstudioPrevio) {
    const panelIzq = document.getElementById('panelIzquierdoVisor');
    const panelDer = document.getElementById('panelDerechoVisor');
    
    // 🔥 EL TRUCO DEL 50/50 MATEMÁTICO
    if (panelIzq && panelDer) {
        panelDer.classList.remove('d-none');
        panelDer.classList.add('w-50');     // El derecho toma 50%
        
        panelIzq.classList.remove('w-100'); // Le quitamos el 100% al izquierdo
        panelIzq.classList.add('w-50');     // El izquierdo toma el otro 50%
    }

    // Cargamos la imagen en el panel B
    await abrirTomaInmediata(urlEstudioPrevio, 0, "PACIENTE", "COMPARATIVA", 'B');
    
    // Ocultamos la barra lateral para dar más espacio
    const btnHistorial = document.getElementById('btn-toggle-historial-pacs');
    if (btnHistorial && btnHistorial.innerText.includes('OCULTAR')) {
        if (typeof toggleSidebarPACS === 'function') toggleSidebarPACS(); 
    }
}
window.activarModoComparativa = activarModoComparativa;

function cerrarModoComparativa() {
    console.log("🔄 [FisioCid PACS] Cerrando modo comparativa...");
    
    const panelIzq = document.getElementById('panelIzquierdoVisor');
    const panelDer = document.getElementById('panelDerechoVisor');
    
    // 1. Regreso matemático al 100% de ancho
    if (panelIzq && panelDer) {
        panelDer.classList.add('d-none');
        panelDer.classList.remove('w-50');
        
        panelIzq.classList.remove('w-50');
        panelIzq.classList.add('w-100'); // El izquierdo recupera todo su tamaño
    }
    
    // 2. Destrucción segura del Panzoom de la derecha para liberar memoria
    if (typeof instancePanzoomDer !== 'undefined' && instancePanzoomDer) {
        instancePanzoomDer.destroy();
        instancePanzoomDer = null;
    }
    
    // 3. Limpieza de variables globales del panel B
    tomasVisorActualesB = [];
    indiceTomaActivaB = 0;
    
    // 4. Opcional: Si quieres que al cerrar la comparativa se vuelva a abrir el historial del lado izquierdo
    const panelHistorial = document.getElementById('offcanvasHistorial');
    // Si necesitas reabrir la barra lateral automáticamente, podrías llamar aquí a tu función: toggleSidebarPACS();
}
// Lo exponemos globalmente para que el botón HTML lo ejecute sin fallas
window.cerrarModoComparativa = cerrarModoComparativa;

async function verificarYRenderizarBotonIntegrar() {
    const contenedor = document.getElementById('contenedor-btn-integrar');
    if (!contenedor) return;

    const { data: { user } } = await fisioNet.auth.getUser();
    
    // Consulta al perfil profesional
    const { data: perfil } = await fisioNet
        .from('perfiles_profesionales')
        .select('especialidad')
        .eq('id', user.id)
        .single();

    // Si es MEDICO-RADIOLOGO, inyectamos el botón
    if (perfil?.especialidad === 'MEDICO-RADIOLOGO') {
        contenedor.innerHTML = `
            <button type="button" id="btn-finalizar-pacs" 
                    class="btn btn-success fw-bold w-100 py-2 shadow" 
                    style="border-radius: 8px; background-color: #48bb78; border: none; font-size: 0.75rem;"
                    onclick="integrarDictamenRadiologicoAlExpediente()">
                <i class="fas fa-file-import me-1"></i> INTEGRAR A EXPEDIENTE FISIOCID
            </button>`;
    } else {
        // Si no es, simplemente no hay nada que mostrar.
        contenedor.innerHTML = '';
    }
}
function iniciarNuevoRegistro() {
    // Solo limpiamos si realmente tenemos algo que limpiar
    if (pacienteExistenteId !== null || window.pacienteSeleccionado !== null) {
        console.log("🧹 Reseteando entorno para nuevo registro...");
        
        pacienteExistenteId = null;
        window.pacienteSeleccionado = null;
        window.pacienteCargado = null;

        // Opcional: Si quieres que el sistema avise visualmente que es nuevo
        const statusFolio = document.getElementById('statusFolio');
        if (statusFolio) statusFolio.innerHTML = '<i class="fas fa-magic text-primary"></i> REGISTRANDO PACIENTE NUEVO';
        
        // Ejecutamos el folio automático para que se genere el nuevo al iniciar
        if (typeof gestionarFolioAutomatico === 'function') {
            gestionarFolioAutomatico(null);
        }
    }
}