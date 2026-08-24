
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
    
abrirAsistente: function(paso, protocoloDirecto = null) {
    this.pasoActual = paso;

    // 🎯 PRIORIDAD: Si viene del botón inteligente, usamos ese. Si no, lo buscamos en la biblioteca.
    const p = protocoloDirecto || this.buscarProtocolo();
    
    if (!p) {
        console.error("❌ FisioCid Error: No se pudo determinar el protocolo.");
        return;
    }

    // 🚩 SINCRONIZAR EL EVA DESDE EL SLIDER (Para que el motor sepa el dolor antes de abrir)
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
                <h3 style="margin: 0; font-size: 1rem; font-weight: 800;">🛠️ ${titulos[paso]} | ${p.titulo.toUpperCase()}</h3>
                <button onclick="document.getElementById('modal-cid-universal').remove()" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">✕</button>
            </div>
            <div style="padding: 20px; flex: 1; overflow: hidden; background: #f8fafc;">
                ${this.generarInterfaz(paso, p)}
            </div>
            <div style="padding: 15px; background: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: right;">
                <button onclick="modalEngine.integrarFinal('${paso}')" style="background: #d4af37; color: black; border: none; padding: 12px 30px; border-radius: 10px; font-weight: 900; cursor: pointer;">✅ INTEGRAR A EXPEDIENTE</button>
            </div>
        </div>`;

// ... (Todo tu código anterior de abrirAsistente hasta el appendChild)
    document.body.appendChild(overlay);

    // 🚀 UNIFICACIÓN DE DISPARADORES (Ajuste de Cristian)
    setTimeout(() => {
        // 1. Primero activamos el diagnóstico diferencial (Lógica de Fisio)
        if (typeof this.actualizarPanelDiagnostico === 'function') {
            this.actualizarPanelDiagnostico();
        }

        // 2. Luego, si es exploración, activamos la interfaz de especialidad
        if (this.pasoActual === 'exploracion') {
            const rol = (localStorage.getItem('especialidadUsuario') || "").toUpperCase();
            const p = protocoloDirecto || this.buscarProtocolo(); // Aseguramos acceso al protocolo

            // 🦷 Activación de Odontología
            if (rol.includes("ODONTOLOGO") || (p && p.id && p.id.startsWith("DENT"))) {
                if (window.PeriodontoFisioCid) {
                    console.log("🦷 FisioCid: Renderizando arcadas...");
                    window.PeriodontoFisioCid.inicializar('arcada-superior', 'arcada-inferior');
                    FisioCidEngine.cargarConfiguracionDental();
                }
            }
        }
    }, 150); // 150ms es el "punto dulce" para que el modal ya esté pintado
},
     

generarInterfaz: function(paso, p) {

    // 🧠 1. CASO ANAMNESIS (Tu código intacto)

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

                                return `<button onclick="modalEngine.clicTag('${item}', this)" style="padding: 2px; border-radius: 6px; font-size: 0.55rem; height: 50px; cursor: pointer; display: flex; align-items: center; justify-content: center; text-align: center; line-height: 1.1; transition: 0.2s; background: ${yaDetectado ? "#0369a1" : "#f0f9ff"}; color: ${yaDetectado ? "#ffffff" : "#0369a1"}; border: ${yaDetectado ? "2px solid #0ea5e9" : "1px solid #bae6fd"}; font-weight: ${yaDetectado ? "900" : "700"};">${yaDetectado ? '✅<br>' : ''}${item}</button>`;

                            }).join('')}

                        </div>

                    </div>

                    <div style="border-left: 2px dashed #fee2e2; padding-left: 8px;">

                        <div style="display: flex; flex-direction: column; gap: 4px;">

                            ${redFlags.map(item => {

                                const yaDetectado = bolsaGlobal.includes(item);

                                const glowRojo = yaDetectado ? "box-shadow: 0 0 15px 3px rgba(239, 68, 68, 0.8);" : "";

                                return `<button onclick="modalEngine.clicTag('${item}', this)" style="padding: 4px; border-radius: 4px; font-weight: 800; font-size: 0.52rem; cursor: pointer; text-align: left; line-height: 1.1; background: ${yaDetectado ? "#991b1b" : "#fee2e2"}; color: ${yaDetectado ? "#ffffff" : "#991b1b"}; border: 1px solid #ef4444; transition: all 0.3s ease; ${glowRojo}">${yaDetectado ? '🚨 ' : '🚩 '}${item}</button>`;

                            }).join('')}

                        </div>

                    </div>

                </div>

            </div>`;

    }



    // 🧠 2. CASO EXPLORACIÓN (Aquí unificamos con un solo IF maestro)

    if (paso === 'exploracion') {

        const rol = localStorage.getItem('especialidadUsuario').toUpperCase().trim();

       

        // --- 🦷 RAMA ODONTOLOGÍA ---

// UBICACIÓN: modalEngine.js
if (rol === "ODONTOLOGO" || p.id.startsWith("DENT")) {
    requestAnimationFrame(() => {
        setTimeout(() => { 
            console.log("🦷 FisioCid: Poblando arcadas en el asistente...");
            if (window.FisioCidEngine) {
                // Lanzamos la escala especial que ya configuramos en el banco
                window.FisioCidEngine.lanzarCuestionario('PERIODONTOGRAMA');
            }
        }, 300); // 300ms para asegurar que el modal terminó de animarse
    });

   return `
   <style>
    /* 🎨 REGLAS DE ORO PARA LOS BOTONES DE DIENTES EN FISIOCID */
    .btn-diente-fisiocid {
        background: #334155 !important;
        color: #ffffff !important;
        border: 1px solid #475569 !important;
        border-radius: 3px !important;
        padding: 0px !important;
        font-size: 9px !important; /* Letra super clara pero pequeña */
        line-height: 1 !important;
        height: 15px !important;    /* Altura mínima */
        min-width: 22px !important;  /* Ancho mínimo */
        cursor: pointer;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        margin-bottom: 2px !important;
        font-weight: 900 !important;
        text-transform: none !important;
        box-shadow: none !important;
    }

    .btn-diente-fisiocid:hover {
        background: #d4af37 !important; /* El dorado de tu marca */
        color: #0f172a !important;
        transform: scale(1.1);
    }
</style>
<div style="display: flex; flex-direction: column; height: 90vh; background: #0f172a; border-radius: 12px; overflow: hidden; position: relative;">


    <div style="flex: 1; overflow-y: auto; padding: 15px 15px 180px 15px; scrollbar-width: thin;">


   <!-- ⚡ BOTONERA DE ACCESO RÁPIDO -->
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 15px;">
    
    <button onclick="FisioCidEngine.lanzarCuestionario('MALLAMPATI')" 
            style="background: #1e293b; color: #f8fafc; border: 1px solid #334155; padding: 6px; border-radius: 6px; font-size: 0.55rem; font-weight: 800;">
        👅 MALLAMPATI
    </button>
    
    <button onclick="FisioCidEngine.lanzarCuestionario('CLASIFICACION_KENNEDY')" 
            style="background: #1e293b; color: #f8fafc; border: 1px solid #334155; padding: 6px; border-radius: 6px; font-size: 0.55rem; font-weight: 800;">
        👄 KENNEDY
    </button>

    <button onclick="FisioCidEngine.lanzarCuestionario('GERIATRIA')" 
            style="background: #475569; color: white; border: none; padding: 6px; border-radius: 6px; font-size: 0.55rem; font-weight: 800;">
        👴 GERIATRÍA
    </button>

    <button onclick="FisioCidEngine.lanzarCuestionario('ODONTOPEDIATRIA')" 
            style="background: #ec4899; color: white; border: none; padding: 6px; border-radius: 6px; font-size: 0.55rem; font-weight: 800;">
        👶 PEDIA
    </button>

    <button onclick="FisioCidEngine.lanzarCuestionario('ENDODONCIA')" 
            style="background: #0ea5e9; color: white; border: none; padding: 6px; border-radius: 6px; font-size: 0.55rem; font-weight: 800;">
        🦷 ENDO
    </button>

    <button onclick="FisioCidEngine.lanzarCuestionario('CIRUGIA')" 
            style="background: #991b1b; color: white; border: none; padding: 6px; border-radius: 6px; font-size: 0.55rem; font-weight: 800;">
        🔪 CIRUGÍA
    </button>
</div>

  <!-- 🎨 SELECTOR DE COLOR CON LEYENDA -->
    <div style="background: #1e293b; padding: 12px; border-radius: 12px; border: 1px solid #334155;">
        <div style="display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div onclick="window.PeriodontoFisioCid.setBrush('#f8fafc', this, 'sano')" class="paleta-color" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
                <div style="width:22px; height:22px; background:#f8fafc; border-radius:50%; border:2px solid gold;"></div>
                <span style="font-size:0.5rem; color:#94a3b8; margin-top:4px;">SANO</span>
            </div>
            <div onclick="window.PeriodontoFisioCid.setBrush('#f472b6', this)" class="paleta-color" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
                <div style="width:22px; height:22px; background:#f472b6; border-radius:50%;"></div>
                <span style="font-size:0.5rem; color:#f472b6; margin-top:4px;">P. NUEVA</span>
            </div>
            <div onclick="window.PeriodontoFisioCid.setBrush('#a855f7', this)" class="paleta-color" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
                <div style="width:22px; height:22px; background:#a855f7; border-radius:50%;"></div>
                <span style="font-size:0.5rem; color:#a855f7; margin-top:4px;">P. VIEJA</span>
            </div>
            <div onclick="window.PeriodontoFisioCid.setBrush('#ef4444', this, 'caries')" class="paleta-color" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
    <div style="width:22px; height:22px; background:#ef4444; border-radius:50%;"></div>
    <span style="font-size:0.5rem; color:#ef4444; margin-top:4px;">CARIES</span>
</div>
            <div onclick="window.PeriodontoFisioCid.setBrush('#3b82f6', this)" class="paleta-color" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
                <div style="width:22px; height:22px; background:#3b82f6; border-radius:50%;"></div>
                <span style="font-size:0.5rem; color:#3b82f6; margin-top:4px;">TRATADO</span>
            </div>
        
            <div onclick="window.PeriodontoFisioCid.setBrush('#ef4444', this, 'extraer')" class="paleta-color" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
    <div style="width:22px; height:22px; background:#ef4444; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:12px; font-weight:bold;">X</div>
    <span style="font-size:0.5rem; color:#ef4444; margin-top:4px;">EXTRAER</span>
</div>

<div onclick="window.PeriodontoFisioCid.setBrush('#94a3b8', this, 'ausente')" class="paleta-color" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
    <div style="width:22px; height:22px; background:#94a3b8; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#0f172a; font-size:12px; font-weight:bold;">/</div>
    <span style="font-size:0.5rem; color:#94a3b8; margin-top:4px;">AUSENTE</span>
</div>
        </div>
    </div>
<!-- 🔄 SWITCH ADULTO/NIÑO -->
<div style="display: flex; justify-content: center; align-items: center; background: #1e293b; padding: 10px; border-radius: 50px; margin: 10px auto; width: fit-content; border: 1px solid #334155; gap: 15px;">
    <span style="font-size: 0.6rem; font-weight: 900; color: #94a3b8;">👶 NIÑO</span>
    
    <label class="switch-fisiocid">
        <input type="checkbox" id="switchAdultoNiño" onchange="window.PeriodontoFisioCid.toggleArcada(this)" checked>
        <span class="slider-fisiocid"></span>
    </label>
    
    <span style="font-size: 0.6rem; font-weight: 900; color: #d4af37;">👨 ADULTO</span>
</div>

<style>
    .switch-fisiocid { position: relative; display: inline-block; width: 40px; height: 20px; }
    .switch-fisiocid input { opacity: 0; width: 0; height: 0; }
    .slider-fisiocid { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #0f172a; transition: .4s; border-radius: 20px; border: 1px solid #334155; }
    .slider-fisiocid:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 2px; background-color: #d4af37; transition: .4s; border-radius: 50%; }
    input:checked + .slider-fisiocid { background-color: #1e293b; }
    input:checked + .slider-fisiocid:before { transform: translateX(20px); }
</style>

    <!-- 🦷 EXPLORACIÓN DENTAL COMPLETA (4 FILAS) -->
    <div id="contenedor-periodontograma" style="background: rgba(15, 23, 42, 0.8); padding: 20px; border-radius: 12px; border: 2px solid #1e293b; display: flex; flex-direction: column; gap: 15px;">
<div class="text-center txt-permanente" style="font-size: 0.8rem; font-weight: 800; color: #f1f5f9; letter-spacing: 3px; margin-bottom: 5px; text-transform: uppercase;">
    🦷 Permanentes Superiores
</div>
<div id="arcada-superior" class="d-flex justify-content-center gap-1 flex-wrap"></div>

<div class="text-center txt-temporal" style="font-size: 0.75rem; font-weight: 800; color: #fbbf24; letter-spacing: 2px; margin: 10px 0; text-transform: uppercase;">
    👶 Temporales superiores
</div>
<div id="temporales-superior" class="d-flex justify-content-center gap-1 flex-wrap"></div>

<div id="temporales-inferior" class="d-flex justify-content-center gap-1 flex-wrap"></div>
<div class="text-center txt-temporal" style="font-size: 0.75rem; font-weight: 800; color: #fbbf24; letter-spacing: 2px; margin-top: 10px; text-transform: uppercase;">
    👶 Temporales inferiores
</div>

<div id="arcada-inferior" class="d-flex justify-content-center gap-1 flex-wrap"></div>
<div class="text-center txt-permanente" style="font-size: 0.8rem; font-weight: 800; color: #f1f5f9; letter-spacing: 3px; margin-top: 5px; text-transform: uppercase;">
    🦷 Permanentes Inferiores
</div>
     </div>

  <div style="background: #1e293b; padding: 15px; border-top: 2px solid #334155; box-shadow: 0 -4px 10px rgba(0,0,0,0.3);">
        
        <!-- 📝 RESUMEN DINÁMICO -->
         <div id="resumen-dental-vivo" style="background: rgba(212, 175, 55, 0.1); border: 1px dashed #d4af37; padding: 10px; border-radius: 8px; margin-bottom: 12px;">
            <div style="color: #d4af37; font-size: 0.65rem; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; display: flex; align-items: center; gap: 5px;">
                <span>🔍</span> VISTA PREVIA DEL HALLAZGO
            </div>
            <div id="texto-resumen-dinamico" style="color: #f8fafc; font-size: 0.75rem; line-height: 1.3; font-family: monospace;">
                Seleccione hallazgos en el odontograma...
            </div>
        </div>
  <style>
    .switch-fisiocid { position: relative; display: inline-block; width: 40px; height: 20px; }
    .switch-fisiocid input { opacity: 0; width: 0; height: 0; }
    .slider-fisiocid { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #0f172a; transition: .4s; border-radius: 20px; border: 1px solid #334155; }
    .slider-fisiocid:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 2px; background-color: #d4af37; transition: .4s; border-radius: 50%; }
    input:checked + .slider-fisiocid { background-color: #1e293b; }
    input:checked + .slider-fisiocid:before { transform: translateX(20px); }
</style>




`;
  
}

        else if (rol === "NUTRIOLOGO" || p.id.startsWith("NUT")) {

    // 🥗 INTERFAZ NUTRICIÓN

    return `

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; height: 70vh; padding: 10px; background: #f8fafc;">

        <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0;">

            <p style="color: #16a34a; font-weight: 900; font-size: 0.7rem; margin-bottom: 10px;">📏 ANTROPOMETRÍA</p>

            <div style="display: flex; flex-direction: column; gap: 8px;">

                <input type="number" id="nut-peso" placeholder="Peso (kg)" class="form-control form-control-sm">

                <input type="number" id="nut-talla" placeholder="Talla (cm)" class="form-control form-control-sm">

                <input type="number" id="nut-cintura" placeholder="Cintura (cm)" class="form-control form-control-sm">

                <button class="btn btn-sm btn-success" onclick="alert('IMC: ' + (document.getElementById('nut-peso').value / ((document.getElementById('nut-talla').value/100)**2)).toFixed(2))">CALCULAR IMC</button>

            </div>

        </div>

        <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0;">

            <p style="color: #16a34a; font-weight: 900; font-size: 0.7rem; margin-bottom: 10px;">🍎 HÁBITOS</p>

            ${['Consume Agua', 'Actividad Física', 'Consume Ultraprocesados', 'Duerme > 7h'].map(h => `

                <button onclick="modalEngine.clicTag('${h}', this)" style="width:100%; margin-bottom:5px; padding:5px; font-size:0.6rem; border:1px solid #bcf0da; background:#f0fdf4; border-radius:5px;">+ ${h}</button>

            `).join('')}

        </div>

    </div>`;

}

else if (rol === "PSICOLOGO" || p.id.startsWith("PSI")) {

    // 🧠 INTERFAZ PSICOLOGÍA

    return `

    <div style="display: flex; flex-direction: column; gap: 15px; height: 70vh; padding: 10px; background: #fdf2f8;">

        <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #fbcfe8;">

            <p style="color: #be185d; font-weight: 900; font-size: 0.7rem; margin-bottom: 10px;">🎭 ESTADO MENTAL / EXAMEN</p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">

                ${['Orientado', 'Afecto Aplanado', 'Labilidad Emocional', 'Pensamiento Lógico', 'Ansiedad Proyectada'].map(e => `

                    <button onclick="modalEngine.clicTag('${e}', this)" style="padding:8px; font-size:0.6rem; border:1px solid #f9a8d4; background:#fff1f2; border-radius:8px;">${e}</button>

                `).join('')}

            </div>

        </div>

        <textarea id="psi-observaciones" placeholder="Notas de la sesión / Observaciones conductuales..." style="flex:1; border-radius:12px; border:1px solid #f9a8d4; padding:10px; font-size:0.7rem;"></textarea>

    </div>`;

}

        // --- 🏃 RAMA FISIOTERAPIA (Puse el ELSE para conectar tu código) ---

        else {

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
    
   <div id="panel-hallazgos-resumen" style="padding:8px; overflow-y:auto; border-bottom:1px solid #334155; max-height: 200px; background: rgba(255,255,255,0.02);">
    
    <div id="contenedor-tags-fisio" style="display: block; margin-bottom: 10px; min-height: 20px;">
        <small style="color: #475569; font-size: 0.5rem;">Exploración física...</small>
    </div>
    
    <div id="contenedor-escalas-fisio" style="display: block; border-top: 1px solid rgba(51, 65, 85, 0.5); padding-top: 8px;">
    </div>

</div>

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
    <button type="button" 
            onclick="console.log('🖱️ Clic en: ${e.id.toUpperCase()}'); window.FisioCidEngine.lanzarCuestionario('${e.id.toUpperCase()}')" 
            style="padding:6px; border-radius:6px; font-weight:700; font-size:0.52rem; background:#f5f3ff; color:#6d28d9; border:1px solid #ddd6fe; text-align:left; cursor:pointer;">
        📋 ${e.nombre.toUpperCase()}
    </button>
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

    }



    // 🧠 3. CASO PLAN / GABINETE (Acomodé las llaves aquí)

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

                        <div style="margin-top: 15px;">

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;" id="grid-hallazgos-img">

                                ${['Deshidratación Discal', 'Protrusión', 'Extrusión', 'Listesis', 'Estenosis Canal'].map(h => `

                                    <button onclick="modalEngine.clicTag('${h}', this)" style="padding:6px; border-radius:6px; font-size:0.55rem; font-weight:700; border:1px solid #cbd5e1; background:#f8fafc; text-align:left;">+ ${h}</button>

                                `).join('')}

                            </div>

                        </div>

                        <textarea placeholder="Impresión diagnóstica personal..." style="margin-top: 15px; flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; font-size: 0.7rem; resize: none;"></textarea>

                    </div>

                </div>

            </div>`;

    }

},

clicTag: function(valor, btn) {
    // 1. Guardar datos
    if (this.datosTemporales.includes(valor)) {
        this.datosTemporales = this.datosTemporales.filter(t => t !== valor);
    } else {
        this.datosTemporales.push(valor);
    }

    // 2. 🚩 CAMBIO CLAVE: No llamamos a abrirAsistente (para evitar el borrado total)
    // En su lugar, solo refrescamos los colores de los botones y el resumen
    this.refrescarSoloBotonesYResumen();
},

refrescarSoloBotonesYResumen: function() {
    const botones = document.querySelectorAll('#scroll-evaluacion button');
    
    botones.forEach(b => {
        const onclickAttr = b.getAttribute('onclick') || "";
        const match = onclickAttr.match(/'([^']+)'/);
        
        if (match) {
            const valorBoton = match[1];
            const yaSeleccionado = this.datosTemporales.includes(valorBoton);
            
            // 🎨 DEFINICIÓN DE COLORES POR CATEGORÍA
            let colorActivo, colorInactivo, textoActivo, textoInactivo, borde;

            if (valorBoton.includes('SENS')) { // 🔵 SENSIBILIDAD (AZUL)
                colorActivo = '#0369a1'; colorInactivo = '#f0f9ff';
                textoActivo = 'white'; textoInactivo = '#0369a1';
                borde = '#bae6fd';
            } 
            else if (valorBoton.includes('Fuerza')) { // 🟢 FUERZA (VERDE)
                colorActivo = '#166534'; colorInactivo = '#f0fdf4';
                textoActivo = 'white'; textoInactivo = '#166534';
                borde = '#bcf0da';
            } 
            else if (valorBoton.includes('ROT')) { // 🔴 REFLEJOS (ROJO)
                colorActivo = '#991b1b'; colorInactivo = '#fef2f2';
                textoActivo = 'white'; textoInactivo = '#991b1b';
                borde = '#fecaca';
            }
            else if (valorBoton.includes('(+)')) { // 🧪 EXAMEN POSITIVO
                colorActivo = '#166534'; colorInactivo = '#dcfce7';
                textoActivo = 'white'; textoInactivo = '#166534';
                borde = '#86efac';
            }
            else if (valorBoton.includes('(-)')) { // 🧪 EXAMEN NEGATIVO
                colorActivo = '#991b1b'; colorInactivo = '#fee2e2';
                textoActivo = 'white'; textoInactivo = '#991b1b';
                borde = '#fca5a5';
            }

            // Aplicamos los estilos si logramos identificar la categoría
            if (colorActivo) {
                b.style.background = yaSeleccionado ? colorActivo : colorInactivo;
                b.style.color = yaSeleccionado ? textoActivo : textoInactivo;
                b.style.borderColor = borde;
            }
        }
    });

    // Pintar el resto del panel
    this.renderizarTagsResumen();
    
    const cajaDiag = document.getElementById('caja-diagnostico');
    if (cajaDiag) {
        cajaDiag.innerHTML = FisioCidEngine.analizarPatrones(this.datosTemporales);
    }
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
    const panel = document.getElementById('panel-hallazgos-resumen');
    if (!panel) return;

    // 1. ESTRUCTURA BASE (Sin opacidades raras)
    if (!document.getElementById('contenedor-eva-urgente')) {
        panel.innerHTML = `
            <div id="contenedor-eva-urgente" style="margin-bottom: 8px;"></div>
            <div id="contenedor-escalas-azules" style="margin-bottom: 8px;"></div>
            <div id="contenedor-tags-amarillos" style="display: flex; flex-wrap: wrap; gap: 4px; padding: 4px 0;"></div>
        `;
    }

    // 2. 🔥 DOLOR ACTUAL (EVA) - Rojo Sólido y Potente
    const cEva = document.getElementById('contenedor-eva-urgente');
    const eva = window.FisioCidEngine.valorDolorEVA || 0;
    if (eva > 0) {
        cEva.innerHTML = `
            <div style="background:#ef4444; color:white; padding:8px; border-radius:8px; font-weight:900; text-align:center; border: 2px solid #fecaca; font-size:0.65rem; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                ⚠️ DOLOR ACTUAL (EVA): ${eva}/10
            </div>`;
    } else {
        cEva.innerHTML = '';
    }

    // 3. 🟡 HALLAZGOS (BOTONES) - El Dorado de FisioCid
    const cAmarillos = document.getElementById('contenedor-tags-amarillos');
    if (this.datosTemporales.length > 0) {
        cAmarillos.innerHTML = this.datosTemporales.map(t => `
            <div style="background:#d4af37; color:black; padding:3px 8px; border-radius:6px; font-size:0.6rem; font-weight:900; display:inline-flex; align-items:center; margin:2px; border: 1px solid #b8860b; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
                <span style="text-transform: uppercase;">${t}</span>
                <span onclick="modalEngine.clicTag('${t}')" style="cursor:pointer; color:#7f1d1d; margin-left:8px; font-weight:900; background:rgba(255,255,255,0.3); width:14px; height:14px; border-radius:50%; display:flex; align-items:center; justify-content:center;">✕</span>
            </div>
        `).join('');
    } else {
        cAmarillos.innerHTML = (eva === 0) ? `<small style="color: #475569; font-size: 0.55rem;">Esperando hallazgos clínicos...</small>` : '';
    }

    // 4. 🔵 ESCALAS (Oswestry, etc.) - Azul Cristalino
    if (window.FisioCidClinico) {
        window.FisioCidClinico.actualizarResumen();
    }
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

 
// UBICACIÓN: Dentro de FisioCidEngine en FisioCidEngine.js

// UBICACIÓN: FisioCidEngine.js
lanzarCuestionario: function(id) {
    console.log(`🚀 [FisioCid]: Intentando abrir escala: ${id}`);

    // 1. Validación del Banco de Datos
    const banco = window.BANCO_ESCALAS;
    if (!banco || !banco[id]) {
        console.warn(`⚠️ [FisioCid]: No existe la escala "${id}" en valoraciones.js`);
        return;
    }

    const escala = banco[id];
    this.escalaActiva = id; 

    // 2. Validación de Elementos HTML
    const titulo = document.getElementById('tituloEscala');
    const contenedor = document.getElementById('cuerpoEscala');
    const modalEl = document.getElementById('modalEscalaDinamica');

    if (!titulo || !contenedor || !modalEl) {
        console.error("❌ [FisioCid]: No se encontraron los IDs necesarios en el HTML.");
        return;
    }

    // 3. Renderizado de Contenido
    titulo.innerText = escala.nombre.toUpperCase();
    let html = "";
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
    contenedor.innerHTML = html;

    // 4. Gestión del Modal (Corrección de Accesibilidad y Z-Index)
    console.log("🎭 [FisioCid]: Mostrando modal de escala...");
    
    // 🚩 LIMPIEZA CLAVE: Evitamos la advertencia "Blocked aria-hidden" de la image_bbe75b.png
    modalEl.removeAttribute('aria-hidden'); 
    modalEl.style.zIndex = "10050";

    let instanciaModal = bootstrap.Modal.getInstance(modalEl);
    if (!instanciaModal) {
        instanciaModal = new bootstrap.Modal(modalEl, { 
            backdrop: 'static', 
            keyboard: true 
        });
    }
    
    instanciaModal.show();
},

// En modalEngine.js
calcularEscalaDinamica: function() {
    let puntos = 0;
    let textosSeleccionados = [];
    const inputs = document.querySelectorAll('.escala-input');
    
    inputs.forEach(sel => {
        if (sel.value !== "none") puntos += parseInt(sel.value);
        const texto = sel.selectedIndex > 0 ? sel.options[sel.selectedIndex].text : "";
        if(texto) textosSeleccionados.push(texto);
    });
    
    const escala = window.BANCO_ESCALAS[this.escalaActiva];
    if (escala && escala.interpretar) {
        // 🚩 Pasamos el diente (si existe) o los textos seleccionados
        const res = escala.interpretar(puntos, this.dienteActivoEnEscala || textosSeleccionados);
        
        const resVivo = document.getElementById('resultadoVivo');
        if (resVivo) {
            // Ajustamos el color según la rama para que haga juego con el diseño
            const colorRes = escala.rama === "fisioterapia" ? "#0ea5e9" : "#d4af37";
            resVivo.innerHTML = `<b style="color:${colorRes};">${puntos} PTS</b> - <small>${res.g}</small>`;
        }
        
        // 🚩 REGLA DE DERIVACIÓN (Igual que en FisioCidEngine)
        if (escala.rama === "odontologia" && window.PeriodontoFisioCid) {
            const textoFinal = res.notaClinica || `${escala.nombre}: ${res.g}`;
            window.PeriodontoFisioCid.actualizarHallazgoGlobal(this.escalaActiva, textoFinal);
        } 
        else if (escala.rama === "fisioterapia" && window.FisioCidClinico) {
            // Para Oswestry, DASH, etc., usamos el almacén azul
            window.FisioCidClinico.hallazgosEscalas[escala.nombre] = res.g;
            window.FisioCidClinico.actualizarResumen();
        }
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
    const rol = (localStorage.getItem('especialidadUsuario') || "GENERAL").toUpperCase().trim();
    const target = document.getElementById(mapaDestinos[paso]);
    
    // Acceso seguro a los hallazgos según el formato actual
    const hallazgos = Array.isArray(window.FisioCidEngine.datosTemporales) 
                    ? window.FisioCidEngine.datosTemporales 
                    : (window.FisioCidEngine.datosTemporales?.hallazgos || []);

    // 1. ANÁLISIS REFERENCIAL (Para uso exclusivamente informativo)
    window.FisioCidEngine.analizarPatrones(hallazgos);
    const diagnosticosOrdenados = [...window.FisioCidEngine.diagnosticosActivos].sort((a, b) => b.puntosActuales - a.puntosActuales);
    const diag = diagnosticosOrdenados[0];

    // ==========================================
    // 🚩 FILTRO PRINCIPAL: PASO DE EXPLORACIÓN
    // ==========================================
    if (paso === 'exploracion') {
        
        // 🏃 RAMA FISIOTERAPIA (Versión Blindada ante COFEPRIS)
        if (role === "FISIOTERAPEUTA") {
            let reporteExploracion = `[EXPLORACIÓN FÍSICA DE COLUMNA LUMBAR]\n`;
            const eva = window.FisioCidEngine.valorDolorEVA || 0;
            
            if (eva > 0) reporteExploracion += `• Intensidad del dolor actual: ${eva}/10 EVA.\n`;
            
            if (hallazgos.length > 0) {
                reporteExploracion += `• Signos y pruebas clínicas registradas:\n  - ${hallazgos.join("\n  - ")}\n`;
            } else {
                reporteExploracion += `• No se determinaron hallazgos específicos durante la evaluación.\n`;
            }

            // Inyección de sugerencia bibliográfica (Educativo, NO prescriptivo)
            if (diag) {
                reporteExploracion += `\n🔍 [CORRELACIÓN CLÍNICA SUGERIDA]:\n`;
                reporteExploracion += `Los signos recopilados presentan compatibilidad bibliográfica con criterios de: ${diag.nombre.toUpperCase()}.\n`;
                reporteExploracion += `⚠️ NOTA LEGAL: Este dato constituye una referencia informativa basada en guías clínicas. Corresponde exclusivamente al profesional validar, descartar o dictaminar el diagnóstico final, así como estructurar el plan de intervención manual pertinente.`;
            }

            if (target) {
                target.value = (target.value ? target.value + "\n\n" : "") + reporteExploracion;
                target.style.border = "2px solid #d4af37"; // Dorado FisioCid Premium
            }

            // ⛔ AUTOMATIZACIONES DE TRATAMIENTO APAGADAS:
            // Dejamos los textareas libres para el llenado manual del profesional.
            console.log("💾 Rama Fisio: Hallazgos descriptivos inyectados. Campos libres para prevención legal.");
        }

        // 🦷 RAMA ODONTOLOGÍA (¡Conectada y lista!)
        else if (rol === "ODONTOLOGO") {
            const m = document.getElementById('val-mallampati')?.value || 'N/D';
            // Aquí se conecta de forma segura con el módulo del periodontograma que creaste
            const reporteDental = window.PeriodontoFisioCid && typeof window.PeriodontoFisioCid.generarReporteTexto === 'function'
                ? window.PeriodontoFisioCid.generarReporteTexto() 
                : "Sin hallazgos periodontales registrados.";

            let notaDental = `[EXPLORACIÓN ESTOMATOLÓGICA]\n• Clasificación Mallampati: Clase ${m}\n• Reporte de Periodonto: ${reporteDental}`;
            
            if (target) {
                target.value = (target.value ? target.value + "\n\n" : "") + notaDental;
                target.style.border = "2px solid #0284c7"; // Azul Odonto
            }
            console.log("💾 Rama Odontología conectada con éxito.");
        }

        // 🥗 RAMA NUTRICIÓN
        else if (rol === "NUTRICIONISTA") {
            const p = document.getElementById('nut-peso')?.value || '--';
            const t = document.getElementById('nut-talla')?.value || '--';
            let notaNutricion = `[ANTROPOMETRÍA E HISTORIAL NUTRICIONAL]\n• Peso Actual: ${p} kg\n• Estatura: ${t} cm`;
            
            if (target) {
                target.value = (target.value ? target.value + "\n\n" : "") + notaNutricion;
            }
        }

        // 🧠 RAMA PSICOLOGÍA
        else if (rol === "PSICOLOGO") {
            const obs = document.getElementById('psi-observaciones')?.value || '';
            let notaPsicologia = `[EXAMEN MENTAL Y OBSERVACIONES CLÍNICAS]\n• Hallazgos conductuales: ${obs}`;
            
            if (target) {
                target.value = (target.value ? target.value + "\n\n" : "") + notaPsicologia;
            }
        }
    }

    // ==========================================
    // 🚩 NOTA: El antiguo bloque 'B' Automatizado 
    // de objetivos/tratamientos ha sido eliminado 
    // para cumplir con los lineamientos de COFEPRIS.
    // ==========================================

    // 🚩 C. INTEGRACIÓN ADICIONAL DE HALLAZGOS GENERALES
    // Para roles médicos generales u otros pasos de notas administrativas
    if (rol !== "FISIOTERAPEUTA" && rol !== "ODONTOLOGO" && target && (hallazgos.length > 0 || window.FisioCidEngine.valorDolorEVA > 0)) {
        const previo = target.value ? target.value + "\n" : "";
        let textoAIntegrar = "";
        const evaActual = window.FisioCidEngine.valorDolorEVA || 0;
        
        if (evaActual > 0) textoAIntegrar += `- DOLOR ACTUAL (EVA): ${evaActual}/10\n`;
        if (hallazgos.length > 0) textoAIntegrar += "- " + hallazgos.join("\n- ");
        
        target.value = previo + textoAIntegrar;
    }

    // 🚩 D. LIMPIEZA CONDICIONAL DE LA BOLSA DE DATOS
    if (paso === 'ejercicios' || paso === 'plan') {
        window.FisioCidEngine.datosTemporales = [];
        window.FisioCidEngine.diagnosticosActivos = []; 
        console.log("🧹 Consulta finalizada: Bolsa de datos vaciada.");
    } else {
        console.log("💾 Paso intermedio: Datos preservados para el motor secuencial.");
    }

    // 🧼 Cerrar el asistente visual de forma limpia
    const modal = document.getElementById('modal-cid-universal');
    if (modal) modal.remove();
    
    console.log(`✅ Integración del paso [${paso}] ejecutada bajo normativa legal.`);
},

buscarProtocolo: function() {
    const biblioteca = window.BIBLIOTECA_PROTOCOLOS;
    if (!biblioteca) return null;

    const motivo = document.getElementById('motivo')?.value.toLowerCase() || "";
    let encontrado = null;

    // 🧠 BUSQUEDA OMNISCIENTE: Recorremos todas las ramas (Fisio, Nutri, Odonto, etc.)
    Object.keys(biblioteca).forEach(rama => {
        const match = biblioteca[rama].find(proto => 
            proto.triggers.some(t => motivo.includes(t))
        );
        if (match) encontrado = match;
    });

    // Si no encuentra nada por texto, devolvemos el primero de Fisio como seguridad
    return encontrado || biblioteca.fisioterapia[0];
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
    console.log("🧠 Motor FisioCid: Iniciando análisis omnisciente...", datos);
    
    // 🚩 1. CONEXIÓN GLOBAL: Leemos el objeto organizado por ramas
    const biblioteca = window.BIBLIOTECA_PROTOCOLOS;
    
    if (!biblioteca) {
        console.error("❌ ERROR: BIBLIOTECA_PROTOCOLOS no detectada en window.");
        return "<div style='color:#94a3b8; font-size:0.55rem; padding:15px; text-align:center;'>Error de vinculación con la base de datos.</div>";
    }

    this.diagnosticosActivos = [];
    let htmlSugerencias = "";
    const datosEnMinuscula = datos.map(d => this.limpiarTexto(d));

    // 🔍 2. RECORRIDO MULTI-ESPECIALIDAD
    // Iteramos sobre cada rama (fisioterapia, nutricion, odontologia, etc.)
    Object.keys(biblioteca).forEach(rama => {
        
        // Iteramos sobre cada protocolo dentro de esa rama
        biblioteca[rama].forEach(protocolo => {
            
            // Si el protocolo no tiene diferenciales (ej. es preventivo), lo saltamos
            if (!protocolo.diferenciales) return;

            protocolo.diferenciales.forEach(diag => {
                let puntos = 0;
                if (!diag.criteriosPesados) return;

                diag.criteriosPesados.forEach(c => {
                    const criterioId = this.limpiarTexto(c.id);
                    
                    // Match inteligente
                    const match = datosEnMinuscula.some(hallazgo => {
                        const hLimpio = this.limpiarTexto(hallazgo);
                        return hLimpio.includes(criterioId) || criterioId.includes(hLimpio);
                    });
                    
                    if (match) {
                        puntos += c.puntos;
                    }
                });

                // 3. RENDERIZADO SI SUPERA EL UMBRAL
                if (puntos >= (diag.umbral || 3)) {
                    this.diagnosticosActivos.push({ ...diag, puntosActuales: puntos }); 
                    
                    const colorCerteza = diag.color || (puntos >= 6 ? "#16a34a" : "#ca8a04");
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
        });
    });

    if (htmlSugerencias === "") {
        return "<div style='color:#64748b; font-size:0.6rem; text-align:center; padding:20px;'>Complete más pruebas para ver diagnósticos diferenciales.</div>";
    }
    
    return htmlSugerencias;
},

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
