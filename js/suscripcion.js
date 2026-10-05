// 1. INICIALIZAR MERCADO PAGO CON TU PUBLIC KEY DE PRODUCCIÓN
const mp = new MercadoPago('APP_USR-c45a6e3b-7d14-4edf-a8ae-e552042f155e', {
    locale: 'es-MX'
});

let planSeleccionadoModal = null;
let montoSeleccionadoModal = 0;

document.addEventListener('DOMContentLoaded', async () => {
    await cargarEstadoSuscripcion();
});

// 2. CARGAR Y MOSTRAR ESTADO DEL USUARIO
async function cargarEstadoSuscripcion() {
    const badge = document.getElementById('badgeEstadoActual');
    const alertaVencimiento = document.getElementById('alertaVencimiento');
    const btnGratuito = document.getElementById('btnPlanGratuito');
    const btnVolver = document.getElementById('btnVolverDashboard');

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return;

        const { data: perfil } = await fisioNet
            .from('perfiles_profesionales')
            .select('nivel_suscripcion, suscripcion_activa, fecha_expiracion, nombre_completo, demo_usado')
            .eq('id', user.id)
            .single();

        if (!perfil) return;

        // Deshabilitar botón si ya usó la demo
        if (perfil.demo_usado && btnGratuito) {
            btnGratuito.disabled = true;
            btnGratuito.onclick = null;
            btnGratuito.className = "w-full py-2.5 bg-slate-800 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed border border-slate-700";
            btnGratuito.innerText = "Plan Demo Ya Utilizado";
        }

        const hoy = new Date();
        const fechaExp = perfil.fecha_expiracion ? new Date(perfil.fecha_expiracion) : null;
        const diasRestantes = fechaExp ? Math.ceil((fechaExp - hoy) / (1000 * 60 * 60 * 24)) : 0;
        const estaVencido = !perfil.suscripcion_activa || (diasRestantes <= 0);

        let colorBadge = "border-emerald-500 text-emerald-400";
        let textoEstado = `Plan ${perfil.nivel_suscripcion} | ${diasRestantes} días restantes`;

        if (perfil.nivel_suscripcion === 'BETA_TESTER') {
            colorBadge = "border-amber-500 text-amber-400 bg-amber-500/10";
            textoEstado = `🚀 VIP BETA TESTER | ${diasRestantes} días restantes`;
        }

        // CONTROL DE ACCESO SEGÚN ESTADO DE PAGO
        if (estaVencido) {
            colorBadge = "border-red-500 text-red-400 bg-red-500/10";
            textoEstado = `⚠️ VENCIDO (${perfil.nivel_suscripcion})`;
            
            // Si está vencido: mostrar alerta fija y ocultar acceso al dashboard
            if (alertaVencimiento) alertaVencimiento.classList.remove('hidden');
            if (btnVolver) btnVolver.classList.add('hidden');
        } else {
            // Si está pagado o es Beta Tester: ocultar alerta y mostrar botón verde para ir al Dashboard
            if (alertaVencimiento) alertaVencimiento.classList.add('hidden');
            if (btnVolver) btnVolver.classList.remove('hidden');
        }

        if (badge) {
            badge.className = `flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold ${colorBadge}`;
            badge.innerHTML = `<i class="fas fa-shield-alt"></i> ${textoEstado}`;
        }

    } catch (err) {
        console.error("Error al cargar estado de suscripción:", err);
    }
}

// 3. ABRIR PASARELA DE PAGO AUTOMÁTICA Y ANTIFRAUDE
async function abrirModalPago(codigoPlan, monto) {
    planSeleccionadoModal = codigoPlan;
    montoSeleccionadoModal = monto;

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return alert("Sesión no válida. Por favor, inicia sesión nuevamente.");

        // Generar la preferencia de pago vinculando el ID del usuario
        const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer APP_USR-5830452230405605-100421-279442b033d45ef8d08595cb608be047-190181977" // Access Token Productivo
            },
            body: JSON.stringify({
                items: [
                    {
                        title: `Plan ${codigoPlan}`,
                        unit_price: Number(monto),
                        quantity: 1,
                        currency_id: "MXN"
                    }
                ],
                external_reference: user.id, // 👈 Identificador del usuario para activación automática en Edge Function
                back_urls: {
                    success: window.location.href,
                    failure: window.location.href,
                    pending: window.location.href
                },
                auto_return: "approved"
            })
        });

        const preference = await response.json();

        if (preference.init_point) {
            // Redirige al checkout dinámico de Mercado Pago
            window.location.href = preference.init_point;
        } else {
            throw new Error("No se pudo generar la preferencia de cobro.");
        }

    } catch (err) {
        console.error("Error procesando preferencia de pago:", err);
        // Respaldo: Abre el modal SPEI si falla la conexión con la API
        document.getElementById('lblPlanModal').innerText = codigoPlan;
        document.getElementById('lblMontoModal').innerText = `$${monto}.00 MXN`;
        document.getElementById('modalPago')?.classList.remove('hidden');
    }
}

function cerrarModalPago() {
    document.getElementById('modalPago')?.classList.add('hidden');
}

// 4. REGISTRAR PAGO MANUAL / SPEI (RESPALDO)
document.getElementById('formNotificarPago')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const ref = document.getElementById('inputReferenciaPago').value.trim();
    if (!ref) return alert("Ingresa la referencia de transferencia.");

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return alert("Sesión no válida.");

        const { data: perfil } = await fisioNet
            .from('perfiles_profesionales')
            .select('nombre_completo')
            .eq('id', user.id)
            .single();

        // A. Insertar pago en el libro contable
        const { error: errPago } = await fisioNet
            .from('pagos_suscripciones')
            .insert([{
                id_profesional: user.id,
                nombre_profesional: perfil?.nombre_completo || "Doctor FisioCid",
                codigo_plan: planSeleccionadoModal,
                monto: montoSeleccionadoModal,
                metodo_pago: 'TRANSFERENCIA_SPEI',
                referencia_pago: ref,
                estado_pago: 'APROBADO'
            }]);

        if (errPago) throw errPago;

        // B. Extender vigencia del profesional por 30 días adicionales
        const nuevaFechaExp = new Date();
        nuevaFechaExp.setDate(nuevaFechaExp.getDate() + 30);

        const { error: errPerfil } = await fisioNet
            .from('perfiles_profesionales')
            .update({
                nivel_suscripcion: planSeleccionadoModal,
                suscripcion_activa: true,
                fecha_expiracion: nuevaFechaExp.toISOString()
            })
            .eq('id', user.id);

        if (errPerfil) throw errPerfil;

        alert("🎉 ¡Pago registrado con éxito! Tu plan ha sido renovado por 30 días.");
        cerrModalPago();
        window.location.reload();

    } catch (err) {
        console.error("Error guardando el pago:", err);
        alert("⚠️ No se pudo procesar el pago: " + err.message);
    }
});

// 5. CAMBIO A PLAN GRATUITO (CON BLOQUEO DE ÚNICO USO)
async function solicitarCambioPlan(codigoPlan) {
    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return alert("Sesión no válida.");

        // Validar si el usuario ya gastó su oportunidad
        const { data: perfil } = await fisioNet
            .from('perfiles_profesionales')
            .select('demo_usado')
            .eq('id', user.id)
            .single();

        if (perfil?.demo_usado) {
            return alert("🚫 El Plan Gratuito Demo solo se puede disfrutar una única vez por cuenta. Por favor selecciona un plan de pago para continuar disfrutando de FisioCid.");
        }

        if (!confirm("¿Deseas activar tu único periodo Gratuito Demo?")) return;

        const { error } = await fisioNet
            .from('perfiles_profesionales')
            .update({
                nivel_suscripcion: codigoPlan,
                suscripcion_activa: true,
                demo_usado: true // Previene futuros reingresos al plan demo
            })
            .eq('id', user.id);

        if (error) throw error;

        alert("🎉 Se ha activado tu plan Gratuito Demo.");
        window.location.reload();

    } catch (err) {
        console.error("Error cambiando de plan:", err);
        alert("⚠️ No se pudo cambiar de plan: " + err.message);
    }
}