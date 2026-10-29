// Variable local para almacenar inventario completo
let inventarioLocal = [];
let filtroActual = 'TODOS';

// 1. Cargar Inventario / Farmacia
const cargarInventario = async () => {
    const lista = document.getElementById('listaInventario');
    const clinicaId = localStorage.getItem('id_clinica_activa');

    const { data, error } = await fisioNet
        .from('inventario_insumos')
        .select('*')
        .eq('id_clinica', clinicaId)
        .order('nombre_insumo', { ascending: true });

    if (error) {
        console.error("Error al leer inventario:", error.message);
        return;
    }

    inventarioLocal = data || [];
    renderizarTabla();
};

// Renderizar tabla según filtro seleccionado
function renderizarTabla() {
    const lista = document.getElementById('listaInventario');
    lista.innerHTML = '';

    const filtrados = inventarioLocal.filter(item => {
        if (filtroActual === 'INSUMO') return item.tipo_registro === 'INSUMO' || !item.tipo_registro;
        if (filtroActual === 'FARMACIA') return item.tipo_registro === 'FARMACIA';
        return true;
    });

    if (filtrados.length === 0) {
        lista.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">No hay registros en esta sección.</td></tr>`;
        return;
    }

    filtrados.forEach(item => {
        const alerta = item.cantidad_actual <= item.stock_minimo ? 'bajo-stock' : '';
        const esFarmacia = item.tipo_registro === 'FARMACIA';
        const badgeTipo = esFarmacia 
            ? '<span style="background:#e0e7ff; color:#3730a3; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:0.7em;">💊 FARMACIA</span>'
            : '<span style="background:#f1f5f9; color:#475569; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:0.7em;">📦 INSUMO</span>';

        const precioVentaTxt = esFarmacia && item.precio_venta 
            ? `<br><small style="color:#059669; font-weight:bold;">P. Venta: $${parseFloat(item.precio_venta).toFixed(2)}</small>` 
            : '';

        lista.innerHTML += `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:6px;">
                        ${badgeTipo}
                        <strong style="color: #2c3e50;">${item.nombre_insumo.toUpperCase()}</strong>
                    </div>
                    <small style="color: #7f8c8d; font-size: 0.75em;">Lote: ${item.numero_lote || 'SIN LOTE'}</small>
                    ${precioVentaTxt}
                </td>
                <td>
                    <span style="font-size: 0.8em; background: #f8fafc; padding: 2px 6px; border-radius: 4px; color: #334155; border: 1px solid #cbd5e1;">
                        ${item.categoria || 'GENERAL'}
                    </span>
                    ${item.requiere_receta ? '<br><small style="color:#dc2626; font-weight:bold; font-size:0.7em;">📋 Req. Receta</small>' : ''}
                </td>
                <td class="${alerta}" style="text-align: center;">
                    <span style="font-size: 1.1em; font-weight: bold;">${item.cantidad_actual}</span>
                    <small style="color: #666;">${item.unidad_medida || 'unid.'}</small>
                </td>
                <td style="text-align: center; color: #94a3b8;">${item.stock_minimo}</td>
                <td>
                    <div style="display: flex; gap: 5px; justify-content: center;">
                        <button onclick="cambiarStock('${item.id}', ${item.cantidad_actual + 1})" title="Agregar Stock" style="background:#10b981; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:bold;">+</button>
                        <button onclick="cambiarStock('${item.id}', ${item.cantidad_actual - 1})" title="Restar Stock" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:bold;">-</button>
                        <button onclick="verResumenInversion('${item.id}')" title="Ver resumen financiero y lote" style="background: #64748b; color: white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer;">👁️</button>
                    </div>
                </td>
            </tr>`;
    });
}

// Filtrar por pestañas
window.filtrarSeccion = (tipo) => {
    filtroActual = tipo;
    document.querySelectorAll('.tab-filtro').forEach(btn => btn.classList.remove('activa'));
    document.getElementById(`tab-${tipo.toLowerCase()}`).classList.add('activa');
    renderizarTabla();
};

// 2. Abrir y Cerrar Modal
document.getElementById('btnNuevoInsumo').onclick = () => {
    document.getElementById('modalInsumo').style.display = 'block';
};

// Alternar campos de precio de venta si es Farmacia
window.evaluarTipoRegistro = () => {
    const tipo = document.getElementById('tipoRegistro').value;
    const campoVenta = document.getElementById('contenedorPrecioVenta');
    const campoReceta = document.getElementById('contenedorReceta');

    if (tipo === 'FARMACIA') {
        campoVenta.style.display = 'block';
        campoReceta.style.display = 'block';
    } else {
        campoVenta.style.display = 'none';
        campoReceta.style.display = 'none';
    }
};

// 3. Guardar Insumo / Producto de Farmacia
document.getElementById('btnGuardarInsumo').onclick = async () => {
    const { data: { user } } = await fisioNet.auth.getUser();
    if (!user) return alert("Sesión expirada");

    const tipoRegistro = document.getElementById('tipoRegistro').value;
    const nombre = document.getElementById('nombreInsumo').value;
    const categoria = document.getElementById('categoriaInsumo').value;
    const cantidad = parseInt(document.getElementById('cantidadInsumo').value);
    const minimo = parseInt(document.getElementById('minimoInsumo').value) || 0;
    const unidad = document.getElementById('unidadInsumo').value;
    const lote = document.getElementById('loteInsumo').value;
    const precioCosto = parseFloat(document.getElementById('precioInsumo').value) || 0;
    const precioVenta = parseFloat(document.getElementById('precioVentaInsumo').value) || 0;
    const requiereReceta = document.getElementById('checkReceta').checked;
    const clinicaId = localStorage.getItem('id_clinica_activa');

    if (!nombre || isNaN(cantidad)) {
        return alert("El nombre del producto/insumo y el stock inicial son obligatorios.");
    }

    const { error } = await fisioNet.from('inventario_insumos').insert([
        { 
            nombre_insumo: nombre.toUpperCase(),
            categoria: categoria,
            cantidad_actual: cantidad,
            stock_minimo: minimo,
            unidad_medida: unidad.toUpperCase(),
            numero_lote: lote.toUpperCase(),
            precio_costo: precioCosto,
            precio_venta: tipoRegistro === 'FARMACIA' ? precioVenta : 0,
            tipo_registro: tipoRegistro,
            requiere_receta: tipoRegistro === 'FARMACIA' ? requiereReceta : false,
            id_clinica: clinicaId,
            id_profesional: user.id
        }
    ]);

    if (error) {
        alert("Error de Supabase: " + error.message);
    } else {
        alert("¡Registro guardado con éxito bajo normatividad COFEPRIS!");
        document.getElementById('modalInsumo').style.display = 'none';
        document.getElementById('formModalInsumo').reset();
        evaluarTipoRegistro();
        cargarInventario(); 
    }
};

// 4. Cambiar stock rápido
window.cambiarStock = async (id, nueva) => {
    if (nueva < 0) return;
    await fisioNet.from('inventario_insumos').update({ cantidad_actual: nueva }).eq('id', id);
    cargarInventario();
};

// 5. Modal / Alert de Resumen Financiero
window.verResumenInversion = (id) => {
    const item = inventarioLocal.find(i => i.id === id);
    if (!item) return;

    const totalCosto = (item.precio_costo * item.cantidad_actual).toFixed(2);
    const esFarmacia = item.tipo_registro === 'FARMACIA';
    const totalVenta = esFarmacia ? (item.precio_venta * item.cantidad_actual).toFixed(2) : 'N/A';
    const gananciaEstimada = esFarmacia ? (totalVenta - totalCosto).toFixed(2) : 'N/A';

    alert(`📊 RESUMEN GENERAL: ${item.nombre_insumo}\n` +
          `----------------------------------\n` +
          `🏷️ Tipo: ${item.tipo_registro || 'INSUMO'}\n` +
          `💰 Precio Costo u/u: $${item.precio_costo}\n` +
          (esFarmacia ? `💵 Precio Venta u/u: $${item.precio_venta}\n` : '') +
          `📦 Stock Actual: ${item.cantidad_actual} ${item.unidad_medida}\n` +
          `----------------------------------\n` +
          `📉 Inversión Total Stock: $${totalCosto}\n` +
          (esFarmacia ? `📈 Valor Proyectado Venta: $${totalVenta}\n` +
                        `✨ Ganancia Proyectada: $${gananciaEstimada}\n` : '') +
          `----------------------------------\n` +
          `🏷️ Lote: ${item.numero_lote || 'N/A'}\n` +
          `🛡️ Clasificación: ${item.categoria}`);
};

document.addEventListener('DOMContentLoaded', cargarInventario);