let planSeleccionadoModal = null;
let montoSeleccionadoModal = 0;

document.addEventListener('DOMContentLoaded', async () => {
    await cargarEstadoSuscripcion();
});

// 1. CARGAR Y MOSTRAR ESTADO DEL USUARIO LOGUEADO
async function cargarEstadoSuscripcion() {
    const badge = document.getElementById('badgeEstadoActual');
    const alertaVencimiento = document.getElementById('alertaVencimiento');

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return;

        const { data: perfil } = await fisioNet
            .from('perfiles_profesionales')
            .select('nivel_suscripcion, suscripcion_activa, fecha_expiracion, nombre_completo')
            .eq('id', user.id)
            .single();

        if (!perfil) return;

        const hoy = new Date();
        const fechaExp = perfil.fecha_expiracion ? new Date(perfil.fecha_expiracion) : null;
        const diasRestantes = fechaExp ? Math.ceil((fechaExp - hoy) / (1000 * 60 * 60 * 24)) : 0;
        const estaVencido = !perfil.suscripcion_activa || (diasRestantes <= 0);

        let colorBadge = "border-emerald-500 text-emerald-400";
        let textoEstado = `Plan ${perfil.nivel_suscripcion} | ${diasRestantes} días restantes`;

        if (perfil.nivel_suscripcion === 'BETA_TESTER') {
            colorBadge = "border-amber-500 text-amber-400 bg-amber-500/10";
            textoEstado = `🚀 VIP BETA TESTER | ${diasRestantes} días restantes`;
        } else if (estaVencido) {
            colorBadge = "border-red-500 text-red-400 bg-red-500/10";
            textoEstado = `⚠️ VENCIDO (${perfil.nivel_suscripcion})`;
            
            // Mostrar banner de aviso
            if (alertaVencimiento) alertaVencimiento.classList.remove('hidden');
        }

        badge.className = `flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold ${colorBadge}`;
        badge.innerHTML = `<i class="fas fa-shield-alt"></i> ${textoEstado}`;

    } catch (err) {
        console.error("Error al cargar estado de suscripción:", err);
    }
}

// 2. ABRIR Y CERRAR MODAL DE PAGO
function abrirModalPago(codigoPlan, monto) {
    planSeleccionadoModal = codigoPlan;
    montoSeleccionadoModal = monto;

    document.getElementById('lblPlanModal').innerText = codigoPlan;
    document.getElementById('lblMontoModal').innerText = `$${monto}.00 MXN`;
    document.getElementById('modalPago').classList.remove('hidden');
}

function cerrarModalPago() {
    document.getElementById('modalPago').classList.add('hidden');
}

// 3. REGISTRAR PAGO Y ACTUALIZAR VIGENCIA (+1 MES)
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

        // A. Insertar pago en el libro contable para el Inversionista
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
        cerrarModalPago();
        window.location.reload();

    } catch (err) {
        console.error("Error guardando el pago:", err);
        alert("⚠️ No se pudo procesar el pago: " + err.message);
    }
});