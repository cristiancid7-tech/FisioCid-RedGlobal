

document.addEventListener('DOMContentLoaded', () => {
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
            const email = prompt("INGRESA TU CORREO PARA RESTABLECER:");
            if (email) await recuperarPassword(email);
        };
    }
});

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

    // Inicializamos todos ocultos y con fondo transparente
    if (formDoc) formDoc.style.display = 'none';
    if (formStaff) formStaff.style.display = 'none';
    if (formPac) formPac.style.display = 'none';
    
    if (tabDoc) { tabDoc.style.background = 'transparent'; tabDoc.style.color = 'var(--secondary)'; }
    if (tabStaff) { tabStaff.style.background = 'transparent'; tabStaff.style.color = 'var(--secondary)'; }
    if (tabPac) { tabPac.style.background = 'transparent'; tabPac.style.color = 'var(--secondary)'; }

    // Activamos únicamente el seleccionado
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

// Escuchador para recuperar contraseña común al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
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

// ============================================================================
// 👨‍⚕️ FLUJO 1: INICIO DE SESIÓN EXCLUSIVO PARA PROFESIONALES
// ============================================================================
async function procesarLoginDoctor(event) {
    event.preventDefault();
    const btn = document.getElementById('btnEntrarDoc');
    const email = document.getElementById('docEmail').value.trim();
    const pass = document.getElementById('docPass').value;

    btn.disabled = true;
    btn.innerText = "VERIFICANDO CREDENCIALES...";

    try {
        const { data: { user }, error: authError } = await fisioNet.auth.signInWithPassword({ email, password: pass });
        if (authError) throw authError;

        console.log("🏢 [CLÍNICO] Buscando sedes para profesional:", user.id);
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
            btn.disabled = false; btn.innerText = "ENTRAR AL SISTEMA";
            return;
        }

        if (listaFinalSedes.length === 1) {
            const s = listaFinalSedes[0];
            finalizarLoginSede(s.id, s.nombre, s.color, s.logo);
        } else {
            // Si tiene múltiples clínicas asignadas, se dispara tu modal original
            mostrarSelectorSedes(listaFinalSedes, null);
        }

    } catch (err) {
        alert("Error de acceso clínico: " + err.message);
        btn.disabled = false; btn.innerText = "ENTRAR AL SISTEMA";
    }
}

// ============================================================================
// 🤒 FLUJO 2: INICIO DE SESIÓN EXCLUSIVO PARA PACIENTES MAESTROS
// ============================================================================
async function procesarLoginPaciente(event) {
    event.preventDefault();
    const btn = document.getElementById('btnEntrarPac');
    const email = document.getElementById('pacEmail').value.trim().toLowerCase();
    const pass = document.getElementById('pacPass').value;

    btn.disabled = true;
    btn.innerText = "CONECTANDO CON EL PORTAL...";

    try {
        const { data: { user }, error: authError } = await fisioNet.auth.signInWithPassword({ email, password: pass });
        if (authError) throw authError;

        console.log("🔎 [PORTAL] Extrayendo ficha médica del paciente maestro:", user.id);
        const { data: pacienteData, error: pacError } = await fisioNet
            .from('pacientes_maestros')
            .select('id, nombre, apellido_paterno')
            .eq('id_usuario_auth', user.id)
            .maybeSingle();

        if (pacError) throw pacError;

        if (!pacienteData) {
            alert("⚠️ Credenciales válidas, pero no existe un expediente clínico maestro asociado a este correo en la base de datos.");
            await fisioNet.auth.signOut();
            btn.disabled = false; btn.innerText = "INGRESAR AL PORTAL";
            return;
        }

        // Configuración directa y limpia de sesión para el portal de pacientes
        localStorage.setItem('rol_actual', 'PACIENTE');
        localStorage.setItem('nombre_completo', `${pacienteData.nombre} ${pacienteData.apellido_paterno}`);
        localStorage.setItem('usuarioId', user.id);
        
        console.log("🚀 Redirección inmediata a portal-paciente.html");
        window.location.href = 'portal-paciente.html';

    } catch (err) {
        alert("Error de acceso al portal: " + err.message);
        btn.disabled = false; btn.innerText = "INGRESAR AL PORTAL";
    }
}

function mostrarSelectorSedes(sedes, datosPaciente) {
    // 1. Limpiar si ya existe uno
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

    // --- SECCIÓN PROFESIONAL (SEDES) ---
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

        btn.onmouseover = () => { 
            btn.style.borderColor = s.color; 
            btn.style.background = `${s.color}10`; 
            btn.style.transform = 'translateY(-2px)';
        };
        btn.onmouseout = () => { 
            btn.style.borderColor = '#e2e8f0'; 
            btn.style.background = '#f8fafc'; 
            btn.style.transform = 'translateY(0)';
        };

        btn.onclick = () => finalizarLoginSede(s.id, s.nombre, s.color, s.logo);
        lista.appendChild(btn);
    });

    // 🚀 --- SECCIÓN DE PACIENTE (Solo si el doctor también es paciente) ---
    if (datosPaciente) {
        // Separador visual
        const hr = document.createElement('div');
        hr.style = `
            margin: 20px 0 10px; display: flex; align-items: center; 
            gap: 10px; color: #cbd5e1; font-size: 0.7rem; font-weight: 800;
        `;
        hr.innerHTML = `<div style="flex:1; height:1px; background:#e2e8f0;"></div> O TAMBIÉN <div style="flex:1; height:1px; background:#e2e8f0;"></div>`;
        lista.appendChild(hr);

        const btnPac = document.createElement('button');
        btnPac.style = `
            background: #eef2ff; color: #4338ca; border: 2px solid #c7d2fe;
            padding: 18px; border-radius: 18px; font-weight: 800; cursor: pointer;
            transition: all 0.3s ease; display: flex; align-items: center; gap: 15px;
        `;

        btnPac.innerHTML = `
            <div style="background: white; width: 35px; height: 35px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">🩺</div>
            <div style="text-align: left;">
                <div style="font-size: 0.95rem;">MODO PACIENTE</div>
                <small style="font-size: 0.7rem; color: #6366f1;">VER MIS CITAS Y EJERCICIOS</small>
            </div>
        `;

        btnPac.onmouseover = () => { 
            btnPac.style.transform = 'translateY(-2px)';
            btnPac.style.boxShadow = '0 10px 15px -3px rgba(99, 102, 241, 0.2)';
        };
        btnPac.onmouseout = () => { 
            btnPac.style.transform = 'translateY(0)';
            btnPac.style.boxShadow = 'none';
        };

        btnPac.onclick = () => {
            console.log("Entrando como paciente...");
            localStorage.setItem('rol_actual', 'PACIENTE');
           localStorage.setItem('nombre_completo', datosPaciente.nombre_mostrar);
            // 🎯 Cambia esto a la ruta real de tu portal de pacientes
            window.location.href = 'portal-paciente.html'; 
        };
        lista.appendChild(btnPac);
    }
}


async function finalizarLoginSede(id, nombre, color, logo) {
    console.log("📦 Configurando sesión para:", nombre);
    
    try {
        // 1. Obtenemos el usuario actual de forma segura
        const { data: { user }, error: userError } = await fisioNet.auth.getUser();
        
        if (userError || !user) throw new Error("No se pudo obtener el usuario autenticado");

        // 2. Buscamos el rol del colaborador en esta sede
        const { data: colab } = await fisioNet
            .from('colaboradores_clinica')
            .select('rol_sistema')
            .eq('id_clinica', id)
            .eq('id_profesional', user.id)
            .maybeSingle();

        // 3. 🚩 GUARDADO MAESTRO EN LOCALSTORAGE
        localStorage.setItem('id_clinica_activa', id);
        localStorage.setItem('nombre_clinica', nombre);
        localStorage.setItem('clinica_color', color);
        localStorage.setItem('clinica_logo', logo);
        
        // --- ESTA ES LA LÍNEA CRÍTICA QUE CORREGIMOS ---
        localStorage.setItem('usuarioId', user.id); 
        // ----------------------------------------------

        // 4. Asignación de Roles para permisos
        const rolFinal = colab ? colab.rol_sistema : 'ADMIN_SISTEMA';
        localStorage.setItem('rol_actual', rolFinal);
        localStorage.setItem('rol_usuario', 'PROFESIONAL_FISIO');

        console.log("✅ Sesión lista. Especialista ID:", user.id);

        // Redirección al Dashboard
        window.location.href = 'dashboard.html';

    } catch (err) {
        console.error("💥 Error al finalizar login:", err);
        alert("Hubo un problema al configurar tu sesión: " + err.message);
    }
}