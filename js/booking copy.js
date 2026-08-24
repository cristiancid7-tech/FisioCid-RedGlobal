let CONFIG_CLINICA = {
    intervalo: 30,
    horarios: [], // Se llenará desde la DB
    descanso: [0] // Por defecto domingo
};

// --- 1. INICIALIZACIÓN: CARGAR PERFIL DEL DOCTOR ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Conectando con el perfil de FisioCid...");
    await cargarConfiguracionDoctor();
    generarCalendario();
});

async function cargarConfiguracionDoctor() {
    try {
        const { data: perfil, error } = await fisioNet
            .from('perfiles_profesionales')
            .select('*')
            .limit(1)
            .single();

        if (error) throw error;

        CONFIG_CLINICA.intervalo = perfil.intervalo_cita || 30;
        CONFIG_CLINICA.descanso = perfil.dias_descanso || [0];
        
        if (perfil.horario_atencion) {
            CONFIG_CLINICA.horarios = JSON.parse(perfil.horario_atencion);
        }

        console.log("Configuración cargada:", CONFIG_CLINICA);
    } catch (err) {
        console.warn("Usando configuración por defecto:", err.message);
        CONFIG_CLINICA.horarios = [
            { dia: 1, inicio: "09:00", fin: "14:00" },
            { dia: 1, inicio: "16:00", fin: "21:00" }
        ];
    }
}

function generarCalendario() {
    const contenedor = document.getElementById('calendario-dias');
    if (!contenedor) return;
    contenedor.innerHTML = ''; 
    
    const hoy = new Date();
    // Definimos el límite de 15 días para el paciente
    const MAX_DIAS_VISTA = 15; 

    for (let i = 0; i < MAX_DIAS_VISTA; i++) {
        const fecha = new Date();
        fecha.setDate(hoy.getDate() + i);
        
        const numeroDiaSemana = fecha.getDay(); 
        
        // Verificamos si es día de descanso configurado
        const esCerrado = CONFIG_CLINICA.descanso.some(d => Number(d) === numeroDiaSemana);

        const nombreDia = fecha.toLocaleDateString('es-MX', { weekday: 'short' }).toUpperCase();
        const numeroDia = fecha.getDate();
        const fechaISO = fecha.toISOString().split('T')[0]; 

        const btnDia = document.createElement('div');
        // El primer día disponible (no cerrado) será el 'activo' por defecto
        btnDia.className = 'dia-item' + (esCerrado ? ' cerrado' : '');
        btnDia.innerHTML = `<span>${nombreDia}</span><strong>${numeroDia}</strong>${esCerrado ? '<small>Cerrado</small>' : ''}`;
        
        if (!esCerrado) {
            btnDia.onclick = () => {
                document.querySelectorAll('.dia-item').forEach(el => el.classList.remove('activo'));
                btnDia.classList.add('activo');
                window.fechaSeleccionada = fechaISO;
                renderizarHoras(); 
            };

            // Si es el primer día no cerrado que encontramos, lo seleccionamos automáticamente
            if (!window.fechaSeleccionada || window.fechaSeleccionada === "") {
                 btnDia.classList.add('activo');
                 window.fechaSeleccionada = fechaISO;
                 renderizarHoras();
            }
        }

        contenedor.appendChild(btnDia);
    }
}

// --- 3. EL GENERADOR DE SLOTS (CON PROTECCIÓN DE HORA DE SALIDA) ---
function generarSlots() {
    const slots = [];
    const diaSeleccionado = new Date(window.fechaSeleccionada + 'T00:00:00').getDay();

    const turnosDelDia = CONFIG_CLINICA.horarios.filter(h => {
        return parseInt(h.dia) === diaSeleccionado;
    });

    turnosDelDia.forEach(rango => {
        let actual = new Date(`2026-01-01T${rango.inicio}:00`);
        const fin = new Date(`2026-01-01T${rango.fin}:00`);

        // El ciclo calcula si da tiempo de terminar la cita antes del cierre
        while (true) {
            // Proyectamos a qué hora terminaría esta posible cita
            let finDeCita = new Date(actual);
            finDeCita.setMinutes(actual.getMinutes() + CONFIG_CLINICA.intervalo);

            // REGLA DE ORO: Si la cita termina DESPUÉS de tu hora límite, 
            // detenemos el ciclo y ya no generamos más botones para este turno.
            if (finDeCita > fin) {
                break; 
            }

            // Si pasa la validación, guardamos la hora y mostramos el botón
            const horaString = actual.toTimeString().substring(0, 5);
            slots.push(horaString);
            
            // Avanzamos la hora actual para evaluar el siguiente bloque
            actual = finDeCita; 
        }
    });

    return slots;
}

// --- 4. RENDERIZAR HORAS ---
async function renderizarHoras() {
    const grid = document.getElementById('grid-horas');
    grid.innerHTML = '<p style="grid-column: span 3; color:#64748b;">Consultando disponibilidad...</p>';

    try {
        const slotsDinamicos = generarSlots();
        
        const { data: citasOcupadas, error } = await fisioNet
            .from('agenda_maestra')
            .select('hora_inicio_cita')
            .eq('fecha', window.fechaSeleccionada);

        if (error) throw error;

        const horasNoDisponibles = citasOcupadas.map(c => c.hora_inicio_cita.substring(0, 5));
        grid.innerHTML = ''; 

        if (slotsDinamicos.length === 0) {
            grid.innerHTML = '<p style="grid-column: span 3;">No hay horarios configurados para este día.</p>';
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

// --- 5. NAVEGACIÓN ---
function seleccionarHora(hora) {
    window.horaSeleccionada = hora;
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
}

function regresarAPaso1() {
    document.getElementById('step1').style.display = 'block';
    document.getElementById('step2').style.display = 'none';
}

document.getElementById('formRegistro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnConfirmar');
    const errText = document.getElementById('error-msg');
    
    // Deshabilitar botón para evitar dobles envíos
    btn.innerText = 'Enviando...';
    btn.disabled = true;
    
    // Capturamos y transformamos a MAYÚSCULAS inmediatamente
    const nombre = document.getElementById('nombre').value.trim().toUpperCase();
    const apP = document.getElementById('apellidoP').value.trim().toUpperCase();
    const apM = document.getElementById('apellidoM').value.trim().toUpperCase();
    const tel = document.getElementById('telefono').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    
    // CAPTURA DEL CURP OPCIONAL (Si está vacío, manda null)
    let curpInput = document.getElementById('curp').value.trim().toUpperCase();
    const curpFinal = curpInput !== "" ? curpInput : null;

    const { error } = await fisioNet
        .from('solicitudes_citas')
        .insert([{
            nombre: nombre,      
            apellido_p: apP,     
            apellido_m: apM,     
            telefono: tel,
            email: email,        
            curp: curpFinal,     // <--- AQUÍ SE MANDA EL CURP
            fecha_cita: window.fechaSeleccionada, 
            hora_cita: window.horaSeleccionada,   
            estado: 'PENDIENTE'
        }]);

    if (error) {
        console.error("Error al guardar:", error);
        alert("Hubo un error al procesar tu solicitud.");
        btn.innerText = 'Enviar Solicitud ⚡';
        btn.disabled = false;
    } else {
        alert("¡Solicitud enviada con éxito!");
        location.reload(); 
    }
});

