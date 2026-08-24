const supabaseUrl = 'https://wboknacojtrfehlwswhh.supabase.co'
const supabaseKey = 'sb_publishable_MVn2K8b7-8z7othUB32xTw_phF-tMMl'



// 1. Tu conexión normal para todo el sistema
window.fisioNet = supabase.createClient(supabaseUrl, supabaseKey)

window.fisioAdmin = supabase.createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // <-- "No guardes nada permanentemente"
    autoRefreshToken: false, // <-- "No intentes refrescar la llave"
    detectSessionInUrl: false, // <-- "No busques sesiones en la URL"
    storage: null // <-- "TIENES PROHIBIDO usar la memoria del navegador"
  }
});