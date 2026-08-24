let pacienteExistenteId = null;

document.addEventListener('DOMContentLoaded', () => {
    aplicarIdentidadCamaleonica();

    // 🔥 1. MAYÚSCULAS AUTOMÁTICAS (Menos en correo)
    document.addEventListener('input', (e) => {
        const el = e.target;
        if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && 
             el.type !== 'email' && el.type !== 'password' && el.id !== 'valemail') {
            el.value = el.value.toUpperCase();
        }
    });

    // 🔍 2. BUSCADOR CON FILTRO DE SEGURIDAD Y CURP
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

    document.addEventListener('click', (e) => {
        const lista = document.getElementById('listaCitas');
        if (lista && e.target.id !== 'valNombre') lista.style.display = 'none';
    });

    // 🎯 3. ACTIVAR MODALES (CURP y Convenios)
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

    // 🚀 4. AUTOCARGA SI VIENE DE LA LISTA
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('id');
    if (editId) { cargarPacienteParaEdicion(editId); }
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
            window.pacienteCargado = data; // Guardamos todo el objeto para referencia
            pacienteExistenteId = data.id;
            
            // 🚀 Mandamos a rellenar con un pequeño delay para que el DOM esté listo
            setTimeout(() => llenarFormularioCompleto(data), 100);
        }
    } catch (err) { 
        console.error("❌ Error al cargar datos:", err); 
    }
}

async function llenarFormularioCompleto(p) {
    console.log("💉 Rellenando formulario para:", p.nombre);

    // 1. Mapeo de Identificadores básicos y Estado
    const mapIds = {
        'valNombre': p.nombre, 
        'valPaterno': p.apellido_paterno, 
        'valMaterno': p.apellido_materno,
        'valFecha': p.fecha_nacimiento, 
        'valGenero': p.genero, 
        'valEstado': p.estado_nacimiento, // 🎯 Guardado como sigla (ej. PL)
        'valOcupacion': p.ocupacion,
        'valTelefono': p.telefono, 
        'valemail': p.correo_electronico,
        'valDireccion': p.direccion_completa,
        'valEmergenciaNom': p.contacto_emergencia_nombre, 
        'valEmergenciaPar': p.contacto_emergencia_parentesco,
        'valEmergenciaTel': p.contacto_emergencia_tel
    };

    // 2. Llenado con disparo de eventos
    for (const [id, val] of Object.entries(mapIds)) {
        const el = document.getElementById(id); 
        if (el && val !== undefined && val !== null) {
            el.value = val;
            
            // Disparamos eventos para que la interfaz reaccione (Edad y CURP)
            if (id === 'valFecha') actualizarInterfazEdad(); 
            
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // 3. SECCIÓN DEL TUTOR (Si es menor de edad)
    if (p.es_menor_edad) {
        
        // Mostramos el cuadro rojo de la imagen f097de.png
        document.getElementById('seccion-tutor')?.classList.remove('d-none');
        document.getElementById('bloque-contacto-adulto')?.classList.add('d-none');
        document.getElementById('btnCopiarTutor')?.classList.remove('d-none');

        // Mapeo manual por los IDs específicos del tutor
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

    // 4. CURP y Homoclave
    if (p.curp && p.curp.length >= 18) {
        document.getElementById('curpAuto').value = p.curp.substring(0, 16).toUpperCase();
        document.getElementById('curpHomo').value = p.curp.substring(16, 18).toUpperCase();
        document.getElementById('curpHomo').dispatchEvent(new Event('input')); // Quita el borde rojo
    }

    // 5. Llenado de Antecedentes por "name"
    const setByName = (name, val) => {
        const el = document.querySelector(`[name="${name}"]`); 
        if (el && val !== undefined && val !== null) el.value = val;
    };

    setByName('alertas_seguridad', p.alertas_seguridad);
    setByName('tipo_sangre', p.tipo_sangre);
    setByName('lateralidad', p.lateralidad);
    setByName('alergias', p.alergias);
    setByName('antecedentes_heredofamiliares', p.antecedentes_heredofamiliares);
    setByName('antecedentes_patologicos', p.antecedentes_patologicos);
    setByName('antecedentes_no_patologicos', p.antecedentes_no_patologicos);
    setByName('farmacologia_activa', p.farmacologia_activa);
    setByName('antecedentes_quirurgicos', p.antecedentes_quirurgicos);
    setByName('notas_precaucion', p.notas_precaucion);
    // 6. Sincronizar Folio
    if (p.id) await gestionarFolioAutomatico(p.id);
}




async function buscarEnAgenda(texto) {
    const lista = document.getElementById('listaCitas');
    if (!lista) return;

    // Mostramos un indicador simple de que está buscando
    lista.innerHTML = '<div style="padding: 10px; color: #666;"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>';
    lista.style.display = 'block';

    try {
        const { data: pacientes, error } = await fisioNet
            .from('pacientes_maestros')
            .select('id, nombre, apellido_paterno, apellido_materno, curp, estado_nacimiento, numero_expediente_sede, es_menor_edad, genero, fecha_nacimiento, telefono, correo_electronico, ocupacion, direccion_completa, contacto_emergencia_nombre, contacto_emergencia_parentesco, contacto_emergencia_tel, antecedentes_heredofamiliares, antecedentes_patologicos, antecedentes_no_patologicos, alertas_seguridad, tipo_sangre, lateralidad, alergias, farmacologia_activa, antecedentes_quirurgicos, notas_precaucion, acceso_red_activo, nombre_tutor, telefono_tutor, parentesco_tutor, correo_tutor') 
            .or(`nombre.ilike.%${texto}%,apellido_paterno.ilike.%${texto}%,curp.ilike.%${texto}%`)
            .order('nombre', { ascending: true })
            .limit(5);

        if (error) throw error;

        if (pacientes && pacientes.length > 0) {
            lista.innerHTML = ''; 
            pacientes.forEach(p => {
                const item = document.createElement('div');
                item.style = "padding: 12px; cursor: pointer; border-bottom: 1px solid #edf2f7;";
                item.innerHTML = `
                    <div class="fw-bold" style="color: var(--primary); font-size: 0.9rem;">${p.nombre} ${p.apellido_paterno}</div>
                    <div style="font-size: 0.75rem; color: #718096;">CURP: ${p.curp || 'N/A'}</div>
                `;
                
                item.onclick = () => { 
                    pacienteExistenteId = p.id;
                    window.pacienteCargado = p; 
                    llenarFormularioCompleto(p); 
                    lista.style.display = 'none'; 
                };
                lista.appendChild(item);
            });
        } else {
            lista.innerHTML = '<div style="padding: 10px; color: #e53e3e; font-size: 0.8rem;">❌ No se encontró el paciente</div>';
            setTimeout(() => { lista.style.display = 'none'; }, 2000);
        }
    } catch (err) {
        console.error("Error en búsqueda global:", err);
        lista.style.display = 'none';
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
function procesarCurp() {
    const nomRaw = document.getElementById('valNombre')?.value || "";
    const patRaw = document.getElementById('valPaterno')?.value.trim() || "";
    const matRaw = document.getElementById('valMaterno')?.value.trim() || "X";
    const fec = document.getElementById('valFecha')?.value || "";
    const est = document.getElementById('valEstado')?.value || "";

    if (!nomRaw || !patRaw || !fec || !est) return;
    
    // 🚀 LÓGICA DE GÉNERO PARA CURP
    const valGeneroOriginal = document.getElementById('valGenero')?.value;
    let gen = 'X'; 
    if (valGeneroOriginal === 'HOMBRE') {
        gen = 'H';
    } else if (valGeneroOriginal === 'MUJER') {
        gen = 'M';
    }

    // 🎯 FILTRADO INTELIGENTE: Procesamos nombre y limpiamos apellidos con conectores
    const { nombre: nom } = procesarNombreMexicano(nomRaw);
    const pat = limpiarApellidoMexicano(patRaw); // "CID" -> "CID"
    const mat = limpiarApellidoMexicano(matRaw); // "DE LOS SANTOS" -> "SANTOS"
    
    // La validación ahora revisa las cadenas ya procesadas y limpias
    if (nom.length >= 2 && pat.length >= 2 && fec && est.length === 2) {
        const l1 = pat[0] || ""; 
        const l2 = pat.slice(1).match(/[AEIOU]/)?.[0] || "X";
        const l3 = mat[0] || "X"; // 🎯 Tomará la 'S' de SANTOS en vez de la 'D' de DE
        const l4 = nom[0] || "";
        const aa = fec.substring(2, 4); 
        const mm = fec.substring(5, 7); 
        const dd = fec.substring(8, 10);
        
        // Consonantes internas
        const c1 = pat.slice(1).match(/[BCDFGHJKLMNPQRSTVWXYZ]/)?.[0] || "X";
        const c2 = mat.slice(1).match(/[BCDFGHJKLMNPQRSTVWXYZ]/)?.[0] || "X"; // 🎯 Tomará la 'N' de SANTOS
        const c3 = nom.slice(1).match(/[BCDFGHJKLMNPQRSTVWXYZ]/)?.[0] || "X";
        
        document.getElementById('curpAuto').value = `${l1}${l2}${l3}${l4}${aa}${mm}${dd}${gen}${est}${c1}${c2}${c3}`.toUpperCase();
   
        gestionarFolioAutomatico();
    }
}

document.getElementById('formRegistroPaciente')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.disabled = true; 
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> GUARDANDO...';

    try {
        // 1. Obtener usuario y clínica actual
        const { data: { user } } = await fisioNet.auth.getUser();
        const clinicaId = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');

        // 🚀 2. CONSULTA DE ROL REAL (Basado en tus columnas: id_profesional y rol_sistema)
        const { data: colaborador } = await fisioNet
            .from('colaboradores_clinica')
            .select('rol_sistema')
            .eq('id_profesional', user.id)
            .eq('id_clinica', clinicaId)
            .maybeSingle();

        const rolReal = colaborador?.rol_sistema || 'OPERATIVO';

        // 3. Preparación de datos básicos
        const curpFinal = (document.getElementById('curpAuto').value + document.getElementById('curpHomo').value).toUpperCase();
        const formData = new FormData(e.target);
        const datos = Object.fromEntries(formData.entries());
        const estadoSeleccionado = document.getElementById('valEstado')?.value || null;
        
        delete datos.estado_nacimiento; delete datos.homoclave_curp; delete datos.id_convenio; 
        if (!datos.fecha_nacimiento) datos.fecha_nacimiento = null;

        // Lógica de Edad
        const fechaNac = new Date(datos.fecha_nacimiento);
        const hoy = new Date();
        let edad = hoy.getFullYear() - fechaNac.getFullYear();
        if (hoy.getMonth() < fechaNac.getMonth() || (hoy.getMonth() === fechaNac.getMonth() && hoy.getDate() < fechaNac.getDate())) edad--;
        const esMenor = edad < 18;

        const folioSede = document.getElementById('inputFolioExpediente')?.value || null;

        // 🚀 4. GESTIÓN DE EMAILS Y ACCESO (PROTEGIDO CONTRA DUPLICADOS)
        const emailTutor = document.getElementById('correo-tutor')?.value?.toLowerCase().trim() || null;
        const emailAdulto = document.getElementById('valemail')?.value?.toLowerCase().trim() || null;
        let emailActualFormulario = esMenor ? emailTutor : emailAdulto;

        const emailPrevioBD = (window.pacienteCargado?.correo_electronico || window.pacienteCargado?.correo_tutor || "").toLowerCase();
        let idAuth = pacienteExistenteId ? window.pacienteCargado?.id_usuario_auth : null;
        

        if (emailActualFormulario === user.email.toLowerCase()) {
            console.log("🎯 El doctor se está registrando como paciente. Vinculando ID de Auth actual...");
            idAuth = user.id; 
        }

        if (emailActualFormulario && emailActualFormulario.includes('@')) {
            // Generar iniciales para la contraseña (por si se necesita crear)
            const n = datos.nombre?.charAt(0).toUpperCase() || 'P';
            const a = datos.apellido_paterno?.charAt(0).toUpperCase() || 'C';
            const passDinamica = `${n}${a}${new Date().getFullYear()}!`;

            if (!pacienteExistenteId) {
                // INTENTO DE SIGNUP (PACIENTE NUEVO)
                const { data: aPac, error: authErr } = await fisioAdmin.auth.signUp({ 
                    email: emailActualFormulario, 
                    password: passDinamica,
                    options: {
                        data: { 
                            display_name: esMenor ? document.getElementById('tutor-nombre')?.value : datos.nombre,
                            tipo_cuenta: esMenor ? 'tutor' : 'paciente_adulto'
                        }
                    }
                });

                if (aPac?.user) {
                    idAuth = aPac.user.id;
                } else if (authErr && (authErr.status === 422 || authErr.message.includes("already registered"))) {
                    // 🎯 AQUÍ ESTÁ EL TRUCO: Si ya existe el correo (el papá ya tiene cuenta), 
                    // simplemente no asignamos idAuth nuevo, pero dejamos que el proceso siga.
                    console.log("ℹ️ El correo ya existe en Auth. Se vinculará el expediente a la cuenta existente.");
                }
            } 
            else if (pacienteExistenteId && emailActualFormulario !== emailPrevioBD && emailPrevioBD !== "") {
                // EDICIÓN CON CAMBIO DE CORREO
                const confirmarCambio = confirm(`⚠️ ¿Deseas cambiar el correo de acceso?\n\nDe: ${emailPrevioBD}\nA: ${emailActualFormulario}`);
                if (confirmarCambio && idAuth) {
                    const { error: updateErr } = await fisioAdmin.auth.admin.updateUserById(idAuth, { email: emailActualFormulario });
                    if (updateErr) console.error("Error Auth Update:", updateErr.message);
                }
            }
        }

        // 5. Payload para la tabla Maestra
        const payload = {
            ...datos,
            estado_nacimiento: estadoSeleccionado,
            curp: curpFinal.length === 18 ? curpFinal : null,
            creado_por: user.id, 
            id_clinica: clinicaId, 
            id_clinica_origen: clinicaId,
            nombre_clinica: localStorage.getItem('nombre_clinica'),
            id_usuario_auth: idAuth, 
            fecha_registro: new Date().toISOString(),
            es_menor_edad: esMenor,
            nombre_tutor: esMenor ? document.getElementById('tutor-nombre')?.value.toUpperCase() : null,
            telefono_tutor: esMenor ? document.getElementById('tutor-tel')?.value : null,
            parentesco_tutor: esMenor ? document.getElementById('tutor-parentesco')?.value.toUpperCase() : null,
            correo_tutor: esMenor ? emailTutor : null,
            correo_electronico: !esMenor ? emailAdulto : (datos.correo_electronico || null),

            numero_expediente_sede: folioSede
        };

        let resultado;
        if (pacienteExistenteId) {
            resultado = await fisioNet.from('pacientes_maestros').update(payload).eq('id', pacienteExistenteId).select();
        } else {
            resultado = await fisioNet.from('pacientes_maestros').insert([payload]).select();
            
            if (!resultado.error && resultado.data) {
                const nuevoPacienteId = resultado.data[0].id;
                
                // Vínculo Clínico con ROL REAL
                await fisioNet.from('vinculos_clinicos').insert([{
                    paciente_id: nuevoPacienteId,
                    profesional_id: user.id,
                    id_clinica: clinicaId,
                    rol_en_relacion: rolReal,
                    estado_vinculo: 'ACTIVO'
                }]);
                
                // Registro de Expediente con Consecutivo Numérico
                const numeroLimpio = (folioSede || "0").replace(/\D/g, ''); 
                const consecutivoFinal = parseInt(numeroLimpio) || 0;

                await fisioNet.from('expedientes_clinicos').insert([{
                    id_paciente: nuevoPacienteId,
                    id_clinica: clinicaId,
                    folio_personalizado: folioSede,
                    numero_consecutivo: consecutivoFinal,
                    estado_expediente: 'ACTIVO'
                }]);
            }
        }

        if (resultado.error) throw resultado.error;

        // 🚀 6. MENSAJE FINAL INTELIGENTE
        let mensaje = "🎉 ¡Expediente Guardado!";
        if (idAuth) {
            const n = datos.nombre?.charAt(0).toUpperCase() || 'P';
            const a = datos.apellido_paterno?.charAt(0).toUpperCase() || 'C';
            const pass = `${n}${a}${new Date().getFullYear()}!`;
            mensaje += `\n\n🔐 ACCESO CREADO:\n📧 User: ${emailActualFormulario}\n🔑 Pass: ${pass}`;
        } else if (emailActualFormulario) {
            mensaje += `\n\nℹ️ El correo ${emailActualFormulario} ya está vinculado a este u otro expediente de la familia.`;
        }

        alert(mensaje);
        window.location.href = `historia-clinica.html?id=${resultado.data[0].id}`;

    } catch (err) {
        alert("Error: " + err.message);
        btnSubmit.disabled = false; 
        btnSubmit.innerHTML = "GUARDAR EXPEDIENTE";
    }
});

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