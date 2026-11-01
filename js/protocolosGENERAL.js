window.BIBLIOTECA_PROTOCOLOS = {  
  GENERAL: [
     {
    titulo: "Control y Seguimiento de Diabetes Mellitus",
    id: "MED_GEN_001",
    triggers: ["azucar", "diabetes", "sed", "mucha hambre", "orina mucho", "glucosa", "insulina", "herida no sana"],
    fuentes: { clinica: "ADA (American Diabetes Association)", anatomia: "Páncreas / Sistema Endocrino" },
    gabinete_sugerido: {
        Laboratorio: ["Hemoglobina Glicosilada (HbA1c)", "Glucosa en ayunas", "Perfil lipídico"],
        Examen_Fisico: ["Prueba de monofilamento (Sensibilidad)", "Fondo de ojo"]
    },
    anamnesis: {
        sintomas: ["Poliuria (orinar mucho)", "Polidipsia (sed excesiva)", "Polifagia (hambre constante)", "Visión borrosa", "Cicatrización lenta"],
        redFlags: ["🚩 Aliento con olor a frutas (Cetoacidosis)", "🚩 Confusión mental", "🚩 Pérdida de sensibilidad en pies"]
    },
    diferenciales: [
        {
            nombre: "DIABETES MELLITUS TIPO 2",
            color: "#3b82f6",
            umbral: 3,
            criteriosPesados: [
                { id: "HbA1c > 6.5%", puntos: 6 },
                { id: "Glucosa ayuno > 126 mg/dL", puntos: 5 },
                { id: "Sed excesiva y orina frecuente", puntos: 3 }
            ],
            formatoFisio: "Alteración metabólica caracterizada por hiperglucemia crónica debida a resistencia a la insulina.",
            fases: {
                fase_aguda: {
                    objetivos_smart: ["Estabilizar niveles de glucosa en rango 80-130 mg/dL"],
                    planTratamiento: { objetivos: ["Control glucémico", "Educación"], clinica: ["Ajuste farmacológico"], ejercicios: ["Caminata suave 15 min"] }
                }
            }
        }
    ]
}
 ]
 }; 