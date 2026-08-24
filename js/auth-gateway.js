document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar sesión
    const { data: { user } } = await fisioNet.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    // 2. Cargar Nombre del Perfil
    const { data: perfil } = await fisioNet
        .from('perfiles_profesionales')
        .select('nombre_completo, rol')
        .eq('id', user.id)
        .maybeSingle(); 
    
    if (perfil && document.getElementById('nombreUsuario')) {
        document.getElementById('nombreUsuario').innerText = perfil.nombre_completo;
    }

    // 3. Buscar Clínicas (Colaboraciones + Propias)
    const { data: colab } = await fisioNet
        .from('colaboradores_clinica')
        .select('id_clinica, cargo_clinico, clinicas(id, nombre_clinica, logo_url, color_institucional)')
        .eq('id_profesional', user.id)
        .eq('estado', 'ACTIVO');

    const { data: propias } = await fisioNet
        .from('clinicas')
        .select('*')
        .eq('id_dueno', user.id);

    let listaFinal = [];

    if (propias) {
        propias.forEach(c => {
            listaFinal.push({ id_clinica: c.id, cargo_clinico: 'DUEÑO', clinicas: c });
        });
    }

    if (colab) {
        colab.forEach(item => {
            if (!listaFinal.find(f => f.id_clinica === item.id_clinica)) {
                listaFinal.push(item);
            }
        });
    }

    // 🚀 4. DECIDIR RUTA AUTOMÁTICA
    if (listaFinal.length === 0) {
        alert("No tienes clínicas asociadas. Crea una o contacta a tu administrador.");
        window.location.href = 'configuracion.html'; // Ajusta según tu página de creación
        return;
    }

    // 🔥 SI SOLO TIENE UNA: ENTRAR DIRECTO
    if (listaFinal.length === 1) {
        console.log("Detectada sede única, preparando entrada...");
        // IMPORTANTE: Le pasamos el objeto completo de la clínica para no tener que volver a consultar la BD
        guardarYEntrar(listaFinal[0].clinicas);
        return;
    }

    // 5. SI TIENE VARIAS: DIBUJAR TARJETAS
    const contenedor = document.getElementById('listaClinicas');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    listaFinal.forEach(item => {
        const c = item.clinicas;
        if (!c) return;
        const card = `
            <div class="col-md-4 card p-4 shadow-sm card-clinica text-center m-2" 
                 onclick="seleccionarSedeManual('${c.id}')" 
                 style="cursor:pointer; border-top: 4px solid ${c.color_institucional || '#10b981'}">
                <img src="${c.logo_url || 'img/default-clinic.png'}" style="height: 80px; object-fit: contain;">
                <h4 class="mt-3 text-uppercase" style="font-size: 1.1rem;">${c.nombre_clinica}</h4>
                <span class="badge bg-success text-uppercase" style="font-size: 0.7rem;">${item.cargo_clinico}</span>
            </div>
        `;
        contenedor.innerHTML += card;
    });
});

function guardarYEntrar(clinica) {
    if (!clinica) return;
    
    // Estandarización total de llaves en la memoria local
    localStorage.setItem('usuarioId', fisioNet.auth.user()?.id || ''); // Asegura el ID
    localStorage.setItem('id_clinica_activa', clinica.id);
    localStorage.setItem('clinica_activa_id', clinica.id);
    localStorage.setItem('nombre_clinica', clinica.nombre_clinica);
    localStorage.setItem('clinica_color', clinica.color_institucional || '#10b981'); // 👈 Antes 'fisiocid_color'
    localStorage.setItem('clinica_logo', clinica.logo_url || 'img/default-clinic.png');  // 👈 Antes 'fisiocid_logo'
    
    console.log("✅ Contexto establecido para:", clinica.nombre_clinica);
    window.location.replace('dashboard.html'); 
}

// 🚀 FUNCIÓN PARA CLIC MANUAL
async function seleccionarSedeManual(idClinica) {
    const { data: clinica } = await fisioNet.from('clinicas').select('*').eq('id', idClinica).maybeSingle();
    guardarYEntrar(clinica);
}