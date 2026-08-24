// --- lista.js ---

async function verificarAcceso() {
    const { data: { session } } = await fisioNet.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return; }

    let nombre = localStorage.getItem('nombreFisio');

    if (!nombre) {
        const { data: perfil } = await fisioNet
            .from('perfiles_profesionales')
            .select('nombre_completo')
            .eq('id', session.user.id)
            .single();

        if (perfil && perfil.nombre_completo) {
            nombre = perfil.nombre_completo;
            localStorage.setItem('nombreFisio', nombre);
        } else {
            nombre = "ESPECIALISTA";
        }
    }
    document.getElementById('saludoFisio').innerText = `HOLA, ${nombre.toUpperCase()}`;
}

async function obtenerPacientes(terminoBusqueda = "") {
    const idClinicaActiva = localStorage.getItem('clinica_activa_id') || localStorage.getItem('id_clinica_activa');

    console.log("🔍 [DEBUG] Iniciando obtenerPacientes...");
    console.log("🏢 Clínica Activa ID:", idClinicaActiva);
    console.log("⌨️ Texto ingresado por el usuario:", `"${terminoBusqueda}"`);

    if (!idClinicaActiva) {
        console.warn("⚠️ No se encontró ID de clínica activa");
        return [];
    }

    let consulta = fisioNet
        .from('pacientes_maestros')
        .select('*')
        .eq('id_clinica', idClinicaActiva);

    if (terminoBusqueda && terminoBusqueda.trim() !== "") {
        const t = terminoBusqueda.trim();
        console.log("🎯 Filtrando por:", t);
  
        // Prueba esta versión de la consulta que es más "agresiva" buscando:
consulta = consulta.or(`nombre.ilike.%${t}%,apellido_paterno.ilike.%${t}%,numero_expediente_sede.ilike.%${t}%`);
   }

    const { data: pacientes, error } = await consulta
        .order('nombre', { ascending: true });

    if (error) {
        console.error("❌ Error en Supabase:", error.message);
        return [];
    }

    // LOG CLAVE: ¿Qué nos devolvió la base de datos?
    console.log("📊 Datos recibidos de Supabase:", pacientes);
    
    if (pacientes.length === 0) {
        console.log("❓ La consulta no devolvió nada. Verifica si el folio existe EXACTAMENTE así en Supabase.");
    }

    return pacientes;
}

function dibujarTabla(lista) {
    const tabla = document.getElementById('tablaPacientes');
    if (!tabla) return;
    tabla.innerHTML = '';

    if (lista.length === 0) {
        tabla.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">No se encontraron pacientes.</td></tr>';
        return;
    }

    lista.forEach(p => {
        const nombreCompleto = p.nombre_completo || `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`;
        const idPaciente = p.id;
        
        // 🚀 CÁLCULO DE EDAD DINÁMICA
        let edadTexto = "---";
        if (p.fecha_nacimiento) {
            const hoy = new Date();
            const cumple = new Date(p.fecha_nacimiento + "T00:00:00");
            let edad = hoy.getFullYear() - cumple.getFullYear();
            const m = hoy.getMonth() - cumple.getMonth();
            if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) { edad--; }

            if (edad < 2) {
                const meses = (hoy.getFullYear() - cumple.getFullYear()) * 12 + (hoy.getMonth() - cumple.getMonth());
                edadTexto = meses <= 0 ? "REC. NAC." : `${meses} MESES`;
            } else {
                edadTexto = `${edad} AÑOS`;
            }
        }

        // 🛡️ VERIFICACIÓN DE EXPEDIENTE COMPLETO
        const esRegistroCompleto = p.curp && p.curp.length === 18 && !p.curp.includes('??');

        const fila = document.createElement('tr');
        let contenidoBotones = "";

        if (esRegistroCompleto) {
            // 🎨 DISEÑO COMPACTO DE BOTONES (Iconos para ahorrar espacio)
            contenidoBotones = `
                <button onclick="verFichaContacto('${idPaciente}')" title="Ficha de Contacto"
                    style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 6px 10px; font-size: 0.9rem; border-radius: 6px; cursor: pointer;">
                    📇 CONTACTO
                </button>
                <button onclick="verHistorial('${idPaciente}')" title="Ver Historia Clínica"
                    style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 0.9rem; border-radius: 6px; cursor: pointer;">
                    👁️ HISTORIAL
                </button>
                <button onclick="location.href='historia-clinica.html?id=${idPaciente}'" title="Nueva Nota"
                    style="background: var(--primary); color: white; border: none; padding: 6px 10px; font-size: 0.9rem; border-radius: 6px; cursor: pointer;">
                    📝 + NOTA
                </button>
            `;
        } else {
            contenidoBotones = `
                <button onclick="location.href='nuevo-paciente.html?id=${idPaciente}'"
                        style="background: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 6px 15px; font-size: 0.7rem; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%;">
                    ⚠️ COMPLETAR REGISTRO
                </button>
            `;
        }

        fila.innerHTML = `
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                <div style="font-size: 0.75rem; font-weight: 800; color: var(--primary); font-family: monospace; margin-bottom: 2px;">
                    ${p.numero_expediente_sede || 'S/F'}
                </div>
                <div style="font-weight: bold; color: #1e293b; font-size: 0.9rem;">${nombreCompleto.toUpperCase()}</div>
                <div style="font-size: 0.65rem; color: #94a3b8;">${p.curp || 'FALTA CURP'}</div>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
                <span style="background: #f8fafc; color: #475569; padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: bold; border: 1px solid #e2e8f0;">
                    ${edadTexto}
                </span>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
                <div style="display: flex; gap: 6px; justify-content: flex-end;">
                    ${contenidoBotones}
                </div>
            </td>
        `;
        tabla.appendChild(fila);
    });
}
window.verHistorial = (id) => {
    window.location.href = `historial-evolucion.html?id=${id}`;
};

document.addEventListener('DOMContentLoaded', async () => {
    await verificarAcceso();
    let todosLosPacientes = await obtenerPacientes();
    dibujarTabla(todosLosPacientes);

    const inputBusqueda = document.getElementById('buscador');
    // --- DENTRO DEL DOMContentLoaded ---

if (inputBusqueda) {
    inputBusqueda.addEventListener('input', (e) => {
        const termino = e.target.value.toUpperCase();
        
        const filtrados = todosLosPacientes.filter(p => {
            const nom = (p.nombre_completo || `${p.nombre} ${p.apellido_paterno}`).toUpperCase();
            const curp = (p.curp || '').toUpperCase();
            
            // 🎯 LA CLAVE: Agregar la búsqueda por numero_expediente_sede
            const folio = (p.numero_expediente_sede || '').toUpperCase();
            
            return nom.includes(termino) || curp.includes(termino) || folio.includes(termino);
        });
        
        dibujarTabla(filtrados);
    });
}

    const btnSalir = document.getElementById('btnSalir');
    if (btnSalir) {
        btnSalir.addEventListener('click', async () => {
            await fisioNet.auth.signOut();
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }
});

async function cargarNotas() {
    const idClinica = localStorage.getItem('clinica_activa_id') || localStorage.getItem('id_clinica_activa');
    
    const { data, error } = await fisioNet
        .from('historial_clinico')
        .select('*')
        .eq('id_paciente', pacienteId)
        .eq('id_clinica', idClinica) // 🛡️ Filtro de seguridad
        .order('fecha_nota', { ascending: false });

    if (data) {
        notasCache = data;
        document.getElementById('totalNotas').innerText = data.length;
        if(data.length > 0) document.getElementById('ultimaFecha').innerText = new Date(data[0].fecha_nota).toLocaleDateString();
        renderizar(data);
    }
}

// ==========================================
// 📡 PUENTE AL PORTAL DE GABINETE
// ==========================================
window.saltarAlGabinete = (curp, nombre, genero, fechaNac) => {
    const url = new URL('portal-gabinete.html', window.location.origin);
    
    // Empacamos los datos
    url.searchParams.set('curp', curp !== 'null' && curp ? curp : 'SIN-CURP');
    url.searchParams.set('nombre', nombre);
    url.searchParams.set('genero', genero !== 'null' && genero ? genero : 'NO ESPECIFICADO');

    // Calculamos la edad fija
    let edadFija = 0;
    if (fechaNac && fechaNac !== 'null') {
        const hoy = new Date();
        const cumple = new Date(fechaNac);
        edadFija = hoy.getFullYear() - cumple.getFullYear();
        if (hoy.getMonth() < cumple.getMonth() || (hoy.getMonth() === cumple.getMonth() && hoy.getDate() < cumple.getDate())) {
            edadFija--;
        }
    }
    url.searchParams.set('edad', edadFija);

    // ¡Salto al portal!
    window.location.href = url.toString();
};

async function verFichaContacto(idPaciente) {
    const { data: p, error } = await fisioNet
        .from('pacientes_maestros')
        .select('*')
        .eq('id', idPaciente)
        .single();

    if (error) return;

    const esMenor = p.es_menor_edad;
    const nombreContacto = esMenor ? p.nombre_tutor : `${p.nombre} ${p.apellido_paterno}`;
    const telPrincipal = esMenor ? p.telefono_tutor : p.telefono;
    const etiquetaPrincipal = esMenor ? "RESPONSABLE LEGAL" : "PACIENTE";
    
    // Colores dinámicos
    const colorBadge = esMenor ? '#ef4444' : '#22c55e'; // Rojo si es menor, Verde si es adulto
    const textoBadge = esMenor ? 'PACIENTE MENOR' : 'PACIENTE ADULTO';

    // HTML con estilos 100% incrustados (no necesita Bootstrap)
    const contenidoHTML = `
        <div style="text-align: left; font-family: system-ui, -apple-system, sans-serif;">
            
            <div style="text-align: center; margin-bottom: 20px;">
                <h5 style="margin: 0; font-weight: 800; font-size: 1.3rem; color: #1e293b; text-transform: uppercase;">
                    ${p.nombre} ${p.apellido_paterno}
                </h5>
                <span style="background-color: ${colorBadge}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: bold; display: inline-block; margin-top: 8px; letter-spacing: 0.5px;">
                    ${textoBadge}
                </span>
            </div>

            <div style="background-color: #f8fafc; border-left: 5px solid #0ea5e9; padding: 15px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <p style="font-size: 0.75rem; color: #64748b; font-weight: bold; margin: 0 0 5px 0;">${etiquetaPrincipal}</p>
                <h6 style="font-weight: 800; font-size: 1rem; margin: 0 0 15px 0; color: #0f172a; text-transform: uppercase;">${nombreContacto}</h6>
                
                <a href="tel:${telPrincipal}" style="display: block; width: 100%; text-align: center; background-color: #0ea5e9; color: white; text-decoration: none; padding: 10px; border-radius: 6px; margin-bottom: 10px; font-weight: bold; font-size: 0.9rem; transition: 0.2s;">
                    📞 Llamar: ${telPrincipal}
                </a>
                <a href="https://wa.me/52${telPrincipal}" target="_blank" style="display: block; width: 100%; text-align: center; background-color: #25d366; color: white; text-decoration: none; padding: 10px; border-radius: 6px; font-weight: bold; font-size: 0.9rem; transition: 0.2s;">
                    💬 Enviar WhatsApp
                </a>
            </div>

            <div style="background-color: #fff5f5; border-left: 5px solid #ef4444; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <p style="font-size: 0.75rem; color: #ef4444; font-weight: bold; margin: 0 0 5px 0;">CONTACTO DE EMERGENCIA</p>
                <h6 style="font-weight: 800; font-size: 1rem; margin: 0 0 5px 0; color: #7f1d1d; text-transform: uppercase;">${p.contacto_emergencia_nombre || 'No registrado'}</h6>
                <p style="font-size: 0.85rem; color: #64748b; margin: 0 0 10px 0; font-weight: 500;">Parentesco: ${p.contacto_emergencia_parentesco || 'N/A'}</p>
                <a href="tel:${p.contacto_emergencia_tel}" style="color: #ef4444; text-decoration: none; font-weight: 800; font-size: 1.1rem; display: block; text-align: center; background: #fee2e2; padding: 8px; border-radius: 6px;">
                    🚨 Llamar: ${p.contacto_emergencia_tel || 'S/N'}
                </a>
            </div>
            
        </div>
    `;

    Swal.fire({
        html: contenidoHTML,
        showConfirmButton: false,
        showCloseButton: true,
        width: '400px',
        padding: '1.5em',
        background: '#ffffff'
    });
}