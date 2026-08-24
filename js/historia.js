const urlParams = new URLSearchParams(window.location.search);
let idPaciente = urlParams.get('id') || localStorage.getItem('paciente_seleccionado_id');


const cargarExpedienteFijo = async () => {
    if (!idPaciente) {
        console.warn("No se detectó ID de paciente");
        return;
    }

    const idLimpio = idPaciente.trim();
    const idClinica = localStorage.getItem('clinica_activa_id') || localStorage.getItem('id_clinica_activa');

    // 🕒 1. REPARACIÓN FECHA Y HORA (Formato NOM Completo)
    const contenedorReloj = document.getElementById('reloj-consulta');
    if (contenedorReloj) {
        const pintarFechaHora = () => {
            const ahora = new Date();
            const opcionesFecha = { day: '2-digit', month: '2-digit', year: 'numeric' };
            const fechaFormateada = ahora.toLocaleDateString('es-MX', opcionesFecha);
            const horaFormateada = ahora.toLocaleTimeString('es-MX', { hour12: false });
            
            contenedorReloj.innerText = `${fechaFormateada} - ${horaFormateada}`;
        };
        pintarFechaHora();
        setInterval(pintarFechaHora, 1000); 
    }

    // 👨‍⚕️ 2. REPARACIÓN PERFIL MÉDICO (Columnas Exactas de tu Base de Datos)
   try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (user) {
            const { data: perfil, error: errorPerfil } = await fisioNet
                .from('perfiles_profesionales')
                .select('nombre_completo, cedula_profesional, especialidad')
                .eq('id', user.id)
                .single();

            if (!errorPerfil && perfil) {
                // Asignamos variables limpias
                const nombreDoc = perfil.nombre_completo || "Profesional Registrado";
                const cedulaPro = perfil.cedula_profesional || "REVISAR PERFIL";
                const especialidadDoc = perfil.especialidad || localStorage.getItem('especialidadUsuario') || "General";

                // Inyectamos de forma exacta en tus elementos HTML
                if (document.getElementById('doc-nombre')) {
                    document.getElementById('doc-nombre').innerText = ` ${nombreDoc}`.toUpperCase();
                }
                if (document.getElementById('doc-especialidad')) {
                    document.getElementById('doc-especialidad').innerText = especialidadDoc.toUpperCase();
                }
                if (document.getElementById('doc-cedula')) {
                    document.getElementById('doc-cedula').innerText = cedulaPro; // 🎯 Ahora sí se mostrará tu cédula aquí
                }
            } else {
                console.warn("No se encontró el perfil o hubo error, usando datos de respaldo:", errorPerfil?.message);
                if (document.getElementById('doc-nombre')) document.getElementById('doc-nombre').innerText = "PROFESIONAL ACTIVO";
                if (document.getElementById('doc-cedula')) document.getElementById('doc-cedula').innerText = "REVISAR PERFIL";
                if (document.getElementById('doc-especialidad')) document.getElementById('doc-especialidad').innerText = (localStorage.getItem('especialidadUsuario') || "GENERAL").toUpperCase();
            }
        }
    } catch (e) {
        console.error("Error al mapear datos del médico desde la tabla perfiles:", e);
    }

    // 3. JALAMOS EL PACIENTE MAESTRO
    const { data, error } = await fisioNet
        .from('pacientes_maestros')
        .select('*')
        .eq('id', idLimpio)
        .eq('id_clinica', idClinica)
        .single();

    if (error || !data) {
        console.error("Error de Supabase o acceso denegado:", error?.message);
        return;
    }

    const p = data; 
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

    // 📂 4. TRAER NÚMERO DE EXPEDIENTE
    try {
        const { data: dataExp, error: errorExp } = await fisioNet
            .from('expedientes_clinicos')
            .select('folio_personalizado, numero_consecutivo')
            .eq('id_paciente', idLimpio)
            .eq('id_clinica', idClinica)
            .single();

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
            console.log(`📜 [FisiodCid Red]: Historial detectado (${notasAnteriores.length} notas). Almacenando última evolución.`);
            FisioCidEngine.ultimaNotaCargada = notasAnteriores[0];

            // 🎯 CASO PACIENTE EXISTENTE: Sí tiene historial, abrimos el selector interactivo
            if (typeof modalEngine !== 'undefined' && modalEngine.mostrarSelectorTipoConsulta) {
                console.log("🎛️ Desplegando modal de tipo de consulta subsecuente...");
                modalEngine.mostrarSelectorTipoConsulta();
            }
        } else {
            // 🆕 CASO PACIENTE NUEVO ABSOLUTO (Cero "Show")
            console.log("🆕 [BÚNKER CLÍNICO]: Cero notas previas en DB. Saltando directo a Valoración Inicial.");
            
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
        console.log("📸 Sincronizando galería de gabinete para:", idLimpio);
        modalEngine.cargarEstudiosAnteriores(idLimpio);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    cargarExpedienteFijo();
});


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
        if(btn) { btn.innerText = "PROCESANDO..."; btn.disabled = true; }

        try {
            const { data: { user } } = await fisioNet.auth.getUser();
            if (!user) throw new Error("Sesión expirada");

            const specialty = localStorage.getItem('especialidadUsuario');
            const idClinica = localStorage.getItem('clinica_activa_id') || localStorage.getItem('id_clinica_activa');
            
            if (!specialty || !idClinica) {
                throw new Error("Falta configuración de especialidad o sede. Por favor, regresa al Dashboard.");
            }
            await fisioNet.from('pacientes_maestros').update({
                alergias: document.getElementById('alergias').value,
                antecedentes_quirurgicos: document.getElementById('quirurgicos').value,
                antecedentes_patologicos: document.getElementById('cronicos').value,
                farmacologia_activa: document.getElementById('medicamentos').value,
                ocupacion: document.getElementById('ocupacion').value
            }).eq('id', idPaciente);

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
                cambios_medicacion: document.getElementById('cambios_medicacion')?.value || '',
                plan_tratamiento: document.getElementById('plan_tratamiento')?.value || '',
                exploracion_fisica: document.getElementById('exploracion')?.value || '',
                diagnostico_principal: document.getElementById('diagnostico_principal')?.value.toUpperCase() || '',
                codigo_cie10: document.getElementById('codigo_cie_final')?.value || '',
                eva: parseInt(document.getElementById('valEva')?.value) || 0,
                ta_sistolica: parseInt(document.getElementById('valSistolica')?.value) || 0,
                ta_diastolica: parseInt(document.getElementById('valDiastolica')?.value) || 0,
                frecuencia_cardiaca: parseInt(document.getElementById('valFC')?.value) || 0,
                frecuencia_respiratoria: parseInt(document.getElementById('valFR')?.value) || 0,
                temperatura: parseFloat(document.getElementById('valTemp')?.value) || 0,
                spo2: parseInt(document.getElementById('valSpO2')?.value) || 0,
                peso: parseFloat(document.getElementById('valPeso')?.value) || null,
                talla: parseFloat(document.getElementById('valTalla')?.value) || null,
                imc: parseFloat(document.getElementById('valIMC')?.value) || null,
                hallazgos_dentales: document.getElementById('hallazgosDentales')?.value || '',
                diagnostico_funcional: document.getElementById('diagnostico_funcional')?.value || '',
                pronostico: `${document.getElementById('pronostico_select')?.value || ''} - ${document.getElementById('pronostico_detalle')?.value || ''}`,
                fecha_nota: new Date().toISOString()
            };

            const { error: errHistorial } = await fisioNet.from('historial_clinico').insert([nuevaNota]);
            if (errHistorial) throw errHistorial;

            const deseaImprimir = confirm("✅ ¡Consulta guardada! ¿Deseas generar la receta/reporte en PDF?");
            if (deseaImprimir && typeof window.generarPDF === 'function') {
                await window.generarPDF(nuevaNota); 
            }
            window.location.href = 'lista-pacientes.html';

        } catch (error) {
            alert("Error al guardar: " + error.message);
            if(btn) { btn.innerText = "REINTENTAR"; btn.disabled = false; }
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
                   llenarSiExiste('plan_tratamiento', u.plan_tratamiento);
                btnClonar.innerHTML = '<i class="fas fa-check"></i> ¡CLONADO!';
            } else {
                alert("No hay notas previas.");
            }
        } catch (err) { alert("Error al clonar."); }
        finally { setTimeout(() => { if(btnClonar) btnClonar.innerHTML = '<i class="fas fa-copy"></i> CLONAR ÚLTIMA NOTA'; }, 2000); }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const campoMotivo = document.getElementById('motivo');

    const gestionarBotonInteligente = (protocolo = null) => {
    let btn = document.getElementById('btn-fisiocid-inteligente');
    
    if (!protocolo) {
        if (btn) btn.remove();
        return;
    }

    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'btn-fisiocid-inteligente';
        btn.type = "button";
        
        const colorClinica = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#d4af37';
        
        btn.style.cssText = `
            background-color: ${colorClinica}; 
            color: white; 
            border: none; 
            padding: 5px 15px; 
            border-radius: 8px 8px 0 0; 
            font-weight: 900; 
            cursor: pointer; 
            font-size: 0.65rem;
            float: right; 
            margin-bottom: 0px; 
            position: relative;
            z-index: 10;
            transition: 0.3s;
            text-transform: uppercase;
            box-shadow: -2px -2px 5px rgba(0,0,0,0.1);
        `;

        campoMotivo.parentNode.insertBefore(btn, campoMotivo);
    }

    btn.innerHTML = `✨ APOYO SÍNTOMAS: ${protocolo.titulo}`;

    btn.onclick = (e) => {
        e.preventDefault();
        if (typeof modalEngine !== 'undefined') {
            modalEngine.abrirAsistente('anamnesis', protocolo);
        }
    };
};

    if (campoMotivo) {
        campoMotivo.addEventListener('input', (e) => {
            const texto = e.target.value.toLowerCase().trim();
            const especialidadReal = (localStorage.getItem('especialidadUsuario') || "GENERAL").toUpperCase().trim();
            
            if (texto.length < 3) {
                gestionarBotonInteligente(null);
                return;
            }

            const biblioteca = window.BIBLIOTECA_PROTOCOLOS || window.protocolos;
            let encontrado = null;

            if (biblioteca && biblioteca[especialidadReal]) {
                encontrado = biblioteca[especialidadReal].find(p => 
                    p.triggers.some(t => texto.includes(t.toLowerCase()))
                );
            }

            gestionarBotonInteligente(encontrado);
        });
    }
});


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
                console.log("💡 Sugiriendo protocolo:", protocoloMatch.titulo);
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



document.addEventListener('DOMContentLoaded', () => {
    inicializarEscuchaMotivo();
});

// ============================================================================
// 🩺 SOLICITUD Y VALIDACIÓN OTP (COLUMNAS EXACTAS DB)
// ============================================================================
let solicitudOTPActivaId = null;

// A) EL DOCTOR ENVÍA LA SOLICITUD
document.getElementById('btnSolicitarHistoria')?.addEventListener('click', async () => {
    const idPacienteLimpio = idPaciente || window.pacienteCargado?.id;

    if (!idPacienteLimpio) {
        alert("⚠️ Por favor selecciona un paciente válido.");
        return;
    }

    const btnSolicitar = document.getElementById('btnSolicitarHistoria');

    try {
        btnSolicitar.disabled = true;
        btnSolicitar.innerText = "⌛ ENVIANDO...";

        const { data: { user } } = await fisioNet.auth.getUser();
        const nombreDoc = document.getElementById('doc-nombre')?.innerText?.trim() || "Dr. Cristian";

        // Generamos el código aleatorio de 6 dígitos
        const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();

        // 🎯 INSERT CON NOMBRES EXACTOS DE TU TABLA EN SUPABASE
        const { data, error } = await fisioNet
            .from('solicitudes_acceso_otp')
            .insert([{
                id_paciente: idPacienteLimpio,
                id_profesional: user ? user.id : null,     // 👈 Mapeado a id_profesional
                nombre_profesional: nombreDoc,            // 👈 Mapeado a nombre_profesional
                codigo_otp: codigoOTP,                    // 👈 Mapeado a codigo_otp
                estado_solicitud: 'PENDIENTE',
                permisos_concedidos: { notas: true, estudios: true } // 👈 Mapeado a permisos_concedidos
            }])
            .select();

        if (error) throw error;

        solicitudOTPActivaId = data[0].id;

        // Limpiamos e inyectamos
        document.getElementById('otp-seguridad').value = "";
        const modalEl = document.getElementById('modalSolicitudAcceso');
        if (modalEl) new bootstrap.Modal(modalEl).show();

        console.log("🚀 Solicitud transmitida con éxito a Supabase. OTP:", codigoOTP);

    } catch (err) {
        console.error("💥 Error al emitir solicitud OTP:", err.message);
        alert("Error al conectar con la base de datos: " + err.message);
    } finally {
        btnSolicitar.disabled = false;
        btnSolicitar.innerHTML = '📝🔍 SOLICITAR HISTORIA';
    }
});

// B) EL DOCTOR VALIDA EL CÓDIGO INGRESO
document.getElementById('btnValidarAcceso')?.addEventListener('click', async () => {
    const otpIngresado = document.getElementById('otp-seguridad')?.value?.trim();

    if (!otpIngresado || otpIngresado.length < 6) {
        alert("⚠️ Ingresa el código completo de 6 dígitos.");
        return;
    }

    if (!solicitudOTPActivaId) {
        alert("⚠️ No hay una solicitud activa pendiente.");
        return;
    }

    const btnVal = document.getElementById('btnValidarAcceso');
    btnVal.disabled = true;
    btnVal.innerText = "VERIFICANDO...";

    try {
        const { data: solicitud, error } = await fisioNet
            .from('solicitudes_acceso_otp')
            .select('*')
            .eq('id', solicitudOTPActivaId)
            .single();

        if (error) throw error;

        if (solicitud.estado_solicitud === 'APROBADO' && solicitud.codigo_otp === otpIngresado) {
            
            // Leemos el objeto de permisos devuelto por la DB
            const permisos = solicitud.permisos_concedidos || {};
            document.getElementById('check-historial').checked = !!permisos.notas;
            document.getElementById('check-imagenes').checked = !!permisos.estudios;
            document.getElementById('check-laboratorio').checked = !!permisos.estudios;

            alert("🎉 ¡AUTORIZACIÓN CONFIRMADA! La Red FisioCid ha verificado el acceso.");

            const modalEl = document.getElementById('modalSolicitudAcceso');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();

            const btnAsistente = document.getElementById('btn-asistente-exploracion');
            if (btnAsistente) {
                btnAsistente.disabled = false;
                btnAsistente.style.opacity = "1";
                btnAsistente.style.cursor = "pointer";
            }

        } else if (solicitud.estado_solicitud === 'PENDIENTE') {
            alert("⏳ El paciente aún no presiona 'AUTORIZAR Y DAR ACCESO' en la tarjeta verde de su celular.");
        } else {
            alert("❌ Código incorrecto o solicitud expirada.");
        }

    } catch (err) {
        console.error("❌ Error al validar OTP:", err.message);
        alert("Error al verificar la clave: " + err.message);
    } finally {
        btnVal.disabled = false;
        btnVal.innerText = "VALIDAR Y VER HISTORIAL";
    }
});

