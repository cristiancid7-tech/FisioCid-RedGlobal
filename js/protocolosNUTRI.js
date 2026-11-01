window.BIBLIOTECA_PROTOCOLOS = {
 
 // Dentro de window.BIBLIOTECA_PROTOCOLOS
NUTRIOLOGO: [
    {
        titulo: "Abordaje Nutricional: Obesidad y Riesgo Metabólico",
        id: "NUT_METAB_001",
        triggers: ["obesidad", "sobrepeso", "dieta", "diabetes", "colesterol"],
        fuentes: { clinica: "Guías ADA / OMS", anatomia: "Tejido Adiposo / Sistema Digestivo" },
        gabinete_sugerido: { RX: [], USG: ["Hígado graso (USG Abdominal)"], RX: [] },
        anamnesis: {
            sintomas: ["Fatiga crónica", "Polidipsia", "Ansiedad por dulce", "Acanthosis nigricans"],
            redFlags: ["Pérdida de peso inexplicable", "Poliuria extrema"]
        },
        exploracion: {
            escalas: [{ nombre: "Cuestionario de Frecuencia de Consumo", id: "cfca" }],
            pruebasOrtopedicas: [
                { categoria: "Antropometría", items: [{ nombre: "Medición Pliegues", tecnica: "Uso de plicómetro en bicipital y tricipital." }] }
            ]
        },
        objetivoSug: "Reducción de riesgo cardiovascular y optimización de composición corporal.",
        fases: {
            fase_aguda: { // En nutri la llamamos "Fase de Choque/Adaptación"
                dolor: "N/A",
                objetivos_smart: ["Reducir consumo de azúcares simples al 0% en la primera semana."],
                planTratamiento: {
                    objetivos: ["Desinflamación", "Educación nutricional"],
                    clinica: ["Plan Hipocalórico Proteico", "Cálculo de Requerimientos (Mifflin-St Jeor)"],
                    ejercicios: ["Caminata suave 20 min"]
                }
            },
            fase_funcional: { 
                dolor: "N/A",
                objetivos_smart: ["Mantener pérdida de 0.5kg semanales de grasa por 1 mes."],
                planTratamiento: {
                    objetivos: ["Mantenimiento", "Hipertrofia"],
                    clinica: ["Plan Normocalórico", "Ajuste de macros (G:30%, P:25%, C:45%)"],
                    ejercicios: ["Entrenamiento de fuerza 3-4 veces/semana"]
                }
            }
        }
    }
],