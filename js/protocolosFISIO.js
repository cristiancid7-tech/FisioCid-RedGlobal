// ============================================================================
// 📋 PROTOCOLOS Y MATRIZ DE PUNTUACIÓN E HIPÓTESIS CLÍNICAS - FISIOCID
// ============================================================================

window.PROTOCOLOS_FISIO = {
    LUMBAR: {
        ejercicios: [
            { categoria: "Fase 1: Control Motor y Alivio", items: [
                { nombre: "Cat-Camel (Gato-Camello)", desc: "Movilidad segmentaria suave en cuadrupedia (2x10 reps)." },
                { nombre: "Puente Glúteo Supino", desc: "Activación lumbo-pélvica isométrica (3x10s)." },
                { nombre: "Respiración Diafragmática", desc: "Control de presión intraabdominal en decúbito supino." }
            ]},
            { categoria: "Fase 2: Estabilidad y Core", items: [
                { nombre: "Bird-Dog (Perdigón)", desc: "Estabilidad en 4 puntos alternando extremidades (3x10 reps)." },
                { nombre: "Plancha Abdominal Modificada", desc: "Sobre rodillas o antebrazos para resistencia isométrica." },
                { nombre: "Monster Walks con Bandas", desc: "Estabilización de cadera y control lumbo-pélvico en bipedestación." }
            ]}
        ],
        hipotesisSugeridas: [
            { testClave: "Lasègue", puntosMinimos: 3, texto: "Probable Síndrome Radicular Lumbar (Ciática / Irritación dural L5-S1)." },
            { testClave: "Slump Test", puntosMinimos: 3, texto: "Probable alteración de la neurodinámica y tensión neural adversa." },
            { testClave: "Kemp", puntosMinimos: 2, texto: "Probable Síndrome Facetario Lumbar o irritación foraminal unilateral." },
            { testClave: "FAIR", puntosMinimos: 2, texto: "Probable Síndrome del Músculo Piriforme con atrapamiento ciático." }
        ]
    },
    CERVICAL: {
        ejercicios: [
            { categoria: "Fase 1: Alivio y Movilidad", items: [
                { nombre: "Retracción Cervical (Chin Tucks)", desc: "Inhibición de suboccipitales y control profundo (3x10 reps)." },
                { nombre: "Movilidad Activa C-S", desc: "Rotaciones libres sin dolor dentro del rango articular." },
                { nombre: "Estiramiento de Trapecio Superior", desc: "Inclinación lateral suave mantenida 30s." }
            ]},
            { categoria: "Fase 2: Fortalecimiento Escapular", items: [
                { nombre: "Remo Bajo con Banda elástica", desc: "Control escapular y estabilización dorsal media (3x12 reps)." },
                { nombre: "Y-T-W en prono", desc: "Fortalecimiento de romboides y trapecio inferior." }
            ]}
        ],
        hipotesisSugeridas: [
            { testClave: "Spurling", puntosMinimos: 3, texto: "Probable Radiculopatía Cervical por compresión foraminal." },
            { testClave: "Neer", puntosMinimos: 2, texto: "Probable Síndrome de Pinzamiento Subacromial (Conflicto coracoacromial)." },
            { testClave: "Jobe", puntosMinimos: 2, texto: "Probable tendinopatía o lesión del músculo supraespinoso." }
        ]
    },
    CODO_MANO: {
        ejercicios: [
            { categoria: "Fase 1: Control de Inflamación y Carga", items: [
                { nombre: "Estiramiento Excéntrico de Muñeca (Tyler Twist)", desc: "Protocolo para tendinopatía lateral de codo (3x15 reps)." },
                { nombre: "Movilidad Neurodinámica del Nervio Mediano", desc: "Deslizamientos neurales suaves sin reproducción de parestesias." }
            ]}
        ],
        hipotesisSugeridas: [
            { testClave: "Cozen", puntosMinimos: 2, texto: "Probable Epicondilitis Lateral (Codo de tenista)." },
            { testClave: "Phalen", puntosMinimos: 2, texto: "Probable Síndrome del Túnel Carpiano (Compresión del nervio mediano)." },
            { testClave: "Finkelstein", puntosMinimos: 2, texto: "Probable Tenosinovitis estenosante de De Quervain." }
        ]
    },
    CADERA: {
        ejercicios: [
            { categoria: "Fase 1: Activación y Rango Seguro", items: [
                { nombre: "Clamshells (Almejas) con Banda", desc: "Activación analítica de rotadores externos y glúteo medio (3x12 reps)." },
                { nombre: "Movilidad de Cadera en Cuadrupedia", desc: "Rotaciones internas y externas controladas sin dolor." }
            ]}
        ],
        hipotesisSugeridas: [
            { testClave: "FABER", puntosMinimos: 2, texto: "Probable disfunción de Articulación Sacroilíaca o patología coxofemoral." },
            { testClave: "FADIR", puntosMinimos: 2, texto: "Probable Pinzamiento Femoroacetabular (FAI)." },
            { testClave: "Trendelenburg", puntosMinimos: 2, texto: "Probable insuficiencia o debilidad del músculo glúteo medio." }
        ]
    },
    RODILLA: {
        ejercicios: [
            { categoria: "Fase 1: Control de Edema y Rango", items: [
                { nombre: "Extensiones terminales con liga (TKE)", desc: "Fortalecimiento de VMO en cadena cinética abierta (3x15 reps)." },
                { nombre: "Mini-sentadillas asistidas", desc: "Rango seguro de 0° a 45° de flexión." },
                { nombre: "Isometricos de Cuádriceps", desc: "Contracción mantenida con rollo bajo rodilla (3x10s)." }
            ]}
        ],
        hipotesisSugeridas: [
            { testClave: "Lachman", puntosMinimos: 3, texto: "Probable Inestabilidad de Ligamento Cruzado Anterior (LCA)." },
            { testClave: "McMurray", puntosMinimos: 3, texto: "Probable lesión meniscal (cuerno posterior / menisco interno o externo)." }
        ]
    },
    TOBILLO: {
        ejercicios: [
            { categoria: "Fase 1: Propiocepción y Estabilidad", items: [
                { nombre: "Eversión de tobillo con banda elástica", desc: "Fortalecimiento de músculos peroneos (3x15 reps)." },
                { nombre: "Balance unipodal sobre superficie estable", desc: "Control neuromuscular básico (3 series de 30s)." }
            ]}
        ],
        hipotesisSugeridas: [
            { testClave: "Cajón Anterior", puntosMinimos: 2, texto: "Probable lesión del Ligamento Peroneoastragalino Anterior (LPAI)." },
            { testClave: "Thompson", puntosMinimos: 3, texto: "Probable ruptura completa o parcial del Tendón de Aquiles." },
            { testClave: "Windlass", puntosMinimos: 2, texto: "Probable Fascitis Plantar o tensión de la fascia." }
        ]
    }
};