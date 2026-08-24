async function salir() {
    try {
        console.log("🧹 Iniciando limpieza profunda de FisioCid...");
        
        // 1. LIMPIEZA TOTAL INMEDIATA
        // No esperamos a Supabase, borramos primero por seguridad visual
        localStorage.clear();
        sessionStorage.clear();

        // 2. Cerramos sesión en el servidor
        await fisioNet.auth.signOut();

        // 3. Redirección destructiva (no permite "atrás")
        window.location.replace('login.html');

    } catch (error) {
        console.error("Error al salir:", error);
        // Si falla el internet, igual limpiamos local y sacamos al usuario
        localStorage.clear();
        window.location.replace('login.html');
    }
}
// DETECTOR GLOBAL DE CLIC EN EL BOTÓN
document.addEventListener('click', (e) => {
    // Si el clic fue en el botón de cerrar sesión (o en cualquier parte dentro de él)
    if (e.target.closest('#btnCerrarSesion')) {
        e.preventDefault();
        salir();
    }
});

// utils.js o seguridad.js

async function verificarPerfilCompleto() {
    const { data: { user } } = await fisioNet.auth.getUser();
    if (!user) return; // El login ya maneja esto

    // Evitar bucle infinito: si ya estoy en configuracion.html, no redireccionar
    const paginaActual = window.location.pathname;
    if (paginaActual.includes('configuracion.html')) return;

    try {
        const [perfilRes, clinicaRes] = await Promise.all([
            fisioNet.from('perfiles_profesionales').select('*').eq('id', user.id).single(),
            fisioNet.from('clinicas').select('*').eq('id_dueno', user.id).maybeSingle()
        ]);

        const perfil = perfilRes.data;
        const clinica = clinicaRes.data;

        // 🚨 LA GRAN REVISIÓN
        const incompleto = 
            !perfil?.nombre_completo || 
            !perfil?.cedula_profesional || 
            !perfil?.especialidad || 
            !perfil?.deslinde_aceptado ||
            !clinica?.nombre_clinica || 
            !clinica?.direccion;

        if (incompleto) {
            console.warn("Perfil incompleto. Redirigiendo a configuración...");
            sessionStorage.setItem('mensaje_bloqueo', '⚠️ DEBES COMPLETAR TU CONFIGURACIÓN PROFESIONAL Y ACEPTAR EL DESLINDE LEGAL ANTES DE USAR EL SISTEMA.');
            window.location.href = 'configuracion.html';
        }
    } catch (error) {
        console.error("Error en el portero de seguridad:", error);
    }
}



// Ejecutar automáticamente al cargar cualquier página
document.addEventListener('DOMContentLoaded', verificarPerfilCompleto);