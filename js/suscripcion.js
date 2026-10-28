// 1. INICIALIZAR MERCADO PAGO CON TU PUBLIC KEY DE PRODUCCIÓN
const mp = new MercadoPago('APP_USR-c45a6e3b-7d14-4edf-a8ae-e552042f155e', {
    locale: 'es-MX'
});

let planSeleccionadoModal = null;
let montoSeleccionadoModal = 0;

document.addEventListener('DOMContentLoaded', async () => {
    await cargarPlanesDinamicos(); // 👈 Carga la rejilla desde Supabase
    await cargarEstadoSuscripcion();
    await procesarRetornoMercadoPago();
});

// 2. CARGAR PLANES DINÁMICAMENTE DESDE LA TABLA planes_suscripcion
async function cargarPlanesDinamicos() {
    const contenedor = document.getElementById('contenedorPlanes');
    if (!contenedor) return;

    try {
        const { data: planes, error } = await fisioNet
            .from('planes_suscripcion')
            .select('id, codigo_plan, nombre, precio_mensual, limite_pacientes, limite_usuarios, permite_adjuntos, activo')
            .eq('activo', true)
            .order('precio_mensual', { ascending: true });

        if (error) throw error;
        if (!planes || planes.length === 0) return;

        contenedor.innerHTML = ''; // Limpiar loader o contenido estático

        planes.forEach(plan => {
            const esEsencial = plan.codigo_plan === 'ESENCIAL';
            const esGratuito = Number(plan.precio_mensual) === 0;

            const card = document.createElement('div');
            card.className = esEsencial
                ? "bg-slate-800 border-2 border-amber-500/80 rounded-2xl p-6 flex flex-col justify-between relative shadow-lg shadow-amber-500/10"
                : "bg-slate-800/60 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-500 transition";

            const txtPacientes = plan.limite_pacientes 
                ? `Hasta <b>${plan.limite_pacientes} Pacientes</b>` 
                : '<b>Pacientes Ilimitados</b>';

            const txtUsuarios = plan.limite_usuarios 
                ? `<b>${plan.limite_usuarios}</b> ${plan.limite_usuarios === 1 ? 'Usuario Profesional' : 'Usuarios Especialistas'}` 
                : '<b>Usuarios Ilimitados</b>';

            card.innerHTML = `
                ${esEsencial ? '<span class="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-3 py-1 rounded-full">Más Popular</span>' : ''}
                <div>
                    <span class="text-xs font-bold ${esEsencial ? 'text-amber-400' : 'text-sky-400'} uppercase tracking-wider">${plan.codigo_plan}</span>
                    <h3 class="text-xl font-bold text-white mt-1">${plan.nombre}</h3>
                    <div class="my-4">
                        <span class="text-3xl font-black ${esEsencial ? 'text-amber-400' : 'text-white'}">$${plan.precio_mensual}</span>
                        <span class="text-xs text-slate-400"> MXN / mes</span>
                    </div>
                    <ul class="text-xs text-slate-300 space-y-2.5 mb-6">
                        <li><i class="fas fa-check ${esEsencial ? 'text-amber-400' : 'text-sky-400'} mr-2"></i>${txtPacientes}</li>
                        <li><i class="fas fa-check ${esEsencial ? 'text-amber-400' : 'text-sky-400'} mr-2"></i>${txtUsuarios}</li>
                        ${plan.permite_adjuntos ? `<li><i class="fas fa-check ${esEsencial ? 'text-amber-400' : 'text-sky-400'} mr-2"></i>Archivos pesados / Adjuntos</li>` : ''}
                    </ul>
                </div>
                ${esGratuito 
                    ? `<button id="btnPlanGratuito" onclick="solicitarCambioPlan('${plan.codigo_plan}')" class="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl transition">Elegir Gratuito</button>`
                    : `<button onclick="abrirModalPago('${plan.codigo_plan}', ${plan.precio_mensual})" class="w-full py-2.5 ${esEsencial ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black' : 'bg-sky-600 hover:bg-sky-500 text-white font-bold'} text-xs rounded-xl transition">Seleccionar Plan</button>`
                }
            `;

            contenedor.appendChild(card);
        });

    } catch (err) {
        console.error("Error al cargar los planes desde Supabase:", err);
    }
}

// 3. CARGAR Y MOSTRAR ESTADO DEL USUARIO
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

// 4. ABRIR PASARELA DE PAGO VÍA EDGE FUNCTION DE SUPABASE
async function abrirModalPago(codigoPlan, monto) {
    planSeleccionadoModal = codigoPlan;
    montoSeleccionadoModal = monto;

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return alert("Sesión no válida. Por favor, inicia sesión nuevamente.");

        // Solo enviamos codigoPlan y userId. La Edge Function valida el precio en BD
        const { data: prefData, error: prefErr } = await fisioNet.functions.invoke('crear-preferencia-mp', {
            body: {
                codigoPlan: codigoPlan,
                userId: user.id,
                originUrl: window.location.origin + window.location.pathname
            }
        });

        console.log("🔍 Respuesta de la Edge Function / Mercado Pago:", prefData, prefErr);

        if (prefErr) throw prefErr;

        if (prefData?.init_point) {
            window.location.href = prefData.init_point;
        } else if (prefData?.id) {
            mp.checkout({
                preference: { id: prefData.id },
                autoOpen: true
            });
        } else {
            const errorMsg = prefData?.message || prefData?.error || "Respuesta inválida de Mercado Pago.";
            throw new Error(errorMsg);
        }

    } catch (err) {
        console.error("Error al abrir la pasarela de Mercado Pago:", err);
        alert("⚠️ No se pudo conectar con la pasarela de pago: " + err.message);
    }
}

function cerrarModalPago() {
    document.getElementById('modalPago')?.classList.add('hidden');
}

// 5. PROCESAR RETORNO AUTOMÁTICO DE MERCADO PAGO
async function procesarRetornoMercadoPago() {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('collection_status') || urlParams.get('status');
    const paymentId = urlParams.get('payment_id');
    const plan = urlParams.get('plan');

    if (status === 'approved' && paymentId) {
        try {
            const { data: { user } } = await fisioNet.auth.getUser();
            if (!user) return;

            const { data: pagoExistente } = await fisioNet
                .from('pagos_suscripciones')
                .select('id')
                .eq('referencia_pago', paymentId)
                .maybeSingle();

            if (pagoExistente) {
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
            }

            const { data: perfil } = await fisioNet
                .from('perfiles_profesionales')
                .select('nombre_completo')
                .eq('id', user.id)
                .single();

            await fisioNet.from('pagos_suscripciones').insert([{
                id_profesional: user.id,
                nombre_profesional: perfil?.nombre_completo || "Doctor FisioCid",
                codigo_plan: plan || 'PROFESIONAL',
                monto: 0,
                metodo_pago: 'MERCADO_PAGO',
                referencia_pago: paymentId,
                estado_pago: 'APROBADO'
            }]);

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

// 6. REGISTRAR PAGO MANUAL / SPEI (RESPALDO)
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
        cerrarModalPago();
        window.location.reload();

    } catch (err) {
        console.error("Error guardando el pago:", err);
        alert("⚠️ No se pudo procesar el pago: " + err.message);
    }
});

// 7. CAMBIO A PLAN GRATUITO
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