// ============================================================================
// 🧠 MOTOR PSICOFISIOCID - MÓDULO DE EVALUACIÓN PSICOLÓGICA Y SALUD MENTAL
// ============================================================================

window.PsicoFisioCid = (function () {
    let estadoPsico = {
        enfoque: 'COGNITIVO_CONDUCTUAL',
        animo: 5,
        ansiedad: 0,
        submoduloActivo: 'PSICOMETRIA'
    };

    // 📐 ESTIRAMIENTO RESPONSIVO PANTALLA COMPLETA
    const estirarLienzo = () => {
        const modal = document.getElementById('modalPsicoFullscreen');
        if (!modal) return;

        modal.querySelectorAll('.modal-dialog, .modal-content').forEach(el => {
            el.style.setProperty('width', '100%', 'important');
            el.style.setProperty('max-width', '100vw', 'important');
            el.style.setProperty('min-height', '100vh', 'important');
            el.style.setProperty('box-sizing', 'border-box', 'important');
            el.style.setProperty('margin', '0', 'important');
        });
    };

    // ⚡ INYECTOR RÁPIDO DE CHIPS EN TEXTAREAS
    const agregarTagTexto = (idCampo, texto) => {
        const el = document.getElementById(idCampo);
        if (!el) return;
        const actual = el.value.trim();
        if (!actual) {
            el.value = texto;
        } else if (!actual.includes(texto)) {
            el.value = `${actual}\n• ${texto}`;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
    };

    // 🎛️ RENDERIZADOR DE SUB-MÓDULOS DE TEST (BOTONES COMPACTOS + ACTIVACIÓN VISUAL)
    const renderizarSubmodulo = (moduloKey, elementoBtn) => {
        estadoPsico.submoduloActivo = moduloKey;

        // 1. Manejo activo visual de la barra de pestañas superior
        const grupoTabs = document.getElementById('grupo-tabs-psico');
        if (grupoTabs) {
            grupoTabs.querySelectorAll('button').forEach(b => {
                b.classList.remove('active', 'bg-info', 'bg-warning', 'bg-light', 'bg-success', 'text-dark');
            });
        }

        if (elementoBtn) {
            elementoBtn.classList.add('active');
            if (moduloKey === 'PSICOMETRIA') elementoBtn.classList.add('bg-info', 'text-dark');
            if (moduloKey === 'PROYECTIVOS') elementoBtn.classList.add('bg-warning', 'text-dark');
            if (moduloKey === 'INFANTIL') elementoBtn.classList.add('bg-light', 'text-dark');
            if (moduloKey === 'PAREJA') elementoBtn.classList.add('bg-success', 'text-white');
        }

        // 2. Inyección de chips horizontales pequeños
        const contenedor = document.getElementById('contenedor-baterias-test');
        if (!contenedor) return;

        let html = '';

        switch (moduloKey) {
            case 'PSICOMETRIA':
                html = `
                    <div class="p-2 bg-dark border border-info rounded-3 mt-2">
                        <span class="text-info fw-bold d-block mb-1.5 micro text-uppercase">📊 Batería Psicométrica (Estandarizada)</span>
                        <div class="d-flex flex-wrap gap-1.5 align-items-center">
                            <button type="button" class="btn btn-xs btn-outline-info w-auto py-1 px-2.5 rounded-pill" style="font-size: 0.75rem;" onclick="PsicoFisioCid.lanzarTestModal('PHQ9')">🧪 PHQ-9 (Depresión)</button>
                            <button type="button" class="btn btn-xs btn-outline-info w-auto py-1 px-2.5 rounded-pill" style="font-size: 0.75rem;" onclick="PsicoFisioCid.lanzarTestModal('GAD7')">🧪 GAD-7 (Ansiedad)</button>
                            <button type="button" class="btn btn-xs btn-outline-info w-auto py-1 px-2.5 rounded-pill" style="font-size: 0.75rem;" onclick="PsicoFisioCid.lanzarTestModal('BECK')">📋 Inventario Beck (BDI)</button>
                            <button type="button" class="btn btn-xs btn-outline-info w-auto py-1 px-2.5 rounded-pill" style="font-size: 0.75rem;" onclick="PsicoFisioCid.lanzarTestModal('SCL90')">📈 SCL-90-R (Síntomas)</button>
                            <button type="button" class="btn btn-xs btn-outline-info w-auto py-1 px-2.5 rounded-pill" style="font-size: 0.75rem;" onclick="PsicoFisioCid.lanzarTestModal('MMPI2')">🧬 MMPI-2 / MCMI-IV</button>
                        </div>
                    </div>`;
                break;

            case 'PROYECTIVOS':
                html = `
                    <div class="p-2 bg-dark border border-warning rounded-3 mt-2">
                        <span class="text-warning fw-bold d-block mb-1.5 micro text-uppercase">🎨 Pruebas Proyectivas (Análisis Cualitativo)</span>
                        <div class="d-flex flex-wrap gap-1.5 align-items-center">
                            <button type="button" class="btn btn-xs btn-outline-warning w-auto py-1 px-2.5 rounded-pill" style="font-size: 0.75rem;" onclick="PsicoFisioCid.lanzarTestModal('HTP')">🏡 HTP (Casa-Árbol-Persona)</button>
                            <button type="button" class="btn btn-xs btn-outline-warning w-auto py-1 px-2.5 rounded-pill" style="font-size: 0.75rem;" onclick="PsicoFisioCid.lanzarTestModal('MACHOVER')">👤 Figura Humana (Machover)</button>
                            <button type="button" class="btn btn-xs btn-outline-warning w-auto py-1 px-2.5 rounded-pill" style="font-size: 0.75rem;" onclick="PsicoFisioCid.lanzarTestModal('LLUVIA')">🌧️ Persona bajo la lluvia</button>
                            <button type="button" class="btn btn-xs btn-outline-warning w-auto py-1 px-2.5 rounded-pill" style="font-size: 0.75rem;" onclick="PsicoFisioCid.lanzarTestModal('RORSCHACH')">🩸 Rorschach</button>
                        </div>
                    </div>`;
                break;

            case 'INFANTIL':
                html = `
                    <div class="p-2 bg-dark border border-pink rounded-3 mt-2" style="border-color: #ec4899 !important;">
                        <span class="fw-bold d-block mb-1.5 micro text-uppercase" style="color:#ec4899;">👶 Evaluación Infanto-Juvenil</span>
                        <div class="d-flex flex-wrap gap-1.5 align-items-center">
                            <button type="button" class="btn btn-xs btn-outline-light w-auto py-1 px-2.5 rounded-pill" style="font-size: 0.75rem;" onclick="PsicoFisioCid.lanzarTestModal('WISC5')">🧩 WISC-V (CI Escolar)</button>
                            <button type="button" class="btn btn-xs btn-outline-light w-auto py-1 px-2.5 rounded-pill" style="font-size: 0.75rem;" onclick="PsicoFisioCid.lanzarTestModal('CONNERS')">📝 Conners (TDAH)</button>
                            <button type="button" class="btn btn-xs btn-outline-light w-auto py-1 px-2.5 rounded-pill" style="font-size: 0.75rem;" onclick="PsicoFisioCid.lanzarTestModal('DIBUJO_FAMILIA')">👨‍👩‍👧 Dibujo de la Familia</button>
                            <button type="button" class="btn btn-xs btn-outline-light w-auto py-1 px-2.5 rounded-pill" style="font-size: 0.75rem;" onclick="PsicoFisioCid.lanzarTestModal('COOPERSMITH')">⭐ Coopersmith</button>
                        </div>
                    </div>`;
                break;

            case 'PAREJA':
                html = `
                    <div class="p-2 bg-dark border border-success rounded-3 mt-2">
                        <span class="text-success fw-bold d-block mb-1.5 micro text-uppercase">👥 Pareja y Dinámica Familiar</span>
                        <div class="d-flex flex-wrap gap-1.5 align-items-center">
                            <button type="button" class="btn btn-xs btn-outline-success w-auto py-1 px-2.5 rounded-pill" style="font-size: 0.75rem;" onclick="PsicoFisioCid.lanzarTestModal('GENOGRAMA')">🌳 Genograma 3 Gen.</button>
                            <button type="button" class="btn btn-xs btn-outline-success w-auto py-1 px-2.5 rounded-pill" style="font-size: 0.75rem;" onclick="PsicoFisioCid.lanzarTestModal('APGAR')">🏡 APGAR Familiar</button>
                            <button type="button" class="btn btn-xs btn-outline-success w-auto py-1 px-2.5 rounded-pill" style="font-size: 0.75rem;" onclick="PsicoFisioCid.lanzarTestModal('DAS')">💍 Ajuste Marital (DAS)</button>
                        </div>
                    </div>`;
                break;
        }

        contenedor.innerHTML = html;
    };

    // 🎯 LANZADOR DE CUESTIONARIOS / REGISTRO DE TEST
    const lanzarTestModal = (idTest) => {
        console.log(`🧠 [PsicoFisioCid]: Lanzando test: ${idTest}`);
        if (window.FisioCidEngine && typeof window.FisioCidEngine.lanzarCuestionario === 'function') {
            window.FisioCidEngine.lanzarCuestionario(idTest);
        } else {
            let res = "";
            if (idTest === 'HTP') res = "HTP: Trazo débil, aislamiento detectado.";
            if (idTest === 'APGAR') res = "APGAR: Disfuncionalidad familiar moderada.";
            if (idTest === 'GENOGRAMA') res = "Genograma: Triangulación afectiva en 3ª generación.";
            if (res) agregarTagTexto('psico_objetivos', res);
        }
    };

    // 🎯 OBTENER ESTADO MAESTRO PARA SUPABASE
    const obtenerObjetoPsicologiaMaestro = () => {
        const chkRiesgo = document.getElementById('psico_chk_riesgo');
        return {
            enfoque_terapeutico: document.getElementById('psico_enfoque')?.value || estadoPsico.enfoque,
            estado_animo_actual: parseInt(document.getElementById('psico_slider_animo')?.value) || estadoPsico.animo,
            nivel_ansiedad: parseInt(document.getElementById('psico_slider_ansiedad')?.value) || estadoPsico.ansiedad,
            redes_apoyo: document.getElementById('psico_redes_apoyo')?.value || '',
            mecanismos_afrontamiento: document.getElementById('psico_afrontamiento')?.value || '',
            escala_phq9_depresion: parseInt(document.getElementById('val_phq9_total')?.value) || 0,
            escala_gad7_ansiedad: parseInt(document.getElementById('val_gad7_total')?.value) || 0,
            riesgo_autolesion: chkRiesgo ? chkRiesgo.checked : false,
            objetivos_terapeuticos: document.getElementById('psico_objetivos')?.value || '',
            tareas_interconsulta: document.getElementById('psico_tareas_casa')?.value || '',
            ultima_actualizacion: new Date().toISOString()
        };
    };

    // 🎨 REHIDRATACIÓN DINÁMICA DESDE SUPABASE
    const cargarEstadoPsicologicoMaestro = (datosGuardados) => {
        if (!datosGuardados) return;

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el && val !== undefined && val !== null) el.value = val;
        };

        setVal('psico_enfoque', datosGuardados.enfoque_terapeutico);
        setVal('psico_slider_animo', datosGuardados.estado_animo_actual);
        setVal('psico_slider_ansiedad', datosGuardados.nivel_ansiedad);
        setVal('psico_redes_apoyo', datosGuardados.redes_apoyo);
        setVal('psico_afrontamiento', datosGuardados.mecanismos_afrontamiento);
        setVal('val_phq9_total', datosGuardados.escala_phq9_depresion);
        setVal('val_gad7_total', datosGuardados.escala_gad7_ansiedad);
        setVal('psico_objetivos', datosGuardados.objetivos_terapeuticos);
        setVal('psico_tareas_casa', datosGuardados.tareas_interconsulta);

        const chkRiesgo = document.getElementById('psico_chk_riesgo');
        if (chkRiesgo) chkRiesgo.checked = !!datosGuardados.riesgo_autolesion;

        actualizarIndicadoresVisuales();
        
        // Renderizar pestaña psicometría por defecto
        const btnPsico = document.querySelector('#grupo-tabs-psico button');
        renderizarSubmodulo('PSICOMETRIA', btnPsico);
        estirarLienzo();
    };

    const calcularPHQ9 = () => {
        const val = parseInt(document.getElementById('val_phq9_total')?.value || 0);
        const b = document.getElementById('badge_phq9_res');
        if (b) {
            if (val <= 4) { b.className = "badge bg-success"; b.innerText = `${val} pts - Mínima`; }
            else if (val <= 9) { b.className = "badge bg-info text-dark"; b.innerText = `${val} pts - Leve`; }
            else if (val <= 14) { b.className = "badge bg-warning text-dark"; b.innerText = `${val} pts - Moderada`; }
            else { b.className = "badge bg-danger"; b.innerText = `${val} pts - Severa`; }
        }
    };

    const calcularGAD7 = () => {
        const val = parseInt(document.getElementById('val_gad7_total')?.value || 0);
        const b = document.getElementById('badge_gad7_res');
        if (b) {
            if (val <= 4) { b.className = "badge bg-success"; b.innerText = `${val} pts - Mínima`; }
            else if (val <= 9) { b.className = "badge bg-info text-dark"; b.innerText = `${val} pts - Leve`; }
            else if (val <= 14) { b.className = "badge bg-warning text-dark"; b.innerText = `${val} pts - Moderada`; }
            else { b.className = "badge bg-danger"; b.innerText = `${val} pts - Severa`; }
        }
    };

    const actualizarIndicadoresVisuales = () => {
        const animoVal = document.getElementById('psico_slider_animo')?.value || 5;
        const ansiedadVal = document.getElementById('psico_slider_ansiedad')?.value || 0;

        if (document.getElementById('lbl_animo_val')) document.getElementById('lbl_animo_val').innerText = `${animoVal}/10`;
        if (document.getElementById('lbl_ansiedad_val')) document.getElementById('lbl_ansiedad_val').innerText = `${ansiedadVal}/10`;
    };

 // 👁️ VISTA PREVIA EN VIVO UNIFICADA Y LIMPIA
    const actualizarVistaPreviaEnVivo = () => {
        const enfoque = document.getElementById('psico_enfoque')?.value || 'COGNITIVO_CONDUCTUAL';
        const animo = document.getElementById('psico_slider_animo')?.value;
        const ansiedad = document.getElementById('psico_slider_ansiedad')?.value;
        
        const phq9Input = document.getElementById('val_phq9_total')?.value;
        const phq9Badge = document.getElementById('badge_phq9_res')?.innerText || '';
        
        const gad7Input = document.getElementById('val_gad7_total')?.value;
        const gad7Badge = document.getElementById('badge_gad7_res')?.innerText || '';
        
        const chkRiesgo = document.getElementById('psico_chk_riesgo')?.checked;
        const redes = document.getElementById('psico_redes_apoyo')?.value.trim();
        const afrontamiento = document.getElementById('psico_afrontamiento')?.value.trim();

        // 1. Armar estatus general y escalas
        let partesEstatus = [`Enfoque: ${enfoque.replace(/_/g, ' ')}`];
        if (animo !== undefined && animo !== '') partesEstatus.push(`Ánimo: ${animo}/10`);
        if (ansiedad !== undefined && ansiedad !== '') partesEstatus.push(`Ansiedad: ${ansiedad}/10`);

        let textoEnVivo = `[RESUMEN CLÍNICO EN VIVO] ${partesEstatus.join(' | ')}`;

        if (phq9Input !== undefined && phq9Input !== '') {
            textoEnVivo += ` | PHQ-9: ${phq9Input} pts (${phq9Badge})`;
        }
        if (gad7Input !== undefined && gad7Input !== '') {
            textoEnVivo += ` | GAD-7: ${gad7Input} pts (${gad7Badge})`;
        }
        if (chkRiesgo) {
            textoEnVivo += ` | ⚠️ ALERTA: RIESGO DE AUTOLESIÓN ACTIVADO`;
        }

        // 2. Integrar Redes de Apoyo y Afrontamiento en el mismo bloque si tienen texto
        if (redes) {
            textoEnVivo += `\n• Redes de Apoyo: ${redes.replace(/\n/g, ' - ')}`;
        }
        if (afrontamiento) {
            textoEnVivo += `\n• Mecanismos de Afrontamiento: ${afrontamiento.replace(/\n/g, ' - ')}`;
        }

        const campoObjetivos = document.getElementById('psico_objetivos');
        if (!campoObjetivos) return;

        let contenidoActual = campoObjetivos.value;
        const regexBloque = /\[RESUMEN CLÍNICO EN VIVO\][\s\S]*?(?=\n\n[A-Z]|$)/;

        if (regexBloque.test(contenidoActual)) {
            campoObjetivos.value = contenidoActual.replace(regexBloque, textoEnVivo);
        } else {
            campoObjetivos.value = textoEnVivo + (contenidoActual ? '\n\n' + contenidoActual : '');
        }
    };

    

    return {
       estirarLienzo,
        agregarTagTexto,
        lanzarTestModal,
        renderizarSubmodulo,
        obtenerObjetoPsicologiaMaestro,
        cargarEstadoPsicologicoMaestro,
        calcularPHQ9,
        calcularGAD7,
        actualizarIndicadoresVisuales,
        actualizarVistaPreviaEnVivo
    };
})();