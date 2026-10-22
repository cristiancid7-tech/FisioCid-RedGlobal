import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const data = await req.json();

    // Mercado Pago envía notificaciones cuando se genera o actualiza un pago
    if (data.action === "payment.created" || data.type === "payment" || data.action === "payment.updated") {
      const paymentId = data.data?.id || data.id;
const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN") || "APP_USR-5830452230405605-100403-80ba0a7257f81d69c770efa3b6c02135-240030910";
      // 1. Consultar estado real del pago a la API de Mercado Pago
      const resMp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { "Authorization": `Bearer ${mpAccessToken}` }
      });
      const paymentInfo = await resMp.json();

      if (paymentInfo.status === "approved") {
        const userId = paymentInfo.external_reference; // ID del doctor en FisioCid
        const monto = paymentInfo.transaction_amount;

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 2. Extender vigencia por 30 días
        const nuevaFechaExp = new Date();
        nuevaFechaExp.setDate(nuevaFechaExp.getDate() + 30);

        await supabase
          .from('perfiles_profesionales')
          .update({
            suscripcion_activa: true,
            fecha_expiracion: nuevaFechaExp.toISOString()
          })
          .eq('id', userId);

        // 3. Registrar comprobante en la tabla de pagos
        await supabase
          .from('pagos_suscripciones')
          .insert([{
            id_profesional: userId,
            monto: monto,
            metodo_pago: 'MERCADO_PAGO_AUTOMATICO',
            referencia_pago: String(paymentId),
            estado_pago: 'APROBADO'
          }]);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});