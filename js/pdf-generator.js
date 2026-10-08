window.generarPDF = async (datos) => {
    if (!window.jspdf) {
        alert("La libreria jsPDF no esta cargada en esta pantalla.");
        return;
    }
    const { jsPDF } = window.jspdf;

    // 1. OBTENER CONTEXTO DE SESION Y CLINICA
    const { data: { user } } = await fisioNet.auth.getUser();
    const idClinica = localStorage.getItem('clinica_activa_id') || localStorage.getItem('id_clinica_activa');

    if (!user || !idClinica) {
        alert("Error de sesion o clinica activa.");
        return;
    }

    // 2. CONSULTA PARALELA A SUPABASE CON NOMBRES EXACTOS DE COLUMNAS
    const [clinicaRes, perfilRes] = await Promise.all([
        fisioNet.from('clinicas').select('nombre_clinica, direccion, telefono_contacto, color_institucional, logo_url, config_pdf').eq('id', idClinica).single(),
        fisioNet.from('perfiles_profesionales').select('nombre_completo, cedula_profesional, especialidad, institucion_egreso, formato_impresion, firma_digital_url').eq('id', user.id).single()
    ]);

    const clinica = clinicaRes.data || {};
    const perfil = perfilRes.data || {};
    const configPdf = clinica.config_pdf || {};

    // 📏 DETECCION DE FORMATO DE HOJA
    const formatoPref = perfil.formato_impresion || localStorage.getItem('pdf_formato_papel') || 'CARTA';
    let configDoc = { orientation: 'p', unit: 'mm', format: 'letter' };

    if (formatoPref === 'MEDIA_CARTA') {
        configDoc = { orientation: 'p', unit: 'mm', format: 'a4' };
    } else if (formatoPref === 'TICKET') {
        configDoc = { orientation: 'p', unit: 'mm', format: [80, 220] };
    }

    const doc = new jsPDF(configDoc);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // 🎨 COLORES E IDENTIDAD VISUAL
    const colorHex = clinica.color_institucional || "#10b981";
    const r = parseInt(colorHex.slice(1, 3), 16) || 16;
    const g = parseInt(colorHex.slice(3, 5), 16) || 185;
    const b = parseInt(colorHex.slice(5, 7), 16) || 129;

    const nombrePaciente = document.getElementById('nombre')?.innerText || datos.nombre_paciente || "PACIENTE";
    const modoMembretado = configPdf.modo_membretado || localStorage.getItem('pdf_modo_membretado') || 'DIGITAL';
    const mostrarVitales = configPdf.mostrar_vitales !== false;
    const mostrarCIE10 = configPdf.mostrar_cie10 !== false;
    const leyendaPie = configPdf.leyenda_pie || localStorage.getItem('pdf_leyenda_pie') || '';

    // ✍️ DIBUJO DE LA RECETA / NOTA
    const dibujarReceta = (yInicio, etiqueta) => {
        let y = yInicio;
        const margin = (formatoPref === 'TICKET') ? 5 : 18;
        const innerWidth = width - (margin * 2);

        // A. ENCABEZADO (DIGITAL O HOJA MEMBRETADA)
        if (modoMembretado === 'DIGITAL') {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(formatoPref === 'TICKET' ? 11 : 15);
            doc.setTextColor(r, g, b);
            doc.text(clinica.nombre_clinica?.toUpperCase() || "FISIOCID", width / 2, y, { align: "center" });

            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(etiqueta, width - margin, y, { align: "right" });
            y += 5;

            doc.setFontSize(formatoPref === 'TICKET' ? 8 : 9);
            doc.setTextColor(80);
            doc.text(`${perfil.especialidad || 'FISIOTERAPIA'} | CED. PROF: ${perfil.cedula_profesional || 'S/N'}`, width / 2, y, { align: "center" });
            y += 4;

            if (clinica.direccion) {
                doc.setFontSize(7);
                doc.setTextColor(120);
                doc.text(clinica.direccion.toUpperCase(), width / 2, y, { align: "center" });
                y += 4;
            }

            doc.setDrawColor(r, g, b);
            doc.setLineWidth(0.5);
            doc.line(margin, y, width - margin, y);
            y += 6;
        } else {
            y += 25; // Espacio reservado para hoja de imprenta
        }

        // B. DATOS DEL PACIENTE
        doc.setFontSize(8.5);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text("PACIENTE:", margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(nombrePaciente.toUpperCase(), margin + (formatoPref === 'TICKET' ? 18 : 20), y);

        const fechaNota = datos.fecha_nota ? new Date(datos.fecha_nota).toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX');

        if (formatoPref !== 'TICKET') {
            doc.setFont("helvetica", "bold");
            doc.text("FECHA:", width - margin - 35, y);
            doc.setFont("helvetica", "normal");
            doc.text(fechaNota, width - margin - 18, y);
        } else {
            y += 4;
            doc.setFont("helvetica", "bold");
            doc.text(`FECHA: ${fechaNota}`, margin, y);
        }
        y += 6;

        // C. SIGNOS VITALES
        if (mostrarVitales && (datos.ta_sistolica || datos.peso || datos.eva)) {
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.rect(margin, y, innerWidth, 8, 'FD');

            doc.setFontSize(7.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(50);
            
            const vitalesTexto = `T.A: ${datos.ta_sistolica || '--'}/${datos.ta_diastolica || '--'} mmHg  |  F.C: ${datos.frecuencia_cardiaca || '--'} bpm  |  SpO2: ${datos.spo2 || '--'}%  |  Peso: ${datos.peso || '--'}kg  |  Dolor (EVA): ${datos.eva || 0}/10`;
            doc.text(vitalesTexto, width / 2, y + 5.5, { align: "center" });
            y += 12;
        }

        // D. DIAGNOSTICO (CIE-10)
        if (datos.diagnostico_principal) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(r, g, b);
            
            const txtDiag = mostrarCIE10 && datos.codigo_cie10 
                ? `DIAGNOSTICO: ${datos.diagnostico_principal} (${datos.codigo_cie10})`
                : `DIAGNOSTICO: ${datos.diagnostico_principal}`;
                
            doc.text(txtDiag, margin, y);
            y += 6;
        }

       // E. CUADRO DE INDICACIONES Y PLAN (DINÁMICO SEGÚN LA CANTIDAD DE TEXTO)
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        
        const txtPlan = datos.plan_tratamiento || datos.nota_evolucion || datos.cambios_medicacion || "Seguir las indicaciones dadas en consulta.";
        const lineasPlan = doc.splitTextToSize(txtPlan, innerWidth - 8);
        
        // Calculamos la altura en base al número de líneas (aprox. 4.5 mm por línea + espacio del encabezado)
        const alturaCalculada = (lineasPlan.length * 4.5) + 12;
        const altoMinimo = (formatoPref === 'CARTA') ? 50 : (formatoPref === 'TICKET' ? 40 : 30);
        let altoCuadro = Math.max(alturaCalculada, altoMinimo);

        doc.setDrawColor(r, g, b);
        doc.setLineWidth(0.3);
        doc.rect(margin, y, innerWidth, altoCuadro);

        doc.setFillColor(r, g, b);
        doc.rect(margin, y, innerWidth, 6, 'F');
        doc.setTextColor(255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(" INDICACIONES Y PLAN DE TRATAMIENTO:", margin + 2, y + 4.2);

        doc.setTextColor(30);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(lineasPlan, margin + 4, y + 12);

        // Avanzamos el cursor "y" de manera fluida tomando en cuenta el alto real que ocupó la caja
        y += (altoCuadro + 8);

        // F. FIRMA Y LEYENDA LEGAL
        doc.setDrawColor(180);
        doc.setLineWidth(0.3);
        doc.line(width / 2 - 30, y, width / 2 + 30, y);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(0);
        doc.text(perfil.nombre_completo?.toUpperCase() || "PROFESIONAL ATENDIENTE", width / 2, y + 4, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text(`CEDULA PROFESIONAL: ${perfil.cedula_profesional || 'S/N'}`, width / 2, y + 8, { align: "center" });

        if (leyendaPie) {
            y += 13;
            doc.setFontSize(6.5);
            doc.setTextColor(130);
            const lineasLeyenda = doc.splitTextToSize(leyendaPie, innerWidth);
            doc.text(lineasLeyenda, width / 2, y, { align: "center" });
        }
    };

    // 🚀 SALIDA SEGUN FORMATO
    if (formatoPref === 'MEDIA_CARTA') {
        dibujarReceta(15, "ORIGINAL - EXPEDIENTE");

        doc.setDrawColor(180);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(0, height / 2, width, height / 2);
        doc.setFontSize(6);
        doc.setTextColor(120);
        doc.text("RECORTAR POR AQUI ✂️", 10, height / 2 - 1);
        doc.setLineDashPattern([], 0);

        dibujarReceta(height / 2 + 10, "COPIA PACIENTE");
    } else {
        dibujarReceta(15, "DOCUMENTO OFICIAL");
    }

    const nombreLimpio = nombrePaciente.replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`Receta_${nombreLimpio}.pdf`);
};