// ============================================================================
// 🔒 A) LIMPIEZA DE PERMISOS OTP E INICIALIZACIÓN UNIFICADA
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const idPacienteLimpio = idPaciente || window.pacienteCargado?.id;
    if (idPacienteLimpio) {
        sessionStorage.removeItem(`otp_aprobado_paciente_${idPacienteLimpio}`);
        sessionStorage.removeItem(`otp_id_paciente_${idPacienteLimpio}`);
    }
    
    // Ejecución inicial limpia
    cargarExpedienteFijo();
    inicializarEscuchaMotivo();
     adaptarInterfazPorEspecialidad();
    cargarDatosDesdeRecetaPendiente();
});

// B) LIMPIAR PERMISOS AL CERRAR O SALIR DE LA PÁGINA
window.addEventListener('beforeunload', () => {
    const idPacienteLimpio = idPaciente || window.pacienteCargado?.id;
    if (idPacienteLimpio) {
        sessionStorage.removeItem(`otp_aprobado_paciente_${idPacienteLimpio}`);
        sessionStorage.removeItem(`otp_id_paciente_${idPacienteLimpio}`);
    }
});



const urlParams = new URLSearchParams(window.location.search);
let idPaciente = urlParams.get('id') || localStorage.getItem('paciente_seleccionado_id') || sessionStorage.getItem('paciente_seleccionado_id');

const cargarExpedienteFijo = async () => {
    // 🕒 1. REPARACIÓN FECHA Y HORA (Se ejecuta SIEMPRE)
    const contenedorReloj = document.getElementById('reloj-consulta');
    if (contenedorReloj) {
        const pintarFechaHora = () => {
            const ahora = new Date();
            const opcionesFecha = { day: '2-digit', month: '2-digit', year: 'numeric' };
            const fechaFormateada = ahora.toLocaleDateString('es-MX', opcionesFecha);
            const horaFormateada = ahora.toLocaleTimeString('es-MX', { hour12: false });
            
            contenedorReloj.innerText = `${fechaFormateada}\n${horaFormateada}`;
        };
        pintarFechaHora();
        setInterval(pintarFechaHora, 1000); 
    }

    // 👨‍⚕️ 2. REPARACIÓN PERFIL MÉDICO (Se ejecuta SIEMPRE)
    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (user) {
            const { data: perfil, error: errorPerfil } = await fisioNet
                .from('perfiles_profesionales')
                .select('nombre_completo, cedula_profesional, especialidad')
                .eq('id', user.id)
                .single();

            if (!errorPerfil && perfil) {
                const nombreDoc = perfil.nombre_completo || "Profesional Registrado";
                const cedulaPro = perfil.cedula_profesional || "REVISAR PERFIL";
                const especialidadDoc = perfil.especialidad || localStorage.getItem('especialidadUsuario') || "General";

                if (document.getElementById('doc-nombre')) {
                    document.getElementById('doc-nombre').innerText = ` ${nombreDoc}`.toUpperCase();
                }
                if (document.getElementById('doc-especialidad')) {
                    document.getElementById('doc-especialidad').innerText = especialidadDoc.toUpperCase();
                }
                if (document.getElementById('doc-cedula')) {
                    document.getElementById('doc-cedula').innerText = cedulaPro;
                }
            } else {
                if (document.getElementById('doc-nombre')) document.getElementById('doc-nombre').innerText = "PROFESIONAL ACTIVO";
                if (document.getElementById('doc-cedula')) document.getElementById('doc-cedula').innerText = "REVISAR PERFIL";
                if (document.getElementById('doc-especialidad')) document.getElementById('doc-especialidad').innerText = (localStorage.getItem('especialidadUsuario') || "GENERAL").toUpperCase();
            }
        }
    } catch (e) {
        console.error("Error al mapear datos del médico desde la tabla perfiles:", e);
    }

    // 🛡️ 3. VALIDACIÓN DE PACIENTE SELECCIONADO
    if (!idPaciente) {
        console.warn("No se detectó ID de paciente");
        alert("⚠️ No has seleccionado ningún paciente para abrir consulta.\n\nSerás redirigido a la lista de pacientes.");
        window.location.href = 'lista-pacientes.html';
        return;
    }

    const idLimpio = idPaciente.trim();
    const idClinica = localStorage.getItem('clinica_activa_id') || localStorage.getItem('id_clinica_activa');

    // 4. CÓDIGO CORREGIDO PARA JALAR PACIENTE MAESTRO (Sin filtro erróneo de id_clinica)
    const { data: pacienteData, error: errorPaciente } = await fisioNet
        .from('pacientes_maestros')
        .select('*')
        .eq('id', idLimpio)
        .single();

    if (errorPaciente || !pacienteData) {
        console.error("Error de Supabase al consultar paciente maestro:", errorPaciente?.message);
        alert("⚠️ No se encontró la información del paciente.");
        return;
    }

    const p = pacienteData; 
    if (document.getElementById('nombre')) {
        document.getElementById('nombre').innerText = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.toUpperCase();
    }

    // EDAD INTELIGENTE
    let edadTexto = "EDAD NO REGISTRADA";
    if (p.fecha_nacimiento) {
        const hoy = new Date();
        const cumple = new Date(p.fecha_nacimiento + "T00:00:00"); 
        let años = hoy.getFullYear() - cumple.getFullYear();
        let meses = hoy.getMonth() - cumple.getMonth();
        let dias = hoy.getDate() - cumple.getDate();
        if (dias < 0) { meses--; dias += new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate(); }
        if (meses < 0) { años--; meses += 12; }

        if (años >= 2) edadTexto = `${años} AÑOS`;
        else if (años === 1) edadTexto = meses > 0 ? `1 AÑO, ${meses} MESES` : `1 AÑO`;
        else edadTexto = meses > 0 ? (dias > 0 ? `${meses} MESES, ${dias} DÍAS` : `${meses} MESES`) : `${dias} DÍAS`;
    }

    // INYECCIÓN EN LA FILA SUPERIOR UNIFICADA
    const contenedorFiliacion = document.getElementById('datosFiliacionLinea');
    if (contenedorFiliacion) {
        const genero = (p.genero || 'N/D').toUpperCase();
        const curp = p.curp ? `CURP: ${p.curp.toUpperCase()}` : 'SIN CURP';
        
        contenedorFiliacion.innerHTML = `
            <span>${genero}</span> 
            <span style="color: #cbd5e1;">•</span> 
            <span>${edadTexto}</span> 
            <span style="color: #cbd5e1;">•</span> 
            <span style="font-family: monospace; color: #64748b;">${curp}</span>
        `;
    }

    // 📂 5. BUSCAR EXPEDIENTE MÉRITAMENTE DESDE "expedientes_clinicos"
    try {
        const { data: dataExp, error: errorExp } = await fisioNet
            .from('expedientes_clinicos')
            .select('folio_personalizado, numero_consecutivo')
            .eq('id_paciente', idLimpio)
            .eq('id_clinica', idClinica)
            .maybeSingle();

        const elExp = document.getElementById('num-expediente');
        if (elExp) {
            if (!errorExp && dataExp) {
                elExp.innerText = `EXP: ${dataExp.folio_personalizado || dataExp.numero_consecutivo}`;
            } else {
                elExp.innerText = `EXP: SIN FOLIO`;
            }
        }
    } catch (e) {
        console.error("Error al recuperar número de expediente:", e);
    }
    
    // Rellenado de Alertas Fijas
    if(document.getElementById('banderaFija')) document.getElementById('banderaFija').innerText = p.alertas_seguridad || "NINGUNA";
    if(document.getElementById('alergiaFija')) document.getElementById('alergiaFija').innerText = p.alergias || "NINGUNA";
    if(document.getElementById('cronicoFijo')) document.getElementById('cronicoFijo').innerText = p.antecedentes_patologicos || "NINGUNO";
    if(document.getElementById('medicinaFija')) document.getElementById('medicinaFija').innerText = p.farmacologia_activa || "NADA";
    
    const llenar = (id, val) => { 
        const el = document.getElementById(id);
        if (el) { el.value = val || ''; if (el.readOnly) el.style.backgroundColor = "#f8fafc"; }
    };

    llenar('tipo_sangre', p.tipo_sangre);
    llenar('lateralidad', p.lateralidad);
    llenar('alergias', p.alergias);
    llenar('ocupacion', p.ocupacion);
    llenar('quirurgicos', p.antecedentes_quirurgicos);
    llenar('cronicos', p.antecedentes_patologicos);
    llenar('medicamentos', p.farmacologia_activa);
    llenar('inputBanderas', p.alertas_seguridad);
    
    // 🔄 5. CORRECCIÓN DOBLE CLIC: CONSULTA ÚNICA DE HISTORIAL CLINICO
   try {
        const { data: notasAnteriores, error: errorNotas } = await fisioNet
            .from('historial_clinico')
            .select('id_paciente, sintomas, exploracion_fisica, nota_evolucion, plan_tratamiento')
            .eq('id_paciente', idLimpio)
            .order('fecha_nota', { ascending: false });

        if (errorNotas) throw errorNotas;

        if (notasAnteriores && notasAnteriores.length > 0) {
            FisioCidEngine.ultimaNotaCargada = notasAnteriores[0];

            // 🚀 AUTOMATIZACIÓN: Pre-rellenar somatometría y diagnóstico de la última visita
            prerellenarConUltimaNotaGuardada();

            // 🎯 CASO PACIENTE EXISTENTE: Sí tiene historial, abrimos el selector interactivo
            if (typeof modalEngine !== 'undefined' && modalEngine.mostrarSelectorTipoConsulta) {
                modalEngine.mostrarSelectorTipoConsulta();
            }
        
        } else {
            // 🆕 CASO PACIENTE NUEVO ABSOLUTO (Cero "Show")
            //console.log("🆕 [BÚNKER CLÍNICO]: Cero notas previas en DB. Saltando directo a Valoración Inicial.");
            
            // Ocultamos el modal o contenedor del flujo si es que se pinta por defecto en el HTML
            const modalFlujo = document.getElementById('modalFlujoConsulta') || document.getElementById('contenedorFlujoConsulta');
            if (modalFlujo) modalFlujo.style.display = 'none';

            // 🔓 Disparamos directamente tu función nativa para crear nota de primera vez
            // Nota: Cambia 'PRIMERA_VEZ' por el argumento exacto que use tu sistema (ej: 'VALORACION_INICIAL' o 1)
            if (typeof abrirFormularioNuevaNota === 'function') {
                abrirFormularioNuevaNota('PRIMERA_VEZ');
            } else if (typeof modalEngine !== 'undefined' && modalEngine.abrirNotaPrimeraVez) {
                modalEngine.abrirNotaPrimeraVez();
            }
        }

    } catch (e) {
        console.error("💥 Error crítico al verificar historial clínico en la carga:", e);
    }

    // 6. GALERÍA DE GABINETE
    if (idLimpio && typeof modalEngine !== 'undefined' && modalEngine.cargarEstudiosAnteriores) {
        //console.log("📸 Sincronizando galería de gabinete para:", idLimpio);
        modalEngine.cargarEstudiosAnteriores(idLimpio);
    }
    detectarEstudiosPendientesEnNota(idLimpio);
    adaptarInterfazPorEspecialidad();
    verificarNotificacionesEstudios(idLimpio);

};
    // ============================================================================
// 🎨 ADAPTADOR CAMALEÓNICO POR ESPECIALIDAD
// ============================================================================
function adaptarInterfazPorEspecialidad() {
    const especialidad = (localStorage.getItem('especialidadUsuario') || 'GENERAL').toUpperCase().trim();
    //console.log("🎨 Aplicando modo visual para especialidad:", especialidad);

    const esFisio = especialidad.includes('FISIO') || especialidad.includes('REHABILITA');
    const esDental = especialidad.includes('DENT') || especialidad.includes('ODONTO');
    const esMedicina = !esFisio && !esDental;

    // 1. Campo Odontológico
    const contDental = document.getElementById('contenedor-hallazgos-dentales');
    if (contDental) {
        contDental.style.display = esDental ? 'block' : 'none';
    }

    // 2. Etiqueta del Diagnóstico Secundario / Funcional
    const lblDiag = document.getElementById('lbl-diagnostico-funcional');
    if (lblDiag) {
        if (esFisio) {
            lblDiag.innerText = "📝 IMPRESIÓN DIAGNÓSTICA / DIAGNÓSTICO FUNCIONAL";
        } else if (esDental) {
            lblDiag.innerText = "📝 DIAGNÓSTICO BUCAL / DIAGNÓSTICO PRESUNTIVO";
        } else {
            lblDiag.innerText = "📝 IMPRESIÓN DIAGNÓSTICA / JUICIO CLÍNICO";
        }
    }

    // 3. Ajuste del Slider EVA (Dolor)
    const contenedorEva = document.getElementById('eva_slider')?.parentNode;
    if (contenedorEva && esDental) {
        // En odontología o medicina general de rutina, si no se requiere el EVA, se mantiene discreto
        contenedorEva.style.opacity = "0.9";
    }


   // 4. Cambiar texto del botón Asistente y asegurar que esté activo
const btnAsistente = document.getElementById('btn-asistente-exploracion');
if (btnAsistente) {
    btnAsistente.disabled = false;
    btnAsistente.style.opacity = "1";
    btnAsistente.style.cursor = "pointer";
    btnAsistente.innerText = esDental 
        ? "🛠️ ASISTENTE ODONTOLÓGICO" 
        : (esFisio ? "🛠️ ASISTENTE DE VALORACIÓN" : "🛠️ ASISTENTE CLÍNICO");
}
}



window.calcularIMC = () => {
    const peso = parseFloat(document.getElementById('valPeso').value);
    const talla = parseFloat(document.getElementById('valTalla').value);
    const inputIMC = document.getElementById('valIMC');

    if (peso > 0 && talla > 0) {
        const imc = (peso / (talla * talla)).toFixed(2);
        inputIMC.value = imc;
        if (imc < 18.5) inputIMC.style.color = '#3b82f6';
        else if (imc >= 18.5 && imc < 24.9) inputIMC.style.color = '#10b981'; 
        else if (imc >= 25 && imc < 29.9) inputIMC.style.color = '#f59e0b'; 
        else inputIMC.style.color = '#ef4444'; 
    } else {
        inputIMC.value = '';
    }
};



// ============================================================================
// 3. GUARDAR HISTORIA Y GENERAR PDF
// ============================================================================

const formHistoria = document.getElementById('formHistoria');
let alertaActual = ""; 

if (formHistoria) {
    formHistoria.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnGuardar');
        if (btn) { btn.innerText = "PROCESANDO..."; btn.disabled = true; }

        try {
            const { data: { user } } = await fisioNet.auth.getUser();
            if (!user) throw new Error("Sesión expirada. Por favor vuelve a ingresar.");

            // 🛡️ 1. AUTO-RECUPERACIÓN DE SEDE
            let idClinica = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');
            if (!idClinica) {
                const { data: colab } = await fisioNet
                    .from('colaboradores_clinica')
                    .select('id_clinica')
                    .eq('id_profesional', user.id)
                    .eq('estado', 'ACTIVO')
                    .limit(1)
                    .maybeSingle();
                
                idClinica = colab?.id_clinica;
                if (idClinica) {
                    localStorage.setItem('id_clinica_activa', idClinica);
                    localStorage.setItem('clinica_activa_id', idClinica);
                }
            }

            // 🛡️ 2. AUTO-RECUPERACIÓN DE ESPECIALIDAD
            let specialty = localStorage.getItem('especialidadUsuario');
            if (!specialty) {
                const { data: perfilDoc } = await fisioNet
                    .from('perfiles_profesionales')
                    .select('especialidad')
                    .eq('id', user.id)
                    .maybeSingle();

                specialty = perfilDoc?.especialidad || 'FISIOTERAPIA GENERAL';
                localStorage.setItem('especialidadUsuario', specialty);
            }

            if (!idClinica) {
                throw new Error("No se detectó una sede vinculada activa para tu usuario.");
            }

            // 3. ACTUALIZAR PACIENTE MAESTRO
            await fisioNet.from('pacientes_maestros').update({
                alergias: document.getElementById('alergias')?.value || '',
                antecedentes_quirurgicos: document.getElementById('quirurgicos')?.value || '',
                antecedentes_patologicos: document.getElementById('cronicos')?.value || '',
                farmacologia_activa: document.getElementById('medicamentos')?.value || '',
                ocupacion: document.getElementById('ocupacion')?.value || ''
            }).eq('id', idPaciente);

            // 4. CREAR NUEVA NOTA CLÍNICA
            const nuevaNota = {
                id_paciente: idPaciente,
                id_profesional: user.id,
                id_clinica: idClinica,               
                especialidad_nota: specialty,     
                alertas_detectadas: alertaActual,    
                motivo_consulta: document.getElementById('motivo')?.value || '',
                evolucion: document.getElementById('evolucion')?.value || '',
                sintomas: document.getElementById('sintomas')?.value || '',
                nota_evolucion: document.getElementById('plan')?.value || '',
                plan_tratamiento: document.getElementById('plan_tratamiento')?.value || '',
                exploracion_fisica: document.getElementById('exploracion')?.value || '',
                diagnostico_principal: document.getElementById('diagnostico_principal')?.value.toUpperCase() || '',
                codigo_cie10: document.getElementById('codigo_cie_final')?.value || '',
              eva: parseInt(document.getElementById('eva_slider')?.value) || 0,
                ta_sistolica: parseInt(document.getElementById('valSistolica')?.value) || 0,
                ta_diastolica: parseInt(document.getElementById('valDiastolica')?.value) || 0,
                frecuencia_cardiaca: parseInt(document.getElementById('valFC')?.value) || 0,
                frecuencia_respiratoria: parseInt(document.getElementById('valFR')?.value) || 0,
                temperatura: parseFloat(document.getElementById('valTemp')?.value) || 0,
                spo2: parseInt(document.getElementById('valSpO2')?.value) || 0,
                peso: parseFloat(document.getElementById('valPeso')?.value) || null,
                talla: parseFloat(document.getElementById('valTalla')?.value) || null,
                imc: parseFloat(document.getElementById('valIMC')?.value) || null,
                diagnostico_funcional: document.getElementById('diagnostico_funcional')?.value || '',
                pronostico: `${document.getElementById('pronostico_select')?.value || ''}\n${document.getElementById('pronostico_detalle')?.value || ''}`,
                fecha_nota: new Date().toISOString()
            };

            const { error: errHistorial } = await fisioNet.from('historial_clinico').insert([nuevaNota]);
            if (errHistorial) throw errHistorial;

            // 🚀 4.1. SI VENÍA VINCULADA A UNA RECETA PENDIENTE, LA MARCAMOS COMO COMPLETADA
            if (window.recetaPendienteVinculadaId) {
                const { error: errReceta } = await fisioNet
                    .from('recetas_medicas')
                    .update({ estado_nota: 'COMPLETADO' })
                    .eq('id', window.recetaPendienteVinculadaId);
                
                if (errReceta) {
                    console.warn("⚠️ No se pudo actualizar el estatus de la receta:", errReceta.message);
                } else {
                    console.log("✅ Receta vinculada actualizada a estatus COMPLETADO.");
                }
            }

         // 5. 🔒 LIMPIAR PERMISO OTP DE SESIÓN
const idPacienteLimpio = idPaciente || window.pacienteCargado?.id;
if (idPacienteLimpio) {
    sessionStorage.removeItem(`otp_aprobado_paciente_${idPacienteLimpio}`);
    sessionStorage.removeItem(`otp_id_paciente_${idPacienteLimpio}`);
}

            // 6. IMPRESIÓN Y GENERACIÓN DE PDF MEDIANTE MOTOR JSPDF
            const deseaImprimir = confirm("✅ ¡Consulta guardada con éxito!\n\n¿Deseas generar la receta/reporte en PDF?");
            if (deseaImprimir) {
                if (typeof window.generarPDF === 'function') {
                    await window.generarPDF(nuevaNota);
                } else {
                    alert("⚠️ El módulo de PDF (pdf-generator.js) no se encuentra cargado.");
                }
            }

            // Redirigir a la lista de pacientes (AHORA SÍ DESPUÉS DE QUE TODO SE GUARDÓ)
            window.location.href = 'lista-pacientes.html';

        } catch (error) {
            console.error("Error al guardar la nota:", error);
            alert("Error al guardar la consulta: " + error.message);
            if (btn) { btn.innerText = "REINTENTAR"; btn.disabled = false; }
        }
    });
}

// ============================================================================
// 4. BUSCADOR CIE-10 (CON APOYO INTELIGENTE)
// ============================================================================
let timeoutBusqueda = null;
const inputBusqueda = document.getElementById('buscador_diagnostico');
const divResultados = document.getElementById('resultados_busqueda');
const banderasRojas = ["FRACTURA", "TUMOR", "NEOPLASIA", "CAUDA EQUINA", "MENINGITIS", "INFARTO", "LUXACIÓN"];

if (inputBusqueda) {
    inputBusqueda.addEventListener('input', (e) => {
        const valor = e.target.value.trim().toUpperCase();
        clearTimeout(timeoutBusqueda);
        if (valor.length < 3) { if(divResultados) divResultados.style.display = 'none'; return; }

        timeoutBusqueda = setTimeout(async () => {
            const { data: sugerencias } = await fisioNet.from('catalogo_diagnosticos')
                .select('clave, descripcion').ilike('descripcion', `%${valor}%`).limit(10);
            
            if (sugerencias?.length > 0 && divResultados) {
                divResultados.innerHTML = sugerencias.map(i => `
                    <div style="padding:10px; border-bottom:1px solid #eee; cursor:pointer;" onclick="seleccionarCIE('${i.clave}', '${i.descripcion}')">
                        <strong>${i.clave}</strong> - ${i.descripcion}
                    </div>`).join('');
                divResultados.style.display = 'block';
            }
        }, 300);
    });
}

window.seleccionarCIE = (codigo, texto) => {
    const textoMayus = texto.toUpperCase();
    document.getElementById('diagnostico_principal').value = textoMayus;
    document.getElementById('codigo_cie_final').value = codigo;
    if(divResultados) divResultados.style.display = 'none';
    
    alertaActual = "";
    const esPeligroso = banderasRojas.some(b => textoMayus.includes(b));
    let divAlerta = document.getElementById('alertaInteligente');
    if (!divAlerta) {
        divAlerta = document.createElement('div');
        divAlerta.id = 'alertaInteligente';
        document.getElementById('diagnostico_principal').parentNode.appendChild(divAlerta);
    }
    if (esPeligroso) {
        alertaActual = "ALERTA MÉDICA AUTOMÁTICA";
        divAlerta.innerHTML = `<div style="background: #fef2f2; border: 1px solid #ef4444; color: #b91c1c; padding: 10px; border-radius: 8px; margin-top: 10px; font-weight: bold; font-size: 0.85rem;">⚠️ BANDERA ROJA DETECTADA: Interconsulta sugerida.</div>`;
    } else {
        divAlerta.innerHTML = ""; 
    }
};


const btnClonar = document.getElementById('btnClonar');
if (btnClonar) {
    btnClonar.onclick = async () => {
        btnClonar.innerText = "BUSCANDO...";
        try {
            const { data: notas, error } = await fisioNet.from('historial_clinico')
                .select('*').eq('id_paciente', idPaciente).order('fecha_nota', { ascending: false }).limit(1);

            if (error) throw error;
            if (notas && notas.length > 0) {
                const u = notas[0];
                const llenarSiExiste = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
                llenarSiExiste('motivo', u.motivo_consulta);
                llenarSiExiste('sintomas', u.sintomas);
                llenarSiExiste('exploracion', u.exploracion_fisica);
                llenarSiExiste('plan_tratamiento', u.plan_tratamiento);
                llenarSiExiste('diagnostico_principal', u.diagnostico_principal);
                 llenarSiExiste('diagnostico_funcional', u.diagnostico_funcional);
                llenarSiExiste('codigo_cie_final', u.codigo_cie10);
                llenarSiExiste('plan', u.nota_evolucion);
            
                btnClonar.innerHTML = '<i class="fas fa-check"></i> ¡CLONADO!';
            } else {
                alert("No hay notas previas.");
            }
        } catch (err) { alert("Error al clonar."); }
        finally { setTimeout(() => { if(btnClonar) btnClonar.innerHTML = '<i class="fas fa-copy"></i> CLONAR ÚLTIMA NOTA'; }, 2000); }
    };
}



const configUsuario = {
    tieneEcografo: true 
};

function aplicarRestoDeLaNota(p, neuroTexto) {
    const cuadroEvolucion = document.getElementById('evolucion');
    const cuadroExploracion = document.getElementById('exploracion');

    let oracionNeuro = "";
    if (neuroTexto && neuroTexto.includes("/")) {
        const partes = neuroTexto.replace('📌 ', '').split('/');
        const derma = partes[0].trim();
        const mio = partes[1].trim();

        if (derma || mio) {
            oracionNeuro = "EXPLORACIÓN NEUROLÓGICA:\n";
            if (derma) oracionNeuro += `• Muestra alteración de la sensibilidad en dermatomas: ${derma}.\n`;
            if (mio) oracionNeuro += `• Presenta disminución de fuerza en miotomas: ${mio}.\n`;
        }
    }

    if (cuadroEvolucion) {
        cuadroEvolucion.value += (cuadroEvolucion.value ? "\n\n" : "") + 
        `--- RELATO CRONOLÓGICO ---\nEl paciente refiere que los síntomas iniciaron hace: `;
        cuadroEvolucion.focus();
    }

    if (cuadroExploracion) {
        const seccionEco = configUsuario.tieneEcografo 
            ? `\nECOGRAFÍA (Sonocel): ${p.eco || 'Exploración regional.'}` 
            : "";

        const infoFinal = `--- EXAMEN FÍSICO ---
PRUEBAS: ${p.id === 'lumbar' ? 'Lasègue, Slump' : 'Valoración regional'}

${oracionNeuro}${seccionEco}
HALLAZGOS ADICIONALES: `;

        cuadroExploracion.value += (cuadroExploracion.value ? "\n\n" : "") + infoFinal;
        cuadroExploracion.style.backgroundColor = "#f0fdf4";
        setTimeout(() => cuadroExploracion.style.backgroundColor = "white", 800);
    }
}


function inicializarEscuchaMotivo() {
    const motivoInput = document.getElementById('motivo');
    if (!motivoInput || typeof DiccionarioSintomas === 'undefined') return;

    const procesarInput = (texto) => {
        const textoInput = texto.toUpperCase();
        let huboCambios = false;
        
        Object.keys(DiccionarioSintomas).forEach(categoria => {
            const subDiccionario = DiccionarioSintomas[categoria];
            Object.keys(subDiccionario).forEach(llave => {
                if (textoInput.includes(llave)) {
                    const nombreSintoma = subDiccionario[llave];
                    const yaEsta = FisioCidEngine.datosTemporales.includes(nombreSintoma);

                    if (!yaEsta) {
                        FisioCidEngine.datosTemporales.push(nombreSintoma);
                        huboCambios = true;
                    }
                }
            });
        });

        if (window.BIBLIOTECA_PROTOCOLOS) {
            const textoMin = texto.toLowerCase();
            let protocoloMatch = null;

            Object.keys(window.BIBLIOTECA_PROTOCOLOS).forEach(rama => {
                const match = window.BIBLIOTECA_PROTOCOLOS[rama].find(p => 
                    p.triggers.some(t => textoMin.includes(t))
                );
                if (match) protocoloMatch = match;
            });

            if (protocoloMatch) {
                //console.log("💡 Sugiriendo protocolo:", protocoloMatch.titulo);
            }
        }

        if (huboCambios) {
            const cajaDiag = document.getElementById('caja-diagnostico');
            if (cajaDiag) {
                cajaDiag.innerHTML = FisioCidEngine.analizarPatrones(FisioCidEngine.datosTemporales);
            }
        }
    };

    motivoInput.addEventListener('input', (e) => procesarInput(e.target.value));
}




// ============================================================================
// 🕵️ MOTOR OTP CON MEMORIA DE SESIÓN (SESIÓN AUTORIZADA)
// ============================================================================

let solicitudOTPActivaId = null;

// Función para comprobar si la sesión actual del paciente ya fue autorizada
function sesionEstaAutorizada(pacienteId) {
    const claveSesion = `otp_aprobado_paciente_${pacienteId}`;
    return sessionStorage.getItem(claveSesion) === 'true';
}

// A) BOTÓN SOLICITAR / VER HISTORIA (INTELIGENTE)
document.getElementById('btnSolicitarHistoria')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const idPacienteLimpio = idPaciente || window.pacienteCargado?.id;
    const idClinicaActiva = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');

    if (!idPacienteLimpio) {
        alert("⚠️ Por favor selecciona un paciente válido.");
        return;
    }

    // 🔓 SI YA FUE AUTORIZADO EN ESTA SESIÓN, ABRIR VISOR DIRECTAMENTE
    if (sesionEstaAutorizada(idPacienteLimpio)) {
        //console.log("🔓 [SESIÓN REUTILIZADA]: Paciente ya autorizado previamente. Abriendo visor sin OTP...");
        await cargarYMostrarVisorExpediente(idPacienteLimpio);
        return;
    }

    // 🔒 SI NO HA SIDO AUTORIZADO, GENERAR OTP Y MOSTRAR MODAL
    const btnSolicitar = document.getElementById('btnSolicitarHistoria');

    try {
        btnSolicitar.disabled = true;
        btnSolicitar.innerText = "⌛ TRANSMITIENDO...";

        const { data: { user } } = await fisioNet.auth.getUser();
        const nombreDoc = document.getElementById('doc-nombre')?.innerText?.trim() || "DR. CRISTIAN MIGUEL CID ESPÍNDOLA";
        const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();
        const expiraEn = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        //console.log("🔑 Generando nuevo OTP ->", codigoOTP);

        const { data, error } = await fisioNet
            .from('solicitudes_acceso_otp')
            .insert([{
                id_paciente: idPacienteLimpio,
                id_profesional: user ? user.id : null,
                nombre_profesional: nombreDoc,
                codigo_otp: codigoOTP,
                estado_solicitud: 'PENDIENTE',
                permisos_concedidos: { notas: true, estudios: true, laboratorio: true },
                id_clinica: idClinicaActiva || null,
                expira_en: expiraEn
            }])
            .select();

        if (error) throw error;

        solicitudOTPActivaId = data[0].id;

        const campoInput = document.getElementById('otp-seguridad');
        if (campoInput) campoInput.value = "";

        const modalEl = document.getElementById('modalSolicitudAcceso');
        if (modalEl) {
            const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
            modalInstance.show();
        }

    } catch (err) {
        console.error("💥 Error al solicitar acceso:", err.message);
        alert("Error al solicitar acceso: " + err.message);
    } finally {
        btnSolicitar.disabled = false;
        btnSolicitar.innerHTML = '📝🔍 SOLICITAR HISTORIA';
    }
});


// B) VALIDAR Y REGISTRAR AUTORIZACIÓN EN SESIÓN
document.addEventListener('click', async (e) => {
    const btnVal = e.target.closest('#btnValidarAcceso');
    if (!btnVal) return;

    e.preventDefault();
    const otpIngresado = document.getElementById('otp-seguridad')?.value?.trim();

    if (!otpIngresado || otpIngresado.length < 6) {
        alert("⚠️ Ingresa el código completo de 6 dígitos.");
        return;
    }

    if (!solicitudOTPActivaId) {
        alert("⚠️ No hay una solicitud activa pendiente.");
        return;
    }

    btnVal.disabled = true;
    btnVal.innerText = "VERIFICANDO...";

    try {
        const { data: solicitud, error: errSelect } = await fisioNet
            .from('solicitudes_acceso_otp')
            .select('*')
            .eq('id', solicitudOTPActivaId)
            .single();

        if (errSelect) throw errSelect;

        if (solicitud.codigo_otp === otpIngresado) {
            const idPacienteLimpio = idPaciente || window.pacienteCargado?.id;

            // 1. Marcar estado APROBADO en DB
            await fisioNet
                .from('solicitudes_acceso_otp')
                .update({ 
                    estado_solicitud: 'APROBADO', 
                    fecha_autorizacion: new Date().toISOString() 
                })
                .eq('id', solicitudOTPActivaId);

            // 2. 🔑 GUARDAR PERMISO DE SESIÓN LOCAL (Dura mientras el navegador/pestaña siga abierta)
            if (idPacienteLimpio) {
                sessionStorage.setItem(`otp_aprobado_paciente_${idPacienteLimpio}`, 'true');
            }

            // 3. Cambiar visualmente el botón a estado "Desbloqueado"
            const btnSolicitar = document.getElementById('btnSolicitarHistoria');
            if (btnSolicitar) {
                btnSolicitar.style.background = "#dcfce7";
                btnSolicitar.style.color = "#15803d";
                btnSolicitar.style.borderColor = "#86efac";
                btnSolicitar.innerHTML = "🔓 VER HISTORIAL AUTORIZADO";
            }

            // 4. Cerrar modal de clave OTP
            const modalSolicitudEl = document.getElementById('modalSolicitudAcceso');
            if (modalSolicitudEl) {
                const modalSolInstance = bootstrap.Modal.getInstance(modalSolicitudEl) || bootstrap.Modal.getOrCreateInstance(modalSolicitudEl);
                modalSolInstance.hide();
            }

            // 5. Desbloquear botón de Asistente
          //  const btnAsistente = document.getElementById('btn-asistente-exploracion');
          //  if (btnAsistente) {
           //     btnAsistente.disabled = false;
           //     btnAsistente.style.opacity = "1";
           //     btnAsistente.style.cursor = "pointer";
           // }

            // 6. Desplegar el Visor
            await cargarYMostrarVisorExpediente(idPacienteLimpio);

        } else {
            alert("❌ Código incorrecto. Verifique los 6 dígitos.");
        }

    } catch (err) {
        console.error("💥 Error de validación:", err.message || err);
        alert("Error al verificar la clave: " + (err.message || "Error de conexión"));
    } finally {
        btnVal.disabled = false;
        btnVal.innerText = "VALIDAR Y VER HISTORIAL";
    }
});


// ============================================================================
// 📑 CARGAR Y MOSTRAR CONTENIDO DEL EXPEDIENTE DENTRO DEL MODAL (VERSIÓN PREMIUM)
// ============================================================================
async function cargarYMostrarVisorExpediente(pacienteId) {
    const contenedorNotas = document.getElementById('listaNotasHistorial');
    const contenedorImagen = document.getElementById('listaEstudiosImagen');
    const contenedorLab = document.getElementById('listaEstudiosLab');

    const loaderHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary mb-2" role="status" style="width: 2.5rem; height: 2.5rem;"></div>
            <p class="text-muted fw-bold small mb-0">Cargando expediente con desencriptación segura...</p>
        </div>
    `;

    if (contenedorNotas) contenedorNotas.innerHTML = loaderHTML;
    if (contenedorImagen) contenedorImagen.innerHTML = loaderHTML;
    if (contenedorLab) contenedorLab.innerHTML = loaderHTML;

    // 1. Mostrar modal inmediatamente
    const modalVisorEl = document.getElementById('modalVisorExpediente');
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalVisorEl);
    modalInstance.show();

    try {
        // A) CONSULTAR HISTORIAL CLÍNICO (NOTAS DE EVOLUCIÓN)
        const { data: notas, error: errNotas } = await fisioNet
            .from('historial_clinico')
            .select('*')
            .eq('id_paciente', pacienteId)
            .order('fecha_nota', { ascending: false });

        if (errNotas) throw errNotas;

        if (contenedorNotas) {
            if (notas && notas.length > 0) {
                contenedorNotas.innerHTML = notas.map(n => {
                    const fechaFmt = new Date(n.fecha_nota).toLocaleDateString('es-MX', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    });

                    return `
                        <div class="card border-0 shadow-sm p-3 mb-1" style="border-left: 5px solid #3b82f6 !important; border-radius: 12px; background: white;">
                            <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                                <span class="badge bg-slate-800 text-info font-monospace px-2 py-1" style="background-color: #0f172a; font-size: 0.72rem;">
                                    📅 ${fechaFmt}
                                </span>
                                <span class="fw-bold text-primary small">
                                    🩺 ${n.diagnostico_principal || 'SIN DIAGNÓSTICO'} <span class="text-secondary font-monospace">(${n.codigo_cie10 || 'N/A'})</span>
                                </span>
                            </div>
                            
                            <div class="bg-light p-2.5 rounded-3 mb-2" style="font-size: 0.85rem; line-height: 1.4;">
                                <p class="mb-1"><strong>Motivo:</strong> ${n.motivo_consulta || 'Sin registro'}</p>
                                <p class="mb-1"><strong>Exploración:</strong> ${n.exploracion_fisica || 'Sin registro'}</p>
                                <p class="mb-0"><strong>Tratamiento:</strong> ${n.plan_tratamiento || 'Sin registro'}</p>
                            </div>

                            <div class="d-flex justify-content-end">
                                <button type="button" class="btn btn-sm btn-outline-primary fw-bold rounded-pill px-3" 
                                        onclick="inyectardatoEnConsulta('exploracion', 'HISTORIAL PREVIO (${fechaFmt}): ${n.exploracion_fisica || ''}')">
                                    ➕ Inyectar Exploración a Consulta
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                contenedorNotas.innerHTML = `
                    <div class="text-center py-5 bg-white rounded-3 shadow-sm border border-dashed">
                        <i class="fas fa-file-medical-alt fa-3x text-muted opacity-50 mb-3"></i>
                        <h6 class="fw-bold text-secondary">Sin notas de evolución registradas</h6>
                        <small class="text-muted">Las futuras consultas guardadas por los especialistas aparecerán aquí.</small>
                    </div>
                `;
            }
        }

        // B) CONSULTAR ESTUDIOS DE GABINETE (IMAGEN Y LABS)
        const { data: estudios, error: errEstudios } = await fisioNet
            .from('estudios_gabinete')
            .select('*')
            .eq('paciente_id', pacienteId)
            .order('fecha_registro', { ascending: false });

        if (errEstudios) throw errEstudios;

        if (estudios && estudios.length > 0) {
            // Generar URLs firmadas frescas si las imágenes usan rutas privadas
            const estudiosFirmados = await Promise.all(estudios.map(async (est) => {
                let urlFinal = est.archivo_url || '';
                if (est.ruta_storage && !est.ruta_storage.startsWith('http')) {
                    const { data: signed } = await fisioNet.storage
                        .from('expedientes-multimedia')
                        .createSignedUrl(est.ruta_storage, 3600);
                    if (signed?.signedUrl) urlFinal = signed.signedUrl;
                }
                return { ...est, url_firmada: urlFinal };
            }));

            const imagenes = estudiosFirmados.filter(e => e.tipo_estudio !== 'LABORATORIO CLÍNICO');
            const laboratorios = estudiosFirmados.filter(e => e.tipo_estudio === 'LABORATORIO CLÍNICO');

            // --- RENDER IMAGENOLOGÍA ---
            if (contenedorImagen) {
                if (imagenes.length > 0) {
                    contenedorImagen.innerHTML = imagenes.map(img => {
                        const fechaFmt = new Date(img.fecha_registro).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
                        const jsonPayload = JSON.stringify(img).replace(/'/g, "&apos;");

                        return `
                            <div class="col-md-6">
                              <div class="card h-100 border-0 shadow-sm p-3" style="border-top: 4px solid #3b82f6 !important; border-radius: 12px; background: white;">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <h6 class="fw-bold text-primary mb-0" style="font-size: 0.9rem;">🩻 ${img.tipo_estudio || 'ESTUDIO DE IMAGEN'}</h6>
                                        <span class="badge bg-light text-dark border small">${fechaFmt}</span>
                                    </div>

                                    <p class="small text-secondary fw-semibold mb-3" style="min-height: 40px;">
                                        ${img.hallazgos_resumen || img.descripcion || 'Sin interpretación previa disponible.'}
                                    </p>

                                    <div class="d-flex flex-column gap-2 mt-auto">
                                        ${img.url_firmada ? `
                                            <a href="${img.url_firmada}" target="_blank" class="btn btn-sm btn-info text-white fw-bold rounded-pill w-100">
                                                🔗 Ver Archivo / Placa / PACS
                                            </a>
                                        ` : ''}

                                        <button type="button" class="btn btn-sm btn-outline-dark fw-bold rounded-pill w-100" 
                                                onclick="inyectardatoEnConsulta('exploracion', 'ESTUDIO (${img.tipo_estudio}): ${img.hallazgos_resumen || img.descripcion || ''}')">
                                            ➕ Copiar Hallazgos a Consulta
                                        </button>

                                        <button type="button" class="btn btn-sm btn-success text-white fw-bold rounded-pill w-100" 
                                                onclick='anexarEstudioAExpedienteClinica(${jsonPayload})'>
                                            📥 Anexar a Expediente de mi Clínica
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                } else {
                    contenedorImagen.innerHTML = `
                        <div class="col-12">
                            <div class="text-center py-5 bg-white rounded-3 shadow-sm border border-dashed">
                                <i class="fas fa-x-ray fa-3x text-muted opacity-50 mb-3"></i>
                                <h6 class="fw-bold text-secondary">Sin estudios de imagenología registrados</h6>
                            </div>
                        </div>
                    `;
                }
            }

            // --- RENDER LABORATORIOS ---
            if (contenedorLab) {
                if (laboratorios.length > 0) {
                    contenedorLab.innerHTML = laboratorios.map(lab => {
                        const fechaFmt = new Date(lab.fecha_registro).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
                        const jsonPayload = JSON.stringify(lab).replace(/'/g, "&apos;");

                        return `
                            <div class="col-md-6">
                                <div class="card h-100 border-0 shadow-sm p-3" style="border-top: 4px solid #ef4444 !important; border-radius: 12px; background: white;">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <h6 class="fw-bold text-danger mb-0" style="font-size: 0.9rem;">🧪 ${lab.tipo_estudio || 'ANÁLISIS DE LAB'}</h6>
                                        <span class="badge bg-light text-dark border small">${fechaFmt}</span>
                                    </div>

                                    <p class="small text-secondary mb-3" style="min-height: 40px;">
                                        ${lab.hallazgos_resumen || lab.descripcion || 'Sin reporte de resultados anexado.'}
                                    </p>

                                    <div class="d-flex flex-column gap-2 mt-auto">
                                        ${lab.url_firmada ? `
                                            <a href="${lab.url_firmada}" target="_blank" class="btn btn-sm btn-danger text-white fw-bold rounded-pill w-100">
                                                📄 Ver Resultados en PDF
                                            </a>
                                        ` : ''}

                                        <button type="button" class="btn btn-sm btn-outline-danger fw-bold rounded-pill w-100" 
                                                onclick="inyectardatoEnConsulta('sintomas', 'LABORATORIO (${fechaFmt}): ${lab.hallazgos_resumen || lab.descripcion || ''}')">
                                            ➕ Copiar a Síntomas / Acompañantes
                                        </button>

                                        <button type="button" class="btn btn-sm btn-success text-white fw-bold rounded-pill w-100" 
                                                onclick='anexarEstudioAExpedienteClinica(${jsonPayload})'>
                                            📥 Anexar a Expediente de mi Clínica
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                } else {
                    contenedorLab.innerHTML = `
                        <div class="col-12">
                            <div class="text-center py-5 bg-white rounded-3 shadow-sm border border-dashed">
                                <i class="fas fa-vial fa-3x text-muted opacity-50 mb-3"></i>
                                <h6 class="fw-bold text-secondary">Sin análisis de laboratorio registrados</h6>
                            </div>
                        </div>
                    `;
                }
            }

        } else {
            if (contenedorImagen) {
                contenedorImagen.innerHTML = `
                    <div class="col-12">
                        <div class="text-center py-5 bg-white rounded-3 shadow-sm border border-dashed">
                            <i class="fas fa-x-ray fa-3x text-muted opacity-50 mb-3"></i>
                            <h6 class="fw-bold text-secondary">Sin estudios de imagenología registrados</h6>
                        </div>
                    </div>
                `;
            }
            if (contenedorLab) {
                contenedorLab.innerHTML = `
                    <div class="col-12">
                        <div class="text-center py-5 bg-white rounded-3 shadow-sm border border-dashed">
                            <i class="fas fa-vials fa-3x text-muted opacity-50 mb-3"></i>
                            <h6 class="fw-bold text-secondary">Sin informes de laboratorio registrados</h6>
                        </div>
                    </div>
                `;
            }
        }

    } catch (e) {
        console.error("💥 Error crítico al recuperar el visor:", e);
        const errHTML = `<div class="alert alert-danger text-center font-monospace">Error al cargar datos: ${e.message || 'Error de conexión'}</div>`;
        if (contenedorNotas) contenedorNotas.innerHTML = errHTML;
        if (contenedorImagen) contenedorImagen.innerHTML = errHTML;
        if (contenedorLab) contenedorLab.innerHTML = errHTML;
    }
}

// 📌 FUNCIÓN AUXILIAR PARA INYECTAR TEXTO EN LOS CAMPOS DE LA HISTORIA CLÍNICA
window.inyectardatoEnConsulta = (targetInputId, texto) => {
    const el = document.getElementById(targetInputId);
    if (el) {
        el.value += (el.value ? "\n\n" : "") + texto;
        el.style.backgroundColor = "#e0f2fe";
        setTimeout(() => el.style.backgroundColor = "white", 1000);
        alert("✅ Información agregada a la consulta activa.");
    }
};

// ============================================================================
// 🔬 VINCULACIÓN DIRECTA DE ESTUDIOS A PACIENTE Y MÉDICO
// ============================================================================

function abrirModalVincularEstudio() {
    const modalEl = document.getElementById('modalVincularEstudioDirecto');
    if (modalEl) {
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
        modalInstance.show();
    }
}

document.getElementById('formVincularEstudio')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const idPacienteLimpio = idPaciente || window.pacienteCargado?.id;
    const idClinicaActiva = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');

    if (!idPacienteLimpio) {
        alert("⚠️ No hay un paciente activo seleccionado.");
        return;
    }

    const btn = document.getElementById('btnGuardarEstudio');
    btn.disabled = true;
    btn.innerText = "PROCESANDO VINCULACIÓN...";

    try {
        const { data: { user } } = await fisioNet.auth.getUser();

        const nuevoEstudio = {
            paciente_id: idPacienteLimpio,
            id_profesional: user ? user.id : null,
            id_clinica: idClinicaActiva || null,
            tipo_estudio: document.getElementById('estudio_tipo').value,
            hallazgos_resumen: document.getElementById('estudio_hallazgos').value.toUpperCase(),
            archivo_url: document.getElementById('estudio_url').value || null,
            fecha_registro: new Date().toISOString()
        };

        const { error } = await fisioNet.from('estudios_gabinete').insert([nuevoEstudio]);

        if (error) throw error;

        alert("✅ Estudio vinculado exitosamente al paciente y al expediente médico.");

        const modalEl = document.getElementById('modalVincularEstudioDirecto');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        document.getElementById('formVincularEstudio').reset();

    } catch (err) {
        console.error("💥 Error al vincular estudio:", err.message);
        alert("Error al vincular el estudio: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "💾 VINCULAR A PACIENTE Y MÉDICO";
    }
});

// ============================================================================
// 🚨 VERIFICACIÓN AUTOMÁTICA DE ESTUDIOS PREVIOS AL CARGAR PACIENTE
// ============================================================================
async function verificarEstudiosVinculadosEnCarga(pacienteId) {
    try {
        const { data: estudios, error } = await fisioNet
            .from('estudios_gabinete')
            .select('id, tipo_estudio, hallazgos_resumen, fecha_registro')
            .eq('paciente_id', pacienteId)
            .order('fecha_registro', { ascending: false });

        if (!error && estudios && estudios.length > 0) {
            const ultimo = estudios[0];
            const fecha = new Date(ultimo.fecha_registro).toLocaleDateString('es-MX');

            //console.log(`📸 El paciente cuenta con ${estudios.length} estudios cargados en gabinete.`);

            // Notificación visual rápida en la interfaz para el doctor
            const divNotif = document.createElement('div');
            divNotif.className = 'alert alert-warning border-0 shadow-sm d-flex justify-content-between align-items-center mb-3';
            divNotif.style.borderRadius = '12px';
            divNotif.innerHTML = `
                <div>
                    <strong>📂 ESTUDIO REGISTRADO (${fecha}):</strong> 
                    ${ultimo.tipo_estudio} <em>${ultimo.hallazgos_resumen.substring(0, 80)}...</em>
                </div>
                <button class="btn btn-sm btn-dark rounded-pill" onclick="if(modalEngine) modalEngine.cargarEstudiosAnteriores('${pacienteId}')">
                    🔍 VER GABINETE (${estudios.length})
                </button>
            `;

            const contenedorNotificaciones = document.getElementById('contenedor-apoyo-fisiocid');
            if (contenedorNotificaciones) {
                contenedorNotificaciones.appendChild(divNotif);
            }
        }
    } catch (e) {
        console.warn("Error al verificar estudios vinculados:", e);
    }
}

async function detectarEstudiosPendientesEnNota(pacienteId) {
    if (!pacienteId) return;

    try {
        const contenedorBanners = document.getElementById('contenedor-apoyo-fisiocid');
        if (!contenedorBanners) return;
        contenedorBanners.innerHTML = '';

        // 1. Consultar estudios de gabinete
        const { data: estudios } = await fisioNet
            .from('estudios_gabinete')
            .select('*')
            .eq('paciente_id', pacienteId)
            .order('fecha_registro', { ascending: false })
            .limit(3);

        // 2. Consultar evidencias subidas
        const { data: evidencias } = await fisioNet
            .from('paciente_evidencia_multimedia')
            .select('*')
            .eq('id_paciente', pacienteId)
            .in('categoria_especialidad', ['GABINETE', 'LABORATORIO', 'EVIDENCIA'])
            .order('fecha_registro', { ascending: false })
            .limit(3);

        // Combinar y ordenar por fecha más reciente
        const listaCombinada = [
            ...(estudios || []).map(e => ({
                tipo: e.tipo_estudio || 'Estudio de Gabinete',
                hallazgos: e.hallazgos_resumen || 'Sin interpretación previa.',
                fecha: e.fecha_registro,
                url: e.archivo_url
            })),
            ...(evidencias || []).map(ev => ({
                tipo: ev.categoria_especialidad || 'Evidencia Multimedia',
                hallazgos: ev.descripcion || 'Archivo adjunto disponible.',
                fecha: ev.fecha_registro,
                url: ev.url_imagen
            }))
        ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 3);

        if (listaCombinada.length > 0) {
            listaCombinada.forEach(est => {
                const fechaEstudio = new Date(est.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
                
                const cardAviso = document.createElement('div');
                cardAviso.className = 'card border-0 shadow-sm mb-3';
                cardAviso.style.background = 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)';
                cardAviso.style.borderLeft = '5px solid #3b82f6 !important';
                cardAviso.style.borderRadius = '12px';

                cardAviso.innerHTML = `
                    <div class="card-body p-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div>
                            <span class="badge bg-primary text-uppercase mb-1" style="font-size: 0.65rem;">
                                📂 ESTUDIO PENDIENTE POR REVISAR (${fechaEstudio})
                            </span>
                            <h6 class="fw-bold text-dark mb-1" style="font-size: 0.9rem;">
                                🩻 ${est.tipo}
                            </h6>
                            <p class="text-secondary small mb-0" style="font-size: 0.8rem;">
                                <strong>Hallazgos:</strong> ${est.hallazgos}
                            </p>
                        </div>
                        
                        <div class="d-flex gap-2 align-items-center ms-auto">
                            ${est.url ? `
                                <a href="${est.url}" target="_blank" class="btn btn-sm btn-outline-primary fw-bold" style="font-size: 0.75rem;">
                                    👁️ Ver Placa / PDF
                                </a>
                            ` : ''}
                            
                            <button type="button" class="btn btn-sm btn-primary fw-bold text-white shadow-sm" style="font-size: 0.75rem; border-radius: 8px;"
                                    onclick="inyectarEstudioAExploracion('${est.tipo}', '${est.hallazgos}', '${fechaEstudio}')">
                                ➕ Cargar a esta Consulta
                            </button>
                        </div>
                    </div>
                `;

                contenedorBanners.appendChild(cardAviso);
            });
        }
    } catch (err) {
        console.warn("⚠️ No se pudieron consultar los estudios pendientes:", err.message);
    }
}

// Función auxiliar para inyectar limpia y formateada la información en la nota
window.inyectarEstudioAExploracion = (tipo, hallazgos, fecha) => {
    const campoExploracion = document.getElementById('exploracion');
    if (campoExploracion) {
        const bloqueTexto = `\n--- ESTUDIO ANEXO DE GABINETE (${fecha}) ---\nTIPO: ${tipo.toUpperCase()}\nHALLAZGOS/REPORTE: ${hallazgos}\n`;
        
        campoExploracion.value += (campoExploracion.value ? "\n" : "") + bloqueTexto;
        
        // Animación visual de confirmación
        campoExploracion.style.backgroundColor = "#e0f2fe";
        campoExploracion.style.transition = "background-color 0.5s ease";
        setTimeout(() => {
            campoExploracion.style.backgroundColor = "white";
        }, 800);
    }
};

window.abrirModalEstudioExpress = async () => {
    const modal = document.getElementById('modalEstudioExpress');
    const inputLab = document.getElementById('inputLabDestino');
    const datalist = document.getElementById('listaLabs');
    
    document.getElementById('txtQueEstudio').value = ""; 
    inputLab.value = ""; 
    datalist.innerHTML = ""; 
    inputLab.disabled = false;
    inputLab.placeholder = "Selecciona o busca un laboratorio...";
    
    if (modal) modal.style.display = 'flex';

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) {
            alert("⚠️ No se detectó una sesión activa.");
            return;
        }

        let opcionesHTML = "";

        // =========================================================================
        // 1. OBTENER MI PROPIA CLÍNICA / SEDE INTERNA (Soporte Multi-dispositivo)
        // =========================================================================
        // Intentar obtener ID local
        let idClinicaActiva = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');

        // A) Si existe ID local, buscar la clínica
        if (idClinicaActiva) {
            const { data: clinicaPropia } = await fisioNet
                .from('clinicas')
                .select('id, nombre_clinica')
                .eq('id', idClinicaActiva)
                .maybeSingle();

            if (clinicaPropia) {
                const nombreInterno = `🏠 [INTERNO] ${clinicaPropia.nombre_clinica.toUpperCase()} - MI SEDE`;
                opcionesHTML += `<option data-id="${user.id}" value="${nombreInterno}"></option>`;
            }
        }

        // B) Si no hay ID local en la laptop, buscar las clínicas de las que eres dueño
        if (!opcionesHTML) {
            const { data: misClinicas } = await fisioNet
                .from('clinicas')
                .select('id, nombre_clinica')
                .eq('id_dueno', user.id);

            if (misClinicas && misClinicas.length > 0) {
                // Guardamos en localStorage para reparar la lap automáticamente
                localStorage.setItem('id_clinica_activa', misClinicas[0].id);
                localStorage.setItem('clinica_activa_id', misClinicas[0].id);

                misClinicas.forEach(c => {
                    const nombreInterno = `🏠 [INTERNO] ${c.nombre_clinica.toUpperCase()} - MI SEDE`;
                    opcionesHTML += `<option data-id="${user.id}" value="${nombreInterno}"></option>`;
                });
            }
        }

        // C) Si eres colaborador activo en una clínica
        if (!opcionesHTML) {
            const { data: colab } = await fisioNet
                .from('colaboradores_clinica')
                .select('id_clinica, clinicas(nombre_clinica)')
                .eq('id_profesional', user.id)
                .eq('estado', 'ACTIVO')
                .maybeSingle();

            if (colab && colab.clinicas) {
                localStorage.setItem('id_clinica_activa', colab.id_clinica);
                localStorage.setItem('clinica_activa_id', colab.id_clinica);
                const nombreInterno = `🏠 [INTERNO] ${colab.clinicas.nombre_clinica.toUpperCase()} - SEDE COLABORADOR`;
                opcionesHTML += `<option data-id="${user.id}" value="${nombreInterno}"></option>`;
            }
        }

        // =========================================================================
        // 2. OBTENER SOCIOS DE LA RED DE COLABORACIÓN (EXTERNOS)
        // =========================================================================
        const { data: alianzas } = await fisioNet
            .from('red_colaboracion')
            .select('*')
            .or(`id_doctor_emisor.eq.${user.id},id_doctor_receptor.eq.${user.id}`)
            .eq('estado_conexion', 'ACTIVO');

        if (alianzas && alianzas.length > 0) {
            for (const a of alianzas) {
                const idSocio = (a.id_doctor_emisor === user.id) ? a.id_doctor_receptor : a.id_doctor_emisor;
                
                const { data: perfilSocio } = await fisioNet
                    .from('perfiles_profesionales')
                    .select('nombre_completo')
                    .eq('id', idSocio)
                    .maybeSingle();

                const { data: clinicaSocio } = await fisioNet
                    .from('clinicas')
                    .select('nombre_clinica')
                    .eq('id_dueno', idSocio)
                    .maybeSingle();

                const nombreResponsable = perfilSocio?.nombre_completo || "RESPONSABLE TÉCNICO";
                const nombreLaboratorio = clinicaSocio?.nombre_clinica || a.nombre_entidad || "LABORATORIO ALIADO";

                const textoMostrado = `🏥 ${nombreLaboratorio.toUpperCase()} - 👤 ${nombreResponsable.toUpperCase()}`;
                opcionesHTML += `<option data-id="${idSocio}" value="${textoMostrado}"></option>`;
            }
        }

        // =========================================================================
        // 3. INYECTAR OPCIONES Y HABILITAR/DESHABILITAR
        // =========================================================================
        if (opcionesHTML !== "") {
            datalist.innerHTML = opcionesHTML;
        } else {
            inputLab.placeholder = "No tienes laboratorios vinculados en tu red";
            inputLab.disabled = true;
        }

    } catch (err) {
        console.error("💥 Error al cargar la lista de laboratorios:", err);
    }
};

window.enviarSolicitudLab = async () => {
    const tipoServicio = document.getElementById('tipoServicioExterno')?.value;
    const estudioTexto = document.getElementById('txtQueEstudio')?.value.trim().toUpperCase();
    const inputLabVal = document.getElementById('inputLabDestino')?.value.trim();
    const btn = document.getElementById('btnEnviarLab');

    if (!estudioTexto) { alert("⚠️ Especifica que estudio o indicacion necesitas."); return; }
    if (!inputLabVal) { alert("⚠️ Selecciona a que socio lo vas a enviar."); return; }

    // 🔍 Extraer el ID único (UUID) del laboratorio destinatario desde el datalist
    const opcionSeleccionada = document.querySelector(`#listaLabs option[value="${CSS.escape(inputLabVal)}"]`);
    const idSocioDestino = opcionSeleccionada ? opcionSeleccionada.getAttribute('data-id') : null;

    if (!idSocioDestino) { 
        alert("⚠️ Por favor, selecciona un laboratorio valido de la lista sugerida."); 
        return; 
    }

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ENVIANDO...'; }

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        const idPacienteActual = idPaciente || window.pacienteCargado?.id || localStorage.getItem('paciente_seleccionado_id');
        const nombrePacienteStr = document.getElementById('nombre')?.innerText || "PACIENTE"; 
        const nombreDocStr = document.getElementById('doc-nombre')?.innerText || "PROFESIONAL ACTIVO";
        
        let idClinicaEmisora = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');
        
        // Validar que idClinicaEmisora sea un UUID valido de 36 caracteres; si no, usar user.id
        const esUUIDValido = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        if (!esUUIDValido(idClinicaEmisora)) {
            idClinicaEmisora = user.id;
        }

        if (!idPacienteActual) throw new Error("No hay un paciente activo en la consulta.");

        if (tipoServicio === 'LAB') {
            // 🧪 ENVIO A LABORATORIO CLINICO (100% Empatado con el esquema de la BD)
            const payloadLaboratorio = {
                paciente_id: idPacienteActual,                // UUID del paciente
                id_socio_emisor: idClinicaEmisora,            // UUID
                id_clinica: idClinicaEmisora,                  // UUID
                id_socio_receptor: idSocioDestino,            // UUID del laboratorio receptor
                especialista_quimico: idSocioDestino,         // 🎯 UUID (En tu BD es columna tipo UUID)
                creado_por: user.id,                          // UUID
                id_doctor_referente: user.id,                 // UUID
                doctor_referente_nombre: nombreDocStr.toUpperCase(),
                paciente_nombre: nombrePacienteStr.toUpperCase(),
                estudios_etiquetas: [estudioTexto],           // Array de texto text[]
                indicaciones_medicas: estudioTexto,          // Texto
                estado: 'PENDIENTE', 
                metodo_carga: 'CAPTURA',
                fecha_captura: new Date().toISOString()
            };

            const { error: errLab } = await fisioNet
                .from('estudios_laboratorio')
                .insert([payloadLaboratorio]);

            if (errLab) throw errLab;

        } else {
            // 🩻 ENVÍO A GABINETE / IMAGENOLOGÍA
            const { error: errGab } = await fisioNet.from('estudios_gabinete').insert([{
                paciente_id: idPacienteActual,                // UUID
                doctor_emisor_id: user.id,                    // UUID
                medico_solicitante_manual: nombreDocStr,
                id_socio_receptor: idSocioDestino,            // UUID
                id_socio_emisor: idClinicaEmisora,            // UUID
                indicaciones_medicas: estudioTexto,
                paciente_nombre_manual: nombrePacienteStr,
                estado_estudio: 'SOLICITADO', 
                estado_dictamen: 'PENDIENTE', 
                archivo_url: 'EMPTY',
                fecha_registro: new Date().toISOString()
            }]);

            if (errGab) throw errGab;
        }

        alert("✅ ¡Solicitud enviada exitosamente a la sala de espera!");
        document.getElementById('modalEstudioExpress').style.display = 'none';

    } catch (err) {
        console.error("Error al enviar solicitud:", err);
        alert("Fallo la conexión: " + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = "ENVIAR SOLICITUD 🚀"; }
    }
};

// ============================================================================
// ⚡ MOTOR DE PRE-RELLENO INTELIGENTE (SOMATOMETRÍA Y DIAGNÓSTICO)
// ============================================================================

window.prerellenarConUltimaNotaGuardada = () => {
    if (!window.FisioCidEngine || !window.FisioCidEngine.ultimaNotaCargada) {
        alert("⚠️ No hay registros previos de este paciente para pre-rellenar.");
        return;
    }

    const u = window.FisioCidEngine.ultimaNotaCargada;
    const llenarSiExiste = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined && val !== null && val !== "") {
            el.value = val;
            // Efecto visual sutil de confirmación
            el.style.backgroundColor = "#fef3c7";
            setTimeout(() => el.style.backgroundColor = "white", 800);
        }
    };

    // 1. Somatometría y Signos Vitales
    llenarSiExiste('valSistolica', u.ta_sistolica);
    llenarSiExiste('valDiastolica', u.ta_diastolica);
    llenarSiExiste('valFC', u.frecuencia_cardiaca);
    llenarSiExiste('valFR', u.frecuencia_respiratoria);
    llenarSiExiste('valTemp', u.temperatura);
    llenarSiExiste('valSpO2', u.spo2);
    llenarSiExiste('valPeso', u.peso);
    llenarSiExiste('valTalla', u.talla);
    
    if (typeof calcularIMC === 'function') {
        calcularIMC();
    }

    // 2. Diagnósticos Clínicos y CIE-10
    llenarSiExiste('diagnostico_principal', u.diagnostico_principal);
    llenarSiExiste('codigo_cie_final', u.codigo_cie10);
    llenarSiExiste('diagnostico_funcional', u.diagnostico_funcional);

    // 3. Plan de tratamiento previo sugerido (opcional)
    llenarSiExiste('plan_tratamiento', u.plan_tratamiento);

    console.log("⚡ [FisioCid]: Somatometría y diagnóstico pre-rellenados con éxito.");
};

// ============================================================================
// 💊 CARGAR Y PRE-RELLENAR DESDE RECETA PENDIENTE (RECETA Y SOMATOMETRÍA)
// ============================================================================
async function cargarDatosDesdeRecetaPendiente() {
    const urlParams = new URLSearchParams(window.location.search);
    const recetaId = urlParams.get('receta_id');
    
    if (!recetaId) return; // Si es consulta normal, no hace nada

    try {
        console.log("🔍 Detectada receta pendiente ID:", recetaId);
        
        const { data: receta, error } = await fisioNet
            .from('recetas_medicas')
            .select('*')
            .eq('id', recetaId)
            .single();

        if (error || !receta) {
            console.warn("⚠️ No se pudo recuperar la información de la receta:", error?.message);
            return;
        }

        // Armamos el texto estructurado de los medicamentos del JSON
        let resumenMeds = "";
        if (receta.medicamentos && Array.isArray(receta.medicamentos)) {
            resumenMeds = receta.medicamentos.map((m, idx) => 
                `${idx + 1}. Fármaco: ${m.nombre} | Dosis: ${m.dosis} | Frecuencia: ${m.frecuencia} | Duración: ${m.duracion}`
            ).join('\n');
        }

        // Función auxiliar para rellenar y dar feedback visual verde
        const llenarCampo = (id, valor) => {
            const el = document.getElementById(id);
            if (el && valor !== undefined && valor !== null && valor !== "") {
                el.value = valor;
                el.style.backgroundColor = "#dcfce7"; // Tono verdecito indicando pre-relleno inteligente
                setTimeout(() => el.style.backgroundColor = "white", 1500);
            }
        };

        // 1. PRE-RELLENAR DIAGNÓSTICO Y TRATAMIENTO
        llenarCampo('diagnostico_principal', receta.diagnostico);
        
        let textoTratamiento = "";
        if (resumenMeds) textoTratamiento += `PRESCRIPCIÓN / FÁRMACOS:\n${resumenMeds}\n\n`;
        if (receta.indicaciones_generales) textoTratamiento += `INDICACIONES GENERALES:\n${receta.indicaciones_generales}`;
        
        llenarCampo('plan_tratamiento', textoTratamiento);
        llenarCampo('cambios_medicacion', resumenMeds);

        // 2. 🚀 PRE-RELLENAR SOMATOMETRÍA Y SIGNOS VITALES
        llenarCampo('valSistolica', receta.sistolica);
        llenarCampo('valDiastolica', receta.diastolica);
        llenarCampo('valFC', receta.frecuencia_cardiaca);
        llenarCampo('valFR', receta.frecuencia_respiratoria);
        llenarCampo('valTemp', receta.temperatura);
        llenarCampo('valSpO2', receta.spo2);
        llenarCampo('valPeso', receta.peso);
        llenarCampo('valTalla', receta.talla);

        // Disparamos el cálculo automático del IMC si peso y talla vienen rellenos
        if (typeof calcularIMC === 'function') {
            calcularIMC();
        }

        // Guardamos el ID de la receta para marcarla como completada al guardar la nota
        window.recetaPendienteVinculadaId = recetaId;

        // Banner flotante superior de aviso para el doctor
        const bannerReceta = document.createElement('div');
        bannerReceta.className = 'alert alert-success border-0 shadow-sm mb-3 animate__animated animate__fadeInDown';
        bannerReceta.style.borderRadius = '12px';
        bannerReceta.innerHTML = `
            <div class="d-flex align-items-center justify-content-between">
                <div>
                    <strong>💊 RECETA Y SOMATOMETRÍA CARGADAS:</strong> Los signos vitales, peso, diagnóstico y prescripción previa se han volcado automáticamente.
                </div>
                <span class="badge bg-success">Folio: ${receta.folio_expediente || 'S/F'}</span>
            </div>
        `;
        const formularioEl = document.getElementById('formHistoria');
        if (formularioEl) formularioEl.prepend(bannerReceta);

    } catch (err) {
        console.error("❌ Error al procesar la receta pendiente:", err);
    }
}

// =========================================================
// ⚡ CONTROL DEL SPEED DIAL FLOTANTE Y MODALES
// =========================================================
function toggleSpeedDial() {
    const opciones = document.getElementById('opcionesSpeedDial');
    const icono = document.getElementById('iconoSpeedDial');
    
    if (!opciones) return;

    if (opciones.style.display === 'none' || opciones.style.display === '') {
        opciones.style.display = 'flex';
        if (icono) icono.style.transform = 'rotate(45deg)';
    } else {
        opciones.style.display = 'none';
        if (icono) icono.style.transform = 'rotate(0deg)';
    }
}

function abrirModalEvidenciaMultimedia() {
    toggleSpeedDial(); // Cierra el menú desplegable
    const modal = document.getElementById('modalEvidenciaMultimedia');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalEvidenciaMultimedia() {
    const modal = document.getElementById('modalEvidenciaMultimedia');
    if (modal) modal.style.display = 'none';
}

// Saneador de nombres de archivo para Supabase Storage
function sanearNombreArchivo(nombreOriginal) {
    const extension = nombreOriginal.split('.').pop().toLowerCase();
    const nombreSinExt = nombreOriginal.substring(0, nombreOriginal.lastIndexOf('.'));
    
    const nombreLimpio = nombreSinExt
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita acentos
        .replace(/[^a-zA-Z0-9_-]/g, "_")                  // Reemplaza símbolos por _
        .replace(/_+/g, "_")                              // Evita guiones dobles __
        .toLowerCase();

    const timestamp = Date.now();
    const hashRandom = Math.random().toString(36).substring(2, 7);

    return `${timestamp}_${hashRandom}_${nombreLimpio}.${extension}`;
}



// =========================================================
// 📂 ABRIR / CERRAR MODAL HISTORIAL DE EVIDENCIAS
// =========================================================
let coleccionEvidenciasPaciente = [];

function abrirModalHistorialEvidencias() {
    toggleSpeedDial();
    const modal = document.getElementById('modalHistorialEvidencias');
    if (modal) {
        modal.style.display = 'flex';
        cargarHistorialEvidencias();
    }
}

function cerrarModalHistorialEvidencias() {
    const modal = document.getElementById('modalHistorialEvidencias');
    if (modal) modal.style.display = 'none';
}

// =========================================================
// 📤 SUBIDA DE EVIDENCIA INTERNA PRIVADA POR CLÍNICA
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    const formEvidencia = document.getElementById('formSubirEvidencia');

    if (!formEvidencia) return;

    formEvidencia.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById('evidencia_archivo');
        const categoriaSelect = document.getElementById('evidencia_categoria');
        const descripcionInput = document.getElementById('evidencia_descripcion');
        const btn = document.getElementById('btnGuardarEvidencia');

        const categoria = categoriaSelect ? categoriaSelect.value : 'GENERAL';
        const descripcion = descripcionInput ? descripcionInput.value.trim() : '';

        const pacienteActualId = (typeof idPaciente !== 'undefined' && idPaciente) 
            ? idPaciente 
            : (localStorage.getItem('paciente_seleccionado_id') || new URLSearchParams(window.location.search).get('id'));

        if (!pacienteActualId) {
            alert("⚠️ No se detectó el ID del paciente. Asegúrate de haber seleccionado un paciente.");
            return;
        }

        if (!fileInput || !fileInput.files.length) {
            alert("Por favor selecciona o toma una fotografía.");
            return;
        }

        const file = fileInput.files[0];
        const nombreArchivoSaneado = sanearNombreArchivo(file.name);
        
        const idClinicaActiva = (typeof idClinica !== 'undefined' && idClinica) 
            ? idClinica 
            : (localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id') || 'sin_clinica');

        const filePath = `${pacienteActualId}/${idClinicaActiva}/${categoria}/${nombreArchivoSaneado}`;

        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando en expediente...';
            }

            const { data: { user } } = await fisioNet.auth.getUser();

            // 1. Subir al bucket privado 'expedientes-multimedia'
            const { data: storageData, error: storageError } = await fisioNet.storage
                .from('expedientes-multimedia')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (storageError) throw storageError;

            // 2. Generar URL firmada temporal (válida por 1 hora)
            const { data: urlData } = await fisioNet.storage
                .from('expedientes-multimedia')
                .createSignedUrl(filePath, 3600);

            const urlFirmada = urlData?.signedUrl || '';

            // 🛡️ Búsqueda/Definición de la fecha de autorización del OTP
            let fechaOtpStr = new Date().toISOString();
const otpActivoId = solicitudOTPActivaId || sessionStorage.getItem(`otp_id_paciente_${pacienteActualId}`);
            if (otpActivoId) {
                const { data: datosOtp } = await fisioNet
                    .from('solicitudes_acceso_otp')
                    .select('fecha_autorizacion')
                    .eq('id', otpActivoId)
                    .maybeSingle();

                if (datosOtp?.fecha_autorizacion) {
                    fechaOtpStr = datosOtp.fecha_autorizacion;
                }
            }

            // 3. Insertar registro guardando la ruta del almacenamiento y la firma
            const { error: dbError } = await fisioNet
                .from('paciente_evidencia_multimedia')
                .insert({
                    id_paciente: pacienteActualId,
                    id_profesional: user?.id,
                    id_clinica: idClinicaActiva,
                    categoria_especialidad: categoria,
                    url_imagen: urlFirmada,
                    ruta_storage: filePath,
                    descripcion: descripcion,
                    es_privado_clinica: true,
                    fecha_registro: new Date().toISOString(),
                    id_otp_origen: otpActivoId,
                    fecha_autorizacion_otp: fechaOtpStr
                });

            if (dbError) throw dbError;

            alert("🔒 ¡Evidencia clínica guardada de forma 100% privada y segura!");
            cerrarModalEvidenciaMultimedia();
            formEvidencia.reset();

            if (typeof cargarHistorialEvidencias === 'function') {
                cargarHistorialEvidencias();
            }

        } catch (err) {
            console.error("❌ Error al guardar evidencia:", err);
            alert(`Error al guardar: ${err.message || 'Error desconocido'}`);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '🚀 GUARDAR EVIDENCIA EN EXPEDIENTE';
            }
        }
    });
});
// =========================================================
// 📂 CARGAR HISTORIAL CON GENERACIÓN DE URLS FIRMADAS DÍNAMICAS
// =========================================================
// =========================================================
// 📂 CARGAR HISTORIAL CON GENERACIÓN DE URLS FIRMADAS DINÁMICAS
// =========================================================
async function cargarHistorialEvidencias() {
    const contenedor = document.getElementById('contenedor_lista_evidencias');
    if (!contenedor) return;

    const idClinicaActiva = (typeof idClinica !== 'undefined' && idClinica) 
        ? idClinica 
        : (localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id'));

    const pacienteActualId = (typeof idPaciente !== 'undefined' && idPaciente) 
        ? idPaciente 
        : (localStorage.getItem('paciente_seleccionado_id') || new URLSearchParams(window.location.search).get('id'));

    if (!pacienteActualId) {
        contenedor.innerHTML = `<div class="alert alert-warning text-center">No hay un paciente seleccionado actualmente.</div>`;
        return;
    }

    try {
        contenedor.innerHTML = `<p class="text-center text-muted my-5"><i class="fas fa-spinner fa-spin me-2"></i>Cargando expediente multimedia privado...</p>`;

        const { data: { user } } = await fisioNet.auth.getUser();

        // 🛡️ BÚSQUEDA FLEXIBLE NOM-004: Trae si pertenece a la clínica activa O si fue asignado/creado por el profesional en sesión
        let query = fisioNet
            .from('paciente_evidencia_multimedia')
            .select('*')
            .eq('id_paciente', pacienteActualId);

        if (idClinicaActiva && user) {
            query = query.or(`id_clinica.eq.${idClinicaActiva},id_profesional.eq.${user.id}`);
        } else if (idClinicaActiva) {
            query = query.eq('id_clinica', idClinicaActiva);
        } else if (user) {
            query = query.eq('id_profesional', user.id);
        }

        const { data, error } = await query.order('fecha_registro', { ascending: false });

        if (error) throw error;

        // 🔒 Generar URLs firmadas dinámicas y frescas para cada evidencia
        const evidenciasConFirmas = await Promise.all((data || []).map(async (item) => {
            if (item.ruta_storage) {
                const { data: signedData } = await fisioNet.storage
                    .from('expedientes-multimedia')
                    .createSignedUrl(item.ruta_storage, 3600);
                if (signedData?.signedUrl) {
                    item.url_imagen = signedData.signedUrl;
                }
            }
            return item;
        }));

        coleccionEvidenciasPaciente = evidenciasConFirmas;
        renderizarListaEvidencias(coleccionEvidenciasPaciente);

    } catch (err) {
        console.error("❌ Error al cargar historial de evidencias:", err);
        contenedor.innerHTML = `<div class="alert alert-danger text-center">Error al cargar evidencias: ${err.message}</div>`;
    }
}

function renderizarListaEvidencias(lista) {
    const contenedor = document.getElementById('contenedor_lista_evidencias');
    if (!contenedor) return;

    if (!lista || lista.length === 0) {
        contenedor.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="fas fa-folder-open fa-3x mb-3 text-slate-300"></i>
                <h6>No hay evidencias registradas para este paciente en esta clínica.</h6>
                <small>Usa la opción <b>📸 Subir Foto</b> para añadir imágenes o estudios.</small>
            </div>
        `;
        return;
    }

    let html = '';

    lista.forEach(item => {
        const fechaObj = new Date(item.fecha_registro);
        const fechaFormateada = fechaObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const esPDF = item.url_imagen?.toLowerCase().endsWith('.pdf');
        
        // 🎯 Mapeo adaptado para categoria_especial
const catNombre = item.categoria_especialidad || item.categoria_especial || 'EVIDENCIA';
        
        html += `
            <div class="tarjeta-evidencia-item" onclick="verEvidenciaPantallaCompleta('${item.url_imagen}', ${esPDF}, '${catNombre}', '${fechaFormateada}', '${(item.descripcion || '').replace(/'/g, "\\'")}')">
                <div class="d-flex gap-3 align-items-center">
                    <div style="width: 70px; height: 70px; border-radius: 10px; overflow: hidden; background: #0f172a; display: flex; justify-content: center; align-items: center; flex-shrink: 0;">
                        ${esPDF 
                            ? `<i class="fas fa-file-pdf text-danger fa-2x"></i>` 
                            : `<img src="${item.url_imagen}" style="width: 100%; height: 100%; object-fit: cover;" alt="Evidencia">`
                        }
                    </div>
                    <div style="flex: 1;">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="badge bg-dark text-info font-monospace" style="font-size: 0.68rem;">${catNombre}</span>
                            <small class="text-muted fw-bold" style="font-size: 0.7rem;"><i class="far fa-clock me-1"></i>${fechaFormateada}</small>
                        </div>
                        <p class="mb-0 fw-bold text-dark small" style="line-height: 1.3;">
                            ${item.descripcion || 'Sin descripción adicional.'}
                        </p>
                    </div>
                    <div class="text-secondary opacity-50">
                        <i class="fas fa-expand-alt fa-lg"></i>
                    </div>
                </div>
            </div>
        `;
    });

    contenedor.innerHTML = html;
}

function filtrarEvidenciasLocales() {
    const fechaSeleccionada = document.getElementById('filtro_fecha_evidencia').value;
    const catSeleccionada = document.getElementById('filtro_categoria_evidencia').value;

    let resultado = [...coleccionEvidenciasPaciente];

    if (fechaSeleccionada) {
        resultado = resultado.filter(item => item.fecha_registro.split('T')[0] === fechaSeleccionada);
    }

    if (catSeleccionada && catSeleccionada !== 'TODAS') {
        resultado = resultado.filter(item => {
            const cat = item.categoria_especial || item.categoria_especialidad || '';
            return cat.startsWith(catSeleccionada);
        });
    }

    renderizarListaEvidencias(resultado);
}

function resetFiltrosEvidencia() {
    const fechaInput = document.getElementById('filtro_fecha_evidencia');
    const catInput = document.getElementById('filtro_categoria_evidencia');
    if (fechaInput) fechaInput.value = '';
    if (catInput) catInput.value = 'TODAS';
    renderizarListaEvidencias(coleccionEvidenciasPaciente);
}

function verEvidenciaPantallaCompleta(url, esPDF, categoria, fecha, descripcion) {
    const modalFull = document.getElementById('modalVisorFullscreen');
    const contenedorArchivo = document.getElementById('full_contenido_archivo');
    if (!modalFull || !contenedorArchivo) return;
    
    document.getElementById('full_titulo_evidencia').innerText = `Categoría: ${categoria}`;
    document.getElementById('full_fecha_evidencia').innerText = `Fecha de Registro: ${fecha}`;
    document.getElementById('full_descripcion_evidencia').innerText = descripcion ? `"${descripcion}"` : '';

    if (esPDF) {
        contenedorArchivo.innerHTML = `<iframe src="${url}" style="width: 100%; height: 100%; border: none; border-radius: 12px; background: white;"></iframe>`;
    } else {
        contenedorArchivo.innerHTML = `<img src="${url}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" alt="Evidencia Fullscreen">`;
    }

    modalFull.style.display = 'flex';
}

function cerrarVisorFullscreen() {
    const modalFull = document.getElementById('modalVisorFullscreen');
    if (modalFull) {
        modalFull.style.display = 'none';
        const contenedor = document.getElementById('full_contenido_archivo');
        if (contenedor) contenedor.innerHTML = '';
    }
}


// ============================================================================
// 📥 IMPORTAR ESTUDIO / EVIDENCIA GLOBAL AL EXPEDIENTE LOCAL DE LA CLÍNICA
// ============================================================================
async function anexarEstudioAExpedienteClinica(itemOrigen) {
    const idClinicaActiva = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');
    const idPacienteLimpio = idPaciente || window.pacienteCargado?.id;

    if (!idClinicaActiva) {
        alert("⚠️ No se detectó una clínica activa.");
        return;
    }

    const confirmar = confirm(
        `📥 ¿Deseas anexar este estudio al expediente de tu clínica?\n\n` +
        `Quedará respaldado con la autorización OTP que otorgó el paciente.`
    );

    if (!confirmar) return;

    try {
        const { data: { user } } = await fisioNet.auth.getUser();

        // 1. Consultar los datos de la solicitud OTP que aprobó el acceso
        let fechaOtpStr = new Date().toISOString();
        let idOtpActivo = solicitudOTPActivaId || sessionStorage.getItem(`otp_id_paciente_${idPacienteLimpio}`);

        if (idOtpActivo) {
            const { data: datosOtp } = await fisioNet
                .from('solicitudes_acceso_otp')
                .select('fecha_autorizacion')
                .eq('id', idOtpActivo)
                .maybeSingle();

            if (datosOtp?.fecha_autorizacion) {
                fechaOtpStr = datosOtp.fecha_autorizacion;
            }
        }

        const fechaOtpFormateada = new Date(fechaOtpStr).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const nombreDoctorModal = document.getElementById('doc-nombre')?.innerText?.trim() || "PROFESIONAL ACTIVO";

        // 2. Construir la descripción auditada
        const descripcionAuditada = 
            `[ANEXADO VÍA AUTORIZACIÓN OTP el ${fechaOtpFormateada} por ${nombreDoctorModal}] ` +
            `${itemOrigen.descripcion || itemOrigen.hallazgos_resumen || 'Sin descripción original.'}`;

        // 3. Generar URL firmada temporal para el almacenamiento local
        const rutaStorage = itemOrigen.ruta_storage || itemOrigen.archivo_url;
        let urlFirmada = itemOrigen.url_imagen || itemOrigen.archivo_url || '';

        if (rutaStorage && !rutaStorage.startsWith('http')) {
            const { data: signedData } = await fisioNet.storage
                .from('expedientes-multimedia')
                .createSignedUrl(rutaStorage, 3600);
            if (signedData?.signedUrl) urlFirmada = signedData.signedUrl;
        }

        // 🎯 Identificación del origen para FKs exactas
        const esLaboratorio = itemOrigen.tipo_estudio === 'LABORATORIO CLÍNICO' || itemOrigen.estudios_etiquetas;
        const idOrigenGab = !esLaboratorio ? itemOrigen.id : null;
        const idOrigenLab = esLaboratorio ? itemOrigen.id : null;

        // 4. Insertar el nuevo registro de evidencia local sin duplicar archivo en Storage
        const { error } = await fisioNet
            .from('paciente_evidencia_multimedia')
            .insert({
                id_paciente: idPacienteLimpio,
                id_profesional: user?.id,
                id_clinica: idClinicaActiva,
                categoria_especialidad: itemOrigen.categoria_especialidad || itemOrigen.tipo_estudio || 'ESTUDIOS_EXTERNOS',
                url_imagen: urlFirmada,
                ruta_storage: rutaStorage,
                descripcion: descripcionAuditada,
                es_privado_clinica: true,
                fecha_registro: new Date().toISOString(),
                id_origen_gabinete: idOrigenGab,
                id_origen_laboratorio: idOrigenLab
            });

        if (error) throw error;

        alert("✅ ¡Estudio/Evidencia anexado con éxito al expediente de tu clínica con respaldo legal OTP!");

        // Recargar el historial local si el modal o sección está abierto
        if (typeof cargarHistorialEvidencias === 'function') {
            cargarHistorialEvidencias();
        }

    } catch (err) {
        console.error("💥 Error al anexar estudio:", err);
        alert("Error al anexar estudio: " + (err.message || "Error de conexión"));
    }
}


// ============================================================================
// 🔔 VERIFICADOR DE NUEVA EVIDENCIA Y LABORATORIOS COMPLETADOS (EXCLUSIVO DEL DOCTOR)
// ============================================================================
async function verificarNotificacionesEstudios(idPacienteActual) {
    if (!idPacienteActual) return;

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return;

        // 1. Consultar Evidencias Multimedia / Gabinete dirigidas a ti
        const { count: countEvidencias, error: errEv } = await fisioNet
            .from('paciente_evidencia_multimedia')
            .select('id', { count: 'exact', head: true })
            .eq('id_paciente', idPacienteActual)
            .eq('id_profesional', user.id)
            .in('categoria_especialidad', ['GABINETE', 'LABORATORIO']);

        if (errEv) throw errEv;

        // 2. Consultar Estudios de Laboratorio Dictaminados/Listos para este paciente
        const { count: countLabs, error: errLab } = await fisioNet
            .from('estudios_laboratorio')
            .select('id', { count: 'exact', head: true })
            .eq('paciente_id', idPacienteActual)
            .eq('id_doctor_referente', user.id)               // 👈 Nombre correcto de la columna en BD
            .eq('estado', 'DICTAMINADO');

        if (errLab) console.warn("Aviso en consulta de laboratorios:", errLab.message);

        const totalPendientesRevision = (countEvidencias || 0) + (countLabs || 0);

        // 3. Inyectar insignias rojas de notificación si hay estudios listos
        if (totalPendientesRevision > 0) {
            inyectarBadgeBoton('btn-historial-galeria', totalPendientesRevision);
            inyectarBadgeBoton('btn-acciones-clinicas', totalPendientesRevision);
        }
    } catch (err) {
        console.error("❌ Error consultando notificaciones de estudios:", err.message);
    }
}


function inyectarBadgeBoton(idBoton, cantidad) {
    const btn = document.getElementById(idBoton);
    if (!btn) return;

    // Evitamos duplicar badges si ya existe
    let badge = btn.querySelector('.badge-notificacion-estudio');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'badge-notificacion-estudio badge rounded-pill bg-danger position-absolute top-0 start-100 translate-middle shadow-sm';
        badge.style.fontSize = '0.70rem';
        badge.style.zIndex = '10';
        btn.style.position = 'relative';
        btn.appendChild(badge);
    }
    badge.innerText = cantidad;
}