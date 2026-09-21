

function sanitizarTexto(texto) {
    return texto
        .replace(/</g, "&lt;")  // Desactiva etiquetas HTML como <script>
        .replace(/>/g, "&gt;")
        .replace(/['"`;-]/g, ""); // Remueve comillas, puntos y comas o guiones de comentarios SQL
}
// Forzar minúsculas en tiempo real en el campo de correo
document.addEventListener('DOMContentLoaded', () => {
    const campoEmail = document.getElementById('regEmail');
    if (campoEmail) {
        campoEmail.addEventListener('input', (e) => {
            const pos = e.target.selectionStart;
            e.target.value = e.target.value.toLowerCase();
            e.target.setSelectionRange(pos, pos);
        });
    }
});

document.getElementById('formRegistroNuevo').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 1. CAPTURA DE DATOS
   const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const pass = document.getElementById('regPass').value;
    const nombre = document.getElementById('regNombre').value.trim().toUpperCase();
    const categoriaRegistro = document.getElementById('tipoPerfil')?.value || 'DUEÑO'; 
    const telefono = document.getElementById('regTelefono').value.trim();

    const especialidadCapturada = document.getElementById('regEspecialidad')?.value || 'FISIOTERAPEUTA';

    const regexCorreo = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const regexTelefono = /^[0-9]{10}$/; 

    // --- VALIDACIONES DE SEGURIDAD ---
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

    let nombreSede = document.getElementById('regNombreClinica')?.value.trim().toUpperCase();
    if (!nombreSede) {
        nombreSede = `CONSULTORIO - ${nombreLimpio}`;
    } else {
        nombreSede = sanitizarTexto(nombreSede); 
    }

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.innerText = "⏳ CREANDO TU ESPACIO...";
    btnSubmit.disabled = true;

    try {
        // 2. REGISTRO EN AUTH
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

        // 3. CREAR PERFIL PROFESIONAL (🎯 Ahora asigna cargo_clinico como ADMINISTRADOR)
        const { error: profileError } = await fisioNet.from('perfiles_profesionales').insert([{
            id: userId,
            nombre_completo: nombre,
            correo_institucional: email,
            telefono_contacto: telefono,
            rol: 'ADMIN_SISTEMA', 
            cargo_clinico: 'ADMINISTRADOR', // 👈 Cargo jerárquico supremo
            especialidad: especialidadCapturada,
            nivel_suscripcion: 'BASICO',
            suscripcion_activa: true
        }]);
        if (profileError) throw profileError;

        // 4. CREAR LA CLÍNICA
        const { data: clinica, error: clinicaError } = await fisioNet.from('clinicas').insert([{
            nombre_clinica: nombreSede,
            id_dueno: userId,
            telefono_contacto: telefono,
            color_institucional: '#10B981',
            estado: true
        }]).select().single();
        
        if (clinicaError) throw clinicaError;

        // 5. VINCULAR COLABORADOR (🎯 Ahora asigna siempre ADMINISTRADOR y tipo_vinculo DUENO)
        const { error: colabError } = await fisioNet.from('colaboradores_clinica').insert([{
            id_clinica: clinica.id,
            id_profesional: userId,
            rol_sistema: 'ADMIN_SISTEMA',
            cargo_clinico: 'ADMINISTRADOR', // 👈 Garantiza que quede hasta arriba de la lista
            tipo_vinculo: 'DUENO',
            estado: 'ACTIVO'
        }]);
        if (colabError) throw colabError;

        // Guardar variables locales para la sesión activa
        localStorage.setItem('especialidad_usuario', especialidadCapturada);
        localStorage.setItem('id_clinica_activa', clinica.id); 
        localStorage.setItem('nombre_clinica', nombreSede);
        localStorage.setItem('clinica_color', '#10B981');
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