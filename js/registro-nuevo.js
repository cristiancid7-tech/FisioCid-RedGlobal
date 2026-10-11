
function sanitizarTexto(texto) {
    if (!texto) return ""; // Evita errores si el texto llega vacío o undefined
    
    return texto
        .trim()                       // 1. Quita los espacios accidentales al inicio y al final
        .replace(/\s+/g, " ")         // 2. Convierte múltiples espacios en blanco seguidos en uno solo
        .replace(/</g, "&lt;")        // 3. Desactiva etiquetas HTML como <script>
        .replace(/>/g, "&gt;")
        .replace(/['"`;-]/g, "");     // 4. Remueve comillas, puntos y comas o guiones de SQL
}


document.addEventListener('DOMContentLoaded', () => {
    // 1. Forzar minúsculas en el correo electrónico
    const campoEmail = document.getElementById('regEmail');
    if (campoEmail) {
        campoEmail.addEventListener('input', (e) => {
            e.target.value = e.target.value.toLowerCase();
        });
    }

    // Función auxiliar para forzar mayúsculas de manera segura
    const aplicarMayusculas = (idElemento) => {
        const campo = document.getElementById(idElemento);
        if (campo) {
            campo.addEventListener('input', (e) => {
                try {
                    const pos = e.target.selectionStart;
                    e.target.value = e.target.value.toUpperCase();
                    e.target.setSelectionRange(pos, pos);
                } catch (err) {
                    e.target.value = e.target.value.toUpperCase();
                }
            });
        }
    };

    // 2. Aplicar mayúsculas al Nombre Completo y al Nombre de la Clínica
    aplicarMayusculas('regNombre');
    aplicarMayusculas('regNombreClinica');
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
    
    // Captura estricta del tipo de perfil desde el input oculto
    const rawTipoPerfil = document.getElementById('tipoPerfil')?.value || 'INDEPENDIENTE';
    const tipoPerfilFinal = (rawTipoPerfil === 'DUEÑO' || rawTipoPerfil === 'DUENO_CLINICA') ? 'DUENO_CLINICA' : 'INDEPENDIENTE';
    
    const especialidadCapturada = document.getElementById('regEspecialidad')?.value || 'FISIOTERAPEUTA';

    const regexCorreo = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const regexTelefono = /^[0-9]{10}$/; 

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
        // 2. REGISTRO EN AUTH (Enviando correctamente todos los metadatos al Trigger)
        const { data, error: authError } = await fisioNet.auth.signUp({ 
            email, 
            password: pass,
            options: {
                data: { 
                    display_name: nombre, 
                    telefono_registro: telefono,
                    nombre_clinica: nombreSede,
                    especialidad: especialidadCapturada,
                    tipo_profesional: especialidadCapturada,
                    tipo_perfil: tipoPerfilFinal
                }
            }
        });

        if (authError) throw authError;

        alert(`¡REGISTRO EXITOSO! 🚀\nHemos enviado un correo de confirmación a:\n${email}\n\nPor favor revísalo para activar tu cuenta y acceder a ${nombreSede}.`);
        
        window.location.href = 'login.html'; 

    } catch (error) {
        console.error("ERROR EN REGISTRO:", error);
        alert("HUBO UN PROBLEMA: " + error.message);
        btnSubmit.innerText = "CREAR MI CUENTA PROFESIONAL";
        btnSubmit.disabled = false;
    }
});

