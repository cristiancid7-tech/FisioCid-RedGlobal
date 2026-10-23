const supabaseUrl = 'https://wboknacojtrfehlwswhh.supabase.co';
const supabaseKey = 'sb_publishable_MVn2K8b7-8z7othUB32xTw_phF-tMMl';

// 1. Tu conexión PRINCIPAL (Con persistencia total para no perder la sesión ni Google Calendar)
window.fisioNet = supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,         // 👈 Mantiene la sesión iniciada al cerrar/recargar la pestaña
        storage: window.localStorage, // 👈 Guarda el token en el navegador
        autoRefreshToken: true,       // 👈 Renueva el token antes de que expire en segundo plano
        detectSessionInUrl: true      // 👈 Captura el token cuando regresas de autorizar Google Login
    }
});

// 2. Tu cliente SECUNDARIO/FANTASMA (Para consultas aisladas que no deben alterar la sesión)
window.fisioAdmin = supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: null
    }
});

// 3. Listener que captura los tokens de Google Calendar al iniciar sesión con Google
window.fisioNet.auth.onAuthStateChange(async (event, session) => {
    if (session) {
        const googleAccessToken = session.provider_token;
        const googleRefreshToken = session.provider_refresh_token;

        if (googleAccessToken) {
            localStorage.setItem('google_access_token', googleAccessToken);
        }
        if (googleRefreshToken) {
            localStorage.setItem('google_refresh_token', googleRefreshToken);
        }
    }
});