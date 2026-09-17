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
        // Reemplaza múltiples espacios por uno solo y remueve caracteres extraños
        e.target.value = e.target.value.toUpperCase().replace(/\s+/g, ' ');
        e.target.setSelectionRange(posicionCursor, posicionCursor);
    });
});
    configurarEventosFiltros();
});

// =========================================================================
// 🔄 MOTOR DE FILTRADO HÍBRIDO EN CASCADA (INDISTRUCTIBLE)
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

    // =========================================================================
    // ESCUDO 1: Al cambiar ESTADO ➡️ Busca Especialidades en esa Región
    // =========================================================================
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
            // 🎯 AJUSTE 1: Cambiado 'estado' por 'entidad_federativa' conforme a tu nueva estructura
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

    // =========================================================================
    // ESCUDO 2: Al cambiar ESPECIALIDAD ➡️ Busca Clínicas de ese Estado que ofrezcan el Servicio
    // =========================================================================
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
            // 🎯 AJUSTE 2: Ajustado filtro de cruzado geográfico a 'entidad_federativa'
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

    // =========================================================================
    // ESCUDO 3: Al cambiar SUCURSAL ➡️ Busca Doctores de esa Especialidad en esa Sede
    // =========================================================================
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
    
    if (!selectEspVal) return;

    try {
        let query = fisioNet.from('perfiles_profesionales').select('*');

        if (selectDocVal && selectDocVal !== 'TODOS') {
            window.especialistaSeleccionadoId = selectDocVal;
            query = query.eq('id', selectDocVal);
        } else {
            window.especialistaSeleccionadoId = null;
            query = query.eq('especialidad', selectEspVal).limit(1);
        }

        const { data: perfil, error } = await query.maybeSingle();
        if (error) throw error;

        if (perfil) {
            CONFIG_CLINICA.intervalo = perfil.intervalo_cita || 30;
            CONFIG_CLINICA.descanso = perfil.dias_descanso || [0];
            CONFIG_CLINICA.horarios = perfil.horario_atencion ? JSON.parse(perfil.horario_atencion) : [];
        }

        const step1 = document.getElementById('step1');
        if (step1) step1.style.display = 'block';
        generarCalendario();

    } catch (err) {
        console.error("❌ Error al cargar configuración horaria:", err.message);
    }
}

// =========================================================================
// 📅 3. GENERADOR DE CALENDARIO (VISTA DE 15 DÍAS CORRIDOS)
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
        const fechaISO = fecha.toISOString().split('T')[0]; 

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
// ⏱️ 4. GENERADOR MATEMÁTICO DE SLOTS (CON LÍMITE DE SALIDA)
// =========================================================================
function generarSlots() {
    const slots = [];
    if (!window.fechaSeleccionada) return slots;

    const diaSeleccionado = new Date(window.fechaSeleccionada + 'T00:00:00').getDay();
    const turnosDelDia = CONFIG_CLINICA.horarios.filter(h => parseInt(h.dia) === diaSeleccionado);

    turnosDelDia.forEach(rango => {
        let actual = new Date(`2026-01-01T${rango.inicio}:00`);
        const fin = new Date(`2026-01-01T${rango.fin}:00`);

        while (true) {
            let finDeCita = new Date(actual);
            finDeCita.setMinutes(actual.getMinutes() + CONFIG_CLINICA.intervalo);

            if (finDeCita > fin) break; 

            const horaString = actual.toTimeString().substring(0, 5);
            slots.push(horaString);
            actual = finDeCita; 
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
        
        // 🎯 AJUSTE 3: Blindar consulta para separar por sucursal y especialista específico
        let queryCitas = fisioNet
            .from('agenda_maestra')
            .select('hora_inicio_cita')
            .eq('fecha', window.fechaSeleccionada)
            .eq('id_clinica', window.clinicaSeleccionadaId); // Filtro indispensable multi-sede 🛡️

        if (window.especialistaSeleccionadoId) {
            queryCitas = queryCitas.eq('id_profesional', window.especialistaSeleccionadoId);
        }

        const { data: citasOcupadas, error } = await queryCitas;
        if (error) throw error;

        const horasNoDisponibles = citasOcupadas.map(c => c.hora_inicio_cita.substring(0, 5));
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
    
    // 🎯 1. Declaramos curpInput una sola vez
    let curpInput = document.getElementById('curp').value.trim().toUpperCase();

    // 🛡️ 2. Si el usuario escribió algo en el campo CURP, lo validamos con Expresión Regular
    if (curpInput !== "") {
        const regexCurp = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d$/;
        if (!regexCurp.test(curpInput)) {
            alert("⚠️ La CURP ingresada no tiene un formato válido de 18 caracteres. Por favor corrígela o déjala vacía si no la recuerdas.");
            btn.innerText = 'Enviar Solicitud ⚡';
            btn.disabled = false;
            return; // 🛑 Detiene el envío si está mal estructurada
        }
    }
    
    // 🎯 3. Declaramos curpFinal una sola vez (si pasó la validación o viene vacía)
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