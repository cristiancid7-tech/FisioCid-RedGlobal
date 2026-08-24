window.estudiosCargadosLista = []; 
window.cacheEstudiosGabineteLista = [];
window.imagenACompararActiva = null; 

window.modalEngine = {
     cacheEstudiosGabinete: [],
    imagenAComparar: null,
    misHerramientas: {
        diatermia: true,
        laserClase4: true,
        ondasChoque: true,
        ultrasonido: true,
        tens: true,
        puncionSeca: true,
    },
    datosTemporales: [],
    diagnosticosActivos: [], 

    buscarProtocolo: function() {
        const biblioteca = window.BIBLIOTECA_PROTOCOLOS || null;
        if (!biblioteca) return null;
        const motivo = document.getElementById('motivo')?.value.toLowerCase() || "";
        const lista = biblioteca.fisioterapia || [];
        const p = lista.find(proto => proto.triggers.some(t => motivo.includes(t)));
        return p || lista[0];
    },
    
abrirAsistente: function(paso) {
    this.pasoActual = paso;
    const p = this.buscarProtocolo();
    
    // 🚩 1. SINCRONIZAR EL EVA DESDE EL SLIDER (Radar Todoterreno)
    const sliderPrincipal = document.getElementById('valEva') || document.getElementById('eva_slider');
    if (sliderPrincipal) {
        window.FisioCidEngine.valorDolorEVA = parseInt(sliderPrincipal.value) || 0;
    }

    const existente = document.getElementById('modal-cid-universal');
    if (existente) existente.remove();

    const titulos = {
        anamnesis: "APOYO DE SÍNTOMAS",
        exploracion: "ASISTENTE DE EXPLORACIÓN",
        plan: "APOYO PLAN DE TRATAMIENTO",
        ejercicios: "EJERCICIOS EN CASA (TAREA)"
    };

    const overlay = document.createElement('div');
    overlay.id = 'modal-cid-universal';
    overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 9999;`;

    overlay.innerHTML = `
        <div style="background: white; width: 95%; max-width: 1300px; border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; max-height: 95vh; border: 2px solid #d4af37;">
            <div style="background: #1e293b; color: white; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #d4af37;">
                <h3 style="margin: 0; font-size: 1rem; font-weight: 800;">🛠️ ${titulos[paso]} | ${p.titulo}</h3>
                <button onclick="document.getElementById('modal-cid-universal').remove()" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">✕</button>
            </div>
            <div style="padding: 20px; flex: 1; overflow: hidden; background: #f8fafc;">
                ${this.generarInterfaz(paso, p)}
            </div>
            <div style="padding: 15px; background: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: right;">
                <button onclick="modalEngine.integrarFinal('${paso}')" style="background: #d4af37; color: black; border: none; padding: 12px 30px; border-radius: 10px; font-weight: 900; cursor: pointer;">✅ INTEGRAR A EXPEDIENTE</button>
            </div>
        </div>`;

    document.body.appendChild(overlay);

    // 🚩 2. EL TRUCO DEL RELOJ: Esperamos 50ms para que el DOM se asiente
    setTimeout(() => {
        console.log("🎨 Pintando memoria en el panel...");
        if (typeof this.actualizarPanelDiagnostico === 'function') {
            this.actualizarPanelDiagnostico();
        }
    }, 50);
},

generarInterfaz: function(paso, p) {
   if (paso === 'anamnesis') {
        const sintomas = p.anamnesis?.sintomas || [];
        const redFlags = p.anamnesis?.redFlags || [];
        
        const bolsaGlobal = window.FisioCidEngine.datosTemporales || [];

        return `
            <div style="display: flex; flex-direction: column; height: 100%; max-height: 85vh;">
                <div style="display: grid; grid-template-columns: 2.8fr 1.2fr; gap: 8px; flex: 1; overflow-y: auto; padding: 10px;">
                    
                    <div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;">
                            ${sintomas.map(item => {
                                const yaDetectado = bolsaGlobal.includes(item);
                                const bg = yaDetectado ? "#0369a1" : "#f0f9ff";
                                const color = yaDetectado ? "#ffffff" : "#0369a1";
                                const border = yaDetectado ? "2px solid #0ea5e9" : "1px solid #bae6fd";
                                const peso = yaDetectado ? "900" : "700";

                                return `
                                    <button onclick="modalEngine.clicTag('${item}', this)" 
                                        style="padding: 2px; border-radius: 6px; font-size: 0.55rem; height: 50px; cursor: pointer; display: flex; align-items: center; justify-content: center; text-align: center; line-height: 1.1; transition: 0.2s; background: ${bg}; color: ${color}; border: ${border}; font-weight: ${peso};">
                                        ${yaDetectado ? '✅<br>' : ''}${item}
                                    </button>`;
                            }).join('')}
                        </div>
                    </div>

                    <div style="border-left: 2px dashed #fee2e2; padding-left: 8px;">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            ${redFlags.map(item => {
                                const yaDetectado = bolsaGlobal.includes(item);
                                const bgR = yaDetectado ? "#991b1b" : "#fee2e2";
                                const colorR = yaDetectado ? "#ffffff" : "#991b1b";
                                
                                // 🔥 EL EFECTO GLOW: Si está detectado, prende un "foco rojo" neón alrededor
                                const glowRojo = yaDetectado ? "box-shadow: 0 0 15px 3px rgba(239, 68, 68, 0.8);" : "";

                                return `
                                    <button onclick="modalEngine.clicTag('${item}', this)" 
                                        style="padding: 4px; border-radius: 4px; font-weight: 800; font-size: 0.52rem; cursor: pointer; text-align: left; line-height: 1.1; background: ${bgR}; color: ${colorR}; border: 1px solid #ef4444; transition: all 0.3s ease; ${glowRojo}">
                                        ${yaDetectado ? '🚨 ' : '🚩 '}${item}
                                    </button>`;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>`;
    }

if (paso === 'exploracion') {
    const neurologia = p.exploracion?.neurologia || {};
    const sensibilidad = neurologia.sensibilidad || [];
    const fuerza = neurologia.fuerza || [];
    const reflejos = neurologia.reflejos || [];
    const escalas = p.exploracion?.escalas || [];
    const pruebas = p.exploracion?.pruebasOrtopedicas || [];

    // 🚩 UNIFICACIÓN: Aplanamos todas las categorías en una sola lista de exámenes
    const todosLosExamenes = pruebas.flatMap(p => p.items);

    return `
    <div style="display: flex; gap: 10px; height: 75vh; overflow: hidden; background: #f1f5f9;">
        
        <div style="flex: 0.7; display: flex; flex-direction: column; gap: 8px;">
            <div style="background: #1e293b; color: white; padding: 12px; border-radius: 12px; height: 110px; border-bottom: 4px solid #d4af37;">
                <h4 style="color: #d4af37; font-size: 0.6rem; margin-bottom: 5px; font-weight: 900;">📖 GUÍA TÉCNICA</h4>
                <div id="guia-texto" style="font-size: 0.7rem; line-height: 1.2; color: #cbd5e1;">Pasa el mouse para técnica...</div>
            </div>
            
            <div style="flex: 1; background: #0f172a; border-radius: 12px; border: 2px solid #334155; display:flex; flex-direction:column; overflow: hidden;">
                <div style="background:#1e293b; color:#d4af37; padding:6px; font-size:0.6rem; text-align:center; font-weight:900;">📊 RESUMEN CLÍNICO</div>
                <div id="panel-hallazgos-resumen" style="padding:8px; overflow-y:auto; border-bottom:1px solid #334155; max-height: 180px; background: rgba(255,255,255,0.02);"></div>
                <div id="caja-diagnostico" style="padding:10px; overflow-y:auto; flex:1; background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);"></div>
            </div>
        </div>

        <div id="scroll-evaluacion" style="flex: 1.3; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; gap: 8px; max-height: 75vh; padding-bottom: 80px;">
            
            <div style="background:white; padding:10px; border-radius:12px; border:1px solid #e2e8f0;">
                <span style="font-size: 0.6rem; font-weight: 900; color: #0369a1; text-transform: uppercase;">⚡ Sensibilidad</span>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 5px;">
                    ${sensibilidad.map(d => {
                        const yaSel = FisioCidEngine.datosTemporales.includes(`SENS ${d.nivel}`);
                        return `<button onmouseover="document.getElementById('guia-texto').innerText='Dermatoma ${d.nivel}: ${d.zona}'" onclick="modalEngine.clicTag('SENS ${d.nivel}', this)" style="padding:4px; border-radius:6px; font-weight:800; font-size:0.6rem; border:1px solid #bae6fd; background:${yaSel ? '#0369a1':'#f0f9ff'}; color:${yaSel ? 'white':'#0369a1'};">${d.nivel}</button>`;
                    }).join('')}
                </div>
            </div>

            <div style="background:white; padding:10px; border-radius:12px; border:1px solid #e2e8f0;">
                <span style="font-size: 0.6rem; font-weight: 900; color: #166534; text-transform: uppercase;">💪 Fuerza</span>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 5px;">
                    ${fuerza.map(f => {
                        const yaSel = FisioCidEngine.datosTemporales.includes(`Fuerza ${f.miotoma}`);
                        return `<button onmouseover="document.getElementById('guia-texto').innerText='Miotoma ${f.miotoma}: ${f.accion}'" onclick="modalEngine.clicTag('Fuerza ${f.miotoma}', this)" style="padding:4px; border-radius:6px; font-weight:800; font-size:0.6rem; border:1px solid #bcf0da; background:${yaSel ? '#166534':'#f0fdf4'}; color:${yaSel ? 'white':'#166534'};">${f.miotoma}</button>`;
                    }).join('')}
                </div>
            </div>

            <div style="background:white; padding:10px; border-radius:12px; border:1px solid #e2e8f0;">
                <span style="font-size: 0.6rem; font-weight: 900; color: #991b1b; text-transform: uppercase;">🦴 Reflejos</span>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 5px;">
                    ${reflejos.map(r => {
                        const yaSel = FisioCidEngine.datosTemporales.includes(`ROT ${r.rot}`);
                        return `<button onmouseover="document.getElementById('guia-texto').innerText='Reflejo ${r.nombre} (Nivel ${r.nivel})'" onclick="modalEngine.clicTag('ROT ${r.rot}', this)" style="padding:5px; border-radius:6px; font-weight:800; font-size:0.55rem; border:1px solid #fecaca; background:${yaSel ? '#991b1b':'#fef2f2'}; color:${yaSel ? 'white':'#991b1b'}; text-align: left;">${r.rot}: ${r.nombre}</button>`;
                    }).join('')}
                </div>
            </div>

            <div style="background:white; padding:10px; border-radius:12px; border:1px solid #e2e8f0;">
                <span style="font-size: 0.6rem; font-weight: 900; color: #6d28d9; text-transform: uppercase;">📝 Escalas</span>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 5px;">
                    ${escalas.map(e => `
                        <button onclick="FisioCidEngine.lanzarCuestionario('${e.id}', '${e.nombre}')" style="padding:6px; border-radius:6px; font-weight:700; font-size:0.52rem; background:#f5f3ff; color:#6d28d9; border:1px solid #ddd6fe; text-align:left;">📋 ${e.nombre.toUpperCase()}</button>
                    `).join('')}
                </div>
            </div>

            <div style="background:white; padding:10px; border-radius:12px; border:1px solid #e2e8f0;">
                <span style="font-size: 0.65rem; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: 1px;">🧪 EXÁMENES ORTOPÉDICOS</span>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px;">
                    ${todosLosExamenes.map(i => {
                        const pos = FisioCidEngine.datosTemporales.includes(`${i.nombre} (+)`);
                        const neg = FisioCidEngine.datosTemporales.includes(`${i.nombre} (-)`);
                        
                        // 🛡️ ESCUDO: Escapamos las comillas simples para que no rompan el HTML
                        const nEscaped = i.nombre.replace(/'/g, "\\'");
                        const tEscaped = i.tecnica.replace(/'/g, "\\'");

                        return `
                        <div onmouseover="document.getElementById('guia-texto').innerText='${tEscaped}'" 
                             style="display:flex; justify-content:space-between; align-items:center; padding: 4px 8px; border-radius: 8px; border: 1px solid #f1f5f9; background:#f8fafc;">
                            <span style="font-size: 0.55rem; font-weight: 800; color: #334155; line-height: 1.1; max-width: 60%;">${i.nombre}</span>
                            <div style="display:flex; gap:3px;">
                                <button onclick="modalEngine.clicTag('${nEscaped} (+)', this)" style="padding:3px 6px; border-radius:4px; font-weight:bold; font-size:0.45rem; background:${pos ? '#166534':'#dcfce7'}; color:${pos ? 'white':'#166534'}; border:1px solid #86efac;">POS</button>
                                <button onclick="modalEngine.clicTag('${nEscaped} (-)', this)" style="padding:3px 6px; border-radius:4px; font-weight:bold; font-size:0.45rem; background:${neg ? '#991b1b':'#fee2e2'}; color:${neg ? 'white':'#991b1b'}; border:1px solid #fca5a5;">NEG</button>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>
    </div>`;
}

    if (paso === 'plan' || paso === 'ejercicios') {
        const objetivos = p.planTratamiento?.objetivos || [];
        const sugerenciaIA = this.generarPlanInteligente();

        const getEstiloBoton = (texto, listaIA, colorBase, borderBase, colorTexto, prefijo) => {
            const yaSeleccionado = FisioCidEngine.datosTemporales.includes(`${prefijo}: ${texto}`);
            if (yaSeleccionado) return `background: #1e293b; border: 2px solid #d4af37; color: white;`;
            
            const esRecomendado = listaIA.some(s => texto.toLowerCase().includes(s.toLowerCase()));
            if (esRecomendado) return `background: #fef08a; border: 2px solid #eab308; color: #854d0e;`;
            
            return `background: ${colorBase}; border: 1px solid ${borderBase}; color: ${colorTexto};`;
        };

        return `
            <div style="display: flex; flex-direction: column; height: 100%;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; flex: 1; overflow-y: auto; padding: 15px;">
                    <div style="background: #f8fafc; padding: 12px; border-radius: 15px; border: 1px solid #e2e8f0;">
                        <h4 style="font-size:0.6rem; color:#64748b; font-weight:900; margin-bottom:10px;">🎯 OBJETIVOS</h4>
                        ${objetivos.map(item => {
                            const estilo = getEstiloBoton(item, sugerenciaIA.objetivos, '#eef2ff', '#c7d2fe', '#4338ca', 'OBJ');
                            return `<button onclick="modalEngine.clicTag('OBJ: ${item}', this)" style="padding:12px; border-radius:10px; font-weight:800; font-size:0.72rem; cursor:pointer; text-align:left; margin-bottom:8px; width:100%; ${estilo}">📌 ${item}</button>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;
    
}
if (paso === 'gabinete') {
    return `
    <div style="display: flex; gap: 10px; height: 75vh; overflow: hidden; background: #f1f5f9; padding: 10px;">
        
        <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
            <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; flex: 1; display: flex; flex-direction: column;">
                <span style="font-size: 0.7rem; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: 1px;">📸 ESTUDIOS DE IMAGEN</span>
                
                <div style="margin-top: 10px; display: flex; gap: 5px;">
                    <button class="btn-tipo-estudio">RX</button>
                    <button class="btn-tipo-estudio">RMN</button>
                    <button class="btn-tipo-estudio">USG (Eco)</button>
                </div>

                <div style="margin-top: 15px;">
                    <p style="font-size: 0.6rem; font-weight: 800; color: #64748b; margin-bottom: 5px;">HALLAZGOS CLAVE (Toca para marcar):</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;" id="grid-hallazgos-img">
                        ${['Deshidratación Discal', 'Protrusión', 'Extrusión', 'Listesis', 'Estenosis Canal'].map(h => `
                            <button onclick="modalEngine.clicTag('${h}', this)" style="padding:6px; border-radius:6px; font-size:0.55rem; font-weight:700; border:1px solid #cbd5e1; background:#f8fafc; text-align:left;">+ ${h}</button>
                        `).join('')}
                    </div>
                </div>

                <textarea placeholder="Impresión diagnóstica personal..." style="margin-top: 15px; flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; font-size: 0.7rem; resize: none;"></textarea>
            </div>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
            <div style="background: #0f172a; padding: 15px; border-radius: 12px; border: 1px solid #334155; flex: 1; color: white;">
                <span style="font-size: 0.7rem; font-weight: 900; color: #d4af37; text-transform: uppercase; letter-spacing: 1px;">🧪 LABORATORIO CLÍNICO</span>
                
                <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:8px; border-radius:8px;">
                        <span style="font-size:0.65rem;">Glucosa (mg/dL)</span>
                        <input type="number" placeholder="--" style="width:60px; background:#0f172a; color:white; border:1px solid #334155; border-radius:4px; text-align:center; font-size:0.7rem;">
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:8px; border-radius:8px;">
                        <span style="font-size:0.65rem;">Ácido Úrico (mg/dL)</span>
                        <input type="number" placeholder="--" style="width:60px; background:#0f172a; color:white; border:1px solid #334155; border-radius:4px; text-align:center; font-size:0.7rem;">
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:8px; border-radius:8px;">
                        <span style="font-size:0.65rem;">Proteína C Reactiva (PCR)</span>
                        <input type="number" placeholder="--" style="width:60px; background:#0f172a; color:white; border:1px solid #334155; border-radius:4px; text-align:center; font-size:0.7rem;">
                    </div>
                </div>

                <div style="margin-top: 20px; padding: 10px; background: rgba(212, 175, 55, 0.1); border-radius: 8px; border: 1px dashed #d4af37;">
                    <p style="font-size: 0.6rem; color: #d4af37; line-height: 1.2;">
                        💡 <b>Tip de Interpretación:</b> Valores elevados de PCR junto con dolor articular bilateral pueden sugerir un proceso sistémico/reumático.
                    </p>
                </div>
            </div>
        </div>
    </div>`;
    }
    },

    

  

clicTag: function(valor, btn) {
    // 1. Guardar posición del scroll para evitar el salto
    const cont = document.getElementById('scroll-evaluacion');
    const scrollPos = cont ? cont.scrollTop : 0;

    // 2. Lógica de Toggle (Cerebro de FisioCid)
    if (FisioCidEngine.datosTemporales.includes(valor)) {
        FisioCidEngine.datosTemporales = FisioCidEngine.datosTemporales.filter(t => t !== valor);
    } else {
        FisioCidEngine.datosTemporales.push(valor);
    }

    // 3. Refrescar Interfaz (Dibujamos el modal de nuevo)
    this.abrirAsistente(this.pasoActual);

    // 4. Sincronización de salida (Aquí ocurre la magia)
    setTimeout(() => {
        // Restauramos el scroll exacto
        const nuevoCont = document.getElementById('scroll-evaluacion');
        if (nuevoCont) nuevoCont.scrollTop = scrollPos;
        
        // Renderizamos los botones dorados (Tags)
        this.renderizarTagsResumen();

        // 🧠 CONEXIÓN DEL MOTOR: Pintamos el diagnóstico diferencial
        const cajaRecienCreada = document.getElementById('caja-diagnostico');
        if (cajaRecienCreada) {
            const analisis = FisioCidEngine.analizarPatrones(FisioCidEngine.datosTemporales);
            cajaRecienCreada.innerHTML = analisis;
            console.log("🎨 Motor FisioCid: Diagnóstico actualizado en panel.");
        }
    }, 50); // 50ms son el tiempo perfecto de espera
},

actualizarPanelDiagnostico: function() {
    const contenedor = document.getElementById('panel-hallazgos-resumen');
    
    if (!contenedor) {
        if (!this.intentos) this.intentos = 0;
        if (this.intentos < 5) {
            this.intentos++;
            setTimeout(() => this.actualizarPanelDiagnostico(), 100);
        }
        return; 
    }
    this.intentos = 0;

    // 🚩 EL RADAR DE EVA: Forzamos la lectura del slider de la página principal
    const sliderPrincipal = document.getElementById('eva_slider');
    if (sliderPrincipal) {
        const valorActual = parseInt(sliderPrincipal.value) || 0;
        window.FisioCidEngine.valorDolorEVA = valorActual; // Se lo guardamos al cerebro
        console.log("📡 [Radar EVA]: Valor leído correctamente ->", valorActual);
    } else {
        console.warn("⚠️ [Radar EVA]: No encuentro el ID 'eva_slider' en tu HTML.");
    }

    // 🚩 ACCESO SÚPER SEGURO A LOS DATOS
    const motor = window.FisioCidEngine || {};
    const datosRaw = motor.datosTemporales || [];
    
    // Si datosTemporales es un array lo usamos directo, si es objeto usamos .hallazgos
    const hallazgos = Array.isArray(datosRaw) ? datosRaw : (datosRaw.hallazgos || []);
    
    // El "eva" ahora tomará la prioridad del motor que el radar acaba de actualizar
    const eva = motor.valorDolorEVA || 0; 

    let html = "";

    // 1. Pintar EVA
    if (eva > 0) {
        html += `
            <div style="background:#ef4444; color:white; padding:8px; border-radius:8px; margin-bottom:10px; font-weight:900; text-align:center; border: 2px solid white; font-size:0.7rem; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                🔥 DOLOR ACTUAL (EVA): ${eva}/10
            </div>`;
    }

    // 2. Pintar Hallazgos (Botones amarillos)
    if (hallazgos.length > 0) {
        // Limpiamos duplicados por si acaso
        const unicos = [...new Set(hallazgos)];
        unicos.forEach(h => {
            html += `
                <div style="background:#fef08a; color:#854d0e; padding:5px 10px; border-radius:8px; margin-bottom:5px; font-size:0.65rem; font-weight:bold; border-left:4px solid #ca8a04; display:flex; justify-content:space-between; align-items:center;">
                    <span>${h}</span>
                    <span onclick="modalEngine.clicTag('${h}')" style="cursor:pointer; color:red; font-weight:900; margin-left:8px;">✕</span>
                </div>`;
        });
    } else if (eva === 0) {
        html += '<p style="color:#64748b; text-align:center; font-size:0.65rem; margin-top:20px;">Esperando hallazgos...</p>';
    }

    contenedor.innerHTML = html;

    // 3. Actualizar Diagnóstico Diferencial
    const cajaDiag = document.getElementById('caja-diagnostico');
    if (cajaDiag && typeof motor.analizarPatrones === 'function') {
        cajaDiag.innerHTML = motor.analizarPatrones(hallazgos);
    }
},
renderizarTagsResumen: function() {
    const contenedor = document.getElementById('caja-tags-resumen');
    if (!contenedor) return;

    contenedor.innerHTML = FisioCidEngine.datosTemporales.map(t => `
        <div style="background:#d4af37; color:black; padding:4px 8px; border-radius:6px; font-size:0.65rem; font-weight:800; display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span>${t}</span>
            <span onclick="modalEngine.clicTag('${t}')" style="cursor:pointer; color:red; margin-left:8px;">✕</span>
        </div>
    `).join('');
},

    quitarTag: function(valor) {
        this.datosTemporales = this.datosTemporales.filter(t => t !== valor);
        const cajaDiag = document.getElementById('caja-diagnostico');
        if (cajaDiag) {
            cajaDiag.innerHTML = FisioCidEngine.analizarPatrones(this.datosTemporales) + (this.analizarMagia() || "");
        }
    },

    analizarMagia: function() {
        const p = this.buscarProtocolo();
        if (!p || !p.logicaDiagnostica) return ""; 
        const limpiar = (txt) => txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        const listaTagsLimpios = this.datosTemporales.map(t => limpiar(t));
        const resultado = p.logicaDiagnostica(listaTagsLimpios);
        if (resultado) {
            return `
                <div style="background: rgba(212, 175, 55, 0.1); border: 1px solid #d4af37; padding: 10px; border-radius: 8px; margin-top: 10px;">
                    <b style="color: #b8860b; font-size: 0.75rem;">💡 MAGIA FISIOCID:</b><br>
                    <span style="font-size: 0.7rem; color: #cbd5e1;">${resultado}</span>
                </div>`;
        } 
        return ""; 
    },

    registrarEVA_Directo: function(valor) {
        const display = document.getElementById('displayEva');
        if (display) display.innerText = valor;
        const cuadro = document.getElementById('exploracion'); 
        if (!cuadro) return;
        const textoEva = `DOLOR (EVA: ${valor}/10)`;
        this.datosTemporales = this.datosTemporales.filter(t => !t.includes("DOLOR (EVA:"));
        if (valor > 0) this.datosTemporales.push(textoEva);
        cuadro.value = this.datosTemporales.join(", ");
    },

    lanzarCuestionario: function(id, nombre) {
        const escala = window.BANCO_ESCALAS ? window.BANCO_ESCALAS[id] : null;
        if (!escala) {
            let puntos = prompt(`Introduce el resultado de ${nombre}:`);
            if (puntos) this.clicTag(`${nombre}: ${puntos}`, null);
            return;
        }
        this.escalaActiva = id; 
        document.getElementById('tituloEscala').innerText = escala.nombre;
        const contenedor = document.getElementById('cuerpoEscala');
        let html = "";
        escala.preguntas.forEach((p, i) => {
            html += `<div class="mb-4 p-3 border rounded bg-white shadow-sm">
                <label class="d-block fw-bold text-dark mb-2" style="font-size: 0.85rem;">${i+1}. ${p.t.toUpperCase()}</label>
                <select class="form-select form-select-sm escala-input" onchange="FisioCidEngine.calcularEscalaDinamica()">
                    <option value="0">SELECCIONE UNA OPCIÓN...</option>
                    ${p.o.map((op, v) => `<option value="${v}">${op.toUpperCase()}</option>`).join('')}
                </select>
            </div>`;
        });
        contenedor.innerHTML = html;
        const modalEl = document.getElementById('modalEscalaDinamica');
        let instanciaModal = bootstrap.Modal.getInstance(modalEl);
        if (!instanciaModal) {
            instanciaModal = new bootstrap.Modal(modalEl, { backdrop: false, keyboard: true });
        }
        instanciaModal.show();
    },

    calcularEscalaDinamica: function() {
        let puntos = 0;
        document.querySelectorAll('.escala-input').forEach(sel => puntos += parseInt(sel.value));
        const escala = window.BANCO_ESCALAS[this.escalaActiva];
        if (escala && escala.interpretar) {
            const res = escala.interpretar(puntos);
            document.getElementById('resultadoVivo').innerHTML = `Resultado: ${res.p} pts - ${res.g}`;
        }
    },

    finalizarEscala: function() {
        const resultadoTexto = document.getElementById('resultadoVivo').innerText;
        if (!resultadoTexto) return;
        modalEngine.clicTag(resultadoTexto, { style: {} }); 
        
        const modalEl = document.getElementById('modalEscalaDinamica');
        const instancia = bootstrap.Modal.getInstance(modalEl);
        if (instancia) instancia.hide();
    },

integrarFinal: function(paso) {
    const mapaDestinos = { 
        anamnesis: 'sintomas', 
        exploracion: 'exploracion', 
        plan: 'plan', 
        ejercicios: 'plan_tratamiento' 
    };
    
    const target = document.getElementById(mapaDestinos[paso]);
    
    // Acceso seguro a los hallazgos según el formato actual
    const hallazgos = Array.isArray(FisioCidEngine.datosTemporales) 
                    ? FisioCidEngine.datosTemporales 
                    : (FisioCidEngine.datosTemporales.hallazgos || []);

    // 1. OBTENEMOS EL DIAGNÓSTICO GANADOR (Antes de cualquier acción)
    FisioCidEngine.analizarPatrones(hallazgos);
    const diagnosticosOrdenados = [...FisioCidEngine.diagnosticosActivos].sort((a, b) => b.puntosActuales - a.puntosActuales);
    const diag = diagnosticosOrdenados[0];

   // 🚩 A. LÓGICA DE EXPLORACIÓN: Diagnóstico Funcional (CIF)
    if (paso === 'exploracion' && diag) {
        const cajasCandidatas = document.querySelectorAll('#diagnostico_funcional, [id*="diagnostico_funcional"]');
        
        if (cajasCandidatas.length > 0) {
            const sintomasPrevios = document.getElementById('sintomas')?.value.toLowerCase() || "";
            let limitacion = "la movilidad funcional global";
            
            if (sintomasPrevios.includes("sentar") || sintomasPrevios.includes("silla") || sintomasPrevios.includes("sedestacion")) {
                limitacion = "la tolerancia a la sedestación prolongada";
            } else if (sintomasPrevios.includes("caminar") || sintomasPrevios.includes("pasos") || sintomasPrevios.includes("marcha")) {
                limitacion = "la mecánica de la marcha";
            } else if (sintomasPrevios.includes("agachar") || sintomasPrevios.includes("piso")) {
                limitacion = "la flexión de tronco y actividades de autocuidado";
            }

            const deficiencia = diag.formatoFisio || "Alteración funcional";
            
            // 🔥 NUEVA LÓGICA PARA INCLUIR EL EVA EN EL DIAGNÓSTICO
            const evaActual = window.FisioCidEngine.valorDolorEVA || 0;
            let textoSustento = "";
            
            // Si hay dolor, lo ponemos primero
            if (evaActual > 0) {
                textoSustento += `Dolor de ${evaActual}/10 en escala EVA`;
            }
            
            // Agregamos los demás hallazgos separados por coma
            if (hallazgos.length > 0) {
                if (textoSustento !== "") textoSustento += ", ";
                textoSustento += hallazgos.join(", ");
            }
            
            // Por si acaso no hay nada seleccionado (seguridad)
            if (textoSustento === "") textoSustento = "hallazgos clínicos";

            // Construimos la nota final con el sustento completo
            const notaCompleta = `${diag.nombre.toUpperCase()}: Presenta ${deficiencia.toLowerCase()}, lo cual genera una limitación funcional en ${limitacion}, sustentado por: ${textoSustento}.`;

            cajasCandidatas.forEach((caja) => {
                caja.value = notaCompleta;
                caja.style.backgroundColor = "#f3e8ff"; 
                caja.style.border = "3px solid #8b5cf6";
                setTimeout(() => {
                    caja.style.backgroundColor = "white";
                    caja.style.border = "1px solid #ced4da";
                }, 3000);
            });
        }
    }

    // 🚩 B. LÓGICA DE FASES Y PLAN
    // 🔥 CORRECCIÓN: Le damos permiso de llenarse desde la exploración también
    if (diag && diag.fases && (paso === 'exploracion' || paso === 'plan' || paso === 'ejercicios')) {
        let faseActiva = "fase_subaguda"; 
        const evaActual = window.FisioCidEngine.valorDolorEVA || 0;
        const hallazgosTexto = hallazgos.join(" ");

        // Detección de fase por EVA o palabras clave
        if (evaActual >= 8 || hallazgosTexto.includes("Grave") || hallazgosTexto.includes("súbito")) {
            faseActiva = "fase_aguda";
        } else if (evaActual <= 3 && hallazgosTexto.includes("Mínima")) {
            faseActiva = "fase_funcional";
        }

        const datosFase = diag.fases[faseActiva];

        if (datosFase) {
            const smartTexto = datosFase.objetivos_smart.map(s => `   📍 ${s}`).join('\n');
            const clinicaTexto = datosFase.planTratamiento.clinica.map(c => `   • ${c}`).join('\n');
            const ejerciciosTexto = datosFase.planTratamiento.ejercicios.map(e => `   🏃 ${e}`).join('\n');

            // Llenado automático del PLAN CLÍNICO
            const campoPlan = document.getElementById('plan');
            if (campoPlan) {
                campoPlan.value = `[ PLAN DE INTERVENCIÓN - ${faseActiva.replace('_', ' ').toUpperCase()} ]\n\n` +
                    `🎯 METAS SMART (CORTO PLAZO):\n${smartTexto}\n\n` +
                    `🏥 ABORDAJE EN CLÍNICA:\n${clinicaTexto}`;
                
                // Efecto visual verde de éxito
                campoPlan.style.backgroundColor = "#f0fdf4";
                campoPlan.style.border = "3px solid #22c55e";
                setTimeout(() => {
                    campoPlan.style.backgroundColor = "white";
                    campoPlan.style.border = "1px solid #ced4da";
                }, 3000);
            }

            // Llenado automático de las TAREAS EN CASA
            const campoEjercicios = document.getElementById('plan_tratamiento');
            if (campoEjercicios) {
                campoEjercicios.value = `TAREAS PARA CASA - ${diag.nombre}\n${ejerciciosTexto}`;
                
                // Efecto visual verde de éxito
                campoEjercicios.style.backgroundColor = "#f0fdf4";
                campoEjercicios.style.border = "3px solid #22c55e";
                setTimeout(() => {
                    campoEjercicios.style.backgroundColor = "white";
                    campoEjercicios.style.border = "1px solid #ced4da";
                }, 3000);
            }
        }
    }
    // 🚩 C. INTEGRACIÓN DE HALLAZGOS EN EL CAMPO ACTUAL
    // Ahora verificamos si hay hallazgos O si hay un valor de EVA registrado
    if (target && (hallazgos.length > 0 || window.FisioCidEngine.valorDolorEVA > 0)) {
        const previo = target.value ? target.value + "\n" : "";
        let textoAIntegrar = "";

        // 1. Primero, escribimos el EVA si es mayor a 0
        const evaActual = window.FisioCidEngine.valorDolorEVA || 0;
        if (evaActual > 0) {
            textoAIntegrar += `- DOLOR ACTUAL (EVA): ${evaActual}/10\n`;
        }

        // 2. Después, pegamos todos los botones/síntomas que seleccionaste
        if (hallazgos.length > 0) {
            textoAIntegrar += "- " + hallazgos.join("\n- ");
        }

        // 3. Lo inyectamos en la caja de texto (Expediente)
        target.value = previo + textoAIntegrar;
    }

    // 🚩 D. LIMPIEZA CONDICIONAL (Aquí es donde evitamos que se borre todo)
    // Solo borramos la bolsa si estamos en el último paso
    if (paso === 'ejercicios' || paso === 'plan') {
        FisioCidEngine.datosTemporales = [];
        FisioCidEngine.diagnosticosActivos = []; 
        console.log("🧹 Consulta finalizada: Bolsa de datos vaciada.");
    } else {
        console.log("💾 Paso intermedio: Datos preservados para el motor diferencial.");
    }

    const modal = document.getElementById('modal-cid-universal');
    if (modal) modal.remove();
    
    console.log(`✅ Integración de ${paso} exitosa.`);
},

buscarProtocolo: function() {
    // 🚩 CONEXIÓN RECUPERADA: Buscamos en la biblioteca global
    const biblioteca = window.BIBLIOTECA_PROTOCOLOS;
    if (!biblioteca) {
        console.error("❌ Error: BIBLIOTECA_PROTOCOLOS no cargada.");
        return null;
    }
    
    const motivo = document.getElementById('motivo')?.value.toLowerCase() || "";
    const lista = biblioteca.fisioterapia || [];
    
    // Buscamos el protocolo que coincida con lo que escribiste en el motivo
    const p = lista.find(proto => proto.triggers.some(t => motivo.includes(t)));
    
    return p || lista[0]; // Si no encuentra uno específico, carga el primero (Lumbar)
},
rutaSubsecuente: function() {
    const nota = FisioCidEngine.ultimaNotaCargada;
    if (nota) {
        // Pegamos los textos de la nota anterior en los campos actuales
        if(document.getElementById('sintomas')) document.getElementById('sintomas').value = nota.sintomas || '';
        if(document.getElementById('exploracion')) document.getElementById('exploracion').value = nota.exploracion || '';
        if(document.getElementById('plan')) document.getElementById('plan').value = nota.plan || '';
        if(document.getElementById('plan_tratamiento')) document.getElementById('plan_tratamiento').value = nota.plan_tratamiento || '';
        
        console.log("✅ Nota clonada con éxito.");
    }
    document.getElementById('selector-consulta-overlay').remove();
},

analizarPatrones: function(datos) {
    console.log("🧠 Motor FisioCid: Iniciando análisis clínico...", datos);
    
    // 🚩 BUSCADOR AUTOMÁTICO DE PROTOCOLOS
    // Buscamos cualquier variable que contenga 'diferenciales'
    const p = typeof protocolosLumbar !== 'undefined' ? protocolosLumbar : 
              (typeof protocolos !== 'undefined' ? protocolos : null);
    
    if (!p || !p.diferenciales) {
        console.error("❌ ERROR: No se encontró la lista de 'diferenciales'.");
        return "<div style='color:#94a3b8; font-size:0.55rem; padding:15px; text-align:center;'>Variable de protocolos no encontrada.</div>";
    }

    this.diagnosticosActivos = [];
    let htmlSugerencias = "";

    // 🔍 AQUÍ ES DONDE RECORRE TU LISTA:
    p.diferenciales.forEach(diag => {
        let puntos = 0;
 
        if (!diag.criteriosPesados) return;

        const datosEnMinuscula = datos.map(d => d.toLowerCase());

        diag.criteriosPesados.forEach(c => {
            const criterioId = c.id.toLowerCase().replace(/[()]/g, ""); // Limpieza de símbolos
            
            // 🧠 SUPER BÚSQUEDA: Busca si la palabra clave está en el tag dorado
            const match = datosEnMinuscula.some(hallazgo => {
                const hLimpio = hallazgo.replace(/[()]/g, "");
                return hLimpio.includes(criterioId) || criterioId.includes(hLimpio);
            });
            
            if (match) {
                puntos += c.puntos;
                console.log(`✨ +${c.puntos} pts para ${diag.nombre} por: ${c.id}`);
            }
        });

        // Solo si supera el umbral (o 3 por defecto)
        if (puntos >= (diag.umbral || 3)) {
            console.log(`✅ UMBRAL ALCANZADO: ${diag.nombre} (${puntos} pts)`);
            
            // 🚩 LA CLAVE PARA INTEGRAR: Guardamos el diagnóstico con sus puntos actuales
            this.diagnosticosActivos.push({ ...diag, puntosActuales: puntos }); 
            
            const colorCerteza = puntos >= 6 ? "#16a34a" : "#ca8a04";
            const objetivo = diag.objetivoSug ? `<br><i style="font-size:0.55rem; color:#cbd5e1; display:block; margin-top:4px;">🎯 ${diag.objetivoSug}</i>` : "";
            
            htmlSugerencias += `
                <div style="border-left: 5px solid ${colorCerteza}; background: rgba(255,255,255,0.05); padding: 8px 12px; margin-bottom: 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <b style="color:white; font-size:0.75rem; text-transform:uppercase;">${diag.nombre}</b>
                        <span style="background:${colorCerteza}; color:white; padding:2px 6px; border-radius:10px; font-size:0.55rem; font-weight:900;">${puntos} PTS</span>
                    </div>
                    ${objetivo}
                </div>`;
        }
    });

    if (htmlSugerencias === "") {
        console.log("⚠️ Motor: Ningún diagnóstico superó el umbral clínico.");
        return "<div style='color:#64748b; font-size:0.6rem; text-align:center; padding:20px;'>Complete más pruebas para ver diagnósticos diferenciales.</div>";
    }
    
    return htmlSugerencias;
},
// [ DENTRO DE modalEngine.js ]

mostrarSelectorTipoConsulta: function() {
    const html = `
        <div id="selector-consulta-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.95); display:flex; align-items:center; justify-content:center; z-index:10000; backdrop-filter: blur(10px);">
            <div style="background:#1e293b; padding:40px; border-radius:24px; border:1px solid #334155; text-align:center; max-width:450px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
                <h2 style="color:white; margin-bottom:10px; font-size:1.6rem;">🩺 Flujo de Consulta</h2>
                <p style="color:#94a3b8; margin-bottom:30px; font-size:0.9rem;">Se detectó una nota previa. ¿Qué haremos hoy?</p>
                
                <div style="display:grid; gap:12px;">
                    <button onclick="modalEngine.rutaSubsecuente()" style="padding:20px; background:#10b981; color:white; border:none; border-radius:12px; cursor:pointer; font-weight:bold; font-size:1rem;">
                        🟢 CITA SUBSECUENTE
                    </button>
                    
                    <button onclick="modalEngine.rutaRevaloracion()" style="padding:20px; background:#f59e0b; color:white; border:none; border-radius:12px; cursor:pointer; font-weight:bold; font-size:1rem;">
                        🟡 REVALORACIÓN
                    </button>
                    
                    <button onclick="modalEngine.rutaNueva()" style="padding:20px; background:#ef4444; color:white; border:none; border-radius:12px; cursor:pointer; font-weight:bold; font-size:1rem;">
                        🔴 NUEVA LESIÓN
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
},

rutaSubsecuente: function() {
    // Jalamos la nota que guardamos en el Paso anterior
    const nota = FisioCidEngine.ultimaNotaCargada;
    
    if (nota) {
        // Mapeamos a los IDs de tu formulario
        if(document.getElementById('sintomas')) document.getElementById('sintomas').value = nota.sintomas || '';
        if(document.getElementById('exploracion')) document.getElementById('exploracion').value = nota.exploracion_fisica || '';
        if(document.getElementById('plan')) document.getElementById('plan').value = nota.nota_evolucion || '';
        if(document.getElementById('plan_tratamiento')) document.getElementById('plan_tratamiento').value = nota.plan_tratamiento || '';
        
        console.log("✅ Nota clonada desde historial_clinico.");
    }
    this.cerrarSelector();
},

rutaRevaloracion: function() {
    // Solo clonamos síntomas para tener la base del motivo de consulta
    const nota = FisioCidEngine.ultimaNotaCargada;
    if (nota && document.getElementById('sintomas')) {
        document.getElementById('sintomas').value = nota.sintomas || '';
    }
    console.log("🟡 Modo Revaloración: Iniciando nueva evaluación física.");
    this.cerrarSelector();
},

rutaNueva: function() {
    // No hacemos nada, dejamos los campos limpios
    console.log("🔴 Nota en blanco para nuevo diagnóstico.");
    this.cerrarSelector();
},

cerrarSelector: function() {
    const el = document.getElementById('selector-consulta-overlay');
    if (el) el.remove();
},


generarPlanInteligente: function() {
    // 1. Obtenemos el diagnóstico que el motor ya calculó
    const diagNombre = document.getElementById('diagnostico_funcional')?.value || "";
    
    // 2. Buscamos en tu ARCHIVO DE PROTOCOLOS el objeto que coincida
    // Suponiendo que FisioCidEngine.protocolos es donde guardas toda tu "enciclopedia"
    const protocoloActivo = FisioCidEngine.protocolos.find(p => 
        diagNombre.toUpperCase().includes(p.nombre.toUpperCase())
    );

    let sugerencia = { objetivos: [], clinica: [], ejercicios: [] };

    if (protocoloActivo) {
        // 🚩 ¡AQUÍ ESTÁ LA MAGIA! Jalamos los datos del objeto, no los escribimos aquí
        sugerencia.objetivos = protocoloActivo.fases.fase_aguda.objetivos_smart;
        sugerencia.clinica = protocoloActivo.fases.fase_aguda.planTratamiento.clinica;
        sugerencia.ejercicios = protocoloActivo.fases.fase_aguda.planTratamiento.ejercicios;
    }

    return sugerencia;
},

manejarSubidaArchivos: function(event) {
    // Tomamos el input desde el evento del HTML
    const input = event.target;
    if (!input.files || input.files.length === 0) return;

    const carrilImg = document.getElementById('carril-imagen');
    const carrilLab = document.getElementById('carril-lab');
    const archivos = Array.from(input.files);

    archivos.forEach(archivo => {
        const esImagen = archivo.type.startsWith('image/');
        const destinoInicial = esImagen ? carrilImg : carrilLab;
        
        // 🧹 Limpiamos el texto de "Sin imágenes" para que no estorbe
        const placeholder = destinoInicial.querySelector('.placeholder-text');
        if (placeholder) placeholder.remove();
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const thumb = document.createElement('div');
            thumb.className = "thumb-estudio";
            
            // 🔥 EL PEGAMENTO PARA SUPABASE (VITAL) 🔥
            thumb.archivoReal = archivo; 

            thumb.style.cssText = `
                min-width: 60px; height: 60px; border-radius: 8px; border: 2px solid ${esImagen ? '#3b82f6' : '#10b981'}; 
                background: ${esImagen ? `url(${e.target.result})` : '#1e293b'}; background-size: cover; background-position: center;
                position: relative; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
            `;

            // 🚩 BOTÓN MÁGICO: "Mover al otro lado"
            const btnMover = document.createElement('div');
            btnMover.innerHTML = esImagen ? '🧪' : '📸'; 
            btnMover.title = "Mover de carril";
            btnMover.style.cssText = `position: absolute; bottom: -5px; right: -5px; background: #d4af37; border-radius: 50%; width: 20px; height: 20px; display: flex; justify-content: center; align-items: center; font-size: 10px; cursor: pointer; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index: 10;`;
            
            btnMover.onclick = (ev) => {
                ev.stopPropagation(); // Evita que se abra la imagen al darle clic al botoncito
                const nuevoDestino = thumb.parentElement.id === 'carril-imagen' ? carrilLab : carrilImg;
                
                // Limpiamos el texto del nuevo destino si es que estaba vacío
                const nuevoPlaceholder = nuevoDestino.querySelector('.placeholder-text');
                if (nuevoPlaceholder) nuevoPlaceholder.remove();

                const nuevoColor = nuevoDestino.id === 'carril-imagen' ? '#3b82f6' : '#10b981';
                thumb.style.borderColor = nuevoColor;
                btnMover.innerHTML = nuevoDestino.id === 'carril-imagen' ? '🧪' : '📸';
                nuevoDestino.appendChild(thumb);
            };

            if (!esImagen) thumb.innerHTML = '<i class="fas fa-file-pdf" style="color:#ef4444; font-size:1.2rem;"></i>';
            
            thumb.appendChild(btnMover);
            destinoInicial.appendChild(thumb);
        };
        reader.readAsDataURL(archivo);
    });

    // Limpiamos el input por si quieres volver a subir la misma foto después de borrarla
    input.value = '';
},

actualizarTagsImagen: function() {
    const selector = document.getElementById('tipo_estudio_selector');
    const grid = document.getElementById('grid-hallazgos-imagen');
    if (!selector || !grid) return;

    const tipo = selector.value;
    const p = FisioCidEngine.protocoloActual; 

    // Tags Universales por defecto
    let tags = ["Normal", "Hallazgo Inespecífico", "Pendiente"];

    // Si hay un protocolo cargado, usamos sus términos técnicos
    if (p && p.gabinete_sugerido && p.gabinete_sugerido[tipo]) {
        tags = p.gabinete_sugerido[tipo];
    }

    grid.innerHTML = tags.map(t => `
        <button type="button" onclick="document.getElementById('hallazgo_imagen').value += '${t}, '" 
                style="padding:6px; border-radius:6px; font-size:0.55rem; font-weight:700; border:1px solid #3b82f6; background:#eff6ff; color:#1e3a8a; cursor:pointer;">
            + ${t}
        </button>
    `).join('');
},

toggleSeccionEstudios: async function() {
    const checkbox = document.getElementById('checkEstudios');
    const contenedorOpciones = document.getElementById('opcionesEstudiosContainer');

    if (!checkbox.checked) {
        contenedorOpciones.style.display = 'none';
        contenedorOpciones.innerHTML = ''; // Limpiamos para seguridad
        return;
    }

    // Mantenemos tu validación de fisioNet que es muy buena
    if (typeof window.fisioNet === 'undefined') {
        checkbox.checked = false;
        return;
    }

    // 1. Inyectamos el Panel de Autorización (La Genialidad)
    contenedorOpciones.innerHTML = `
        <div class="animate__animated animate__fadeIn mt-3 p-3 border rounded bg-light">
            <p class="small fw-bold text-primary mb-2">🔐 AUTORIZACIÓN DE HISTORIAL</p>
            <div class="input-group input-group-sm mb-2" style="max-width: 250px; margin: 0 auto;">
                <input type="password" id="codigoAcceso" class="form-control text-center" 
                       placeholder="CÓDIGO 4 DÍGITOS" maxlength="4">
                <button class="btn btn-primary" type="button" onclick="modalEngine.validarAccesoHistorial()">
                    VALIDAR
                </button>
            </div>
            <p class="x-small text-muted">Solicite el código dinámico al paciente desde su App FisioCid.</p>
            <div id="visorHistorialResultado" class="mt-3"></div>
        </div>
    `;
    contenedorOpciones.style.display = 'block';
},

validarAccesoHistorial: async function() {
    const codigo = document.getElementById('codigoAcceso').value;
    const visor = document.getElementById('visorHistorialResultado');
    
    if(codigo.length < 4) {
        alert("Por favor ingrese los 4 dígitos.");
        return;
    }

    visor.innerHTML = `<div class="spinner-border spinner-border-sm text-primary"></div> Verificando...`;

    // Aquí es donde conectaremos con Supabase para jalar el historial
    // usando la CURP que ya tenemos en la URL
    console.log("Validando código y jalando historial de la CURP...");
},
guardarGabineteSincronizado: async function(pacienteId) {
    const fotos = document.querySelectorAll('#carril-imagen .thumb-estudio');
    const reportes = document.querySelectorAll('#carril-lab .thumb-estudio');
    const todosLosArchivos = [...fotos, ...reportes];
    
    if (todosLosArchivos.length === 0) {
        alert("⚠️ Agrega al menos un estudio o reporte para sincronizar.");
        return;
    }

    // 1️⃣ MAGIA VISUAL: CAMBIAR EL BOTÓN A MODO "CARGANDO"
    const btnSinc = document.getElementById('btnSincronizarGabinete');
    const textoOriginal = btnSinc.innerHTML; // Guardamos cómo se veía antes
    
    // Le ponemos un spinner dando vueltas y lo bloqueamos
    btnSinc.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i> SUBIENDO A LA NUBE... ESPERE';
    btnSinc.disabled = true;
    btnSinc.style.opacity = '0.7';
    btnSinc.style.cursor = 'wait';

    try {
        console.log(`🚀 Iniciando subida de ${todosLosArchivos.length} archivos...`);

        for (const thumb of todosLosArchivos) {
            const archivo = thumb.archivoReal; 
            if (!archivo) continue;

            const esImagen = thumb.parentElement.id === 'carril-imagen';
            const folder = esImagen ? 'imagenologia' : 'laboratorio';
            
            const fileExt = archivo.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${pacienteId}/${folder}/${fileName}`;

            // SUBIDA AL STORAGE 
            const { data: uploadData, error: uploadError } = await window.fisioNet.storage
                .from('expedientes-clinicos')
                .upload(filePath, archivo);

            if (uploadError) {
                console.error("Error en Storage:", uploadError.message);
                continue;
            }

            // OBTENER URL PÚBLICA 
            const { data: urlData } = window.fisioNet.storage
                .from('expedientes-clinicos')
                .getPublicUrl(filePath);

            // REGISTRO EN LA TABLA SQL 
            const { error: dbError } = await window.fisioNet
                .from('estudios_gabinete')
                .insert([{
                    paciente_id: pacienteId,
                    tipo_estudio: document.getElementById('tipo_estudio_selector').value,
                    archivo_url: urlData.publicUrl,
                    nombre_archivo: archivo.name,
                    categoria: esImagen ? 'imagen' : 'laboratorio',
                    hallazgos_resumen: esImagen ? 
                        document.getElementById('hallazgo_imagen').value : 
                        document.getElementById('hallazgo_laboratorio').value
                }]);

            if (dbError) {
                console.error("Error en DB:", dbError.message);
            } else {
                console.log(`✅ ${archivo.name} guardado correctamente.`);
            }
        }

        // 2️⃣ MAGIA DE LIMPIEZA: BORRAR TODO EL PANEL AL TERMINAR
        
        // Restaurar los textos por defecto de los carriles
        document.getElementById('carril-imagen').innerHTML = '<span class="placeholder-text" style="font-size: 0.7rem; color: #94a3b8; font-style: italic;">Imágenes ecográficas aquí...</span>';
        document.getElementById('carril-lab').innerHTML = '<span class="placeholder-text" style="font-size: 0.7rem; color: #94a3b8; font-style: italic;">Suba reportes de laboratorio (PDF)...</span>';
        
        // Borrar lo que escribiste en los cuadros de texto
        document.getElementById('hallazgo_imagen').value = '';
        document.getElementById('hallazgo_laboratorio').value = '';
        
        // Borrar todos los numeritos de los biomarcadores
        const labInputs = ['lab_glucosa', 'lab_pcr', 'lab_acido_urico', 'lab_colesterol', 'lab_trigliceridos', 'lab_hba1c'];
        labInputs.forEach(id => {
            const input = document.getElementById(id);
            if(input) input.value = '';
        });

        // 3️⃣ AVISAR AL USUARIO CON UNA ALERTA
        alert("☁️ ¡Estudios y analíticas sincronizados con éxito en la nube!");

    } catch (error) {
        console.error("Error general en sincronización:", error);
        alert("Hubo un error al subir los archivos. Revisa la consola.");
    } finally {
        // 4️⃣ RESTAURAR EL BOTÓN A SU ESTADO ORIGINAL (pase lo que pase)
        btnSinc.innerHTML = textoOriginal;
        btnSinc.disabled = false;
        btnSinc.style.opacity = '1';
        btnSinc.style.cursor = 'pointer';
    }
}
     };
