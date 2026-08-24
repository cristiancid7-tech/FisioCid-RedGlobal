// 1. Al cargar el Dashboard, lo primero es saber qué se eligió
const sedeElegidaID = localStorage.getItem('id_clinica_activa');
const sedeElegidaNombre = localStorage.getItem('nombre_clinica');

async function actualizarInterfazSede() {
    const labelSede = document.getElementById('sedeActivaTexto') || document.getElementById('txtSedeActual'); 
    const sedeElegidaNombre = localStorage.getItem('nombre_clinica');
    const usuarioId = localStorage.getItem('usuarioId');
    const clinicaId = localStorage.getItem('id_clinica_activa');

    // 1. Identidad Visual de la Sede (Nombre y Color)
    if (sedeElegidaNombre && labelSede) {
        labelSede.innerText = `SEDE ACTIVA: ${sedeElegidaNombre.toUpperCase()}`;
    }

    const colorSede = localStorage.getItem('clinica_color');
    if (colorSede) {
        document.querySelectorAll('.btn-principal').forEach(btn => {
            btn.style.backgroundColor = colorSede;
        });
    }

    // 🚀 2. Sincronización PROFESIONAL Inteligente (Tu idea estrella)
    localStorage.removeItem('especialidadUsuario');

    if (usuarioId) {
        console.log("🔍 Sincronizando rol clínico/operativo del profesional activo...");
        
        // Intento A: Buscar en perfiles profesionales
        const { data: perfil, error } = await fisioNet
            .from('perfiles_profesionales')
            .select('especialidad') 
            .eq('id', usuarioId)
            .maybeSingle();

        if (perfil && perfil.especialidad) {
            const especialidadReal = perfil.especialidad
                .toUpperCase()
                .trim()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");

            localStorage.setItem('especialidadUsuario', especialidadReal);
            
            // Pintar en el HTML si existe el elemento
            const txtEspUI = document.getElementById('txtEspecialidadUsuario');
            if (txtEspUI) txtEspUI.innerText = especialidadReal;
            
            console.log(`🎯 FisioCid: Especialidad médica detectada -> [${especialidadReal}]`);
        } else {
            // 🔥 Intento B (Tu Idea): No es médico, es Staff. Buscamos su cargo operativo.
            console.log("👥 No se detectó especialidad médica. Buscando cargo operativo en Staff...");
            
            if (clinicaId) {
                const { data: colaborador } = await fisioNet
                    .from('colaboradores_clinica')
                    .select('cargo_clinico')
                    .eq('id_profesional', usuarioId)
                    .eq('id_clinica', clinicaId)
                    .maybeSingle();

                const cargoFinal = colaborador?.cargo_clinico 
                    ? colaborador.cargo_clinico.toUpperCase().trim() 
                    : "PERSONAL DE APOYO";

                localStorage.setItem('especialidadUsuario', cargoFinal);
                
                const txtEspUI = document.getElementById('txtEspecialidadUsuario');
                if (txtEspUI) txtEspUI.innerText = cargoFinal; // 👈 Rellena la especialidad con su cargo
                
                console.log(`🎯 FisioCid: Cargo operativo asignado como especialidad -> [${cargoFinal}]`);
            } else {
                localStorage.setItem('especialidadUsuario', 'STAFF OPERATIVO');
            }
        }
    }
}
// Llamamos a la función al cargar
document.addEventListener('DOMContentLoaded', () => {
    actualizarInterfazSede();
    inicializarRedFisioCid();
    cargarAgenda(); 

});

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
        // 1. Total de Expedientes Únicos en la clínica
        // Filtramos por id_clinica para tener el total global de tu sede
        const { count: totalPacientes } = await fisioNet
            .from('vinculos_clinicos')
            .select('*', { count: 'exact', head: true })
            .eq('id_clinica', clinicaId); // Cambiado para contar todos los de la clínica

        // 2. Citas del día (Excluyendo las canceladas para ser exactos)
        const { count: citasHoy } = await fisioNet
            .from('agenda_maestra')
            .select('*', { count: 'exact', head: true })
            .eq('id_clinica', clinicaId)
            .eq('fecha', hoy)
            .neq('estado', 'CANCELADO'); // Filtro extra para realismo profesional

        // 3. Inventario (Este bloque está excelente, solo asegúrate de los IDs)
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

        // 🎨 Renderizado en UI con validación de existencia de elementos
        if (document.getElementById('totalExpedientes')) { // Revisa si el ID es totalPacientes o totalExpedientes
            document.getElementById('totalExpedientes').innerText = totalPacientes || 0;
        }
        
        if (document.getElementById('citasHoy')) {
            document.getElementById('citasHoy').innerText = citasHoy || 0;
        }

        if (document.getElementById('totalInversion')) {
            document.getElementById('totalInversion').innerText = new Intl.NumberFormat('es-MX', { 
                style: 'currency', 
                currency: 'MXN' 
            }).format(inversionTotal);
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
    // 🚩 CORRECCIÓN 1: Definir usuarioId desde el inicio
    let clinicaId = localStorage.getItem('id_clinica_activa');
    let usuarioId = localStorage.getItem('usuarioId'); 
    
    let colorClinica = localStorage.getItem('clinica_color');
    let nombreClinica = localStorage.getItem('nombre_clinica');
    let logoClinica = localStorage.getItem('clinica_logo');

    // 1. Recuperación de datos de la CLÍNICA (Estética)
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

    // 2. Aplicar Colores Dinámicos (Estética)
    if (colorClinica) {
        document.documentElement.style.setProperty('--medical-blue', colorClinica);
        document.documentElement.style.setProperty('--primary', colorClinica);
        document.querySelectorAll('.btn-principal, .stat-card i').forEach(el => {
            el.style.color = colorClinica;
        });
    }

    // 3. Actualizar Texto de la Sede
    if (nombreClinica) {
        const txtSede = document.getElementById('txtSedeActual') || document.getElementById('sedeActivaTexto');
        if (txtSede) txtSede.innerText = `SEDE ACTIVA: ${nombreClinica.toUpperCase()}`;
    }
    
    // 4. Logo de la Clínica
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

    // 🚀 5. IDENTIDAD PROFESIONAL (El Cerebro de FisioCid)
    // Forzamos la limpieza de la especialidad previa para evitar conflictos de sesión
    localStorage.removeItem('especialidadUsuario');

    if (usuarioId) {
        console.log("🔍 Consultando especialidad real del profesional...");
        
        const { data: perfil, error } = await fisioNet
            .from('perfiles_profesionales')
            .select('especialidad') // 👈 CAMBIADO: Nombre exacto de tu columna
            .eq('id', usuarioId) // 👈 Verifica si es 'id_usuario' o 'id'
            .maybeSingle();

        if (error) {
            console.error("❌ Error al recuperar perfil:", error.message);
        }

        if (perfil && perfil.especialidad) {
            // Saneamiento para que coincida con tus llaves de protocolos
            const especialidadReal = perfil.especialidad
                .toUpperCase()
                .trim()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");

            // Guardamos la especialidad que usará el Botón Dorado
            localStorage.setItem('especialidadUsuario', especialidadReal);
            console.log(`👤 Profesional Detectado: [${especialidadReal}]`);
        } else {
            console.warn("⚠️ El usuario no tiene una especialidad definida en perfiles_profesionales.");
        }
    }
}


function renderizarCitas(citas, modo) {
    const lista = document.getElementById('listaAgenda');
    if (!lista) return;
    lista.innerHTML = '';

    if (!citas || citas.length === 0) {
        lista.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; background: #f8fafc; border-radius: 12px; border: 2px dashed #cbd5e1; margin: 10px 0;">
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

        const p = cita.pacientes_maestros;
        const nombreCompletoPaciente = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.trim().toUpperCase();
        const etiquetaEdad = calcularEdadPorCurp(p.curp);

        const esConsultorio = cita.modalidad === 'CONSULTORIO';
        const colorLateral = esConsultorio ? '#10b981' : '#3b82f6';
        const fondoBadge = esConsultorio ? '#e6f4ea' : '#e8f0fe';
        
        const montoBaseCita = cita.monto_total || 800;
        const conceptoCita = `CONSULTA DE ${cita.modalidad || 'CONSULTORIO'}`;

        // 🛡️ EL CANDADO DE CONTROL DE CAJA DEFINITIVO:
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

async function inicializarRedFisioCid() {
    await renderizarTablaEquipo();   
    await renderizarTablaAlianzas(); 
}

// ==========================================
// 🔵 1. RED INTERNA (Tu Equipo en la Clínica)
// ==========================================
async function renderizarTablaEquipo() {
    const tbody = document.getElementById('tablaCuerpoEquipo');
    if (!tbody) return;

    try {
        const idClinica = localStorage.getItem('id_clinica_activa') || localStorage.getItem('fisiocid_id_clinica');
        console.log("🔍 Buscando equipo para la clínica ID:", idClinica);
        
        if (!idClinica) return console.warn("⚠️ No se encontró ID de clínica."); 

        // 1. Consulta plana a los colaboradores activos de la sede
        const { data: equipo, error: errEquipo } = await fisioNet
            .from('colaboradores_clinica')
            .select('*')
            .eq('id_clinica', idClinica)
            .eq('estado', 'ACTIVO');

        if (errEquipo) throw errEquipo;

        let html = `
            <tr>
                <td colspan="4" style="background-color: #eff6ff; color: #1e3a8a; font-weight: 800; padding: 10px 15px; font-size: 0.8rem; letter-spacing: 0.5px;">
                    🔵 MI EQUIPO INTERNO
                </td>
            </tr>
        `;

        const miRolSesion = localStorage.getItem('rol_actual');
        const esAdmin = miRolSesion === 'ADMIN_SISTEMA' || miRolSesion === 'DUEÑO';

        if (!equipo || equipo.length === 0) {
            html += `<tr><td colspan="4" style="text-align:center; padding:20px; color:#64748b;">Aún no tienes colaboradores internos activos.</td></tr>`;
        } else {
            // 2. Extraemos todos los IDs de los profesionales del equipo
            const idsProfesionales = equipo.map(c => c.id_profesional);

            // 3. Traemos de golpe los perfiles correspondientes (Consulta plana paralela)
            const { data: perfiles } = await fisioNet
                .from('perfiles_profesionales')
                .select('id, nombre_completo, correo_institucional')
                .in('id', idsProfesionales);

            html += equipo.map(colab => {
                // Buscamos el perfil correspondiente en el array local
                const perfil = perfiles?.find(p => p.id === colab.id_profesional) || {};

                const botonConfig = esAdmin 
                    ? `<button onclick="abrirConfiguracionEquipo('${colab.id}', '${perfil.nombre_completo || 'Colaborador'}')" 
                               title="Configurar Permisos" 
                               style="border: none; background: #fee2e2; color: #b91c1c; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 1rem;">
                           ⚙️
                       </button>` 
                    : '';

                return `
                <tr style="border-bottom: 1px solid #e2e8f0; background-color: #fcfcfc;">
                    <td style="padding: 15px;">
                        <div style="font-weight: 700; color: #1e293b;">${perfil.nombre_completo || 'Usuario Registrado'}</div>
                        <div style="font-size: 0.75rem; color: #3b82f6; font-weight: 600;">STAFF INTERNO</div>
                    </td>
                    <td style="padding: 15px; text-align: center;">
                        <span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 0.75rem;">
                            ${colab.cargo_clinico || 'FISIOTERAPEUTA'}
                        </span>
                    </td>
                    <td style="padding: 15px;">
                        <div style="font-size: 0.8rem; font-weight: 600; color: #334155;">Area: ${colab.area_asignada || 'General'}</div>
                        <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">✉️ ${perfil.correo_institucional || 'Asignado'}</div>
                    </td>
                    <td style="padding: 15px; text-align: right;">
                        ${botonConfig} 
                    </td>
                </tr>`;
            }).join('');
        }

        tbody.innerHTML = html;

    } catch (e) {
        console.error("❌ Fallo al cargar equipo interno:", e.message);
    }
}

// ==========================================
// 🟢 2. ALIANZAS EXTERNAS (Los doctores que te refieren)
// ==========================================
async function renderizarTablaAlianzas() {
    const tbody = document.getElementById('tablaCuerpoAlianzas');
    const contador = document.getElementById('contadorSocios');
    if (!tbody) return;

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return;

        const { data: socios, error } = await fisioNet
            .from('red_colaboracion')
            .select(`*, id_doctor_emisor(nombre_completo, especialidad, telefono_contacto, correo_institucional)`)
            .or(`id_doctor_emisor.eq.${user.id},id_doctor_receptor.eq.${user.id}`)
            // 🔥 Filtro: Mostramos todo menos lo ELIMINADO
            .neq('estado_conexion', 'ELIMINADO') 
            .order('nombre_entidad', { ascending: true });

        if (error) throw error;

        // 🧠 Lógica de Orden: Ponemos los ACTIVO arriba y los PAUSADO abajo
        const sociosOrdenados = [...socios].sort((a, b) => {
            if (a.estado_conexion === 'ACTIVO' && b.estado_conexion === 'PAUSADO') return -1;
            if (a.estado_conexion === 'PAUSADO' && b.estado_conexion === 'ACTIVO') return 1;
            return 0;
        });

        if (contador) {
            const totalEquipo = document.getElementById('tablaCuerpoEquipo')?.children.length || 0;
            contador.innerText = `${sociosOrdenados.length + (totalEquipo - 1)} En Red`;
        }

        let html = `
            <tr>
                <td colspan="4" style="background-color: #f0fdf4; color: #14532d; font-weight: 800; padding: 10px 15px; font-size: 0.8rem; letter-spacing: 0.5px;">
                    🟢 ALIANZAS ESTRATÉGICAS (EXTERNOS)
                </td>
            </tr>
        `;

        if (sociosOrdenados.length === 0) {
            html += `<tr><td colspan="4" style="text-align:center; padding:20px; color:#64748b;">No hay alianzas externas registradas.</td></tr>`;
        } else {
            html += sociosOrdenados.map(s => {
                const esPausado = s.estado_conexion === 'PAUSADO';
                const soyReceptor = s.id_doctor_receptor === user.id;
                
                const nombreMostrar = soyReceptor ? "FISIOCID (FISIOTERAPIA)" : (s.nombre_entidad || 'N/A');
                const contactoMostrar = soyReceptor ? (s.id_doctor_emisor?.nombre_completo || "CRISTIAN CID") : (s.contacto_principal || 'N/A');
                
                // 🎨 Estilos dinámicos para Pausados
                const estiloFila = esPausado ? 'background-color: #fafafa; opacity: 0.6;' : '';
                const colorBadge = esPausado ? '#f1f5f9' : '#f0fdf4'; 
                const colorTextoBadge = esPausado ? '#64748b' : '#166534';
                const descuento = s.porcentaje_descuento ? `${s.porcentaje_descuento}% DESC` : 'SIN DESC.';

                return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: all 0.3s ease; ${estiloFila}">
                    <td style="padding: 15px;">
                        <div style="font-weight: 700; color: ${esPausado ? '#94a3b8' : '#1e293b'};">
                            ${nombreMostrar} ${esPausado ? '<span style="font-size:0.6rem; color:#ef4444;">(PAUSADO)</span>' : ''}
                        </div>
                        <div style="font-size: 0.75rem; color: ${esPausado ? '#cbd5e1' : '#10b981'}; font-weight: 600;">ALIANZA EXTERNA</div>
                    </td>
                    <td style="padding: 15px; text-align: center;">
                        <span style="background: ${colorBadge}; color: ${colorTextoBadge}; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 0.75rem;">
                            ${descuento}
                        </span>
                    </td>
                    <td style="padding: 15px;">
                        <div style="font-size: 0.8rem; font-weight: 600; color: #334155;">👤 ${contactoMostrar}</div>
                        <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">📞 ${s.telefono_contacto || s.id_doctor_emisor?.telefono_contacto || 'N/A'}</div>
                    </td>
                    <td style="padding: 15px; text-align: right;">
                        <button onclick="abrirConfiguracionAlianza('${s.id}')" 
                                title="Configurar Convenio" 
                                style="border: none; background: #f1f5f9; padding: 8px; border-radius: 8px; cursor: pointer;">
                            ⚙️
                        </button>
                    </td>
                </tr>`;
            }).join('');
        }

        tbody.innerHTML = html;

    } catch (e) {
        console.error("Fallo al cargar alianzas externas:", e);
    }
}
// ==========================================
// ⚙️ LÓGICA DEL PANEL DE CONFIGURACIÓN
// ==========================================

window.abrirConfiguracionEquipo = (idColaborador, nombreColaborador, cargoActual, areaActual, fechaFin, superior, observaciones) => {
    // 1. Buscamos los nuevos elementos del modal
    const inputId = document.getElementById('idColabActivo');
    const labelNombre = document.getElementById('nombreColabModal');
    const selectCargo = document.getElementById('selectCargoModal');
    const selectArea = document.getElementById('selectAreaModal');
    const inputFechaFin = document.getElementById('fechaFinModal');
    const selectSuperior = document.getElementById('superiorModal');
    const txtObs = document.getElementById('obsModal');
    const modal = document.getElementById('modalConfigEquipo');

    if (!inputId || !modal) {
        console.error("❌ No se encontraron los elementos del modal en el HTML.");
        return;
    }

    // 2. Llenamos los campos con la información actual
    inputId.value = idColaborador;
    labelNombre.innerText = nombreColaborador;
    
    // Asignamos los valores a los SELECT (deben coincidir con las opciones del HTML)
    if (selectCargo) selectCargo.value = cargoActual || "FISIOTERAPEUTA";
    if (selectArea) selectArea.value = areaActual || "GENERAL";
    
    // Campos nuevos
    if (inputFechaFin) inputFechaFin.value = fechaFin || "";
    if (selectSuperior) selectSuperior.value = superior || "";
    if (txtObs) txtObs.value = observaciones || "";
    
    // 3. Mostramos la ventana
    modal.style.display = 'flex';
};

// 2. Botón de Cancelar
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
                area_ubicacion: area,
                fecha_fin: fechaFin,
                id_superior_directo: superior,
                observaciones_historial: obs // Asegúrate de que esta columna exista en tu DB
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
        // 🔥 CAMBIO CLAVE: Ahora contamos en vinculos_clinicos, no en citas
        const [resAlianza, resConteo] = await Promise.all([
            fisioNet.from('red_colaboracion').select('*').eq('id', idAlianza).single(),
            fisioNet.from('vinculos_clinicos') // <-- Antes decía 'citas'
                .select('*', { count: 'exact', head: true })
                .eq('id_alianza_referido', idAlianza)
        ]);

        if (resAlianza.error) throw resAlianza.error;

        const a = resAlianza.data;
        
        // Llenar datos del modal
        document.getElementById('confAlianzaNombre').innerText = a.nombre_entidad || (a.id_doctor_emisor?.nombre_completo);
        document.getElementById('confAlianzaContador').innerText = resConteo.count || 0;
        document.getElementById('confAlianzaPorcentaje').value = a.porcentaje_descuento || 0;

        // Configurar botón de Pausa/Reinicio
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

// 🔥 LA FUNCIÓN QUE FALTABA
async function guardarCambiosAlianza() {
    const nuevoPorcentaje = document.getElementById('confAlianzaPorcentaje').value;
    
    const { error } = await fisioNet
        .from('red_colaboracion')
        .update({ porcentaje_descuento: nuevoPorcentaje })
        .eq('id', idAlianzaGlobal);

    if (!error) {
        alert("✅ Configuración guardada.");
        document.getElementById('modalConfigAlianza').style.display = 'none';
        renderizarTablaAlianzas();
    }
}

async function alternarEstadoAlianza(id, estadoActual) {
    const nuevoEstado = estadoActual === 'ACTIVO' ? 'PAUSADO' : 'ACTIVO';
    await fisioNet.from('red_colaboracion').update({ estado_conexion: nuevoEstado }).eq('id', id);
    abrirConfiguracionAlianza(id); // Recargamos el modal
    renderizarTablaAlianzas(); // Recargamos la tabla principal
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
            renderizarTablaAlianzas(); // Refrescamos la tabla
            if (document.getElementById('modalConfigAlianza')) {
                document.getElementById('modalConfigAlianza').style.display = 'none';
            }
        } catch (err) {
            console.error("Error al cambiar estado:", err);
        }
    }
};

// --- GUARDADO DE CONFIGURACIÓN ---
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
    
    // 1. Manejo de fecha inicial
    if (!fechaInput) {
        fechaInput = new Date().toISOString().split('T')[0];
        if(document.getElementById('filtroFechaAgenda')) {
            document.getElementById('filtroFechaAgenda').value = fechaInput;
        }
    }

    const fechaBase = new Date(fechaInput + "T00:00:00");

    // 2. Estética de los botones de filtro
    if (botonPresionado) {
        document.querySelectorAll('.btn-filtro').forEach(btn => btn.classList.remove('active'));
        botonPresionado.classList.add('active');
    }

    // 3. OBTENER IDENTIDADES (La clave del éxito)
const { data: { user } } = await fisioNet.auth.getUser();
const clinicaId = localStorage.getItem('id_clinica_activa'); // 🎯 Asegúrate de usar el mismo nombre que en el login

if (!clinicaId) {
    console.warn("⚠️ No se detectó contexto de clínica. Regresando al acceso principal...");
    
    // Limpiamos por seguridad para que el login fuerce la selección
    localStorage.clear(); 
    
    // Mandamos al login, donde el nuevo motor le pedirá elegir sede
    window.location.href = 'login.html'; 
    return; 
}
   
if (!user) return; 

    // 4. CONSTRUIR LA CONSULTA (Filtrada por Profesional Y Clínica)
    // Esto asegura que Magali vea SUS citas en la CLÍNICA DE CRISTIAN (o la suya)
    let query = fisioNet
        .from('agenda_maestra')
        .select(`
            id_cita, 
            fecha, 
            hora_inicio_cita, 
            modalidad, 
            estatus,
            pago_status,
            pacientes_maestros (id, nombre, apellido_paterno, apellido_materno)
        `)
        .eq('id_profesional', user.id) // Quién atiende
        .eq('id_clinica', clinicaId);  // En dónde atiende

    // 5. FILTROS DE TIEMPO (Día o Semana)
    if (modo === 'dia') {
        tituloElemento.innerText = `CITAS DEL ${formatearFechaCorta(fechaInput).toUpperCase()}`;
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
        tituloElemento.innerText = `SEMANA: ${f1.toUpperCase()} AL ${f2.toUpperCase()}`;

        query = query
            .gte('fecha', lunes.toISOString().split('T')[0])
            .lte('fecha', domingo.toISOString().split('T')[0]);
    }

    // 6. EJECUTAR Y RENDERIZAR
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

// --- BUSCADOR Y REGISTRO RÁPIDO DE PACIENTES ---
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
            div.innerText = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno}`.trim();
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
                await window.crearVinculoInicial(nuevo.id, user.id, clinicaId);
                inputBusqueda.value = `${nuevo.nombre} ${nuevo.apellido_paterno} ${nuevo.apellido_materno}`.trim();
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

// --- AGENDAR NUEVA CITA (CON VALIDACIÓN DINÁMICA Y CONVENIOS) ---
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

    const { data: perfil } = await fisioNet.from('perfiles_profesionales').select('costo_consulta_base, costo_domicilio_base, horario_atencion').eq('id', user.id).single();

    if (perfil.horario_atencion) {
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
            alert(`❌ HORARIO NO DISPONIBLE: Tu hora límite de salida es a las ${hFin}. Selecciona una hora donde te dé tiempo de terminar la consulta.`);
            return; 
        }
    }

    const selectorConvenio = document.getElementById('selectConvenioPaciente');
    const idConvenio = (selectorConvenio && selectorConvenio.value) ? selectorConvenio.value : null;
    let porcentaje = 0;
    
    if (idConvenio && selectorConvenio.selectedOptions.length > 0) {
        porcentaje = parseFloat(selectorConvenio.selectedOptions[0].dataset.descuento) || 0;
    }

    const precioBase = (modalidad === 'CONSULTORIO') ? perfil.costo_consulta_base : perfil.costo_domicilio_base;
    const descuentoCalculado = (precioBase * porcentaje) / 100;
    const precioFinal = precioBase - descuentoCalculado;

    const { error } = await fisioNet.from('agenda_maestra').insert({
        id_paciente: idPaciente, 
        id_profesional: user.id, 
        id_clinica: clinicaId, 
        fecha: fechaElegida, 
        hora_inicio_cita: horaElegida,
        modalidad: modalidad, 
        id_convenio_aplicado: idConvenio, 
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
    if (confirm("¿Deseas salir de FisioCid?")) await salir();
});

document.getElementById('btnAbrirConfig')?.addEventListener('click', async () => {
    const modal = document.getElementById('modalConfigInicial');
    const { data: { user } } = await fisioNet.auth.getUser();

    const { data: perfil } = await fisioNet.from('perfiles_profesionales').select('*').eq('id', user.id).single();

    if (perfil) {
        document.getElementById('baseConsultorio').value = perfil.costo_consulta_base;
        document.getElementById('baseDomicilio').value = perfil.costo_domicilio_base;
        if (document.getElementById('intervaloCita')) {
            document.getElementById('intervaloCita').value = perfil.intervalo_cita || 30; // 60 min por defecto
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

    const { data: boxes, error } = await fisioNet.from('boxes_clinica').select(`*, pacientes_maestros(nombre, apellido_paterno)`).eq('id_clinica', clinicaId).order('nombre_box', { ascending: true });

    if (error) return console.error(error);

    if (!boxes || boxes.length === 0) {
        contenedor.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 30px; background: #f8fafc; border-radius: 12px; border: 2px dashed #cbd5e1;"><p style="color: #64748b; font-size: 0.8rem;">No has configurado tus camillas.</p></div>`;
        return;
    }

    contenedor.innerHTML = boxes.map(box => {
        let bgColor, textColor, borderColor, estadoTexto, botonAccion;
        let tiempoTexto = "";

        if (box.estado === 'OCUPADO') {
            bgColor = '#fee2e2'; textColor = '#b91c1c'; borderColor = '#f87171'; estadoTexto = `OCUPADO`;
            if (box.hora_ingreso) {
                const inicio = new Date(box.hora_ingreso);
                const diffMinutos = Math.floor((new Date() - inicio) / 60000);
                tiempoTexto = `<span style="color: #ef4444; font-size: 0.7rem; font-weight: bold;">⏱️ ${diffMinutos} min</span>`;
            }
            botonAccion = `<button onclick="cambiarEstadoBox('${box.id}', 'LIMPIEZA')" style="width: 100%; background: #f59e0b; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 0.7rem; font-weight: bold; margin-top: 10px; transition: 0.2s;">🧹 PASAR A LIMPIEZA</button>`;
        } else if (box.estado === 'LIMPIEZA') {
            bgColor = '#fef3c7'; textColor = '#b45309'; borderColor = '#fbbf24'; estadoTexto = '🧹 EN LIMPIEZA';
            botonAccion = `<button onclick="cambiarEstadoBox('${box.id}', 'LIBRE')" style="width: 100%; background: #10b981; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 0.7rem; font-weight: bold; margin-top: 10px; transition: 0.2s;">✅ MARCAR LIBRE</button>`;
        } else {
            bgColor = '#f8fafc'; textColor = '#10b981'; borderColor = '#a7f3d0'; estadoTexto = 'LIBRE'; botonAccion = ''; 
        }

        const nombrePaciente = (box.estado === 'OCUPADO' && box.pacientes_maestros) ? `${box.pacientes_maestros.nombre} ${box.pacientes_maestros.apellido_paterno}` : (box.estado === 'LIMPIEZA' ? 'MANTENIMIENTO' : 'DISPONIBLE');

        return `
            <div class="stat-card" style="background: ${bgColor}; border: 2px solid ${borderColor}; padding: 15px; text-align: center; position: relative; border-radius: 12px; min-height: 100px; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <small style="color: ${textColor}; font-weight: bold; font-size: 0.6rem;">${box.nombre_box.toUpperCase()}</small>${tiempoTexto}
                    </div>
                    <p style="margin: 8px 0; font-weight: 800; font-size: 0.85rem; color: ${textColor};">${nombrePaciente.toUpperCase()}</p>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 5px;">
                        <span style="width: 7px; height: 7px; border-radius: 50%; background: ${textColor};"></span>
                        <small style="font-size: 0.7rem; color: ${textColor}; font-weight: bold;">${estadoTexto}</small>
                    </div>
                </div>${botonAccion}
            </div>`;
    }).join('');
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

document.getElementById('formNuevoBox')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clinicaId = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');
    const nombre = document.getElementById('nombreNuevoBox').value.toUpperCase();

    if (!clinicaId) { alert("⚠️ Error: No se encuentra el ID de la clínica."); return; }

    const { error } = await fisioNet.from('boxes_clinica').insert([{ nombre_box: nombre, id_clinica: clinicaId, estado: 'LIBRE' }]).select();
    if (error) { alert("❌ Error: " + error.message); } else {
        document.getElementById('nombreNuevoBox').value = '';
        await configurarBoxes();
        await cargarMonitorBoxes();
    }
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

// ==========================================
// 📥 10. SALA DE ESPERA (SEGURIDAD Y REFERIDOS)
// ==========================================

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

    if (badge) badge.innerText = solicitudes.length;
    
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
    const clinicaId = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');
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
                            await window.crearVinculoInicial(idPacienteFinal, user.id, clinicaId); // 👈 AGREGA ESTO
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
        await window.crearVinculoInicial(idPacienteFinal, user.id, clinicaId); // 👈 AGREGA ESTO
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
    if (modal) {
        modal.style.display = 'flex';
    }
};

function actualizarPrecioVisual() {
    const modalidad = document.getElementById('modalidadCita').value;
    const selector = document.getElementById('selectConvenioPaciente');
    const vistaPrevia = document.getElementById('vistaPreviaPago');
    const textoMonto = document.getElementById('textoMontoFinal');

    let precioBase = (modalidad === 'CONSULTORIO') ? parseFloat(document.getElementById('baseConsultorio')?.value || 800) : parseFloat(document.getElementById('baseDomicilio')?.value || 1200);

    if (selector && selector.value) {
        const porcentaje = parseFloat(selector.selectedOptions[0].dataset.descuento) || 0;
        precioBase = precioBase - (precioBase * porcentaje / 100);
    }
    if (textoMonto) textoMonto.innerText = `$${precioBase.toFixed(2)}`;
    if (vistaPrevia) vistaPrevia.style.display = 'block';

    const lblPrecio = document.getElementById('labelPrecioFinal');
    if (lblPrecio) {
        const descuento = (modalidad === 'CONSULTORIO' ? parseFloat(document.getElementById('baseConsultorio')?.value || 800) : parseFloat(document.getElementById('baseDomicilio')?.value || 1200)) - precioBase;
        lblPrecio.innerHTML = `Precio Final: <b>$${precioBase.toFixed(2)}</b> <small>(Ahorro: $${descuento.toFixed(2)})</small>`;
    }
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
        contenedor.style.display = 'none'; document.getElementById('selectConvenioPaciente').value = "";
        actualizarPrecioVisual(); e.target.innerText = "+ ¿Aplicar convenio o empresa?";
    }
});

document.getElementById('modalidadCita')?.addEventListener('change', actualizarPrecioVisual);
document.getElementById('selectConvenioPaciente')?.addEventListener('change', actualizarPrecioVisual);

window.generarReporteSocio = async (idSocio, nombreSocio) => {
    const clinicaId = localStorage.getItem('id_clinica_activa');
    
    const { data: socio } = await fisioNet.from('red_colaboracion').select('estado_conexion').eq('id', idSocio).single();
    
    const { data: citas, error } = await fisioNet
        .from('agenda_maestra')
        .select('descuento_aplicado')
        .eq('id_convenio_aplicado', idSocio)
        .eq('id_clinica', clinicaId);

    if (error) return;

    const totalPacientes = citas.length;
    const ahorroTotal = citas.reduce((acc, c) => acc + (c.descuento_aplicado || 0), 0);
    
    const estaActiva = socio.estado_conexion === 'ACTIVO';
    const mensajeEstado = estaActiva 
        ? "¡Esta alianza está activa y funcionando! 🚀" 
        : "⚠️ ESTA ALIANZA SE ENCUENTRA PAUSADA ACTUALMENTE.";

    alert(`
    📊 INFORME DE IMPACTO: ${nombreSocio}
    --------------------------------------------
    ✅ Pacientes referidos: ${totalPacientes}
    💰 Ahorro generado a sus miembros: $${ahorroTotal.toFixed(2)} MXN
    
    ${mensajeEstado}
    `);
};

window.desactivarSocio = async (idSocio, nombre) => {
    const confirmacion = confirm(`¿Deseas cambiar el estado de la alianza con "${nombre}"?`);
    if (!confirmacion) return;

    const { data: socio } = await fisioNet.from('red_colaboracion').select('estado_conexion').eq('id', idSocio).single();
    const nuevoEstado = socio.estado_conexion === 'ACTIVO' ? 'PAUSADO' : 'ACTIVO';

    const { error } = await fisioNet
        .from('red_colaboracion')
        .update({ estado_conexion: nuevoEstado })
        .eq('id', idSocio);

    if (!error) {
        alert(`Alianza ${nuevoEstado === 'ACTIVO' ? 'Activada ✅' : 'Pausada 🚫'}`);
        renderizarTablaAlianzas(); 
        inicializarFormularioConvenio(); 
    }
};

// --- GESTIÓN DE ALIANZAS Y CONVENIOS ---
async function inicializarFormularioConvenio() {
    console.log("🔍 Vinculando formulario con automatización de accesos...");
    
    const select = document.getElementById('selectConvenioPaciente');
    const formConvenio = document.getElementById('formNuevoConvenio');

    // --- A. LLENAR EL SELECTOR ---
    if (select) {
        const { data: convenios, error } = await fisioNet
            .from('red_colaboracion')
            .select('*')
            .eq('estado_conexion', 'ACTIVO')
            .order('nombre_entidad', { ascending: true });

        if (!error && convenios) {
            select.innerHTML = '<option value="">👤 PACIENTE PARTICULAR (SIN CONVENIO)</option>';
            convenios.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.dataset.descuento = c.porcentaje_descuento;
                opt.textContent = `🤝 ${c.nombre_entidad} (${c.porcentaje_descuento}% DESC)`;
                select.appendChild(opt);
            });
        }
    }

    // --- B. EVENTO DE GUARDADO ---
    if (formConvenio) {
        formConvenio.onsubmit = async (e) => {
            e.preventDefault();
            
            const { data: { user: doctorActual } } = await fisioNet.auth.getUser();
            if (!doctorActual) {
                alert("⚠️ Error: Sesión de doctor no detectada.");
                return;
            }
            const MI_ID_DOCTOR = doctorActual.id;

            const emailSocio = document.getElementById('email_contacto').value.toLowerCase().trim();
            const nombreEntidad = document.getElementById('nomConvenio').value.trim().toUpperCase();
            const passPredeterminada = "Temporal123";

            console.log("🚀 Iniciando proceso para:", emailSocio);

            // 1. INTENTAR REGISTRO EN AUTH
            const { data: authData, error: authError } = await fisioAdmin.auth.signUp({
                email: emailSocio,
                password: passPredeterminada
            });

            let idDelSocioFinal = null;

            if (authError) {
                if (authError.message.includes("already registered")) {
                    console.log("ℹ️ El socio ya existe en Auth. Rescatando UUID...");
                    
                    const { data: socioRecuperado } = await fisioNet
                        .from('red_colaboracion')
                        .select('id_usuario_socio')
                        .eq('email_contacto', emailSocio)
                        .maybeSingle();
                    
                    idDelSocioFinal = socioRecuperado?.id_usuario_socio || null;

                    if (!idDelSocioFinal) {
                        console.warn("⚠️ El usuario existe en Auth pero no en tu tabla. Tip: Para pruebas usa correos nuevos o vincula el ID manualmente en Supabase una vez.");
                    }
                } else {
                    alert("Error en Auth: " + authError.message);
                    return;
                }
            } else if (authData && authData.user) {
                idDelSocioFinal = authData.user.id;
                console.log("✅ ID GENERADO EXITOSAMENTE:", idDelSocioFinal);
            }

            // 2. PREPARAR DATOS
            const datosSocio = {
                nombre_entidad: nombreEntidad,
                contacto_principal: document.getElementById('contactoNombre').value.trim().toUpperCase(),
                tipo_entidad: document.getElementById('tipoConvenio').value,
                telefono_contacto: document.getElementById('contactoTel').value.trim(),
                email_contacto: emailSocio,
                porcentaje_descuento: parseFloat(document.getElementById('porcentajeDesc').value) || 0,
                id_doctor_emisor: MI_ID_DOCTOR,
                id_usuario_socio: idDelSocioFinal, 
                estado_conexion: 'ACTIVO'
            };

            // 3. VERIFICAR SI YA EXISTE EN TABLA
            const { data: existe } = await fisioNet.from('red_colaboracion')
                .select('id').eq('nombre_entidad', nombreEntidad).maybeSingle();

            if (existe) {
                if (!confirm(`⚠️ EL SOCIO "${nombreEntidad}" YA EXISTE. ¿Actualizar?`)) return;
                
                const { error: errUpd } = await fisioNet.from('red_colaboracion')
                    .update(datosSocio)
                    .eq('id', existe.id);
                
                if (!errUpd) alert("✅ ¡ALIANZA ACTUALIZADA!");
                else console.error("Error en Update:", errUpd);

            } else {
                // 4. INSERTAR
                console.log("📤 Intentando INSERT con ID Socio:", idDelSocioFinal);
                const { error: errIns } = await fisioNet.from('red_colaboracion').insert([datosSocio]);
                
                if (!errIns) {
                    alert(`🚀 ¡ALIANZA GUARDADA!\n📧 ${emailSocio}\n🔑 ${passPredeterminada}`);
                } else {
                    console.error("❌ ERROR TÉCNICO:", errIns);
                    alert(`Error: ${errIns.message}`); 
                }
            }

            document.getElementById('modalConvenios').style.display = 'none';
            formConvenio.reset();
            if (typeof renderizarTablaAlianzas === 'function') await renderizarTablaAlianzas();
            await inicializarFormularioConvenio();
        };
    }
}

// --- 🕵️ FUNCIÓN CAZADORA DEFINITIVA (DASHBOARD) ---
async function verificarDisponibilidadReal() {
    const fechaElegida = document.getElementById('fechaCita').value;
    const contenedor = document.getElementById('gridHorariosDisponibles');
    const clinicaId = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');
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

// ============================================================================
// 📥 BANDEJA INTELIGENTE DEL DASHBOARD: SOLICITUDES + ESTUDIOS PENDIENTES RAD
// ============================================================================

async function cargarSolicitudesRecibidas() {
    const lista = document.getElementById('listaEsperaReferidos'); 
    const badge = document.getElementById('badgeSolicitudes');

    if (!lista) return;

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return;

        const clinicaId = localStorage.getItem('id_clinica_activa');
        const miEspecialidad = localStorage.getItem('especialidadUsuario') || '';
        const esRadiologo = miEspecialidad === 'MEDICO-RADIOLOGO' || miEspecialidad === 'QUIMICO';

        let htmlFinal = "";
        let totalAlertasTotal = 0;

        // 🩻 PARTE A: CASO EXCLUSIVO PARA ESTUDIOS DE GABINETE / LABORATORIO PENDIENTES
        if (esRadiologo) {
            console.log("📡 Modo Especialista Activo en Dashboard: Escaneando estudios pendientes...");
            
            const { data: pendientes, errorRad } = await fisioNet
                .from('estudios_gabinete')
                .select('*')
                .eq('estado_dictamen', 'PENDIENTE')
                .eq('doctor_emisor_id', user.id) 
                .order('fecha_registro', { ascending: false });

            if (errorRad) throw errorRad;

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
                                <p style="margin: 0; font-size: 0.75rem; color: #2563eb; font-weight: 700;">${est.tipo_estudio} - [${est.zona_anatomica.toUpperCase()}]</p>
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

        // 📅 PARTE B: SOLICITUDES DE CITAS WEB (SALA DE ESPERA MULTI-SEDE)
        console.log("🔍 Escaneando solicitudes de citas entrantes para la clínica...");
        const { data: solicitudesCitas, errorCitas } = await fisioNet
            .from('solicitudes_citas')
            .select('*')
            .eq('estado', 'PENDIENTE')
            .eq('id_clinica_solicitada', clinicaId) // 🛡️ Candado SaaS Multi-sede activo
            .order('creado_el', { ascending: false });

        if (errorCitas) throw errorCitas;

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
                            <small style="color: #64748b;">Día: ${sol.fecha_cita} - Hora: ⏰ ${sol.hora_cita.substring(0,5)}</small>
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

        // 🎨 RENDERIZADO FINAL EN LA INTERFAZ
        if (badge) badge.innerText = totalAlertasTotal;

        if (htmlFinal === "") {
            lista.innerHTML = `<div style="text-align: center; color: #94a3b8; font-size: 0.8rem; padding: 20px;"><i class="fas fa-check-circle text-success d-block fa-2x mb-2"></i>Sin solicitudes ni estudios pendientes.</div>`;
        } else {
            lista.innerHTML = htmlFinal;
        }

    } catch (err) {
        console.error("❌ Error al cargar solicitudes/pendientes:", err);
    }
}

// ============================================================================
// 🧭 ENRUTADOR DINÁMICO DESDE EL DASHBOARD AL ÁREA PACS DE GABINETE
// ============================================================================

function irAPortalGabineteDesdeDashboard(archivoUrl, pacienteNombre) {
    localStorage.setItem('forzar_apertura_archivo', archivoUrl);
    localStorage.setItem('forzar_apertura_paciente', pacienteNombre);
    
    // 🎯 CORRECCIÓN: Cambiamos portal-laboratorio por portal-gabinete
    window.location.href = 'portal-gabinete.html'; 
}

async function responderSolicitud(idRegistro, nuevoEstado) {
    try {
        const { error } = await fisioNet
            .from('red_colaboracion')
            .update({ 
                estado_conexion: nuevoEstado,
                fecha_respuesta: new Date().toISOString() 
            })
            .eq('id', idRegistro);

        if (error) throw error;

        if (nuevoEstado === 'ACTIVO' || nuevoEstado === 'ACEPTADO') {
            alert("¡Enlace profesional confirmado con éxito! 🤝");
        } else if (nuevoEstado === 'RECHAZADO') {
            alert("Solicitud archivada correctamente.");
        }

        if (typeof cargarSolicitudesRecibidas === 'function') {
            await cargarSolicitudesRecibidas();
        }

        if (typeof renderizarTablaAlianzas === 'function') {
            await renderizarTablaAlianzas();
        }

    } catch (err) {
        console.error("❌ Error al responder:", err);
        alert("No se pudo procesar la acción. Revisa la consola.");
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
            const fotoUrl = (c.logo_url && c.logo_url !== 'null') 
                ? c.logo_url 
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(c.nombre_completo)}&background=random&color=fff`;

            grid.innerHTML += `
                <div style="background:white; padding:20px; border-radius:15px; border:1px solid #e2e8f0; text-align:center;">
                    <img src="${fotoUrl}" style="width:70px; height:70px; border-radius:50%; object-fit:cover; margin-bottom:10px;" 
                         onerror="this.src='https://ui-avatars.com/api/?name=Doc&background=ccc'">
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

function mostrarSeccion(seccionId) {
    const agenda = document.getElementById('agenda-container');
    const comunidad = document.getElementById('seccionComunidad');

    if (agenda) agenda.style.setProperty('display', 'none', 'important');
    if (comunidad) comunidad.style.setProperty('display', 'none', 'important');

    const activa = document.getElementById(seccionId);
    if (activa) {
        activa.style.setProperty('display', 'block', 'important');
        console.log("Cambiando vista a:", seccionId);
    }

    if (seccionId === 'seccionComunidad') {
        if (typeof cargarSolicitudesRecibidas === 'function') cargarSolicitudesRecibidas();
    }
    
    if (seccionId === 'agenda-container') {
        if (typeof cargarAgenda === 'function') cargarAgenda('semana');
    }
}

async function verDetalleColega(idColega) {
    const modal = document.getElementById('modalPerfilColega');
    
    try {
        // 🔍 Buscamos exactamente los campos que definiste
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
            
            // 1. Información Principal
            document.getElementById('modalColegaNombre').innerText = c.nombre_completo || 'Sin Nombre';
            document.getElementById('modalColegaEspecialidad').innerText = c.especialidad || 'MÉDICO';
            
            // 2. Detalles Académicos y Profesionales
            document.getElementById('modalColegaInstitucion').innerText = c.institucion_egreso || 'No especificada';
            document.getElementById('modalColegaCedula').innerText = c.cedula_profesional || 'Sin registro';
            
            // Si tienes un campo para cédulas adicionales en el HTML, podrías mostrarlo así:
            const adicionales = c.cedulas_adicionales ? ` | Adicionales: ${c.cedulas_adicionales}` : '';
            document.getElementById('modalColegaCedula').innerText += adicionales;

            // 3. Ubicación y Costos
            // Asegúrate de tener estos IDs en tu HTML
            const txtClinica = document.getElementById('modalColegaClinica');
            if (txtClinica) txtClinica.innerText = c.direccion_consultorio || 'Consultorio Privado';
            
            const txtCosto = document.getElementById('modalColegaCosto');
            if (txtCosto) txtCosto.innerText = c.costo_consulta_base ? `$${c.costo_consulta_base} MXN` : 'A convenir';

            // 4. Contactos (Email y Teléfono)
            gestionarEnlaceContacto('modalColegaEmail', c.correo_institucional, 'mailto:');
            gestionarEnlaceContacto('modalColegaTelefono', c.telefono_contacto, 'tel:');

            // 5. Acción del Botón
            document.getElementById('btnEnlazarModal').onclick = () => enviarSolicitudColaboracion(idColega);

            modal.style.display = 'flex';
        }
    } catch (err) {
        console.error("❌ Error de vinculación con Supabase:", err);
        alert("Revisa que las columnas existan en Supabase con esos nombres exactos.");
    }
}

// Función auxiliar para no repetir código de links
function gestionarEnlaceContacto(idElemento, valor, prefijo) {
    const el = document.getElementById(idElemento);
    if (!el) return;
    if (valor) {
        el.href = prefijo + valor;
        el.querySelector('span').innerText = valor;
        el.parentElement.style.display = 'block';
    } else {
        el.parentElement.style.display = 'none';
    }
}

function cerrarModalColega() {
    document.getElementById('modalPerfilColega').style.display = 'none';
}

async function enviarSolicitudColaboracion(idReceptor) {
    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return;

        const { data: perfilSocio, error: errPerfil } = await fisioNet
            .from('perfiles_profesionales')
            .select('nombre_completo, correo_institucional, telefono_contacto, especialidad')
            .eq('id', idReceptor)
            .single();

        if (errPerfil) throw errPerfil;

        const datosAInsertar = {
            id_doctor_emisor: user.id,
            id_doctor_receptor: idReceptor,
            id_usuario_socio: idReceptor, 
            nombre_entidad: perfilSocio.nombre_completo,
            contacto_principal: perfilSocio.nombre_completo,
            email_contacto: perfilSocio.correo_institucional, 
            telefono_contacto: perfilSocio.telefono_contacto,
            estado_conexion: 'PENDIENTE',
            tipo_entidad: 'PROFESIONAL_SALUD'
        };

        const { data: respuestaSupa, error } = await fisioNet
            .from('red_colaboracion')
            .insert([datosAInsertar])
            .select(); 

        if (error) throw error;

        alert(`¡Solicitud enviada a ${perfilSocio.nombre_completo}! Datos vinculados.`);
        cerrarModalColega();
        
        if (typeof renderizarTablaAlianzas === 'function') renderizarTablaAlianzas();

    } catch (err) {
        console.error("❌ Error crítico al enviar:", err);
        alert("No se pudo enviar la solicitud: " + err.message);
    }
}

// ==========================================
// 🚀 EVENTO MAESTRO DE ARRANQUE MODIFICADO
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Validar Sesión global
    const { data: { user } } = await fisioNet.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    // 2. Ejecutamos la sincronización de Sede e Identidades Híbridas
    await aplicarIdentidadVisual(); 
    await actualizarInterfazSede(); 

 // ============================================================================
    // 🕵️ BUSCADOR INMEDIATO DEL NOMBRE DE QUIEN VA A TRABAJAR (OPTIMIZADO)
    // ============================================================================
    console.log("🔍 Recuperando nombre del operador actual...");
    let nombreTrabajador = "";

    try {
        // 1. Intentamos buscar primero en la tabla de perfiles profesionales médicos
        const { data: perfilProf, error: errProf } = await fisioNet
            .from('perfiles_profesionales')
            .select('nombre_completo, costo_consulta_base')
            .eq('id', user.id)
            .maybeSingle();

        if (perfilProf && perfilProf.nombre_completo) {
            nombreTrabajador = perfilProf.nombre_completo;
            localStorage.setItem('nombre_completo', nombreTrabajador);
            
            if (!perfilProf.costo_consulta_base) {
                const modalConfig = document.getElementById('modalConfigInicial');
                if (modalConfig) modalConfig.style.display = 'flex';
            }
        } else {
            // 2. 🔥 PLAN B (Tu idea): Si no es médico, buscamos su nombre en la tabla general de 'perfiles'
            console.log("👥 Buscando identidad en la tabla general de perfiles...");
            const { data: perfilGeneral } = await fisioNet
                .from('perfiles')
                .select('nombre_completo')
                .eq('id', user.id)
                .maybeSingle();

            if (perfilGeneral && perfilGeneral.nombre_completo) {
                nombreTrabajador = perfilGeneral.nombre_completo;
            } else {
                // 3. PLAN C: Si no está en las tablas, extraemos del registro de autenticación (Auth)
                nombreTrabajador = user.user_metadata?.full_name || 
                                   user.user_metadata?.nombre_completo || 
                                   localStorage.getItem('nombre_completo') || 
                                   "COLABORADOR ACTIVO";
            }
            
            localStorage.setItem('nombre_completo', nombreTrabajador);
        }
    } catch (e) {
        console.warn("⚠️ Error al consultar tablas de perfiles, usando metadatos de sesión:", e);
        nombreTrabajador = user.user_metadata?.full_name || localStorage.getItem('nombre_completo') || "COLABORADOR ACTIVO";
    }

    // Renderizar el saludo con el nombre real recuperado
    const txtSaludo = document.getElementById('txtSaludo');
    if (txtSaludo && nombreTrabajador) {
        txtSaludo.innerText = `BIENVENIDO, ${nombreTrabajador.toUpperCase()}`;
    }

    // 4. Configurar la Fecha de Hoy en la UI
    const hoy = new Date();
    const inputFecha = document.getElementById('filtroFechaAgenda');
    if (inputFecha) inputFecha.value = hoy.toISOString().split('T')[0];
    
    if (document.getElementById('fechaHoy')) {
        document.getElementById('fechaHoy').innerText = `| ${hoy.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}`;
    }

    // 5. CARGAS OPERATIVAS EN CASCADA
    const clinicaActiva = localStorage.getItem('id_clinica_activa');
    if (clinicaActiva) {
        await obtenerYGuardarRolOperativo(user.id, clinicaActiva);
    }
    
    // Ejecución de módulos adaptados
    renderizarBotonesPorRol();
    await cargarAgenda('semana');
    await cargarEstadisticas();
    await cargarMonitorBoxes(); 
    await cargarSalaEspera(); 
    await inicializarFormularioConvenio(); 
    if (typeof renderizarTablaAlianzas === 'function') await renderizarTablaAlianzas(); 
    if (typeof cargarSolicitudesRecibidas === 'function') await cargarSolicitudesRecibidas();
 
    await verificarInvitacionesPendientes(); 

    // 6. ENGRANAJE FINANCIERO CONTABLE
    // ============================================================================
    console.log("🏦 FisioCid: Activando escucha del Botón de Ingresos Contables...");
    document.getElementById('btnRegistrarPagoFinal')?.addEventListener('click', async (e) => {
        e.preventDefault(); 
        const btn = document.getElementById('btnRegistrarPagoFinal');
        btn.disabled = true;
        btn.innerText = "PROCESANDO TRANSACCIÓN...";

        const idCita = document.getElementById('cobro_idCita')?.value || null;
        const idPaciente = document.getElementById('cobro_idPaciente')?.value || null;
        const montoTotal = parseFloat(document.getElementById('cobro_montoTotal')?.value) || 0;
        const concepto = document.getElementById('cobro_concepto')?.value?.trim()?.toUpperCase() || "CONSULTA GENERAL";
        const metodo = document.getElementById('cobro_metodo')?.value || "EFECTIVO";
        const notas = document.getElementById('cobro_notas')?.value?.trim() || null;
        const montoIva = parseFloat((montoTotal - (montoTotal / 1.16)).toFixed(2));

        try {
            const { error: errPago } = await fisioNet
                .from('finanzas_gestion')
                .insert([{
                    id_paciente: idPaciente,
                    id_clinica: localStorage.getItem('id_clinica_activa'),
                    id_cita: idCita,
                    id_profesional: user.id,
                    monto_total: montoTotal,
                    monto_iva: montoIva,
                    concepto: concepto,
                    metodo_pago: metodo,
                    pagado: true,
                    estatus_pago: 'PAGADO',
                    fecha_pago: new Date().toISOString().split('T')[0],
                    notas_pago: notas !== "" ? notas : null
                }]);

            if (errPago) throw errPago;

            if (idCita) {
                const { error: errAgenda } = await fisioNet
                    .from('agenda_maestra')
                    .update({ estatus: 'FINALIZADA', pago_status: 'PAGADO' })
                    .eq('id_cita', idCita);
                if (errAgenda) throw errAgenda;
            }

            alert("💵 ¡INGRESO ASENTADO CORRECTAMENTE EN FISIOCID FINANZAS!🩺🚀");
            window.location.reload(); 
        } catch (error) {
            console.error("❌ Fallo crítico en el motor contable de FisioCid:", error);
            alert("No se pudo registrar el movimiento: " + error.message);
            btn.disabled = false;
            btn.innerText = "📦 REGISTRAR INGRESO";
        }
    });
});

// ==========================================
// 🛡️ EL PORTERO: SISTEMA DE RECEPCIÓN DE INVITACIONES (STAFF)
// ==========================================

async function verificarInvitacionesPendientes() {
    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user || !user.email) return;

        // 1. Buscamos si hay invitaciones para este correo
        const { data: invitaciones, error } = await fisioNet
            .from('invitaciones_clinicas')
            .select('*')
            .eq('correo_institucional', user.email)
            .eq('estado', 'PENDIENTE');

        if (error) throw error;

        // 2. Si hay invitaciones, activamos la alarma visual (El Modal)
        if (invitaciones && invitaciones.length > 0) {
            console.log("🚨 Invitación detectada para:", user.email);
            const inv = invitaciones[0]; // Tomamos la más reciente
            mostrarAlertaInvitacion(inv);
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
                    ⏰ Turno: ${inv.turno || 'No especificado'}
                </div>
            </div>

            <div style="display:flex; gap:15px; justify-content:center;">
                <!-- 🔥 AQUÍ AGREGAMOS LOS DATOS FALTANTES AL CLIC -->
                <button onclick="procesarRespuestaInv('${inv.id}', 'ACEPTADO', '${inv.id_clinica_padre}', '${inv.nombre_clinica}', '${inv.rol_asignado}', '${inv.cargo_clinico}', '${inv.area_asignada}', '${inv.turno}', '${inv.id_superior_directo}')" 
                        style="background:#10b981; color:white; border:none; padding:15px; border-radius:14px; font-weight:800; cursor:pointer; flex:1; font-size:1rem; transition:0.2s;">
                    ✅ ACEPTAR
                </button>
                
                <button onclick="procesarRespuestaInv('${inv.id}', 'RECHAZADO', null, null, null)" 
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

window.procesarRespuestaInv = async (idInv, respuesta, idClinica, nombreClinica, rol) => {
    try {
        console.log("🔄 Procesando respuesta:", respuesta, "para la clínica:", nombreClinica);

        // 1. ACTUALIZAR ESTADO Y RESCATAR EL ADN COMPLETO DEL RECLUTAMIENTO
        const { data: datosInv, error: errUpdateInv } = await fisioNet
            .from('invitaciones_clinicas')
            .update({ estado: respuesta })
            .eq('id', idInv)
            .select('rol_asignado, cargo_clinico, area_asignada, turno, id_superior_directo') 
            .single();

        if (errUpdateInv) throw new Error("No se pudo actualizar la invitación.");

        if (respuesta === 'ACEPTADO') {
            const { data: { user } } = await fisioNet.auth.getUser();

            // 2. ⚡ CREAR EL VÍNCULO CON LA INFORMACIÓN COMPLETA
            const { error: errInsertColab } = await fisioNet
                .from('colaboradores_clinica')
                .insert([{
                    id_clinica: idClinica,
                    id_profesional: user.id,
                     rol_sistema: datosInv.rol_asignado,
                    cargo_clinico: datosInv.cargo_clinico || 'STAFF',
                    // 🔥 NUEVOS CAMPOS: Mapeamos lo que rescatamos de la invitación
                    area_asignada: datosInv.area_asignada || 'GENERAL', 
                    turno: datosInv.turno || 'MATUTINO',
                    id_superior_directo: datosInv.id_superior_directo || null,
                    estado: 'ACTIVO'
                }]);

            if (errInsertColab) {
                console.error("Error al crear colaborador:", errInsertColab);
                throw new Error("Invitación aceptada, pero falló la creación del equipo.");
            }

            // 3. GUARDAR EN LOCALSTORAGE PARA LA SESIÓN ACTUAL
            localStorage.setItem('id_clinica_activa', idClinica);
            localStorage.setItem('nombre_clinica', nombreClinica);

            alert(`🎉 ¡Bienvenido(a) a ${nombreClinica}! Tu cuenta ha sido vinculada con éxito.`);
        } else {
            alert("Has rechazado la invitación correctamente.");
        }

        // 4. LIMPIEZA VISUAL Y RECARGA
        const modal = document.getElementById('modalPorteroInv');
        if (modal) modal.remove();

        window.location.reload();

    } catch (err) {
        console.error("💥 ERROR CRÍTICO:", err.message);
        alert("Algo salió mal: " + err.message);
    }
};
// --- 🧪 MOTOR DE DESPEGUE A LABORATORIO FISIOCID ---
window.lanzarLaboratorioGeneral = async () => {
    console.log("🧪 Preparando identidad para el Portal de Laboratorio...");
    
    try {
        // 1. Obtenemos el usuario de la sesión actual de Supabase
        const { data: { user }, error } = await fisioNet.auth.getUser();

        if (error || !user) {
            console.error("❌ No se detectó sesión activa:", error);
            window.location.href = 'portal-laboratorio.html'; // Salto básico si falla
            return;
        }

        // 2. Extraemos los datos del profesional que está frente a la pantalla
        // Priorizamos metadatos de Supabase, luego lo que el Dashboard ya cargó
        const nombreProfesional = user.user_metadata?.full_name || localStorage.getItem('nombre_completo') || "ESPECIALISTA FISIOCID";
        const sedeActual = localStorage.getItem('nombre_clinica') || "FISIOCID-MATRIZ";
        const colorActual = localStorage.getItem('clinica_color') || "#00cfd5";

        // 3. Llenamos la "mochila" para que el portal-laboratorio.js la lea al llegar
        localStorage.setItem('full_name', nombreProfesional);
        localStorage.setItem('id_socio_activo', user.id);
        localStorage.setItem('clinica_nombre', sedeActual);
        localStorage.setItem('clinica_color', colorActual);

        console.log(`✅ Mochila cargada para: ${nombreProfesional} en ${sedeActual}`);

        // 4. ¡Vámonos al Laboratorio!
        window.location.href = 'portal-laboratorio.html';

    } catch (err) {
        console.error("❌ Error crítico en el despegue:", err);
        window.location.href = 'portal-laboratorio.html';
    }
};

// ============================================================================
// 🏦 SISTEMA FINANCIERO HÍBRIDO: DISPARADOR DE COBRO
// ============================================================================

// 1. Abre el modal y precarga la información de la cita de forma inteligente
window.dispararModalCobroAsistido = async (idCita, idPaciente, nombrePaciente, montoSugerido, conceptoSugerido) => {
    document.getElementById('cobro_idCita').value = idCita || "";
    document.getElementById('cobro_idPaciente').value = idPaciente || "";
    document.getElementById('cobro_pacienteNombre').value = nombrePaciente ? nombrePaciente.toUpperCase() : "PACIENTE GENERAL";
    document.getElementById('cobro_montoTotal').value = montoSugerido || 0;
    document.getElementById('cobro_concepto').value = conceptoSugerido ? conceptoSugerido.toUpperCase() : "CONSULTA DE FISIOTERAPIA";
    document.getElementById('cobro_metodo').value = "EFECTIVO"; // Por defecto
    document.getElementById('cobro_notas').value = "";

    // Desplegamos el modal híbrido
    document.getElementById('modalCobroAsistido').style.display = 'flex';
};

// 2. Cierra la ventana de cobro
window.cerrarModalCobro = () => {
    document.getElementById('modalCobroAsistido').style.display = 'none';
};
// ==========================================
// 🛡️ CAZADOR DE ROL OPERATIVO (MULTI-SEDE)
// ==========================================
async function obtenerYGuardarRolOperativo(userId, clinicaId) {
    try {
        console.log("🔍 Verificando rol operativo en la sede activa...");
        
        const { data: colaborador, error } = await fisioNet
            .from('colaboradores_clinica')
            .select('rol_sistema')
            .eq('id_profesional', userId)
            .eq('id_clinica', clinicaId)
            .maybeSingle();

        if (error) throw error;

        let rolFinal = 'STAFF_CLINICO'; // Rol de protección por defecto
        
        if (colaborador && colaborador.rol_sistema) {
            rolFinal = colaborador.rol_sistema;
        }

        // Guardamos el rol en memoria para que renderizarBotonesPorRol lo encuentre
        localStorage.setItem('rol_actual', rolFinal);
        console.log(`✅ Permisos concedidos como: [${rolFinal}]`);

    } catch (error) {
        console.error("❌ Error al recuperar el rol operativo:", error.message);
        localStorage.setItem('rol_actual', 'STAFF_CLINICO'); // Candado de seguridad si algo falla
    }
}

function renderizarBotonesPorRol() {
    const contenedor = document.getElementById('contenedorAccionesRapidas');
    if (!contenedor) return;

    // 1. Recuperamos el rol operativo de la sesión
    const miRol = localStorage.getItem('rol_actual') || 'STAFF_CLINICO'; 
    const esAdmin = (miRol === 'ADMIN_SISTEMA' || miRol === 'DUEÑO');
    
    // 🎯 NUEVA REGLA: El administrativo también puede ver la gestión de personal
    const puedeGestionarEquipo = (esAdmin || miRol === 'ADMINISTRATIVO');
    
    // ==========================================
    // 🛡️ CONTROL DEL NAVBAR SUPERIOR AJUSTADO
    // ==========================================
    const btnEquipo = document.getElementById('btnMiEquipo');
    const btnPrecios = document.getElementById('btnAbrirConfig');
    const btnIdentidad = document.getElementById('btnIdentidadVisual');

    // Ahora el botón de equipo se muestra para Admin Y Administrativo 🚀
    if (btnEquipo) btnEquipo.style.display = puedeGestionarEquipo ? 'flex' : 'none';
    
    // Precios e Identidad se quedan EXCLUSIVOS para ti (Modo Dios)
    if (btnPrecios) btnPrecios.style.display = esAdmin ? 'flex' : 'none';
    if (btnIdentidad) btnIdentidad.style.display = esAdmin ? 'flex' : 'none';

    // ==========================================
    // 2. CATÁLOGO MAESTRO DE BOTONES
    // ==========================================
    const catalogoBotones = {
        agregarPaciente: `<button class="btn-action" onclick="window.location.href='nuevo-paciente.html'">📝 Agregar Paciente</button>`,
        listaPacientes: `<button class="btn-action" onclick="window.location.href='lista-pacientes.html'">👥 Lista de Pacientes</button>`,
        inventario:     `<button class="btn-action" onclick="window.location.href='inventario.html'">📦 Inventario</button>`,
        nuevoEstudio:   `<button class="btn-action" onclick="window.location.href='portal-gabinete.html'">📡 Nuevo Estudio</button>`,
        laboratorio:    `<button class="btn-action" onclick="lanzarLaboratorioGeneral()">🧪 Nuevo Laboratorio</button>`,
        finanzas:       `<button class="btn-action" onclick="window.location.href='finanzas.html'">📊 Control de Caja</button>`
    };

    // ==========================================
    // 3. ASIGNACIÓN EN CALIENTE 🔥
    // ==========================================
    let botonesAJS = [];

    switch(miRol) {
        case 'ADMIN_SISTEMA':
        case 'DUEÑO':
            botonesAJS = [
                catalogoBotones.agregarPaciente, catalogoBotones.listaPacientes,
                catalogoBotones.inventario, catalogoBotones.nuevoEstudio,
                catalogoBotones.laboratorio, catalogoBotones.finanzas
            ];
            break;

        case 'ADMINISTRATIVO':
            // Sigue con acceso a la operación del día a día y dinero, más el Navbar de equipo arriba
            botonesAJS = [
                catalogoBotones.agregarPaciente, 
                catalogoBotones.listaPacientes, 
                catalogoBotones.finanzas
            ];
            break;

        case 'STAFF_CLINICO':
            botonesAJS = [
                catalogoBotones.listaPacientes, 
                catalogoBotones.nuevoEstudio, 
                catalogoBotones.laboratorio
            ];
            break;

        case 'OPERATIVO':
            botonesAJS = []; 
            break;

        default:
            botonesAJS = [catalogoBotones.listaPacientes];
            break;
    }

    contenedor.innerHTML = botonesAJS.join('');
}


function cargarHorariosEnModal(dataHorarios) {
    const contenedor = document.getElementById('contenedorHorarios');
    
    // 1. Limpieza radical
    while (contenedor.firstChild) {
        contenedor.removeChild(contenedor.firstChild);
    }

    // 2. Parseo seguro
    let horarios;
    try {
        horarios = typeof dataHorarios === 'string' ? JSON.parse(dataHorarios) : dataHorarios;
    } catch (e) {
        console.error("Error al parsear el JSON de horarios:", e);
        return;
    }

    // 3. Renderizado corregido
    horarios.forEach(h => {
        const div = document.createElement('div');
        div.className = 'bloque-horario';
        // Agregué tus estilos CSS para que no pierdas el diseño
        div.style = "background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 10px; position: relative;";
        
        div.innerHTML = `
            <select class="dia-semana" style="width: 100%; margin-bottom:10px; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
                <option value="LV" ${h.dia === 'LV' ? 'selected' : ''}>Lunes a Viernes</option>
                <option value="1" ${h.dia == 1 ? 'selected' : ''}>Lunes</option>
                <option value="2" ${h.dia == 2 ? 'selected' : ''}>Martes</option>
                <option value="3" ${h.dia == 3 ? 'selected' : ''}>Miércoles</option>
                <option value="4" ${h.dia == 4 ? 'selected' : ''}>Jueves</option>
                <option value="5" ${h.dia == 5 ? 'selected' : ''}>Viernes</option>
                <option value="6" ${h.dia == 6 ? 'selected' : ''}>Sábado</option>
                <option value="0" ${h.dia == 0 ? 'selected' : ''}>Domingo</option>
            </select>
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="time" class="h-ini" value="${h.inicio}" style="flex:1; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
                <span style="color: #94a3b8; font-size: 0.8rem;">a</span>
                <input type="time" class="h-fin" value="${h.fin}" style="flex:1; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
            </div>
        `;
        
        contenedor.appendChild(div);
    });

    console.log("Se renderizaron", horarios.length, "horarios correctamente.");
}