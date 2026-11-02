// ============================================================================
// 🧠 BANCO GLOBAL DE ESCALAS Y CUESTIONARIOS CLÍNICOS (Psicología, Odonto, Fisio)
// ============================================================================

window.BANCO_ESCALAS = window.BANCO_ESCALAS || {};

// ----------------------------------------------------------------------------
// 📊 1. BATERÍA PSICOMÉTRICA (ESTANDARIZADA)
// ----------------------------------------------------------------------------
// ============================================================================
// 🧠 ESCALAS ADICIONALES (DAS, COOPERSMITH, DIBUJO FAMILIA, WISC-V, RORSCHACH, LLUVIA, MMPI-2)
// ============================================================================

// 💍 1. DAS (Escala de Ajuste Marital / Dyadic Adjustment Scale)
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

// ⭐ 2. COOPERSMITH (Inventario de Autoestima Escolar / Adultos)
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

// 👨‍👩‍👧 3. DIBUJO DE LA FAMILIA (Test Proyectivo Infantil)
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

// 🧩 4. WISC-V (Escala de Inteligencia Wechsler para Niños - Cribado Rápido)
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

// 🩸 5. RORSCHACH (Test de Manchas de Tinta)
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

// 🌧️ 6. PERSONA BAJO LA LLUVIA (Test Proyectivo)
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

// 🧬 7. MMPI-2 / MCMI-IV (Inventario Multifásico de Personalidad de Minnesota)
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
// 🧪 PHQ-9 (Depresión)
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

// 🧪 GAD-7 (Ansiedad Generada)
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

// 📋 INVENTARIO BECK (BDI-II)
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

// 📈 SCL-90-R (Cuestionario de 90 Síntomas)
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

// ----------------------------------------------------------------------------
// 🎨 2. PRUEBAS PROYECTIVAS (CUALITATIVAS)
// ----------------------------------------------------------------------------

// 🏡 HTP (Casa-Árbol-Persona)
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

// 👤 Figura Humana (Machover)
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

// ----------------------------------------------------------------------------
// 👶 3. EVALUACIÓN INFANTO-JUVENIL
// ----------------------------------------------------------------------------

// 📝 Conners (TDAH)
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

// ----------------------------------------------------------------------------
// 👥 4. PAREJA Y DINÁMICA FAMILIAR (SISTÉMICA)
// ----------------------------------------------------------------------------

// 🏡 APGAR Familiar
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

// 🌳 Genograma 3 Generaciones
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