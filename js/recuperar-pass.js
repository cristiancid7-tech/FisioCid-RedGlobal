// js/recuperar-pass.js (Solo para la página actualizar-password.html)

document.getElementById('formNuevaPass').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const p1 = document.getElementById('pass1').value;
    const p2 = document.getElementById('pass2').value;

    if (p1.length < 6) return alert("La contraseña debe tener al menos 6 caracteres.");
    if (p1 !== p2) return alert("Las contraseñas no coinciden.");

    const btn = e.target.querySelector('button');
    btn.innerText = "ACTUALIZANDO...";
    btn.disabled = true;

    // Supabase hace la magia con el token de la URL solito
    const { error } = await fisioNet.auth.updateUser({ password: p1 });

    if (error) {
        alert("Hubo un detalle: " + error.message);
        btn.innerText = "ACTUALIZAR Y ENTRAR";
        btn.disabled = false;
    } else {
        alert("✅ ¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.");
        // IMPORTANTE: Al login, para que el sistema detecte si es Socio o Fisio
        window.location.href = 'login.html'; 
    }
});