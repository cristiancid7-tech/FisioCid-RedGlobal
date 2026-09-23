// Verificar estado de sesión al cargar la página
async function verificarSesionSegura() {
    // 1. Verificar sesión activa con Supabase
    const { data: { session } } = await fisioNet.auth.getSession();
    const clinicaActiva = localStorage.getItem('id_clinica_activa');

    // Si no hay sesión válida o faltan credenciales locales
    if (!session || !clinicaActiva) {
        // Limpiar memoria residual por seguridad
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirigir usando replace() para que no se guarde el dashboard en la pila del navegador
        window.location.replace("index.html"); // Cambia por el nombre de tu archivo de Login
    }
}

// Ejecutar verificación de inmediato
verificarSesionSegura();

async function comprobarConfiguracionInicialRequerida() {
    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return;

        const { data: perfil } = await fisioNet
            .from('perfiles_profesionales')
            .select('costo_consulta_base, horario_atencion')
            .eq('id', user.id)
            .maybeSingle();

        const modal = document.getElementById('modalConfigInicial');
        if (!modal) return;

        if (!perfil || !perfil.costo_consulta_base || !perfil.horario_atencion) {
            modal.style.display = 'flex';
        } else {
            modal.style.display = 'none';
        }
    } catch (err) {
        console.error("Error al verificar configuracion inicial:", err);
    }
}
async function actualizarInterfazSede() {
    const labelSede = document.getElementById('txtSedeActual') || document.getElementById('sedeActivaTexto'); 
    const txtEspUI = document.getElementById('txtEspecialidadUsuario');
    const sedeElegidaNombre = localStorage.getItem('nombre_clinica');
    const clinicaId = localStorage.getItem('id_clinica_activa');

    if (sedeElegidaNombre && labelSede) {
        labelSede.innerText = `SEDE ACTIVA: ${sedeElegidaNombre.toUpperCase()}`;
    }

    const colorSede = localStorage.getItem('clinica_color');
    if (colorSede) {
        document.querySelectorAll('.btn-principal').forEach(btn => {
            btn.style.backgroundColor = colorSede;
        });
    }

    try {
        // 1. Obtener la sesión activa en tiempo real (evita IDs nulos)
        const { data: { user } } = await fisioNet.auth.getUser();
        
        if (user) {
            localStorage.setItem('usuarioId', user.id);

            // 2. Consulta a la tabla maestra de perfiles
            const { data: perfil, error: errPerfil } = await fisioNet
                .from('perfiles_profesionales')
                .select('especialidad') 
                .eq('id', user.id)
                .maybeSingle();

            if (errPerfil) console.error("Error al consultar especialidad:", errPerfil);

            if (perfil && perfil.especialidad) {
                const especialidadReal = perfil.especialidad.toUpperCase().trim();
                
                // Actualizar UI y almacenamiento local
                localStorage.setItem('especialidadUsuario', especialidadReal);
                if (txtEspUI) {
                    txtEspUI.innerText = especialidadReal;
                }
            } else if (clinicaId) {
                // Fallback a colaboradores
                const { data: colaborador } = await fisioNet
                    .from('colaboradores_clinica')
                    .select('cargo_clinico')
                    .eq('id_profesional', user.id)
                    .eq('id_clinica', clinicaId)
                    .maybeSingle();

                const cargoFinal = colaborador?.cargo_clinico 
                    ? colaborador.cargo_clinico.toUpperCase().trim() 
                    : "ESPECIALISTA";

                localStorage.setItem('especialidadUsuario', cargoFinal);
                if (txtEspUI) txtEspUI.innerText = cargoFinal;
            }
        }
    } catch (err) {
        console.error("❌ Error al recuperar especialidad en dashboard:", err);
    }
}

function procesarNombreMexicano(textoCompleto) {
    const conectores = ["DE", "DEL", "LA", "LAS", "LOS", "SAN", "SANTA"];
    let palabras = textoCompleto.toUpperCase().trim().split(/\s+/);
    let piezas = [];
    for (let i = 0; i < palabras.length; i++) {
        if (conectores.includes(palabras[i]) && i + 1 < palabras.length) {
            piezas.push(palabras[i] + " " + palabras[i + 1]);
            i++;
        } else { piezas.push(palabras[i]); }
    }
    let nombre = "", paterno = "", materno = "";
    const n = piezas.length;
    if (n >= 3) {
        materno = piezas[n - 1]; paterno = piezas[n - 2];
        nombre = piezas.slice(0, n - 2).join(" ");
    } else if (n === 2) {
        nombre = piezas[0]; paterno = piezas[1];
    } else { nombre = piezas[0] || ""; }
    return { nombre, paterno, materno };
}

function formatearFechaCorta(fechaStr) {
    return new Date(fechaStr + "T00:00:00").toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
}

const cargarEstadisticas = async () => {
    const clinicaId = localStorage.getItem('id_clinica_activa'); 
    if (!clinicaId) return;

    const hoy = new Date().toISOString().split('T')[0];
    
    try {
        const { count: totalPacientes } = await fisioNet
            .from('vinculos_clinicos')
            .select('*', { count: 'exact', head: true })
            .eq('id_clinica', clinicaId);

        const { count: citasHoy } = await fisioNet
            .from('agenda_maestra')
            .select('*', { count: 'exact', head: true })
            .eq('id_clinica', clinicaId)
            .eq('fecha', hoy)
            .neq('estado', 'CANCELADO');

        const { data: insumos } = await fisioNet
            .from('inventario_insumos')
            .select('precio_costo, cantidad_actual, stock_minimo')
            .eq('id_clinica', clinicaId);

        let inversionTotal = 0;
        let contadorCriticos = 0;

        if (insumos) {
            insumos.forEach(item => {
                inversionTotal += (Number(item.precio_costo) || 0) * (Number(item.cantidad_actual) || 0);
                if (Number(item.cantidad_actual) <= Number(item.stock_minimo)) contadorCriticos++;
            });
        }

        if (document.getElementById('totalPacientes')) {
            document.getElementById('totalPacientes').innerText = totalPacientes || 0;
        }
        
        if (document.getElementById('citasHoy')) {
            document.getElementById('citasHoy').innerText = citasHoy || 0;
        }

        if (document.getElementById('insumosBajos')) {
            const el = document.getElementById('insumosBajos');
            el.innerText = contadorCriticos;
            el.style.color = contadorCriticos > 0 ? '#ef4444' : '#64748b';
        }

    } catch (error) {
        console.error("❌ Error en estadísticas FisioCid:", error);
    }
};

async function aplicarIdentidadVisual() {
    let clinicaId = localStorage.getItem('id_clinica_activa');
    let colorClinica = localStorage.getItem('clinica_color');
    let nombreClinica = localStorage.getItem('nombre_clinica');
    let logoClinica = localStorage.getItem('clinica_logo');

    if (clinicaId && (!colorClinica || colorClinica === 'null' || !logoClinica)) {
        const { data: clinica } = await fisioNet
            .from('clinicas')
            .select('color_institucional, nombre_clinica, logo_url')
            .eq('id', clinicaId)
            .single();

        if (clinica) {
            colorClinica = clinica.color_institucional;
            nombreClinica = clinica.nombre_clinica;
            logoClinica = clinica.logo_url;

            localStorage.setItem('clinica_color', colorClinica);
            localStorage.setItem('nombre_clinica', nombreClinica);
            localStorage.setItem('clinica_logo', logoClinica);
        }
    }

    if (colorClinica) {
        document.documentElement.style.setProperty('--medical-blue', colorClinica);
        document.documentElement.style.setProperty('--primary', colorClinica);
        document.querySelectorAll('.btn-principal, .stat-card i').forEach(el => {
            el.style.color = colorClinica;
        });
    }

    if (nombreClinica) {
        const txtSede = document.getElementById('txtSedeActual') || document.getElementById('sedeActivaTexto');
        if (txtSede) txtSede.innerText = `SEDE ACTIVA: ${nombreClinica.toUpperCase()}`;
    }
    
    const imgLogo = document.getElementById('logoClinicaDashboard');
    if (imgLogo) {
        if (logoClinica && logoClinica !== 'null' && logoClinica !== '') {
            imgLogo.src = logoClinica;
            imgLogo.style.display = 'block';
            imgLogo.onerror = () => { imgLogo.style.display = 'none'; };
        } else {
            imgLogo.style.display = 'none';
        }
    }
}

function renderizarCitas(citas, modo) {
    const lista = document.getElementById('listaAgenda');
    if (!lista) return;
    lista.innerHTML = '';

    if (!citas || citas.length === 0) {
        lista.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; background: #f8fafc; border-radius: 12px; border: 2px dashed #cbd5e1; margin: 10px 0; width: 100%;">
                <p style="color: #94a3b8; font-size: 0.85rem; font-weight: 600; margin: 0;">📅 No hay citas agendadas para este periodo.</p>
            </div>`;
        return;
    }

    const calcularEdadPorCurp = (curp) => {
        if (!curp || curp.length < 10) return "";
        try {
            const añoCorto = parseInt(curp.substring(4, 6));
            const mes = parseInt(curp.substring(6, 8)) - 1;
            const dia = parseInt(curp.substring(8, 10));
            const añoCompleto = añoCorto < 30 ? 2000 + añoCorto : 1900 + añoCorto;
            const fechaNac = new Date(añoCompleto, mes, dia);
            const hoy = new Date();
            let edad = hoy.getFullYear() - fechaNac.getFullYear();
            const diferenciaMeses = hoy.getMonth() - fechaNac.getMonth();
            if (diferenciaMeses < 0 || (diferenciaMeses === 0 && hoy.getDate() < fechaNac.getDate())) {
                edad--;
            }
            return isNaN(edad) ? "" : `• 🕒 ${edad} años`;
        } catch (e) { return ""; }
    };

    let ultimaFecha = "";
    citas.forEach(cita => {
        if (modo === 'semana' && cita.fecha !== ultimaFecha) {
            ultimaFecha = cita.fecha;
            const divDia = document.createElement('div');
            divDia.style.cssText = "font-size: 0.75rem; font-weight: 800; color: #64748b; letter-spacing: 0.5px; padding: 12px 5px 6px 5px; text-transform: uppercase; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #f1f5f9; margin-top: 10px; width: 100%;";
            divDia.innerHTML = `<i class="far fa-calendar-alt" style="color: var(--primary);"></i> ${new Date(cita.fecha + "T00:00:00").toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}`;
            lista.appendChild(divDia);
        }

        const p = cita.pacientes_maestros || { nombre: 'Paciente', apellido_paterno: 'Registrado', id: '' };
        const nombreCompletoPaciente = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.trim().toUpperCase();
        const etiquetaEdad = calcularEdadPorCurp(p.curp);

        const esConsultorio = cita.modalidad === 'CONSULTORIO';
        const colorLateral = esConsultorio ? '#10b981' : '#3b82f6';
        const fondoBadge = esConsultorio ? '#e6f4ea' : '#e8f0fe';
        
        const montoBaseCita = cita.monto_total || 800;
        const conceptoCita = `CONSULTA DE ${cita.modalidad || 'CONSULTORIO'}`;
        const citaYaPagada = cita.pago_status === 'PAGADO';

        const divCita = document.createElement('div');
        divCita.className = "cita-card-hub animate__animated animate__fadeInUp";
        
        divCita.style.cssText = `
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-left: 5px solid ${colorLateral};
            border-radius: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 14px;
            margin-bottom: 6px;
            width: 100%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.01);
            transition: all 0.2s ease;
        `;
        
        divCita.onmouseenter = () => { divCita.style.background = '#f8fafc'; };
        divCita.onmouseleave = () => { divCita.style.background = '#ffffff'; };
        
        divCita.innerHTML = `
            <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
                <div style="background: #f1f5f9; padding: 6px 10px; border-radius: 8px; text-align: center; min-width: 55px; flex-shrink: 0;">
                    <span style="font-weight: 800; color: #1e293b; font-size: 0.82rem; letter-spacing: -0.3px;">${cita.hora_inicio_cita.substring(0, 5)}</span>
                </div>
                
                <div style="display: flex; flex-direction: column; text-align: left; gap: 2px; min-width: 0; flex: 1;">
                    <span style="font-size: 0.85rem; font-weight: 800; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${nombreCompletoPaciente}">
                        ${nombreCompletoPaciente}
                    </span>
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="font-size: 0.6rem; color: ${colorLateral}; background: ${fondoBadge}; padding: 2px 6px; border-radius: 4px; font-weight: 800; display: inline-flex; align-items: center; gap: 3px;">
                            <i class="fas ${esConsultorio ? 'fa-building' : 'fa-house-user'}"></i> ${cita.modalidad}
                        </span>
                        <span style="font-size: 0.7rem; color: #64748b; font-weight: 600;">${etiquetaEdad}</span>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-left: 10px;">
                ${esConsultorio ? `
                <button class="btn-ingresar-box" onclick="prepararIngreso('${cita.id_cita}', '${p.id}', '${p.nombre}')" title="Asignar Camilla" 
                        style="background: #ffffff; border: 1px solid #cbd5e1; color: #475569; cursor: pointer; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transition: 0.2s;">
                    <i class="fas fa-bed" style="font-size: 0.8rem;"></i>
                </button>` : ''}
                
                ${!citaYaPagada ? `
                <button class="btn-cobrar-cita" onclick="dispararModalCobroAsistido('${cita.id_cita}', '${p.id}', '${nombreCompletoPaciente}', ${montoBaseCita}, '${conceptoCita}')" title="Registrar Cobro" 
                        style="background: #fffbeb; border: 1px solid #fde68a; color: #d97706; cursor: pointer; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transition: 0.2s;">
                    <i class="fas fa-cash-register" style="font-size: 0.8rem;"></i>
                </button>
                ` : ''}

                <button class="btn-hub-ver" onclick="irAHistoria('${p.id}')" title="Ver Expediente"
                        style="background: #f8fafc; border: 1px solid #e2e8f0; color: ${colorLateral}; cursor: pointer; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transition: 0.2s;">
                    <i class="fas fa-chevron-right" style="font-size: 0.8rem; font-weight: 900;"></i>
                </button>
            </div>
        `;
        lista.appendChild(divCita);
    });
}

// ==========================================
// RENDEREAR TABLA EQUIPO INTERNO
// ==========================================
async function renderizarTablaEquipo() {
    const tbody = document.getElementById('tablaCuerpoEquipo');
    if (!tbody) return;

    try {
        const idClinica = localStorage.getItem('id_clinica_activa') || localStorage.getItem('id_clinica_actual');
        if (!idClinica) return console.warn("⚠️ No se encontro ID de clinica activa.");

        const { data: colaboradores, error } = await fisioNet
            .from('colaboradores_clinica')
            .select('id, id_clinica, id_profesional, rol_sistema, cargo_clinico, estado, area_asignada, turno, tipo_vinculo')
            .eq('id_clinica', idClinica)
            .eq('estado', 'ACTIVO');

        if (error) throw error;

        // Filtrado exclusivo para personal interno
        const equipoInterno = (colaboradores || []).filter(c => {
            const vinculo = (c.tipo_vinculo || '').toUpperCase();
            const cargo = (c.cargo_clinico || '').toUpperCase();
            const rol = (c.rol_sistema || '').toUpperCase();

            const esExterno = vinculo === 'EXTERNO' || 
                              cargo.includes('EXTERNO') || 
                              cargo.includes('ALIANZA') || 
                              cargo.includes('REFERIDO') ||
                              rol === 'SOCIOS_EXTERNOS';

            return !esExterno;
        });

        window.totalEquipoInternoNum = equipoInterno.length;

        let html = `
            <tr>
                <td colspan="4" style="background-color: #eff6ff; color: #1e3a8a; font-weight: 800; padding: 10px 15px; font-size: 0.8rem; letter-spacing: 0.5px;">
                    🔵 MI EQUIPO INTERNO
                </td>
            </tr>
        `;

        if (equipoInterno.length === 0) {
            html += `<tr><td colspan="4" style="text-align:center; padding:20px; color:#64748b;">No hay colaboradores internos registrados.</td></tr>`;
        } else {
            const idsProf = equipoInterno.map(c => c.id_profesional).filter(Boolean);
            let perfilesMapa = {};

            if (idsProf.length > 0) {
                const { data: perfilesProf } = await fisioNet
                    .from('perfiles_profesionales')
                    .select('id, nombre_completo, correo_institucional')
                    .in('id', idsProf);

                (perfilesProf || []).forEach(p => { 
                    perfilesMapa[p.id] = {
                        nombre_completo: p.nombre_completo,
                        correo: p.correo_institucional
                    }; 
                });

                const idsFaltantes = idsProf.filter(id => !perfilesMapa[id]);
                
                if (idsFaltantes.length > 0) {
                    const { data: perfilesGen } = await fisioNet
                        .from('perfiles')
                        .select('id, nombre_completo, correo_institucional')
                        .in('id', idsFaltantes);

                    (perfilesGen || []).forEach(p => { 
                        perfilesMapa[p.id] = {
                            nombre_completo: p.nombre_completo,
                            correo: p.correo_institucional || 'Sin correo'
                        }; 
                    });
                }
            }

            html += equipoInterno.map(colab => {
    const perfil = perfilesMapa[colab.id_profesional] || {};
    const nombre = perfil.nombre_completo || 'USUARIO REGISTRADO';
    const correo = perfil.correo || 'Sin correo';
    
    // Separación clara entre puesto clínico y permisos del sistema
    const especialidadPuesto = colab.cargo_clinico || 'FISIOTERAPEUTA';
    const rolSistemaLegible = (colab.rol_sistema || 'STAFF_CLINICO').replace('_', ' ');

    return `
    <tr style="border-bottom: 1px solid #e2e8f0; background-color: #fcfcfc;">
        <td style="padding: 15px;">
            <div style="font-weight: 700; color: #1e293b; text-transform: uppercase;">${nombre}</div>
            <div style="font-size: 0.75rem; color: #64748b; font-weight: 600;">✉️ ${correo}</div>
        </td>
        <td style="padding: 15px; text-align: center;">
            <span style="background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 0.75rem; display: block; margin-bottom: 4px;">
                🎓 ${especialidadPuesto.toUpperCase()}
            </span>
            <span style="background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 700;">
                🔑 ACCESO: ${rolSistemaLegible.toUpperCase()}
            </span>
        </td>
        <td style="padding: 15px;">
            <div style="font-size: 0.8rem; font-weight: 600; color: #334155;">Área: ${colab.area_asignada || 'General'}</div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">Turno: ${colab.turno || 'Matutino'}</div>
        </td>
        <td style="padding: 15px; text-align: right;">
            <button onclick="abrirConfiguracionEquipo('${colab.id}')" title="Configurar" style="border: none; background: #f1f5f9; color: #334155; padding: 8px; border-radius: 6px; cursor: pointer;">
                ⚙️
            </button>
        </td>
    </tr>`;
}).join('');
             
        }

        tbody.innerHTML = html;

    } catch (e) {
        console.error("❌ Error en renderizarTablaEquipo:", e);
    }
}


// ==========================================
// 🟢 RENDEREAR ALIANZAS Y DOCTORES EXTERNOS (CORREGIDO)
// ==========================================
async function renderizarTablaAlianzas() {
    const tbody = document.getElementById('tablaCuerpoAlianzas');
    const contador = document.getElementById('contadorSocios');
    if (!tbody) return;

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        const idClinica = localStorage.getItem('id_clinica_activa') || localStorage.getItem('id_clinica_actual');
        if (!user || !idClinica) return;

        // 1. Obtener Convenios y Alianzas de red_colaboracion
        const { data: conveniosRed, error: errRed } = await fisioNet
            .from('red_colaboracion')
            .select('*')
            .or(`id_doctor_emisor.eq.${user.id},id_doctor_receptor.eq.${user.id}`)
            .eq('estado_conexion', 'ACTIVO');

        if (errRed) console.error("Error al consultar red_colaboracion:", errRed);

        // 2. Obtener Doctores y Colaboradores Externos de colaboradores_clinica
        const { data: colabsClinica, error: errColab } = await fisioNet
            .from('colaboradores_clinica')
            .select('id, id_profesional, rol_sistema, cargo_clinico, estado, area_asignada, tipo_vinculo')
            .eq('id_clinica', idClinica)
            .eq('estado', 'ACTIVO');

        if (errColab) console.error("Error al consultar colaboradores_clinica:", errColab);

        const doctoresExternos = (colabsClinica || []).filter(c => {
            const vinculo = (c.tipo_vinculo || '').toUpperCase();
            const cargo = (c.cargo_clinico || '').toUpperCase();
            const rol = (c.rol_sistema || '').toUpperCase();

            return vinculo === 'EXTERNO' || 
                   cargo.includes('EXTERNO') || 
                   cargo.includes('ALIANZA') || 
                   cargo.includes('REFERIDO') ||
                   rol === 'SOCIOS_EXTERNOS';
        });

        // 3. Mapear IDs de la contraparte para traer perfiles reales
        let idsAConsultar = new Set();

        (conveniosRed || []).forEach(c => {
            // Determinar contraparte: Si soy el emisor, la contraparte es el receptor; y viceversa.
            const idContraparte = (c.id_doctor_emisor === user.id) ? c.id_doctor_receptor : c.id_doctor_emisor;
            if (idContraparte) idsAConsultar.add(idContraparte);
        });

        doctoresExternos.forEach(d => {
            if (d.id_profesional) idsAConsultar.add(d.id_profesional);
        });

        const arrayIdsProf = Array.from(idsAConsultar);
        let mapaDoctores = {};

        if (arrayIdsProf.length > 0) {
            const { data: perfilesProf } = await fisioNet
                .from('perfiles_profesionales')
                .select('id, nombre_completo, correo_institucional, especialidad')
                .in('id', arrayIdsProf);

            (perfilesProf || []).forEach(p => { mapaDoctores[p.id] = p; });

            const idsFaltantes = arrayIdsProf.filter(id => !mapaDoctores[id]);
            if (idsFaltantes.length > 0) {
                const { data: perfilesGen } = await fisioNet
                    .from('perfiles')
                    .select('id, nombre_completo, correo')
                    .in('id', idsFaltantes);

                (perfilesGen || []).forEach(p => { 
                    mapaDoctores[p.id] = { 
                        nombre_completo: p.nombre_completo, 
                        correo_institucional: p.correo 
                    }; 
                });
            }
        }

        // 4. Consolidar la lista
        let listaUnificada = [];

        (conveniosRed || []).forEach(c => {
            const idContraparte = (c.id_doctor_emisor === user.id) ? c.id_doctor_receptor : c.id_doctor_emisor;
            const perfilSocio = mapaDoctores[idContraparte] || {};

            listaUnificada.push({
                id: c.id,
                origen: 'RED_COLABORACION',
                nombre: perfilSocio.nombre_completo || c.nombre_entidad || c.contacto_principal || 'EMPRESA / SOCIO',
                tipo: perfilSocio.especialidad || c.tipo_entidad || 'CONVENIO',
                beneficio: c.porcentaje_descuento ? `${c.porcentaje_descuento}% DESC` : 'SIN DESC',
                contacto: `👤 ${perfilSocio.nombre_completo || c.contacto_principal || 'Contacto directo'}`,
                correo: perfilSocio.correo_institucional || c.email_contacto || 'Sin correo'
            });
        });

        doctoresExternos.forEach(d => {
            const perfil = mapaDoctores[d.id_profesional] || {};
            listaUnificada.push({
                id: d.id,
                origen: 'COLABORADOR_EXTERNO',
                nombre: perfil.nombre_completo || 'DOCTOR EXTERNO',
                tipo: d.cargo_clinico || d.rol_sistema || 'MÉDICO INTERCONSULTANTE',
                beneficio: 'ESPECIALISTA',
                contacto: `📍 Área: ${d.area_asignada || 'General'}`,
                correo: perfil.correo_institucional || 'Sin correo'
            });
        });

        if (contador) {
            const totalInternos = window.totalEquipoInternoNum || 0;
            contador.innerText = `${listaUnificada.length + totalInternos} En Red`;
        }

        let html = `
            <tr>
                <td colspan="4" style="background-color: #f0fdf4; color: #14532d; font-weight: 800; padding: 10px 15px; font-size: 0.8rem; letter-spacing: 0.5px;">
                    🟢 ALIANZAS ESTRATÉGICAS Y DOCTORES EXTERNOS
                </td>
            </tr>
        `;

        if (listaUnificada.length === 0) {
            html += `<tr><td colspan="4" style="text-align:center; padding:20px; color:#64748b;">No hay alianzas ni doctores externos vinculados.</td></tr>`;
        } else {
            html += listaUnificada.map(item => {
                const handlerBoton = item.origen === 'RED_COLABORACION' 
                    ? `abrirConfiguracionAlianza('${item.id}')` 
                    : `abrirConfiguracionEquipo('${item.id}')`;

                return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: all 0.3s ease;">
                    <td style="padding: 15px;">
                        <div style="font-weight: 700; color: #1e293b;">${item.nombre}</div>
                        <div style="font-size: 0.75rem; color: #166534; font-weight: 600;">🤝 ${item.tipo}</div>
                    </td>
                    <td style="padding: 15px; text-align: center;">
                        <span style="background: #dcfce7; color: #15803d; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 0.75rem;">
                            ${item.beneficio}
                        </span>
                    </td>
                    <td style="padding: 15px;">
                        <div style="font-size: 0.8rem; font-weight: 600; color: #334155;">${item.contacto}</div>
                        <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">✉️ ${item.correo}</div>
                    </td>
                    <td style="padding: 15px; text-align: right;">
                        <button onclick="${handlerBoton}" title="Configurar" style="border: none; background: #f1f5f9; padding: 8px; border-radius: 8px; cursor: pointer;">
                            ⚙️
                        </button>
                    </td>
                </tr>`;
            }).join('');
        }

        tbody.innerHTML = html;

    } catch (e) {
        console.error("❌ Fallo crítico en renderizarTablaAlianzas:", e);
    }
}

window.abrirConfiguracionEquipo = (idColaborador, nombreColaborador, cargoActual, areaActual, fechaFin, superior, observaciones) => {
    const inputId = document.getElementById('idColabActivo');
    const labelNombre = document.getElementById('nombreColabModal');
    const selectCargo = document.getElementById('selectCargoModal');
    const selectArea = document.getElementById('selectAreaModal');
    const inputFechaFin = document.getElementById('fechaFinModal');
    const selectSuperior = document.getElementById('superiorModal');
    const txtObs = document.getElementById('obsModal');
    const modal = document.getElementById('modalConfigEquipo');

    if (!inputId || !modal) return;

    inputId.value = idColaborador;
    if (labelNombre) labelNombre.innerText = nombreColaborador || "Colaborador";
    if (selectCargo) selectCargo.value = cargoActual || "FISIOTERAPEUTA";
    if (selectArea) selectArea.value = areaActual || "GENERAL";
    if (inputFechaFin) inputFechaFin.value = fechaFin || "";
    if (selectSuperior) selectSuperior.value = superior || "";
    if (txtObs) txtObs.value = observaciones || "";
    
    modal.style.display = 'flex';
};

window.cerrarModalConfig = () => {
    document.getElementById('modalConfigEquipo').style.display = 'none';
};

window.guardarConfigEquipo = async () => {
    const idColab = document.getElementById('idColabActivo').value;
    const cargo = document.getElementById('selectCargoModal').value;
    const area = document.getElementById('selectAreaModal').value;
    const fechaFin = document.getElementById('fechaFinModal').value || null;
    const superior = document.getElementById('superiorModal').value || null;
    const obs = document.getElementById('obsModal').value;

    try {
        const { error } = await fisioNet
            .from('colaboradores_clinica')
            .update({ 
                cargo_clinico: cargo, 
                area_asignada: area,
                fecha_fin: fechaFin,
                id_superior_directo: superior,
                observaciones_historial: obs 
            })
            .eq('id', idColab);

        if (error) throw error;

        alert("✅ Información actualizada correctamente.");
        window.location.reload();
        
    } catch (err) {
        console.error("Error al guardar:", err);
        alert("No se pudo actualizar: " + err.message);
    }
};

let idAlianzaGlobal = null;

async function abrirConfiguracionAlianza(idAlianza) {
    idAlianzaGlobal = idAlianza;
    const modal = document.getElementById('modalConfigAlianza');
    
    try {
        const [resAlianza, resConteo] = await Promise.all([
            fisioNet.from('red_colaboracion').select('*').eq('id', idAlianza).single(),
            fisioNet.from('vinculos_clinicos')
                .select('*', { count: 'exact', head: true })
                .eq('id_alianza_referido', idAlianza)
        ]);

        if (resAlianza.error) throw resAlianza.error;

        const a = resAlianza.data;
        
        document.getElementById('confAlianzaNombre').innerText = a.nombre_entidad || "Alianza Estratégica";
        document.getElementById('confAlianzaContador').innerText = resConteo.count || 0;
        document.getElementById('confAlianzaPorcentaje').value = a.porcentaje_descuento || 0;

        const btnPausa = document.getElementById('btnPausarAlianza');
        const estaActivo = a.estado_conexion === 'ACTIVO';
        btnPausa.innerHTML = estaActivo ? '⏸️ PAUSAR' : '▶️ REINICIAR';
        btnPausa.style.background = estaActivo ? '#fee2e2' : '#dcfce7';
        btnPausa.style.color = estaActivo ? '#ef4444' : '#15803d';
        btnPausa.onclick = () => alternarEstadoAlianza(idAlianza, a.estado_conexion);

        modal.style.display = 'flex';
    } catch (err) {
        console.error("❌ Error al abrir config (FisioCid):", err);
    }
}

window.alternarEstadoAlianza = async (idAlianza, estadoActual) => {
    const nuevoEstado = estadoActual === 'ACTIVO' ? 'PAUSADO' : 'ACTIVO';
    const accion = nuevoEstado === 'ACTIVO' ? 'REINICIAR' : 'PONER EN PAUSA';

    if (confirm(`¿Deseas ${accion} esta alianza estratégica?`)) {
        try {
            const { error } = await fisioNet
                .from('red_colaboracion')
                .update({ estado_conexion: nuevoEstado })
                .eq('id', idAlianza);

            if (error) throw error;
            
            alert(`Alianza ${nuevoEstado === 'ACTIVO' ? 'activada' : 'pausada'} correctamente.`);
            if (typeof renderizarTablaAlianzas === 'function') await renderizarTablaAlianzas();
            
            const modal = document.getElementById('modalConfigAlianza');
            if (modal) modal.style.display = 'none';
        } catch (err) {
            console.error("Error al cambiar estado:", err);
            alert("No se pudo cambiar el estado: " + err.message);
        }
    }
};

async function guardarCambiosAlianza() {
    const nuevoPorcentaje = document.getElementById('confAlianzaPorcentaje').value;
    if (!idAlianzaGlobal) return;

    const { error } = await fisioNet
        .from('red_colaboracion')
        .update({ porcentaje_descuento: nuevoPorcentaje })
        .eq('id', idAlianzaGlobal);

    if (!error) {
        alert("✅ Configuración guardada.");
        document.getElementById('modalConfigAlianza').style.display = 'none';
        await renderizarTablaAlianzas();
    } else {
        alert("❌ Error al guardar convenio: " + error.message);
    }
}

document.getElementById('formConfigInicial')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await fisioNet.auth.getUser();
    if (!user) return;

    const nombreEnMemoria = localStorage.getItem('nombre_completo');
    let nombreParaGuardar = nombreEnMemoria;
    if (!nombreParaGuardar || nombreParaGuardar === 'null') {
        const { data: p } = await fisioNet.from('perfiles_profesionales').select('nombre_completo').eq('id', user.id).single();
        nombreParaGuardar = p?.nombre_completo || "Cristian Miguel Cid Espíndola";
    }

    let horariosArray = [];
    document.querySelectorAll('.bloque-horario').forEach(bloque => {
        const seleccion = bloque.querySelector('.dia-semana').value.trim();
        const inicio = bloque.querySelector('.h-ini').value;
        const fin = bloque.querySelector('.h-fin').value;

        if (inicio && fin) {
            if (seleccion.includes("Lunes a Viernes") || seleccion === "LV") {
                [1, 2, 3, 4, 5].forEach(d => horariosArray.push({ dia: d, inicio, fin }));
            } else if (seleccion.includes("Sábado") || seleccion.includes("Sabado") || seleccion === "6") {
                horariosArray.push({ dia: 6, inicio, fin });
            } else if (seleccion.includes("Domingo") || seleccion === "0") {
                horariosArray.push({ dia: 0, inicio, fin });
            } else {
                const diaNum = parseInt(seleccion);
                if (!isNaN(diaNum)) horariosArray.push({ dia: diaNum, inicio, fin });
            }
        }
    });

    const diasConServicio = [...new Set(horariosArray.map(h => Number(h.dia)))];
    const todosLosDias = [0, 1, 2, 3, 4, 5, 6];
    const diasDescanso = todosLosDias.filter(d => !diasConServicio.includes(d));

    const updates = {
        id: user.id,
        correo_institucional: user.email,
        nombre_completo: nombreParaGuardar,
        rol: 'ADMIN_SISTEMA', 
        costo_consulta_base: parseFloat(document.getElementById('baseConsultorio')?.value) || 0,
        costo_domicilio_base: parseFloat(document.getElementById('baseDomicilio')?.value) || 0,
        horario_atencion: JSON.stringify(horariosArray), 
        intervalo_cita: parseInt(document.getElementById('intervaloCita')?.value) || 30,
        dias_descanso: diasDescanso, 
        formato_impresion: document.getElementById('formatoImpresion')?.value || 'CARTA'
    };

    try {
        const { error } = await fisioNet.from('perfiles_profesionales').upsert(updates);
        if (error) throw error;

        localStorage.setItem('nombre_completo', nombreParaGuardar);
        localStorage.setItem('intervalo_cita', updates.intervalo_cita);
        localStorage.setItem('horario_atencion', updates.horario_atencion);

        alert("¡CONFIGURACIÓN DE FISIOCID ACTUALIZADA! 🩺🚀");
        document.getElementById('modalConfigInicial').style.display = 'none';
        location.reload(); 
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("ERROR AL GUARDAR: " + error.message);
    }
});

async function cargarAgenda(modo = 'semana', botonPresionado = null) {
    const tituloElemento = document.getElementById('tituloAgenda');
    let fechaInput = document.getElementById('filtroFechaAgenda')?.value;
    
    if (!fechaInput) {
        fechaInput = new Date().toISOString().split('T')[0];
        if(document.getElementById('filtroFechaAgenda')) {
            document.getElementById('filtroFechaAgenda').value = fechaInput;
        }
    }

    const fechaBase = new Date(fechaInput + "T00:00:00");

    if (botonPresionado) {
        document.querySelectorAll('.btn-filtro').forEach(btn => btn.classList.remove('active'));
        botonPresionado.classList.add('active');
    }

    const { data: { user } } = await fisioNet.auth.getUser();
    const clinicaId = localStorage.getItem('id_clinica_activa');

    if (!clinicaId) {
        localStorage.clear(); 
        window.location.href = 'login.html'; 
        return; 
    }
       
    if (!user) return; 

    let query = fisioNet
        .from('agenda_maestra')
        .select(`
            id_cita, 
            fecha, 
            hora_inicio_cita, 
            modalidad, 
            estatus,
            pago_status,
            monto_total,
            pacientes_maestros (id, nombre, apellido_paterno, apellido_materno, curp)
        `)
        .eq('id_profesional', user.id)
        .eq('id_clinica', clinicaId);

    if (modo === 'dia') {
        if (tituloElemento) tituloElemento.innerText = `CITAS DEL ${formatearFechaCorta(fechaInput).toUpperCase()}`;
        query = query.eq('fecha', fechaInput);
    } else {
        const diaSemana = fechaBase.getDay();
        const diferenciaLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
        const lunes = new Date(fechaBase);
        lunes.setDate(fechaBase.getDate() + diferenciaLunes);
        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);

        const f1 = lunes.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
        const f2 = domingo.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
        if (tituloElemento) tituloElemento.innerText = `SEMANA: ${f1.toUpperCase()} AL ${f2.toUpperCase()}`;

        query = query
            .gte('fecha', lunes.toISOString().split('T')[0])
            .lte('fecha', domingo.toISOString().split('T')[0]);
    }

    const { data: citas, error } = await query
        .order('fecha')
        .order('hora_inicio_cita');

    if (error) {
        console.error("❌ Error al cargar agenda:", error.message);
        return;
    }

    renderizarCitas(citas, modo);
}

window.irAHistoria = (idPaciente) => {
    if (!idPaciente) return;
    localStorage.setItem('paciente_seleccionado_id', idPaciente);
    window.location.href = 'historial-evolucion.html'; 
};
window.cargarAgenda = cargarAgenda;

const inputBusqueda = document.getElementById('buscarPacienteInput');
const listaSugerencias = document.getElementById('sugerenciasPacientes');

inputBusqueda?.addEventListener('input', async (e) => {
    e.target.value = e.target.value.toUpperCase();
    const texto = e.target.value.trim();
    if (texto.length < 2) { listaSugerencias.innerHTML = ''; return; }

    const { data: { user } } = await fisioNet.auth.getUser();
    const clinicaId = localStorage.getItem('id_clinica_activa');

    const { data: pacientes } = await fisioNet.from('pacientes_maestros').select('id, nombre, apellido_paterno, apellido_materno').or(`nombre.ilike.%${texto}%,apellido_paterno.ilike.%${texto}%,apellido_materno.ilike.%${texto}%`).eq('id_clinica', clinicaId).limit(5);

    listaSugerencias.innerHTML = '';
    
    if (pacientes?.length > 0) {
        pacientes.forEach(p => {
            const div = document.createElement('div');
            div.className = 'sugerencia-item';
            div.innerText = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.trim();
            div.onclick = () => {
                inputBusqueda.value = div.innerText;
                document.getElementById('idPacienteSeleccionado').value = p.id;
                listaSugerencias.innerHTML = '';
            };
            listaSugerencias.appendChild(div);
        });
    } else {
        const divNuevo = document.createElement('div');
        divNuevo.className = 'sugerencia-item';
        divNuevo.style.background = '#f0fdf4';
        divNuevo.innerHTML = `<strong>+ Registrar nuevo: "${texto}"</strong>`;

        divNuevo.onclick = async () => {
            const clinicaId = localStorage.getItem('id_clinica_activa');
            const idSocio = document.getElementById('selectConvenioPaciente')?.value || null;

            const resultado = procesarNombreMexicano(texto); 

            const { data: nuevo, error: errorReg } = await fisioNet.from('pacientes_maestros').insert({ 
                nombre: resultado.nombre, 
                apellido_paterno: resultado.paterno, 
                apellido_materno: resultado.materno, 
                creado_por: user.id,
                id_clinica: clinicaId,
                id_clinica_origen: clinicaId,
                id_convenio: idSocio
            }).select().single();
            
            if (nuevo) {
                if (typeof window.crearVinculoInicial === 'function') {
                    await window.crearVinculoInicial(nuevo.id, user.id, clinicaId);
                }
                inputBusqueda.value = `${nuevo.nombre} ${nuevo.apellido_paterno} ${nuevo.apellido_materno || ''}`.trim();
                document.getElementById('idPacienteSeleccionado').value = nuevo.id;
                listaSugerencias.innerHTML = '';
                
                const msgConvenio = idSocio ? "VINCULADO AL CONVENIO 🤝" : "COMO PARTICULAR 👤";
                alert(`¡${nuevo.nombre} REGISTRADO ${msgConvenio}! ⚡`);
                
            } else {
                console.error("Error registrando:", errorReg);
                alert("No se pudo registrar al paciente: " + errorReg.message);
            }
        };
        listaSugerencias.appendChild(divNuevo);
    }
});

document.getElementById('formNuevaCita')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await fisioNet.auth.getUser();
    
    const clinicaId = localStorage.getItem('id_clinica_activa');
    const idPaciente = document.getElementById('idPacienteSeleccionado').value;
    const modalidad = document.getElementById('modalidadCita').value;
    const horaElegida = document.getElementById('horaCita').value; 
    const fechaElegida = document.getElementById('fechaCita').value;

    if (!idPaciente) { alert("Selecciona un paciente."); return; }
    if (!clinicaId) { alert("Error: No hay sede activa seleccionada."); return; }

    const { data: perfil } = await fisioNet
        .from('perfiles_profesionales')
        .select('costo_consulta_base, costo_domicilio_base, horario_atencion')
        .eq('id', user.id)
        .single();

    // Validar horario laborable...
    if (perfil?.horario_atencion) {
        const horarios = JSON.parse(perfil.horario_atencion);
        const intervalo = parseInt(localStorage.getItem('intervalo_cita')) || 60; 
        
        const fechaObj = new Date(fechaElegida + "T12:00:00");
        const diaSemana = fechaObj.getDay();
        const horarioHoy = horarios.find(h => Number(h.dia) === diaSemana);

        if (!horarioHoy) {
            alert(`❌ DÍA NO LABORABLE: No tienes configurado horario de trabajo para este día.`);
            return; 
        }

        const hIni = horarioHoy.inicio; 
        const hFin = horarioHoy.fin;

        const [hE, mE] = horaElegida.split(':').map(Number);
        const [hF, mF] = hFin.split(':').map(Number);
        
        const minElegidos = (hE * 60) + mE;
        const minCierre = (hF * 60) + mF;

        if (horaElegida < hIni || (minElegidos + intervalo) > minCierre) {
            alert(`❌ HORARIO NO DISPONIBLE: Tu hora límite de salida es a las ${hFin}.`);
            return; 
        }
    }

    // MANEJO SEGURO DE CONVENIOS (Evita errores FK si idConvenio está vacío)
    const selectorConvenio = document.getElementById('selectConvenioPaciente');
    let idConvenio = null;
    let porcentaje = 0;

    if (selectorConvenio && selectorConvenio.value && selectorConvenio.value !== "") {
        idConvenio = selectorConvenio.value;
        if (selectorConvenio.selectedIndex >= 0) {
            porcentaje = parseFloat(selectorConvenio.options[selectorConvenio.selectedIndex].dataset.descuento) || 0;
        }
    }

    // TARIFA INDEPENDIENTE (Sin sumar base + domicilio)
    const costoConsultorio = perfil?.costo_consulta_base || 800;
    const costoDomicilio = perfil?.costo_domicilio_base || 1200;
    const precioBase = (modalidad === 'CONSULTORIO') ? costoConsultorio : costoDomicilio;
    
    const descuentoCalculado = (precioBase * porcentaje) / 100;
    const precioFinal = precioBase - descuentoCalculado;

    const { error } = await fisioNet.from('agenda_maestra').insert({
        id_paciente: idPaciente, 
        id_profesional: user.id, 
        id_clinica: clinicaId, 
        fecha: fechaElegida, 
        hora_inicio_cita: horaElegida,
        modalidad: modalidad, 
        id_convenio_aplicado: idConvenio, // Pasa como null si es particular
        descuento_aplicado: descuentoCalculado, 
        monto_base: precioBase,
        monto_total: precioFinal, 
        estatus: 'PENDIENTE', 
        pago_status: 'PENDIENTE', 
        estado: 'ACTIVO'
    });

    if (!error) {
        alert("¡CITA AGENDADA CON ÉXITO EN FISIOCID! 📅✨");
        document.getElementById('modalCita').style.display = 'none';
        document.getElementById('formNuevaCita').reset();
        
        if (typeof cargarAgenda === 'function') await cargarAgenda('semana');
        if (typeof cargarEstadisticas === 'function') await cargarEstadisticas();
    } else {
        alert("Error al agendar: " + error.message);
    }
});

document.getElementById('fechaCita')?.addEventListener('change', () => {
    verificarDisponibilidadReal();
});

document.querySelectorAll('.cerrar-modal').forEach(boton => {
    boton.addEventListener('click', () => { document.getElementById('modalCita').style.display = 'none'; });
});

document.getElementById('btnCerrarSesion')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirm("¿Deseas salir de FisioCid?")) {
        await fisioNet.auth.signOut();
        localStorage.clear();
        window.location.href = 'login.html';
    }
});

document.getElementById('btnAbrirConfig')?.addEventListener('click', async () => {
    const modal = document.getElementById('modalConfigInicial');
    const { data: { user } } = await fisioNet.auth.getUser();

    const { data: perfil } = await fisioNet.from('perfiles_profesionales').select('*').eq('id', user.id).single();

    if (perfil) {
        document.getElementById('baseConsultorio').value = perfil.costo_consulta_base;
        document.getElementById('baseDomicilio').value = perfil.costo_domicilio_base;
        if (document.getElementById('intervaloCita')) {
            document.getElementById('intervaloCita').value = perfil.intervalo_cita || 30;
        }
        if (document.getElementById('formatoImpresion')) {
            document.getElementById('formatoImpresion').value = perfil.formato_impresion || 'CARTA';
        }
        if (perfil.horario_atencion) {
            cargarHorariosEnModal(perfil.horario_atencion);
        }
    }
    modal.style.display = 'flex';
});

window.cargarMonitorBoxes = async () => {
    const clinicaId = localStorage.getItem('id_clinica_activa'); 
    const contenedor = document.getElementById('monitorBoxes');
    if (!contenedor) return;

    try {
        const { data: boxes, error } = await fisioNet
            .from('boxes_clinica')
            .select(`*, pacientes_maestros(nombre, apellido_paterno)`)
            .eq('id_clinica', clinicaId)
            .order('nombre_box', { ascending: true });

        if (error) throw error;

        if (!boxes || boxes.length === 0) {
            contenedor.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 30px; background: #ffffff; border-radius: 12px; border: 2px dashed #cbd5e1;">
                    <p style="color: #64748b; font-size: 0.85rem; font-weight: 600; margin-bottom: 10px;">
                        No hay espacios creados para esta sede.
                    </p>
                    <button onclick="window.location.href='gestion-espacios.html'" 
                            style="background: var(--primary); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">
                        + Ir a Registrar Espacios
                    </button>
                </div>`;
            return;
        }

        contenedor.innerHTML = boxes.map(box => {
            let badgeBg, badgeColor, estadoTexto, botonAccion;
            let tiempoTexto = "";

            if (box.estado === 'OCUPADO') {
                badgeBg = '#fee2e2'; 
                badgeColor = '#991b1b'; 
                estadoTexto = '🔴 OCUPADO';

                if (box.hora_ingreso) {
                    const inicio = new Date(box.hora_ingreso);
                    const diffMinutos = Math.floor((new Date() - inicio) / 60000);
                    tiempoTexto = `<span style="color: #ef4444; font-size: 0.75rem; font-weight: 800;">⏱️ ${diffMinutos} min</span>`;
                }

                botonAccion = `
                    <button onclick="cambiarEstadoBox('${box.id}', 'LIMPIEZA')" 
                            style="width: 100%; background: #f59e0b; color: white; border: none; padding: 8px; border-radius: 8px; cursor: pointer; font-size: 0.75rem; font-weight: bold; margin-top: 12px; transition: 0.2s;">
                        🧹 PASAR A LIMPIEZA
                    </button>`;

            } else if (box.estado === 'LIMPIEZA') {
                badgeBg = '#fef3c7'; 
                badgeColor = '#92400e'; 
                estadoTexto = '🧹 LIMPIEZA';

                botonAccion = `
                    <button onclick="cambiarEstadoBox('${box.id}', 'LIBRE')" 
                            style="width: 100%; background: #10b981; color: white; border: none; padding: 8px; border-radius: 8px; cursor: pointer; font-size: 0.75rem; font-weight: bold; margin-top: 12px; transition: 0.2s;">
                        ✅ MARCAR DISPONIBLE
                    </button>`;

            } else {
                badgeBg = '#dcfce7'; 
                badgeColor = '#166534'; 
                estadoTexto = '🟢 LIBRE'; 
                botonAccion = ''; 
            }

            const nombrePaciente = (box.estado === 'OCUPADO' && box.pacientes_maestros) 
                ? `${box.pacientes_maestros.nombre} ${box.pacientes_maestros.apellido_paterno}` 
                : (box.estado === 'LIMPIEZA' ? 'MANTENIMIENTO' : 'DISPONIBLE');

            return `
                <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 18px; text-align: left; border-radius: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <!-- Encabezado con badge e indicador de tiempo -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 0.7rem; letter-spacing: 0.5px;">
                                ${estadoTexto}
                            </span>
                            ${tiempoTexto}
                        </div>

                        <!-- Nombre del Espacio (Destacado y Grande) -->
                        <h4 style="margin: 0 0 6px 0; font-size: 1.1rem; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.3px;">
                            ${box.nombre_box}
                        </h4>

                        <!-- Paciente / Estado secundario -->
                        <p style="margin: 0; font-weight: 600; font-size: 0.85rem; color: #64748b;">
                            ${nombrePaciente.toUpperCase()}
                        </p>
                    </div>

                    ${botonAccion}
                </div>`;
        }).join('');

    } catch (err) {
        console.error("Error cargando boxes:", err);
    }
};

setInterval(cargarMonitorBoxes, 60000);

window.cambiarEstadoBox = async (idBox, nuevoEstado) => {
    const payload = { estado: nuevoEstado };
    if (nuevoEstado === 'LIMPIEZA' || nuevoEstado === 'LIBRE') { payload.paciente_actual_id = null; payload.hora_ingreso = null; }
    const { error } = await fisioNet.from('boxes_clinica').update(payload).eq('id', idBox);
    if (error) alert("❌ Error al actualizar camilla: " + error.message); else cargarMonitorBoxes(); 
};

window.configurarBoxes = async () => {
    document.getElementById('modalGestionBoxes').style.display = 'flex';
    const clinicaId = localStorage.getItem('id_clinica_activa');
    const { data: boxes } = await fisioNet.from('boxes_clinica').select('*').eq('id_clinica', clinicaId);
    const lista = document.getElementById('listaEdicionBoxes');
    lista.innerHTML = '';
    boxes?.forEach(box => {
        lista.innerHTML += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; background: #f8fafc; padding: 8px; border-radius: 8px; border: 1px solid #eee;"><span style="font-size: 0.8rem; font-weight: bold;">${box.nombre_box.toUpperCase()}</span><button onclick="eliminarBox('${box.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold;">✕</button></div>`;
    });
};

window.guardarNuevaEstacion = async () => {
    const clinicaId = localStorage.getItem('id_clinica_activa');
    const inputNombre = document.getElementById('nombreNuevoBox');
    const nombre = inputNombre.value.toUpperCase().trim();

    if (!nombre) { alert("Escribe un nombre para la estación."); return; }
    if (!clinicaId) { alert("⚠️ Error: No se encuentra el ID de la clínica."); return; }

    const { error } = await fisioNet.from('boxes_clinica').insert([{ nombre_box: nombre, id_clinica: clinicaId, estado: 'LIBRE' }]);
    if (error) { 
        alert("❌ Error: " + error.message); 
    } else {
        inputNombre.value = '';
        await configurarBoxes();
        await cargarMonitorBoxes();
    }
};

document.getElementById('formNuevoBox')?.addEventListener('submit', (e) => {
    e.preventDefault();
    guardarNuevaEstacion();
});

window.eliminarBox = async (id) => {
    if (confirm("¿ELIMINAR ESTACIÓN?")) { await fisioNet.from('boxes_clinica').delete().eq('id', id); configurarBoxes(); cargarMonitorBoxes(); }
};

window.prepararIngreso = async (idCita, idPaciente, nombre) => {
    const clinicaId = localStorage.getItem('id_clinica_activa');
    const { data: disponibles } = await fisioNet.from('boxes_clinica').select('*').eq('id_clinica', clinicaId).eq('estado', 'LIBRE');

    if (!disponibles || disponibles.length === 0) { alert("⚠️ No hay cuartos o camas disponibles."); return; }

    const opciones = disponibles.map(d => `${d.nombre_box}`).join(", ");
    const eleccion = prompt(`Asignar a ${nombre} a:\nOpciones: ${opciones}`, disponibles[0].nombre_box);

    if (eleccion) {
        const boxSeleccionado = disponibles.find(d => d.nombre_box.toUpperCase() === eleccion.toUpperCase());
        if (boxSeleccionado) await ejecutarIngreso(boxSeleccionado.id, idPaciente, idCita);
    }
};

async function ejecutarIngreso(idBox, idPaciente, idCita) {
    await fisioNet.from('boxes_clinica').update({ estado: 'OCUPADO', paciente_actual_id: idPaciente, hora_ingreso: new Date().toISOString() }).eq('id', idBox);
    await fisioNet.from('agenda_maestra').update({ estatus: 'ATENDIENDO' }).eq('id_cita', idCita);
    location.reload(); 
}

async function cargarSalaEspera() {
    const lista = document.getElementById('listaEsperaReferidos');
    const badge = document.getElementById('badgeSolicitudes');
    if (!lista) return;

    const { data: solicitudes, error } = await fisioNet
        .from('solicitudes_citas')
        .select('*')
        .eq('estado', 'PENDIENTE')
        .order('creado_el', { ascending: false });

    if (error) {
        console.error("❌ ERROR DE SUPABASE:", error);
        return;
    }

    if (badge) badge.innerText = solicitudes?.length || 0;
    
    if (!solicitudes || solicitudes.length === 0) {
        lista.innerHTML = `<p style="text-align: center; color: #94a3b8; font-size: 0.8rem; padding: 20px;">Sin solicitudes nuevas.</p>`;
        return;
    }

    lista.innerHTML = solicitudes.map(sol => {
        const nombreFull = `${sol.nombre} ${sol.apellido_p} ${sol.apellido_m || ''}`.toUpperCase();
        
        return `
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <strong style="display: block; font-size: 0.85rem; color: #1e293b;">${nombreFull}</strong>
                    <small style="color: #64748b;">📅 ${sol.fecha_cita} - ⏰ ${sol.hora_cita.substring(0,5)}</small>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button onclick="procesarSolicitud('${sol.id}', 'APROBAR')" style="background: #10b981; color: white; border: none; padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 0.7rem;">✅</button>
                    <button onclick="procesarSolicitud('${sol.id}', 'RECHAZAR')" style="background: #ef4444; color: white; border: none; padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 0.7rem;">🗑️</button>
                </div>
            </div>
            <div style="margin-top: 8px; font-size: 0.7rem; color: #2563eb; font-weight: bold;">
                📞 ${sol.telefono} 
            </div>
        </div>`;
    }).join('');
}

window.procesarSolicitud = async (idSolicitud, accion) => {
    if (accion === 'RECHAZAR') {
        if (!confirm("¿Deseas descartar esta solicitud de forma definitiva?")) return;
        await fisioNet.from('solicitudes_citas').update({ estado: 'RECHAZADO' }).eq('id', idSolicitud);
        cargarSalaEspera();
        return;
    }

    const { data: sol } = await fisioNet.from('solicitudes_citas').select('*').eq('id', idSolicitud).single();
    const clinicaId = localStorage.getItem('id_clinica_activa');
    const { data: { user } } = await fisioNet.auth.getUser();

    const nomS = sol.nombre.toUpperCase().trim();
    const apePS = sol.apellido_p.toUpperCase().trim();
    const curpS = sol.curp ? sol.curp.toUpperCase().trim() : null;
    const correoS = sol.email ? sol.email.toLowerCase().trim() : null;

    const raizN = nomS.substring(0, 4);
    const raizA = apePS.substring(0, 4);
    const raizMaterno = sol.apellido_m ? sol.apellido_m.toUpperCase().trim().substring(0, 4) : '';

    let filtrosOr = `telefono.eq.${sol.telefono}, and(nombre.ilike.%${raizN}%,apellido_paterno.ilike.%${raizA}%)`;
    if (curpS) filtrosOr += `,curp.eq.${curpS}`;

    let { data: coincidencias } = await fisioNet.from('pacientes_maestros').select('*').or(filtrosOr);

    let idPacienteFinal = null;

    if (coincidencias && coincidencias.length > 0) {
        let pMatch = null;

        if (curpS) pMatch = coincidencias.find(p => p.curp === curpS);

        if (!pMatch) {
            pMatch = coincidencias.find(p => {
                const nomDB = p.nombre ? p.nombre.toUpperCase() : '';
                const apPDB = p.apellido_paterno ? p.apellido_paterno.toUpperCase() : '';
                const apMDB = p.apellido_materno ? p.apellido_materno.toUpperCase() : '';
                
                const checkPaterno = apPDB.includes(raizA);
                const checkNombre = nomDB.includes(raizN);
                const checkMaterno = raizMaterno && apMDB ? apMDB.includes(raizMaterno) : true; 

                return checkPaterno && checkMaterno && checkNombre;
            });
        }

        if (!pMatch) pMatch = coincidencias.find(p => p.telefono === sol.telefono) || coincidencias[0];

        const nomEnBase = `${pMatch.nombre} ${pMatch.apellido_paterno}`;
        
        let titulo = "🕵️ POSIBLE COINCIDENCIA DETECTADA";
        if (curpS && pMatch.curp === curpS) {
            titulo = "🆔 IDENTIDAD CONFIRMADA POR CURP";
        } else if (pMatch.nombre.toUpperCase().includes(raizN) && pMatch.apellido_paterno.toUpperCase().includes(raizA)) {
            titulo = "🎯 IDENTIDAD CONFIRMADA POR NOMBRE Y APELLIDOS";
        }

        const esMismo = confirm(`${titulo}\n\nEn base: ${nomEnBase}\nSolicitud: ${nomS} ${apePS}\n\n¿Es la MISMA PERSONA?\n(Aceptar = Actualizar sus datos / Cancelar = Es un familiar)`);

        if (esMismo) {
            idPacienteFinal = pMatch.id;
            
            const updates = {};
            if (curpS && pMatch.curp !== curpS) updates.curp = curpS;
            if (correoS && pMatch.correo_electronico !== correoS) updates.correo_electronico = correoS;
            if (sol.telefono && pMatch.telefono !== sol.telefono) updates.telefono = sol.telefono;
            if (nomS.length > pMatch.nombre.length) updates.nombre = nomS;

            if (Object.keys(updates).length > 0) {
                await fisioNet.from('pacientes_maestros').update(updates).eq('id', idPacienteFinal);
            }
        } else if (pMatch.telefono === sol.telefono) {
            const esFam = confirm(`👥 ¿NUEVO FAMILIAR?\n\n¿Deseas crear un expediente SEPARADO para ${nomS} compartiendo el teléfono de ${pMatch.nombre}?`);
            if (esFam) {
                const { data: nFam, error: errFam } = await fisioNet.from('pacientes_maestros').insert({
                    nombre: nomS, apellido_paterno: apePS, apellido_materno: sol.apellido_m?.toUpperCase(),
                    telefono: sol.telefono, correo_electronico: correoS, curp: curpS,
                    id_clinica: clinicaId, creado_por: user.id
                }).select().single();

                if (errFam) {
                    alert(`¡Alto ahí!\nSupabase rechazó el registro.\nMotivo: ${errFam.message}`);
                    return; 
                }
                idPacienteFinal = nFam.id;
                if (typeof window.crearVinculoInicial === 'function') {
                    await window.crearVinculoInicial(idPacienteFinal, user.id, clinicaId);
                }
            } else { return; } 
        }
    }

    if (!idPacienteFinal) {
        const { data: nPac, error: eP } = await fisioNet.from('pacientes_maestros').insert({
            nombre: nomS, apellido_paterno: apePS, apellido_materno: sol.apellido_m?.toUpperCase(),
            telefono: sol.telefono, correo_electronico: correoS, curp: curpS,
            id_clinica: clinicaId, creado_por: user.id
        }).select().single();

        if (eP) return alert("Error al crear paciente nuevo: " + eP.message);
        idPacienteFinal = nPac.id;
        if (typeof window.crearVinculoInicial === 'function') {
            await window.crearVinculoInicial(idPacienteFinal, user.id, clinicaId);
        }
    }

    const { error: eAg } = await fisioNet.from('agenda_maestra').insert({
        id_paciente: idPacienteFinal,
        id_profesional: user.id,
        id_clinica: clinicaId,
        fecha: sol.fecha_cita,
        hora_inicio_cita: sol.hora_cita,
        modalidad: 'CONSULTORIO',
        estatus: 'PENDIENTE',
        estado: 'ACTIVO'
    });

    if (!eAg) {
        await fisioNet.from('solicitudes_citas').update({ estado: 'APROBADO' }).eq('id', idSolicitud);
        alert("✅ PROCESO COMPLETADO EXITOSAMENTE");
        cargarSalaEspera();
        if (typeof cargarAgenda === 'function') cargarAgenda('semana');
    } else {
        alert("Error al insertar en agenda: " + eAg.message);
    }
};

window.abrirModalConvenio = () => {
    const modal = document.getElementById('modalConvenios');
    if (modal) { modal.style.display = 'flex'; }
};

async function actualizarPrecioVisual() {
    const modalidad = document.getElementById('modalidadCita')?.value || 'CONSULTORIO';
    const selector = document.getElementById('selectConvenioPaciente');
    const vistaPrevia = document.getElementById('vistaPreviaPago');
    const textoMonto = document.getElementById('textoMontoFinal');

    // 1. Obtener la sesión activa para leer las tarifas configuradas del perfil
    const { data: { user } } = await fisioNet.auth.getUser();
    let costoConsultorio = parseFloat(document.getElementById('baseConsultorio')?.value) || 800;
    let costoDomicilio = parseFloat(document.getElementById('baseDomicilio')?.value) || 1200;

    if (user) {
        const { data: perfil } = await fisioNet
            .from('perfiles_profesionales')
            .select('costo_consulta_base, costo_domicilio_base')
            .eq('id', user.id)
            .maybeSingle();

        if (perfil) {
            if (perfil.costo_consulta_base) costoConsultorio = Number(perfil.costo_consulta_base);
            if (perfil.costo_domicilio_base) costoDomicilio = Number(perfil.costo_domicilio_base);
        }
    }

    // 2. Selección estricta e independiente del precio base según modalidad
    let precioBaseFinal = (modalidad === 'CONSULTORIO') ? costoConsultorio : costoDomicilio;

    // 3. Aplicar descuento solo si hay opción seleccionada con convenio
    let porcentajeDescuento = 0;
    if (selector && selector.selectedIndex >= 0) {
        const opcionSeleccionada = selector.options[selector.selectedIndex];
        if (opcionSeleccionada && opcionSeleccionada.dataset.descuento) {
            porcentajeDescuento = parseFloat(opcionSeleccionada.dataset.descuento) || 0;
        }
    }

    const descuentoCalculado = (precioBaseFinal * porcentajeDescuento) / 100;
    const precioFinal = Math.max(0, precioBaseFinal - descuentoCalculado);

    if (textoMonto) textoMonto.innerText = `$${precioFinal.toFixed(2)}`;
    if (vistaPrevia) vistaPrevia.style.display = 'block';
}

document.getElementById('linkMostrarConvenio')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const contenedor = document.getElementById('contenedorSelectorConvenio');
    if (contenedor.style.display === 'none' || contenedor.style.display === '') {
        await inicializarFormularioConvenio(); 
        contenedor.style.display = 'block';
        actualizarPrecioVisual(); 
        e.target.innerText = "✕ Quitar convenio";
    } else {
        contenedor.style.display = 'none'; 
        document.getElementById('selectConvenioPaciente').value = "";
        actualizarPrecioVisual(); 
        e.target.innerText = "+ ¿Aplicar convenio o empresa?";
    }
});

document.getElementById('modalidadCita')?.addEventListener('change', actualizarPrecioVisual);
document.getElementById('selectConvenioPaciente')?.addEventListener('change', actualizarPrecioVisual);

async function inicializarFormularioConvenio() {
    const select = document.getElementById('selectConvenioPaciente');
    if (!select) return;

    try {
        const { data: convenios, error } = await fisioNet
            .from('red_colaboracion')
            .select('id, nombre_entidad, porcentaje_descuento')
            .eq('estado_conexion', 'ACTIVO')
            .order('nombre_entidad', { ascending: true });

        // Siempre dejamos la opción por defecto sin lanzar error
        select.innerHTML = '<option value="" data-descuento="0">👤 PACIENTE PARTICULAR (SIN CONVENIO)</option>';

        if (!error && convenios && convenios.length > 0) {
            convenios.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.dataset.descuento = c.porcentaje_descuento || 0;
                opt.textContent = `🤝 ${c.nombre_entidad} (${c.porcentaje_descuento || 0}% DESC)`;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Error al cargar convenios:", err);
        // Fallback seguro en caso de error de red
        select.innerHTML = '<option value="" data-descuento="0">👤 PACIENTE PARTICULAR (SIN CONVENIO)</option>';
    }
}

async function verificarDisponibilidadReal() {
    const fechaElegida = document.getElementById('fechaCita').value;
    const contenedor = document.getElementById('gridHorariosDisponibles');
    const clinicaId = localStorage.getItem('id_clinica_activa');
    const inputHoraOculto = document.getElementById('horaCita');
    const { data: { user } } = await fisioNet.auth.getUser();

    if (!fechaElegida || !clinicaId || !user) return;

    contenedor.innerHTML = '<div style="text-align:center; width:100%; color:#10b981;"><i class="fas fa-spinner fa-spin"></i> Sincronizando...</div>';
    inputHoraOculto.value = ""; 

    try {
        const [ocupadasRes, perfilRes] = await Promise.all([
            fisioNet.from('agenda_maestra').select('hora_inicio_cita').eq('fecha', fechaElegida).eq('id_clinica', clinicaId).eq('estado', 'ACTIVO'),
            fisioNet.from('perfiles_profesionales').select('horario_atencion, intervalo_cita').eq('id', user.id).single()
        ]);

        const ocupadas = ocupadasRes.data;
        const perfil = perfilRes.data;

        if (!perfil?.horario_atencion) {
            contenedor.innerHTML = '<p style="color:#ef4444; text-align:center; width:100%;">Configura tus horarios primero.</p>';
            return;
        }

        const config = JSON.parse(perfil.horario_atencion);
        const intervalo = parseInt(perfil.intervalo_cita) || 30; 
        const diaNum = new Date(fechaElegida + "T12:00:00").getDay();
        const bloquesHoy = config.filter(h => Number(h.dia) === diaNum);

        const aMin = (h) => h.split(':').reduce((hrs, min) => (hrs * 60) + +min);
        const minToH = (m) => `${Math.floor(m/60).toString().padStart(2,'0')}:${(m%60).toString().padStart(2,'0')}`;

        let espaciosDisponibles = [];

        bloquesHoy.forEach(bloque => {
            let inicio = aMin(bloque.inicio);
            let fin = aMin(bloque.fin);

            while (inicio + intervalo <= fin) {
                const horaGen = minToH(inicio);
                const estaOcupada = ocupadas?.some(o => o.hora_inicio_cita.startsWith(horaGen));
                
                if (!estaOcupada) {
                    espaciosDisponibles.push(horaGen);
                }
                inicio += intervalo; 
            }
        });

        contenedor.innerHTML = ''; 

        if (espaciosDisponibles.length === 0) {
            contenedor.innerHTML = '<p style="color:#64748b; text-align:center; width:100%;">Sin citas para este día.</p>';
            return;
        }

        espaciosDisponibles.forEach(hora => {
            const pastilla = document.createElement('div');
            pastilla.className = 'pastilla-hora disponible'; 
            pastilla.innerText = hora;
            pastilla.onclick = () => {
                document.querySelectorAll('.pastilla-hora').forEach(p => p.classList.remove('seleccionada'));
                pastilla.classList.add('seleccionada');
                inputHoraOculto.value = hora; 
            };
            contenedor.appendChild(pastilla);
        });

    } catch (err) {
        console.error("Error:", err);
        contenedor.innerHTML = '<p>Error de conexión.</p>';
    }
}

document.getElementById('btnNuevaCita')?.addEventListener('click', () => {
    document.getElementById('modalCita').style.display = 'flex';
    if(!document.getElementById('fechaCita').value) {
        document.getElementById('fechaCita').value = new Date().toISOString().split('T')[0];
    }
    verificarDisponibilidadReal();
});

// ==========================================
// 📬 CARGAR SOLICITUDES PENDIENTES DE LA RED (CORREGIDO)
// ==========================================
async function cargarSolicitudesRedPendientes() {
    const contenedorPadre = document.getElementById('contenedorSolicitudesPendientes');
    const contenedorEnviadas = document.getElementById('listaSolicitudesEnviadas');
    const contenedorRecibidas = document.getElementById('listaSolicitudesRecibidasRed');
    
    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        const idClinica = localStorage.getItem('id_clinica_activa');
        if (!user) return;

        // 1. Obtener Recibidas (Red + Colaboradores)
        const { data: recibidasRed } = await fisioNet
            .from('red_colaboracion')
            .select('*')
            .eq('id_doctor_receptor', user.id)
            .eq('estado_conexion', 'PENDIENTE');

        const { data: recibidasColab } = await fisioNet
            .from('colaboradores_clinica')
            .select('id, id_clinica, cargo_clinico, clinicas(nombre_clinica)')
            .eq('id_profesional', user.id)
            .eq('estado', 'PENDIENTE');

        // 2. Obtener Enviadas por mi
        const { data: enviadasRed } = await fisioNet
            .from('red_colaboracion')
            .select('*')
            .eq('id_doctor_emisor', user.id)
            .eq('estado_conexion', 'PENDIENTE');

        const totalRecibidas = (recibidasRed || []).length + (recibidasColab || []).length;
        const totalEnviadas = (enviadasRed || []).length;
        const tienePendientes = totalRecibidas > 0 || totalEnviadas > 0;

        if (contenedorPadre) {
            contenedorPadre.style.setProperty('display', tienePendientes ? 'block' : 'none', 'important');
        }

        // --- RENDERIZAR ENVIADAS (Consultar nombres de a quién se las envié) ---
        if (contenedorEnviadas) {
            if (totalEnviadas === 0) {
                contenedorEnviadas.innerHTML = `<p style="font-size:0.75rem; color:#94a3b8; text-align:center; margin:5px 0;">No has enviado solicitudes pendientes.</p>`;
            } else {
                // Obtener nombres reales de los receptores desde perfiles_profesionales
                const idsReceptores = enviadasRed.map(e => e.id_doctor_receptor).filter(Boolean);
                let mapaReceptores = {};

                if (idsReceptores.length > 0) {
                    const { data: perfilesRec } = await fisioNet
                        .from('perfiles_profesionales')
                        .select('id, nombre_completo, especialidad')
                        .in('id', idsReceptores);

                    (perfilesRec || []).forEach(p => {
                        mapaReceptores[p.id] = p;
                    });
                }

                contenedorEnviadas.innerHTML = enviadasRed.map(sol => {
                    const destinatario = mapaReceptores[sol.id_doctor_receptor];
                    const nombreMostrar = destinatario?.nombre_completo || 'DOCTOR / ESPECIALISTA';
                    const especialidadMostrar = destinatario?.especialidad || sol.tipo_entidad || 'ESPECIALISTA';

                    return `
                        <div style="background:#fff3c7; border:1px solid #fde68a; padding:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <div>
                                <span style="font-size:0.65rem; background:#d97706; color:white; padding:2px 6px; border-radius:4px; font-weight:bold;">ENVIADA A:</span>
                                <h5 style="margin:4px 0 0 0; font-size:0.85rem; color:#78350f;">${nombreMostrar.toUpperCase()}</h5>
                                <small style="font-size:0.7rem; color:#b45309;">🎓 ${especialidadMostrar.toUpperCase()}</small>
                            </div>
                            <small style="font-size:0.7rem; color:#b45309;">⏳ Esperando respuesta</small>
                        </div>
                    `;
                }).join('');
            }
        }

        // --- RENDERIZAR RECIBIDAS ---
        if (contenedorRecibidas) {
            if (totalRecibidas === 0) {
                contenedorRecibidas.innerHTML = `<p style="font-size:0.75rem; color:#94a3b8; text-align:center; margin:5px 0;">Sin invitaciones pendientes.</p>`;
            } else {
                let htmlRecibidas = "";

                (recibidasRed || []).forEach(sol => {
                    htmlRecibidas += `
                        <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:12px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <div>
                                <span style="font-size:0.65rem; background:#2563eb; color:white; padding:2px 6px; border-radius:4px; font-weight:bold;">SOLICITUD DE RED</span>
                                <h5 style="margin:4px 0 2px 0; font-size:0.9rem; color:#1e3a8a; font-weight:800;">${sol.nombre_entidad || 'DOCTOR / ESPECIALISTA'}</h5>
                                <small style="font-size:0.72rem; color:#3b82f6; font-weight:700;">🎓 ${sol.tipo_entidad || 'ESPECIALISTA'}</small>
                            </div>
                            <div style="display:flex; gap:6px;">
                                <button onclick="responderSolicitudRed('${sol.id}', 'ACTIVO', 'RED')" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-size:0.75rem; font-weight:bold;">✅ Aceptar</button>
                                <button onclick="responderSolicitudRed('${sol.id}', 'RECHAZADO', 'RED')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-size:0.75rem; font-weight:bold;">❌</button>
                            </div>
                        </div>`;
                });

                (recibidasColab || []).forEach(sol => {
                    htmlRecibidas += `
                        <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:12px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <div>
                                <span style="font-size:0.65rem; background:#2563eb; color:white; padding:2px 6px; border-radius:4px; font-weight:bold;">INVITACIÓN A CLÍNICA</span>
                                <h5 style="margin:4px 0 2px 0; font-size:0.9rem; color:#1e3a8a; font-weight:800;">${sol.clinicas?.nombre_clinica || 'CLÍNICA'}</h5>
                                <small style="font-size:0.72rem; color:#3b82f6; font-weight:700;">🎓 ${sol.cargo_clinico || 'ESPECIALISTA'}</small>
                            </div>
                            <div style="display:flex; gap:6px;">
                                <button onclick="responderSolicitudRed('${sol.id}', 'ACTIVO', 'COLAB')" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-size:0.75rem; font-weight:bold;">✅ Aceptar</button>
                                <button onclick="responderSolicitudRed('${sol.id}', 'RECHAZADO', 'COLAB')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-size:0.75rem; font-weight:bold;">❌</button>
                            </div>
                        </div>`;
                });

                contenedorRecibidas.innerHTML = htmlRecibidas;
            }
        }

    } catch (err) {
        console.error("❌ Error al cargar solicitudes pendientes:", err);
    }
}

// Handler único unificado para responder solicitudes (RED o COLAB)
window.responderSolicitudRed = async (idSolicitud, nuevoEstado, tipoOrigen = 'RED') => {
    try {
        const idClinica = localStorage.getItem('id_clinica_activa');

        if (tipoOrigen === 'RED') {
            const { data: alianza, error: errRed } = await fisioNet
                .from('red_colaboracion')
                .update({ estado_conexion: nuevoEstado })
                .eq('id', idSolicitud)
                .select()
                .single();

            if (errRed) throw errRed;

            if (nuevoEstado === 'ACTIVO' && idClinica) {
                await fisioNet
                    .from('colaboradores_clinica')
                    .insert([{
                        id_clinica: idClinica,
                        id_profesional: alianza.id_doctor_emisor,
                        rol_sistema: 'SOCIOS_EXTERNOS',
                        cargo_clinico: alianza.tipo_entidad || 'DOCTOR EXTERNO',
                        estado: 'ACTIVO',
                        tipo_vinculo: 'EXTERNO',
                        area_asignada: 'INTERCONSULTA'
                    }]);
            }
        } else {
            const { error: errColab } = await fisioNet
                .from('colaboradores_clinica')
                .update({ 
                    estado: nuevoEstado,
                    fecha_inicio: nuevoEstado === 'ACTIVO' ? new Date().toISOString().split('T')[0] : null
                })
                .eq('id', idSolicitud);

            if (errColab) throw errColab;
        }

        alert(`Solicitud ${nuevoEstado === 'ACTIVO' ? 'aceptada' : 'rechazada'} correctamente.`);
        await cargarSolicitudesRedPendientes();
        if (typeof renderizarTablaAlianzas === 'function') await renderizarTablaAlianzas();

    } catch (err) {
        console.error("❌ Error al responder solicitud:", err);
        alert("Error al responder solicitud: " + err.message);
    }
};


// ==========================================
// ✉️ ENVIAR SOLICITUD DE COLABORACIÓN (VERSIÓN UNIFICADA)
// ==========================================
async function enviarSolicitudColaboracion(idReceptor) {
    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return;

        // 1. Validar que no sea auto-solicitud
        if (user.id === idReceptor) {
            alert("⚠️ No puedes enviarte una solicitud a ti mismo.");
            return;
        }

        // 2. Obtener datos del EMISOR (Quien envía la invitación)
        const { data: perfilEmisor } = await fisioNet
            .from('perfiles_profesionales')
            .select('nombre_completo, especialidad')
            .eq('id', user.id)
            .maybeSingle();

        // 3. Obtener datos del RECEPTOR (Quien recibe la invitación, para la alerta)
        const { data: perfilReceptor } = await fisioNet
            .from('perfiles_profesionales')
            .select('nombre_completo')
            .eq('id', idReceptor)
            .maybeSingle();

        // 4. Verificar si ya existe un registro entre ambos usuarios
        const { data: existente } = await fisioNet
            .from('red_colaboracion')
            .select('id, estado_conexion')
            .or(`and(id_doctor_emisor.eq.${user.id},id_doctor_receptor.eq.${idReceptor}),and(id_doctor_emisor.eq.${idReceptor},id_doctor_receptor.eq.${user.id})`)
            .maybeSingle();

        if (existente) {
            alert(`⚠️ Ya existe una solicitud registrada entre ustedes (Estado: ${existente.estado_conexion}).`);
            if (typeof cerrarModalColega === 'function') cerrarModalColega();
            return;
        }

        // 5. Preparar datos reales del EMISOR para guardar en Supabase
        const nombreEmisor = perfilEmisor?.nombre_completo || user.user_metadata?.full_name || 'COLABORADOR PROFESIONAL';
        const especialidadEmisor = (perfilEmisor?.especialidad || 'ESPECIALISTA').toUpperCase().trim();

        // 6. Insertar en red_colaboracion
     const nombreReceptor = perfilReceptor?.nombre_completo || 'DOCTOR / ESPECIALISTA';

const { error } = await fisioNet
    .from('red_colaboracion')
    .insert([{
        id_doctor_emisor: user.id,
        id_doctor_receptor: idReceptor,
        id_usuario_socio: idReceptor,
        nombre_entidad: nombreReceptor, // 👈 Se guarda el receptor como nombre de entidad por defecto
        contacto_principal: nombreReceptor,
        tipo_entidad: especialidadEmisor,
        estado_conexion: 'PENDIENTE'
    }]);

        if (error) throw error;

        const nombreDestino = perfilReceptor?.nombre_completo || 'el especialista';
        alert(`✉️ Solicitud enviada correctamente a ${nombreDestino}.`);
        
        if (typeof cerrarModalColega === 'function') cerrarModalColega();
        await cargarSolicitudesRedPendientes();

    } catch (err) {
        console.error("❌ Error al enviar solicitud:", err);
        alert("No se pudo enviar la solicitud: " + err.message);
    }
}

async function cargarSolicitudesRecibidas() {
    const lista = document.getElementById('listaEsperaReferidos'); 
    const badge = document.getElementById('badgeSolicitudes');

    if (!lista) return;

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return;

        const clinicaId = localStorage.getItem('id_clinica_activa');
        const miEspecialidad = (localStorage.getItem('especialidadUsuario') || '').toUpperCase();
        // Leemos el rol operativo actual guardado en localStorage
        const miRolSistema = (localStorage.getItem('rol_actual') || 'STAFF_CLINICO').toUpperCase();

        let htmlFinal = "";
        let totalAlertasTotal = 0;

        // -------------------------------------------------------------
        // 1. ESTUDIOS DE GABINETE
        // -------------------------------------------------------------
        const esRadiologo = miEspecialidad === 'MEDICO-RADIOLOGO' || miEspecialidad === 'QUIMICO' || miEspecialidad.includes('RADIOL');

        if (esRadiologo) {
            const { data: pendientes, errorRad } = await fisioNet
                .from('estudios_gabinete')
                .select('*')
                .eq('estado_dictamen', 'PENDIENTE')
                .eq('doctor_emisor_id', user.id) 
                .order('fecha_registro', { ascending: false });

            if (errorRad) console.error("Error cargando estudios:", errorRad);

            if (pendientes && pendientes.length > 0) {
                totalAlertasTotal += pendientes.length;
                pendientes.forEach(est => {
                    const fechaEstudio = new Date(est.fecha_registro).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                    htmlFinal += `
                    <div style="background: #fff; padding: 18px; border-radius: 15px; border: 1px solid #e2e8f0; margin-bottom: 15px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border-left: 5px solid #f59e0b !important;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                            <div style="text-align: left;">
                                <span style="background: #fff3c7; color: #d97706; padding: 2px 8px; border-radius: 5px; font-size: 0.65rem; font-weight: 800; border: 1px solid #fde68a;">🩻 DICTAMEN PENDIENTE</span>
                                <h4 style="margin: 8px 0 2px 0; font-size: 0.95rem; color: #1e293b; font-weight: 900; text-transform: uppercase;">${est.paciente_nombre_manual}</h4>
                                <p style="margin: 0; font-size: 0.75rem; color: #2563eb; font-weight: 700;">${est.tipo_estudio} - [${(est.zona_anatomica || '').toUpperCase()}]</p>
                            </div>
                            <div>
                                <button onclick="irAPortalGabineteDesdeDashboard('${est.archivo_url}', '${est.paciente_nombre_manual}')" 
                                        style="background: #1e293b; color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 0.72rem; font-weight: bold; transition: 0.3s; display: flex; align-items: center; gap: 5px;">
                                    <i class="fas fa-microscope text-warning"></i> INTERPRETAR
                                </button>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px dashed #e2e8f0; text-align: left;">
                            <div style="font-size: 0.7rem; color: #64748b;">
                                <strong>🏢 Gabinete:</strong> ${est.especialista_nombre || 'Sede Asociada'}
                            </div>
                            <div style="font-size: 0.7rem; color: #64748b; font-weight: bold;">
                                ⏰ Recibido: ${fechaEstudio}
                            </div>
                        </div>
                    </div>`;
                });
            }
        }

        // -------------------------------------------------------------
        // 2. SOLICITUDES DE CITAS (USANDO LOS ROLES REALES DEL SISTEMA)
        // -------------------------------------------------------------
        // ADMIN_SISTEMA y ADMINISTRATIVO ven todas las citas de la sede
        const esPersonalAdministrativo = ['ADMIN_SISTEMA', 'ADMINISTRATIVO'].includes(miRolSistema);

        let queryCitas = fisioNet
            .from('solicitudes_citas')
            .select('*')
            .eq('estado', 'PENDIENTE')
            .eq('id_clinica_solicitada', clinicaId);

        // Si es STAFF_CLINICO u OPERATIVO, solo le mostramos las solicitudes explícitamente asignadas a él
        if (!esPersonalAdministrativo) {
            queryCitas = queryCitas.eq('id_profesional_solicitado', user.id);
        }

        const { data: solicitudesCitas, errorCitas } = await queryCitas.order('creado_el', { ascending: false });

        if (errorCitas) console.error("Error al consultar citas pendientes:", errorCitas);

        if (solicitudesCitas && solicitudesCitas.length > 0) {
            totalAlertasTotal += solicitudesCitas.length;
            solicitudesCitas.forEach(sol => {
                const nombreFull = `${sol.nombre} ${sol.apellido_p} ${sol.apellido_m || ''}`.toUpperCase();
                htmlFinal += `
                <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); border-left: 5px solid #10b981 !important;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="text-align: left;">
                            <span style="background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 5px; font-size: 0.6rem; font-weight: 800;">📅 SOLICITUD WEB</span>
                            <strong style="display: block; font-size: 0.85rem; color: #1e293b; margin-top: 5px;">${nombreFull}</strong>
                            <small style="color: #64748b;">Día: ${sol.fecha_cita} - Hora: ⏰ ${sol.hora_cita ? sol.hora_cita.substring(0,5) : ''}</small>
                        </div>
                        <div style="display: flex; gap: 5px;">
                            <button onclick="procesarSolicitud('${sol.id}', 'APROBAR')" style="background: #10b981; color: white; border: none; padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 0.7rem;">✅</button>
                            <button onclick="procesarSolicitud('${sol.id}', 'RECHAZAR')" style="background: #ef4444; color: white; border: none; padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 0.7rem;">🗑️</button>
                        </div>
                    </div>
                    <div style="margin-top: 8px; font-size: 0.7rem; color: #2563eb; font-weight: bold; text-align: left;">
                        📞 TEL: ${sol.telefono} 
                    </div>
                </div>`;
            });
        }

        // -------------------------------------------------------------
        // 3. ACTUALIZACIÓN DE INTERFAZ (Única asignación sin destellos)
        // -------------------------------------------------------------
        if (badge) badge.innerText = totalAlertasTotal;

        if (htmlFinal !== "") {
            lista.innerHTML = htmlFinal;
        } else {
            lista.innerHTML = `<div style="text-align: center; color: #94a3b8; font-size: 0.8rem; padding: 20px;"><i class="fas fa-check-circle text-success d-block fa-2x mb-2"></i>Sin solicitudes ni estudios pendientes.</div>`;
        }

    } catch (err) {
        console.error("❌ Error al cargar solicitudes/pendientes:", err);
    }
}

function irAPortalGabineteDesdeDashboard(archivoUrl, pacienteNombre) {
    localStorage.setItem('forzar_apertura_archivo', archivoUrl);
    localStorage.setItem('forzar_apertura_paciente', pacienteNombre);
    window.location.href = 'portal-gabinete.html'; 
}

function mostrarSeccion(seccionId) {
    const agenda = document.getElementById('agenda-container');
    const comunidad = document.getElementById('seccionComunidad');

    if (agenda) agenda.style.setProperty('display', 'none', 'important');
    if (comunidad) comunidad.style.setProperty('display', 'none', 'important');

    const activa = document.getElementById(seccionId);
    if (activa) {
        activa.style.setProperty('display', 'block', 'important');
    }

    if (seccionId === 'seccionComunidad') {
        if (typeof cargarSolicitudesRecibidas === 'function') cargarSolicitudesRecibidas();
    }
    
    if (seccionId === 'agenda-container') {
        if (typeof cargarAgenda === 'function') cargarAgenda('semana');
    }
}

async function buscarColegasFisioCid() {
    const query = document.getElementById('inputBusquedaColegas').value.trim();
    const filtroEspecialidad = document.getElementById('filtroEspecialidad').value;
    const grid = document.getElementById('gridResultadosColegas');

    if (!grid) return;

    grid.innerHTML = '<div style="text-align:center; width:100%;"><i class="fas fa-spinner fa-spin"></i> Buscando colegas...</div>';

    try {
        let consulta = fisioNet
            .from('perfiles_profesionales')
            .select('id, nombre_completo, especialidad');

        if (query !== "") {
            consulta = consulta.ilike('nombre_completo', `%${query}%`);
        }

        if (filtroEspecialidad !== 'ALL' && filtroEspecialidad !== 'Todas las especialidades') {
            consulta = consulta.eq('especialidad', filtroEspecialidad);
        }

        const { data: colegas, error } = await consulta.limit(20);

        if (error) throw error;

        if (!colegas || colegas.length === 0) {
            grid.innerHTML = `<p style="text-align:center; grid-column:1/-1; color:#64748b;">
                No se encontró a "${query}". <br>
                <small>Intenta buscando solo la primera palabra del nombre.</small>
            </p>`;
            return;
        }

        grid.innerHTML = ''; 

        colegas.forEach(c => {
            const fotoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.nombre_completo)}&background=random&color=fff`;

            grid.innerHTML += `
                <div style="background:white; padding:20px; border-radius:15px; border:1px solid #e2e8f0; text-align:center;">
                    <img src="${fotoUrl}" style="width:70px; height:70px; border-radius:50%; object-fit:cover; margin-bottom:10px;">
                    <h4 style="margin:0; font-size:0.9rem;">${c.nombre_completo}</h4>
                    <p style="margin:5px 0; font-size:0.75rem; color:#64748b; font-weight:bold;">${c.especialidad}</p>
                    <button onclick="verDetalleColega('${c.id}')" style="margin-top:10px; background:var(--primary); color:white; border:none; padding:8px 15px; border-radius:8px; cursor:pointer; font-size:0.8rem; width:100%;">Ver Perfil</button>
                </div>
            `;
        });
    } catch (err) {
        console.error("Error en el buscador:", err);
        grid.innerHTML = '<p style="color:red; text-align:center;">Error al conectar.</p>';
    }
}

async function verDetalleColega(idColega) {
    const modal = document.getElementById('modalPerfilColega');
    
    try {
        const { data: { user } } = await fisioNet.auth.getUser();

        const { data: perfiles, error } = await fisioNet
            .from('perfiles_profesionales')
            .select(`
                nombre_completo, 
                cedula_profesional, 
                cedulas_adicionales, 
                especialidad, 
                institucion_egreso, 
                telefono_contacto, 
                correo_institucional, 
                direccion_consultorio, 
                costo_consulta_base
            `)
            .eq('id', idColega);

        if (error) throw error;

        if (perfiles && perfiles.length > 0) {
            const c = perfiles[0];
            
            document.getElementById('modalColegaNombre').innerText = c.nombre_completo || 'Sin Nombre';
            document.getElementById('modalColegaEspecialidad').innerText = c.especialidad || 'MÉDICO';
            document.getElementById('modalColegaInstitucion').innerText = c.institucion_egreso || 'No especificada';
            document.getElementById('modalColegaCedula').innerText = (c.cedula_profesional || 'Sin registro') + (c.cedulas_adicionales ? ` | ${c.cedulas_adicionales}` : '');

            const txtClinica = document.getElementById('modalColegaClinica');
            if (txtClinica) txtClinica.innerText = c.direccion_consultorio || 'Consultorio Privado';
            
            const txtCosto = document.getElementById('modalColegaCosto');
            if (txtCosto) txtCosto.innerText = c.costo_consulta_base ? `$${c.costo_consulta_base} MXN` : 'A convenir';

            gestionarEnlaceContacto('modalColegaEmail', c.correo_institucional, 'mailto:');
            gestionarEnlaceContacto('modalColegaTelefono', c.telefono_contacto, 'tel:');

            const btnEnlazar = document.getElementById('btnEnlazarModal');
            if (btnEnlazar) {
                // 🚫 Si estoy viendo MI PROPIO perfil, ocultar o desactivar el botón
                if (user && user.id === idColega) {
                    btnEnlazar.style.display = 'none';
                } else {
                    btnEnlazar.style.display = 'block';
                    btnEnlazar.onclick = () => enviarSolicitudColaboracion(idColega);
                }
            }

            modal.style.display = 'flex';
        }
    } catch (err) {
        console.error("❌ Error de vinculación con Supabase:", err);
    }
}

function gestionarEnlaceContacto(idElemento, valor, prefijo) {
    const el = document.getElementById(idElemento);
    if (!el) return;
    if (valor) {
        el.href = prefijo + valor;
        const txt = el.querySelector('span:last-child');
        if (txt) txt.innerText = valor;
        el.style.display = 'flex';
    } else {
        el.style.display = 'none';
    }
}

function cerrarModalColega() {
    document.getElementById('modalPerfilColega').style.display = 'none';
}



document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await fisioNet.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    const clinicaActiva = localStorage.getItem('id_clinica_activa');

    // 1. Aplicar UI básica e Identidad Visual
    await aplicarIdentidadVisual(); 
    await actualizarInterfazSede(); 

    // 2. OBTENER EL ROL PRIMERO (Paso crítico para evitar que fallen las consultas posteriores)
    if (clinicaActiva) {
        await obtenerYGuardarRolOperativo(user.id, clinicaActiva);
    }

    // 3. Renderizar componentes de UI basados en el rol
    renderizarBotonesPorRol();

    // 4. Cargar nombre de usuario
    let nombreTrabajador = localStorage.getItem('nombre_completo');
    if (!nombreTrabajador || nombreTrabajador === 'null') {
        try {
            const { data: perfilProf } = await fisioNet
                .from('perfiles_profesionales')
                .select('nombre_completo')
                .eq('id', user.id)
                .maybeSingle();

            nombreTrabajador = perfilProf?.nombre_completo || user.user_metadata?.full_name || "COLABORADOR ACTIVO";
            localStorage.setItem('nombre_completo', nombreTrabajador);
        } catch (e) {
            nombreTrabajador = "COLABORADOR ACTIVO";
        }
    }

    const txtSaludo = document.getElementById('txtSaludo');
    if (txtSaludo) txtSaludo.innerText = `BIENVENIDO, ${nombreTrabajador.toUpperCase()}`;

    const hoy = new Date();
    const inputFecha = document.getElementById('filtroFechaAgenda');
    if (inputFecha) inputFecha.value = hoy.toISOString().split('T')[0];

    // 5. Cargar módulos secuencialmente
    await cargarAgenda('semana');
    await cargarEstadisticas();
    await cargarMonitorBoxes(); 
    await cargarSolicitudesRecibidas(); // Carga las solicitudes de cita y estudios sin parpadeos
    await cargarSolicitudesRedPendientes(); // Carga las invitaciones de red
    await inicializarFormularioConvenio(); 

    if (typeof renderizarTablaEquipo === 'function') await renderizarTablaEquipo();
    if (typeof renderizarTablaAlianzas === 'function') await renderizarTablaAlianzas(); 
    
    await verificarInvitacionesPendientes(); 
    await comprobarConfiguracionInicialRequerida();
});

async function verificarInvitacionesPendientes() {
    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user || !user.email) return;

        const { data: invitaciones, error } = await fisioNet
            .from('invitaciones_clinicas')
            .select('*')
            .eq('correo_institucional', user.email)
            .eq('estado', 'PENDIENTE');

        if (error) throw error;

        if (invitaciones && invitaciones.length > 0) {
            mostrarAlertaInvitacion(invitaciones[0]);
        }
    } catch (err) {
        console.error("Error en El Portero:", err);
    }
}

function mostrarAlertaInvitacion(inv) {
    const modalHtml = `
    <div id="modalPorteroInv" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.85); backdrop-filter:blur(8px); z-index:99999; display:flex; justify-content:center; align-items:center;">
        <div style="background:white; padding:40px 30px; border-radius:24px; max-width:420px; width:90%; text-align:center; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
            <div style="font-size:4rem; margin-bottom:15px; animation: pulse 2s infinite;">🏥</div>
            <h2 style="color:#1e293b; margin:0 0 10px 0; font-weight:800; font-size:1.5rem;">¡TIENES UNA INVITACIÓN!</h2>
            
            <div style="background:#f8fafc; border-radius:16px; padding:20px; margin-bottom:25px; border: 1px dashed #cbd5e1;">
                <p style="color:#64748b; font-size:0.85rem; margin:0 0 10px 0; text-transform:uppercase; font-weight:700;">Clínica Anfitriona:</p>
                <p style="color:#1e293b; font-weight:900; margin:0 0 15px 0;">${inv.nombre_clinica}</p>
                
                <span style="background:#eff6ff; color:#2563eb; padding:8px 15px; border-radius:10px; font-weight:900; font-size:1rem; display:inline-block; border: 1px solid #bfdbfe; margin-bottom:10px;">
                    ${inv.cargo_clinico}
                </span>
                
                <div style="font-size:0.8rem; color:#475569; font-weight:600;">
                    📍 Área: ${inv.area_asignada || 'General'} <br>
                    ⏰ Turno: ${inv.turno || 'No especificado'} <br>
                    🔗 Vínculo: <strong>${inv.tipo_vinculo || 'COLABORADOR'}</strong>
                </div>
            </div>

            <div style="display:flex; gap:15px; justify-content:center;">
                <button onclick="procesarRespuestaInv('${inv.id}', 'ACEPTADO', '${inv.id_clinica_padre}', '${inv.nombre_clinica}')" 
                        style="background:#10b981; color:white; border:none; padding:15px; border-radius:14px; font-weight:800; cursor:pointer; flex:1; font-size:1rem; transition:0.2s;">
                    ✅ ACEPTAR
                </button>
                
                <button onclick="procesarRespuestaInv('${inv.id}', 'RECHAZADO', null, null)" 
                        style="background:#fee2e2; color:#ef4444; border:none; padding:15px; border-radius:14px; font-weight:800; cursor:pointer; flex:1; font-size:1rem; transition:0.2s;">
                    ❌ RECHAZAR
                </button>
            </div>
        </div>
    </div>
    <style>@keyframes pulse { 0% {transform: scale(1);} 50% {transform: scale(1.1);} 100% {transform: scale(1);} }</style>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.procesarRespuestaInv = async (idInv, respuesta, idClinica, nombreClinica) => {
    try {
        const { data: datosInv, error: errUpdateInv } = await fisioNet
            .from('invitaciones_clinicas')
            .update({ estado: respuesta })
            .eq('id', idInv)
            .select('rol_asignado, cargo_clinico, area_asignada, turno, id_superior_directo, tipo_vinculo')
            .single();

        if (errUpdateInv) throw new Error("No se pudo actualizar la invitación.");

        if (respuesta === 'ACEPTADO') {
            const { data: { user } } = await fisioNet.auth.getUser();

            const esExterno = datosInv.cargo_clinico?.toUpperCase().includes('EXTERNO') || 
                              datosInv.rol_asignado === 'SOCIOS_EXTERNOS' ||
                              datosInv.cargo_clinico?.toUpperCase().includes('ALIANZA');

            const { error: errInsertColab } = await fisioNet
                .from('colaboradores_clinica')
                .insert([{
                    id_clinica: idClinica,
                    id_profesional: user.id,
                    rol_sistema: datosInv.rol_asignado,
                    cargo_clinico: datosInv.cargo_clinico || 'STAFF',
                    area_asignada: datosInv.area_asignada || 'GENERAL', 
                    turno: datosInv.turno || 'MATUTINO',
                    id_superior_directo: datosInv.id_superior_directo || null,
                    tipo_vinculo: datosInv.tipo_vinculo || (esExterno ? 'EXTERNO' : 'INTERNO'),
                    estado: 'ACTIVO'
                }]);

            if (errInsertColab) throw new Error("Invitación aceptada, pero falló la creación del equipo.");

            localStorage.setItem('id_clinica_activa', idClinica);
            localStorage.setItem('nombre_clinica', nombreClinica);

            alert(`🎉 ¡Bienvenido(a) a ${nombreClinica}! Tu cuenta ha sido vinculada con éxito.`);
        } else {
            alert("Has rechazado la invitación correctamente.");
        }

        const modal = document.getElementById('modalPorteroInv');
        if (modal) modal.remove();

        window.location.reload();

    } catch (err) {
        console.error("💥 ERROR CRÍTICO:", err.message);
        alert("Algo salió mal: " + err.message);
    }
};

window.lanzarLaboratorioGeneral = async () => {
    try {
        const { data: { user }, error } = await fisioNet.auth.getUser();

        if (error || !user) {
            window.location.href = 'portal-laboratorio.html';
            return;
        }

        const nombreProfesional = user.user_metadata?.full_name || localStorage.getItem('nombre_completo') || "ESPECIALISTA FISIOCID";
        const sedeActual = localStorage.getItem('nombre_clinica') || "FISIOCID-MATRIZ";
        const colorActual = localStorage.getItem('clinica_color') || "#00cfd5";

        localStorage.setItem('full_name', nombreProfesional);
        localStorage.setItem('id_socio_activo', user.id);
        localStorage.setItem('clinica_nombre', sedeActual);
        localStorage.setItem('clinica_color', colorActual);

        window.location.href = 'portal-laboratorio.html';

    } catch (err) {
        window.location.href = 'portal-laboratorio.html';
    }
};

window.dispararModalCobroAsistido = async (idCita, idPaciente, nombrePaciente, montoSugerido, conceptoSugerido) => {
    document.getElementById('cobro_idCita').value = idCita || "";
    document.getElementById('cobro_idPaciente').value = idPaciente || "";
    document.getElementById('cobro_pacienteNombre').value = nombrePaciente ? nombrePaciente.toUpperCase() : "PACIENTE GENERAL";
    document.getElementById('cobro_montoTotal').value = montoSugerido || 0;
    document.getElementById('cobro_concepto').value = conceptoSugerido ? conceptoSugerido.toUpperCase() : "CONSULTA DE FISIOTERAPIA";
    document.getElementById('cobro_metodo').value = "EFECTIVO";
    document.getElementById('cobro_notas').value = "";

    document.getElementById('modalCobroAsistido').style.display = 'flex';
};

window.cerrarModalCobro = () => {
    document.getElementById('modalCobroAsistido').style.display = 'none';
};

async function asentarIngresoEnCaja() {
    const idCita = document.getElementById('cobro_idCita').value;
    const idPaciente = document.getElementById('cobro_idPaciente').value;
    const concepto = document.getElementById('cobro_concepto').value;
    const metodo = document.getElementById('cobro_metodo').value;
    const monto = parseFloat(document.getElementById('cobro_montoTotal').value) || 0;
    const notas = document.getElementById('cobro_notas').value;
    const clinicaId = localStorage.getItem('id_clinica_activa');

    const { data: { user } } = await fisioNet.auth.getUser();

    if (!idCita || !clinicaId) {
        alert("⚠️ No se puede asentar el pago: Faltan datos de la cita o clínica.");
        return;
    }

    try {
        const { error: errPago } = await fisioNet.from('caja_movimientos').insert({
            id_clinica: clinicaId,
            id_paciente: idPaciente || null,
            id_cita: idCita,
            id_atendido_por: user.id,
            tipo_movimiento: 'INGRESO',
            concepto: concepto,
            metodo_pago: metodo,
            monto: monto,
            observaciones: notas,
            fecha_registro: new Date().toISOString()
        });

        if (errPago) throw errPago;

        const { error: errCita } = await fisioNet
            .from('agenda_maestra')
            .update({ pago_status: 'PAGADO', estatus: 'COMPLETADO' })
            .eq('id_cita', idCita);

        if (errCita) throw errCita;

        alert("✅ INGRESO REGISTRADO EN CAJA EXITOSAMENTE");
        cerrarModalCobro();
        await cargarAgenda('semana');
        await cargarEstadisticas();

    } catch (err) {
        console.error("❌ Error al asentar el pago:", err);
        alert("Error al registrar cobro: " + err.message);
    }
}

document.getElementById('btnRegistrarPagoFinal')?.addEventListener('click', asentarIngresoEnCaja);

async function obtenerYGuardarRolOperativo(userId, clinicaId) {
    try {
        const { data: colaborador, error } = await fisioNet
            .from('colaboradores_clinica')
            .select('rol_sistema')
            .eq('id_profesional', userId)
            .eq('id_clinica', clinicaId)
            .maybeSingle();

        if (error) throw error;

        let rolFinal = 'STAFF_CLINICO';
        
        if (colaborador && colaborador.rol_sistema) {
            rolFinal = colaborador.rol_sistema;
        }

        localStorage.setItem('rol_actual', rolFinal);

    } catch (error) {
        console.error("❌ Error al recuperar el rol operativo:", error.message);
        localStorage.setItem('rol_actual', 'STAFF_CLINICO');
    }
}

function renderizarBotonesPorRol() {
    const contenedor = document.getElementById('contenedorAccionesRapidas');
    if (!contenedor) return;

    const miRol = (localStorage.getItem('rol_actual') || 'STAFF_CLINICO').toUpperCase(); 
    const esAdmin = (miRol === 'ADMIN_SISTEMA');
    const puedeGestionarEquipo = (miRol === 'ADMIN_SISTEMA' || miRol === 'ADMINISTRATIVO');
    
    const btnEquipo = document.getElementById('btnMiEquipo');
    const btnPrecios = document.getElementById('btnAbrirConfig');
    const btnIdentidad = document.getElementById('btnIdentidadVisual');

    if (btnEquipo) btnEquipo.style.display = puedeGestionarEquipo ? 'flex' : 'none';
    if (btnPrecios) btnPrecios.style.display = esAdmin ? 'flex' : 'none';
    if (btnIdentidad) btnIdentidad.style.display = esAdmin ? 'flex' : 'none';

    const catalogoBotones = {
        agregarPaciente: `<button class="btn-action" onclick="window.location.href='nuevo-paciente.html'">📝 Agregar Paciente</button>`,
        listaPacientes: `<button class="btn-action" onclick="window.location.href='lista-pacientes.html'">👥 Lista de Pacientes</button>`,
        inventario:      `<button class="btn-action" onclick="window.location.href='inventario.html'">📦 Inventario</button>`,
        nuevoEstudio:   `<button class="btn-action" onclick="window.location.href='portal-gabinete.html'">📡 Nuevo Estudio</button>`,
        laboratorio:    `<button class="btn-action" onclick="lanzarLaboratorioGeneral()">🧪 Nuevo Laboratorio</button>`,
        finanzas:       `<button class="btn-action" onclick="window.location.href='finanzas.html'">📊 Control de Caja</button>`
    };

    let botonesAJS = [];

    switch(miRol) {
        case 'ADMIN_SISTEMA':
            botonesAJS = [
                catalogoBotones.agregarPaciente, catalogoBotones.listaPacientes,
                catalogoBotones.inventario, catalogoBotones.nuevoEstudio,
                catalogoBotones.laboratorio, catalogoBotones.finanzas
            ];
            break;

        case 'ADMINISTRATIVO':
            botonesAJS = [
                catalogoBotones.agregarPaciente, 
                catalogoBotones.listaPacientes, 
                catalogoBotones.inventario,
                catalogoBotones.finanzas
            ];
            break;

        case 'STAFF_CLINICO':
            botonesAJS = [
              catalogoBotones.agregarPaciente, 
                catalogoBotones.listaPacientes, 
                catalogoBotones.nuevoEstudio, 
                catalogoBotones.laboratorio
            ];
            break;

        case 'OPERATIVO':
            botonesAJS = [
                catalogoBotones.listaPacientes
            ]; 
            break;

        default:
            botonesAJS = [catalogoBotones.listaPacientes];
            break;
    }

    contenedor.innerHTML = botonesAJS.join('');
}

function cargarHorariosEnModal(dataHorarios) {
    const contenedor = document.getElementById('contenedorHorarios');
    if (!contenedor) return;

    contenedor.innerHTML = '';

    let horarios;
    try {
        horarios = typeof dataHorarios === 'string' ? JSON.parse(dataHorarios) : dataHorarios;
    } catch (e) {
        console.error("Error al parsear el JSON de horarios:", e);
        return;
    }

    if (!Array.isArray(horarios) || horarios.length === 0) return;

    // 1. Normalizar estructura
    const horariosNormalizados = horarios.map(h => ({
        dia: parseInt(h.dia, 10),
        inicio: h.inicio,
        fin: h.fin
    })).filter(h => !isNaN(h.dia));

    // 2. Agrupar bloques por combinación exacta de (inicio - fin)
    const mapaTurnos = {};
    horariosNormalizados.forEach(h => {
        const claveTurno = `${h.inicio}_${h.fin}`;
        if (!mapaTurnos[claveTurno]) {
            mapaTurnos[claveTurno] = { inicio: h.inicio, fin: h.fin, dias: [] };
        }
        mapaTurnos[claveTurno].dias.push(h.dia);
    });

    const diasLV = [1, 2, 3, 4, 5];
    let horariosAgrupados = [];

    // 3. Evaluar cada turno detectado
    Object.values(mapaTurnos).forEach(turno => {
        const diasDelTurno = turno.dias;
        // Verificar si este turno específico ocurre los 5 días de Lunes a Viernes
        const esTurnoCompletoLV = diasLV.every(d => diasDelTurno.includes(d));

        if (esTurnoCompletoLV) {
            // Se condensa como Lunes a Viernes
            horariosAgrupados.push({ dia: 'LV', inicio: turno.inicio, fin: turno.fin });

            // Si hay días adicionales fuera de L-V (ej. Sábado 6 o Domingo 0) con este mismo turno
            diasDelTurno.filter(d => d === 6 || d === 0).forEach(dExtra => {
                horariosAgrupados.push({ dia: dExtra, inicio: turno.inicio, fin: turno.fin });
            });
        } else {
            // Si no son los 5 días continuos, se muestran los días individualmente
            diasDelTurno.forEach(d => {
                horariosAgrupados.push({ dia: d, inicio: turno.inicio, fin: turno.fin });
            });
        }
    });

    // 4. Renderizar tarjetas en el modal
    horariosAgrupados.forEach(h => {
        const valDia = String(h.dia);
        const div = document.createElement('div');
        div.className = 'bloque-horario';
        div.style.cssText = "background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 10px; position: relative;";
        
        div.innerHTML = `
            <select class="dia-semana" style="width: 100%; margin-bottom:10px; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-weight: bold; color: #1e293b;">
                <option value="LV" ${valDia === 'LV' ? 'selected' : ''}>LUNES A VIERNES</option>
                <option value="1" ${valDia === '1' ? 'selected' : ''}>LUNES</option>
                <option value="2" ${valDia === '2' ? 'selected' : ''}>MARTES</option>
                <option value="3" ${valDia === '3' ? 'selected' : ''}>MIÉRCOLES</option>
                <option value="4" ${valDia === '4' ? 'selected' : ''}>JUEVES</option>
                <option value="5" ${valDia === '5' ? 'selected' : ''}>VIERNES</option>
                <option value="6" ${valDia === '6' ? 'selected' : ''}>SÁBADO</option>
                <option value="0" ${valDia === '0' ? 'selected' : ''}>DOMINGO</option>
            </select>
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="time" class="h-ini" value="${h.inicio}" style="flex:1; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-weight: 600;">
                <span style="color: #94a3b8; font-size: 0.8rem; font-weight: bold;">a</span>
                <input type="time" class="h-fin" value="${h.fin}" style="flex:1; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-weight: 600;">
            </div>
        `;
        
        contenedor.appendChild(div);
    });
}