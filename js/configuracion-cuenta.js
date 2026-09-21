document.addEventListener('DOMContentLoaded', async () => {
    await cargarDatosUsuario();
});

// --- 1. CARGAR DATOS ACTUALES DEL DOCTOR DESDE SUPABASE ---
async function cargarDatosUsuario() {
    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Cargar correo registrado en Auth
        if (user.email) {
            document.getElementById('confEmail').value = user.email;
        }

        // Si el usuario ya tiene teléfono registrado en Auth (en formato +52...)
        if (user.phone) {
            const numLimpio = user.phone.replace('+52', '').trim();
            document.getElementById('smsTelefono').value = numLimpio;
        }

        // Consultamos en la tabla correcta: perfiles_profesionales
        const { data: perfil, error } = await fisioNet
            .from('perfiles_profesionales')
            .select('nombre_completo, telefono_contacto')
            .eq('id', user.id)
            .maybeSingle();

        if (error) throw error;

        if (perfil) {
            document.getElementById('confNombre').value = perfil.nombre_completo || '';
            document.getElementById('confTelefono').value = perfil.telefono_contacto || '';
            
            // Si no tiene teléfono en Auth, colocamos el de la base de datos
            if (!document.getElementById('smsTelefono').value) {
                document.getElementById('smsTelefono').value = perfil.telefono_contacto || '';
            }
        }
    } catch (error) {
        console.error("Error al cargar perfil de cuenta:", error.message);
    }
}

// --- 2. ACTUALIZAR DATOS DE PERFIL (TABLA PÚBLICA) ---
document.getElementById('formDatosContacto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnPerfil');
    const nombre = document.getElementById('confNombre').value.trim().toUpperCase();
    const telefono = document.getElementById('confTelefono').value.trim();

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> GUARDANDO...';

        const { data: { user } } = await fisioNet.auth.getUser();
        
        const { error } = await fisioNet
            .from('perfiles_profesionales')
            .update({ 
                nombre_completo: nombre, 
                telefono_contacto: telefono 
            })
            .eq('id', user.id);

        if (error) throw error;

        localStorage.setItem('nombre_completo', nombre);
        alert("✅ ¡Datos de perfil actualizados con éxito!");
    } catch (error) {
        alert("⚠️ Error al actualizar perfil: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-save"></i> ACTUALIZAR PERFIL';
    }
});

// --- 3. ACTUALIZAR CORREO Y/O CONTRASEÑA EN SUPABASE AUTH ---
document.getElementById('formCredenciales').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnCredenciales');
    const nuevoEmail = document.getElementById('confEmail').value.trim().toLowerCase();
    const nuevoPass = document.getElementById('confPass').value;
    
    const { data: { user } } = await fisioNet.auth.getUser();

    let actualizaciones = {};

    // Si el e-mail cambió respecto al actual
    if (nuevoEmail && nuevoEmail !== user.email) {
        actualizaciones.email = nuevoEmail;
    }

    if (nuevoPass) {
        if (nuevoPass.length < 6) {
            alert("⚠️ La contraseña debe contener al menos 6 caracteres.");
            return;
        }
        actualizaciones.password = nuevoPass;
    }

    if (Object.keys(actualizaciones).length === 0) {
        alert("ℹ️ No has realizado ningún cambio en tu correo ni contraseña.");
        return;
    }

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> PROCESANDO...';

        const { error } = await fisioNet.auth.updateUser(actualizaciones);
        if (error) throw error;

        if (actualizaciones.email) {
            alert("📩 SOLICITUD DE CAMBIO DE CORREO ENVIADA:\n\nPor seguridad de tu cuenta, Supabase ha enviado un enlace de confirmación al correo actual Y al nuevo correo. Debes hacer clic en ambos para autorizar el cambio definitivo.");
        } else {
            alert("🔒 ¡Contraseña modificada exitosamente!");
        }
        
        document.getElementById('confPass').value = '';
    } catch (error) {
        alert("⚠️ Error al actualizar credenciales: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-shield-lock"></i> ACTUALIZAR CREDENCIALES';
    }
});

// --- 4. SOLICITAR VERIFICACIÓN SMS (FORMATO E.164 +52) ---
document.getElementById('btnEnviarSMS').addEventListener('click', async () => {
    const btn = document.getElementById('btnEnviarSMS');
    const telefonoInput = document.getElementById('smsTelefono').value.trim();

    if (telefonoInput.length !== 10 || isNaN(telefonoInput)) {
        alert("⚠️ Por favor, ingresa un número celular válido de 10 dígitos.");
        return;
    }

    // Convertir a formato internacional para México (+52)
    const telefonoE164 = `+52${telefonoInput}`;

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> ENVIANDO SMS...';

        // Petición nativa a Supabase Auth para ligar el celular
        const { error } = await fisioNet.auth.updateUser({ phone: telefonoE164 });
        if (error) throw error;

        alert(`📱 Código de verificación enviado al número +52 ${telefonoInput}. Revisa tus mensajes de texto.`);
        document.getElementById('bloqueVerificacion').classList.remove('hidden');
    } catch (error) {
        alert("⚠️ Error al solicitar SMS: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send-fill"></i> REENVIAR CÓDIGO SMS';
    }
});

// --- 5. VERIFICAR EL CÓDIGO SMS RECIBIDO ---
document.getElementById('btnVerificarCodigo').addEventListener('click', async () => {
    const btn = document.getElementById('btnVerificarCodigo');
    const telefonoInput = document.getElementById('smsTelefono').value.trim();
    const token = document.getElementById('smsToken').value.trim();

    if (token.length !== 6) {
        alert("⚠️ El código debe constar de 6 dígitos.");
        return;
    }

    const telefonoE164 = `+52${telefonoInput}`;

    try {
        btn.disabled = true;
        btn.innerHTML = 'VERIFICANDO...';

        const { data, error } = await fisioNet.auth.verifyOtp({
            phone: telefonoE164,
            token: token,
            type: 'phone_change'
        });

        if (error) throw error;

        alert("🎉 ¡Teléfono verificado al 100%! Tu número ha quedado registrado como medio oficial de recuperación de cuenta.");
        document.getElementById('bloqueVerificacion').classList.add('hidden');
        location.reload();
    } catch (error) {
        alert("❌ Código inválido o expirado. Verifica el número e intenta nuevamente: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'VERIFICAR';
    }
});