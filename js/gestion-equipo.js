// ==========================================
// 🧠 GESTIÓN DE EQUIPO - FISIOCID PRO (CONSOLA DUAL)
// ==========================================

async function obtenerIdClinicaReal(userId) {
    // Buscar en cualquiera de las llaves habituales
    let id = localStorage.getItem('id_clinica_activa') || localStorage.getItem('id_clinica_actual');
    
    if (!id || id === "null" || id === "undefined" || id.length < 30) {
        console.log("🔍 Buscando clínica en Supabase para el usuario:", userId);
        
        const { data: clinica, error: errC } = await fisioNet
            .from('clinicas')
            .select('id, nombre_clinica, dominio_corporativo')
            .eq('id_dueno', userId)
            .maybeSingle();

        if (errC) {
            console.error("❌ ERROR DE SUPABASE AL BUSCAR CLÍNICA:", errC);
            return { id: null, nombre: null, dominio: null };
        }

        if (clinica) {
            id = clinica.id;
            // Sincronizamos todas las variables locales clave
            localStorage.setItem('id_clinica_activa', id);
            localStorage.setItem('id_clinica_actual', id);
            localStorage.setItem('nombre_clinica', clinica.nombre_clinica);
            localStorage.setItem('clinica_dominio', clinica.dominio_corporativo || 'fisiocid.com');
            return { id, nombre: clinica.nombre_clinica, dominio: clinica.dominio_corporativo };
        } else {
            return { id: null, nombre: null, dominio: null };
        }
    }
    
    return { 
        id, 
        nombre: localStorage.getItem('nombre_clinica'),
        dominio: localStorage.getItem('clinica_dominio') || 'fisiocid.com'
    };
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

        // Reemplazar inputs por selects dinámicos con las opciones reales de boxes_clinica
        const areaProf = document.getElementById('areaInvitar');
        const areaApoyo = document.getElementById('areaInvitarAPOYO');

        if (areaProf) {
            areaProf.outerHTML = `<select id="areaInvitar" style="width:100%; padding:12px; border-radius:12px; border:2px solid #e2e8f0; font-weight:600; background:white;">${opcionesHTML}</select>`;
        }
        if (areaApoyo) {
            areaApoyo.outerHTML = `<select id="areaInvitarAPOYO" style="width:100%; padding:12px; border-radius:12px; border:2px solid #e2e8f0; font-weight:600; background:white;">${opcionesHTML}</select>`;
        }

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

async function cargarRedActual(idClinica) {
    const contenedor = document.getElementById('listaRedActual'); 
    if (!contenedor) return;

    if (!idClinica || idClinica.length < 30) {
        contenedor.innerHTML = `
            <div style="text-align:center; padding:20px; grid-column: 1/-1;">
                <p style="color:#ef4444; font-weight:bold;">🚨 ERROR DE ACCESO</p>
                <p style="font-size:0.8rem; color:#64748b;">No se pudo identificar la clínica activa.</p>
            </div>`;
        return;
    }

    const { data: equipo, error } = await fisioNet
        .from('colaboradores_clinica')
        .select('*')
        .eq('id_clinica', idClinica)
        .order('cargo_clinico', { ascending: true });

    if (error) {
        console.error("❌ ERROR AL CARGAR EQUIPO:", error);
        return;
    }

    if (!equipo || equipo.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px; grid-column: 1/-1;">No hay colaboradores activos en esta clínica.</p>';
        return;
    }

    contenedor.innerHTML = equipo.map(colab => {
        const esExterno = colab.tipo_vinculo === 'EXTERNO';
        let colorCargo = colab.rol_sistema === 'ADMIN_SISTEMA' ? '#2563eb' : (esExterno ? '#10b981' : '#3b82f6');
        const esInactivo = colab.estado === 'INACTIVO';

        return `
        <div style="background:white; padding:15px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; border-left:5px solid ${colorCargo}; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
            <div>
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                    <span style="font-size:0.6rem; padding:2px 6px; border-radius:4px; font-weight:800; background:${esExterno ? '#dcfce7' : '#dbeafe'}; color:${esExterno ? '#15803d' : '#1e40af'};">
                        ${esExterno ? '🟢 EXTERNO / ALIANZA' : '🔵 INTERNO'}
                    </span>
                </div>
                <h4 style="margin:0; font-size:0.9rem; color:#1e293b; text-transform:uppercase;">
                    ${colab.id_profesional === localStorage.getItem('id_usuario_actual') ? '⭐ MI PERFIL' : colab.cargo_clinico}
                </h4>
                <p style="margin:5px 0 0 0; font-size:0.75rem; color:#64748b;">
                    <strong>Área:</strong> ${colab.area_asignada || colab.area_ubicacion || 'GENERAL'}
                </p>
                <p style="margin:2px 0 0 0; font-size:0.65rem; color:#94a3b8;">
                    Turno: ${colab.turno || 'SIN ASIGNAR'}
                </p>
            </div>

            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
                <span style="background:${colorCargo}20; color:${colorCargo}; padding:5px 12px; border-radius:10px; font-size:0.65rem; font-weight:900; text-transform:uppercase;">
                    ${colab.rol_sistema}
                </span>
                <div style="display: flex; gap: 8px;">
                    <button onclick="console.log('Cambiar Clave de: ${colab.id_profesional}')" title="Cambiar Contraseña" style="border:none; background:#f1f5f9; padding:5px 8px; border-radius:6px; cursor:pointer;">🔑</button>
                    <button onclick="console.log('Toggle Estado de: ${colab.id_profesional}')" title="${esInactivo ? 'Reactivar' : 'Pausar'}" style="border:none; background:#f1f5f9; padding:5px 8px; border-radius:6px; cursor:pointer;">
                        ${esInactivo ? '▶️' : '⏸️'}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
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
// 🚀 MOTOR 2: CREAR APOYO CORPORATIVO (DERECHA)
// ==========================================
// ==========================================
// 🚀 MOTOR 2: CREAR APOYO CORPORATIVO (DERECHA)
// ==========================================
document.getElementById('btnEnviarInvAPOYO')?.addEventListener('click', async () => {
    // 1. Recolección de datos
    let alias = document.getElementById('userApoyo').value.trim().toLowerCase();
    const dominio = document.getElementById('labelDominio').innerText.replace('@', '').trim();
    const password = document.getElementById('passTemporal').value;
    const cargo = document.getElementById('cargoInvitarAPOYO').value; 
    const nombre = document.getElementById('nombreCompletoAPOYO').value.trim().toUpperCase();
    const rol = document.getElementById('rolInvitarapoyo').value;
    const area = document.getElementById('areaInvitarAPOYO').value.toUpperCase();
    const turno = document.getElementById('turnoInvitarAPOYO').value;
    const superior = document.getElementById('superiorInvitarAPOYO').value || null;
    const tipoVinculo = document.getElementById('tipoVinculoInvitarAPOYO')?.value || 'INTERNO';

    if (!alias || !password || !cargo || !nombre) return alert("❌ Llena todos los campos (Nombre, Alias, Pass, Cargo).");

    // Limpieza de alias por si el navegador autorrellenó un email completo
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

        // A. CREAR USUARIO EN AUTH
        const { data: authData, error: authErr } = await fisioAdmin.auth.signUp({
            email: correoCorporativo,
            password: password,
            options: { data: { display_name: nombre } }
        });
        if (authErr) throw authErr;

        const uid = authData.user.id;

        // B. CREAR PERFIL EN TABLA 'perfiles'
        const { error: pErr } = await fisioAdmin.from('perfiles').upsert([{
            id: uid,
            nombre_completo: nombre,
            rol_sistema: rol,
            correo_institucional: correoCorporativo,
            id_clinica_principal: idClinicaReal
        }]);

        if (pErr) throw new Error("Perfiles: " + pErr.message);

        // C. GUARDAR COLABORADOR
        const newCollabId = crypto.randomUUID(); 
        const { error: cErr } = await fisioAdmin.from('colaboradores_clinica').upsert([{
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

        alert(`✅ ¡ÉXITO TOTAL! Acceso creado para: ${nombre}\nCorreo asignado: ${correoCorporativo}`);
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
// ⚙️ ARRANQUE PRINCIPAL
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await fisioNet.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    const clinica = await obtenerIdClinicaReal(user.id);
    
    // Configurar marca y dominio visual
    if (clinica.nombre) {
        const brand = document.getElementById('clinicaBrand');
        if (brand) brand.innerText = clinica.nombre.toUpperCase();
    }
    if (clinica.dominio) {
        const spanDominio = document.getElementById('labelDominio');
        if (spanDominio) spanDominio.innerText = `@${clinica.dominio}`;
    }

    // 🔗 Cargas dinámicas ligadas a la clínica
    if (clinica.id) {
        await cargarAreasDesdeBoxes(clinica.id);        // Carga camillas/espacios reales de boxes_clinica
        await cargarSuperioresDirectos(clinica.id);    // Carga lista de superiores reales
        await cargarRedActual(clinica.id);             // Carga lista de colaboradores
    }
});