const params = new URLSearchParams(window.location.search);
const pacienteId = params.get('id') || localStorage.getItem('paciente_seleccionado_id');
let notasCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    aplicarEstiloCamaleon();
    if (!pacienteId) return;
    await Promise.all([cargarPaciente(), cargarNotas()]);
});

async function aplicarEstiloCamaleon() {
    const color = localStorage.getItem('clinica_color') || '#1e293b';
    document.documentElement.style.setProperty('--primary', color);
    const soft = color === '#000000' ? 'rgba(0,0,0,0.05)' : color + '15';
    document.documentElement.style.setProperty('--bg-banner', soft);
}

async function cargarPaciente() {
    const { data: p } = await fisioNet.from('pacientes_maestros').select('*').eq('id', pacienteId).single();
    
    if (p) {
        // 1. Folio con estilo Integrado (Usamos el color de tu tema)
        // Usamos un fondo sutil y el borde del color de tu marca
        const folioBadge = `<span style="background: #fdf2f2; color: #b38888; border: 1px solid #f1dada; padding: 2px 10px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 0.8rem; font-weight: 800; margin-right: 12px; box-shadow: inset 0 0 5px rgba(0,0,0,0.02);">
            ${p.numero_expediente_sede || 'S/F'}
        </span>`;

        const elementoNombre = document.getElementById('nombre');
        elementoNombre.style.display = "flex";
        elementoNombre.style.alignItems = "center";
        // Eliminamos el borde que pudiera tener por defecto para que luzca limpio
        elementoNombre.style.border = "none"; 
        elementoNombre.innerHTML = `${folioBadge} ${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.toUpperCase();
        
        // 🚀 LÓGICA DE EDAD (Mantenemos la precisión pediátrica)
        let edadTexto = "";
        const hoy = new Date();
        const cumple = new Date(p.fecha_nacimiento + "T00:00:00");
        const diasTotales = Math.floor((hoy - cumple) / (1000 * 60 * 60 * 24));
        
        let años = hoy.getFullYear() - cumple.getFullYear();
        let meses = hoy.getMonth() - cumple.getMonth();
        if (meses < 0 || (meses === 0 && hoy.getDate() < cumple.getDate())) {
            años--;
            meses += 12;
        }

        if (diasTotales <= 31) edadTexto = `${diasTotales} DÍAS (NEONATO)`;
        else if (años < 2) edadTexto = `${(años * 12) + meses} MESES`;
        else edadTexto = `${años} AÑOS`;
        
        // 3. Datos base con tipografía más elegante
        const generoTxt = p.genero === 'HOMBRE' ? 'HOMBRE' : (p.genero === 'MUJER' ? 'MUJER' : 'NO ESPECIFICADO');
        document.getElementById('datosBase').innerText = `${generoTxt} | ${edadTexto} | CURP: ${p.curp || 'N/A'}`;
    }
}
async function cargarNotas() {
    const idClinica = localStorage.getItem('clinica_activa_id') || localStorage.getItem('id_clinica_activa');
    const { data, error } = await fisioNet.from('historial_clinico')
        .select('*').eq('id_paciente', pacienteId).eq('id_clinica', idClinica).order('fecha_nota', { ascending: false });

    if (data) {
        notasCache = data;
        document.getElementById('totalNotas').innerText = data.length;
        if(data.length > 0) {
            document.getElementById('ultimaFecha').innerText = new Date(data[0].fecha_nota).toLocaleDateString();
        }
        renderizarNotas(data);
        cambiarTabEvolucion('fisio'); // Carga la de dolor por defecto
    }
}

function cambiarTabEvolucion(tipo) {
    // 1. Quitar la clase 'active' de todos los badges y resetear bordes
    document.querySelectorAll('.badge-tab').forEach(b => {
        b.classList.remove('active');
        b.style.borderColor = "transparent";
    });

    // 2. Activar el badge correspondiente
    const tabFisio = document.getElementById('tabFisio');
    const tabMed = document.getElementById('tabMed');
    const tabNutri = document.getElementById('tabNutri');

    if (tipo === 'fisio' && tabFisio) {
        tabFisio.classList.add('active');
        tabFisio.style.borderColor = "#ef4444";
    } else if (tipo === 'medica' && tabMed) {
        tabMed.classList.add('active');
        tabMed.style.borderColor = "#3b82f6";
    } else if (tipo === 'nutri' && tabNutri) {
        tabNutri.classList.add('active');
        tabNutri.style.borderColor = "#10b981";
    }

    // 3. Lógica de la Tabla de Evolución
    const contenedor = document.getElementById('tablaEvolucionDinamica');
    if (!notasCache.length) return;

    // Invertimos el orden para ver el progreso desde el inicio (de viejo a nuevo)
    const crono = [...notasCache].reverse();
    
    let html = `<table style="width: 100%; border-collapse: collapse;">
                <thead><tr><th>FECHA</th>`;

    if (tipo === 'fisio') {
        html += `<th>DOLOR (EVA)</th><th>PROGRESO</th></tr></thead><tbody>`;
        let inicial = crono[0].eva;
        crono.forEach(n => {
            const diff = inicial - n.eva;
            const msg = diff > 0 ? `✅ MEJORÓ ${diff} PTS` : (diff < 0 ? `⚠️ SUBIÓ ${Math.abs(diff)} PTS` : 'SIN CAMBIO');
            html += `<tr>
                <td>${new Date(n.fecha_nota).toLocaleDateString()}</td>
                <td style="font-weight:bold; color:${n.eva > 5 ? '#ef4444':'#10b981'}">${n.eva}/10</td>
                <td style="font-size:0.75rem; font-weight:bold;">${msg}</td>
            </tr>`;
        });
    } 
    else if (tipo === 'medica') {
        html += `<th>T.A.</th><th>F.C.</th><th>SpO2</th><th>TEMP</th></tr></thead><tbody>`;
        crono.forEach(n => {
            html += `<tr>
                <td>${new Date(n.fecha_nota).toLocaleDateString()}</td>
                <td>${n.ta_sistolica}/${n.ta_diastolica}</td>
                <td>${n.frecuencia_cardiaca} lpm</td>
                <td>${n.spo2}%</td>
                <td>${n.temperatura}°</td>
            </tr>`;
        });
    } 
    else if (tipo === 'nutri') {
        html += `<th>PESO</th><th>IMC</th><th>DIFERENCIA</th></tr></thead><tbody>`;
        let pesoInicial = crono.find(n => n.peso > 0)?.peso || 0;
        crono.forEach(n => {
            if (n.peso > 0) {
                const diff = (n.peso - pesoInicial).toFixed(1);
                html += `<tr>
                    <td>${new Date(n.fecha_nota).toLocaleDateString()}</td>
                    <td style="font-weight:bold;">${n.peso} kg</td>
                    <td>${n.imc || '--'}</td>
                    <td style="color:${diff <= 0 ? '#10b981':'#ef4444'}">${diff > 0 ? '+'+diff : diff} kg</td>
                </tr>`;
            }
        });
    }

    html += `</tbody></table>`;
    contenedor.innerHTML = html;
}

function renderizarNotas(notas) {
    const feed = document.getElementById('feedEvoluciones');
    feed.innerHTML = '';
    
    if (notas.length === 0) {
        feed.innerHTML = '<p style="text-align:center; padding:2rem; color:#64748b;">No hay notas registradas en este periodo.</p>';
        return;
    }

    notas.forEach(n => {
        const evaColor = n.eva >= 7 ? '#ef4444' : (n.eva >= 4 ? '#f59e0b' : '#10b981');
        const tarjeta = document.createElement('div');
        tarjeta.className = 'card nota-historial';
        tarjeta.style.marginBottom = "20px";
        tarjeta.style.borderTop = `4px solid var(--primary)`;
        tarjeta.style.background = "white";
        tarjeta.style.padding = "20px";
        tarjeta.style.borderRadius = "12px";
        tarjeta.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
        
        tarjeta.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">
                <div>
                    <span style="font-weight:bold; color:var(--primary);">📅 ${new Date(n.fecha_nota).toLocaleDateString()}</span>
                    <span style="background:#f1f5f9; color:#475569; padding:2px 8px; border-radius:4px; font-size:0.7rem; font-weight:bold; margin-left:10px;">${n.especialidad_nota || 'CONSULTA'}</span>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button onclick='descargarIndividual(${JSON.stringify(n)})' style="background:#fff; border:1px solid #ef4444; color:#ef4444; padding:5px 10px; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:bold;">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                    <div style="background: ${evaColor}22; color: ${evaColor}; padding:5px 12px; border-radius:15px; font-weight:bold; font-size:0.8rem;">EVA: ${n.eva}/10</div>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px;">
                <div>
                    <h5 style="margin:0; font-size:0.7rem; color:#94a3b8; text-transform:uppercase;">Evolución y Hallazgos</h5>
                    <p style="margin:5px 0 15px 0; font-size:0.9rem; color:#1e293b;">${n.nota_evolucion || 'Sin registro'}</p>
                    <div style="background:#f0fdf4; border:1px solid #dcfce7; padding:12px; border-radius:8px;">
                        <h5 style="margin:0; font-size:0.7rem; color:#166534; text-transform:uppercase;">Plan de Tratamiento</h5>
                        <p style="margin:5px 0; font-size:0.85rem; color:#14532d;">${n.plan_tratamiento || 'Continuar con indicaciones previas.'}</p>
                    </div>
                </div>
                <div style="background:#f8fafc; padding:15px; border-radius:10px; border:1px solid #e2e8f0;">
                    <h5 style="text-align:center; margin:0 0 10px 0; font-size:0.7rem; color:#64748b; text-transform:uppercase;">Signos de Sesión</h5>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="dato-vitals"><small>T.A.</small><span>${n.ta_sistolica}/${n.ta_diastolica}</span></div>
                        <div class="dato-vitals"><small>F.C.</small><span>${n.frecuencia_cardiaca} <i style="font-size:0.6rem;">lpm</i></span></div>
                        <div class="dato-vitals"><small>TEMP</small><span>${n.temperatura}°C</span></div>
                        <div class="dato-vitals"><small>SpO2</small><span>${n.spo2}%</span></div>
                        <div class="dato-vitals" style="grid-column: span 2;"><small>PESO / IMC</small><span>${n.peso || '--'}kg / ${n.imc || '--'}</span></div>
                    </div>
                </div>
            </div>
        `;
        feed.appendChild(tarjeta);
    });
}

window.descargarIndividual = (n) => { 
    if(typeof generarPDF === 'function') {
        generarPDF(n);
    } else {
        alert("Módulo de PDF no encontrado.");
    }
};

function filtrarHistorial() {
    const desde = document.getElementById('fechaDesde').value;
    const hasta = document.getElementById('fechaHasta').value;
    
    if (!desde && !hasta) {
        renderizarNotas(notasCache);
        cambiarTabEvolucion('fisio');
        return;
    }

    const filtradas = notasCache.filter(n => {
        const f = n.fecha_nota.split('T')[0];
        const cumpleDesde = !desde || f >= desde;
        const cumpleHasta = !hasta || f <= hasta;
        return cumpleDesde && cumpleHasta;
    });
    
    renderizarNotas(filtradas);
   
}