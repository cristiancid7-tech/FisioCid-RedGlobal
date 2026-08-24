// src/data/protocolos.js

export const protocolosClinicos = [
  {
    id: "facial",
    titulo: "Parálisis Facial",
    categoria: "Neurología",
    triggers: ["cara", "ojo", "comisura", "bell", "facial", "boca chueca", "nervio facial"],
    exploracion: {
      alerta_seguridad: "Diferenciación Central vs Periférica: ¿Puede arrugar la frente? (Si sí, activar protocolo de EVC/Urgencias)",
      escala_maestra: "Sunnybrook Facial Grading System",
      diagnostico_diferencial: [
        {
          tipo: "Parálisis Periférica (Bell)",
          hallazgos: "Incapacidad de cerrar el ojo y arrugar la frente del lado afectado. Fenómeno de Bell (+).",
          causa: "Inflamación del VII par craneal."
        },
        {
          tipo: "Parálisis Central (EVC)",
          hallazgos: "Frente conservada (mueve cejas), debilidad solo en cuadrante inferior de la cara.",
          causa: "Lesión supranuclear (Cerebro)."
        }
      ],
      tests_oro: [
        { nombre: "Escala Sunnybrook", utilidad: "Evaluación cuantitativa de reposo, movimiento y sincinesias." },
        { nombre: "Reflejo Corneal", utilidad: "Valoración de la integridad de la vía aferente (V) y eferente (VII)." },
        { nombre: "Cierre Palpebral", utilidad: "Valorar riesgo de úlcera corneal (Lagoftalmos)." }
      ],
      red_flags: ["Dolor súbito de cabeza", "Pérdida de visión", "Debilidad en brazo o pierna ipsilateral", "Disartria"]
    },
    eco: [
      "Trayecto del Nervio Facial (Agujero estilomastoideo)",
      "Glándula Parótida (Descarte de compresión externa)",
      "Trofiicidad de cigomáticos y orbicular"
    ],
    nota_clínica_sugerida: "Paciente con Parálisis Facial [Derecha/Izquierda]. Sunnybrook: /100. Sin signos de afectación central. Plan: Reeducación neuromuscular y protección ocular."
  },
  {
    id: "lumbar",
    titulo: "Columna Lumbar",
    categoria: "Ortopedia",
    triggers: ["espalda", "lumbar", "ciática", "pierna", "hernia", "lumbago", "pompa", "lumbosacra"],
    exploracion: {
      alerta_seguridad: "Diferenciar: ¿Dolor Radicular o Referido? Revisar sensibilidad y fuerza.",
      escala_maestra: "Pruebas de Tensión Neurodinámica",
      diagnostico_diferencial: [
        {
          tipo: "Dolor Radicular (Verdadera Ciática)",
          hallazgos: "Dolor lancinante (eléctrico), sigue un dermatoma, Lasègue (+), posible pérdida de fuerza o reflejo.",
          causa: "Compresión de raíz nerviosa (ej. Hernia discal)."
        },
        {
          tipo: "Dolor Referido (Somático)",
          hallazgos: "Dolor sordo y profundo, mal localizado, no suele pasar de la rodilla, tests neurodinámicos negativos.",
          causa: "Disfunción de facetas, ligamentos o puntos gatillo miofasciales."
        }
      ],
      tests_oro: [
        { nombre: "Lasègue (SLR)", utilidad: "Sensibilidad alta para hernias L4-S1. Positivo si hay dolor irradiado entre 30° y 70°." },
        { nombre: "Slump Test", utilidad: "Máxima tensión neurodinámica. Útil para casos dudosos de mecanosensibilidad neural." },
        { nombre: "Bragard", utilidad: "Diferencia dolor muscular de neural (dorsiflexión de tobillo al final del Lasègue)." }
      ],
      red_flags: ["Incontinencia urinaria/fecal", "Anestesia en silla de montar", "Debilidad progresiva severa"]
    },
    eco: [
      "Espacio Intervertebral (L4-L5 / L5-S1)",
      "Músculo Multífido (Valorar atrofia o grasa)",
      "Dinámica de ligamento supraespinoso en flexión"
    ],
    nota_clínica_sugerida: "Paciente con clínica compatible con [Radiculopatía/Dolor Referido]. Pruebas de tensión neural [Positivas/Negativas]. Nivel sugerido L[X]-S[Y]."
  }
];