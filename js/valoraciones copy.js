// UBICACIÓN: Inicio de valoraciones.js
window.PeriodontoFisioCid = {
    brushColor: '#f8fafc', // Color por defecto (Blanco/Sano)
tipoHallazgo: 'sano',
inicializar: function() {
        console.log("🦷 FisioCid: Sistema inicializado correctamente.");
        this.mapaFurcas = {}; // Limpia datos de sesión previa
        this.actualizarResumenVisual();
    },

renderizarArcada: function(idContenedor, listaDientes) {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor || !listaDientes) return;
    
    contenedor.innerHTML = ""; 
    contenedor.style = "display: flex; justify-content: center; gap: 6px; flex-wrap: nowrap; margin-bottom: 10px; padding: 5px;";

    listaDientes.forEach(num => {
        const div = document.createElement('div');
        div.className = "diente-wrapper";
        div.style = "text-align: center; transition: all 0.3s;";
        
        const esTemporal = num >= 51 && num <= 85; 
        
        let svgHtml = "";
        if (esTemporal) {
            // 🍩 DISEÑO CIRCULAR (RESTAURADO)
            svgHtml = `
                <svg viewBox="0 0 40 40" width="32" height="32" class="diente-svg" data-diente="${num}" style="overflow: visible;">
                    <path d="M20,20 L2,10 A20,20 0 0,1 38,10 Z" class="cara-diente" fill="#f8fafc" stroke="#334155" stroke-width="1.2" data-cara="V" onclick="window.PeriodontoFisioCid.aplicarColor(this)"/>
                    <path d="M20,20 L38,10 A20,20 0 0,1 38,30 Z" class="cara-diente" fill="#f8fafc" stroke="#334155" stroke-width="1.2" data-cara="D" onclick="window.PeriodontoFisioCid.aplicarColor(this)"/>
                    <path d="M20,20 L38,30 A20,20 0 0,1 2,30 Z" class="cara-diente" fill="#f8fafc" stroke="#334155" stroke-width="1.2" data-cara="L" onclick="window.PeriodontoFisioCid.aplicarColor(this)"/>
                    <path d="M20,20 L2,30 A20,20 0 0,1 2,10 Z" class="cara-diente" fill="#f8fafc" stroke="#334155" stroke-width="1.2" data-cara="M" onclick="window.PeriodontoFisioCid.aplicarColor(this)"/>
                    <circle cx="20" cy="20" r="8" class="cara-diente" fill="#f8fafc" stroke="#334155" stroke-width="1.2" data-cara="O" onclick="window.PeriodontoFisioCid.aplicarColor(this)"/>
                </svg>`;
        } else {
            // 💎 DISEÑO DIAMANTE (ADULTOS)
            svgHtml = `
                <svg viewBox="0 0 40 40" width="35" height="35" class="diente-svg" data-diente="${num}" style="overflow: visible;">
                    <path d="M0,0 L40,0 L30,10 L10,10 Z" class="cara-diente" fill="#f8fafc" stroke="#334155" stroke-width="1.2" data-cara="V" onclick="window.PeriodontoFisioCid.aplicarColor(this)"/>
                    <path d="M40,0 L40,40 L30,30 L30,10 Z" class="cara-diente" fill="#f8fafc" stroke="#334155" stroke-width="1.2" data-cara="D" onclick="window.PeriodontoFisioCid.aplicarColor(this)"/>
                    <path d="M40,40 L0,40 L10,30 L30,30 Z" class="cara-diente" fill="#f8fafc" stroke="#334155" stroke-width="1.2" data-cara="L" onclick="window.PeriodontoFisioCid.aplicarColor(this)"/>
                    <path d="M0,40 L0,0 L10,10 L10,30 Z" class="cara-diente" fill="#f8fafc" stroke="#334155" stroke-width="1.2" data-cara="M" onclick="window.PeriodontoFisioCid.aplicarColor(this)"/>
                    <rect x="10" y="10" width="20" height="20" class="cara-diente" fill="#f8fafc" stroke="#334155" stroke-width="1.2" data-cara="O" onclick="window.PeriodontoFisioCid.aplicarColor(this)"/>
                </svg>`;
        }

     div.innerHTML = `
    <button class="btn-diente-fisiocid" onclick="window.PeriodontoFisioCid.abrirExamenFurca(${num})">
        ${num}
    </button>
    ${svgHtml}
`;
 contenedor.appendChild(div);
    });
},



toggleArcada: function(input) {
    const modoAdulto = input.checked; 

    // 1. Contenedores de Dientes
    const divsAdulto = [document.getElementById('arcada-superior'), document.getElementById('arcada-inferior')];
    const divsNiño = [document.getElementById('temporales-superior'), document.getElementById('temporales-inferior')];

    // 2. Títulos de Texto
    const txtAdulto = document.querySelectorAll('.txt-permanente');
    const txtNiño = document.querySelectorAll('.txt-temporal');

    if (modoAdulto) {
        // MOSTRAR ADULTO / OCULTAR NIÑO
        divsAdulto.forEach(el => { if(el) el.style.setProperty('display', 'flex', 'important'); });
        txtAdulto.forEach(el => { if(el) el.style.display = 'block'; });

        divsNiño.forEach(el => { if(el) el.style.setProperty('display', 'none', 'important'); });
        txtNiño.forEach(el => { if(el) el.style.display = 'none'; });
    } else {
        // OCULTAR ADULTO / MOSTRAR NIÑO
        divsAdulto.forEach(el => { if(el) el.style.setProperty('display', 'none', 'important'); });
        txtAdulto.forEach(el => { if(el) el.style.display = 'none'; });

        divsNiño.forEach(el => { if(el) el.style.setProperty('display', 'flex', 'important'); });
        txtNiño.forEach(el => { if(el) el.style.display = 'block'; });
    }

    this.actualizarResumenVisual();
},

    // Cambia el color del pincel y da feedback visual
 setBrush: function(color, elemento, tipo = 'normal') { // 🚩 Agregamos '= "normal"'
    this.brushColor = color;
        this.tipoHallazgo = tipo;
        document.querySelectorAll('.paleta-color').forEach(btn => {
            btn.style.border = "2px solid transparent";
            btn.style.transform = "scale(1)";
        });
        if(elemento) {
            elemento.style.border = "2px solid gold";
            elemento.style.transform = "scale(1.2)";
        }
    },

// UBICACIÓN: valoraciones.js -> PeriodontoFisioCid
aplicarColor: function(el) {
    const svgDiente = el.closest('svg');
    const colorSel = this.brushColor;
    const tipo = this.tipoHallazgo; // 🚩 Leemos la intención
    
    // 1. Lógica de Colores y Placa (O'Leary)
    if (tipo === 'placa' || colorSel === '#f472b6' || colorSel === '#a855f7') {
        const rgbaColor = colorSel === '#f472b6' 
            ? 'rgba(244, 114, 182, 0.6)' 
            : 'rgba(168, 85, 247, 0.6)';
        el.setAttribute('fill', rgbaColor);
        el.setAttribute('data-tiene-placa', 'true');
    } else {
        el.setAttribute('fill', colorSel);
        el.removeAttribute('data-tiene-placa');
    }

    // 2. Gestión de Marcas Especiales (X y /)
    const marcaPrevia = svgDiente.querySelector('.marca-especial');
    if (marcaPrevia) marcaPrevia.remove();

    // 🚩 SOLUCIÓN AL ERROR: Solo tacha si la intención es EXTRAER
   if (tipo === 'extraer') { 
        const tache = document.createElementNS("http://www.w3.org/2000/svg", "path");
        tache.setAttribute("d", "M5,5 L35,40 M35,5 L5,40"); // Crea la X
        tache.setAttribute("stroke", "white"); // Blanco para que resalte
        tache.setAttribute("stroke-width", "3");
        tache.setAttribute("class", "marca-especial");
        tache.setAttribute("style", "pointer-events: none;");
        svgDiente.appendChild(tache);
    }
   else if (colorSel === '#94a3b8') { 
        const diagonal = document.createElementNS("http://www.w3.org/2000/svg", "path");
        diagonal.setAttribute("d", "M35,5 L5,40");
        diagonal.setAttribute("stroke", "#000000");
        diagonal.setAttribute("stroke-width", "3");
        diagonal.setAttribute("class", "marca-especial");
        diagonal.setAttribute("style", "pointer-events: none;");
        svgDiente.appendChild(diagonal);
    }

    this.actualizarResumenVisual();
},
obtenerAnalisisOleary: function() {
        const caras = document.querySelectorAll('.cara-diente');
        const conPlaca = Array.from(caras).filter(c => c.hasAttribute('data-tiene-placa')).length;
        if (caras.length === 0) return {color:'white', g:'Sin datos'};
        const porc = ((conPlaca / caras.length) * 100).toFixed(1);
        let col = porc < 20 ? "#22c55e" : (porc < 50 ? "#eab308" : "#ef4444");
        return { color: col, g: `O'Leary: ${porc}%` };
    },
    
actualizarResumenVisual: function() {
    const resumenEl = document.getElementById('texto-resumen-dinamico');
    if (!resumenEl) return;

    // --- PARTE A: O'Leary y Caries (Lo que ya tienes) ---
    const caras = document.querySelectorAll('.cara-diente');
    const conPlaca = Array.from(caras).filter(c => c.hasAttribute('data-tiene-placa')).length;
    const totalCaras = caras.length || 1;
    const porcentajePlaca = ((conPlaca / totalCaras) * 100).toFixed(1);
    let colorRiesgo = porcentajePlaca < 20 ? "#22c55e" : (porcentajePlaca < 50 ? "#eab308" : "#ef4444");
    let nivelHigiene = porcentajePlaca < 20 ? "EXCELENTE" : (porcentajePlaca < 50 ? "REGULAR" : "DEFICIENTE");
    const cariesCount = Array.from(document.querySelectorAll('.cara-diente')).filter(c => c.getAttribute('fill') === "#ef4444").length;
    const cirugias = document.querySelectorAll('.marca-especial[stroke="white"]').length;

    let html = `
        <div style="background: rgba(30, 41, 59, 0.5); padding: 10px; border-radius: 8px; border-left: 4px solid ${colorRiesgo};">
            <h6 style="color: ${colorRiesgo}; margin: 0; font-size: 0.8rem; font-weight: 800;">📉 HIGIENE: ${nivelHigiene} (${porcentajePlaca}%)</h6>
        </div>

        <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div style="background: #0f172a; padding: 5px; border-radius: 4px; border: 1px solid #334155;">
                <span style="color: #94a3b8; font-size: 0.6rem; display: block;">CARIES</span>
                <span style="color: #ef4444; font-weight: bold; font-size:0.7rem;">${cariesCount} piezas</span>
            </div>
            <div style="background: #0f172a; padding: 5px; border-radius: 4px; border: 1px solid #334155;">
                <span style="color: #94a3b8; font-size: 0.6rem; display: block;">EXTRACCIONES</span>
                <span style="color: #f8fafc; font-weight: bold; font-size:0.7rem;">${cirugias} piezas</span>
            </div>
        </div>
        <div style="margin-top:10px; border-top: 1px solid #334155; padding-top:10px;">
    `;

    // --- PARTE B: Integrar Escalas (Mallampati, Kennedy, Furca) ---
    // Recorremos el objeto hallazgosEscalas que llenamos desde FisioCidEngine
    for (const [nombre, texto] of Object.entries(this.hallazgosEscalas)) {
        html += `
            <div style="margin-bottom: 5px; padding-left: 8px; border-left: 2px solid #d4af37;">
                <span style="display:block; font-size: 0.55rem; color: #94a3b8; font-weight: 800;">${nombre.toUpperCase()}</span>
                <span style="font-size: 0.7rem; color: #f8fafc;">${texto}</span>
            </div>
        `;
    }

    html += `</div>`;
    resumenEl.innerHTML = html;
},
// Función para saber el cuadrante según el primer dígito
obtenerCuadrante: function(numeroDiente) {
    const primerDigito = Math.floor(numeroDiente / 10);
    const mapa = {
        1: "Cuadrante 1 (Superior Derecho)",
        2: "Cuadrante 2 (Superior Izquierdo)",
        3: "Cuadrante 3 (Inferior Izquierdo)",
        4: "Cuadrante 4 (Inferior Derecho)",
        5: "C. 5 (Infantil)", 6: "C. 6 (Infantil)",
        7: "C. 7 (Infantil)", 8: "C. 8 (Infantil)"
    };
    return mapa[primerDigito] || "Desconocido";
},

// 1. El doctor toca un diente (ej. 16) y selecciona "FURCA" en el menú
seleccionarHallazgoFurca: function(dienteId, opcionElegida) {
    
    // 🚩 AQUÍ LLAMAMOS A TU OBJETO FURCA
    // 'opcionElegida' es el índice (0, 1 o 2) que picó en el modal
    const resultado = this.FURCA.interpretar(opcionElegida, dienteId);

    // 2. 'resultado.notaClinica' ya trae el texto "masticado":
    // "C1 (S.D.), Diente 16: Furca Grado 2"
    
    // 3. GUARDADO AUTOMÁTICO: Lo metemos al mapa de la nota del paciente
    if (!this.mapaHallazgos) this.mapaHallazgos = {};
    this.mapaHallazgos[dienteId] = resultado.notaClinica;

    // 4. ESCUPIR AL RESUMEN: Para que el doctor vea que ya se guardó
    console.log("FisioCid Guardado:", resultado.notaClinica);
    
    // Refrescamos la vista para que aparezca el texto en el resumen lateral
    this.actualizarResumenVisual();
},
abrirExamenFurca: function(dienteId) {
        console.log("🦷 FisioCid: Iniciando evaluación de Furca para diente " + dienteId);
        
        // Llamamos al motor de cuestionarios para que lance la escala de FURCA
        // Usamos el ID que ya tienes en tu banco de escalas
        if (window.FisioCidEngine) {
            window.FisioCidEngine.lanzarCuestionario('FURCA', dienteId);
        } else {
            console.error("🚫 No se detectó FisioCidEngine para lanzar el cuestionario");
        }
    },
    hallazgosEscalas: {}, 

actualizarHallazgoGlobal: function(nombreEscala, resultado) {
  
    if (nombreEscala === 'FURCA' && window.FisioCidEngine.dienteActivoEnEscala) {
        const llaveUnica = `FURCA_${window.FisioCidEngine.dienteActivoEnEscala}`;
        this.hallazgosEscalas[llaveUnica] = resultado;
    } else {
        // Para escalas generales como Mallampati, se queda igual
        this.hallazgosEscalas[nombreEscala] = resultado;
    }
    
    this.actualizarResumenVisual();
},

renderizarResumenCompleto: function() {
    const contenedor = document.getElementById('texto-resumen-dinamico');
    if (!contenedor) return;

    let html = "";

    // 1. Recorremos todas las escalas que tengan resultados
    for (const [nombre, texto] of Object.entries(this.hallazgosEscalas)) {
        html += `
            <div style="margin-bottom: 5px; padding-left: 8px; border-left: 2px solid #d4af37;">
                <span style="display:block; font-size: 0.6rem; color: #94a3b8; font-weight: 800;">${nombre.toUpperCase()}</span>
                <span style="font-size: 0.75rem; color: #f8fafc;">${texto}</span>
            </div>
        `;
    }

    // 2. Si no hay nada aún, mostramos el mensaje por defecto
    contenedor.innerHTML = html || "Esperando hallazgos clínicos...";
}
};

window.BANCO_ESCALAS = {

   PERIODONTOGRAMA: {
        nombre: "Exploración Odontológica",
        rama: "odontologia",
        tipo: "especial",
        preguntas: [{ t: "HALLAZGOS", o: ["Visualizar Arcadas"] }],
        interpretar: (p) => ({ p: p, g: "Odontograma actualizado" })
    },



FURCA: {
    nombre: "Grado de Involucración de Furca",
    rama: "odontologia",
    preguntas: [
        {
            t: "Afectación de la zona de raíces (Sonda de Nabers)",
            o: [
                "Grado 1: Inicial (Invasión <3mm)",
                "Grado 2: Parcial (Invasión >3mm)",
                "Grado 3: Total (Atraviesa de lado a lado)"
            ]
        }
    ],
    // 🚩 AQUÍ ESTÁ EL CAMBIO: Ahora recibe 'p' (opción) y 'dienteId'
    interpretar: (p, dienteId) => {
        // 1. Calculamos el cuadrante rápido
        const primerDigito = Math.floor(dienteId / 10);
        const cuadrantes = {
            1: "C1 (S.D.)", 2: "C2 (S.I.)", 3: "C3 (I.I.)", 4: "C4 (I.D.)",
            5: "C5 (Inf.)", 6: "C6 (Inf.)", 7: "C7 (Inf.)", 8: "C8 (Inf.)"
        };
        const cuadranteNombre = cuadrantes[primerDigito] || "C?";

        // 2. Retornamos el objeto con la nota ya redactada ("masticada")
        return {
            p: p,
            g: `Furca Grado ${p + 1}`,
            notaClinica: `${cuadranteNombre}, Diente ${dienteId}: Furca Grado ${p + 1}`
        };
    }
},
ODONTOPEDIATRIA: {
    nombre: "Anexo de Odontopediatría (PediaCid)",
    rama: "odontologia",
    preguntas: [
        {
            t: "Hábitos Orales (Riesgo Maloclusión)",
            o: ["Ninguno", "Succión Digital (Dedo)", "Uso de Chupón prolongado", "Respiración Bucal", "Deglución Atípica"]
        },
        {
            t: "Higiene supervisada por padres",
            o: ["Siempre", "A veces", "Nunca (Lava solo)", "No realiza higiene"]
        },
        {
            t: "Conducta del paciente (Escala de Frankl)",
            o: ["F1: Definitivamente Negativo (Llantos/Gritos)", "F2: Negativo (Reticente)", "F3: Positivo (Acepta con cautela)", "F4: Definitivamente Positivo (Cooperador/Interesado)"]
        },
        {
            t: "Riesgo de Caries (Cariograma)",
            o: ["Bajo", "Medio", "Alto (Múltiples lesiones activas)"]
        }
    ],
    interpretar: function(puntos, respuestas) {
        // respuestas es un array con los textos seleccionados
        return {
            p: puntos,
            g: `EVALUACIÓN PEDIÁTRICA: Conducta ${respuestas[2]}. Hábito detectado: ${respuestas[0]}. Riesgo de caries: ${respuestas[3]}.`
        };
    }
},
// UBICACIÓN: valoraciones.js -> window.BANCO_ESCALAS
GERIATRIA: {
    nombre: "Evaluación Odontogeriátrica (GeroCid)",
    rama: "odontologia",
    preguntas: [
        {
            t: "Estado Protésico Actual",
            o: ["Portador de prótesis funcional", "Prótesis desajustada", "Edéntulo sin prótesis", "Necesita prótesis nueva"]
        },
        {
            t: "Salud de Mucosas (Xerostomía/Boca Seca)",
            o: ["Normal", "Sequedad leve", "Xerostomía severa (Dificultad para hablar/comer)", "Lesiones por prótesis"]
        },
        {
            t: "Capacidad de Autocuidado (Higiene)",
            o: ["Independiente", "Necesita ayuda parcial", "Dependiente total", "No realiza higiene"]
        }
    ],
    interpretar: function(puntos, respuestas) {
        if (!respuestas || respuestas.length < 3) return { p: puntos, g: "Evaluando paciente geriátrico..." };
        
        return {
            p: puntos,
            g: `👴 GERO: Estado ${respuestas[0]}. Mucosas: ${respuestas[1]}. Autocuidado: ${respuestas[2]}.`
        };
    }
},
// AÑADIR A valoraciones.js
CLASIFICACION_KENNEDY: {
    nombre: "Clasificación de Kennedy (Arcadas Edéntulas)",
    rama: "odontologia",
    preguntas: [
        {
            t: "Distribución de los espacios sin dientes",
            o: [
                "Clase I: Áreas desdentadas bilaterales posteriores",
                "Clase II: Área desdentada unilateral posterior",
                "Clase III: Área desdentada unilateral con dientes pilares anterior y posterior",
                "Clase IV: Área desdentada única anterior que cruza la línea media"
            ]
        }
    ],
    interpretar: (p) => ({ p: p, g: `Kennedy Clase ${p + 1}` })
},
    MALLAMPATI: {
        nombre: "Clasificación de Mallampati",
        rama: "odontologia",
        preguntas: [
            {
                t: "Visibilidad de estructuras bucofaríngeas",
                o: [
                    "Clase I: Úvula completa, pilares y paladar blando",
                    "Clase II: Úvula parcial y paladar blando",
                    "Clase III: Solo paladar blando y base de úvula",
                    "Clase IV: Solo paladar duro visible"
                ]
            }
        ],
        interpretar: function(puntos) {
            const niveles = [
                { g: "Clase I: Vía aérea fácil", riesgo: "Bajo" },
                { g: "Clase II: Vía aérea con visibilidad parcial", riesgo: "Medio" },
                { g: "Clase III: Vía aérea difícil", riesgo: "Alto" },
                { g: "Clase IV: Vía aérea muy difícil", riesgo: "Crítico" }
            ];
            const resultado = niveles[puntos] || niveles[0];
            return {
                p: puntos + 1,
                g: resultado.g,
                alerta: `Riesgo: ${resultado.riesgo}`
            };
        }
    },
    // UBICACIÓN: valoraciones.js -> window.BANCO_ESCALAS
CIRUGIA: {
    nombre: "Protocolo de Riesgo Quirúrgico (CxCid)",
    rama: "odontologia",
    preguntas: [
        {
            t: "¿Presenta enfermedades sistémicas controladas?",
            o: ["Ninguna / Sano", "Hipertensión", "Diabetes", "Cardiopatía", "Otras"]
        },
        {
            t: "¿Toma anticoagulantes o aspirina?",
            o: ["No", "Sí (Suspendido bajo orden médica)", "Sí (Activo - Riesgo de Hemorragia)"]
        },
        {
            t: "Complejidad de la extracción",
            o: ["Simple (Erupción total)", "Resto Radicular", "Semi-incluido", "Totalmente Incluido (Cirugía de Terceros)"]
        }
    ],
    interpretar: function(puntos, respuestas) {
        if (!respuestas || respuestas.length < 3) return { p: puntos, g: "Evaluando riesgo Cx..." };
        
        return {
            p: puntos,
            g: `🔪 Cx: Complejidad ${respuestas[2]}. Sistémico: ${respuestas[0]}. Anticoagulantes: ${respuestas[1]}.`
        };
    }
},

    INDICE_OLEARY: {
        nombre: "Índice de Higiene Bucal (O'Leary)",
        rama: "odontologia",
        interpretar: function() {
            // Buscamos todas las caras de los dientes (cuadrados y círculos)
            const todasLasCaras = document.querySelectorAll('.cara-diente');
            
            // Filtramos las que el doctor pintó como Placa Nueva (Rosa) o Vieja (Morado)
            const carasConPlaca = Array.from(todasLasCaras).filter(c => {
                const color = c.getAttribute('fill');
                return color === "#f472b6" || color === "#a855f7"; 
            }).length;

            const total = todasLasCaras.length;
            if (total === 0) return { p: 0, g: "No se detectaron superficies dentales." };

            const porcentaje = ((carasConPlaca / total) * 100).toFixed(1);
            
            // Diagnóstico clínico basado en el porcentaje
            let evaluacion = "Deficiente";
            if (porcentaje <= 12) evaluacion = "Excelente";
            else if (porcentaje <= 23) evaluacion = "Aceptable";

            return { 
                p: porcentaje, 
                g: `Índice de O'Leary: ${porcentaje}% - Higiene ${evaluacion}. (${carasConPlaca} superficies con placa).` 
            };
        }
    },
    // UBICACIÓN: valoraciones.js -> window.BANCO_ESCALAS
ENDODONCIA: {
    nombre: "Evaluación de Endodoncia (Conductometría)",
    rama: "odontologia",
    preguntas: [
        {
            t: "Prueba de Sensibilidad (Térmica/Eléctrica)",
            o: ["Positivo (Normal)", "Hipersensibilidad (Pulpa inflamada)", "Negativo (Necrosis pulpar)", "Dolor persistente tras estímulo"]
        },
        {
            t: "Diagnóstico Pulpar Presuntivo",
            o: ["Pulpa Sana", "Pulpitis Reversible", "Pulpitis Irreversible", "Necrosis Pulpar"]
        },
        {
            t: "Número de Conductos detectados",
            o: ["1 Conducto", "2 Conductos", "3 Conductos", "4 o más Conductos"]
        }
    ],
    interpretar: function(puntos, respuestas) {
        if (!respuestas || respuestas.length < 3) return { p: puntos, g: "Evaluando conductos..." };
        
        return {
            p: puntos,
            g: `🦷 ENDO: Diagnóstico de ${respuestas[1]}. Sensibilidad: ${respuestas[0]}. Conductos: ${respuestas[2]}.`
        };
    }
},

 
    OSWESTRY: {
        nombre: "Índice de Discapacidad de Oswestry",
        rama: "fisioterapia",
        preguntas: [
            { t: "Intensidad del dolor", o: ["Sin dolor", "Dolor muy leve", "Dolor moderado", "Dolor bastante fuerte", "Dolor muy fuerte", "Dolor insoportable"] },
            { t: "Cuidados personales (Aseo, Vestirse)", o: ["Sin ayuda y sin dolor", "Sin ayuda pero con dolor", "Doloroso y lento", "Necesito alguna ayuda", "Ayuda en la mayoría de aspectos", "No puedo vestirme/asearme"] },
            { t: "Levantar peso", o: ["Sin dolor", "Dolor leve al levantar pesos", "El dolor me impide levantar pesos del suelo", "Solo pesos ligeros", "Pesos muy ligeros", "No puedo levantar nada"] },
            { t: "Caminar", o: ["Sin dolor", "El dolor me impide caminar más de 1km", "El dolor me impide caminar más de 500m", "El dolor me impide caminar más de 250m", "Solo camino con bastón o muletas", "Permanezco en cama"] },
            { t: "Estar sentado", o: ["Puedo estar sentado tanto como quiera", "Solo sentado en mi silla favorita", "El dolor me impide estar sentado más de 1h", "El dolor me impide estar sentado más de 30min", "El dolor me impide estar sentado más de 10min", "El dolor me impide estar sentado"] },
            { t: "Estar de pie", o: ["Tanto como quiera sin dolor", "Tanto como quiera pero con dolor", "El dolor me impide estar de pie más de 1h", "El dolor me impide estar de pie más de 30min", "El dolor me impide estar de pie más de 10min", "El dolor me impide estar de pie"] },
            { t: "Dormir", o: ["Duermo bien", "Tomo pastillas para dormir", "Me despierto por el dolor (menos de 2h)", "Me despierto por el dolor (2-5h)", "Me despierto por el dolor (5-8h)", "El dolor me impide dormir"] },
            { t: "Vida sexual", o: ["Normal y sin dolor", "Normal pero con dolor", "Casi normal pero muy dolorosa", "Muy limitada por el dolor", "Casi ausente por el dolor", "El dolor la impide totalmente"] },
            { t: "Vida social", o: ["Normal y sin dolor", "Normal pero con dolor", "El dolor limita actividades más enérgicas", "El dolor limita mi vida social a casa", "El dolor me impide salir", "No tengo vida social"] },
            { t: "Viajar", o: ["Puedo viajar a cualquier sitio sin dolor", "Puedo viajar a cualquier sitio con dolor", "El dolor me impide viajar más de 2h", "El dolor me impide viajar más de 1h", "Solo viajes cortos y necesarios", "El dolor me impide viajar"] }
        ],
        interpretar: function(p) {
            const porcentaje = (p / 50) * 100;
            let g = "Discapacidad Mínima";
            if (porcentaje > 20) g = "Discapacidad Moderada";
            if (porcentaje > 40) g = "Discapacidad Severa";
            if (porcentaje > 60) g = "Incapacidad";
            if (porcentaje > 80) g = "Postrado / Exageración";
            return { p: p, g: `${g} (${porcentaje}%)` };
        }
    },
    // UBICACIÓN: Añadir a window.BANCO_ESCALAS en valoraciones.js

    OREBRO: {
        nombre: "Cuestionario de Örebro (Screening de Dolor Musculoesquelético)",
        rama: "fisioterapia",
        preguntas: [
            { t: "¿Cuánto tiempo ha tenido su dolor actual?", o: ["0-1 semana", "2-3 semanas", "4-5 semanas", "6-8 semanas", "9-11 semanas", "3-6 meses", "6-9 meses", "9-12 meses", "Más de 1 año"] },
            { t: "¿Cómo calificaría su dolor promedio en la última semana? (0=Sin dolor, 10=Máximo)", o: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] },
            { t: "¿Con qué frecuencia ha sentido dolor en los últimos 3 meses?", o: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Casi siempre", "Siempre"] },
            { t: "¿Puede realizar sus actividades normales con el dolor?", o: ["Totalmente capaz", "Mucho", "Moderado", "Un poco", "Nada capaz"] },
            { t: "¿Qué tanto le preocupa que su dolor se vuelva crónico?", o: ["Nada", "Un poco", "Moderadamente", "Mucho", "Extremadamente"] },
            { t: "En su opinión, ¿qué tan probable es que esté trabajando en 6 meses?", o: ["Muy probable", "Probable", "Incierto", "Improbable", "Muy improbable"] },
            { t: "Cuando siente dolor, ¿qué tan fuerte es la urgencia de descansar?", o: ["Nada", "Un poco", "Moderada", "Mucha", "Extrema"] },
            { t: "¿Qué tanto influye su estado de ánimo en el dolor?", o: ["Nada", "Un poco", "Moderadamente", "Mucho", "Totalmente"] },
            { t: "La actividad física empeora mi dolor (Cinesiofobia)", o: ["Totalmente en desacuerdo", "En desacuerdo", "Neutral", "De acuerdo", "Totalmente de acuerdo"] },
            { t: "El dolor es terrible y nunca va a mejorar (Catastrofismo)", o: ["Totalmente en desacuerdo", "En desacuerdo", "Neutral", "De acuerdo", "Totalmente de acuerdo"] }
        ],
        interpretar: function(p) {
            // El puntaje de Örebro corto se suma para detectar riesgo de cronicidad
            let riesgo = "Bajo Riesgo";
            if (p >= 50) riesgo = "Riesgo Moderado de Cronicidad";
            if (p >= 70) riesgo = "Alto Riesgo (Intervención Psicosocial Sugerida)";
            return { p: p, g: `${riesgo} (${p} pts)` };
        }
    },

    // 2. START BACK SCREENING TOOL (Pronóstico)
    START_BACK: {
        nombre: "STarT Back Screening Tool",
        rama: "fisioterapia",
        preguntas: [
            { t: "El dolor se ha extendido a las piernas", o: ["No", "Sí"] },
            { t: "Dolor en hombros o cuello", o: ["No", "Sí"] },
            { t: "Solo camino distancias cortas", o: ["No", "Sí"] },
            { t: "Me visto más despacio", o: ["No", "Sí"] },
            { t: "No es seguro estar activo", o: ["No", "Sí"] },
            { t: "He tenido pensamientos preocupantes", o: ["No", "Sí"] },
            { t: "No disfruto de mis actividades", o: ["No", "Sí"] },
            { t: "El dolor es terrible", o: ["No", "Sí"] },
            { t: "Molestia general por el dolor", o: ["Nada", "Un poco", "Moderado", "Mucho", "Muchísimo"] }
        ],
        interpretar: function(p) {
            // El item 9 se puntúa diferente (0 si es Nada/Un poco, 1 si es Moderado+)
            // Simplificado para el motor:
            let riesgo = p <= 3 ? "Bajo Riesgo" : "Riesgo Medio";
            if (p >= 4) riesgo = "Alto Riesgo (Factores Psicosociales)";
            return { p: p, g: riesgo };
        }
    },

    // 3. ROLAND-MORRIS (Discapacidad a corto plazo)
    ROLAND_MORRIS: {
        nombre: "Cuestionario Roland-Morris",
        rama: "fisioterapia",
        preguntas: [
            { t: "Me quedo en casa por mi espalda", o: ["No", "Sí"] },
            { t: "Cambio de posición para estar cómodo", o: ["No", "Sí"] },
            { t: "Camino más lento", o: ["No", "Sí"] },
            { t: "No hago mis tareas habituales", o: ["No", "Sí"] },
            { t: "Uso el pasamanos para subir escaleras", o: ["No", "Sí"] },
            { t: "Me acuesto para descansar más a menudo", o: ["No", "Sí"] },
            { t: "Necesito apoyo para levantarme del sillón", o: ["No", "Sí"] },
            { t: "Trato de que otros hagan mis cosas", o: ["No", "Sí"] },
            { t: "Me visto despacio", o: ["No", "Sí"] },
            { t: "Solo estoy de pie ratos cortos", o: ["No", "Sí"] },
            { t: "Me cuesta inclinarme o arrodillarme", o: ["No", "Sí"] },
            { t: "Me cuesta levantarme de una silla", o: ["No", "Sí"] },
            { t: "Me duele la espalda casi todo el tiempo", o: ["No", "Sí"] },
            { t: "Me cuesta darme la vuelta en la cama", o: ["No", "Sí"] },
            { t: "Mi apetito no es muy bueno", o: ["No", "Sí"] },
            { t: "Me cuesta ponerme los calcetines", o: ["No", "Sí"] },
            { t: "Solo camino distancias cortas", o: ["No", "Sí"] },
            { t: "Duermo peor que antes", o: ["No", "Sí"] },
            { t: "Me visto con ayuda", o: ["No", "Sí"] },
            { t: "Estoy sentado casi todo el día", o: ["No", "Sí"] },
            { t: "Evito trabajos pesados", o: ["No", "Sí"] },
            { t: "Estoy más irritable", o: ["No", "Sí"] },
            { t: "Subo escaleras más lento", o: ["No", "Sí"] },
            { t: "Me quedo en cama casi todo el día", o: ["No", "Sí"] }
        ],
        interpretar: function(p) {
            let g = p > 13 ? "Discapacidad Severa" : "Discapacidad Leve/Moderada";
            return { p: p, g: `${g} (${p}/24)` };
        }
    }
};

console.log("✅ FisioCid: valoraciones.js cargado correctamente.");