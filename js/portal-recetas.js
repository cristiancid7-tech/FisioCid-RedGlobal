// ============================================================================
// 🩺 PORTAL DE RECETAS FISIOCID - VERSIÓN UNIFICADA (2026)
// Archivo: portal-recetas.js
// ============================================================================

let pacienteExistenteId = null;
let edicionFichaAutorizada = false;
let debounceTimer; 
let listaSugerencias = null; // 🌍 Declarada globalmente para evitar errores de alcance
// ============================================================================
// 🔍 1. MOTOR DE BÚSQUEDA INTELIGENTE (MULTIPALABRA Y SEGURO)
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    const inputNombre = document.getElementById('valNombre');
    // Buscamos ambos IDs posibles para evitar que falle por nombre de HTML
    const listaSugerencias = document.getElementById('sugerencias-gabinete') || document.getElementById('sugerencias-pacientes');

    if (!inputNombre) {
        console.warn("⚠️ Advertencia: No se encontró el input #valNombre en el DOM.");
        return;
    }

    inputNombre.addEventListener('input', async (e) => {
        const texto = e.target.value.trim().toUpperCase();
        clearTimeout(debounceTimer);
        
        if (texto.length < 2) {
            listaSugerencias?.classList.add('d-none');
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                // 1. Dividimos lo que escribe el usuario por espacios (Ej: "CRISTIAN CID" -> ["CRISTIAN", "CID"])
                const palabras = texto.split(/\s+/).filter(Boolean);
                
                let query = fisioNet.from('pacientes_maestros').select('*');

                // 2. Aplicamos un filtro por cada palabra en nombre, apellidos o CURP
                palabras.forEach(palabra => {
                    query = query.or(`nombre.ilike.%${palabra}%,apellido_paterno.ilike.%${palabra}%,apellido_materno.ilike.%${palabra}%,curp.ilike.%${palabra}%`);
                });

                const { data: pacientes, error } = await query.limit(10);

                if (error) throw error;

                if (pacientes && pacientes.length > 0) {
                    if (listaSugerencias) {
                        listaSugerencias.innerHTML = '';
                        listaSugerencias.classList.remove('d-none');

                        pacientes.forEach(p => {
                            const btn = document.createElement('button');
                            btn.type = 'button';
                            btn.className = 'list-group-item list-group-item-action p-2.5 text-start border-bottom';
                            
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
                            
                            // ... dentro de tu ciclo donde creas el botón de sugerencia:
btn.onclick = (event) => {
    event.preventDefault();
    
    // 🎯 OCULTAR EL MENÚ FLOTANTE AL SELECCIONAR
    if (listaSugerencias) {
        listaSugerencias.innerHTML = '';
        listaSugerencias.classList.add('d-none');
    }

    autorrellenarPaciente(p);
};
                            listaSugerencias.appendChild(btn);
                        });
                    }
                } else {
                    listaSugerencias?.classList.add('d-none');
                }
            } catch (err) {
                console.error("❌ Error en motor de búsqueda:", err.message);
            }
        }, 300);
    });
});

// ============================================================================
// ⚡ 2. AUTORRELLENO DE FICHA Y CANDADOS
// ============================================================================
function autorrellenarPaciente(p) {
    if (listaSugerencias) listaSugerencias.classList.add('d-none');
    pacienteExistenteId = p.id;
    window.pacienteSeleccionado = p;
    window.pacienteCargado = p; 

    // Función inteligente que busca por múltiples posibles IDs en tu HTML
    const mapearPorIds = (ids, valor) => {
        for (let id of ids) {
            const el = document.getElementById(id);
            if (el) {
                el.value = valor || "";
                break;
            }
        }
    };

    mapearPorIds(['valNombre', 'nombre'], p.nombre);
    mapearPorIds(['valPaterno', 'apellidoP', 'apellido_paterno'], p.apellido_paterno);
    mapearPorIds(['valMaterno', 'apellidoM', 'apellido_materno'], p.apellido_materno);
    mapearPorIds(['valFecha', 'fechaNac', 'fecha_nacimiento'], p.fecha_nacimiento);
    mapearPorIds(['genero-manual', 'genero'], p.genero);
    mapearPorIds(['tel-manual', 'telefono'], p.telefono);
    mapearPorIds(['valEmail', 'email', 'correo_electronico'], p.correo_electronico || "");

    // PEDIATRÍA
    mapearPorIds(['tutor-nombre'], p.nombre_tutor);
    mapearPorIds(['tutor-parentesco'], p.parentesco_tutor);
    mapearPorIds(['tutor-tel'], p.telefono_tutor);

    if (p.estado_nacimiento) {
        mapearPorIds(['valEstado', 'estado'], p.estado_nacimiento);
    } else if (p.curp && p.curp.length >= 18) {
        mapearPorIds(['valEstado', 'estado'], p.curp.substring(11, 13).toUpperCase());
    }

    if (p.curp && p.curp.length >= 18) {
        const c = p.curp.toUpperCase();
        mapearPorIds(['curp-parte1'], c.substring(0, 11));
        mapearPorIds(['curp-estado'], c.substring(11, 13));
        mapearPorIds(['curp-consonantes'], c.substring(13, 16));
        mapearPorIds(['curp-homo'], c.substring(16, 18));
    }

    congelarCamposIdentidad(true);
    crearBotonDesbloqueoDinamico();
    actualizarInterfazEdad();
    
    if (typeof gestionarFolioAutomatico === 'function') {
        gestionarFolioAutomatico(p.id);
    }
}

function congelarCamposIdentidad(bloquear) {
    const idsCriticos = [
        'valNombre', 'valPaterno', 'valMaterno', 'valFecha', 
        'genero-manual', 'valEstado', 'curp-parte1', 'curp-estado', 
        'curp-consonantes', 'curp-homo', 'tel-manual', 'valEmail', 
        'tutor-nombre', 'tutor-parentesco', 'tutor-tel'
    ];

    idsCriticos.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.readOnly = bloquear;
            if (el.tagName === 'SELECT') el.disabled = bloquear;
            el.style.backgroundColor = bloquear ? "#edf2f7" : "#ffffff";
            el.style.color = bloquear ? "#4a5568" : "#000000";
            el.style.cursor = bloquear ? "not-allowed" : "text";
        }
    });
}

function crearBotonDesbloqueoDinamico() {
    document.getElementById('btnDesbloquearFichaLab')?.remove();
    const contenedorCurp = document.getElementById('curp-parte1')?.closest('.col-12');
    if (!contenedorCurp) return;

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
        const esMenor = !document.getElementById('seccion-tutor')?.classList.contains('d-none');
        
        const telefonoDestino = esMenor ? (p?.telefono_tutor || document.getElementById('tutor-tel')?.value) : (p?.telefono || document.getElementById('tel-manual')?.value);
        
        if (!telefonoDestino || telefonoDestino.trim() === "") {
            alert("⚠️ Error: El paciente no cuenta con un teléfono registrado en la Ficha Maestro para el envío del código OTP.");
            return;
        }

        const tokenSeguridad = Math.floor(100000 + Math.random() * 900000);
        alert(`🛡️ PROTOCOLO DE EDICIÓN FISIOCID:\nCódigo enviado de forma segura al celular: ${telefonoDestino}\n👉 (Código de Autorización: ${tokenSeguridad})`);

        const codigoIngresado = prompt("🔒 Ingrese el código OTP de 6 dígitos enviado:");
        
        if (String(codigoIngresado) === String(tokenSeguridad)) {
            edicionFichaAutorizada = true; 
            congelarCamposIdentidad(false); 
            
            const btn = wrapper.querySelector('button');
            btn.className = "btn btn-success btn-sm fw-bold px-3 disabled";
            btn.innerHTML = '<i class="fas fa-lock-open"></i> Modo Edición Activo';
            btn.style.backgroundColor = "#48bb78";
            btn.style.color = "#ffffff";
        } else {
            alert("❌ Código incorrecto. Los datos maestros siguen blindados.");
        }
    });
}

// ============================================================================
// 🧮 3. MOTOR MATEMÁTICO CURP Y EDAD
// ============================================================================
// 1. Función para limpiar conectores y caracteres especiales
function limpiarPalabras(texto) {
    if (!texto) return [];
    // Convertimos a mayúsculas y quitamos acentos
    let textoLimpio = texto.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Conectores oficiales de RENAPO que no se toman en cuenta
    const conectores = [
        "DA", "DAS", "DE", "DEL", "DER", "DI", "DIE", "DD", "EL", "LA", 
        "LOS", "LAS", "LE", "LES", "MAC", "MC", "VAN", "VON", "Y"
    ];
    
    // Separamos por espacios y filtramos los conectores
    let palabras = textoLimpio.trim().split(/\s+/);
    return palabras.filter(palabra => !conectores.includes(palabra));
}

// 2. Función actualizada para procesar el nombre (Aplica regla de Jose/Maria)
function procesarNombreMexicano(nombreRaw) {
    let palabras = limpiarPalabras(nombreRaw);
    
    // Regla: Si hay más de un nombre y el primero es MARIA o JOSE (o abreviaturas), se ignora.
    if (palabras.length > 1 && ["MARIA", "MA.", "MA", "JOSE", "J.", "J"].includes(palabras[0])) {
        palabras.shift(); // Quita MARIA/JOSE de la lista
    }
    
    // Retorna la primera palabra válida que haya quedado (en este caso ROSARIO)
    return { nombre: palabras[0] || "X" };
}

// 3. Función actualizada para apellidos (Limpia conectores como "DE LA")
function limpiarApellidoMexicano(apellidoRaw) {
    let palabras = limpiarPalabras(apellidoRaw);
    return palabras[0] || "X"; // Toma la primera palabra válida del apellido
}


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
    
    // 🎯 CORRECCIÓN: Llamamos a la función inteligente que elimina "MARIA/JOSE" y toma el nombre real (ROSARIO)
    const nomObj = procesarNombreMexicano(nomRaw);
    const nom = nomObj.nombre.toUpperCase();
    
    if (nom.length >= 2 && pat.length >= 2 && fec && est.length === 2) {
        const l1 = pat[0] || ""; 
        const l2 = pat.slice(1).match(/[AEIOU]/)?.[0] || "X";
        const l3 = mat[0] || "X"; 
        const l4 = nom[0] || ""; // Ahora sí tomará la 'R' de Rosario correctamente
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
        const p4 = document.getElementById('curp-homo'); 
        
        const homoclaveGenerada = curpCompleta.substring(16, 18);
        if (p4) p4.value = homoclaveGenerada;

        // 🎯 DISPARADOR DIRECTO: Si la homoclave está lista, generamos el folio de inmediato
        if (homoclaveGenerada.length === 2 && !pacienteExistenteId) {
            if (typeof gestionarFolioAutomatico === 'function') {
                gestionarFolioAutomatico(null);
            }
        }
    }
}

function saltarAHomoclave(input) {
    input.value = input.value.toUpperCase();
    if (input.value.length === 2) document.getElementById('curp-homo')?.focus();
}

function calcularEdad(fecha) {
    if (!fecha) return "N/A";
    const hoy = new Date();
    const cumple = new Date(fecha);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const diffM = hoy.getMonth() - cumple.getMonth();
    if (diffM < 0 || (diffM === 0 && hoy.getDate() < cumple.getDate())) edad--;
    return edad;
}

function actualizarInterfazEdad() {
    const fechaNac = document.getElementById('valFecha')?.value;
    if (!fechaNac) return;
    const anosVal = parseInt(calcularEdad(fechaNac)) || 0;
    
    const seccionTutor = document.getElementById('seccion-tutor');
    const bloqueAdulto = document.getElementById('bloque-contacto-adulto');

    if (anosVal < 18) {
        seccionTutor?.classList.remove('d-none');
        bloqueAdulto?.classList.add('d-none');
    } else {
        seccionTutor?.classList.add('d-none');
        bloqueAdulto?.classList.remove('d-none');
    }
}

window.procesarCURP = procesarCurp;

// ============================================================================
// 📁 4. GESTOR DE FOLIOS DINÁMICO Y LIMPIO
// ============================================================================
async function gestionarFolioAutomatico(idPacienteExistente = null) {
    const idClinica = localStorage.getItem('id_clinica_activa');
    const inputFolio = document.getElementById('inputFolioExpediente');
    const statusFolio = document.getElementById('statusFolio');

    if (!idClinica) {
        if (statusFolio) statusFolio.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ERROR: CLÍNICA NO ACTIVA';
        return;
    }

    try {
        if (idPacienteExistente) {
            const { data: exp, error } = await fisioNet
                .from('expedientes_clinicos')
                .select('folio_personalizado')
                .eq('id_paciente', idPacienteExistente)
                .eq('id_clinica', idClinica)
                .maybeSingle();

            if (exp) {
                inputFolio.value = exp.folio_personalizado;
                if (statusFolio) statusFolio.innerHTML = '<i class="fas fa-check-circle text-success"></i> EXPEDIENTE LOCALIZADO';
                return { folio: exp.folio_personalizado, nuevo: false };
            }
        }

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

        inputFolio.value = nuevoFolio;
        if (statusFolio) statusFolio.innerHTML = '<i class="fas fa-magic text-primary"></i> EXPEDIENTE CONSECUTIVO ASIGNADO';
        
        return { folio: nuevoFolio, numero_consecutivo: siguiente, nuevo: true };

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN FOLIOS:", error);
        if (statusFolio) statusFolio.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ERROR DE CONEXIÓN';
    }
}

// ============================================================================
// 💊 5. MOTOR DEL RECETARIO (Medicamentos e IMC)
// ============================================================================
function calcularIMC() {
    const peso = parseFloat(document.getElementById('valPeso')?.value);
    const talla = parseFloat(document.getElementById('valTalla')?.value);
    const inputIMC = document.getElementById('valIMC');
    
    if (inputIMC) {
        if (peso > 0 && talla > 0) {
            const imc = (peso / (talla * talla)).toFixed(2);
            inputIMC.value = imc;
            if (imc < 18.5) inputIMC.style.color = '#3b82f6';
            else if (imc >= 18.5 && imc < 24.9) inputIMC.style.color = '#10b981';
            else if (imc >= 25 && imc < 29.9) inputIMC.style.color = '#f59e0b';
            else inputIMC.style.color = '#ef4444';
        } else { 
            inputIMC.value = ''; 
        }
    }
}

let contadorMeds = 0;
function agregarFilaMedicamento() {
    contadorMeds++;
    const contenedor = document.getElementById('contenedor-medicamentos');
    if (!contenedor) return;

    const fila = document.createElement('div');
    fila.className = 'fila-medicamento row g-2 align-items-end position-relative mb-3 animate__animated animate__fadeIn';
    fila.id = `med-row-${contadorMeds}`;
    
    fila.innerHTML = `
        <div class="col-md-4">
            <label class="label-fisiocid small">Medicamento / Presentación</label>
            <div class="input-group">
                <span class="input-group-text bg-white border-end-0"><i class="fas fa-pills text-primary"></i></span>
                <input type="text" class="form-control form-fisiocid border-start-0 text-uppercase fw-bold med-nombre" placeholder="Ej. PARACETAMOL 500MG">
            </div>
        </div>
        <div class="col-md-2">
            <label class="label-fisiocid small">Dosis</label>
            <input type="text" class="form-control form-fisiocid text-uppercase med-dosis" placeholder="Ej. 1 TABLETA">
        </div>
        <div class="col-md-3">
            <label class="label-fisiocid small">Frecuencia</label>
            <input type="text" class="form-control form-fisiocid text-uppercase med-frecuencia" placeholder="Ej. CADA 8 HORAS">
        </div>
        <div class="col-md-2">
            <label class="label-fisiocid small">Duración</label>
            <input type="text" class="form-control form-fisiocid text-uppercase med-duracion" placeholder="Ej. POR 5 DÍAS">
        </div>
        <div class="col-md-1 text-center">
            <button type="button" class="btn btn-outline-danger w-100" style="border-radius: 8px; padding: 12px;" onclick="eliminarFila(${contadorMeds})" title="Quitar medicamento">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;
    contenedor.appendChild(fila);
}

window.eliminarFila = function(id) {
    const fila = document.getElementById(`med-row-${id}`);
    if(fila) {
        fila.classList.remove('animate__fadeIn');
        fila.classList.add('animate__fadeOut');
        setTimeout(() => fila.remove(), 300);
    }
};

// ============================================================================
// 🚀 INICIALIZACIÓN DE LA PÁGINA (Sin el bug del cursor)
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    agregarFilaMedicamento();
    
    // Estado inicial limpio del folio
    const inputFolio = document.getElementById('inputFolioExpediente');
    const statusFolio = document.getElementById('statusFolio');
    if (inputFolio) inputFolio.value = '';
    if (statusFolio) statusFolio.innerHTML = '<i class="fas fa-info-circle text-muted"></i> INGRESE LOS DATOS Y HOMOCLAVE PARA ASIGNAR EXPEDIENTE';

    // 🛡️ Único escuchador limpio para el input de homoclave
    const inputHomo = document.getElementById('curp-homo');
    if (inputHomo) {
        inputHomo.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
            const homoVal = e.target.value.trim();

            if (homoVal.length === 2 && !pacienteExistenteId) {
                if (typeof gestionarFolioAutomatico === 'function') {
                    gestionarFolioAutomatico(null);
                }
            } else if (homoVal.length < 2 && !pacienteExistenteId) {
                if (inputFolio) inputFolio.value = '';
                if (statusFolio) statusFolio.innerHTML = '<i class="fas fa-exclamation-circle text-warning"></i> INGRESE LA HOMOCLAVE PARA ASIGNAR EXPEDIENTE';
            }
        });
    }

    // Nota: Eliminamos el bloque global de mayúsculas por JS 
    // para permitir escribir puntos, decimales y evitar que el cursor brinque al inicio.
});

// ============================================================================
// 💾 6. PROCESAMIENTO, GUARDADO Y GENERACIÓN DE PDF DE RECETA (Con flujo de Espera)
// ============================================================================
async function procesarReceta() {
    const btn = document.getElementById('btnGuardarReceta');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> GUARDANDO Y GENERANDO PDF...';

    try {
        if (!pacienteExistenteId) {
            throw new Error("Por favor busca y selecciona un paciente registrado antes de guardar la receta.");
        }

        const diagnostico = document.getElementById('diagnostico-receta')?.value.trim() || '';
        const indicaciones = document.getElementById('indicacionesExtras')?.value.trim() || '';
        const folio = document.getElementById('inputFolioExpediente')?.value.trim() || '';
        const idClinica = localStorage.getItem('id_clinica_activa');

        // 1. Obtener usuario autenticado actual
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) throw new Error("Sesión expirada. Por favor vuelve a ingresar.");

        // 2. Recopilar medicamentos de la tabla dinámica
        const filasMeds = document.querySelectorAll('.fila-medicamento');
        const listaMedicamentos = [];
        
        filasMeds.forEach(fila => {
            const nombre = fila.querySelector('.med-nombre')?.value.trim() || '';
            const dosis = fila.querySelector('.med-dosis')?.value.trim() || '';
            const frecuencia = fila.querySelector('.med-frecuencia')?.value.trim() || '';
            const duracion = fila.querySelector('.med-duracion')?.value.trim() || '';
            
            if (nombre) {
                listaMedicamentos.push({ nombre, dosis, frecuencia, duracion });
            }
        });

        if (listaMedicamentos.length === 0) {
            throw new Error("Debes agregar al menos un medicamento a la receta.");
        }

        // 3. Signos vitales y somatometría
        const sistolica = parseInt(document.getElementById('valSistolica')?.value) || null;
        const diastolica = parseInt(document.getElementById('valDiastolica')?.value) || null;
        const frecuencia_cardiaca = parseInt(document.getElementById('valFC')?.value) || null;
        const frecuencia_respiratoria = parseInt(document.getElementById('valFR')?.value) || null;
        const temperatura = parseFloat(document.getElementById('valTemp')?.value) || null;
        const spo2 = parseInt(document.getElementById('valSpO2')?.value) || null;
        const peso = parseFloat(document.getElementById('valPeso')?.value) || null;
        const talla = parseFloat(document.getElementById('valTalla')?.value) || null;
        const imc = parseFloat(document.getElementById('valIMC')?.value) || null;

        // 4. LÓGICA INTELIGENTE DE GUARDADO (UPDATE vs INSERT)
        if (window.recetaPendienteVinculadaId) {
            // 🚀 CASO A: Viene de la Sala de Espera. Actualizamos el registro existente.
            const { error: errUpdate } = await fisioNet
                .from('recetas_medicas')
                .update({
                    diagnostico: diagnostico,
                    indicaciones_generales: indicaciones,
                    medicamentos: listaMedicamentos,
                    estado_nota: 'PENDIENTE', // Sale de la sala de espera
                    sistolica,
                    diastolica,
                    frecuencia_cardiaca,
                    frecuencia_respiratoria,
                    temperatura,
                    spo2,
                    peso,
                    talla,
                    imc
                })
                .eq('id', window.recetaPendienteVinculadaId);

            if (errUpdate) throw errUpdate;
            console.log("✅ Cita en espera atendida PENDIENTE para nota clinica.");

        } else {
            // 🚀 CASO B: Receta creada desde cero por el doctor. Insertamos un registro nuevo.
            const payloadNuevo = {
                id_paciente: pacienteExistenteId,
                id_clinica: idClinica,
                medico_id: user.id,
                folio_expediente: folio,
                diagnostico: diagnostico,
                indicaciones_generales: indicaciones,
                estado_nota: 'COMPLETADO', // O 'PENDIENTE' según prefieras para recetas directas
                sistolica,
                diastolica,
                frecuencia_cardiaca,
                frecuencia_respiratoria,
                temperatura,
                spo2,
                peso,
                talla,
                imc,
                medicamentos: listaMedicamentos
            };

            const { error: errInsert } = await fisioNet
                .from('recetas_medicas')
                .insert([payloadNuevo]);

            if (errInsert) throw errInsert;
        }

        // 5. Armar Nombre Completo y Edad para el PDF
        const nombreVal = document.getElementById('valNombre')?.value.trim() || '';
        const paternoVal = document.getElementById('valPaterno')?.value.trim() || '';
        const maternoVal = document.getElementById('valMaterno')?.value.trim() || '';
        const fechaNacVal = document.getElementById('valFecha')?.value || '';

        const nombreCompleto = `${nombreVal} ${paternoVal} ${maternoVal}`.trim() || window.pacienteSeleccionado?.nombre || "PACIENTE";
        const edadPaciente = calcularEdad(fechaNacVal);
        const pacienteTextoPDF = edadPaciente !== "N/A" ? `${nombreCompleto}  (${edadPaciente} AÑOS)` : nombreCompleto;

        // 6. Construir texto limpio del plan de tratamiento para el PDF
        let textoMedicamentosParaPDF = "PRESCRIPCIÓN MÉDICA:\n\n";
        listaMedicamentos.forEach((m, index) => {
            textoMedicamentosParaPDF += `${index + 1}. ${m.nombre}\n   Dosis: ${m.dosis || 'N/A'} | Frecuencia: ${m.frecuencia || 'N/A'} | Duración: ${m.duracion || 'N/A'}\n\n`;
        });

        if (indicaciones) {
            textoMedicamentosParaPDF += `INDICACIONES GENERALES:\n${indicaciones}`;
        }

        const datosParaPDF = {
            nombre_paciente: pacienteTextoPDF,
            fecha_nota: new Date().toISOString(),
            ta_sistolica: sistolica,
            ta_diastolica: diastolica,
            frecuencia_cardiaca: frecuencia_cardiaca,
            frecuencia_respiratoria: frecuencia_respiratoria,
            temperatura: temperatura,
            spo2: spo2,
            peso: peso,
            eva: 0,
            diagnostico_principal: diagnostico,
            plan_tratamiento: textoMedicamentosParaPDF
        };

        // 7. Generación del PDF y limpieza de variable global
        if (typeof window.generarPDF === 'function') {
            await window.generarPDF(datosParaPDF);
            window.recetaPendienteVinculadaId = null; // Limpiamos la bandera
            alert("✅ ¡Receta guardada y PDF generado con éxito!");
        } else {
            alert("⚠️ Receta guardada en base de datos, pero el módulo de PDF no está vinculado.");
        }

        // Redirigir o limpiar pantalla tras finalizar
        window.location.href = 'lista-pacientes.html';

    } catch (error) {
        console.error("❌ Error al procesar receta:", error);
        alert("❌ Error: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-print me-2"></i> GUARDAR E IMPRIMIR RECETA PDF';
    }
}


// ============================================================================
// 📜 CARGA DE HISTORIAL GABINETE (BANDEJA UNIVERSAL DE RADIOLOGÍA)
// ============================================================================
async function cargarHistorialPersonal() {
    const contenedor = document.getElementById('lista-historial-gabinete');
    if (!contenedor) return;

    try {
        contenedor.innerHTML = `
            <div class="p-4 text-center text-muted">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                Cargando bandeja de estudios radiológicos...
            </div>`;

        // 1. Obtener la sesión activa de Supabase Auth
        const { data: { user }, error: authErr } = await fisioNet.auth.getUser();
        if (authErr || !user) {
            console.error("❌ Usuario no autenticado.");
            contenedor.innerHTML = '<div class="p-4 text-center text-warning small">Sesión no detectada.</div>';
            return;
        }

        const idClinicaActiva = localStorage.getItem('id_clinica_activa');

        // 2. Consultar perfil profesional para conocer la especialidad del usuario
        const { data: perfil } = await fisioNet
            .from('perfiles_profesionales')
            .select('especialidad')
            .eq('id', user.id)
            .maybeSingle();

        const especialidad = (perfil?.especialidad || '').toUpperCase();
        const esRadiologo = especialidad.includes('RADIOLOG');

        console.group("📡 CONSULTA DE HISTORIAL GABINETE");
        //console.log("👤 Usuario ID:", user.id);
        //console.log("🎓 Especialidad:", especialidad || 'STAFF');
        //console.log("🏥 Clínica Activa:", idClinicaActiva);

        let query = fisioNet.from('estudios_gabinete').select(`
            *,
            pacientes_maestros:paciente_id (
                fecha_nacimiento,
                apellido_paterno,
                apellido_materno,
                curp
            )
        `);

        // 🎯 LÓGICA DE FILTRADO SEPARADA:
        if (esRadiologo) {
            // BANDEJA GLOBAL DEL RADIÓLOGO: Trae TODO estudio donde esté asignada como firmante,
            // emisor o creador, independientemente de qué sede o clínica externa lo haya subido.
            //console.log("🟢 Modo: Bandeja de Dictamen Radiológico Activa (Universal)");
            query = query.or(`id_radiologo_firmante.eq.${user.id},doctor_emisor_id.eq.${user.id},creado_por.eq.${user.id}`);
        } else {
            // BANDEJA DE STAFF CLINICO: Trae los estudios de la sede activa
            //console.log("🔵 Modo: Staff de Clínica Local");
            if (idClinicaActiva && idClinicaActiva !== "null") {
                query = query.or(`id_socio_emisor.eq.${idClinicaActiva},creado_por.eq.${user.id}`);
            } else {
                query = query.eq('creado_por', user.id);
            }
        }

        // 3. Ejecutar ordenado por fecha descendente (Los más recientes primero)
        const { data: estudios, error } = await query
            .order('fecha_registro', { ascending: false })
            .limit(50);

        if (error) throw error;

        //console.log(`✅ Estudios recuperados (${estudios?.length || 0}):`, estudios);
        console.groupEnd();

        historialGabineteCache = estudios ? estudios.map(est => ({
            ...est,
            fecha_nacimiento: est.pacientes_maestros?.fecha_nacimiento || null,
            apellido_paterno: est.pacientes_maestros?.apellido_paterno || "",
            apellido_materno: est.pacientes_maestros?.apellido_materno || "",
            curp: est.pacientes_maestros?.curp || "N/A"
        })) : [];

        renderizarListaHistorialGabinete(historialGabineteCache);

    } catch (err) {
        console.error("❌ Error en cargarHistorialPersonal:", err);
        contenedor.innerHTML = `<div class="p-4 text-center text-danger small">
            <i class="fas fa-exclamation-triangle"></i> Error al recuperar historial: ${err.message}
        </div>`;
    }
}

// ============================================================================
// ⏳ GUARDAR PACIENTE EN SALA DE ESPERA (RECEPCIÓN / TRIAGE)
// ============================================================================
async function guardarEnEspera() {
    const btn = document.getElementById('btnGuardarEspera');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> GUARDANDO EN ESPERA...';
    }

    try {
        if (!pacienteExistenteId) {
            throw new Error("Por favor busca y selecciona un paciente registrado antes de enviarlo a espera.");
        }

        const diagnostico = document.getElementById('diagnostico-receta')?.value.trim() || '';
        const indicaciones = document.getElementById('indicacionesExtras')?.value.trim() || '';
        const folio = document.getElementById('inputFolioExpediente')?.value.trim() || '';
        const idClinica = localStorage.getItem('id_clinica_activa');

        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) throw new Error("Sesión expirada. Por favor vuelve a ingresar.");

        // Recopilar medicamentos (si la recepcionista ya los anotó, o dejar vacío)
        const filasMeds = document.querySelectorAll('.fila-medicamento');
        const listaMedicamentos = [];
        filasMeds.forEach(fila => {
            const nombre = fila.querySelector('.med-nombre')?.value.trim() || '';
            const dosis = fila.querySelector('.med-dosis')?.value.trim() || '';
            const frecuencia = fila.querySelector('.med-frecuencia')?.value.trim() || '';
            const duracion = fila.querySelector('.med-duracion')?.value.trim() || '';
            if (nombre) {
                listaMedicamentos.push({ nombre, dosis, frecuencia, duracion });
            }
        });

        // Somatometría completa capturada en recepción
        const sistolica = parseInt(document.getElementById('valSistolica')?.value) || null;
        const diastolica = parseInt(document.getElementById('valDiastolica')?.value) || null;
        const frecuencia_cardiaca = parseInt(document.getElementById('valFC')?.value) || null;
        const frecuencia_respiratoria = parseInt(document.getElementById('valFR')?.value) || null;
        const temperatura = parseFloat(document.getElementById('valTemp')?.value) || null;
        const spo2 = parseInt(document.getElementById('valSpO2')?.value) || null;
        const peso = parseFloat(document.getElementById('valPeso')?.value) || null;
        const talla = parseFloat(document.getElementById('valTalla')?.value) || null;
        const imc = parseFloat(document.getElementById('valIMC')?.value) || null;

        const payloadEspera = {
            id_paciente: pacienteExistenteId,
            id_clinica: idClinica,
            medico_id: user.id,
            folio_expediente: folio,
            diagnostico: diagnostico,
            indicaciones_generales: indicaciones,
            estado_nota: 'ESPERA', // 🎯 ESTATUS CLAVE PARA SALA DE ESPERA
            sistolica,
            diastolica,
            frecuencia_cardiaca,
            frecuencia_respiratoria,
            temperatura,
            spo2,
            peso,
            talla,
            imc,
            medicamentos: listaMedicamentos
        };

        const { error } = await fisioNet
            .from('recetas_medicas')
            .insert([payloadEspera]);

        if (error) throw error;

        alert("✅ ¡Paciente enviado a la Sala de Espera con éxito! El doctor ya puede consultarlo.");
        
        // Limpiamos o redirigimos según prefieras
        location.reload();

    } catch (error) {
        console.error("❌ Error al enviar a espera:", error);
        alert("❌ Error: " + error.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-clock me-2"></i> GUARDAR EN ESPERA';
        }
    }
}

// ============================================================================
// 👥 CONSULTAR Y MOSTRAR CITAS EN ESPERA PARA EL DOCTOR (CORREGIDO)
// ============================================================================
async function abrirModalCitasEnEspera() {
    const idClinica = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');
    if (!idClinica) {
        alert("⚠️ No hay una clínica activa seleccionada.");
        return;
    }

    try {
        console.log("🔍 Consultando sala de espera para clínica:", idClinica);

        // Consultamos registros con estatus ESPERA ordenados por fecha_creacion
        const { data: enEspera, error } = await fisioNet
            .from('recetas_medicas')
            .select(`
                *,
                pacientes_maestros:id_paciente (
                    id,
                    nombre,
                    apellido_paterno,
                    apellido_materno,
                    fecha_nacimiento,
                    curp,
                    telefono
                )
            `)
            .eq('id_clinica', idClinica)
            .eq('estado_nota', 'ESPERA')
            .order('fecha_creacion', { ascending: false }); // 🎯 CAMBIO CLAVE AQUÍ

        if (error) {
            console.error("❌ Error de Supabase en Citas en Espera:", error.message);
            throw error;
        }

        if (!enEspera || enEspera.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'Sala de Espera Vacía',
                text: 'No hay pacientes en espera en este momento.',
                confirmButtonColor: '#2563eb'
            });
            return;
        }

        // Construimos el HTML interactivo para el listado
        let htmlLista = `
            <div style="text-align: left; max-height: 400px; overflow-y: auto;">
                <p class="text-muted small mb-3">Selecciona un paciente para cargar sus signos vitales y datos al consultorio:</p>
                <div class="list-group">
        `;

        enEspera.forEach(item => {
            const p = item.pacientes_maestros || {};
            const nombreCompleto = `${p.nombre || ''} ${p.apellido_paterno || ''} ${p.apellido_materno || ''}`.trim() || "PACIENTE SIN NOMBRE";
            
            // Usamos fecha_creacion para mostrar la hora de llegada
            const horaLlegada = item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente';
            
            htmlLista += `
                <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3 mb-2 border rounded shadow-sm"
                        onclick='cargarPacienteDesdeEspera(${JSON.stringify(item)})' style="border-left: 4px solid #f59e0b !important; cursor: pointer;">
                    <div>
                        <h6 class="mb-1 fw-bold text-dark text-uppercase">${nombreCompleto}</h6>
                        <small class="text-muted">
                            <i class="fas fa-stethoscope me-1 text-primary"></i> T.A: ${item.sistolica || '--'}/${item.diastolica || '--'} | 
                            Peso: ${item.peso || '--'} kg | Temp: ${item.temperatura || '--'}°C
                        </small>
                    </div>
                    <span class="badge bg-warning text-dark rounded-pill p-2">🕒 ${horaLlegada}</span>
                </button>
            `;
        });

        htmlLista += `</div></div>`;

        Swal.fire({
            title: '👥 PACIENTES EN ESPERA',
            html: htmlLista,
            showConfirmButton: false,
            showCloseButton: true,
            width: '550px'
        });

    } catch (err) {
        console.error("❌ Error detallado al cargar citas en espera:", err);
        alert("Hubo un error al consultar la sala de espera: " + (err.message || err));
    }
}

// Función que toma el objeto en espera y lo inyecta en los inputs de la pantalla
function cargarPacienteDesdeEspera(item) {
    Swal.close();
    
    // 1. Asignamos el ID del paciente y la receta pendiente
    pacienteExistenteId = item.id_paciente;
    window.recetaPendienteVinculadaId = item.id; 

    // 2. Rellenamos datos generales si tenemos el objeto de paciente maestro
    if (item.pacientes_maestros) {
        const p = item.pacientes_maestros;
        const ponerVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
        
        ponerVal('valNombre', p.nombre);
        ponerVal('valPaterno', p.apellido_paterno);
        ponerVal('valMaterno', p.apellido_materno);
        ponerVal('valFecha', p.fecha_nacimiento);
    }

    // 3. Rellenamos la somatometría capturada por la recepcionista
    const ponerValNum = (id, val) => { const el = document.getElementById(id); if(el && val !== null) el.value = val; };
    
    ponerValNum('valSistolica', item.sistolica);
    ponerValNum('valDiastolica', item.diastolica);
    ponerValNum('valFC', item.frecuencia_cardiaca);
    ponerValNum('valFR', item.frecuencia_respiratoria);
    ponerValNum('valTemp', item.temperatura);
    ponerValNum('valSpO2', item.spo2);
    ponerValNum('valPeso', item.peso);
    ponerValNum('valTalla', item.talla);

    if (typeof calcularIMC === 'function') calcularIMC();

    // 4. Rellenar diagnóstico preliminar o indicaciones si las hubo
    const diagEl = document.getElementById('diagnostico-receta');
    if (diagEl && item.diagnostico) diagEl.value = item.diagnostico;

    const indEl = document.getElementById('indicacionesExtras');
    if (indEl && item.indicaciones_generales) indEl.value = item.indicaciones_generales;

    console.log("⚡ Datos de sala de espera cargados correctamente al consultorio.");
}


// ============================================================================
// 👥 CARGAR PACIENTE DESDE LA SALA DE ESPERA (CORREGIDO Y COMPLETO)
// ============================================================================
async function cargarPacienteDesdeEspera(item) {
    Swal.close();
    
    // Vinculamos el ID de la receta en espera para actualizarla al guardar
    window.recetaPendienteVinculadaId = item.id; 

    try {
        // 1. Consultamos el perfil completo del paciente maestro directamente por su ID
        const { data: paciente, error } = await fisioNet
            .from('pacientes_maestros')
            .select('*')
            .eq('id', item.id_paciente)
            .single();

        if (error) throw error;

        // 2. Usamos tu función existente que ya mapea, congela y formatea todos los datos básicos
        if (paciente && typeof autorrellenarPaciente === 'function') {
            autorrellenarPaciente(paciente);
        } else {
            console.warn("⚠️ No se encontró la función autorrellenarPaciente en el ámbito global.");
        }

    } catch (err) {
        console.error("❌ Error al recuperar los datos maestros del paciente:", err);
        alert("No se pudieron cargar los datos de identidad del paciente.");
    }

    // 3. Rellenamos la somatometría completa capturada por la recepcionista en recepción
    const ponerValNum = (id, val) => { 
        const el = document.getElementById(id); 
        if (el && val !== null && val !== undefined) el.value = val; 
    };
    
    ponerValNum('valSistolica', item.sistolica);
    ponerValNum('valDiastolica', item.diastolica);
    ponerValNum('valFC', item.frecuencia_cardiaca);
    ponerValNum('valFR', item.frecuencia_respiratoria);
    ponerValNum('valTemp', item.temperatura);
    ponerValNum('valSpO2', item.spo2);
    ponerValNum('valPeso', item.peso);
    ponerValNum('valTalla', item.talla);

    // Disparamos el cálculo del IMC automáticamente
    if (typeof calcularIMC === 'function') {
        calcularIMC();
    }

    // 4. Rellenar diagnóstico preliminar o indicaciones generales si la recepcionista los anotó
    const diagEl = document.getElementById('diagnostico-receta');
    if (diagEl && item.diagnostico) diagEl.value = item.diagnostico;

    const indEl = document.getElementById('indicacionesExtras');
    if (indEl && item.indicaciones_generales) indEl.value = item.indicaciones_generales;

    console.log("⚡ Datos de identidad y somatometría cargados con éxito al consultorio.");
}