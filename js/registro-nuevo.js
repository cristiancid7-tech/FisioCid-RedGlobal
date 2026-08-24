

function sanitizarTexto(texto) {
    return texto
        .replace(/</g, "&lt;")  // Desactiva etiquetas HTML como <script>
        .replace(/>/g, "&gt;")
        .replace(/['"`;-]/g, ""); // Remueve comillas, puntos y comas o guiones de comentarios SQL
}


document.getElementById('formRegistroNuevo').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 1. CAPTURA DE DATOS
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const nombre = document.getElementById('regNombre').value.trim().toUpperCase();
    const categoriaRegistro = document.getElementById('tipoPerfil').value; 
    const telefono = document.getElementById('regTelefono').value.trim();
    

    const regexCorreo = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const regexTelefono = /^[0-9]{10}$/; 

    // --- VALIDACIONES DE SEGURIDAD (Frenan el código si están mal) ---
    if (!regexCorreo.test(email)) {
        alert("Por favor, ingresa un correo electrónico válido.");
        return;
    }

    if (!regexTelefono.test(telefono)) {
        alert("El teléfono celular debe contener exactamente 10 dígitos numéricos.");
        return;
    }

    if (pass.length < 6) {
        alert("La contraseña debe tener al menos 6 caracteres.");
        return;
    }
   
   const nombreLimpio = sanitizarTexto(document.getElementById('regNombre').value.trim().toUpperCase());

  let nombreSede = document.getElementById('regNombreClinica').value.trim().toUpperCase();
    if (!nombreSede || categoriaRegistro !== 'DUEÑO') {
        nombreSede = `CONSULTORIO - ${nombreLimpio}`;
    } else {
        nombreSede = sanitizarTexto(nombreSede); 
    }

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.innerText = "⏳ CREANDO TU ESPACIO...";
    btnSubmit.disabled = true;

    try {
        // 2. REGISTRO EN AUTH (Con display_name para que no salga el guion en Supabase)
        const { data, error: authError } = await fisioNet.auth.signUp({ 
            email, 
            password: pass,
         
            options: {
                data: { 
                    display_name: nombre, 
                    rol_registro: 'DOCTOR',
                   telefono_registro: telefono
                }
            }
        });

        if (authError) throw authError;
        const userId = data.user.id;

        // 3. CREAR PERFIL PROFESIONAL
        const { error: profileError } = await fisioNet.from('perfiles_profesionales').insert([{
            id: userId,
            nombre_completo: nombre,
            correo_institucional: email,
            telefono_contacto: telefono,
            rol: 'ADMIN_SISTEMA', 
            nivel_suscripcion: 'BASICO',
            suscripcion_activa: true
        }]);
        if (profileError) throw profileError;

        // 4. CREAR LA CLÍNICA (Corregido: estado como true booleano)
        const { data: clinica, error: clinicaError } = await fisioNet.from('clinicas').insert([{
            nombre_clinica: nombreSede,
            id_dueno: userId,
            telefono_contacto: telefono,
            color_institucional: '#10B981',
            estado: true // 🎯 Cambiado de 'ACTIVO' a true para evitar error de sintaxis
        }]).select().single();
        
        if (clinicaError) throw clinicaError;

        // 5. VINCULAR COLABORADOR
        const { error: colabError } = await fisioNet.from('colaboradores_clinica').insert([{
            id_clinica: clinica.id,
            id_profesional: userId,
            rol_sistema: 'ADMIN_SISTEMA',
            cargo_clinico: (categoriaRegistro === 'DUEÑO') ? 'ADMINISTRADOR' : 'INDEPENDIENTE',
            estado: 'ACTIVO'
        }]);
        if (colabError) throw colabError;

        localStorage.setItem('id_clinica_activa', clinica.id); 
        localStorage.setItem('nombre_clinica', nombreSede);
        localStorage.setItem('clinica_color', '#10B981'); // Color por defecto de FisioCid
        localStorage.setItem('nombre_completo', nombre);
        localStorage.setItem('clinica_activa_id', clinica.id); 

        alert(`¡BIENVENIDO A FISIOCID! 🚀\nSe ha creado: ${nombreSede}`);
        
    
        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error("ERROR EN REGISTRO:", error);
        alert("HUBO UN PROBLEMA: " + error.message);
        btnSubmit.innerText = "CREAR MI CUENTA PROFESIONAL";
        btnSubmit.disabled = false;
    }
});