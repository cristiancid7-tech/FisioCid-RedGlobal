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

    // 3. Obtener el refresh token del profesional
    const { data: perfil } = await supabase
      .from("perfiles_profesionales")
      .select("google_refresh_token")
      .eq("id", watchData.id_profesional)
      .maybeSingle();

    const haceTreintaMinutos = new Date(Date.now() - 30 * 60 * 1000).toISOString();

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

        // Pedimos eventos recientes incluyendo eliminados
        const eventsRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?updatedMin=${encodeURIComponent(
            haceTreintaMinutos
          )}&showDeleted=true`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          const items = eventsData.items || [];

          for (const item of items) {
            // 🚨 CASO 1: EVENTO CANCELADO/ELIMINADO EN GOOGLE CALENDAR
            if (item.status === "cancelled") {
              console.log(`🗑️ Evento de Google ${item.id} fue eliminado. Actualizando BD...`);

              await supabase
                .from("agenda_maestra")
                .update({ estatus: "CANCELADO", google_event_id: null })
                .eq("google_event_id", item.id);

              await supabase
                .from("solicitudes_citas")
                .update({ estado: "CANCELADO", google_event_id: null })
                .eq("google_event_id", item.id);
            }

            // 🟢 CASO 2: EVENTO CREADO O MODIFICADO DESDE EL CELULAR/WEB DE GOOGLE
    else if (item.status === "confirmed") {
        // 🛑 IGNORAR si el evento fue creado por la propia app (evita bucle infinito)
        if (item.description && item.description.includes("Gestionado desde FisioCid App")) {
          continue;
        }

        const fechaInicioRaw = item.start?.dateTime || item.start?.date;
        if (!fechaInicioRaw) continue;

        // 🇲🇽 Obtener fecha y hora exacta en zona horaria America/Mexico_City (Formato ISO de 24 hrs)
        const dateObj = new Date(fechaInicioRaw);
        
        // Convertir fecha a YYYY-MM-DD en hora de México
        const fechaMx = dateObj.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" }); // "sv-SE" garantiza YYYY-MM-DD
        
        // Convertir hora a HH:mm:ss de 24 horas en hora de México
        const horaMx = dateObj.toLocaleTimeString("es-MX", { 
          timeZone: "America/Mexico_City", 
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });

        // 1. Verificar si ya existe en agenda_maestra por su google_event_id
        const { data: citaExistente } = await supabase
          .from("agenda_maestra")
          .select("id_cita, fecha, hora_inicio_cita")
          .eq("google_event_id", item.id)
          .maybeSingle();

        if (citaExistente) {
          if (citaExistente.fecha !== fechaMx || citaExistente.hora_inicio_cita !== horaMx) {
            console.log(`🔄 Actualizando cita ${citaExistente.id_cita} a ${fechaMx} ${horaMx}`);
            await supabase
              .from("agenda_maestra")
              .update({ fecha: fechaMx, hora_inicio_cita: horaMx })
              .eq("id_cita", citaExistente.id_cita);
          }
        } else {
          // 2. Verificar en solicitudes_citas
          const { data: solExistente } = await supabase
            .from("solicitudes_citas")
            .select("id")
            .eq("google_event_id", item.id)
            .maybeSingle();

          if (!solExistente) {
            console.log(`✨ Insertando cita creada desde celular: ${item.summary} | Fecha: ${fechaMx} | Hora: ${horaMx}`);
            
            const { error: errInsert } = await supabase.from("agenda_maestra").insert({
              id_profesional: watchData.id_profesional,
              id_clinica: watchData.id_clinica,
              fecha: fechaMx,
              hora_inicio_cita: horaMx,
              modalidad: "CONSULTORIO",
              estatus: "PENDIENTE",
              notas_logistica: `Evento desde celular: ${item.summary || 'Sin título'}`,
              google_event_id: item.id
            });

            if (errInsert) {
              console.error("❌ Error al insertar en agenda_maestra:", errInsert);
            } else {
              console.log("✅ Cita insertada exitosamente en agenda_maestra");
            }
          }
        }
      }
          }
        } else {
          console.error("❌ Error al consultar eventos a Google API:", await eventsRes.text());
        }
      } else {
        console.error("❌ Error renovando token con Google:", await tokenRes.text());
      }
    } else {
      console.warn(`⚠️ El profesional ${watchData.id_profesional} no tiene google_refresh_token guardado.`);
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

