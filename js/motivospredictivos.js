const CATALOGO_MOTIVOS = {
    "FISIOTERAPEUTA": [
        "Lumbalgia mecánica crónica",
        "Esguince de tobillo Grado II",
        "Cervicalgia tensional",
        "Rehabilitación post-operado de LCA",
        "Tendinopatía del manguito rotador",
        "Fascitis plantar",
        "Parálisis facial periférica"
    ],
    "NUTRIOLOGO": [
        "Control y reducción de peso",
        "Plan alimenticio para paciente diabético",
        "Aumento de masa muscular (Hipertrofia)",
        "Educación nutricional y cambio de hábitos",
        "Evaluación antropométrica completa"
    ],
   // "PSICOLOGO": [
    //    "Manejo de crisis de ansiedad",
     //   "Acompañamiento en proceso de duelo",
      //  "Terapia de pareja / Conflictos familiares",
       // "Depresión mayor - Seguimiento",
        //"Evaluación psicométrica inicial"
    //],
    "ODONTOLOGO": [
        "Dolor dental agudo / Pulpitis",
        "Limpieza profunda y aplicación de flúor",
        "Evaluación para ortodoncia",
        "Exodoncia (Extracción dental)",
        "Restauración con resina"
    ],
    "GENERAL": [
        "Control de hipertensión arterial",
        "Infección de vías respiratorias",
        "Check-up anual preventivo",
        "Dolor abdominal inespecífico",
        "Certificado médico de salud"
    ]
};


document.addEventListener('DOMContentLoaded', () => {
    const txtMotivo = document.getElementById('motivo');
    const contenedorSugerencias = document.getElementById('sugerenciasMotivo');

    // 1. Obtenemos la especialidad real (o FISIOTERAPEUTA por defecto para tus pruebas)
    const especialidadRaw = localStorage.getItem('especialidadUsuario') || "FISIOTERAPEUTA";
    const especialidad = especialidadRaw.toUpperCase();
    
    console.log("🏥 Especialidad detectada:", especialidad);

    // Buscamos en el catálogo, si no existe la especialidad, usamos MEDICO GENERAL
    const misMotivos = CATALOGO_MOTIVOS[especialidad] || CATALOGO_MOTIVOS["MEDICO GENERAL"] || [];

    txtMotivo.addEventListener('input', (e) => {
        const busqueda = e.target.value.toLowerCase();
        contenedorSugerencias.innerHTML = ''; 

        if (busqueda.length < 3) return; 

        // 2. Filtramos coincidencias
        const coincidencias = misMotivos.filter(m => m.toLowerCase().includes(busqueda)).slice(0, 3);

        // 3. Renderizamos las pastillas
        coincidencias.forEach(texto => {
            const pastilla = document.createElement('button');
            pastilla.type = 'button';
            pastilla.innerHTML = `<i class="fas fa-magic"></i> ${texto}`; // Un toque visual
            pastilla.style = "background: #fdf2f2; color: #b38888; border: 1px solid #f1dada; padding: 6px 12px; border-radius: 20px; font-size: 0.7rem; cursor: pointer; font-weight: bold; transition: 0.2s; margin-right: 5px;";
            
            pastilla.onclick = () => {
                txtMotivo.value = texto;
                contenedorSugerencias.innerHTML = ''; 
                txtMotivo.focus();
            };
            
            contenedorSugerencias.appendChild(pastilla);
        });
    });
});