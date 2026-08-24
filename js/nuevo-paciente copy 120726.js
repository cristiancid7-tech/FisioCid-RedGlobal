// Variable maestra global única
let pacienteExistenteId = null;
let edicionFichaAutorizada = false;

document.addEventListener('DOMContentLoaded', async () => {
    aplicarIdentidadCamaleonica();

    // 🔥 1. MAYÚSCULAS AUTOMÁTICAS (Menos en correo)
    document.addEventListener('input', (e) => {
        const el = e.target;
        if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && 
             el.type !== 'email' && el.type !== 'password' && el.id !== 'valemail') {
            el.value = el.value.toUpperCase();
        }
    });

    const camposMaestros = ['valNombre', 'valPaterno', 'valMaterno', 'valFecha', 'valGenero', 'valEstado'];
    camposMaestros.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const tipoEvento = (el.tagName === 'SELECT' || el.type === 'date') ? 'change' : 'input';
            el.addEventListener(tipoEvento, () => {
                if (id === 'valNombre') {
                    const lista = document.getElementById('listaCitas');
                    if (el.value.length >= 3) { buscarEnAgenda(el.value); } 
                    else if (lista) { lista.style.display = 'none'; }
                }
                procesarCurp(); 
            });
        }
    });

    // 🎯 EL GATILLO MAESTRO DE CRISTIAN: La Homoclave dispara la gestión del Folio
 document.getElementById('curpHomo')?.addEventListener('input', () => {
        if (!pacienteExistenteId) {
            console.log("📝 Paciente nuevo absoluto. Generando folio consecutivo...");
            gestionarFolioAutomatico(null);
        }
    });

    document.addEventListener('click', (e) => {
        const lista = document.getElementById('listaCitas');
        if (lista && e.target.id !== 'valNombre') lista.style.display = 'none';
    });

    // 🎯 3. ACTIVAR MODALES
    document.getElementById('btnAyudaCurp')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('modalRenapo').style.display = 'flex';
    });
    document.getElementById('cerrarRenapo')?.addEventListener('click', () => {
        document.getElementById('modalRenapo').style.display = 'none';
    });
    document.getElementById('abrirVentanaOficial')?.addEventListener('click', () => {
        window.open('https://www.gob.mx/curp/', 'ConsultaCURP', `width=800,height=600,scrollbars=yes`);
        document.getElementById('modalRenapo').style.display = 'none';
        document.getElementById('curpHomo').focus();
    });

    document.getElementById('btnVerConvenios')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('modalConvenios').style.display = 'flex';
    });
    document.getElementById('cerrarConvenios')?.addEventListener('click', () => {
        document.getElementById('modalConvenios').style.display = 'none';
    });

   // 🚀 4. AUTOCARGA INICIAL POR URL (Si viene de la lista externa)
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('id');
    if (editId) { 
        await cargarPacienteParaEdicion(editId); 
        
        // 🎯 Si cargó por URL, también le ponemos el búnker y su botón al terminar
        setTimeout(() => {
            congelarCamposIdentidad(true);
            crearBotonDesbloqueoDinamico();
        }, 200);
    }
});

// ==========================================
// ⚡ MOTOR DE AUTOLLENADO GLOBAL
// ==========================================
async function cargarPacienteParaEdicion(id) {
    try {
        console.log("⏳ Cargando paciente ID:", id);
        const { data, error } = await fisioNet.from('pacientes_maestros').select('*').eq('id', id).single();
        
        if (error) throw error;
        
        if (data) {
            window.pacienteCargado = data; 
            pacienteExistenteId = data.id;  
            
            // Mandamos a rellenar la interfaz
            setTimeout(() => llenarFormularioCompleto(data), 100);
        }

    } catch (err) { 
        console.error("❌ Error al cargar datos:", err); 
    }
}

// Variable de control global (asegúrate de declararla fuera de la función)
let estaCargandoFormulario = false;

async function llenarFormularioCompleto(p) {
    // Si ya estamos cargando este paciente, no hacemos nada para evitar parpadeos
    if (estaCargandoFormulario) return;
    estaCargandoFormulario = true;

    console.log("💉 Rellenando formulario para:", p.nombre);

    // 1. Mapeo de campos por ID
    const mapIds = {
        'valNombre': p.nombre, 
        'valPaterno': p.apellido_paterno, 
        'valMaterno': p.apellido_materno,
        'valFecha': p.fecha_nacimiento, 
        'valGenero': p.genero, 
        'valEstado': p.estado_nacimiento, 
        'valOcupacion': p.ocupacion,
        'valTelefono': p.telefono, 
        'valemail': p.correo_electronico,
        'valDireccion': p.direccion_completa,
        'valEmergenciaNom': p.contacto_emergencia_nombre, 
        'valEmergenciaPar': p.contacto_emergencia_parentesco,
        'valEmergenciaTel': p.contacto_emergencia_tel
    };

    for (const [id, val] of Object.entries(mapIds)) {
        const el = document.getElementById(id); 
        if (el && val !== undefined && val !== null) {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            if (id === 'valFecha') actualizarInterfazEdad(); 
        }
    }

    // 2. Lógica para menores de edad
    if (p.es_menor_edad) {
        document.getElementById('seccion-tutor')?.classList.remove('d-none');
        document.getElementById('bloque-contacto-adulto')?.classList.add('d-none');
        document.getElementById('btnCopiarTutor')?.classList.remove('d-none');

        const datosTutor = {
            'tutor-nombre': p.nombre_tutor,
            'tutor-parentesco': p.parentesco_tutor,
            'tutor-tel': p.telefono_tutor,
            'correo-tutor': p.correo_tutor
        };

        for (const [id, val] of Object.entries(datosTutor)) {
            const el = document.getElementById(id);
            if (el && val !== undefined && val !== null) {
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }

    // 3. CURP
    if (p.curp && p.curp.length >= 18) {
        document.getElementById('curpAuto').value = p.curp.substring(0, 16).toUpperCase();
        document.getElementById('curpHomo').value = p.curp.substring(16, 18).toUpperCase();
    }

    // 4. Campos Clínicos
    const setByName = (name, val) => {
        const el = (name === 'checkConsentimiento') 
                   ? document.getElementById('checkConsentimiento') 
                   : document.querySelector(`[name="${name}"]`);
        
        if (el && val !== undefined && val !== null) {
            if (el.type === 'checkbox') {
                el.checked = (val === true || val === 'true');
            } else {
                el.value = val;
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };

    const medicos = [
        'alertas_seguridad', 'tipo_sangre', 'lateralidad', 'alergias', 
        'antecedentes_heredofamiliares', 'antecedentes_patologicos', 
        'antecedentes_no_patologicos', 'farmacologia_activa', 
        'antecedentes_quirurgicos', 'notas_precaucion'
    ];
    
    medicos.forEach(campo => setByName(campo, p[campo]));
    setByName('checkConsentimiento', p.acceso_red_activo); 

   // 5. Sincronización y Bloqueo Inteligente
    if (p.id) {
        await gestionarFolioAutomatico(p.id);
        
        // 💡 LÓGICA REFINADA
        // 1. Detectar si hay datos médicos (para bloquear campos médicos)
        const tieneInfoClinica = medicos.some(campo => p[campo] && String(p[campo]).trim() !== "");
        
        // 2. Detectar si el consentimiento está dado (para bloquear el checkbox específicamente)
        const consentimientoDado = (p.acceso_red_activo === true || p.acceso_red_activo === 'true');

        console.log("🔍 Info clínica existente?:", tieneInfoClinica, "¿Consentimiento?:", consentimientoDado);

        // 🔒 EJECUTAMOS EL BLOQUEO
        // Bloqueamos todo lo que tenga datos
        congelarCamposIdentidad(true); 
        
        // 🔑 Pintamos el botón si algo está bloqueado
        if ((tieneInfoClinica || consentimientoDado) && !document.getElementById('btnDesbloquearFicha')) {
            crearBotonDesbloqueoDinamico();
        }

        estaCargandoFormulario = false;
    } else {
        estaCargandoFormulario = false;
    }
}

// ============================================================================
// 🔒 GESTOR VISUAL DE BLOQUEO TOTAL (Identidad por ID y Antecedentes por Name)
// ============================================================================
function congelarCamposIdentidad(bloquear) {
    console.log(`🛡️ Sincronizando candados. Bloqueo masivo solicitado: ${bloquear}`);

    // Unificamos todos los campos que queremos proteger
    const todosLosCampos = [
        'valNombre', 'valPaterno', 'valMaterno', 'valFecha', 'valGenero', 'valEstado', 
        'curpAuto', 'curpHomo', 'valOcupacion', 'valTelefono', 'valemail', 'valDireccion',
        'valEmergenciaNom', 'valEmergenciaPar', 'valEmergenciaTel', 'tutor-nombre', 
        'tutor-parentesco', 'tutor-tel', 'correo-tutor', 'alertas_seguridad', 'tipo_sangre', 
        'lateralidad', 'alergias', 'antecedentes_heredofamiliares', 'antecedentes_patologicos', 
        'antecedentes_no_patologicos', 'farmacologia_activa', 'antecedentes_quirurgicos', 'checkConsentimiento'
    ];

   todosLosCampos.forEach(idOrName => {
        const el = document.getElementById(idOrName) || document.querySelector(`[name="${idOrName}"]`);
        
        if (el) {
            // Lógica inteligente para distintos tipos de input
            let estaLleno = false;
            
            if (el.type === 'checkbox') {
                estaLleno = el.checked; // Está lleno si está marcado
            } else {
                const valor = el.value ? el.value.trim() : "";
                estaLleno = valor !== "" && valor !== "SELECCION" && valor !== "SELECCIONAR ESTADO --" && valor !== "NO SABE";
            }
            
            const aplicarBloqueo = bloquear && estaLleno;

            // Aplicamos bloqueo
            if (el.type === 'checkbox') {
                el.disabled = aplicarBloqueo; 
            } else {
                el.readOnly = aplicarBloqueo;
                if (el.tagName === 'SELECT') el.disabled = aplicarBloqueo;
                
                // Estilos visuales para inputs y selects
                el.style.backgroundColor = aplicarBloqueo ? "#edf2f7" : "#ffffff";
                el.style.color = aplicarBloqueo ? "#4a5568" : "#000000";
                el.style.cursor = aplicarBloqueo ? "not-allowed" : "text";
            }
        }
    });

    // 3. CANDADO EXTRA para botones
    const btnAyudaCurp = document.getElementById('btnAyudaCurp');
    if (btnAyudaCurp) {
        btnAyudaCurp.style.pointerEvents = bloquear ? "none" : "auto";
        btnAyudaCurp.style.opacity = bloquear ? "0.5" : "1";
    }
}

function crearBotonDesbloqueoDinamico() {
    const tituloSeccion = document.querySelector('h2') || 
                          document.querySelector('.main-title') || 
                          document.querySelector('.card-title') ||
                          document.querySelector('h3');
    
    if (document.getElementById('btnDesbloquearFicha')) return;

    if (tituloSeccion) {
        const btnKey = document.createElement('button');
        btnKey.id = 'btnDesbloquearFicha';
        btnKey.type = 'button';
        btnKey.className = 'btn btn-warning btn-sm';
        btnKey.innerHTML = '<i class="fas fa-lock"></i> ✏️ Corregir Datos de Identidad';
        btnKey.style = "padding: 6px 14px; font-size: 14px; border-radius: 8px; margin-left: 15px; background-color: #ecc94b; color: #000; border: none; cursor: pointer; font-weight: bold; font-family: inherit; display: inline-block; vertical-align: middle;";
        
        btnKey.addEventListener('click', async () => {
            const esMenor = window.pacienteCargado?.es_menor_edad;
            const telefonoDestino = esMenor ? window.pacienteCargado?.telefono_tutor : window.pacienteCargado?.telefono;
            
            if (!telefonoDestino) {
                alert("⚠️ Error: El paciente no tiene un teléfono registrado para el envío del código.");
                return;
            }

            const tokenSeguridad = Math.floor(100000 + Math.random() * 900000);
            alert(`🛡️ PROTOCOLO DE EDICIÓN FISIOCID:\nCódigo enviado al: ${telefonoDestino}\n👉 (Código Beta actual: ${tokenSeguridad})`);

            const codigoIngresado = prompt("🔒 Ingrese el código de 6 dígitos para habilitar la escritura:");
            
            if (String(codigoIngresado) === String(tokenSeguridad)) {
                edicionFichaAutorizada = true; 
                
                // 🔓 1. Desbloqueamos pasando 'false' (esto dejará todos los campos editables)
                congelarCamposIdentidad(false); 
                
                // 2. Feedback visual inmediato
                btnKey.innerHTML = '<i class="fas fa-lock-open"></i> Modo Edición Activo';
                btnKey.style.backgroundColor = "#48bb78";
                btnKey.style.color = "#ffffff";
                btnKey.disabled = true;

                // 3. Cambiamos el texto del botón principal de guardado para dar claridad
                const btnSubmit = document.querySelector('button[type="submit"]');
                if (btnSubmit) {
                    btnSubmit.innerHTML = '<i class="fas fa-sync"></i> ACTUALIZAR DATOS MAESTROS';
                    btnSubmit.classList.replace('btn-primary', 'btn-success');
                }
            } else {
                alert("❌ Código incorrecto. Los campos permanecen protegidos.");
            }
        });
        
        tituloSeccion.appendChild(btnKey);
    }
}

async function buscarEnAgenda(texto) {
    const lista = document.getElementById('listaCitas');
    if (!texto || texto.trim().length < 3) {
        if (lista) lista.style.display = 'none';
        return;
    }

    const entradaUsuario = texto.trim().toUpperCase();

    try {
        // 1. Rompemos la cadena por espacios omitiendo espacios vacíos
        const palabras = entradaUsuario.split(/\s+/).filter(p => p.length > 0);
        
        // 🌍 BÚSQUEDA GLOBAL: Apuntamos a toda la tabla de pacientes_maestros sin filtrar por id_clinica
        let query = fisioNet.from('pacientes_maestros').select('*');

        // 2. 🎯 MOTOR DE FILTRADO MULTI-PALABRA GLOBAL
        palabras.forEach(palabra => {
            if (palabra.includes('/') || palabra.includes('-') || (palabra.length === 4 && !isNaN(palabra))) {
                query = query.ilike('fecha_nacimiento', `%${palabra}%`);
            } else {
                query = query.or(`nombre.ilike.%${palabra}%,apellido_paterno.ilike.%${palabra}%,apellido_materno.ilike.%${palabra}%,curp.ilike.%${palabra}%`);
            }
        });

        // Traemos las coincidencias con límite de 5
        const { data: pacientes, error } = await query.limit(5);
        if (error) throw error;

        if (lista) {
            lista.innerHTML = '';
            
            if (!pacientes || pacientes.length === 0) {
                lista.innerHTML = '<div style="padding: 10px; color: #a0aec0; font-size: 0.85rem;"><i class="fas fa-user-plus"></i> Paciente nuevo sin registros previos en la red</div>';
                lista.style.display = 'block';
                pacienteExistenteId = null;
                window.pacienteCargado = null;
                return;
            }

            lista.style.display = 'block';

            // 3. 🎨 RENDERIZADO CON IDENTIFICADORES VISUALES
            pacientes.forEach(p => {
                const item = document.createElement('div');
                item.className = 'item-busqueda-clinica'; 
                
                const nombreCompleto = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.toUpperCase();
                const curpTexto = p.curp ? p.curp.toUpperCase() : 'SIN CURP';
                
                let fechaLegible = "S/N";
                if (p.fecha_nacimiento) {
                    const [fAño, fMes, fDia] = p.fecha_nacimiento.split('-');
                    fechaLegible = `${fDia}/${fMes}/${fAño}`;
                }

                // 🌟 Bonus de Formalidad: Mostramos el nombre de la clínica origen para que el operador sepa de dónde viene
                const clinicaOrigen = p.nombre_clinica ? p.nombre_clinica.toUpperCase() : 'FisioCid';

                item.innerHTML = `
                    <div style="font-weight: bold; color: #726708;">${nombreCompleto}</div>
                    <div style="font-size: 0.75rem; color: #216bc5; margin-top: 2px; display: flex; flex-wrap: wrap; gap: 12px;">
                        <span>📅 Nac: <strong>${fechaLegible}</strong></span>
                        <span>🆔 CURP: <strong style="font-family: monospace;">${curpTexto}</strong></span>
                     
                    </div>
                `;

                item.onclick = async () => {
                    pacienteExistenteId = p.id;
                    window.pacienteCargado = p;
                    await llenarFormularioCompleto(p);
                    lista.style.display = 'none';
                };

                lista.appendChild(item);
            });
        }

    } catch (err) {
        console.error("💥 Error en el súper motor de búsqueda global:", err.message);
    }
}
// ============================================================================
// 🧼 LIMPIEZA MAESTRA DE LISTA (Detecta clics fuera y saltos con TAB)
// ============================================================================
function ocultarListaSiEsExterno(targetNode) {
    const lista = document.getElementById('listaCitas');
    const inputBuscar = document.getElementById('inputBuscarPaciente') || document.querySelector('input[type="text"]');

    if (lista && lista.style.display === 'block') {
        // Si el usuario se movió a un elemento que NO es el buscador ni la lista...
        if (inputBuscar && !inputBuscar.contains(targetNode) && !lista.contains(targetNode)) {
            console.log("🧼 Movimiento detectado (Clic o TAB). Ocultando lista flotante...");
            lista.style.display = 'none';
        }
    }
}

// 🎯 Radar 1: Para cuando usas el ratón (Clics)
document.addEventListener('click', (e) => {
    ocultarListaSiEsExterno(e.target);
});

// 🎯 Radar 2: Para cuando usas el teclado (Tabulador / Foco)
document.addEventListener('focusin', (e) => {
    ocultarListaSiEsExterno(e.target);
});


document.getElementById('formRegistroPaciente')?.addEventListener('submit', async (e) => {
    e.preventDefault(); // Frenamos el envío para validar primero

    // Capturamos el botón al inicio para poder manipularlo en el catch si algo truena desde las validaciones
    const btnSubmit = e.target.querySelector('button[type="submit"]');


    try {
        // --- AQUÍ INSERTAMOS LA VALIDACIÓN DEL CHECKBOX ---
        const aceptaPrivacidad = document.getElementById('checkConsentimiento').checked;
        if (!aceptaPrivacidad) {
            alert("❌ ¡Espera! Debes aceptar el Aviso de Privacidad y la interoperabilidad para continuar.");
            document.getElementById('checkConsentimiento').focus();
            return; // Bloquea el guardado si no está marcado
        }

        const telefonoAdulto = document.getElementById('valTelefono')?.value.trim() || "";
        // 👁️ 'valemail' con la 'e' minúscula como tu mapa. Usamos 'let' para poder limpiarla abajo sin duplicar.
        let emailAdulto = document.getElementById('valemail')?.value.trim() || ""; 
        
        const telefonoTutor = document.getElementById('tutor-tel')?.value.trim() || "";
        const correoTutor = document.getElementById('correo-tutor')?.value.trim() || "";

        // Determinamos de forma inteligente si el formulario tiene activos los campos del tutor
        const inputTutor = document.getElementById('tutor-tel');
        const esMenorEdad = (inputTutor && inputTutor.offsetWidth > 0) || window.pacienteCargado?.es_menor_edad === true;

        console.log("🛡️ Validando políticas de contacto FisioCid. Menor de edad:", esMenorEdad);

        let faltaContacto = false;
        let mensajeError = "";

        // 2. APLICACIÓN DE LAS REGLAS ESTRICTAS DE CALIDAD DE DATOS
        if (esMenorEdad) {
            if (!telefonoTutor || telefonoTutor.length < 10 || !correoTutor || !correoTutor.includes('@')) {
                faltaContacto = true;
                mensajeError = "❌ PROTOCOLO DE SEGURIDAD FISIOCID:\n\nTodo paciente MENOR DE EDAD debe contar obligatoriamente con los datos de contacto de su tutor para el envío de alertas y códigos OTP.\n\nPor favor capture:\n• Teléfono del Tutor (10 dígitos).\n• Correo electrónico del Tutor.";
            }
        } else {
            if (!telefonoAdulto || telefonoAdulto.length < 10 || !emailAdulto || !emailAdulto.includes('@')) {
                faltaContacto = true;
                mensajeError = "❌ PROTOCOLO DE SEGURIDAD FISIOCID:\n\nNo se permite el registro de pacientes sin canales de comunicación activos.\n\nPor favor capture de forma obligatoria:\n• Teléfono celular válido (10 dígitos).\n• Correo electrónico válido.";
            }
        }

        // 3. FRENO DE MANO ABSOLUTO: Si falta algún dato, se cancela el guardado en Supabase
        if (faltaContacto) {
            alert(mensajeError);
            console.error("🛑 Registro bloqueado internamente por falta de datos maestros de comunicación.");
            
            if (esMenorEdad) {
                if (!telefonoTutor || telefonoTutor.length < 10) document.getElementById('tutor-tel')?.focus();
                else document.getElementById('correo-tutor')?.focus();
            } else {
                if (!telefonoAdulto || telefonoAdulto.length < 10) document.getElementById('valTelefono')?.focus();
                else document.getElementById('valemail')?.focus();
            }
            return; 
        }

        console.log("🎬 [LOG 1] ¡Submit detectado! Iniciando proceso de guardado...");
        
        if (btnSubmit) {
            btnSubmit.disabled = true; 
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESANDO...';
        }

        console.log("🔑 [LOG 2] Solicitando usuario activo de Auth...");
        const { data: { user } } = await fisioNet.auth.getUser();
        console.log("👤 [LOG 3] Usuario obtenido con éxito ID:", user?.id);

        const clinicaId = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');
        console.log("🏢 [LOG 4] ID de clínica activa desde LocalStorage:", clinicaId);

        console.log("🔍 [LOG 5] Consultando rol del colaborador en DB...");
        const { data: colaborador } = await fisioNet
            .from('colaboradores_clinica')
            .select('rol_sistema')
            .eq('id_profesional', user.id)
            .eq('id_clinica', clinicaId)
            .maybeSingle();

        const rolReal = colaborador?.rol_sistema || 'OPERATIVO';
        console.log("💼 [LOG 6] Rol del sistema asignado:", rolReal);

        // Captura de datos de interfaz
        const curpFinal = (document.getElementById('curpAuto').value + document.getElementById('curpHomo').value).toUpperCase();
        const formData = new FormData(e.target);
        const datos = Object.fromEntries(formData.entries());
        const estadoSeleccionado = document.getElementById('valEstado')?.value || null;
        
        delete datos.estado_nacimiento; delete datos.homoclave_curp; delete datos.id_convenio; 
        
        // 🔄 MANEJO SEGURO DE EDAD COGNITIVA
        let esMenor = false;
        if (datos.fecha_nacimiento && datos.fecha_nacimiento.trim() !== "") {
            const fechaNac = new Date(datos.fecha_nacimiento + "T00:00:00"); // Forzamos formato local
            const hoy = new Date();
            let edad = hoy.getFullYear() - fechaNac.getFullYear();
            if (hoy.getMonth() < fechaNac.getMonth() || (hoy.getMonth() === fechaNac.getMonth() && hoy.getDate() < fechaNac.getDate())) edad--;
            esMenor = edad < 18;
        } else {
            datos.fecha_nacimiento = null;
        }

        const folioSede = document.getElementById('inputFolioExpediente')?.value || null;
        const emailTutor = document.getElementById('correo-tutor')?.value?.toLowerCase().trim() || null;
        const accesoRed = document.getElementById('checkConsentimiento').checked;

        // 🎯 AQUÍ ESTABA TU ERROR: Ya no usamos 'const', solo formateamos la variable que declaramos arriba
        emailAdulto = emailAdulto.toLowerCase();

        console.log("📋 [LOG 7] Datos capturados en el formulario. Folio actual en pantalla:", folioSede);

        const payload = {
            ...datos,
            estado_nacimiento: estadoSeleccionado,
            curp: curpFinal.length === 18 ? curpFinal : null,
            creado_por: user.id, 
            id_clinica: clinicaId, 
            id_clinica_origen: clinicaId,
            nombre_clinica: localStorage.getItem('nombre_clinica'),
            es_menor_edad: esMenor,
            nombre_tutor: esMenor ? document.getElementById('tutor-nombre')?.value.toUpperCase() : null,
            telefono_tutor: esMenor ? document.getElementById('tutor-tel')?.value : null,
            parentesco_tutor: esMenor ? document.getElementById('tutor-parentesco')?.value.toUpperCase() : null,
            correo_tutor: esMenor ? emailTutor : null,
            correo_electronico: !esMenor ? emailAdulto : (datos.correo_electronico || null),
            numero_expediente_sede: folioSede,
            acceso_red_activo: accesoRed,
          notas_precaucion: document.querySelector('[name="notas_precaucion"]')?.value || datos.notas_precaucion || null,
        };

        let resultado;
        const esPacienteExistente = (pacienteExistenteId !== null) || (window.pacienteCargado && window.pacienteCargado.id);
        console.log("🧐 [LOG 8] ¿El paciente ya existe en el sistema maestro?:", esPacienteExistente);

   // --- DENTRO DE LA FUNCIÓN SUBMIT, REEMPLAZA EL BLOQUE DE PACIENTE EXISTENTE ---

if (esPacienteExistente) {
    const idRealPaciente = pacienteExistenteId || window.pacienteCargado.id;
    
    // 1. Campos críticos para alerta
    const camposCriticos = ['alergias', 'antecedentes_patologicos', 'antecedentes_heredofamiliares', 'farmacologia_activa'];
    const huboCambiosCriticos = camposCriticos.some(campo => {
        return (window.pacienteCargado[campo] || "").trim() !== (datos[campo] || "").trim();
    });

    let deseaEditarFicha = true; 
    if (huboCambiosCriticos) {
        deseaEditarFicha = confirm("⚠️ ALERTA: Estás modificando datos críticos. ¿Continuar?");
    }

    if (deseaEditarFicha) {
        const payloadFinal = { ...payload };
        delete payloadFinal.checkConsentimiento;
        
        // A) Actualizamos Paciente Maestro
        resultado = await fisioNet.from('pacientes_maestros').update(payloadFinal).eq('id', idRealPaciente).select();
        if (resultado.error) throw resultado.error;

        // B) SINCRONIZACIÓN DEL FOLIO (Aquí arreglamos el SIN FOLIO)
        // Buscamos si ya hay un expediente para esta sede y lo actualizamos
        const { data: expExistente } = await fisioNet
            .from('expedientes_clinicos')
            .select('id')
            .eq('id_paciente', idRealPaciente)
            .eq('id_clinica', clinicaId)
            .maybeSingle();

        if (expExistente) {
            await fisioNet.from('expedientes_clinicos')
                .update({ 
                    folio_personalizado: folioSede, 
                    numero_consecutivo: parseInt((folioSede || "0").replace(/\D/g, '')) || 0 
                })
                .eq('id', expExistente.id);
        } else {
            // Si por alguna razón no existía, lo creamos
            await fisioNet.from('expedientes_clinicos').insert([{
                id_paciente: idRealPaciente,
                id_clinica: clinicaId,
                folio_personalizado: folioSede,
                numero_consecutivo: parseInt((folioSede || "0").replace(/\D/g, '')) || 0
            }]);
        }
        console.log("✅ Paciente y Expediente sincronizados.");
    } else {
        return; 
    }
}
        
        else {
            // 🆕 PACIENTE NUEVO ABSOLUTO
            console.log("⚡ [LOG 9B] Entrando al flujo de PACIENTE NUEVO ABSOLUTO. Ejecutando insert en pacientes_maestros...");
            payload.fecha_registro = new Date().toISOString();
            
            resultado = await fisioNet.from('pacientes_maestros').insert([payload]).select();
            console.log("📡 [LOG 10B] Respuesta cruda recibida de pacientes_maestros:", resultado);
            
            if (resultado.error) {
                console.error("❌ Error detectado en insert de pacientes_maestros:", resultado.error);
                throw resultado.error;
            }

            if (resultado.data && resultado.data.length > 0) {
                const nuevoPacienteId = resultado.data[0].id;
                console.log("🎉 [LOG 11B] Paciente maestro creado con ID asignado:", nuevoPacienteId);

                console.log("📌 [LOG 12B] Insertando relación en vinculos_clinicos...");
                const resVincNuevo = await fisioNet.from('vinculos_clinicos').insert([{
                    paciente_id: nuevoPacienteId,
                    profesional_id: user.id,
                    id_clinica: clinicaId,
                    rol_en_relacion: rolReal,
                    estado_vinculo: 'ACTIVO'
                }]);
                if (resVincNuevo.error) {
                    console.error("❌ Error en vinculos_clinicos:", resVincNuevo.error);
                    throw resVincNuevo.error;
                }

                console.log("📌 [LOG 13B] Vínculo creado. Procesando números de consecutivo para el folio...");
                const numeroLimpio = (folioSede || "0").replace(/\D/g, ''); 
                const consecutivoFinal = parseInt(numeroLimpio) || 0;
                console.log(`🔢 [LOG 14B] Folio en texto: ${folioSede} | Consecutivo parseado: ${consecutivoFinal}`);

                console.log("📌 [LOG 15B] Insertando registro final en expedientes_clinicos...");
                const resExpNuevo = await fisioNet.from('expedientes_clinicos').insert([{
                    id_paciente: nuevoPacienteId,
                    id_clinica: clinicaId,
                    folio_personalizado: folioSede,
                    numero_consecutivo: consecutivoFinal,
                    estado_expediente: 'ACTIVO'
                }]);
                if (resExpNuevo.error) {
                    console.error("❌ Error en expedientes_clinicos:", resExpNuevo.error);
                    throw resExpNuevo.error;
                }
                console.log("📌 [LOG 16B] ¡Fila de expediente clínico creada con total éxito!");
            } else {
                console.warn("⚠️ [LOG 11B-Alerta] Supabase guardó el registro pero no retornó datos de la fila creada.");
            }
        }

        console.log("🏁 [LOG 17] Llegamos al bloque de redirección final. Evaluando el ID de destino...");
        let idFinalRedireccion = null;
        if (resultado?.data && resultado.data[0]?.id) {
            idFinalRedireccion = resultado.data[0].id;
        } else if (pacienteExistenteId) {
            idFinalRedireccion = pacienteExistenteId;
        }
        console.log("🎯 [LOG 18] ID Final de redirección calculado:", idFinalRedireccion);

        alert("🎉 ¡Proceso completado con éxito y expediente asegurado en FisioCid!");
        
        if (idFinalRedireccion) {
            window.location.href = `historia-clinica.html?id=${idFinalRedireccion}`;
        } else {
            console.warn("⚠️ Redirección de emergencia activada.");
            window.location.href = "historia-clinica.html";
        }

    } catch (err) {
        console.error("💥 [CATCH ERROR] Se detectó una falla crítica en el proceso:", err);
        alert("⚠️ ATENCIÓN: " + (err.message || err.details || "Error inesperado de sincronización"));
        
        if (btnSubmit) {
            btnSubmit.disabled = false; 
            btnSubmit.innerHTML = "GUARDAR EXPEDIENTE";
        }
    }
});

function procesarCurp() {
    const nomRaw = document.getElementById('valNombre')?.value || "";
    const patRaw = document.getElementById('valPaterno')?.value.trim() || "";
    const matRaw = document.getElementById('valMaterno')?.value.trim() || "X";
    const fec = document.getElementById('valFecha')?.value || "";
    const est = document.getElementById('valEstado')?.value || "";

    if (!nomRaw || !patRaw || !fec || !est) return;
    
    const valGeneroOriginal = document.getElementById('valGenero')?.value;
    let gen = 'X'; 
    if (valGeneroOriginal === 'HOMBRE') gen = 'H';
    else if (valGeneroOriginal === 'MUJER') gen = 'M';

    const { nombre: nom } = procesarNombreMexicano(nomRaw);
    const pat = limpiarApellidoMexicano(patRaw); 
    const mat = limpiarApellidoMexicano(matRaw); 
    
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
        
        document.getElementById('curpAuto').value = `${l1}${l2}${l3}${l4}${aa}${mm}${dd}${gen}${est}${c1}${c2}${c3}`.toUpperCase();
        
    
    }
}

document.getElementById('btnVerConvenios')?.addEventListener('click', async () => {
    const modal = document.getElementById('modalConvenios');
    
    if (modal) {
        modal.style.display = 'flex'; // Abrimos el modal
        console.log("🚀 Cargando convenios (Doctores y Empresas)...");
        
        // Llamamos a la función de carga que usa el filtro .or()
        await cargarListaConveniosModal(); 
    }
});

async function cargarListaConveniosModal() {
    const contenedor = document.getElementById('contenedorListaConvenios');
    
    try {
        // Obtenemos tu ID de sesión oficial
        const { data: { session } } = await fisioNet.auth.getSession();
        const idDoc = session?.user?.id;

        // 🔥 FILTRO MAESTRO: Trae convenios donde tú seas emisor O receptor
        const { data: alianzas, error } = await fisioNet
            .from('red_colaboracion')
            .select('*')
            .or(`id_doctor_receptor.eq.${idDoc},id_doctor_emisor.eq.${idDoc}`)
            .eq('estado_conexion', 'ACTIVO')
            .gt('porcentaje_descuento', 0)
            .order('nombre_entidad', { ascending: true });

        if (error) throw error;

        // Generamos los botones dinámicamente
        let html = `<button class="btn btn-outline-secondary w-100 mb-2 text-start" onclick="seleccionarConvenio('', 'PARTICULAR')">❌ SIN CONVENIO / PARTICULAR</button>`;

        alianzas?.forEach(a => {
            const nombre = a.nombre_entidad || "Socio Externo";
            html += `
                <button class="btn btn-outline-primary w-100 mb-2 text-start" 
                        onclick="seleccionarConvenio('${a.id}', '${nombre}')">
                    🤝 ${nombre} (${a.porcentaje_descuento}%)
                </button>`;
        });

        contenedor.innerHTML = html;

    } catch (e) {
        console.error("❌ Error al cargar lista en FisioCid:", e);
    }
}

function seleccionarConvenio(id, nombre) {
    const input = document.getElementById('valConvenio');
    if (input) {
        input.value = nombre;
        input.dataset.idAlianza = id; // Guardamos el UUID para el registro final
    }
    
    // Cerramos el modal
    document.getElementById('modalConvenios').style.display = 'none';
}


function aplicarIdentidadCamaleonica() {
    const colorClinica = localStorage.getItem('clinica_color') || '#2563eb';
    const nombreClinica = localStorage.getItem('nombre_clinica') || 'Clínica Activa';
    document.documentElement.style.setProperty('--primary', colorClinica);
    const lblSede = document.getElementById('lblSedeRegistro');
    if (lblSede) lblSede.innerText = `Registrando en: ${nombreClinica.toUpperCase()}`;
    const cardRegistro = document.getElementById('cardRegistro');
    if (cardRegistro) cardRegistro.style.borderTopColor = colorClinica;
    document.querySelectorAll('.btn-camaleon-solid').forEach(btn => {
        btn.style.backgroundColor = colorClinica; btn.style.borderColor = colorClinica; btn.style.color = '#fff';
    });
    const style = document.createElement('style');
    style.innerHTML = `.nav-pills .nav-link.active { background-color: ${colorClinica} !important; color: #fff !important; }`;
    document.head.appendChild(style);
}

function siguientePaso(idTab) {
    const triggerEl = document.querySelector(`#${idTab}`);
    if (triggerEl) { new bootstrap.Tab(triggerEl).show(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
}

function procesarNombreMexicano(texto) {
    const conectores = ["DE", "DEL", "LA", "LAS", "LOS", "SAN", "SANTA"];
    let palabras = texto.toUpperCase().trim().split(/\s+/);
    let piezas = [];
    for (let i = 0; i < palabras.length; i++) {
        if (conectores.includes(palabras[i]) && i + 1 < palabras.length) {
            piezas.push(palabras[i] + " " + palabras[i + 1]); i++; 
        } else { piezas.push(palabras[i]); }
    }
    return { nombre: piezas[0] || "", paterno: piezas[1] || "", materno: piezas[2] || "X" };
}


async function gestionarFolioAutomatico(idPacienteExistente = null) {
    console.log("🚀 Iniciando gestión de folio para paciente:", idPacienteExistente);
    const idClinica = localStorage.getItem('id_clinica_activa');
    const inputFolio = document.getElementById('inputFolioExpediente');
    const statusFolio = document.getElementById('statusFolio');

    if (!idClinica) {
        console.error("❌ Error: id_clinica_activa no encontrado en localStorage");
        return;
    }

    try {
        // 1. SI EL PACIENTE YA EXISTE
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
                statusFolio.innerHTML = '<i class="fas fa-check-circle"></i> EXPEDIENTE LOCALIZADO';
                return { folio: exp.folio_personalizado, nuevo: false };
            }
            console.log("ℹ️ El paciente existe pero no tiene folio en esta sede.");
        }

        // 2. GENERAR NUEVO
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
        statusFolio.innerHTML = '<i class="fas fa-magic"></i> NUEVO EXPEDIENTE POR ASIGNAR';
        
        return { folio: nuevoFolio, numero_consecutivo: siguiente, nuevo: true };

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN FOLIOS:", error);
        statusFolio.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ERROR DE CONEXIÓN';
    }
}

function limpiarApellidoMexicano(apellidoRaw) {
    if (!apellidoRaw) return "X";
    
    // Convertimos a mayúsculas y limpiamos espacios extraños
    let ap = apellidoRaw.trim().toUpperCase();
    
    // Lista oficial de partículas a ignorar al INICIO del apellido
    // El orden importa (de más largas a más cortas) para no cortar a medias "DE LOS"
    const particulas = [
        /^DE LOS\s+/, /^DE LA\s+/, /^DE LAS\s+/, 
        /^LOS\s+/, /^LAS\s+/, /^DEL\s+/, /^DE\s+/, /^LA\s+/
    ];
    
    // Recorremos y removemos si el apellido empieza con alguna de ellas
    for (let regex of particulas) {
        if (regex.test(ap)) {
            ap = ap.replace(regex, "");
            break; // Ya quitamos la partícula principal, salimos
        }
    }
    
    return ap || "X";
}



function actualizarInterfazEdad() {
    const valFecha = document.getElementById('valFecha')?.value;
    if (!valFecha) return;

    const hoy = new Date();
    const cumple = new Date(valFecha);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    if (hoy.getMonth() < cumple.getMonth() || (hoy.getMonth() === cumple.getMonth() && hoy.getDate() < cumple.getDate())) edad--;

    const seccionTutor = document.getElementById('seccion-tutor');
    const bloqueAdulto = document.getElementById('bloque-contacto-adulto');
    const btnCopiar = document.getElementById('btnCopiarTutor');

    if (edad < 18) {
        seccionTutor?.classList.remove('d-none');
        bloqueAdulto?.classList.add('d-none');
        btnCopiar?.classList.remove('d-none');
    } else {
        seccionTutor?.classList.add('d-none');
        bloqueAdulto?.classList.remove('d-none');
        btnCopiar?.classList.add('d-none');
    }
}

// Función para copiar datos (Ahorro de tiempo para el Dr.)
function copiarDatosTutor() {
    document.getElementById('valEmergenciaNom').value = document.getElementById('tutor-nombre').value;
    document.getElementById('valEmergenciaPar').value = document.getElementById('tutor-parentesco').value;
    document.getElementById('valEmergenciaTel').value = document.getElementById('tutor-tel').value;
}

