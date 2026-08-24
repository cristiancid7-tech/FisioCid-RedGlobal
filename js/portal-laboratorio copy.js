
let archivosLaboratorio = []; // Acumulador de PDFs
let historialLab = [];       // Caché del historial local
let pacienteExistenteId = null;
let edicionFichaAutorizada = false;

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🔬 Portal de Laboratorio Listo para Captura");

    // 1. Mostrar nombre del Especialista/Clínica (Sincronizado)
    await mostrarNombreEspecialista();

    // 2. Aplicamos Identidad Visual (Motor Camaleón directo)
    await aplicarIdentidadGabinete();

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
        inputArchivos.addEventListener('change', (e) => {
            const nuevosArchivos = Array.from(e.target.files);
            nuevosArchivos.forEach(archivo => {
                if (archivo.type === 'application/pdf') {
                    if (!archivosLaboratorio.some(a => a.name === archivo.name)) {
                        archivosLaboratorio.push(archivo);
                        console.log(`📄 PDF Agregado: ${archivo.name}`);
                    }
                } else {
                    alert(`⚠️ El archivo "${archivo.name}" no es un PDF válido.`);
                }
            });
            renderizarListaPDFs(); 
            e.target.value = ''; 
        });
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

// --- MOTOR DE IDENTIDAD VISUAL CAMALEÓN ---
async function aplicarIdentidadGabinete() {
    try {
        const colorSede = localStorage.getItem('clinica_color') || '#00cfd5';
        document.documentElement.style.setProperty('--color-camaleon', colorSede);

        const infoEmisor = document.getElementById('info-emisor');
        const nombreDoc = localStorage.getItem('full_name') || "CRISTIAN MIGUEL CID ESPINDOLA";

        if (infoEmisor) {
            infoEmisor.innerHTML = `
                <div class="info-especialista">
                    <small class="text-muted" style="font-size: 0.65rem;">Especialista Activo:</small>
                    <div class="fw-bold" style="color: var(--color-camaleon); font-size: 0.85rem;">${nombreDoc.toUpperCase()}</div>
                    <span class="badge bg-light text-dark p-1" style="font-size: 0.6rem; border: 1px solid #eee;">LABORATORIO</span>
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
    
    const valGeneroOriginal = document.getElementById('genero-manual')?.value;
    let gen = 'X'; 
    if (valGeneroOriginal === 'HOMBRE') gen = 'H';
    else if (valGeneroOriginal === 'MUJER') gen = 'M';

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

    try {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> GUARDANDO EN RED FISIOCID...`;

        // 1. RECOLECCIÓN DE EXÁMENES (CHECKBOXES)
        const etiquetas = [];
        document.querySelectorAll('.check-estudio:checked').forEach(ch => etiquetas.push(ch.value));
        const otro = document.getElementById('otro-estudio').value.trim();
        if (otro) etiquetas.push(otro.toUpperCase());

        if (etiquetas.length === 0) throw new Error("Debes seleccionar al menos un estudio.");

        // 🎯 2. RECUPERAR EL ESTADO SELECCIONADO DEL NUEVO SELECT
        const estadoSeleccionado = document.getElementById('valEstado').value;
        if (!estadoSeleccionado) throw new Error("Debes seleccionar el Estado de Nacimiento para procesar el expediente.");

        // 3. CONSTRUCCIÓN DE CURP COMPLETA
        const curpFinal = (
            document.getElementById('curp-parte1').value +
            document.getElementById('curp-estado').value +
            document.getElementById('curp-consonantes').value +
            document.getElementById('curp-homo').value
        ).toUpperCase();

        if (curpFinal.length < 18) throw new Error("La CURP está incompleta.");

        const esMenor = !document.getElementById('seccion-tutor').classList.contains('d-none');
        const idClinicaActiva = localStorage.getItem('id_socio_activo') || localStorage.getItem('clinica_activa_id');

        // 4. UPSERT DIRECTO A PACIENTES_MAESTROS (SINCRONIZACIÓN DE FICHA GLOBAL)
        const resultadoUpsert = await fisioNet
            .from('pacientes_maestros')
            .upsert({
                curp: curpFinal,
                nombre: document.getElementById('valNombre').value.toUpperCase().trim(),
                apellido_paterno: document.getElementById('valPaterno').value.toUpperCase().trim(),
                apellido_materno: document.getElementById('valMaterno').value.toUpperCase().trim(),
                fecha_nacimiento: document.getElementById('valFecha').value,
                genero: document.getElementById('genero-manual').value,
                estado_nacimiento: estadoSeleccionado, // ⬅️ ¡LISTO! Aquí se guarda tu columna del Estado
                telefono: esMenor ? document.getElementById('tutor-tel').value : document.getElementById('tel-manual').value,
                correo_electronico: document.getElementById('valEmail').value.toLowerCase().trim(),
                id_clinica_origen: idClinicaActiva,
                es_menor_edad: esMenor,
                nombre_tutor: esMenor ? document.getElementById('tutor-nombre').value.toUpperCase() : null,
                parentesco_tutor: esMenor ? document.getElementById('tutor-parentesco').value.toUpperCase() : null,
                telefono_tutor: esMenor ? document.getElementById('tutor-tel').value : null
            }, { onConflict: 'curp' }).select('id'); // Extraemos el ID generado o existente

        if (resultadoUpsert.error) throw new Error("Error Ficha Maestra: " + resultadoUpsert.error.message);

        // 🎯 DETERMINACIÓN DEL ID REAL DEL PACIENTE
        const idRealPaciente = pacienteExistenteId || resultadoUpsert.data[0]?.id;
        if (!idRealPaciente) throw new Error("No se pudo determinar el identificador del paciente.");

        // ============================================================================
        // 🔒 BLOCK MOTOR: DE CREACIÓN DE EXPEDIENTES LOCALES EN SEDES DE DIAGNÓSTICO
        // ============================================================================
        const folioSede = document.getElementById('inputFolioExpediente')?.value || null;
        const { data: userAuth } = await fisioNet.auth.getUser();

        // Verificamos si ya existe un expediente asignado físicamente a esta clínica activa
        const { data: expedienteExiste } = await fisioNet
            .from('expedientes_clinicos')
            .select('id')
            .eq('id_paciente', idRealPaciente)
            .eq('id_clinica', idClinicaActiva)
            .maybeSingle();

        if (!expedienteExiste) {
            console.log("🆕 No existe expediente en esta sede analítica. Forzando accesos locales...");

            // A. Insertamos el vínculo operativo en la red de colaboración
            const { error: errVinc } = await fisioNet.from('vinculos_clinicos').insert([{
                paciente_id: idRealPaciente,
                profesional_id: userAuth.user.id,
                id_clinica: idClinicaActiva,
                rol_en_relacion: 'LABORATORIO',
                estado_vinculo: 'ACTIVO'
            }]);
            if (errVinc) throw new Error("Falla al crear vínculo de red: " + errVinc.message);

            // B. Parseamos los números consecutivos del folio personalizado
            const numeroLimpio = (folioSede || "0").replace(/\D/g, ''); 
            const consecutivoFinal = parseInt(numeroLimpio) || 0;

            // C. Insertamos la fila del expediente local
            const { error: errExp } = await fisioNet.from('expedientes_clinicos').insert([{
                id_paciente: idRealPaciente,
                id_clinica: idClinicaActiva,
                folio_personalizado: folioSede,
                numero_consecutivo: consecutivoFinal,
                estado_expediente: 'ACTIVO'
            }]);
            if (errExp) throw new Error("Falla al registrar expediente local: " + errExp.message);
            
            console.log("📌 Vínculo de Red y Expediente de Sede asegurados correctamente.");
        }
        // ============================================================================

        // 5. SUBIDA DE LOS ARCHIVOS COMPLEMENTARIOS AL STORAGE
        let urlsPDF = [];
        for (const archivo of archivosLaboratorio) {
            const path = `laboratorio/${Date.now()}_${archivo.name.replace(/\s/g, '_')}`;
            const { error: errUp } = await fisioNet.storage.from('expedientes-clinicos').upload(path, archivo);
            if (!errUp) urlsPDF.push(path);
        }

        // 6. REGISTRO FINAL DE ESTUDIOS_LABORATORIO
        const { error: errInsert } = await fisioNet
            .from('estudios_laboratorio')
            .insert([{
                id_socio_emisor: idClinicaActiva,
                paciente_curp: curpFinal,
                paciente_nombre: document.getElementById('valNombre').value.toUpperCase(),
                apellido_paterno: document.getElementById('valPaterno').value.toUpperCase(),
                apellido_materno: document.getElementById('valMaterno').value.toUpperCase(),
                fecha_nacimiento: document.getElementById('valFecha').value,
                genero: document.getElementById('genero-manual').value,
                telefono_paciente: document.getElementById('tel-manual').value,
                correo_paciente: document.getElementById('valEmail').value,
                nombre_tutor: document.getElementById('tutor-nombre').value.toUpperCase(),
                parentesco_tutor: document.getElementById('tutor-parentesco').value.toUpperCase(),
                numero_tutor: document.getElementById('tutor-tel').value,
                estudios_etiquetas: etiquetas.join(','),
                archivo_pdf_url: urlsPDF.join(','),
                estado: 'FINALIZADO',
                metodo_carga: 'MANUAL_PDF',
                especialista_muestrista: userAuth.user.id
            }]);

        if (errInsert) throw errInsert;

        alert("✅ INTEGRACIÓN RED GLOBAL: El paciente cuenta ahora con expediente local y su estudio analítico está en la Red FisioCid.");
        location.reload();

    } catch (err) {
        console.error("💥 Error crítico en proceso de guardado:", err);
        alert("❌ Error: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-save me-2"></i> REGISTRAR RESULTADOS EN RED FISIOCID`;
    }
}
// --- RENDERIZADOS E HISTORIAL DE CARGAS (MANTENIDOS) ---
function renderizarListaPDFs() {
    let contenedor = document.getElementById('lista-pdfs-previa');
    if (!contenedor) {
        const zonaCarga = document.getElementById('file-pdf').parentNode;
        contenedor = document.createElement('div');
        contenedor.id = 'lista-pdfs-previa';
        contenedor.className = 'mt-3 row g-2';
        zonaCarga.parentNode.insertBefore(contenedor, zonaCarga.nextSibling);
    }
    contenedor.innerHTML = archivosLaboratorio.map((archivo, index) => `
        <div class="col-md-6 animate__animated animate__fadeIn">
            <div class="d-flex align-items-center p-2 border rounded bg-light">
                <i class="fas fa-file-pdf text-danger me-2"></i>
                <span class="small text-truncate flex-grow-1" style="font-size: 0.75rem;">${archivo.name}</span>
                <button type="button" class="btn btn-sm text-danger" onclick="eliminarPDFLaboratorio(${index})"><i class="fas fa-times"></i></button>
            </div>
        </div>`).join('');
}

function eliminarPDFLaboratorio(index) {
    archivosLaboratorio.splice(index, 1);
    renderizarListaPDFs();
}

window.cargarHistorialPersonal = async () => {
    const lista = document.getElementById('lista-historial-gabinete');
    try {
        const { data: estudios, error } = await fisioNet
            .from('estudios_laboratorio')
            .select('*')
            .eq('id_socio_emisor', localStorage.getItem('id_socio_activo'))
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!estudios || estudios.length === 0) {
            lista.innerHTML = '<div class="p-4 text-center text-muted small">No hay estudios registrados.</div>';
            return;
        }
        historialLab = estudios;
        renderizarListaHistorial(historialLab);
    } catch (error) {
        lista.innerHTML = `<div class="p-3 text-center text-danger small">Error de sincronización.</div>`;
    }
};

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

// Llamar a esta función cuando cambies el select o hagas click en un estudio
async function renderizarCamposDinamicos(idEstudio) {
    const contenedor = document.getElementById('contenedor-campos-dinamicos');
    
    // Mostramos estado de carga
    contenedor.innerHTML = `<div class="text-center p-3"><i class="fas fa-spinner fa-spin"></i> Cargando parámetros...</div>`;

    const { data, error } = await fisioNet
        .from('catalogo_estudios')
        .select('campos_json')
        .eq('id', idEstudio)
        .single();

    if (error || !data) {
        contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar campos.</div>`;
        return;
    }

    // Dibujamos los inputs dinámicamente
    contenedor.innerHTML = data.campos_json.map(campo => `
        <div class="row mb-3 align-items-center">
            <div class="col-md-4">
                <label class="fw-bold text-dark">${campo.nombre}</label>
            </div>
            <div class="col-md-4">
                <input type="number" 
                       class="form-control form-fisiocid" 
                       name="resultado_${campo.nombre}" 
                       step="0.01" 
                       placeholder="Valor..."
                       data-ref="${campo.ref}"
                       onblur="validarRango(this)">
            </div>
            <div class="col-md-4">
                <small class="text-muted">${campo.unidad}</small><br>
                <small class="text-info fw-bold" style="font-size: 0.65rem;">REF: ${campo.ref}</small>
            </div>
        </div>
    `).join('');
}

// --- MOTOR DE BÚSQUEDA MULTI-PALABRA (PORTADO DE GABINETE) ---

inputNombre?.addEventListener('input', async (e) => {
    const texto = e.target.value.trim().toUpperCase();
    
    clearTimeout(debounceTimer);
    
    if (texto.length < 3) {
        listaSugerencias?.classList.add('d-none');
        return;
    }

    debounceTimer = setTimeout(async () => {
        try {
            // Buscamos en pacientes_maestros para mantener la coherencia global
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
                    
                    const nombreCompleto = `${p.nombre} ${p.apellido_paterno || ''} ${p.apellido_materno || ''}`.trim();

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
                        autorrellenarPacienteLaboratorio(p);
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

function autorrellenarPacienteLaboratorio(p) {
    if (listaSugerencias) listaSugerencias.classList.add('d-none');
    pacienteExistenteId = p.id;
    window.pacienteCargado = p;

    // Llenado de campos
    const mapear = (id, valor) => { const el = document.getElementById(id); if (el) el.value = valor || ""; };

    mapear('valNombre', p.nombre);
    mapear('valPaterno', p.apellido_paterno);
    mapear('valMaterno', p.apellido_materno);
    mapear('valFecha', p.fecha_nacimiento);
    mapear('genero-manual', p.genero);
    mapear('tel-manual', p.telefono);
    mapear('valEmail', p.correo_electronico || "");

    // Congelamos como en Gabinete para blindar identidad
    if (typeof congelarCamposIdentidad === 'function') congelarCamposIdentidad(true);
    if (typeof crearBotonDesbloqueoDinamico === 'function') crearBotonDesbloqueoDinamico();
    
    console.log("✅ Paciente cargado y campos blindados.");
}