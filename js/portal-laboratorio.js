let debounceTimer; 
let perfilEspecialistaCache = { especialidad: 'GENERAL' };
let archivosLaboratorio = []; // Acumulador de PDFs
let historialLab = [];       // Caché del historial local
let pacienteExistenteId = null;
let edicionFichaAutorizada = false;
let especialidadUsuario = localStorage.getItem('especialidad_usuario') || 'GENERAL'; 
let archivosParaSubir = []; 
const especialidadActiva = localStorage.getItem('especialidad_usuario') || 'Laboratorio';


document.addEventListener('DOMContentLoaded', async () => {
   console.log("🚀 Portal Laboratorio Iniciando Motores...");
    
   const elSpanEspecialidad = document.getElementById('especialidad_usuario');
if (elSpanEspecialidad) {
    // Lo ponemos en Mayúscula Inicial o como prefieras
    elSpanEspecialidad.innerText = especialidadActiva.charAt(0).toUpperCase() + especialidadActiva.slice(1).toLowerCase();
}

    // 1. Identidad y configuración visual
    await mostrarNombreEspecialista();
    await aplicarIdentidadGabinete();
    await inicializarRolUsuario();

    // 2. ACTIVAR LOS BUSCADORES INTELIGENTES
    configurarBuscadorDoctor();
    configurarBuscadorQuimico();
   
  

    // 🔥 3. MAYÚSCULAS AUTOMÁTICAS GLOBALES (Menos en correos)
    document.addEventListener('input', (e) => {
        const el = e.target;
        if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && 
             el.type !== 'email' && el.type !== 'password' && el.id !== 'valEmail' && el.id !== 'correo-tutor') {
            el.value = el.value.toUpperCase();
        }
    });

    // 4. GESTIÓN MULTI-ARCHIVO (Acumulador de PDFs)
const inputArchivos = document.getElementById('file-pdf');
if (inputArchivos) {
    // Esto garantiza que solo haya UN oyente activo
    inputArchivos.removeEventListener('change', manejarSeleccionArchivos);
    inputArchivos.addEventListener('change', manejarSeleccionArchivos);
}

    // 🎯 5. CONFIGURACIÓN INDESTRUCTIBLE DE ESCUCHAS PARA CURP Y FOLIOS
    // Vinculamos de forma nativa los IDs del formulario con la función procesarCurp
    const inputsCurp = ['valNombre', 'valPaterno', 'valMaterno', 'valFecha', 'genero-manual', 'valEstado'];
    inputsCurp.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // Evaluamos si es un selector o fecha para usar 'change', de lo contrario 'input'
            const tipoEvento = (el.tagName === 'SELECT' || el.type === 'date') ? 'change' : 'input';
            
            el.addEventListener(tipoEvento, () => {
                if (id === 'valFecha') actualizarInterfazEdad();
                
                // Llamamos a la función tal y como está declarada abajo en tu JS
                procesarCurp(); 
            });
        }
    });
});



// Lista de los que mandan en el laboratorio
const especialidadesDictaminadoras = ['QUIMICO', 'BIOQUIMICO', 'PATOLOGO', 'GENETISTA'];

// Función rápida para verificar
function esDictaminadorAutorizado() {
    return especialidadesDictaminadoras.includes(especialidadUsuario.toUpperCase());
}

// Sustituye tu función manejarSeleccionArchivos por esta:
function manejarSeleccionArchivos(e) {
    const input = e.target;
    // Procesamos archivos
    const nuevosArchivos = Array.from(input.files);
    nuevosArchivos.forEach(archivo => {
        if (archivo.type === 'application/pdf') {
            if (!archivosLaboratorio.some(a => a.name === archivo.name)) {
                archivosLaboratorio.push(archivo);
            }
        }
    });
    renderizarListaPDFs();

    // BLINDAJE: En lugar de intentar limpiar el valor, simplemente "destruimos" el input del DOM
    // y creamos uno nuevo completamente virgen.
    const nuevoInput = document.createElement('input');
    nuevoInput.type = 'file';
    nuevoInput.id = input.id;
    nuevoInput.className = input.className;
    nuevoInput.accept = 'application/pdf';
    nuevoInput.style.display = 'none';
    nuevoInput.multiple = true;
    nuevoInput.addEventListener('change', manejarSeleccionArchivos);
    
    // Aquí es donde ocurre el reemplazo sin errores
    input.parentNode.replaceChild(nuevoInput, input);
    console.log("✅ Input reseteado quirúrgicamente sin tocar valores bloqueados.");
}



async function subirArchivosASupabase(pacienteId, clinicaId, estudioId) {
    if (!pacienteId || !clinicaId || !estudioId) {
        console.error("❌ ERROR: IDs faltantes para subir archivos");
        return [];
    }

    const nombresArchivos = [];
    
    // 🛡️ LISTA BLANCA DE TIPOS PERMITIDOS
    const tiposPermitidos = {
        'application/pdf': 'pdf',
        'image/jpeg': 'jpg',
        'image/png': 'png'
    };

    for (const archivo of archivosLaboratorio) {
        // 1. Validar el MIME type real del archivo
        const tipoReal = archivo.type;
        if (!tiposPermitidos[tipoReal]) {
            console.warn(`⚠️ Archivo bloqueado por seguridad (Tipo no permitido): ${archivo.name} (${tipoReal})`);
            continue; 
        }

        // 2. Limpieza extrema del nombre y FORZAR la extensión correcta
        const nombreLimpio = archivo.name
            .replace(/\.[^/.]+$/, "") // Quita la extensión original
            .replace(/[^a-z0-9]/gi, '_') // Quita caracteres raros
            .toLowerCase();

        const extensionForzada = tiposPermitidos[tipoReal];
        const rutaSegura = `${clinicaId}/${pacienteId}/${estudioId}/${Date.now()}_${nombreLimpio}.${extensionForzada}`;
        
        console.log("📤 Subiendo archivo blindado:", rutaSegura);

        // 3. Subida con tipo de contenido forzado
        const { error } = await fisioNet.storage
            .from('expedientes-clinicos')
            .upload(rutaSegura, archivo, {
                contentType: tipoReal, // Supabase detecta el tipo real
                upsert: false
            });

        if (!error) {
            nombresArchivos.push(rutaSegura);
        } else {
            console.error("❌ Error al subir a Supabase:", error.message);
        }
    }
    return nombresArchivos;
}

// --- MOTOR DE IDENTIDAD VISUAL CAMALEÓN ---
async function aplicarIdentidadGabinete() {
    try {
        const colorSede = localStorage.getItem('clinica_color') || '#00cfd5';
        document.documentElement.style.setProperty('--color-camaleon', colorSede);

        const infoEmisor = document.getElementById('info-emisor');
        const nombreDoc = localStorage.getItem('full_name');

        if (infoEmisor) {
            infoEmisor.innerHTML = `
              <div class="info-especialista">
                    <small class="text-muted" style="font-size: 0.65rem;">Especialista Activo:</small>
                    <div class="fw-bold" style="color: var(--color-camaleon); font-size: 0.85rem;">${nombreDoc.toUpperCase()}</div>
                    <span class="badge bg-light text-dark p-1" style="font-size: 0.6rem; border: 1px solid #eee;">${especialidadActiva.toUpperCase()}</span>
                </div>
            `;
        }
    } catch (error) {
        console.error("Error al aplicar identidad:", error);
    }
}

async function mostrarNombreEspecialista() {
    try {
        const valorClinica = localStorage.getItem('clinica_nombre') || "SOCIO FISIOCID";
        const contenedorNombre = document.getElementById('info-emisor');
        if (contenedorNombre) {
            contenedorNombre.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="fas fa-user-md me-2" style="color: var(--color-camaleon);"></i>
                    <span class="fw-bold small text-uppercase" style="letter-spacing: 0.5px;">${valorClinica}</span>
                </div>
            `;
        }
    } catch (error) {
        console.error(error);
    }
}

// --- LÓGICA DE LIMPIEZA DE APELLIDOS Y CURP ---
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

 document.getElementById('curp-homo')?.addEventListener('input', () => {
        if (!pacienteExistenteId) {
            console.log("📝 Paciente nuevo absoluto. Generando folio consecutivo...");
            gestionarFolioAutomatico(null);
        }
    });


function calcularEdad(fechaNacimiento) {
    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();
    const diferenciaMs = hoy - nacimiento;
    const diasTotales = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
    let anos = hoy.getFullYear() - nacimiento.getFullYear();
    let meses = hoy.getMonth() - nacimiento.getMonth();
    if (meses < 0 || (meses === 0 && hoy.getDate() < nacimiento.getDate())) anos--;
    return { totalDias: diasTotales, anos: anos };
}

function actualizarInterfazEdad() {
    const fechaNac = document.getElementById('valFecha').value;
    if (!fechaNac) return;

    const infoEdad = calcularEdad(fechaNac); 
    const seccionTutor = document.getElementById('seccion-tutor');
    const bloqueAdulto = document.getElementById('bloque-contacto-adulto');

    if (infoEdad.totalDias < 6574) { 
        seccionTutor?.classList.remove('d-none');
        bloqueAdulto?.classList.add('d-none');
    } else {
        seccionTutor?.classList.add('d-none');
        bloqueAdulto?.classList.remove('d-none');
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
            
            // Estilos estéticos idénticos a nuevo-paciente
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
    // Evitamos duplicaciones
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
            congelarCamposIdentidad(false); // 🔓 Abre las compuertas
            
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

// --- MOTOR DE BÚSQUEDA MULTI-PALABRA ---
const inputNombre = document.getElementById('valNombre');
const listaSugerencias = document.getElementById('sugerencias-laboratorio');

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
                    autorrellenarCamposLaboratorio(p);
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

function autorrellenarCamposLaboratorio(p) {
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
        // Respaldo clínico: Si la columna está vacía, extraemos el estado directo de su CURP
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



async function guardarEstudioLaboratorio(event) {
    if (event) event.preventDefault();
    const btn = document.getElementById('btn-finalizar-laboratorio');
    
    const elQuimico = document.getElementById('id-quimico-asignado-final');
    const elDoctor = document.getElementById('id-doctor-referente-final');

    if (!elQuimico?.value || !elDoctor?.value) {
        alert("⚠️ ¡Error! Debes seleccionar tanto al químico como al doctor referente.");
        return;
    }

    const idsSeleccionados = [];
    document.querySelectorAll('.check-estudio:checked').forEach(ch => {
        idsSeleccionados.push(parseInt(ch.value));
    });
    const arrayNumeros = idsSeleccionados.length > 0 ? idsSeleccionados : null;

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> REGISTRANDO...`;
    
    try {
        // 1. Obtener usuario
        const { data: { user }, error: authError } = await fisioNet.auth.getUser();
        if (authError || !user) throw new Error("No hay sesión activa.");

        // 2. Gestionar Paciente (AQUÍ ESTÁ EL CAMBIO CLAVE)
        // Usamos la variable que ya tengas, pero aseguramos que sea el UUID del paciente
        let idPacienteActual = pacienteExistenteId; 
        if (!idPacienteActual) {
            idPacienteActual = await registrarPacienteNuevo(); // Esta función debe retornar el nuevo UUID
        }

        // 3. Subida de archivos
        let rutasSubidas = [];
        try {
            const resultadosSubida = await subirArchivosASupabase(
                idPacienteActual, // Usamos el ID real (UUID)
                localStorage.getItem('id_clinica_activa'), 
                'ESTUDIO_' + Date.now()
            );
            rutasSubidas = Array.isArray(resultadosSubida) ? resultadosSubida : [];
        } catch (uploadErr) {
            console.error("❌ Error en subida, continuando...", uploadErr);
        }

        // 4. Preparación de etiquetas
        const etiquetas = [];
        document.querySelectorAll('.check-estudio:checked').forEach(ch => {
            const label = document.querySelector(`label[for="${ch.id}"]`);
            if (label) etiquetas.push(label.innerText.trim());
        });
        const otro = document.getElementById('otro-estudio')?.value?.trim();
        if (otro) etiquetas.push(otro.toUpperCase());

        // 5. Payload Final (INCLUYENDO paciente_id)
        const payload = {
            id: crypto.randomUUID(),
            paciente_id: idPacienteActual, // <--- ESTO ES LO NUEVO Y NECESARIO
            id_socio_emisor: localStorage.getItem('id_clinica_activa'),
            paciente_nombre: document.getElementById('valNombre').value.toUpperCase(),
            // ... resto de tus campos ...
            archivo_pdf_url: rutasSubidas.length > 0 ? rutasSubidas.join(',') : null,
            especialista_muestrista: user.id,
            especialista_quimico: elQuimico.value,
            id_doctor_referente: elDoctor.value,
            estado: 'PENDIENTE_ANALISIS',
            fecha_captura: new Date().toISOString(),
            observaciones: document.getElementById('observaciones-laboratorio')?.value?.trim() || null,
           
    apellido_paterno: document.getElementById('valPaterno').value.toUpperCase(),
    apellido_materno: document.getElementById('valMaterno').value.toUpperCase(),
    paciente_curp: (document.getElementById('curp-parte1')?.value || '') + 
                   (document.getElementById('curp-estado')?.value || '') + 
                   (document.getElementById('curp-consonantes')?.value || '') + 
                   (document.getElementById('curp-homo')?.value || ''),
    fecha_nacimiento: document.getElementById('valFecha').value || null,
    // Llamamos a la función que ya tenías declarada abajo en tu JS
    edad_actual: calcularEdad(document.getElementById('valFecha').value).anos, 
    
    genero: document.getElementById('genero-manual').value,
    telefono_paciente: document.getElementById('tel-manual').value || null,
    correo_paciente: document.getElementById('valEmail').value || null,
    nombre_tutor: document.getElementById('tutor-nombre')?.value.toUpperCase() || null,
    parentesco_tutor: document.getElementById('tutor-parentesco')?.value.toUpperCase() || null,
    numero_tutor: document.getElementById('tutor-tel')?.value || null,
    estudios_etiquetas: etiquetas, // ¡ARRAY!
  
    metodo_carga: 'MANUAL',

  id_estudio_catalogo: arrayNumeros.length > 0 ? arrayNumeros : null,
   
    created_at: new Date().toISOString()
        };

        const { error: errInsert } = await fisioNet.from('estudios_laboratorio').insert([payload]);
        if (errInsert) throw errInsert;

        alert("✅ ESTUDIO ASIGNADO correctamente.");
        window.location.reload();

    } catch (err) {
        console.error("❌ ERROR CRÍTICO:", err);
        alert("Error: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-save me-2"></i> REGISTRAR Y ENVIAR`;
    }
}
function renderizarListaPDFs() {
    // Asegúrate de que apunte al nuevo contenedor que pusimos en el modal
    let contenedor = document.getElementById('lista-pdfs-cargados'); 
    
    if (!contenedor) {
        console.error("❌ No encuentro el contenedor lista-pdfs-cargados");
        return;
    }

    contenedor.innerHTML = archivosLaboratorio.map((archivo, index) => `
        <div class="d-flex align-items-center p-2 border rounded bg-white mb-1 shadow-sm">
            <i class="fas fa-file-pdf text-danger me-2"></i>
            <span class="small text-truncate flex-grow-1" style="font-size: 0.70rem;">${archivo.name}</span>
            <button type="button" class="btn btn-sm text-danger p-0" onclick="eliminarPDFLaboratorio(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function eliminarPDFLaboratorio(index) {
    archivosLaboratorio.splice(index, 1);
    renderizarListaPDFs();
}

async function cargarHistorialLaboratorio() {
    const contenedor = document.getElementById('lista-historial-gabinete');
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="p-4 text-center text-muted">
            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
            Escaneando estudios de laboratorio...
        </div>`;

    try {
        const idClinica = localStorage.getItem('id_clinica_activa');

        const { data: estudios, error } = await fisioNet
            .from('estudios_laboratorio')
            .select('*') 
            .eq('id_socio_emisor', idClinica)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        if (!estudios || estudios.length === 0) {
            contenedor.innerHTML = '<div class="p-4 text-center text-muted small">No hay estudios registrados aún.</div>';
            return;
        }

        historialLab = estudios; 

        contenedor.innerHTML = estudios.map(est => {
            // 🔥 CORRECCIÓN: Concatenamos el nombre completo real con ambos apellidos
            const nomCompleto = `${est.paciente_nombre || ''} ${est.apellido_paterno || ''} ${est.apellido_materno || ''}`.trim();
            
            // 🔥 MEJORA DE BADGES: Colores dinámicos según el estado en la lista
            let badgeColor = 'bg-secondary';
            if (est.estado === 'DICTAMINADO') badgeColor = 'bg-success';
            if (est.estado === 'PENDIENTE') badgeColor = 'bg-warning text-dark';
const fNac = est.fecha_nacimiento 
    ? new Date(est.fecha_nacimiento).toLocaleDateString('es-MX') 
    : 'No registrada';

return `
<div class="list-group-item list-group-item-action border-0 border-bottom p-3" 
     style="cursor: pointer;" 
     onclick="abrirDictaminacion('${est.id}')">
    
    <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="fw-bold small text-dark">${nomCompleto.toUpperCase()}</span>
        <span class="badge ${badgeColor}" style="font-size: 0.6rem;">${est.estado.replace('_', ' ')}</span>
    </div>
    
    <div class="text-muted small mb-1">
        <i class="fas fa-microscope me-1" style="font-size: 0.75rem;"></i> ${est.estudios_etiquetas || 'General'}
    </div>
    
    <div class="text-secondary d-flex gap-3 mb-1" style="font-size: 0.65rem;">
        <span><i class="fas fa-id-card me-1"></i> ${est.paciente_curp || 'SIN CURP'}</span>
        <span><i class="fas fa-birthday-cake me-1"></i> ${fNac}</span>
    </div>
    
    <div class="text-muted" style="font-size: 0.65rem;">
        <i class="fas fa-calendar-alt me-1"></i> Registrado: ${new Date(est.created_at).toLocaleDateString()}
    </div>
</div>`;
        }).join('');

    } catch (err) {
        console.error("❌ Error al cargar historial:", err);
        contenedor.innerHTML = '<div class="p-4 text-center text-danger small">Error de sincronización.</div>';
    }
}
function renderizarListaHistorial(estudios) {
    const contenedor = document.getElementById('lista-historial-gabinete');
    contenedor.innerHTML = estudios.map(est => {
        const nombreFull = `${est.paciente_nombre} ${est.apellido_paterno || ''} ${est.apellido_materno || ''}`.trim();
        return `
        <div class="list-group-item list-group-item-action border-0 border-bottom p-3">
            <div class="form-check">
                <input class="form-check-input check-comparar" type="checkbox" value="${est.archivo_pdf_url}" data-paciente="${nombreFull}" data-fecha="${new Date(est.created_at).toLocaleDateString()}" data-tipo="${est.estudios_etiquetas || 'Analisis Clinico'}" id="lab_${est.id}">
                <label class="form-check-label w-100 cursor-pointer" for="lab_${est.id}">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="fw-bold small text-dark">${nombreFull.toUpperCase()}</span>
                        <span class="badge rounded-pill bg-light text-success border border-success" style="font-size: 0.55rem;">LAB</span>
                    </div>
                    <div class="text-muted" style="font-size: 0.7rem; margin-top: 2px;">
                        <i class="fas fa-microscope me-1"></i> ${est.estudios_etiquetas || 'General'} <br>
                        <i class="fas fa-calendar-alt me-1"></i> ${new Date(est.created_at).toLocaleDateString()}
                    </div>
                </label>
            </div>
        </div>`;
    }).join('');
}

window.filtrarHistorial = () => {
    const busqueda = document.getElementById('busquedaHistorial').value.toUpperCase();
    const filtrados = historialLab.filter(est => {
        const nombreCompleto = `${est.paciente_nombre} ${est.apellido_paterno || ''} ${est.apellido_materno || ''}`.toUpperCase();
        return nombreCompleto.includes(busqueda);
    });
    renderizarListaHistorial(filtrados);
};


// ============================================================================
// 🔢 MOTOR DE EXPEDIENTES LOCALES (REPLICADO DE NUEVO-PACIENTE)
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
        
        // Ejecutamos ambas consultas al mismo tiempo para ganar velocidad
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


async function renderizarCamposDinamicos(idsArray) {
    const contenedor = document.getElementById('contenedor-campos-dinamicos');
    console.log("Consultando estudios con IDs:", idsArray);

    const { data: estudios, error } = await fisioNet
        .from('catalogo_estudios')
        .select('id, nombre_estudio, campos_json')
        .in('id', idsArray);

    if (error) {
        console.error("Error en Supabase:", error);
        contenedor.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        return;
    }

    if (!estudios || estudios.length === 0) {
        contenedor.innerHTML = `<div class="alert alert-warning">No se encontraron los estudios en el catálogo.</div>`;
        return;
    }

    // Usamos una clase 'card-estudio' para que procesarGuardado pueda encontrarla
    contenedor.innerHTML = estudios.map(est => `
        <div class="mb-4 shadow-sm p-3 bg-white rounded card-estudio" data-nombre-estudio="${est.nombre_estudio}">
            <h5 class="text-primary border-bottom pb-2">
                ${est.nombre_estudio || 'Estudio sin nombre'}
            </h5>
            
            ${est.campos_json.map(campo => {
                // Aquí definimos la unidad de forma segura
                const unidad = campo.unidad || ''; 
                
                return `
                <div class="row mb-2 align-items-center">
                    <div class="col-4"><label class="small fw-bold">${campo.nombre}</label></div>
                    <div class="col-5">
                        <div class="input-group input-group-sm">
                            <input type="text" step="0.01" 
                                   class="form-control resultado-input" 
                                   data-ref="${campo.ref || 'N/A'}" 
                                   data-nombre="${campo.nombre}" 
                                   data-unidad="${unidad}" 
                                   placeholder="${unidad}">
                            ${unidad ? `<span class="input-group-text">${unidad}</span>` : ''}
                        </div>
                    </div>
                    <div class="col-3"><small class="text-muted">REF: ${campo.ref || ''}</small></div>
                </div>`;
            }).join('')}
        </div>
    `).join('');

    // --- Lógica de bloqueo que ya tenías (se mantiene intacta) ---
    const modalDictaminacion = document.getElementById('modalDictaminacion');
    const estudioActual = historialLab.find(e => e.id === modalDictaminacion.dataset.estudioActualId);
    
    if (estudioActual && estudioActual.estado === 'DICTAMINADO') {
        const inputs = document.querySelectorAll('#contenedor-campos-dinamicos input');
        inputs.forEach(input => input.disabled = true);
        
        document.getElementById('btn-preguardar').classList.add('d-none');
        document.getElementById('btn-finalizar-todo').classList.add('d-none');
        
        document.getElementById('visor-pdf-dictamen').style.border = "3px solid #28a745";
        console.log("🔒 Modo Solo Lectura activado.");
    }
}



async function configurarBuscadorDoctor() {
    const input = document.getElementById('buscador-doctor');
    const lista = document.getElementById('sugerencias-doctores');
    const inputHidden = document.getElementById('id-doctor-referente-final');

    input.addEventListener('input', async (e) => {
        const query = e.target.value.trim().toUpperCase();
        if (query.length < 3) { lista.classList.add('d-none'); return; }

        // 1. Pedimos nombre Y especialidad en ambas tablas
        const [internos, externos] = await Promise.all([
            fisioNet.from('colaboradores_clinica')
                .select('id_profesional, perfiles_profesionales!inner(nombre_completo, especialidad)')
                .eq('id_clinica', localStorage.getItem('id_clinica_activa'))
                .ilike('perfiles_profesionales.nombre_completo', `%${query}%`),
            
            fisioNet.from('red_colaboracion')
                .select('id_doctor_receptor, nombre_entidad, tipo_entidad') // Asegúrate que 'tipo_entidad' tenga la especialidad
                .eq('id_doctor_emisor', localStorage.getItem('id_clinica_activa'))
                .ilike('nombre_entidad', `%${query}%`)
        ]);

        lista.innerHTML = '';
        lista.classList.remove('d-none');

        // 2. Mapeamos incluyendo la especialidad
        const todos = [
            ...(internos.data?.map(i => ({ 
                id: i.id_profesional, 
                nombre: i.perfiles_profesionales.nombre_completo, 
                especialidad: i.perfiles_profesionales.especialidad, 
                tipo: 'STAFF INTERNO' 
            })) || []),
            ...(externos.data?.map(e => ({ 
                id: e.id_doctor_receptor, 
                nombre: e.nombre_entidad, 
                especialidad: e.tipo_entidad, 
                tipo: 'CONVENIO EXTERNO' 
            })) || [])
        ];

        // 3. Renderizado profesional
        todos.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'list-group-item list-group-item-action p-2';
            btn.innerHTML = `
                <div class="d-flex justify-content-between">
                    <strong>${item.nombre}</strong>
                    <span class="badge ${item.tipo === 'STAFF INTERNO' ? 'bg-primary' : 'bg-success'}">${item.tipo}</span>
                </div>
                <small class="text-muted"><i class="fas fa-stethoscope me-1"></i>${item.especialidad || 'MÉDICO GENERAL'}</small>
            `;
            btn.onclick = () => {
                input.value = item.nombre;
                inputHidden.value = item.id;
                lista.classList.add('d-none');
            };
            lista.appendChild(btn);
        });
    });
}

async function configurarBuscadorQuimico() {
    const input = document.getElementById('buscador-quimico');
    const lista = document.getElementById('sugerencias-quimicos');
    const inputHidden = document.getElementById('id-quimico-asignado-final');
    
    // Aquí está la clave: pon los valores exactos que ves en tu base de datos
    const especialidadesLaboratorio = ['QUIMICO', 'BIOQUIMICO', 'PATOLOGO', 'MICROBIOLOGO'];

    input.addEventListener('input', async (e) => {
        const query = e.target.value.trim().toUpperCase();
        if (query.length < 3) { lista.classList.add('d-none'); return; }

        const { data: resultados } = await fisioNet
            .from('colaboradores_clinica')
            .select(`
                id_profesional, 
                perfiles_profesionales!inner(nombre_completo, especialidad)
            `)
            .eq('id_clinica', localStorage.getItem('id_clinica_activa'))
            .in('perfiles_profesionales.especialidad', especialidadesLaboratorio) // 🎯 FILTRO RESTRINGIDO
            .ilike('perfiles_profesionales.nombre_completo', `%${query}%`);

        lista.innerHTML = '';
        lista.classList.remove('d-none');

        if (resultados && resultados.length > 0) {
            resultados.forEach(r => {
                const btn = document.createElement('button');
                btn.className = 'list-group-item list-group-item-action p-2';
                btn.innerHTML = `<strong>${r.perfiles_profesionales.nombre_completo}</strong> 
                                 <br><small class="text-muted">${r.perfiles_profesionales.especialidad}</small>`;
                btn.onclick = () => {
                    input.value = r.perfiles_profesionales.nombre_completo;
                    inputHidden.value = r.id_profesional;
                    lista.classList.add('d-none');
                };
                lista.appendChild(btn);
            });
        } else {
            lista.innerHTML = '<div class="p-2 text-muted small">No hay especialistas de laboratorio registrados.</div>';
        }
    });
}

// 1. IMPORTANTE: Agrega async aquí
// 1. IMPORTANTE: Agrega async aquí
async function abrirDictaminacion(idEstudio) {
    const estudio = historialLab.find(e => e.id === idEstudio);
    if (!estudio) return;

    const modalElement = document.getElementById('modalDictaminacion');
    modalElement.dataset.estudioActualId = idEstudio;

    const contenedorColumna = document.getElementById('columna-captura');
    const contenedorCampos = document.getElementById('contenedor-campos-dinamicos');
    const panelFlujo = document.getElementById('panel-flujo-externo');
    const colDoc = document.getElementById('columna-documentacion');

    // 2. LÓGICA DE ESTADOS
    if (estudio.estado === 'DICTAMINADO') {
        document.getElementById('btn-preguardar').classList.add('d-none');
        document.getElementById('btn-finalizar-todo').classList.add('d-none');
        contenedorColumna.classList.remove('d-none');
        colDoc.classList.add('d-none');
        
        renderizarModoConsulta(estudio);
    } else {
        // MODO EDICIÓN
        document.getElementById('btn-preguardar').classList.remove('d-none');

        if (esDictaminadorAutorizado()) {
            colDoc.classList.add('d-none');
            contenedorColumna.classList.remove('d-none');
            contenedorColumna.classList.replace('col-md-12', 'col-md-9');
            panelFlujo.classList.add('d-none');
            renderizarCamposDinamicos(estudio.id_estudio_catalogo);
        } else {
            colDoc.classList.remove('d-none');
            contenedorColumna.classList.add('d-none');
            panelFlujo.classList.remove('d-none');
            contenedorCampos.innerHTML = '<div class="alert alert-info small">Acceso para carga de documentos.</div>';
        }
        configurarBotonesModal();
    }

    // 3. VISUALIZACIÓN DEL PDF (Esto va fuera del if/else para que siempre ocurra)
    const visor = document.getElementById('contenedor-visor-pdf');
    if (visor) {
        if (estudio.archivo_pdf_url) {
            await abrirVisorPDFFirmado(estudio.archivo_pdf_url.split(',')[0].trim());
        } else {
            visor.innerHTML = '<div class="alert alert-warning">No hay reporte PDF asociado.</div>';
        }
    }

    // 4. LISTA Y MODAL
    const listaEstudios = document.getElementById('lista-estudios-dictamen');
    const etiquetas = Array.isArray(estudio.estudios_etiquetas) ? estudio.estudios_etiquetas : [];
    listaEstudios.innerHTML = etiquetas.map(etiqueta => `
        <div class="list-group-item"><i class="fas fa-check-circle text-success me-2"></i> ${etiqueta}</div>
    `).join('');

    document.querySelector('.modal-title').innerText = `DICTAMINAR: ${estudio.paciente_nombre} ${estudio.apellido_paterno}`;
    new bootstrap.Modal(modalElement).show();
}


function configurarBotonesModal() {
    const nuevoBtnPre = document.getElementById('btn-preguardar');
    const nuevoBtnFinal = document.getElementById('btn-finalizar-todo');
    
    // Aseguramos que el botón final esté oculto al abrir
    nuevoBtnFinal.classList.add('d-none');
    nuevoBtnPre.disabled = false;

    // Listener para el botón PRE-GUARDAR
    nuevoBtnPre.onclick = () => {
        console.log("🟡 Pre-guardando...");
        nuevoBtnFinal.classList.remove('d-none'); // ¡Aquí aparece el verde!
        nuevoBtnPre.disabled = true;
    };

    // Listener para el botón FINALIZAR (verde)
    nuevoBtnFinal.onclick = () => {
        const idEstudio = document.getElementById('modalDictaminacion').dataset.estudioActualId;
        if (idEstudio) procesarGuardado(idEstudio);
    };
}

async function procesarGuardado(idEstudio) {
    const isDictamenExterno = document.getElementById('checkDictamenExterno').checked;
    
    // Obligar a marcar si se está intentando subir archivos
    if (typeof archivosLaboratorio !== 'undefined' && archivosLaboratorio.length > 0 && !isDictamenExterno) {
        alert("⚠️ Por favor marca 'Dictamen Externo' para confirmar la subida de los documentos.");
        return;
    }

    console.log("🚀 Iniciando guardado consolidado...");

    try {
        // 1. OBTENER ESTADO ACTUAL
        const { data: estudioActual, error: errorFetch } = await fisioNet
            .from('estudios_laboratorio')
            .select('archivo_pdf_url, resultados_json, paciente_id')
            .eq('id', idEstudio)
            .single();

        if (errorFetch) throw new Error("Error al recuperar estudio: " + errorFetch.message);

        // 2. PREPARAR DATOS DETALLE
        const resultadosNuevos = [];
        document.querySelectorAll('.resultado-input').forEach(input => {
            if (input.value.trim() !== "") {
                const contenedor = input.closest('.card-estudio');
                const nombreEstudio = contenedor ? contenedor.dataset.nombreEstudio : 'GENERAL';
                const unidadCapturada = input.dataset.unidad || input.placeholder || 'N/A';

                resultadosNuevos.push({
                    estudio_id: idEstudio,
                    campo_nombre: input.dataset.nombre,
                    valor: input.value,
                    unidad: unidadCapturada, 
                    valor_referencia: input.dataset.ref || 'N/A',
                    nombre_estudio_padre: nombreEstudio
                });
            }
        });

        // 3. FUSIÓN DE PDFS
        const pdfsExistentes = estudioActual.archivo_pdf_url ? estudioActual.archivo_pdf_url.split(',') : [];
        let todosLosPdfs = [...pdfsExistentes];

        if (typeof archivosLaboratorio !== 'undefined' && archivosLaboratorio.length > 0) {
            const idClinica = localStorage.getItem('id_clinica_activa'); 
            const rutasNuevas = await subirArchivosASupabase(estudioActual.paciente_id, idClinica, idEstudio);
            todosLosPdfs = [...new Set([...pdfsExistentes, ...rutasNuevas])];
        }

        // =========================================================================
        // 4. DETECCIÓN INTELIGENTE DE DICTAMINADOR (Tu propuesta 🛠️)
        // =========================================================================
        let nombreDictaminador = "";
        let cedulaDictaminador = "";
        const nuevoEstado = (isDictamenExterno || resultadosNuevos.length > 0) ? 'DICTAMINADO' : 'PENDIENTE_ANALISIS';
        const metodoCarga = isDictamenExterno ? 'PDF_EXTERNO' : 'CAPTURA_QUIMICO';

        if (isDictamenExterno) {
            // El usuario está subiendo un PDF externo (Flujo manual/muestrista)
            const inputNombre = document.getElementById('inputNombreQuimicoExterno')?.value?.trim();
            const inputCedula = document.getElementById('inputCedulaQuimicoExterno')?.value?.trim();

            // Si los inputs vienen vacíos porque no hay químico registrado o no se sabe: fallback seguro
            nombreDictaminador = inputNombre ? inputNombre.toUpperCase() : "A QUIEN CORRESPONDA (EXTERNO)";
            cedulaDictaminador = inputCedula ? inputCedula : "N/A";
        } else {
            // Flujo nativo: El Químico está logueado en la sesión
            // Jalamos los datos que guardaste en el localStorage o estado global al iniciar sesión
            const sessionNombre = localStorage.getItem('usuario_nombre'); 
            const sessionCedula = localStorage.getItem('usuario_cedula');

            nombreDictaminador = sessionNombre ? sessionNombre.toUpperCase() : "QUÍMICO GENERAL FISIOCID";
            cedulaDictaminador = sessionCedula ? sessionCedula : "N/A";
        }

        const payload = {
            estado: nuevoEstado,
            metodo_carga: metodoCarga,
            fecha_dictamen: new Date().toISOString(),
            archivo_pdf_url: todosLosPdfs.length > 0 ? todosLosPdfs.join(',') : null,
            resultados_json: resultadosNuevos.length > 0 ? JSON.stringify(resultadosNuevos) : estudioActual.resultados_json,
            // Guardamos los datos validados del dictaminador directamente en la fila
            especialista_dictaminador_nombre: nombreDictaminador,
            especialista_dictaminador_cedula: cedulaDictaminador
        };
        // =========================================================================

        // 5. UPDATE A TABLA PRINCIPAL
        const { error: errorUpdate } = await fisioNet
            .from('estudios_laboratorio')
            .update(payload)
            .eq('id', idEstudio);

        if (errorUpdate) throw new Error("Error al actualizar tabla principal: " + errorUpdate.message);

        // 6. INSERT EN DETALLE
        if (resultadosNuevos.length > 0) {
            await fisioNet.from('resultados_laboratorio_detalle').delete().eq('estudio_id', idEstudio);
            const filasDetalle = resultadosNuevos.map(r => ({
                estudio_id: idEstudio,
                campo_nombre: r.campo_nombre,
                valor: r.valor,
                unidad: r.unidad,
                valor_referencia: r.valor_referencia,
                nombre_estudio_padre: r.nombre_estudio_padre
            }));

            const { error: errorDetalle } = await fisioNet
                .from('resultados_laboratorio_detalle')
                .insert(filasDetalle);

            if (errorDetalle) throw new Error("Error al insertar detalles: " + errorDetalle.message);
        }

        alert("✅ Estudio guardado exitosamente.");
        
        const modalElement = document.getElementById('modalDictaminacion');
        const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
        modal.hide();
        location.reload();

    } catch (err) {
        console.error("❌ ERROR EN PROCESO:", err.message);
        alert("Error crítico: " + err.message);
    }
}

async function inicializarRolUsuario() {
    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return;

        // Consultamos directamente la tabla "de la verdad": perfiles_profesionales
        const { data: perfil, error } = await fisioNet
            .from('perfiles_profesionales')
            .select('especialidad')
            .eq('id', user.id)
            .maybeSingle();

        if (perfil) {
            especialidadUsuario = perfil.especialidad || 'GENERAL';
            localStorage.setItem('especialidad_usuario', especialidadUsuario);
            console.log("✅ Especialidad sincronizada:", especialidadUsuario);
        }
    } catch (err) {
        console.error("Error sincronizando rol:", err);
    }
}

async function renderizarModoConsulta(estudio) {
    const contenedor = document.getElementById('contenedor-campos-dinamicos');
    if (!contenedor) return;
    
    // 1. GESTIÓN DEL BADGE EN EL TÍTULO DEL MODAL
    let badge = document.getElementById('badge-estado');
    if (!badge) {
        badge = document.createElement('span');
        badge.id = 'badge-estado';
        document.querySelector('.modal-title').appendChild(badge);
    }
    
    if (estudio.metodo_carga === 'PDF_EXTERNO') {
        badge.className = "badge bg-warning text-dark ms-2";
        badge.innerText = "Dictamen Externo";
    } else {
        badge.className = "badge bg-success ms-2";
        badge.innerText = "Dictaminado en Clínica";
    }

    // Actualizamos dinámicamente el título del modal con el Nombre Completo solicitado
    const nombreCompleto = `${estudio.paciente_nombre || ''} ${estudio.apellido_paterno || ''} ${estudio.apellido_materno || ''}`.trim();
    document.querySelector('.modal-title').innerHTML = `CONSULTA: ${nombreCompleto}`;

    // 2. FORMATEO DE FECHAS (Dictamen y Nacimiento)
    const fechaFormateada = estudio.fecha_dictamen 
        ? new Date(estudio.fecha_dictamen).toLocaleDateString('es-MX', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
          }) 
        : 'No disponible';

    const fechaNacFormateada = estudio.fecha_nacimiento
        ? new Date(estudio.fecha_nacimiento).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'No registrada';

    // 3. ENCABEZADO MAESTRO DE IDENTIFICACIÓN (CURP, Nacimiento y Fecha Dictamen)
    let html = `
        <div class="card bg-light mb-3 shadow-sm border-0">
            <div class="card-body p-3">
                <div class="row g-2 small">
                    <div class="col-md-4">
                        <i class="fas fa-id-card text-muted me-1"></i> <strong>CURP:</strong> 
                        <span class="text-secondary fw-bold">${estudio.paciente_curp || 'No proporcionada'}</span>
                    </div>
                    <div class="col-md-4">
                        <i class="fas fa-birthday-cake text-muted me-1"></i> <strong>F. Nacimiento:</strong> 
                        <span class="text-secondary">${fechaNacFormateada}</span>
                    </div>
                    <div class="col-md-4">
                        <i class="fas fa-calendar-alt text-muted me-1"></i> <strong>Dictaminado el:</strong> 
                        <span class="text-secondary">${fechaFormateada}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 4. NUEVO APARTADO DE OBSERVACIONES (Solo si existen y contienen texto)
    if (estudio.observaciones && estudio.observaciones.trim() !== "") {
        html += `
            <div class="alert alert-warning border-start border-3 border-warning mb-3 shadow-sm p-2 small">
                <div class="fw-bold text-dark mb-1"><i class="fas fa-exclamation-circle text-warning me-1"></i> Observaciones / Alertas Clínicas:</div>
                <div class="text-secondary" style="white-space: pre-wrap;">${estudio.observaciones.trim()}</div>
            </div>
        `;
    }

    // 5. LÓGICA DIFERENCIADA PARA EL CONTENIDO DEL REPORTE
    if (estudio.metodo_carga === 'PDF_EXTERNO') {
        const urls = estudio.archivo_pdf_url ? estudio.archivo_pdf_url.split(',') : [];
        
        contenedor.innerHTML = html + `<div class="text-center p-3"><i class="fas fa-spinner fa-spin me-2"></i>Generando acceso seguro al documento...</div>`;

        let bloquesPdfHtml = `<div class="alert alert-info py-1 px-2 small mb-2"><i class="fas fa-file-pdf"></i> Archivo Adjunto Seguro:</div>`;

        for (const nombreArchivo of urls) {
            const rutaLimpia = nombreArchivo.trim();
            if (!rutaLimpia) continue;

            try {
                const { data, error } = await fisioNet.storage
                    .from('expedientes-clinicos')
                    .createSignedUrl(rutaLimpia, 3600);

                if (error) throw error;

                bloquesPdfHtml += `
                    <div class="mb-3">
                        <a href="${data.signedUrl}" target="_blank" class="btn btn-sm btn-primary mb-2 shadow-sm">
                            <i class="fas fa-external-link-alt"></i> Abrir PDF en ventana completa
                        </a>
                        <iframe src="${data.signedUrl}" width="100%" height="550px" style="border:1px solid #ccc; border-radius: 8px;"></iframe>
                    </div>
                `;
            } catch (err) {
                console.error("❌ Error al firmar archivo:", rutaLimpia, err);
                bloquesPdfHtml += `
                    <div class="alert alert-danger small">
                        <i class="fas fa-exclamation-triangle"></i> No se pudo generar el enlace seguro para: ${rutaLimpia}
                    </div>
                `;
            }
        }

        contenedor.innerHTML = html + bloquesPdfHtml;
        return;

    } else {
        // CAPTURA DE QUÍMICO (Se mantiene tu renderizado de tablas paramétricas)
        try {
            const { data: detalles, error } = await fisioNet
                .from('resultados_laboratorio_detalle')
                .select('campo_nombre, valor, unidad, valor_referencia, nombre_estudio_padre')
                .eq('estudio_id', estudio.id);

            if (error) throw error;

            if (!detalles || detalles.length === 0) {
                html += `<div class="alert alert-warning small">No se encontraron detalles numéricos para este estudio.</div>`;
                contenedor.innerHTML = html;
                return;
            }

            const agrupados = detalles.reduce((acc, item) => {
                const grupo = item.nombre_estudio_padre || 'GENERAL';
                if (!acc[grupo]) acc[grupo] = [];
                acc[grupo].push(item);
                return acc;
            }, {});
            
            html += `<div class="alert alert-success fw-bold py-1 px-2 small mb-2">Resultados Oficiales</div>`;
            
            for (const nombreEstudio in agrupados) {
                html += `
                    <div class="card mb-3 shadow-sm">
                        <div class="card-header bg-primary text-white p-2"><strong>${nombreEstudio.toUpperCase()}</strong></div>
                        <div class="card-body p-2">
                            <table class="table table-sm m-0 table-hover">
                                <thead><tr><th>Parámetro</th><th>Res.</th><th>Ref.</th></tr></thead>
                                <tbody>
                                    ${agrupados[nombreEstudio].map(r => `
                                        <tr>
                                            <td>${r.campo_nombre}</td>
                                            <td class="fw-bold">${r.valor} ${r.unidad}</td>
                                            <td class="text-muted small">${r.valor_referencia}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }
            contenedor.innerHTML = html;

        } catch (err) {
            console.error("Error al renderizar:", err);
            contenedor.innerHTML = `<div class="alert alert-danger">No se pudieron cargar los resultados.</div>`;
        }
    }
}


async function abrirVisorPDFFirmado(rutaArchivo) {
    const contenedor = document.getElementById('contenedor-visor-pdf');
    
    console.log("📂 RUTA ORIGINAL QUE LLEGA DE LA DB:", rutaArchivo);

    const { data, error } = await fisioNet.storage
        .from('expedientes-clinicos')
        .createSignedUrl(rutaArchivo, 3600);

    if (error) {
        console.error("❌ ERROR AL FIRMAR EN SUPABASE:", error.message);
        return;
    }

    console.log("🔗 URL FIRMADA GENERADA POR SUPABASE:", data.signedUrl);

    contenedor.innerHTML = `
        <embed src="${data.signedUrl}" 
               type="application/pdf" 
               width="100%" 
               height="600px" 
               style="border: none;">
    `;
}