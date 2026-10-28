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
    const { codigoPlan, userId, originUrl } = await req.json()

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Consultar el plan INCLUYENDO las columnas de descuento
    const { data: plan, error: errPlan } = await supabase
      .from('planes_suscripcion')
      .select('codigo_plan, nombre, precio_mensual, tiene_descuento, porcentaje_descuento, cupos_restantes')
      .eq('codigo_plan', codigoPlan)
      .eq('activo', true)
      .single()

    if (errPlan || !plan) {
      return new Response(JSON.stringify({ error: "El plan solicitado no existe o no esta activo." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 2. CÁLCULO DE PRECIO CON DESCUENTO SI TIENE CUPOS
    let precioCobro = Number(plan.precio_mensual);

    if (plan.tiene_descuento && Number(plan.cupos_restantes) > 0 && Number(plan.porcentaje_descuento) > 0) {
      const descuento = (precioCobro * Number(plan.porcentaje_descuento)) / 100;
      precioCobro = Math.round(precioCobro - descuento); // Redondea al entero más cercano
    }

    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN") || "APP_USR-5830452230405605-100403-80ba0a7257f81d69c770efa3b6c02135-240030910";

    // 3. Crear la preferencia en Mercado Pago con el PRECIO CALCULADO DE FORMA SEGURA
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
            unit_price: precioCobro, // 👈 Se manda el precio real (con o sin oferta)
            quantity: 1,
            currency_id: "MXN"
          }
        ],
        external_reference: `${userId}|${plan.codigo_plan}`,
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