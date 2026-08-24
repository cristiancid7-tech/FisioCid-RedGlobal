// Asume que 'fisioNet' ya está inicializado globalmente en otro script, o inicialízalo aquí:
// const fisioNet = supabase.createClient('TU_URL', 'TU_ANON_KEY');

document.addEventListener('DOMContentLoaded', async () => {
    await cargarDatosUsuario();
});

// --- 1. CARGAR DATOS ACTUALES DEL DOCTOR ---
async function cargarDatosUsuario() {
    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Consultamos directo en nuestra tabla pública perfiles
        const { data: perfil, error } = await fisioNet
            .from('perfiles')
            .select('nombre_completo, telefono')
            .eq('id', user.id)
            .single();

        if (error) throw error;

        if (perfil) {
            document.getElementById('confNombre').value = perfil.nombre_completo || '';
            document.getElementById('confTelefono').value = perfil.telefono || '';
            document.getElementById('smsTelefono').value = perfil.telefono || '';
        }
    } catch (error) {
        console.error("Error al cargar perfil:", error.message);
    }
}

// --- 2. ACTUALIZAR DATOS DE CONTACTO (TABLA PÚBLICA) ---
document.getElementById('formDatosContacto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('confNombre').value.trim().toUpperCase();
    const telefono = document.getElementById('confTelefono').value.trim();

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        
        const { error } = await fisioNet
            .from('perfiles')
            .update({ nombre_completo: nombre, telefono: telefono })
            .eq('id', user.id);

        if (error) throw error;

        localStorage.setItem('nombre_completo', nombre); // Sincronizamos efecto camaleón
        alert("¡Perfil de contacto actualizado con éxito! 🚀");
    } catch (error) {
        alert("Error al actualizar perfil: " + error.message);
    }
});

// --- 3. ACTUALIZAR CORREO Y/O CONTRASEÑA (SUPABASE AUTH) ---
document.getElementById('formCredenciales').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevoEmail = document.getElementById('confEmail').value.trim();
    const nuevoPass = document.getElementById('confPass').value;
    
    let actualizaciones = {};
    if (nuevoEmail) actualizaciones.email = nuevoEmail;
    if (nuevoPass) {
        if (nuevoPass.length < 6) {
            alert("La contraseña debe tener al menos 6 caracteres.");
            return;
        }
        actualizaciones.password = nuevoPass;
    }

    if (Object.keys(actualizaciones).length === 0) {
        alert("Por favor, ingresa al menos un campo para cambiar.");
        return;
    }

    try {
        const { error } = await fisioNet.auth.updateUser(actualizaciones);
        if (error) throw error;

        if (nuevoEmail) {
            alert("📩 Se han enviado correos de confirmación a ambas direcciones. Debes confirmarlos para aplicar el cambio.");
        } else {
            alert("🔒 ¡Contraseña modificada exitosamente!");
        }
        document.getElementById('formCredenciales').reset();
    } catch (error) {
        alert("Error de autenticación: " + error.message);
    }
});

// --- 4. SOLICITAR VERIFICACIÓN SMS (OTP NATIVO) ---
document.getElementById('btnEnviarSMS').addEventListener('click', async () => {
    const telefonoSMS = document.getElementById('smsTelefono').value.trim();
    if (telefonoSMS.length !== 10) {
        alert("Por favor, ingresa un número válido de 10 dígitos.");
        return;
    }

    try {
        // Le pasamos el número de forma nativa al Auth del Servidor
        const { error } = await fisioNet.auth.updateUser({ phone: telefonoSMS });
        if (error) throw error;

        alert("📱 Código enviado por SMS. Revisa tu celular.");
        document.getElementById('bloqueVerificacion').classList.remove('hidden');
    } catch (error) {
        alert("Error al enviar SMS: " + error.message);
    }
});

// --- 5. VERIFICAR EL TOKEN DEL SMS ---
document.getElementById('btnVerificarCodigo').addEventListener('click', async () => {
    const telefonoSMS = document.getElementById('smsTelefono').value.trim();
    const token = document.getElementById('smsToken').value.trim();

    try {
        const { data, error } = await fisioNet.auth.verifyOtp({
            phone: telefonoSMS,
            token: token,
            type: 'phone_change' // Indica cambio o registro de número telefónico
        });

        if (error) throw error;

        alert("🔒 ¡Teléfono verificado al 100%! Ahora está guardado nativamente en tu autenticación.");
        document.getElementById('bloqueVerificacion').classList.add('hidden');
        location.reload(); // Recargamos para actualizar la vista
    } catch (error) {
        alert("Código inválido o expirado. Intenta de nuevo: " + error.message);
    }
});