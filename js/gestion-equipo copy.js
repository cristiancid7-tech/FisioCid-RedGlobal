// ==========================================
// 🧠 GESTIÓN DE EQUIPO - FISIOCID PRO (CONSOLA DUAL)
// ==========================================

async function obtenerIdClinicaReal(userId) {
    let id = localStorage.getItem('id_clinica_actual');
    
    if (!id || id.includes("ID-DE") || id === "null" || id === "undefined") {
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
        let colorCargo = colab.rol_sistema === 'ADMIN_SISTEMA' ? '#2563eb' : (colab.rol_sistema === 'OPERATIVO' ? '#64748b' : '#10b981');
        const esInactivo = colab.estado === 'INACTIVO';
        return `
      
        <div style="background:white; padding:15px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; border-left:5px solid ${colorCargo}; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
            <div>
                <h4 style="margin:0; font-size:0.9rem; color:#1e293b; text-transform:uppercase;">
                    ${colab.id_profesional === localStorage.getItem('id_usuario_actual') ? '⭐ MI PERFIL' : colab.cargo_clinico}
                </h4>
                <p style="margin:5px 0 0 0; font-size:0.75rem; color:#64748b;">
                    <strong>Área:</strong> ${colab.area_ubicacion || 'GENERAL'}
                </p>
                <p style="margin:2px 0 0 0; font-size:0.65rem; color:#94a3b8;">
                    Turno: ${colab.turno || 'SIN ASIGNAR'}
                </p>
            </div>
            <span style="background:${colorCargo}20; color:${colorCargo}; padding:5px 12px; border-radius:10px; font-size:0.65rem; font-weight:900; text-transform:uppercase;">
                ${colab.rol_sistema}
            </span>
              <div style="display: flex; gap: 8px;">
    <button onclick="console.log('Cambiar Clave de: ${colab.id_profesional}')" title="Cambiar Contraseña">🔑</button>
    <button onclick="console.log('Toggle Estado de: ${colab.id_profesional}')" title="${esInactivo ? 'Reactivar' : 'Pausar'}">
        ${esInactivo ? '▶️' : '⏸️'}
    </button>
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
            estado: 'PENDIENTE',
            fecha_envio: new Date()
        }]);

        if (error) throw error;
        
        alert("✉️ Invitación enviada con éxito al profesional.");
        document.getElementById('emailInvitar').value = ''; // Limpiar campo
        
    } catch (err) { 
        alert("Error: " + err.message); 
    }
});

// ==========================================
// 🚀 MOTOR 2: CREAR APOYO CORPORATIVO (DERECHA)
// ==========================================
document.getElementById('btnEnviarInvAPOYO')?.addEventListener('click', async () => {
    // 1. Recolección de datos
    const alias = document.getElementById('userApoyo').value.trim().toLowerCase();
    const dominio = document.getElementById('labelDominio').innerText.replace('@', '').trim();
    const password = document.getElementById('passTemporal').value;
    const cargo = document.getElementById('cargoInvitarAPOYO').value; 
    const nombre = document.getElementById('nombreCompletoAPOYO').value;
    const rol = document.getElementById('rolInvitarapoyo').value;
    const area = document.getElementById('areaInvitarAPOYO').value.toUpperCase();
    const turno = document.getElementById('turnoInvitarAPOYO').value;
    const superior = document.getElementById('superiorInvitarAPOYO').value || null;

    if (!alias || !password || !cargo || !nombre) return alert("❌ Llena todos los campos (Nombre, Alias, Pass, Cargo).");

    const correo = `${alias}@${dominio}`;
    const btn = document.getElementById('btnEnviarInvAPOYO');
    btn.innerText = "PROCESANDO...";
    btn.disabled = true;

    try {
        const { data: { user: admin } } = await fisioNet.auth.getUser();
        const datosClinica = await obtenerIdClinicaReal(admin.id);
        
        // 🛠️ EXTRACCIÓN CORRECTA DEL ID
        const idClinicaReal = datosClinica?.id; 

        if (!idClinicaReal || idClinicaReal === "null" || idClinicaReal === "undefined") {
            throw new Error("¡ALERTA! El ID de la clínica está vacío en el sistema.");
        }

        // A. CREAR USUARIO EN AUTH
        const { data: authData, error: authErr } = await fisioAdmin.auth.signUp({
            email: correo,
            password: password,
            options: { data: { display_name: nombre } }
        });
        if (authErr) throw authErr;

        const uid = authData.user.id;
        console.log("✅ DEBUG: UID generado con éxito:", uid);

        // B. CREAR PERFIL (Identidad)
        console.log("✅ DEBUG: Creando perfil en clínica UUID:", idClinicaReal);
        const { error: pErr } = await fisioAdmin.from('perfiles').upsert([{
            id: uid,
            nombre_completo: nombre,
            rol_sistema: rol,
            id_clinica_principal: idClinicaReal
        }]);

        if (pErr) {
            console.error("❌ ERROR DETALLADO EN PERFILES:", pErr);
            throw new Error("Perfiles: " + pErr.message);
        }

        // C. GUARDAR COLABORADOR (Contrato)
        console.log("✅ DEBUG: Insertando colaborador final...");
        const newCollabId = crypto.randomUUID(); 
        const { error: cErr } = await fisioAdmin.from('colaboradores_clinica').upsert([{
            id: newCollabId,
            id_profesional: uid,
            id_clinica: idClinicaReal, // Mandamos el UUID limpio de texto
            rol_sistema: rol,
            cargo_clinico: cargo,
            estado: 'ACTIVO',
            fecha_inicio: new Date().toISOString(),
            area_asignada: area,
            turno: turno,
            id_superior_directo: superior
        }], { onConflict: 'id' }); // <--- Restaurado para evitar fallos de PK

        if (cErr) {
            console.error("❌ ERROR DETALLADO EN COLABORADORES:", cErr);
            throw new Error("Colaboradores: " + cErr.message);
        }

        alert("✅ ¡ÉXITO TOTAL! Usuario y colaborador creados de forma correcta.");
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

    // Cargar la tabla de colaboradores
    await cargarRedActual(clinica.id);
});