// Asegúrate de que empiece ASÍ:
window.BIBLIOTECA_PROTOCOLOS = {
    FISIOTERAPEUTA: [
        //ZONA LUMBAR
        {
            titulo: "Abordaje Integral de Columna Lumbar y Pelvis",
            id: "LUMBAR_RAD_001",
            triggers: ["lumbar", "espalda baja", "pelvis", "cadera", "ciatica", "nalga", "pompa", "lumbago", "hernia", "disco", "esteno"],
            fuentes: { 
                clinica: "Klaus Buckup / Díaz Mancha", 
                anatomia: "Netter / Moore (Niveles L1-S2)" 
            },
        gabinete_sugerido: {
    
        RMN: ["Deshidratación L4-L5", "Extrusión L5-S1", "Estenosis Canal", "Modic II", "Abombamiento L3-L4"],
    USG: ["Engrosamiento Nervio Ciático", "Inflamación Facetaria", "Edema de Partes Blandas"],
    RX: ["Disminución de Espacio", "Osteofitos Marginaes", "Escoliosis Antálgica"]
    },
    
          // 👤 1. ANAMNESIS (Sección: APOYO SÍNTOMAS)
            anamnesis: {
                sintomas: [
                    // --- GRUPO: LUMBAR / HERNIA ---
                    "Dolor central (Lumbago mecánico)", 
                    "Dolor irradiado (Ciatalgia)", 
                    "Parestesias / Hormigueo", 
                    "Aumento de dolor al sentarse / flexión", 
                    "Alivio en bipedestación / extensión",
                    "Dolor al toser o estornudar (Valsalva)",
                    "Debilidad muscular distal",
                    
                    // --- GRUPO: ESTENOSIS / FACETARIO ---
                    "Claudicación (Dolor al caminar)", // (Solo una vez)
                    "Rigidez matutina importante",
                    "Dolor bilateral", // 🚩 Importante para Estenosis
                    "Edad > 60 años",  // 🚩 Importante para Estenosis
                    
                    // --- GRUPO: GLÚTEO PROFUNDO ---
                    "Dolor glúteo profundo (punzante)", 
                    "Intolerancia a estar sentado > 20 min", 
                    "Sensación de 'pelota' o inflamación en glúteo",
                    "Parestesias que NO llegan al pie (solo muslo)",
                    "Dolor glúteo que mejora al caminar", 
                    "Dolor nocturno, se quita al acomodarse",
                    
                    // --- GRUPO: SACROILÍACA ---
                    "Dolor que NO cruza la rodilla",
                    "Dolor al subir escaleras / carga unipodal", // 🚩 Para SIJ
                    "Dolor al cambiar de posición (sedestación a bipedestación)", // 🚩 Para SIJ
                    
                    // --- GRUPO: LISTESIS / INESTABILIDAD ---
                    "Palpación de 'escalón' vertebral",
                    "Isquiotibiales muy cortos / rígidos",
                    
                    // --- GRUPO: NERVIO PERONEO ---
                    "Debilidad en dorsiflexión (Pie caído)",
                    "Inversión del pie preservada", // 🚩 Para diferenciar de L5
                    "Parestesias en cara lateral de pierna y dorso del pie" // 🚩 Para Peroneo
                ],
                redFlags: [
                    "🚩 Anestesia en silla de montar (S3-S5)", 
                    "🚩 Pérdida de control de esfínteres", 
                    "🚩 Déficit motor súbito", 
                    "🚩 Pérdida de peso",
                    "🚩 Antecedente de cáncer",
                    "🚩 Dolor nocturno que NO desaparece",
                    "🚩 Uso prolongado de corticoides" 
                ]
            
},
            
            exploracion: {
                neurologia: {
            
                    sensibilidad: [
                        { nivel: "L1", zona: "Inguinal/Trocánter", top: "40%", left: "45%" },
                        { nivel: "L2", zona: "Cara ant. Muslo (medio)", top: "48%", left: "46%" },
                        { nivel: "L3", zona: "Cóndilo femoral medial", top: "56%", left: "45%" },
                        { nivel: "L4", zona: "Maléolo medial", top: "68%", left: "47%" },
                        { nivel: "L5", zona: "Dorso del pie (3er espacio)", top: "78%", left: "48%" },
                        { nivel: "S1", zona: "Borde lateral pie (5to dedo)", top: "88%", left: "50%" }
                    ],
                    fuerza: [
                        { miotoma: "L1-L2", accion: "Flexión cadera (Psoas)" },
                        { miotoma: "L3", accion: "Extensión rodilla (Cuádriceps)" },
                        { miotoma: "L4", accion: "Dorsiflexión pie (Tibial Ant.)" },
                        { miotoma: "L5", accion: "Extensión 1er dedo (EHL)" },
                        { miotoma: "S1", accion: "Flexión plantar (Gastroc)" }
                    ],
                   reflejos: [
                        { rot: "L4", nombre: "Rotuliano (Cuádriceps)", nivel: "L2-L4" },
                        { rot: "S1", nombre: "Aquíleo (Gastronemios)", nivel: "L5-S2" }
                            ]
                },
             escalas: [
                { nombre: "Oswestry", id: "oswestry" },
                { nombre: "STarT Back", id: "start-back" },
                { nombre: "Orebro", id: "orebro" },
                { nombre: "roland-morris", id: "roland-morris" }
                      ],
        
         pruebasOrtopedicas: [
    {
        categoria: "Neurodinamia y Radiculares (Buckup)",
        items: [
            { nombre: "Lasègue (SLR)", tecnica: "Elevación pierna recta. Positivo si hay dolor radicular 30°-70°." },
            { nombre: "Slump Test", tecnica: "Flexión tronco/cuello + ext. rodilla + dorsiflexión. Máxima tensión dural." },
            { 
                nombre: "Palpación de 'escalón' vertebral", 
                tecnica: "Paciente en prono. Se palpan las apófisis espinosas buscando un salto o escalón entre vértebras." 
            },
            { nombre: "Bragard", tecnica: "Dorsiflexión súbita tras Lasègue (+). Confirma origen neural." },
            { nombre: "Wasserman", tecnica: "Extensión cadera en prono. Raíces altas (L2-L4)." },
            { 
                nombre: "Prueba de Kemp", 
                tecnica: "Con el paciente de pie, el examinador guía a una extensión lumbar máxima, rotación y flexión lateral." 
            }      
        ]
    }, 
    {
        categoria: "Atrapamientos Extracanaliculares",
        items: [
            { nombre: "Prueba de FAIR", tecnica: "Flexión, Aducción y Rotación Interna. (+) si reproduce dolor glúteo o ciático." },
            { nombre: "Beatty Test", tecnica: "Paciente de lado, eleva rodilla contra resistencia. (+) dolor en glúteo." },
            { nombre: "Palpación Escotadura", tecnica: "Presión directa sobre el trayecto del nervio ciático en el glúteo." },
            { 
                nombre: "Dolor localizado en la articulación SI (Signo de Fortin)", 
                tecnica: "El paciente indica con un solo dedo la ubicación exacta de su dolor sobre la articulación SI." 
            },
            { nombre: "Tinel Poplíteo", tecnica: "Percusión sobre el nervio en fosa poplítea. (+) parestesias distales." }
        ]
    }
]

            },

            diferenciales: [
             {
            nombre: "RADICULOPATÍA LUMBAR (HERNIA DISCAL)",
            color: "#ef4444",
            umbral: 4,
                 criteriosPesados: [
                 { id: "Oswestry: Discapacidad Grave", puntos: 4 },
                 { id: "Lasègue (+)", puntos: 4 },
                 { id: "Valsalva", puntos: 4 },
                 { id: "Aumento de dolor al sentarse / flexión", puntos: 2 },
                 { id: "Parestesias / Hormigueo", puntos: 1 },
                 { id: "Dolor glúteo que mejora al caminar", puntos: -2 } 
        
                                ],
             hallazgosImagen: [
                     { palabraClave: "HERNIA", puntos: 6 },
                     { palabraClave: "PROTRUSIÓN", puntos: 4 },
                     { palabraClave: "DISCOPATÍA", puntos: 2 }
                            ],
    
    objetivoSug: "Centralización (McKenzie) y reducción de carga discal.",
    formatoFisio: "Compromiso de la raíz nerviosa por desplazamiento discal con atrapamiento mecánico y edema circundante.",
    fases: {
        fase_aguda: {
            dolor: "8-10/10",
            objetivos_smart: [
                "Reducir el dolor basal a <7/10 mediante posiciones de descarga en 48h.",
                "Mantener independencia en traslados básicos sin aumento de síntomas radiculares."
            ],
            planTratamiento: {
                objetivos: ["Controlar inflamación", "Reducir mecanosensibilidad", "Educación postural"],
                clinica: ["Diatermia atérmica", "TENS convencional", "Tracción manual suave"],
                ejercicios: ["Psoas relief", "Respiración diafragmática", "Isométricos suaves"]
            }
        },
       fase_subaguda: {
            dolor: "4-7/10",
            objetivos_smart: [
                "Centralizar síntomas en el 100% de las sesiones de esta fase.",
                "Aumentar tolerancia a bipedestación a 15 min en 1 semana."
            ],
            planTratamiento: {
                objetivos: ["Centralizar síntomas", "Mejorar movilidad", "Neurodinamia"],
                clinica: ["Diatermia capacitiva", "Deslizamiento N. Ciático", "Apertura de agujero conjunción"],
                ejercicios: ["McKenzie: Extensiones", "Gato-Camello", "Deadbug Nivel 1"]
            }
        },
        fase_funcional: {
            dolor: "1-3/10",
            objetivos_smart: [
                "Cargar 5kg con técnica de sentadilla sin dolor en 2 semanas.",
                "Caminar 30 min continuos sin síntomas radiculares al mes."
            ],
            planTratamiento: {
                objetivos: ["Control motor", "Fortalecimiento cadena posterior", "Prevención"],
                clinica: ["Terapia manual avanzada", "Neurodinamia (Tensión)", "Punción seca residual"],
                ejercicios: ["Bird-Dog", "Puente de glúteo unipodal", "Deadbug Nivel 3"]
            }
        }
    }
},
{
    nombre: "ESPONDILOLISTESIS (INESTABILIDAD SEGMENTARIA)",
    color: "#f97316", // Naranja vibrante
    umbral: 4,
    criteriosPesados: [
        { id: "Dolor al caminar (Claudicación)", puntos: 2 },
        { id: "Aumento de dolor en bipedestación / extensión", puntos: 4 }, // Criterio clave
        { id: "Alivio al sentarse / flexión", puntos: 3 },
        { id: "Dolor central (Lumbago mecánico)", puntos: 1 },
        { id: "Palpación de 'escalón' vertebral", puntos: 5 }, // Signo patognomónico
        { id: "Isquiotibiales muy cortos / rígidos", puntos: 2 }
    ],
    hallazgosImagen: [
        { palabraClave: "LISTESIS", puntos: 6 },
        { palabraClave: "ANTEROLISTESIS", puntos: 6 },
        { palabraClave: "RETROLISTESIS", puntos: 5 },
        { palabraClave: "ESPONDILOLISIS", puntos: 4 },
        { palabraClave: "GRADO", puntos: 3 }
    ],
    formatoFisio: "Inestabilidad mecánica por desplazamiento vertebral anterior con posible compromiso foraminal.",
    fases: {
        fase_aguda: {
            objetivos_smart: [
                "Reducir la hiperlordosis antiálgica en reposo.",
                "Evitar episodios de dolor agudo al realizar transiciones (sedestación a bipedestación)."
            ],
            planTratamiento: {
                objetivos: ["Estabilización inicial", "Control de rotación pélvica", "Analgesia"],
                clinica: ["Diatermia en cuadrado lumbar", "TENS ráfagas", "Kinesiotape estabilizador (X)"],
                ejercicios: ["Báscula pélvica posterior", "Abdominales hipopresivos iniciales", "Estiramiento suave de flexores de cadera"]
            }
        },
        fase_subaguda: {
            objetivos_smart: [
                "Activar el transverso del abdomen de forma consciente durante la marcha.",
                "Mantener posición de 'neutro' lumbar por más de 5 minutos sin fatiga."
            ],
            planTratamiento: {
                objetivos: ["Core Stability", "Flexibilización de cadena posterior", "Propiocepción"],
                clinica: ["Terapia manual (liberación de psoas)", "Inducción miofascial", "Neuromodulación"],
                ejercicios: ["Deadbug (manteniendo presión lumbar)", "Puentes de glúteo con báscula", "Cat-Camel (evitando hiperextensión)"]
            }
        },
        fase_funcional: {
            objetivos_smart: [
                "Realizar actividades de carga baja (supermercado) manteniendo control postural.",
                "Retorno a actividad física controlada sin síntomas de inestabilidad."
            ],
            planTratamiento: {
                objetivos: ["Fortalecimiento global", "Control motor avanzado", "Higiene de columna"],
                clinica: ["Reeducación postural", "Cargas progresivas controladas", "Punción seca en puntos gatillo compensatorios"],
                ejercicios: ["Planchas frontales", "Sentadilla Wall-Squat (foco en neutro)", "Bird-Dog con control de rotación"]
            }
        }
    }
},

    {
    nombre: "SÍNDROME DEL GLÚTEO PROFUNDO (ATRAPAMIENTO CIÁTICO)",
    color: "#3b82f6", // Azul profesional
    umbral: 4,
    criteriosPesados: [
        { id: "Dolor glúteo profundo (punzante)", puntos: 4 },
        { id: "Intolerancia a estar sentado > 20 min", puntos: 4 },
        { id: "Prueba de FAIR (+)", puntos: 5 }, // Prueba estrella
        { id: "Beatty Test (+)", puntos: 3 },
        { id: "Sensación de 'pelota' o inflamación en glúteo", puntos: 2 },
        { id: "Parestesias que NO llegan al pie (solo muslo)", puntos: 3 },
        { id: "Dolor al toser o estornudar (Valsalva)", puntos: -3 } // Resta puntos (esto es de hernia)
    ],
    hallazgosImagen: [
        { palabraClave: "PIRIFORME", puntos: 5 },
        { palabraClave: "HIPERTROFIA", puntos: 4 },
        { palabraClave: "ENGROSAMIENTO NERVIOSO", puntos: 5 }
    ],
    formatoFisio: "Compresión no discogénica del nervio ciático en el espacio subglúteo por bandas fibrosas o hipertonía muscular.",
    fases: {
        fase_aguda: {
            objetivos_smart: [
                "Reducir el dolor punzante en glúteo de 8/10 a 5/10 en reposo.",
                "Aumentar el tiempo de sedestación sin dolor irradiado a 10 minutos."
            ],
            planTratamiento: {
                objetivos: ["Liberación de tensión muscular", "Analgesia", "Descompresión mecánica"],
                clinica: ["Diatermia capacitiva (foco en piriforme/géminos)", "TENS endorfínico", "Terapia manual: Inhibición por presión"],
                ejercicios: ["Posición de 'Huevo' (flexión lumbar pasiva)", "Respiraciones de descarga pélvica", "Isométricos submáximos de glúteo"]
            }
        },
        fase_subaguda: {
            objetivos_smart: [
                "Mejorar el deslizamiento del nervio ciático (neurodinamia) sin provocar rebote álgico.",
                "Disminuir la mecanosensibilidad a la palpación profunda en la escotadura."
            ],
            planTratamiento: {
                objetivos: ["Neurodinamia (Slider)", "Mejorar rango de rotación interna", "Control motor"],
                clinica: ["Punción seca en puntos gatillo (piriforme)", "Inducción miofascial", "Neurodinamia guiada manual"],
                ejercicios: ["Deslizamiento neural del ciático (Flossing)", "Estiramiento dinámico de rotadores externos", "Puente de glúteo con banda elástica"]
            }
        },
        fase_funcional: {
            objetivos_smart: [
                "Tolerar sedestación por más de 60 minutos sin hormigueo o dolor.",
                "Completar rutina de fortalecimiento de cadena posterior sin síntomas neurales."
            ],
            planTratamiento: {
                objetivos: ["Fortalecimiento de abductores", "Estabilidad lumbopélvica", "Reinserción deportiva/laboral"],
                clinica: ["Cargas excéntricas controladas", "Terapia manual funcional", "Educación sobre ergonomía en oficina"],
                ejercicios: ["Clamshells avanzados", "Peso muerto rumano (foco en control)", "Estocadas con control de valgo"]
            }
        }
    }
},
   {
    nombre: "SÍNDROME FACETARIO LUMBAR",
    color: "#a855f7", // Morado clínico
    umbral: 4,
    criteriosPesados: [
        { id: "Dolor central (Lumbago mecánico)", puntos: 3 },
        { id: "Dolor localizado", puntos: 4 }, // No suele irradiarse lejos
        { id: "Aumento de dolor en bipedestación / extensión", puntos: 5 }, // El choque de las facetas
        { id: "Alivio al sentarse / flexión", puntos: 3 },
        { id: "Prueba de Kemp (+)", puntos: 5 }, // Extensión + Rotación = Dolor
        { id: "Rigidez matutina importante", puntos: 3 }, // Típico de procesos articulares
        { id: "Lasègue (SLR)", puntos: -4 } // Si el Lasègue es positivo, NO es facetario
    ],
    hallazgosImagen: [
        { palabraClave: "HIPERTROFIA FACETARIA", puntos: 6 },
        { palabraClave: "ARTROSIS", puntos: 4 },
        { palabraClave: "DISMINUCIÓN DE ESPACIO INTERVERTEBRAL", puntos: 3 },
        { palabraClave: "GAS INTRAARTICULAR", puntos: 5 }
    ],
    formatoFisio: "Disfunción articular por irritación de las carillas articulares posteriores con sinovitis reactiva y limitación del patrón de extensión.",
    fases: {
        fase_aguda: {
            objetivos_smart: [
                "Reducir la inflamación capsular para permitir bipedestación por 5 min sin dolor.",
                "Disminuir la hipertonía protectora de los erectores espinales."
            ],
            planTratamiento: {
                objetivos: ["Analgesia", "Descompresión articular", "Control de espasmo"],
                clinica: ["Diatermia capacitiva profunda", "Terapia manual: Grado I-II de Maitland", "Kinesiotape en técnica de corrección de espacio"],
                ejercicios: ["Inclinaciones pélvicas en flexión", "Posición de Mahometano (descarga)", "Respiración costal baja"]
            }
        },
        fase_subaguda: {
            objetivos_smart: [
                "Recuperar el rango de inclinación lateral sin síntomas punzantes.",
                "Iniciar la activación de la musculatura profunda (Multífidos) en posiciones neutras."
            ],
            planTratamiento: {
                objetivos: ["Movilidad segmentaria", "Activación de multífidos", "Flexibilización de Psoas"],
                clinica: ["Movilizaciones Grado III", "Punción seca en paravertebrales", "Inducción miofascial de la fascia toracolumbar"],
                ejercicios: ["Gato-Camello (énfasis en control)", "Báscula pélvica con activación de transverso", "Estiramiento pasivo de flexores de cadera"]
            }
        },
        fase_funcional: {
            objetivos_smart: [
                "Realizar extensión de tronco completa sin dolor residual.",
                "Mantener bipedestación prolongada (>30 min) durante actividades de la vida diaria."
            ],
            planTratamiento: {
                objetivos: ["Estabilización dinámica", "Higiene postural en extensión", "Fortalecimiento de cadena posterior"],
                clinica: ["Manipulaciones de alta velocidad (si no hay contraindicación)", "Control motor en bipedestación", "Cargas progresivas"],
                ejercicios: ["Deadbug avanzado", "Planchas laterales", "Sentadilla con control de báscula pélvica"]
            }
        }
    }
},
   {
    nombre: "ESTENOSIS DE CANAL LUMBAR (CLAUDICACIÓN NEURÓGENA)",
    color: "#f59e0b", // Ámbar/Naranja
    umbral: 4,
    criteriosPesados: [
        { id: "Claudicación (Dolor al caminar)", puntos: 5 }, // Síntoma estrella
        { id: "Alivio al sentarse / flexión", puntos: 4 },
        { id: "Aumento de dolor en bipedestación / extensión", puntos: 4 },
        { id: "Dolor bilateral", puntos: 3 }, // La estenosis suele afectar ambas piernas
        { id: "Parestesias / Hormigueo", puntos: 1 },
        { id: "Edad > 60 años", puntos: 3 },
        { id: "Lasègue (SLR)", puntos: -2 } // En la estenosis el Lasègue suele ser negativo
    ],
    hallazgosImagen: [
        { palabraClave: "ESTENOSIS", puntos: 6 },
        { palabraClave: "ESTRECHAMIENTO", puntos: 5 },
        { palabraClave: "LIGAMENTO AMARILLO", puntos: 4 }, // Hipertrofia
        { palabraClave: "FORAMINAL", puntos: 3 },
        { palabraClave: "CANAL ESTRECHO", puntos: 6 }
    ],
    formatoFisio: "Estrechamiento del canal medular o agujeros de conjunción con compresión mecánica y compromiso vascular de las raíces nerviosas.",
    fases: {
        fase_aguda: {
            objetivos_smart: [
                "Aumentar el tiempo de marcha sin dolor de 2 min a 5 min.",
                "Lograr independencia en actividades básicas mediante posturas de apertura (flexión)."
            ],
            planTratamiento: {
                objetivos: ["Descompresión posicional", "Analgesia", "Educación"],
                clinica: ["Diatermia capacitiva", "TENS convencional", "Terapia manual: Apertura foraminal"],
                ejercicios: ["Báscula pélvica posterior", "Abrazar rodillas al pecho (Williams)", "Flexión lumbar en silla"]
            }
        },
        fase_subaguda: {
            objetivos_smart: [
                "Realizar caminata continua de 15 minutos con inclinación anterior controlada.",
                "Mejorar la fuerza de los flexores de cadera para estabilizar la pelvis en retroversión."
            ],
            planTratamiento: {
                objetivos: ["Aumentar tolerancia a la carga", "Neurodinamia (Deslizamiento)", "Fortalecimiento abdominal"],
                clinica: ["Movilizaciones segmentarias en flexión", "Deslizamiento neural (Slump slider)", "Láser terapéutico"],
                ejercicios: ["Bicicleta estática (tronco flexionado)", "Deadbug con foco en aplanamiento lumbar", "Puentes de glúteo"]
            }
        },
        fase_funcional: {
            objetivos_smart: [
                "Caminar 30 min sin necesidad de sentarse a descansar por síntomas neurales.",
                "Integrar ejercicios de fuerza global evitando la hiperextensión lumbar."
            ],
            planTratamiento: {
                objetivos: ["Acondicionamiento aeróbico", "Control motor avanzado", "Prevención de caídas"],
                clinica: ["Entrenamiento de marcha", "Punción seca en musculatura fatigada", "Reeducación postural"],
                ejercicios: ["Planchas frontales", "Sentadilla con apoyo en pared", "Caminata con control de báscula pélvica"]
            }
        }
    }
},
{
    nombre: "DISFUNCIÓN SACROILÍACA (SÍNDROME DE LA ARTICULACIÓN SI)",
    color: "#0d9488", // Teal / Verde azulado
    umbral: 4,
    criteriosPesados: [
        { id: "Dolor localizado en la articulación SI (Signo de Fortin)", puntos: 5 }, // Muy específico
        { id: "Dolor al subir escaleras / carga unipodal", puntos: 3 },
        { id: "Dolor al cambiar de posición (sedestación a bipedestación)", puntos: 4 },
        { id: "Prueba de Thigh Thrust (+)", puntos: 4 }, // Cluster de Laslett
        { id: "Prueba de Gaenslen (+)", puntos: 3 },
        { id: "Prueba de FABER / Patrick (+)", puntos: 3 },
        { id: "Dolor que cruza la rodilla", puntos: -3 }, // La SIJ rara vez cruza la rodilla
        { id: "Lasègue (SLR)", puntos: -2 }
    ],
    hallazgosImagen: [
        { palabraClave: "SACROILEÍTIS", puntos: 6 },
        { palabraClave: "ESCLEROSIS SUBCONDRAL", puntos: 4 },
        { palabraClave: "EDEMA ÓSEO SACRO", puntos: 5 },
        { palabraClave: "ESPACIO ARTICULAR", puntos: 2 }
    ],
    formatoFisio: "Disfunción en la transmisión de cargas lumbopélvicas por alteración en el cierre de forma o cierre de fuerza de la articulación sacroilíaca.",
    fases: {
        fase_aguda: {
            objetivos_smart: [
                "Reducir el dolor punzante al caminar de 7/10 a 3/10 mediante el uso de cincha pélvica si aplica.",
                "Lograr simetría en la carga de peso en bipedestación estática."
            ],
            planTratamiento: {
                objetivos: ["Analgesia local", "Reducir inflamación capsular", "Protección articular"],
                clinica: ["Diatermia capacitiva en ligamentos posteriores", "TENS ráfagas sobre PSIS", "Terapia manual: Movilización Grado I-II"],
                ejercicios: ["Isométricos suaves de aductores", "Báscula pélvica neutra", "Activación del transverso en supino"]
            }
        },
        fase_subaguda: {
            objetivos_smart: [
                "Realizar subida de escalón (Step-up) sin dolor agudo en la región glútea superior.",
                "Mantener apoyo unipodal por 10 segundos con control de la estabilidad pélvica."
            ],
            planTratamiento: {
                objetivos: ["Estabilización (Cierre de fuerza)", "Técnicas de Energía Muscular", "Flexibilidad"],
                clinica: ["Manipulación sacroilíaca (si hay bloqueo)", "Punción seca en glúteo medio/mayor", "Liberación del ligamento sacrotuberoso"],
                ejercicios: ["Puente de glúteo con banda elástica", "Clamshells (control motor)", "Bird-Dog (énfasis en estabilidad pélvica)"]
            }
        },
        fase_funcional: {
            objetivos_smart: [
                "Retornar a actividades de impacto (trote suave o saltos) sin síntomas residuales.",
                "Cargar objetos del suelo (Deadlift ligero) manteniendo la estabilidad sacroilíaca."
            ],
            planTratamiento: {
                objetivos: ["Fortalecimiento dinámico", "Propiocepción avanzada", "Retorno a la función"],
                clinica: ["Entrenamiento funcional", "Cargas asimétricas controladas", "Higiene postural en actividades de carga"],
                ejercicios: ["Estocadas (Lunges) con control", "Peso muerto rumano unipodal", "Planchas dinámicas"]
            }
        }
    }
},

{
    nombre: "ATRAPAMIENTO DEL NERVIO PERONEO (CABEZA DEL PERONÉ)",
    color: "#84cc16", // Lima / Verde Neón
    umbral: 4,
    criteriosPesados: [
        { id: "Debilidad en dorsiflexión (Pie caído)", puntos: 5 }, // Signo motor principal
        { id: "Signo de Tinel en cabeza del peroné", puntos: 5 }, // Muy específico del sitio
        { id: "Parestesias en cara lateral de pierna y dorso del pie", puntos: 3 },
        { id: "Pérdida de sensibilidad (1er espacio interdigital)", puntos: 4 },
        { id: "Inversión del pie preservada", puntos: 3 }, // Clave: En L5 la inversión se pierde, aquí NO.
        { id: "Dolor lumbar previo", puntos: -4 } // Si hay dolor lumbar, apunta más a L5 que a Peroneo
    ],
    hallazgosImagen: [
        { palabraClave: "CABEZA PERONÉ", puntos: 5 },
        { palabraClave: "GANGLIÓN", puntos: 4 },
        { palabraClave: "NEUROPATÍA COMPRESIVA", puntos: 6 },
        { palabraClave: "EDEMA INTRANEURAL", puntos: 5 }
    ],
    formatoFisio: "Neuropatía por compresión mecánica del nervio peroneo común a su paso por el túnel peroneal (cuello del peroné).",
    fases: {
        fase_aguda: {
            objetivos_smart: [
                "Eliminar factores de compresión externa (posturas/calzado) en 24h.",
                "Mantener el rango de movilidad pasiva del tobillo para evitar equino."
            ],
            planTratamiento: {
                objetivos: ["Descompresión del nervio", "Control de inflamación local", "Protección del nervio"],
                clinica: ["Diatermia capacitiva en zona de compresión", "TENS ráfagas (analgesia)", "Electroestimulación muscular (EMS) en Tibial Anterior"],
                ejercicios: ["Movilizaciones pasivas de tobillo", "Posicionamiento en neutro con férula nocturna", "Liberación miofascial suave de peroneos"]
            }
        },
        fase_subaguda: {
            objetivos_smart: [
                "Iniciar la activación voluntaria de los extensores del pie (Muesca de fuerza).",
                "Lograr deslizamiento neural sin hormigueo persistente tras la sesión."
            ],
            planTratamiento: {
                objetivos: ["Neurodinamia (N. Peroneo)", "Reclutamiento motor", "Mejorar conducción"],
                clinica: ["Inducción miofascial", "Punción seca en puntos gatillo de peroneos", "Neurodinamia manual activa-asistida"],
                ejercicios: ["Deslizamiento neural del peroneo (Inversión + Plantiflexión)", "Isométricos de Tibial Anterior", "Ejercicios de 'Toes-up' con asistencia"]
            }
        },
        fase_funcional: {
            objetivos_smart: [
                "Recuperar la marcha normal (fase de choque de talón) sin necesidad de ayuda técnica.",
                "Completar 20 repeticiones de dorsiflexión contra gravedad."
            ],
            planTratamiento: {
                objetivos: ["Fortalecimiento excéntrico", "Propiocepción de tobillo", "Reeducación de la marcha"],
                clinica: ["Entrenamiento de la marcha en cinta", "Cargas progresivas", "Neurodinamia en tensión máxima"],
                ejercicios: ["Caminar sobre talones", "Equilibrio unipodal en superficie inestable", "Pliometría de bajo impacto"]
            }
        }
     }
   }
]
         },
//COLUMNA CERVICAL
{
    titulo: "Abordaje de Columna Cervical y Miembro Superior",
    id: "CERVICAL_RAD_002",
    triggers: ["cuello", "nuca", "trapecio", "hombro", "brazo", "mano", "hormigueo mano", "cervical", "torticolis"],
    fuentes: { clinica: "Netter / Wainner (Clinical Prediction Rules)", anatomia: "Rouviere (Niveles C5-T1)" },
    gabinete_sugerido: {
        RMN: ["Hernia C5-C6", "Uncoartrosis", "Rectificación Cervical"],
        RX: ["Signo de la Plomada", "Osteofitos anteriores", "Forámenes estrechos"]
    },
    anamnesis: {
        sintomas: [
            "Dolor referido a escápula", "Parestesias en dedos", "Debilidad al cargar objetos",
            "Dolor que aumenta con la lectura/celular", "Cefalea tensional (nuca)", "Mareo cervicogénico"
        ],
        redFlags: ["🚩 Disfagia (dificultad al tragar)", "🚩 Marcha atáxica", "🚩 Signo de Lhermitte", "🚩 Diplopía"]
    },
    exploracion: {
        neurologia: {
            sensibilidad: [
                { nivel: "C5", zona: "Cara lateral del deltoides", top: "25%", left: "30%" },
                { nivel: "C6", zona: "Dorso del pulgar", top: "35%", left: "20%" },
                { nivel: "C7", zona: "Dedo medio", top: "38%", left: "18%" },
                { nivel: "C8", zona: "Borde cubital mano (meñique)", top: "35%", left: "15%" }
            ],
            fuerza: [
                { miotoma: "C5", accion: "Abducción hombro (Deltoides)" },
                { miotoma: "C6", accion: "Extensión muñeca / Flexión codo" },
                { miotoma: "C7", accion: "Extensión codo (Tríceps)" },
                { miotoma: "C8", accion: "Flexión de dedos" }
            ],
            reflejos: [
                { rot: "C5", nombre: "Bicipital", nivel: "C5-C6" },
                { rot: "C6", nombre: "Estilorradial", nivel: "C5-C6" },
                { rot: "C7", nombre: "Tricipital", nivel: "C7-C8" }
            ]
        },
        pruebasOrtopedicas: [
            {
                categoria: "Pruebas Radiculares (Wainner)",
                items: [
                    { nombre: "Prueba de Spurling", tecnica: "Inclinación + compresión axial. (+) si hay dolor irradiado al brazo." },
                    { nombre: "Distracción Cervical", tecnica: "Tracción manual hacia cefálico. (+) si los síntomas disminuyen." },
                    { nombre: "ULNT 1 (Mediano)", tecnica: "Tensión neural del plexo braquial. (+) reproduce síntomas." }
                ]
            }
        ]
    },
    diferenciales: [
    //SINDROME DE PINZAMIENTO SUBACROMIAL
    {
        nombre: "SÍNDROME DE PINZAMIENTO SUBACROMIAL (IMPINGEMENT)",
        color: "#f59e0b",
        umbral: 4,
        criteriosPesados: [
            { id: "Arco doloroso (60°-120°)", puntos: 4 },
            { id: "Prueba de Neer (+)", puntos: 3 },
            { id: "Prueba de Hawkins-Kennedy (+)", puntos: 4 },
            { id: "Dolor nocturno al dormir sobre el hombro", puntos: 2 },
            { id: "Debilidad marcada en rotación externa", puntos: -2 } // Apunta más a rotura que a pinzamiento
        ],
        hallazgosImagen: [
            { palabraClave: "ACROMION TIPO II/III", puntos: 5 },
            { palabraClave: "BURSITIS", puntos: 4 },
            { palabraClave: "ESPACIO SUBACROMIAL REDUCIDO", puntos: 5 }
        ],
        objetivoSug: "Aumento del espacio subacromial y recentraje de la cabeza humeral.",
        formatoFisio: "Compresión mecánica de las estructuras del espacio subacromial durante la abducción/elevación del brazo.",
        fases: {
            fase_aguda: {
                objetivos_smart: ["Reducir dolor basal a <4/10 en reposo", "Evitar posturas de cierre subacromial"],
                planTratamiento: {
                    objetivos: ["Analgesia", "Control de inflamación bursa"],
                    clinica: ["Diatermia", "TENS convencional", "Terapia manual: Deslizamiento caudal"],
                    ejercicios: ["Codman (Pendulares)", "Isométricos submáximos", "Respiración escapular"]
                }
            },
            fase_subaguda: {
                objetivos_smart: ["Alcanzar 120° de elevación sin dolor agudo", "Mejorar ritmo escapulohumeral"],
                planTratamiento: {
                    objetivos: ["Recentraje humeral", "Fortalecimiento rotadores"],
                    clinica: ["Inducción miofascial pectoral", "Neuromodulación supraescapular"],
                    ejercicios: ["Rotación externa con banda", "Serrato anterior (Push up plus)", "W y Y isométricas"]
                }
            },
            fase_funcional: {
                objetivos_smart: ["Retorno a actividades por encima de la cabeza sin dolor", "Cargar 3kg en elevación"],
                planTratamiento: {
                    objetivos: ["Potencia de manguito", "Control motor avanzado"],
                    clinica: ["Punción seca infraespinoso", "Cargas progresivas"],
                    ejercicios: ["Facepull", "Planchas con toque de hombro", "Propiocepción con fitball en pared"]
                }
            }
        }
    },
    //TENDINOPATIA /ROTURA DEL SUPRAESPINOSO
    {
        nombre: "TENDINOPATÍA / ROTURA DEL SUPRAESPINOSO",
        color: "#ef4444",
        umbral: 4,
        criteriosPesados: [
            { id: "Prueba de Jobe (Empty Can) (+)", puntos: 5 },
            { id: "Signo de la caída (Drop Arm) (+)", puntos: 6 }, // Muy pesado para rotura
            { id: "Dolor punzante en la inserción (troquiter)", puntos: 3 },
            { id: "Incapacidad para iniciar la abducción", puntos: 4 }
                            ],
        hallazgosImagen: [
            { palabraClave: "ROTURA", puntos: 7 },
            { palabraClave: "DESGARRO", puntos: 6 },
            { palabraClave: "TENDINOSIS", puntos: 4 }
                         ],
        objetivoSug: "Readaptación del tendón y compensación muscular escapular.",
        formatoFisio: "Pérdida de la integridad estructural del tendón del supraespinoso con déficit de fuerza en la abducción.",
       fases: {
          fase_aguda: {
        dolor: "7-10/10",
        objetivos_smart: [
            "Reducir irritabilidad del tendón a <5/10 en actividades de vida diaria.",
            "Lograr abducción pasiva de 90° sin dolor punzante en 1 semana."
        ],
        planTratamiento: {
            objetivos: ["Controlar reactividad tendinosa", "Mantener movilidad articular", "Analgesia"],
            clinica: ["Diatermia capacitiva (baja intensidad)", "Microcorrientes / TENS", "Terapia manual: Movilización glenoidea grado I-II"],
            ejercicios: ["Isométricos de abducción (en ángulo sin dolor)", "Pendulares de Codman", "Ejercicios de movilidad asistida (bastón)"]
        }
                     },
          fase_subaguda: {
        dolor: "3-6/10",
        objetivos_smart: [
            "Realizar elevación activa completa con ritmo escapulohumeral coordinado.",
            "Iniciar carga excéntrica ligera sin dolor residual post-ejercicio (>24h)."
        ],
        planTratamiento: {
            objetivos: ["Estimular síntesis de colágeno", "Fortalecimiento de rotadores externos", "Estabilidad escapular"],
            clinica: ["Electrolisis percutánea (si hay tendinosis crónica)", "Inducción miofascial de supraespinoso", "Ondas de choque (opcional)"],
            ejercicios: ["Excéntricos de manguito rotador", "Full Can (Jobe en pulgar arriba) con banda elástica", "Remo bajo para activación de trapecio medio/inferior"]
        }
                         },
         fase_funcional: {
        dolor: "0-2/10",
        objetivos_smart: [
            "Soportar carga de 5kg en plano escapular sin síntomas.",
            "Retorno a actividad deportiva o laboral con 100% de fuerza comparada con lado sano."
        ],
        planTratamiento: {
            objetivos: ["Remodelación del tejido", "Potencia y resistencia muscular", "Readaptación al gesto"],
            clinica: ["Entrenamiento de carga progresiva", "Terapia manual avanzada (maniobra de recentraje)", "Neurodinamia de plexo braquial"],
            ejercicios: ["Press militar con kettlebell", "Lanzamientos de balón medicinal", "Planchas dinámicas con rotación"]
        }
                        }
}
    },
    //SINDROME DEL TUNEL CARPIANO 
    {
        nombre: "SÍNDROME DEL TÚNEL CARPIANO (MEDIANO)",
        color: "#3b82f6",
        umbral: 4,
        criteriosPesados: [
            { id: "Parestesias en 1er, 2do y 3er dedo", puntos: 5 },
            { id: "Prueba de Phalen (+)", puntos: 4 },
            { id: "Signo de Tinel (+)", puntos: 4 },
            { id: "Atrofia de la eminencia tenar", puntos: 6 },
            { id: "Spurling (+)", puntos: -4 } // Si Spurling es +, el problema es el cuello, no la muñeca
        ],
        hallazgosImagen: [
            { palabraClave: "NERVIO MEDIANO", puntos: 5 },
            { palabraClave: "RETINÁCULO", puntos: 4 }
        ],
        objetivoSug: "Descompresión del nervio mediano y mejora de la conducción axonal.",
        formatoFisio: "Neuropatía compresiva del nervio mediano a su paso por el túnel carpiano.",
        fases: {
            fase_aguda: {
                objetivos_smart: ["Reducir parestesias nocturnas en un 50%"],
                planTratamiento: {
                    objetivos: ["Analgesia", "Protección"],
                    clinica: ["Láser", "Férula neutra nocturna", "Diatermia"],
                    ejercicios: ["Deslizamientos tendinosos", "Movilidad de carpo"]
                }
            },
            fase_subaguda: {
                objetivos_smart: ["Neurodinamia sin dolor residual"],
                planTratamiento: {
                    objetivos: ["Neurodinamia", "Movilidad articular"],
                    clinica: ["Terapia manual huesos del carpo", "Inducción miofascial"],
                    ejercicios: ["Slider de Nervio Mediano", "Fortalecimiento de agarre sutil"]
                }
            },
            fase_funcional: {
                objetivos_smart: ["Retorno a actividades manuales sin síntomas"],
                planTratamiento: {
                    objetivos: ["Higiene postural", "Fortalecimiento"],
                    clinica: ["Ergonomía de puesto de trabajo", "Punción seca en antebrazo"],
                    ejercicios: ["Destreza fina", "Cargas progresivas de prensión"]
                }
            }
        }
    },

    // EPICONDILITIS LATERAL (CODO DE TENISTA)
    {
        nombre: "EPICONDILALGIA LATERAL (TENISTA)",
        color: "#10b981",
        umbral: 4,
        criteriosPesados: [
            { id: "Dolor a la palpación epicóndilo lateral", puntos: 5 },
            { id: "Prueba de Cozen (+)", puntos: 4 },
            { id: "Prueba de Mill (+)", puntos: 4 },
            { id: "Dolor al levantar una taza o silla", puntos: 3 },
            { id: "Déficit de fuerza de prensión por dolor", puntos: 3 }
        ],
        hallazgosImagen: [
            { palabraClave: "TENDINOSIS", puntos: 5 },
            { palabraClave: "EPICONDILITIS", puntos: 4 },
            { palabraClave: "DESGARRO EXTENSORES", puntos: 6 }
        ],
        objetivoSug: "Gestión de carga de los extensores de muñeca y remodelación del colágeno.",
        formatoFisio: "Disfunción tendinosa de los extensores comunes de los dedos, principalmente el Extensor Carpi Radialis Brevis.",
        fases: {
            fase_aguda: {
                objetivos_smart: ["Reducir dolor a la prensión funcional"],
                planTratamiento: {
                    objetivos: ["Analgesia", "Control de carga"],
                    clinica: ["Crioterapia", "TENS", "Cinchas de descarga"],
                    ejercicios: ["Isométricos de extensores", "Movilidad de hombro/cuello (compensación)"]
                }
            },
            fase_subaguda: {
                objetivos_smart: ["Iniciar carga excéntrica controlada"],
                planTratamiento: {
                    objetivos: ["Estimulación de colágeno", "Mecanotransducción"],
                    clinica: ["Electrolisis percutánea", "Ondas de choque", "Masaje tipo Cyriax"],
                    ejercicios: ["Excéntricos de muñeca", "Fortalecimiento de supinadores"]
                }
            },
            fase_funcional: {
                objetivos_smart: ["Retorno al gesto deportivo/laboral sin recaída"],
                planTratamiento: {
                    objetivos: ["Potencia", "Resistencia de agarre"],
                    clinica: ["Punción seca extensores", "Readaptación funcional"],
                    ejercicios: ["Flexo-extensión con carga", "Ejercicios de potencia (martillo)"]
                }
            }
        }
    } 
]
},
//RODILLA
{
    titulo: "Evaluación Completa de Rodilla",
    id: "RODILLA_003",
    triggers: ["rodilla", "menisco", "ligamento", "cruzado", "pata de ganso", "estrepito", "bloqueo", "falle", "inflamacion rodilla"],
    fuentes: { 
        clinica: "Magee / Torg", 
        anatomia: "Kapandji (Complejo articular)" 
    },
    gabinete_sugerido: {

        USG: ["Bursitis", "Tendinosis Rotuliana", "Quiste de Baker"],
        RMN: ["Ruptura Meniscal", "Edema Óseo", "Lesión Grado II/III Ligamentaria"]
    },
    anamnesis: {
        sintomas: [
            "Sensación de inestabilidad ('se me va la rodilla')", "Bloqueo articular", "Chasquido audible en lesión",
            "Dolor al bajar escaleras", "Dificultad para la extensión completa", "Inflamación inmediata (<2h)"
        ],
        redFlags: ["🚩 Incapacidad total de carga", "🚩 Deformidad articular evidente", "🚩 Derrame articular masivo"]
    },
    exploracion: {
        neurologia: 
        { sensibilidad: [], fuerza: [], reflejos: [] }, // Rodilla es mayormente ortopédico
        pruebasOrtopedicas: [
            {
                categoria: "Estabilidad Ligamentaria",
                items: [
                    { nombre: "Lachman", tecnica: "Flexión 20-30°. Traslación anterior de tibia. (+) Lesión LCA." },
                    { nombre: "Cajón Anterior", tecnica: "Flexión 90°. Tracción anterior tibia. (+) Lesión LCA." },
                    { nombre: "Bostezo (Valgo/Varo)", tecnica: "Estrés medial/lateral. (+) Lesión LLI o LLE." }
                ]
            },
            {
                categoria: "Meniscales",
                items: [
                    { nombre: "McMurray", tecnica: "Flexión+Rotación+Extensión. (+) Chasquido o dolor." },
                    { nombre: "Appley (Compresión)", tecnica: "Prono, 90° flexión + presión. (+) Menisco." }
                ]
            }
        ]
    },
   diferenciales: [
    {
        nombre: "LESIÓN MENISCAL (MEDIAL/LATERAL)",
        color: "#3b82f6",
        umbral: 4,
        criteriosPesados: [
            { id: "Dolor en línea articular (interlínea)", puntos: 5 },
            { id: "Bloqueo articular mecánico", puntos: 4 },
            { id: "Prueba de McMurray (+)", puntos: 4 },
            { id: "Prueba de Appley (+)", puntos: 5 },
            { id: "Derrame articular tardío (>24h)", puntos: 3 },
            { id: "Lachman (+)", puntos: -4 } // Si es inestable, apunta más a LCA
        ],
        hallazgosImagen: [
            { palabraClave: "MENISCOPATÍA", puntos: 5 },
            { palabraClave: "ASA DE CUBO", puntos: 7 },
            { palabraClave: "MENISCO DISCOIDAL", puntos: 4 }
        ],
        objetivoSug: "Disminución de la carga compresiva y recuperación del rango de movimiento.",
        formatoFisio: "Falla en la absorción de cargas por solución de continuidad en el fibrocartílago meniscal.",
        fases: {
            fase_aguda: {
                objetivos_smart: ["Eliminar el bloqueo articular", "Reducir el derrame (test de la oleada (-)"],
                planTratamiento: {
                    objetivos: ["Bombeo circulatorio", "Movilidad pasiva", "Drenaje"],
                    clinica: ["Crioterapia", "Diatermia atérmica", "Vendaje compresivo"],
                    ejercicios: ["Bombeos de tobillo", "Deslizamientos en talón (Heel slides)", "Isométricos de cuádriceps"]
                }
            },
            fase_subaguda: {
                objetivos_smart: ["Carga de peso total sin dolor", "Alcanzar 110° de flexión activa"],
                planTratamiento: {
                    objetivos: ["Carga progresiva", "Estabilidad rotacional"],
                    clinica: ["Terapia manual articular", "Electrolisis si hay tendinopatía asociada"],
                    ejercicios: ["Mini-sentadilla (rango corto)", "Step-up lateral", "Bicicleta estática (sin resistencia)"]
                }
            },
            fase_funcional: {
                objetivos_smart: ["Realizar sentadilla completa con carga", "Pivoteo sin dolor"],
                planTratamiento: {
                    objetivos: ["Potencia muscular", "Retorno al gesto deportivo"],
                    clinica: ["Entrenamiento funcional", "Readaptación"],
                    ejercicios: ["Sentadilla búlgara", "Saltos controlados", "Cambios de dirección"]
                }
            }
        }
    },
    {
        nombre: "SÍNDROME FEMOROPATELAR (CONDROMA LACIA)",
        color: "#0d9488",
        umbral: 4,
        criteriosPesados: [
            { id: "Dolor retro-rotuliano al estar sentado (Signo del cine)", puntos: 4 },
            { id: "Crepitación articular (estrépito)", puntos: 3 },
            { id: "Prueba de Cepillo (+)", puntos: 4 },
            { id: "Prueba de Zohlen (+)", puntos: 4 },
            { id: "Atrofia notable de vasto medial", puntos: 3 }
        ],
        hallazgosImagen: [
            { palabraClave: "CONDROMALACIA", puntos: 6 },
            { palabraClave: "DESALINEACIÓN", puntos: 4 },
            { palabraClave: "BASCULACIÓN ROTULIANA", puntos: 5 }
        ],
            objetivoSug: "Realineación dinámica de la rótula y fortalecimiento de cadena lateral de cadera.",
            formatoFisio: "Aumento de la presión de contacto femoropatelar por debilidad de estabilizadores de cadera o maltracking rotuliano.",
            fases: {
                fase_aguda: {
                    objetivos_smart: ["Reducir el dolor al subir/bajar escaleras a <4/10"],
                    planTratamiento: {
                        objetivos: ["Analgesia", "Control de sinovitis"],
                        clinica: ["Diatermia", "Kinesiotape de recentraje"],
                        ejercicios: ["Isométricos cuádriceps", "Clamshells"]
                    }
                },
                fase_subaguda: {
                    objetivos_smart: ["Realizar 15 repeticiones de mini-sentadilla sin crepitación"],
                    planTratamiento: {
                        objetivos: ["Fortalecimiento VMO", "Control motor"],
                        clinica: ["EMS en vasto medial", "Movilización medial de rótula"],
                        ejercicios: ["Sentadilla con pelota", "Monster Walk"]
                    }
                },
                fase_funcional: {
                    objetivos_smart: ["Retorno a carrera continua por 20 min"],
                    planTratamiento: {
                        objetivos: ["Potencia excéntrica", "Readaptación"],
                        clinica: ["Entrenamiento funcional", "Biofeedback"],
                        ejercicios: ["Sentadilla búlgara", "Box Jumps"]
                    }
                }
            }
        }
    ]
},

//TOBILLO Y PIE
{
    titulo: "Evaluación Completa de Tobillo y Pie",
    id: "TOBILLO_004",
    triggers: ["tobillo", "pie", "talon", "esguince", "torcedura", "fascia plantar", "aquiles", "maleolo", "inversion"],
    fuentes: { 
        clinica: "Reglas de Ottawa / Magee", 
        anatomia: "Netter (Complejo del Tarso)" 
    },
    gabinete_sugerido: {
        RX: ["Reglas de Ottawa (+)", "Fractura de Maleolo", "Espolón Calcáneo"],
        USG: ["Ruptura de Tendón de Aquiles", "Neuroma de Morton", "Fascitis Plantar"],
        RMN: ["Lesión Osteocondral del Astrágalo", "Ruptura Total de Ligamentos"]
    },
    anamnesis: {
        sintomas: [
            "Dolor al dar el primer paso en la mañana", 
            "Inestabilidad en terrenos irregulares",
            "Sensación de chasquido lateral", 
            "Edema localizado (huevo de paloma)", 
            "Dolor punzante en el talón"
        ],
        redFlags: ["🚩 Incapacidad de dar 4 pasos seguidos", "🚩 Dolor óseo exquisito en zona maleolar", "🚩 Ausencia de pulso pedio"]
    },
    exploracion: {
        neurologia: {
            sensibilidad: [
                { nivel: "L4", zona: "Cara medial del pie", top: "80%", left: "45%" },
                { nivel: "L5", zona: "Dorso del pie / 1er espacio interdigital", top: "85%", left: "50%" },
                { nivel: "S1", zona: "Borde lateral del pie", top: "85%", left: "55%" }
            ],
            fuerza: [
                { miotoma: "L4", accion: "Dorsiflexión (Tibial Anterior)" },
                { miotoma: "L5", accion: "Extensión del 1er dedo" },
                { miotoma: "S1", accion: "Plantiflexión (Gastronemios)" }
            ],
            reflejos: [
                { rot: "S1", nombre: "Aquileo", nivel: "L5-S1-S2" }
            ]
        },
        pruebasOrtopedicas: [
            {
                categoria: "Estabilidad Ligamentaria",
                items: [
                    { nombre: "Cajón Anterior", tecnica: "Fijar tibia, traccionar calcáneo. (+) Lesión LPAI." },
                    { nombre: "Inclinación Astragalina", tecnica: "Inversión pasiva del retropié. (+) Lesión LPC." },
                    { nombre: "Prueba de Thompson", tecnica: "Compresión de pantorrilla. (+) Ausencia de plantiflexión = Ruptura Aquiles." }
                ]
            },
            {
                categoria: "Funcionales",
                items: [
                    { nombre: "Prueba de Windlass", tecnica: "Extensión pasiva del 1er dedo. (+) Dolor en fascia plantar." },
                    { nombre: "Prueba de Kleiger", tecnica: "Rotación externa forzada. (+) Lesión de la sindesmosis." }
                ]
            }
        ]
    },
    diferenciales: [
        {
            nombre: "ESGUINCE DE TOBILLO (LPAI)",
            color: "#ef4444",
            umbral: 4,
            criteriosPesados: [
                { id: "Mecanismo de inversión súbita", puntos: 5 },
                { id: "Cajón Anterior (+)", puntos: 4 },
                { id: "Edema / Equimosis lateral", puntos: 3 },
                { id: "Dolor a la palpación LPAI", puntos: 4 }
            ],
            hallazgosImagen: [
                { palabraClave: "RUPTURA", puntos: 6 },
                { palabraClave: "ESGUINCE", puntos: 4 }
            ],
            objetivoSug: "Estabilización del complejo lateral y reeducación propioceptiva.",
            formatoFisio: "Distensión o solución de continuidad de las fibras del ligamento peroneoastragalino anterior.",
            fases: {
                fase_aguda: {
                    objetivos_smart: ["Reducir edema maleolar en 48h"],
                    planTratamiento: {
                        objetivos: ["Analgesia", "Drenaje"],
                        clinica: ["Crioterapia", "Diatermia atérmica", "Vendaje funcional"],
                        ejercicios: ["Bombeos", "Movilidad pasiva"]
                    }
                },
                fase_subaguda: {
                    objetivos_smart: ["Carga total sin dolor al caminar"],
                    planTratamiento: {
                        objetivos: ["Cicatrización", "Fortalecimiento"],
                        clinica: ["Masaje transverso", "Inducción miofascial"],
                        ejercicios: ["Bandas elásticas", "Propiocepción básica"]
                    }
                },
                fase_funcional: {
                    objetivos_smart: ["Retorno al deporte sin inestabilidad"],
                    planTratamiento: {
                        objetivos: ["Potencia", "Pliometría"],
                        clinica: ["Readaptación", "Gesto deportivo"],
                        ejercicios: ["Bosu", "Saltos", "Cambios de dirección"]
                    }
                }
            }
        },
        //FASCITIS PLANTAR
        {
            nombre: "FASCITIS PLANTAR / ENTESOPATÍA",
            color: "#fb923c",
            umbral: 4,
            criteriosPesados: [
                { id: "Dolor punzante al primer paso de la mañana", puntos: 5 },
                { id: "Dolor a la palpación del tubérculo medial del calcáneo", puntos: 4 },
                { id: "Aumento de dolor tras bipedestación prolongada", puntos: 3 },
                { id: "Prueba de Windlass (+)", puntos: 4 },
                { id: "Limitación notable de la dorsiflexión", puntos: 2 }
            ],
            hallazgosImagen: [
                { palabraClave: "ESPOLÓN CALCÁNEO", puntos: 3 },
                { palabraClave: "FASCITIS", puntos: 6 },
                { palabraClave: "ENGROSAMIENTO >4mm", puntos: 5 }
            ],
            objetivoSug: "Control de la carga tensional de la fascia y mejora de la flexibilidad de cadena posterior.",
            formatoFisio: "Proceso degenerativo de la fascia plantar debido a sobrecarga mecánica y déficit de movilidad del complejo gastrosóleo.",
            fases: {
                fase_aguda: {
                    objetivos_smart: ["Reducir dolor basal de 8/10 a 4/10 en primera semana"],
                    planTratamiento: {
                        objetivos: ["Analgesia", "Relajación miofascial"],
                        clinica: ["Crioterapia local", "Diatermia", "Ultrasonido"],
                        ejercicios: ["Rodar pelota de tenis/fría", "Estiramientos suaves de fascia", "Auto-masaje"]
                    }
                },
                fase_subaguda: {
                    objetivos_smart: ["Tolerar caminata de 15 min sin dolor punzante"],
                    planTratamiento: {
                        objetivos: ["Mecanotransducción", "Aumento de rango"],
                        clinica: ["Ondas de choque (Gold Standard)", "Punción seca en gemelos/sóleo", "Masaje profundo"],
                        ejercicios: ["Protocolo de Rathleff (carga progresiva)", "Estiramiento de cadena posterior", "Sentadilla isométrica"]
                    }
                },
                fase_funcional: {
                    objetivos_smart: ["Retorno a actividad deportiva sin dolor matutino"],
                    planTratamiento: {
                        objetivos: ["Potencia de tríceps sural", "Control motor del pie"],
                        clinica: ["Readaptación", "Estudio de la pisada/plantillas"],
                        ejercicios: ["Elevación de talones con carga", "Ejercicios de 'Short Foot'", "Pliometría suave"]
                    }
                }
            }
        },
        //TENDINOPATIA AQUILEA
        {
            nombre: "TENDINOPATÍA AQUILEA (PORCIÓN MEDIA/INSERCIONAL)",
            color: "#f43f5e",
            umbral: 4,
            criteriosPesados: [
                { id: "Dolor localizado a 2-6 cm de la inserción", puntos: 5 },
                { id: "Engrosamiento palpable del tendón", puntos: 4 },
                { id: "Dolor al ponerse de puntillas (unipodal)", puntos: 4 },
                { id: "Morning Stiffness (rigidez matutina)", puntos: 3 }
            ],
            hallazgosImagen: [
                { palabraClave: "TENDINOSIS", puntos: 5 },
                { palabraClave: "NEOVASCULARIZACIÓN", puntos: 6 },
                { palabraClave: "CALCIFICACIÓN", puntos: 4 }
            ],
            objetivoSug: "Aumento de la capacidad de carga del tendón y remodelación del tejido.",
            formatoFisio: "Falla en la respuesta cicatricial del tendón de Aquiles ante demandas mecánicas excesivas.",
            fases: {
                fase_aguda: {
                    dolor: "7-10/10",
                    objetivos_smart: ["Reducir la irritabilidad del tendón a <4/10 en reposo.", "Lograr marcha en plano sin dolor punzante en 72h."],
                    planTratamiento: {
                        objetivos: ["Analgesia", "Control de carga reactiva", "Reducción de mecanosensibilidad"],
                        clinica: ["Diatermia capacitiva", "Láser terapéutico", "Crioterapia intermitente"],
                        ejercicios: ["Isométricos de sóleo/gemelos (mantenidos 45 seg)", "Movilidad activa de dedos", "Báscula pélvica"]
                    }
                },
                fase_subaguda: {
                    dolor: "3-6/10",
                    objetivos_smart: ["Realizar elevación de talones (Heel raises) unipodal.", "Tolerar caminata de 20 min continuos."],
                    planTratamiento: {
                        objetivos: ["Estimular síntesis de colágeno", "Mecanotransducción"],
                        clinica: ["Ondas de choque", "EPTE/EPI", "Movilización del astrágalo"],
                        ejercicios: ["Protocolo de Alfredson", "Heavy Slow Resistance", "Fortalecimiento de flexores cortos"]
                    }
                },
                fase_funcional: {
                    dolor: "0-2/10",
                    objetivos_smart: ["Retorno al trote suave sin dolor residual.", "Realizar 20 repeticiones de elevación de talón con carga."],
                    planTratamiento: {
                        objetivos: ["Recuperar ciclo estiramiento-acortamiento", "Readaptación al gesto"],
                        clinica: ["Entrenamiento funcional", "Análisis biomecánico", "Punción seca residual"],
                        ejercicios: ["Saltos al cajón", "Jump rope", "Pliometría excéntrica"]
                    }
                }
            }
        },
        {
            nombre: "NEUROMA DE MORTON",
            color: "#8b5cf6",
            umbral: 4,
            criteriosPesados: [
                { id: "Parestesias en 3er y 4to metatarsiano", puntos: 5 },
                { id: "Prueba de Mulder (Clic audible/doloroso)", puntos: 6 },
                { id: "Sensación de 'caminar sobre una piedra'", puntos: 4 },
                { id: "Alivio inmediato al quitarse el calzado estrecho", puntos: 3 }
            ],
            hallazgosImagen: [
                { palabraClave: "NEUROMA", puntos: 7 },
                { palabraClave: "EDEMA INTERMETATARSIANO", puntos: 5 }
            ],
            objetivoSug: "Descompresión del nervio interdigital y redistribución de presiones.",
            formatoFisio: "Engrosamiento e irritación del nervio plantar común entre las cabezas de los metatarsianos.",
            fases: {
    fase_aguda: {
        dolor: "7-9/10",
        objetivos_smart: [
            "Reducir la sensación de 'caminar sobre una piedra' en un 50%.",
            "Eliminar las parestesias (hormigueos) en reposo durante la primera semana."
        ],
        planTratamiento: {
            objetivos: ["Analgesia", "Descompresión del espacio intermetatarsiano", "Control de la inflamación perineural"],
            clinica: ["Láser terapéutico (Gold Standard para neuropatías)", "Diatermia a baja intensidad", "Uso de almohadilla metatarsal"],
            ejercicios: ["Movilizaciones pasivas de los metatarsianos", "Baños de contraste", "Liberación miofascial suave de la musculatura intrínseca"]
        }
    },
    fase_subaguda: {
        dolor: "3-5/10",
        objetivos_smart: [
            "Tolerar calzado convencional (no estrecho) por más de 4 horas sin dolor.",
            "Realizar apoyo monopodal (sobre un pie) sin disparar el 'clic' de Mulder."
        ],
        planTratamiento: {
            objetivos: ["Mejorar la arquitectura del arco transverso", "Flexibilización de la cadena posterior", "Neuromodulación"],
            clinica: ["Neuromodulación percutánea del nervio plantar", "Terapia manual: Apertura de la bóveda plantar", "Inducción miofascial de la fascia plantar"],
            ejercicios: ["Short Foot (ejercicio del pie corto)", "Recoger una toalla con los dedos", "Estiramiento de gemelos y sóleo"]
        }
    },
    fase_funcional: {
        dolor: "0-2/10",
        objetivos_smart: [
            "Retorno a caminatas largas o trote con calzado adecuado sin síntomas.",
            "Mantener la independencia funcional sin necesidad de almohadillas externas."
        ],
        planTratamiento: {
            objetivos: ["Reeducación de la marcha", "Fortalecimiento de la musculatura intrínseca", "Prevención de recidivas"],
            clinica: ["Estudio dinámico de la pisada", "Entrenamiento de la fase de despegue de la marcha", "Higiene del calzado"],
            ejercicios: ["Caminar sobre diferentes texturas", "Ejercicios de equilibrio en superficies inestables", "Fortalecimiento avanzado de flexores"]
        }
    }
}
        }
    ]
}
  ],
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
   // Dentro de window.BIBLIOTECA_PROTOCOLOS
ODONTOLOGO: [
    {
        titulo: "Rehabilitación Integral / Prótesis Fija",
        id: "DENT_REHAB_001",
        triggers: ["caries", "corona", "dolor dental", "protesis", "estetica dental"],
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