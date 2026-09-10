// A) LIMPIAR PERMISOS AL CARGAR LA PÁGINA (Si vienes de la lista de pacientes, se reinicia la seguridad)
document.addEventListener('DOMContentLoaded', () => {
    const idPacienteLimpio = idPaciente || window.pacienteCargado?.id;
    if (idPacienteLimpio) {
        // Al entrar a una nueva consulta/recargar, eliminamos el pase anterior
        sessionStorage.removeItem(`otp_aprobado_paciente_${idPacienteLimpio}`);
    }
});

// B) LIMPIAR PERMISOS AL CERRAR O SALIR DE LA PÁGINA
window.addEventListener('beforeunload', () => {
    const idPacienteLimpio = idPaciente || window.pacienteCargado?.id;
    if (idPacienteLimpio) {
        sessionStorage.removeItem(`otp_aprobado_paciente_${idPacienteLimpio}`);
    }
});

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
                alergias: document.getElementById('alergias').value,
                antecedentes_quirurgicos: document.getElementById('quirurgicos').value,
                antecedentes_patologicos: document.getElementById('cronicos').value,
                farmacologia_activa: document.getElementById('medicamentos').value,
                ocupacion: document.getElementById('ocupacion').value
            }).eq('id', idPaciente);

            // 4. CREAR NUEVA NOTA
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

            // 5. IMPRESIÓN OPCIONAL
            const deseaImprimir = confirm("✅ ¡Consulta guardada! ¿Deseas generar la receta/reporte en PDF?");
            if (deseaImprimir && typeof window.generarPDF === 'function') {
                await window.generarPDF(nuevaNota); 
            }

            // 6. 🔒 LIMPIAR PERMISO OTP Y REDIRIGIR AL FINAL DE TODO
            const idPacienteLimpio = idPaciente || window.pacienteCargado?.id;
            if (idPacienteLimpio) {
                sessionStorage.removeItem(`otp_aprobado_paciente_${idPacienteLimpio}`);
            }

            window.location.href = 'lista-pacientes.html';

        } catch (error) {
            alert("Error al guardar: " + error.message);
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
        console.log("🔓 [SESIÓN REUTILIZADA]: Paciente ya autorizado previamente. Abriendo visor sin OTP...");
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

        console.log("🔑 Generando nuevo OTP ->", codigoOTP);

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
            const btnAsistente = document.getElementById('btn-asistente-exploracion');
            if (btnAsistente) {
                btnAsistente.disabled = false;
                btnAsistente.style.opacity = "1";
                btnAsistente.style.cursor = "pointer";
            }

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
// 📑 CARGAR Y MOSTRAR CONTENIDO DEL EXPEDIENTE DENTRO DEL MODAL
// ============================================================================
async function cargarYMostrarVisorExpediente(pacienteId) {
    const contenedorNotas = document.getElementById('listaNotasHistorial');
    const contenedorImagen = document.getElementById('listaEstudiosImagen');
    const contenedorLab = document.getElementById('listaEstudiosLab');

    // 1. Mostrar modal inmediatamente en estado de carga
    const modalVisorEl = document.getElementById('modalVisorExpediente');
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalVisorEl);
    modalInstance.show();

    try {
        // A) CONSULTAR HISTORIAL CLÍNICO (NOTAS)
        const { data: notas } = await fisioNet
            .from('historial_clinico')
            .select('*')
            .eq('id_paciente', pacienteId)
            .order('fecha_nota', { ascending: false });

        if (contenedorNotas) {
            if (notas && notas.length > 0) {
                contenedorNotas.innerHTML = notas.map(n => `
                    <div class="card border-0 shadow-sm p-3 style="border-left: 5px solid var(--primary) !important;">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="badge bg-dark">${new Date(n.fecha_nota).toLocaleDateString('es-MX')}</span>
                            <span class="fw-bold text-primary small">${n.diagnostico_principal || 'SIN DIAGNÓSTICO'} (${n.codigo_cie10 || 'N/A'})</span>
                        </div>
                        <p class="mb-1 small"><strong>Motivo:</strong> ${n.motivo_consulta || 'N/A'}</p>
                        <p class="mb-1 small"><strong>Exploración:</strong> ${n.exploracion_fisica || 'N/A'}</p>
                        <p class="mb-2 small"><strong>Tratamiento:</strong> ${n.plan_tratamiento || 'N/A'}</p>
                        <button type="button" class="btn btn-sm btn-outline-primary fw-bold" 
                                onclick="inyectardatoEnConsulta('exploracion', 'HISTORIAL PREVIO (${new Date(n.fecha_nota).toLocaleDateString()}): ${n.exploracion_fisica || ''}')">
                            ➕ Inyectar Exploración a la Nota
                        </button>
                    </div>
                `).join('');
            } else {
                contenedorNotas.innerHTML = `<div class="alert alert-info">Sin notas de evolución registradas previamente.</div>`;
            }
        }

        // B) CONSULTAR ESTUDIOS DE GABINETE (IMAGEN Y LABS)
        const { data: estudios } = await fisioNet
            .from('estudios_gabinete')
            .select('*')
            .eq('paciente_id', pacienteId)
            .order('fecha_registro', { ascending: false });

        if (estudios && estudios.length > 0) {
            const imagenes = estudios.filter(e => e.tipo_estudio !== 'LABORATORIO CLÍNICO');
            const laboratorios = estudios.filter(e => e.tipo_estudio === 'LABORATORIO CLÍNICO');

            // Render Imagenología
            if (contenedorImagen) {
                contenedorImagen.innerHTML = imagenes.length > 0 ? imagenes.map(img => `
                    <div class="col-md-6">
                        <div class="card h-100 shadow-sm p-3">
                            <h6 class="fw-bold text-primary mb-1">${img.tipo_estudio}</h6>
                            <span class="text-muted small mb-2">${new Date(img.fecha_registro).toLocaleDateString('es-MX')}</span>
                            <p class="small text-dark fw-bold mb-2">${img.hallazgos_resumen}</p>
                            ${img.archivo_url ? `<a href="${img.archivo_url}" target="_blank" class="btn btn-sm btn-warning fw-bold mb-2">🔗 Ver Archivo / PACS</a>` : ''}
                            <button type="button" class="btn btn-sm btn-outline-dark fw-bold mt-auto" 
                                    onclick="inyectardatoEnConsulta('exploracion', 'ESTUDIO (${img.tipo_estudio}): ${img.hallazgos_resumen}')">
                                ➕ Copiar Hallazgos a la Consulta
                            </button>
                        </div>
                    </div>
                `).join('') : `<div class="alert alert-info">Sin estudios de imagenología registrados.</div>`;
            }

            // Render Laboratorios
            if (contenedorLab) {
                contenedorLab.innerHTML = laboratorios.length > 0 ? laboratorios.map(lab => `
                    <div class="col-md-6">
                        <div class="card h-100 shadow-sm p-3">
                            <h6 class="fw-bold text-danger mb-1">🧪 ${lab.tipo_estudio}</h6>
                            <span class="text-muted small mb-2">${new Date(lab.fecha_registro).toLocaleDateString('es-MX')}</span>
                            <p class="small text-dark mb-2">${lab.hallazgos_resumen}</p>
                            ${lab.archivo_url ? `<a href="${lab.archivo_url}" target="_blank" class="btn btn-sm btn-danger fw-bold mb-2">🔗 Ver Resultados PDF</a>` : ''}
                            <button type="button" class="btn btn-sm btn-outline-danger fw-bold mt-auto" 
                                    onclick="inyectardatoEnConsulta('sintomas', 'LABORATORIO (${new Date(lab.fecha_registro).toLocaleDateString()}): ${lab.hallazgos_resumen}')">
                                ➕ Copiar a Síntomas / Acompañantes
                            </button>
                        </div>
                    </div>
                `).join('') : `<div class="alert alert-info">Sin exámenes de laboratorio registrados.</div>`;
            }

        } else {
            if (contenedorImagen) contenedorImagen.innerHTML = `<div class="alert alert-info">Sin archivos multimedia de imagen.</div>`;
            if (contenedorLab) contenedorLab.innerHTML = `<div class="alert alert-info">Sin informes de laboratorio.</div>`;
        }

    } catch (e) {
        console.error("💥 Error al recuperar el visor:", e);
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

            console.log(`📸 El paciente cuenta con ${estudios.length} estudios cargados en gabinete.`);

            // Notificación visual rápida en la interfaz para el doctor
            const divNotif = document.createElement('div');
            divNotif.className = 'alert alert-warning border-0 shadow-sm d-flex justify-content-between align-items-center mb-3';
            divNotif.style.borderRadius = '12px';
            divNotif.innerHTML = `
                <div>
                    <strong>📂 ESTUDIO REGISTRADO (${fecha}):</strong> 
                    ${ultimo.tipo_estudio} - <em>${ultimo.hallazgos_resumen.substring(0, 80)}...</em>
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