// ============================================================================
// 📄 GENERADOR MAESTRO DE RECETAS PDF FISIOCID (CON QR, LOGO Y FIRMA PRIVADOS)
// Archivo: js/pdf-generator.js
// ============================================================================
window.generarPDF = async (datos) => {
    if (!window.jspdf) {
        alert("La librería jsPDF no está cargada en esta pantalla.");
        return;
    }

    const { jsPDF } = window.jspdf;

    // 1. OBTENER CONTEXTO DE SESIÓN Y CLÍNICA
    const { data: { user } } = await fisioNet.auth.getUser();
    const idClinica = localStorage.getItem('clinica_activa_id') || localStorage.getItem('id_clinica_activa');

    if (!user || !idClinica) {
        alert("Error de sesión o clínica activa.");
        return;
    }

    // 2. CONSULTA PARALELA A SUPABASE
    const [clinicaRes, perfilRes] = await Promise.all([
        fisioNet.from('clinicas').select('nombre_clinica, direccion, telefono_contacto, color_institucional, logo_url, config_pdf').eq('id', idClinica).single(),
        fisioNet.from('perfiles_profesionales').select('nombre_completo, cedula_profesional, especialidad, institucion_egreso, formato_impresion, firma_digital_url').eq('id', user.id).single()
    ]);

    const clinica = clinicaRes.data || {};
    const perfil = perfilRes.data || {};
    const configPdf = clinica.config_pdf || {};

    // 🔒 3. FUNCIÓN AUXILIAR PARA OBTENER URL FIRMADA TEMPORAL DE ASSETS PRIVADOS
    async function obtenerUrlFirmadaTemp(rutaInterna) {
        if (!rutaInterna || rutaInterna.startsWith('http')) return rutaInterna; // Si ya es URL externa o vacía
        try {
            const { data, error } = await fisioNet.storage
                .from('assets_clinicos')
                .createSignedUrl(rutaInterna, 900); // 15 minutos de vigencia
            if (error) throw error;
            return data.signedUrl;
        } catch (e) {
            console.warn("No se pudo firmar el asset privado:", e.message);
            return null;
        }
    }

    // Convertimos las rutas privadas de Supabase en URLs firmadas aptas para jsPDF
    const logoUrlFirmada = await obtenerUrlFirmadaTemp(clinica.logo_url);
    const firmaUrlFirmada = await obtenerUrlFirmadaTemp(perfil.firma_digital_url);

    // 📏 DETECCIÓN DE FORMATO DE HOJA
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

    // Función auxiliar para cargar imagen en Base64 para jsPDF de forma síncrona/promesa
    async function cargarImagenEnBase64(url) {
        if (!url) return null;
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch (err) {
            console.warn("Error convirtiendo imagen a Base64 para PDF:", err);
            return null;
        }
    }

    // Precargamos logo y firma en Base64
    const logoBase64 = await cargarImagenEnBase64(logoUrlFirmada);
    const firmaBase64 = await cargarImagenEnBase64(firmaUrlFirmada);

    // ✍️ DIBUJO DE LA RECETA / NOTA
    const dibujarReceta = (yInicio, etiqueta) => {
        let y = yInicio;
        const margin = (formatoPref === 'TICKET') ? 5 : 18;
        const innerWidth = width - (margin * 2);

        // A. ENCABEZADO (DIGITAL O HOJA MEMBRETADA)
        if (modoMembretado === 'DIGITAL') {
            // 🖼️ INSERCIÓN DEL LOGOTIPO PRIVADO DE LA CLÍNICA
            if (logoBase64) {
                try {
                    // Se posiciona al lado izquierdo superior
                    doc.addImage(logoBase64, 'PNG', margin, y - 4, 18, 18);
                } catch (e) {
                    console.warn("No se pudo estampar el logotipo en el PDF:", e);
                }
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(formatoPref === 'TICKET' ? 11 : 14);
            doc.setTextColor(r, g, b);
            doc.text(clinica.nombre_clinica?.toUpperCase() || "FISIOCID", width / 2, y + 2, { align: "center" });

            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(etiqueta, width - margin, y + 2, { align: "right" });

            y += 7;

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

        // C. SIGNOS VITALES Y SOMATOMETRÍA
        const tieneVitales = datos.ta_sistolica || datos.frecuencia_cardiaca || datos.frecuencia_respiratoria || datos.temperatura || datos.spo2 || datos.peso || datos.eva;

        if (mostrarVitales && tieneVitales) {
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.rect(margin, y, innerWidth, 8, 'FD');

            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(50);
            
            const vitalesArr = [];
            if (datos.ta_sistolica || datos.ta_diastolica) vitalesArr.push(`T.A: ${datos.ta_sistolica || '--'}/${datos.ta_diastolica || '--'}`);
            if (datos.frecuencia_cardiaca) vitalesArr.push(`F.C: ${datos.frecuencia_cardiaca} lpm`);
            if (datos.frecuencia_respiratoria) vitalesArr.push(`F.R: ${datos.frecuencia_respiratoria} rpm`);
            if (datos.temperatura) vitalesArr.push(`Temp: ${datos.temperatura}°C`);
            if (datos.spo2) vitalesArr.push(`SpO2: ${datos.spo2}%`);
            if (datos.peso) vitalesArr.push(`Peso: ${datos.peso} kg`);
            if (datos.eva) vitalesArr.push(`EVA: ${datos.eva}/10`);

            const vitalesTexto = vitalesArr.join('  |  ');
            doc.text(vitalesTexto, width / 2, y + 5.2, { align: "center" });
            y += 12;
        }

        // D. DIAGNÓSTICO (CIE-10)
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

        // E. CUADRO DE INDICACIONES Y PLAN
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");

        const txtPlan = datos.plan_tratamiento || datos.nota_evolucion || datos.cambios_medicacion || "Seguir las indicaciones dadas en consulta.";
        const lineasPlan = doc.splitTextToSize(txtPlan, innerWidth - 8);

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

        y += (altoCuadro + 8);

        // F. SECCIÓN INFERIOR: FIRMA DIGITALIZADA + LÍNEA + QR
        const yFirma = y;

        // 🖋️ INSERCIÓN DE LA FIRMA DIGITALIZADA (ENCIMA DE LA LÍNEA)
        if (firmaBase64) {
            try {
                // Estampa la imagen de la firma centrada justo arriba de la línea de firma
                doc.addImage(firmaBase64, 'PNG', (width / 2) - 20, yFirma - 18, 40, 14);
            } catch (errFirma) {
                console.warn("No se pudo estampar la firma digital en el PDF:", errFirma);
            }
        }

        // Línea de Firma del Profesional (Centrado)
        doc.setDrawColor(180);
        doc.setLineWidth(0.3);
        doc.line(width / 2 - 30, yFirma, width / 2 + 30, yFirma);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(0);
        doc.text(perfil.nombre_completo?.toUpperCase() || "PROFESIONAL ATENDIENTE", width / 2, yFirma + 4, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text(`CEDULA PROFESIONAL: ${perfil.cedula_profesional || 'S/N'}`, width / 2, yFirma + 8, { align: "center" });

        // 📱 INSERCIÓN DEL CÓDIGO QR (Alineado a la derecha de la firma)
        if (datos.qr_code) {
            const tamanoQR = (formatoPref === 'TICKET') ? 16 : 20;
            const xQR = width - margin - tamanoQR;
            const yQR = yFirma - 4;

            try {
                doc.addImage(datos.qr_code, 'PNG', xQR, yQR, tamanoQR, tamanoQR);
                
                doc.setFontSize(5.5);
                doc.setTextColor(120);
                doc.setFont("helvetica", "bold");
                doc.text("CANJE ÚNICO FARMACIA", xQR + (tamanoQR / 2), yQR + tamanoQR + 3, { align: "center" });
            } catch (errQr) {
                console.warn("No se pudo estampar el QR en el PDF:", errQr.message);
            }
        }

        // Leyenda legal al pie
        if (leyendaPie) {
            y = yFirma + 15;
            doc.setFontSize(6.5);
            doc.setTextColor(130);
            doc.setFont("helvetica", "normal");
            const lineasLeyenda = doc.splitTextToSize(leyendaPie, innerWidth);
            doc.text(lineasLeyenda, width / 2, y, { align: "center" });
        }
    };

    // 🚀 SALIDA SEGÚN FORMATO DE IMPRESIÓN
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