// ==========================================
// 🧠 GESTIÓN DE EQUIPO - FISIOCID PRO
// ==========================================

async function obtenerIdClinicaReal(userId) {
    // 1. Busqueda: ¿Es el dueño directo?
    let { data: clinica } = await fisioNet
        .from('clinicas')
        .select('id, nombre_clinica, dominio_corporativo')
        .eq('id_dueno', userId)
        .maybeSingle();

    // 2. Busqueda: Si no es el dueño, ¿es un colaborador activo?
    if (!clinica) {
        const { data: colab } = await fisioNet
            .from('colaboradores_clinica')
            .select('id_clinica')
            .eq('id_profesional', userId)
            .eq('estado', 'ACTIVO')
            .maybeSingle();

        if (colab?.id_clinica) {
            const { data: clinicaColab } = await fisioNet
                .from('clinicas')
                .select('id, nombre_clinica, dominio_corporativo')
                .eq('id', colab.id_clinica)
                .maybeSingle();
            
            clinica = clinicaColab;
        }
    }

    if (clinica) {
        const id = clinica.id;
        const nombre = clinica.nombre_clinica;
        const dominio = clinica.dominio_corporativo || 'fisiocid.com';

        // Sincronizamos LocalStorage para el resto del sistema
        localStorage.setItem('id_clinica_activa', id);
        localStorage.setItem('id_clinica_actual', id);
        localStorage.setItem('nombre_clinica', nombre);
        localStorage.setItem('clinica_dominio', dominio);

        return { id, nombre, dominio };
    } else {
        console.error("❌ No se encontró ninguna clínica vinculada a esta cuenta.");
        return { id: null, nombre: null, dominio: 'fisiocid.com' };
    }
}

// ==========================================
// 📦 NUEVA FUNCIÓN: CARGAR ÁREAS DESDE BOXES_CLINICA
// ==========================================
async function cargarAreasDesdeBoxes(idClinica) {
    if (!idClinica) return;

    try {
        const { data: boxes, error } = await fisioNet
            .from('boxes_clinica')
            .select('nombre_box, tipo_espacio')
            .eq('id_clinica', idClinica)
            .order('nombre_box', { ascending: true });

        if (error) throw error;

        let opcionesHTML = `<option value="GENERAL">ÁREA GENERAL / TODA LA CLÍNICA</option>`;

        if (boxes && boxes.length > 0) {
            opcionesHTML += boxes.map(b => 
                `<option value="${b.nombre_box.toUpperCase()}">📍 ${b.nombre_box.toUpperCase()} [${b.tipo_espacio || 'BOX'}]</option>`
            ).join('');
        }

        const areaProf = document.getElementById('areaInvitar');
        const areaApoyo = document.getElementById('areaInvitarAPOYO');

        if (areaProf) areaProf.innerHTML = opcionesHTML;
        if (areaApoyo) areaApoyo.innerHTML = opcionesHTML;

    } catch (err) {
        console.error("❌ ERROR AL CARGAR BOXES DE LA CLÍNICA:", err);
    }
}

// ==========================================
// 👔 CARGAR SUPERIORES DIRECTOS (MÉTODO SEGURO 2 PASOS)
// ==========================================
async function cargarSuperioresDirectos(idClinica) {
    if (!idClinica) return;

    try {
        // 1. Obtener colaboradores activos de la clínica
        const { data: equipo, error: errColab } = await fisioNet
            .from('colaboradores_clinica')
            .select('id_profesional, cargo_clinico')
            .eq('id_clinica', idClinica)
            .eq('estado', 'ACTIVO');

        if (errColab) throw errColab;

        let opcionesSuperiores = `<option value="">DIRECCIÓN GENERAL (SIN JEFE INTERMEDIO)</option>`;

        if (equipo && equipo.length > 0) {
            // Extraer IDs para consultar los perfiles de nombres
            const uids = equipo.map(c => c.id_profesional).filter(Boolean);

            const { data: perfiles, error: errPerf } = await fisioNet
                .from('perfiles')
                .select('id, nombre_completo')
                .in('id', uids);

            if (errPerf) console.warn("Aviso al cargar perfiles:", errPerf);

            // Crear mapa ID -> Nombre
            const mapaNombres = {};
            if (perfiles) {
                perfiles.forEach(p => { mapaNombres[p.id] = p.nombre_completo; });
            }

            opcionesSuperiores += equipo.map(colab => {
                const nombre = mapaNombres[colab.id_profesional] 
                    ? mapaNombres[colab.id_profesional].toUpperCase() 
                    : 'COLABORADOR';
                const cargo = (colab.cargo_clinico || 'STAFF').toUpperCase();

                return `<option value="${colab.id_profesional}">👤 ${nombre} — [${cargo}]</option>`;
            }).join('');
        }

        const superiorProf = document.getElementById('superiorInvitar');
        const superiorApoyo = document.getElementById('superiorInvitarAPOYO');

        if (superiorProf) superiorProf.innerHTML = opcionesSuperiores;
        if (superiorApoyo) superiorApoyo.innerHTML = opcionesSuperiores;

    } catch (err) {
        console.error("❌ ERROR AL CARGAR SUPERIORES DIRECTOS:", err);
    }
}


// ==========================================
// 🎨 RENDERIZADO DE TARJETAS
// ==========================================

function crearTarjetaEquipoInterno(usuario) {
    return `
    <div class="tarjeta-integrante" style="background: #f8fafc; border-left: 4px solid #2563eb; border-radius: 10px; padding: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; border-left-width: 4px; display: flex; flex-direction: column; justify-content: space-between; gap: 10px;">
        <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="background: #dbeafe; color: #1e40af; font-size: 0.68rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; text-transform: uppercase;">
                    <i class="fas fa-graduation-cap"></i> ${usuario.rol || 'STAFF'}
                </span>
                <span style="background: #eff6ff; color: #2563eb; font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: 1px solid #bfdbfe;">
                    🔑 ${usuario.acceso || 'ACCESO LIMITADO'}
                </span>
            </div>

            <h5 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #0f172a;">${usuario.nombre}</h5>
            <p style="margin: 2px 0 8px 0; font-size: 0.75rem; color: #64748b;">
                <i class="fas fa-envelope" style="margin-right: 4px;"></i>${usuario.email}
            </p>

            <div style="font-size: 0.75rem; color: #475569; background: #ffffff; padding: 6px 10px; border-radius: 6px; border: 1px solid #f1f5f9;">
                <div><strong>Área:</strong> ${usuario.area || 'General'}</div>
                <div><strong>Turno:</strong> ${usuario.turno || 'Sin Asignar'}</div>
            </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 6px; border-top: 1px solid #f1f5f9; padding-top: 8px;">
            <button class="btn-icon" title="Editar Permisos" onclick="abrirModalEditarColaborador('${usuario.id}')" style="background: #e2e8f0; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; color: #475569;">
                <i class="fas fa-cog"></i>
            </button>
        </div>
    </div>`;
}

function crearTarjetaAlianza(alianza) {
    return `
    <div class="tarjeta-alianza" style="background: #f8fafc; border-left: 4px solid #16a34a; border-radius: 10px; padding: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; border-left-width: 4px; display: flex; flex-direction: column; justify-content: space-between; gap: 10px;">
        <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="background: #dcfce7; color: #15803d; font-size: 0.68rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; text-transform: uppercase;">
                    🤝 ${alianza.especialidad || 'CONVENIO EXTERNO'}
                </span>
                <span style="background: #f0fdf4; color: #16a34a; font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: 1px solid #bbf7d0;">
                    ${alianza.beneficio || 'SIN DESC'}
                </span>
            </div>

            <h5 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #0f172a;">${alianza.nombre}</h5>
            <p style="margin: 2px 0 8px 0; font-size: 0.75rem; color: #64748b;">
                <i class="fas fa-user-tag" style="margin-right: 4px;"></i>Contacto: ${alianza.contacto || 'N/A'}
            </p>

            <div style="font-size: 0.75rem; color: #475569; background: #ffffff; padding: 6px 10px; border-radius: 6px; border: 1px solid #f1f5f9;">
                <div><i class="fas fa-envelope" style="margin-right: 4px;"></i>${alianza.email || 'Sin correo registrado'}</div>
            </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 6px; border-top: 1px solid #f1f5f9; padding-top: 8px;">
            <button class="btn-icon" title="Opciones de Convenio" style="background: #e2e8f0; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; color: #475569;">
                <i class="fas fa-cog"></i>
            </button>
        </div>
    </div>`;
}

// ==========================================
// 🔄 CARGAR RED Y DISTRIBUIR EN TARJETAS
// ==========================================
async function cargarRedActual(idClinica) {
    const contenedorInterno = document.getElementById('listaEquipoInterno');
    const contenedorExterno = document.getElementById('listaAlianzasExternas');
    const contadorSocios = document.getElementById('contadorSocios');

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        const idUsuarioActual = user?.id || localStorage.getItem('id_usuario_actual');

        let equipo = [];
        if (idClinica && idClinica.length >= 10) {
            const { data: colabs, error: errColab } = await fisioNet
                .from('colaboradores_clinica')
                .select('*')
                .eq('id_clinica', idClinica)
                .order('cargo_clinico', { ascending: true });
            
            if (!errColab) equipo = colabs || [];
        }

        let redConvenios = [];
        if (idUsuarioActual) {
            const { data: convenios, error: errRed } = await fisioNet
                .from('red_colaboracion')
                .select('*')
                .or(`id_doctor_emisor.eq.${idUsuarioActual},id_doctor_receptor.eq.${idUsuarioActual}`)
                .eq('estado_conexion', 'ACTIVO');

            if (!errRed) redConvenios = convenios || [];
        }

        const uidsColabs = equipo.map(c => c.id_profesional).filter(Boolean);
        const uidsRed = redConvenios.map(r => (r.id_doctor_emisor === idUsuarioActual ? r.id_doctor_receptor : r.id_doctor_emisor)).filter(Boolean);
        const todosLosIDs = [...new Set([...uidsColabs, ...uidsRed, idUsuarioActual])].filter(Boolean);

        let mapaPerfiles = {};

        if (todosLosIDs.length > 0) {
            const { data: perfProf } = await fisioNet
                .from('perfiles_profesionales')
                .select('*')
                .in('id', todosLosIDs);

            (perfProf || []).forEach(p => {
                mapaPerfiles[p.id] = {
                    ...p,
                    nombre: p.nombre_completo || p.nombre || p.nombre_contacto,
                    especialidad: p.especialidad_principal || p.especialidad || p.profesion || p.cargo_clinico || p.cargo,
                    correo: p.correo_contacto || p.correo_institucional || p.correo || p.email || p.email_contacto
                };
            });

            const { data: perfBasicos } = await fisioNet
                .from('perfiles')
                .select('*')
                .in('id', todosLosIDs);

            (perfBasicos || []).forEach(p => {
                if (!mapaPerfiles[p.id]) mapaPerfiles[p.id] = {};
                const exist = mapaPerfiles[p.id];
                exist.nombre = exist.nombre || p.nombre_completo || p.nombre;
                exist.correo = exist.correo || p.correo_institucional || p.correo || p.email || p.correo_contacto;
                exist.especialidad = exist.especialidad || p.profesion || p.especialidad || p.cargo;
            });
        }

        const internos = [];
        const externos = [];

        equipo.forEach(colab => {
            const perf = mapaPerfiles[colab.id_profesional] || {};
            const vinculo = (colab.tipo_vinculo || '').toUpperCase();
            const cargo = (colab.cargo_clinico || colab.cargo || '').toUpperCase();
            const rol = (colab.rol_sistema || '').toUpperCase();

            const esExterno = vinculo === 'EXTERNO' || 
                              cargo.includes('EXTERNO') || 
                              cargo.includes('ALIANZA') || 
                              cargo.includes('REFERIDO') ||
                              cargo.includes('QUIMICO') ||
                              cargo.includes('ENFERMERIA') ||
                              rol === 'SOCIOS_EXTERNOS';

            const profesionColab = colab.cargo_clinico || colab.cargo || colab.especialidad || perf.especialidad || perf.profesion || 'STAFF';
            const emailColab = perf.correo || colab.correo || colab.email || colab.correo_contacto || 'Sin correo registrado';
            const nombreColab = perf.nombre || colab.nombre_completo || colab.nombre || (colab.id_profesional === idUsuarioActual ? 'CRISTIAN MIGUEL CID ESPINDOLA' : 'COLABORADOR');

            if (esExterno) {
                externos.push({
                    id: colab.id,
                    especialidad: profesionColab,
                    beneficio: colab.tipo_vinculo || 'SIN DESC',
                    nombre: nombreColab,
                    contacto: colab.nombre_contacto || nombreColab,
                    email: emailColab
                });
            } else {
                internos.push({
                    id: colab.id,
                    rol: profesionColab,
                    acceso: colab.rol_sistema || 'STAFF_CLINICO',
                    nombre: nombreColab,
                    email: emailColab,
                    area: colab.area_asignada || colab.area_ubicacion || 'General',
                    turno: colab.turno || 'Sin Asignar'
                });
            }
        });

        redConvenios.forEach(conv => {
            const idContraparte = (conv.id_doctor_emisor === idUsuarioActual) ? conv.id_doctor_receptor : conv.id_doctor_emisor;
            const perfSocio = mapaPerfiles[idContraparte] || {};

            const nombreFinal = perfSocio.nombre || conv.nombre_entidad || conv.nombre_contacto || conv.nombre_completo || conv.nombre || 'DOCTOR / ALIANZA';
            const correoFinal = perfSocio.correo || conv.correo_contacto || conv.correo || conv.email || conv.email_contacto || conv.correo_entidad || 'Sin correo registrado';
            const profesionFinal = conv.profesion || conv.especialidad || conv.cargo_entidad || conv.tipo_convenio || conv.cargo_clinico || conv.cargo || conv.area_especialidad || perfSocio.especialidad || perfSocio.profesion || 'CONVENIO EXTERNO';
            const contactoFinal = conv.nombre_contacto || conv.persona_contacto || perfSocio.nombre || nombreFinal;

            const yaExiste = externos.some(e => e.nombre.toLowerCase() === nombreFinal.toLowerCase());

            if (!yaExiste) {
                externos.push({
                    id: conv.id,
                    especialidad: profesionFinal,
                    beneficio: conv.porcentaje_descuento ? `${conv.porcentaje_descuento}% DESC` : (conv.beneficio || 'SIN DESC'),
                    nombre: nombreFinal,
                    contacto: contactoFinal,
                    email: correoFinal
                });
            }
        });

        if (contadorSocios) {
            contadorSocios.innerText = `${internos.length + externos.length} En Red`;
        }

        if (contenedorInterno) {
            contenedorInterno.innerHTML = internos.length === 0
                ? `<p style="color:#64748b; font-size:0.85rem; grid-column:1/-1;">No hay colaboradores internos registrados.</p>`
                : internos.map(usr => crearTarjetaEquipoInterno(usr)).join('');
        }

        if (contenedorExterno) {
            contenedorExterno.innerHTML = externos.length === 0
                ? `<p style="color:#64748b; font-size:0.85rem; grid-column:1/-1;">No hay alianzas ni doctores externos registrados.</p>`
                : externos.map(ali => crearTarjetaAlianza(ali)).join('');
        }

    } catch (err) {
        console.error("❌ ERROR AL CARGAR LA RED EN GESTIÓN-EQUIPO:", err);
    }
}

// ==========================================
// 🚀 MOTOR 1: INVITAR PROFESIONALES (IZQUIERDA)
// ==========================================
document.getElementById('btnEnviarInv')?.addEventListener('click', async () => {
    const email = document.getElementById('emailInvitar').value.trim().toLowerCase();
    const cargo = document.getElementById('cargoInvitar').value;
    const tipoVinculo = document.getElementById('tipoVinculoInvitar')?.value || 'INTERNO';
    
    if (!email || !cargo) return alert("❌ Completa los campos obligatorios del profesional.");

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        const clinicaReal = await obtenerIdClinicaReal(user.id);

        if (!clinicaReal.id) throw new Error("ID de clínica no encontrado.");

        const { error } = await fisioNet.from('invitaciones_clinicas').insert([{
            id_admin_invita: user.id,
            correo_institucional: email,
            nombre_clinica: clinicaReal.nombre,
            id_clinica_padre: clinicaReal.id,
            rol_asignado: document.getElementById('rolInvitar').value,
            cargo_clinico: cargo,
            area_asignada: document.getElementById('areaInvitar').value.toUpperCase(),
            turno: document.getElementById('turnoInvitar').value,
            id_superior_directo: document.getElementById('superiorInvitar').value || null,
            tipo_vinculo: tipoVinculo,
            estado: 'PENDIENTE',
            fecha_envio: new Date()
        }]);

        if (error) throw error;
        
        alert(`✉️ Invitación enviada con éxito como profesional [${tipoVinculo}].`);
        document.getElementById('emailInvitar').value = ''; // Limpiar campo
        
    } catch (err) { 
        alert("Error: " + err.message); 
    }
});

// ==========================================
// 🚀 MOTOR 2: CREAR APOYO CORPORATIVO (MANTENIENDO SESIÓN DE ADMIN)
// ==========================================
document.getElementById('btnEnviarInvAPOYO')?.addEventListener('click', async () => {
    // 1. Recolección de datos
    let alias = document.getElementById('userApoyo').value.trim().toLowerCase();
    const dominio = document.getElementById('labelDominio').innerText.replace('@', '').trim();
    const password = document.getElementById('passTemporal').value;
    const cargo = document.getElementById('cargoInvitarAPOYO').value; 
    const nombre = document.getElementById('nombreCompletoAPOYO').value.trim().toUpperCase();
    const telefono = document.getElementById('telAPOYO')?.value.trim() || null;
    const rol = document.getElementById('rolInvitarapoyo').value;
    const area = document.getElementById('areaInvitarAPOYO').value.toUpperCase();
    const turno = document.getElementById('turnoInvitarAPOYO').value;
    const superior = document.getElementById('superiorInvitarAPOYO').value || null;
    const tipoVinculo = document.getElementById('tipoVinculoInvitarAPOYO')?.value || 'INTERNO';

    if (!alias || !password || !cargo || !nombre) return alert("❌ Llena todos los campos obligatorios (Nombre, Alias, Pass, Cargo).");

    if (alias.includes('@')) {
        alias = alias.split('@')[0];
    }

    const correoCorporativo = `${alias}@${dominio}`;
    const btn = document.getElementById('btnEnviarInvAPOYO');
    btn.innerText = "PROCESANDO...";
    btn.disabled = true;

    try {
        const { data: { user: admin } } = await fisioNet.auth.getUser();
        const datosClinica = await obtenerIdClinicaReal(admin.id);
        const idClinicaReal = datosClinica?.id; 

        if (!idClinicaReal || idClinicaReal === "null" || idClinicaReal === "undefined") {
            throw new Error("¡ALERTA! El ID de la clínica está vacío en el sistema.");
        }

        // 💡 CREACIÓN DE CLIENTE INDEPENDIENTE PARA NO CERRAR LA SESIÓN DEL ADMIN
        const supabaseUrl = fisioNet.supabaseUrl;
        const supabaseKey = fisioNet.supabaseKey;
        const clienteAuxiliarSupabase = supabase.createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false }
        });

        // A. CREAR USUARIO EN AUTH
        const { data: authData, error: authErr } = await clienteAuxiliarSupabase.auth.signUp({
            email: correoCorporativo,
            password: password,
            options: { 
                data: { 
                    display_name: nombre,
                    phone: telefono, 
                    rol_sistema: rol,  
                    es_staff: true
                } 
            }
        });

        if (authErr) throw authErr;
        const uid = authData.user?.id;

        if (!uid) throw new Error("No se pudo obtener el ID único del nuevo usuario.");

        // B. CREAR EN TABLA PERFILES GENERAL (Usando fisioNet con los permisos del Admin)
        const { error: pErr } = await fisioNet.from('perfiles').upsert([{
            id: uid,
            nombre_completo: nombre,
            rol_sistema: rol,
            correo_institucional: correoCorporativo,
            telefono: telefono,
            id_clinica_principal: idClinicaReal
        }]);

        if (pErr) throw new Error("Error creando perfil general: " + pErr.message);

        // C. REGISTRO EN PERFILES_PROFESIONALES (Satisfacer FK)
        const { error: pProfErr } = await fisioNet.from('perfiles_profesionales').upsert([{
            id: uid,
            nombre_completo: nombre,
            correo_institucional: correoCorporativo,
            telefono_contacto: telefono,
            especialidad: cargo
        }]);

        if (pProfErr) console.warn("Aviso en perfiles_profesionales:", pProfErr.message);

        // Pausa táctica de 300ms
        await new Promise(resolve => setTimeout(resolve, 300));

        // D. VINCULAR EN COLABORADORES_CLINICA
        const newCollabId = crypto.randomUUID(); 
        const { error: cErr } = await fisioNet.from('colaboradores_clinica').upsert([{
            id: newCollabId,
            id_profesional: uid,
            id_clinica: idClinicaReal,
            rol_sistema: rol,
            cargo_clinico: cargo,
            tipo_vinculo: tipoVinculo,
            estado: 'ACTIVO',
            fecha_inicio: new Date().toISOString(),
            area_asignada: area,
            turno: turno,
            id_superior_directo: superior
        }], { onConflict: 'id' });

        if (cErr) throw new Error("Colaboradores: " + cErr.message);

        alert(`✅ ¡ÉXITO TOTAL! Acceso y vinculación a clínica creados para: ${nombre}\nCorreo asignado: ${correoCorporativo}${telefono ? '\nTeléfono: ' + telefono : ''}`);
        location.reload();

    } catch (err) {
        console.error("Fallo maestro:", err);
        alert("⚠️ Error: " + err.message);
    } finally {
        btn.innerText = "Crear Acceso Corporativo";
        btn.disabled = false;
    }
});

// ==========================================
// 🤝 MODAL 1: NUEVO CONVENIO / ALIANZA
// ==========================================

function abrirModalNuevoConvenio() {
    const modal = document.getElementById('modalConvenios');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalConvenios() {
    const modal = document.getElementById('modalConvenios');
    if (modal) modal.style.display = 'none';
    const form = document.getElementById('formNuevoConvenio');
    if (form) form.reset();
}

async function guardarNuevoConvenio(e) {
    e.preventDefault();

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) throw new Error("No hay usuario autenticado.");

        const nomConvenio = document.getElementById('nomConvenio').value.trim();
        const contactoNombre = document.getElementById('contactoNombre').value.trim();
        const contactoTel = document.getElementById('contactoTel').value.trim();
        const emailContacto = document.getElementById('email_contacto').value.trim();
        const porcentajeDesc = document.getElementById('porcentajeDesc').value || 0;
        const tipoConvenio = document.getElementById('tipoConvenio').value;

        const { error } = await fisioNet
            .from('red_colaboracion')
            .insert([{
                id_doctor_emisor: user.id,
                nombre_entidad: nomConvenio,
                nombre_contacto: contactoNombre,
                telefono_contacto: contactoTel,
                correo_contacto: emailContacto,
                porcentaje_descuento: parseInt(porcentajeDesc),
                tipo_convenio: tipoConvenio,
                estado_conexion: 'ACTIVO'
            }]);

        if (error) throw error;

        alert('✅ Convenio / Alianza guardado exitosamente.');
        cerrarModalConvenios();

        const idClinicaActiva = localStorage.getItem('id_clinica_activa');
        cargarRedActual(idClinicaActiva);

    } catch (err) {
        console.error("❌ Error al guardar el convenio:", err);
        alert('Ocurrió un error al guardar el convenio: ' + (err.message || err));
    }
}

// ==========================================
// ⚙️ MODAL 2: GESTIÓN / EDICIÓN COLABORADOR
// ==========================================

async function abrirModalEditarColaborador(idColaborador) {
    try {
        if (!idColaborador) return;

        const { data: colab, error } = await fisioNet
            .from('colaboradores_clinica')
            .select('*')
            .eq('id', idColaborador)
            .single();

        if (error) throw error;

        let nombreMostrar = 'COLABORADOR';
        if (colab.id_profesional) {
            const { data: perf } = await fisioNet
                .from('perfiles')
                .select('nombre_completo')
                .eq('id', colab.id_profesional)
                .maybeSingle();
            
            if (perf?.nombre_completo) nombreMostrar = perf.nombre_completo;
        }

        document.getElementById('idColabActivo').value = colab.id;
        document.getElementById('nombreColabModal').innerText = `👤 ${nombreMostrar}`;
        
        if (document.getElementById('selectCargoModal')) document.getElementById('selectCargoModal').value = colab.cargo_clinico || '';
        if (document.getElementById('selectRolSistemaModal')) document.getElementById('selectRolSistemaModal').value = colab.rol_sistema || 'STAFF_CLINICO';
        if (document.getElementById('selectAreaModal')) document.getElementById('selectAreaModal').value = colab.area_asignada || 'GENERAL';
        if (document.getElementById('superiorModal')) document.getElementById('superiorModal').value = colab.id_superior_directo || '';
        if (document.getElementById('selectTurnoModal')) document.getElementById('selectTurnoModal').value = colab.turno || 'MATUTINO';
        if (document.getElementById('fechaFinModal')) document.getElementById('fechaFinModal').value = colab.fecha_finalizacion || '';
        if (document.getElementById('obsModal')) document.getElementById('obsModal').value = colab.observaciones || '';

        const modal = document.getElementById('modalConfigEquipo');
        if (modal) modal.style.display = 'flex';

    } catch (err) {
        console.error("❌ Error al cargar colaborador en modal:", err);
        alert("No se pudo cargar la información del colaborador.");
    }
}

function cerrarModalConfig() {
    const modal = document.getElementById('modalConfigEquipo');
    if (modal) modal.style.display = 'none';
    document.getElementById('idColabActivo').value = '';
}

async function guardarConfigEquipo() {
    const idColab = document.getElementById('idColabActivo').value;
    if (!idColab) return alert("No hay un colaborador seleccionado.");

    try {
        const cargo = document.getElementById('selectCargoModal').value;
        const rolSistema = document.getElementById('selectRolSistemaModal').value;
        const area = document.getElementById('selectAreaModal').value;
        const superior = document.getElementById('superiorModal').value;
        const turno = document.getElementById('selectTurnoModal').value;
        const fechaFin = document.getElementById('fechaFinModal').value || null;
        const obs = document.getElementById('obsModal').value;

        const { error } = await fisioNet
            .from('colaboradores_clinica')
            .update({
                cargo_clinico: cargo,
                rol_sistema: rolSistema,
                area_asignada: area,
                id_superior_directo: superior || null,
                turno: turno,
                fecha_finalizacion: fechaFin,
                observaciones: obs
            })
            .eq('id', idColab);

        if (error) throw error;

        alert('✅ Cambios guardados correctamente.');
        cerrarModalConfig();

        const idClinicaActiva = localStorage.getItem('id_clinica_activa');
        cargarRedActual(idClinicaActiva);

    } catch (err) {
        console.error("❌ Error al guardar configuración del colaborador:", err);
        alert('Ocurrió un error al guardar la configuración: ' + (err.message || err));
    }
}

// ==========================================
// ⚙️ ARRANQUE PRINCIPAL
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const formConvenio = document.getElementById('formNuevoConvenio');
    if (formConvenio) {
        formConvenio.addEventListener('submit', guardarNuevoConvenio);
    }

    const { data: { user } } = await fisioNet.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    const domGuardado = localStorage.getItem('clinica_dominio');
    if (!domGuardado || domGuardado === 'undefined' || domGuardado === 'null') {
        localStorage.removeItem('clinica_dominio');
    }

    const clinica = await obtenerIdClinicaReal(user.id);

    const spanDominio = document.getElementById('labelDominio');
    if (clinica && clinica.dominio) {
        if (spanDominio) spanDominio.innerText = `@${clinica.dominio}`;
    } else {
        if (spanDominio) spanDominio.innerText = `@fisiocid.com`;
    }

    if (clinica.nombre) {
        const brand = document.getElementById('clinicaBrand');
        if (brand) brand.innerText = clinica.nombre.toUpperCase();
    }

    if (clinica.id) {
        await cargarAreasDesdeBoxes(clinica.id);
        await cargarSuperioresDirectos(clinica.id);
        await cargarRedActual(clinica.id);
    }
});