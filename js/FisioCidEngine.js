// ============================================================================
// 🧠 FisioCidEngine.js - Motor Orquestador de Inteligencia y Diagnóstico
// ============================================================================

let timeoutRenderId = null;

const FisioCidEngine = {

    datosTemporales: [],
    diagnosticosActivos: [],
    valorDolorEVA: 0,
    escalaActiva: null,
    dienteActivoEnEscala: null,
    ultimoResultadoEscala: null,

    // 🚩 LIMPIEZA DE TEXTO (Esencial para matches de coincidencia)
    limpiarTexto: function(t) {
        if (!t) return "";
        return t.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[()]/g, "")
            .trim();
    },

    // 🧠 ANALIZADOR OMNISCIENTE (Recorre todas las especialidades)
    analizarPatrones: function(datos) {
        const biblioteca = window.BIBLIOTECA_PROTOCOLOS;
        if (!biblioteca) return "<div class='text-muted p-3'>Biblioteca no cargada.</div>";

        this.diagnosticosActivos = [];
        let htmlSugerencias = "";
        const datosLimpios = datos.map(d => this.limpiarTexto(d));

        Object.keys(biblioteca).forEach(rama => {
            if (!Array.isArray(biblioteca[rama])) return;

            biblioteca[rama].forEach(protocolo => {
                if (!protocolo.diferenciales) return;

                protocolo.diferenciales.forEach(diag => {
                    let puntos = 0;
                    if (!diag.criteriosPesados) return;

                    diag.criteriosPesados.forEach(c => {
                        const criterioLimpio = this.limpiarTexto(c.id);
                        const existeMatch = datosLimpios.some(hallazgo =>
                            hallazgo.includes(criterioLimpio) || criterioLimpio.includes(hallazgo)
                        );
                        if (existeMatch) puntos += c.puntos;
                    });

                    if (puntos >= (diag.umbral || 4)) {
                        this.diagnosticosActivos.push({ ...diag, puntosActuales: puntos });
                        const colorBarra = diag.color || "#38bdf8";

                        htmlSugerencias += `
                            <div style="border-left: 5px solid ${colorBarra}; background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <b style="color:white; font-size:0.7rem; text-transform:uppercase;">${diag.nombre}</b>
                                    <span style="background:${colorBarra}; color:white; padding:2px 7px; border-radius:12px; font-size:0.55rem; font-weight:900;">${puntos} PTS</span>
                                </div>
                                <i style="font-size:0.55rem; color:#cbd5e1; display:block; margin-top:4px;">🎯 ${diag.objetivoSug || 'Objetivo no definido'}</i>
                            </div>`;
                    }
                });
            });
        });

        return htmlSugerencias || `<div style="color:#64748b; font-size:0.55rem; text-align:center; padding:20px; border: 1px dashed #334155; border-radius:8px;">Seleccione hallazgos para ver diagnósticos diferenciales.</div>`;
    },

    // 🚀 ASISTENTE DE EVALUACIÓN
    abrirAsistente: function(paso = 'anamnesis') {
        if (typeof modalEngine !== 'undefined') {
            modalEngine.abrirAsistente(paso);
        }
    },

    // 🌡️ GESTIÓN DE DOLOR (EVA)
    registrarEVA_Directo: function(valor) {
        this.valorDolorEVA = parseInt(valor);
        const btnAsistente = document.querySelector('.btn-asistente-exploracion');
        if (btnAsistente) {
            const listo = this.valorDolorEVA > 0;
            btnAsistente.disabled = !listo;
            btnAsistente.style.opacity = listo ? "1" : "0.5";
            btnAsistente.style.cursor = listo ? "pointer" : "not-allowed";
        }
    },

    // 🎯 LANZADOR UNIVERSAL DE CUESTIONARIOS Y MODALES
    lanzarCuestionario: function(id, dienteId = null) {
        if (id === 'PERIODONTOGRAMA' || id === 'ODONTOGRAMA') {
            if (window.PeriodontoFisioCid && typeof window.PeriodontoFisioCid.iniciarArcadas === 'function') {
                window.PeriodontoFisioCid.iniciarArcadas();
            } else {
                console.warn("⚠️ [FisioCidEngine]: El módulo PeriodontoFisioCid no está disponible.");
            }
            return;
        }

        const banco = window.BANCO_ESCALAS;
        if (!banco || !banco[id]) {
            console.warn(`⚠️ [FisioCidEngine]: No existe la escala "${id}" en BANCO_ESCALAS.`);
            return;
        }

        const escala = banco[id];
        this.escalaActiva = id; 
        this.dienteActivoEnEscala = dienteId;

        const titulo = document.getElementById('tituloEscala');
        const contenedor = document.getElementById('cuerpoEscala');
        const modalEl = document.getElementById('modalEscalaDinamica');

        if (!titulo || !contenedor || !modalEl) {
            console.error("❌ [FisioCidEngine]: Faltan elementos DOM del modal de escala dinámica.");
            return;
        }

        titulo.innerText = escala.nombre.toUpperCase();

        let html = "";
        if (escala.preguntas && Array.isArray(escala.preguntas)) {
            escala.preguntas.forEach((p, i) => {
                html += `
                    <div class="mb-4 p-3 border rounded bg-white shadow-sm">
                        <label class="d-block fw-bold text-dark mb-2" style="font-size: 0.85rem;">
                            ${i + 1}. ${p.t.toUpperCase()}
                        </label>
                        <select class="form-select form-select-sm escala-input" onchange="window.FisioCidEngine.calcularEscalaDinamica()">
                            <option value="none" selected disabled>SELECCIONE UNA OPCIÓN...</option>
                            ${p.o.map((op, v) => `<option value="${v}">${op.toUpperCase()}</option>`).join('')}
                        </select>
                    </div>`;
            });
        }
        contenedor.innerHTML = html;

        modalEl.removeAttribute('aria-hidden');
        modalEl.style.zIndex = "10050";

        let instanciaModal = bootstrap.Modal.getInstance(modalEl);
        if (!instanciaModal) {
            instanciaModal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: true });
        }
        
        instanciaModal.show();
    },

    // 📊 CÁLCULO DINÁMICO DE ESCALAS
    calcularEscalaDinamica: function() {
        let puntos = 0;
        let textosSeleccionados = []; 
        const inputs = document.querySelectorAll('.escala-input');
        
        inputs.forEach((s) => {
            if (s.value !== "none") puntos += parseInt(s.value);
            const texto = s.selectedIndex > 0 ? s.options[s.selectedIndex].text : "Pendiente";
            textosSeleccionados.push(texto);
        });

        const escala = window.BANCO_ESCALAS?.[this.escalaActiva];
        if (escala && typeof escala.interpretar === 'function') {
            const res = escala.interpretar(puntos, this.dienteActivoEnEscala || textosSeleccionados);
            
            const resVivo = document.getElementById('resultadoVivo');
            if (resVivo) {
                resVivo.innerHTML = `<b style="color:#d4af37;">${puntos} PTS</b> - <small>${res.g}</small>`;
            }
            
            if (escala.rama === "odontologia" && window.PeriodontoFisioCid) {
                window.PeriodontoFisioCid.actualizarHallazgoGlobal(this.escalaActiva, res.notaClinica || res.g);
            } else if (escala.rama === "fisioterapia" && window.FisioCidClinico) {
                window.FisioCidClinico.hallazgosEscalas[escala.nombre] = res.g;
                window.FisioCidClinico.actualizarResumen();
            }
        }
    },

  // 🏁 FINALIZAR E INYECTAR REPORTE RESUMIDO POR PIEZA AL EXPEDIENTE
    finalizarEscala: async function() {
        console.log("🚀 Sincronizando hallazgos odontológicos agrupados por pieza hacia el expediente...");

        if (window.PeriodontoFisioCid) {
            window.PeriodontoFisioCid.actualizarResumenVisual();

            let lineasReporte = [];
            lineasReporte.push("=== 🦷 EXPLORACIÓN Y REPORTE ODONTOLÓGICO ===");

            const oleary = window.PeriodontoFisioCid.obtenerAnalisisOleary();
            const pct = parseFloat(oleary.porcentaje);
            let estadoHigiene = "EXCELENTE";
            if (pct > 20 && pct <= 50) estadoHigiene = "REGULAR";
            else if (pct > 50) estadoHigiene = "DEFICIENTE";

            // Piezas únicas
            const piezasCaries = new Set();
            document.querySelectorAll('.cara-diente[fill="#ef4444"]').forEach(el => {
                piezasCaries.add(el.getAttribute('data-diente'));
            });

            const piezasExtraer = new Set();
            document.querySelectorAll('[id^="overlay-extraer-"][style*="display: block"]').forEach(el => {
                const idSplit = el.id.split('-');
                piezasExtraer.add(idSplit[idSplit.length - 1]);
            });

            lineasReporte.push(`• HIGIENE: ${estadoHigiene} (Índice O'Leary: ${oleary.porcentaje}%)`);
            lineasReporte.push(`• RESUMEN: ${piezasCaries.size} pieza(s) con Caries | ${piezasExtraer.size} pieza(s) Indicada(s) para Extracción`);

            // Agrupar detalle por pieza
            const mapaPiezas = {};
            if (this.datosTemporales && this.datosTemporales.length > 0) {
                this.datosTemporales.forEach(item => {
                    if (!item.includes('[PROCEDIMIENTO DENTAL]')) {
                        const match = item.match(/Pieza\s+(\d+)\s*\(([^)]+)\):\s*(.+)/i);
                        if (match) {
                            const num = match[1];
                            const estado = match[3].trim();
                            if (!mapaPiezas[num]) mapaPiezas[num] = new Set();

                            if (estado.toLowerCase() === 'caries') mapaPiezas[num].add('Caries');
                            else if (estado.toLowerCase() === 'extraer') mapaPiezas[num].add('Indicado para Extracción');
                            else if (estado.toLowerCase() === 'tratado') mapaPiezas[num].add('Tratado');
                            else if (estado.toLowerCase() === 'ausente') mapaPiezas[num].add('Pieza Ausente');
                            else mapaPiezas[num].add(estado);
                        }
                    }
                });
            }

            const detallePiezas = [];
            Object.keys(mapaPiezas).sort((a,b) => a - b).forEach(num => {
                detallePiezas.push(`Pieza ${num}: ${Array.from(mapaPiezas[num]).join(', ')}`);
            });

            if (detallePiezas.length > 0) {
                lineasReporte.push(`• DETALLE PIEZA POR PIEZA:\n  - ${detallePiezas.join('\n  - ')}`);
            }

            // Procedimientos y Evaluaciones de Sub-módulos
            const procs = this.datosTemporales ? this.datosTemporales.filter(t => t.includes('[PROCEDIMIENTO DENTAL]')) : [];
            if (procs.length > 0) {
                lineasReporte.push("• EVALUACIONES Y PROCEDIMIENTOS:");
                procs.forEach(p => {
                    lineasReporte.push(`  - ${p.replace('[PROCEDIMIENTO DENTAL]', '').trim()}`);
                });
            }

            const textoReporteFinal = lineasReporte.join('\n');

            // Inyectar en el Textarea de la Historia Clínica
            const textareaExploracion = document.getElementById('exploracion');
            if (textareaExploracion) {
                const contenidoPrevio = textareaExploracion.value.trim();
                textareaExploracion.value = contenidoPrevio 
                    ? `${contenidoPrevio}\n\n${textoReporteFinal}` 
                    : textoReporteFinal;
                textareaExploracion.dispatchEvent(new Event('input', { bubbles: true }));
            }

            if (typeof modalEngine !== 'undefined' && typeof modalEngine.clicTag === 'function') {
                modalEngine.clicTag(textoReporteFinal);
            }
        }

        // Cierre de Modal
        const modales = [document.getElementById('modalOdontoFullscreen'), document.getElementById('modalEscalaDinamica')];
        modales.forEach(modalEl => {
            if (modalEl) {
                const inst = bootstrap.Modal.getInstance(modalEl);
                if (inst) inst.hide();
                modalEl.style.display = 'none';
                modalEl.classList.remove('show');
            }
        });

        setTimeout(() => {
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }, 150);

        this.escalaActiva = null;
        this.dienteActivoEnEscala = null;
        this.ultimoResultadoEscala = null;
    }
};

window.FisioCidEngine = FisioCidEngine;