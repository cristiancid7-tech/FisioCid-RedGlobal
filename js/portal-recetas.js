// ============================================================================
// 🩺 PORTAL DE RECETAS FISIOCID - VERSIÓN UNIFICADA Y OPTIMIZADA (2026)
// Archivo: portal-recetas.js
// ============================================================================
// 🌍 ESTADO GLOBAL Y CACHÉ
let historialGabineteCache = [];
let pacienteExistenteId = null;
let edicionFichaAutorizada = false;
let debounceTimer; 
let listaSugerencias = null;
let tutorExpressExistenteId = null;
let solicitudOTPActivaId = null;
let fechaOtpStr = null;
let coleccionEvidenciasPaciente = [];

// ============================================================================
// 🚀 1. INICIALIZACIÓN Y ESCUDO ANTI-CAJITAS PASMADAS
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🩺 Portal de Recetas Iniciando Motores...");

    // 🌟 Banner Guía para el especialista sobre el uso de 0000000000
    mostrarAnuncioGuiaTelefono();

    listaSugerencias = document.getElementById('sugerencias-gabinete') || document.getElementById('sugerencias-pacientes');

    // 1. Mayúsculas Automáticas Globales (menos correos)
    document.addEventListener('input', (e) => {
        const el = e.target;
        if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && 
            el.type !== 'email' && el.type !== 'password' && el.id !== 'valEmail' && el.id !== 'correo-tutor' && el.id !== 'tutExpEmail') {
            el.value = el.value.toUpperCase();
        }
    });

    // 2. Búsqueda de Pacientes y CIE10
    configurarBuscadorPaciente();
    configurarBuscadorCIE10();   

    // 3. Escuchas dinámicas para CURP y Edad
    const inputsCurp = ['valNombre', 'valPaterno', 'valMaterno', 'valFecha', 'genero-manual', 'valEstado'];
    inputsCurp.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const tipoEvento = (el.tagName === 'SELECT' || el.type === 'date') ? 'change' : 'input';
            el.addEventListener(tipoEvento, () => {
                if (id === 'valFecha') actualizarInterfazEdad();
                procesarCurp(); 
            });
        }
    });

    // 4. Interceptor desde Dashboard
    const pacientePrecargado = localStorage.getItem('paciente_precargado');
    if (pacientePrecargado) {
        try {
            const pacienteObj = JSON.parse(pacientePrecargado);
            autorrellenarPaciente(pacienteObj);
            localStorage.removeItem('paciente_precargado');
            console.log("✅ Paciente precargado importado desde Dashboard");
        } catch(err) {
            console.error("❌ Error al leer paciente precargado:", err);
            localStorage.removeItem('paciente_precargado');
        }
    }

    // 5. Agregar primer medicamento por defecto
    const contenedorMeds = document.getElementById('contenedor-medicamentos');
    if (contenedorMeds && contenedorMeds.children.length === 0) {
        agregarFilaMedicamento();
    }

    // 6. Estado inicial del folio
    const inputFolio = document.getElementById('inputFolioExpediente');
    const statusFolio = document.getElementById('statusFolio');
    if (inputFolio) inputFolio.value = '';
    if (statusFolio) statusFolio.innerHTML = '<i class="fas fa-info-circle text-muted"></i> INGRESE LOS DATOS O CURP PARA ASIGNAR EXPEDIENTE';

    // 7. Escucha unificada de Homoclave manual
    const inputHomo = document.getElementById('curp-homo');
    if (inputHomo) {
        inputHomo.addEventListener('input', async (e) => {
            e.target.value = e.target.value.toUpperCase();
            const homoVal = e.target.value.trim();

            if (homoVal.length === 2 && !pacienteExistenteId) {
                const p1 = document.getElementById('curp-parte1')?.value || '';
                const p2 = document.getElementById('curp-estado')?.value || '';
                const p3 = document.getElementById('curp-consonantes')?.value || '';
                const curpCompleta = `${p1}${p2}${p3}${homoVal}`.toUpperCase();

                if (curpCompleta.length === 18) {
                    await verificarPacienteExistentePorCurp(curpCompleta);
                } else if (typeof gestionarFolioAutomatico === 'function') {
                    gestionarFolioAutomatico(null);
                }
            } else if (homoVal.length < 2 && !pacienteExistenteId) {
                if (inputFolio) inputFolio.value = '';
                if (statusFolio) statusFolio.innerHTML = '<i class="fas fa-exclamation-circle text-warning"></i> INGRESE LA HOMOCLAVE PARA ASIGNAR EXPEDIENTE';
            }
        });
    }

    // 🧹 8. ESCUDO UNIFICADO ANTI-CAJITAS PASMADAS
    document.addEventListener('click', (e) => {
        const listasFlotantes = document.querySelectorAll('.list-group.position-absolute');
        listasFlotantes.forEach(lista => {
            const inputAsociado = lista.parentElement?.querySelector('input');
            if (!lista.contains(e.target) && (!inputAsociado || !inputAsociado.contains(e.target))) {
                lista.classList.add('d-none');
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Tab') {
            document.querySelectorAll('.list-group.position-absolute').forEach(el => {
                el.classList.add('d-none');
            });
        }
    });

    document.addEventListener('focusout', () => {
        setTimeout(() => {
            const elementoActivo = document.activeElement;
            document.querySelectorAll('.list-group.position-absolute').forEach(lista => {
                if (!lista.contains(elementoActivo)) {
                    lista.classList.add('d-none');
                }
            });
        }, 150);
    });
});

// ============================================================================
// 📢 ANUNCIO GUÍA ELEGANTE PARA EL ESPECIALISTA
// ============================================================================
function mostrarAnuncioGuiaTelefono() {
    if (sessionStorage.getItem('anuncio_contingencia_visto')) return;

    const banner = document.createElement('div');
    banner.id = 'bannerGuiaFisioCid';
    banner.className = 'animate__animated animate__fadeInDown';
    banner.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 380px;
        background: #1e293b;
        color: #ffffff;
        border-left: 5px solid #22c55e;
        border-radius: 12px;
        padding: 14px 18px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    `;

    banner.innerHTML = `
        <div class="d-flex align-items-start justify-content-between gap-2">
            <div class="d-flex align-items-center gap-2">
                <i class="fas fa-mobile-alt text-success fs-4"></i>
                <div>
                    <h6 class="mb-0 fw-bold" style="font-size: 0.9rem; color: #f8fafc;">💡 ¿Paciente sin Teléfono?</h6>
                    <p class="mb-0" style="font-size: 0.78rem; color: #cbd5e1; margin-top: 2px;">
                        Si tu paciente no trae celular, ingresa <strong class="text-warning">0000000000</strong> para habilitar el registro presencial de emergencia.
                    </p>
                </div>
            </div>
            <button type="button" onclick="cerrarAnuncioGuia()" style="background: none; border: none; color: #94a3b8; font-size: 1.1rem; cursor: pointer; padding: 0; line-height: 1;">
                &times;
            </button>
        </div>
    `;

    document.body.appendChild(banner);

    setTimeout(() => {
        cerrarAnuncioGuia();
    }, 8000);
}

function cerrarAnuncioGuia() {
    const banner = document.getElementById('bannerGuiaFisioCid');
    if (banner) {
        banner.classList.remove('animate__fadeInDown');
        banner.classList.add('animate__fadeOutUp');
        setTimeout(() => banner.remove(), 400);
        sessionStorage.setItem('anuncio_contingencia_visto', 'true');
    }
}

// ============================================================================
// 🔍 2. MOTOR DE BÚSQUEDA INTELIGENTE
// ============================================================================
function configurarBuscadorPaciente() {
    const inputNombre = document.getElementById('valNombre');
    if (!inputNombre) return;

    inputNombre.addEventListener('input', async (e) => {
        const texto = e.target.value.trim().toUpperCase();
        clearTimeout(debounceTimer);

        if (!listaSugerencias) {
            listaSugerencias = document.getElementById('sugerencias-gabinete') || document.getElementById('sugerencias-pacientes');
        }

        if (texto.length < 2) {
            if (listaSugerencias) listaSugerencias.classList.add('d-none');
            return;
        }

        const idClinicaActiva = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');

        debounceTimer = setTimeout(async () => {
            try {
                const palabras = texto.split(/\s+/).filter(Boolean);
                const condiciones = [];
                palabras.forEach(palabra => {
                    condiciones.push(`nombre.ilike.%${palabra}%`);
                    condiciones.push(`apellido_paterno.ilike.%${palabra}%`);
                    condiciones.push(`apellido_materno.ilike.%${palabra}%`);
                    condiciones.push(`curp.ilike.%${palabra}%`);
                });

                // 🛡️ Consulta con INNER JOIN a expedientes_clinicos filtrado por sede activa
                const { data: pacientes, error } = await fisioNet
                    .from('pacientes_maestros')
                    .select(`
                        *,
                        expedientes_clinicos!inner (
                            id, folio_personalizado, numero_consecutivo, id_clinica
                        )
                    `)
                    .eq('expedientes_clinicos.id_clinica', idClinicaActiva)
                    .or(condiciones.join(','))
                    .limit(8);

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

                            const expLocal = Array.isArray(p.expedientes_clinicos) 
                                ? p.expedientes_clinicos.find(e => String(e.id_clinica) === String(idClinicaActiva))
                                : p.expedientes_clinicos;

                            const folioStr = expLocal?.folio_personalizado || `EXP-${p.id}`;

                            btn.innerHTML = `
                                <div class="d-flex justify-content-between align-items-center">
                                    <strong class="text-dark fs-7">${nombreCompleto.toUpperCase()}</strong>
                                    <span class="badge bg-light text-primary border">📁 ${folioStr}</span>
                                </div>
                                <div class="text-muted mt-1" style="font-size: 0.65rem;">
                                    <i class="fas fa-id-card me-1"></i>CURP: <span class="fw-bold text-secondary">${p.curp || 'N/A'}</span> | 🎂 ${p.fecha_nacimiento || 'S/F'}
                                </div>
                            `;

                            btn.onclick = (event) => {
                                event.preventDefault();
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
                    if (listaSugerencias) listaSugerencias.classList.add('d-none');
                }
            } catch (err) {
                console.error("❌ Error en motor de búsqueda de recetas:", err.message || err);
            }
        }, 300);
    });
}

// ============================================================================
// ⚡ 3. AUTORRELLENO DE FICHA Y CANDADOS
// ============================================================================
function autorrellenarPaciente(p) {
    if (listaSugerencias) listaSugerencias.classList.add('d-none');
    pacienteExistenteId = p.id;
    window.pacienteSeleccionado = p;
    window.pacienteCargado = p; 

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
    mapearPorIds(['correo-tutor'], p.correo_tutor);

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
        'tutor-nombre', 'tutor-parentesco', 'tutor-tel', 'correo-tutor'
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

    const btnAuto = document.getElementById('btnAutoHomo');
    if (btnAuto) {
        btnAuto.disabled = bloquear;
        if (bloquear) {
            btnAuto.className = "btn btn-secondary fw-bold disabled";
            btnAuto.style.width = "20%";
            btnAuto.innerHTML = '<i class="fas fa-check-circle text-success"></i> Listo';
        } else {
            btnAuto.className = "btn btn-outline-danger fw-bold";
            btnAuto.style.width = "20%";
            btnAuto.innerHTML = '<i class="fas fa-bolt" id="iconoAutoHomo"></i> Auto';
        }
    }
}


// ============================================================================
// 4. AUTO-REGISTRO DE PACIENTE MAESTRO Y CREACION DE EXPEDIENTE CLINICO
// ============================================================================
async function registrarPacienteNuevo() {
    const { data: { user } } = await fisioNet.auth.getUser();
    if (!user) throw new Error("Sesion expirada. Por favor vuelve a ingresar.");

    const clinicaId = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');
    if (!clinicaId) throw new Error("No se detecto una clinica activa en la sesion.");

    const nombreVal = document.getElementById('valNombre')?.value.trim() || '';
    const paternoVal = document.getElementById('valPaterno')?.value.trim() || '';
    const maternoVal = document.getElementById('valMaterno')?.value.trim() || '';
    const fechaNacVal = document.getElementById('valFecha')?.value || null;
    const generoVal = document.getElementById('genero-manual')?.value || 'NO ESPECIFICADO';
    const estadoVal = document.getElementById('valEstado')?.value || null;
    const telVal = document.getElementById('tel-manual')?.value.trim() || null;
    const emailVal = document.getElementById('valEmail')?.value.trim() || null;

    const p1 = document.getElementById('curp-parte1')?.value || '';
    const p2 = document.getElementById('curp-estado')?.value || '';
    const p3 = document.getElementById('curp-consonantes')?.value || '';
    const p4 = document.getElementById('curp-homo')?.value || '';
    const curpFinal = `${p1}${p2}${p3}${p4}`.toUpperCase();

    if (!nombreVal || !paternoVal) {
        throw new Error("Por favor captura al menos el Nombre y Apellido Paterno.");
    }

    // Regla de calidad: 10 digitos o 0000000000 para contingencia
    const esTelefonoValido = (tel) => tel && (tel.length >= 10 || /^0+$/.test(tel));
    if (!telVal || !esTelefonoValido(telVal)) {
        throw new Error("Por favor captura un telefono valido (10 digitos) o '0000000000' para contingencia.");
    }

    // 1. Obtener el siguiente folio consecutivo para la sede activa
    const resFolio = await gestionarFolioAutomatico(null);
    const folioSede = resFolio?.folio || document.getElementById('inputFolioExpediente')?.value || null;
    const partesFolio = (folioSede || "").split('-');
    const consecutivoFinal = parseInt((partesFolio[partesFolio.length - 1] || "0").replace(/\D/g, ''), 10) || 0;

    // 2. Insertar Paciente Maestro
    const payloadPaciente = {
        nombre: nombreVal.toUpperCase(),
        apellido_paterno: paternoVal.toUpperCase(),
        apellido_materno: maternoVal.toUpperCase(),
        fecha_nacimiento: fechaNacVal,
        genero: (generoVal && generoVal !== 'SELECCION') ? generoVal : 'NO ESPECIFICADO',
        estado_nacimiento: estadoVal,
        curp: curpFinal.length === 18 ? curpFinal : null,
        telefono: telVal,
        correo_electronico: emailVal,
        creado_por: user.id,
        id_clinica_origen: clinicaId,
        nombre_clinica: localStorage.getItem('nombre_clinica') || 'FisioCid',
        fecha_registro: new Date().toISOString(),
        acceso_red_activo: true,
        consentimiento_firmado: true,
        fecha_firma_consentimiento: new Date().toISOString()
    };

    const { data: resPaciente, error: errPaciente } = await fisioNet
        .from('pacientes_maestros')
        .insert([payloadPaciente])
        .select();

    if (errPaciente) throw errPaciente;
    if (!resPaciente || resPaciente.length === 0) throw new Error("No se pudo registrar el paciente maestro.");

    const nuevoPacienteId = resPaciente[0].id;

    // 3. Crear Expediente Clinico Vinculado (Evita registros huerfanos)
    const { error: errExpediente } = await fisioNet.from('expedientes_clinicos').insert([{
        id_paciente: nuevoPacienteId,
        id_clinica: clinicaId,
        folio_personalizado: folioSede,
        numero_consecutivo: consecutivoFinal,
        estado_expediente: 'ACTIVO'
    }]);

    if (errExpediente) console.error("Error al crear expediente clinico:", errExpediente);

    // 4. Crear Vinculo Clinico
    await fisioNet.from('vinculos_clinicos').insert([{
        paciente_id: nuevoPacienteId,
        profesional_id: user.id,
        id_clinica: clinicaId,
        rol_en_relacion: 'OPERATIVO',
        estado_vinculo: 'ACTIVO'
    }]);

    pacienteExistenteId = nuevoPacienteId;
    window.pacienteCargado = resPaciente[0];

    return nuevoPacienteId;
}

// ============================================================================
// 🧮 5. MOTOR MATEMÁTICO CURP Y EDAD
// ============================================================================
function limpiarPalabras(texto) {
    if (!texto) return [];
    let textoLimpio = texto.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const conectores = ["DA", "DAS", "DE", "DEL", "DER", "DI", "DIE", "DD", "EL", "LA", "LOS", "LAS", "LE", "LES", "MAC", "MC", "VAN", "VON", "Y"];
    let palabras = textoLimpio.trim().split(/\s+/);
    return palabras.filter(palabra => !conectores.includes(palabra));
}

function procesarNombreMexicano(nombreRaw) {
    let palabras = limpiarPalabras(nombreRaw);
    if (palabras.length > 1 && ["MARIA", "MA.", "MA", "JOSE", "J.", "J"].includes(palabras[0])) {
        palabras.shift();
    }
    return { nombre: palabras[0] || "X" };
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
    const nomObj = procesarNombreMexicano(nomRaw);
    const nom = nomObj.nombre.toUpperCase();
    
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
// 📁 6. GESTOR DE FOLIOS DINÁMICO
// ============================================================================
async function gestionarFolioAutomatico(idPacienteExistente = null, idInputTarget = 'inputFolioExpediente', idStatusTarget = 'statusFolio') {
    const idClinica = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');
    const inputFolio = document.getElementById(idInputTarget);
    const statusFolio = document.getElementById(idStatusTarget);

    if (!idClinica) {
        if (statusFolio) statusFolio.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i> ERROR: CLÍNICA NO ACTIVA EN SESIÓN';
        return;
    }

    try {
        if (idPacienteExistente) {
            const { data: exp } = await fisioNet
                .from('expedientes_clinicos')
                .select('folio_personalizado')
                .eq('id_paciente', idPacienteExistente)
                .eq('id_clinica', idClinica)
                .maybeSingle();

            if (exp) {
                if (inputFolio) inputFolio.value = exp.folio_personalizado;
                if (statusFolio) statusFolio.innerHTML = '<i class="fas fa-check-circle text-success"></i> EXPEDIENTE LOCALIZADO EN SEDE';
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

        if (inputFolio) inputFolio.value = nuevoFolio;
        if (statusFolio) statusFolio.innerHTML = '<i class="fas fa-magic text-primary"></i> EXPEDIENTE CONSECUTIVO ASIGNADO';
        
        return { folio: nuevoFolio, numero_consecutivo: siguiente, nuevo: true };

    } catch (error) {
        console.error("❌ ERROR EN FOLIOS:", error);
        if (statusFolio) statusFolio.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i> ERROR DE CONEXIÓN';
    }
}

// ============================================================================
// 💊 7. MOTOR DEL RECETARIO (Medicamentos e IMC)
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
                <input type="text" class="form-control form-fisiocid border-start-0 text-uppercase fw-bold med-nombre" placeholder="Ej. PARACETAMOL 500MG" autocomplete="off">
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

    const inNom = fila.querySelector('.med-nombre');
    const inDos = fila.querySelector('.med-dosis');
    const inFre = fila.querySelector('.med-frecuencia');
    const inDur = fila.querySelector('.med-duracion');
    if (inNom) vincularAutocompletadoMedicamento(inNom, inDos, inFre, inDur);
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
// 💾 PROCESAMIENTO Y GUARDADO DE RECETA CON COMPROBACION DE EXPEDIENTE
// ============================================================================
async function procesarReceta() {
    const btn = document.getElementById('btnGuardarReceta');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> GUARDANDO Y GENERANDO PDF...';

    try {
        if (!pacienteExistenteId) {
            pacienteExistenteId = await registrarPacienteNuevo();
        }

        const idClinica = localStorage.getItem('id_clinica_activa');
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) throw new Error("Sesion expirada. Por favor vuelve a ingresar.");

        // Verificar que el paciente tenga expediente clinico en esta sede
        const { data: expExistente } = await fisioNet
            .from('expedientes_clinicos')
            .select('folio_personalizado')
            .eq('id_paciente', pacienteExistenteId)
            .eq('id_clinica', idClinica)
            .maybeSingle();

        let folioExpediente = expExistente?.folio_personalizado;

        // Si por alguna razon no tenia expediente en la sede, se le asigna
        if (!folioExpediente) {
            const resFolio = await gestionarFolioAutomatico(pacienteExistenteId);
            folioExpediente = resFolio?.folio;

            if (resFolio?.nuevo) {
                await fisioNet.from('expedientes_clinicos').insert([{
                    id_paciente: pacienteExistenteId,
                    id_clinica: idClinica,
                    folio_personalizado: folioExpediente,
                    numero_consecutivo: resFolio.numero_consecutivo,
                    estado_expediente: 'ACTIVO'
                }]);
            }
        }

        const diagnostico = document.getElementById('diagnostico-receta')?.value.trim() || '';
        const codigoCIE10 = document.getElementById('codigo-cie10-seleccionado')?.value || null;
        const indicaciones = document.getElementById('indicacionesExtras')?.value.trim() || '';

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

        const sistolica = parseInt(document.getElementById('valSistolica')?.value) || null;
        const diastolica = parseInt(document.getElementById('valDiastolica')?.value) || null;
        const frecuencia_cardiaca = parseInt(document.getElementById('valFC')?.value) || null;
        const frecuencia_respiratoria = parseInt(document.getElementById('valFR')?.value) || null;
        const temperatura = parseFloat(document.getElementById('valTemp')?.value) || null;
        const spo2 = parseInt(document.getElementById('valSpO2')?.value) || null;
        const peso = parseFloat(document.getElementById('valPeso')?.value) || null;
        const talla = parseFloat(document.getElementById('valTalla')?.value) || null;
        const imc = parseFloat(document.getElementById('valIMC')?.value) || null;

        const tokenQR = crypto.randomUUID();
        let recetaIdFinal = window.recetaPendienteVinculadaId;

        if (recetaIdFinal) {
            const { error: errUpdate } = await fisioNet
                .from('recetas_medicas')
                .update({
                    diagnostico: diagnostico,
                    codigo_cie10: codigoCIE10,
                    indicaciones_generales: indicaciones,
                    medicamentos: listaMedicamentos,
                    estado_nota: 'PENDIENTE',
                    sistolica, diastolica, frecuencia_cardiaca, frecuencia_respiratoria,
                    temperatura, spo2, peso, talla, imc
                })
                .eq('id', recetaIdFinal);

            if (errUpdate) throw errUpdate;
        } else {
            const payloadNuevo = {
                id_paciente: pacienteExistenteId,
                id_clinica: idClinica,
                medico_id: user.id,
                folio_expediente: folioExpediente,
                diagnostico: diagnostico,
                codigo_cie10: codigoCIE10,
                indicaciones_generales: indicaciones,
                estado_nota: 'COMPLETADA',
                estado_dispensacion: 'PENDIENTE',
                token_qr: tokenQR,
                sistolica, diastolica, frecuencia_cardiaca, frecuencia_respiratoria,
                temperatura, spo2, peso, talla, imc,
                medicamentos: listaMedicamentos
            };

            const { data: resIns, error: errInsert } = await fisioNet
                .from('recetas_medicas')
                .insert([payloadNuevo])
                .select('id, token_qr')
                .single();

            if (errInsert) throw errInsert;
            recetaIdFinal = resIns.id;
        }

        await guardarMedicamentosFrecuentes(listaMedicamentos);

        const urlValidacionQR = `https://fisiocid.app/validar-receta.html?token=${tokenQR}`;
        const qrBase64 = await generarQRBase64(urlValidacionQR);

        const nombreVal = document.getElementById('valNombre')?.value.trim() || '';
        const paternoVal = document.getElementById('valPaterno')?.value.trim() || '';
        const maternoVal = document.getElementById('valMaterno')?.value.trim() || '';
        const fechaNacVal = document.getElementById('valFecha')?.value || '';

        const nombreCompleto = `${nombreVal} ${paternoVal} ${maternoVal}`.trim() || window.pacienteSeleccionado?.nombre || "PACIENTE";
        const edadPaciente = (typeof calcularEdad === 'function') ? calcularEdad(fechaNacVal) : "N/A";
        const pacienteTextoPDF = edadPaciente !== "N/A" ? `${nombreCompleto} (${edadPaciente} AÑOS)` : nombreCompleto;

        let textoMedicamentosParaPDF = "PRESCRIPCION MEDICA:\n\n";
        listaMedicamentos.forEach((m, index) => {
            textoMedicamentosParaPDF += `${index + 1}. ${m.nombre}\n   Dosis: ${m.dosis || 'N/A'} | Frecuencia: ${m.frecuencia || 'N/A'} | Duracion: ${m.duracion || 'N/A'}\n\n`;
        });

        if (indicaciones) {
            textoMedicamentosParaPDF += `INDICACIONES GENERALES:\n${indicaciones}`;
        }

        const datosParaPDF = {
            nombre_paciente: pacienteTextoPDF,
            fecha_nota: new Date().toISOString(),
            qr_code: qrBase64,
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

        if (typeof window.generarPDF === 'function') {
            await window.generarPDF(datosParaPDF);
            window.recetaPendienteVinculadaId = null;
            alert("✅ ¡Receta guardada y PDF generado con exito!");
        } else {
            alert("⚠️ Receta guardada en base de datos, pero el modulo de PDF no esta listo.");
        }

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
// ⏳ GUARDAR PACIENTE EN SALA DE ESPERA
// ============================================================================
async function guardarEnEspera() {
    const btn = document.getElementById('btnGuardarEspera');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> GUARDANDO...';
    }

    try {
        // Si es un paciente nuevo, registrarPacienteNuevo se encarga de crear
        // paciente_maestro + expediente_clinico
        if (!pacienteExistenteId) {
            pacienteExistenteId = await registrarPacienteNuevo();
        }

        const diagnostico = document.getElementById('diagnostico-receta')?.value.trim() || '';
        const indicaciones = document.getElementById('indicacionesExtras')?.value.trim() || '';
        const folio = document.getElementById('inputFolioExpediente')?.value.trim() || '';
        const idClinica = localStorage.getItem('id_clinica_activa');

        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) throw new Error("Sesion expirada. Por favor vuelve a ingresar.");

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
            estado_nota: 'ESPERA',
            sistolica, diastolica, frecuencia_cardiaca, frecuencia_respiratoria,
            temperatura, spo2, peso, talla, imc,
            medicamentos: listaMedicamentos
        };

        const { error } = await fisioNet.from('recetas_medicas').insert([payloadEspera]);
        if (error) throw error;

        alert("✅ ¡Paciente enviado a la Sala de Espera!");
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
// 👥 CONSULTAR Y CARGAR SALA DE ESPERA
// ============================================================================
async function abrirModalCitasEnEspera() {
    const idClinica = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');
    if (!idClinica) {
        alert("⚠️ No hay una clínica activa seleccionada.");
        return;
    }

    try {
        const { data: enEspera, error } = await fisioNet
            .from('recetas_medicas')
            .select(`
                *,
                pacientes_maestros:id_paciente (
                    id, nombre, apellido_paterno, apellido_materno, fecha_nacimiento, curp, telefono
                )
            `)
            .eq('id_clinica', idClinica)
            .eq('estado_nota', 'ESPERA')
            .order('fecha_creacion', { ascending: false });

        if (error) throw error;

        if (!enEspera || enEspera.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'Sala de Espera Vacía',
                text: 'No hay pacientes en espera en este momento.',
                confirmButtonColor: '#2563eb'
            });
            return;
        }

        let htmlLista = `
            <div style="text-align: left; max-height: 400px; overflow-y: auto;">
                <p class="text-muted small mb-3">Selecciona un paciente para cargar sus signos vitales y datos:</p>
                <div class="list-group">
        `;

        enEspera.forEach(item => {
            const p = item.pacientes_maestros || {};
            const nombreCompleto = `${p.nombre || ''} ${p.apellido_paterno || ''} ${p.apellido_materno || ''}`.trim() || "PACIENTE SIN NOMBRE";
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
        console.error("❌ Error al cargar citas en espera:", err);
        alert("Hubo un error al consultar la sala de espera: " + (err.message || err));
    }
}

async function cargarPacienteDesdeEspera(item) {
    Swal.close();
    window.recetaPendienteVinculadaId = item.id; 

    try {
        const { data: paciente, error } = await fisioNet
            .from('pacientes_maestros')
            .select('*')
            .eq('id', item.id_paciente)
            .single();

        if (error) throw error;

        if (paciente && typeof autorrellenarPaciente === 'function') {
            autorrellenarPaciente(paciente);
        }
    } catch (err) {
        console.error("❌ Error al cargar datos maestros:", err);
    }

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

    if (typeof calcularIMC === 'function') calcularIMC();

    const diagEl = document.getElementById('diagnostico-receta');
    if (diagEl && item.diagnostico) diagEl.value = item.diagnostico;

    const indEl = document.getElementById('indicacionesExtras');
    if (indEl && item.indicaciones_generales) indEl.value = item.indicaciones_generales;
}

async function verificarPacienteExistentePorCurp(curp) {
    if (!curp || curp.length !== 18) return;
    const idClinica = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');

    try {
        const { data: p, error } = await fisioNet
            .from('pacientes_maestros')
            .select('*')
            .eq('curp', curp)
            .maybeSingle();

        if (error) throw error;

        if (p) {
            autorrellenarPaciente(p);
            console.log("✅ Paciente localizado por CURP:", p.nombre);
            
            // 🛡️ Verificar si ya tiene folio asignado en esta sede o si requiere un expediente local
            if (typeof gestionarFolioAutomatico === 'function') {
                await gestionarFolioAutomatico(p.id);
            }
        } else {
            // 🎯 Paciente nuevo: generar y mostrar el folio consecutivo correspondiente de la sede
            if (!pacienteExistenteId && typeof gestionarFolioAutomatico === 'function') {
                await gestionarFolioAutomatico(null);
            }
        }
    } catch (err) {
        console.error("Error al verificar paciente por CURP:", err.message);
    }
}

function hacerParpadearCamposBase(ids) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && (!el.value || el.value === 'SELECCION')) {
            el.classList.add('is-invalid');
            setTimeout(() => el.classList.remove('is-invalid'), 2000);
        }
    });
}

async function autocompletarHomoclaveRenapo() {
    const btn = document.getElementById('btnAutoHomo');
    const icono = document.getElementById('iconoAutoHomo');
    const msj = document.getElementById('msjHomoclaveAuto');
    const inputHomo = document.getElementById('curp-homo');

    const listaCampos = ['valNombre', 'valPaterno', 'valMaterno', 'valFecha', 'genero-manual', 'valEstado'];
    hacerParpadearCamposBase(listaCampos);

    const nombres = document.getElementById('valNombre')?.value.trim().toUpperCase() || "";
    const apellidoPaterno = document.getElementById('valPaterno')?.value.trim().toUpperCase() || "";
    const apellidoMaterno = document.getElementById('valMaterno')?.value.trim().toUpperCase() || "";
    const fechaNacimiento = document.getElementById('valFecha')?.value || ""; 
    const generoFull = document.getElementById('genero-manual')?.value || "";
    const estadoSelect = document.getElementById('valEstado');
    const estadoTexto = estadoSelect?.options[estadoSelect.selectedIndex]?.text.toUpperCase() || "";

    if(!nombres || !apellidoPaterno || !fechaNacimiento || !generoFull || generoFull === 'SELECCION' || !estadoSelect?.value) {
        msj.innerHTML = "<span class='text-danger'>⚠️ Completa los datos de identidad primero.</span>";
        return;
    }

    btn.disabled = true;
    icono.className = "fas fa-spinner fa-spin";
    msj.innerHTML = "<span class='text-primary'>🔍 Verificando en RENAPO...</span>";

    try {
        const { data, error } = await fisioNet.functions.invoke('validar-curp', {
            body: { 
                nombres, apellidoPaterno, apellidoMaterno, 
                fechaNacimiento, genero: (generoFull === 'HOMBRE') ? 'H' : 'M', 
                estado: estadoTexto 
            }
        });

        if (error) throw error;
        
        if (data.error || !data.curp) {
             msj.innerHTML = "<span class='text-danger'>❌ No se encontró en RENAPO. Revisa la ortografía.</span>";
             return;
        }

        const curpCompleta = data.curp.toUpperCase();
        
        const p1 = document.getElementById('curp-parte1'); if (p1) p1.value = curpCompleta.substring(0, 11);
        const p2 = document.getElementById('curp-estado'); if (p2) p2.value = curpCompleta.substring(11, 13);
        const p3 = document.getElementById('curp-consonantes'); if (p3) p3.value = curpCompleta.substring(13, 16);
        if (inputHomo) inputHomo.value = curpCompleta.substring(16, 18);

        await verificarPacienteExistentePorCurp(curpCompleta);

    } catch (err) {
        console.error("Error en consulta RENAPO:", err);
        msj.innerHTML = "<span class='text-danger'>⚠️ Error de conexión.</span>";
    } finally {
        btn.disabled = false;
        icono.className = "fas fa-bolt";
        setTimeout(() => { if(msj.innerHTML.includes('Verificada') || msj.innerHTML.includes('localizado')) msj.innerHTML = ""; }, 4000);
    }
}

// =====================================================================
// 🧑‍🍼 MODAL Y REGISTRO DE TUTOR EXPRESS
// =====================================================================
async function abrirModalTutorExpress() {
    const modalEl = document.getElementById('modalTutorExpress');
    if (modalEl) {
        document.getElementById('formTutorExpress')?.reset();
        
        const nombreClinica = localStorage.getItem('nombre_clinica') || 'Clínica Activa';
        const lblSede = document.getElementById('lblSedeRegistroTutor');
        if (lblSede) lblSede.innerText = `Registrando Tutor en: ${nombreClinica.toUpperCase()}`;

        const statusEl = document.getElementById('statusFolioTutorExpress');
        if (statusEl) statusEl.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> GENERANDO FOLIO...';
        
        await gestionarFolioAutomatico(null, 'inputFolioTutorExpress', 'statusFolioTutorExpress');

        tutorExpressExistenteId = null;
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
        modalInstance.show();
    }
}

// =====================================================================
// 🧑‍🍼 REGISTRO DE TUTOR EXPRESS CON EXPEDIENTE CLINICO
// =====================================================================
async function guardarTutorExpress() {
    const nombre = document.getElementById('tutExpNombre')?.value.trim().toUpperCase();
    const paterno = document.getElementById('tutExpPaterno')?.value.trim().toUpperCase();
    const materno = document.getElementById('tutExpMaterno')?.value.trim().toUpperCase() || "";
    const fechaNac = document.getElementById('tutExpFecha')?.value;
    const genero = document.getElementById('tutExpGenero')?.value;
    const estado = document.getElementById('tutExpEstado')?.value;
    const tel = document.getElementById('tutExpTel')?.value.trim();
    const email = document.getElementById('tutExpEmail')?.value.trim().toLowerCase() || null;
    
    const curpBase = document.getElementById('tutExpCurpBase')?.value.trim().toUpperCase() || "";
    const curpHomo = document.getElementById('tutExpCurpHomo')?.value.trim().toUpperCase() || "";
    const curpCompleta = (curpBase + curpHomo).length === 18 ? (curpBase + curpHomo) : null;

    if (!nombre || !paterno || !fechaNac || !tel || (tel.length < 10 && !/^0+$/.test(tel))) {
        alert("⚠️ Completa los campos obligatorios (*): Nombre, A. Paterno, Fecha Nac. y Telefono valido (10 digitos o 0000000000).");
        return;
    }

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        const clinicaId = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');

        let tutorFinalId = tutorExpressExistenteId;
        let nombreCompleto = `${nombre} ${paterno} ${materno}`.trim();
        let folioInfoMensaje = "";

        // Verificacion previa por CURP
        if (!tutorFinalId && curpCompleta) {
            const { data: tutorExiste } = await fisioNet
                .from('pacientes_maestros')
                .select('id')
                .eq('curp', curpCompleta)
                .maybeSingle();
            if (tutorExiste) tutorFinalId = tutorExiste.id;
        }

        if (tutorFinalId) {
            // Actualizar contacto de tutor existente
            await fisioNet.from('pacientes_maestros').update({
                telefono: tel,
                correo_electronico: email
            }).eq('id', tutorFinalId);

            const { data: expExistente } = await fisioNet
                .from('expedientes_clinicos')
                .select('folio_personalizado')
                .eq('id_paciente', tutorFinalId)
                .eq('id_clinica', clinicaId)
                .maybeSingle();

            if (expExistente) {
                folioInfoMensaje = `Expediente en sede: ${expExistente.folio_personalizado}`;
            } else {
                const folioTutor = `TUT-${Date.now().toString().slice(-6)}`;
                await fisioNet.from('expedientes_clinicos').insert([{
                    id_paciente: tutorFinalId,
                    id_clinica: clinicaId,
                    folio_personalizado: folioTutor,
                    numero_consecutivo: 0,
                    estado_expediente: 'ACTIVO_TUTOR'
                }]);
                folioInfoMensaje = `Expediente asignado: ${folioTutor}`;
            }

        } else {
            // Tutor Nuevo
            const folioTutor = `TUT-${Date.now().toString().slice(-6)}`;

            const payloadTutor = {
                nombre: nombre,
                apellido_paterno: paterno,
                apellido_materno: materno,
                fecha_nacimiento: fechaNac,
                genero: genero,
                estado_nacimiento: estado,
                curp: curpCompleta,
                telefono: tel,
                correo_electronico: email,
                creado_por: user?.id,
                id_clinica_origen: clinicaId,
                nombre_clinica: localStorage.getItem('nombre_clinica') || 'FisioCid',
                es_menor_edad: false,
                acceso_red_activo: true,
                fecha_registro: new Date().toISOString()
            };

            const { data: tutorInsertado, error: errTutor } = await fisioNet
                .from('pacientes_maestros')
                .insert([payloadTutor])
                .select();

            if (errTutor) throw errTutor;

            if (tutorInsertado && tutorInsertado.length > 0) {
                tutorFinalId = tutorInsertado[0].id;

                // Crear expediente clinico de tutor
                await fisioNet.from('expedientes_clinicos').insert([{
                    id_paciente: tutorFinalId,
                    id_clinica: clinicaId,
                    folio_personalizado: folioTutor,
                    numero_consecutivo: 0,
                    estado_expediente: 'ACTIVO_TUTOR'
                }]);

                await fisioNet.from('vinculos_clinicos').insert([{
                    paciente_id: tutorFinalId,
                    profesional_id: user?.id,
                    id_clinica: clinicaId,
                    rol_en_relacion: 'TUTOR',
                    estado_vinculo: 'ACTIVO'
                }]);

                folioInfoMensaje = `Nuevo expediente tutor: ${folioTutor}`;
            }
        }

        if (tutorFinalId) {
            const inputNombreTutor = document.getElementById('tutor-nombre');
            const inputTelTutor = document.getElementById('tutor-tel');
            const inputEmailTutor = document.getElementById('correo-tutor');
            const inputIdTutor = document.getElementById('idTutorSeleccionado');

            if (inputNombreTutor) inputNombreTutor.value = nombreCompleto;
            if (inputTelTutor) inputTelTutor.value = tel;
            if (inputEmailTutor) inputEmailTutor.value = email || "";
            if (inputIdTutor) inputIdTutor.value = tutorFinalId;

            alert(`✅ ¡Tutor enlazado con exito!\n📄 ${folioInfoMensaje}`);

            tutorExpressExistenteId = null;
            const modalEl = document.getElementById('modalTutorExpress');
            if (modalEl) {
                const modalInstance = bootstrap.Modal.getInstance(modalEl);
                if (modalInstance) modalInstance.hide();
            }
        }

    } catch (err) {
        console.error("💥 Error al procesar tutor express:", err);
        alert("Error al registrar tutor: " + (err.message || "Error de conexion"));
    }
}
function generarCurpExpressTutor() {
    const nom = document.getElementById('tutExpNombre')?.value || "";
    const pat = document.getElementById('tutExpPaterno')?.value || "";
    const mat = document.getElementById('tutExpMaterno')?.value || "X";
    const fec = document.getElementById('tutExpFecha')?.value || "";
    const gen = document.getElementById('tutExpGenero')?.value === 'HOMBRE' ? 'H' : 'M';
    const est = document.getElementById('tutExpEstado')?.value || "PL";

    if (nom.length >= 2 && pat.length >= 2 && fec) {
        const pNom = typeof procesarNombreMexicano === 'function' ? procesarNombreMexicano(nom).nombre : nom[0];
        const pPat = typeof limpiarApellidoMexicano === 'function' ? limpiarApellidoMexicano(pat) : pat;
        const pMat = typeof limpiarApellidoMexicano === 'function' ? limpiarApellidoMexicano(mat) : mat;

        const l1 = pPat[0] || "X";
        const l2 = pPat.slice(1).match(/[AEIOU]/)?.[0] || "X";
        const l3 = pMat[0] || "X";
        const l4 = pNom[0] || "X";
        const aa = fec.substring(2, 4);
        const mm = fec.substring(5, 7);
        const dd = fec.substring(8, 10);

        const c1 = pPat.slice(1).match(/[BCDFGHJKLMNPQRSTVWXYZ]/)?.[0] || "X";
        const c2 = pMat.slice(1).match(/[BCDFGHJKLMNPQRSTVWXYZ]/)?.[0] || "X";
        const c3 = pNom.slice(1).match(/[BCDFGHJKLMNPQRSTVWXYZ]/)?.[0] || "X";

        const base16 = `${l1}${l2}${l3}${l4}${aa}${mm}${dd}${gen}${est}${c1}${c2}${c3}`.toUpperCase();
        
        const inputBase = document.getElementById('tutExpCurpBase');
        if (inputBase) inputBase.value = base16;

        evaluarCurpHomoclaveTutorExpress();
    }
}

async function autocompletarHomoclaveRenapoTutor() {
    const btn = document.getElementById('btnAutoHomoTutor');
    const msj = document.getElementById('msjHomoclaveAutoTutor');
    const inputHomo = document.getElementById('tutExpCurpHomo');

    const nombres = document.getElementById('tutExpNombre')?.value.trim().toUpperCase() || "";
    const apellidoPaterno = document.getElementById('tutExpPaterno')?.value.trim().toUpperCase() || "";
    const apellidoMaterno = document.getElementById('tutExpMaterno')?.value.trim().toUpperCase() || "";
    const fechaNacimiento = document.getElementById('tutExpFecha')?.value || ""; 
    const generoFull = document.getElementById('tutExpGenero')?.value || "";
    const estadoSelect = document.getElementById('tutExpEstado');
    const estadoTexto = estadoSelect ? estadoSelect.options[estadoSelect.selectedIndex].text.toUpperCase() : "";

    if (!nombres || !apellidoPaterno || !fechaNacimiento) {
        if (msj) msj.innerHTML = "<span class='text-danger'>⚠️ Completa los datos marcados con *.</span>";
        return;
    }

    if (btn) btn.disabled = true;
    if (msj) msj.innerHTML = "<span class='text-primary'>🔍 Verificando en RENAPO...</span>";

    try {
        const { data, error } = await fisioNet.functions.invoke('validar-curp', {
            body: { 
                nombres, apellidoPaterno, apellidoMaterno, 
                fechaNacimiento, genero: (generoFull === 'HOMBRE') ? 'H' : 'M', 
                estado: estadoTexto 
            }
        });

        if (error) throw error;

        if (data.error || !data.curp) {
            if (msj) msj.innerHTML = "<span class='text-danger'>❌ No se encontró en RENAPO.</span>";
            return;
        }

        const homoclaveExtraida = data.curp.substring(16, 18).toUpperCase(); 
        if (inputHomo) inputHomo.value = homoclaveExtraida;

        await evaluarCurpHomoclaveTutorExpress();

    } catch (err) {
        console.error("❌ Error en RENAPO Tutor:", err);
        if (msj) msj.innerHTML = `<span class='text-danger'>⚠️ Error de conexión.</span>`;
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function evaluarCurpHomoclaveTutorExpress() {
    const parteBase = document.getElementById('tutExpCurpBase')?.value?.trim().toUpperCase() || '';
    const homo = document.getElementById('tutExpCurpHomo')?.value?.trim().toUpperCase() || '';
    const curpCompleta = `${parteBase}${homo}`;

    if (curpCompleta.length === 18) {
        await verificarTutorExistentePorCurpModal(curpCompleta);
    }
}

async function verificarTutorExistentePorCurpModal(curpCompleta) {
    const statusEl = document.getElementById('statusFolioTutorExpress');
    const msjEl = document.getElementById('msjHomoclaveAutoTutor');

    if (!curpCompleta || curpCompleta.length !== 18) return;

    try {
        const { data: tutor } = await fisioNet
            .from('pacientes_maestros')
            .select('*')
            .eq('curp', curpCompleta.toUpperCase())
            .maybeSingle();

        if (tutor) {
            tutorExpressExistenteId = tutor.id;
            if (document.getElementById('tutExpTel')) document.getElementById('tutExpTel').value = tutor.telefono || '';
            if (document.getElementById('tutExpEmail')) document.getElementById('tutExpEmail').value = tutor.correo_electronico || '';

            await gestionarFolioAutomatico(tutor.id, 'inputFolioTutorExpress', 'statusFolioTutorExpress');

            if (msjEl) msjEl.innerHTML = "<span class='text-success'>✅ ¡Tutor localizado en la red! Se vinculará directamente.</span>";
        } else {
            tutorExpressExistenteId = null;
            await gestionarFolioAutomatico(null, 'inputFolioTutorExpress', 'statusFolioTutorExpress');
            if (msjEl) msjEl.innerHTML = "<span class='text-success'>✅ CURP Verificada (Tutor Nuevo)</span>";
        }
    } catch (err) {
        console.error("❌ Error al verificar CURP de tutor:", err.message);
    }
}

// ============================================================================
// 🔍 BUSCADOR CIE-10 Y PREDICTOR DE MEDICAMENTOS
// ============================================================================
function configurarBuscadorCIE10() {
    const inputDiag = document.getElementById('diagnostico-receta');
    const listaCie = document.getElementById('sugerencias-cie10');
    const inputCodigo = document.getElementById('codigo-cie10-seleccionado');
    const badgeCie = document.getElementById('badge-cie10');
    let timerCie;

    if (!inputDiag || !listaCie) return;

    inputDiag.addEventListener('input', (e) => {
        const query = e.target.value.trim().toUpperCase();
        clearTimeout(timerCie);

        if (query.length < 2) {
            listaCie.classList.add('d-none');
            if (inputCodigo) inputCodigo.value = '';
            if (badgeCie) badgeCie.innerText = 'CIE';
            return;
        }

        timerCie = setTimeout(async () => {
            try {
                const { data, error } = await fisioNet
                    .from('catalogo_diagnosticos')
                    .select('clave, descripcion')
                    .or(`clave.ilike.%${query}%,descripcion.ilike.%${query}%`)
                    .limit(7);

                if (error) throw error;

                if (data && data.length > 0) {
                    listaCie.innerHTML = '';
                    listaCie.classList.remove('d-none');

                    data.forEach(item => {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = 'list-group-item list-group-item-action p-2 text-start border-bottom';
                        btn.innerHTML = `
                            <span class="badge bg-primary me-2">${item.clave}</span>
                            <strong class="small text-dark">${item.descripcion}</strong>
                        `;

                        btn.onclick = (evt) => {
                            evt.preventDefault();
                            inputDiag.value = `${item.clave} - ${item.descripcion}`;
                            if (inputCodigo) inputCodigo.value = item.clave;
                            if (badgeCie) badgeCie.innerText = item.clave;
                            listaCie.classList.add('d-none');
                        };
                        listaCie.appendChild(btn);
                    });
                } else {
                    listaCie.classList.add('d-none');
                }
            } catch (err) {
                console.error("Error al consultar catalogo_diagnosticos:", err.message);
            }
        }, 250);
    });
}

async function guardarMedicamentosFrecuentes(listaMedicamentos) {
    const { data: { user } } = await fisioNet.auth.getUser();
    if (!user) return;

    for (const med of listaMedicamentos) {
        if (!med.nombre) continue;

        try {
            const nomUpper = med.nombre.toUpperCase();
            const { data: existente } = await fisioNet
                .from('medicamentos_frecuentes')
                .select('id, contador_uso')
                .eq('medico_id', user.id)
                .eq('nombre_medicamento', nomUpper)
                .maybeSingle();

            if (existente) {
                await fisioNet
                    .from('medicamentos_frecuentes')
                    .update({
                        contador_uso: existente.contador_uso + 1,
                        dosis_frecuente: med.dosis,
                        frecuencia_frecuente: med.frecuencia,
                        duracion_frecuente: med.duracion,
                        ultima_prescripcion: new Date().toISOString()
                    })
                    .eq('id', existente.id);
            } else {
                await fisioNet
                    .from('medicamentos_frecuentes')
                    .insert([{
                        medico_id: user.id,
                        nombre_medicamento: nomUpper,
                        dosis_frecuente: med.dosis,
                        frecuencia_frecuente: med.frecuencia,
                        duracion_frecuente: med.duracion
                    }]);
            }
        } catch (err) {
            console.warn("Error al actualizar medicamentos frecuentes:", err.message);
        }
    }
}

function vincularAutocompletadoMedicamento(inputNombre, inputDosis, inputFrecuencia, inputDuracion) {
    let timerMed;
    const listaSug = document.createElement('div');
    listaSug.className = 'list-group position-absolute w-100 shadow-sm d-none';
    listaSug.style.zIndex = '1000';
    listaSug.style.top = '100%';
    inputNombre.parentElement.classList.add('position-relative');
    inputNombre.parentElement.appendChild(listaSug);

    inputNombre.addEventListener('input', async (e) => {
        const val = e.target.value.trim().toUpperCase();
        clearTimeout(timerMed);

        if (val.length < 2) {
            listaSug.classList.add('d-none');
            return;
        }

        timerMed = setTimeout(async () => {
            const { data: { user } } = await fisioNet.auth.getUser();
            if (!user) return;

            const [frecRes, invRes] = await Promise.all([
                fisioNet.from('medicamentos_frecuentes').select('*').eq('medico_id', user.id).ilike('nombre_medicamento', `%${val}%`).order('contador_uso', { ascending: false }).limit(4),
                fisioNet.from('inventario_insumos').select('nombre_insumo').ilike('nombre_insumo', `%${val}%`).limit(3)
            ]);

            const opcionesMap = new Map();
            if (frecRes.data) {
                frecRes.data.forEach(m => opcionesMap.set(m.nombre_medicamento, { 
                    nombre: m.nombre_medicamento, 
                    dosis: m.dosis_frecuente || '', 
                    frecuencia: m.frecuencia_frecuente || '', 
                    duracion: m.duracion_frecuente || '' 
                }));
            }
            if (invRes.data) {
                invRes.data.forEach(i => {
                    const nom = i.nombre_insumo.toUpperCase();
                    if (!opcionesMap.has(nom)) opcionesMap.set(nom, { nombre: nom, dosis: '', frecuencia: '', duracion: '' });
                });
            }

            const resultados = Array.from(opcionesMap.values());

            if (resultados.length > 0) {
                listaSug.innerHTML = '';
                listaSug.classList.remove('d-none');

                resultados.forEach(m => {
                    const item = document.createElement('button');
                    item.type = 'button';
                    item.className = 'list-group-item list-group-item-action p-2 text-start small border-bottom';

                    let detalleTexto = '';
                    if (m.dosis && m.frecuencia) {
                        detalleTexto = `${m.dosis} &bull; ${m.frecuencia}`;
                    } else if (m.dosis) {
                        detalleTexto = m.dosis;
                    }

                    item.innerHTML = `
                        <strong class="d-block text-dark">${m.nombre}</strong>
                        ${detalleTexto ? `<span class="text-muted d-block mt-1" style="font-size:0.7rem;">${detalleTexto}</span>` : ''}
                    `;
                    
                    item.onclick = (e) => {
                        e.preventDefault();
                        inputNombre.value = m.nombre;
                        if (inputDosis && m.dosis) inputDosis.value = m.dosis;
                        if (inputFrecuencia && m.frecuencia) inputFrecuencia.value = m.frecuencia;
                        if (inputDuracion && m.duracion) inputDuracion.value = m.duracion;
                        listaSug.classList.add('d-none');
                    };
                    listaSug.appendChild(item);
                });
            } else {
                listaSug.classList.add('d-none');
            }
        }, 250);
    });
}

function generarQRBase64(textoUrl) {
    return new Promise((resolve) => {
        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);

        new QRCode(tempDiv, {
            text: textoUrl,
            width: 128,
            height: 128,
            correctLevel: QRCode.CorrectLevel.H
        });

        setTimeout(() => {
            const canvas = tempDiv.querySelector('canvas');
            const img = tempDiv.querySelector('img');
            let dataUrl = '';
            if (canvas) {
                dataUrl = canvas.toDataURL("image/png");
            } else if (img) {
                dataUrl = img.src;
            }
            tempDiv.remove();
            resolve(dataUrl);
        }, 120);
    });
}

// =========================================================
// ⚡ ACCIONES FLOTANTES (SPEED DIAL) Y MODALES
// =========================================================
function toggleSpeedDial() {
    const opciones = document.getElementById('opcionesSpeedDial');
    const icono = document.getElementById('iconoSpeedDial');
    if (!opciones) return;

    if (opciones.style.display === 'none' || opciones.style.display === '') {
        opciones.style.display = 'flex';
        if (icono) icono.style.transform = 'rotate(45deg)';
    } else {
        opciones.style.display = 'none';
        if (icono) icono.style.transform = 'rotate(0deg)';
    }
}

function abrirModalEvidenciaMultimedia() {
    toggleSpeedDial();
    const modal = document.getElementById('modalEvidenciaMultimedia');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalEvidenciaMultimedia() {
    const modal = document.getElementById('modalEvidenciaMultimedia');
    if (modal) modal.style.display = 'none';
}

function abrirModalEstudioExpress() {
    toggleSpeedDial();
    const modal = document.getElementById('modalEstudioExpress');
    if (modal) modal.style.display = 'flex';
}

async function enviarSolicitudLab() {
    const tipo = document.getElementById('tipoServicioExterno')?.value;
    const estudio = document.getElementById('txtQueEstudio')?.value.trim();
    const destino = document.getElementById('inputLabDestino')?.value.trim();
    const btn = document.getElementById('btnEnviarLab');

    if (!estudio || !destino) {
        alert("⚠️ Por favor ingresa el estudio solicitado y el centro o laboratorio destino.");
        return;
    }

    try {
        if (btn) btn.disabled = true;
        const { data: { user } } = await fisioNet.auth.getUser();
        const clinicaId = localStorage.getItem('id_clinica_activa');

        const { error } = await fisioNet.from('estudios_gabinete').insert([{
            paciente_id: pacienteExistenteId,
            id_socio_emisor: clinicaId,
            creado_por: user?.id,
            tipo_estudio: tipo,
            estudio_solicitado: estudio,
            centro_destino: destino,
            estado_estudio: 'SOLICITADO',
            fecha_registro: new Date().toISOString()
        }]);

        if (error) throw error;

        alert("🚀 ¡Solicitud enviada con éxito al aliado comercial!");
        document.getElementById('modalEstudioExpress').style.display = 'none';
        document.getElementById('txtQueEstudio').value = '';
        document.getElementById('inputLabDestino').value = '';

    } catch (err) {
        console.error("❌ Error al solicitar estudio:", err);
        alert("Error al enviar solicitud: " + (err.message || 'Error de conexión'));
    } finally {
        if (btn) btn.disabled = false;
    }
}

function sanearNombreArchivo(nombreOriginal) {
    const extension = nombreOriginal.split('.').pop().toLowerCase();
    const nombreSinExt = nombreOriginal.substring(0, nombreOriginal.lastIndexOf('.'));
    const nombreLimpio = nombreSinExt
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .toLowerCase();
    const timestamp = Date.now();
    const hashRandom = Math.random().toString(36).substring(2, 7);
    return `${timestamp}_${hashRandom}_${nombreLimpio}.${extension}`;
}

function abrirModalHistorialEvidencias() {
    toggleSpeedDial();
    const modal = document.getElementById('modalHistorialEvidencias');
    if (modal) {
        modal.style.display = 'flex';
        cargarHistorialEvidencias();
    }
}

function cerrarModalHistorialEvidencias() {
    const modal = document.getElementById('modalHistorialEvidencias');
    if (modal) modal.style.display = 'none';
}

// Subida de evidencias
document.addEventListener('DOMContentLoaded', () => {
    const formEvidencia = document.getElementById('formSubirEvidencia');
    if (!formEvidencia) return;

    formEvidencia.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById('evidencia_archivo');
        const categoriaSelect = document.getElementById('evidencia_categoria');
        const descripcionInput = document.getElementById('evidencia_descripcion');
        const btn = document.getElementById('btnGuardarEvidencia');

        const categoria = categoriaSelect ? categoriaSelect.value : 'GENERAL';
        const descripcion = descripcionInput ? descripcionInput.value.trim() : '';
        const pacienteActualId = pacienteExistenteId || (localStorage.getItem('paciente_seleccionado_id') || new URLSearchParams(window.location.search).get('id'));

        if (!pacienteActualId) {
            alert("⚠️ No se detectó el ID del paciente. Por favor selecciona o busca un paciente.");
            return;
        }

        if (!fileInput || !fileInput.files.length) {
            alert("Por favor selecciona o toma una fotografía.");
            return;
        }

        const file = fileInput.files[0];
        const nombreArchivoSaneado = sanearNombreArchivo(file.name);
        const idClinicaActiva = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id') || 'sin_clinica';
        const filePath = `${pacienteActualId}/${idClinicaActiva}/${categoria}/${nombreArchivoSaneado}`;

        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';
            }

            const { data: { user } } = await fisioNet.auth.getUser();

            const { error: storageError } = await fisioNet.storage
                .from('expedientes-multimedia')
                .upload(filePath, file, { cacheControl: '3600', upsert: false });

            if (storageError) throw storageError;

            const { data: urlData } = await fisioNet.storage
                .from('expedientes-multimedia')
                .createSignedUrl(filePath, 3600);

            const urlFirmada = urlData?.signedUrl || '';

            const { error: dbError } = await fisioNet
                .from('paciente_evidencia_multimedia')
                .insert({
                    id_paciente: pacienteActualId,
                    id_profesional: user?.id,
                    id_clinica: idClinicaActiva,
                    categoria_especialidad: categoria,
                    url_imagen: urlFirmada,
                    ruta_storage: filePath,
                    descripcion: descripcion,
                    es_privado_clinica: true,
                    fecha_registro: new Date().toISOString(),
                    id_otp_origen: solicitudOTPActivaId || null,
                    fecha_autorizacion_otp: fechaOtpStr || new Date().toISOString()
                });

            if (dbError) throw dbError;

            alert("🔒 ¡Evidencia clínica guardada correctamente!");
            cerrarModalEvidenciaMultimedia();
            formEvidencia.reset();

            if (typeof cargarHistorialEvidencias === 'function') {
                cargarHistorialEvidencias();
            }

        } catch (err) {
            console.error("❌ Error al guardar evidencia:", err);
            alert(`Error al guardar: ${err.message || 'Error desconocido'}`);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '🚀 GUARDAR EVIDENCIA EN EXPEDIENTE';
            }
        }
    });
});

async function cargarHistorialEvidencias() {
    const contenedor = document.getElementById('contenedor_lista_evidencias');
    if (!contenedor) return;

    const idClinicaActiva = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');
    const pacienteActualId = pacienteExistenteId || localStorage.getItem('paciente_seleccionado_id');

    if (!pacienteActualId) {
        contenedor.innerHTML = `<div class="alert alert-warning text-center">No hay un paciente seleccionado actualmente.</div>`;
        return;
    }

    try {
        contenedor.innerHTML = `<p class="text-center text-muted my-5"><i class="fas fa-spinner fa-spin me-2"></i>Cargando expediente multimedia privado...</p>`;

        const { data, error } = await fisioNet
            .from('paciente_evidencia_multimedia')
            .select('*')
            .eq('id_paciente', pacienteActualId)
            .eq('id_clinica', idClinicaActiva)
            .order('fecha_registro', { ascending: false });

        if (error) throw error;

        const evidenciasConFirmas = await Promise.all((data || []).map(async (item) => {
            if (item.ruta_storage) {
                const { data: signedData } = await fisioNet.storage
                    .from('expedientes-multimedia')
                    .createSignedUrl(item.ruta_storage, 3600);
                if (signedData?.signedUrl) {
                    item.url_imagen = signedData.signedUrl;
                }
            }
            return item;
        }));

        coleccionEvidenciasPaciente = evidenciasConFirmas;
        renderizarListaEvidencias(coleccionEvidenciasPaciente);

    } catch (err) {
        console.error("❌ Error al cargar historial de evidencias:", err);
        contenedor.innerHTML = `<div class="alert alert-danger text-center">Error al cargar evidencias: ${err.message}</div>`;
    }
}

function renderizarListaEvidencias(lista) {
    const contenedor = document.getElementById('contenedor_lista_evidencias');
    if (!contenedor) return;

    if (!lista || lista.length === 0) {
        contenedor.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="fas fa-folder-open fa-3x mb-3 text-slate-300"></i>
                <h6>No hay evidencias registradas para este paciente en esta clínica.</h6>
                <small>Usa la opción <b>📸 Subir Foto</b> para añadir imágenes o estudios.</small>
            </div>
        `;
        return;
    }

    let html = '';
    lista.forEach(item => {
        const fechaObj = new Date(item.fecha_registro);
        const fechaFormateada = fechaObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const esPDF = item.url_imagen?.toLowerCase().endsWith('.pdf');
        const catNombre = item.categoria_especial || item.categoria_especialidad || 'EVIDENCIA';
        
        html += `
            <div class="tarjeta-evidencia-item p-3 border rounded mb-2 bg-white shadow-sm" onclick="verEvidenciaPantallaCompleta('${item.url_imagen}', ${esPDF}, '${catNombre}', '${fechaFormateada}', '${(item.descripcion || '').replace(/'/g, "\\'")}')">
                <div class="d-flex gap-3 align-items-center">
                    <div style="width: 70px; height: 70px; border-radius: 10px; overflow: hidden; background: #0f172a; display: flex; justify-content: center; align-items: center; flex-shrink: 0;">
                        ${esPDF 
                            ? `<i class="fas fa-file-pdf text-danger fa-2x"></i>` 
                            : `<img src="${item.url_imagen}" style="width: 100%; height: 100%; object-fit: cover;" alt="Evidencia">`
                        }
                    </div>
                    <div style="flex: 1;">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="badge bg-dark text-info font-monospace" style="font-size: 0.68rem;">${catNombre}</span>
                            <small class="text-muted fw-bold" style="font-size: 0.7rem;"><i class="far fa-clock me-1"></i>${fechaFormateada}</small>
                        </div>
                        <p class="mb-0 fw-bold text-dark small" style="line-height: 1.3;">
                            ${item.descripcion || 'Sin descripción adicional.'}
                        </p>
                    </div>
                    <div class="text-secondary opacity-50">
                        <i class="fas fa-expand-alt fa-lg"></i>
                    </div>
                </div>
            </div>
        `;
    });

    contenedor.innerHTML = html;
}

function filtrarEvidenciasLocales() {
    const fechaSeleccionada = document.getElementById('filtro_fecha_evidencia')?.value;
    const catSeleccionada = document.getElementById('filtro_categoria_evidencia')?.value;

    let resultado = [...coleccionEvidenciasPaciente];

    if (fechaSeleccionada) {
        resultado = resultado.filter(item => item.fecha_registro.split('T')[0] === fechaSeleccionada);
    }

    if (catSeleccionada && catSeleccionada !== 'TODAS') {
        resultado = resultado.filter(item => {
            const cat = item.categoria_especial || item.categoria_especialidad || '';
            return cat.startsWith(catSeleccionada);
        });
    }

    renderizarListaEvidencias(resultado);
}

function resetFiltrosEvidencia() {
    const fechaInput = document.getElementById('filtro_fecha_evidencia');
    const catInput = document.getElementById('filtro_categoria_evidencia');
    if (fechaInput) fechaInput.value = '';
    if (catInput) catInput.value = 'TODAS';
    renderizarListaEvidencias(coleccionEvidenciasPaciente);
}

function verEvidenciaPantallaCompleta(url, esPDF, categoria, fecha, descripcion) {
    const modalFull = document.getElementById('modalVisorFullscreen');
    const contenedorArchivo = document.getElementById('full_contenido_archivo');
    if (!modalFull || !contenedorArchivo) return;
    
    document.getElementById('full_titulo_evidencia').innerText = `Categoría: ${categoria}`;
    document.getElementById('full_fecha_evidencia').innerText = `Fecha: ${fecha}`;
    document.getElementById('full_descripcion_evidencia').innerText = descripcion ? `"${descripcion}"` : '';

    if (esPDF) {
        contenedorArchivo.innerHTML = `<iframe src="${url}" style="width: 100%; height: 100%; border: none; border-radius: 12px; background: white;"></iframe>`;
    } else {
        contenedorArchivo.innerHTML = `<img src="${url}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" alt="Evidencia Fullscreen">`;
    }

    modalFull.style.display = 'flex';
}

function cerrarVisorFullscreen() {
    const modalFull = document.getElementById('modalVisorFullscreen');
    if (modalFull) {
        modalFull.style.display = 'none';
        const contenedor = document.getElementById('full_contenido_archivo');
        if (contenedor) contenedor.innerHTML = '';
    }
}



// ============================================================================
// 📁 ANEXAR ESTUDIO DE GABINETE / LABORATORIO AL EXPEDIENTE CLÍNICO
// ============================================================================
async function anexarEstudioAExpedienteClinica(idEstudioGabinete, categoriaEspecialidad, archivoInputId, descripcionInputId, btnAccionId) {
    const fileInput = document.getElementById(archivoInputId);
    const descripcionInput = document.getElementById(descripcionInputId);
    const btnAccion = document.getElementById(btnAccionId);

    const descripcion = descripcionInput ? descripcionInput.value.trim() : '';
    const pacienteActualId = pacienteExistenteId || localStorage.getItem('paciente_seleccionado_id') || new URLSearchParams(window.location.search).get('id');
    const idClinicaActiva = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id') || 'sin_clinica';

    if (!pacienteActualId) {
        alert("⚠️ No se detectó el ID del paciente. Por favor selecciona o busca un paciente.");
        return;
    }

    if (!fileInput || !fileInput.files.length) {
        alert("⚠️ Por favor selecciona un archivo o fotografía del estudio.");
        return;
    }

    const file = fileInput.files[0];
    const nombreArchivoSaneado = sanearNombreArchivo(file.name);
    const filePath = `${pacienteActualId}/${idClinicaActiva}/${categoriaEspecialidad}/${nombreArchivoSaneado}`;

    try {
        if (btnAccion) {
            btnAccion.disabled = true;
            btnAccion.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Anexando a Expediente...';
        }

        const { data: { user } } = await fisioNet.auth.getUser();

        // 1. Subir el archivo al bucket de almacenamiento
        const { error: storageError } = await fisioNet.storage
            .from('expedientes-multimedia')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (storageError) throw storageError;

        // 2. Generar URL firmada para previsualización instantánea
        const { data: urlData } = await fisioNet.storage
            .from('expedientes-multimedia')
            .createSignedUrl(filePath, 3600);

        const urlFirmada = urlData?.signedUrl || '';

        // 3. Registrar en la bitácora de evidencias multimedia del paciente
        const { error: dbError } = await fisioNet
            .from('paciente_evidencia_multimedia')
            .insert({
                id_paciente: pacienteActualId,
                id_profesional: user?.id,
                id_clinica: idClinicaActiva,
                categoria_especialidad: categoriaEspecialidad,
                url_imagen: urlFirmada,
                ruta_storage: filePath,
                descripcion: descripcion || `Estudio de ${categoriaEspecialidad} anexado desde gabinete`,
                es_privado_clinica: true,
                fecha_registro: new Date().toISOString(),
                id_otp_origen: solicitudOTPActivaId || sessionStorage.getItem(`otp_id_paciente_${pacienteActualId}`) || null,
                fecha_autorizacion_otp: fechaOtpStr || new Date().toISOString()
            });

        if (dbError) throw dbError;

        // 4. Actualizar el estado del estudio en la tabla de gabinete/laboratorio
        if (idEstudioGabinete) {
            const { error: updateGabineteErr } = await fisioNet
                .from('estudios_gabinete')
                .update({
                    estado_estudio: 'ENTREGADO_EXPEDIENTE',
                    ruta_resultado_expediente: filePath,
                    fecha_entrega_resultado: new Date().toISOString()
                })
                .eq('id', idEstudioGabinete);

            if (updateGabineteErr) console.warn("⚠️ No se pudo actualizar estado en estudios_gabinete:", updateGabineteErr.message);
        }

        alert("🔒 ¡Estudio anexado con éxito al expediente clínico del paciente!");

        // Recargar el historial si el módulo está disponible
        if (typeof cargarHistorialEvidencias === 'function') {
            cargarHistorialEvidencias();
        }

    } catch (err) {
        console.error("❌ Error al anexar estudio al expediente:", err);
        alert(`Error al guardar expediente: ${err.message || 'Error desconocido'}`);
    } finally {
        if (btnAccion) {
            btnAccion.disabled = false;
            btnAccion.innerHTML = '<i class="fas fa-paperclip me-2"></i> ANEXAR A EXPEDIENTE';
        }
    }
}


// ============================================================================
// 🔔 VERIFICADOR DE NUEVA EVIDENCIA / ESTUDIOS NO VISTOS (EXCLUSIVO DEL DOCTOR)
// ============================================================================
async function verificarNotificacionesEstudios(idPacienteActual) {
    if (!idPacienteActual) return;

    try {
        // 1. Obtener la sesión del usuario activo
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return;

        // 🎯 FILTRO ESTRUCTURAL ESTRICTO:
        // Solo cuenta registros donde id_paciente coincida Y id_profesional sea EXCLUSIVAMENTE el doctor en sesión
       const { count, error } = await fisioNet
    .from('paciente_evidencia_multimedia')
    .select('id', { count: 'exact', head: true })
    .eq('id_paciente', idPacienteActual)
    .eq('id_profesional', user.id)
    .in('categoria_especialidad', ['GABINETE', 'LABORATORIO']);


        if (error) throw error;

        // Si hay estudios dirigidos a este doctor, inyectamos la alerta visual únicamente para él
        if (count && count > 0) {
            inyectarBadgeBoton('btn-historial-galeria', count);
            inyectarBadgeBoton('btn-acciones-clinicas', count);
        }
    } catch (err) {
        console.error("❌ Error consultando notificaciones exclusivas de estudios:", err.message);
    }
}

function inyectarBadgeBoton(idBoton, cantidad) {
    const btn = document.getElementById(idBoton);
    if (!btn) return;

    // Evitamos duplicar badges si ya existe
    let badge = btn.querySelector('.badge-notificacion-estudio');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'badge-notificacion-estudio badge rounded-pill bg-danger position-absolute top-0 start-100 translate-middle shadow-sm';
        badge.style.fontSize = '0.70rem';
        badge.style.zIndex = '10';
        btn.style.position = 'relative';
        btn.appendChild(badge);
    }
    badge.innerText = cantidad;
}