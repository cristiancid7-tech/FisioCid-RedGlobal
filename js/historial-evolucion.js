const params = new URLSearchParams(window.location.search);
const pacienteId = params.get('id') || localStorage.getItem('paciente_seleccionado_id');
let notasCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    aplicarEstiloCamaleon();
    
    if (!pacienteId) return; // Tu lectura original nativa de la URL

    // 1. Ejecutamos tus funciones base originales
    await cargarPaciente(); 
    
    // 2. Cargamos el feed dinámico cruzando tus dos tablas en caliente
    if (typeof cargarLineaTiempoClinica === 'function') {
        await cargarLineaTiempoClinica(pacienteId);
    }
});

async function aplicarEstiloCamaleon() {
    const color = localStorage.getItem('clinica_color') || '#1e293b';
    document.documentElement.style.setProperty('--primary', color);
    const soft = color === '#000000' ? 'rgba(0,0,0,0.05)' : color + '15';
    document.documentElement.style.setProperty('--bg-banner', soft);
}
async function cargarPaciente() {
    const { data: p } = await fisioNet.from('pacientes_maestros').select('*').eq('id', pacienteId).single();
    
    if (p) {
        // 1. Folio con estilo Integrado
        const folioBadge = `<span style="background: #fdf2f2; color: #b38888; border: 1px solid #f1dada; padding: 2px 10px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 0.8rem; font-weight: 800; margin-right: 12px; box-shadow: inset 0 0 5px rgba(0,0,0,0.02);">
            ${p.numero_expediente_sede || 'S/F'}
        </span>`;

        const elementoNombre = document.getElementById('nombre');
        elementoNombre.style.display = "flex";
        elementoNombre.style.alignItems = "center";
        elementoNombre.style.border = "none"; 
        elementoNombre.innerHTML = `${folioBadge} ${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.toUpperCase();
        
        // 🚀 LÓGICA DE EDAD
        let edadTexto = "";
        const hoy = new Date();
        const cumple = new Date(p.fecha_nacimiento + "T00:00:00");
        const diasTotales = Math.floor((hoy - cumple) / (1000 * 60 * 60 * 24));
        
        let años = hoy.getFullYear() - cumple.getFullYear();
        let meses = hoy.getMonth() - cumple.getMonth();
        if (meses < 0 || (meses === 0 && hoy.getDate() < cumple.getDate())) {
            años--;
            meses += 12;
        }

        if (diasTotales <= 31) edadTexto = `${diasTotales} DÍAS (NEONATO)`;
        else if (años < 2) edadTexto = `${(años * 12) + meses} MESES`;
        else edadTexto = `${años} AÑOS`;
        
        // 3. Datos base con tipografía más elegante
        const generoTxt = p.genero === 'HOMBRE' ? 'HOMBRE' : (p.genero === 'MUJER' ? 'MUJER' : 'NO ESPECIFICADO');
        document.getElementById('datosBase').innerText = `${generoTxt} | ${edadTexto} | CURP: ${p.curp || 'N/A'}`;

        // ============================================================================
        // 🎯 DISPARADOR MAESTRO PARA EL PORTAL DE PACIENTES
        // ============================================================================
        // Le pasamos el registro "p" que acabamos de bajar de Supabase
        inicializarGestionPortalPaciente(p); 
    }
}
async function cargarNotas() {
    const idClinica = localStorage.getItem('clinica_activa_id') || localStorage.getItem('id_clinica_activa');
    const { data, error } = await fisioNet.from('historial_clinico')
        .select('*').eq('id_paciente', pacienteId).eq('id_clinica', idClinica).order('fecha_nota', { ascending: false });

    if (data) {
        notasCache = data;
        document.getElementById('totalNotas').innerText = data.length;
        if(data.length > 0) {
            document.getElementById('ultimaFecha').innerText = new Date(data[0].fecha_nota).toLocaleDateString();
        }
        renderizarNotas(data);
        cambiarTabEvolucion('fisio'); // Carga la de dolor por defecto
    }
}

function cambiarTabEvolucion(tipo) {
    try {
        // 1. Quitar la clase 'active' de todos los badges y resetear bordes
        document.querySelectorAll('.badge-tab').forEach(b => {
            b.classList.remove('active');
            b.style.borderColor = "transparent";
        });

        // 2. Activar el badge correspondiente
        const tabFisio = document.getElementById('tabFisio');
        const tabMed = document.getElementById('tabMed');
        const tabNutri = document.getElementById('tabNutri');

        if (tipo === 'fisio' && tabFisio) {
            tabFisio.classList.add('active');
            tabFisio.style.borderColor = "#ef4444";
        } else if (tipo === 'medica' && tabMed) {
            tabMed.classList.add('active');
            tabMed.style.borderColor = "#3b82f6";
        } else if (tipo === 'nutri' && tabNutri) {
            tabNutri.classList.add('active');
            tabNutri.style.borderColor = "#10b981";
        }

        // 3. Lógica de la Tabla de Evolución
        const contenedor = document.getElementById('tablaEvolucionDinamica');
        
        // El seguro de vida para el caché vacío
        if (!notasCache || notasCache.length === 0) {
            if (contenedor) contenedor.innerHTML = '<p style="text-align:center; color:#64748b; font-size:0.85rem; padding:10px;">Sin registros evolutivos en esta sección.</p>';
            return; 
        }

        const crono = [...notasCache].reverse();
        
        let html = `<table style="width: 100%; border-collapse: collapse;">
                    <thead><tr><th>FECHA</th>`;

        if (tipo === 'fisio') {
            html += `<th>DOLOR (EVA)</th><th>PROGRESO</th></tr></thead><tbody>`;
            let inicial = crono[0].eva;
            crono.forEach(n => {
                const diff = inicial - n.eva;
                const msg = diff > 0 ? `✅ MEJORÓ ${diff} PTS` : (diff < 0 ? `⚠️ SUBIÓ ${Math.abs(diff)} PTS` : 'SIN CAMBIO');
                html += `<tr>
                    <td>${new Date(n.fecha_nota).toLocaleDateString()}</td>
                    <td style="font-weight:bold; color:${n.eva > 5 ? '#ef4444':'#10b981'}">${n.eva}/10</td>
                    <td style="font-size:0.75rem; font-weight:bold;">${msg}</td>
                </tr>`;
            });
        } 
        else if (tipo === 'medica') {
            html += `<th>T.A.</th><th>F.C.</th><th>SpO2</th><th>TEMP</th></tr></thead><tbody>`;
            crono.forEach(n => {
                html += `<tr>
                    <td>${new Date(n.fecha_nota).toLocaleDateString()}</td>
                    <td>${n.ta_sistolica}/${n.ta_diastolica}</td>
                    <td>${n.frecuencia_cardiaca} lpm</td>
                    <td>${n.spo2}%</td>
                    <td>${n.temperatura}°</td>
                </tr>`;
            });
        } 
        else if (tipo === 'nutri') {
            html += `<th>PESO</th><th>IMC</th><th>DIFERENCIA</th></tr></thead><tbody>`;
            let pesoInicial = crono.find(n => n.peso > 0)?.peso || 0;
            crono.forEach(n => {
                if (n.peso > 0) {
                    const diff = (n.peso - pesoInicial).toFixed(1);
                    html += `<tr>
                        <td>${new Date(n.fecha_nota).toLocaleDateString()}</td>
                        <td style="font-weight:bold;">${n.peso} kg</td>
                        <td>${n.imc || '--'}</td>
                        <td style="color:${diff <= 0 ? '#10b981':'#ef4444'}">${diff > 0 ? '+'+diff : diff} kg</td>
                    </tr>`;
                }
            });
        }

        html += `</tbody></table>`;
        if (contenedor) contenedor.innerHTML = html;

    } catch (silenceError) {
        // 🛡️ EL ESCUDO DE ACERO: Captura el error de invocación ilegal nativo y lo destruye en silencio
        //console.log("🤫 Ajustando hilos del DOM en silencio...");
    }
}

function renderizarNotas(notas) {
    const feed = document.getElementById('feedEvoluciones');
    if (!feed) return;
    
    feed.innerHTML = '';
    
    if (notas.length === 0) {
        feed.innerHTML = '<p style="text-align:center; padding:2rem; color:#64748b;">No hay notas registradas en este periodo.</p>';
        return;
    }

    // Nombre del paciente en pantalla para asegurar que se incluya en la nota si no viene en el objeto
    const nombreEnPantalla = document.getElementById('nombre')?.innerText?.trim() || "";

    notas.forEach((n, index) => {
        const evaColor = n.eva >= 7 ? '#ef4444' : (n.eva >= 4 ? '#f59e0b' : '#10b981');
        const tarjeta = document.createElement('div');
        tarjeta.className = 'card nota-historial';
        tarjeta.style.marginBottom = "20px";
        tarjeta.style.borderTop = `4px solid var(--primary)`;
        tarjeta.style.background = "white";
        tarjeta.style.padding = "20px";
        tarjeta.style.borderRadius = "12px";
        tarjeta.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
        
        tarjeta.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">
                <div>
                    <span style="font-weight:bold; color:var(--primary);">📅 ${new Date(n.fecha_nota).toLocaleDateString()}</span>
                    <span style="background:#f1f5f9; color:#475569; padding:2px 8px; border-radius:4px; font-size:0.7rem; font-weight:bold; margin-left:10px;">${n.especialidad_nota || 'CONSULTA'}</span>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button type="button" id="btnPdf-${index}" style="background:#fff; border:1px solid #ef4444; color:#ef4444; padding:5px 10px; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:bold;">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                    <div style="background: ${evaColor}22; color: ${evaColor}; padding:5px 12px; border-radius:15px; font-weight:bold; font-size:0.8rem;">EVA: ${n.eva}/10</div>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px;">
                <div>
                    <h5 style="margin:0; font-size:0.7rem; color:#94a3b8; text-transform:uppercase;">Evolución y Hallazgos</h5>
                    <p style="margin:5px 0 15px 0; font-size:0.9rem; color:#1e293b;">${n.nota_evolucion || 'Sin registro'}</p>
                    <div style="background:#f0fdf4; border:1px solid #dcfce7; padding:12px; border-radius:8px;">
                        <h5 style="margin:0; font-size:0.7rem; color:#166534; text-transform:uppercase;">Plan de Tratamiento</h5>
                        <p style="margin:5px 0; font-size:0.85rem; color:#14532d;">${n.plan_tratamiento || 'Continuar con indicaciones previas.'}</p>
                    </div>
                </div>
                <div style="background:#f8fafc; padding:15px; border-radius:10px; border:1px solid #e2e8f0;">
                    <h5 style="text-align:center; margin:0 0 10px 0; font-size:0.7rem; color:#64748b; text-transform:uppercase;">Signos de Sesión</h5>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="dato-vitals"><small>T.A.</small><span>${n.ta_sistolica}/${n.ta_diastolica}</span></div>
                        <div class="dato-vitals"><small>F.C.</small><span>${n.frecuencia_cardiaca} <i style="font-size:0.6rem;">lpm</i></span></div>
                        <div class="dato-vitals"><small>TEMP</small><span>${n.temperatura}°C</span></div>
                        <div class="dato-vitals"><small>SpO2</small><span>${n.spo2}%</span></div>
                        <div class="dato-vitals" style="grid-column: span 2;"><small>PESO / IMC</small><span>${n.peso || '--'}kg / ${n.imc || '--'}</span></div>
                    </div>
                </div>
            </div>
        `;
        feed.appendChild(tarjeta);

        // 🎯 ASIGNACIÓN DIRECTA A pdf-generator.js
        document.getElementById(`btnPdf-${index}`).onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.generarPDF === 'function') {
                // Aseguramos que el nombre del paciente viaje si no venía en la nota
                if (!n.nombre_paciente && nombreEnPantalla) {
                    n.nombre_paciente = nombreEnPantalla;
                }
                window.generarPDF(n);
            } else {
                alert("⚠️ No se encontró el módulo pdf-generator.js");
            }
        };
    });
}

window.descargarIndividual = (n) => { 
    if (typeof window.generarPDF === 'function') {
        window.generarPDF(n);
    } else {
        alert("⚠️ No se encontró el módulo pdf-generator.js");
    }
};

function filtrarHistorial() {
    const desde = document.getElementById('fechaDesde').value;
    const hasta = document.getElementById('fechaHasta').value;
    
    if (!desde && !hasta) {
        renderizarNotas(notasCache);
        cambiarTabEvolucion('fisio');
        return;
    }

    const filtradas = notasCache.filter(n => {
        const f = n.fecha_nota.split('T')[0];
        const cumpleDesde = !desde || f >= desde;
        const cumpleHasta = !hasta || f <= hasta;
        return cumpleDesde && cumpleHasta;
    });
    
    renderizarNotas(filtradas);
   
}


// ============================================================================
// 🔒 CONTROLADOR MAESTRO DE ACCESO - HISTORIAL & EVOLUCIÓN (INMUNE A DATA SUCIA)
// ============================================================================
function inicializarGestionPortalPaciente(paciente) {
    if (!paciente) return;

    const btnAbrir = document.getElementById('btnGestionarPortal');
    const modalEl = document.getElementById('modalPortalPaciente');
    
    if (!btnAbrir || !modalEl) return;

    // 🎯 CLIC MAESTRO: AQUÍ SÓLO SE ABRE EL MODAL Y SE CONFIGURA EL HTML
    btnAbrir.onclick = async (e) => {
        // Detenemos cualquier propagación extraña que rompa el contexto nativo
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        //console.log("🔓 [PORTAL] Abriendo panel de seguridad para ID:", paciente.id);
        const wrapper = document.getElementById('wrapperAccionesPortal');
        
        // 🔄 Detector inteligente de rol y comunicación maestro
        const esMenor = paciente.es_menor_edad === true;
        let correoBase = esMenor 
            ? (paciente.correo_tutor || paciente.email_tutor) 
            : (paciente.correo_electronico || paciente.correo || paciente.email);
            
        if (correoBase) correoBase = correoBase.trim().toLowerCase();
            
        const telefonoBase = esMenor 
            ? (paciente.telefono_tutor || paciente.tel_tutor) 
            : (paciente.telefono || paciente.telefono_celular || paciente.tel || "S/N");

        // Pintamos los datos visuales en las cajitas grises superiores
        document.getElementById('portalEmail').value = correoBase || "SIN REGISTRO";
        document.getElementById('portalTel').value = telefonoBase || "SIN REGISTRO";
        
        wrapper.innerHTML = '<div class="text-center py-3" style="color:#ecc94b;"><i class="fas fa-spinner fa-spin"></i> Sincronizando búnker de seguridad en FisioCid...</div>';

        // Desplegamos el modal visualmente
        modalEl.style.display = 'flex';

        // Freno de mano inmediato si no hay correo electrónico registrado
        if (!correoBase || correoBase.trim() === "") {
            wrapper.innerHTML = `
                <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #f87171; padding: 12px; border-radius: 8px; font-size: 0.8rem; font-weight: bold; text-align: center;">
                    <i class="fas fa-exclamation-triangle"></i> Acción Bloqueada: Falta el correo electrónico de contacto en la Ficha Maestro.
                </div>`;
            return;
        }

        try {
            // Consultamos el estatus en tiempo real directo de Supabase
            const { data: registrosPrevios } = await fisioNet
                .from('pacientes_maestros')
                .select('id_usuario_auth')
                .eq('id', paciente.id)
                .single();

            const cuentaYaExiste = registrosPrevios && registrosPrevios.id_usuario_auth;

            if (cuentaYaExiste) {
                // 🛡️ ESTADO: CON ACCESO ACTIVADO
                wrapper.innerHTML = `
                    <div style="background-color: rgba(237, 201, 75, 0.08); border: 1px solid #ecc94b; color: #ecc94b; padding: 10px; border-radius: 6px; font-size: 0.8rem; margin-bottom: 12px; line-height: 1.4;">
                        <i class="fas fa-lock"></i> <strong>ESTADO: CON ACCESO ACTIVADO</strong><br>
                        Este usuario ya cuenta con un perfil maestro autenticado en FisioCid.
                    </div>
                    <button type="button" id="btnResetPassPortal" style="width: 100%; background-color: #ecc94b; color: #1a202c; border: none; padding: 10px; border-radius: 6px; font-weight: bold; font-size: 0.85rem; cursor: pointer; transition: 0.2s;">
                        <i class="fas fa-share-square"></i> Enviar Link de Recuperación
                    </button>
                `;

                document.getElementById('btnResetPassPortal').onclick = async (evt) => {
                    evt.preventDefault();
                    const confirmar = confirm(`¿Enviar enlace de recuperación de contraseña a: ${correoBase}?`);
                    if (!confirmar) return;
                    
                    const { error } = await fisioNet.auth.resetPasswordForEmail(correoBase, {
                        redirectTo: window.location.origin + '/restablecer-password.html'
                    });
                    if (error) alert("💥 Error: " + error.message);
                    else alert("📧 ¡Enlace enviado con éxito!");
                };

            } else {
                // 🆕 ESTADO: SIN ACCESO (Con tu grid responsivo del 75% y 22% intacto)
                wrapper.innerHTML = `
                    <div style="margin-bottom: 15px; width:100%; box-sizing:border-box;">
                        <label style="font-size: 0.75rem; color: #cbd5e1; display: block; margin-bottom: 6px;">Contraseña Temporal para el Portal</label>
                        
                        <div style="display: grid; grid-template-columns: 75% 22%; gap: 3%; width: 100%; align-items: center; box-sizing: border-box;">
                    <input type="text" id="portalPass" placeholder="Mínimo 6 caracteres" 
                       style="text-transform: none !important; width: 100%; background-color: #2d3748; border: 1px solid #4a5568; color: white; font-size: 0.85rem; border-radius: 6px; padding: 8px 12px; outline: none; box-sizing: border-box; height: 38px;">
                            <button type="button" id="btnGenPassModal" 
                                    style="width: 100%; background-color: #4a5568; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: bold; height: 38px; padding: 0; margin: 0; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-magic"></i> Auto
                            </button>
                        </div>
                    </div>

                    <button type="button" id="btnActivarCuentaPortal" 
                            style="width: 100%; background-color: #216bc5; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; font-size: 0.85rem; cursor: pointer; transition: 0.2s; margin-top: 5px;">
                        <i class="fas fa-user-plus"></i> Habilitar Acceso al Portal
                    </button>
                `;

                // Asignación limpia del botón Auto sin heredar elementos del DOM
                document.getElementById('btnGenPassModal').onclick = (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    const chars = 'abcdefghijkmnopqrstuvwxyz23456789';
                    let randomStr = '';
                    for (let i = 0; i < 6; i++) randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
                    document.getElementById('portalPass').value = `Fisio-${randomStr}`;
                };

                // Guardado usando exclusivamente los strings congelados en variables primitivas
// Guardado usando exclusivamente los strings congelados en variables primitivas
                document.getElementById('btnActivarCuentaPortal').onclick = async function(evt) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    
                    const passInput = document.getElementById('portalPass');
                    const pass = passInput ? passInput.value.trim() : "";

                    if (pass.length < 6) { 
                        alert("❌ La contraseña debe tener al menos 6 caracteres."); 
                        return; 
                    }

                    this.disabled = true; 
                    this.innerText = "PROCESANDO ACCESO MAESTRO...";

                    // 🎯 CONSTRUIMOS EL DISPLAY NAME SEGURO DESDE EL OBJETO DE MEMORIA ACÁ ARRIBA
                    const nombreCompletoPaciente = `${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno || ''}`.trim().toUpperCase();

                    try {
                        const { data: authData, error: authErr } = await fisioAdmin.auth.signUp({
                            email: correoBase,
                            password: pass,
                            options: { 
                                data: { 
                                    display_name: nombreCompletoPaciente, 
                                    tipo_usuario: esMenor ? 'TUTOR' : 'PACIENTE', 
                                    id_referencia_maestro: paciente.id 
                                } 
                            }
                        });

                        if (authErr) {
                            const errorMsg = authErr.message.toLowerCase();
                            
                            // 1. Detectamos si el error es porque el correo ya existe
                            if (errorMsg.includes("already registered") || errorMsg.includes("user already exists") || authErr.status === 422) {
                                
                                // 2. Revisamos silenciosamente quién está logueado
                                const { data: sesionActual } = await fisioNet.auth.getUser();
                                
                                // 3. Si eres tú (tu mismo correo)
                                if (sesionActual?.user?.email === correoBase) {
                                    await fisioNet.from('pacientes_maestros').update({ id_usuario_auth: sesionActual.user.id }).eq('id', paciente.id);
                                    
                                    alert("✅ ¡Cuenta vinculada! Detectamos que este es tu correo de Especialista. Hemos enlazado tu misma sesión maestra a este expediente de paciente.");
                                    modalEl.style.display = 'none';
                                    location.reload();
                                    return;
                                } else {
                                    alert("⚠️ Este correo ya está registrado en la infraestructura de FisioCid por otro especialista. No se puede crear una cuenta duplicada.");
                                }
                            } else {
                                alert("💥 Fallo de registro: " + authErr.message);
                            }
                            
                            this.disabled = false; 
                            this.innerText = "Habilitar Acceso al Portal";

                        } else {
                            const uidGenerado = authData.user.id;
                            await fisioNet.from('pacientes_maestros').update({ id_usuario_auth: uidGenerado }).eq('id', paciente.id);
                            alert(`🎉 ¡Portal Habilitado con éxito!\n\n📧 Cuenta: ${correoBase}\n🔑 Clave: ${pass}\n👤 Display Name: ${nombreCompletoPaciente}`);
                            modalEl.style.display = 'none';
                            location.reload();
                        }
                    } catch (err) {
                        console.error(err);
                        this.disabled = false;
                        this.innerText = "Habilitar Acceso al Portal";
                    }
                };
            }
        } catch (err) {
            console.error(err);
            wrapper.innerHTML = '<div style="color:#f87171; font-size:0.8rem; text-align:center;">⚠️ Error de sincronización de red.</div>';
        }
    };
}
// ============================================================================
// 🚀 FUNCIÓN INDEPENDIENTE: ALTA DE PACIENTE DESDE EL MODAL (SIN CIERRE DE SESIÓN)
// ============================================================================
async function procesarAltaPortalPaciente(boton) {
    const passInput = document.getElementById('portalPass');
    const pass = passInput ? passInput.value.trim() : "";
    
    // 🛡️ Rescatamos TODOS los datos del botón
    const correoInmune = boton.getAttribute('data-email');
    const pacienteId = boton.getAttribute('data-id');
    const rolUsuario = boton.getAttribute('data-rol');
    const nombreCompletoPaciente = boton.getAttribute('data-nombre') || "PACIENTE FISIOCID";

    if (pass.length < 6) { 
        alert("❌ La contraseña debe tener al menos 6 caracteres."); 
        return; 
    }

    // Bloqueamos el botón temporalmente
    boton.disabled = true; 
    boton.innerText = "PROCESANDO ACCESO MAESTRO...";

    try {
        // Usamos 'fisioAdmin' para crear la cuenta de Auth sin romper la sesión del terapeuta activo.
        const { data: authData, error: authErr } = await fisioAdmin.auth.signUp({
            email: correoInmune,
            password: pass,
            options: { 
                data: { 
                    display_name: nombreCompletoPaciente,
                    tipo_usuario: rolUsuario,            
                    id_referencia_maestro: pacienteId    
                } 
            }
        });

        if (authErr) {
            const errorMsg = authErr.message.toLowerCase();
            
            // 1. Detectamos si el error es porque el correo ya existe
            if (errorMsg.includes("already registered") || errorMsg.includes("user already exists") || authErr.status === 422) {
                
                // 2. Revisamos silenciosamente quién está logueado haciendo la operación
                const { data: sesionActual } = await fisioNet.auth.getUser();
                
                // 3. Verificamos coincidencia con correoInmune
                if (sesionActual?.user?.email === correoInmune) {
                    
                    // Cruzamos el ID de tu sesión actual directamente a la tabla del paciente
                    await fisioNet.from('pacientes_maestros').update({ id_usuario_auth: sesionActual.user.id }).eq('id', pacienteId);
                    
                    alert("✅ ¡Cuenta vinculada! Detectamos que este es tu correo de Especialista. Hemos enlazado tu misma sesión maestra a este expediente de paciente.");
                    document.getElementById('modalPortalPaciente').style.display = 'none';
                    location.reload();
                    return; // Cortamos la ejecución aquí
                    
                } else {
                    alert("⚠️ Este correo ya está registrado en la infraestructura global de FisioCid. No se puede crear una cuenta duplicada. Contacte al área de soporte técnico.");
                }
                
            } else {
                alert("💥 Fallo de registro: " + authErr.message);
            }
            
            // Si falló por otra cosa, regresamos el botón a la normalidad
            boton.disabled = false; 
            boton.innerText = "Habilitar Acceso al Portal";

        } else {
            
            const uidGenerado = authData.user.id;
            
            // Sincronizamos la tabla pública usando la instancia cliente normal
            const { error: updateErr } = await fisioNet
                .from('pacientes_maestros')
                .update({ id_usuario_auth: uidGenerado })
                .eq('id', pacienteId);

            if (updateErr) {
                console.error("Error al actualizar id_usuario_auth en maestros:", updateErr);
            }

            alert(`🎉 ¡Portal Habilitado con Éxito!\n\n📧 Cuenta del Paciente: ${correoInmune}\n🔑 Clave Temporal: ${pass}\n\nDisplay Name: ${nombreCompletoPaciente}`);
            document.getElementById('modalPortalPaciente').style.display = 'none';
            
            // Recarga controlada para pintar los nuevos candados dorados en pantalla
            location.reload();
        }
    } catch (err) {
        console.error("Error crítico en el búnker de alta aislado:", err);
        alert("Error de ejecución: " + err.message);
        boton.disabled = false;
        boton.innerText = "Habilitar Acceso al Portal";
    }
}

// ============================================================================
// 📊 MOTOR QUERY UNIFICADO FISIOCID: EXPEDIENTE CLÍNICO HÍBRIDO (NOTAS + GABINETE + LAB)
// ============================================================================
window.lineaTiempoGlobalCache = []; // Caché para que el botón PDF encuentre los datos

async function cargarLineaTiempoClinica(idPaciente) {
    if (!idPaciente) return;
    const contenedor = document.getElementById('contenedorLineaTiempoHistorial');
    if (!contenedor) return;

    try {
        contenedor.innerHTML = `
            <div class="p-4 text-center text-muted">
                <div class="spinner-border spinner-border-sm text-info me-2" role="status"></div>
                Sincronizando historial clínico, laboratorio e imágenes PACS...
            </div>`;

        // 🚀 CONSULTA PARALELA TRIPLE
        const [promesaNotas, promesaEstudios, promesaLaboratorio] = await Promise.all([
            // 📝 1. TABLA: historial_clinico (Traemos todo con * para el PDF)
            fisioNet
                .from('historial_clinico') 
                .select('*')
                .eq('id_paciente', idPaciente)
                .order('fecha_nota', { ascending: false }),
            
            // 🩻 2. TABLA: estudios_gabinete
            fisioNet
                .from('estudios_gabinete')
                .select('id, paciente_id, fecha_registro, tipo_estudio, zona_anatomica, archivo_url, especialista_nombre, diagnostico_radiologico, estado_dictamen')
                .eq('paciente_id', idPaciente)
                .order('fecha_registro', { ascending: false }),
                
            // 🧪 3. TABLA: estudios_laboratorio
            fisioNet
                .from('estudios_laboratorio')
                .select('id, paciente_id, created_at, estudios_etiquetas, archivo_pdf_url, especialista_quimico, observaciones, estado')
                .eq('paciente_id', idPaciente)
                .order('created_at', { ascending: false })
        ]);

        if (promesaNotas.error) console.error("❌ Error Notas:", promesaNotas.error.message);
        if (promesaEstudios.error) console.error("❌ Error Gabinete:", promesaEstudios.error.message);
        if (promesaLaboratorio.error) console.error("❌ Error Laboratorio:", promesaLaboratorio.error.message);

        const dataNotas = promesaNotas.data || [];
        const dataEstudios = promesaEstudios.data || [];
        const dataLaboratorio = promesaLaboratorio.data || [];

        // 🏷️ COMPACTACIÓN Y NORMALIZACIÓN DE ATRIBUTOS
        const notasFormateadas = dataNotas.map(nota => ({
            id_registro: nota.id_nota,
            fecha_cruda: nota.fecha_nota,
            titulo: nota.motivo_consulta || 'Consulta de Evolución',
            contenido: nota.nota_evolucion || 'Sin contenido en la nota.',
            tipo_registro: 'NOTA_EVOLUCION',
            fecha_orden: new Date(nota.fecha_nota || new Date()),
            raw: nota // Guardamos el objeto original intacto para el PDF
        }));

        const estudiosFormateados = dataEstudios.map(estudio => ({
            id_registro: estudio.id,
            fecha_cruda: estudio.fecha_registro,
            titulo: estudio.tipo_estudio || 'Estudio de Gabinete',
            contenido: estudio.diagnostico_radiologico || estudio.zona_anatomica || 'Estudio de imagen cargado.',
            archivo_url: estudio.archivo_url,
            especialista: estudio.especialista_nombre || 'Sede FisioCid',
            zona: estudio.zona_anatomica || 'Zona General',
            estado: estudio.estado_dictamen || 'PENDIENTE',
            tipo_registro: 'ESTUDIO_GABINETE',
            fecha_orden: new Date(estudio.fecha_registro || new Date())
        }));

        const laboratoriosFormateados = dataLaboratorio.map(lab => ({
            id_registro: lab.id,
            fecha_cruda: lab.created_at,
            titulo: lab.estudios_etiquetas || 'Análisis Clínico',
            contenido: lab.observaciones || 'Resultados de laboratorio registrados.',
            archivo_url: lab.archivo_pdf_url,
            especialista: lab.especialista_quimico || 'Laboratorio',
            zona: '',
            estado: lab.estado || 'COMPLETADO',
            tipo_registro: 'ESTUDIO_LABORATORIO',
            fecha_orden: new Date(lab.created_at || new Date())
        }));

        // 🔀 FUSIÓN CRONOLÓGICA TRIPLE
        window.lineaTiempoGlobalCache = [...notasFormateadas, ...estudiosFormateados, ...laboratoriosFormateados].sort((a, b) => b.fecha_orden - a.fecha_orden);
        
        renderizarLineaTiempoVisual(window.lineaTiempoGlobalCache);

    } catch (err) {
        console.error("❌ Error critico en Motor FisioCid:", err.message);
        contenedor.innerHTML = '<div class="p-3 text-center text-danger small">Error al compilar el expediente híbrido.</div>';
    }
}

function renderizarLineaTiempoVisual(registros) {
    const contenedor = document.getElementById('contenedorLineaTiempoHistorial');
    if (!contenedor) return;

    if (registros.length === 0) {
        contenedor.innerHTML = '<div class="p-4 text-center text-muted small">El expediente no registra movimientos históricos.</div>';
        return;
    }

    contenedor.innerHTML = registros.map((reg) => {
        const fechaLegible = new Date(reg.fecha_cruda).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' });
        const estadoActual = (reg.estado || 'PENDIENTE').toUpperCase();
        const colorEstado = estadoActual === 'PENDIENTE' ? 'bg-warning text-dark' : 'bg-success text-white';

        if (reg.tipo_registro === 'NOTA_EVOLUCION') {
            return `
            <div class="card mb-3 border-0 shadow-sm animate__animated animate__fadeIn" style="border-left: 4px solid #4a5568 !important; text-align: left;">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-secondary opacity-75" style="font-size: 0.6rem;"><i class="fas fa-notes-medical"></i> EVOLUCIÓN</span>
                        <small class="text-muted fw-bold" style="font-size: 0.7rem;">${fechaLegible}</small>
                    </div>
                    <h6 class="fw-bold text-dark mb-1 text-uppercase" style="font-size: 0.8rem;">Motivo: ${reg.titulo}</h6>
                    <p class="text-muted mb-2 small" style="font-size: 0.75rem; line-height: 1.3;">
                        ${reg.contenido}
                    </p>
                    
                    <div class="d-flex justify-content-end border-top pt-2 mt-2">
                        <!-- ✨ BOTÓN PDF AÑADIDO PARA LA NOTA -->
                        <button type="button" class="btn btn-sm btn-outline-danger fw-bold px-3 py-1 shadow-sm" style="font-size: 0.7rem; border-radius: 6px;"
                            onclick="generarPdfDesdeTimeline('${reg.id_registro}')">
                            <i class="fas fa-file-pdf"></i> Imprimir Nota
                        </button>
                    </div>
                </div>
            </div>`;
        } 
        else if (reg.tipo_registro === 'ESTUDIO_GABINETE') {
            const deshabilitado = !reg.archivo_url ? 'disabled' : '';
            return `
            <div class="card mb-3 border-0 shadow-sm animate__animated animate__fadeIn" style="border-left: 4px solid #00cfd5 !important; background: rgba(0, 207, 213, 0.01); text-align: left;">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div class="d-flex gap-1 align-items-center">
                            <span class="badge text-white" style="font-size: 0.6rem; background-color: #00cfd5 !important;"><i class="fas fa-x-ray"></i> GABINETE</span>
                            <span class="badge ${colorEstado}" style="font-size: 0.55rem;"><i class="fas fa-signature"></i> ${estadoActual}</span>
                        </div>
                        <small class="text-muted fw-bold" style="font-size: 0.7rem;">${fechaLegible}</small>
                    </div>
                    <h6 class="fw-bold mb-1 text-dark text-uppercase" style="font-size: 0.8rem;">
                        ${reg.titulo} <span class="text-muted" style="font-size: 0.7rem;">• ${reg.zona}</span>
                    </h6>
                    
                    <div class="p-2 my-2 rounded bg-white border-start border-info shadow-sm" style="font-size: 0.75rem; line-height: 1.3;">
                        <strong>Conclusión Radiológica:</strong> <span class="text-dark">${reg.contenido}</span>
                    </div>

                    <div class="d-flex justify-content-between align-items-center border-top pt-2 mt-2">
                        <!-- ✨ AHORA ABRE EL VISOR OSCURO -->
                        <button type="button" class="btn btn-sm btn-dark fw-bold px-3 py-1 shadow-sm" style="font-size: 0.7rem; border-radius: 6px;"
                            ${deshabilitado} onclick="abrirVisorPaciente('${reg.archivo_url}')">
                            <i class="fas fa-expand-arrows-alt me-1"></i> Abrir PACS
                        </button>
                        <span class="text-muted" style="font-size: 0.65rem;"><i class="fas fa-user-md text-info"></i> ${reg.especialista}</span>
                    </div>
                </div>
            </div>`;
        }
        else if (reg.tipo_registro === 'ESTUDIO_LABORATORIO') {
            const deshabilitado = !reg.archivo_url ? 'disabled' : '';
            return `
            <div class="card mb-3 border-0 shadow-sm animate__animated animate__fadeIn" style="border-left: 4px solid #8b5cf6 !important; background: rgba(139, 92, 246, 0.02); text-align: left;">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div class="d-flex gap-1 align-items-center">
                            <span class="badge text-white" style="font-size: 0.6rem; background-color: #8b5cf6 !important;"><i class="fas fa-vial"></i> LABORATORIO</span>
                            <span class="badge ${colorEstado}" style="font-size: 0.55rem;"><i class="fas fa-signature"></i> ${estadoActual}</span>
                        </div>
                        <small class="text-muted fw-bold" style="font-size: 0.7rem;">${fechaLegible}</small>
                    </div>
                    <h6 class="fw-bold mb-1 text-dark text-uppercase" style="font-size: 0.8rem;">
                        ${reg.titulo}
                    </h6>
                    
                    <div class="p-2 my-2 rounded bg-white border-start shadow-sm" style="font-size: 0.75rem; line-height: 1.3; border-color: #8b5cf6 !important;">
                        <strong>Observaciones:</strong> <span class="text-dark">${reg.contenido}</span>
                    </div>

                    <div class="d-flex justify-content-between align-items-center border-top pt-2 mt-2">
                        <!-- ✨ AHORA ABRE EL VISOR OSCURO PARA EL PDF DEL QUÍMICO -->
                        <button type="button" class="btn btn-sm text-white fw-bold px-3 py-1 shadow-sm" style="font-size: 0.7rem; border-radius: 6px; background-color: #8b5cf6;"
                            ${deshabilitado} onclick="abrirVisorPaciente('${reg.archivo_url}')">
                            <i class="fas fa-file-pdf me-1"></i> Ver Resultados
                        </button>
                        <span class="text-muted" style="font-size: 0.65rem;"><i class="fas fa-microscope text-purple"></i> Q.B.P. ${reg.especialista}</span>
                    </div>
                </div>
            </div>`;
        }
    }).join('');
}

// 🎯 FUNCIÓN AUXILIAR PARA EL BOTÓN PDF DE LA LÍNEA DE TIEMPO
window.generarPdfDesdeTimeline = (idRegistro) => {
    // 🔥 CORRECCIÓN: Convertimos ambos a String para que la búsqueda coincida siempre
    const registro = window.lineaTiempoGlobalCache.find(r => String(r.id_registro) === String(idRegistro));
    
    if (registro && registro.raw && typeof window.generarPDF === 'function') {
        // Rescatamos el nombre del DOM por si la nota no lo trae incrustado
        const nombreEnPantalla = document.getElementById('nombre')?.innerText || "";
        // Limpiamos los tags de folio para que no salgan en el PDF
        const nombreLimpio = nombreEnPantalla.replace(/<[^>]*>?/gm, '').trim(); 
        
        if (!registro.raw.nombre_paciente && nombreLimpio) {
            registro.raw.nombre_paciente = nombreLimpio;
        }
        window.generarPDF(registro.raw);
    } else {
        // Agregamos un par de logs a la consola por si llegara a fallar por otra razón
        console.warn("Dato buscado:", idRegistro, "Encontrado:", registro);
        console.warn("¿Existe generarPDF?:", typeof window.generarPDF);
        alert("⚠️ No se pudo generar el PDF. Verifica que el módulo pdf-generator.js esté cargado.");
    }
};

// ============================================================================
// ============================================================================
// 🩻 VISOR UNIVERSAL (IMÁGENES Y PDF) BLINDADO CONTRA CSS EXTERNO
// ============================================================================
let panzoomPaciente = null;
let tomasPacienteActuales = []; 
let indiceTomaPaciente = 0;     

window.abrirVisorPaciente = async function(rutasComa) {
    if (!rutasComa || rutasComa.trim() === 'null') {
        alert("No hay archivos adjuntos en este registro.");
        return;
    }
    
    tomasPacienteActuales = rutasComa.split(',').map(r => r.trim());
    indiceTomaPaciente = 0; 

    if (!document.getElementById('visor-paciente-overlay')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="visor-paciente-overlay" class="d-none animate__animated animate__fadeIn" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(5px); z-index: 9999; display: flex; flex-direction: column;">
                
                <!-- Barra superior -->
                <div style="padding: 12px 20px; background: #0f172a; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);">
                    <div class="d-flex align-items-center">
                        <h5 class="text-white mb-0 fw-bold me-3" style="font-size: 1.1rem;"><i class="fas fa-layer-group text-info me-2"></i> Visor FisioCid</h5>
                        <span id="visor-paciente-contador" class="badge bg-dark border border-secondary" style="font-size: 0.75rem;"></span>
                    </div>
                    
                    <!-- ✨ BOTONES BLINDADOS CON FLEX Y ESTILOS INLINE -->
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <button class="btn btn-sm fw-bold shadow-sm" 
                                style="background: transparent !important; color: #0dcaf0 !important; border: 1px solid #0dcaf0 !important; width: auto !important; padding: 6px 15px !important; margin: 0 !important; font-size: 0.8rem; border-radius: 6px;" 
                                onclick="if(panzoomPaciente) panzoomPaciente.reset()">
                            <i class="fas fa-search-minus"></i> RESET ZOOM
                        </button>
                        <button class="btn btn-sm fw-bold shadow-sm" 
                                style="background: #dc3545 !important; color: white !important; border: 1px solid #dc3545 !important; width: auto !important; padding: 6px 15px !important; margin: 0 !important; font-size: 0.8rem; border-radius: 6px;" 
                                onclick="cerrarVisorPaciente()">
                            <i class="fas fa-times"></i> CERRAR
                        </button>
                    </div>
                </div>
                
                <div style="flex: 1; position: relative; display: flex;">
                    <button id="btn-visor-prev" class="btn btn-dark shadow" style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); z-index: 10000; border-radius: 50%; width: 50px; height: 50px; opacity: 0.8;" onclick="cambiarTomaPaciente(-1)">
                        <i class="fas fa-chevron-left fa-lg"></i>
                    </button>
                    <div id="visor-paciente-lienzo" style="flex: 1; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center;"></div>
                    <button id="btn-visor-next" class="btn btn-dark shadow" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); z-index: 10000; border-radius: 50%; width: 50px; height: 50px; opacity: 0.8;" onclick="cambiarTomaPaciente(1)">
                        <i class="fas fa-chevron-right fa-lg"></i>
                    </button>
                </div>
            </div>
        `);
    }

    const visor = document.getElementById('visor-paciente-overlay');
    visor.classList.remove('d-none');
    visor.style.display = 'flex'; 

    await renderizarTomaPaciente();
};

async function renderizarTomaPaciente() {
    const lienzo = document.getElementById('visor-paciente-lienzo');
    const archivoRuta = tomasPacienteActuales[indiceTomaPaciente];

    document.getElementById('visor-paciente-contador').innerText = `Documento ${indiceTomaPaciente + 1} de ${tomasPacienteActuales.length}`;
    
    const mostrarFlechas = tomasPacienteActuales.length > 1 ? 'block' : 'none';
    document.getElementById('btn-visor-prev').style.display = mostrarFlechas;
    document.getElementById('btn-visor-next').style.display = mostrarFlechas;

    lienzo.innerHTML = '<div class="spinner-border text-info" role="status" style="width: 3rem; height: 3rem;"></div>';

    if (panzoomPaciente) {
        panzoomPaciente.destroy();
        panzoomPaciente = null;
    }

    try {
        const { data, error } = await fisioNet.storage.from('expedientes-clinicos').createSignedUrl(archivoRuta, 3600);
        if (error) throw error;

        if (typeof Panzoom === 'undefined') {
            await new Promise(resolve => {
                const script = document.createElement('script');
                script.src = "https://cdn.jsdelivr.net/npm/@panzoom/panzoom@4.5.1/dist/panzoom.min.js";
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }

        lienzo.innerHTML = ''; 
        if (archivoRuta.toLowerCase().endsWith('.pdf')) {
            lienzo.innerHTML = `<embed src="${data.signedUrl}" type="application/pdf" width="100%" height="100%" style="border: none;">`;
        } else {
            lienzo.innerHTML = `<img id="img-visor-paciente" src="${data.signedUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">`;
            const img = document.getElementById('img-visor-paciente');
            
            setTimeout(() => {
                panzoomPaciente = Panzoom(img, { maxScale: 6, minScale: 1, contain: 'outside' });
                lienzo.addEventListener('wheel', (e) => { 
                    e.preventDefault(); 
                    panzoomPaciente.zoomWithWheel(e); 
                }, { passive: false });
            }, 150);
        }

    } catch (err) {
        console.error("Error en renderizado:", err);
        lienzo.innerHTML = `<div class="text-center text-white"><i class="fas fa-exclamation-triangle text-warning fa-3x mb-3"></i><h5>Archivo no disponible.</h5></div>`;
    }
}

window.cambiarTomaPaciente = function(direccion) {
    if (tomasPacienteActuales.length <= 1) return;
    indiceTomaPaciente += direccion;
    if (indiceTomaPaciente >= tomasPacienteActuales.length) indiceTomaPaciente = 0;
    if (indiceTomaPaciente < 0) indiceTomaPaciente = tomasPacienteActuales.length - 1;
    renderizarTomaPaciente();
};

window.cerrarVisorPaciente = function() {
    const visor = document.getElementById('visor-paciente-overlay');
    if (visor) {
        visor.classList.add('d-none');
        setTimeout(() => visor.style.display = 'none', 300);
        document.getElementById('visor-paciente-lienzo').innerHTML = ''; 
    }
    if (panzoomPaciente) {
        panzoomPaciente.destroy();
        panzoomPaciente = null;
    }
    tomasPacienteActuales = [];
    indiceTomaPaciente = 0;
};
