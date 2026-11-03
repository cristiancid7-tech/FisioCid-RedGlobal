// js/recuperar-pass.js (Versión Blindada y Segura)

document.getElementById('formNuevaPass').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const p1 = document.getElementById('pass1').value;
    const p2 = document.getElementById('pass2').value;

    // 1. Validación estricta de complejidad (Mínimo 8 caracteres, mayúscula, minúscula y número)
    const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
    if (!regexPassword.test(p1)) {
        return alert("⚠️ La contraseña debe tener al menos 8 caracteres, incluir una letra mayúscula, una minúscula y un número.");
    }

    // 2. Validación de coincidencia
    if (p1 !== p2) {
        return alert("❌ Las contraseñas no coinciden.");
    }

    const btn = e.target.querySelector('button');
    const textoOriginal = btn.innerText;
    btn.innerText = "ACTUALIZANDO...";
    btn.disabled = true;

    try {
        // 3. Verificamos que exista una sesión activa por el token de recuperación
        const { data: { session }, error: sessionError } = await fisioNet.auth.getSession();
        
        if (sessionError || !session) {
            alert("⚠️ El enlace de recuperación ha expirado o no es válido. Por favor solicita uno nuevo.");
            window.location.href = 'recuperar.html'; // Redirigir a solicitar correo de nuevo
            return;
        }

        // 4. Supabase actualiza la contraseña del usuario autenticado por el token temporal
        const { error } = await fisioNet.auth.updateUser({ password: p1 });

        if (error) {
            throw error;
        }

        alert("✅ ¡Contraseña actualizada con éxito! Ya puedes iniciar sesión con tu nueva credencial.");
        
        // Cerramos sesión por seguridad para forzar el login limpio
        await fisioNet.auth.signOut();
        
        window.location.href = 'login.html';

    } catch (err) {
        alert("Hubo un detalle al actualizar: " + (err.message || err));
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
});