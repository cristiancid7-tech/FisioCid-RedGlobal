
import { 
    cargarAgenda, 
    sincronizarConGoogleCalendar, 
    actualizarCitaEnGoogle, 
    cancelarCitaEnGoogle,
    reconectarGoogleCalendar
} from './agenda.js';   

if (typeof window.sedesDisponibles === 'undefined') {
    window.sedesDisponibles = [];
}

async function validarEstadoPagoSede(idUsuario) {
    try {
        if (!idUsuario) return { pagado: true };

        // Consultamos directo en perfiles_profesionales
        const { data: perfil, error } = await fisioNet
            .from('perfiles_profesionales')
            .select('suscripcion_activa, nivel_suscripcion, fecha_expiracion')
            .eq('id', idUsuario)
            .maybeSingle();

        if (error) {
            console.error("❌ Error en Supabase al consultar suscripción:", error);
            return { pagado: true }; // Manejo de falla por red/conexion
        }

        if (!perfil) {
            console.warn("⚠️ No se encontró el perfil profesional ID:", idUsuario);
            return { pagado: true };
        }

        // 1. Verificación directa por bandera booleana
        if (perfil.suscripcion_activa === false) {
            return {
                pagado: false,
                motivo: 'SUSCRIPCION_INACTIVA',
                fechaCorte: perfil.fecha_expiracion
            };
        }

        // 2. Verificación por nivel de suscripción
        const nivel = (perfil.nivel_suscripcion || '').toLowerCase().trim();
        if (nivel === 'vencido' || nivel === 'suspendido' || nivel === 'cancelado') {
            return {
                pagado: false,
                motivo: 'SUSCRIPCION_VENCIDA',
                fechaCorte: perfil.fecha_expiracion
            };
        }

        // 3. Verificación por fecha de expiración
        if (perfil.fecha_expiracion) {
            const hoy = new Date();
            const fechaExpiracion = new Date(perfil.fecha_expiracion);

            if (hoy > fechaExpiracion) {
                return {
                    pagado: false,
                    motivo: 'FECHA_EXPIRADA',
                    fechaCorte: perfil.fecha_expiracion
                };
            }
        }

        return { pagado: true, nivel: perfil.nivel_suscripcion };

    } catch (e) {
        console.error("❌ Error inesperado validando cuenta:", e);
        return { pagado: true };
    }
}

function bloquearDashboardPorFaltaDePago(datosPago) {
    // Si ya existe el modal, no lo duplicamos
    if (document.getElementById('modalBloqueoPago')) return;

    const fechaFormateada = datosPago.fechaCorte 
        ? new Date(datosPago.fechaCorte).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) 
        : 'Reciente';

    const htmlModal = `
    <div id="modalBloqueoPago" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(10px); z-index: 999999; display: flex; justify-content: center; align-items: center; padding: 20px;">
        <div style="background: #ffffff; width: 100%; max-width: 480px; border-radius: 20px; padding: 35px 25px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); border: 2px solid #ef4444; animation: popIn 0.3s ease-out;">
            <div style="width: 70px; height: 70px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
                <i class="fas fa-lock" style="font-size: 2rem; color: #dc2626;"></i>
            </div>
            
            <h2 style="margin: 0 0 10px 0; font-size: 1.4rem; color: #0f172a; font-weight: 900; text-transform: uppercase;">
                Suscripción Requerida
            </h2>
            
            <p style="color: #64748b; font-size: 0.9rem; line-height: 1.5; margin-bottom: 20px;">
                El periodo de acceso de esta sede venció el <strong>${fechaFormateada}</strong>. Para continuar agendando citas y consultando expedientes, renueva tu suscripción a FisioCid.
            </p>

            <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 15px; margin-bottom: 25px; text-align: left;">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #475569; margin-bottom: 5px;">
                    <span>Estatus del servicio:</span>
                    <strong style="color: #dc2626;">🔴 SUSPENDIDO TEMPORALMENTE</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #475569;">
                    <span>Tus datos y expedientes:</span>
                    <strong style="color: #166534;">🔒 100% SEGUROS</strong>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button onclick="window.location.href='suscripcion.html'" style="background: #2563eb; color: white; border: none; padding: 14px; border-radius: 12px; font-weight: 800; font-size: 0.95rem; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                    💳 RENOVAR SUSCRIPCIÓN AHORA
                </button>
                <button onclick="document.getElementById('btnCerrarSesion')?.click()" style="background: transparent; color: #64748b; border: none; padding: 10px; font-size: 0.85rem; font-weight: 700; cursor: pointer;">
                    👋 Cerrar Sesión
                </button>
            </div>
        </div>
    </div>
    <style>
        @keyframes popIn {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }
    </style>
    `;

    document.body.insertAdjacentHTML('beforeend', htmlModal);
}

async function verificarSesionSegura() {
    // Ocultar elementos de entrada por seguridad mientras responde la BD
    evaluarAccesoElementosUI(false);

    try {
        // 1. Verificar sesión activa con Supabase
        const { data: { session }, error: sessionError } = await fisioNet.auth.getSession();
        const clinicaActiva = localStorage.getItem('id_clinica_activa');

        if (sessionError || !session || !clinicaActiva) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.replace("login.html");
            return;
        }

        const userId = session.user.id;

        // 2. Consultar únicamente el perfil profesional principal
        const { data: perfil, error: perfilError } = await fisioNet
            .from('perfiles_profesionales')
            .select('id, tipo_perfil')
            .eq('id', userId)
            .maybeSingle();

        if (perfilError) throw perfilError;

        let tienePermisoEspecial = false;
        let tipoPerfil = '';
        let rolSistema = '';

        if (perfil) {
            tipoPerfil = (perfil.tipo_perfil || '').toUpperCase();

            // 👑 REGLA MAESTRA 1: Si es DUENO o DUEÑO -> ACCESO PERMITIDO DIRECTO
            if (tipoPerfil === 'DUENO' || tipoPerfil === 'DUEÑO') {
                tienePermisoEspecial = true;
            } 
            // ⛔ REGLA MAESTRA 2: Si es INDEPENDIENTE -> DENEGADO DIRECTO
            else if (tipoPerfil === 'INDEPENDIENTE') {
                tienePermisoEspecial = false;
            } 
            // 👥 REGLA AUXILIAR: Para STAFF u otros, se valida su rol en colaboradores_clinica
            else {
                const { data: colaborador, error: colabError } = await fisioNet
                    .from('colaboradores_clinica')
                    .select('rol_sistema')
                    .eq('id_profesional', perfil.id)
                    .eq('id_clinica', clinicaActiva)
                    .maybeSingle();

                if (!colabError && colaborador) {
                    rolSistema = (colaborador.rol_sistema || '').toUpperCase();
                    if (
                        rolSistema === 'ADMINISTRADOR' || 
                        rolSistema === 'ADMINISTRATIVO' || 
                        rolSistema === 'ADMIN_SISTEMA' ||
                        rolSistema === 'ADMIN'
                    ) {
                        tienePermisoEspecial = true;
                    }
                }
            }
        }

        console.log("🔍 TIPO PERFIL EN PERFILES_PROFESIONALES:", tipoPerfil);
        console.log("👔 ROL EN COLABORADORES (Si aplico):", rolSistema || "N/A");
        console.log("🔓 ¿TIENE PERMISO ESPECIAL?:", tienePermisoEspecial);

        // 3. Aplicar visibilidad en la interfaz
        evaluarAccesoElementosUI(tienePermisoEspecial);

    } catch (err) {
        console.error("Error verificando permisos de acceso:", err);
        evaluarAccesoElementosUI(false);
    }
}


// Ejecutar verificación de inmediato
verificarSesionSegura();


async function comprobarConfiguracionInicialRequerida() {
    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return;

        const modal = document.getElementById('modalConfigInicial');
        if (!modal) return;

        const clinicaActiva = localStorage.getItem('id_clinica_activa');
        if (!clinicaActiva) return;

        // 🛡️ Consulta la configuración del profesional ESPECÍFICAMENTE en la clínica activa
        const { data: colab } = await fisioNet
            .from('colaboradores_clinica')
            .select('rol_sistema, costo_consulta_base, horario_atencion')
            .eq('id_profesional', user.id)
            .eq('id_clinica', clinicaActiva)
            .maybeSingle();

        // Si no es ADMIN_SISTEMA en esta sede, no le pedimos configurar la sucursal
        if (colab && colab.rol_sistema && colab.rol_sistema !== 'ADMIN_SISTEMA') {
            modal.remove();
            return;
        }

        // 🔍 Validar si en ESTA SEDE ya configuró precios y horarios
        const tieneCostoValido = colab && colab.costo_consulta_base !== null && colab.costo_consulta_base !== undefined;
        
        let tieneHorariosValidos = false;
        if (colab && colab.horario_atencion) {
            try {
                const horarios = typeof colab.horario_atencion === 'string' 
                    ? JSON.parse(colab.horario_atencion) 
                    : colab.horario_atencion;
                tieneHorariosValidos = Array.isArray(horarios) && horarios.length > 0;
            } catch (e) {
                tieneHorariosValidos = false;
            }
        }

        // Si falta la tarifa o los horarios para ESTA clínica, mostramos el modal
        if (!colab || !tieneCostoValido || !tieneHorariosValidos) {
            modal.style.display = 'flex';
        } else {
            modal.style.display = 'none';
        }
    } catch (err) {
        console.error("❌ Error verificando configuración de sede:", err);
    }
}

async function actualizarInterfazSede() {
    // 🎯 1. Buscar todos los posibles contenedores del badge de la sede activa
    const labelSede = document.getElementById('badgeSedeActiva') || 
                      document.getElementById('txtSedeActual') || 
                      document.getElementById('sedeActivaTexto') ||
                      document.querySelector('.badge-sede-activa');

    const txtEspUI = document.getElementById('txtEspecialidadUsuario');
    const clinicaId = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');

    // 🎯 2. Consultar directamente a Supabase la clínica activa para garantizar el nombre exacto
    if (clinicaId) {
        try {
            const { data: clinicaData } = await fisioNet
                .from('clinicas')
                .select('nombre_clinica, color_institucional')
                .eq('id', clinicaId)
                .maybeSingle();

            if (clinicaData) {
                // Actualizamos localStorage con los datos reales
                localStorage.setItem('nombre_clinica', clinicaData.nombre_clinica);
                
                if (labelSede) {
                    labelSede.innerHTML = `<i class="fas fa-hospital"></i> SEDE ACTIVA: ${clinicaData.nombre_clinica.toUpperCase()}`;
                }

                if (clinicaData.color_institucional) {
                    localStorage.setItem('clinica_color', clinicaData.color_institucional);
                    document.documentElement.style.setProperty('--primary', clinicaData.color_institucional);
                }
            }
        } catch (e) {
            console.warn("No se pudo refrescar la clínica desde la BD, usando respaldo local:", e);
        }
    }

    // Fallback con localStorage por si falla la red
    const sedeElegidaNombre = localStorage.getItem('nombre_clinica');
    if (sedeElegidaNombre && labelSede && labelSede.innerText.includes('CARGANDO')) {
        labelSede.innerHTML = `<i class="fas fa-hospital"></i> SEDE ACTIVA: ${sedeElegidaNombre.toUpperCase()}`;
    }

    // Aplicar color a los botones principales
    const colorSede = localStorage.getItem('clinica_color');
    if (colorSede) {
        document.querySelectorAll('.btn-principal').forEach(btn => {
            btn.style.backgroundColor = colorSede;
        });
    }

    try {
        // 🎯 3. Obtener el usuario y actualizar la especialidad o cargo clínico
        const { data: { user } } = await fisioNet.auth.getUser();
        
        if (user) {
            localStorage.setItem('usuarioId', user.id);

            const { data: perfil, error: errPerfil } = await fisioNet
                .from('perfiles_profesionales')
                .select('especialidad') 
                .eq('id', user.id)
                .maybeSingle();

            if (errPerfil) console.error("Error al consultar especialidad:", errPerfil);

            if (perfil && perfil.especialidad) {
                const especialidadReal = perfil.especialidad.toUpperCase().trim();
                localStorage.setItem('especialidadUsuario', especialidadReal);
                if (txtEspUI) txtEspUI.innerText = especialidadReal;
            } else if (clinicaId) {
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
            .maybeSingle();

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

export function renderizarCitas(citas, modo) {
    const lista = document.getElementById('listaAgenda');
    if (!lista) return;
    lista.innerHTML = '';

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
            return isNaN(edad) ? "" : `${edad} años`;
        } catch (e) { return ""; }
    };

    const formatearFechaCorta = (fechaStr) => {
        if (!fechaStr) return "";
        const f = new Date(fechaStr + "T00:00:00");
        return f.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).toUpperCase();
    };

    if (modo === 'semana') {
        const fechaInput = document.getElementById('filtroFechaAgenda')?.value || new Date().toISOString().split('T')[0];
        const fechaBase = new Date(fechaInput + "T00:00:00");

        let diasSemana = [];
        for (let i = 0; i < 6; i++) {
            const d = new Date(fechaBase);
            d.setDate(fechaBase.getDate() + i);
            diasSemana.push(d.toISOString().split('T')[0]);
        }

        const gridSemanal = document.createElement('div');
        gridSemanal.style.cssText = `
            display: grid;
            grid-template-columns: repeat(6, minmax(240px, 1fr));
            gap: 12px;
            overflow-x: auto;
            padding-bottom: 15px;
            width: 100%;
        `;

        diasSemana.forEach((fechaStr, index) => {
            const citasDelDia = (citas || []).filter(c => c.fecha === fechaStr);
            const fechaObj = new Date(fechaStr + "T00:00:00");
            const nombreDia = fechaObj.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
            
            const hoyReal = obtenerFechaLocal();
            const esHoy = (fechaStr === hoyReal);
            
            const columnaDia = document.createElement('div');
            columnaDia.style.cssText = `
                background: ${esHoy ? '#f0fdf4' : '#f8fafc'};
                border: 1px solid ${esHoy ? '#bbf7d0' : '#e2e8f0'};
                border-radius: 14px;
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                min-height: 450px;
            `;

            columnaDia.innerHTML = `
                <div style="text-align: center; padding: 8px; background: ${esHoy ? '#dcfce7' : '#ffffff'}; border-radius: 10px; border: 1px solid ${esHoy ? '#86efac' : '#e2e8f0'}; font-weight: 900; font-size: 0.75rem; color: ${esHoy ? '#166534' : '#0f172a'}; letter-spacing: 0.5px; text-transform: uppercase;">
                    ${esHoy ? '⭐ HOY - ' : '📅 '} ${nombreDia}
                    <span style="display: block; font-size: 0.65rem; color: ${esHoy ? '#15803d' : '#64748b'}; font-weight: 600; margin-top: 2px;">${citasDelDia.length} citas</span>
                </div>
                <div class="tarjetas-dia-container" style="display: flex; flex-direction: column; gap: 8px; flex: 1;"></div>
            `;

            const contenedorTarjetas = columnaDia.querySelector('.tarjetas-dia-container');

            if (citasDelDia.length === 0) {
                contenedorTarjetas.innerHTML = `
                    <div style="text-align: center; padding: 30px 10px; color: #94a3b8; font-size: 0.75rem; font-weight: 600;">
                        Sin citas
                    </div>`;
            } else {
                citasDelDia.forEach(cita => {
                    const p = cita.pacientes_maestros || { nombre: 'Paciente', apellido_paterno: 'Registrado', apellido_materno: '', curp: '', id: '' };
                    const nombrePaciente = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.trim();
                    const edadInfo = calcularEdadPorCurp(p.curp);

                    const botonAccion = cita.es_prospecto 
                        ? `<button onclick="abrirFiltroLimpieza('${cita.id_cita}')" title="Corregir Datos" style="background: #fef08a; border: 1px solid #fde047; color: #854d0e; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 0.65rem; font-weight: 900;">✍️ REGISTRAR</button>`
                        : `<button onclick="irAHistoria('${p.id}')" title="Ver Expediente" style="background: #f8fafc; border: 1px solid #e2e8f0; color: #475569; border-radius: 6px; width: 26px; height: 26px; cursor: pointer; font-size: 0.7rem; display: flex; align-items: center; justify-content: center; transition: 0.2s;">→</button>`;

                    const bgColor = cita.es_prospecto ? '#fefce8' : '#ffffff';
                    const borderColor = cita.es_prospecto ? '#fde047' : '#e2e8f0';

                    const tarjeta = document.createElement('div');
                    tarjeta.style.cssText = `
                        background: ${bgColor};
                        border: 1px solid ${borderColor};
                        border-radius: 8px;
                        padding: 10px;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                        display: flex;
                        flex-direction: column;
                        gap: 5px;
                    `;

                    tarjeta.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="font-size: 0.75rem; font-weight: 800; color: #1e293b; line-height: 1.2;">
                                ${nombrePaciente}
                                ${edadInfo ? `<span style="display: block; font-size: 0.65rem; color: #64748b; font-weight: 600; margin-top: 2px;">${edadInfo}</span>` : ''}
                            </div>
                            ${botonAccion}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                            <span style="font-size: 0.7rem; color: #64748b; font-weight: 600;">
                                ⏰ ${cita.hora_inicio_cita ? cita.hora_inicio_cita.substring(0,5) : '00:00'}
                            </span>
                            <select onchange="cambiarEstatusCita('${cita.id_cita}', this.value, ${cita.es_prospecto ? true : false})" style="...">
    <option value="PENDIENTE" ${cita.estatus === 'PENDIENTE' ? 'selected' : ''}>⏳ PENDIENTE</option>
    <option value="ATENDIENDO" ${cita.estatus === 'ATENDIENDO' ? 'selected' : ''}>👨‍⚕️ ATENDIENDO</option>
    <option value="COMPLETADO" ${cita.estatus === 'COMPLETADO' ? 'selected' : ''}>✅ COMPLETADO</option>
    <option value="REAGENDADO" ${cita.estatus === 'REAGENDADO' ? 'selected' : ''}>🔄 REAGENDADO</option>
    <option value="CANCELADO" ${cita.estatus === 'CANCELADO' ? 'selected' : ''}>❌ CANCELADO</option>
    <option value="NO_ASISTIO" ${cita.estatus === 'NO_ASISTIO' ? 'selected' : ''}>👻 FALTO</option>
</select>
                        </div>
                    `;
                    contenedorTarjetas.appendChild(tarjeta);
                });
            }
            gridSemanal.appendChild(columnaDia);
        });
        lista.appendChild(gridSemanal);
        
    } else if (modo === 'dia') {
        const fechaInput = document.getElementById('filtroFechaAgenda')?.value || new Date().toISOString().split('T')[0];
        const citasDelDia = (citas || []).filter(c => c.fecha === fechaInput);
        
        if (citasDelDia.length === 0) {
            lista.innerHTML = '<div style="text-align: center; padding: 30px; color: #94a3b8; font-weight: 600;">Sin citas para este día.</div>';
            return;
        }

        const contenedorDia = document.createElement('div');
        contenedorDia.style.cssText = "display: flex; flex-direction: column; gap: 10px;";

        citasDelDia.forEach(cita => {
            const p = cita.pacientes_maestros || { nombre: 'Paciente', apellido_paterno: 'Registrado', apellido_materno: '', curp: '', id: '' };
            const nombrePaciente = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.trim();
            
            const botonAccionDia = cita.es_prospecto 
                ? `<button onclick="abrirFiltroLimpieza('${cita.id_cita}')" title="Corregir Datos" style="background: #fef08a; border: 1px solid #fde047; color: #854d0e; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 0.75rem; font-weight: 900;">✍️ REGISTRAR</button>`
                : `<button onclick="irAHistoria('${p.id}')" title="Ver Expediente" style="background: var(--primary); color: white; border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 0.75rem; font-weight: bold;">Abrir Expediente →</button>`;

            const selectorEstatus = `
                <select onchange="cambiarEstatusCita('${cita.id_cita}', this.value, ${cita.es_prospecto ? true : false})" style="font-size: 0.75rem; font-weight: bold; padding: 6px; border-radius: 6px; border: 1px solid #cbd5e1; margin-right: 8px; cursor: pointer;">
                    <option value="PENDIENTE" ${cita.estatus === 'PENDIENTE' ? 'selected' : ''}>⏳ PENDIENTE</option>
                    <option value="ATENDIENDO" ${cita.estatus === 'ATENDIENDO' ? 'selected' : ''}>👨‍⚕️ ATENDIENDO</option>
                    <option value="COMPLETADO" ${cita.estatus === 'COMPLETADO' ? 'selected' : ''}>✅ COMPLETADO</option>
                    <option value="REAGENDADO" ${cita.estatus === 'REAGENDADO' ? 'selected' : ''}>🔄 REAGENDADO</option>
                    <option value="CANCELADO" ${cita.estatus === 'CANCELADO' ? 'selected' : ''}>❌ CANCELADO</option>
                    <option value="NO_ASISTIO" ${cita.estatus === 'NO_ASISTIO' ? 'selected' : ''}>👻 FALTO</option>
                </select>
            `;

            const divCita = document.createElement('div');
            divCita.style.cssText = `
                background: ${cita.es_prospecto ? '#fefce8' : '#ffffff'};
                border: 1px solid ${cita.es_prospecto ? '#fde047' : '#e2e8f0'};
                padding: 15px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            `;

            divCita.innerHTML = `
                <div>
                    <div style="font-weight: 800; font-size: 0.9rem; color: #1e293b;">${nombrePaciente}</div>
                    <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">⏰ ${cita.hora_inicio_cita ? cita.hora_inicio_cita.substring(0,5) : ''} | Modalidad: ${cita.modalidad}</div>
                </div>
                <div style="display: flex; align-items: center;">
                    ${selectorEstatus}
                    ${botonAccionDia}
                </div>
            `;
            contenedorDia.appendChild(divCita);
        });
        lista.appendChild(contenedorDia);
    }
}

window.cambiarEstatusCita = async (idCita, nuevoEstatus, esProspecto = false) => {
    if (!idCita || idCita === 'undefined') return;

    try {
        if (nuevoEstatus === 'REAGENDADO') {
            // 1. Crear el modal flotante
            let modalReagendar = document.getElementById('modalReagendarCita');
            if (!modalReagendar) {
                modalReagendar = document.createElement('div');
                modalReagendar.id = 'modalReagendarCita';
                modalReagendar.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5); display: flex; justify-content: center;
                    align-items: center; z-index: 9999; backdrop-filter: blur(2px);
                `;
                document.body.appendChild(modalReagendar);
            }

            const fechaHoy = new Date().toISOString().split('T')[0];

            modalReagendar.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 12px; width: 90%; max-width: 420px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); display: flex; flex-direction: column; gap: 12px;">
                    <h3 style="margin: 0; font-size: 1rem; color: #1e293b; font-weight: 800;">🔄 Reagendar Cita</h3>
                    
                    <label style="font-size: 0.75rem; font-weight: 700; color: #475569;">SELECCIONA LA NUEVA FECHA:</label>
                    <input type="date" id="inputNuevaFechaCita" value="${fechaHoy}" style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.85rem;">
                    
                    <button id="btnConsultarDispoModal" style="background: #0f172a; color: white; border: none; padding: 9px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">🔍 Consultar Horarios Disponibles</button>
                    
                    <div id="contenedorHorariosLibresModal" style="display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto; margin-top: 5px;">
                        <span style="font-size: 0.75rem; color: #94a3b8; text-align: center;">Elige una fecha y presiona consultar.</span>
                    </div>

                    <button onclick="document.getElementById('modalReagendarCita').remove(); cargarAgenda(document.querySelector('.btn-filtro.active')?.innerText.toLowerCase() === 'semana' ? 'semana' : 'dia');" style="background: #e2e8f0; color: #475569; border: none; padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75rem; margin-top: 5px;">Cancelar</button>
                </div>
            `;

            // 2. Lógica interna idéntica a tu función de disponibilidad real
            document.getElementById('btnConsultarDispoModal').onclick = async () => {
                const fechaElegida = document.getElementById('inputNuevaFechaCita').value;
                const contenedor = document.getElementById('contenedorHorariosLibresModal');
                const clinicaId = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');
                const { data: { user } } = await fisioNet.auth.getUser();

                if (!fechaElegida || !clinicaId || !user) {
                    alert("Faltan datos de clínica o sesión de usuario.");
                    return;
                }

                contenedor.innerHTML = `<div style="text-align:center; width:100%; color:#10b981; font-size: 0.75rem; font-weight: bold;"><i class="fas fa-spinner fa-spin"></i> Buscando horarios...</div>`;

                try {
                    const [ocupadasRes, perfilRes] = await Promise.all([
                        fisioNet.from('agenda_maestra').select('hora_inicio_cita').eq('fecha', fechaElegida).eq('id_clinica', clinicaId).eq('estado', 'ACTIVO'),
                        fisioNet.from('perfiles_profesionales').select('horario_atencion, intervalo_cita').eq('id', user.id).single()
                    ]);

                    const ocupadas = ocupadasRes.data;
                    const perfil = perfilRes.data;

                    if (!perfil?.horario_atencion) {
                        contenedor.innerHTML = `<p style="color:#ef4444; text-align:center; width:100%; font-size: 0.75rem;">Configura tus horarios en tu perfil primero.</p>`;
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
                            const estaOcupada = ocupadas?.some(o => o.hora_inicio_cita && o.hora_inicio_cita.startsWith(horaGen));
                            
                            if (!estaOcupada) {
                                espaciosDisponibles.push(horaGen);
                            }
                            inicio += intervalo;
                        }
                    });

                    if (espaciosDisponibles.length === 0) {
                        contenedor.innerHTML = `<p style="color:#ef4444; text-align:center; width:100%; font-size: 0.75rem; font-weight: bold;">Sin horarios disponibles para este día ❌</p>`;
                        return;
                    }

                    contenedor.innerHTML = `<span style="font-size: 0.75rem; font-weight: 700; color: #166534;">Selecciona la nueva hora (${espaciosDisponibles.length} libres):</span>`;
                    
                    const gridHorarios = document.createElement('div');
                    gridHorarios.style.cssText = "display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 4px;";

                    espaciosDisponibles.forEach(hora => {
                        const btnHora = document.createElement('button');
                        btnHora.innerText = hora;
                        btnHora.style.cssText = "background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 6px; border-radius: 6px; font-weight: 800; font-size: 0.75rem; cursor: pointer; text-align: center;";
                        
                        // Al hacer clic en la pastilla de hora, guardamos de inmediato en Supabase
                        btnHora.onclick = async () => {
                            modalReagendar.remove();

                            if (esProspecto) {
                                const { error } = await fisioNet.from('solicitudes_citas')
                                    .update({ fecha_cita: fechaElegida, hora_cita: hora, estado: 'PENDIENTE' })
                                    .eq('id', idCita);
                                if (error) throw error;
                            } else {
                                const { error } = await fisioNet.from('agenda_maestra')
                                    .update({ fecha: fechaElegida, hora_inicio_cita: hora, estatus: 'PENDIENTE' })
                                    .eq('id_cita', idCita);
                                if (error) throw error;

                                if (typeof actualizarEventoGoogleCalendar === 'function') {
                                    await actualizarEventoGoogleCalendar(idCita, fechaElegida, hora, "Paciente FisioCid");
                                }
                            }

                            alert(`✅ Cita reagendada con éxito para el ${fechaElegida} a las ${hora}.`);
                            
                            const modoActual = document.querySelector('.btn-filtro.active')?.innerText.toLowerCase() === 'semana' ? 'semana' : 'dia';
                            if (typeof cargarAgenda === 'function') cargarAgenda(modoActual);
                        };

                        gridHorarios.appendChild(btnHora);
                    });

                    contenedor.appendChild(gridHorarios);

                } catch (err) {
                    console.error("Error consultando disponibilidad en modal:", err);
                    contenedor.innerHTML = `<p style="color:#ef4444; text-align:center; width:100%; font-size: 0.75rem;">Error al sincronizar horarios.</p>`;
                }
            };

        } else {
            // Cambio de estatus normal (Completado, Cancelado, etc.)
            if (esProspecto) {
                const { error } = await fisioNet.from('solicitudes_citas')
                    .update({ estado: nuevoEstatus })
                    .eq('id', idCita);
                if (error) throw error;
            } else {
                const { error } = await fisioNet.from('agenda_maestra')
                    .update({ estatus: nuevoEstatus })
                    .eq('id_cita', idCita);
                if (error) throw error;
            }

            const modoActual = document.querySelector('.btn-filtro.active')?.innerText.toLowerCase() === 'semana' ? 'semana' : 'dia';
            if (typeof cargarAgenda === 'function') {
                await cargarAgenda(modoActual);
            }
        }

    } catch (err) {
        console.error("Error al cambiar estatus de cita:", err);
        alert("No se pudo cambiar el estatus: " + err.message);
    }
};
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
    const clinicaId = localStorage.getItem('id_clinica_activa'); // 🔒 Sede activa
    
    try {
        const [resAlianza, resConteo] = await Promise.all([
            fisioNet.from('red_colaboracion').select('*').eq('id', idAlianza).single(),
            fisioNet.from('vinculos_clinicos')
                .select('*', { count: 'exact', head: true })
                .eq('id_alianza_referido', idAlianza)
                .eq('id_clinica', clinicaId) // 🔒 Aislamiento estricto por sede activa
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
    const clinicaActiva = localStorage.getItem('id_clinica_activa');
    
    if (!user || !clinicaActiva) {
        alert("⚠️ Error: Sesión o sede activa no encontrada.");
        return;
    }

    // 1. Recolectar bloques de horario
    let horariosArray = [];
    document.querySelectorAll('.bloque-horario').forEach(bloque => {
        const seleccion = bloque.querySelector('.dia-semana')?.value?.trim();
        const inicio = bloque.querySelector('.h-ini')?.value;
        const fin = bloque.querySelector('.h-fin')?.value;

        if (seleccion && inicio && fin) {
            if (seleccion.includes("Lunes a Viernes") || seleccion === "LV") {
                [1, 2, 3, 4, 5].forEach(d => horariosArray.push({ dia: d, inicio, fin }));
            } else if (seleccion.includes("Sábado") || seleccion.includes("Sabado") || seleccion === "6") {
                horariosArray.push({ dia: 6, inicio, fin });
            } else if (seleccion.includes("Domingo") || seleccion === "0") {
                horariosArray.push({ dia: 0, inicio, fin });
            } else {
                const diaNum = parseInt(seleccion, 10);
                if (!isNaN(diaNum)) horariosArray.push({ dia: diaNum, inicio, fin });
            }
        }
    });

    if (horariosArray.length === 0) {
        alert("⚠️ Ingresa al menos un bloque de horario válido.");
        return;
    }

    const baseConsultorio = parseFloat(document.getElementById('baseConsultorio')?.value) || 0;
    const baseDomicilio = parseFloat(document.getElementById('baseDomicilio')?.value) || 0;
    const intervalo = parseInt(document.getElementById('intervaloCita')?.value, 10) || 30;

    try {
        // 2. Guardar Tarifas y Horarios en la relación de la CLINICA ACTIVA
        const { error } = await fisioNet
            .from('colaboradores_clinica')
            .update({
                costo_consulta_base: baseConsultorio,
                costo_domicilio_base: baseDomicilio,
                horario_atencion: JSON.stringify(horariosArray),
                intervalo_cita: intervalo
            })
            .eq('id_profesional', user.id)
            .eq('id_clinica', clinicaActiva);

        if (error) throw error;

        alert("¡CONFIGURACIÓN DE ESTA SEDE GUARDADA CON ÉXITO! 🩺🚀");
        document.getElementById('modalConfigInicial').style.display = 'none';
        location.reload();

    } catch (err) {
        console.error("Error guardando configuración de la sede:", err);
        alert("Error al guardar: " + err.message);
    }
});



window.irAHistoria = (idPaciente) => {
    if (!idPaciente) return;
    localStorage.setItem('paciente_seleccionado_id', idPaciente);
    window.location.href = 'historial-evolucion.html'; 
};
window.cargarAgenda = cargarAgenda;

const inputBusqueda = document.getElementById('buscarPacienteInput');
const listaSugerencias = document.getElementById('sugerenciasPacientes');
const inputTel = document.getElementById('telefonoExpress'); // Referencia al nuevo campo de teléfono

inputBusqueda?.addEventListener('input', async (e) => {
    e.target.value = e.target.value.toUpperCase();
    const texto = e.target.value.trim();
    
    // Si borran el texto, limpiamos el ID seleccionado para evitar errores
    document.getElementById('idPacienteSeleccionado').value = '';
    
    if (texto.length < 2) { listaSugerencias.innerHTML = ''; return; }

    const { data: { user } } = await fisioNet.auth.getUser();
    const clinicaId = localStorage.getItem('id_clinica_activa');

    // 🚀 BÚSQUEDA HÍBRIDA: Ahora busca por nombre, apellidos O teléfono
    const { data: pacientes } = await fisioNet.from('pacientes_maestros')
        .select('id, nombre, apellido_paterno, apellido_materno, telefono')
        .or(`nombre.ilike.%${texto}%,apellido_paterno.ilike.%${texto}%,apellido_materno.ilike.%${texto}%,telefono.ilike.%${texto}%`)
        .eq('id_clinica', clinicaId)
        .limit(5);

    listaSugerencias.innerHTML = '';
    
    if (pacientes?.length > 0) {
        pacientes.forEach(p => {
            const div = document.createElement('div');
            div.className = 'sugerencia-item';
            // Le agregamos un iconito de teléfono para que identifiques rápido
            const telInfo = p.telefono ? ` <span style="color:#64748b; font-size:0.75rem;">(📞 ${p.telefono})</span>` : '';
            div.innerHTML = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''} ${telInfo}`.trim();
            
            div.onclick = () => {
                // CASO A: Paciente Existente
                inputBusqueda.value = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.trim();
                document.getElementById('idPacienteSeleccionado').value = p.id;
                
                // Autocompletamos el teléfono y le ponemos un fondito gris para que sepa que ya existe
                if(inputTel) {
                    inputTel.value = p.telefono || '';
                    inputTel.style.background = '#e2e8f0';
                }
                
                listaSugerencias.innerHTML = '';
            };
            listaSugerencias.appendChild(div);
        });
    } else {
        const divNuevo = document.createElement('div');
        divNuevo.className = 'sugerencia-item';
        divNuevo.style.background = '#f0fdf4';
        divNuevo.innerHTML = `<strong>+ Preparar prospecto: "${texto}"</strong>`;

        divNuevo.onclick = () => {
            // CASO B: Paciente Nuevo (Prospecto)
            // YA NO insertamos en base de datos aquí. Solo preparamos el modal.
            inputBusqueda.value = texto;
            document.getElementById('idPacienteSeleccionado').value = 'NUEVO_EXPRESS';
            listaSugerencias.innerHTML = '';
            
            // Le damos el foco al teléfono automáticamente
            if(inputTel) {
                inputTel.value = '';
                inputTel.style.background = '#ffffff';
                inputTel.focus(); 
            }
        };
        listaSugerencias.appendChild(divNuevo);
    }
});


// Variable global o de ámbito superior para bloquear doble clic
let guardandoCita = false;

document.getElementById('formNuevaCita')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 🔒 CANDADO: Evitar envíos dobles por clics seguidos
    if (guardandoCita) return;
    guardandoCita = true;

    const btnSubmit = e.target.querySelector('button[type="submit"]') || document.getElementById('btnGuardarCita');
    if (btnSubmit) btnSubmit.disabled = true;

    try {
        const { data: { user } } = await fisioNet.auth.getUser();

        const clinicaId = localStorage.getItem('id_clinica_activa');
        const idPaciente = document.getElementById('idPacienteSeleccionado').value;
        const nombreInput = document.getElementById('buscarPacienteInput').value.trim();
        const telefonoInput = document.getElementById('telefonoExpress')?.value.trim() || '';
        
        const modalidad = document.getElementById('modalidadCita').value; // 'CONSULTORIO' o 'DOMICILIO'
        const horaElegida = document.getElementById('horaCita').value;
        const fechaElegida = document.getElementById('fechaCita').value;

        if (!nombreInput) { alert("Escribe el nombre del paciente."); return; }
        if (!horaElegida) { alert("Selecciona un horario disponible."); return; }
        if (!clinicaId) { alert("Error: No hay sede activa seleccionada."); return; }

        // 🎯 Configuración multi-sede del profesional
        const { data: colab, error: errColab } = await fisioNet
            .from('colaboradores_clinica')
            .select('costo_consulta_base, costo_domicilio_base, horario_atencion, intervalo_cita')
            .eq('id_profesional', user.id)
            .eq('id_clinica', clinicaId)
            .maybeSingle();

        if (errColab || !colab) {
            alert("Error: No se encontró la configuración del profesional para esta sede.");
            return;
        }

        // 🕒 Validar horario laborable (MULTI-TURNO)
        if (colab.horario_atencion) {
            const horarios = typeof colab.horario_atencion === 'string' 
                ? JSON.parse(colab.horario_atencion)
                : colab.horario_atencion;
                
            const intervalo = parseInt(colab.intervalo_cita) || 30; 
            const fechaObj = new Date(fechaElegida + "T12:00:00");
            const diaSemana = fechaObj.getDay();
            
            const turnosHoy = horarios.filter(h => Number(h.dia) === diaSemana);

            if (!turnosHoy || turnosHoy.length === 0) {
                alert(`❌ DÍA NO LABORABLE: No tienes configurado horario de trabajo para este día en esta sede.`);
                return;
            }

            const [hE, mE] = horaElegida.split(':').map(Number);
            const minElegidos = (hE * 60) + mE;
            
            let esHorarioValido = false;
            let ultimaHoraSalida = "00:00";

            for (let turno of turnosHoy) {
                const [hI, mI] = turno.inicio.split(':').map(Number);
                const [hF, mF] = turno.fin.split(':').map(Number);

                const minApertura = (hI * 60) + mI;
                const minCierre = (hF * 60) + mF;

                const [hUlt, mUlt] = ultimaHoraSalida.split(':').map(Number);

                if (minCierre > ((hUlt * 60) + mUlt)) {
                    ultimaHoraSalida = turno.fin;
                }

                if (minElegidos >= minApertura && (minElegidos + intervalo) <= minCierre) {
                    esHorarioValido = true;
                    break; 
                }
            }

            if (!esHorarioValido) {
                alert(`❌ HORARIO NO DISPONIBLE: La hora seleccionada está fuera de tus turnos de trabajo. (Última hora de salida hoy: ${ultimaHoraSalida}).`);
                return;
            }
        }

        // 🏷️ Cálculo de Costos y Convenios
        const selectorConvenio = document.getElementById('selectConvenioPaciente');
        let idConvenio = null;
        let porcentaje = 0;

        if (selectorConvenio && selectorConvenio.value && selectorConvenio.value !== "") {
            idConvenio = selectorConvenio.value;
            if (selectorConvenio.selectedIndex >= 0) {
                porcentaje = parseFloat(selectorConvenio.options[selectorConvenio.selectedIndex].dataset.descuento) || 0;
            }
        }

        const costoConsultorio = colab.costo_consulta_base !== null ? Number(colab.costo_consulta_base) : 800;
        const costoDomicilio = colab.costo_domicilio_base !== null ? Number(colab.costo_domicilio_base) : 1200;
        const precioBase = (modalidad === 'CONSULTORIO') ? costoConsultorio : costoDomicilio;
        
        // 🔄 CORREGIDO: Descuento en porcentaje sobre precio base
        const descuentoCalculado = (precioBase * porcentaje) / 100;
        const precioFinal = precioBase - descuentoCalculado;

        // Función auxiliar para sincronización con Google Calendar
        const ejecutarSyncCalendar = async (citaObj, nombrePaciente, esExpress = false) => {
            const funcionSync = typeof sincronizarConGoogleCalendar === 'function' 
                ? sincronizarConGoogleCalendar
                : (typeof window.sincronizarConGoogleCalendar === 'function' ? window.sincronizarConGoogleCalendar : null);

            if (funcionSync) {
                await funcionSync(citaObj, nombrePaciente, esExpress);
            } else {
                console.warn("⚠️ La función sincronizarConGoogleCalendar no se encontró en el ámbito global.");
            }
        };

        // =========================================================
        // 🔀 BIFURCACIÓN: PACIENTE NUEVO VS EXISTENTE
        // =========================================================
        
        if (!idPaciente || idPaciente === 'NUEVO_EXPRESS') {
            // --- CASO B: PACIENTE NUEVO -> A SALA DE ESPERA ---
            if (!telefonoInput) {
                alert("⚠️ Al ser un paciente nuevo, es OBLIGATORIO pedirle su número de teléfono para guardarlo en la Sala de Espera.");
                document.getElementById('telefonoExpress')?.focus();
                return;
            }

            const resultado = typeof procesarNombreMexicano === 'function' 
                ? procesarNombreMexicano(nombreInput)
                : { nombre: nombreInput, paterno: '', materno: '' }; 

            const payloadSolicitud = {
                nombre: resultado.nombre,
                apellido_p: resultado.paterno,
                apellido_m: resultado.materno,
                telefono: telefonoInput,
                fecha_cita: fechaElegida,
                hora_cita: horaElegida,
                estado: 'CONFIRMADO',
                id_clinica_solicitada: clinicaId,
                id_profesional_solicitado: user.id
            };

            // Pasamos modalidad si agregas la columna a la tabla solicitudes_citas
            if (modalidad) {
                payloadSolicitud.modalidad = modalidad;
            }

            const { data: solData, error: errSol } = await fisioNet
                .from('solicitudes_citas')
                .insert(payloadSolicitud)
                .select()
                .single();

            if (errSol) {
                alert("Error al enviar a Sala de Espera: " + errSol.message);
                return;
            }

            try {
                const citaExpressSync = {
                    id: solData?.id,
                    es_prospecto: true,
                    fecha: fechaElegida,
                    hora_inicio_cita: horaElegida,
                    modalidad: modalidad, // Pasa 'DOMICILIO' o 'CONSULTORIO'
                    intervalo_cita: colab.intervalo_cita || 30
                };
                const nombreCompletoExpress = `${resultado.nombre} ${resultado.paterno} ${resultado.materno || ''}`.trim();
                await ejecutarSyncCalendar(citaExpressSync, nombreCompletoExpress, true);
            } catch (syncErr) {
                console.warn("⚠️ Advertencia en sync de Google Calendar:", syncErr);
            }

            if (typeof cargarSalaEspera === 'function') {
                await cargarSalaEspera();
            }

            alert("¡SOLICITUD EXPRÉS CREADA Y SINCRONIZADA! 📝✨");

        } else {
            // --- CASO A: PACIENTE EXISTENTE -> AGENDA DIRECTA ---
            const { data: datosCita, error } = await fisioNet.from('agenda_maestra').insert({
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
            }).select(`*, pacientes_maestros (nombre, apellido_paterno, apellido_materno)`).single();

            if (error) {
                alert("Error al agendar cita: " + error.message);
                return;
            }

            try {
                let nombrePacienteSync = nombreInput.trim();
                if (datosCita?.pacientes_maestros?.nombre) {
                    nombrePacienteSync = `${datosCita.pacientes_maestros.nombre} ${datosCita.pacientes_maestros.apellido_paterno || ''} ${datosCita.pacientes_maestros.apellido_materno || ''}`.trim();
                }

                const citaParaSync = {
                    ...datosCita,
                    fecha: fechaElegida,
                    hora_inicio_cita: horaElegida,
                    modalidad: modalidad,
                    intervalo_cita: colab.intervalo_cita || 30
                };

                await ejecutarSyncCalendar(citaParaSync, nombrePacienteSync, false);
            } catch (syncErr) {
                console.warn("⚠️ Advertencia en sync de Google Calendar:", syncErr);
            }

            alert("¡CITA AGENDADA CON ÉXITO EN FISIOCID Y SINCRONIZADA! 📅✨");
        }

        // Limpieza de Modal y Formularios
        const modalCita = document.getElementById('modalCita');
        if (modalCita) modalCita.style.display = 'none';

        document.getElementById('formNuevaCita').reset();
        const inputIdPac = document.getElementById('idPacienteSeleccionado');
        if (inputIdPac) inputIdPac.value = '';
        
        // Actualización de Paneles
        if (typeof cargarAgenda === 'function') await cargarAgenda('semana');
        if (typeof cargarSalaEspera === 'function') await cargarSalaEspera();
        if (typeof cargarEstadisticas === 'function') await cargarEstadisticas();

    } catch (errGeneral) {
        console.error("❌ Error crítico procesando cita:", errGeneral);
        alert("Ocurrió un error inesperado al guardar la cita.");
    } finally {
        guardandoCita = false;
        if (btnSubmit) btnSubmit.disabled = false;
    }
});

document.getElementById('fechaCita')?.addEventListener('change', () => {
    verificarDisponibilidadReal();
});

document.querySelectorAll('.cerrar-modal').forEach(boton => {
    boton.addEventListener('click', () => { document.getElementById('modalCita').style.display = 'none'; });
});

// 🚪 CONTROL DE CIERRE DE SESIÓN BLINDADO FISIOCID
const btnCerrar = document.getElementById('btnCerrarSesion');

if (btnCerrar) {
    // 1. Clonamos el botón para LIMPIAR cualquier listener duplicado colgado en memoria
    const nuevoBtn = btnCerrar.cloneNode(true);
    btnCerrar.parentNode.replaceChild(nuevoBtn, btnCerrar);

    // 2. Escuchador único de evento
    nuevoBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Frena en seco cualquier otra función colgada al clic

        const deseaSalir = confirm("¿Deseas salir de FisioCid?");

        if (deseaSalir) {
            //console.log("👋 Cerrando sesión de FisioCid...");
            try {
                await fisioNet.auth.signOut();
            } catch (err) {
                console.error("Error al cerrar sesión en Supabase:", err);
            }
            localStorage.clear();
            sessionStorage.clear();
            window.location.replace("login.html"); // Reemplaza por 'login.html' si así se llama tu archivo
        } else {
            //console.log("🛑 Cierre de sesión cancelado. Permanece en el sistema.");
        }
    });
}

document.getElementById('btnAbrirConfig')?.addEventListener('click', async () => {
    const modal = document.getElementById('modalConfigInicial');
    const { data: { user } } = await fisioNet.auth.getUser();
    const clinicaActiva = localStorage.getItem('id_clinica_activa');

    if (!user || !clinicaActiva) return;

    const { data: colab } = await fisioNet
        .from('colaboradores_clinica')
        .select('costo_consulta_base, costo_domicilio_base, horario_atencion, intervalo_cita')
        .eq('id_profesional', user.id)
        .eq('id_clinica', clinicaActiva)
        .maybeSingle();

    if (colab) {
        if (document.getElementById('baseConsultorio')) {
            document.getElementById('baseConsultorio').value = colab.costo_consulta_base ?? '';
        }
        if (document.getElementById('baseDomicilio')) {
            document.getElementById('baseDomicilio').value = colab.costo_domicilio_base ?? '';
        }
        if (document.getElementById('intervaloCita')) {
            document.getElementById('intervaloCita').value = colab.intervalo_cita || 30;
        }
        if (colab.horario_atencion) {
            cargarHorariosEnModal(colab.horario_atencion);
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

// ============================================================================
// 📬 CARGAR SALA DE ESPERA / SOLICITUDES (BLINDADA POR SEDE Y ROL)
// ============================================================================
async function cargarSalaEspera() {
    const lista = document.getElementById('listaEsperaReferidos');
    const badge = document.getElementById('badgeSolicitudes');
    if (!lista) return;

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        if (!user) return;

        const clinicaId = localStorage.getItem('id_clinica_activa');
        if (!clinicaId) {
            lista.innerHTML = `<p style="text-align: center; color: #94a3b8; font-size: 0.8rem; padding: 20px;">⚠️ Selecciona una clínica activa.</p>`;
            return;
        }

        const miRolSistema = (localStorage.getItem('rol_actual') || 'STAFF_CLINICO').toUpperCase();
        const esPersonalAdministrativo = ['ADMIN_SISTEMA', 'ADMINISTRATIVO'].includes(miRolSistema);

        // 🛡️ Consulta blindada por clínica activa
        let queryCitas = fisioNet
            .from('solicitudes_citas')
            .select('*')
            .eq('estado', 'PENDIENTE')
            .eq('id_clinica_solicitada', clinicaId); // 🔒 Aislamiento por sede

        // Si es terapeuta de planta (STAFF_CLINICO / OPERATIVO), solo ve sus citas solicitadas
        if (!esPersonalAdministrativo) {
            queryCitas = queryCitas.eq('id_profesional_solicitado', user.id); // 🔒 Aislamiento por doctor
        }

        const { data: solicitudes, error } = await queryCitas.order('creado_el', { ascending: false });

        if (error) {
            console.error("❌ ERROR DE SUPABASE EN SALA DE ESPERA:", error);
            return;
        }

        if (badge) badge.innerText = solicitudes?.length || 0;
        
        if (!solicitudes || solicitudes.length === 0) {
            lista.innerHTML = `<p style="text-align: center; color: #94a3b8; font-size: 0.8rem; padding: 20px;">Sin solicitudes nuevas en esta sede.</p>`;
            return;
        }

        lista.innerHTML = solicitudes.map(sol => {
            const nombreFull = `${sol.nombre} ${sol.apellido_p} ${sol.apellido_m || ''}`.trim().toUpperCase();
            const horaFormateada = sol.hora_cita ? sol.hora_cita.substring(0, 5) : '--:--';
            
            return `
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); border-left: 5px solid #10b981 !important;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="text-align: left;">
                        <span style="background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 5px; font-size: 0.6rem; font-weight: 800;">📅 SOLICITUD SEDE</span>
                        <strong style="display: block; font-size: 0.85rem; color: #1e293b; margin-top: 5px;">${nombreFull}</strong>
                        <small style="color: #64748b;">📅 ${sol.fecha_cita} ⏰ ${horaFormateada}</small>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="confirmarHorarioEnSala('${sol.id}', 'APROBAR')" style="background: #10b981; color: white; border: none; padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 0.7rem;">✅ Aprobar</button>
                        <button onclick="procesarSolicitud('${sol.id}', 'RECHAZAR')" style="background: #ef4444; color: white; border: none; padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 0.7rem;" title="Rechazar">🗑️</button>
                    </div>
                </div>
                <div style="margin-top: 8px; font-size: 0.7rem; color: #2563eb; font-weight: bold; text-align: left;">
                    📞 ${sol.telefono || 'Sin teléfono'} 
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        console.error("❌ Error al cargar sala de espera:", err);
    }
}

const cargarEstadisticas = async () => {
    const clinicaId = localStorage.getItem('id_clinica_activa'); 
    if (!clinicaId) return;

    const { data: { user } } = await fisioNet.auth.getUser();
    if (!user) return;

    const hoy = typeof obtenerFechaLocal === 'function' ? obtenerFechaLocal() : new Date().toISOString().split('T')[0];
    
    try {
        // 1. Pacientes asociados a la sede activa
        const { count: totalPacientes } = await fisioNet
            .from('vinculos_clinicos')
            .select('*', { count: 'exact', head: true })
            .eq('id_clinica', clinicaId);

        // 2. Citas programadas para hoy en la sede activa
        const { count: citasHoy } = await fisioNet
            .from('agenda_maestra')
            .select('*', { count: 'exact', head: true })
            .eq('id_clinica', clinicaId)
            .eq('fecha', hoy)
            .neq('estado', 'CANCELADO');

        // 3. Inventario de insumos de la sede
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

        // Actualización de la interfaz (UI)
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
window.procesarSolicitud = async (idSolicitud, accion) => {
   
    // 🛡️ 1. Validar sesión activa antes de hacer nada
    const { data: { user }, error: authError } = await fisioNet.auth.getUser();
    if (authError || !user) {
        alert("⚠️ Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.");
        location.reload();
        return;
    }

    // 🛡️ 2. Validar clínica activa
    const clinicaId = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');
    if (!clinicaId) {
        alert("⚠️ Error: No hay una clínica activa seleccionada en esta sesión.");
        return;
    }

    // 🛡️ 3. Manejo de rechazo
    if (accion === 'RECHAZAR') {
        if (!confirm("¿Deseas descartar esta solicitud de forma definitiva?")) return;
        await fisioNet.from('solicitudes_citas').update({ estado: 'RECHAZADO' }).eq('id', idSolicitud);
        cargarSalaEspera();
        return;
    }

    // 🔍 Obtener datos de la solicitud
    const { data: sol } = await fisioNet.from('solicitudes_citas').select('*').eq('id', idSolicitud).single();
    if (!sol) {
        alert("⚠️ No se encontró la información de esta solicitud.");
        return;
    }
    
    // ⚠️ NOTA: Eliminamos las redeclaraciones de 'clinicaId' y 'user' porque ya viven en el scope superior de la función.

    const nomS = sol.nombre.toUpperCase().trim();
    const apePS = sol.apellido_p.toUpperCase().trim();
    const curpS = sol.curp ? sol.curp.toUpperCase().trim() : null;
    const correoS = sol.email ? sol.email.toLowerCase().trim() : null;

const raizN = nomS.substring(0, 4);
    const raizA = apePS.substring(0, 4);
    const raizMaterno = sol.apellido_m ? sol.apellido_m.toUpperCase().trim().substring(0, 4) : '';

    // 🚀 MEJORA: Buscamos el apellido en el PATERNO o en el MATERNO
    let filtrosOr = `telefono.eq.${sol.telefono},and(nombre.ilike.%${raizN}%,apellido_paterno.ilike.%${raizA}%),and(nombre.ilike.%${raizN}%,apellido_materno.ilike.%${raizA}%)`;
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
                // También verificamos si el apellido que nos dieron por teléfono coincide con su materno real
                const coincideConMaterno = apMDB.includes(raizA); 
                const checkNombre = nomDB.includes(raizN);

                // Si el nombre coincide, y el apellido dado coincide ya sea con el paterno o el materno
                return checkNombre && (checkPaterno || coincideConMaterno);
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

    // 🚀 1. Insertamos en agenda maestra y pedimos de vuelta el registro creado (.select().single())
    const { data: nuevaCita, error: eAg } = await fisioNet.from('agenda_maestra').insert({
        id_paciente: idPacienteFinal,
        id_profesional: user.id,
        id_clinica: clinicaId,
        fecha: sol.fecha_cita,
        hora_inicio_cita: sol.hora_cita,
        modalidad: 'CONSULTORIO',
        estatus: 'PENDIENTE',
        estado: 'ACTIVO'
    }).select().single();

    if (!eAg && nuevaCita) {
        // Actualizamos la solicitud a APROBADO en la sala de espera
        await fisioNet.from('solicitudes_citas').update({ estado: 'APROBADO' }).eq('id', idSolicitud);
        
        // 🚀 2. Sincronización automática con Google Calendar / iPhone
        try {
            const nombreCompleto = `${sol.nombre} ${sol.apellido_p} ${sol.apellido_m || ''}`;
            await sincronizarConGoogleCalendar(nuevaCita, nombreCompleto.trim());
        } catch (syncErr) {
            console.warn("⚠️ Advertencia al sincronizar con Google Calendar:", syncErr);
        }

        alert("✅ PROCESO COMPLETADO EXITOSAMENTE Y SINCRONIZADO");
        cargarSalaEspera();
        if (typeof cargarAgenda === 'function') cargarAgenda('semana');
    } else {
        alert("Error al insertar en agenda: " + (eAg?.message || 'Error desconocido'));
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

    const { data: { user } } = await fisioNet.auth.getUser();
    const clinicaActiva = localStorage.getItem('id_clinica_activa');

    let costoConsultorio = parseFloat(document.getElementById('baseConsultorio')?.value) || 800;
    let costoDomicilio = parseFloat(document.getElementById('baseDomicilio')?.value) || 1200;

    if (user && clinicaActiva) {
        // 🎯 LEER DIRECTAMENTE DE LA RELACIÓN EN LA SEDE ACTIVA
        const { data: colab } = await fisioNet
            .from('colaboradores_clinica')
            .select('costo_consulta_base, costo_domicilio_base')
            .eq('id_profesional', user.id)
            .eq('id_clinica', clinicaActiva)
            .maybeSingle();

        if (colab) {
            if (colab.costo_consulta_base !== null && colab.costo_consulta_base !== undefined) {
                costoConsultorio = Number(colab.costo_consulta_base);
            }
            if (colab.costo_domicilio_base !== null && colab.costo_domicilio_base !== undefined) {
                costoDomicilio = Number(colab.costo_domicilio_base);
            }
        }
    }

    let precioBaseFinal = (modalidad === 'CONSULTORIO') ? costoConsultorio : costoDomicilio;

    let porcentajeDescuento = 0;
    if (selector && selector.selectedIndex >= 0) {
        const opcionSeleccionada = selector.options[selector.selectedIndex];
        if (opcionSeleccionada && opcionSeleccionada.dataset.descuento) {
            porcentajeDescuento = parseFloat(opcionSeleccionada.dataset.descuento) || 0;
        }
    }

   // ✅ Código correcto:
const descuentoCalculado = (precioBase * porcentaje) / 100;
const precioFinal = precioBase - descuentoCalculado;

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
        // 🚀 CONSULTAMOS EN PARALELO Y FILTRAMOS CITAS CANCELADAS EN AGENDA_MAESTRA
        const [ocupadasRes, pendientesRes, confirmadasRes, colabRes] = await Promise.all([
            fisioNet.from('agenda_maestra')
                .select('hora_inicio_cita')
                .eq('fecha', fechaElegida)
                .eq('id_clinica', clinicaId)
                .eq('estado', 'ACTIVO')
                .neq('estatus', 'CANCELADO'), // 👈 Evita bloqueo por citas canceladas
            fisioNet.from('solicitudes_citas')
                .select('hora_cita')
                .eq('fecha_cita', fechaElegida)
                .eq('id_clinica_solicitada', clinicaId)
                .eq('id_profesional_solicitado', user.id)
                .eq('estado', 'PENDIENTE'),
            fisioNet.from('solicitudes_citas')
                .select('hora_cita')
                .eq('fecha_cita', fechaElegida)
                .eq('id_clinica_solicitada', clinicaId)
                .eq('id_profesional_solicitado', user.id)
                .eq('estado', 'CONFIRMADO'),
            fisioNet.from('colaboradores_clinica')
                .select('horario_atencion, intervalo_cita')
                .eq('id_profesional', user.id)
                .eq('id_clinica', clinicaId)
                .maybeSingle()
        ]);

        const ocupadasCitas = ocupadasRes.data || [];
        const ocupadasPendientes = pendientesRes.data || [];
        const ocupadasConfirmadas = confirmadasRes.data || [];
        const colab = colabRes.data;

        if (!colab?.horario_atencion) {
            contenedor.innerHTML = '<p style="color:#ef4444; text-align:center; width:100%;">Configura tus horarios para esta sede primero.</p>';
            return;
        }

        const config = typeof colab.horario_atencion === 'string' 
            ? JSON.parse(colab.horario_atencion) 
            : colab.horario_atencion;

        const intervalo = parseInt(colab.intervalo_cita) || 30; 
        
        // 🗓️ Parseo seguro del día de la semana sin problemas de zona horaria UTC
        const [pAño, pMes, pDia] = fechaElegida.split('-').map(Number);
        const diaNum = new Date(pAño, pMes - 1, pDia).getDay();

        const bloquesHoy = config.filter(h => Number(h.dia) === diaNum);

        const aMin = (h) => h.split(':').reduce((hrs, min) => (hrs * 60) + +min);
        const minToH = (m) => `${Math.floor(m/60).toString().padStart(2,'0')}:${(m%60).toString().padStart(2,'0')}`;

        let espaciosDisponibles = [];

        // 🕒 Lógica para detectar la hora local y ocultar lo pasado
        const ahora = new Date();
        const año = ahora.getFullYear();
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');
        const diaLocal = String(ahora.getDate()).padStart(2, '0');
        const fechaLocalHoy = `${año}-${mes}-${diaLocal}`;
        const esHoy = (fechaElegida === fechaLocalHoy);
        const minActuales = (ahora.getHours() * 60) + ahora.getMinutes();

        bloquesHoy.forEach(bloque => {
            let inicio = aMin(bloque.inicio);
            let fin = aMin(bloque.fin);

            while (inicio + intervalo <= fin) {
                const horaGen = minToH(inicio);
                
                // 🔍 Validamos si la hora está ocupada en CUALQUIERA de las 3 fuentes (con safe checks)
                const estaEnAgenda = ocupadasCitas.some(o => o.hora_inicio_cita && o.hora_inicio_cita.startsWith(horaGen));
                const estaPendiente = ocupadasPendientes.some(s => s.hora_cita && s.hora_cita.startsWith(horaGen));
                const estaConfirmada = ocupadasConfirmadas.some(s => s.hora_cita && s.hora_cita.startsWith(horaGen));
                
                const estaOcupada = estaEnAgenda || estaPendiente || estaConfirmada;
                
                // 🚀 Filtro de horas pasadas el día de hoy u ocupadas
                if (esHoy && inicio <= minActuales) {
                    // Hora expirada
                } else if (!estaOcupada) {
                    espaciosDisponibles.push(horaGen);
                }
                inicio += intervalo; 
            }
        });

        contenedor.innerHTML = ''; 

        if (espaciosDisponibles.length === 0) {
            contenedor.innerHTML = '<p style="color:#64748b; text-align:center; width:100%;">Sin disponibilidad para este día.</p>';
            return;
        }

        espaciosDisponibles.forEach(hora => {
            const pastilla = document.createElement('div');
            const estaSeleccionada = inputHoraOculto.value === hora;
            
            pastilla.className = `pastilla-hora disponible ${estaSeleccionada ? 'seleccionada' : ''}`; 
            pastilla.innerText = hora;
            pastilla.onclick = () => {
                document.querySelectorAll('.pastilla-hora').forEach(p => p.classList.remove('seleccionada'));
                pastilla.classList.add('seleccionada');
                inputHoraOculto.value = hora; 
            };
            contenedor.appendChild(pastilla);
        });

    } catch (err) {
        console.error("Error al verificar disponibilidad:", err);
        contenedor.innerHTML = '<p style="color:#ef4444; text-align:center; width:100%;">Error de conexión al cargar horarios.</p>';
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
// ✉️ ENVIAR SOLICITUD DE COLABORACIÓN (CORREGIDO)
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

        // 2. Obtener datos del EMISOR (Quien envía la invitación - o sea, TÚ)
        const { data: perfilEmisor } = await fisioNet
            .from('perfiles_profesionales')
            .select('nombre_completo, especialidad')
            .eq('id', user.id)
            .maybeSingle();

        // 3. Obtener datos del RECEPTOR (Quien recibe la invitación)
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

        // 5. Preparar datos reales del EMISOR (Para que el otro vea quién se lo manda)
        const nombreEmisor = perfilEmisor?.nombre_completo || user.user_metadata?.full_name || 'COLABORADOR PROFESIONAL';
        const especialidadEmisor = (perfilEmisor?.especialidad || 'ESPECIALISTA').toUpperCase().trim();

        // 6. Insertar en red_colaboracion
        const { error } = await fisioNet
            .from('red_colaboracion')
            .insert([{
                id_doctor_emisor: user.id,
                id_doctor_receptor: idReceptor,
                id_usuario_socio: idReceptor, // Opcional, pero lo mantenemos por si lo usas en otro lado
                nombre_entidad: nombreEmisor, // 👈 CORRECCIÓN: Guardamos TU nombre (el emisor)
                contacto_principal: nombreEmisor, // 👈 CORRECCIÓN: Tu nombre como contacto
                tipo_entidad: especialidadEmisor, // 👈 CORRECCIÓN: Tu especialidad
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
                .eq('id_clinica', clinicaId) // 🔒 Filtro de sede activa añadido
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
    <button onclick="confirmarHorarioEnSala('${sol.id}', 'APROBAR')" style="background: #10b981; color: white; border: none; padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 0.7rem;">✅</button>
    <button onclick="confirmarHorarioEnSala('${sol.id}', 'RECHAZAR')" style="background: #ef4444; color: white; border: none; padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 0.7rem;">🗑️</button>
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

// Exponer la función al objeto window para que los onclick del HTML la reconozcan
window.mostrarSeccion = function (seccionId) {
    const agenda = document.getElementById('agenda-container');
    const comunidad = document.getElementById('seccionComunidad');

    // Ocultar ambas secciones
    if (agenda) agenda.style.setProperty('display', 'none', 'important');
    if (comunidad) comunidad.style.setProperty('display', 'none', 'important');

    // Mostrar únicamente la sección seleccionada
    const activa = document.getElementById(seccionId);
    if (activa) {
        activa.style.setProperty('display', 'block', 'important');
    }

    // Acciones específicas al activar Comunidad
    if (seccionId === 'seccionComunidad') {
        if (typeof cargarSolicitudesRedPendientes === 'function') {
            cargarSolicitudesRedPendientes();
        }
    }
    
    // Acciones específicas al activar Agenda
    if (seccionId === 'agenda-container') {
        if (typeof cargarAgenda === 'function') {
            cargarAgenda('semana');
        }
    }
};

async function buscarColegasFisioCid() {
    const query = document.getElementById('inputBusquedaColegas').value.trim();
    const filtroEspecialidad = document.getElementById('filtroEspecialidad').value;
    const grid = document.getElementById('gridResultadosColegas');

    if (!grid) return;

    // 🔒 CANDADO DE SEGURIDAD FISIOCID: No buscar si no hay al menos 3 letras o un filtro activo
    if (query.length < 3 && (filtroEspecialidad === 'ALL' || filtroEspecialidad === 'Todas las especialidades')) {
        grid.innerHTML = `
            <div style="text-align:center; width:100%; grid-column:1/-1; padding: 30px; background: #f8fafc; border-radius: 12px; border: 2px dashed #cbd5e1;">
                <i class="fas fa-search" style="font-size: 2rem; color: #94a3b8; margin-bottom: 12px;"></i>
                <p style="color:#475569; font-weight: 600; margin: 0; font-size: 0.9rem;">
                    Usa el buscador de arriba.<br>
                    <small style="color: #64748b;">Escribe al menos 3 letras del nombre de tu colega o selecciona una especialidad para encontrarlo en la red.</small>
                </p>
            </div>`;
        return; // Frenamos la consulta a la base de datos
    }

    grid.innerHTML = '<div style="text-align:center; width:100%; grid-column:1/-1; color: var(--primary);"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Buscando colegas...</div>';

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

        // Limitamos a 20 resultados máximos para no saturar la pantalla
        const { data: colegas, error } = await consulta.limit(20);

        if (error) throw error;

        if (!colegas || colegas.length === 0) {
            grid.innerHTML = `<div style="text-align:center; grid-column:1/-1; padding: 20px;">
                <p style="color:#64748b; font-weight:bold;">No se encontró a nadie con ese nombre o especialidad. 🕵️‍♂️</p>
                <small>Intenta buscando solo el primer nombre o apellido.</small>
            </div>`;
            return;
        }

        grid.innerHTML = ''; 

        colegas.forEach(c => {
            const fotoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.nombre_completo)}&background=random`;
            
            const card = document.createElement('div');
            card.className = 'card-colega p-3 bg-white border rounded-3 shadow-sm mb-2';
            card.innerHTML = `
                <div class="d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-3">
                        <img src="${fotoUrl}" class="rounded-circle" width="45" height="45" alt="Avatar">
                        <div>
                            <h6 class="mb-0 fw-bold text-dark">${c.nombre_completo.toUpperCase()}</h6>
                            <small class="text-muted"><i class="fas fa-user-md me-1"></i>${c.especialidad || 'ESPECIALISTA'}</small>
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-primary fw-bold" onclick="enviarSolicitudColaboracion('${c.id}')">
                        <i class="fas fa-user-plus me-1"></i> Invitar
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

    } catch (err) {
        console.error("❌ Error al buscar colegas:", err);
        grid.innerHTML = `<div class="text-danger text-center p-3">Error en la búsqueda: ${err.message}</div>`;
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
   
const { data: { session } } = await fisioNet.auth.getSession();
    const idUsuarioActivo = session?.user?.id || localStorage.getItem('id_usuario_activo');

    if (idUsuarioActivo) {
        // 🔒 Validar estado del perfil profesional
        const estadoPago = await validarEstadoPagoSede(idUsuarioActivo);
        
        if (!estadoPago.pagado) {
            bloquearDashboardPorFaltaDePago(estadoPago);
            return; // 🛑 Detiene la ejecución del dashboard de FisioCid App
        }
    }
    try {
        // 1. Intento principal con getSession()
        let { data: { session }, error: sessionError } = await fisioNet.auth.getSession();

        // 2. 🛡️ RESCATE ESPECIAL PARA PWA EN iOS: Si vino nulo, forzamos recuperar la sesión guardada
        if (!session) {
            console.warn("⚠️ PWA iOS: getSession() vino nulo. Buscando sesión de respaldo...");
            const localSession = await fisioNet.auth.getUser();
            if (localSession?.data?.user) {
                // Forzamos refresh del token de Supabase
                const { data: refreshed } = await fisioNet.auth.refreshSession();
                session = refreshed.session;
            }
        }

        // 3. Si de plano NO hay usuario en ningún lado, entonces sí redirigimos
        if (!session && !localStorage.getItem('sb-wboknacojtrfehlwswhh-auth-token')) {
            console.warn("Sin credenciales en PWA. Redirigiendo a login.html...");
            window.location.replace('login.html');
            return;
        }

        // Si el objeto session sigue nulo por lag de red pero el token existía, jalamos el usuario de getUser()
        const user = session?.user || (await fisioNet.auth.getUser())?.data?.user;

        if (!user) {
            window.location.replace('login.html');
            return;
        }

        // ==========================================
        // A PARTIR DE AQUÍ SIGUE TU CÓDIGO NORMAL
        // ==========================================
        await cargarSedes();
        iniciarCanalSalaEspera();

        const { data: perfilProf } = await fisioNet
            .from('perfiles_profesionales')
            .select('nombre_completo, insignia_especial')
            .eq('id', user.id)
            .maybeSingle();

        const nombreReal = perfilProf?.nombre_completo || user.user_metadata?.full_name || "COLABORADOR ACTIVO";
        
        localStorage.setItem('nombre_completo', nombreReal);
        localStorage.setItem('usuarioId', user.id);

        const txtSaludo = document.getElementById('txtSaludo');
        if (txtSaludo) txtSaludo.innerText = `BIENVENIDO, ${nombreReal.toUpperCase()}`;
        // ✨ LÓGICA DE LA INSIGNIA DORADA VIP
        const contenedorInsignia = document.getElementById('contenedorInsigniaEspecial');
        if (contenedorInsignia) {
            if (perfilProf && perfilProf.insignia_especial) {
                contenedorInsignia.innerHTML = `
                    <span style="background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%); color: white; padding: 4px 14px; border-radius: 20px; font-size: 0.7rem; font-weight: 900; letter-spacing: 1px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.4); border: 1px solid #fef08a; text-transform: uppercase;">
                        <i class="fas fa-crown" style="color: #fef08a; font-size: 0.8rem;"></i> ${perfilProf.insignia_especial}
                    </span>
                `;
                contenedorInsignia.style.display = 'block';
            } else {
                contenedorInsignia.style.display = 'none';
            }
        }

        // 4. Asegurar la clínica activa en caso de que esté vacía en memoria
        let clinicaActiva = localStorage.getItem('id_clinica_activa');
        if (!clinicaActiva && typeof asegurarClinicaActiva === 'function') {
            clinicaActiva = await asegurarClinicaActiva();
        }

        // Aplicar UI e Identidad Visual de la clínica seleccionada
        await aplicarIdentidadVisual(); 
        await actualizarInterfazSede(); 

        if (clinicaActiva) {
            await obtenerYGuardarRolOperativo(user.id, clinicaActiva);
        }

        renderizarBotonesPorRol();

        const inputFecha = document.getElementById('filtroFechaAgenda');
        if (inputFecha) inputFecha.value = obtenerFechaLocal();

        // Cargar los módulos secuenciales
        await cargarAgenda('semana');
        await cargarEstadisticas();
        await cargarMonitorBoxes(); 
        await cargarSolicitudesRecibidas();
        await cargarSolicitudesRedPendientes();
        await inicializarFormularioConvenio(); 

        if (typeof renderizarTablaEquipo === 'function') await renderizarTablaEquipo();
        if (typeof renderizarTablaAlianzas === 'function') await renderizarTablaAlianzas(); 
        
        await verificarInvitacionesPendientes(); 
        await comprobarConfiguracionInicialRequerida();

    } catch (err) {
        console.error("Error crítico al inicializar el Dashboard:", err);
    }
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

    // 1. Recuperamos el rol operativo de la sesión
    const miRol = localStorage.getItem('rol_actual') || 'STAFF_CLINICO'; 
    const esAdmin = (miRol === 'ADMIN_SISTEMA' || miRol === 'DUEÑO');
    
    // Control de permisos para equipo
    const puedeGestionarEquipo = (esAdmin || miRol === 'ADMINISTRATIVO');
    
    // ==========================================
    // CONTROL DEL NAVBAR SUPERIOR
    // ==========================================
    const btnEquipo = document.getElementById('btnMiEquipo');
    const btnPrecios = document.getElementById('btnAbrirConfig');
    const btnIdentidad = document.getElementById('btnIdentidadVisual');

    if (btnEquipo) btnEquipo.style.display = puedeGestionarEquipo ? 'flex' : 'none';
    if (btnPrecios) btnPrecios.style.display = esAdmin ? 'flex' : 'none';
    if (btnIdentidad) btnIdentidad.style.display = esAdmin ? 'flex' : 'none';

    // ==========================================
    // 2. CATÁLOGO MAESTRO DE BOTONES
    // ==========================================
    const catalogoBotones = {
        recetas:         `<button class="btn-action"  onclick="window.location.href='portal-recetas.html'">📋 Crear Receta</button>`,
        agregarPaciente: `<button class="btn-action" onclick="window.location.href='nuevo-paciente.html'">📝 Agregar Paciente</button>`,
        listaPacientes:  `<button class="btn-action" onclick="window.location.href='lista-pacientes.html'">👥 Lista de Pacientes</button>`,
        inventario:      `<button class="btn-action" onclick="window.location.href='inventario.html'">📦 Inventario</button>`,
        nuevoEstudio:    `<button class="btn-action" onclick="window.location.href='portal-gabinete.html'">📡 Nuevo Estudio</button>`,
        laboratorio:     `<button class="btn-action" onclick="lanzarLaboratorioGeneral()">🧪 Nuevo Laboratorio</button>`,
        finanzas:        `<button class="btn-action" onclick="window.location.href='finanzas.html'">📊 Control de Caja</button>`
    };

    // ==========================================
    // 3. ASIGNACIÓN EN CALIENTE CON BOTÓN DE RECETAS
    // ==========================================
    let botonesAJS = [];

    switch(miRol) {
        case 'ADMIN_SISTEMA':
        case 'DUEÑO':
            botonesAJS = [
                catalogoBotones.recetas,
                catalogoBotones.agregarPaciente,
                catalogoBotones.listaPacientes,
                catalogoBotones.inventario,
                catalogoBotones.nuevoEstudio,
                catalogoBotones.laboratorio,
                catalogoBotones.finanzas
            ];
            break;

        case 'ADMINISTRATIVO':
            botonesAJS = [
                catalogoBotones.recetas,
                catalogoBotones.agregarPaciente, 
                catalogoBotones.listaPacientes, 
                catalogoBotones.finanzas
            ];
            break;

        case 'STAFF_CLINICO':
            botonesAJS = [
                catalogoBotones.recetas,
                catalogoBotones.listaPacientes, 
                catalogoBotones.nuevoEstudio, 
                catalogoBotones.laboratorio
            ];
            break;

        case 'OPERATIVO':
            botonesAJS = [
                catalogoBotones.recetas
            ]; 
            break;

        default:
            botonesAJS = [
                catalogoBotones.recetas,
                catalogoBotones.listaPacientes
            ];
            break;
    }

    contenedor.innerHTML = botonesAJS.join('');
}

// Función para calcular edad desde fecha de nacimiento
function calcularEdadQuick(fechaNac) {
    if (!fechaNac) return 'N/E';
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad > 0 ? `${edad} años` : 'Menor a 1 año';
}

function abrirBuscadorExpressPacientes(elementoBoton) {
    let popover = document.getElementById('popoverQuickSearch');
    
    if (!popover) {
        popover = document.createElement('div');
        popover.id = 'popoverQuickSearch';
        popover.className = 'quick-popover-card';
        document.body.appendChild(popover);
    }

    popover.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 0.85rem; font-weight: 800; color: #0f766e; text-transform: uppercase; letter-spacing: 0.5px;">⚡ Búsqueda Express</span>
            <button onclick="cerrarBuscadorExpress()" style="background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #94a3b8;">✕</button>
        </div>
        
        <input type="text" id="inputQuickPaciente" placeholder="Expediente, Nombre, CURP o Teléfono..." 
               style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.85rem; font-weight: 600; box-sizing: border-box; outline: none; margin-bottom: 10px;">
        
        <div id="resultadosQuickPaciente" style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
            <small style="color: #94a3b8; text-align: center; display: block; padding: 10px 0;">Escribe para buscar expediente en sede...</small>
        </div>

        <div id="panelAbanicoAcciones" class="abanico-acciones">
            <div style="grid-column: span 2; margin-bottom: 6px;">
                <p id="lblPacienteSeleccionado" style="font-size: 0.8rem; font-weight: 800; color: #0f766e; margin: 0; text-transform: uppercase;"></p>
                <p id="lblDetallesPaciente" style="font-size: 0.72rem; color: #64748b; margin: 2px 0 0 0; font-weight: 600;"></p>
            </div>
            
            <button class="btn-abanico" onclick="ejecutarAccionExpress('receta')">📋 Crear Receta</button>
            <button class="btn-abanico" onclick="ejecutarAccionExpress('nota')">📝 Crear Nota</button>
            <button class="btn-abanico" onclick="ejecutarAccionExpress('imagen')">📡 Estudio de Imagen</button>
            <button class="btn-abanico" onclick="ejecutarAccionExpress('laboratorio')">🧪 Estudio Laboratorio</button>
            <button class="btn-abanico" onclick="ejecutarAccionExpress('historial')" style="grid-column: span 2; background: #f0fdf4; border-color: #86efac; color: #166534; font-weight: 800;">📁 Ver Historial Completo</button>
        </div>
    `;

    // POSICIONAMIENTO CONTEXTUAL
    if (elementoBoton) {
        const rect = elementoBoton.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset;
        const scrollX = window.scrollX || window.pageXOffset;

        let topPos = rect.top + scrollY - 240; 
        if (topPos < scrollY + 10) {
            topPos = rect.bottom + scrollY + 10;
        }

        let leftPos = rect.left + scrollX + (rect.width / 2) - 190;
        if (leftPos < 10) leftPos = 10;
        if (leftPos + 390 > window.innerWidth) leftPos = window.innerWidth - 400;

        popover.style.top = `${topPos}px`;
        popover.style.left = `${leftPos}px`;
    }

    setTimeout(() => popover.classList.add('activo'), 10);
    const input = document.getElementById('inputQuickPaciente');
    if (input) input.focus();

    // LISTENER DE BÚSQUEDA CORREGIDO (CONSULTA DESDE PACIENTES_MAESTROS CON INNER JOIN A EXPEDIENTES_CLINICOS)
    input.addEventListener('input', async (e) => {
        const texto = e.target.value.trim().toUpperCase();
        const contenedorRes = document.getElementById('resultadosQuickPaciente');
        
        const idClinicaActiva = localStorage.getItem('id_clinica_activa') || localStorage.getItem('id_clinica');

        const panelAbanico = document.getElementById('panelAbanicoAcciones');
        if (panelAbanico) panelAbanico.classList.remove('desplegado');

        if (texto.length < 2) {
            contenedorRes.innerHTML = `<small style="color: #94a3b8; text-align: center; display: block; padding: 10px 0;">Escribe expediente, nombre, CURP o teléfono...</small>`;
            return;
        }

        contenedorRes.innerHTML = `<small style="color: #0f766e; text-align: center; display: block; padding: 10px 0;">Buscando expedientes en sede...</small>`;

        try {
            // Buscamos en pacientes_maestros garantizando que exista en expedientes_clinicos de la sede activa
            const { data: pacientes, error } = await fisioNet
                .from('pacientes_maestros')
                .select(`
                    id,
                    nombre,
                    apellido_paterno,
                    apellido_materno,
                    curp,
                    fecha_nacimiento,
                    genero,
                    telefono,
                    expedientes_clinicos!inner (
                        id,
                        folio_personalizado,
                        numero_consecutivo,
                        id_clinica
                    )
                `)
                .eq('expedientes_clinicos.id_clinica', idClinicaActiva)
                .or(`nombre.ilike.%${texto}%,apellido_paterno.ilike.%${texto}%,curp.ilike.%${texto}%,telefono.ilike.%${texto}%`);

            if (error) throw error;

            contenedorRes.innerHTML = '';

            if (pacientes && pacientes.length > 0) {
                pacientes.forEach(p => {
                    const div = document.createElement('div');
                    div.className = 'quick-res-item';
                    
                    const edadStr = calcularEdadQuick(p.fecha_nacimiento);
                    const curpStr = p.curp ? p.curp : 'SIN CURP';
                    
                    // Extraer expediente de la sede activa
                    const expRel = Array.isArray(p.expedientes_clinicos) 
                        ? p.expedientes_clinicos.find(e => String(e.id_clinica) === String(idClinicaActiva)) || p.expedientes_clinicos[0]
                        : p.expedientes_clinicos;

                    const folioExp = (expRel && expRel.folio_personalizado) 
                        ? expRel.folio_personalizado 
                        : (expRel && expRel.numero_consecutivo ? `EXP-${expRel.numero_consecutivo}` : `EXP-${p.id}`);

                    div.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 800; color: #0f172a; font-size: 0.82rem;">${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}</span>
                            <span style="background: #e0f2fe; color: #0369a1; font-size: 0.68rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; font-family: monospace;">📁 ${folioExp}</span>
                        </div>
                        <div style="font-size: 0.72rem; color: #64748b; margin-top: 3px;">
                            <span>🎂 ${edadStr}</span> | <span style="font-family: monospace;">🆔 ${curpStr}</span>
                        </div>
                    `;
                    
                    div.onclick = () => seleccionarPacienteExpress({
                        ...p,
                        genero: p.genero || '',
                        folio_expediente: folioExp
                    });

                    contenedorRes.appendChild(div);
                });
            } else {
                contenedorRes.innerHTML = `<small style="color: #ef4444; text-align: center; display: block; padding: 10px 0;">No existe expediente activo en esta sede.</small>`;
            }
        } catch (err) {
            console.error("Error al consultar expedientes clínicas:", err);
            contenedorRes.innerHTML = `<small style="color: #ef4444; text-align: center; display: block; padding: 10px 0;">Error al consultar expedientes.</small>`;
        }
    });
}

let pacienteSeleccionadoQuick = null;

function seleccionarPacienteExpress(paciente) {
    pacienteSeleccionadoQuick = {
        ...paciente,
        genero: paciente.genero || paciente.sexo || ''
    };

    const edadStr = calcularEdadQuick(paciente.fecha_nacimiento);
    const folioExp = paciente.folio_expediente ? paciente.folio_expediente : `EXP-${paciente.id}`;

    document.getElementById('lblPacienteSeleccionado').innerText = `👤 ${paciente.nombre} ${paciente.apellido_paterno}`;
    document.getElementById('lblDetallesPaciente').innerText = `Expediente: ${folioExp} | Edad: ${edadStr}`;
    
    document.getElementById('panelAbanicoAcciones').classList.add('desplegado');
}

function cerrarBuscadorExpress() {
    const popover = document.getElementById('popoverQuickSearch');
    if (popover) {
        popover.classList.remove('activo');
        pacienteSeleccionadoQuick = null;
    }
}

window.ejecutarAccionExpress = function(tipo) {
    if (!pacienteSeleccionadoQuick) {
        alert("Por favor selecciona un paciente de la lista primero.");
        return;
    }

    // Guardar contexto en localStorage
    localStorage.setItem('paciente_seleccionado_id', pacienteSeleccionadoQuick.id);
    localStorage.setItem('id_paciente_activo', pacienteSeleccionadoQuick.id);
    localStorage.setItem('paciente_precargado', JSON.stringify(pacienteSeleccionadoQuick));

    cerrarBuscadorExpress();

    // Redirección directa por ruta
    switch (tipo) {
        case 'receta':
            window.location.href = 'portal-recetas.html';
            break;
        case 'nota':
            window.location.href = 'historia-clinica.html';
            break;
        case 'imagen':
            window.location.href = 'portal-gabinete.html';
            break;
        case 'laboratorio':
            window.location.href = 'portal-laboratorio.html';
            break;
        case 'historial':
            window.location.href = 'historial-evolucion.html';
            break;
    }
};
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

// Función en el Dashboard para enviar al portal correcto
function atenderSolicitudDesdeDashboard(tipoSolicitud, pacienteObj) {
    // 1. Guardamos el objeto del paciente en el almacenamiento local convertido a texto (JSON)
    localStorage.setItem('paciente_precargado', JSON.stringify(pacienteObj));
    
    // 2. Redirigimos al portal correspondiente
    if (tipoSolicitud === 'LABORATORIO') {
        window.location.href = 'portal-laboratorio.html';
    } else if (tipoSolicitud === 'GABINETE') {
        window.location.href = 'portal-gabinete.html';
    }
}

// Agrega esto en tu función de inicialización general (ej. al cargar el DOM)
function iniciarCanalSalaEspera() {
    fisioNet
        .channel('cambios-solicitudes-citas')
        .on(
            'postgres_changes',
            {
                event: '*', // INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'solicitudes_citas'
            },
            (payload) => {
                console.log("🔔 Cambio detectado en solicitudes:", payload);
                // Recarga la sala de espera automáticamente para cualquier cambio en pendientes
                if (typeof cargarSalaEspera === 'function') {
                    cargarSalaEspera();
                }
            }
        )
        .subscribe();
}

window.abrirFiltroLimpieza = async (idSolicitud) => {
    // 1. Traemos la basura que guardamos por teléfono ("DOÑA JOSE")
    const { data: sol } = await fisioNet.from('solicitudes_citas').select('*').eq('id', idSolicitud).single();
    if(!sol) return;

    // 2. Llenamos el modal para que la recepcionista lo borre y corrija
    document.getElementById('limpiezaIdSolicitud').value = sol.id;
    document.getElementById('limpiezaNombre').value = sol.nombre || '';
    document.getElementById('limpiezaPaterno').value = sol.apellido_p || '';
    document.getElementById('limpiezaMaterno').value = sol.apellido_m || '';

    // Abrimos la aduana
    document.getElementById('modalLimpieza').style.display = 'flex';
};

window.confirmarLimpiezaYProcesar = async () => {
    const id = document.getElementById('limpiezaIdSolicitud').value;
    const nom = document.getElementById('limpiezaNombre').value.trim().toUpperCase();
    const pat = document.getElementById('limpiezaPaterno').value.trim().toUpperCase();
    const mat = document.getElementById('limpiezaMaterno').value.trim().toUpperCase();

    if(!nom || !pat) {
        alert("⚠️ El Nombre y Apellido Paterno son obligatorios para el expediente real.");
        return;
    }

    // 1. Actualizamos el registro temporal con los datos YA LIMPIOS
    await fisioNet.from('solicitudes_citas').update({
        nombre: nom,
        apellido_p: pat,
        apellido_m: mat
    }).eq('id', id);

    document.getElementById('modalLimpieza').style.display = 'none';

    // 2. ¡LA MAGIA! Ahora mandamos llamar a tu función original. 
    // Como los datos ya están limpios, tu buscador de duplicados funcionará perfecto.
    procesarSolicitud(id, 'APROBAR');
};

window.confirmarHorarioEnSala = async (idSolicitud, accion) => {
    const nuevoEstado = accion === 'APROBAR' ? 'CONFIRMADO' : 'RECHAZADO';
    
    if (accion === 'RECHAZAR' && !confirm("¿Estás seguro de rechazar esta solicitud?")) return;
    
    // Solo actualizamos el estado, no tocamos los nombres aún
    await fisioNet.from('solicitudes_citas').update({ estado: nuevoEstado }).eq('id', idSolicitud);
    
    // Recargamos los paneles
    if (typeof cargarSolicitudesRecibidas === 'function') cargarSolicitudesRecibidas();
    if (typeof cargarSalaEspera === 'function') cargarSalaEspera();
    if (typeof cargarAgenda === 'function') await cargarAgenda('semana');
};





// Ejecutar cuando cargue el dashboard
document.addEventListener('DOMContentLoaded', () => {
    verificarYPedirNotificaciones();
});

async function verificarYPedirNotificaciones() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Si el permiso aún no se ha pedido (es 'default'), podemos pedirlo o mostrar un aviso
    if (Notification.permission === 'default') {
        // Opcional: Puedes mostrar un botón o pedirlo directamente
        const permiso = await Notification.requestPermission();
        if (permiso === 'granted') {
            console.log('¡Notificaciones activadas con éxito!');
            registrarSuscripcionPushEnSupabase();
        }
    }
}

async function registrarSuscripcionPushEnSupabase() {
    try {
        const registro = await navigator.serviceWorker.ready;
        
        // 🔑 Tu Llave Pública VAPID 
        // (Nota: Necesitas generar un par de llaves VAPID; puedes usar herramientas online gratuitas 
        // o generarlas con Node.js, y poner aquí tu llave pública en formato Uint8Array)
        const publicVapidKey = 'BIxTihYT48GMKpAUqmTUy56KemyUAjW-tPVgWh_cy_uhJjUDgirmnR7ymPFsOyUWEOk-6F7EPLjOIgTCsWBy_bs'; 
        const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);

        // Suscribimos al navegador al servidor push
        const suscripcion = await registro.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
        });

        const usuarioId = localStorage.getItem('usuarioId');
        const subJson = suscripcion.toJSON();

  // Guardamos o actualizamos la suscripción en Supabase basada en el endpoint único del dispositivo
        const { error } = await fisioNet
            .from('push_subscriptions')
            .upsert({
                id_profesional: usuarioId,
                endpoint: subJson.endpoint,
                p256dh: subJson.keys.p256dh,
                auth: subJson.keys.auth
            }, { onConflict: 'endpoint' });

        if (error) console.error("Error al guardar suscripción push en Supabase:", error);
        else console.log("📱 Dispositivo registrado con éxito para recibir notificaciones push.");

    } catch (err) {
        console.error('Error en el proceso de suscripción push:', err);
    }
}

// 🛠️ Función auxiliar obligatoria para traducir la llave VAPID
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
 for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
}
    return outputArray;
}



export async function cargarSedes() {
    try {
        const { data: { session } } = await fisioNet.auth.getSession();
        if (!session) return;

        // 1. Obtener los IDs de las clínicas donde el usuario es colaborador activo
        const { data: vinculos, error: errVinculos } = await fisioNet
            .from('colaboradores_clinica')
            .select('id_clinica')
            .eq('id_profesional', session.user.id)
            .eq('estado', 'ACTIVO');

        if (errVinculos) console.warn("Error consultando colaboraciones:", errVinculos.message);

        const idsClinicasColab = (vinculos || []).map(v => v.id_clinica);

        // 2. Consultar clínicas donde es dueño O donde es colaborador
        let query = fisioNet
            .from('clinicas')
            .select('id, nombre_clinica, color_institucional, id_clinica_padre, id_dueno')
            .eq('estado', true);

        if (idsClinicasColab.length > 0) {
            query = query.or(`id_dueno.eq.${session.user.id},id.in.(${idsClinicasColab.join(',')})`);
        } else {
            query = query.eq('id_dueno', session.user.id);
        }

        const { data: clinicas, error } = await query.order('nombre_clinica', { ascending: true });

        if (error) throw error;

        sedesDisponibles = clinicas || [];
        const select = document.getElementById('selectSedeActual');
        if (!select) return;

        select.innerHTML = '';

        if (sedesDisponibles.length === 0) {
            select.innerHTML = `<option value="">Sin sucursales registradas</option>`;
            return;
        }

        // 3. Poblar el selector de sedes
        sedesDisponibles.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.nombre_clinica;
            select.appendChild(option);
        });

        // 4. Determinar sede activa (localStorage o primera disponible)
        let sedeGuardada = localStorage.getItem('id_clinica_activa');
        const existeSede = sedesDisponibles.some(c => c.id === sedeGuardada);

        if (!sedeGuardada || !existeSede) {
            const sedeInic = sedesDisponibles[0];
            sedeGuardada = sedeInic.id;
            localStorage.setItem('id_clinica_activa', sedeInic.id);
            localStorage.setItem('nombre_clinica', sedeInic.nombre_clinica);
            if (sedeInic.color_institucional) {
                localStorage.setItem('clinica_color', sedeInic.color_institucional);
            }
        }

        select.value = sedeGuardada;
        
        // 5. Vincular evento para cambiar de sede al seleccionar
        select.removeEventListener('change', manejarCambioSedeSelect);
        select.addEventListener('change', manejarCambioSedeSelect);

        // Aplicar color e interfaz
        aplicarColorSede(sedeGuardada);

    } catch (err) {
        console.error("❌ Error al cargar sucursales:", err.message);
        const select = document.getElementById('selectSedeActual');
        if (select) {
            select.innerHTML = `<option value="">Error al cargar sedes</option>`;
        }
    }
}

// Handler auxiliar para el selector HTML
function manejarCambioSedeSelect(e) {
    cambiarSedeActiva(e.target.value);
}

/**
 * Cambia la sede activa en memoria/localStorage y recarga los componentes operativos
 */
export function cambiarSedeActiva(sedeId) {
    if (!sedeId) return;

    const sedeSeleccionada = sedesDisponibles.find(s => s.id === sedeId);
    if (!sedeSeleccionada) return;

    // 1. Guardar la nueva sede activa en localStorage
    localStorage.setItem('id_clinica_activa', sedeSeleccionada.id);
    localStorage.setItem('clinica_activa_id', sedeSeleccionada.id);
    localStorage.setItem('fisiocid_id_clinica', sedeSeleccionada.id);
    localStorage.setItem('nombre_clinica', sedeSeleccionada.nombre_clinica);

    if (sedeSeleccionada.color_institucional) {
        localStorage.setItem('clinica_color', sedeSeleccionada.color_institucional);
        localStorage.setItem('fisiocid_color', sedeSeleccionada.color_institucional);
    }

    // 2. Recarga limpia para actualizar interfaz, agenda, cajas y permisos al instante
    window.location.reload();
}

/**
 * Aplica el color institucional dinámico
 */
function aplicarColorSede(sedeId) {
    const sedeObj = sedesDisponibles.find(s => s.id === sedeId);
    if (sedeObj && sedeObj.color_institucional) {
        document.documentElement.style.setProperty('--primary', sedeObj.color_institucional);
        document.documentElement.style.setProperty('--medical-blue', sedeObj.color_institucional);
    }
}

/**
 * Control del Modal de Nueva Sucursal
 */
window.abrirModalNuevaSede = function() {
    document.getElementById('modalNuevaSede').style.display = 'flex';
};

window.cerrarModalNuevaSede = function() {
    document.getElementById('modalNuevaSede').style.display = 'none';
    document.getElementById('formNuevaSede').reset();
};

/**
 * Procesa la creación de una nueva sucursal con la especialidad DINÁMICA del usuario
 */
document.getElementById('formNuevaSede')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btnGuardarSede');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando...';

    try {
        const { data: { session } } = await fisioNet.auth.getSession();
        if (!session) return;

        // 1. Obtener la especialidad REAL del usuario (desde localStorage o Supabase)
        let especialidadUsuario = localStorage.getItem('especialidadUsuario');

        if (!especialidadUsuario || especialidadUsuario === 'null') {
            const { data: perfilProf } = await fisioNet
                .from('perfiles_profesionales')
                .select('especialidad')
                .eq('id', session.user.id)
                .maybeSingle();

            especialidadUsuario = perfilProf?.especialidad || 'FISIOTERAPIA';
        }

        // 2. Obtener el ID de la clínica matriz desde el perfil general
        const { data: perfilGen } = await fisioNet
            .from('perfiles')
            .select('id_clinica_principal')
            .eq('id', session.user.id)
            .single();

        const idMatriz = perfilGen?.id_clinica_principal || localStorage.getItem('id_clinica_activa');

        // 3. Crear el nuevo registro en la tabla "clinicas" con datos reales
        const nuevaSucursal = {
            nombre_clinica: document.getElementById('sedeNombre').value.trim().toUpperCase(),
            direccion: document.getElementById('sedeDireccion').value.trim(),
            telefono_contacto: document.getElementById('sedeTelefono').value.trim(),
            color_institucional: document.getElementById('sedeColor').value,
            especialidad_principal: especialidadUsuario.toUpperCase().trim(), // 🎯 Especialidad Dinámica
            id_dueno: session.user.id,
            id_clinica_padre: idMatriz, // 🔗 Enlace con la clínica matriz
            estado: true,
            plan_actual: 'GRATUITO'
        };

        const { data: clinicaCreada, error: errClinica } = await fisioNet
            .from('clinicas')
            .insert([nuevaSucursal])
            .select()
            .single();

        if (errClinica) throw errClinica;

        // 4. Crear el vínculo como Administrador en "colaboradores_clinica"
        const nuevoColaborador = {
            id_clinica: clinicaCreada.id,
            id_profesional: session.user.id,
            rol_sistema: 'ADMIN_SISTEMA',
            cargo_clinico: 'ADMINISTRADOR',
            estado: 'ACTIVO',
            fecha_inicio: new Date().toISOString().split('T')[0],
            tipo_vinculo: 'INTERNO'
        };

        const { error: errColab } = await fisioNet
            .from('colaboradores_clinica')
            .insert([nuevoColaborador]);

        if (errColab) throw errColab;

      // ... (dentro de formNuevaSede, al finalizar la creación exitosa)

        alert('✅ Sucursal registrada correctamente. Cambiando a la nueva sede...');
        
        // 1. Guardar la nueva clínica como la activa en el sistema
        localStorage.setItem('id_clinica_activa', clinicaCreada.id);
        localStorage.setItem('nombre_clinica', clinicaCreada.nombre_clinica);
        if (clinicaCreada.color_institucional) {
            localStorage.setItem('clinica_color', clinicaCreada.color_institucional);
        }

        // 2. Recargar para que todo el dashboard tome el contexto de la nueva sede
        window.location.reload();

    } catch (err) {
        alert('❌ Error al guardar la sucursal: ' + err.message);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = '✅ Registrar Sede';
    }
});

function evaluarAccesoElementosUI(permitido) {
    const btnNuevaSede = document.getElementById('btnNuevaSede');
    const btnMiEquipo = document.getElementById('btnMiEquipo');
    const bannerUpgrade = document.getElementById('bannerUpgradeSedes');

    if (permitido) {
        // 👑 ES DUEÑO / ADMIN: Se muestran funciones de gestión y se oculta la promoción
        if (btnNuevaSede) btnNuevaSede.classList.remove('ocultar-rol');
        if (btnMiEquipo) btnMiEquipo.classList.remove('ocultar-rol');
        if (bannerUpgrade) bannerUpgrade.style.setProperty('display', 'none', 'important');
    } else {
        // 👤 ES INDEPENDIENTE / STAFF: Se ocultan los módulos de gestión y se activa el llamado a cambiar de plan
        if (btnNuevaSede) btnNuevaSede.classList.add('ocultar-rol');
        if (btnMiEquipo) btnMiEquipo.classList.add('ocultar-rol');
        if (bannerUpgrade) bannerUpgrade.style.setProperty('display', 'flex', 'important');
    }
}
window.buscarColegasFisioCid = buscarColegasFisioCid;
window.verDetalleColega = verDetalleColega;