// Usamos fisioNet que es tu instancia configurada
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar datos iniciales
    const clinicaActual = localStorage.getItem('nombre_clinica') || 'MI CLÍNICA';
    const labelClinica = document.getElementById('nombreClinicaEmisora');
    if (labelClinica) labelClinica.innerText = clinicaActual.toUpperCase();

    // Inyectar color camaleónico
    const colorClinica = localStorage.getItem('clinica_color') || '#2563eb';
    document.documentElement.style.setProperty('--primary', colorClinica);

    // Cargar la tabla de estados al iniciar
    cargarInvitaciones();

    const form = document.getElementById('formInvitar');
    if (form) {
        form.addEventListener('submit', manejarEnvioInvitacion);
    }
});

let metodoActual = 'email'; // Estado global del método

// Función para cambiar visualmente entre Email y WhatsApp
function cambiarMetodo(tipo) {
    metodoActual = tipo;
    const input = document.getElementById('datoContacto');
    const label = document.getElementById('labelContacto');
    const tabEmail = document.getElementById('tabEmail');
    const tabWA = document.getElementById('tabWA');

    if (tipo === 'whatsapp') {
        input.type = 'tel';
        input.placeholder = 'NÚMERO A 10 DÍGITOS';
        label.innerText = 'NÚMERO DE WHATSAPP';
        tabWA.style.background = 'var(--primary)'; tabWA.style.color = 'white';
        tabEmail.style.background = 'transparent'; tabEmail.style.color = '#64748b';
    } else {
        input.type = 'email';
        input.placeholder = 'doctor@ejemplo.com';
        label.innerText = 'CORREO ELECTRÓNICO';
        tabEmail.style.background = 'var(--primary)'; tabEmail.style.color = 'white';
        tabWA.style.background = 'transparent'; tabWA.style.color = '#64748b';
    }
}

// Función principal de envío
async function manejarEnvioInvitacion(e) {
    e.preventDefault();
    
    const btn = document.getElementById('btnAccionInvitar');
    const nombre = document.getElementById('nombreInvitado').value.toUpperCase();
    const contacto = document.getElementById('datoContacto').value.toLowerCase();
    const rol = document.getElementById('rolAsignado').value;
    const clinica = localStorage.getItem('nombre_clinica') || 'FISIOCID';

    btn.disabled = true;
    btn.innerText = "PROCESANDO...";

    try {
        // 1. Obtener el Admin actual
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) throw new Error("Debes iniciar sesión de nuevo.");

        // 2. Guardar en Supabase (Bitácora)
        const { data, error } = await fisioNet
            .from('invitaciones_clinicas')
            .insert([{
                id_admin_invita: user.id,
                nombre_clinica: clinica,
                nombre_profesional: nombre,
                correo_institucional: contacto, // Aquí guardamos el mail o el cel
                metodo_invitacion: metodoActual,
                rol_asignado: rol,
                estado: 'PENDIENTE'
            }])
            .select();

        if (error) throw error;

        // 3. Si es WhatsApp, abrir el Link Mágico
        if (metodoActual === 'whatsapp') {
            const mensaje = `¡Hola ${nombre}! El Lft. Cristian Cid te invita a unirte al equipo de ${clinica} en FisioCid. Regístrate aquí para comenzar: https://fisiocid.app/registro?invite=${data[0].id}`;
            const urlWA = `https://wa.me/52${contacto.replace(/\s+/g, '')}?text=${encodeURIComponent(mensaje)}`;
            window.open(urlWA, '_blank');
        }

        alert(`✅ Invitación registrada para ${nombre}`);
        document.getElementById('formInvitar').reset();
        cargarInvitaciones(); // Refrescar la tabla

    } catch (err) {
        console.error("Error:", err);
        alert("Error: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "ENVIAR INVITACIÓN 📩";
    }
}

// Función para llenar la tabla de estados
async function cargarInvitaciones() {
    const tabla = document.getElementById('tablaEstadosInvitaciones');
    if (!tabla) return;

    const { data, error } = await fisioNet
        .from('invitaciones_clinicas')
        .select('*')
        .order('creado_en', { ascending: false });

    if (error) {
        console.error("Error cargando invitaciones:", error);
        return;
    }

    tabla.innerHTML = data.map(inv => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px;">
                <div style="font-weight: bold;">${inv.nombre_profesional}</div>
                <div style="font-size: 0.7rem; color: #64748b;">${inv.correo_institucional}</div>
            </td>
            <td style="padding: 12px;">${inv.metodo_invitacion === 'whatsapp' ? '📱 WA' : '📧 Correo'}</td>
            <td style="padding: 12px; text-align: center;">
                <span class="status-badge ${inv.estado === 'PENDIENTE' ? 'status-pendiente' : 'status-aceptada'}">
                    ${inv.estado}
                </span>
            </td>
            <td style="padding: 12px; text-align: right;">
                ${inv.estado === 'PENDIENTE' ? `<button onclick="cancelarInvitacion('${inv.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size: 0.7rem;">🗑️ CANCELAR</button>` : '---'}
            </td>
        </tr>
    `).join('');
}

// Función para cancelar (borrar) invitación
async function cancelarInvitacion(id) {
    if (!confirm("¿Deseas cancelar esta invitación?")) return;
    
    const { error } = await fisioNet
        .from('invitaciones_clinicas')
        .delete()
        .eq('id', id);

    if (error) alert("Error al borrar");
    else cargarInvitaciones();
}