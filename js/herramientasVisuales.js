const PeriodontoFisioCid = {
    // Listado universal de dientes
    superior: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
    inferior: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],

   // En herramientasVisuales.js
inicializar: function(idSuperior = 'arcada-superior', idInferior = 'arcada-inferior') {
    // 🛡️ Limpieza de seguridad antes de renderizar
    const sup = document.getElementById(idSuperior);
    const inf = document.getElementById(idInferior);
    
    if(sup && inf) {
        this.renderizarArcada(idSuperior, this.superior);
        this.renderizarArcada(idInferior, this.inferior);
        console.log("🦷 PeriodontoFisioCid: Arcadas renderizadas con éxito.");
    } else {
        console.warn("⚠️ PeriodontoFisioCid: No se encontraron los contenedores en el DOM todavía.");
    }
},
    renderizarArcada: function(idContenedor, listaDientes) {
        const contenedor = document.getElementById(idContenedor);
        if (!contenedor) return;
        contenedor.innerHTML = "";

        listaDientes.forEach(num => {
            const dienteDiv = document.createElement('div');
            dienteDiv.style.textAlign = "center";
            
            // Dibujamos el SVG con 5 caras interactivas
            dienteDiv.innerHTML = `
                <svg width="45" height="55" viewBox="0 0 40 50" style="cursor:pointer;">
                    <path d="M5,5 L35,5 L30,15 L10,15 Z" fill="#f8fafc" stroke="#475569" class="cara-diente" data-cara="Vestibular" data-diente="${num}"/>
                    <rect x="10" y="15" width="20" height="15" fill="#f8fafc" stroke="#475569" class="cara-diente" data-cara="Oclusal" data-diente="${num}"/>
                    <path d="M10,30 L30,30 L35,40 L5,40 Z" fill="#f8fafc" stroke="#475569" class="cara-diente" data-cara="Lingual" data-diente="${num}"/>
                    <path d="M5,5 L10,15 L10,30 L5,40 Z" fill="#f8fafc" stroke="#475569" class="cara-diente" data-cara="Mesial" data-diente="${num}"/>
                    <path d="M35,5 L30,15 L30,30 L35,40 Z" fill="#f8fafc" stroke="#475569" class="cara-diente" data-cara="Distal" data-diente="${num}"/>
                    <text x="20" y="50" font-size="9" font-weight="900" text-anchor="middle" fill="#94a3b8">${num}</text>
                </svg>
            `;

            // Agregar lógica de clic a cada cara
            dienteDiv.querySelectorAll('.cara-diente').forEach(zona => {
                zona.addEventListener('click', (e) => this.rotarEstado(e.target));
            });

            contenedor.appendChild(dienteDiv);
        });
    },

    rotarEstado: function(elemento) {
        const estados = [
            { color: "#f8fafc", label: "Sano" },
            { color: "#ef4444", label: "Sangrado" },
            { color: "#ecf324", label: "Caries" },
            { color: "#3b82f6", label: "Tratado" }
        ];

        let colorActual = elemento.getAttribute('fill');
        let indexActual = estados.findIndex(e => e.color === colorActual);
        let proximo = (indexActual + 1) % estados.length;

        elemento.setAttribute('fill', estados[proximo].color);
        
        // Pequeño efecto visual de pulso al hacer clic
        elemento.style.opacity = "0.5";
        setTimeout(() => elemento.style.opacity = "1", 100);
    },
    generarReporteTexto: function() {
    let hallazgos = [];
    const carasCambiadas = document.querySelectorAll('.cara-diente');
    
    carasCambiadas.forEach(cara => {
        const color = cara.getAttribute('fill');
        const numDiente = cara.getAttribute('data-diente');
        const nombreCara = cara.getAttribute('data-cara');
        
        if (color === "#ef4444") hallazgos.push(`Sangrado en Diente ${numDiente} (${nombreCara})`);
        if (color === "#1e293b") hallazgos.push(`Caries/Cavidad en Diente ${numDiente} (${nombreCara})`);
        if (color === "#3b82f6") hallazgos.push(`Tratamiento previo en Diente ${numDiente} (${nombreCara})`);
    });

    return hallazgos.length > 0 ? hallazgos.join(', ') + '.' : "Sin hallazgos relevantes.";
}

    
};

