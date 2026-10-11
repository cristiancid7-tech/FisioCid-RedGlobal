
function sanitizarTexto(texto) {
    if (!texto) return ""; // Evita errores si el texto llega vacío o undefined
    
    return texto
        .trim()                       // 1. Quita los espacios accidentales al inicio y al final
        .replace(/\s+/g, " ")         // 2. Convierte múltiples espacios en blanco seguidos en uno solo
        .replace(/</g, "&lt;")        // 3. Desactiva etiquetas HTML como <script>
        .replace(/>/g, "&gt;")
        .replace(/['"`;-]/g, "");     // 4. Remueve comillas, puntos y comas o guiones de SQL
}


// Forzar minúsculas en el correo y mayúsculas en el nombre sin errores de selección
document.addEventListener('DOMContentLoaded', () => {
    const campoEmail = document.getElementById('regEmail');
    if (campoEmail) {
        campoEmail.addEventListener('input', (e) => {
            // Los inputs type="email" no soportan setSelectionRange, solo cambiamos el valor
            e.target.value = e.target.value.toLowerCase();
        });
    }

    const campoNombre = document.getElementById('regNombre');
    if (campoNombre) {
        campoNombre.addEventListener('input', (e) => {
            try {
                const pos = e.target.selectionStart;
                e.target.value = e.target.value.toUpperCase();
                e.target.setSelectionRange(pos, pos);
            } catch (err) {
                e.target.value = e.target.value.toUpperCase();
            }
        });
    }
});

document.getElementById('formRegistroNuevo').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 🛡️ VALIDACIÓN DE TÉRMINOS Y PRIVACIDAD DE PLATAFORMA
    const checkTerminos = document.getElementById('checkTerminosLegales')?.checked;
    const checkDeslinde = document.getElementById('checkDeslindeMedico')?.checked;

    if (!checkTerminos || !checkDeslinde) {
        alert("⚠️ Para continuar debes aceptar los Términos de Uso, el Aviso de Privacidad y la Declaración Jurada.");
        return;
    }

    // 1. CAPTURA DE DATOS
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const pass = document.getElementById('regPass').value;
    const nombre = document.getElementById('regNombre').value.trim().toUpperCase();
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
   
    const nombreLimpio = sanitizarTexto(nombre);
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
        // 2. REGISTRO EN AUTH (Activo para crear el usuario y pasar metadatos al Trigger)
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

        // 🎯 Nota: El perfil profesional ('perfiles_profesionales') ya NO se inserta aquí. 
        // Lo crea automáticamente el Trigger de la base de datos de forma segura.

        // 3. CREAR LA CLÍNICA
        const { data: clinica, error: clinicaError } = await fisioNet.from('clinicas').insert([{
            nombre_clinica: nombreSede,
            id_dueno: userId,
            telefono_contacto: telefono,
            color_institucional: '#10B981',
            estado: true
        }]).select().single();
        
        if (clinicaError) throw clinicaError;

        // 4. VINCULAR COLABORADOR
        const { error: colabError } = await fisioNet.from('colaboradores_clinica').insert([{
            id_clinica: clinica.id,
            id_profesional: userId,
            rol_sistema: 'ADMIN_SISTEMA',
            cargo_clinico: 'ADMINISTRADOR', 
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

