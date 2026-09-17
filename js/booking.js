// =========================================================================
// ⚙️ CONFIGURACIÓN GLOBAL Y VARIABLES DE CONTROL GEOGRÁFICO MAESTRO
// =========================================================================
let CONFIG_CLINICA = {
    intervalo: 30,
    horarios: [], // Se llenará dinámicamente desde la DB
    descanso: [0] // Por defecto domingo (0)
};

window.estadoSeleccionado = "";
window.clinicaSeleccionadaId = null;
window.especialistaSeleccionadoId = null;
window.fechaSeleccionada = "";
window.horaSeleccionada = "";

// --- 1. INICIALIZACIÓN AL CARGAR EL DOM ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🔥 Inicializando Buscador Híbrido de Citas FisioCid...");
    
    ['nombre', 'apellidoP', 'apellidoM'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', (e) => {
            let posicionCursor = e.target.selectionStart;
            e.target.value = e.target.value.toUpperCase().replace(/\s+/g, ' ');
            e.target.setSelectionRange(posicionCursor, posicionCursor);
        });
    });

    configurarEventosFiltros();
});

// =========================================================================
// 🔄 MOTOR DE FILTRADO HÍBRIDO EN CASCADA
// =========================================================================
function configurarEventosFiltros() {
    const selectEdo = document.getElementById('filtro-estado');
    const selectEsp = document.getElementById('filtro-especialidad');
    const selectUbi = document.getElementById('filtro-ubicacion');
    const selectDoc = document.getElementById('filtro-especialista');

    if (!selectEdo || !selectEsp || !selectUbi || !selectDoc) {
        console.error("❌ Error: No se encontraron todos los selectores en el HTML.");
        return;
    }

    // ESCUDO 1: Estado ➡️ Especialidades
    selectEdo.addEventListener('change', async () => {
        window.estadoSeleccionado = selectEdo.value;
        ocultarCalendarioYHoras();
        
        selectEsp.innerHTML = '<option value="">-- Selecciona Especialidad --</option>';
        selectUbi.innerHTML = '<option value="">Selecciona primero una especialidad...</option>';
        selectDoc.innerHTML = '<option value="TODOS">Cualquier especialista disponible 👨‍⚕️</option>';
        selectUbi.disabled = true;
        selectDoc.disabled = true;

        if (!window.estadoSeleccionado) {
            selectEsp.disabled = true;
            return;
        }

        selectEsp.disabled = false;
        selectEsp.innerHTML = '<option value="">Buscando especialidades en la región...</option>';

        try {
            const { data: clinicasEdo, error: errClinicas } = await fisioNet
                .from('clinicas')
                .select('id')
                .ilike('entidad_federativa', `%${window.estadoSeleccionado}%`);

            if (errClinicas) throw errClinicas;

            if (!clinicasEdo || clinicasEdo.length === 0) {
                selectEsp.innerHTML = '<option value="">No hay clínicas registradas en este estado</option>';
                return;
            }

            const listaIdsClinicas = clinicasEdo.map(c => c.id);

            const { data: colaboradores, error: errColab } = await fisioNet
                .from('colaboradores_clinica')
                .select('id_profesional, perfiles_profesionales!inner(especialidad)')
                .in('id_clinica', listaIdsClinicas)
                .eq('estado', 'ACTIVO'); 

            if (errColab) throw errColab;

            const especialidadesUnicas = [...new Set(colaboradores?.map(c => c.perfiles_profesionales?.especialidad).filter(Boolean))];

            selectEsp.innerHTML = '<option value="">-- Selecciona Especialidad --</option>';
            if (especialidadesUnicas.length === 0) {
                selectEsp.innerHTML = '<option value="">No hay especialidades activas en la región</option>';
                return;
            }

            especialidadesUnicas.forEach(esp => {
                selectEsp.innerHTML += `<option value="${esp}">${esp.toUpperCase()}</option>`;
            });

        } catch (err) {
            console.error("❌ Error en Escudo 1 (Estados):", err.message);
        }
    });

    // ESCUDO 2: Especialidad ➡️ Clínicas / Sucursales
    selectEsp.addEventListener('change', async () => {
        const BlacklistRemover = (str) => str ? str.trim() : "";
        const especialidad = selectEsp.value;
        ocultarCalendarioYHoras();

        selectUbi.innerHTML = '<option value="">-- Selecciona una sucursal --</option>';
        selectDoc.innerHTML = '<option value="TODOS">Cualquier especialista disponible 👨‍⚕️</option>';
        selectDoc.disabled = true;

        if (!especialidad) {
            selectUbi.disabled = true;
            return;
        }

        selectUbi.disabled = false;
        selectUbi.innerHTML = '<option value="">Buscando clínicas con este servicio...</option>';

        try {
            const { data: coincidencias, error: errCruzado } = await fisioNet
                .from('colaboradores_clinica')
                .select('id_clinica, clinicas!inner(id, nombre_clinica, direccion, entidad_federativa), perfiles_profesionales!inner(especialidad)')
                .eq('perfiles_profesionales.especialidad', BlacklistRemover(especialidad))
                .ilike('clinicas.entidad_federativa', `%${window.estadoSeleccionado}%`)
                .eq('estado', 'ACTIVO');

            if (errCruzado) throw errCruzado;

            const clinicasFiltradas = [];
            const mapaId = new Set();
            coincidencias?.forEach(item => {
                if (item.clinicas && !mapaId.has(item.id_clinica)) {
                    mapaId.add(item.id_clinica);
                    clinicasFiltradas.push(item.clinicas);
                }
            });

            selectUbi.innerHTML = '<option value="">-- Selecciona una sucursal --</option>';
            if (clinicasFiltradas.length === 0) {
                selectUbi.innerHTML = '<option value="">Sin clínicas disponibles para este servicio</option>';
                return;
            }

            clinicasFiltradas.forEach(c => {
                selectUbi.innerHTML += `<option value="${c.id}">${c.nombre_clinica.toUpperCase()} (${c.direccion || 'Sin dirección'})</option>`;
            });

        } catch (err) {
            console.error("❌ Error en Escudo 2 (Especialidades):", err.message);
        }
    });

    // ESCUDO 3: Sucursal ➡️ Especialistas
    selectUbi.addEventListener('change', async () => {
        window.clinicaSeleccionadaId = selectUbi.value;
        ocultarCalendarioYHoras();

        if (!window.clinicaSeleccionadaId) {
            selectDoc.disabled = true;
            return;
        }

        selectDoc.disabled = false;
        selectDoc.innerHTML = '<option value="">Filtrando personal de la sede...</option>';

        try {
            const { data: staff, error: errStaff } = await fisioNet
                .from('colaboradores_clinica')
                .select('id_profesional, perfiles_profesionales!inner(id, nombre_completo, especialidad)')
                .eq('id_clinica', window.clinicaSeleccionadaId)
                .eq('perfiles_profesionales.especialidad', selectEsp.value)
                .eq('estado', 'ACTIVO');

            if (errStaff) throw errStaff;

            selectDoc.innerHTML = '<option value="TODOS">Cualquier especialista disponible 👨‍⚕️</option>';
            if (staff && staff.length > 0) {
                staff.forEach(s => {
                    const doc = s.perfiles_profesionales;
                    if (doc) {
                        selectDoc.innerHTML += `<option value="${doc.id}">${doc.nombre_completo.toUpperCase()}</option>`;
                    }
                });
            }
            
            await activarCargaConfiguracionAgenda();

        } catch (err) {
            console.error("❌ Error en Escudo 3 (Sucursales):", err.message);
        }
    });

    selectDoc.addEventListener('change', async () => {
        await activarCargaConfiguracionAgenda();
    });
}

function ocultarCalendarioYHoras() {
    const step1 = document.getElementById('step1');
    if (step1) step1.style.display = 'none';
    window.fechaSeleccionada = "";
    window.horaSeleccionada = "";
}

// =========================================================================
// ⚙️ 2. CARGA DE CONFIGURACIÓN HORARIA DESDE LA DB
// =========================================================================
async function activarCargaConfiguracionAgenda() {
    const selectDocVal = document.getElementById('filtro-especialista').value;
    const selectEspVal = document.getElementById('filtro-especialidad').value;
    
    if (!selectEspVal || !window.clinicaSeleccionadaId) return;

    try {
        let perfil = null;

        if (selectDocVal && selectDocVal !== 'TODOS') {
            window.especialistaSeleccionadoId = selectDocVal;
            const { data, error } = await fisioNet
                .from('perfiles_profesionales')
                .select('*')
                .eq('id', selectDocVal)
                .maybeSingle();
            if (error) throw error;
            perfil = data;
        } else {
            window.especialistaSeleccionadoId = null;
            // Si elije TODOS, tomamos la configuración del primer especialista activo de esa sede
            const { data: colab, error: errCol } = await fisioNet
                .from('colaboradores_clinica')
                .select('perfiles_profesionales!inner(*)')
                .eq('id_clinica', window.clinicaSeleccionadaId)
                .eq('perfiles_profesionales.especialidad', selectEspVal)
                .eq('estado', 'ACTIVO')
                .limit(1)
                .maybeSingle();

            if (errCol) throw errCol;
            perfil = colab?.perfiles_profesionales;
        }

        if (perfil) {
            CONFIG_CLINICA.intervalo = perfil.intervalo_cita || 30;
            CONFIG_CLINICA.descanso = perfil.dias_descanso || [0];
            
            let horariosParseados = [];
            if (typeof perfil.horario_atencion === 'string') {
                try { horariosParseados = JSON.parse(perfil.horario_atencion); } catch (e) { horariosParseados = []; }
            } else if (Array.isArray(perfil.horario_atencion)) {
                horariosParseados = perfil.horario_atencion;
            }
            CONFIG_CLINICA.horarios = horariosParseados;
        }

        const step1 = document.getElementById('step1');
        if (step1) step1.style.display = 'block';
        generarCalendario();

    } catch (err) {
        console.error("❌ Error al cargar configuración horaria:", err.message);
    }
}

// =========================================================================
// 📅 3. GENERADOR DE CALENDARIO (VISTA LOCAL 15 DÍAS)
// =========================================================================
function generarCalendario() {
    const contenedor = document.getElementById('calendario-dias');
    if (!contenedor) return;
    contenedor.innerHTML = ''; 
    
    const hoy = new Date();
    const MAX_DIAS_VISTA = 15; 

    for (let i = 0; i < MAX_DIAS_VISTA; i++) {
        const fecha = new Date();
        fecha.setDate(hoy.getDate() + i);
        
        const numeroDiaSemana = fecha.getDay(); 
        const esCerrado = CONFIG_CLINICA.descanso.some(d => Number(d) === numeroDiaSemana);

        const nombreDia = fecha.toLocaleDateString('es-MX', { weekday: 'short' }).toUpperCase();
        const numeroDia = fecha.getDate();
        
        // Formato YYYY-MM-DD local seguro (sin desfase UTC)
        const anio = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        const fechaISO = `${anio}-${mes}-${dia}`;

        const btnDia = document.createElement('div');
        btnDia.className = 'dia-item' + (esCerrado ? ' cerrado' : '');
        btnDia.innerHTML = `<span>${nombreDia}</span><strong>${numeroDia}</strong>${esCerrado ? '<small>Cerrado</small>' : ''}`;
        
        if (!esCerrado) {
            btnDia.onclick = () => {
                document.querySelectorAll('.dia-item').forEach(el => el.classList.remove('activo'));
                btnDia.classList.add('activo');
                window.fechaSeleccionada = fechaISO;
                renderizarHoras(); 
            };

            if (!window.fechaSeleccionada || window.fechaSeleccionada === "") {
                 btnDia.classList.add('activo');
                 window.fechaSeleccionada = fechaISO;
                 renderizarHoras();
            }
        }
        contenedor.appendChild(btnDia);
    }
}

// =========================================================================
// ⏱️ 4. GENERADOR MATEMÁTICO DE SLOTS (SIN DESFASE HORARIO)
// =========================================================================
function generarSlots() {
    const slots = [];
    if (!window.fechaSeleccionada) return slots;

    // Obtener el día de la semana sin que afecte la zona horaria UTC
    const partes = window.fechaSeleccionada.split('-');
    const diaSemana = new Date(partes[0], partes[1] - 1, partes[2]).getDay();

    const turnosDelDia = CONFIG_CLINICA.horarios.filter(h => parseInt(h.dia) === diaSemana);

    turnosDelDia.forEach(rango => {
        let [hIni, mIni] = rango.inicio.split(':').map(Number);
        let [hFin, mFin] = rango.fin.split(':').map(Number);

        let minutosActuales = hIni * 60 + mIni;
        const minutosFin = hFin * 60 + mFin;

        while (minutosActuales + CONFIG_CLINICA.intervalo <= minutosFin) {
            let h = Math.floor(minutosActuales / 60);
            let m = minutosActuales % 60;
            
            let hStr = String(h).padStart(2, '0');
            let mStr = String(m).padStart(2, '0');
            
            slots.push(`${hStr}:${mStr}`);
            minutosActuales += CONFIG_CLINICA.intervalo;
        }
    });

    return slots;
}

// =========================================================================
// 🔍 5. CONSULTAR DISPONIBILIDAD REAL Y RENDERIZAR HORAS EN GRID
// =========================================================================
async function renderizarHoras() {
    const grid = document.getElementById('grid-horas');
    if (!grid) return;
    grid.innerHTML = '<p style="grid-column: span 3; color:#64748b;">Consultando disponibilidad...</p>';

    try {
        const slotsDinamicos = generarSlots();
        
        let queryCitas = fisioNet
            .from('agenda_maestra')
            .select('hora_inicio_cita')
            .eq('fecha', window.fechaSeleccionada)
            .eq('id_clinica', window.clinicaSeleccionadaId);

        if (window.especialistaSeleccionadoId) {
            queryCitas = queryCitas.eq('id_profesional', window.especialistaSeleccionadoId);
        }

        const { data: citasOcupadas, error } = await queryCitas;
        if (error) throw error;

        const horasNoDisponibles = (citasOcupadas || []).map(c => c.hora_inicio_cita.substring(0, 5));
        grid.innerHTML = ''; 

        if (slotsDinamicos.length === 0) {
            grid.innerHTML = '<p style="grid-column: span 3; color:#64748b;">No hay horarios configurados para este día.</p>';
            return;
        }

        slotsDinamicos.forEach(hora => {
            const estaOcupado = horasNoDisponibles.includes(hora);
            const btn = document.createElement('button');
            btn.innerText = hora;
            btn.className = estaOcupado ? 'hora-btn ocupado' : 'hora-btn disponible';
            
            if (!estaOcupado) {
                btn.onclick = () => seleccionarHora(hora);
            }
            grid.appendChild(btn);
        });

    } catch (err) {
        console.error("Error en renderizarHoras:", err);
        grid.innerHTML = '<p style="grid-column: span 3; color:red;">Error al cargar horarios.</p>';
    }
}

// =========================================================================
// 🔀 6. NAVEGACIÓN ENTRE PASOS (STEPS)
// =========================================================================
function seleccionarHora(hora) {
    window.horaSeleccionada = hora;
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'block';
}

function regresarAPaso1() {
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
}

// =========================================================================
// 💾 7. ENVÍO DE SOLICITUD DE CITA A SUPABASE
// =========================================================================
document.getElementById('formRegistro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnConfirmar');
    
    btn.innerText = 'Enviando...';
    btn.disabled = true;
    
    const nombre = document.getElementById('nombre').value.trim().toUpperCase();
    const apP = document.getElementById('apellidoP').value.trim().toUpperCase();
    const apM = document.getElementById('apellidoM').value.trim().toUpperCase();
    const tel = document.getElementById('telefono').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    
    let curpInput = document.getElementById('curp')?.value.trim().toUpperCase() || "";

    if (curpInput !== "") {
        const regexCurp = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d$/;
        if (!regexCurp.test(curpInput)) {
            alert("⚠️ La CURP ingresada no tiene un formato válido de 18 caracteres. Por favor corrígela o déjala vacía.");
            btn.innerText = 'Enviar Solicitud ⚡';
            btn.disabled = false;
            return;
        }
    }
    
    const curpFinal = curpInput !== "" ? curpInput : null;

    try {
        const { error } = await fisioNet
            .from('solicitudes_citas')
            .insert([{
                nombre: nombre,      
                apellido_p: apP,     
                apellido_m: apM,     
                telefono: tel,
                email: email,        
                curp: curpFinal,     
                fecha_cita: window.fechaSeleccionada, 
                hora_cita: window.horaSeleccionada,   
                estado: 'PENDIENTE',
                id_clinica_solicitada: window.clinicaSeleccionadaId,
                id_profesional_solicitado: window.especialistaSeleccionadoId,
                especialidad_solicitada: document.getElementById('filtro-especialidad').value
            }]);

        if (error) throw error;

        alert("¡Tu solicitud de cita ha sido enviada con éxito! Espera la confirmación por WhatsApp.");
        location.reload(); 

    } catch (err) {
        console.error("Error al guardar la solicitud:", err);
        alert("Hubo un error al procesar tu solicitud: " + err.message);
        btn.innerText = 'Enviar Solicitud ⚡';
        btn.disabled = false;
    }
});