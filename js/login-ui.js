document.addEventListener('DOMContentLoaded', () => {
    // Si venimos regresando de un Login de Google, comprobamos si ya hay sesión activa
    comprobarSesionExistente();

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('logEmail').value;
            const pass = document.getElementById('logPass').value;
            await iniciarSesion(email, pass);
        });
    }

    const linkOlvide = document.getElementById('olvidePass'); 
    if (linkOlvide) {
        linkOlvide.onclick = async (e) => {
            e.preventDefault();
            const email = prompt("INGRESA TU CORREO PARA RESTABLECER CREDENCIALES:");
            if (email) {
                try {
                    const { error } = await fisioNet.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
                        redirectTo: window.location.origin + '/restablecer-password.html'
                    });
                    if (error) alert("💥 Error: " + error.message);
                    else alert("📧 Enlace enviado. Revisa tu bandeja de entrada.");
                } catch(err) {
                    console.error(err);
                }
            }
        };
    }
});

// Función para capturar logins automáticos (ej. regreso de Google OAuth)
async function comprobarSesionExistente() {
    const { data: { session } } = await fisioNet.auth.getSession();
    if (session?.user) {
        // Si el usuario ya está autenticado por Google, procesamos su acceso directo
        await procesarAccesoDirecto(session.user);
    }
}

// ============================================================================
// 🎛️ SWITCH INTERACTIVO DE PESTAÑAS (CONTROL VISUAL)
// ============================================================================
function switchLoginTab(rol) {
    const formDoc = document.getElementById('loginFormDoctor');
    const formStaff = document.getElementById('loginFormStaff');
    const formPac = document.getElementById('loginFormPaciente');
    
    const tabDoc = document.getElementById('tabDoctor');
    const tabStaff = document.getElementById('tabStaff');
    const tabPac = document.getElementById('tabPaciente');

    if (formDoc) formDoc.style.display = 'none';
    if (formStaff) formStaff.style.display = 'none';
    if (formPac) formPac.style.display = 'none';
    
    if (tabDoc) { tabDoc.style.background = 'transparent'; tabDoc.style.color = 'var(--secondary)'; }
    if (tabStaff) { tabStaff.style.background = 'transparent'; tabStaff.style.color = 'var(--secondary)'; }
    if (tabPac) { tabPac.style.background = 'transparent'; tabPac.style.color = 'var(--secondary)'; }

    if (rol === 'DOCTOR') {
        if (formDoc) formDoc.style.display = 'block';
        if (tabDoc) { tabDoc.style.background = 'var(--primary)'; tabDoc.style.color = 'white'; }
    } else if (rol === 'STAFF') {
        if (formStaff) formStaff.style.display = 'block';
        if (tabStaff) { tabStaff.style.background = '#3b82f6'; tabStaff.style.color = 'white'; }
    } else if (rol === 'PACIENTE') {
        if (formPac) formPac.style.display = 'block';
        if (tabPac) { tabPac.style.background = '#ecc94b'; tabPac.style.color = '#1a202c'; }
    }
}

// ============================================================================
// 👨‍⚕️ FLUJO 1: INICIO DE SESIÓN CON CORREO Y CONTRASEÑA
// ============================================================================
async function procesarLoginDoctor(event) {
    event.preventDefault();
    
    const btn = document.getElementById('btnEntrarDoc');
    const email = document.getElementById('docEmail').value.trim();
    const pass = document.getElementById('docPass').value;

    if (btn) {
        btn.disabled = true;
        btn.innerText = "VERIFICANDO CREDENCIALES...";
    }

    try {
        // ⚠️ REMOVIDO localStorage.clear() PARA PRESERVAR SESIONES DE GOOGLE Y PWA
        const { data: { user }, error: authError } = await fisioNet.auth.signInWithPassword({ email, password: pass });
        if (authError) throw authError;

        await procesarAccesoDirecto(user);

    } catch (err) {
        alert("Error de acceso clínico: " + err.message);
        if (btn) {
            btn.disabled = false; 
            btn.innerText = "ENTRAR AL SISTEMA";
        }
    }
}

// Lógica unificada para procesar el usuario (sea por Correo o por Google)
async function procesarAccesoDirecto(user) {
    localStorage.setItem('usuarioId', user.id);

    // 1. Verificación de Inversionista o Super Admin
    const { data: perfilProf } = await fisioNet
        .from('perfiles_profesionales')
        .select('rol, nombre_completo')
        .eq('id', user.id)
        .maybeSingle();

    if (perfilProf?.rol === 'INVERSIONISTA' || perfilProf?.rol === 'SUPER_ADMIN') {
        localStorage.setItem('rol_actual', perfilProf.rol);
        localStorage.setItem('nombre_completo', perfilProf.nombre_completo || 'Inversionista FisioCid');
        window.location.href = 'panel-inversionista.html';
        return;
    }

    // 2. Buscamos sedes asignadas al profesional
    const [resDueno, resColab] = await Promise.all([
        fisioNet.from('clinicas').select('id, nombre_clinica, color_institucional, logo_url').eq('id_dueno', user.id),
        fisioNet.from('colaboradores_clinica').select('id_clinica, clinicas(nombre_clinica, color_institucional, logo_url)').eq('id_profesional', user.id)
    ]);

    let sedesUnicas = new Map();
    resDueno?.data?.forEach(c => sedesUnicas.set(c.id, { id: c.id, nombre: c.nombre_clinica, color: c.color_institucional || '#10b981', logo: c.logo_url || 'img/default-logo.png', tipo: 'DUEÑO' }));
    resColab?.data?.forEach(c => {
        if (c.id_clinica && c.clinicas && !sedesUnicas.has(c.id_clinica)) {
            sedesUnicas.set(c.id_clinica, { id: c.id_clinica, nombre: c.clinicas.nombre_clinica, color: c.clinicas.color_institucional || '#10b981', logo: c.clinicas.logo_url || 'img/default-logo.png', tipo: 'COLABORADOR' });
        }
    });

    const listaFinalSedes = Array.from(sedesUnicas.values());

    if (listaFinalSedes.length === 0) {
        alert("⚠️ Acceso correcto, pero esta cuenta no está dada de alta en ninguna sede de FisioCid.");
        await fisioNet.auth.signOut();
        return;
    }

    if (listaFinalSedes.length === 1) {
        const s = listaFinalSedes[0];
        finalizarLoginSede(s.id, s.nombre, s.color, s.logo, user);
    } else {
        mostrarSelectorSedes(listaFinalSedes, null, user);
    }
}

// ============================================================================
// 🤒 FLUJO 2: INICIO DE SESIÓN PACIENTES
// ============================================================================
async function procesarLoginPaciente(event) {
    event.preventDefault();
    const btn = document.getElementById('btnEntrarPac');
    const emailInput = document.getElementById('pacEmail').value.trim().toLowerCase();
    const pass = document.getElementById('pacPass').value;

    if (btn) {
        btn.disabled = true;
        btn.innerText = "CONECTANDO CON EL PORTAL...";
    }

    try {
        const { data: { user }, error: authError } = await fisioNet.auth.signInWithPassword({ email: emailInput, password: pass });
        if (authError) throw authError;

        const resAuth = await fisioNet
            .from('pacientes_maestros')
            .select('id, nombre, apellido_paterno, id_usuario_auth')
            .eq('id_usuario_auth', user.id)
            .maybeSingle();

        const resCorreo = await fisioNet
            .from('pacientes_maestros')
            .select('id, nombre, apellido_paterno, id_usuario_auth')
            .ilike('correo_electronico', user.email.trim())
            .maybeSingle();

        const resTutor = await fisioNet
            .from('pacientes_maestros')
            .select('id, nombre, apellido_paterno, id_usuario_auth')
            .ilike('correo_tutor', user.email.trim())
            .maybeSingle();

        let pacienteData = resAuth.data || resCorreo.data || resTutor.data;

        if (!pacienteData) {
            alert("⚠️ Credenciales válidas, pero no se encontró expediente clínico maestro en el sistema.");
            await fisioNet.auth.signOut();
            if (btn) { btn.disabled = false; btn.innerText = "INGRESAR AL PORTAL"; }
            return;
        }

        if (!pacienteData.id_usuario_auth) {
            await fisioNet
                .from('pacientes_maestros')
                .update({ id_usuario_auth: user.id })
                .eq('id', pacienteData.id);
        }

        localStorage.setItem('rol_actual', 'PACIENTE');
        localStorage.setItem('nombre_completo', `${pacienteData.nombre} ${pacienteData.apellido_paterno}`.toUpperCase());
        localStorage.setItem('usuarioId', user.id);
        localStorage.setItem('paciente_maestro_id', pacienteData.id);
        
        window.location.href = 'portal-paciente.html';

    } catch (err) {
        console.error("❌ Error en acceso Paciente:", err);
        alert("Error de acceso al portal: " + err.message);
        if (btn) {
            btn.disabled = false;
            btn.innerText = "INGRESAR AL PORTAL";
        }
    }
}

function mostrarSelectorSedes(sedes, datosPaciente, user) {
    const old = document.getElementById('selectorSedesOverlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'selectorSedesOverlay';
    overlay.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px);
        display: flex; justify-content: center; align-items: center; z-index: 99999;
    `;

    const modal = document.createElement('div');
    modal.style = `
        background: white; padding: 40px 30px; border-radius: 30px;
        width: 90%; max-width: 440px; text-align: center;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        max-height: 90vh; overflow-y: auto;
    `;

    modal.innerHTML = `
        <div style="font-size: 3.5rem; margin-bottom: 15px;">🏢</div>
        <h2 style="color: #1e293b; font-weight: 900; margin-bottom: 10px; font-size: 1.6rem;">¿CÓMO ENTRAREMOS HOY?</h2>
        <p style="color: #64748b; margin-bottom: 25px; font-size: 0.95rem;">Selecciona tu perfil para continuar.</p>
        <div id="contenedorSedesBtns" style="display: flex; flex-direction: column; gap: 12px;"></div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const lista = modal.querySelector('#contenedorSedesBtns');

    sedes.forEach(s => {
        const btn = document.createElement('button');
        btn.style = `
            background: #f8fafc; color: #334155; border: 2px solid #e2e8f0;
            padding: 16px; border-radius: 18px; font-weight: 800; cursor: pointer;
            transition: all 0.3s ease; font-size: 1rem; display: flex; align-items: center; gap: 15px;
        `;

        btn.innerHTML = `
            <img src="${s.logo}" style="width: 35px; height: 35px; object-fit: contain; border-radius: 8px;">
            <div style="text-align: left;">
                <div style="font-size: 0.95rem;">${s.nombre.toUpperCase()}</div>
                <small style="font-size: 0.7rem; color: #94a3b8;">MODO: ${s.tipo}</small>
            </div>
        `;

        btn.onclick = () => finalizarLoginSede(s.id, s.nombre, s.color, s.logo, user);
        lista.appendChild(btn);
    });
}

// 🛡️ FINALIZADOR DE LOGIN SEGURO (Acepta el objeto 'user' directamente)
async function finalizarLoginSede(id, nombre, color, logo, userParam = null) {
    try {
        // Usamos el usuario pasado por parámetro o lo recuperamos con getSession() en lugar de getUser()
        let user = userParam;
        if (!user) {
            const { data: { session } } = await fisioNet.auth.getSession();
            user = session?.user;
        }

        if (!user) throw new Error("No se pudo obtener la sesión del usuario.");

        const { data: colab } = await fisioNet
            .from('colaboradores_clinica')
            .select('rol_sistema')
            .eq('id_clinica', id)
            .eq('id_profesional', user.id)
            .maybeSingle();

        localStorage.setItem('id_clinica_activa', id);
        localStorage.setItem('nombre_clinica', nombre);
        localStorage.setItem('clinica_color', color);
        localStorage.setItem('clinica_logo', logo);
        localStorage.setItem('usuarioId', user.id); 

        const rolFinal = colab ? colab.rol_sistema : 'ADMIN_SISTEMA';
        localStorage.setItem('rol_actual', rolFinal);
        localStorage.setItem('rol_usuario', 'PROFESIONAL_FISIO');

        window.location.href = 'dashboard.html';

    } catch (err) {
        console.error("💥 Error al finalizar login:", err);
        alert("Hubo un problema al configurar tu sesión: " + err.message);
    }
}