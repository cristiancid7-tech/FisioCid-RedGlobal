// 1. INICIALIZAR MERCADO PAGO CON TU PUBLIC KEY DE PRODUCCIÓN (Seguro en cliente)
const mp = new MercadoPago('APP_USR-c45a6e3b-7d14-4edf-a8ae-e552042f155e', {
    locale: 'es-MX'
});

let planSeleccionadoModal = null;
let montoSeleccionadoModal = 0;

document.addEventListener('DOMContentLoaded', async () => {
    await cargarEstadoSuscripcion();
    await procesarRetornoMercadoPago(); // 👈 Detecta y activa suscripción tras pago exitoso
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

        if (estaVencido) {
            colorBadge = "border-red-500 text-red-400 bg-red-500/10";
            textoEstado = `⚠️ VENCIDO (${perfil.nivel_suscripcion})`;
            
            if (alertaVencimiento) alertaVencimiento.classList.remove('hidden');
            if (btnVolver) btnVolver.classList.add('hidden');
        } else {
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

// 3. ABRIR PASARELA DE PAGO VÍA EDGE FUNCTION DE SUPABASE (CONEXIÓN SEGURA)
// 3. ABRIR CHECKOUT MODAL AUTOMÁTICO SOBRE FISIOCID.COM
async function abrirModalPago(codigoPlan, monto) {
    planSeleccionadoModal = codigoPlan;
    montoSeleccionadoModal = monto;

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return alert("Sesión no válida. Por favor, inicia sesión nuevamente.");

        // 1. Crear preferencia desde la Edge Function
        const { data: prefData, error: prefErr } = await fisioNet.functions.invoke('crear-preferencia-mp', {
            body: {
                codigoPlan: codigoPlan,
                monto: Number(monto),
                userId: user.id,
                originUrl: window.location.origin + window.location.pathname
            }
        });

        if (prefErr || !prefData?.id) {
            throw new Error("No se pudo generar la preferencia de pago.");
        }

        // 2. 🚀 ABRIR MODAL FLOTANTE DE MERCADO PAGO SIN SALIR DE FISIOCID
        mp.checkout({
            preference: {
                id: prefData.id
            },
            autoOpen: true // 👈 Abre la pasarela en una ventana modal sobre tu sitio
        });

    } catch (err) {
        console.error("Error al abrir la pasarela de Mercado Pago:", err);
        alert("⚠️ No se pudo conectar con la pasarela de pago. Intenta de nuevo.");
    }
}

function cerrarModalPago() {
    document.getElementById('modalPago')?.classList.add('hidden');
}

// 4. PROCESAR RETORNO AUTOMÁTICO DE MERCADO PAGO
async function procesarRetornoMercadoPago() {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('collection_status') || urlParams.get('status');
    const paymentId = urlParams.get('payment_id');
    const plan = urlParams.get('plan');

    if (status === 'approved' && paymentId) {
        try {
            const { data: { user } } = await fisioNet.auth.getUser();
            if (!user) return;

            // Prevenir doble procesamiento comprobando si la referencia ya fue registrada
            const { data: pagoExistente } = await fisioNet
                .from('pagos_suscripciones')
                .select('id')
                .eq('referencia_pago', paymentId)
                .maybeSingle();

            if (pagoExistente) {
                // Limpiar parámetros de la URL sin recargar la página
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
            }

            const { data: perfil } = await fisioNet
                .from('perfiles_profesionales')
                .select('nombre_completo')
                .eq('id', user.id)
                .single();

            // A. Registrar el pago de Mercado Pago
            await fisioNet.from('pagos_suscripciones').insert([{
                id_profesional: user.id,
                nombre_profesional: perfil?.nombre_completo || "Doctor FisioCid",
                codigo_plan: plan || 'PROFESIONAL',
                monto: 0, // Se actualizará vía Webhook si registras el monto exacto
                metodo_pago: 'MERCADO_PAGO',
                referencia_pago: paymentId,
                estado_pago: 'APROBADO'
            }]);

            // B. Extender suscripción 30 días
            const nuevaFechaExp = new Date();
            nuevaFechaExp.setDate(nuevaFechaExp.getDate() + 30);

            await fisioNet.from('perfiles_profesionales').update({
                nivel_suscripcion: plan || 'PROFESIONAL',
                suscripcion_activa: true,
                fecha_expiracion: nuevaFechaExp.toISOString()
            }).eq('id', user.id);

            alert("🎉 ¡PAGO APROBADO CON ÉXITO! Tu suscripción ha sido activada por 30 días.");
            window.history.replaceState({}, document.title, window.location.pathname);
            window.location.reload();

        } catch (err) {
            console.error("Error al procesar el retorno del pago:", err);
        }
    }
}

// 5. REGISTRAR PAGO MANUAL / SPEI (RESPALDO)
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
        cerrarModalPago(); // 👈 Arreglado el typo anterior
        window.location.reload();

    } catch (err) {
        console.error("Error guardando el pago:", err);
        alert("⚠️ No se pudo procesar el pago: " + err.message);
    }
});

// 6. CAMBIO A PLAN GRATUITO (CON BLOQUEO DE ÚNICO USO)
async function solicitarCambioPlan(codigoPlan) {
    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return alert("Sesión no válida.");

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
                demo_usado: true
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