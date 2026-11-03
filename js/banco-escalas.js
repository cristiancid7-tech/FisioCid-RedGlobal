

window.BANCO_ESCALAS = window.BANCO_ESCALAS || {};

// 1. ESCALAS Y TESTS DE PSICOLOGÍA (A nivel raíz)
window.BANCO_ESCALAS['DAS'] = {
    nombre: "Escala de Ajuste Marital (DAS)",
    rama: "psicologia",
    preguntas: [
        { t: "Grado de acuerdo en decisiones sobre finanzas del hogar", o: ["Siempre de acuerdo (0)", "Casi siempre de acuerdo (1)", "Frecuentemente en desacuerdo (2)", "Siempre en desacuerdo (3)"] },
        { t: "Frecuencia de discusiones o conflictos con la pareja", o: ["Nunca (0)", "Rara vez (1)", "Frecuentemente (2)", "Casi todos los días (3)"] },
        { t: "Sensación de arrepentimiento o duda sobre la relación", o: ["Nunca (0)", "Rara vez (1)", "Ocasionalmente (2)", "Frecuentemente (3)"] },
        { t: "Expresión de afecto y calidez mutua", o: ["Excelente (0)", "Buena (1)", "Regular / Escasa (2)", "Nula (3)"] }
    ],
    interpretar: function(pts) {
        let res = pts > 8 ? "Discordia conyugal severa / Riesgo de ruptura" : "Ajuste marital y consenso adecuado";
        return { g: `${res} (${pts} pts)`, notaClinica: `DAS (Ajuste Marital): ${res} (${pts} pts)` };
    }
};

window.BANCO_ESCALAS['COOPERSMITH'] = {
    nombre: "Inventario de Autoestima de Coopersmith",
    rama: "psicologia",
    preguntas: [
        { t: "Me cuesta mucho trabajo hablar en público o ante grupos", o: ["Falso / No me describe (1)", "Verdadero / Me describe (0)"] },
        { t: "Desearía ser otra persona más segura de sí misma", o: ["Falso / No me describe (1)", "Verdadero / Me describe (0)"] },
        { t: "Me desanimo fácilmente cuando cometo errores en el trabajo/escuela", o: ["Falso / No me describe (1)", "Verdadero / Me describe (0)"] },
        { t: "Siento que mis opiniones son tomadas en cuenta y valoradas", o: ["Verdadero / Me describe (1)", "Falso / No me describe (0)"] }
    ],
    interpretar: function(pts) {
        let res = pts >= 3 ? "Autoestima Alta y Estable" : "Autoestima Baja con vulnerabilidad emocional";
        return { g: `${res} (${pts}/4 pts)`, notaClinica: `Coopersmith: ${res} (${pts}/4 pts)` };
    }
};

window.BANCO_ESCALAS['DIBUJO_FAMILIA'] = {
    nombre: "Test Proyectivo del Dibujo de la Familia",
    rama: "psicologia",
    preguntas: [
        { t: "Ubicación y Omisión de Personajes", o: ["Familia completa y equilibrada", "Omisión del propio sujeto (Autoexclusión / Baja autoestima)", "Omisión o lejanía de la figura paterna/materna (Conflicto vincular)"] },
        { t: "Tamaño y Distancia entre los Integrantes", o: ["Figuras proporcionadas y unidas", "Personajes aislados con trazos separados (Falta de cohesión)", "Hipervaloración o gigantismo de un familiar (Temor o figura dominante)"] }
    ],
    interpretar: function(pts, seleccionados) {
        const obs = `Dibujo de la Familia: Dinámica proyectiva con ${seleccionados[0] || 'estructura normal'} y ${seleccionados[1] || 'vínculos integrados'}`;
        return { g: "Test Dibujo de la Familia Registrado", notaClinica: obs };
    }
};

window.BANCO_ESCALAS['WISC5'] = {
    nombre: "Cribado de Capacidad Intelectual (WISC-V)",
    rama: "psicologia",
    preguntas: [
        { t: "Comprensión Verbal (Vocabulario y semejanzas)", o: ["Rango Superior (CIT > 120)", "Rango Promedio Medio (CIT 90-109)", "Rango Límite / Bajo (CIT < 80)"] },
        { t: "Memoria de Trabajo y Velocidad de Procesamiento", o: ["Óptima y conservada", "Déficit leve en atención sostenida", "Afectación significativa en ejecución secuencial"] }
    ],
    interpretar: function(pts, seleccionados) {
        const obs = `WISC-V: Estimación clínica con ${seleccionados[0] || ''} y perfil de procesamiento ${seleccionados[1] || ''}`;
        return { g: "Perfil WISC-V Integrado", notaClinica: obs };
    }
};

window.BANCO_ESCALAS['RORSCHACH'] = {
    nombre: "Test de Rorschach (Manchas de Tinta)",
    rama: "psicologia",
    preguntas: [
        { t: "Reacción y Manejo del Color en las Láminas", o: ["Respuestas globales integradas (Afecto regulado)", "Shock al color / Bloqueo (Represión afectiva)", "Respuestas de color confuso o puro (Impulsividad / Desborde emocional)"] },
        { t: "Contenido de las Respuestas (Movimiento y Animales/Humanos)", o: ["Predominio de formas humanas (Buena empatía y juicio de realidad)", "Contenido crítico / sombrío (Ideación persecutoria o depresiva)", "Respuestas banales o estereotipadas (Rigidez adaptativa)"] }
    ],
    interpretar: function(pts, seleccionados) {
        const obs = `Rorschach: Estilo perceptivo con ${seleccionados[0] || ''} y contenido ${seleccionados[1] || ''}`;
        return { g: "Protocolo Rorschach Registrado", notaClinica: obs };
    }
};

window.BANCO_ESCALAS['LLUVIA'] = {
    nombre: "Test Proyectivo 'Persona Bajo la Lluvia'",
    rama: "psicologia",
    preguntas: [
        { t: "Intensidad y Dirección de la Lluvia", o: ["Lluvia moderada y vertical (Estrés cotidiano manejable)", "Lluvia torrencial / Acompañada de rayos (Presión ambiental severa)", "Ausencia de lluvia (Negación de conflictos o control forzado)"] },
        { t: "Defensas y Recursos de Protección (Paraguas/Impermeable)", o: ["Paraguas adecuado que cubre la figura (Buenos mecanismos de defensa)", "Paraguas ausente o insuficiente (Vulnerabilidad ante la presión externa)", "Paraguas excesivamente grande o cerrado (Defensas hipertróficas / Aislamiento)"] }
    ],
    interpretar: function(pts, seleccionados) {
        const obs = `Persona bajo la lluvia: Ambiente evaluado con ${seleccionados[0] || ''} y defensas de tipo ${seleccionados[1] || ''}`;
        return { g: "Test Persona Bajo la Lluvia Registrado", notaClinica: obs };
    }
};

window.BANCO_ESCALAS['MMPI2'] = {
    nombre: "Inventario Multifásico de Personalidad (MMPI-2)",
    rama: "psicologia",
    preguntas: [
        { t: "Validez de la Prueba (Escalas L, F, K)", o: ["Perfil de respuestas sincero y válido", "Elevación en escala F (Exageración de síntomas / Llamada de atención)", "Elevación en escala K (Defensividad o negación patológica)"] },
        { t: "Escalas Clínicas Principales (Histeria, Depresión, Paranoia, Esquizofrenia)", o: ["Dentro de la normalidad estadística (T < 65)", "Elevación en Tristeza / Depresión (Escala 2)", "Elevación en Ansiedad / Psicoticismo (Escalas 6 y 8)"] }
    ],
    interpretar: function(pts, seleccionados) {
        const obs = `MMPI-2: Validez de perfil '${seleccionados[0] || ''}' con hallazgo clínico en '${seleccionados[1] || ''}'`;
        return { g: "Perfil MMPI-2 Analizado", notaClinica: obs };
    }
};

window.BANCO_ESCALAS['PHQ9'] = {
    nombre: "Escala de Depresión del Paciente (PHQ-9)",
    rama: "psicologia",
    preguntas: [
        { t: "Poco interés o placer en hacer las cosas", o: ["Nunca (0)", "Varios días (1)", "Más de la mitad de los días (2)", "Casi todos los días (3)"] },
        { t: "Se ha sentido desanimado(a), deprimido(a) o sin esperanza", o: ["Nunca (0)", "Varios días (1)", "Más de la mitad de los días (2)", "Casi todos los días (3)"] },
        { t: "Dificultad para dormir o permanecer dormido(a), o dormir demasiado", o: ["Nunca (0)", "Varios días (1)", "Más de la mitad de los días (2)", "Casi todos los días (3)"] },
        { t: "Se ha sentido cansado(a) o con poca energía", o: ["Nunca (0)", "Varios días (1)", "Más de la mitad de los días (2)", "Casi todos los días (3)"] },
        { t: "Sin apetito o come en exceso", o: ["Nunca (0)", "Varios días (1)", "Más de la mitad de los días (2)", "Casi todos los días (3)"] },
        { t: "Se siente mal consigo mismo(a) o que es un fracaso", o: ["Nunca (0)", "Varios días (1)", "Más de la mitad de los días (2)", "Casi todos los días (3)"] },
        { t: "Dificultad para concentrarse en cosas (leer o ver TV)", o: ["Nunca (0)", "Varios días (1)", "Más de la mitad de los días (2)", "Casi todos los días (3)"] },
        { t: "Se mueve o habla tan lento que otros lo notan (o agitación inquietante)", o: ["Nunca (0)", "Varios días (1)", "Más de la mitad de los días (2)", "Casi todos los días (3)"] },
        { t: "Pensamientos de que estaría mejor muerto(a) o de lastimarse", o: ["Nunca (0)", "Varios días (1)", "Más de la mitad de los días (2)", "Casi todos los días (3)"] }
    ],
    interpretar: function(pts) {
        let res = "Depresión Mínima";
        if (pts >= 5 && pts <= 9) res = "Depresión Leve";
        else if (pts >= 10 && pts <= 14) res = "Depresión Moderada";
        else if (pts >= 15 && pts <= 19) res = "Depresión Moderadamente Severa";
        else if (pts >= 20) res = "Depresión Severa";
        return { g: `${res} (${pts} pts)`, notaClinica: `PHQ-9: ${res} (${pts} pts)` };
    }
};

window.BANCO_ESCALAS['GAD7'] = {
    nombre: "Escala de Ansiedad Generalizada (GAD-7)",
    rama: "psicologia",
    preguntas: [
        { t: "Sentirse nervioso(a), ansioso(a) o con los nervios de punta", o: ["Nunca (0)", "Varios días (1)", "Más de la mitad de los días (2)", "Casi todos los días (3)"] },
        { t: "No poder parar o controlar la preocupación", o: ["Nunca (0)", "Varios días (1)", "Más de la mitad de los días (2)", "Casi todos los días (3)"] },
        { t: "Preocuparse demasiado por diferentes cosas", o: ["Nunca (0)", "Varios días (1)", "Más de la mitad de los días (2)", "Casi todos los días (3)"] },
        { t: "Dificultad para relajarse", o: ["Nunca (0)", "Varios días (1)", "Más de la mitad de los días (2)", "Casi todos los días (3)"] },
        { t: "Estar tan inquieto(a) que es difícil quedarse quieto(a)", o: ["Nunca (0)", "Varios días (1)", "Más de la mitad de los días (2)", "Casi todos los días (3)"] },
        { t: "Irritarse o molestarse fácilmente", o: ["Nunca (0)", "Varios días (1)", "Más de la mitad de los días (2)", "Casi todos los días (3)"] },
        { t: "Sentir miedo como si algo terrible fuera a pasar", o: ["Nunca (0)", "Varios días (1)", "Más de la mitad de los días (2)", "Casi todos los días (3)"] }
    ],
    interpretar: function(pts) {
        let res = "Ansiedad Mínima";
        if (pts >= 5 && pts <= 9) res = "Ansiedad Leve";
        else if (pts >= 10 && pts <= 14) res = "Ansiedad Moderada";
        else if (pts >= 15) res = "Ansiedad Severa";
        return { g: `${res} (${pts} pts)`, notaClinica: `GAD-7: ${res} (${pts} pts)` };
    }
};

window.BANCO_ESCALAS['BECK'] = {
    nombre: "Inventario de Depresión de Beck (BDI-II)",
    rama: "psicologia",
    preguntas: [
        { t: "Estado de ánimo afectivo", o: ["No me siento triste (0)", "Me siento triste (1)", "Estoy triste todo el tiempo (2)", "Estoy tan triste que no puedo soportarlo (3)"] },
        { t: "Pesimismo y visión de futuro", o: ["No me siento desanimado (0)", "Me siento desanimado respecto al futuro (1)", "Siento que no tengo nada que esperar (2)", "El futuro es irremediable (3)"] },
        { t: "Sensación de Fracaso", o: ["No me siento fracasado (0)", "He fracasado más que la persona promedio (1)", "He hecho pocas cosas de valor (2)", "Me siento un fracaso total (3)"] },
        { t: "Pérdida de Placer (Anhedonia)", o: ["Obtengo el mismo placer de siempre (0)", "No disfruto las cosas como antes (1)", "Obtengo muy poco placer (2)", "No obtengo ningún placer (3)"] }
    ],
    interpretar: function(pts) {
        let res = "Sin sintomatología depresiva";
        if (pts >= 14 && pts <= 19) res = "Depresión Leve";
        else if (pts >= 20 && pts <= 28) res = "Depresión Moderada";
        else if (pts >= 29) res = "Depresión Severa";
        return { g: `${res} (${pts} pts)`, notaClinica: `Beck BDI-II: ${res} (${pts} pts)` };
    }
};

window.BANCO_ESCALAS['SCL90'] = {
    nombre: "Cuestionario de 90 Síntomas (SCL-90-R)",
    rama: "psicologia",
    preguntas: [
        { t: "Somatización (Molestias físicas y dolores)", o: ["Ninguna (0)", "Ligera (1)", "Moderada (2)", "Severa (3)"] },
        { t: "Obsesión - Compulsión (Pensamientos indeseados)", o: ["Ninguna (0)", "Ligera (1)", "Moderada (2)", "Severa (3)"] },
        { t: "Sensibilidad Interpersonal (Sentimientos de inferioridad)", o: ["Ninguna (0)", "Ligera (1)", "Moderada (2)", "Severa (3)"] },
        { t: "Hostilidad (Irritabilidad y arranques de ira)", o: ["Ninguna (0)", "Ligera (1)", "Moderada (2)", "Severa (3)"] }
    ],
    interpretar: function(pts) {
        let res = pts > 6 ? "Elevación clínica significativa en distrés psicopatológico" : "Dentro de parámetros estándar";
        return { g: `${res} (${pts} pts)`, notaClinica: `SCL-90-R: ${res} (${pts} pts)` };
    }
};

window.BANCO_ESCALAS['HTP'] = {
    nombre: "Test Proyectivo HTP (Casa - Árbol - Persona)",
    rama: "psicologia",
    preguntas: [
        { t: "Casa: Trazo y Accesibilidad (Ventanas/Puerta)", o: ["Normal y equilibrado (0)", "Sin ventanas / Puerta cerrada (Aislamiento) (1)", "Techo desproporcionado (Rumiación/Fantasía) (2)"] },
        { t: "Árbol: Tronco y Raíces (Fortaleza Yoica)", o: ["Tronco firme y enraizado (0)", "Tronco delgado e inestable (Inseguridad) (1)", "Ramas caídas o marchitas (Depresión) (2)"] },
        { t: "Persona: Tamaño y Presión de Línea", o: ["Tamaño promedio y trazo seguro (0)", "Figura micrográfica / Trazo débil (Inhibición/Ansiedad) (1)", "Figura macrográfica / Trazo resaltado (Defensa/Agresividad) (2)"] }
    ],
    interpretar: function(pts, seleccionados) {
        const obs = `HTP: Indicadores proyectivos observados -> Casa: ${seleccionados[0] || 'N/A'} | Árbol: ${seleccionados[1] || 'N/A'} | Persona: ${seleccionados[2] || 'N/A'}`;
        return { g: "Evaluación Proyectiva Completada", notaClinica: obs };
    }
};

window.BANCO_ESCALAS['MACHOVER'] = {
    nombre: "Test de la Figura Humana (Karen Machover)",
    rama: "psicologia",
    preguntas: [
        { t: "Ubicación del Dibujo en la Hoja", o: ["Centro (Equilibrio)", "Margen Superior (Fantasía/Imaginación)", "Margen Inferior (Inseguridad/Apego)", "Margen Izquierdo (Retrocesos/Pasado)"] },
        { t: "Tratamiento de las Extremidades (Brazos/Manos)", o: ["Manos abiertas / Detalles normales", "Brazos pegados al cuerpo (Rigidez/Defensa)", "Manos ocultas en bolsillos (Culpabilidad/Evasión)", "Brazos extendidos rígidos (Agresividad)"] }
    ],
    interpretar: function(pts, seleccionados) {
        const obs = `Machover: Proyección yoica con ubicación ${seleccionados[0] || ''} y respuesta en extremidades: ${seleccionados[1] || ''}`;
        return { g: "Test Proyectivo Machover Registrado", notaClinica: obs };
    }
};

window.BANCO_ESCALAS['CONNERS'] = {
    nombre: "Escala Conners Simplificada (Indicadores TDAH)",
    rama: "psicologia",
    preguntas: [
        { t: "Inquietud motora (No se está quieto en su asiento)", o: ["Nada (0)", "Poco (1)", "Bastante (2)", "Mucho (3)"] },
        { t: "Excitabilidad, impulsividad (Actúa sin pensar)", o: ["Nada (0)", "Poco (1)", "Bastante (2)", "Mucho (3)"] },
        { t: "Dificultad de atención (Se distrae fácilmente)", o: ["Nada (0)", "Poco (1)", "Bastante (2)", "Mucho (3)"] },
        { t: "Exige satisfacción inmediata a sus demandas", o: ["Nada (0)", "Poco (1)", "Bastante (2)", "Mucho (3)"] }
    ],
    interpretar: function(pts) {
        let res = pts >= 7 ? "Indicadores compatibles con sospecha de TDAH" : "Conducta infantil dentro de normas";
        return { g: `${res} (${pts} pts)`, notaClinica: `Conners TDAH: ${res} (${pts} pts)` };
    }
};

window.BANCO_ESCALAS['APGAR'] = {
    nombre: "Evaluación de Funcionalidad Familiar (APGAR)",
    rama: "psicologia",
    preguntas: [
        { t: "Adaptación: Me satisface la ayuda que recibo de mi familia ante problemas", o: ["Casi Nunca (0)", "A veces (1)", "Casi Siempre (2)"] },
        { t: "Participación: Me satisface cómo mi familia habla y comparte problemas", o: ["Casi Nunca (0)", "A veces (1)", "Casi Siempre (2)"] },
        { t: "Crecimiento: Mi familia apoya mis deseos de emprender nuevas actividades", o: ["Casi Nunca (0)", "A veces (1)", "Casi Siempre (2)"] },
        { t: "Afecto: Me satisface cómo mi familia expresa afecto y responde a emociones", o: ["Casi Nunca (0)", "A veces (1)", "Casi Siempre (2)"] },
        { t: "Resolución: Me satisface el tiempo que mi familia y yo pasamos juntos", o: ["Casi Nunca (0)", "A veces (1)", "Casi Siempre (2)"] }
    ],
    interpretar: function(pts) {
        let res = "Familia Altamente Funcional";
        if (pts <= 3) res = "Disfuncionalidad Familiar Severa";
        else if (pts <= 6) res = "Disfuncionalidad Familiar Moderada";
        else if (pts <= 7) res = "Disfuncionalidad Familiar Leve";
        return { g: `${res} (${pts}/10 pts)`, notaClinica: `APGAR Familiar: ${res} (${pts}/10 pts)` };
    }
};

window.BANCO_ESCALAS['GENOGRAMA'] = {
    nombre: "Genograma y Dinámica Multigeneracional",
    rama: "psicologia",
    preguntas: [
        { t: "Tipología y Estructura Familiar", o: ["Nuclear Intacta", "Monoparental", "Reconstituida", "Extensa / Multigeneracional"] },
        { t: "Patrón de Relación Predominante", o: ["Cohesiva / Apoyo Mutuo", "Conflictiva / Discordia", "Distante / Aislamiento", "Triangulada (Conflicto desplazado a hijos)"] },
        { t: "Límites y Jerarquías", o: ["Claros y Permeables", "Rígidos y Distantes", "Difusos (Aglutinamiento emocional)"] }
    ],
    interpretar: function(pts, seleccionados) {
        const obs = `Genograma: Estructura ${seleccionados[0] || ''}, Dinámica ${seleccionados[1] || ''} con límites ${seleccionados[2] || ''}`;
        return { g: "Genograma Registrado", notaClinica: obs };
    }
};


// 2. MÓDULOS DE FISIOTERAPIA (Alojados en su propia propiedad para no sobrescribir nada)
window.BANCO_ESCALAS.FISIOTERAPEUTA = [
    {
        titulo: "Abordaje Integral de Columna Lumbar y Pelvis",
        id: "LUMBAR_RAD_001",
        triggers: ["lumbar", "espalda baja", "pelvis", "cadera", "ciatica", "nalga", "pompa", "lumbago", "hernia", "disco", "estenosis"],
        fuentes: { clinica: "Klaus Buckup / Díaz Mancha", anatomia: "Netter / Moore (Niveles L1-S2)" },
        gabinete_sugerido: {
            RMN: ["Deshidratación L4-L5", "Extrusión L5-S1", "Estenosis Canal", "Modic II", "Abombamiento L3-L4"],
            USG: ["Engrosamiento Nervio Ciático", "Inflamación Facetaria", "Edema de Partes Blandas"],
            RX: ["Disminución de Espacio", "Osteofitos Marginales", "Escoliosis Antálgica"]
        },
        anamnesis: {
            sistemas: [
                "Dolor central (Lumbago mecánico)", "Dolor irradiado (Ciatalgia)", "Parestesias / Hormigueo", 
                "Aumento de dolor al sentarse / flexión", "Alivio en bipedestación / extensión", "Dolor al toser o estornudar (Valsalva)",
                "Debilidad muscular distal", "Claudicación (Dolor al caminar)", "Rigidez matutina importante", "Dolor glúteo profundo (punzante)", "Intolerancia a estar sentado > 20 min"
            ],
            redFlags: [
                "🚩 Anestesia en silla de montar (S3-S5)", "🚩 Pérdida de control de esfínteres", "🚩 Déficit motor súbito", 
                "🚩 Pérdida de peso inexplorada", "🚩 Antecedente de cáncer", "🚩 Dolor nocturno que NO desaparece con el reposo"
            ]
        },
        exploracion: {
            neurologia: {
                sensibilidad: [
                    { nivel: "L1", zona: "Inguinal/Trocánter" }, { nivel: "L2", zona: "Cara ant. Muslo (medio)" },
                    { nivel: "L3", zona: "Cóndilo femoral medial" }, { nivel: "L4", zona: "Maléolo medial" },
                    { nivel: "L5", zona: "Dorso del pie (3er espacio)" }, { nivel: "S1", zona: "Borde lateral pie (5to dedo)" }
                ],
                fuerza: [
                    { miotoma: "L1-L2", accion: "Flexión cadera (Psoas)" }, { miotoma: "L3", accion: "Extensión rodilla (Cuádriceps)" },
                    { miotoma: "L4", accion: "Dorsiflexión pie (Tibial Ant.)" }, { miotoma: "L5", accion: "Extensión 1er dedo (EHL)" },
                    { miotoma: "S1", accion: "Flexión plantar (Gastroc)" }
                ],
                reflejos: [
                    { rot: "L4", nombre: "Rotuliano (Cuádriceps)", nivel: "L2-L4" },
                    { rot: "S1", nombre: "Aquíleo (Gastronemios)", nivel: "L5-S2" }
                ]
            },
            pruebasOrtopedicas: [
                {
                    categoria: "Neurodinamia y Radiculares (Buckup)",
                    items: [
                        { nombre: "Lasègue (SLR)", tecnica: "Elevación pierna recta. Positivo si hay dolor radicular 30°-70°." },
                        { nombre: "Slump Test", tecnica: "Flexión tronco/cuello + ext. rodilla + dorsiflexión. Máxima tensión dural." },
                        { nombre: "Bragard", tecnica: "Dorsiflexión súbita tras Lasègue (+). Confirma origen neural." },
                        { nombre: "Wasserman", tecnica: "Extensión cadera en prono. Raíces altas (L2-L4)." },
                        { nombre: "Prueba de Kemp", tecnica: "Extensión lumbar máxima, rotación y flexión lateral." }
                    ]
                },
                {
                    categoria: "Atrapamientos Extracanaliculares y Pelvis",
                    items: [
                        { nombre: "Prueba de FAIR", tecnica: "Flexión, Aducción y Rotación Interna. (+) si reproduce dolor glúteo o ciático." },
                        { nombre: "Beatty Test", tecnica: "Paciente de lado, eleva rodilla против resistencia. (+) dolor en glúteo." },
                        { nombre: "Signo de Fortin", tecnica: "El paciente indica con un dedo el dolor exacto sobre la articulación SI." }
                    ]
                }
            ]
        }
    },
    {
        titulo: "Abordaje de Columna Cervical y Miembro Superior",
        id: "CERVICAL_RAD_002",
        triggers: ["cuello", "nuca", "trapecio", "hombro", "brazo", "mano", "hormigueo", "cervical", "torticolis"],
        fuentes: { clinica: "Netter / Wainner", anatomia: "Rouviere (C5-T1)" },
        gabinete_sugerido: {
            RMN: ["Hernia C5-C6", "Uncoartrosis", "Rectificación Cervical"],
            RX: ["Signo de la Plomada", "Osteofitos anteriores", "Forámenes estrechos"]
        },
        anamnesis: {
            sistemas: [
                "Dolor referido a escápula", "Parestesias en dedos", "Debilidad al cargar objetos",
                "Dolor que aumenta con la lectura/celular", "Cefalea tensional (nuca)", "Mareo cervicogénico"
            ],
            redFlags: ["🚩 Disfagia (dificultad al tragar)", "🚩 Marcha atáxica", "🚩 Signo de Lhermitte", "🚩 Diplopía"]
        },
        exploracion: {
            neurologia: {
                sensibilidad: [
                    { nivel: "C5", zona: "Cara lateral del deltoides" }, { nivel: "C6", zona: "Dorso del pulgar" },
                    { nivel: "C7", zona: "Dedo medio" }, { nivel: "C8", zona: "Borde cubital mano (meñique)" }
                ],
                fuerza: [
                    { miotoma: "C5", accion: "Abducción hombro (Deltoides)" }, { miotoma: "C6", accion: "Extensión muñeca / Flexión codo" },
                    { miotoma: "C7", accion: "Extensión codo (Tríceps)" }, { miotoma: "C8", accion: "Flexión de dedos" }
                ],
                reflejos: [
                    { rot: "C5", nombre: "Bicipital", nivel: "C5-C6" }, { rot: "C6", nombre: "Estilorradial", nivel: "C5-C6" },
                    { rot: "C7", nombre: "Tricipital", nivel: "C7-C8" }
                ]
            },
            pruebasOrtopedicas: [
                {
                    categoria: "Pruebas Radiculares y Hombro (Wainner / Magee)",
                    items: [
                        { nombre: "Prueba de Spurling", tecnica: "Inclinación + compresión axial. (+) dolor irradiado al brazo." },
                        { nombre: "Distracción Cervical", tecnica: "Tracción manual hacia cefálico. (+) si disminuyen síntomas." },
                        { nombre: "Prueba de Neer / Hawkins", tecnica: "Evaluación de pinzamiento subacromial." },
                        { nombre: "Prueba de Jobe (Empty Can)", tecnica: "Evaluación de tendón supraespinoso." }
                    ]
                }
            ]
        }
    },
    {
        titulo: "Codo, Muñeca y Mano",
        id: "CODO_MANO_003",
        gabinete_sugerido: { USG: ["Tenosinovitis de Quervain", "Epicondilitis Lateral", "Síndrome Túnel Carpiano"], RX: ["Fractura de Escafoides", "Artrosis radiocarpiana"] },
        anamnesis: {
            sistemas: ["Dolor en cara lateral de codo al agarrar", "Parestesias en primeros 3 dedos (noches)", "Dolor en tabaquera anatómica", "Pérdida de fuerza de prensión", "Chasquido en flexión de dedos"],
            redFlags: ["🚩 Atrofia severa de eminencia tenar", "🚩 Pérdida total de sensibilidad autónoma radial/mediana"]
        },
        exploracion: {
            pruebasOrtopedicas: [
                {
                    categoria: "Pruebas de Codo y Muñeca",
                    items: [
                        { nombre: "Cozen / Mill", tecnica: "Resistencia a extensión de muñeca. (+) Codo de tenista." },
                        { nombre: "Phalen / Tinel", tecnica: "Flexión mantenida de muñecas / Percusión. (+) Túnel carpiano." },
                        { nombre: "Finkelstein", tecnica: "Desviación cubital con pulgar dentro. (+) Quervain." },
                        { nombre: "Valgo/Varo de Codo", tecnica: "Evaluación de ligamentos colaterales de codo." }
                    ]
                }
            ]
        }
    },
    {
        titulo: "Cadera y Articulación Sacroilíaca",
        id: "CADERA_004",
        gabinete_sugerido: { RMN: ["Pinzamiento Femoroacetabular", "Necrosis Avascular"], RX: ["Coxartrosis", "Disminución espacio articular"] },
        anamnesis: {
            sistemas: ["Dolor inguinal profundo al flexionar", "Imposibilidad para cruzar la pierna", "Dolor trocantéreo lateral al dormir de lado", "Chasquido coxal interno/externo"],
            redFlags: ["🚩 Incapacidad absoluta de carga tras caída", "🚩 Acortamiento y rotación externa evidente de extremidad"]
        },
        exploracion: {
            pruebasOrtopedicas: [
                {
                    categoria: "Pruebas de Cadera y Pelvis",
                    items: [
                        { nombre: "FABER (Patrick)", tecnica: "Flexión, Abducción y Rotación Externa. (+) Cadera/Sacroilíaca." },
                        { nombre: "FADIR", tecnica: "Flexión, Aducción y Rotación Interna. (+) Pinzamiento femoroacetabular." },
                        { nombre: "Gaenslen", tecnica: "Extensión hiperextensión de cadera en camilla. (+) Art. Sacroilíaca." },
                        { nombre: "Trendelenburg", tecnica: "Bipedestación unipodal. (+) Debilidad de glúteo medio." }
                    ]
                }
            ]
        }
    },
    {
        titulo: "Evaluación Completa de Rodilla",
        id: "RODILLA_005",
        triggers: ["rodilla", "menisco", "ligamento", "cruzado", "pata de ganso", "estrepito", "bloqueo", "falle", "inflamacion rodilla"],
        fuentes: { clinica: "Magee / Torg", anatomia: "Kapandji" },
        gabinete_sugerido: {
            USG: ["Bursitis", "Tendinosis Rotuliana", "Quiste de Baker"],
            RMN: ["Ruptura Meniscal", "Edema Óseo", "Lesión Grado II/III Ligamentaria"]
        },
        anamnesis: {
            sistemas: [
                "Sensación de inestabilidad ('se me va la rodilla')", "Bloqueo articular", "Chasquido audible",
                "Dolor al bajar escaleras", "Dificultad para la extensión completa", "Inflamación inmediata (<2h)"
            ],
            redFlags: ["🚩 Incapacidad total de carga", "🚩 Deformidad articular evidente", "🚩 Derrame articular masivo"]
        },
        exploracion: {
            neurologia: { sensibilidad: [], fuerza: [], reflejos: [] },
            pruebasOrtopedicas: [
                {
                    categoria: "Estabilidad Ligamentaria y Meniscal",
                    items: [
                        { nombre: "Lachman", tecnica: "Flexión 20-30°. Traslación anterior de tibia. (+) Lesión LCA." },
                        { nombre: "Cajón Anterior / Posterior", tecnica: "Flexión 90°. Tracción anteroposterior." },
                        { nombre: "Bostezo (Valgo/Varo)", tecnica: "Estrés medial/lateral para ligamentos colaterales." },
                        { nombre: "McMurray", tecnica: "Flexión + Rotación + Extensión. (+) Chasquido o dolor meniscal." }
                    ]
                }
            ]
        }
    },
    {
        titulo: "Evaluación Completa de Tobillo y Pie",
        id: "TOBILLO_006",
        triggers: ["tobillo", "pie", "talon", "esguince", "torcedura", "fascia plantar", "aquiles", "maleolo", "inversion"],
        fuentes: { clinica: "Reglas de Ottawa / Magee", anatomia: "Netter" },
        gabinete_sugerido: {
            RX: ["Reglas de Ottawa (+)", "Fractura de Maleolo", "Espolón Calcáneo"],
            USG: ["Ruptura de Tendón de Aquiles", "Neuroma de Morton", "Fascitis Plantar"]
        },
        anamnesis: {
            sistemas: [
                "Dolor al dar el primer paso en la mañana", "Inestabilidad en terrenos irregulares",
                "Sensación de chasquido lateral", "Edema localizado", "Dolor punzante en el talón"
            ],
            redFlags: ["🚩 Incapacidad de dar 4 pasos seguidos", "🚩 Dolor óseo exquisito en zona maleolar (Ottawa)", "🚩 Ausencia de pulso pedio"]
        },
        exploracion: {
            neurologia: {
                sensibilidad: [
                    { nivel: "L4", zona: "Cara medial del pie" }, { nivel: "L5", zona: "Dorso del pie / 1er espacio" },
                    { nivel: "S1", zona: "Borde lateral del pie" }
                ],
                fuerza: [
                    { miotoma: "L4", accion: "Dorsiflexión (Tibial Anterior)" }, { miotoma: "L5", accion: "Extensión del 1er dedo" },
                    { miotoma: "S1", accion: "Plantiflexión (Gastronemios)" }
                ],
                reflejos: [
                    { rot: "S1", nombre: "Aquileo", nivel: "L5-S1-S2" }
                ]
            },
            pruebasOrtopedicas: [
                {
                    categoria: "Estabilidad y Test Funcionales de Tobillo/Pie",
                    items: [
                        { nombre: "Cajón Anterior de Tobillo", tecnica: "Fijar tibia, traccionar calcáneo. (+) Lesión LPAI." },
                        { nombre: "Prueba de Thompson", tecnica: "Compresión de pantorrilla. (+) Ausencia de plantiflexión = Ruptura Aquiles." },
                        { nombre: "Prueba de Windlass", tecnica: "Extensión pasiva del 1er dedo. (+) Dolor en fascia plantar." },
                        { nombre: "Prueba de Mulder", tecnica: "Compresión metatarsal transversal. (+) Clic y dolor en Neuroma de Morton." }
                    ]
                }
            ]
        }
    }
];