import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { codigoPlan, monto, userId, originUrl } = await req.json()
    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN") || "APP_USR-5830452230405605-100421-279442b033d45ef8d08595cb608be047-190181977"

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mpAccessToken}`
      },
      body: JSON.stringify({
        items: [
          {
            title: `Plan ${codigoPlan} - FisioCid`,
            unit_price: Number(monto),
            quantity: 1,
            currency_id: "MXN"
          }
        ],
        external_reference: userId,
        back_urls: {
          success: `${originUrl}?plan=${codigoPlan}`,
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