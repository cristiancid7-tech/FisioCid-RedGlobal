const DiccionarioSintomas = {
    fisioterapia_lumbar: {
        // --- BÁSICOS Y CIÁTICA ---
        "SENTADO": "Dolor al estar sentado",
        "CAMINO": "Dolor al caminar",
        "TOSO": "Dolor al toser o estornudar (Valsalva)",
        "ESTORNUDO": "Dolor al toser o estornudar (Valsalva)",
        "HORMIGUEO": "Parestesias / Hormigueo", 
        "TOQUES": "Parestesias / Hormigueo", 
        "TOQUE": "Parestesias / Hormigueo",
        "PIQUETE": "Parestesias / Hormigueo",
        "CALAMBRE": "Parestesias / Hormigueo",
        "CORRIENTE": "Dolor irradiado (Ciatalgia)",
        "PIERNA": "Dolor irradiado (Ciatalgia)",
        "RIÑON": "Lumbar Alta / Riñón",

        // --- GLÚTEO PROFUNDO / POMPA ---
        "POMPA": "Dolor glúteo profundo (punzante)", 
        "NALGA": "Dolor glúteo profundo (punzante)", 
        "SIENTO": "Intolerancia a estar sentado > 20 min",
        "BOLA": "Sensación de 'pelota' o inflamación en glúteo",
        "MUSLO": "Parestesias que NO llegan al pie (solo muslo)",

        // --- NOCTURNOS ---
        "NOCHE": "Dolor nocturno, se quita al acomodarse",
        "DORMIR": "Dolor nocturno, se quita al acomodarse",
        "ACOSTADO": "Dolor nocturno, se quita al acomodarse",

        // --- ESTENOSIS Y FACETARIO (Nuevos!) ---
        "AMBAS": "Dolor bilateral",
        "DOS": "Dolor bilateral",
        "MAÑANA": "Rigidez matutina importante",
        "TIESO": "Rigidez matutina importante",
        "VIEJO": "Edad > 60 años",
        "MAYOR": "Edad > 60 años",
        "ANCIANO": "Edad > 60 años",

        // --- SACROILÍACA ---
        "ESCALERA": "Dolor al subir escaleras / carga unipodal",
        "SUBIR": "Dolor al subir escaleras / carga unipodal",
        "DEDO": "Dolor localizado en la articulación SI (Signo de Fortin)",
        "PUNTO": "Dolor localizado en la articulación SI (Signo de Fortin)",
        "MUSLO": "Dolor que NO cruza la rodilla",
        "MITAD": "Dolor que NO cruza la rodilla",
        "NO LLEGA A LA RODILLA": "Dolor que NO cruza la rodilla",
        

        // --- LISTESIS / PERONEO ---
        "ESCALON": "Palpación de 'escalón' vertebral",
        "HUECO": "Palpación de 'escalón' vertebral",
        "TROPIEZO": "Debilidad en dorsiflexión (Pie caído)",
        "PUNTA": "Debilidad en dorsiflexión (Pie caído)",
        "ATRAS DE LA PIERNA": "Isquiotibiales muy cortos / rígidos",

        // --- Nivel 2: Banderas Rojas (Alertas Críticas) ---
        "NO DESAPARECE": "🚩 Dolor nocturno que NO desaparece",
        "NO SE QUITA": "🚩 Dolor nocturno que NO desaparece",
        "TODO EL TIEMPO": "🚩 Dolor nocturno que NO desaparece",
        "BAÑO": "🚩 Pérdida de control de esfínteres",
        "NO CONTROLO": "🚩 Pérdida de control de esfínteres",
        "PERDIO PESO": "🚩 Pérdida de peso",
        "PERDIDA DE PESO": "🚩 Pérdida de peso"
    },
    fisioterapia_cervical: {
        "CUELLO": "Dolor cervical / Tortícolis",
        "NUCA": "Cefalea tensional / Dolor suboccipital",
        "MAREO": "Mareo cervicogénico",
        "PALETA": "Dolor referido a escápula",
        "ESCAPULA": "Dolor referido a escápula",
        "LECTURA": "Dolor que aumenta con la lectura/celular",
        "CELULAR": "Dolor que aumenta con la lectura/celular",
        "PESADEZ": "Debilidad al cargar objetos",
        "CARGAR": "Debilidad al cargar objetos",
        // CODO Y MANO
        "TENISTA": "Epicondilalgia lateral",
        "TAZA": "Dolor al levantar una taza o silla (Codo)",
        "ESCRIBIR": "Parestesias en 1er, 2do y 3er dedo (Túnel Carpiano)",
        "TECLADO": "Parestesias en 1er, 2do y 3er dedo (Túnel Carpiano)",
        "DESPIERTA": "Dolor nocturno que despierta al paciente",
        "FLACO": "Atrofia de la eminencia tenar",
        "TRAGAR": "🚩 Disfagia (dificultad al tragar)",
        "VER DOBLE": "🚩 Diplopía (Visión doble)"
    },

    // --- RODILLA ---
    fisioterapia_rodilla: {
        "FALLE": "Sensación de inestabilidad ('se me va la rodilla')",
        "VA": "Sensación de inestabilidad ('se me va la rodilla')",
        "TRABADA": "Bloqueo articular",
        "ATORA": "Bloqueo articular",
        "TRONIDO": "Chasquido audible en lesión",
        "BAJAR": "Dolor al bajar escaleras",
        "SUBIR": "Dolor al subir escaleras",
        "INFLADA": "Inflamación inmediata (<2h)",
        "CINE": "Dolor retro-rotuliano al estar sentado (Signo del cine)",
        "ARENA": "Crepitación articular (estrépito)",
        "RECHINIDO": "Crepitación articular (estrépito)",
        "DEBIL": "Atrofia notable de vasto medial",
        "PIERNA FLACA": "Atrofia notable de vasto medial"
    },

    // --- TOBILLO Y PIE ---
    fisioterapia_tobillo: {
        "DOBLO": "Mecanismo de inversión súbita",
        "TORCI": "Mecanismo de inversión súbita",
        "PISO": "Dolor al dar el primer paso en la mañana",
        "PASO": "Dolor al dar el primer paso en la mañana",
        "PUNZADA": "Dolor punzante en el talón",
        "TALON": "Dolor punzante en el talón",
        "HUEVO": "Edema localizado (huevo de paloma)",
        "BOLA": "Edema localizado (huevo de paloma)",
        "PIEDRA": "Sensación de 'caminar sobre una piedra' (Morton)",
        "ZAPATO": "Alivio inmediato al quitarse el calzado estrecho",
        "PUNTILLAS": "Dolor al ponerse de puntillas",
        "TIRON": "Dolor localizado en tendón de Aquiles"
    },
    GENERAL: {
        "AZUCAR": "Control de glucosa / Diabetes",
        "Mucha sed": "Polidipsia (Sed excesiva)",
        "Ganas de orinar": "Poliuria (Aumento de frecuencia urinaria)",
        "CUELLO OSCURO": "🚩 Acantosis Nigricans (Riesgo Metabólico)"
    },

    // NUTRICIÓN
    NUTRIOLOGO: {
        "DIETA": "Planificación alimenticia",
        "ANSIEDAD": "Hambre emocional / Ansiedad por comer",
        "PESO": "Control de sobrepeso u obesidad"
    },

    //ODONTOLOGÍA
    ODONTOLOGO: {
        "MUELA": "Odontalgia (Dolor dental)",
        "ENCIA": "Gingivitis / Inflamación gingival",
        "SANGRE": "Sangrado al cepillado"
    }

};