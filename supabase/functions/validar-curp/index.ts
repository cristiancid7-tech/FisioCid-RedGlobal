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
    // 1. Recibir los datos personales que envía tu página web
    const { nombres, apellidoPaterno, apellidoMaterno, fechaNacimiento, genero, estado } = await req.json()

    if (!nombres || !apellidoPaterno || !fechaNacimiento || !genero || !estado) {
      return new Response(
        JSON.stringify({ error: 'Faltan datos obligatorios para buscar la CURP' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const TLALOC_API_KEY = Deno.env.get('TLALOC_API_KEY')

    // 2. Construir la URL con los parámetros que pide Tlaloc
    const url = new URL('https://api.tlaloc.sh/mx/v1/curp');
    url.searchParams.append('names', nombres);
    url.searchParams.append('first_last_name', apellidoPaterno);
    if(apellidoMaterno) url.searchParams.append('second_last_name', apellidoMaterno);
    url.searchParams.append('date_of_birth', fechaNacimiento); // Formato YYYY-MM-DD
    url.searchParams.append('gender', genero); // 'H' o 'M'
    url.searchParams.append('state_of_birth', estado);

    // 3. Hacer la consulta a Tlaloc
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TLALOC_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})