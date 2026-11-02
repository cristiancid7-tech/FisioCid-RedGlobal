// ============================================================================
// 🦷 PeriodontoFisioCid.js - Motor Avanzado con Simbología Odontológica FDI + Sondaje 6 Puntos
// ============================================================================

const PeriodontoFisioCid = {
    colorPincelActivo: '#f8fafc',
    tipoHallazgoActivo: 'sano',
    piezaSeleccionada: null,

    // 🩸 Matriz de Sondaje Periodontal de 6 Puntos por Diente
    datosSondaje: {},

   // 🔄 RESTAURAR ESTADO DENTAL MAESTRO DESDE EL JSON DE SUPABASE (CORREGIDO)
    // 🔄 RESTAURAR ESTADO DENTAL MAESTRO DESDE EL JSON DE SUPABASE (CORREGIDO)
    cargarEstadoDentalMaestro: function(datosDentalesJSON) {
        if (!datosDentalesJSON) return;

        try {
            const datos = typeof datosDentalesJSON === 'string'
                ? JSON.parse(datosDentalesJSON)
                : datosDentalesJSON;

            // 1. Asegurar que las arcadas SVG existan en el DOM antes de intentar pintar
            const sup = document.getElementById('arcada-superior');
            if (sup && sup.children.length === 0) {
                this.iniciarArcadas();
            }

            // 2. Restaurar tipo de dentición (Adulto / Niño)
            if (datos.denticion_activa) {
                const switchEl = document.getElementById('switchArcada');
                if (switchEl) {
                    switchEl.checked = (datos.denticion_activa === 'permanente');
                    this.toggleArcada(switchEl);
                }
            }

            // 3. Restaurar estado visual de cada pieza (Caras, Ausentes, Extracciones, Gutaperchas)
            if (datos.piezas) {
                Object.keys(datos.piezas).forEach(numDiente => {
                    const infoPieza = datos.piezas[numDiente];

                    // Marca X de Exodoncia / Extracción
                    if (infoPieza.estado === 'extraer') {
                        const overlayExtraer = document.getElementById(`overlay-extraer-${numDiente}`);
                        if (overlayExtraer) overlayExtraer.style.display = 'block';
                    } 
                    // Marca Diagonal de Pieza Ausente
                    else if (infoPieza.estado === 'ausente') {
                        const overlayAusente = document.getElementById(`overlay-ausente-${numDiente}`);
                        if (overlayAusente) overlayAusente.style.display = 'block';
                    }

                    // Endodoncia / Gutapercha en raíz
                    if (infoPieza.endodoncia) {
                        const elemGutapercha = document.getElementById(`gutapercha-${numDiente}`);
                        if (elemGutapercha) elemGutapercha.style.display = 'block';
                    }

                    // Colores de caras (Caries, Tratado, Placa, etc.)
                    if (infoPieza.caras) {
                        Object.keys(infoPieza.caras).forEach(cara => {
                            const color = infoPieza.caras[cara];
                            
                            // 🎯 BÚSQUEDA CORREGIDA: Ubica la tarjeta de la pieza y luego su cara interna
                            const selectorPieza = `.tarjeta-pieza-dental[data-diente="${numDiente}"]`;
                            const tarjeta = document.querySelector(selectorPieza);
                            if (tarjeta) {
                                const elCara = tarjeta.querySelector(`.cara-diente[data-cara="${cara}"]`);
                                if (elCara) {
                                    elCara.setAttribute('fill', color);
                                    if (['#eab308', '#f97316', 'yellow', 'orange'].includes(color)) {
                                        elCara.setAttribute('data-tiene-placa', 'true');
                                    }
                                }
                            }
                        });
                    }
                });
            }

            // 4. Restaurar datos del Sondaje Periodontal de 6 Puntos
            if (datos.sondaje) {
                this.datosSondaje = datos.sondaje;
            }

            // 5. Refrescar el resumen visual y métricas
            this.actualizarResumenVisual();
            console.log("✅ [PeriodontoFisioCid]: Odontograma rehidratado con éxito desde Supabase.");

        } catch (err) {
            console.error("❌ Error al rehidratar odontograma:", err);
        }
    },

    // 🎨 PALETA DE PINCELES CLÍNICOS
    setBrush: function(colorHex, boton, tipo) {
        this.colorPincelActivo = colorHex;
        this.tipoHallazgoActivo = tipo;

        document.querySelectorAll('.paleta-color').forEach(b => {
            b.style.transform = 'scale(1)';
            b.style.boxShadow = 'none';
        });

        if (boton) {
            boton.style.transform = 'scale(1.08)';
            boton.style.boxShadow = `0 0 12px ${colorHex}`;
        }
    },

    // 🔄 CONMUTADOR NIÑO / ADULTO
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

        const labelSwitch = document.getElementById('labelDenticion');
        if (labelSwitch) {
            labelSwitch.innerText = esAdulto ? "DENTICIÓN PERMANENTE (ADULTO)" : "DENTICIÓN TEMPORAL (NIÑO)";
        }

        const btnPedia = document.getElementById('btn-modulo-pedia');
        const btnGeria = document.getElementById('btn-modulo-geria');

        if (btnPedia && btnGeria) {
            btnPedia.style.setProperty('display', esAdulto ? 'none' : 'block', 'important');
            btnGeria.style.setProperty('display', esAdulto ? 'block' : 'none', 'important');
        }

        this.estirarLienzo();
    },

    // 📐 ESTIRAMIENTO RESPONSIVO PANTALLA COMPLETA
    estirarLienzo: function() {
        const modal = document.getElementById('modalOdontoFullscreen');
        if (!modal) return;

        modal.querySelectorAll('.modal-dialog, .modal-content, #cuerpoEscalaOdonto, #contenedor-odontograma-modulo').forEach(el => {
            el.style.setProperty('width', '100%', 'important');
            el.style.setProperty('max-width', '100vw', 'important');
            el.style.setProperty('box-sizing', 'border-box', 'important');
        });

        const contenedoresArcada = modal.querySelectorAll('.arcada-container');
        contenedoresArcada.forEach(c => {
            if (c.style.display !== 'none') {
                c.style.setProperty('display', 'flex', 'important');
            }
            c.style.setProperty('justify-content', 'space-between', 'important');
            c.style.setProperty('width', '100%', 'important');
            c.style.setProperty('max-width', '100%', 'important');
            c.style.setProperty('gap', '2px', 'important');
        });

        const piezas = modal.querySelectorAll('.tarjeta-pieza-dental');
        piezas.forEach(p => {
            p.style.setProperty('flex', '1 1 auto', 'important');
            p.style.setProperty('max-width', '55px', 'important');
            p.style.setProperty('min-width', '32px', 'important');
        });
    },

    // ⚡ SELECCIÓN VISUAL DE PIEZA ACTIVA
    seleccionarPiezaActiva: function(numDiente) {
        this.piezaSeleccionada = numDiente;

        document.querySelectorAll('.tarjeta-pieza-dental').forEach(t => {
            t.style.borderColor = 'rgba(255,255,255,0.1)';
            t.style.boxShadow = 'none';
        });

        const tarjeta = document.querySelector(`.tarjeta-pieza-dental[data-diente="${numDiente}"]`);
        if (tarjeta) {
            tarjeta.style.borderColor = '#38bdf8';
            tarjeta.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.4)';
        }

        const badgePieza = document.getElementById('badge-pieza-activa');
        if (badgePieza) {
            badgePieza.innerText = `#${numDiente}`;
        }
    },

    // 🚀 INICIALIZACIÓN DE ARCADAS Y REGISTRO
    iniciarArcadas: function() {
        const sup = document.getElementById('arcada-superior');
        const inf = document.getElementById('arcada-inferior');
        const tempSup = document.getElementById('temporales-superior');
        const tempInf = document.getElementById('temporales-inferior');

        if (!sup || !inf) return;

        this.renderizarArcada('arcada-superior', [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]);
        this.renderizarArcada('arcada-inferior', [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]);

        if (tempSup) this.renderizarArcada('temporales-superior', [55, 54, 53, 52, 51, 61, 62, 63, 64, 65]);
        if (tempInf) this.renderizarArcada('temporales-inferior', [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]);

        const switchEl = document.getElementById('switchArcada');
        if (switchEl) {
            this.toggleArcada(switchEl);
        } else {
            if (tempSup) tempSup.style.setProperty('display', 'none', 'important');
            if (tempInf) tempInf.style.setProperty('display', 'none', 'important');
        }

        this.estirarLienzo();
    },

    // 🖼️ DIBUJO SVG ANATÓMICO (CUADRADOS PARA ADULTOS / CÍRCULOS CONCÉNTRICOS PARA NIÑOS)
    renderizarArcada: function(contenedorId, listaPiezas) {
        const contenedor = document.getElementById(contenedorId);
        if (!contenedor) return;

        contenedor.innerHTML = '';
        contenedor.style.display = 'flex';
        contenedor.style.justifyContent = 'center';
        contenedor.style.flexWrap = 'nowrap';
        contenedor.style.gap = '4px';
        contenedor.style.width = '100%';

        listaPiezas.forEach(num => {
            const esMolar = [18, 17, 16, 26, 27, 28, 48, 47, 46, 36, 37, 38, 55, 54, 64, 65, 85, 84, 74, 75].includes(num);
            const esPremolar = [15, 14, 24, 25, 45, 44, 34, 35].includes(num);
            const esSuperior = num < 30 || (num >= 50 && num <= 65);
            const esTemporal = num >= 50;

            let pathRaiz = `<path d="M10,2 Q10,20 8,42 Q15,48 22,42 Q20,20 20,2 Z" fill="rgba(56,189,248,0.15)" stroke="#38bdf8" stroke-width="1.8" class="raiz-diente" data-diente="${num}" onclick="PeriodontoFisioCid.clicRaiz(this)"/>`;

            if (esMolar) {
                pathRaiz = `<path d="M4,5 Q4,20 7,30 Q5,46 9,46 Q13,32 15,22 Q17,32 19,46 Q23,46 21,30 Q24,20 24,5 Z" fill="rgba(56,189,248,0.15)" stroke="#38bdf8" stroke-width="1.8" class="raiz-diente" data-diente="${num}" onclick="PeriodontoFisioCid.clicRaiz(this)"/>`;
            } else if (esPremolar) {
                pathRaiz = `<path d="M6,5 Q6,20 9,38 Q14,44 18,38 Q22,20 22,5 Z" fill="rgba(56,189,248,0.15)" stroke="#38bdf8" stroke-width="1.8" class="raiz-diente" data-diente="${num}" onclick="PeriodontoFisioCid.clicRaiz(this)"/>`;
            }

            const estiloRaizSuperior = 'transform: rotate(180deg); margin-bottom:2px; cursor:pointer;';
            const estiloRaizInferior = 'margin-top:2px; cursor:pointer;';

            let svgCoronaHTML = '';

            if (esTemporal) {
                svgCoronaHTML = `
                    <polygon points="20,20 6,6 34,6" fill="#f8fafc" stroke="#334155" stroke-width="1.5" class="cara-diente" data-diente="${num}" data-cara="V" onclick="PeriodontoFisioCid.clicCara(this)"/>
                    <polygon points="20,20 6,34 34,34" fill="#f8fafc" stroke="#334155" stroke-width="1.5" class="cara-diente" data-diente="${num}" data-cara="L" onclick="PeriodontoFisioCid.clicCara(this)"/>
                    <polygon points="20,20 6,6 6,34" fill="#f8fafc" stroke="#334155" stroke-width="1.5" class="cara-diente" data-diente="${num}" data-cara="M" onclick="PeriodontoFisioCid.clicCara(this)"/>
                    <polygon points="20,20 34,6 34,34" fill="#f8fafc" stroke="#334155" stroke-width="1.5" class="cara-diente" data-diente="${num}" data-cara="D" onclick="PeriodontoFisioCid.clicCara(this)"/>
                    <circle cx="20" cy="20" r="18" fill="none" stroke="#334155" stroke-width="1.8" pointer-events="none"/>
                    <circle cx="20" cy="20" r="8" fill="#f8fafc" stroke="#334155" stroke-width="1.5" class="cara-diente" data-diente="${num}" data-cara="O" onclick="PeriodontoFisioCid.clicCara(this)"/>
                `;
            } else {
                svgCoronaHTML = `
                    <polygon points="0,0 40,0 30,10 10,10" fill="#f8fafc" stroke="#334155" stroke-width="1.5" class="cara-diente" data-diente="${num}" data-cara="V" onclick="PeriodontoFisioCid.clicCara(this)"/>
                    <polygon points="10,30 30,30 40,40 0,40" fill="#f8fafc" stroke="#334155" stroke-width="1.5" class="cara-diente" data-diente="${num}" data-cara="L" onclick="PeriodontoFisioCid.clicCara(this)"/>
                    <polygon points="0,0 10,10 10,30 0,40" fill="#f8fafc" stroke="#334155" stroke-width="1.5" class="cara-diente" data-diente="${num}" data-cara="M" onclick="PeriodontoFisioCid.clicCara(this)"/>
                    <polygon points="40,0 30,10 30,30 40,40" fill="#f8fafc" stroke="#334155" stroke-width="1.5" class="cara-diente" data-diente="${num}" data-cara="O" onclick="PeriodontoFisioCid.clicCara(this)"/>
                    <rect x="10" y="10" width="20" height="20" fill="#f8fafc" stroke="#334155" stroke-width="1.5" class="cara-diente" data-diente="${num}" data-cara="O" onclick="PeriodontoFisioCid.clicCara(this)"/>
                `;
            }

            const htmlPieza = `
                <div class="tarjeta-pieza-dental" data-diente="${num}" onclick="PeriodontoFisioCid.seleccionarPiezaActiva('${num}')" style="display:flex; flex-direction:column; align-items:center; width:44px; background:rgba(255,255,255,0.03); padding:4px 2px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); cursor:pointer; position:relative;">
                    <span style="font-size:0.75rem; font-weight:bold; color:${esTemporal ? '#ec4899' : '#38bdf8'}; margin-bottom:2px;">${num}</span>
                    
                    ${esSuperior ? `
                        <svg width="28" height="42" viewBox="0 0 28 50" style="${estiloRaizSuperior}" id="svg-raiz-${num}">
                            ${pathRaiz}
                            <line x1="15" y1="5" x2="15" y2="44" stroke="#ec4899" stroke-width="2.5" stroke-dasharray="2,2" class="linea-conducto-gutapercha" id="gutapercha-${num}" style="display:none;"/>
                            <circle cx="15" cy="45" r="4" fill="#ef4444" class="apice-lesion" id="apice-${num}" style="display:none;"/>
                        </svg>
                    ` : ''}

                    <div style="position:relative; width:32px; height:32px;">
                        <svg width="32" height="32" viewBox="0 0 40 40" style="cursor:pointer; position:absolute; top:0; left:0;">
                            ${svgCoronaHTML}

                            <g id="overlay-extraer-${num}" style="display:none; pointer-events:none;">
                                <line x1="2" y1="2" x2="38" y2="38" stroke="#dc2626" stroke-width="3.5" stroke-linecap="round"/>
                                <line x1="38" y1="2" x2="2" y2="38" stroke="#dc2626" stroke-width="3.5" stroke-linecap="round"/>
                            </g>

                            <g id="overlay-ausente-${num}" style="display:none; pointer-events:none;">
                                <line x1="38" y1="2" x2="2" y2="38" stroke="#64748b" stroke-width="3.5" stroke-linecap="round"/>
                            </g>
                        </svg>
                    </div>

                    ${!esSuperior ? `
                        <svg width="28" height="42" viewBox="0 0 28 50" style="${estiloRaizInferior}" id="svg-raiz-${num}">
                            ${pathRaiz}
                            <line x1="15" y1="5" x2="15" y2="44" stroke="#ec4899" stroke-width="2.5" stroke-dasharray="2,2" class="linea-conducto-gutapercha" id="gutapercha-${num}" style="display:none;"/>
                            <circle cx="15" cy="45" r="4" fill="#ef4444" class="apice-lesion" id="apice-${num}" style="display:none;"/>
                        </svg>
                    ` : ''}
                </div>
            `;

            contenedor.innerHTML += htmlPieza;
        });
    },

    // 🦷 CLIC EN CARAS DENTALES CON MANEJO DE SIMBOLOGÍA FDI
    clicCara: function(elemento) {
        const diente = elemento.getAttribute('data-diente');
        const cara = elemento.getAttribute('data-cara');
        const tipo = this.tipoHallazgoActivo;

        this.seleccionarPiezaActiva(diente);

        const overlayExtraer = document.getElementById(`overlay-extraer-${diente}`);
        const overlayAusente = document.getElementById(`overlay-ausente-${diente}`);

        if (tipo === 'extraer') {
            if (overlayExtraer) overlayExtraer.style.display = 'block';
            if (overlayAusente) overlayAusente.style.display = 'none';
        } else if (tipo === 'ausente') {
            if (overlayAusente) overlayAusente.style.display = 'block';
            if (overlayExtraer) overlayExtraer.style.display = 'none';
        } else if (tipo === 'sano') {
            if (overlayExtraer) overlayExtraer.style.display = 'none';
            if (overlayAusente) overlayAusente.style.display = 'none';

            const carasPieza = document.querySelectorAll(`.cara-diente[data-diente="${diente}"]`);
            carasPieza.forEach(c => {
                c.setAttribute('fill', '#f8fafc');
                c.removeAttribute('data-tiene-placa');
            });
        } else {
            if (overlayExtraer) overlayExtraer.style.display = 'none';
            if (overlayAusente) overlayAusente.style.display = 'none';

            elemento.setAttribute('fill', this.colorPincelActivo);

            if (['placa', 'p_nueva', 'p_vieja'].includes(tipo)) {
                elemento.setAttribute('data-tiene-placa', 'true');
            } else {
                elemento.removeAttribute('data-tiene-placa');
            }
        }

        this.registrarHallazgoDental(diente, cara, tipo);
        this.actualizarResumenVisual();
    },

    // ⚡ CLIC EN RAÍCES
    clicRaiz: function(elementoRaiz) {
        const diente = elementoRaiz.getAttribute('data-diente');
        const color = this.colorPincelActivo;
        const tipo = this.tipoHallazgoActivo;

        this.seleccionarPiezaActiva(diente);

        elementoRaiz.setAttribute('fill', color);
        elementoRaiz.setAttribute('stroke', color === '#f8fafc' ? '#38bdf8' : color);
        elementoRaiz.setAttribute('data-estado-raiz', tipo);

        const elemGutapercha = document.getElementById(`gutapercha-${diente}`);
        const elemApice = document.getElementById(`apice-${diente}`);

        if (elemGutapercha) {
            elemGutapercha.style.display = (tipo === 'tratado') ? 'block' : 'none';
        }

        if (elemApice) {
            elemApice.style.display = (tipo === 'caries' || tipo === 'extraer') ? 'block' : 'none';
        }

        this.registrarHallazgoDental(diente, 'RAIZ', tipo);
        this.actualizarResumenVisual();
    },

    // 🩸 GUARDAR PUNTO DE SONDAJE PERIODONTAL (6 PUNTOS)
    guardarPuntoSondaje: function(diente, cara, punto, campo, valor) {
        if (!diente) return;

        if (!this.datosSondaje[diente]) {
            this.datosSondaje[diente] = {
                V: { MV: { ps: 2, mg: 0 }, V: { ps: 2, mg: 0 }, DV: { ps: 2, mg: 0 } },
                L: { MP: { ps: 2, mg: 0 }, P: { ps: 2, mg: 0 }, DP: { ps: 2, mg: 0 } }
            };
        }

        const valNum = parseInt(valor, 10) || 0;
        this.datosSondaje[diente][cara][punto][campo] = valNum;

        if (campo === 'ps' && valNum >= 4) {
            this.registrarProcedimientoPieza(`Bolsa Periodontal ${valNum}mm en ${punto} (${cara})`);
        }

        this.actualizarResumenVisual();
    },

    // 📊 CÁLCULO DE PROMEDIOS PERIODONTALES (6 PUNTOS)
    calcularAnalisisPeriodontal: function() {
        let totalPuntos = 0;
        let sumaPS = 0;
        let sumaNIC = 0;
        let bolsasProfundas = 0;

        Object.keys(this.datosSondaje).forEach(d => {
            const pieza = this.datosSondaje[d];
            ['V', 'L'].forEach(cara => {
                Object.keys(pieza[cara]).forEach(punto => {
                    const p = pieza[cara][punto];
                    const ps = p.ps || 0;
                    const mg = p.mg || 0;
                    const nic = ps + mg;

                    sumaPS += ps;
                    sumaNIC += nic;
                    totalPuntos++;

                    if (ps >= 4) bolsasProfundas++;
                });
            });
        });

        const promPS = totalPuntos > 0 ? (sumaPS / totalPuntos).toFixed(1) : "0.0";
        const promNIC = totalPuntos > 0 ? (sumaNIC / totalPuntos).toFixed(1) : "0.0";

        return {
            promPS,
            promNIC,
            bolsasProfundas,
            totalPuntos
        };
    },

    // 📝 REGISTRO HACIA FisioCidEngine
    registrarHallazgoDental: function(diente, cara, estado) {
        if (!window.FisioCidEngine) return;

        const textoHallazgo = `Pieza ${diente} (${cara}): ${estado.toUpperCase()}`;

        window.FisioCidEngine.datosTemporales = window.FisioCidEngine.datosTemporales.filter(t => !t.startsWith(`Pieza ${diente} (${cara})`));

        if (estado !== 'sano') {
            window.FisioCidEngine.datosTemporales.push(textoHallazgo);
        }

        if (typeof modalEngine !== 'undefined' && typeof modalEngine.actualizarPanelDiagnostico === 'function') {
            modalEngine.actualizarPanelDiagnostico();
        }
    },

    // 📝 REGISTRAR PROCEDIMIENTO POR PIEZA
    registrarProcedimientoPieza: function(procedimiento) {
        const diente = this.piezaSeleccionada;
        
        if (!diente) {
            alert("⚠️ Selecciona primero una pieza dental haciendo clic en un diente.");
            return;
        }

        const registroDetallado = `Pieza #${diente}: ${procedimiento.toUpperCase()}`;
        
        if (window.FisioCidEngine) {
            window.FisioCidEngine.datosTemporales.push(`[PROCEDIMIENTO DENTAL] ${registroDetallado}`);
        }

        this.actualizarResumenVisual();
    },

    // 📝 REGISTRAR ESCALAS Y MÓDULOS
    registrarEscala: function(categoria, valor) {
        const registro = `[${categoria.toUpperCase()}]: ${valor.toUpperCase()}`;

        if (window.FisioCidEngine) {
            window.FisioCidEngine.datosTemporales = window.FisioCidEngine.datosTemporales.filter(t => !t.startsWith(`[PROCEDIMIENTO DENTAL] [${categoria.toUpperCase()}]`));
            window.FisioCidEngine.datosTemporales.push(`[PROCEDIMIENTO DENTAL] ${registro}`);
        }

        this.actualizarResumenVisual();
    },

    // 🗑️ ELIMINAR PROCEDIMIENTO INDIVIDUAL
    eliminarProcedimiento: function(index) {
        if (window.FisioCidEngine && window.FisioCidEngine.datosTemporales) {
            let contador = 0;
            window.FisioCidEngine.datosTemporales = window.FisioCidEngine.datosTemporales.filter(item => {
                if (item.includes('[PROCEDIMIENTO DENTAL]')) {
                    const debeEliminar = (contador === index);
                    contador++;
                    return !debeEliminar;
                }
                return true;
            });
        }
        this.actualizarResumenVisual();
    },

    // 📊 RESUMEN DINÁMICO CON ESTILO "VISTA PREVIA DEL HALLAZGO" + METRICAS PERIODONTALES
   // 📊 RESUMEN DINÁMICO AGRUPADO Y LIMPIO PARA "VISTA PREVIA DEL HALLAZGO"
    actualizarResumenVisual: function() {
        const resumenEl = document.getElementById('texto-resumen-dinamico');
        if (!resumenEl) return;

        const oleary = this.obtenerAnalisisOleary();
        const perio = this.calcularAnalisisPeriodontal();
        const pct = parseFloat(oleary.porcentaje);
        
        let estadoHigiene = "EXCELENTE";
        let colorHigiene = "#10b981"; // Verde

        if (pct > 20 && pct <= 50) {
            estadoHigiene = "REGULAR";
            colorHigiene = "#f59e0b"; // Amarillo
        } else if (pct > 50) {
            estadoHigiene = "DEFICIENTE";
            colorHigiene = "#ef4444"; // Rojo
        }

        const piezasCaries = new Set();
        document.querySelectorAll('.cara-diente[fill="#ef4444"]').forEach(el => {
            piezasCaries.add(el.getAttribute('data-diente'));
        });

        const piezasExtraer = new Set();
        document.querySelectorAll('[id^="overlay-extraer-"][style*="display: block"]').forEach(el => {
            const idSplit = el.id.split('-');
            piezasExtraer.add(idSplit[idSplit.length - 1]);
        });

        // 🧠 ESTRUCTURA PARA AGRUPAR PIEZAS POR CATEGORÍA/HALLAZGO
        const mapaHallazgos = {}; 

        const traducirHallazgo = (estado) => {
            const e = estado.toLowerCase().trim();
            if (e === 'p_nueva' || e === 'placa nueva') return 'Placa Nueva (Bacteriana)';
            if (e === 'p_vieja' || e === 'placa vieja') return 'Placa Antigua / Sarro';
            if (e === 'placa') return 'Placa / Biofilm';
            if (e === 'caries') return 'Caries Detectada';
            if (e === 'extraer') return 'Indicado para Extracción';
            if (e === 'ausente') return 'Pieza Ausente';
            if (e === 'tratado') return 'Tratado / Restaurado';
            return estado;
        };

        if (window.FisioCidEngine && window.FisioCidEngine.datosTemporales) {
            window.FisioCidEngine.datosTemporales.forEach(item => {
                if (!item.includes('[PROCEDIMIENTO DENTAL]')) {
                    const match = item.match(/Pieza\s+(\d+)\s*\(([^)]+)\):\s*(.+)/i);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        const estadoBruto = match[3].trim();
                        const hallazgoNom = traducirHallazgo(estadoBruto);

                        if (!mapaHallazgos[hallazgoNom]) {
                            mapaHallazgos[hallazgoNom] = new Set();
                        }
                        mapaHallazgos[hallazgoNom].add(num);
                    }
                }
            });
        }

        // 🎨 FORMATEAR RENGLONES AGRUPADOS (Ej: Placa Nueva (Bacteriana): Piezas 12, 13, 14, 15)
        const renglonesAgrupados = [];
        Object.keys(mapaHallazgos).forEach(hallazgo => {
            const listaPiezas = Array.from(mapaHallazgos[hallazgo]).sort((a, b) => a - b);
            const piezasTexto = listaPiezas.join(', ');
            renglonesAgrupados.push(`• <b style="color:#38bdf8;">${hallazgo}:</b> Pieza(s) ${piezasTexto}`);
        });

        let listaProcedimientosHTML = '';
        if (window.FisioCidEngine && window.FisioCidEngine.datosTemporales) {
            const procs = window.FisioCidEngine.datosTemporales.filter(t => t.includes('[PROCEDIMIENTO DENTAL]'));
            if (procs.length > 0) {
                listaProcedimientosHTML = `
                    <div class="mt-2 pt-2 border-top border-secondary">
                        <span class="fw-bold small text-info">📋 EVALUACIONES Y PROCEDIMIENTO(S):</span>
                        <div class="d-flex flex-wrap gap-2 mt-1">
                            ${procs.map((p, idx) => `
                                <span class="badge bg-dark border border-info text-info d-inline-flex align-items-center gap-2 py-1 px-2" style="font-size: 0.72rem;">
                                    ${p.replace('[PROCEDIMIENTO DENTAL]', '').trim()}
                                    <button type="button" class="btn-close btn-close-white" style="font-size: 0.55rem;" onclick="PeriodontoFisioCid.eliminarProcedimiento(${idx})" title="Eliminar"></button>
                                </span>
                            `).join('')}
                        </div>
                    </div>`;
            }
        }

        resumenEl.innerHTML = `
            <div class="p-3 rounded-3 mt-3" style="background: rgba(15, 23, 42, 0.95); border: 1px dashed #d4af37; font-size: 0.82rem;">
                <div class="fw-bold text-warning mb-2 d-flex align-items-center gap-2" style="font-size: 0.78rem;">
                    🔍 VISTA PREVIA DEL HALLAZGO
                </div>
                
                <!-- Tarjeta Higiene y Sondaje -->
                <div class="p-2 mb-2 rounded-2 d-flex align-items-center justify-content-between" style="background: rgba(255,255,255,0.03); border-left: 4px solid ${colorHigiene};">
                    <span style="color:${colorHigiene}; font-weight:800;">📉 HIGIENE: ${estadoHigiene} (${oleary.porcentaje}%)</span>
                    <span class="text-info fw-bold" style="font-size: 0.72rem;">🩺 Sondaje Prom: ${perio.promPS}mm (NIC: ${perio.promNIC}mm)</span>
                </div>

                <!-- Tarjetas Conteo Caries / Extracciones / Bolsas -->
                <div class="row g-2 mb-2">
                    <div class="col-4">
                        <div class="p-2 rounded-2" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);">
                            <span class="d-block text-secondary micro fw-bold">CARIES</span>
                            <span class="text-danger fw-bold">${piezasCaries.size} pieza(s)</span>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="p-2 rounded-2" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);">
                            <span class="d-block text-secondary micro fw-bold">EXTRACCIONES</span>
                            <span class="text-white fw-bold">${piezasExtraer.size} pieza(s)</span>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="p-2 rounded-2" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);">
                            <span class="d-block text-warning micro fw-bold">BOLSAS ≥4mm</span>
                            <span class="${perio.bolsasProfundas > 0 ? 'text-danger' : 'text-success'} fw-bold">${perio.bolsasProfundas} sitio(s)</span>
                        </div>
                    </div>
                </div>

                <!-- Detalle Agrupado por Hallazgo -->
                ${renglonesAgrupados.length > 0 ? `
                    <div class="mt-2">
                        <span class="fw-bold text-warning d-block mb-1" style="font-size: 0.75rem;">🦷 RESUMEN DE HALLAZGOS AGRUPADOS:</span>
                        <div class="p-2 rounded-2" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); color:#cbd5e1; line-height: 1.5;">
                            ${renglonesAgrupados.join('<br>')}
                        </div>
                    </div>
                ` : ''}

                ${listaProcedimientosHTML}
            </div>
        `;
    },

    // 🧮 CÁLCULO DE O'LEARY
    obtenerAnalisisOleary: function() {
        const totalCaras = document.querySelectorAll('.cara-diente').length || 1;
        const carasConPlaca = document.querySelectorAll('.cara-diente[data-tiene-placa]').length;
        const porcentaje = ((carasConPlaca / totalCaras) * 100).toFixed(1);

        return {
            porcentaje: porcentaje,
            g: `Índice O'Leary: <b>${porcentaje}%</b>`
        };
    },

    // 🩺 ABRIR MÓDULOS DE SUB-ESCALA
    abrirEscalaModulo: function(nombreEscala) {
        this.renderizarVistaSubEscala(nombreEscala);
    },

    // 🎨 RENDERIZADOR COMPLETO DE SUB-ESCALAS
    renderizarVistaSubEscala: function(escala) {
        const contenedor = document.getElementById('detalle-raiz-activa');
        if (!contenedor) return;

        const piezaTxt = this.piezaSeleccionada ? `#${this.piezaSeleccionada}` : 'Ninguna';
        let htmlEscala = '';

        switch (escala) {
            case 'PERIO':
            case 'SONDAJE':
                const diente = this.piezaSeleccionada || '11';
                if (!this.datosSondaje[diente]) {
                    this.datosSondaje[diente] = {
                        V: { MV: { ps: 2, mg: 0 }, V: { ps: 2, mg: 0 }, DV: { ps: 2, mg: 0 } },
                        L: { MP: { ps: 2, mg: 0 }, P: { ps: 2, mg: 0 }, DP: { ps: 2, mg: 0 } }
                    };
                }
                const s = this.datosSondaje[diente];

                htmlEscala = `
                    <div class="p-3 rounded-3 mt-3 border border-success shadow-sm d-flex flex-column gap-2" style="background: #1e293b; border-color: #10b981 !important;">
                        <div class="d-flex justify-content-between align-items-center border-bottom border-secondary pb-2">
                            <span class="fw-bold text-success" style="font-size: 0.85rem;">🩸 Sondaje Periodontal de 6 Puntos (Bolsas & Margen Gingival)</span>
                            <span class="badge bg-success text-dark" style="font-size: 0.75rem;">Pieza Activa: <b id="badge-pieza-activa">${piezaTxt}</b></span>
                        </div>

                        <!-- MATRIZ DE CAPTURA 6 PUNTOS (3 VESTIBULAR + 3 PALATINO/LINGUAL) -->
                        <div class="row g-2 text-center text-white" style="font-size: 0.72rem;">
                            <!-- Cara Vestibular -->
                            <div class="col-6 border-end border-secondary pe-2">
                                <span class="fw-bold text-info d-block mb-1">VESTIBULAR (V)</span>
                                <div class="d-flex justify-content-between gap-1">
                                    <div>
                                        <span class="micro text-secondary d-block">MV</span>
                                        <input type="number" min="0" max="15" value="${s.V.MV.ps}" class="form-control form-control-sm text-center bg-dark text-warning border-secondary p-0" style="width:36px; height:26px;" onchange="PeriodontoFisioCid.guardarPuntoSondaje('${diente}', 'V', 'MV', 'ps', this.value)" title="Profundidad Sondaje">
                                        <input type="number" min="-5" max="10" value="${s.V.MV.mg}" class="form-control form-control-sm text-center bg-dark text-info border-secondary p-0 mt-1" style="width:36px; height:22px; font-size:0.65rem;" onchange="PeriodontoFisioCid.guardarPuntoSondaje('${diente}', 'V', 'MV', 'mg', this.value)" title="Margen Gingival">
                                    </div>
                                    <div>
                                        <span class="micro text-secondary d-block">V</span>
                                        <input type="number" min="0" max="15" value="${s.V.V.ps}" class="form-control form-control-sm text-center bg-dark text-warning border-secondary p-0" style="width:36px; height:26px;" onchange="PeriodontoFisioCid.guardarPuntoSondaje('${diente}', 'V', 'V', 'ps', this.value)" title="Profundidad Sondaje">
                                        <input type="number" min="-5" max="10" value="${s.V.V.mg}" class="form-control form-control-sm text-center bg-dark text-info border-secondary p-0 mt-1" style="width:36px; height:22px; font-size:0.65rem;" onchange="PeriodontoFisioCid.guardarPuntoSondaje('${diente}', 'V', 'V', 'mg', this.value)" title="Margen Gingival">
                                    </div>
                                    <div>
                                        <span class="micro text-secondary d-block">DV</span>
                                        <input type="number" min="0" max="15" value="${s.V.DV.ps}" class="form-control form-control-sm text-center bg-dark text-warning border-secondary p-0" style="width:36px; height:26px;" onchange="PeriodontoFisioCid.guardarPuntoSondaje('${diente}', 'V', 'DV', 'ps', this.value)" title="Profundidad Sondaje">
                                        <input type="number" min="-5" max="10" value="${s.V.DV.mg}" class="form-control form-control-sm text-center bg-dark text-info border-secondary p-0 mt-1" style="width:36px; height:22px; font-size:0.65rem;" onchange="PeriodontoFisioCid.guardarPuntoSondaje('${diente}', 'V', 'DV', 'mg', this.value)" title="Margen Gingival">
                                    </div>
                                </div>
                            </div>

                            <!-- Cara Palatina / Lingual -->
                            <div class="col-6 ps-2">
                                <span class="fw-bold text-info d-block mb-1">PALATINO / LINGUAL (L)</span>
                                <div class="d-flex justify-content-between gap-1">
                                    <div>
                                        <span class="micro text-secondary d-block">MP</span>
                                        <input type="number" min="0" max="15" value="${s.L.MP.ps}" class="form-control form-control-sm text-center bg-dark text-warning border-secondary p-0" style="width:36px; height:26px;" onchange="PeriodontoFisioCid.guardarPuntoSondaje('${diente}', 'L', 'MP', 'ps', this.value)" title="Profundidad Sondaje">
                                        <input type="number" min="-5" max="10" value="${s.L.MP.mg}" class="form-control form-control-sm text-center bg-dark text-info border-secondary p-0 mt-1" style="width:36px; height:22px; font-size:0.65rem;" onchange="PeriodontoFisioCid.guardarPuntoSondaje('${diente}', 'L', 'MP', 'mg', this.value)" title="Margen Gingival">
                                    </div>
                                    <div>
                                        <span class="micro text-secondary d-block">P</span>
                                        <input type="number" min="0" max="15" value="${s.L.P.ps}" class="form-control form-control-sm text-center bg-dark text-warning border-secondary p-0" style="width:36px; height:26px;" onchange="PeriodontoFisioCid.guardarPuntoSondaje('${diente}', 'L', 'P', 'ps', this.value)" title="Profundidad Sondaje">
                                        <input type="number" min="-5" max="10" value="${s.L.P.mg}" class="form-control form-control-sm text-center bg-dark text-info border-secondary p-0 mt-1" style="width:36px; height:22px; font-size:0.65rem;" onchange="PeriodontoFisioCid.guardarPuntoSondaje('${diente}', 'L', 'P', 'mg', this.value)" title="Margen Gingival">
                                    </div>
                                    <div>
                                        <span class="micro text-secondary d-block">DP</span>
                                        <input type="number" min="0" max="15" value="${s.L.DP.ps}" class="form-control form-control-sm text-center bg-dark text-warning border-secondary p-0" style="width:36px; height:26px;" onchange="PeriodontoFisioCid.guardarPuntoSondaje('${diente}', 'L', 'DP', 'ps', this.value)" title="Profundidad Sondaje">
                                        <input type="number" min="-5" max="10" value="${s.L.DP.mg}" class="form-control form-control-sm text-center bg-dark text-info border-secondary p-0 mt-1" style="width:36px; height:22px; font-size:0.65rem;" onchange="PeriodontoFisioCid.guardarPuntoSondaje('${diente}', 'L', 'DP', 'mg', this.value)" title="Margen Gingival">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- MILLER & GLICKMAN -->
                        <div class="d-flex gap-2 flex-wrap align-items-center pt-2 border-top border-secondary">
                            <span class="text-white fw-bold me-1" style="font-size: 0.7rem;">Movilidad / Sangrado:</span>
                            <button type="button" class="btn btn-sm btn-outline-danger btn-opcion-subescala rounded-pill" style="border-color:#ef4444; color:#fca5a5;" onclick="PeriodontoFisioCid.registrarProcedimientoPieza('Sangrado al Sondaje (+)')">🩸 Sangrado (+)</button>
                            <button type="button" class="btn btn-sm btn-outline-warning btn-opcion-subescala rounded-pill" style="border-color:#eab308; color:#fef08a;" onclick="PeriodontoFisioCid.registrarProcedimientoPieza('Movilidad Miller Grado 1 (<1mm)')">Movilidad G1</button>
                            <button type="button" class="btn btn-sm btn-outline-warning btn-opcion-subescala rounded-pill" style="border-color:#f97316; color:#fed7aa;" onclick="PeriodontoFisioCid.registrarProcedimientoPieza('Movilidad Miller Grado 2 (>1mm)')">Movilidad G2</button>
                            <button type="button" class="btn btn-sm btn-outline-danger btn-opcion-subescala rounded-pill" style="border-color:#dc2626; color:#fca5a5;" onclick="PeriodontoFisioCid.registrarProcedimientoPieza('Movilidad Miller Grado 3 (Intrusión/Extrusión)')">Movilidad G3</button>
                        </div>
                        
                        <div class="d-flex gap-2 flex-wrap align-items-center pt-1 border-top border-secondary">
                            <span class="text-white fw-bold me-1" style="font-size: 0.7rem;">Furca (Glickman):</span>
                            <button type="button" class="btn btn-sm btn-outline-warning btn-opcion-subescala rounded-pill" style="border-color:#eab308; color:#fef08a;" onclick="PeriodontoFisioCid.registrarProcedimientoPieza('Lesión de Furca Glickman Grado I (Incipiente)')">Furca Grado I</button>
                            <button type="button" class="btn btn-sm btn-outline-warning btn-opcion-subescala rounded-pill" style="border-color:#f97316; color:#fed7aa;" onclick="PeriodontoFisioCid.registrarProcedimientoPieza('Lesión de Furca Glickman Grado II (Cul-de-sac)')">Furca Grado II</button>
                            <button type="button" class="btn btn-sm btn-outline-danger btn-opcion-subescala rounded-pill" style="border-color:#ef4444; color:#fca5a5;" onclick="PeriodontoFisioCid.registrarProcedimientoPieza('Lesión de Furca Glickman Grado III (Transfixiante)')">Furca Grado III</button>
                            <button type="button" class="btn btn-sm btn-outline-danger btn-opcion-subescala rounded-pill" style="border-color:#b91c1c; background:#7f1d1d; color:#ffffff;" onclick="PeriodontoFisioCid.registrarProcedimientoPieza('Lesión de Furca Glickman Grado IV (Expuesta/Visible)')">Furca Grado IV</button>
                        </div>
                    </div>`;
                break;

            case 'MALLAMPATI':
                htmlEscala = `
                    <div class="p-2 px-3 rounded-3 mt-3 border border-info shadow-sm d-flex flex-column gap-2" style="background: #1e293b;">
                        <span class="fw-bold text-info" style="font-size: 0.8rem;">👅 Clasificación de Mallampati (Vía Aérea)</span>
                        <div class="d-flex gap-2 flex-wrap align-items-center">
                            <button type="button" class="btn btn-sm btn-outline-light btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('Mallampati', 'Clase I (Visibilidad Completa)')">Clase I (Fácil)</button>
                            <button type="button" class="btn btn-sm btn-outline-light btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('Mallampati', 'Clase II (Visibilidad Parcial Úvula)')">Clase II (Moderada)</button>
                            <button type="button" class="btn btn-sm btn-outline-warning btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('Mallampati', 'Clase III (Solo Paladar Blando)')">Clase III (Difícil)</button>
                            <button type="button" class="btn btn-sm btn-outline-danger btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('Mallampati', 'Clase IV (Solo Paladar Duro)')">Clase IV (Muy Difícil)</button>
                        </div>
                    </div>`;
                break;

            case 'KENNEDY':
                htmlEscala = `
                    <div class="p-2 px-3 rounded-3 mt-3 border border-info shadow-sm d-flex flex-column gap-2" style="background: #1e293b;">
                        <span class="fw-bold text-info" style="font-size: 0.8rem;">👄 Clasificación de Kennedy (Arcadas Edéntulas)</span>
                        <div class="d-flex gap-2 flex-wrap align-items-center">
                            <button type="button" class="btn btn-sm btn-outline-light btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('Kennedy', 'Clase I: Bilateral Posterior')">Clase I (Post. Bilateral)</button>
                            <button type="button" class="btn btn-sm btn-outline-light btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('Kennedy', 'Clase II: Unilateral Posterior')">Clase II (Post. Unilateral)</button>
                            <button type="button" class="btn btn-sm btn-outline-light btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('Kennedy', 'Clase III: Unilateral Remanente')">Clase III (Unilateral Remanente)</button>
                            <button type="button" class="btn btn-sm btn-outline-light btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('Kennedy', 'Clase IV: Anterior Única')">Clase IV (Anterior Única)</button>
                        </div>
                    </div>`;
                break;

            case 'OCLUSION':
                htmlEscala = `
                    <div class="p-2 px-3 rounded-3 mt-3 border border-warning shadow-sm d-flex flex-column gap-2" style="background: #1e293b; border-color: #f59e0b !important;">
                        <span class="fw-bold text-warning" style="font-size: 0.8rem;">😬 Oclusión y Articulación Temporomandibular (ATM / Angle)</span>
                        <div class="d-flex gap-2 flex-wrap align-items-center">
                            <button type="button" class="btn btn-sm btn-outline-success btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('Oclusión', 'Angle Clase I (Normoclusión)')">Angle Clase I</button>
                            <button type="button" class="btn btn-sm btn-outline-warning btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('Oclusión', 'Angle Clase II (Distoclusión)')">Angle Clase II</button>
                            <button type="button" class="btn btn-sm btn-outline-danger btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('Oclusión', 'Angle Clase III (Mesioclusión)')">Angle Clase III</button>
                            <button type="button" class="btn btn-sm btn-outline-info btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('ATM', 'Chasquido/Crépito Articular Presente')">Chasquido ATM</button>
                            <button type="button" class="btn btn-sm btn-outline-danger btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('ATM', 'Bruxismo Severo / Facetas de Desgaste')">Bruxismo / Desgaste</button>
                        </div>
                    </div>`;
                break;

            case 'ENDO':
                htmlEscala = `
                    <div class="p-2 px-3 rounded-3 mt-3 border border-cyan shadow-sm d-flex flex-column gap-2" style="background: #1e293b; border-color: #06b6d4 !important;">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="fw-bold" style="color: #06b6d4; font-size: 0.8rem;">🦷 Endodoncia y Diagnóstico Pulpar</span>
                            <span class="badge bg-info text-dark" style="font-size: 0.7rem;">Pieza Activa: <b id="badge-pieza-activa">${piezaTxt}</b></span>
                        </div>
                        <div class="d-flex gap-2 flex-wrap align-items-center">
                            <button type="button" class="btn btn-sm btn-outline-info btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarProcedimientoPieza('Pulpectomía')">Pulpectomía</button>
                            <button type="button" class="btn btn-sm btn-outline-info btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarProcedimientoPieza('Pulpotomía')">Pulpotomía</button>
                            <button type="button" class="btn btn-sm btn-outline-warning btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarProcedimientoPieza('Tratamiento de Conductos')">Tratamiento Conductos</button>
                            <button type="button" class="btn btn-sm btn-outline-danger btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarProcedimientoPieza('Necropulpectomía')">Necropulpectomía</button>
                            <button type="button" class="btn btn-sm btn-outline-light btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarProcedimientoPieza('Prueba Frío/Calor: Pulpitis Reversible')">Pulpitis Reversible</button>
                            <button type="button" class="btn btn-sm btn-outline-danger btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarProcedimientoPieza('Prueba Frío/Calor: Pulpitis Irreversible')">Pulpitis Irreversible</button>
                        </div>
                    </div>`;
                break;

            case 'CIRUGIA':
                htmlEscala = `
                    <div class="p-2 px-3 rounded-3 mt-3 border border-danger shadow-sm d-flex flex-column gap-2" style="background: #1e293b; border-color: #ef4444 !important;">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="fw-bold text-danger" style="font-size: 0.8rem;">🔪 Cirugía Bucal / Exodoncias</span>
                            <span class="badge bg-danger" style="font-size: 0.7rem;">Pieza Activa: <b id="badge-pieza-activa">${piezaTxt}</b></span>
                        </div>
                        <div class="d-flex gap-2 flex-wrap align-items-center">
                            <button type="button" class="btn btn-sm btn-outline-danger btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarProcedimientoPieza('Exodoncia Simple')">Exodoncia Simple</button>
                            <button type="button" class="btn btn-sm btn-outline-danger btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarProcedimientoPieza('Exodoncia Quirúrgica')">Exodoncia Quirúrgica</button>
                            <button type="button" class="btn btn-sm btn-outline-warning btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarProcedimientoPieza('Cirugía Tercer Molar Retenido')">Tercer Molar Retenido</button>
                        </div>
                    </div>`;
                break;

            case 'GERIATRIA':
                htmlEscala = `
                    <div class="p-2 px-3 rounded-3 mt-3 border border-warning shadow-sm d-flex flex-column gap-2" style="background: #1e293b;">
                        <span class="fw-bold text-warning" style="font-size: 0.8rem;">👴 Evaluaciones Gerotológicas</span>
                        <div class="d-flex gap-2 flex-wrap align-items-center">
                            <button type="button" class="btn btn-sm btn-outline-warning btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('Geriatría', 'Xerostomía / Boca Seca')">Xerostomía</button>
                            <button type="button" class="btn btn-sm btn-outline-warning btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('Geriatría', 'Estomatitis Protésica')">Estomatitis Protésica</button>
                            <button type="button" class="btn btn-sm btn-outline-info btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('Geriatría', 'Prótesis Adaptada')">Prótesis Adaptada</button>
                        </div>
                    </div>`;
                break;

            case 'PEDIA':
                htmlEscala = `
                    <div class="p-2 px-3 rounded-3 mt-3 border border-pink shadow-sm d-flex flex-column gap-2" style="background: #1e293b; border-color: #ec4899 !important;">
                        <span class="fw-bold" style="color: #ec4899; font-size: 0.8rem;">👶 Conducta Odontopediatría (Escala Frankl)</span>
                        <div class="d-flex gap-2 flex-wrap align-items-center">
                            <button type="button" class="btn btn-sm btn-outline-danger btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('Pedia', 'Frankl Tipo 1: Definitivamente Negativo')">Frankl 1 (- -)</button>
                            <button type="button" class="btn btn-sm btn-outline-warning btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('Pedia', 'Frankl Tipo 2: Negativo')">Frankl 2 (-)</button>
                            <button type="button" class="btn btn-sm btn-outline-info btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('Pedia', 'Frankl Tipo 3: Positivo')">Frankl 3 (+)</button>
                            <button type="button" class="btn btn-sm btn-outline-success btn-opcion-subescala rounded-pill" onclick="PeriodontoFisioCid.registrarEscala('Pedia', 'Frankl Tipo 4: Definitivamente Positivo')">Frankl 4 (++ )</button>
                        </div>
                    </div>`;
                break;
        }

        contenedor.innerHTML = htmlEscala;
    }
};

window.PeriodontoFisioCid = PeriodontoFisioCid;