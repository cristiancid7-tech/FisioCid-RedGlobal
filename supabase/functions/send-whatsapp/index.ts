import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN");
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

serve(async (req) => {
  // Configuración de cabeceras CORS para peticiones desde React
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { to, doctorName, patientName, date, time } = await req.json();

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to, // Número a 10 o 12 dígitos (ej: "52238XXXXXXX")
          type: "interactive",
          interactive: {
            type: "button",
            body: {
              text: `🏥 *FisioCid: Nueva Solicitud de Cita*\n\nHola Dr. ${doctorName}, el paciente *${patientName}* agendó para el *${date}* a las *${time}*.`,
            },
            action: {
              buttons: [
                {
                  type: "reply",
                  reply: { id: "approve_appointment", title: "✅ Aprobar" },
                },
                {
                  type: "reply",
                  reply: { id: "reject_appointment", title: "❌ Rechazar" },
                },
              ],
            },
          },
        }),
      }
    );

    const result = await response.json();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});