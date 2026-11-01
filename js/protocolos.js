// Asegúrate de que empiece ASÍ:
window.BIBLIOTECA_PROTOCOLOS = {
 
   // Dentro de window.BIBLIOTECA_PROTOCOLOS
ODONTOLOGO: [
    {
        titulo: "Rehabilitación Integral / Prótesis Fija",
        id: "DENT_REHAB_001",
        triggers: ["caries", "corona", "dolor dental", "protesis", "estetica dental", "muela", "juicio"],
        fuentes: { clinica: "Protocolos de Rehabilitación Oral", anatomia: "Arcadas dentarias y ATM" },
        gabinete_sugerido: { RX: ["Panorámica", "Periapical"], USG: [], RMN: ["ATM (si hay chasquido)"] },
        anamnesis: {
            sintomas: ["Sensibilidad térmica", "Dolor al masticar", "Sangrado gingival", "Movilidad"],
            redFlags: ["Absceso fluctuante", "Trismo severo", "Parestesia mandibular"]
        },
        exploracion: {
            escalas: [{ nombre: "Índice de Placa O'Leary", id: "oleary" }],
            pruebasOrtopedicas: [
                { 
                    categoria: "Pruebas de Vitalidad", 
                    items: [{ 
                        nombre: "Prueba térmica (Endo-Ice)", 
                        tecnica: "Aplicación de frío en cara vestibular." 
                    }
                ] 
            }
            ] 
},
              diferenciales: [
             {
    nombre: "Pulpitis Irreversible Aguda",
    color: "#ef4444", // Rojo intenso por urgencia
    umbral: 12,
    criteriosPesados: [
        { id: "Dolor espontáneo y nocturno", puntos: 8 },
        { id: "Sensibilidad prolongada al frío (>30 seg)", puntos: 6 },
        { id: "Dolor que aumenta al acostarse", puntos: 4 }
    ],
    hallazgosImagen: [
        { palabraClave: "CARIES PROFUNDA", puntos: 5 },
        { palabraClave: "ENSANCHAMIENTO ESPACIO PERIODONTAL", puntos: 3 }
    ],
    objetivoSug: "Eliminar el tejido pulpar infectado (Endodoncia).",
    formatoFisio: "inflamación pulpar irreversible.", // Adaptado
    fases: {
        fase_aguda: {
            dolor: "9-10/10",
            objetivos_smart: ["Lograr anestesia profunda y acceso cameral en <20 min."],
            planTratamiento: {
                objetivos: ["Urgencia paliativa", "Pulpectomía"],
                clinica: ["Apertura y extirpación pulpar", "Irrigación con NaOCl"],
                ejercicios: ["Evitar masticar del lado afectado", "Analgesia prescrita"]
            }
        },
        fase_funcional: {
            dolor: "0/10",
            objetivos_smart: ["Obturación de conductos y reconstrucción final en 7 días."],
            planTratamiento: {
                objetivos: ["Sellado tridimensional", "Restauración"],
                clinica: ["Condensación de gutapercha", "Poste de fibra/Corona"],
                ejercicios: ["Higiene interproximal estricta"]
                }
              }
            }
        },
        {
    nombre: "Periodontitis Estadio III / IV",
    color: "#f59e0b", // Naranja (crónico)
    umbral: 10,
    criteriosPesados: [
        { id: "Movilidad Dental Grado 2 o 3", puntos: 7 },
        { id: "Sangrado profuso al sondaje", puntos: 4 },
        { id: "Supuración (Pus) crevicular", puntos: 6 }
    ],
    hallazgosImagen: [
        { palabraClave: "PÉRDIDA ÓSEA VERTICAL", puntos: 8 },
        { palabraClave: "AFECTACIÓN DE FURCA", puntos: 5 }
    ],
    objetivoSug: "Detener la progresión de la pérdida ósea y estabilizar soporte.",
    formatoFisio: "pérdida de inserción periodontal.",
    fases: {
        fase_aguda: {
            dolor: "4-6/10",
            objetivos_smart: ["Reducir índice de sangrado a <20% en 15 días."],
            planTratamiento: {
                objetivos: ["Desinfección", "Control de biofilm"],
                clinica: ["Raspado y Alisado Radicular (RAR)", "Curetaje"],
                ejercicios: ["Técnica de Bass modificada", "Uso de cepillos interdentales"]
            }
        },
        fase_funcional: {
            dolor: "0-1/10",
            objetivos_smart: ["Mantener profundidad de sondeo <4mm en reevaluación a los 3 meses."],
            planTratamiento: {
                objetivos: ["Mantenimiento periodontal", "Ferulización si es necesario"],
                clinica: ["Profilaxis profesional profunda", "Control de carga oclusal"],
                ejercicios: ["Protocolo de mantenimiento trimestral"]
            }
        }
    }
},
{
    nombre: "Disfunción Temporomandibular Miofascial",
    color: "#8b5cf6", // Morado (muy común en FisioCid)
    umbral: 9,
    criteriosPesados: [
        { id: "Chasquido o clic articular", puntos: 5 },
        { id: "Bruxismo / Desgaste dentario", puntos: 4 },
        { id: "Apertura bucal limitada (<35mm)", puntos: 6 }
    ],
    hallazgosImagen: [
        { palabraClave: "APLANAMIENTO DEL CÓNDILO", puntos: 4 },
        { palabraClave: "DESPLAZAMIENTO DEL DISCO", puntos: 7 }
    ],
    objetivoSug: "Relajar musculatura masticatoria y reprogramar oclusión.",
    formatoFisio: "hipertonía de maseteros y pterigoideos.",
    fases: {
        fase_aguda: {
            dolor: "7-9/10",
            objetivos_smart: ["Aumentar apertura bucal en 5mm en la primera semana."],
            planTratamiento: {
                objetivos: ["Desinflamación articular", "Relajación muscular"],
                clinica: ["Láser terapéutico", "Terapia manual intrabucal"],
                ejercicios: ["Termoterapia local", "Dieta blanda estricta"]
            }
        },
        fase_subaguda: {
            dolor: "3-5/10",
            objetivos_smart: ["Uso de guarda oclusal nocturna el 100% de los días."],
            planTratamiento: {
                objetivos: ["Protección dental", "Estabilización"],
                clinica: ["Ajuste de guarda miorrelajante", "TENS"],
                ejercicios: ["Ejercicios de Rocabado", "Control de estrés/hábitos"]
            }
        }
    }
}
    ]
}
  ],
// Dentro de window.BIBLIOTECA_PROTOCOLOS

  
}; 