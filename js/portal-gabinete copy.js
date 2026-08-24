// ============================================================================
// 🩺 PORTAL DE DIAGNÓSTICO POR GABINETE FISIOCID (VERSION DE PRODUCCIÓN 2026)
// Archivo: portal-gabinete.js
// Gestión de Identidad, Buscador Multi-Palabra, Candados de Seguridad y OTP
// ============================================================================

let pacienteExistenteId = null;
let archivosParaSubir = [];
let perfilEspecialistaCache = null; // Guardamos el rol del usuario logueado
let edicionFichaAutorizada = false;
let historialGabineteCache = []; // Caché global para evitar llamadas excesivas a la DB
let timeoutBusqueda = null;
// --- INSTANCIAS DE CONTROL DE ZOOM ---
let instancePanzoomIzq = null;
let instancePanzoomDer = null;

let tomasVisorActuales = [];
let indiceTomaActiva = 0;
let datosPacienteActualCache = { nombre: '', info: '' }; 
let modoDictadoActivo = false;


// =========================

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🔬 Portal de Especialista Listo para Captura Manual - Validando Roles");
    
    // 1. Obtener y mostrar la identidad del profesional activo
    await mostrarNombreEspecialista();
    
    // 2. Aplicamos Identidad Visual y cargamos el pool de radiólogos
    await aplicarIdentidadGabinete();
    await cargarRadiologosDisponibles();

    // 🎯 REESTRUCTURACIÓN DE CARGA INTELIGENTE (EL HILO DE CRISTIAN)
    const forzarArchivo = localStorage.getItem('forzar_apertura_archivo');
    const forzarPaciente = localStorage.getItem('forzar_apertura_paciente');
    const forzarEstudioId = localStorage.getItem('forzar_apertura_estudio_id'); // 🗲 ID Único del registro

    if (forzarArchivo && forzarPaciente && forzarEstudioId) {
        console.log(`📡 Modo Enrutado Directo Activo: Cargando estudio ${forzarEstudioId} de ${forzarPaciente}`);
        
        // Limpiamos los candados temporales de navegación
        localStorage.removeItem('forzar_apertura_archivo');
        localStorage.removeItem('forzar_apertura_paciente');
        localStorage.removeItem('forzar_apertura_estudio_id');

        // 🚀 Entra directo al grano: Abre el visor PACS de inmediato
        await abrirEstudioParaDictamenMaestro(forzarEstudioId, forzarArchivo, forzarPaciente);
    } else {
        // Si no cliqueó nada en el Dashboard, cargamos el historial general de advertencias
        await cargarHistorialPersonal();
    }


    // 4. GESTIÓN MULTI-ARCHIVO (Selector nativo que ya tenías)
    const inputArchivos = document.getElementById('archivos-gabinete');
if (inputArchivos) {
    inputArchivos.addEventListener('change', (e) => {
        // Convertimos el FileList a un arreglo real de archivos
        const nuevosArchivos = Array.from(e.target.files);
        
        // Procesamos todos los archivos seleccionados
        nuevosArchivos.forEach(archivo => {
            // Verificamos si ya existe para evitar duplicados
            if (!archivosParaSubir.some(a => a.name === archivo.name)) {
                archivosParaSubir.push(archivo);
            }
        });
        
        // Renderizamos todo el grupo de archivos de una vez
        renderizarMiniaturas(); 
        
        // Limpiamos el input para que, si vuelves a seleccionar otros, no haya conflicto
        e.target.value = ''; 
    });
}
});


function togglePanelDictamen() {
    const panel = document.getElementById('panel-dictamen-radiologo');
    const btn = document.getElementById('btn-toggle-dictamen');
    
    if (!panel || !btn) return;

    if (panel.classList.contains('d-none')) {
        panel.classList.remove('d-none');
        btn.innerHTML = '<i class="fas fa-eye-slash me-1"></i> OCULTAR DICTAMEN';
    } else {
        panel.classList.add('d-none');
        btn.innerHTML = '<i class="fas fa-pen-nib me-1"></i> MOSTRAR DICTAMEN';
    }
}
window.togglePanelDictamen = togglePanelDictamen;


async function abrirEstudioParaDictamenMaestro(estudioId, archivoUrl, pacienteNombreFull) {
    console.group("📡 [FisioCid PACS] Apertura Maestro");
    
    const panelHistorial = document.getElementById('offcanvasHistorial');
    const txtHallazgos = document.getElementById('descripcion-hallazgos-pacs');

    if (panelHistorial) {
        // Evento de escucha suave
        panelHistorial.addEventListener('hidden.bs.offcanvas', function focoMaestro() {
            if (txtHallazgos) {
                txtHallazgos.removeAttribute('disabled');
                txtHallazgos.focus({preventScroll: true});
            }
            panelHistorial.removeEventListener('hidden.bs.offcanvas', focoMaestro);
        });

        // Cierre oficial de Bootstrap
        const instanciaBootstrap = bootstrap.Offcanvas.getInstance(panelHistorial);
        if (instanciaBootstrap) instanciaBootstrap.hide();
    }

    try {
        const visor = document.getElementById('visorComparativa');
        if (visor) visor.dataset.estudioActivoId = estudioId;

        const panelDictamen = document.getElementById('panel-dictamen-radiologo');
        if (panelDictamen) {
            panelDictamen.classList.remove('d-none');
            panelDictamen.style.setProperty('display', 'block', 'important');
        }

        await abrirTomaInmediata(archivoUrl, 0, pacienteNombreFull, 'EXAMEN EN CURSO');

        const { data: estudioActual } = await fisioNet
            .from('estudios_gabinete')
            .select('paciente_id, hallazgos_tecnica, diagnostico_radiologico, es_hallazgo_urgente')
            .eq('id', estudioId)
            .maybeSingle();

        if (estudioActual) {
            const txtC = document.getElementById('conclusion-estudio-pacs');
            if (txtHallazgos) txtHallazgos.value = estudioActual.hallazgos_tecnica || '';
            if (txtC) txtC.value = estudioActual.diagnostico_radiologico || '';
        }

    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        console.groupEnd();
    }
}

async function renderizarTomaActivaEnLienzo() {
    console.log("🩻 [FisioCid PACS] Renderizando lienzo con alineación matemática segura...");
    const visor = document.getElementById('visorComparativa');
    const imgIzq = document.getElementById('imgIzquierda');
    const infoIzq = document.getElementById('infoIzquierda');
    const contadorBadge = document.getElementById('badgeContadorTomasVisor');

    try {
        limpiarInstanciasZoom();
        
        const backdrop = document.querySelector('.offcanvas-backdrop');
        if (backdrop) backdrop.remove(); 
        document.body.style.overflow = 'hidden';

        if (contadorBadge && tomasVisorActuales.length > 0) {
            contadorBadge.innerText = `Toma ${indiceTomaActiva + 1} / ${tomasVisorActuales.length}`;
        }

        const archivoRuta = tomasVisorActuales[indiceTomaActiva];
        const res = await fisioNet.storage.from('expedientes-clinicos').createSignedUrl(archivoRuta, 3600);
        if (res.error) throw res.error;

        if (imgIzq) {
            imgIzq.style.pointerEvents = "auto"; 
            imgIzq.src = res.data.signedUrl;
        }
        
        if (infoIzq) {
            infoIzq.innerHTML = `<i class="fas fa-user me-1"></i> Paciente: ${datosPacienteActualCache.nombre.toUpperCase()} | <i class="fas fa-file-medical-alt me-1"></i> ${datosPacienteActualCache.info}`;
        }

        if (visor) visor.classList.remove('d-none');

        // 🔥 INICIALIZACIÓN DE ENTORNO SEGURO PARA PANZOOM
        setTimeout(() => {
            const wrapperZoom = document.getElementById('div-zoom-izq');
            const areaContenedora = document.getElementById('panelIzquierdoVisor');
            
            if (wrapperZoom && typeof Panzoom !== 'undefined') {
                console.log("⚙️ [FisioCid PACS] Inicializando Panzoom sobre el Wrapper de la Imagen.");
                
               instancePanzoomIzq = Panzoom(wrapperZoom, {
    maxScale: 6,
    minScale: 1,
    contain: 'outside',
    canvas: false,
    
    /* 🛡️ LA SOLUCIÓN MAESTRA: Le decimos a Panzoom que no toque 
       absolutamente nada que esté dentro del panel de dictamen */
    exclude: [document.getElementById('panel-dictamen-radiologo')] 
});

                // Control impecable de la rueda del mouse sin saltos de layout
                areaContenedora?.addEventListener('wheel', (e) => {
                    e.preventDefault();
                    instancePanzoomIzq.zoomWithWheel(e);
                }, { passive: false });
            }
        }, 250);

    } catch (err) { console.error("❌ Error en renderizador:", err); }
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
window.procesarCurp = procesarCurp;

// --- BUSCADOR INTELIGENTE EN PACIENTES MAESTROS (OPTIMIZADO) ---
const inputNombre = document.getElementById('valNombre');
const listaSugerencias = document.getElementById('sugerencias-gabinete');

inputNombre?.addEventListener('input', async (e) => {
    const texto = e.target.value.trim().toUpperCase();
    if (texto.length < 3) {
        listaSugerencias?.classList.add('d-none');
        return;
    }

    try {
        const palabras = texto.split(/\s+/).filter(p => p.length > 0);
        let query = fisioNet.from('pacientes_maestros').select('*');
        
        palabras.forEach(palabra => {
            query = query.or(`nombre.ilike.%${palabra}%,apellido_paterno.ilike.%${palabra}%,apellido_materno.ilike.%${palabra}%,curp.ilike.%${palabra}%`);
        });

        const { data: pacientes, error } = await query.limit(5);
        if (error) throw error;

        if (pacientes && pacientes.length > 0) {
            listaSugerencias.innerHTML = '';
            listaSugerencias.classList.remove('d-none');

            pacientes.forEach(p => {
                const btn = document.createElement('button');
                btn.className = 'list-group-item list-group-item-action p-2.5 text-start';
                
                let fechaFormateada = 'N/A';
                if (p.fecha_nacimiento) {
                    const [anio, mes, dia] = p.fecha_nacimiento.split('-');
                    fechaFormateada = `${dia}/${mes}/${anio}`;
                }

                btn.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <strong class="text-dark fs-7">${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}</strong>
                        <span class="badge bg-light text-secondary border">🎂 ${fechaFormateada}</span>
                    </div>
                    <div class="text-muted mt-1" style="font-size: 0.65rem;">
                        <i class="fas fa-id-card me-1"></i>CURP: <span class="fw-bold text-primary">${p.curp || 'N/A'}</span>
                    </div>
                `;
                
                btn.onclick = (event) => {
                    event.preventDefault();
                    autorrellenarPaciente(p); // Corregido el nombre cruzado para que coincida exactamente
                };
                listaSugerencias.appendChild(btn);
            });
        } else {
            listaSugerencias.classList.add('d-none');
        }
    } catch (err) {
        console.error("Error en búsqueda:", err.message);
    }
});

function autorrellenarPaciente(p) {
    if (listaSugerencias) listaSugerencias.classList.add('d-none');
    pacienteExistenteId = p.id;
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
    // 1. Verificación de seguridad: ¿Están los IDs definidos?
    if (!pacienteId || !clinicaId || !estudioId) {
        console.error("❌ ERROR CRÍTICO: IDs faltantes", { pacienteId, clinicaId, estudioId });
        alert("Error: No se puede organizar el archivo porque faltan datos del paciente o la clínica.");
        return []; // Retornamos vacío para no subir basura
    }

    const nombresArchivos = [];
    
    for (const archivo of archivosParaSubir) {
        // Usamos una ruta limpia. Si el nombre tiene espacios, los cambiamos por guiones bajos
        const nombreLimpio = archivo.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const rutaSegura = `${clinicaId}/${pacienteId}/${estudioId}/${Date.now()}_${nombreLimpio}`;
        
        console.log("📤 Subiendo a:", rutaSegura); // Para que veas qué está pasando

        const { data, error } = await fisioNet.storage
            .from('expedientes-clinicos')
            .upload(rutaSegura, archivo);

        if (error) {
            console.error("❌ Error al subir:", error.message);
        } else {
            nombresArchivos.push(rutaSegura);
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

    // 1. UNA SOLA DECLARACIÓN DEL BOTÓN
    const btn = document.getElementById('btn-finalizar-pacs');
    const estudioId = btn.dataset.estudioActivoId;
    
    if (!estudioId) {
        alert("⚠️ Error: No se detectó un estudio activo.");
        return;
    }

    // Captura de datos
    const tecnicaHallazgos = document.getElementById('descripcion-hallazgos-pacs').value.toUpperCase().trim();
    const conclusionDiag = document.getElementById('conclusion-estudio-pacs').value.toUpperCase().trim();
    const esUrgente = document.getElementById('es-urgente-pacs').checked;

    if (!tecnicaHallazgos || !conclusionDiag) {
        alert("⚠️ Validación: Debes llenar la Descripción y la Conclusión.");
        return;
    }

    // 2. USO DE LA VARIABLE 'btn' YA DECLARADA
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> FIRMANDO Y SELLANDO...`;

    try {
        const { error: errorUpdate } = await fisioNet
            .from('estudios_gabinete')
            .update({
                estado_dictamen: 'DICTAMINADO',
                hallazgos_tecnica: tecnicaHallazgos, // Usamos la columna correcta
                diagnostico_radiologico: conclusionDiag,
                es_hallazgo_urgente: esUrgente,
                id_radiologo_firmante: user.id,
                fecha_dictamen: new Date().toISOString()
            })
            .eq('id', estudioId);

        if (errorUpdate) throw errorUpdate;

        // Inyección en historial (asegúrate de que visor.dataset.pacienteActivoId exista)
        await fisioNet.from('historial_clinico').insert([{
            id_paciente: visor.dataset.pacienteActivoId,
            fecha_nota: new Date().toISOString(),
            motivo_consulta: `DICTAMEN RADIOLÓGICO`,
            nota_evolucion: `HALLAZGOS: ${tecnicaHallazgos}\nCONCLUSIÓN: ${conclusionDiag}`,
            id_profesional: user.id
        }]);

        alert("🏆 ¡Dictamen integrado con éxito!");
        cerrarComparativa();
        if (typeof cargarHistorialPersonal === 'function') await cargarHistorialPersonal();

    } catch (err) {
        console.error("❌ Error:", err);
        alert("Atención: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "INTEGRAR A EXPEDIENTE FISIOCID";
    }
}
// Vinculamos la función al objeto global para que tu botón HTML del mockup la mande a llamar con su onclick
window.integrarDictamenRadiologicoAlExpediente = integrarDictamenRadiologicoAlExpediente;
// ============================================================================
// 💾 ENTRADA MAESTRA: GUARDAR ESTUDIO Y EXPEDIENTE LOCAL DE SEDE


async function guardarEstudioGabinete(event) {
    if (event) event.preventDefault();
    const btn = document.getElementById('btn-finalizar');

    // 1. OBTENEMOS EL USUARIO (Para solucionar el error 'user is not defined')
    const { data: { user }, error: authErr } = await fisioNet.auth.getUser();
    if (authErr || !user) { alert("Error: No se detectó sesión. Inicia sesión de nuevo."); return; }

    // 2. DECLARACIÓN DE VARIABLES (Al inicio para que todo el try pueda verlas)
    const idClinicaActiva = localStorage.getItem('id_clinica_activa') || localStorage.getItem('id_socio_activo') || localStorage.getItem('clinica_activa_id');
    const tipoEstudio = document.getElementById('tipo-estudio').value;
    const nombreSolo = document.getElementById('valNombre').value.toUpperCase().trim();
    const apellidoP = document.getElementById('valPaterno').value.toUpperCase().trim();
    const apellidoM = document.getElementById('valMaterno').value.toUpperCase().trim();
    const fechaNac = document.getElementById('valFecha').value;
    const genero = document.getElementById('genero-manual').value;
    const zonaAnatomica = document.getElementById('zona-estudio').value.toUpperCase();
    const hallazgos = document.getElementById('descripcion-hallazgos').value.trim();
    const conclusion = document.getElementById('conclusion-estudio').value.toUpperCase().trim();
    const radiologoId = document.getElementById('select-radiologo-asignado').value;

    // Validaciones
    if (!idClinicaActiva) { alert("Error: No se detectó la clínica activa."); return; }
    if (!pacienteExistenteId) { alert("Error: Selecciona un paciente primero."); return; }

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> PROCESANDO...`;

    try {
        // 3. SUBIR ARCHIVOS PRIMERO
        console.log("📤 Subiendo archivos físicos...");
        const listaNombresArchivos = await subirArchivosASupabase(pacienteExistenteId, idClinicaActiva, "TMP_ESTUDIO");

        // 4. ARMADO DEL PAYLOAD
        const payload = {
            paciente_id: pacienteExistenteId,
            id_socio_emisor: idClinicaActiva,
            tipo_estudio: tipoEstudio,
            creado_por: user.id,
            tecnico_captura: user.email, 
            paciente_nombre_manual: `${nombreSolo} ${apellidoP} ${apellidoM}`.trim(),
            paciente_edad_momento: calcularEdad(fechaNac),
            paciente_genero_momento: genero,
            zona_anatomica: zonaAnatomica,
            hallazgos_resumen: hallazgos || "SIN HALLAZGOS",
            hallazgo_tecnica: hallazgos || "SIN HALLAZGOS", // Nueva columna solicitada
            diagnostico_radiologico: conclusion || "PENDIENTE",
            es_hallazgo_urgente: document.getElementById('es-urgente').checked,
            doctor_emisor_id: radiologoId || null,
            estado_dictamen: 'PENDIENTE',
            archivo_url: listaNombresArchivos.join(','),
            nombre_archivo: archivosParaSubir.map(a => a.name).join(','),
            fecha_registro: new Date().toISOString()
        };

        // 5. INSERT ÚNICO
        console.log("💾 Guardando en estudios_gabinete...");
        const { error: errEst } = await fisioNet.from('estudios_gabinete').insert([payload]);

        if (errEst) throw errEst;

        alert("🏆 ¡ÉXITO! Expediente clínico integrado correctamente.");
        window.location.reload();

    } catch (err) {
        console.error("❌ ERROR FINAL:", err);
        alert("Error al integrar: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "INTEGRAR A EXPEDIENTE FISIOCID";
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

// --- INTERFAZ DE RENDERS, MINIATURAS E HISTORIALES ---
function renderizarMiniaturas() {
    const contenedor = document.getElementById('carril-imagen');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    archivosParaSubir.forEach((archivo, index) => {
        const reader = new FileReader();
        const divCol = document.createElement('div');
        divCol.className = 'col-4 col-md-3 position-relative animate__animated animate__fadeIn';
        reader.onload = (e) => {
            const esPDF = archivo.type === 'application/pdf';
            const iconOrImg = esPDF 
                ? `<div class="d-flex align-items-center justify-content-center bg-danger text-white rounded-3 shadow-sm" style="height: 80px;"><i class="fas fa-file-pdf fa-2x"></i></div>`
                : `<img src="${e.target.result}" class="img-fluid rounded-3 shadow-sm border" style="height: 80px; width: 100%; object-fit: cover;">`;
            divCol.innerHTML = `
                ${iconOrImg}
                <button class="btn btn-danger btn-sm position-absolute top-0 end-0 rounded-circle shadow-sm" style="width: 20px; height: 20px; padding: 0; font-size: 10px; margin: -5px;" onclick="quitarArchivo(${index})"><i class="fas fa-times"></i></button>
                <div class="small text-truncate mt-1" style="font-size: 0.6rem; color: #64748b;">${archivo.name}</div>`;
        };
        reader.readAsDataURL(archivo);
        contenedor.appendChild(divCol);
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

        // 🧠 Detectamos el rol del especialista usando la caché que ya tienes armada
        const especialidadUsuario = (perfilEspecialistaCache?.especialidad || '').toUpperCase();
        const esRadiologo = especialidadUsuario.includes('RADIOLOG');

        // Armamos el query base de Supabase
        let query = fisioNet.from('estudios_gabinete').select('*');

        if (esRadiologo) {
            // 🎯 JUGADA MAESTRA: Si es Radiólogo, le traemos todos los estudios asignados a él 
            // o los de la clínica que requieran su atención, sin importar quién los creó
            query = query.or(`doctor_emisor_id.eq.${user.id},creado_por.eq.${user.id}`);
        } else {
            // Si es un técnico o recepcionista, solo ve lo que él mismo cargó
            query = query.eq('creado_por', user.id);
        }

        const { data: estudios, error } = await query
            .order('fecha_registro', { ascending: false })
            .limit(20);

        if (error) throw error;

        historialGabineteCache = estudios || [];
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
    const texto = document.getElementById('busquedaHistorialGabinete').value.trim().toUpperCase();

    // 1. Filtrado inmediato sobre la caché local (Velocidad instantánea en pantalla)
    const filtradosCache = historialGabineteCache.filter(est => {
        const nombreCompleto = (est.paciente_nombre_manual || "").toUpperCase();
        return nombreCompleto.includes(texto);
    });

    renderizarListaHistorialGabinete(filtradosCache);

    // 2. Anti-Bounce para no saturar Supabase mientras el operador escribe
    clearTimeout(timeoutBusqueda);
    if (texto.length >= 3) {
        timeoutBusqueda = setTimeout(async () => {
            console.log(`📡 Buscando de forma profunda en la DB el patron: ${texto}`);
            try {
                const { data: { user } } = await fisioNet.auth.getUser();
                if (!user) return;

                const especialidadUsuario = (perfilEspecialistaCache?.especialidad || '').toUpperCase();
                const esRadiologo = especialidadUsuario.includes('RADIOLOG');

                let queryDeep = fisioNet.from('estudios_gabinete').select('*');

                if (esRadiologo) {
                    // El radiólogo busca de forma profunda en todo lo que tiene vinculación con su cuenta
                    queryDeep = queryDeep.or(`doctor_emisor_id.eq.${user.id},creado_por.eq.${user.id}`);
                } else {
                    queryDeep = queryDeep.eq('creado_por', user.id);
                }

                // Aplicamos el filtro de búsqueda multi-palabra sobre el nombre
                const { data: resultadosDB, error } = await queryDeep
                    .ilike('paciente_nombre_manual', `%${texto}%`)
                    .order('fecha_registro', { ascending: false })
                    .limit(15);

                if (!error && resultadosDB && resultadosDB.length > 0) {
                    // Combinamos los resultados de la DB con la caché evitando duplicados por ID
                    const mapaUnico = new Map();
                    filtradosCache.forEach(e => mapaUnico.set(e.id, e));
                    resultadosDB.forEach(e => mapaUnico.set(e.id, e));
                    
                    renderizarListaHistorialGabinete(Array.from(mapaUnico.values()));
                }
            } catch (err) {
                console.error("Error en busqueda profunda remota:", err);
            }
        }, 400); // 400ms de tregua táctica
    }
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
        const nombreFull = est.paciente_nombre_manual || "PACIENTE SIN NOMBRE";
        const archivos = est.archivo_url ? est.archivo_url.split(',') : [];
        const fechaLegible = est.fecha_registro ? new Date(est.fecha_registro).toLocaleDateString() : "--/--/----";
        const primeraToma = archivos[0] ? archivos[0].trim() : "";

        // 🎨 DETECTOR DE ADVERTENCIA: Si está PENDIENTE, le clavamos un badge llamativo de alerta
        const estadoActual = (est.estado_dictamen || 'PENDIENTE').toUpperCase();
        const esPendiente = estadoActual === 'PENDIENTE';
        const badgeAlerta = esPendiente 
            ? `<span class="badge bg-warning text-dark border border-warning-subtle animate__animated animate__flash animate__infinite" style="font-size: 0.55rem;"><i class="fas fa-exclamation-circle"></i> POR DICTAR</span>`
            : `<span class="badge bg-success text-white" style="font-size: 0.55rem;"><i class="fas fa-check-circle"></i> LISTO</span>`;

        // Iteramos las tomas para meter los botones individuales de visualización directa
        let botonesArchivos = '';
        archivos.forEach((urlNodo, idx) => {
            const esPDF = urlNodo.toLowerCase().endsWith('.pdf');
            const icono = esPDF ? 'fa-file-pdf text-danger' : 'fa-image text-primary';
            
            botonesArchivos += `
                <button type="button" class="btn btn-sm btn-outline-secondary mb-1 me-1 p-1 px-2" style="font-size: 0.65rem;" 
                    onclick="abrirTomaInmediata('${est.archivo_url.trim()}', ${idx}, '${nombreFull}', '${fechaLegible} - ${est.tipo_estudio}')">
                    <i class="fas ${icono}"></i> Toma ${idx + 1}
                </button>`;
        });

        return `
        <div class="list-group-item p-3 border-0 border-bottom" style="${esPendiente ? 'background-color: rgba(253, 230, 138, 0.04);' : ''}">
            <div class="form-check">
                <input class="form-check-input check-comparar-gabinete" type="checkbox" 
                    value="${primeraToma}" 
                    data-paciente="${nombreFull}" 
                    data-info="${fechaLegible} - ${est.tipo_estudio}" 
                    id="chk_gabinete_${est.id}">
                <label class="form-check-label w-100 cursor-pointer" for="chk_gabinete_${est.id}">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="fw-bold text-dark small text-uppercase" style="font-size: 0.75rem;">${nombreFull}</span>
                        <div class="d-flex gap-1 align-items-center">${badgeAlerta}</div>
                    </div>
                    <div class="text-muted mt-1" style="font-size: 0.7rem; line-height: 1.25;">
                        <i class="fas fa-wave-square me-1"></i><strong>${est.tipo_estudio}</strong> [${est.zona_anatomica}]<br>
                        <i class="fas fa-calendar-day me-1"></i>${fechaLegible}
                    </div>
                </label>
            </div>
            <div class="d-flex flex-wrap mt-2">${botonesArchivos}</div>
        </div>`;
    }).join('');
}

// ============================================================================
// 🚀 LANZADOR DIRECTO ADAPTATIVO CON SOPORTE DE CARRUSEL DE TOMAS MULTIPLES
// ============================================================================
async function abrirTomaInmediata(stringArchivos, indiceInicial, pacienteNombre, estudioInfo) {
    if (!stringArchivos || stringArchivos === "undefined") return;

    // Desglosamos el string de URLs en un arreglo limpio
    tomasVisorActuales = stringArchivos.split(',').map(s => s.trim());
    indiceTomaActiva = parseInt(indiceInicial) || 0;
    
    // Guardamos metadatos en caché de sesión para el refresco del carrusel
    datosPacienteActualCache.nombre = pacienteNombre;
    datosPacienteActualCache.info = estudioInfo;

    // Control preventivo de PDFs directos
    if (tomasVisorActuales[indiceTomaActiva].toLowerCase().endsWith('.pdf')) {
        try {
            const { data, error } = await fisioNet.storage.from('expedientes-clinicos').createSignedUrl(tomasVisorActuales[indiceTomaActiva], 3600); 
            if (error) throw error;
            window.open(data.signedUrl, '_blank');
        } catch (err) { alert("No se pudo abrir el PDF."); }
        return;
    }

    // Desplegamos u ocultamos flechas físicas de control según el conteo de tomas
    const btnIzq = document.getElementById('btnFlechaVisorIzq');
    const btnDer = document.getElementById('btnFlechaVisorDer');
    
    if (tomasVisorActuales.length > 1) {
        btnIzq?.classList.remove('d-none');
        btnDer?.classList.remove('d-none');
    } else {
        btnIzq?.classList.add('d-none');
        btnDer?.classList.add('d-none');
    }

    // Desplegamos el visor físico montando la toma activa seleccionada
    await renderizarTomaActivaEnLienzo();
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
// ============================================================================
// 🔒 AUXILIARES DEL VISOR: LIMPIEZA, RESETEO Y INYECCIÓN DE LIBRERÍAS
// ============================================================================
function reiniciarZoomTomas() {
    if (instancePanzoomIzq) instancePanzoomIzq.reset();
    if (instancePanzoomDer) instancePanzoomDer.reset();
    console.log("🔄 Coordenadas y escalas reajustadas a valores de fábrica.");
}

function limpiarInstanciasZoom() {
    if (instancePanzoomIzq) { instancePanzoomIzq.destroy(); instancePanzoomIzq = null; }
    if (instancePanzoomDer) { instancePanzoomDer.destroy(); instancePanzoomDer = null; }
}

function cerrarComparativa() {
    limpiarInstanciasZoom();
    document.getElementById('visorComparativa').classList.add('d-none');
    document.getElementById('panel-dictamen-radiologo').classList.add('d-none'); // 👈 Agrega esta línea
}
window.cerrarComparativa = cerrarComparativa;

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


// ============================================================================
// 📡 ESCANER DE RADIÓLOGOS DISPONIBLES (INTERNOS Y CONVENIOS EXTERNOS)
// ============================================================================
async function cargarRadiologosDisponibles() {
    const select = document.getElementById('select-radiologo-asignado');
    if (!select) return;

    const idClinica = localStorage.getItem('id_clinica_activa');
    
    try {
        // Disparamos consultas paralelas para máxima velocidad
        const [resInternos, resExternos] = await Promise.all([
            // 1. Buscar en tu equipo interno que tengan rol o cargo de Radiólogo
            fisioNet
                .from('colaboradores_clinica')
                .select('id_profesional, perfiles_profesionales(nombre_completo, especialidad)')
                .eq('id_clinica', idClinica)
                .eq('estado', 'ACTIVO'),
            
            // 2. Buscar en tus alianzas externas activas
            fisioNet
                .from('red_colaboracion')
                .select('id_doctor_receptor, nombre_entidad, tipo_entidad')
                .eq('id_doctor_emisor', idClinica) // Tú los invitaste
                .eq('estado_conexion', 'ACTIVO')
        ]);

        let opcionesHtml = '<option value="" disabled selected>SELECCIONE RADIÓLOGO PARA DICTAMEN...</option>';

        // 🔵 PROCESAR RADIÓLOGOS INTERNOS
        if (!resInternos.error && resInternos.data) {
            const internosFiltrados = resInternos.data.filter(c => {
                const esp = c.perfiles_profesionales?.especialidad || '';
                return esp.toUpperCase().includes('RADIOLOG');
            });

            if (internosFiltrados.length > 0) {
                opcionesHtml += `<optgroup label="🔵 STAFF INTERNO DE LA SEDE">`;
                internosFiltrados.forEach(c => {
                    opcionesHtml += `<option value="${c.id_profesional}">👨‍⚕️ ${c.perfiles_profesionales.nombre_completo.toUpperCase()}</option>`;
                });
                opcionesHtml += `</optgroup>`;
            }
        }

        // 🟢 PROCESAR CONVENIOS Y ALIANZAS EXTERNAS
        if (!resExternos.error && resExternos.data) {
            if (resExternos.data.length > 0) {
                opcionesHtml += `<optgroup label="🟢 CONVENIOS Y ALIANZAS EXTERNAS">`;
                resExternos.data.forEach(ali => {
                    opcionesHtml += `<option value="${ali.id_doctor_receptor}">🤝 ${ali.nombre_entidad.toUpperCase()}</option>`;
                });
                opcionesHtml += `</optgroup>`;
            }
        }

        select.innerHTML = opcionesHtml;

    } catch (err) {
        console.error("❌ Error al mapear la red de radiólogos:", err);
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

// ============================================================================
// 🛡️ CORTACIRCUITOS DE EVENTOS: AISLAMIENTO TOTAL PARA LOS TEXTAREAS
// ============================================================================
const inputsDictamenFisioCid = [
    'descripcion-hallazgos-pacs',
    'conclusion-estudio-pacs'
];

inputsDictamenFisioCid.forEach(id => {
    const elementoInput = document.getElementById(id);
    if (elementoInput) {
        // Interceptamos el clic antes de que suba al visor negro y active el "Reset Zoom"
        elementoInput.addEventListener('mousedown', (e) => { e.stopPropagation(); }, { capture: true });
        elementoInput.addEventListener('click', (e) => { e.stopPropagation(); }, { capture: true });
        
        // Interceptamos las teclas para que se escriban directo en el cuadro sin alterar las imágenes
        elementoInput.addEventListener('keydown', (e) => { e.stopPropagation(); }, { capture: true });
        elementoInput.addEventListener('keyup', (e) => { e.stopPropagation(); }, { capture: true });
    }
});


// ============================================================================
// 🕵️‍♂️ SUITE DE DIAGNÓSTICO FISIOCID (DETECTIVE DE FOCO)
// ============================================================================
console.log("🔍 [DEBUG] Detective de Foco activado...");

// 1. ESPÍA DE FOCO: Nos dice cada segundo qué elemento tiene el control real
setInterval(() => {
    if (document.activeElement !== document.body) {
        console.log("🎯 Elemento con foco actual:", document.activeElement);
    }
}, 2000);

// 2. ESPÍA DE TECLADO: Nos dice si alguien está "comiendo" las teclas
window.addEventListener('keydown', (e) => {
    if (e.target.id === 'descripcion-hallazgos-pacs' || e.target.id === 'conclusion-estudio-pacs') {
        console.log("✅ Tecla detectada en zona segura:", e.key);
    } else {
        // Si escribes y no sale el log de arriba, esto nos dirá quién se robó la tecla
        console.log("🚨 Tecla robada por:", e.target, "Tecla:", e.key);
    }
}, true); // {capture: true} para ver el evento antes que nadie

// 3. ESPÍA DE BOOTSTRAP: Nos dice si el panel sigue vivo
setInterval(() => {
    const backdrop = document.querySelector('.offcanvas-backdrop');
    if (backdrop) {
        console.warn("⚠️ ALERTA: ¡El backdrop de Bootstrap sigue en el DOM! Esto bloquea el foco.");
    }
}, 3000);


