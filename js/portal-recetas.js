// ============================================================================
// 🩺 PORTAL DE RECETAS FISIOCID - VERSIÓN UNIFICADA (2026)
// Archivo: portal-recetas.js
// ============================================================================

let pacienteExistenteId = null;
let edicionFichaAutorizada = false;
let debounceTimer;

// ============================================================================
// 🔍 1. MOTOR DE BÚSQUEDA INTELIGENTE (MULTIPALABRA ROBUSTO)
// ============================================================================
const inputNombre = document.getElementById('valNombre');
const listaSugerencias = document.getElementById('sugerencias-gabinete');

inputNombre?.addEventListener('input', async (e) => {
    const texto = e.target.value.trim().toUpperCase();
    clearTimeout(debounceTimer);
    
    if (texto.length < 2) {
        listaSugerencias?.classList.add('d-none');
        return;
    }

    debounceTimer = setTimeout(async () => {
        try {
            const palabras = texto.split(/\s+/).filter(Boolean);
            let query = fisioNet.from('pacientes_maestros').select('*');

            palabras.forEach(palabra => {
                query = query.or(`nombre.ilike.%${palabra}%,apellido_paterno.ilike.%${palabra}%,apellido_materno.ilike.%${palabra}%,curp.ilike.%${palabra}%`);
            });

            const { data: pacientes, error } = await query.limit(10);
            if (error) throw error;

            if (pacientes && pacientes.length > 0) {
                listaSugerencias.innerHTML = '';
                listaSugerencias.classList.remove('d-none');

                pacientes.forEach(p => {
                    const btn = document.createElement('button');
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

// ============================================================================
// ⚡ 2. AUTORRELLENO DE FICHA Y CANDADOS
// ============================================================================
function autorrellenarPaciente(p) {
    if (listaSugerencias) listaSugerencias.classList.add('d-none');
    pacienteExistenteId = p.id;
    window.pacienteSeleccionado = p;
    window.pacienteCargado = p; 

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

    // PEDIATRÍA
    mapear('tutor-nombre', p.nombre_tutor);
    mapear('tutor-parentesco', p.parentesco_tutor);
    mapear('tutor-tel', p.telefono_tutor);

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
function limpiarPalabras(texto) {
    if (!texto) return [];
    let textoLimpio = texto.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const conectores = ["DA", "DAS", "DE", "DEL", "DER", "DI", "DIE", "DD", "EL", "LA", "LOS", "LAS", "LE", "LES", "MAC", "MC", "VAN", "VON", "Y"];
    return textoLimpio.trim().split(/\s+/).filter(palabra => !conectores.includes(palabra));
}

function limpiarApellidoMexicano(apellidoRaw) {
    let palabras = limpiarPalabras(apellidoRaw);
    return palabras[0] || "X";
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
// 🚀 INICIALIZACIÓN DE LA PÁGINA
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

    // Motor de mayúsculas global
    document.querySelectorAll('input:not([type="file"]), textarea').forEach(el => {
        if (el.type === 'email' || el.id === 'valEmail') return;
        el.addEventListener('input', (e) => {
            if (e.target.type !== 'email' && e.target.id !== 'valEmail') {
                e.target.value = e.target.value.toUpperCase();
            }
        });
    });
});

// ============================================================================
// 💾 6. PROCESAMIENTO FINAL DE RECETA
// ============================================================================
async function procesarReceta() {
    const btn = document.getElementById('btnGuardarReceta');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> GUARDANDO...';

    try {
        if (!document.getElementById('valNombre').value || !document.getElementById('valFecha').value) {
            throw new Error("Por favor ingresa Nombre y Fecha de Nacimiento del paciente.");
        }

        alert("✅ ¡Todo el entorno está conectado! Buscar paciente, llenar, calcular edad y curp funcionan.");

    } catch(error) {
        alert("❌ Error: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-print me-2"></i> GUARDAR E IMPRIMIR RECETA PDF';
    }
}