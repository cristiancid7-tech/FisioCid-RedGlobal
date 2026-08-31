async function iniciarSesion(email, password) {
    const { data, error } = await fisioNet.auth.signInWithPassword({ email, password });

    if (error) {
        alert("ERROR DE ACCESO: " + error.message);
        return;
    }

    const user = data.user;

    // Buscamos el nombre del profesional
    const { data: perfil } = await fisioNet
        .from('perfiles_profesionales')
        .select('nombre_completo')
        .eq('id', user.id)
        .single();

    if (perfil) {
        localStorage.setItem('nombre_completo', perfil.nombre_completo.toUpperCase());
    }

    const { data: config } = await fisioNet
        .from('clinicas') // Cambiado de configuracion_perfil a clinicas
        .select('color_institucional, nombre_clinica, logo_url') 
        .eq('id_dueno', user.id) // Cambiado de user_id a id_dueno
        .maybeSingle();

    if (config) {
      
        if (config.color_institucional) localStorage.setItem('clinica_color', config.color_institucional);
        if (config.nombre_clinica) localStorage.setItem('clinica_nombre', config.nombre_clinica);
        if (config.logo_url) localStorage.setItem('clinica_logo', config.logo_url);
    }

    const { data: colaboraciones, error: errColab } = await fisioNet
        .from('colaboradores_clinica')
        .select(`
            id_clinica,
            cargo_clinico,
            clinicas (id, nombre_clinica, logo_url, color_institucional)
        `)
        .eq('id_profesional', user.id)
        .eq('estado', 'ACTIVO');

    if (errColab || !colaboraciones || colaboraciones.length === 0) {
        alert("NO TIENES SEDES VINCULADAS. SI ERES NUEVO, CONTACTA AL ADMIN O REVISA TU REGISTRO.");
        return;
    }

    // Lógica de selección de sede (Exactamente como la tenías)
    if (colaboraciones.length > 1) {
        const modal = document.getElementById('modalSede');
        const lista = document.getElementById('listaSedes');
        
        modal.style.display = 'flex';
        
        lista.innerHTML = colaboraciones.map(item => `
            <label class="item-sede" style="display: flex; align-items: center; padding: 12px; border: 1px solid #ddd; margin-bottom: 8px; border-radius: 8px; cursor: pointer;">
                <input type="radio" name="sede" value="${item.id_clinica}" data-nombre="${item.clinicas.nombre_clinica}" style="margin-right: 12px;">
                <div>
                    <strong style="display: block; text-transform: uppercase;">${item.clinicas.nombre_clinica}</strong>
                    <small style="color: #64748b; text-transform: uppercase;">${item.cargo_clinico}</small>
                </div>
            </label>
        `).join('');

        document.getElementById('btnConfirmarSede').onclick = () => {
            const seleccionado = document.querySelector('input[name="sede"]:checked');
            if (seleccionado) {
                localStorage.setItem('id_clinica_activa', seleccionado.value);
                localStorage.setItem('clinica_activa_id', seleccionado.value);
                if(!config || !config.nombre_clinica) localStorage.setItem('nombre_clinica', seleccionado.dataset.nombre.toUpperCase());
                window.location.href = 'dashboard.html';
            } else {
                alert("POR FAVOR, SELECCIONA UNA SEDE PARA COMENZAR.");
            }
        };
    } else {
       
localStorage.setItem('id_clinica_activa', colaboraciones[0].id_clinica);
localStorage.setItem('clinica_activa_id', colaboraciones[0].id_clinica);
        if(!config || !config.nombre_clinica) localStorage.setItem('nombre_clinica', colaboraciones[0].clinicas.nombre_clinica.toUpperCase());
        window.location.href = 'dashboard.html';
    }
}

async function procesarLoginStaff(event) {
    event.preventDefault();
    const btn = document.getElementById('btnEntrarStaff');
    const email = document.getElementById('staffEmail').value.trim();
    const pass = document.getElementById('staffPass').value;

    if (btn) {
        btn.disabled = true;
        btn.innerText = "CONECTANDO CON LA SEDE...";
    }

    try {
        // Limpieza segura en el cliente (Evita el choque de red con Supabase Auth)
        localStorage.clear();
        sessionStorage.clear();

        // 1. Logueo directo en Supabase sin sesiones colgadas
        const { data: loginData, error: authError } = await fisioNet.auth.signInWithPassword({ email, password: pass });
        if (authError) throw authError;

        const sesionUser = loginData.user;
        if (!sesionUser) throw new Error("No se pudo extraer la sesión activa.");

        console.log("🔍 [STAFF] Buscando contrato legítimo para ID:", sesionUser.id);
        
        // 2. Consulta plana a colaboradores
        const { data: contratos, error: errColab } = await fisioNet
            .from('colaboradores_clinica')
            .select('id_clinica, rol_sistema')
            .eq('id_profesional', sesionUser.id)
            .eq('estado', 'ACTIVO');

        if (errColab) throw errColab;

        if (!contratos || contratos.length === 0) {
            throw new Error("Esta cuenta no está registrada en el equipo de ninguna sucursal activa.");
        }

        const contratoActivo = contratos[0];
        const rolOperativo = contratoActivo.rol_sistema || 'STAFF_CLINICO';

        // 3. Extraer los datos estéticos de la clínica asociada
        const { data: datosClinica } = await fisioNet
            .from('clinicas')
            .select('nombre_clinica, color_institucional, logo_url')
            .eq('id', contratoActivo.id_clinica);

        const infoClinica = (datosClinica && datosClinica.length > 0) ? datosClinica[0] : {};

        // 4. Asentamiento estandarizado en memoria local fresca
        localStorage.setItem('usuarioId', sesionUser.id);
        localStorage.setItem('id_clinica_activa', contratoActivo.id_clinica);
        localStorage.setItem('clinica_activa_id', contratoActivo.id_clinica);
        localStorage.setItem('nombre_clinica', infoClinica.nombre_clinica || 'FisioCid');
        localStorage.setItem('clinica_color', infoClinica.color_institucional || '#10b981');
        localStorage.setItem('clinica_logo', infoClinica.logo_url || 'img/default-logo.png');
        localStorage.setItem('rol_actual', rolOperativo);
        localStorage.setItem('rol_usuario', 'PROFESIONAL_FISIO');

        console.log("🚀 Acceso Staff correcto. Saltando a panel operativo.");
        window.location.href = 'dashboard.html';
        return;

    } catch (err) {
        alert("⚠️ Error de acceso Staff: " + err.message);
        if (btn) {
            btn.disabled = false;
            btn.innerText = "INGRESAR COMO EQUIPO";
        }
        // Si hay un fallo real de credenciales, limpiamos al final
        await fisioNet.auth.signOut();
    }
}
// FUNCIÓN DE REGISTRO (PARA NUEVOS DUEÑOS)
async function registrarNuevoColega(email, password, nombre) {
    const { data, error: authError } = await fisioNet.auth.signUp({ email, password });
    if (authError) return alert("ERROR: " + authError.message);

    const user = data.user;

    // Insertar el perfil base
    const { error: profileError } = await fisioNet
        .from('perfiles_profesionales')
        .insert([{
            id: user.id,
            nombre_completo: nombre.toUpperCase(),
            rol: 'ADMIN_SISTEMA',
            nivel_suscripcion: 'BASICO',
            suscripcion_activa: true
        }]);

    if (profileError) {
        alert("ERROR AL CREAR PERFIL: " + profileError.message);
    } else {
        alert("¡REGISTRO EXITOSO! POR FAVOR, INICIA SESIÓN.");
        window.location.reload();
    }
}

// 3. RECUPERAR CONTRASEÑA
async function recuperarPassword(email) {
    const { error } = await fisioNet.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/actualizar-password.html',
    });
    if (error) alert("ERROR: " + error.message);
    else alert("📧 REVISA TU BANDEJA DE ENTRADA PARA RESTABLECER TU ACCESO.");
}


// 4. CERRAR SESIÓN
const salir = async () => {
    await fisioNet.auth.signOut();
    localStorage.clear(); 
    sessionStorage.clear();
    window.location.href = 'index.html';
};
// 🛡️ MOTOR AUTO-SANABLE DE CLÍNICA (Evita que el ID quede nulo o a la deriva)
async function asegurarClinicaActiva() {
    let idClinica = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');

    if (!idClinica) {
        console.log("🔍 id_clinica no detectado en memoria. Consultando a Supabase...");
        const { data: { user } } = await fisioNet.auth.getUser();
        
        if (user) {
            // Buscamos la relación del usuario en la tabla de colaboradores
            const { data: colab } = await fisioNet
                .from('colaboradores_clinica')
                .select('id_clinica')
                .eq('id_profesional', user.id)
                .eq('estado', 'ACTIVO')
                .limit(1)
                .maybeSingle();

            if (colab?.id_clinica) {
                idClinica = colab.id_clinica;
            } else {
                // Si es un dueño nuevo que apenas creó su cuenta, tomamos la clínica que le pertenece
                const { data: clinicaDueno } = await fisioNet
                    .from('clinicas')
                    .select('id')
                    .eq('id_dueno', user.id)
                    .limit(1)
                    .maybeSingle();
                
                idClinica = clinicaDueno?.id;
            }

            if (idClinica) {
                localStorage.setItem('id_clinica_activa', idClinica);
                localStorage.setItem('clinica_activa_id', idClinica);
                console.log("✅ ID de Clínica auto-recuperado y fijado:", idClinica);
            }
        }
    }
    return idClinica;
}