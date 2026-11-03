// ============================================================================
// 🧠 MOTOR FISIOFISIOCID - MODO CLÍNICO LIMPIO Y CONSISTENTE
// ============================================================================

window.FisioFisioCid = (function () {

    let estadoFisio = {
        areaActiva: 'LUMBAR_RAD_001',
        puntajeAcumulado: 0
    };

    const estirarLienzo = () => {
        const modal = document.getElementById('modalFisioFullscreen');
        if (!modal) return;
        modal.style.setProperty('width', '100vw', 'important');
        modal.querySelectorAll('.modal-dialog, .modal-content').forEach(el => {
            el.style.setProperty('width', '100vw', 'important');
            el.style.setProperty('max-width', '100vw', 'important');
            el.style.setProperty('height', '100vh', 'important');
            el.style.setProperty('margin', '0', 'important');
            el.style.setProperty('padding', '0', 'important');
        });
    };

    const seleccionarArea = (areaKey, elementoBtn) => {
        estadoFisio.areaActiva = areaKey;
        estadoFisio.puntajeAcumulado = 0;

        // Limpiar y resetear los botones del menú lateral con diseño claro
        const menuLateral = document.getElementById('menu-lateral-fisio');
        if (menuLateral) {
            menuLateral.querySelectorAll('button').forEach(b => {
                b.classList.remove('active', 'fw-bold', 'shadow-sm');
                b.style.setProperty('background', '#f1f5f9', 'important');
                b.style.setProperty('color', '#334155', 'important');
            });
        }

        // Activar el botón seleccionado con estilo claro sobrio
        if (elementoBtn) {
            elementoBtn.classList.add('active', 'fw-bold', 'shadow-sm');
            elementoBtn.style.setProperty('background', '#e2e8f0', 'important');
            elementoBtn.style.setProperty('color', '#0f172a', 'important');
        }

        renderizarContenidoPanel(areaKey);
        renderizarProtocolos(areaKey);
        estirarLienzo();
    };

    const renderizarContenidoPanel = (areaKey) => {
        const contenedorExp = document.getElementById('contenedor-test-exploracion');
        if (!contenedorExp) return;

        const banco = window.BANCO_ESCALAS && window.BANCO_ESCALAS.FISIOTERAPEUTA ? window.BANCO_ESCALAS.FISIOTERAPEUTA : [];
        const datosZona = banco.find(item => item.id === areaKey) || banco[0];
        if (!datosZona) return;

        let html = '';

        // 1. 🚩 BANDERAS ROJAS (LIMPIO Y CLARO)
        if (datosZona.anamnesis && datosZona.anamnesis.redFlags) {
            html += `
                <div class="p-2.5 mb-3 rounded-2 border border-danger bg-white shadow-sm">
                    <span class="text-danger fw-bold text-uppercase d-block mb-1" style="font-size: 0.72rem;">⚠️ Banderas Rojas (Descartar Urgencias):</span>
                    <div class="d-flex flex-wrap gap-1">`;
            datosZona.anamnesis.redFlags.forEach(rf => {
                html += `<span class="badge border border-danger text-danger py-1 px-2 fw-normal bg-light" style="font-size: 0.65rem; display: inline-block !important; width: auto !important;">${rf}</span>`;
            });
            html += `</div></div>`;
        }

        // 2. SÍNTOMAS PRINCIPALES + BUSCADOR
        html += `
            <div class="p-3 rounded-3 mb-3 border bg-white shadow-sm" style="border-color: #cbd5e1 !important;">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="text-dark small fw-bold text-uppercase" style="font-size: 0.73rem;">🔍 Síntomas Principales (+1 Pt c/u):</span>
                    <span class="text-muted" style="font-size: 0.65rem;">Filtrar con buscador</span>
                </div>
                <input type="text" id="input-buscador-clinico" class="form-control form-control-sm bg-white text-dark border mb-2" placeholder="Escribe para buscar síntoma..." onkeyup="FisioFisioCid.filtrarSintomas(this.value)" style="border-color: #cbd5e1 !important;">
                
                <div id="contenedor-sintomas-filtrados" class="d-flex flex-wrap gap-1.5 align-items-center">`;
        
        if (datosZona.anamnesis && datosZona.anamnesis.sistemas) {
            datosZona.anamnesis.sistemas.forEach(sintoma => {
                html += `<button type="button" class="btn btn-sm border text-dark rounded-pill px-2.5 py-1 sintoma-tag shadow-sm" style="font-size: 0.68rem; background: #f8fafc !important; border-color: #cbd5e1 !important; display: inline-block !important; width: auto !important;" onclick="FisioFisioCid.registrarSintoma('${sintoma}', 1)">+ ${sintoma} (1pt)</button>`;
            });
        }
        html += `</div></div>`;

     // 3. PRUEBAS ORTOPÉDICAS (1 COLUMNA EN CELULAR, 2 EN TABLET, 3 EN LAPTOP)
        if (datosZona.exploracion && datosZona.exploracion.pruebasOrtopedicas) {
            datosZona.exploracion.pruebasOrtopedicas.forEach(cat => {
                html += `<div class="mb-3"><span class="text-dark small fw-bold d-block mb-2" style="font-size: 0.73rem;">📋 ${cat.categoria}:</span><div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-2">`;
                cat.items.forEach(test => {
                    const nombreTest = test.name || test.nombre;
                    html += `
                        <div class="col">
                            <div class="rounded-2 p-2 border bg-white shadow-sm d-flex flex-column justify-content-between h-100" style="border-color: #cbd5e1 !important;">
                                <div class="mb-1.5">
                                    <strong class="text-dark d-block text-truncate" style="font-size: 0.72rem;" title="${nombreTest}">${nombreTest}</strong>
                                    <span class="text-secondary d-block" style="font-size: 0.63rem; line-height: 1.15; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${test.tecnica}">${test.tecnica}</span>
                                </div>
                                <div class="d-flex gap-1 mt-1 pt-1 border-top" style="border-color: #e2e8f0 !important;">
                            <button type="button" class="btn btn-sm btn-outline-success py-0 px-1" style="font-size: 0.62rem; width: 50% !important; display: inline-block !important;" onclick="FisioFisioCid.registrarPrueba('${nombreTest}', '${test.tecnica}', true)">(+) Pos (2pts)</button>
                                    <button type="button" class="btn btn-sm btn-outline-danger py-0 px-1" style="font-size: 0.62rem; width: 50% !important; display: inline-block !important;" onclick="FisioFisioCid.registrarPrueba('${nombreTest}', '${test.tecnica}', false)">(-) Neg</button>
                                     </div>
                            </div>
                        </div>`;
                });
                html += `</div></div>`;
            });
        }

        // 4. CUADRO DE HALLAZGOS EDITABLE + PUNTUACIÓN
        html += `
            <div class="mt-3 p-3 rounded-3 border bg-white shadow-sm" style="border-color: #cbd5e1 !important;">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <span class="text-dark fw-bold text-uppercase" style="font-size: 0.72rem;">📝 Cuadro de Hallazgos Editable en Vivo</span>
                        <span class="badge bg-warning text-dark ms-2" id="badge-puntaje-clinico" style="font-size: 0.68rem;">Puntaje Severidad: 0 Pts</span>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" style="font-size: 0.63rem; width: auto !important; display: inline-block !important;" onclick="FisioFisioCid.limpiarHallazgosEnVivo()">Limpiar</button>
                </div>
                
                <textarea id="textarea-hallazgos-en-vivo" class="form-control bg-light text-dark border mb-2" rows="4" style="font-size: 0.75rem; line-height: 1.4; border-color: #cbd5e1 !important;" placeholder="Aquí puedes escribir, editar o agregar notas libremente..."></textarea>

                <div class="p-2 rounded border bg-light" style="border-color: #cbd5e1 !important;">
                    <span class="text-primary fw-bold d-block mb-1" style="font-size: 0.68rem;">💡 Probable Hipótesis Funcional (Puntuada):</span>
                    <div id="caja-hipotesis-sugerida" class="text-dark small" style="font-size: 0.68rem;">
                        <em>Acumula al menos 2 puntos en síntomas o tests para sugerir hipótesis.</em>
                    </div>
                </div>
            </div>`;

        // 5. GABINETE SUGERIDO
        if (datosZona.gabinete_sugerido) {
            html += `
                <div class="mt-3 p-2.5 rounded-3 border bg-light text-secondary" style="border-color: #cbd5e1 !important; font-size: 0.7rem;">
                    <strong class="text-dark">💡 Gabinete Sugerido de Apoyo:</strong><br>`;
            for (let tipo in datosZona.gabinete_sugerido) {
                html += `<span><strong>${tipo}:</strong> ${datosZona.gabinete_sugerido[tipo].join(', ')}</span><br>`;
            }
            html += `</div>`;
        }

        contenedorExp.innerHTML = html;
    };

    const renderizarProtocolos = (areaKey) => {
        const contenedorTrat = document.getElementById('contenedor-ejercicios-tratamiento');
        if (!contenedorTrat) return;

        let claveProt = 'LUMBAR';
        if (areaKey.includes('CERVICAL')) claveProt = 'CERVICAL';
        if (areaKey.includes('CODO')) claveProt = 'CODO_MANO';
        if (areaKey.includes('CADERA')) claveProt = 'CADERA';
        if (areaKey.includes('RODILLA')) claveProt = 'RODILLA';
        if (areaKey.includes('TOBILLO')) claveProt = 'TOBILLO';

        const dataProt = window.PROTOCOLOS_FISIO && window.PROTOCOLOS_FISIO[claveProt] ? window.PROTOCOLOS_FISIO[claveProt] : {};
        const protocolos = dataProt.ejercicios || [];

        let html = `<div class="d-flex flex-column gap-3">`;
        
        html += `
            <div class="p-3 rounded-3 border bg-white shadow-sm mb-2" style="border-color: #cbd5e1 !important;">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="text-dark fw-bold text-uppercase" style="font-size: 0.72rem;">📋 Propuesta de Tratamiento Editable</span>
                    <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" style="font-size: 0.63rem; width: auto !important; display: inline-block !important;" onclick="FisioFisioCid.limpiarTratamientoEnVivo()">Limpiar</button>
                </div>
                
                <textarea id="textarea-tratamiento-en-vivo" class="form-control bg-light text-dark border" rows="4" style="font-size: 0.75rem; line-height: 1.4; border-color: #cbd5e1 !important;" placeholder="Aquí puedes editar o agregar ejercicios al plan..."></textarea>
            </div>`;

        protocolos.forEach(fase => {
            html += `
                <div class="p-2.5 rounded-2 border bg-white shadow-sm" style="border-color: #cbd5e1 !important;">
                    <span class="text-dark fw-bold d-block mb-1.5" style="font-size: 0.72rem;">📂 ${fase.categoria}</span>
                    <div class="d-flex flex-column gap-1.5">`;
            fase.items.forEach(ej => {
                html += `
                    <div class="d-flex justify-content-between align-items-center p-2 rounded border bg-light" style="border-color: #e2e8f0 !important;">
                        <div style="font-size: 0.7rem; padding-right: 8px;">
                            <strong class="text-dark">${ej.nombre}</strong> - <span class="text-secondary">${ej.desc}</span>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-primary py-1 px-2 text-nowrap" style="font-size: 0.65rem; width: auto !important; display: inline-block !important; height: auto !important;" onclick="FisioFisioCid.agregarTratamientoEnVivo('${ej.nombre}: ${ej.desc}')">Pichar</button>
                    </div>`;
            });
            html += `</div></div>`;
        });

        html += `
            <div class="mt-3 p-2.5 rounded text-center text-secondary border bg-light" style="border-color: #cbd5e1 !important; font-size: 0.63rem; line-height: 1.3;">
                <em><strong>Aviso Legal / Disclaimer:</strong> FISIOCID es un software de apoyo diseñado exclusivamente para mejorar el flujo de trabajo clínico y el control administrativo del expediente. No reemplaza el juicio clínico profesional ni propone tratamientos por sí solo; el uso, aplicación y distribución de la información es absoluta responsabilidad de quien lo utiliza.</em>
            </div>`;

        html += `</div>`;
        contenedorTrat.innerHTML = html;
    };

    const filtrarSintomas = (textoFiltro) => {
        const filtro = textoFiltro.toLowerCase();
        const botones = document.querySelectorAll('.sintoma-tag');
        botones.forEach(btn => {
            const texto = btn.innerText.toLowerCase();
            btn.style.display = texto.includes(filtro) ? 'inline-block' : 'none';
        });
    };

    const registrarSintoma = (sintoma, puntos) => {
        const textarea = document.getElementById('textarea-hallazgos-en-vivo');
        if (!textarea) return;

        const linea = `• Síntoma: ${sintoma} (+${puntos}pt)`;
        textarea.value = textarea.value.trim() ? `${textarea.value.trim()}\n${linea}` : linea;
        
        estadoFisio.puntajeAcumulado += puntos;
        actualizarPuntajeVisual();
        actualizarHipotesisSugerida();
    };

    const registrarPrueba = (nombre, tecnica, esPositivo) => {
        const textarea = document.getElementById('textarea-hallazgos-en-vivo');
        if (!textarea) return;

        const polaridad = esPositivo ? "(+ Positivo)" : "(- Negativo)";
        const linea = `• Prueba ${nombre} ${polaridad}: ${tecnica}`;
        
        textarea.value = textarea.value.trim() ? `${textarea.value.trim()}\n${linea}` : linea;
        
        if (esPositivo) {
            estadoFisio.puntajeAcumulado += 2;
        }

        actualizarPuntajeVisual();
        actualizarHipotesisSugerida();
    };

    const limpiarHallazgosEnVivo = () => {
        const textarea = document.getElementById('textarea-hallazgos-en-vivo');
        if (textarea) textarea.value = '';
        estadoFisio.puntajeAcumulado = 0;
        actualizarPuntajeVisual();
        actualizarHipotesisSugerida();
    };

    const actualizarPuntajeVisual = () => {
        const badge = document.getElementById('badge-puntaje-clinico');
        if (badge) badge.innerText = `Puntaje Severidad: ${estadoFisio.puntajeAcumulado} Pts`;
    };

   const actualizarHipotesisSugerida = () => {
        const cajaHipotesis = document.getElementById('caja-hipotesis-sugerida');
        const textarea = document.getElementById('textarea-hallazgos-en-vivo');
        if (!cajaHipotesis || !textarea) return;

        let claveProt = 'LUMBAR';
        if (estadoFisio.areaActiva.includes('CERVICAL')) claveProt = 'CERVICAL';
        if (estadoFisio.areaActiva.includes('CODO')) claveProt = 'CODO_MANO';
        if (estadoFisio.areaActiva.includes('CADERA')) claveProt = 'CADERA';
        if (estadoFisio.areaActiva.includes('RODILLA')) claveProt = 'RODILLA';
        if (estadoFisio.areaActiva.includes('TOBILLO')) claveProt = 'TOBILLO';

        const dataProt = window.PROTOCOLOS_FISIO && window.PROTOCOLOS_FISIO[claveProt] ? window.PROTOCOLOS_FISIO[claveProt] : {};
        const listaHipotesis = dataProt.hipotesisSugeridas || [];

        const hallazgosTexto = textarea.value;
        
        // Filtra considerando la prueba positiva Y que el puntaje acumulado alcance el mínimo requerido por la hipótesis
        const coincidencias = listaHipotesis.filter(h => {
            const tienePrueba = hallazgosTexto.includes(h.testClave) && hallazgosTexto.includes('(+ Positivo)');
            const cumplePuntaje = estadoFisio.puntajeAcumulado >= (h.puntosMinimos || 2);
            return tienePrueba && cumplePuntaje;
        });

        if (coincidencias.length === 0 || estadoFisio.puntajeAcumulado < 2) {
            cajaHipotesis.innerHTML = `<em>Acumula al menos 2 puntos y marca test(s) positivos para sugerir hipótesis funcionales.</em>`;
            return;
        }

        let htmlHipotesis = '<ul class="mb-0 ps-3 text-primary">';
        coincidencias.forEach(c => {
            htmlHipotesis += `<li><strong>Nivel (${estadoFisio.puntajeAcumulado} Pts):</strong> ${c.texto}</li>`;
        });
        htmlHipotesis += '</ul>';
        cajaHipotesis.innerHTML = htmlHipotesis;
    };

    const finalizarEscala = () => {
        const textareaExp = document.getElementById('exploracion');
        const textareaTrat = document.getElementById('plan_tratamiento');
        const textareaHallazgosEnVivo = document.getElementById('textarea-hallazgos-en-vivo');
        const textareaTratEnVivo = document.getElementById('textarea-tratamiento-en-vivo');

        let contenidoExp = '';
        let contenidoTrat = '';

        if (textareaHallazgosEnVivo && textareaHallazgosEnVivo.value.trim()) {
            contenidoExp += textareaHallazgosEnVivo.value.trim();
        }
        contenidoExp += `\n• [Puntaje de Severidad Clínica]: ${estadoFisio.puntajeAcumulado} Puntos`;

        const cajaHipotesis = document.getElementById('caja-hipotesis-sugerida');
        if (cajaHipotesis && !cajaHipotesis.innerHTML.includes('Acumula al menos')) {
            contenidoExp += `\n• [Hipótesis Funcional Sugerida]: ${cajaHipotesis.innerText.replace(/Nivel \(\d+ Pts\):/g, '').trim()}`;
        }

        if (textareaExp && contenidoExp) {
            const actual = textareaExp.value.trim();
            textareaExp.value = actual ? `${actual}\n• ${contenidoExp}` : `=== 🛠️ VALORACIÓN FISIOTERAPÉUTICA ===\n• ${contenidoExp}`;
            textareaExp.dispatchEvent(new Event('input', { bubbles: true }));
        }

        if (textareaTratEnVivo && textareaTratEnVivo.value.trim()) {
            contenidoTrat = textareaTratEnVivo.value.trim();
            if (textareaTrat) {
                const actualTrat = textareaTrat.value.trim();
                textareaTrat.value = actualTrat ? `${actualTrat}\n• ${contenidoTrat}` : `=== 📋 PROPUESTA DE TRATAMIENTO ===\n• ${contenidoTrat}`;
                textareaTrat.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        limpiarHallazgosEnVivo();
        limpiarTratamientoEnVivo();

        const modalEl = document.getElementById('modalFisioFullscreen');
        if (modalEl && window.bootstrap) {
            const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
        }

        alert('¡Evaluación y propuesta de tratamiento integradas con éxito al expediente!');
    };

    const agregarTratamientoEnVivo = (texto) => {
        const textarea = document.getElementById('textarea-tratamiento-en-vivo');
        if (!textarea) return;
        const linea = `• ${texto}`;
        textarea.value = textarea.value.trim() ? `${textarea.value.trim()}\n${linea}` : linea;
    };

    const limpiarTratamientoEnVivo = () => {
        const textarea = document.getElementById('textarea-tratamiento-en-vivo');
        if (textarea) textarea.value = '';
    };

    return {
        seleccionarArea,
        filtrarSintomas,
        registrarSintoma,
        registrarPrueba,
        limpiarHallazgosEnVivo,
        agregarTratamientoEnVivo,
        limpiarTratamientoEnVivo,
        finalizarEscala,
        estirarLienzo
    };
})();