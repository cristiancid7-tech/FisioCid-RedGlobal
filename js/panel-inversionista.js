document.addEventListener('DOMContentLoaded', async () => {
    // 1. Candado de seguridad: solo rol INVERSIONISTA o SUPER_ADMIN
    await validarAccesoInversionista();

    // 2. Establecer mes y año actual en los selectores
    const hoy = new Date();
    document.getElementById('selectMesCorte').value = hoy.getMonth() + 1;
    document.getElementById('selectAnioCorte').value = hoy.getFullYear();

    // 3. Cargar reporte de caja
    await cargarMetricasFinancieras();
});

// 🛡️ VERIFICADOR ESTRICTO DE ACCESO A ESTE DASHBOARD
async function validarAccesoInversionista() {
    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        const { data: perfil } = await fisioNet
            .from('perfiles_profesionales')
            .select('rol')
            .eq('id', user.id)
            .single();

        if (perfil?.rol !== 'INVERSIONISTA' && perfil?.rol !== 'SUPER_ADMIN') {
            alert("⛔ Acceso Restringido. Este panel es exclusivo para la Junta Directiva de FisioCid.");
            window.location.href = 'historia-clinica.html';
        }
    } catch (err) {
        console.error("Error validando perfil ejecutiva:", err);
        window.location.href = 'login.html';
    }
}

// 📊 MOTOR DE CÁLCULO CONTABLE MENSUAL
async function cargarMetricasFinancieras() {
    const mes = parseInt(document.getElementById('selectMesCorte').value);
    const anio = parseInt(document.getElementById('selectAnioCorte').value);

    try {
        // A. Consultar Pagos del mes seleccionado
        const { data: pagos, error: errPagos } = await fisioNet
            .from('pagos_suscripciones')
            .select('*')
            .eq('mes_corte', mes)
            .eq('anio_corte', anio)
            .eq('estado_pago', 'APROBADO')
            .order('fecha_pago', { ascending: false });

        if (errPagos) throw errPagos;

        // B. Consultar perfiles registrados en la plataforma
        const { data: perfiles } = await fisioNet
            .from('perfiles_profesionales')
            .select('id, nivel_suscripcion, suscripcion_activa');

        // C. Totales calculados
        const ingresosTotales = pagos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0;
        const totalUsuarios = perfiles?.length || 0;

        // Conteo por plan
        const desglose = { GRATUITO: 0, BASICO: 0, ESENCIAL: 0, CLINICO: 0, ENTERPRISE: 0, BETA_TESTER: 0 };
        let suscriptoresPagoCount = 0;

        perfiles?.forEach(p => {
            const plan = p.nivel_suscripcion || 'GRATUITO';
            if (desglose[plan] !== undefined) desglose[plan]++;
            if (['BASICO', 'ESENCIAL', 'CLINICO', 'ENTERPRISE'].includes(plan) && p.suscripcion_activa) {
                suscriptoresPagoCount++;
            }
        });

        const ticketPromedio = suscriptoresPagoCount > 0 ? (ingresosTotales / suscriptoresPagoCount) : 0;

        // D. Pintar KPIs en pantalla
        document.getElementById('lblIngresosMes').innerText = `$${ingresosTotales.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`;
        document.getElementById('lblTotalUsuarios').innerText = totalUsuarios;
        document.getElementById('lblSuscriptoresPago').innerText = suscriptoresPagoCount;
        document.getElementById('lblTicketPromedio').innerText = `$${ticketPromedio.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`;

        // E. Renderizar Distribución por Plan
        renderizarDistribucionPlanes(desglose);

        // F. Renderizar Tabla de Pagos
        renderizarTablaPagos(pagos || []);

    } catch (err) {
        console.error("Error generando métricas contables:", err);
    }
}

function renderizarDistribucionPlanes(desglose) {
    const cont = document.getElementById('contenedorDistribucionPlanes');
    const configuracionPlanes = [
        { codigo: 'GRATUITO', color: 'border-slate-700 text-slate-300' },
        { codigo: 'BASICO', color: 'border-sky-500/50 text-sky-400' },
        { codigo: 'ESENCIAL', color: 'border-amber-500/50 text-amber-400' },
        { codigo: 'CLINICO', color: 'border-purple-500/50 text-purple-400' },
        { codigo: 'ENTERPRISE', color: 'border-emerald-500/50 text-emerald-400' },
        { codigo: 'BETA_TESTER', color: 'border-amber-400 bg-amber-400/5 text-amber-300' }
    ];

    cont.innerHTML = configuracionPlanes.map(p => `
        <div class="bg-slate-950 p-3 rounded-xl border ${p.color} text-center">
            <span class="text-[10px] font-bold block uppercase tracking-wider opacity-70">${p.codigo}</span>
            <b class="text-xl mt-1 block">${desglose[p.codigo] || 0}</b>
        </div>
    `).join('');
}

function renderizarTablaPagos(pagos) {
    const tbody = document.getElementById('tablaPagosInversionista');
    document.getElementById('lblConteoTransacciones').innerText = `${pagos.length} pagos registrados`;

    if (pagos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-500 italic">No hay registros de cobros liquidados en este mes.</td></tr>`;
        return;
    }

    tbody.innerHTML = pagos.map(p => {
        const fechaFormat = new Date(p.fecha_pago).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
        return `
            <tr class="hover:bg-slate-800/40 transition">
                <td class="p-3 text-slate-400">${fechaFormat}</td>
                <td class="p-3 font-bold text-white">${p.nombre_profesional || 'Doctor FisioCid'}</td>
                <td class="p-3"><span class="bg-slate-800 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded text-[10px] font-bold">${p.codigo_plan}</span></td>
                <td class="p-3 text-slate-400">${p.metodo_pago}</td>
                <td class="p-3 font-mono text-[11px] text-amber-300">${p.referencia_pago || 'N/A'}</td>
                <td class="p-3 text-right font-black text-emerald-400">+$${Number(p.monto).toFixed(2)} MXN</td>
            </tr>
        `;
    }).join('');
}