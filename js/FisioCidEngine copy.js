const FisioCidEngine = {
    datosTemporales: [],
    diagnosticosActivos: [],

    // 🚩 FUNCIÓN DE LIMPIEZA (Ahora fuera para que no de error)
    limpiarTexto: function(t) {
        if (!t) return "";
        return t.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Quita acentos
            .replace(/[()+\-]/g, "")         // Quita símbolos
            .trim();
    },
    analizarPatrones: function(datos) {
        console.log("🧠 Motor FisioCid: Accediendo a BIBLIOTECA_PROTOCOLOS...", datos);
        
        // 1. CONEXIÓN CON TU BIBLIOTECA REAL
        const biblioteca = window.BIBLIOTECA_PROTOCOLOS;
        const p = (biblioteca && biblioteca.fisioterapia) ? biblioteca.fisioterapia[0] : null;
        
        if (!p || !p.diferenciales) {
            console.error("❌ ERROR: No se encontró la ruta BIBLIOTECA_PROTOCOLOS.fisioterapia[0]");
            return "<div style='color:#94a3b8; font-size:0.55rem; padding:15px; text-align:center;'>Error de vinculación con la biblioteca.</div>";
        }

        this.diagnosticosActivos = [];
        let htmlSugerencias = "";

        // Limpiamos los hallazgos que vienen de los botones
        const datosLimpios = datos.map(d => this.limpiarTexto(d));

        p.diferenciales.forEach(diag => {
            let puntos = 0;
            if (!diag.criteriosPesados) return;

            diag.criteriosPesados.forEach(c => {
                const criterioLimpio = this.limpiarTexto(c.id);
                
                // 🧠 Búsqueda de coincidencia inteligente
                const existeMatch = datosLimpios.some(hallazgo => 
                    hallazgo.includes(criterioLimpio) || criterioLimpio.includes(hallazgo)
                );
                
                if (existeMatch) {
                    puntos += c.puntos;
                    console.log(`✨ [${diag.nombre}] +${c.puntos} pts por: ${c.id}`);
                }
            });

            // 2. RENDERIZADO DE LA BARRA (Usando tus colores de protocolo)
            if (puntos >= (diag.umbral || 3)) {
                this.diagnosticosActivos.push({ ...diag, puntosActuales: puntos });

                const colorBarra = diag.color || "#ca8a04";
                const objetivo = diag.objetivoSug ? `<br><i style="font-size:0.55rem; color:#cbd5e1; display:block; margin-top:4px;">🎯 ${diag.objetivoSug}</i>` : "";
                
                htmlSugerencias += `
                    <div style="border-left: 5px solid ${colorBarra}; background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <b style="color:white; font-size:0.7rem; text-transform:uppercase;">${diag.nombre}</b>
                            <span style="background:${colorBarra}; color:white; padding:2px 7px; border-radius:12px; font-size:0.55rem; font-weight:900;">${puntos} PTS</span>
                        </div>
                        ${objetivo}
                    </div>`;
            }
        });

        if (htmlSugerencias === "") {
            return `<div style="color:#64748b; font-size:0.55rem; text-align:center; padding:20px; border: 1px dashed #334155; border-radius:8px; margin:10px;">
                Seleccione hallazgos para ver diagnósticos.
            </div>`;
        }

        return htmlSugerencias;
    },

    // 🔍 2. BÚSQUEDA DE PROTOCOLO (Ahora bien cerrada dentro del objeto)
    buscarProtocolo: function() {
        if (typeof window.protocolos === 'undefined') return null;
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        
        // Si hay un ID en la URL lo usa, si no, agarra el primero por defecto
        return window.protocolos.find(p => p.id === id) || window.protocolos[0];
    },

// [ EN FisioCidEngine.js ]
abrirAsistente: function(paso = 'anamnesis') {
    console.log("🚀 Sincronizando y abriendo desde el motor...");
    
    // Sincronizamos el EVA del slider al motor
    const evaSlider = document.getElementById('eva_slider');
    if (evaSlider) {
        this.datosTemporales.eva = evaSlider.value;
    }

    // Le pedimos al modalEngine que abra la interfaz
    if (typeof modalEngine !== 'undefined') {
        modalEngine.abrirAsistente(paso);
    }
},
    lanzarCuestionario: function(id, nombre) {
    // 🚩 CONEXIÓN: Buscamos en el archivo valoraciones.js
    const escala = window.BANCO_ESCALAS ? window.BANCO_ESCALAS[id] : null;
    
    if (!escala) {
        console.error("No se encontró la escala:", id);
        return;
    }

    this.escalaActiva = id; 
    
    // Si usas un modal de Bootstrap para las preguntas:
    const titulo = document.getElementById('tituloEscala');
    if (titulo) titulo.innerText = escala.nombre.toUpperCase();
    
    const contenedor = document.getElementById('cuerpoEscala');
    let html = "";
    
    escala.preguntas.forEach((p, i) => {
        html += `
            <div style="margin-bottom: 15px; padding: 10px; border-bottom: 1px solid #eee;">
                <label style="display:block; font-weight:bold; font-size:0.8rem; margin-bottom:5px;">${i+1}. ${p.t.toUpperCase()}</label>
                <select class="form-select escala-input" onchange="FisioCidEngine.calcularEscalaDinamica()" style="width:100%; padding:5px; font-size:0.75rem;">
                    <option value="none">Seleccione...</option>
                    ${p.o.map((opcion, valor) => `<option value="${valor}">${opcion.toUpperCase()}</option>`).join('')}
                </select>
            </div>`;
    });
    
    if (contenedor) {
        contenedor.innerHTML = html;
        // Lanzamos el modal (Asegúrate de tener el ID modalEscalaDinamica en tu HTML)
        const modalEl = document.getElementById('modalEscalaDinamica');
        const m = new bootstrap.Modal(modalEl);
        m.show();
    }
},

calcularEscalaDinamica: function() {
    let puntos = 0;
    const selects = document.querySelectorAll('.escala-input');
    selects.forEach(s => {
        if (s.value !== "none") puntos += parseInt(s.value);
    });

    const escala = window.BANCO_ESCALAS[this.escalaActiva];
    const resultadoVivo = document.getElementById('resultadoVivo');
    
    if (escala && escala.interpretar && resultadoVivo) {
        const res = escala.interpretar(puntos);
        // Esto es lo que ves mientras marcas:
        resultadoVivo.innerHTML = `<b style="color:#d4af37;">${res.p} PTS</b> - <small>${res.g}</small>`;
        this.ultimoResultadoEscala = `${escala.nombre}: ${res.g}`;
    }
},

finalizarEscala: function() {
    if (this.ultimoResultadoEscala) {
        // 🚩 INTEGRACIÓN: Metemos el resultado a la bolsa de hallazgos
        modalEngine.clicTag(this.ultimoResultadoEscala);
        
        const modalEl = document.getElementById('modalEscalaDinamica');
        const m = bootstrap.Modal.getInstance(modalEl);
        if (m) m.hide();
    }
},
// --- DENTRO DE FisioCidEngine ---
valorDolorEVA: 0, // Variable para guardar el dolor

registrarEVA_Directo: function(valor) {
    this.valorDolorEVA = parseInt(valor);
    console.log("🌡️ EVA registrado en el motor:", this.valorDolorEVA);
    
    // Llamamos a la función que desbloquea el botón
    this.validarAccesoAsistente();
},

validarAccesoAsistente: function() {
    const btnAsistente = document.querySelector('.btn-asistente-exploracion'); // Ajusta a tu clase real
    if (btnAsistente) {
        if (this.valorDolorEVA > 0) {
            btnAsistente.disabled = false;
            btnAsistente.style.opacity = "1";
            btnAsistente.style.cursor = "pointer";
            btnAsistente.title = "Listo para evaluar";
        } else {
            btnAsistente.disabled = true;
            btnAsistente.style.opacity = "0.5";
            btnAsistente.style.cursor = "not-allowed";
            btnAsistente.title = "Seleccione el nivel de dolor para continuar";
        }
    }
}
};



// 🌍 4. LANZAMIENTO GLOBAL
window.FisioCidEngine = FisioCidEngine;