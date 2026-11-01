// ============================================================================
// 🧠 modalEngine.js - Motor de Orquestación Clínico en 3 Pasos
// ============================================================================

const modalEngine = {
    pasoActual: 'anamnesis', // 1: anamnesis | 2: exploracion | 3: plan

    CONFIG_ESPECIALIDADES: {
        FISIOTERAPIA: {
            etiquetaBoton: "🛠️ ASISTENTE DE VALORACIÓN",
            pasos: {
                anamnesis: "Anamnesis y Cuestionarios",
                exploracion: "Pruebas Funcionales y EVA",
                plan: "Propuesta de Tratamiento"
            }
        },
        ODONTOLOGIA: {
            etiquetaBoton: "🛠️ ASISTENTE ODONTOLÓGICO",
            pasos: {
                anamnesis: "Historial Bucal y Síntomas",
                exploracion: "Periodontograma y Caries",
                plan: "Plan Dental y Presupuesto"
            }
        },
        NUTRICION: {
            etiquetaBoton: "🛠️ ASISTENTE NUTRICIONAL",
            pasos: {
                anamnesis: "Habitos y Cuestionario 24h",
                exploracion: "Antropometria y Pliegues",
                plan: "Plan Alimenticio"
            }
        },
        GENERAL: {
            etiquetaBoton: "🛠️ ASISTENTE CLÍNICO",
            pasos: {
                anamnesis: "Motivo de Consulta",
                exploracion: "Exploración Física",
                plan: "Diagnóstico y Receta"
            }
        }
    },

    obtenerEspecialidadActiva: function() {
        const raw = (localStorage.getItem('especialidadUsuario') || localStorage.getItem('rol_actual') || 'GENERAL').toUpperCase().trim();
        if (raw.includes('FISIO') || raw.includes('REHABILITA')) return 'FISIOTERAPIA';
        if (raw.includes('DENT') || raw.includes('ODONTO')) return 'ODONTOLOGIA';
        if (raw.includes('NUTRI')) return 'NUTRICION';
        return 'GENERAL';
    },

    // 🎨 ADAPTADOR DE BOTÓN E INTERFAZ INICIAL
    adaptarBotonAsistente: function() {
    const espKey = this.obtenerEspecialidadActiva();
    const config = this.CONFIG_ESPECIALIDADES[espKey] || this.CONFIG_ESPECIALIDADES.GENERAL;

    const btnAsistente = document.getElementById('btn-asistente-exploracion');
    if (btnAsistente) {
        btnAsistente.disabled = false;
        btnAsistente.style.opacity = "1";
        btnAsistente.style.cursor = "pointer";
        btnAsistente.innerText = config.etiquetaBoton;
    }

    // 🚀 SOLO INICIALIZAMOS LAS ARCADAS (SIN SOBREESCRIBIR EL DOM CON MAQUETAS VIEJAS)
    if (espKey === 'ODONTOLOGIA' && window.PeriodontoFisioCid) {
        window.PeriodontoFisioCid.iniciarArcadas();
    }
},


abrirAsistente: function(paso = 'anamnesis') {
    const espKey = this.obtenerEspecialidadActiva();

if (espKey === 'ODONTOLOGIA') {
    const modalEl = document.getElementById('modalOdontoFullscreen');
    
    if (!modalEl) {
        console.error("❌ No se encontró #modalOdontoFullscreen en el DOM.");
        return;
    }

    // Mover el modal fuera de cualquier contenedor o sidebar
    if (modalEl.parentElement !== document.body) {
        document.body.appendChild(modalEl);
    }

    // Inicializar modal con Bootstrap 5
    let inst = bootstrap.Modal.getInstance(modalEl);
    if (!inst) {
        inst = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: true });
    }
    inst.show();

    // Renderizar arcadas
    setTimeout(() => {
        if (window.PeriodontoFisioCid && typeof window.PeriodontoFisioCid.iniciarArcadas === 'function') {
            window.PeriodontoFisioCid.iniciarArcadas();
        }
    }, 150);

    return;
}

    this.generarInterfazModal(this.CONFIG_ESPECIALIDADES[espKey]?.protocoloDefecto || 'CONSULTA_GENERAL', paso);
},

    // 🏷️ INYECCIÓN DE HALLAZGOS Y ENVÍO AL NIVEL 3 (FisioCidEngine)
    clicTag: function(textoTag, elementoBtn) {
        if (!textoTag) return;

        if (elementoBtn) elementoBtn.classList.toggle('active');

        // Pasa los datos directamente al Motor Salida / Omnisciente
        if (window.FisioCidEngine) {
            const yaExiste = window.FisioCidEngine.datosTemporales.includes(textoTag);
            if (!yaExiste) {
                window.FisioCidEngine.datosTemporales.push(textoTag);
            } else {
                window.FisioCidEngine.datosTemporales = window.FisioCidEngine.datosTemporales.filter(t => t !== textoTag);
            }

            // El Nivel 3 calcula y refresca el resultado
            this.actualizarPanelDiagnostico();
        }
    },

    // 📊 ACTUALIZA EL PANEL RESULTANTE (Nivel 3)
    actualizarPanelDiagnostico: function() {
        const cajaDiag = document.getElementById('caja-diagnostico');
        if (cajaDiag && window.FisioCidEngine) {
            cajaDiag.innerHTML = window.FisioCidEngine.analizarPatrones(window.FisioCidEngine.datosTemporales);
        }
    }
};

window.modalEngine = modalEngine;