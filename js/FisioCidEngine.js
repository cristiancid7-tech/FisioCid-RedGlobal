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

   // 📊 CÁLCULO DINÁMICO E INYECCIÓN MULTI-RAMA (PSICOLOGÍA / ODONTO / FISIO)
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
                resVivo.innerHTML = `<b style="color:#38bdf8;">${puntos} PTS</b> - <small class="text-white">${res.g || res.notaClinica}</small>`;
            }
            
            // 🧠 SINCRO 1: RAMA PSICOLOGÍA
            if (escala.rama === "psicologia") {
                const nota = res.notaClinica || res.g;
                
                // Actualizar badges numéricos si corresponden a PHQ-9 o GAD-7
                if (this.escalaActiva === 'PHQ9') {
                    const inputPhq = document.getElementById('val_phq9_total');
                    if (inputPhq) {
                        inputPhq.value = puntos;
                        if (window.PsicoFisioCid) window.PsicoFisioCid.calcularPHQ9();
                    }
                }
                if (this.escalaActiva === 'GAD7') {
                    const inputGad = document.getElementById('val_gad7_total');
                    if (inputGad) {
                        inputGad.value = puntos;
                        if (window.PsicoFisioCid) window.PsicoFisioCid.calcularGAD7();
                    }
                }

                // Inyectar diagnóstico/nota al textarea de objetivos del módulo psicológico
                if (window.PsicoFisioCid && typeof window.PsicoFisioCid.agregarTagTexto === 'function') {
                    window.PsicoFisioCid.agregarTagTexto('psico_objetivos', nota);
                }

                if (!this.datosTemporales.includes(nota)) {
                    this.datosTemporales.push(nota);
                }

            // 🦷 SINCRO 2: RAMA ODONTOLOGÍA
            } else if (escala.rama === "odontologia" && window.PeriodontoFisioCid) {
                window.PeriodontoFisioCid.actualizarHallazgoGlobal(this.escalaActiva, res.notaClinica || res.g);

            // 🦾 SINCRO 3: RAMA FISIOTERAPIA
            } else if (escala.rama === "fisioterapia" && window.FisioCidClinico) {
                window.FisioCidClinico.hallazgosEscalas[escala.nombre] = res.g;
                window.FisioCidClinico.actualizarResumen();
            }
        }
    },

    // 💾 COMPILAR ESTADO GLOBAL DENTAL PARA LA COLUMNA piezas_dentales (JSONB) SIN ACENTOS
    obtenerObjetoDentalMaestro: function() {
        const esAdulto = document.getElementById('switchArcada')?.checked ?? true;
        const oleary = window.PeriodontoFisioCid
            ? window.PeriodontoFisioCid.obtenerAnalisisOleary()
            : { porcentaje: 0 };
        
        const mapaPiezas = {};

        // Función interna para remover acentos de cadenas de texto
        const removerAcentos = (str) => {
            if (!str) return "";
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };

        // Recorremos las tarjetas de piezas dentales
        document.querySelectorAll('.tarjeta-pieza-dental').forEach(tarjeta => {
            const num = tarjeta.getAttribute('data-diente');
            const carasObj = {};
            
            tarjeta.querySelectorAll('.cara-diente').forEach(c => {
                const cara = c.getAttribute('data-cara');
                const fill = c.getAttribute('fill');
                if (fill && fill !== '#f8fafc') {
                    carasObj[cara] = fill;
                }
            });

            const overlayExtraer = document.getElementById(`overlay-extraer-${num}`);
            const overlayAusente = document.getElementById(`overlay-ausente-${num}`);
            const gutapercha = document.getElementById(`gutapercha-${num}`);

            const esExtraer = overlayExtraer && overlayExtraer.style.display === 'block';
            const esAusente = overlayAusente && overlayAusente.style.display === 'block';
            const tieneEndo = gutapercha && gutapercha.style.display === 'block';

            if (Object.keys(carasObj).length > 0 || esExtraer || esAusente || tieneEndo) {
                mapaPiezas[num] = {
                    estado: esExtraer ? 'extraer' : (esAusente ? 'ausente' : 'activo'),
                    caras: carasObj,
                    endodoncia: tieneEndo
                };
            }
        });

        // Limpieza de historial temporal sin acentos
        const historialLimpio = (this.datosTemporales || []).map(item => removerAcentos(item));

        return {
            denticion_activa: esAdulto ? 'permanente' : 'temporal',
            ultimo_oleary: parseFloat(oleary.porcentaje),
            ultima_actualizacion: new Date().toISOString(),
            piezas: mapaPiezas,
            historial_temporales: historialLimpio
        };
    },

   // 🏁 FINALIZAR E INYECTAR REPORTE UNIFICADO Y AGRUPADO AL EXPEDIENTE
    finalizarEscala: async function() {
        console.log("🚀 Sincronizando hallazgos odontológicos agrupados hacia el expediente...");

        if (window.PeriodontoFisioCid) {
            window.PeriodontoFisioCid.actualizarResumenVisual();

            let lineasReporte = [];
            lineasReporte.push("=== 🦷 EXPLORACIÓN Y REPORTE ODONTOLÓGICO ===");

            const oleary = window.PeriodontoFisioCid.obtenerAnalisisOleary();
            const pct = parseFloat(oleary.porcentaje);
            let estadoHigiene = "EXCELENTE";
            if (pct > 20 && pct <= 50) estadoHigiene = "REGULAR";
            else if (pct > 50) estadoHigiene = "DEFICIENTE";

            // 🧠 MAPA DE AGRUPACIÓN EN TIEMPO REAL
            const mapaHallazgos = {
                'Placa Nueva (Bacteriana)': new Set(),
                'Placa Antigua / Sarro': new Set(),
                'Caries Detectada': new Set(),
                'Indicado para Extracción': new Set(),
                'Pieza Ausente': new Set(),
                'Tratado / Restaurado': new Set(),
                'Endodoncia Realizada': new Set()
            };

            // 1. ESCANEO DIRECTO DEL DOM DE PIEZAS Y COLORES
            document.querySelectorAll('.tarjeta-pieza-dental').forEach(tarjeta => {
                const num = parseInt(tarjeta.getAttribute('data-diente'), 10);
                if (!num) return;

                // Escaneo de Caras y Colores
                tarjeta.querySelectorAll('.cara-diente').forEach(c => {
                    const fill = c.getAttribute('fill')?.toLowerCase();
                    if (!fill || fill === '#f8fafc' || fill === 'none') return;

                    if (fill === '#ef4444' || fill === 'red') mapaHallazgos['Caries Detectada'].add(num);
                    if (fill === '#3b82f6' || fill === 'blue') mapaHallazgos['Tratado / Restaurado'].add(num);
                    if (fill === '#eab308' || fill === 'yellow') mapaHallazgos['Placa Nueva (Bacteriana)'].add(num);
                    if (fill === '#f97316' || fill === 'orange') mapaHallazgos['Placa Antigua / Sarro'].add(num);
                });

                // Escaneo de Overlays (Extracción, Ausente, Endodoncia)
                const overlayExtraer = document.getElementById(`overlay-extraer-${num}`);
                const overlayAusente = document.getElementById(`overlay-ausente-${num}`);
                const gutapercha = document.getElementById(`gutapercha-${num}`);

                if (overlayExtraer && overlayExtraer.style.display === 'block') mapaHallazgos['Indicado para Extracción'].add(num);
                if (overlayAusente && overlayAusente.style.display === 'block') mapaHallazgos['Pieza Ausente'].add(num);
                if (gutapercha && gutapercha.style.display === 'block') mapaHallazgos['Endodoncia Realizada'].add(num);
            });

            // 2. ESCANEO ADICIONAL DE DATOS TEMPORALES (Si hay notas registradas por texto)
            if (this.datosTemporales && this.datosTemporales.length > 0) {
                this.datosTemporales.forEach(item => {
                    if (!item.includes('[PROCEDIMIENTO DENTAL]')) {
                        const match = item.match(/Pieza\s+(\d+)/i);
                        if (match) {
                            const num = parseInt(match[1], 10);
                            const t = item.toLowerCase();
                            if (t.includes('caries')) mapaHallazgos['Caries Detectada'].add(num);
                            if (t.includes('placa nueva') || t.includes('p_nueva')) mapaHallazgos['Placa Nueva (Bacteriana)'].add(num);
                            if (t.includes('placa vieja') || t.includes('p_vieja') || t.includes('sarro')) mapaHallazgos['Placa Antigua / Sarro'].add(num);
                            if (t.includes('extraer')) mapaHallazgos['Indicado para Extracción'].add(num);
                            if (t.includes('ausente')) mapaHallazgos['Pieza Ausente'].add(num);
                        }
                    }
                });
            }

            // Resumen de higiene general
            lineasReporte.push(`• HIGIENE: ${estadoHigiene} (Índice O'Leary: ${oleary.porcentaje}%)`);
            lineasReporte.push(`• RESUMEN GENERAL: ${mapaHallazgos['Caries Detectada'].size} pieza(s) con Caries | ${mapaHallazgos['Indicado para Extracción'].size} pieza(s) Indicadas para Extracción`);

            // 3. CONSTRUCCIÓN DE RENGLONES UNIFICADOS
            const renglonesAgrupados = [];
            Object.keys(mapaHallazgos).forEach(hallazgo => {
                if (mapaHallazgos[hallazgo].size > 0) {
                    const listaPiezas = Array.from(mapaHallazgos[hallazgo]).sort((a, b) => a - b);
                    renglonesAgrupados.push(`  - ${hallazgo}: Pieza(s) ${listaPiezas.join(', ')}`);
                }
            });

            if (renglonesAgrupados.length > 0) {
                lineasReporte.push(`• HALLAZGOS CLINICOS AGRUPADOS:\n${renglonesAgrupados.join('\n')}`);
            }

            // Procedimientos registrados en submódulos
            const procs = this.datosTemporales ? this.datosTemporales.filter(t => t.includes('[PROCEDIMIENTO DENTAL]')) : [];
            if (procs.length > 0) {
                lineasReporte.push("• EVALUACIONES Y PROCEDIMIENTOS:");
                procs.forEach(p => {
                    lineasReporte.push(`  - ${p.replace('[PROCEDIMIENTO DENTAL]', '').trim()}`);
                });
            }

            const textoReporteFinal = lineasReporte.join('\n');

            // 4. INYECTAR EN EL TEXTAREA DE EXPLORACIÓN
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

        // Cierre y limpieza de Modales
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