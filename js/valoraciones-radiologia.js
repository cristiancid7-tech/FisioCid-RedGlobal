// --- BASE DE DATOS TÉCNICA DE ECOGRAFÍA FISIOCID ---
const protocolosEco = {
    hombro: [
        { id: "plb", t: "BÍCEPS (PLB)", opciones: [
            { e: "NORMAL", d: "Ecoestructura conservada, patrón fibrilar íntegro en surco bicipital." },
            { e: "TENOSINOVITIS", d: "Halo anecóico peritendinoso compatible con proceso inflamatorio/derrame." },
            { e: "TENDINOSIS", d: "Tendón engrosado, hipoecóico, con pérdida del patrón fibrilar." }
        ]},
        { id: "subesc", t: "SUBESCAPULAR", opciones: [
            { e: "NORMAL", d: "Tendón íntegro en eje largo y corto, sin signos de entesopatía." },
            { e: "ROTURA", d: "Solución de continuidad con retracción tendinosa evidente." }
        ]},
        { id: "supra", t: "SUPRAESPINOSO", opciones: [
            { e: "NORMAL", d: "Área de inserción (Footprint) íntegra, convexidad conservada." },
            { e: "CALCIFICACIÓN", d: "Foco hiperecóico intratendinoso con sombra acústica posterior." },
            { e: "ROTURA PARCIAL", d: "Imagen hipoecóica focal que no afecta todo el espesor tendinoso." }
        ]},
        { id: "acromio", t: "ART. ACROMIOCLAVICULAR", opciones: [
            { e: "NORMAL", d: "Distancia articular conservada, sin irregularidades óseas." },
            { e: "ARTROSIS", d: "Geodas subcondrales, osteofitos y distensión capsular." }
        ]}
    ],
    rodilla: [
        { id: "quads", t: "TENDÓN CUADRICIPITAL", opciones: [
            { e: "NORMAL", d: "Patrón trilaminar conservado, inserción patelar íntegra." },
            { e: "TENDINOPATÍA", d: "Engrosamiento con áreas hipoecóicas en polo superior patelar." }
        ]},
        { id: "rotuliano", t: "TENDÓN ROTULIANO", opciones: [
            { e: "NORMAL", d: "Espesor normal, sin neovascularización al Power Doppler." },
            { e: "ENTESOPATÍA", d: "Engrosamiento en inserción tibial (Sinding-Larsen/Osgood)." }
        ]},
        { id: "menisco", t: "MENISCO INTERNO/EXTERNO", opciones: [
            { e: "NORMAL", d: "Morfología triangular hiperecóica, sin extrusión." },
            { e: "PARAMENISCAL", d: "Presencia de quiste parameniscal anecóico tabicado." }
        ]}
    ],
    tobillo: [
        { id: "aquiles", t: "TENDÓN DE AQUILES", opciones: [
            { e: "NORMAL", d: "Estructura fibrilar homogénea, paratendón sin líquido." },
            { e: "XANTOMA/NODULO", d: "Engrosamiento fusiforme con pérdida de patrón fibrilar." },
            { e: "BURSITIS", d: "Distensión de la bursa retrocalcánea con contenido líquido." }
        ]}
    ],
    codo: [
        { id: "epicondilo", t: "TENDÓN CONJUNTO EXTENSOR", opciones: [
            { e: "NORMAL", d: "Inserción en epicóndilo lateral sin irregularidades." },
            { e: "EPICONDILITIS", d: "Hipoecogenicidad y posibles microrroturas (Codo de tenista)." }
        ]}
    ],

    cadera: [
        { id: "capsula", t: "RECESO ANTERIOR (CÁPSULA)", opciones: [
            { e: "NORMAL", d: "Distancia cápsulo-femoral conservada, sin evidencia de derrame articular." },
            { e: "SINOVITIS", d: "Distensión de la cápsula anterior con presencia de material hipoecóico/anecóico." }
        ]},
        { id: "psoas", t: "TENDÓN ILIOPSOAS", opciones: [
            { e: "NORMAL", d: "Ecoestructura fibrilar conservada, bursa iliopectínea sin líquido." },
            { e: "RESALTO", d: "Signos dinámicos de resalto del tendón sobre la eminencia iliopectínea." }
        ]},
        { id: "trocanter", t: "REGIÓN TROCANTÉREA", opciones: [
            { e: "NORMAL", d: "Tendones de glúteo medio y menor íntegros, bursa trocantérea normal." },
            { e: "BURSITIS", d: "Presencia de líquido en la bursa trocantérea (Trocanteritis)." }
        ]}
    ],
    mano_dedos: [
        { id: "poleas", t: "POLEAS FLEXORAS (A1, A2)", opciones: [
            { e: "NORMAL", d: "Poleas de espesor normal, tendón flexor con deslizamiento libre." },
            { e: "GATILLO", d: "Engrosamiento de polea A1 con atrapamiento dinámico del tendón (Dedo en resorte)." }
        ]},
    { id: "art_if", t: "ART. INTERFALÁNGICAS", opciones: [
            { e: "NORMAL", d: "Superficies óseas lisas, placa volar íntegra, sin sinovitis." },
            { e: "ARTRITIS", d: "Proliferación sinovial y erosiones óseas incipientes." }
        ]},
        { id: "extensor", t: "APONEUROSIS EXTENSORA", opciones: [
            { e: "NORMAL", d: "Bandeletas laterales y central sin signos de rotura o luxación." }
        ]}
    ],
    tiroides: [
        { id: "lobulos", t: "LÓBULOS TIROIDEOS", opciones: [
            { e: "NORMAL", d: "Parénquima homogéneo, ecogenicidad normal, sin nódulos evidentes." },
            { e: "BOCIO", d: "Aumento difuso del tamaño glandular con ecoestructura heterogénea." }
        ]},
        { id: "nodulo", t: "PRESENCIA DE NÓDULOS", opciones: [
            { e: "AUSENTE", d: "No se observan imágenes nodulares sólidas ni quísticas." },
            { e: "QUÍSTICO", d: "Imagen anecóica de bordes netos compatible con quiste simple." },
            { e: "SÓLIDO", d: "Nódulo sólido hipoecóico (Se sugiere clasificación TIRADS)." }
        ]},
        { id: "istmo", t: "ISTMO", opciones: [
            { e: "NORMAL", d: "Espesor del istmo dentro de rangos normales (< 3mm)." }
        ]}
    ],
    
    nervios_perifericos: [
        { id: "mediano", t: "NERVIO MEDIANO (MUÑECA)", opciones: [
            { e: "NORMAL", d: "Área de sección transversal normal (<10mm²), sin signos de aplanamiento." },
            { e: "STC", d: "Aumento del área de sección transversal y abombamiento del ligamento transverso (Túnel Carpiano)." }
        ]},
        { id: "cubital", t: "NERVIO CUBITAL (CODO)", opciones: [
            { e: "NORMAL", d: "Situación normal en el túnel cubital, sin cambios de ecogenicidad." },
            { e: "NEUROPATÍA", d: "Engrosamiento e hipoecogenicidad del nervio por atrapamiento/fricción." }
        ]}
    ],
    doppler_color: [
        { id: "vascularizacion", t: "MAPEO POWER DOPPLER", opciones: [
            { e: "GRADO 0", d: "Ausencia de señal Doppler (Sin neovascularización activa)." },
            { e: "GRADO 1-2", d: "Presencia de señales vasculares aisladas (Proceso inflamatorio activo)." },
            { e: "GRADO 3", d: "Hipervascularización marcada (Angiogénesis intratendinosa)." }
        ]}
    ],
    pared_abdominal_fascia: [
        { id: "fascia", t: "SISTEMA FASCIAL / ABDOMINAL", opciones: [
            { e: "NORMAL", d: "Deslizamiento fascial conservado, sin hernias ni diástasis evidentes." },
            { e: "DIASTASIS", d: "Aumento de la distancia inter-rectos (IRD) medida en reposo y esfuerzo." }
        ]}
    ]
};


function sugerirDiagnostico(hallazgos) {
    if (hallazgos.includes("Calcificación") && hallazgos.includes("Sombra acústica")) {
        return "SUGERENCIA CLÍNICA: Tendinopatía Calcificante Crónica.";
    }
    if (hallazgos.includes("Halo anecóico") && hallazgos.includes("Doppler Grado 3")) {
        return "SUGERENCIA CLÍNICA: Fase inflamatoria aguda/sinovitis activa.";
    }
    return "";
}

function abrirProtocoloEco(zona) {
    const lista = protocolosEco[zona];
    const contenedor = document.getElementById('listaProtocoloEco');
    const titulo = document.getElementById('tituloModalEco');
    
    titulo.innerText = `ECOGRAFÍA MSK: ${zona.toUpperCase()}`;
    contenedor.innerHTML = ""; // Limpiar

    lista.forEach(item => {
        let card = document.createElement('div');
        card.className = "card mb-3 border-0 shadow-sm";
        card.innerHTML = `
            <div class="card-body p-2">
                <p class="fw-bold mb-1 small text-primary">${item.t}</p>
                <div class="btn-group w-100" role="group">
                    ${item.opciones.map((opt, i) => `
                        <input type="radio" class="btn-check" name="eco_${item.id}" id="eco_${item.id}_${i}" value="${opt.d}" autocomplete="off">
                        <label class="btn btn-outline-secondary btn-sm" for="eco_${item.id}_${i}">${opt.e}</label>
                    `).join('')}
                </div>
            </div>`;
        contenedor.appendChild(card);
    });
}

function generarReporteRadiologia() {
    let reporte = `\n--- REPORTE DE ECOGRAFÍA MSK (${new Date().toLocaleDateString()}) ---\n`;
    let inputs = document.querySelectorAll('#listaProtocoloEco input[type="radio"]:checked');
    
    if (inputs.length === 0) return alert("Selecciona al menos un hallazgo.");

    inputs.forEach(input => {
        const tituloEstructura = input.closest('.card-body').querySelector('p').innerText;
        reporte += `• ${tituloEstructura}: ${input.value}\n`;
    });

    reporte += "-------------------------------------------\n";
    
    // Pegar en el campo 'exploracion'
    const campo = document.getElementById('exploracion');
    if (campo) {
        campo.value += reporte;
        bootstrap.Modal.getInstance(document.getElementById('modalEcoHombro')).hide();
        alert("✅ Reporte de imagenología insertado.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Esperamos un momento a que Bootstrap cargue
    setTimeout(() => {
        const modalEcoEl = document.getElementById('modalEcoHombro');
        if (modalEcoEl) {
            // Inicialización manual para asegurar que se oculte
            new bootstrap.Modal(modalEcoEl);
            console.log("✅ Sistema Radiológico FisioCid listo.");
        }
    }, 500);
});