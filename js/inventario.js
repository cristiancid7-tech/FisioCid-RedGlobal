const cargarInventario = async () => {
    const lista = document.getElementById('listaInventario');
    
    // Traemos los datos de Supabase
    const { data, error } = await fisioNet.from('inventario_insumos').select('*').order('nombre_insumo', { ascending: true });

    if (error) {
        console.error("Error al leer:", error.message);
        return;
    }

    lista.innerHTML = '';

    data.forEach(item => {
        // Lógica de alerta visual para stock bajo
        const alerta = item.cantidad_actual <= item.stock_minimo ? 'bajo-stock' : '';
        
        lista.innerHTML += `
            <tr>
                <td>
                    <strong style="color: #2c3e50;">${item.nombre_insumo.toUpperCase()}</strong><br>
                    <small style="color: #7f8c8d; font-size: 0.75em;">Lote: ${item.numero_lote || 'SIN LOTE'}</small>
                </td>
                <td>
                    <span style="font-size: 0.85em; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #475569; border: 1px solid #e2e8f0;">
                        ${item.categoria || 'GENERAL'}
                    </span>
                </td>
                <td class="${alerta}" style="text-align: center;">
                    <span style="font-size: 1.1em; font-weight: bold;">${item.cantidad_actual}</span> 
                    <small style="color: #666;">${item.unidad_medida || 'unid.'}</small>
                </td>
                <td style="text-align: center; color: #94a3b8;">${item.stock_minimo}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="cambiarStock('${item.id}', ${item.cantidad_actual + 1})" title="Agregar" style="background:#10b981; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">+</button>
                        
                        <button onclick="cambiarStock('${item.id}', ${item.cantidad_actual - 1})" title="Restar" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">-</button>
                        
                        <button onclick=" 
                              const totalInversion = (${item.precio_costo} * ${item.cantidad_actual}).toFixed(2);
    alert('📊 RESUMEN DE INVERSIÓN: ${item.nombre_insumo}\\n' +
          '----------------------------------\\n' +
          '💰 Precio p/u: $${item.precio_costo}\\n' +
          '📦 Stock: ${item.cantidad_actual} ${item.unidad_medida}\\n' +
          '💵 VALOR TOTAL: $' + totalInversion + '\\n' +
          '----------------------------------\\n' +
          '🏷️ Lote: ${item.numero_lote || 'N/A'}\\n' +
          '🛡️ Riesgo: ${item.categoria}');" 
    title="Ver costos y totales" 
    style="background: #64748b; color: white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer;">
    👁️
                        </button>
                    </div>
                </td>
            </tr>`;
    });
};
// 2. Abrir Modal
document.getElementById('btnNuevoInsumo').onclick = () => {
    document.getElementById('modalInsumo').style.display = 'block';
};


document.getElementById('btnGuardarInsumo').onclick = async () => {
    console.log("Iniciando guardado profesional...");

    const { data: { user } } = await fisioNet.auth.getUser();
    if (!user) return alert("Sesión expirada");

    
    const nombre = document.getElementById('nombreInsumo').value;
    const categoria = document.getElementById('categoriaInsumo').value; // <--- ESTA FALTABA
    const cantidad = parseInt(document.getElementById('cantidadInsumo').value);
    const minimo = parseInt(document.getElementById('minimoInsumo').value);
    const unidad = document.getElementById('unidadInsumo').value;
    const lote = document.getElementById('loteInsumo').value; // <--- PARA COFEPRIS
    const precio = parseFloat(document.getElementById('precioInsumo').value) || 0;
    const clinicaId = localStorage.getItem('id_clinica_activa');
    
    if (!nombre || isNaN(cantidad)) {
        return alert("Cristian, el nombre y la cantidad son obligatorios.");
    }

    // Insertar en Supabase
    const { error } = await fisioNet.from('inventario_insumos').insert([
        { 
            nombre_insumo: nombre.toUpperCase(), 
            categoria: categoria, 
            cantidad_actual: cantidad, 
            stock_minimo: minimo,
            unidad_medida: unidad.toUpperCase(),
            numero_lote: lote.toUpperCase(),
            precio_costo: precio,
            id_clinica: clinicaId, 
            id_profesional: user.id 
        }
    ]);

    if (error) {
        alert("Error de Supabase: " + error.message);
    } else {
        alert("¡Insumo registrado con éxito bajo normas COFEPRIS!");
        document.getElementById('modalInsumo').style.display = 'none';
        cargarInventario(); 
    }
};

// 4. Cambiar stock rápido
window.cambiarStock = async (id, nueva) => {
    if (nueva < 0) return;
    await fisioNet.from('inventario_insumos').update({ cantidad_actual: nueva }).eq('id', id);
    cargarInventario();
};

document.addEventListener('DOMContentLoaded', cargarInventario);