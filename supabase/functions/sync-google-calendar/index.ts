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

    // Si es una confirmación de sincronización (Sync handshake)
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

    // 3. Obtener el refresh token o access token del profesional para consultar Google Calendar
    const { data: perfil } = await supabase
      .from("perfiles_profesionales")
      .select("google_refresh_token")
      .eq("id", watchData.id_profesional)
      .maybeSingle();

    // 4. Si tenemos acceso, consultamos los últimos eventos modificados o eliminados
    // Consultamos los eventos modificados en los últimos 5 minutos
    const haceCincoMinutos = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    // Si guardaste el refresh_token, solicitamos un access_token fresco
    if (perfil?.google_refresh_token) {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
          refresh_token: perfil.google_refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        // Pedimos los eventos incluyendo los borrados (showDeleted=true)
        const eventsRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?updatedMin=${encodeURIComponent(
            haceCincoMinutos
          )}&showDeleted=true`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          const items = eventsData.items || [];

          for (const item of items) {
            // 🚨 SI EL EVENTO FUE BORRADO EN GOOGLE CALENDAR
            if (item.status === "cancelled") {
              console.log(`🗑️ Evento de Google ${item.id} fue eliminado. Actualizando BD...`);

              // Actualizamos en agenda_maestra
              await supabase
                .from("agenda_maestra")
                .update({ estatus: "CANCELADO", google_event_id: null })
                .eq("google_event_id", item.id);

              // Actualizamos en solicitudes_citas
              await supabase
                .from("solicitudes_citas")
                .update({ estado: "CANCELADO", google_event_id: null })
                .eq("google_event_id", item.id);
            }
          }
        }
      }
    }

    console.log(`📅 Cambio procesado para la clínica ${watchData.id_clinica}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("❌ Error procesando webhook de Google Calendar:", err);
    return new Response("Internal Error", { status: 500 });
  }
});