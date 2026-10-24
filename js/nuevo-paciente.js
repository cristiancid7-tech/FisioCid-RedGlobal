// Variable maestra global única.
let pacienteExistenteId = null;
let edicionFichaAutorizada = false;
let estaCargandoFormulario = false;
let tokenSeguridadActivo = null;
let tutorExpressExistenteId = null;


function sanitizarTexto(texto) {
    if (!texto) return ""; // Evita errores si el texto llega vacío o undefined
    
    return texto
        .trim()                       // 1. Quita los espacios accidentales al inicio y al final
        .replace(/\s+/g, " ")         // 2. Convierte múltiples espacios en blanco seguidos en uno solo
        .replace(/</g, "&lt;")        // 3. Desactiva etiquetas HTML como <script>
        .replace(/>/g, "&gt;")
        .replace(/['"`;-]/g, "");     // 4. Remueve comillas, puntos y comas o guiones de SQL
}

document.addEventListener('DOMContentLoaded', async () => {
    aplicarIdentidadCamaleonica();

    // Listener para búsqueda de tutor en input principal
    document.getElementById('tutor-nombre')?.addEventListener('input', (e) => {
        const texto = e.target.value;
        const lista = document.getElementById('listaTutores');
        
        if (texto.length >= 3) {
            buscarTutorEnBase(texto);
        } else if (lista) {
            lista.style.display = 'none';
            document.getElementById('idTutorSeleccionado').value = ""; // Limpiamos si borra
        }
    });

    // 🛡️ BLINDAJE DE FECHA: Evitar años ilógicos (1800 o el futuro)
    const campoFecha = document.getElementById('valFecha');
    if (campoFecha) {
        const hoy = new Date();
        const fechaMax = hoy.toISOString().split('T')[0];
        const hace110Anios = new Date(hoy.setFullYear(hoy.getFullYear() - 110)).toISOString().split('T')[0];
        
        campoFecha.setAttribute('max', fechaMax);
        campoFecha.setAttribute('min', hace110Anios);
    }

    // 🔥 1. MAYÚSCULAS AUTOMÁTICAS (Menos en correo y contraseña)
    document.addEventListener('input', (e) => {
        const el = e.target;
        if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && 
             el.type !== 'email' && el.type !== 'password' && el.id !== 'valemail') {
            el.value = el.value.toUpperCase();
        }
    });

    // Escuchadores dinámicos para campos maestros
    const camposMaestros = ['valNombre', 'valPaterno', 'valMaterno', 'valFecha', 'valGenero', 'valEstado'];
    camposMaestros.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const tipoEvento = (el.tagName === 'SELECT' || el.type === 'date') ? 'change' : 'input';
            el.addEventListener(tipoEvento, () => {
                if (id === 'valNombre') {
                    const lista = document.getElementById('listaCitas');
                    if (el.value.length >= 3) { 
                        buscarEnAgenda(el.value); 
                    } else if (lista) { 
                        lista.style.display = 'none'; 
                        if (!edicionFichaAutorizada && !window.pacienteCargado) {
                            pacienteExistenteId = null;
                            window.pacienteCargado = null;
                        }
                    }
                }
                
                if (id === 'valFecha') { actualizarInterfazEdad(); }
                
                procesarCurp(); 
            });
        }
    });

    // 🎯 HOMOCLAVE DISPARA LA VERIFICACIÓN Y ASIGNACIÓN DE FOLIO
    document.getElementById('curpHomo')?.addEventListener('input', async (e) => {
        const homo = e.target.value.trim().toUpperCase();

        if (homo.length === 2) {
            const parteBase = document.getElementById('curpAuto')?.value?.trim().toUpperCase() || '';
            const curpCompleta = `${parteBase}${homo}`;

            const lista = document.getElementById('listaCitas');
            if (lista) lista.style.display = 'none';

            if (curpCompleta.length === 18) {
                await verificarPacienteExistentePorCurp(curpCompleta);
            } else if (!pacienteExistenteId) {
                await gestionarFolioAutomatico(null);
            }
        }
    });

    // 🎯 MODAL RENAPO DE RESPALDO
    document.getElementById('btnAutoHomo')?.addEventListener('click', (e) => {
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

    // 🎯 MODAL CONVENIOS
    document.getElementById('btnVerConvenios')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const modal = document.getElementById('modalConvenios');
        if (modal) {
            modal.style.display = 'flex';
            await cargarListaConveniosModal(); 
        }
    });
    document.getElementById('cerrarConvenios')?.addEventListener('click', () => {
        document.getElementById('modalConvenios').style.display = 'none';
    });

    // 🚀 AUTOCARGA INICIAL POR URL
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('id');
    if (editId) { 
        await cargarPacienteParaEdicion(editId); 
        
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
        //console.log("⏳ Cargando paciente ID:", id);
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


async function llenarFormularioCompleto(p) {
    // Si ya estamos cargando este paciente, no hacemos nada para evitar parpadeos
    if (estaCargandoFormulario) return;
    estaCargandoFormulario = true;

    //console.log("💉 Rellenando formulario para:", p.nombre);

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

        //console.log("🔍 Info clínica existente?:", tieneInfoClinica, "¿Consentimiento?:", consentimientoDado);

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

// =====================================================================
// 🔍 VERIFICADOR CENTRAL DE CURP EN RED FISIOCID
// =====================================================================
// =====================================================================
// 🔍 VERIFICADOR CENTRAL DE CURP EN RED FISIOCID
// =====================================================================
async function verificarPacienteExistentePorCurp(curpCompleta) {
    if (!curpCompleta || curpCompleta.length !== 18) return;

    const statusFolio = document.getElementById('statusFolio');
    const msjAuto = document.getElementById('msjHomoclaveAuto');

    if (statusFolio) {
        statusFolio.innerHTML = '<i class="fas fa-spinner fa-spin text-primary"></i> Consultando expedientes en red...';
    }

    try {
        // Consulta en la Ficha Maestra de Supabase
        const { data: paciente, error } = await fisioNet
            .from('pacientes_maestros')
            .select('*')
            .eq('curp', curpCompleta.toUpperCase())
            .maybeSingle();

        if (error) throw error;

        if (paciente) {
            // 🅰️ CASO 1: PACIENTE ENCONTRADO EN LA RED
            pacienteExistenteId = paciente.id;
            window.pacienteCargado = paciente;

            await llenarFormularioCompleto(paciente);

            if (statusFolio) {
                statusFolio.innerHTML = '<i class="fas fa-check-circle text-success"></i> EXPEDIENTE LOCALIZADO EN RED';
            }
            if (msjAuto) {
                msjAuto.innerHTML = "<span class='text-success'>✅ ¡Paciente localizado y datos cargados!</span>";
            }
        } else {
            // 🅱️ CASO 2: PACIENTE NUEVO ABSOLUTO
            pacienteExistenteId = null;
            window.pacienteCargado = null;

            if (statusFolio) {
                statusFolio.innerHTML = '<i class="fas fa-magic"></i> NUEVO EXPEDIENTE POR ASIGNAR';
            }
            if (msjAuto) {
                msjAuto.innerHTML = "<span class='text-success'>✅ CURP Verificada (Paciente Nuevo)</span>";
            }

            // Asigna el siguiente folio consecutivo para la sede activa
            await gestionarFolioAutomatico(null);

            // Pasa el foco al campo de teléfono para agilizar el registro
            document.getElementById('valTelefono')?.focus();
        }
    } catch (err) {
        console.error("❌ Error al verificar CURP en red:", err.message);
        if (statusFolio) {
            statusFolio.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> Error de conexión con expedientes';
        }
    }
}

// =====================================================================
// 💾 REGISTRO / GUARDADO DE TUTOR EXPRESS (MODAL)
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

    if (!nombre || !paterno || !fechaNac || !tel || tel.length < 10) {
        alert("⚠️ Por favor completa los campos obligatorios (*): Nombre, A. Paterno, Fecha Nac. y Teléfono a 10 dígitos.");
        return;
    }

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        const clinicaId = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');

        let tutorFinalId = tutorExpressExistenteId;
        let nombreCompleto = `${nombre} ${paterno} ${materno}`.trim();
        let folioInfoMensaje = "";

        // 🛡️ BÚSQUEDA DE SEGURIDAD ANTI-DUPLICADOS (Por CURP o Nombre + Fecha)
        if (!tutorFinalId && curpCompleta) {
            const { data: tutorExiste } = await fisioNet
                .from('pacientes_maestros')
                .select('id')
                .eq('curp', curpCompleta)
                .maybeSingle();
            if (tutorExiste) tutorFinalId = tutorExiste.id;
        }

        if (!tutorFinalId) {
            const { data: tutorNombreExiste } = await fisioNet
                .from('pacientes_maestros')
                .select('id')
                .ilike('nombre', nombre)
                .ilike('apellido_paterno', paterno)
                .eq('fecha_nacimiento', fechaNac)
                .maybeSingle();
            if (tutorNombreExiste) tutorFinalId = tutorNombreExiste.id;
        }

        // 🅰️ CASO 1: EL TUTOR YA EXISTE EN LA RED (REUTILIZAR Y VINCULAR A ESTA CLÍNICA)
        if (tutorFinalId) {
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
                const datosFolio = await gestionarFolioAutomatico(null, 'inputFolioTutorExpress', 'statusFolioTutorExpress');
                const folioAsignado = datosFolio?.folio || null;
                const consecutivoNum = datosFolio?.numero_consecutivo || 0;

                await fisioNet.from('expedientes_clinicos').insert([{
    id_paciente: tutorFinalId,
    id_clinica: clinicaId,
    folio_personalizado: folioAsignado,
    numero_consecutivo: consecutivoNum, // 👈 Correcto
    estado_expediente: 'ACTIVO'
}]);

                await fisioNet.from('pacientes_maestros').update({
                    numero_expediente_sede: folioAsignado
                }).eq('id', tutorFinalId);

                folioInfoMensaje = `Nuevo expediente en sede asignado: ${folioAsignado}`;
            }

            const { data: vinculoExistente } = await fisioNet
                .from('vinculos_clinicos')
                .select('id')
                .eq('paciente_id', tutorFinalId)
                .eq('id_clinica', clinicaId)
                .maybeSingle();

            if (!vinculoExistente) {
                await fisioNet.from('vinculos_clinicos').insert([{
                    paciente_id: tutorFinalId,
                    profesional_id: user?.id,
                    id_clinica: clinicaId,
                    rol_en_relacion: 'OPERATIVO',
                    estado_vinculo: 'ACTIVO'
                }]);
            }
        } 
        // 🅱️ CASO 2: ES UN TUTOR NUEVO ABSOLUTO EN LA RED
        else {
            let folioAsignado = document.getElementById('inputFolioTutorExpress')?.value;
            let consecutivoNum = 0;

            if (!folioAsignado) {
                const datosFolio = await gestionarFolioAutomatico(null, 'inputFolioTutorExpress', 'statusFolioTutorExpress');
                folioAsignado = datosFolio?.folio || null;
                consecutivoNum = datosFolio?.numero_consecutivo || 0;
            } else {
                const partes = folioAsignado.split('-');
                consecutivoNum = parseInt((partes[partes.length - 1] || "0").replace(/\D/g, ''), 10) || 0;
            }

            const payloadTutor = {
    nombre: nombre,
    apellido_paterno: paterno,
    apellido_materno: materno,
    fecha_nacimiento: fechaNac,
    genero: genero,
    curp: curpCompleta,
    telefono: tel,
    correo_electronico: email,
    creado_por: user?.id,
    id_clinica_origen: clinicaId,
    nombre_clinica: localStorage.getItem('nombre_clinica'),
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

                await fisioNet.from('expedientes_clinicos').insert([{
    id_paciente: tutorFinalId,
    id_clinica: clinicaId,
    folio_personalizado: folioAsignado,
    numero_consecutivo: consecutivoNum,
    estado_expediente: 'ACTIVO'
}]);

                await fisioNet.from('vinculos_clinicos').insert([{
                    paciente_id: tutorFinalId,
                    profesional_id: user?.id,
                    id_clinica: clinicaId,
                    rol_en_relacion: 'OPERATIVO',
                    estado_vinculo: 'ACTIVO'
                }]);

                folioInfoMensaje = `Nuevo folio asignado: ${folioAsignado || 'S/N'}`;
            }
        }

        // 🎯 INYECTAR DATOS DE TUTOR Y RECALCULAR FOLIO PRINCIPAL (PARA EL MENOR)
        if (tutorFinalId) {
            const inputNombreTutor = document.getElementById('tutor-nombre');
            const inputTelTutor = document.getElementById('tutor-tel');
            const inputEmailTutor = document.getElementById('correo-tutor');
            const inputIdTutor = document.getElementById('idTutorSeleccionado');

            if (inputNombreTutor) inputNombreTutor.value = nombreCompleto;
            if (inputTelTutor) inputTelTutor.value = tel;
            if (inputEmailTutor) inputEmailTutor.value = email || "";
            if (inputIdTutor) inputIdTutor.value = tutorFinalId;

            // 🔄 Recalcular el folio para el paciente menor en el formulario principal
            await gestionarFolioAutomatico(null, 'inputFolioExpediente', 'statusFolio');

            alert(`✅ ¡Tutor listo y enlazado!\n📄 ${folioInfoMensaje}\n🔗 Vinculado al expediente del menor y folio actualizado.`);

            tutorExpressExistenteId = null;
            const modalEl = document.getElementById('modalTutorExpress');
            if (modalEl) {
                const modalInstance = bootstrap.Modal.getInstance(modalEl);
                if (modalInstance) modalInstance.hide();
            }
        }

    } catch (err) {
        console.error("💥 Error al procesar tutor express:", err);
        alert("Error al registrar tutor: " + (err.message || "Error de conexión"));
    }
}

// ============================================================================
// 🔒 GESTOR VISUAL DE BLOQUEO TOTAL (Identidad por ID y Antecedentes por Name)
// ============================================================================
function congelarCamposIdentidad(bloquear) {
    //console.log(`🛡️ Sincronizando candados. Bloqueo masivo solicitado: ${bloquear}`);

    // Unificamos todos los campos que queremos proteger
    const todosLosCampos = [
        'valNombre', 'valPaterno', 'valMaterno', 'valFecha', 'valGenero', 'valEstado', 
        'curpAuto', 'curpHomo', 'valOcupacion', 'valTelefono', 'valemail', 'valDireccion',
        'valEmergenciaNom', 'valEmergenciaPar', 'valEmergenciaTel', 'tutor-nombre', 
        'tutor-parentesco', 'tutor-tel', 'correo-tutor', 'alertas_seguridad', 'tipo_sangre', 
        'lateralidad', 'alergias', 'antecedentes_heredofamiliares', 'antecedentes_patologicos', 
        'antecedentes_no_patologicos', 'farmacologia_activa', 'antecedentes_quirurgicos', 'checkConsentimiento'
    ];

  // 🔒 DENTRO DE congelarCamposIdentidad(bloquear):
todosLosCampos.forEach(idOrName => {
    const el = document.getElementById(idOrName) || document.querySelector(`[name="${idOrName}"]`);
    
    if (el) {
        let estaLleno = false;
        
        if (el.type === 'checkbox') {
            estaLleno = el.checked;
        } else {
            const valor = el.value ? el.value.trim().toUpperCase() : "";
            // Lista de valores neutros que NO deben congelar el campo
            const valoresIncompletos = [
                "", "SELECCION", "SELECCIONAR", "SELECCIONAR ESTADO --", 
                "-- SELECCIONAR --", "DESCONOCE", "NO SABE"
            ];
            estaLleno = !valoresIncompletos.includes(valor);
        }
        
        const aplicarBloqueo = bloquear && estaLleno;

        if (el.type === 'checkbox') {
            el.disabled = aplicarBloqueo; 
        } else {
            el.readOnly = aplicarBloqueo;
            if (el.tagName === 'SELECT') el.disabled = aplicarBloqueo;
            
            el.style.backgroundColor = aplicarBloqueo ? "#edf2f7" : "#ffffff";
            el.style.color = aplicarBloqueo ? "#4a5568" : "#000000";
            el.style.cursor = aplicarBloqueo ? "not-allowed" : "text";
        }
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
            const pacienteData = window.pacienteCargado;
            const esMenor = pacienteData?.es_menor_edad;
            const idClinicaActiva = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');

            if (!pacienteData?.id) {
                alert("⚠️ Error: No hay un paciente cargado activo.");
                return;
            }

            // 🎯 Si es menor, enviamos la solicitud al ID del tutor para que le aparezca en su Portal
            const idDestinatarioOTP = (esMenor && pacienteData.id_tutor) 
                ? pacienteData.id_tutor 
                : pacienteData.id;

            //console.log("📲 Destinatario OTP -> ID:", idDestinatarioOTP, esMenor ? "(TUTOR)" : "(PACIENTE)");

            btnKey.disabled = true;
            btnKey.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Solicitando OTP...';

            try {
                const { data: { user } } = await fisioNet.auth.getUser();

                const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();
                const expiraEn = new Date(Date.now() + 15 * 60 * 1000).toISOString();

                //console.log("🔑 [FISIOCID OTP]: Generando clave interna para edición ->", codigoOTP);

                // Insert directo mapeando exactamente a tus 11 columnas
                const { data: solInsert, error: errOTP } = await fisioNet
                    .from('solicitudes_acceso_otp')
                    .insert([{
                        id_paciente: idDestinatarioOTP,
                        id_profesional: user ? user.id : null,
                        nombre_profesional: "EDICIÓN FICHA MAESTRA",
                        codigo_otp: codigoOTP,
                        permisos_concedidos: { 
                            edicion_ficha: true, 
                            paciente_afectado_id: pacienteData.id,
                            paciente_nombre: `${pacienteData.nombre || ''} ${pacienteData.apellido_paterno || ''}`.trim()
                        },
                        estado_solicitud: 'PENDIENTE',
                        expira_en: expiraEn,
                        id_clinica: idClinicaActiva || null
                    }])
                    .select();

                if (errOTP) throw errOTP;

                tokenSeguridadActivo = codigoOTP;

                // Abrir modal de entrada de OTP en la pantalla del médico
                const inputCodigo = document.getElementById('inputCodigoIngresadoOTP');
                const msgError = document.getElementById('msgErrorOTP');
                
                if (inputCodigo) inputCodigo.value = '';
                if (msgError) msgError.classList.add('d-none');

                const modalElem = document.getElementById('modalValidarOTP');
                if (modalElem) {
                    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElem);
                    modalInstance.show();
                }

            } catch (err) {
                console.error("💥 Error al generar OTP dinámico:", err.message);
                alert("Error al solicitar código de desbloqueo: " + err.message);
            } finally {
                btnKey.disabled = false;
                btnKey.innerHTML = '<i class="fas fa-lock"></i> ✏️ Corregir Datos de Identidad';
            }
        });
        
        tituloSeccion.appendChild(btnKey);
    }
}
// ==========================================
// 🗝️ VALIDACIÓN DEL CÓDIGO INGRESADO EN MODAL
// ==========================================
function validarCodigoOTPIngresado() {
    const codigoIngresado = document.getElementById('inputCodigoIngresadoOTP')?.value?.trim();
    const msgError = document.getElementById('msgErrorOTP');
    const btnKey = document.getElementById('btnDesbloquearFicha');

    if (String(codigoIngresado) === String(tokenSeguridadActivo)) {
        edicionFichaAutorizada = true; 
        
        // 🔓 Desbloqueo de campos
        congelarCamposIdentidad(false); 
        
        // Feedback visual
        if (btnKey) {
            btnKey.innerHTML = '<i class="fas fa-lock-open"></i> Modo Edición Activo';
            btnKey.style.backgroundColor = "#48bb78";
            btnKey.style.color = "#ffffff";
            btnKey.disabled = true;
        }

        const btnSubmit = document.querySelector('button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.innerHTML = '<i class="fas fa-sync"></i> ACTUALIZAR DATOS MAESTROS';
            btnSubmit.classList.replace('btn-primary', 'btn-success');
        }

        // Cierre de Modal
        const modalElem = document.getElementById('modalValidarOTP');
        if (modalElem) {
            const modalInstance = bootstrap.Modal.getInstance(modalElem);
            if (modalInstance) modalInstance.hide();
        }

    } else {
        if (msgError) msgError.classList.remove('d-none');
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
    
    // 🛡️ MANTENER EL ID SI YA HAY UN PACIENTE CARGADO
    if (!edicionFichaAutorizada && !window.pacienteCargado) {
        pacienteExistenteId = null;
        window.pacienteCargado = null;
    }
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
    const inputBuscar = document.getElementById('valNombre'); // 🎯 Apunta al id exacto de tu input

    if (lista && lista.style.display === 'block') {
        if (inputBuscar && !inputBuscar.contains(targetNode) && !lista.contains(targetNode)) {
            lista.style.display = 'none';
        }
    }
}


// =====================================================================
// 🚀 EVENTO PRINCIPAL DE REGISTRO / FORMULARIO SUBMIT
// =====================================================================
document.getElementById('formRegistroPaciente')?.addEventListener('submit', async (e) => {
    e.preventDefault(); // Frenamos el envío para validar primero

    // Capturamos el botón al inicio
    const btnSubmit = e.target.querySelector('button[type="submit"]');

    try {
        // --- 1. VALIDACIÓN DEL CHECKBOX PRIVACIDAD ---
        const aceptaPrivacidad = document.getElementById('checkConsentimiento')?.checked;
        if (!aceptaPrivacidad) {
            alert("❌ ¡Espera! Debes aceptar el Aviso de Privacidad y la interoperabilidad para continuar.");
            document.getElementById('checkConsentimiento')?.focus();
            return;
        }

        const telefonoAdulto = document.getElementById('valTelefono')?.value.trim() || "";
        let emailAdulto = document.getElementById('valemail')?.value.trim() || ""; 
        const telefonoTutor = document.getElementById('tutor-tel')?.value.trim() || "";
        const correoTutor = document.getElementById('correo-tutor')?.value.trim() || "";

        const inputTutor = document.getElementById('tutor-tel');
        const esMenorEdad = (inputTutor && inputTutor.offsetWidth > 0) || window.pacienteCargado?.es_menor_edad === true;

        //console.log("🛡️ Validando políticas de contacto FisioCid. Menor de edad:", esMenorEdad);

        let faltaContacto = false;
        let mensajeError = "";

      // --- 2. REGLAS ESTRICTAS DE CALIDAD DE DATOS ---
        if (esMenorEdad) {
            // Evaluamos únicamente que exista el teléfono del tutor con al menos 10 dígitos
            if (!telefonoTutor || telefonoTutor.length < 10) {
                faltaContacto = true;
                mensajeError = `❌ PROTOCOLO DE SEGURIDAD FISIOCID:\n\nTodo paciente MENOR DE EDAD debe contar obligatoriamente con el teléfono de contacto de su tutor.\n\nPor favor capture:\n• Teléfono celular válido (10 dígitos).`;
            }
        } else {
            // Evaluamos únicamente que exista el teléfono del paciente adulto con al menos 10 dígitos
            if (!telefonoAdulto || telefonoAdulto.length < 10) {
                faltaContacto = true;
                mensajeError = `❌ PROTOCOLO DE SEGURIDAD FISIOCID:\n\nEs necesario registrar un canal de comunicación.\n\nPor favor capture de forma obligatoria:\n• Teléfono celular válido (10 dígitos).`;
            }
        }

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

        //console.log("🎬 [LOG 1] ¡Submit detectado! Iniciando proceso de guardado...");
        
        if (btnSubmit) {
            btnSubmit.disabled = true; 
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESANDO...';
        }

        //console.log("🔑 [LOG 2] Solicitando usuario activo de Auth...");
        const { data: { user } } = await fisioNet.auth.getUser();
        //console.log("👤 [LOG 3] Usuario obtenido con éxito ID:", user?.id);

        if (!user) {
            alert("⚠️ Sesión no encontrada. Por favor inicie sesión nuevamente.");
            if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = "GUARDAR EXPEDIENTE"; }
            return;
        }

        // =====================================================================
        // 🔒 BÚNKER DE CONTROL DE PLANES FISIOCID (MATRIZ DINÁMICA DE SUSCRIPCIÓN)
        // =====================================================================
      const esPacienteExistente = Boolean(pacienteExistenteId || window.pacienteCargado?.id);
const idRealPaciente = pacienteExistenteId || window.pacienteCargado?.id;


        if (!esPacienteExistente) {
            const { data: perfProf } = await fisioNet
                .from('perfiles_profesionales')
                .select('nivel_suscripcion')
                .eq('id', user.id)
                .maybeSingle();

           
            const nivelActual = (perfProf?.nivel_suscripcion || 'GRATUITO').toUpperCase();

            const chequeoCuota = await validarCuotaPaciente(user.id, nivelActual);

            // ✅ CÓDIGO ACTUALIZADO CON REDIRECCIÓN DIRECTA:
if (!chequeoCuota.permitido) {
    alert("🚀 ¡TU CONSULTORIO ESTÁ CRECIENDO!\n\n" + chequeoCuota.motivo);
    window.location.href = "suscripcion.html"; // 👈 Te redirige directamente aquí
    return;
}
        }
        // =====================================================================

        const clinicaId = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');
        //console.log("🏢 [LOG 4] ID de clínica activa desde LocalStorage:", clinicaId);

        //console.log("🔍 [LOG 5] Consultando rol del colaborador en DB...");
        const { data: colaborador } = await fisioNet
            .from('colaboradores_clinica')
            .select('rol_sistema')
            .eq('id_profesional', user.id)
            .eq('id_clinica', clinicaId)
            .maybeSingle();

        const rolReal = colaborador?.rol_sistema || 'OPERATIVO';
        //console.log("💼 [LOG 6] Rol del sistema asignado:", rolReal);

        // Captura de datos de interfaz
        const curpFinal = (document.getElementById('curpAuto').value + document.getElementById('curpHomo').value).toUpperCase();
        const formData = new FormData(e.target);
        const datos = Object.fromEntries(formData.entries());
        const estadoSeleccionado = document.getElementById('valEstado')?.value || null;
        
        delete datos.estado_nacimiento; 
        delete datos.homoclave_curp; 
        delete datos.id_convenio;
        delete datos.checkConsentimiento;
        
        let esMenor = false;
        if (datos.fecha_nacimiento && datos.fecha_nacimiento.trim() !== "") {
            const fechaNac = new Date(datos.fecha_nacimiento + "T00:00:00");
            const hoy = new Date();
            let edad = hoy.getFullYear() - fechaNac.getFullYear();
            if (hoy.getMonth() < fechaNac.getMonth() || (hoy.getMonth() === fechaNac.getMonth() && hoy.getDate() < fechaNac.getDate())) edad--;
            esMenor = edad < 18;
        } else {
            datos.fecha_nacimiento = null;
        }

        const folioSede = document.getElementById('inputFolioExpediente')?.value || null;
        const emailTutor = document.getElementById('correo-tutor')?.value?.toLowerCase().trim() || null;
        const accesoRed = aceptaPrivacidad; 
        const fechaConsentimiento = new Date().toISOString(); // Timestamp legal exacto

     
        emailAdulto = emailAdulto ? emailAdulto.toLowerCase() : null;

        //console.log("📋 [LOG 7] Datos capturados en el formulario. Folio actual en pantalla:", folioSede);
        const uuidTutorSeleccionado = document.getElementById('idTutorSeleccionado')?.value?.trim() || null;

    const payload = {
    nombre: datos.nombre,
    apellido_paterno: datos.apellido_paterno,
    apellido_materno: datos.apellido_materno,
    curp: curpFinal.length === 18 ? curpFinal : null,
    fecha_nacimiento: datos.fecha_nacimiento || null,
    genero: datos.genero,
    creado_por: user.id,
    id_clinica_origen: clinicaId,
    nombre_clinica: localStorage.getItem('nombre_clinica'),
    ocupacion: datos.ocupacion || null,
    telefono: datos.telefono || null,
    correo_electronico: !esMenor ? emailAdulto : (datos.correo_electronico || null),
    direccion_completa: datos.direccion_completa || null,
    contacto_emergencia_nombre: datos.contacto_emergencia_nombre || null,
    contacto_emergencia_tel: datos.contacto_emergencia_tel || null,
    es_menor_edad: esMenor,
    id_tutor: esMenor ? uuidTutorSeleccionado : null,
    nombre_tutor: esMenor ? document.getElementById('tutor-nombre')?.value.toUpperCase() : null,
    telefono_tutor: esMenor ? document.getElementById('tutor-tel')?.value : null,
    parentesco_tutor: esMenor ? document.getElementById('tutor-parentesco')?.value.toUpperCase() : null,
    correo_tutor: esMenor ? emailTutor : null,
    acceso_red_activo: accesoRed,
    consentimiento_firmado: accesoRed,
    fecha_firma_consentimiento: fechaConsentimiento,
    tipo_sangre: datos.tipo_sangre || null,
    lateralidad: datos.lateralidad || null,
    alergias: datos.alergias || null,
    antecedentes_quirurgicos: datos.antecedentes_quirurgicos || null,
    antecedentes_patologicos: datos.antecedentes_patologicos || null,
    antecedentes_no_patologicos: datos.antecedentes_no_patologicos || null,
    antecedentes_heredofamiliares: datos.antecedentes_heredofamiliares || null,
    farmacologia_activa: datos.farmacologia_activa || null,
    alertas_seguridad: datos.alertas_seguridad || null,
    notas_precaucion: document.querySelector('[name="notas_precaucion"]')?.value || datos.notas_precaucion || null
};

        let resultado;
        //console.log("🧐 [LOG 8] ¿El paciente ya existe en el sistema maestro?:", esPacienteExistente);

        if (esPacienteExistente) {

            
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
                
                resultado = await fisioNet.from('pacientes_maestros').update(payloadFinal).eq('id', idRealPaciente).select();
                if (resultado.error) throw resultado.error;

                const { data: expExistente } = await fisioNet
                    .from('expedientes_clinicos')
                    .select('id')
                    .eq('id_paciente', idRealPaciente)
                    .eq('id_clinica', clinicaId)
                    .maybeSingle();

                const partesFolioActual = (folioSede || "").split('-');
                const consecutivoFinal = parseInt((partesFolioActual[partesFolioActual.length - 1] || "0").replace(/\D/g, ''), 10) || 0;

                if (expExistente) {
                    await fisioNet.from('expedientes_clinicos')
                        .update({ 
                            folio_personalizado: folioSede, 
                            numero_consecutivo: consecutivoFinal 
                        })
                        .eq('id', expExistente.id);
                } else {
                    await fisioNet.from('expedientes_clinicos').insert([{
                        id_paciente: idRealPaciente,
                        id_clinica: clinicaId,
                        folio_personalizado: folioSede,
                        numero_consecutivo: consecutivoFinal,
                        estado_expediente: 'ACTIVO'
                    }]);
                }
                //console.log("✅ Paciente y Expediente sincronizados.");

            } else {
                if (btnSubmit) {
                    btnSubmit.disabled = false; 
                    btnSubmit.innerHTML = "GUARDAR EXPEDIENTE";
                }
                return; 
            }
        } else {
            // PACIENTE NUEVO ABSOLUTO
            //console.log("⚡ [LOG 9B] Entrando al flujo de PACIENTE NUEVO ABSOLUTO...");
            payload.fecha_registro = new Date().toISOString();
            
            resultado = await fisioNet.from('pacientes_maestros').insert([payload]).select();
            
            if (resultado.error) throw resultado.error;

            if (resultado.data && resultado.data.length > 0) {
                const nuevoPacienteId = resultado.data[0].id;

                await fisioNet.from('vinculos_clinicos').insert([{
                    paciente_id: nuevoPacienteId,
                    profesional_id: user.id,
                    id_clinica: clinicaId,
                    rol_en_relacion: rolReal,
                    estado_vinculo: 'ACTIVO'
                }]);

                const partesFolioNuevo = (folioSede || "").split('-');
                const consecutivoFinal = parseInt((partesFolioNuevo[partesFolioNuevo.length - 1] || "0").replace(/\D/g, ''), 10) || 0;

                await fisioNet.from('expedientes_clinicos').insert([{
                    id_paciente: nuevoPacienteId,
                    id_clinica: clinicaId,
                    folio_personalizado: folioSede,
                    numero_consecutivo: consecutivoFinal,
                    estado_expediente: 'ACTIVO'
                }]);
            }
        }

        let idFinalRedireccion = resultado?.data?.[0]?.id || pacienteExistenteId;

        alert("🎉 ¡Proceso completado con éxito y expediente asegurado en FisioCid!");
        
        if (idFinalRedireccion) {
            window.location.href = `historia-clinica.html?id=${idFinalRedireccion}`;
        } else {
            window.location.href = "historia-clinica.html";
        }

    } catch (err) {
        console.error("💥 [CATCH ERROR] Falla en el proceso:", err);
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


async function gestionarFolioAutomatico(idPacienteExistente = null, inputElemId = 'inputFolioExpediente', statusElemId = 'statusFolio') {
    const idClinica = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');
    const inputFolio = document.getElementById(inputElemId);
    const statusFolio = document.getElementById(statusElemId);

    if (!idClinica) {
        console.error("❌ Error: id_clinica_activa no encontrado en localStorage");
        return null;
    }

    try {
        // 1. SI EL PACIENTE YA EXISTE
        if (idPacienteExistente) {
            const { data: exp, error } = await fisioNet
                .from('expedientes_clinicos')
                .select('folio_personalizado')
                .eq('id_paciente', idPacienteExistente)
                .eq('id_clinica', idClinica)
                .maybeSingle();

            if (exp) {
                if (inputFolio) inputFolio.value = exp.folio_personalizado;
                if (statusFolio) {
                    statusFolio.className = 'text-success fw-bold mt-1';
                    statusFolio.innerHTML = '<i class="fas fa-check-circle me-1"></i> EXPEDIENTE LOCALIZADO EN RED';
                }
                return { folio: exp.folio_personalizado, nuevo: false };
            }
        }

        // 2. GENERAR NUEVO FOLIO
        const { data: conf, error: errConf } = await fisioNet
            .from('clinicas')
            .select('folio_prefijo, folio_sede, folio_separador')
            .eq('id', idClinica)
            .single();

        if (errConf) throw errConf;

        const { count, error: errCount } = await fisioNet
            .from('expedientes_clinicos')
            .select('id', { count: 'exact', head: true })
            .eq('id_clinica', idClinica);

        if (errCount) throw errCount;

        const totalRegistrados = count !== null && count !== undefined ? count : 0;
        const siguiente = totalRegistrados + 1;

        const prefijo = (conf.folio_prefijo || 'FC').toUpperCase();
        const sede = (conf.folio_sede || 'MIA').toUpperCase();
        const sep = conf.folio_separador || '-';
        const anio = new Date().getFullYear();
        
        const nuevoFolio = `${prefijo}${sep}${sede}${sep}${anio}${sep}${siguiente.toString().padStart(4, '0')}`;

        if (inputFolio) inputFolio.value = nuevoFolio;
        if (statusFolio) {
            statusFolio.className = 'text-primary fw-bold mt-1';
            statusFolio.innerHTML = '<i class="fas fa-magic me-1"></i> NUEVO EXPEDIENTE POR ASIGNAR';
        }
        
        return { folio: nuevoFolio, numero_consecutivo: siguiente, nuevo: true };

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN FOLIOS:", error);
        if (statusFolio) {
            statusFolio.className = 'text-warning fw-bold mt-1';
            statusFolio.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i> ERROR DE CONEXIÓN';
        }
        return null;
    }
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

async function buscarTutorEnBase(texto) {
    const lista = document.getElementById('listaTutores');
    if (!texto || texto.trim().length < 3) return;

    const entrada = texto.trim().toUpperCase();
    try {
        const palabras = entrada.split(/\s+/).filter(p => p.length > 0);
        let query = fisioNet.from('pacientes_maestros').select('id, nombre, apellido_paterno, apellido_materno, fecha_nacimiento, telefono, correo_electronico');

        // Búsqueda por prefijos aprovechando el índice
        if (palabras.length >= 1) query = query.ilike('nombre', `${palabras[0]}%`);
        if (palabras.length >= 2) query = query.ilike('apellido_paterno', `${palabras[1]}%`);

        const { data: tutores, error } = await query.limit(5);
        if (error) throw error;

        if (lista) {
            lista.innerHTML = '';
            if (!tutores || tutores.length === 0) {
                lista.innerHTML = '<div style="padding: 10px; color: #a0aec0; font-size: 0.85rem;">👤 No se encontró ningún adulto registrado con este nombre</div>';
                lista.style.display = 'block';
                document.getElementById('idTutorSeleccionado').value = ""; // Queda nulo si no existe en la DB
                return;
            }

            lista.style.display = 'block';

            tutores.forEach(t => {
                const item = document.createElement('div');
                item.className = 'item-busqueda-clinica';
                const nombreCompleto = `${t.nombre} ${t.apellido_paterno} ${t.apellido_materno || ''}`.toUpperCase();
                
                // Calculamos edad para mostrar en la etiqueta (ej. 34 AÑOS)
                let edadTexto = "";
                if (t.fecha_nacimiento) {
                    const hoy = new Date();
                    const cumple = new Date(t.fecha_nacimiento);
                    let edad = hoy.getFullYear() - cumple.getFullYear();
                    if (hoy.getMonth() < cumple.getMonth() || (hoy.getMonth() === cumple.getMonth() && hoy.getDate() < cumple.getDate())) edad--;
                    edadTexto = ` • 🕒 ${edad} AÑOS`;
                }

                item.innerHTML = `<div style="font-weight: bold; color: #2b6cb0;">👤 ${nombreCompleto}${edadTexto}</div>`;
                
                // 🎯 Al dar clic, inyectamos los datos y el UUID implícito
                item.onclick = () => {
                    document.getElementById('tutor-nombre').value = nombreCompleto;
                    document.getElementById('idTutorSeleccionado').value = t.id; // 👈 Guarda el UUID
                    document.getElementById('tutor-tel').value = t.telefono || "";
                    document.getElementById('correo-tutor').value = t.correo_electronico || "";
                    
                    lista.style.display = 'none';
                    //console.log("🔗 Tutor enlazado correctamente. UUID:", t.id);
                };
                lista.appendChild(item);
            });
        }
    } catch (err) {
        console.error("💥 Error en búsqueda de tutor:", err.message);
    }
}


// =====================================================================
// 📊 MOTOR DE EVALUACIÓN DE CUOTA DE PACIENTES POR PLAN
// =====================================================================
async function validarCuotaPaciente(userId, nivelSuscripcion) {
    const LIMITES = {
        'GRATUITO': 15,
        'BASICO': 60,
        'ESENCIAL': 200,
        'CLINICO': 999999,
        'ENTERPRISE': 999999,
        'BETA_TESTER': 999999
    };

    const limitePermitido = LIMITES[nivelSuscripcion] || 15;
    //console.log(`🔒 Límite asignado para plan ${nivelSuscripcion}: ${limitePermitido}`);

    if (limitePermitido >= 999999) {
        return { permitido: true };
    }

    try {
        // 🎯 Consulta exacta a la tabla vinculos_clinicos usando la columna profesional_id
        const { count, error } = await fisioNet
            .from('vinculos_clinicos')
            .select('*', { count: 'exact', head: true })
            .eq('profesional_id', userId);

        if (error) {
            console.error("⚠ Error consultando cuota de pacientes en DB:", error);
            return { permitido: true };
        }

        const totalRegistrados = count || 0;
        //console.log(`📈 Pacientes vinculados en la cuenta (ID ${userId}): ${totalRegistrados} de ${limitePermitido}`);

        if (totalRegistrados >= limitePermitido) {
            return {
                permitido: false,
                motivo: `Has alcanzado el límite de ${limitePermitido} pacientes activos permitido en tu Plan ${nivelSuscripcion}.\n\nActualmente tienes ${totalRegistrados} pacientes registrados.\nPara continuar registrando nuevos expedientes, por favor actualiza tu plan en el Módulo de Pagos.`
            };
        }

        return { permitido: true };

    } catch (err) {
        console.error("💥 Excepción al evaluar cuota:", err);
        return { permitido: true };
    }
}

document.addEventListener('click', (e) => ocultarListaSiEsExterno(e.target));
document.addEventListener('focusin', (e) => ocultarListaSiEsExterno(e.target));

// =====================================================================
// 🤖 AUTOCOMPLETADO DE HOMOCLAVE RENAPO + CANDADOS Y PARPADEO VISUAL
// =====================================================================

// 💡 Función auxiliar para hacer parpadear los campos de identidad
function hacerParpadearCamposBase(ids) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const bgOriginal = el.style.backgroundColor;
            const borderOriginal = el.style.borderColor;
            
            el.style.transition = 'all 0.3s ease';
            
            // Destello 1
            el.style.backgroundColor = '#fff3cd'; // Amarillo advertencia
            el.style.borderColor = '#ffc107';
            
            setTimeout(() => {
                el.style.backgroundColor = bgOriginal;
                el.style.borderColor = borderOriginal;
            }, 500);

            // Destello 2
            setTimeout(() => {
                el.style.backgroundColor = '#fff3cd';
                el.style.borderColor = '#ffc107';
            }, 1000);

            setTimeout(() => {
                el.style.backgroundColor = bgOriginal;
                el.style.borderColor = borderOriginal;
            }, 1500);
        }
    });
}

async function autocompletarHomoclaveRenapo() {
    const btn = document.getElementById('btnAutoHomo');
    const icono = document.getElementById('iconoAutoHomo');
    const msj = document.getElementById('msjHomoclaveAuto');
    const inputHomo = document.getElementById('curpHomo');

    const listaCampos = ['valNombre', 'valPaterno', 'valMaterno', 'valFecha', 'valGenero', 'valEstado'];

    // 1. Recolectar datos de pantalla
    const nombres = document.getElementById('valNombre')?.value.trim().toUpperCase() || "";
    const apellidoPaterno = document.getElementById('valPaterno')?.value.trim().toUpperCase() || "";
    const apellidoMaterno = document.getElementById('valMaterno')?.value.trim().toUpperCase() || "";
    const fechaNacimiento = document.getElementById('valFecha')?.value || ""; 
    const generoFull = document.getElementById('valGenero')?.value || "";
    const estadoSelect = document.getElementById('valEstado');
    
    const estadoTexto = (estadoSelect && estadoSelect.selectedIndex >= 0) 
        ? estadoSelect.options[estadoSelect.selectedIndex].text.toUpperCase() 
        : "";

    // Parpadeo de validación visual
    if (typeof hacerParpadearCamposBase === 'function') {
        hacerParpadearCamposBase(listaCampos);
    }

    // Validar datos mínimos obligatorios
    if (!nombres || !apellidoPaterno || !fechaNacimiento || !generoFull || !estadoSelect?.value) {
        if (msj) msj.innerHTML = "<span class='text-danger'>⚠️ Llena los datos marcados arriba primero.</span>";
        return;
    }

    // === 🛡️ CANDADOS DE SEGURIDAD ===
    if (nombres.length < 2 || apellidoPaterno.length < 2) {
        if (msj) msj.innerHTML = "<span class='text-danger'>❌ Error: Nombre y Paterno deben tener al menos 2 letras.</span>";
        return;
    }

    if (nombres === 'XX' || apellidoPaterno === 'XX' || nombres === 'NN') {
        if (msj) msj.innerHTML = "<span class='text-danger'>❌ Error: Escribe nombres reales.</span>";
        return;
    }

    if (/\d/.test(nombres) || /\d/.test(apellidoPaterno) || /\d/.test(apellidoMaterno)) {
        if (msj) msj.innerHTML = "<span class='text-danger'>❌ Error: Los nombres no deben llevar números.</span>";
        return;
    }

    if (apellidoPaterno.length > 2 && nombres.includes(apellidoPaterno)) {
        if (msj) msj.innerHTML = "<span class='text-danger'>❌ Error: Pusiste apellidos en el campo de Nombre.</span>";
        document.getElementById('valNombre')?.focus();
        return;
    }

    const anioNacimiento = parseInt(fechaNacimiento.split('-')[0], 10);
    const anioActual = new Date().getFullYear();
    if (isNaN(anioNacimiento) || anioNacimiento < 1916 || anioNacimiento > anioActual) {
        if (msj) msj.innerHTML = "<span class='text-danger'>❌ Error: Año de nacimiento ilógico.</span>";
        document.getElementById('valFecha')?.focus();
        return;
    }

    const generoTlaloc = (generoFull === 'HOMBRE') ? 'H' : 'M';

    // Estado de carga visual
    if (btn) btn.disabled = true;
    if (icono) icono.className = "fas fa-spinner fa-spin";
    if (msj) msj.innerHTML = "<span class='text-primary'>🔍 Verificando en RENAPO...</span>";

    try {
        // Conexión segura a la instancia de Supabase (fisioNet)
        const clienteSupabase = window.fisioNet || window.supabase;

        if (!clienteSupabase) {
            throw new Error("No se encontró la instancia de conexión con Supabase (fisioNet).");
        }

        const { data, error } = await clienteSupabase.functions.invoke('validar-curp', {
            body: { 
                nombres, 
                apellidoPaterno, 
                apellidoMaterno, 
                fechaNacimiento, 
                genero: generoTlaloc, 
                estado: estadoTexto 
            }
        });

        if (error) throw error;
        
        if (data.error || !data.curp) {
            if (msj) msj.innerHTML = "<span class='text-danger'>❌ No se encontró la CURP. Verifica la ortografía.</span>";
            return;
        }

        // 🎯 EXTRAER Y LLENAR ÚNICAMENTE LOS 2 DÍGITOS FINALES
        const homoclaveExtraida = data.curp.substring(16, 18).toUpperCase(); 

        if (inputHomo) {
            inputHomo.value = homoclaveExtraida;
        }

        if (msj) msj.innerHTML = "<span class='text-success'>✅ ¡Homoclave asignada!</span>";

        // 🔥 Disparar evento para que 'curpHomo' ejecute la consulta en la BD y gestione el folio
        if (inputHomo) {
            inputHomo.dispatchEvent(new Event('input', { bubbles: true }));
        }

    } catch (err) {
        console.error("❌ Error en consulta RENAPO:", err);
        if (msj) msj.innerHTML = `<span class='text-danger'>⚠️ ${err.message || 'Error de conexión con el servidor.'}</span>`;
    } finally {
        if (btn) btn.disabled = false;
        if (icono) icono.className = "fas fa-bolt";
        setTimeout(() => { 
            if (msj && msj.innerHTML.includes('asignada')) msj.innerHTML = ""; 
        }, 4000);
    }
}

// ==========================================
// 📜 CONTROL DEL MODAL DE PRIVACIDAD
// ==========================================
function abrirModalPrivacidad(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('modalPrivacidad');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalPrivacidad() {
    const modal = document.getElementById('modalPrivacidad');
    if (modal) modal.style.display = 'none';
}





// 🎯 LISTENER DISPARADOR AL ESCRIBIR LA HOMOCLAVE EN EL MODAL
document.getElementById('tutExpCurpHomo')?.addEventListener('input', async (e) => {
    const homo = e.target.value.trim().toUpperCase();

    if (homo.length === 2) {
        const parteBase = document.getElementById('tutExpCurpBase')?.value?.trim().toUpperCase() || '';
        const curpCompleta = `${parteBase}${homo}`;

        if (curpCompleta.length === 18) {
            await verificarTutorExistentePorCurpModal(curpCompleta);
        }
    }
});





async function abrirModalTutorExpress() {
    const modalEl = document.getElementById('modalTutorExpress');
    if (modalEl) {
        document.getElementById('formTutorExpress')?.reset();
        
        const nombreClinica = localStorage.getItem('nombre_clinica') || 'Clínica Activa';
        const lblSede = document.getElementById('lblSedeRegistroTutor');
        if (lblSede) lblSede.innerText = `Registrando Tutor en: ${nombreClinica.toUpperCase()}`;

        const statusEl = document.getElementById('statusFolioTutorExpress');
        if (statusEl) statusEl.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> GENERANDO FOLIO...';
        
        // Se especifican los IDs de los inputs dentro del modal
        await gestionarFolioAutomatico(null, 'inputFolioTutorExpress', 'statusFolioTutorExpress');

        tutorExpressExistenteId = null;
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
        modalInstance.show();
    }
}

async function verificarTutorExistentePorCurpModal(curpCompleta) {
    const statusEl = document.getElementById('statusFolioTutorExpress');
    const msjEl = document.getElementById('msjHomoclaveAutoTutor');

    if (!curpCompleta || curpCompleta.length !== 18) return;

    if (statusEl) {
        statusEl.className = 'text-primary fw-bold mt-1';
        statusEl.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> CONSULTANDO EXPEDIENTES EN RED...';
    }

    try {
        const { data: tutor, error } = await fisioNet
            .from('pacientes_maestros')
            .select('*')
            .eq('curp', curpCompleta.toUpperCase())
            .maybeSingle();

        if (error) throw error;

        if (tutor) {
            // 🅰️ TUTOR LOCALIZADO EN LA RED
            tutorExpressExistenteId = tutor.id;

            if (document.getElementById('tutExpTel')) document.getElementById('tutExpTel').value = tutor.telefono || '';
            if (document.getElementById('tutExpEmail')) document.getElementById('tutExpEmail').value = tutor.correo_electronico || '';

            await gestionarFolioAutomatico(tutor.id, 'inputFolioTutorExpress', 'statusFolioTutorExpress');

            if (msjEl) {
                msjEl.innerHTML = "<span class='text-success'>✅ ¡Tutor localizado en la red! Se vinculará directamente.</span>";
            }
        } else {
            // 🅱️ TUTOR NUEVO ABSOLUTO
            tutorExpressExistenteId = null;

            await gestionarFolioAutomatico(null, 'inputFolioTutorExpress', 'statusFolioTutorExpress');

            if (msjEl) {
                msjEl.innerHTML = "<span class='text-success'>✅ CURP Verificada (Tutor Nuevo)</span>";
            }
        }

    } catch (err) {
        console.error("❌ Error al verificar CURP de tutor:", err.message);
        if (statusEl) {
            statusEl.className = 'text-warning fw-bold mt-1';
            statusEl.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i> ERROR DE CONEXIÓN CON EXPEDIENTES';
        }
    }
}

// 1. Delegación de eventos global (Funciona aunque el modal cargue dinámicamente)
document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'tutExpCurpHomo') {
        evaluarCurpHomoclaveTutorExpress();
    }
});

// 2. Generador de CURP base
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

        // Disparar evaluación por si ya había homoclave de 2 dígitos escrita
        evaluarCurpHomoclaveTutorExpress();
    }
}

// 3. Consulta RENAPO para Tutor Express
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
        if (msj) msj.innerHTML = "<span class='text-danger'>⚠️ Completa los datos marcados con * primero.</span>";
        return;
    }

    if (btn) btn.disabled = true;
    if (msj) msj.innerHTML = "<span class='text-primary'>🔍 Verificando en RENAPO...</span>";

    try {
        const clienteSupabase = window.fisioNet || window.supabase;
        const { data, error } = await clienteSupabase.functions.invoke('validar-curp', {
            body: { 
                nombres, 
                apellidoPaterno, 
                apellidoMaterno, 
                fechaNacimiento, 
                genero: (generoFull === 'HOMBRE') ? 'H' : 'M', 
                estado: estadoTexto 
            }
        });

        if (error) throw error;

        if (data.error || !data.curp) {
            if (msj) msj.innerHTML = "<span class='text-danger'>❌ No se encontró la CURP en RENAPO.</span>";
            return;
        }

        const homoclaveExtraida = data.curp.substring(16, 18).toUpperCase(); 
        if (inputHomo) {
            inputHomo.value = homoclaveExtraida;
        }

        // 🚀 Llama directamente a la función de búsqueda de expediente
        await evaluarCurpHomoclaveTutorExpress();

    } catch (err) {
        console.error("❌ Error en RENAPO Tutor:", err);
        if (msj) msj.innerHTML = `<span class='text-danger'>⚠️ ${err.message || 'Error de conexión.'}</span>`;
    } finally {
        if (btn) btn.disabled = false;
    }
}

// 🎯 EVALUADOR CENTRAL DE CURP COMPLETA EN MODAL TUTOR EXPRESS
async function evaluarCurpHomoclaveTutorExpress() {
    const parteBase = document.getElementById('tutExpCurpBase')?.value?.trim().toUpperCase() || '';
    const homo = document.getElementById('tutExpCurpHomo')?.value?.trim().toUpperCase() || '';
    
    // Forzar mayúsculas en el input de homoclave
    const inputHomo = document.getElementById('tutExpCurpHomo');
    if (inputHomo && inputHomo.value !== homo) {
        inputHomo.value = homo;
    }

    const curpCompleta = `${parteBase}${homo}`;

    if (curpCompleta.length === 18) {
        await verificarTutorExistentePorCurpModal(curpCompleta);
    }
}