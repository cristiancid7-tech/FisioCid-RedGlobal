import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Recibir datos (ya NO dependemos del 'monto' del cliente)
    const { codigoPlan, userId, originUrl } = await req.json()

    // 2. Inicializar cliente de Supabase interno
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 3. Consultar precio oficial y nombre del plan en la BD
    const { data: plan, error: errPlan } = await supabase
      .from('planes_suscripcion')
      .select('codigo_plan, nombre, precio_mensual')
      .eq('codigo_plan', codigoPlan)
      .eq('activo', true)
      .single()

    if (errPlan || !plan) {
      return new Response(JSON.stringify({ error: "El plan solicitado no existe o no esta activo." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 4. Obtener Access Token de las variables de entorno
    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN")

    if (!mpAccessToken) {
      return new Response(JSON.stringify({ error: "Falta configurar MP_ACCESS_TOKEN en Supabase Secrets." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // 5. Crear la preferencia en Mercado Pago con el PRECIO REAL
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mpAccessToken}`
      },
      body: JSON.stringify({
        items: [
          {
            id: plan.codigo_plan,
            title: `Plan ${plan.nombre} - FisioCid`,
            unit_price: Number(plan.precio_mensual), // 👈 Inalterable desde el navegador
            quantity: 1,
            currency_id: "MXN"
          }
        ],
        external_reference: `${userId}|${plan.codigo_plan}`, // 👈 Manda ID y Plan para el Webhook
        back_urls: {
          success: `${originUrl}?plan=${plan.codigo_plan}&collection_status=approved`,
          failure: `${originUrl}?pago=fallido`,
          pending: `${originUrl}?pago=pendiente`
        },
        auto_return: "approved"
      })
    })

    const preference = await response.json()

    return new Response(JSON.stringify(preference), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})