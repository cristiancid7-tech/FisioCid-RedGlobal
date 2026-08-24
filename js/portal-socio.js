async function inicializarPortalSocio() {
    const { data: { user } } = await fisioNet.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    // 1. Traemos TODOS los perfiles donde yo sea el emisor
    const { data: empresas, error } = await fisioNet
        .from('red_colaboracion')
        .select('*')
        .eq('id_doctor_emisor', user.id);

    if (error || !empresas || empresas.length === 0) {
        alert("No tienes empresas o convenios vinculados.");
        return;
    }

    // 2. Por ahora, para que el portal cargue, tomamos la primera de la lista
    // Pero ya no marca error aunque haya 20
    const socio = empresas[0]; 

    // Si quieres, en el futuro podemos poner un "Select" para que elijas 
    // qué empresa quieres administrar en ese momento.

    renderizarInterfazSocio(socio);
}

function renderizarInterfazSocio(socio) {
    // Aquí va todo el código que ya tienes para llenar las tarjetas
    document.getElementById('socioNombre').innerText = socio.nombre_entidad;
    // ... resto del código ...
    
    // Y al final llamamos a la tabla de referidos
    cargarTablaReferidos(socio.id);
}

// --- CARGAR TABLA DE REFERIDOS ---
async function cargarTablaReferidos(idSocio) {
    const tbody = document.getElementById('tablaReferidos');
    
    const { data: citas, error } = await fisioNet
        .from('agenda_maestra')
        .select(`
            fecha, 
            estatus, 
            pacientes_maestros (nombre, apellido_paterno)
        `)
        .eq('id_convenio_aplicado', idSocio)
        .order('fecha', { ascending: false });

    if (error) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error al cargar datos.</td></tr>';
        return;
    }

    if (!citas || citas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Aún no hay pacientes referidos.</td></tr>';
        return;
    }

    tbody.innerHTML = citas.map(c => `
        <tr>
            <td class="fw-bold">${c.pacientes_maestros?.nombre || 'N/A'} ${c.pacientes_maestros?.apellido_paterno || ''}</td>
            <td>${new Date(c.fecha + "T00:00:00").toLocaleDateString('es-MX', {day:'numeric', month:'short', year:'numeric'})}</td>
            <td>
                <span class="badge ${c.estatus === 'ATENDIDO' ? 'bg-success-subtle text-success' : 'bg-info-subtle text-info'} border">
                    ${c.estatus}
                </span>
            </td>
            <td class="text-center text-success fw-bold">+10 Pts</td>
        </tr>
    `).join('');
}

// --- FUNCIONALIDAD DE COPIAR ---
function copiarLink() {
    const copyText = document.getElementById("linkReferido");
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(copyText.value);
    
    // Feedback visual
    const btn = document.querySelector('.btn-warning');
    const originalIcon = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copiado';
    setTimeout(() => { btn.innerHTML = originalIcon; }, 2000);
}
async function solicitarCambioPass() {
    const nuevaPass = prompt("INGRESA TU NUEVA CONTRASEÑA (Mínimo 6 caracteres):");
    if (nuevaPass && nuevaPass.length >= 6) {
        const { error } = await fisioNet.auth.updateUser({ password: nuevaPass });
        if (error) {
            alert("Error al actualizar: " + error.message);
        } else {
            alert("¡Contraseña actualizada con éxito! 🔐");
        }
    } else {
        alert("La contraseña es muy corta o se canceló el proceso.");
    }
}


// Inicializar al cargar
document.addEventListener('DOMContentLoaded', inicializarPortalSocio);