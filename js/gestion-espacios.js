document.addEventListener('DOMContentLoaded', async () => {
    await cargarEspaciosHospital();
});

// Mapeo limpio de etiquetas para mostrar texto legible
const CATEGORIAS_LIMPIAS = {
    'CAMA': '🛏️ Cama de Piso',
    'CAMILLA': '🏥 Camilla / Box',
    'CONSULTORIO': '🩺 Consultorio',
    'URGENCIAS': '🚨 Urgencias',
    'QUIROFANO': '😷 Quirófano',
    'GABINETE': '📡 Gabinete / Estudio'
};

// 1. Cargar el catálogo
async function cargarEspaciosHospital() {
    const clinicaId = localStorage.getItem('id_clinica_activa');
    const contenedor = document.getElementById('contenedorListaEspacios');
    if (!contenedor || !clinicaId) return;

    try {
        const { data: espacios, error } = await fisioNet
            .from('boxes_clinica')
            .select('*')
            .eq('id_clinica', clinicaId)
            .order('nombre_box', { ascending: true });

        if (error) throw error;

        if (!espacios || espacios.length === 0) {
            contenedor.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 40px; background: #f8fafc; border-radius: 12px; border: 2px dashed #cbd5e1;">
                <p>No hay áreas o camas registradas aún. Agrega la primera desde el formulario.</p>
            </div>`;
            return;
        }

        contenedor.innerHTML = espacios.map(esp => {
            const estadoColor = esp.estado === 'OCUPADO' ? '#ef4444' : (esp.estado === 'LIMPIEZA' ? '#f59e0b' : '#10b981');
            const etiquetaLimpia = CATEGORIAS_LIMPIAS[esp.tipo_espacio] || esp.tipo_espacio || 'ESTACIÓN';

            return `
            <div class="espacio-card">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <span class="badge-tipo">${etiquetaLimpia}</span>
                    <button onclick="eliminarEspacio('${esp.id}')" style="background: none; border: none; color: #ef4444; cursor: pointer;" title="Eliminar">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                <h4 style="margin: 0 0 6px 0; color: #1e293b; font-size: 1rem;">${esp.nombre_box.toUpperCase()}</h4>
                <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #64748b;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${estadoColor};"></span>
                    <strong>Estatus:</strong> ${esp.estado || 'LIBRE'}
                </div>
                ${esp.notas_seguimiento ? `<p style="margin: 10px 0 0 0; font-size: 0.75rem; color: #64748b; background: #f8fafc; padding: 6px; border-radius: 6px;">${esp.notas_seguimiento}</p>` : ''}
            </div>`;
        }).join('');

    } catch (err) {
        console.error("❌ Error al cargar espacios:", err);
    }
}

// 2. Insertar con Protección Antiduplicados (Disable Button)
document.getElementById('formNuevoEspacio')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btnGuardar = e.target.querySelector('button[type="submit"]');
    const clinicaId = localStorage.getItem('id_clinica_activa');
    
    // Obtenemos el Área y el Identificador de la Cama
    const area = document.getElementById('pisoAreaSelect').value;
    const camaIdentificador = document.getElementById('numeroCamaInput').value.trim().toUpperCase();
    
    // Concatenamos para armar el nombre_box final
    const nombreCompleto = `${area} - ${camaIdentificador}`;
    
    const tipo = document.getElementById('tipoEspacioSelect').value;
    const notas = document.getElementById('notasInput').value.trim();

    if (!clinicaId) {
        alert("⚠️ No se detectó sede activa.");
        return;
    }

    // Bloqueo de botón para prevenir duplicados
    btnGuardar.disabled = true;
    btnGuardar.style.opacity = '0.6';
    btnGuardar.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Guardando...`;

    try {
        const { data: { user } } = await fisioNet.auth.getUser();

        const { error } = await fisioNet
            .from('boxes_clinica')
            .insert([{
                id_clinica: clinicaId,
                nombre_box: nombreCompleto, // Se guarda concatenado: "PISO 1 - CAMA 1"
                tipo_espacio: tipo,
                notas_seguimiento: notas || null,
                estado: 'LIBRE',
                creado_por: user?.id || null
            }]);

        if (error) throw error;

        document.getElementById('numeroCamaInput').value = '';
        document.getElementById('notasInput').value = '';
        await cargarEspaciosHospital();

    } catch (err) {
        console.error("❌ Error al guardar:", err);
        alert("No se pudo guardar el espacio: " + err.message);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.style.opacity = '1';
        btnGuardar.innerHTML = `<i class="fas fa-plus-circle"></i> Guardar Espacio`;
    }
});

// 3. Eliminar Espacio
window.eliminarEspacio = async (idEspacio) => {
    if (confirm("¿Deseas eliminar este espacio/estación de la clínica?")) {
        try {
            const { error } = await fisioNet
                .from('boxes_clinica')
                .delete()
                .eq('id', idEspacio);

            if (error) throw error;
            await cargarEspaciosHospital();
        } catch (err) {
            console.error("❌ Error al eliminar:", err);
            alert("No se pudo eliminar: " + err.message);
        }
    }
};