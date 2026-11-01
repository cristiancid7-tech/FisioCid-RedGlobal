// ============================================================================
// 🦷 PeriodontoFisioCid.js - Módulo Omnisciente Odontológico y Periodontal
// ============================================================================

const PeriodontoFisioCid = {
    colorPincelActivo: '#f8fafc',
    tipoHallazgoActivo: 'sano',

    // 📌 Almacén de Evaluaciones
    ultimaEvaluacionPedia: null,
    ultimaEvaluacionEndo: null,
    ultimaEvaluacionCx: null,
    ultimaEvaluacionGero: null,
    ultimaEvaluacionViaAerea: null,

    // 🎨 1. SELECCIÓN DE PINCEL
    setBrush: function(colorHex, boton, tipo) {
        this.colorPincelActivo = colorHex;
        this.tipoHallazgoActivo = tipo;

        document.querySelectorAll('.paleta-color').forEach(b => {
            b.style.transform = 'scale(1)';
            b.style.boxShadow = 'none';
        });
        if (boton) {
            boton.style.transform = 'scale(1.08)';
            boton.style.boxShadow = '0 0 10px ' + colorHex;
        }
    },

    // 🔄 2. CONMUTADOR DE DENTICIÓN (Adulto / Niño)
    toggleArcada: function(switchEl) {
        const esAdulto = switchEl.checked;
        const supPerm = document.getElementById('arcada-superior');
        const infPerm = document.getElementById('arcada-inferior');
        const supTemp = document.getElementById('temporales-superior');
        const infTemp = document.getElementById('temporales-inferior');

        if (supPerm && infPerm && supTemp && infTemp) {
            supPerm.style.setProperty('display', esAdulto ? 'flex' : 'none', 'important');
            infPerm.style.setProperty('display', esAdulto ? 'flex' : 'none', 'important');
            supTemp.style.setProperty('display', esAdulto ? 'none' : 'flex', 'important');
            infTemp.style.setProperty('display', esAdulto ? 'none' : 'flex', 'important');
        }
    },

    // 🏗️ 3. CONSTRUCTOR OMNISCIENTE DE LA INTERFAZ
    renderizarModuloCompleto: function(idContenedor = 'contenedor-odontograma-modulo') {
        const contenedor = document.getElementById(idContenedor);
        if (!contenedor) return;

        // Inyección dinámica de toda la UI (Controles + Lienzo + Resumen)
        contenedor.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="fw-bold mb-0" style="color: #38bdf8;">🦷 ODONTOGRAMA INTERACTIVO Y PERIODONCIA</h6>
                <div class="form-check form-switch me-2">
                    <input class="form-check-input" type="checkbox" id="chkModoDenticion" checked onchange="window.PeriodontoFisioCid.toggleArcada(this)">
                    <label class="form-check-label small text-slate-300" for="chkModoDenticion">Dentición Permanente (Adulto)</label>
                </div>
            </div>

            <!-- Paleta de Colores / Herramientas -->
            <div class="d-flex flex-wrap gap-2 mb-3 p-2 rounded" style="background: rgba(255,255,255,0.05);">
                <button type="button" class="btn btn-sm paleta-color btn-outline-light" onclick="window.PeriodontoFisioCid.setBrush('#f8fafc', this, 'sano')">⚪ Sano</button>
                <button type="button" class="btn btn-sm paleta-color btn-danger" onclick="window.PeriodontoFisioCid.setBrush('#ef4444', this, 'caries')">🔴 Caries</button>
                <button type="button" class="btn btn-sm paleta-color btn-primary" onclick="window.PeriodontoFisioCid.setBrush('#3b82f6', this, 'obturado')">🔵 Obturado</button>
                <button type="button" class="btn btn-sm paleta-color" style="background: #f472b6; color: white;" onclick="window.PeriodontoFisioCid.setBrush('#f472b6', this, 'placa')">🌸 Placa (O'Leary)</button>
                <button type="button" class="btn btn-sm paleta-color btn-dark border-secondary" onclick="window.PeriodontoFisioCid.setBrush('#000000', this, 'extraer')">❌ Ausente / Extraer</button>
                <button type="button" class="btn btn-sm paleta-color btn-warning" onclick="window.PeriodontoFisioCid.setBrush('#eab308', this, 'corona')">👑 Corona / Sellador</button>
            </div>

            <!-- Lienzos de Arcadas -->
            <div id="arcada-superior" class="arcada-container mb-2"></div>
            <div id="temporales-superior" class="arcada-container mb-2" style="display:none !important;"></div>
            <div id="arcada-inferior" class="arcada-container mb-2"></div>
            <div id="temporales-inferior" class="arcada-container mb-2" style="display:none !important;"></div>

            <!-- Resumen de Hallazgos -->
            <div id="texto-resumen-dinamico" class="mt-2"></div>
        `;

        // Una vez inyectado el esqueleto, dibujamos las piezas anatómicas
        this.iniciarArcadas();
    },

    // 🚀 4. INICIALIZACIÓN DE PIEZAS ANATÓMICAS
    iniciarArcadas: function() {
        const sup = document.getElementById('arcada-superior');
        const inf = document.getElementById('arcada-inferior');
        const tempSup = document.getElementById('temporales-superior');
        const tempInf = document.getElementById('temporales-inferior');

        if (!sup || !inf) return;

        // Renderizado de piezas permanentes (Adultos)
        this.renderizarArcada('arcada-superior', [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]);
        this.renderizarArcada('arcada-inferior', [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]);

        // Renderizado de piezas temporales (Niños)
        if (tempSup) this.renderizarArcada('temporales-superior', [55, 54, 53, 52, 51, 61, 62, 63, 64, 65]);
        if (tempInf) this.renderizarArcada('temporales-inferior', [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]);
    },

    // 🎨 5. GENERADOR ANATÓMICO DE SVG (Raíz + 5 Caras)
   // 🎨 RENDERIZADO ANATÓMICO DENTAL (Raíces + Matriz de 5 Caras)
renderizarArcada: function(contenedorId, listaPiezas) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    contenedor.innerHTML = '';
    contenedor.style.display = 'flex';
    contenedor.style.justifyContent = 'center';
    contenedor.style.flexWrap = 'wrap';
    contenedor.style.gap = '6px';

    listaPiezas.forEach(num => {
        const esMolar = [18,17,16,26,27,28,48,47,46,36,37,38,55,54,64,65,85,84,74,75].includes(num);
        const esPremolar = [15,14,24,25,45,44,34,35].includes(num);
        
        // Determinar orientación (Superiores hacia arriba, Inferiores invertidos)
        const esSuperior = num < 30 || (num >= 50 && num <= 65);
        
        // Trazos SVG anatómicos para raíces (Incisivo, Premolar, Molar)
        let pathRaiz = `<path d="M10,2 Q10,20 8,42 Q15,48 22,42 Q20,20 20,2 Z" fill="none" stroke="#94a3b8" stroke-width="1.5"/>`;
        if (esMolar) {
            pathRaiz = `<path d="M4,5 Q4,20 7,30 Q5,46 9,46 Q13,32 15,22 Q17,32 19,46 Q23,46 21,30 Q24,20 24,5 Z" fill="none" stroke="#94a3b8" stroke-width="1.5"/>`;
        } else if (esPremolar) {
            pathRaiz = `<path d="M6,5 Q6,20 9,38 Q14,44 18,38 Q22,20 22,5 Z" fill="none" stroke="#94a3b8" stroke-width="1.5"/>`;
        }

        const htmlPieza = `
            <div class="tarjeta-pieza-dental" data-diente="${num}" style="display:flex; flex-direction:column; align-items:center; width:46px; background:rgba(255,255,255,0.03); padding:4px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
                <span style="font-size:0.7rem; font-weight:bold; color:#38bdf8; margin-bottom:2px;">${num}</span>
                
                <!-- Silueta Anatómica de la Raíz -->
                <svg width="26" height="42" viewBox="0 0 28 50" style="${esSuperior ? '' : 'transform: rotate(180deg);'}; margin-bottom:4px;">
                    ${pathRaiz}
                </svg>

                <!-- Matriz de 5 Caras (Cruz Dental) -->
                <svg width="34" height="34" viewBox="0 0 40 40" style="cursor:pointer;">
                    <!-- Vestibular (V) -->
                    <polygon points="0,0 40,0 30,10 10,10" fill="#f8fafc" stroke="#475569" stroke-width="1" class="cara-diente" data-diente="${num}" data-cara="V" onclick="PeriodontoFisioCid.clicCara(this)"/>
                    <!-- Lingual / Palatina (L) -->
                    <polygon points="10,30 30,30 40,40 0,40" fill="#f8fafc" stroke="#475569" stroke-width="1" class="cara-diente" data-diente="${num}" data-cara="L" onclick="PeriodontoFisioCid.clicCara(this)"/>
                    <!-- Mesial (M) -->
                    <polygon points="0,0 10,10 10,30 0,40" fill="#f8fafc" stroke="#475569" stroke-width="1" class="cara-diente" data-diente="${num}" data-cara="M" onclick="PeriodontoFisioCid.clicCara(this)"/>
                    <!-- Distal (D) -->
                    <polygon points="40,0 30,10 30,30 40,40" fill="#f8fafc" stroke="#475569" stroke-width="1" class="cara-diente" data-diente="${num}" data-cara="D" onclick="PeriodontoFisioCid.clicCara(this)"/>
                    <!-- Oclusal / Incisal (O) -->
                    <rect x="10" y="10" width="20" height="20" fill="#f8fafc" stroke="#475569" stroke-width="1" class="cara-diente" data-diente="${num}" data-cara="O" onclick="PeriodontoFisioCid.clicCara(this)"/>
                </svg>
            </div>
        `;
        contenedor.innerHTML += htmlPieza;
    });
},

    // 👆 6. INTERACCIÓN Y REGISTRO DE CARAS
    clicCara: function(elemento) {
        const diente = elemento.getAttribute('data-diente');
        const cara = elemento.getAttribute('data-cara');

        elemento.setAttribute('fill', this.colorPincelActivo);
        
        if (this.tipoHallazgoActivo === 'placa') {
            elemento.setAttribute('data-tiene-placa', 'true');
        } else {
            elemento.removeAttribute('data-tiene-placa');
        }

        this.registrarHallazgoDental(diente, cara, this.tipoHallazgoActivo);
        this.actualizarResumenVisual();
    },

    registrarHallazgoDental: function(diente, cara, estado) {
        if (!window.FisioCidEngine) return;
        const textoHallazgo = `Pieza ${diente} (${cara}): ${estado.toUpperCase()}`;

        window.FisioCidEngine.datosTemporales = window.FisioCidEngine.datosTemporales.filter(t => !t.startsWith(`Pieza ${diente} (${cara})`));
        
        if (estado !== 'sano') {
            window.FisioCidEngine.datosTemporales.push(textoHallazgo);
        }

        if (typeof modalEngine !== 'undefined') {
            modalEngine.actualizarPanelDiagnostico();
        }
    },

    // 📊 7. CÁLCULOS Y RESUMEN
    actualizarResumenVisual: function() {
        const resumenEl = document.getElementById('texto-resumen-dinamico');
        if (!resumenEl) return;

        const oleary = this.obtenerAnalisisOleary();
        let totalCaries = document.querySelectorAll('.cara-diente[fill="#ef4444"]').length;
        let totalObturados = document.querySelectorAll('.cara-diente[fill="#3b82f6"]').length;

        resumenEl.innerHTML = `
            <div class="p-2 rounded mt-2" style="background: rgba(255,255,255,0.05); border-left: 4px solid #38bdf8; font-size: 0.8rem;">
                <span class="text-info fw-bold">📊 Resumen:</span> 
                <span class="ms-2">🔴 Caries: <b>${totalCaries}</b></span> | 
                <span class="ms-2">🔵 Obturados: <b>${totalObturados}</b></span> | 
                <span class="ms-2">🌸 ${oleary.g}</span>
            </div>
        `;
    },

    obtenerAnalisisOleary: function() {
        const totalCaras = document.querySelectorAll('.cara-diente').length || 1;
        const carasConPlaca = document.querySelectorAll('.cara-diente[data-tiene-placa]').length;
        const porcentaje = ((carasConPlaca / totalCaras) * 100).toFixed(1);

        return {
            porcentaje: porcentaje,
            g: `Índice O'Leary: <b>${porcentaje}%</b>`
        };
    }
};

window.PeriodontoFisioCid = PeriodontoFisioCid;