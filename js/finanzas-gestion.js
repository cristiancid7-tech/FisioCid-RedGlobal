async function actualizarDashboardFinanzas() {
    try {
        const { data: movimientos, error } = await fisioNet
            .from('finanzas_gestion')
            .select('monto_total, estatus_pago');

        if (error) throw error;

        let totalIngresos = 0;
        let totalEgresos = 0;

        movimientos.forEach(m => {
            if (m.estatus_pago === 'PAGADO') {
                totalIngresos += m.monto_total;
            } else if (m.estatus_pago === 'EGRESO') {
                totalEgresos += m.monto_total;
            }
        });

        const utilidad = totalIngresos - totalEgresos;

        // Formatear a moneda mexicana
        const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

        document.getElementById('txtIngresos').innerText = formatter.format(totalIngresos);
        document.getElementById('txtEgresos').innerText = formatter.format(totalEgresos);
        document.getElementById('txtUtilidad').innerText = formatter.format(utilidad);

    } catch (err) {
        console.error("Error al calcular finanzas:", err.message);
    }
}
// Función para obtener la "Lista Negra" de FisioCid
async function obtenerDeudores() {
    const { data: deudores } = await fisioNet
        .from('finanzas_gestion')
        .select('*, pacientes_maestros(nombre, apellido_paterno, telefono)')
        .eq('pagado', false);
    
    // Renderizar en una tabla con etiquetas rojas
}
async function listarMovimientosCaja() {
    // Traemos los datos de tu tabla finanzas_gestion
    const { data: movimientos, error } = await fisioNet
        .from('finanzas_gestion')
        .select('*, pacientes_maestros(nombre, apellido_paterno)')
        .order('fecha_pago', { ascending: false });

    const lista = document.getElementById('listaFinanzas');
    lista.innerHTML = movimientos.map(m => `
        <div class="d-flex justify-content-between align-items-center p-3 mb-2 bg-white rounded-4 shadow-sm border-start border-4 ${m.pagado ? 'border-success' : 'border-danger'}">
            <div>
                <h6 class="mb-0 fw-bold">${m.pacientes_maestros?.nombre || 'GASTO'} ${m.pacientes_maestros?.apellido_paterno || ''}</h6>
                <small class="text-muted">${m.concepto} - ${new Date(m.fecha_pago).toLocaleDateString()}</small>
            </div>
            <div class="text-end">
                <div class="fw-bold ${m.pagado ? 'text-success' : 'text-danger'}">$${m.monto_total}</div>
                ${m.pagado ? 
                    `<button class="btn btn-link btn-sm p-0 text-info" onclick="emitirFactura('${m.id_pago}')"><i class="fas fa-file-invoice"></i> Facturar</button>` : 
                    `<span class="badge bg-danger-subtle text-danger">PENDIENTE</span>`}
            </div>
        </div>
    `).join('');
}