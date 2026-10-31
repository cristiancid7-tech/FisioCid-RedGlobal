import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { citaObj, nombrePaciente, esExpress } = await req.json();

    const idProfesional = citaObj.id_profesional;
    if (!idProfesional) {
      throw new Error("Falta el id_profesional en los datos de la cita.");
    }

    // 1. Obtener el google_refresh_token del profesional desde la base de datos
    const { data: perfil, error: errPerfil } = await supabase
      .from("perfiles_profesionales")
      .select("google_refresh_token, intervalo_cita")
      .eq("id", idProfesional)
      .single();

    if (errPerfil || !perfil?.google_refresh_token) {
      console.warn(`⚠️ El profesional ${idProfesional} no tiene google_refresh_token registrado.`);
      return new Response(
        JSON.stringify({ success: false, reason: "NO_REFRESH_TOKEN" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 2. Renovar el access_token con Google automáticamente
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

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("❌ Error renovando token con Google:", errText);
      return new Response(
        JSON.stringify({ success: false, error: errText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { access_token } = await tokenRes.json();

    // 3. Preparar tiempos y payload para Google Calendar
    const duracionCita = Number(citaObj.intervalo_cita) || Number(perfil.intervalo_cita) || 30;
    const horaInicioLimpia = (citaObj.hora_inicio_cita || "09:00").substring(0, 5);
    const [anio, mes, dia] = citaObj.fecha.split("-").map(Number);
    const [hora, min] = horaInicioLimpia.split(":").map(Number);

    const fechaHoraBase = new Date(anio, mes - 1, dia, hora, min, 0);
    const modalidadTexto = (citaObj.modalidad || "").toString().toUpperCase();
    const esDomicilio = modalidadTexto.includes("DOMICILIO");
    const minTraslado = esDomicilio ? 30 : 0;

    const fechaHoraInicioGoogle = new Date(fechaHoraBase.getTime() - minTraslado * 60 * 1000);
    const fechaHoraFinGoogle = new Date(
      fechaHoraBase.getTime() + (duracionCita + minTraslado) * 60 * 1000
    );

    const pad = (n: number) => String(n).padStart(2, "0");
    const aISO = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    const evento = {
      summary: `${esExpress ? "⚡ [EXPRÉS] " : ""}${esDomicilio ? "🚗 [DOMICILIO] " : ""}Cita: ${nombrePaciente}`,
      description: esDomicilio
        ? `🏡 SERVICIO A DOMICILIO\nPaciente: ${nombrePaciente}\nGestionado desde FisioCid App.`
        : `🏥 CONSULTA EN CLÍNICA\nPaciente: ${nombrePaciente}\nGestionado desde FisioCid App.`,
      transparency: "opaque",
      start: { dateTime: aISO(fechaHoraInicioGoogle), timeZone: "America/Mexico_City" },
      end: { dateTime: aISO(fechaHoraFinGoogle), timeZone: "America/Mexico_City" },
    };

    // 4. Agendar evento en la API de Google Calendar
    const eventRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(evento),
    });

    if (!eventRes.ok) {
      const errEvent = await eventRes.text();
      console.error("❌ Error creando evento en Google Calendar:", errEvent);
      return new Response(
        JSON.stringify({ success: false, error: errEvent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const eventData = await eventRes.json();
    const googleEventId = eventData.id;

    // 5. Vincular google_event_id en Supabase
    const targetId = citaObj.id_cita || citaObj.id;
    if (targetId) {
      if (citaObj.es_prospecto) {
        await supabase
          .from("solicitudes_citas")
          .update({ google_event_id: googleEventId })
          .eq("id", targetId);
      } else {
        await supabase
          .from("agenda_maestra")
          .update({ google_event_id: googleEventId })
          .eq("id_cita", targetId);
      }
    }

    console.log(`✅ Cita agendada automáticamente en Google Calendar (ID: ${googleEventId})`);

    return new Response(
      JSON.stringify({ success: true, googleEventId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("❌ Error inesperado en agendar-cita:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});