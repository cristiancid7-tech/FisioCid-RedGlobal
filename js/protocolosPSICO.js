window.BIBLIOTECA_PROTOCOLOS = {
    PSICOLOGO: [
    {
        titulo: "Trastorno de Ansiedad Generalizada (TAG)",
        id: "PSI_ANS_001",
        triggers: ["ansiedad", "estres", "panico", "nervios", "insomnio"],
        fuentes: { 
            clinica: "DSM-5 / CIE-11", 
            anatomia: "Eje HHA / Sistema Límbico" },
        gabinete_sugerido: { USG: [], RMN: ["Exclusión orgánica (si hay cefalea)"], RX: [] },
        anamnesis: {
            sintomas: ["Palpitaciones", "Pensamiento rumiante", "Irritabilidad", "Tensión muscular"],
            redFlags: ["Ideación suicida", "Abuso de sustancias", "Auto-lesión"]
        },
        exploracion: {
            escalas: [{ nombre: "Escala de Ansiedad de Hamilton", id: "ham_a" }],
            pruebasOrtopedicas: [ // Lo usamos para Examen Mental
                { categoria: "Funciones Cognitivas", 
                    items: [{ 
                        nombre: "Atención y Memoria", 
                        tecnica: "Prueba de dígitos e inversión de series." }
                    ]
                 }
            ]
        },
        objetivoSug: "Adquisición de herramientas de autorregulación emocional.",
        fases: {
            fase_aguda: { // Fase de Contención
                dolor: "Estrés 8-10/10",
                objetivos_smart: ["Disminuir ataques de pánico a 0 en los próximos 7 días."],
                planTratamiento: {
                    objetivos: ["Contención", "Psicoeducación"],
                    clinica: ["Técnica de Respiración Diafragmática", "Primeros Auxilios Psicológicos"],
                    ejercicios: ["Diario de pensamientos (Registro ABC)"]
                }
            },
            fase_funcional: { // Fase de Prevención de Recaídas
                dolor: "Estrés 1-3/10",
                objetivos_smart: ["Exposición gradual a situaciones sociales sin evitación en 1 mes."],
                planTratamiento: {
                    objetivos: ["Reestructuración cognitiva", "Autonomía"],
                    clinica: ["Terapia Cognitivo Conductual (TCC)", "Mindfulness"],
                    ejercicios: ["Exposición controlada", "Entrenamiento en asertividad"]
                }
            }
        }
    }
],
}; 