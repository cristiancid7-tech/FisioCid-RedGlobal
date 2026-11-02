// ============================================================================
// 🧠 modalEngine.js - Motor de Orquestación Clínico en 3 Pasos
// ============================================================================

const modalEngine = {
    pasoActual: 'anamnesis', // 1: anamnesis | 2: exploracion | 3: plan

    CONFIG_ESPECIALIDADES: {
        FISIOTERAPIA: {
            etiquetaBoton: "🛠️ ASISTENTE DE VALORACIÓN FÍSICA",
            modalId: "modalFisioFullscreen",
            pasos: {
                anamnesis: "Anamnesis y Cuestionarios",
                exploracion: "Pruebas Funcionales y EVA",
                plan: "Propuesta de Tratamiento"
            }
        },
        ODONTOLOGIA: {
            etiquetaBoton: "🛠️ ASISTENTE ODONTOLÓGICO",
            modalId: "modalOdontoFullscreen",
            pasos: {
                anamnesis: "Historial Bucal y Síntomas",
                exploracion: "Periodontograma y Caries",
                plan: "Plan Dental y Presupuesto"
            }
        },
        PSICOLOGIA: {
            etiquetaBoton: "🧠 ASISTENTE DE EVALUACIÓN PSICOLÓGICA",
            modalId: "modalPsicoFullscreen",
            pasos: {
                anamnesis: "Historial Emocional y Motivo",
                exploracion: "Escalas Psicométricas (PHQ-9 / GAD-7)",
                plan: "Objetivos Terapéuticos y Tareas"
            }
        },
        NUTRICION: {
            etiquetaBoton: "🛠️ ASISTENTE NUTRICIONAL",
            modalId: "modalNutriFullscreen",
            pasos: {
                anamnesis: "Hábitos y Cuestionario 24h",
                exploracion: "Antropometría y Pliegues",
                plan: "Plan Alimenticio"
            }
        },
        GENERAL: {
            etiquetaBoton: "🛠️ ASISTENTE CLÍNICO",
            modalId: "modalGeneralFullscreen",
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
        if (raw.includes('PSICO') || raw.includes('MENTAL') || raw.includes('TERAPIA')) return 'PSICOLOGIA';
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

        // 🚀 INICIALIZACIÓN DE MOTORES SEGÚN ESPECIALIDAD
        if (espKey === 'ODONTOLOGIA' && window.PeriodontoFisioCid && typeof window.PeriodontoFisioCid.iniciarArcadas === 'function') {
            window.PeriodontoFisioCid.iniciarArcadas();
        } else if (espKey === 'PSICOLOGIA' && window.PsicoFisioCid && typeof window.PsicoFisioCid.actualizarIndicadoresVisuales === 'function') {
            window.PsicoFisioCid.actualizarIndicadoresVisuales();
        } else if (espKey === 'FISIOTERAPIA' && window.FisioFisioCid && typeof window.FisioFisioCid.inicializarPruebas === 'function') {
            window.FisioFisioCid.inicializarPruebas();
        }
    },

 abrirAsistente: function(paso = 'anamnesis') {
    const espKey = this.obtenerEspecialidadActiva();
    const config = this.CONFIG_ESPECIALIDADES[espKey] || this.CONFIG_ESPECIALIDADES.GENERAL;
    const targetModalId = config.modalId || 'modalOdontoFullscreen';
    
    let modalEl = document.getElementById(targetModalId);

    // Si no existe el modal específico, busca un modal genérico o el de odontología para no romper el flujo
    if (!modalEl) {
        modalEl = document.getElementById('modalOdontoFullscreen') || document.getElementById('modalEscalaDinamica');
    }

    if (!modalEl) {
        console.error(`❌ [modalEngine]: No se encontró ningún modal en el DOM para la especialidad ${espKey}.`);
        return;
    }

    // Mover el modal fuera de contenedores reducidos al document.body para evitar capas transparentes o desalineaciones
    if (modalEl.parentElement !== document.body) {
        document.body.appendChild(modalEl);
    }

    // Instanciar y mostrar con Bootstrap 5
    let inst = bootstrap.Modal.getInstance(modalEl);
    if (!inst) {
        inst = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: true });
    }
    inst.show();

    // Rehidratación e inicialización de motores en caliente
    setTimeout(() => {
        if (espKey === 'ODONTOLOGIA' && window.PeriodontoFisioCid && typeof window.PeriodontoFisioCid.iniciarArcadas === 'function') {
            window.PeriodontoFisioCid.iniciarArcadas();
        } else if (espKey === 'PSICOLOGIA' && window.PsicoFisioCid) {
        if (typeof window.PsicoFisioCid.estirarLienzo === 'function') {
            window.PsicoFisioCid.estirarLienzo(); // 👈 Estira el modal de Psicología a pantalla completa
        }
        } else if (espKey === 'FISIOTERAPIA' && window.FisioFisioCid && typeof window.FisioFisioCid.cargarEstadoFisioterapiaMaestro === 'function') {
            const estadoFisio = window.pacienteCargado?.evaluacion_fisioterapia;
            if (estadoFisio) {
                window.FisioFisioCid.cargarEstadoFisioterapiaMaestro(estadoFisio);
            }
        }
    }, 150);
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