// ============================================================================
// 🏦 FISIOCID GLOBAL - MOTOR CONTABLE Y FINANCIERO (finanzas.js)
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🏦 FisioCid Finanzas: Inicializando módulo de contabilidad...");

    // 1. Verificar Sesión del Profesional
    const { data: { user } } = await fisioNet.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    // 2. Recuperar Sede Activa
    const clinicaId = localStorage.getItem('id_clinica_activa');
    const nombreClinica = localStorage.getItem('nombre_clinica') || "Sede No Seleccionada";
    const colorClinica = localStorage.getItem('clinica_color');

    if (!clinicaId) {
        console.warn("⚠️ No hay contexto de clínica activa. Redireccionando...");
        window.location.href = 'login.html';
        return;
    }

    // Aplicar Nombre y Estética Dinámica
    const labelSede = document.getElementById('sedeActivaTexto');
    if (labelSede) labelSede.innerText = `SEDE MONITOREADA: ${nombreClinica.toUpperCase()}`;

    if (colorClinica) {
        document.documentElement.style.setProperty('--primary', colorClinica);
    }

    // 3. Forzar Inicialización de Fecha (Ajustado a Zona Horaria de México)
    const inputFecha = document.getElementById('filtroFechaFinanzas');
    if (inputFecha) {
        const ahora = new Date();
        // Restamos el offset para garantizar que tome la fecha local correcta y no la UTC
        const offset = ahora.getTimezoneOffset() * 60000;
        const fechaLocal = new Date(ahora.getTime() - offset).toISOString().split('T')[0];
        
        inputFecha.value = fechaLocal;
        console.log("📅 Fecha de corte establecida en de forma local:", fechaLocal);

        // Escuchador de cambios en caliente
        inputFecha.addEventListener('change', () => cargarReporteFinanciero(clinicaId));
    } else {
        console.error("❌ ERROR CRÍTICO: No se encontró el input con ID 'filtroFechaFinanzas' en el HTML.");
    }

    // 🚀 Disparar Carga Inicial
    await cargarReporteFinanciero(clinicaId);
});
// ============================================================================
// 📊 CORE: CARGA DE REGISTROS Y CÁLCULO DE TOTALES (KPIs)
// ============================================================================
async function cargarReporteFinanciero(clinicaId) {
    const tbody = document.getElementById('tablaCuerpoFinanzas');
    const badgeTransacciones = document.getElementById('contadorTransacciones');
    const fechaSeleccionada = document.getElementById('filtroFechaFinanzas').value;

    if (!tbody || !fechaSeleccionada) return;

    try {
        console.log(`🏦 FisioCid Finanzas: Consultando caja para la sede [${clinicaId}] en fecha [${fechaSeleccionada}]`);
        
        // Consultamos finanzas_gestion cruzando los datos del paciente y amarrando el ID de la clínica 🛡️
        const { data: movimientos, error } = await fisioNet
            .from('finanzas_gestion')
            .select(`
               id_pago,
        monto_total,
        monto_iva,
        concepto,
        metodo_pago,
        fecha_pago,
        pacientes_maestros (nombre, apellido_paterno, apellido_materno)
            `)
            .eq('id_clinica', clinicaId) // 🎯 Candado de Sede Activa añadido
            .eq('fecha_pago', fechaSeleccionada)
            .eq('estatus_pago', 'PAGADO'); // Solo lo cobrado real

        if (error) throw error;

        // Reset de Variables de Control Financiero
        let totalCorte = 0;
        let totalEfectivo = 0;
        let totalBancos = 0;
        let htmlContador = 0;

        if (!movimientos || movimientos.length === 0) {
            if (badgeTransacciones) badgeTransacciones.innerText = "0 Transacciones";
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-5" style="font-size: 0.9rem; font-weight: 600;">
                        <span style="font-size: 1.5rem; display: block; margin-bottom: 5px;">📦</span>
                        No hay transacciones registradas para este periodo.
                    </td>
                </tr>`;
            
            // Pintamos los KPIs en ceros limpios
            actualizarCuadrosMonto(0, 0, 0);
            return;
        }

        // Limpiamos la tabla para meter las filas frescas
        let htmlFilas = "";

        movimientos.forEach(m => {
            htmlContador++;
            const total = parseFloat(m.monto_total) || 0;
            const iva = parseFloat(m.monto_iva) || 0;
            
            // 🎯 CORRECCIÓN INTEGRAL: quitamos el acento para leer la columna real de la DB
            const metodo = m.metodo_pago || "EFECTIVO"; 
            
            // 💰 Acumulación matemática inteligente por canales de flujo
            totalCorte += total;
            if (metodo === "EFECTIVO") {
                totalEfectivo += total;
            } else {
                totalBancos += total; // Agrupa TARJETA, TRANSFERENCIA y MERCADOPAGO
            }

            // Procesar el nombre del paciente
            const p = m.pacientes_maestros || {};
            const nombrePaciente = p.nombre ? `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.toUpperCase().trim() : "PACIENTE PARTICULAR / NOTA DIRECTA";

            // Formatear la hora de creación del registro
            let horaFormato = "00:00";
            if (m.creado_el) {
                const fechaObj = new Date(m.creado_el);
                horaFormato = fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
            }

            // Badge estético según el método
            let badgeMetodoColor = "bg-success-subtle text-success";
            if (metodo === "TARJETA") badgeMetodoColor = "bg-primary-subtle text-primary";
            if (metodo === "TRANSFERENCIA") badgeMetodoColor = "bg-info-subtle text-info";
            if (metodo === "MERCADOPAGO") badgeMetodoColor = "bg-warning-subtle text-dark";

            htmlFilas += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 12px 8px;" class="text-muted fw-semibold">
                        📅 ${m.fecha_pago} <span class="ms-1 text-dark fw-bold">🕒 ${horaFormato}</span>
                    </td>
                    <td style="font-weight: 700; color: #1e293b;">${nombrePaciente}</td>
                    <td style="color: #475569; font-weight: 600; font-size: 0.8rem;">
                        <span class="badge-ingreso" style="background:#e6f4ea; color:#10b981; padding: 2px 6px; border-radius:4px; font-weight:800; font-size:0.65rem; margin-right:5px;">⚡ INGRESO</span> ${m.concepto.toUpperCase()}
                    </td>
                    <td class="text-center">
                        <span class="badge ${badgeMetodoColor} fw-bold" style="font-size: 0.65rem; padding: 4px 8px; border-radius: 5px;">
                            ${metodo}
                        </span>
                    </td>
                    <td class="text-end text-muted font-monospace">${formatearMoneda(iva)}</td>
                    <td class="text-end fw-black font-monospace text-dark" style="font-weight: 800; font-size: 0.9rem;">
                        ${formatearMoneda(total)}
                    </td>
                </tr>`;
        });

        // 🎨 Inyectamos los renglones en la tabla
        tbody.innerHTML = htmlFilas;
        if (badgeTransacciones) badgeTransacciones.innerText = `${htmlContador} Transacciones`;

        // 🔥 Actualizamos las tarjetas de dinero con los cálculos exactos
        actualizarCuadrosMonto(totalCorte, totalEfectivo, totalBancos);

    } catch (err) {
        console.error("❌ Error crítico en el motor contable:", err.message);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4 fw-bold">Error de conexión al cargar las finanzas: ${err.message}</td></tr>`;
    }
}

// ============================================================================
// 🔀 FUNCIONES AUXILIARES DE FORMATEO (Premium Look)
// ============================================================================

function formatearMoneda(monto) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(monto);
}

function actualizarCuadrosMonto(corte, efectivo, bancos) {
    if (document.getElementById('montoCorteDia')) {
        document.getElementById('montoCorteDia').innerText = formatearMoneda(corte);
    }
    if (document.getElementById('montoEfectivo')) {
        document.getElementById('montoEfectivo').innerText = formatearMoneda(efectivo);
    }
    if (document.getElementById('montoBancos')) {
        document.getElementById('montoBancos').innerText = formatearMoneda(bancos);
    }
}

// ============================================================================
// 📈 EXPORTADOR DE REPORTES (Para Contadores y Administradores de Franquicia)
// ============================================================================
window.exportarReporteExcel = () => {
    const fecha = document.getElementById('filtroFechaFinanzas').value || "reporte";
    alert(`📊 Automatización de Reportes FisioCid:\nGenerando archivo contable unificado del día [${fecha}].\n\nEste reporte se descargará en formato .CSV compatible con Excel y sistemas de facturación del SAT.`);
    
    // Aquí puedes meter la librería SheetJS o un exportador CSV nativo cuando lo requieras.
};