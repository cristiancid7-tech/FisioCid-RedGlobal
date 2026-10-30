import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    // 1. Validar encabezados del Webhook de Google
    const channelId = req.headers.get("x-goog-channel-id");
    const resourceState = req.headers.get("x-goog-resource-state");

    // Si es una confirmación de sincronización (Sync handshake de Google)
    if (resourceState === "sync") {
      return new Response("Sync OK", { status: 200 });
    }

    if (!channelId || resourceState !== "exists") {
      return new Response("No-op", { status: 200 });
    }

    // 2. Obtener información de la clínica y profesional vinculados al canal
    const { data: watchData, error: watchErr } = await supabase
      .from("google_calendar_watch")
      .select("*")
      .eq("channel_id", channelId)
      .single();

    if (watchErr || !watchData) {
      console.warn("⚠️ Canal de Webhook no registrado:", channelId);
      return new Response("Canal no encontrado", { status: 200 });
    }

    // 3. Notificación procesada exitosamente
    console.log(`📅 Cambio detectado en Google Calendar para la clínica ${watchData.id_clinica}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("❌ Error procesando webhook de Google Calendar:", err);
    return new Response("Internal Error", { status: 500 });
  }
});