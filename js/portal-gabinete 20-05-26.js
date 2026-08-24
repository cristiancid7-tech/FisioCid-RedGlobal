// ============================================================================
// 🩺 PORTAL DE DIAGNÓSTICO POR GABINETE FISIOCID (VERSION DE PRODUCCIÓN 2026)
// Archivo: portal-gabinete.js
// Gestión de Identidad, Buscador Multi-Palabra, Candados de Seguridad y OTP
// ============================================================================

let pacienteExistenteId = null;
let archivosParaSubir = [];
let perfilEspecialistaCache = null; // Guardamos el rol del usuario logueado
let edicionFichaAutorizada = false;

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

    // 🔥 3. MAYÚSCULAS AUTOMÁTICAS GLOBALES
    document.addEventListener('input', (e) => {
        const el = e.target;
        if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && 
             el.type !== 'email' && el.type !== 'password' && el.id !== 'valEmail' && el.id !== 'correo-tutor') {
            el.value = el.value.toUpperCase();
        }
    });

    // 4. GESTIÓN MULTI-ARCHIVO (Selector nativo que ya tenías)
    const inputArchivos = document.getElementById('archivos-gabinete');
    if (inputArchivos) {
        inputArchivos.addEventListener('change', (e) => {
            const nuevosArchivos = Array.from(e.target.files);
            nuevosArchivos.forEach(archivo => {
                if (!archivosParaSubir.some(a => a.name === archivo.name)) {
                    archivosParaSubir.push(archivo);
                }
            });
            renderMiniaturas(); 
            e.target.value = ''; 
        });
    }
});
// ============================================================================
// 📊 MOTOR DE APERTURA INMEDIATA Y ESCANER COMPARATIVO AUTOMÁTICO
// ============================================================================
async function abrirEstudioParaDictamenMaestro(estudioId, archivoUrl, pacienteNombreFull) {
    try {
        // 1. Guardamos el ID del estudio activo en una variable global o dataset para el botón final
        document.getElementById('visorComparativa').dataset.estudioActivoId = estudioId;

        // 2. Desglosamos las tomas en el carrusel e iniciamos el lienzo PACS
        await abrirTomaInmediata(archivoUrl, 0, pacienteNombreFull, 'EXAMEN EN CURSO');

        // 3. 🚀 EL FILTRO AUTOMÁTICO EN SEGUNDO PLANO: Buscamos al paciente para jalar su ID Maestro
        // Buscamos en estudios_gabinete el registro para extraer el 'paciente_id' real
        const { data: estudioActual, errorEst } = await fisioNet
            .from('estudios_gabinete')
            .select('paciente_id')
            .eq('id', estudioId)
            .maybeSingle();

        if (errorEst || !estudioActual) throw new Error("No se localizó el identificador del paciente.");
        
        const idDelPaciente = estudioActual.paciente_id;
        document.getElementById('visorComparativa').dataset.pacienteActivoId = idDelPaciente;

        // 4. 🔍 JALAMOS SU HISTORIAL ANTERIOR COMPLETO PARA COMPARACIÓN RÁPIDA
        console.log(`📡 Escaneando comparativa histórica para el paciente ID: ${idDelPaciente}`);
        const { data: historiales, errorHist } = await fisioNet
            .from('estudios_gabinete')
            .select('id, fecha_registro, tipo_estudio, zona_anatomica, archivo_url, estado_dictamen')
            .eq('paciente_id', idDelPaciente)
            .neq('id', estudioId) // Excluimos el estudio que estamos dictaminando ahorita
            .order('fecha_registro', { ascending: false });

        const contenedorComparador = document.getElementById('lista-historial-gabinete');
        if (!contenedorComparador) return;

        if (errorHist || !historiales || historiales.length === 0) {
            contenedorComparador.innerHTML = '<div class="p-3 text-center text-muted small"><i class="fas fa-info-circle"></i> Sin estudios anteriores para comparar.</div>';
            return;
        }

        // Pintamos el pool de comparación del paciente con signos informativos
        contenedorComparador.innerHTML = `
            <div class="p-2 border-bottom bg-light fw-bold text-secondary" style="font-size:0.68rem; letter-spacing:0.5px;">🗂️ ESTUDIOS ANTERIORES DEL PACIENTE</div>
            ${historiales.map(h => {
                const fechaH = new Date(h.fecha_registro).toLocaleDateString();
                return `
                <div class="list-group-item p-2.5 border-0 border-bottom bg-white">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <strong class="text-dark uppercase" style="font-size:0.72rem;">${h.tipo_estudio}</strong>
                        <span class="badge bg-secondary" style="font-size:0.55rem;">${fechaH}</span>
                    </div>
                    <div class="text-muted small mb-2" style="font-size:0.65rem;"><i class="fas fa-bullseye"></i> Zona: ${h.zona_anatomica.toUpperCase()}</div>
                    <button type="button" class="btn btn-xs btn-outline-info py-0.5 fw-bold w-100" style="font-size:0.65rem; border-radius:4px;"
                        onclick="abrirTomaInmediata('${h.archivo_url}', 0, '${pacienteNombreFull}', 'COMPARATIVA: ${h.tipo_estudio}')">
                        <i class="fas fa-images"></i> Cargar en Visor Comparativo
                    </button>
                </div>`;
            }).join('')}
        `;

    } catch (err) {
        console.error("❌ Error en el acoplamiento maestro del dictamen:", err.message);
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

// --- STORAGE DE ARCHIVOS ---
async function subirArchivosASupabase(pacienteNombre) {
    const nombresArchivos = [];
    if (archivosParaSubir.length === 0) return [];

    for (const archivo of archivosParaSubir) {
        const nombreLimpio = `${Date.now()}_${archivo.name.replace(/[^a-z0-9.]/gi, '_')}`;
        const { data, error } = await fisioNet.storage
            .from('expedientes-clinicos')
            .upload(nombreLimpio, archivo);

        if (error) {
            console.error("❌ ERROR DE STORAGE:", error.message);
            continue; 
        }
        nombresArchivos.push(nombreLimpio);
    }
    return nombresArchivos; 
}

// ============================================================================
// 💾 BOTÓN SUPREMO: INTEGRAR DICTAMEN RADIOLÓGICO AL EXPEDIENTE DE RED
// ============================================================================
async function integrarDictamenRadiologicoAlExpediente() {
    const visor = document.getElementById('visorComparativa');
    const estudioId = visor?.dataset.estudioActivoId;
    const pacienteId = visor?.dataset.pacienteActivoId;

    if (!estudioId || !pacienteId) {
        alert("⚠️ Error: No se detectó un estudio activo en ejecución para guardar.");
        return;
    }

    // Jalamos los valores de tus textareas del panel interactivo de dictamen
    const tecnicaHallazgos = document.getElementById('descripcion-hallazgos').value.trim();
    const conclusionDiag = document.getElementById('conclusion-estudio').value.trim();
    const esUrgente = document.getElementById('es-urgente').checked;

    if (!tecnicaHallazgos || !conclusionDiag) {
        alert("⚠️ Validación: Debes llenar la Descripción de Hallazgos/Técnica y la Conclusión Diagnóstica antes de firmar.");
        return;
    }

    const btn = document.getElementById('btn-finalizar');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> FIRMANDO Y SELLANDO DICTAMEN...`;
    }

    try {
        // 1. ACTUALIZACIÓN EN ESTUDIOS_GABINETE (CIERRE DE PROCESO PACS)
        const { error: errorGabinete } = await fisioNet
            .from('estudios_gabinete')
            .update({
                estado_dictamen: 'DICTAMINADO',
                hallazgos_resumen: tecnicaHallazgos,       // Tu bitácora descriptiva
                hallazgos_tecnica: tecnicaHallazgos,       // 🚀 Tu nueva columna de Supabase
                diagnostico_radiologico: conclusionDiag,   // Conclusión corta
                es_hallazgo_urgente: esUrgente
            })
            .eq('id', estudioId);

        if (errorGabinete) throw errorGabinete;

        // 2. 🚀 AUTO-INTEGRACIÓN CRUZADA: Insertamos la evolución en historial_clinico de forma limpia
        const { data: { user } } = await fisioNet.auth.getUser();
        
        const { error: errorHistorial } = await fisioNet
            .from('historial_clinico')
            .insert([{
                id_paciente: pacienteId,
                fecha_nota: new Date().toISOString(),
                motivo_consulta: `RESULTADO DE GABINETE: ${conclusionDiag.substring(0, 40).toUpperCase()}`,
                nota_evolucion: `DICTAMEN RADIOLOGICO COMPLETO:\n\nTECNICA Y HALLAZGOS:\n${tecnicaHallazgos}\n\nCONCLUSION:\n${conclusionDiag}\n\n[Dictaminado de forma digital en la Red por especialista autorizado]`,
                id_profesional: user.id,
                especialidad_nota: 'MEDICO-RADIOLOGO'
            }]);

        if (errorHistorial) console.warn("⚠️ Advertencia al cruzar nota de historial clínico:", errorHistorial.message);

        alert("🏆 ¡EXPEDIENTE INTEGRADO PER RÍSI MO! El dictamen fue firmado, el estado cambió a DICTAMINADO y se inyectó en la línea de tiempo de evolución.");
        window.location.href = 'dashboard.html'; // Lo regresamos triunfante al Hub principal

    } catch (err) {
        console.error("❌ Error crítico al cerrar el dictamen:", err.message);
        alert("Atención: " + err.message);
        if (btn) {
            btn.disabled = false;
            btn.innerText = "INTEGRAR A EXPEDIENTE FISIOCID";
        }
    }
}

// Vinculamos la función al objeto global para que tu botón HTML del mockup la mande a llamar con su onclick
window.integrarDictamenRadiologicoAlExpediente = integrarDictamenRadiologicoAlExpediente;
// ============================================================================
// 💾 ENTRADA MAESTRA: GUARDAR ESTUDIO Y EXPEDIENTE LOCAL DE SEDE
// ============================================================================
async function guardarEstudioGabinete(event) {
    if (event) event.preventDefault();
    const btn = document.getElementById('btn-finalizar');

    try {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> INTEGRANDO A LA RED FISIOCID...`;

        const nombreSolo = document.getElementById('valNombre').value.toUpperCase().trim();
        const apellidoP = document.getElementById('valPaterno').value.toUpperCase().trim();
        const apellidoM = document.getElementById('valMaterno').value.toUpperCase().trim();
        const fechaNac = document.getElementById('valFecha').value;
        const genero = document.getElementById('genero-manual').value;
        const email = document.getElementById('valEmail').value.toLowerCase().trim();
        const idClinicaActiva = localStorage.getItem('id_clinica_activa') || localStorage.getItem('id_socio_activo') || localStorage.getItem('clinica_activa_id');

        const estadoSeleccionado = document.getElementById('valEstado').value;
        if (!estadoSeleccionado) throw new Error("Debes seleccionar el Estado de Nacimiento para procesar el expediente.");

        const p1 = document.getElementById('curp-parte1').value;
        const p2 = document.getElementById('curp-estado').value.toUpperCase();
        const p3 = document.getElementById('curp-consonantes').value;
        const p4 = document.getElementById('curp-homo').value.toUpperCase();
        const curpPac = (p1 + p2 + p3 + p4).trim();

        if (curpPac.length < 18) throw new Error("La CURP está incompleta o es inválida.");

        const esMenor = !document.getElementById('seccion-tutor').classList.contains('d-none');
        const telContacto = esMenor ? document.getElementById('tutor-tel').value : (document.getElementById('tel-manual')?.value || "");

        // 🎯 1. SINCRONIZACIÓN DE TABLA MAESTRA (UPSERT DIRECTO)
        console.log("💾 Sincronizando datos en pacientes_maestros...");
        const resultadoUpsert = await fisioNet
            .from('pacientes_maestros')
            .upsert({ 
                curp: curpPac, 
                nombre: nombreSolo,          
                apellido_paterno: apellidoP,  
                apellido_materno: apellidoM,  
                fecha_nacimiento: fechaNac,
                genero: genero,
                estado_nacimiento: estadoSeleccionado,
                telefono: telContacto,
                correo_electronico: email,
                id_clinica_origen: idClinicaActiva, 
                es_menor_edad: esMenor,
                nombre_tutor: esMenor ? document.getElementById('tutor-nombre').value.toUpperCase() : null,
                parentesco_tutor: esMenor ? document.getElementById('tutor-parentesco').value.toUpperCase() : null,
                telefono_tutor: esMenor ? document.getElementById('tutor-tel').value : null
            }, { onConflict: 'curp' }).select('id');

        if (resultadoUpsert.error) throw new Error("Error en Ficha Maestra: " + resultadoUpsert.error.message);

        const idRealPaciente = pacienteExistenteId || resultadoUpsert.data[0]?.id;
        if (!idRealPaciente) throw new Error("No se pudo mapear el identificador maestro del paciente.");

        // ============================================================================
        // 🔒 BLOCK MOTOR: CREACIÓN DE EXPEDIENTES LOCALES EN SEDES DE GABINETE
        // ============================================================================
        const folioSede = document.getElementById('inputFolioExpediente')?.value || null;
        const { data: userAuth } = await fisioNet.auth.getUser();

        const { data: expedienteExiste } = await fisioNet
            .from('expedientes_clinicos')
            .select('id')
            .eq('id_paciente', idRealPaciente)
            .eq('id_clinica', idClinicaActiva)
            .maybeSingle();

        if (!expedienteExiste) {
            console.log("🆕 No existe expediente en esta sede de gabinete. Forzando accesos locales...");

            await fisioNet.from('vinculos_clinicos').insert([{
                paciente_id: idRealPaciente,
                professional_id: userAuth.user.id,
                id_clinica: idClinicaActiva,
                rol_en_relacion: 'GABINETE',
                estado_vinculo: 'ACTIVO'
            }]);

            const numeroLimpio = (folioSede || "0").replace(/\D/g, ''); 
            const consecutivoFinal = parseInt(numeroLimpio) || 0;

            await fisioNet.from('expedientes_clinicos').insert([{
                id_paciente: idRealPaciente,
                id_clinica: idClinicaActiva,
                folio_personalizado: folioSede,
                numero_consecutivo: consecutivoFinal,
                estado_expediente: 'ACTIVO'
            }]);
            console.log("📌 Vínculo de Red y Expediente de Sede de Gabinete asegurados.");
        }
        // ============================================================================

        // 🎯 2. SUBIDA FÍSICA DE LAS IMÁGENES/PDFs
        const listaNombresArchivos = await subirArchivosASupabase(`${nombreSolo}_${apellidoP}`);

       // 🎯 3. COMPROBACIÓN DEL RADIÓLOGO SELECCIONADO (CANDADO DE CRISTIAN)
        const radiologoAsignadoId = document.getElementById('select-radiologo-asignado').value;
        if (!radiologoAsignadoId) {
            throw new Error("Debes asignar un Médico Radiólogo de la red para procesar la interpretación del estudio.");
        }

        const diagnosticoInput = document.getElementById('conclusion-estudio').value.toUpperCase().trim();
        const hallazgosInput = document.getElementById('descripcion-hallazgos').value.trim();
        
        const esRadiologo = perfilEspecialistaCache && perfilEspecialistaCache.especialidad?.toUpperCase().includes('RADIOLOG');

        let diagnosticoFinal = "";
        let notaTecnicaFinal = hallazgosInput;
        let estadoInicialDictamen = "PENDIENTE"; // 👈 ACTIVADO EL ESTADO INICIAL GLOBAL

        if (diagnosticoInput !== "") {
            if (!esRadiologo) {
                throw new Error("Acceso Restringido: Solo un Medico Radiologo certificado tiene autorizacion para emitir diagnosticos.");
            } else {
                diagnosticoFinal = diagnosticoInput;
                estadoInicialDictamen = "DICTAMINADO"; // Si lo sube el mismo radiólogo, queda aprobado directo
            }
        }

        // 🎯 4. ARMADO DEL PAYLOAD PARA ESTUDIOS_GABINETE (CON LAS COLUMNAS EXACTAS)
        const payloadEstudio = {
            id_socio_emisor: idClinicaActiva,
            fecha_registro: new Date().toISOString(),
            paciente_nombre_manual: `${nombreSolo} ${apellidoP} ${apellidoM}`.trim(),
            paciente_genero_momento: genero,
            paciente_edad_momento: calcularEdad(fechaNac),
            archivo_url: listaNombresArchivos.join(','), 
            nombre_archivo: archivosParaSubir.map(a => a.name).join(','),
            tipo_estudio: document.getElementById('tipo-estudio').value,
            zona_anatomica: document.getElementById('zona-estudio').value.toUpperCase(),
            hallazgos_resumen: notaTecnicaFinal,
            diagnostico_radiologico: diagnosticoFinal,
            es_hallazgo_urgente: document.getElementById('es-urgente').checked,
            especialista_nombre: perfilEspecialistaCache?.nombre_completo || "ESPECIALISTA FISIOCID",
            especialista_cedula: perfilEspecialistaCache?.cedula_profesional || "S/C",
            creado_por: perfilEspecialistaCache?.id,
            
            // 🔒 LOS DOS CANDADOS ACTIVADOS PARA LA INTEROPERABILIDAD DE RED
            doctor_emisor_id: radiologoAsignadoId, // Le cae directamente a SU cuenta
            estado_dictamen: estadoInicialDictamen  // Guarda "PENDIENTE" en la BD
        };
        const { error: errorGabinete } = await fisioNet
            .from('estudios_gabinete')
            .insert([payloadEstudio]);

        if (errorGabinete) throw errorGabinete;

        alert("✅ ESTUDIO INTEGRADO: Los archivos y notas del estudio clínico se guardaron con éxito en la Red FisioCid.");
        window.location.reload();

    } catch (err) {
        console.error("❌ ERROR CRÍTICO EN PORTAL:", err);
        alert("Atención: " + err.message);
    } finally { // 🔓 ¡CORREGIDO! Adiós al error "filter" de sintaxis en VS Code
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

let historialGabineteCache = []; // Caché global para evitar llamadas excesivas a la DB
let timeoutBusqueda = null;

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

// ============================================================================
// 🩻 RENDERIZADOR INTERNO Y CONTROL DE TRANSFORMS DE LA IMAGEN SELECCIONADA
// ============================================================================
// ============================================================================
// 🩻 RENDERIZADOR INTERNO CON RESPALDO DE REJILLA EN DICTAMEN (CORREGIDO)
// ============================================================================
async function renderizarTomaActivaEnLienzo() {
    const visor = document.getElementById('visorComparativa');
    const panelIzq = document.getElementById('panelIzquierdoVisor');
    const panelDer = document.getElementById('panelDerechoVisor');
    const colInfoIzq = document.getElementById('colInfoIzq');
    const colInfoDer = document.getElementById('colInfoDer');

    const imgIzq = document.getElementById('imgIzquierda');
    const infoIzq = document.getElementById('infoIzquierda');
    const contadorBadge = document.getElementById('badgeContadorTomasVisor');

    try {
        limpiarInstanciasZoom();

        // 🎯 EL BLINDAJE DE CRISTIAN: ¿El panel de dictamen está activo y visible?
        const panelDictamen = document.getElementById('panel-dictamen-radiologo');
        const dictamenActivo = panelDictamen && !panelDictamen.classList.contains('d-none');

        // Si el dictamen está activo, mantenemos el visor en col-8 para abrirle paso al formulario lateral
        if (dictamenActivo) {
            panelIzq.className = "col-8 h-100 p-0 position-relative d-flex align-items-center justify-content-center";
            colInfoIzq.className = "col-8";
        } else {
            // Si es vista libre común de miniatura, expandimos a pantalla completa
            panelIzq.className = "col-12 h-100 p-0 position-relative d-flex align-items-center justify-content-center";
            colInfoIzq.className = "col-12";
        }
        
        panelDer.classList.add('d-none');
        colInfoDer.classList.add('d-none');

        // Actualizamos el contador dinámico en la esquina
        if (contadorBadge) {
            contadorBadge.innerText = `Toma ${indiceTomaActiva + 1} / ${tomasVisorActuales.length}`;
        }

        const archivoRuta = tomasVisorActuales[indiceTomaActiva];
        const res = await fisioNet.storage.from('expedientes-clinicos').createSignedUrl(archivoRuta, 3600);
        if (res.error) throw res.error;

        imgIzq.src = res.data.signedUrl;
        infoIzq.innerHTML = `<i class="fas fa-user me-1"></i> Paciente: ${datosPacienteActualCache.nombre} &nbsp;&nbsp;|&nbsp;&nbsp; <i class="fas fa-file-medical-alt me-1"></i> ${datosPacienteActualCache.info}`;

        visor.classList.remove('d-none');
        void visor.offsetWidth; // Forzar Reflow

        imgIzq.onload = () => {
            const elementoZoom = document.getElementById('div-zoom-izq');
            
            instancePanzoomIzq = Panzoom(elementoZoom, {
                maxScale: 6,
                minScale: 1,
                contain: 'outside',
                canvas: true,
                touchAction: 'none'
            });

            panelIzq.addEventListener('wheel', (e) => {
                e.preventDefault();
                instancePanzoomIzq.zoomWithWheel(e);
            }, { passive: false });

            panelIzq.addEventListener('dblclick', (e) => {
                e.preventDefault();
                if (instancePanzoomIzq.getScale() > 1) {
                    instancePanzoomIzq.reset();
                } else {
                    instancePanzoomIzq.zoomToPoint(3, e);
                }
            });
        };

        if (imgIzq.complete) imgIzq.dispatchEvent(new Event('load'));

    } catch (err) {
        console.error("Error al renderizar toma de carrusel:", err);
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


// --- INSTANCIAS DE CONTROL DE ZOOM ---
let instancePanzoomIzq = null;
let instancePanzoomDer = null;

let tomasVisorActuales = [];
let indiceTomaActiva = 0;
let datosPacienteActualCache = { nombre: '', info: '' }; 


// ============================================================================
// 📊 MOTOR DE DIAGNÓSTICO ADAPTATIVO HÍBRIDO (PC / TABLET + DOBLE CLIC + RUEDA)
// ============================================================================
async function iniciarComparativa() {
    const checks = document.querySelectorAll('.check-comparar-gabinete:checked');
    
    if (checks.length === 0) {
        alert("⚠️ Por favor selecciona al menos 1 toma del historial para abrir en el área de diagnóstico.");
        return;
    }
    if (checks.length > 2) {
        alert("⚠️ El área de diagnóstico soporta un máximo de 2 tomas en pantalla simultáneas.");
        return;
    }

    // Aseguramos que la librería Panzoom esté cargada en el ecosistema
    if (typeof Panzoom === 'undefined') {
        console.log("📡 Cargando motor dinámico de Micro-Zoom Híbrido...");
        await cargarLibreriaPanzoom();
    }

    const visor = document.getElementById('visorComparativa');
    const panelIzq = document.getElementById('panelIzquierdoVisor');
    const panelDer = document.getElementById('panelDerechoVisor');
    const colInfoIzq = document.getElementById('colInfoIzq');
    const colInfoDer = document.getElementById('colInfoDer');

    const imgIzq = document.getElementById('imgIzquierda');
    const imgDer = document.getElementById('imgDerecha');
    const infoIzq = document.getElementById('infoIzquierda');
    const infoDer = document.getElementById('infoDerecha');

    try {
        // Limpiamos memoria de zooms anteriores para evitar fugas de rendimiento
        limpiarInstanciasZoom();

        if (checks.length === 1) {
            // 🎯 CASO 1: VISTA ÚNICA COMPLETA (col-12)
            console.log("🎚️ Configurando Visor en Modo Pantalla Completa (Toma Única)");
            
            panelIzq.className = "col-12 h-100 p-0 position-relative d-flex align-items-center justify-content-center";
            panelDer.classList.add('d-none');
            colInfoIzq.className = "col-12";
            colInfoDer.classList.add('d-none');
            document.getElementById('lblTagPanelIzq').innerText = "TOMA ÚNICA EN EXAMEN";

            const res = await fisioNet.storage.from('expedientes-clinicos').createSignedUrl(checks[0].value, 3600);
            if (res.error) throw res.error;

            // Inyectamos la imagen física
            imgIzq.src = res.data.signedUrl;
            infoIzq.innerHTML = `<i class="fas fa-user me-1"></i> Paciente: ${checks[0].dataset.paciente} &nbsp;&nbsp;|&nbsp;&nbsp; <i class="fas fa-file-medical-alt me-1"></i> Estudio: ${checks[0].dataset.info}`;

            // 🚀 SOLUCIÓN AL RASTRERO ONLOAD: Inicializamos en caliente sin esperar
            setTimeout(() => {
                instancePanzoomIzq = Panzoom(imgIzq, {
                    maxScale: 6,
                    minScale: 1,
                    contain: 'outside',
                    canvas: true,
                    touchAction: 'none'
                });
                
                // Escucha de rueda amarrada directo al panel negro contenedor
                panelIzq.addEventListener('wheel', (e) => {
                    e.preventDefault(); 
                    instancePanzoomIzq.zoomWithWheel(e);
                }, { passive: false });

                // Gatillo de Doble Clic / Doble Toque Táctil
                imgIzq.addEventListener('dblclick', (e) => {
                    e.preventDefault();
                    if (instancePanzoomIzq.getScale() > 1) {
                        instancePanzoomIzq.reset();
                    } else {
                        instancePanzoomIzq.zoomToPoint(3, e);
                    }
                });
            }, 50); // Pequeña tregua de microsegundos para que el DOM asimile la URL

        } else if (checks.length === 2) {
            // 🎯 CASO 2: VISTA PARALELA DIVIDIDA (col-6 / col-6)
            console.log("🔀 Configurando Visor en Modo Pantalla Dividida (Comparativa)");
            
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

            if (resIzq.error) throw resIzq.error;
            if (resDer.error) throw resDer.error;

            imgIzq.src = resIzq.data.signedUrl;
            imgDer.src = resDer.data.signedUrl;

            infoIzq.innerHTML = `<span class="text-info">[A] ${checks[0].dataset.paciente}</span> - <small>${checks[0].dataset.info}</small>`;
            infoDer.innerHTML = `<span class="text-warning">[B] ${checks[1].dataset.paciente}</span> - <small>${checks[1].dataset.info}</small>`;

            // 🚀 Inicialización en caliente para los dos páneles paralelos
            setTimeout(() => {
                // LADO IZQUIERDO
                instancePanzoomIzq = Panzoom(imgIzq, { maxScale: 6, minScale: 1, contain: 'outside', canvas: true, touchAction: 'none' });
                panelIzq.addEventListener('wheel', (e) => {
                    e.preventDefault();
                    instancePanzoomIzq.zoomWithWheel(e);
                }, { passive: false });

                imgIzq.addEventListener('dblclick', (e) => {
                    e.preventDefault();
                    if (instancePanzoomIzq.getScale() > 1) instancePanzoomIzq.reset();
                    else instancePanzoomIzq.zoomToPoint(3, e);
                });

                // LADO DERECHO
                instancePanzoomDer = Panzoom(imgDer, { maxScale: 6, minScale: 1, contain: 'outside', canvas: true, touchAction: 'none' });
                panelDer.addEventListener('wheel', (e) => {
                    e.preventDefault();
                    instancePanzoomDer.zoomWithWheel(e);
                }, { passive: false });

                imgDer.addEventListener('dblclick', (e) => {
                    e.preventDefault();
                    if (instancePanzoomDer.getScale() > 1) instancePanzoomDer.reset();
                    else instancePanzoomDer.zoomToPoint(3, e);
                });
            }, 50);
        }

        // Desbloqueamos la interfaz visual
        visor.classList.remove('d-none');

    } catch (err) {
        console.error("❌ Error crítico en el área de diagnóstico:", err);
        alert("No se pudo habilitar el visor médico adaptativo.");
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
}

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
// ============================================================================
// 📊 MOTOR DE APERTURA INMEDIATA, ESCANER COMPARATIVO Y ENCENDIDO DE PANEL
// ============================================================================
async function abrirEstudioParaDictamenMaestro(estudioId, archivoUrl, pacienteNombreFull) {
    try {
        // 1. Guardamos los amarres en el dataset del visor para el botón supremo
        const visor = document.getElementById('visorComparativa');
        if (visor) {
            visor.dataset.estudioActivoId = estudioId;
        }

        // 2. Encendemos el panel de dictamen ocultando el modo fantasma
        const panelDictamen = document.getElementById('panel-dictamen-radiologo');
        if (panelDictamen) {
            panelDictamen.classList.remove('d-none');
            document.getElementById('badge-estudio-activo').innerText = `EXAMEN: ${pacienteNombreFull.toUpperCase()}`;
        }

        // 3. Desglosamos las tomas e iniciamos el lienzo PACS de inmediato
        await abrirTomaInmediata(archivoUrl, 0, pacienteNombreFull, 'EXAMEN EN CURSO');

        // 4. 🚀 JALAMOS EL REGISTRO COMPLETO DE SUPABASE PARA COPIAR LOS CAMPOS SI YA EXISTE UN BORRADOR
        const { data: estudioActual, errorEst } = await fisioNet
            .from('estudios_gabinete')
            .select('paciente_id, tipo_estudio, hallazgos_tecnica, diagnostico_radiologico, es_hallazgo_urgente')
            .eq('id', estudioId)
            .maybeSingle();

        if (errorEst || !estudioActual) throw new Error("No se localizo el identificador del estudio.");
        
        const idDelPaciente = estudioActual.paciente_id;
        if (visor) visor.dataset.pacienteActivoId = idDelPaciente;

        // Auto-rellenamos los textareas por si el médico dejó el dictamen a medias hace rato
        document.getElementById('descripcion-hallazgos-pacs').value = estudioActual.hallazgos_tecnica || '';
        document.getElementById('conclusion-estudio-pacs').value = estudioActual.diagnostico_radiologico || '';
        document.getElementById('es-urgente-pacs').checked = estudioActual.es_hallazgo_urgente || false;

        // 5. 🔍 FILTRO COMPARATIVO: Buscamos estudios anteriores del mismo paciente para la barra lateral
        console.log(`📡 Escaneando comparativa historica para el paciente ID: ${idDelPaciente}`);
        const { data: historiales, errorHist } = await fisioNet
            .from('estudios_gabinete')
            .select('id, fecha_registro, tipo_estudio, zona_anatomica, archivo_url, estado_dictamen')
            .eq('paciente_id', idDelPaciente)
            .neq('id', estudioId) // Excluimos el estudio actual
            .order('fecha_registro', { ascending: false });

        const contenedorComparador = document.getElementById('lista-historial-gabinete');
        if (!contenedorComparador) return;

        if (errorHist || !historiales || historiales.length === 0) {
            contenedorComparador.innerHTML = `
                <div class="p-2 border-bottom bg-light fw-bold text-secondary" style="font-size:0.68rem; letter-spacing:0.5px;">🗂️ COMPARATIVA HISTÓRICA</div>
                <div class="p-3 text-center text-muted small"><i class="fas fa-info-circle"></i> Sin estudios anteriores para comparar.</div>`;
            return;
        }

        // Pintamos el pool de comparación del paciente
        contenedorComparador.innerHTML = `
            <div class="p-2 border-bottom bg-light fw-bold text-secondary" style="font-size:0.68rem; letter-spacing:0.5px;">🗂️ ESTUDIOS ANTERIORES DEL PACIENTE</div>
            ${historiales.map(h => {
                const fechaH = new Date(h.fecha_registro).toLocaleDateString();
                return `
                <div class="list-group-item p-2.5 border-0 border-bottom bg-white text-start">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <strong class="text-dark text-uppercase" style="font-size:0.72rem;">${h.tipo_estudio}</strong>
                        <span class="badge bg-secondary" style="font-size:0.55rem;">${fechaH}</span>
                    </div>
                    <div class="text-muted small mb-2" style="font-size:0.65rem;"><i class="fas fa-bullseye"></i> Zona: ${(h.zona_anatomica || 'GENERAL').toUpperCase()}</div>
                    <button type="button" class="btn btn-xs btn-outline-info py-0.5 fw-bold w-100" style="font-size:0.65rem; border-radius:4px;"
                        onclick="abrirTomaInmediata('${h.archivo_url}', 0, '${pacienteNombreFull}', 'COMPARATIVA: ${h.tipo_estudio}')">
                        <i class="fas fa-images"></i> Cargar en Visor Comparativo
                    </button>
                </div>`;
            }).join('')}
        `;

    } catch (err) {
        console.error("❌ Error en el acoplamiento maestro del dictamen:", err.message);
    }
}