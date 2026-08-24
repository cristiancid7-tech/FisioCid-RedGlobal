window.generarPDF = async (datos) => {
    const { jsPDF } = window.jspdf;
    
    // 1. OBTENER CONTEXTO
    const { data: { user } } = await fisioNet.auth.getUser();
    const idClinica = localStorage.getItem('clinica_activa_id') || localStorage.getItem('id_clinica_activa');

    if (!user || !idClinica) {
        alert("Error de sesión o clínica.");
        return;
    }
    
    // 2. CONSULTA DE PREFERENCIAS
    const [clinicaRes, perfilRes] = await Promise.all([
        fisioNet.from('clinicas').select('*').eq('id', idClinica).single(),
        fisioNet.from('perfiles_profesionales').select('*').eq('id', user.id).single()
    ]);

    const clinica = clinicaRes.data;
    const perfil = perfilRes.data;

    // 📏 DETECCIÓN DE FORMATO (Ajustado a tus Values: CARTA, MEDIA_CARTA, TICKET)
    const formatoPref = perfil?.formato_impresion || 'MEDIA_CARTA';
    
    let configDoc = { orientation: 'p', unit: 'mm', format: 'a4' }; 
    
    if (formatoPref === 'TICKET') {
        configDoc = { orientation: 'p', unit: 'mm', format: [80, 200] }; 
    }

    const doc = new jsPDF(configDoc);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // 🎨 COLORES Y DATOS
    const colorHex = clinica?.color_institucional || "#2563eb";
    const r = parseInt(colorHex.slice(1, 3), 16), g = parseInt(colorHex.slice(3, 5), 16), b = parseInt(colorHex.slice(5, 7), 16);
    const nombrePaciente = document.getElementById('nombre')?.innerText || "PACIENTE";

    const dibujarReceta = (yInicio, etiqueta) => {
        let y = yInicio;
        const margin = (formatoPref === 'TICKET') ? 5 : 20;
        const innerWidth = width - (margin * 2);

        // --- ENCABEZADO ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(formatoPref === 'TICKET' ? 11 : 16);
        doc.setTextColor(r, g, b); 
        doc.text(clinica?.nombre_clinica?.toUpperCase() || "FISIOCID", width/2, y, { align: "center" });
        
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(etiqueta, width - margin, y, { align: "right" });
        y += 6;

        doc.setFontSize(formatoPref === 'TICKET' ? 8 : 9);
        doc.setTextColor(100);
        doc.text(`${perfil?.especialidad || 'FISIOTERAPIA'} | Céd: ${perfil?.cedula_profesional || '13139044'}`, width/2, y, { align: "center" });
        y += 4;

        doc.setDrawColor(r, g, b);
        doc.setLineWidth(0.5);
        doc.line(margin, y, width - margin, y);
        y += 8;

        // --- DATOS PACIENTE ---
        doc.setFontSize(9);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(`PACIENTE:`, margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(nombrePaciente.toUpperCase(), margin + (formatoPref === 'TICKET' ? 18 : 22), y);
        
        doc.setFont("helvetica", "bold");
        if (formatoPref !== 'TICKET') {
            doc.text(`FECHA:`, width - margin - 35, y);
            doc.setFont("helvetica", "normal");
            doc.text(new Date().toLocaleDateString(), width - margin - 15, y);
        } else {
            y += 5;
            doc.text(`FECHA: ${new Date().toLocaleDateString()}`, margin, y);
        }
        y += 10;

        // --- CUADRO DE PLAN ---
        let altoCuadro = (formatoPref === 'CARTA') ? 140 : (formatoPref === 'TICKET' ? 80 : 45);

        doc.setDrawColor(r, g, b);
        doc.setLineWidth(0.2);
        doc.rect(margin, y, innerWidth, altoCuadro); 
        
        doc.setFillColor(r, g, b);
        doc.rect(margin, y, innerWidth, 7, 'F'); 
        doc.setTextColor(255);
        doc.setFontSize(8);
        doc.text(" INDICACIONES / PLAN DE TRATAMIENTO:", margin + 2, y + 5);
        
        doc.setTextColor(0);
        doc.setFontSize(10);
        const txt = datos.plan_tratamiento || datos.cambios_medicacion || "Seguir indicaciones.";
        const lineas = doc.splitTextToSize(txt, innerWidth - 10);
        doc.text(lineas, margin + 5, y + 15);
        
        y += (altoCuadro + 15);

        // --- FIRMA ---
        doc.setDrawColor(200);
        doc.line(width/2 - 30, y, width/2 + 30, y); 
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(perfil?.nombre_completo?.toUpperCase() || "CRISTIAN CID", width/2, y + 5, { align: "center" });
    };

    // 🚀 LÓGICA DE SALIDA
    if (formatoPref === 'MEDIA_CARTA') {
        dibujarReceta(20, "ORIGINAL");
        doc.setDrawColor(180);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(0, height/2, width, height/2);
        doc.setFontSize(6);
        doc.text("RECORTAR POR AQUÍ ✂️", 10, height/2 - 1);
        doc.setLineDashPattern([], 0);
        dibujarReceta(height/2 + 15, "COPIA PACIENTE");
    } 
    else {
        dibujarReceta(20, "DOCUMENTO OFICIAL");
    }

    doc.save(`Receta_${nombrePaciente.replace(/ /g, "_")}.pdf`);
};