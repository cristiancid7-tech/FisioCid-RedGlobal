const FisioCidEngine = {
    datosTemporales: [],
    diagnosticosActivos: [],
    valorDolorEVA: 0,
    escalaActiva: null,
    ultimoResultadoEscala: null,

    // 🚩 LIMPIEZA DE TEXTO (Esencial para matches)
    limpiarTexto: function(t) {
        if (!t) return "";
        return t.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[()]/g, "")
            .trim();
    },

    // 🧠 ANALIZADOR OMNISCIENTE (Busca en TODAS las especialidades)
    analizarPatrones: function(datos) {
        const biblioteca = window.BIBLIOTECA_PROTOCOLOS;
        if (!biblioteca) return "<div class='text-muted p-3'>Biblioteca no cargada.</div>";

        this.diagnosticosActivos = [];
        let htmlSugerencias = "";
        const datosLimpios = datos.map(d => this.limpiarTexto(d));

        // 🔥 RECORREMOS TODAS LAS RAMAS (fisioterapia, nutricion, etc.)
        Object.keys(biblioteca).forEach(rama => {
            biblioteca[rama].forEach(protocolo => {
                if (!protocolo.diferenciales) return;

                protocolo.diferenciales.forEach(diag => {
                    let puntos = 0;
                    if (!diag.criteriosPesados) return;

                    diag.criteriosPesados.forEach(c => {
                        const criterioLimpio = this.limpiarTexto(c.id);
                        const existeMatch = datosLimpios.some(hallazgo => 
                            hallazgo.includes(criterioLimpio) || criterioLimpio.includes(hallazgo)
                        );
                        
                        if (existeMatch) puntos += c.puntos;
                    });

                    // Si supera el umbral, lo pintamos
                    if (puntos >= (diag.umbral || 4)) {
                        this.diagnosticosActivos.push({ ...diag, puntosActuales: puntos });
                        const colorBarra = diag.color || "#38bdf8";
                        
                        htmlSugerencias += `
                            <div style="border-left: 5px solid ${colorBarra}; background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <b style="color:white; font-size:0.7rem; text-transform:uppercase;">${diag.nombre}</b>
                                    <span style="background:${colorBarra}; color:white; padding:2px 7px; border-radius:12px; font-size:0.55rem; font-weight:900;">${puntos} PTS</span>
                                </div>
                                <i style="font-size:0.55rem; color:#cbd5e1; display:block; margin-top:4px;">🎯 ${diag.objetivoSug || 'Objetivo no definido'}</i>
                            </div>`;
                    }
                });
            });
        });

        return htmlSugerencias || `<div style="color:#64748b; font-size:0.55rem; text-align:center; padding:20px; border: 1px dashed #334155; border-radius:8px;">Seleccione hallazgos para ver diagnósticos diferenciales.</div>`;
    },

    // 🚀 ASISTENTE DE EVALUACIÓN
    abrirAsistente: function(paso = 'anamnesis') {
        if (typeof modalEngine !== 'undefined') {
            modalEngine.abrirAsistente(paso);
        }
    },

    // 🌡️ GESTIÓN DE DOLOR (EVA)
    registrarEVA_Directo: function(valor) {
        this.valorDolorEVA = parseInt(valor);
        const btnAsistente = document.querySelector('.btn-asistente-exploracion'); 
        if (btnAsistente) {
            const listo = this.valorDolorEVA > 0;
            btnAsistente.disabled = !listo;
            btnAsistente.style.opacity = listo ? "1" : "0.5";
            btnAsistente.style.cursor = listo ? "pointer" : "not-allowed";
        }
    },


lanzarCuestionario: function(id, dienteId = null) {
    const escala = window.BANCO_ESCALAS ? window.BANCO_ESCALAS[id] : null;
    if (!escala) return;

    this.escalaActiva = id; 
    // 🚩 CAMBIO 2: Guardamos el diente para que no se nos olvide
    this.dienteActivoEnEscala = dienteId; 

    const titulo = document.getElementById('tituloEscala');
    const contenedor = document.getElementById('cuerpoEscala');
    
    if (titulo) titulo.innerText = escala.nombre.toUpperCase();


if (id === 'PERIODONTOGRAMA') {
    const intentarRender = () => {
        const sup = document.getElementById('arcada-superior');
        const inf = document.getElementById('arcada-inferior');

        // Verificamos que ambos contenedores existan en el DOM
        if (sup && inf) {
            console.log("🦷 [FisioCid]: Contenedores listos. Dibujando dientes...");
          // Dentro de lanzarCuestionario('PERIODONTOGRAMA')
window.PeriodontoFisioCid.renderizarArcada('arcada-superior', [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]);
window.PeriodontoFisioCid.renderizarArcada('temporales-superior', [55, 54, 53, 52, 51, 61, 62, 63, 64, 65]);
window.PeriodontoFisioCid.renderizarArcada('temporales-inferior', [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]);
window.PeriodontoFisioCid.renderizarArcada('arcada-inferior', [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]);
        } else {
            console.warn("⏳ [FisioCid]: Contenedores no detectados aún, reintentando...");
            setTimeout(intentarRender, 100); // Reintenta cada 100ms
        }
    };

    if (window.PeriodontoFisioCid) intentarRender();
}
    // 📝 CASO NORMAL: ESCALAS DE PREGUNTAS
    else {
        if (!contenedor) return;
        let html = "";
        escala.preguntas.forEach((p, i) => {
            html += `
                <div class="mb-3 border-bottom pb-2">
                    <label class="form-label fw-bold small text-dark">${i+1}. ${p.t.toUpperCase()}</label>
                    <select class="form-select form-select-sm escala-input" onchange="window.FisioCidEngine.calcularEscalaDinamica()">
                        <option value="none">Seleccione...</option>
                        ${p.o.map((opcion, valor) => `<option value="${valor}">${opcion.toUpperCase()}</option>`).join('')}
                    </select>
                </div>`;
        });
        contenedor.innerHTML = html;
        
        // Solo mostramos el modal flotante si es una escala de preguntas
        const modalEl = document.getElementById('modalEscalaDinamica');
        if (modalEl) {
            modalEl.style.zIndex = "10050"; 
            const m = new bootstrap.Modal(modalEl, { backdrop: 'static' });
            m.show();
        }
    }
},

// UBICACIÓN: FisioCidEngine.js
integrarExpedienteDental: async function() {
    const { maestro, nota } = window.PeriodontoFisioCid.obtenerMapaParaGuardar();
    const idPaciente = this.pacienteActual.id; 

    try {
        // 1. Actualizamos el "ADN" permanente en pacientes_maestros
        // Aquí usamos la columna que creaste: estado_dental_base
        const { error: errMaestro } = await supabase
            .from('pacientes_maestros')
            .update({ estado_dental_base: maestro })
            .eq('id', idPaciente);

        if (errMaestro) throw errMaestro;

        // 2. Guardamos la evolución en historial_clinico
        const analisis = window.PeriodontoFisioCid.obtenerAnalisisOleary();
        
        // Creamos un objeto que combine el texto y los datos visuales
        const hallazgoCompleto = JSON.stringify({
            texto: analisis.g,
            capa_efimera: nota // Guardamos el rosa/morado del día
        });

        const { error: errHistorial } = await supabase
            .from('historial_clinico')
            .insert({
                id_paciente: idPaciente,
                id_profesional: this.usuarioSesion.id, // Tu ID de profesional
                fecha_nota: new Date().toISOString(),
                hallazgos_dentales: hallazgoCompleto, // Columna correcta
                especialidad_nota: 'ODONTOLOGÍA',
                motivo_consulta: 'Evaluación de Higiene y Periodonto'
            });

        if (errHistorial) throw errHistorial;

        alert("¡Expediente dental sincronizado con éxito! 🚀");
        
    } catch (error) {
        console.error("Error en sincronización FisioCid:", error);
        alert("Error al conectar con la base de datos.");
    }
},

// En FisioCidEngine.js
calcularEscalaDinamica: function() {
    let puntos = 0;
    let textosSeleccionados = []; 
    const inputs = document.querySelectorAll('.escala-input');
    
    inputs.forEach((s) => {
        if (s.value !== "none") puntos += parseInt(s.value);
        const texto = s.selectedIndex > 0 ? s.options[s.selectedIndex].text : "Pendiente";
        textosSeleccionados.push(texto);
    });

    const escala = window.BANCO_ESCALAS[this.escalaActiva];
    if (escala && escala.interpretar) {
        // 🚩 Mandamos los puntos y el diente (o los textos si no hay diente)
        const res = escala.interpretar(puntos, this.dienteActivoEnEscala || textosSeleccionados);
        
        const resVivo = document.getElementById('resultadoVivo');
        if (resVivo) {
            resVivo.innerHTML = `<b style="color:#d4af37;">${puntos} PTS</b> - <small>${res.g}</small>`;
        }
        
       if (escala.rama === "odontologia") {
            if (window.PeriodontoFisioCid) {
                window.PeriodontoFisioCid.actualizarHallazgoGlobal(this.escalaActiva, res.notaClinica || res.g);
            }
        } 
        else if (escala.rama === "fisioterapia") {
            // Guardamos en el almacén de fisio usando el nombre de la escala como llave única
            if (window.FisioCidClinico) {
                window.FisioCidClinico.hallazgosEscalas[escala.nombre] = res.g;
                window.FisioCidClinico.actualizarResumen();
            }
        }
    }
},

finalizarEscala: async function() {
    console.log("🏁 FisioCid: Iniciando cierre de escala...");

    // 1. CAPTURA DE DATOS (Leemos lo que el doctor ve en pantalla)
    const resVivo = document.getElementById('resultadoVivo');
    const textoLimpio = resVivo ? (resVivo.innerText.split(' - ')[1] || resVivo.innerText) : null;

    // Persistencia por especialidad (Se guarda en el objeto global)
    if (this.escalaActiva === 'ODONTOPEDIATRIA') window.PeriodontoFisioCid.ultimaEvaluacionPedia = textoLimpio;
    else if (this.escalaActiva === 'ENDODONCIA') window.PeriodontoFisioCid.ultimaEvaluacionEndo = textoLimpio;
    else if (this.escalaActiva === 'CIRUGIA') window.PeriodontoFisioCid.ultimaEvaluacionCx = textoLimpio;
    else if (this.escalaActiva === 'GERIATRIA') window.PeriodontoFisioCid.ultimaEvaluacionGero = textoLimpio;
    else if (this.escalaActiva === 'MALLAMPATI') window.PeriodontoFisioCid.ultimaEvaluacionViaAerea = textoLimpio;

    // 2. INTEGRACIÓN AL ASISTENTE (clicTag)
    const esDental = ['PERIODONTOGRAMA', 'ODONTOPEDIATRIA', 'ENDODONCIA', 'CIRUGIA', 'GERIATRIA', 'MALLAMPATI'].includes(this.escalaActiva);
    
    if (esDental && window.PeriodontoFisioCid) {
        // ACTUALIZACIÓN PREVENTIVA: Forzamos el dibujo antes de capturar el texto para el reporte
        window.PeriodontoFisioCid.actualizarResumenVisual(); 
        
        // Damos un respiro de 10ms para que el innerHTML se asiente
        setTimeout(() => {
            const resumenVisual = document.getElementById('texto-resumen-dinamico')?.innerText;
            if (typeof modalEngine !== 'undefined' && resumenVisual) {
                modalEngine.clicTag(`🦷 REPORTE DENTAL: ${resumenVisual}`);
            }
        }, 10);
    } else if (this.ultimoResultadoEscala && typeof modalEngine !== 'undefined') {
        modalEngine.clicTag(this.ultimoResultadoEscala);
    }

    // 3. CIERRE FÍSICO Y LIMPIEZA TOTAL
    const modalEl = document.getElementById('modalEscalaDinamica');
    if (modalEl) {
        const m = bootstrap.Modal.getInstance(modalEl);
        if (m) m.hide();

        setTimeout(() => {
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            
            // Refresco visual final
            if (window.PeriodontoFisioCid) {
                window.PeriodontoFisioCid.actualizarResumenVisual();
            }
        }, 150);
    }

    // 4. RESET DE ESTADO
    this.escalaActiva = null;
    this.ultimoResultadoEscala = null;
    console.log("✅ FisioCid: Integración finalizada con éxito.");
},

    // 🦷 GESTIÓN ODONTOLÓGICA (Añadir a FisioCidEngine)
registrarHallazgoDental: function(diente, cara, estado) {
    const hallazgo = `Pieza ${diente} (${cara}): ${estado}`;
    
    // Si el estado es "Sano", lo quitamos de la lista si existía
    if (estado === "Sano") {
        this.datosTemporales = this.datosTemporales.filter(t => !t.startsWith(`Pieza ${diente} (${cara})`));
    } else {
        // Evitamos duplicados y añadimos el hallazgo
        this.datosTemporales = this.datosTemporales.filter(t => !t.startsWith(`Pieza ${diente} (${cara})`));
        this.datosTemporales.push(hallazgo);
    }
    
    // Refrescamos el panel lateral del asistente
    if (typeof modalEngine !== 'undefined') {
        modalEngine.actualizarPanelDiagnostico();
    }
},


cargarConfiguracionDental: async function() {
    // 🚩 Agregamos una protección para esperar a que los datos existan
    if (!this.pacienteActual || !this.pacienteActual.id) {
        console.warn("⚠️ FisioCid: Esperando datos del paciente...");
        return; 
    }

    const idPaciente = this.pacienteActual.id;
  

    try {
        // 1. Recuperamos el estado dental base (ADN) de la tabla pacientes_maestros
        const { data, error } = await supabase
            .from('pacientes_maestros')
            .select('estado_dental_base')
            .eq('id', idPaciente)
            .single();

        if (error) throw error;

        // 2. ¿Tiene historial previo?
        if (data && data.estado_dental_base) {
            console.log("🦷 FisioCid: Recuperando historial dental...");
            this.aplicarADNAlOdontograma(data.estado_dental_base);
        } 
        else {
            // 3. Si es paciente nuevo, decidimos por EDAD (Ej. Valentín)
            console.log("👶 FisioCid: Configurando por edad...");
            const hoy = new Date();
           const cumple = new Date(this.pacienteActual.fecha_nacimiento);
            let edad = hoy.getFullYear() - cumple.getFullYear();
            
            const esAdulto = edad >= 12; // Umbral clínico estándar
            
            // Movemos el switch visualmente
            const switchEl = document.getElementById('switchAdultoNiño');
            if (switchEl) {
                switchEl.checked = esAdulto;
                window.PeriodontoFisioCid.toggleArcada(esAdulto);
            }
        }
    } catch (err) {
        console.error("Error al cargar configuración dental:", err);
    }
},

aplicarADNAlOdontograma: function(adn) {
    // Recorremos el JSON y pintamos cada cara guardada
    Object.keys(adn).forEach(clave => {
        // clave ejemplo: "diente_18_V"
        const partes = clave.split('_');
        const numDiente = partes[1];
        const caraId = partes[2];

        const selector = `.cara-diente[data-diente="${numDiente}"][data-cara="${caraId}"]`;
        const el = document.querySelector(selector);
        
        if (el) {
            el.setAttribute('fill', adn[clave]);
            // Si es gris, nos aseguramos que el sistema sepa que no cuenta
            if (adn[clave] === '#94a3b8') el.removeAttribute('data-tiene-placa');
        }
    });
    window.PeriodontoFisioCid.ultimaEvaluacionPedia = resultado.g;
    window.PeriodontoFisioCid.actualizarResumenVisual();
}


};



window.FisioCidEngine = FisioCidEngine;

