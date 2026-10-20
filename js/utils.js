// ==========================================
// 1. CERRAR SESIÓN Y LIMPIEZA
// ==========================================
export async function salir() {
    try {
        localStorage.clear();
        sessionStorage.clear();

        if (typeof fisioNet !== 'undefined' && fisioNet.auth) {
            await fisioNet.auth.signOut();
        }

        window.location.replace('login.html');

    } catch (error) {
        console.error("Error al salir:", error);
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('login.html');
    }
}

// Detector global para el botón de salir
document.addEventListener('click', (e) => {
    if (e.target.closest('#btnCerrarSesion')) {
        e.preventDefault();
        salir();
    }
});

// ==========================================
// 2. VALIDADOR DE CUOTA DE PACIENTES
// ==========================================
export async function validarCuotaPaciente(idUsuarioAuth, codigoPlan) {
    try {
        const { data: plan, error: errPlan } = await fisioNet
            .from('planes_suscripcion')
            .select('limite_pacientes')
            .eq('codigo_plan', codigoPlan)
            .single();

        if (errPlan || !plan) {
            return { permitido: false, motivo: "No se pudo verificar tu plan de suscripción." };
        }

        if (plan.limite_pacientes === -1) {
            return { permitido: true };
        }

        const { count, error: errCount } = await fisioNet
            .from('pacientes_maestros')
            .select('id', { count: 'exact', head: true })
            .eq('id_usuario_auth', idUsuarioAuth);

        if (errCount) {
            return { permitido: false, motivo: "Error al consultar la cuota de pacientes." };
        }

        if (count >= plan.limite_pacientes) {
            return { 
                permitido: false, 
                motivo: `Has alcanzado el límite de ${plan.limite_pacientes} pacientes de tu plan (${codigoPlan}). Actualiza tu plan para registrar más pacientes.` 
            };
        }

        return { permitido: true, restantes: plan.limite_pacientes - count };

    } catch (error) {
        console.error("Error validando cuota:", error);
        return { permitido: false, motivo: "Error interno al validar suscripción." };
    }
}

// ==========================================
// 3. PORTERO DE SEGURIDAD (Perfil + Suscripción)
// ==========================================
export async function verificarPerfilCompleto() {
    const rolActual = localStorage.getItem('rol_actual');
    const esStaff = (rolActual !== 'DUEÑO' && rolActual !== 'ADMIN_SISTEMA' && rolActual !== null);

    if (esStaff) return;

    if (typeof fisioNet === 'undefined' || !fisioNet.auth) return;

    const { data: { user } } = await fisioNet.auth.getUser();
    if (!user) return; 

    const paginaActual = window.location.pathname;
    if (paginaActual.includes('configuracion.html') || paginaActual.includes('suscripcion.html')) return;

    try {
        const [perfilRes, clinicaRes] = await Promise.all([
            fisioNet.from('perfiles_profesionales').select('*').eq('id', user.id).single(),
            fisioNet.from('clinicas').select('*').eq('id_dueno', user.id).maybeSingle()
        ]);

        const perfil = perfilRes.data;
        const clinica = clinicaRes.data;

        // A. REVISIÓN DE PERFIL INCOMPLETO
        const incompleto = 
            !perfil?.nombre_completo || 
            !perfil?.cedula_profesional || 
            !perfil?.especialidad || 
            !perfil?.deslinde_aceptado ||
            !clinica?.nombre_clinica || 
            !clinica?.direccion;

        if (incompleto) {
            console.warn("Perfil incompleto. Redirigiendo a configuración...");
            sessionStorage.setItem('mensaje_bloqueo', '⚠️ DEBES COMPLETAR TU CONFIGURACIÓN PROFESIONAL Y ACEPTAR EL DESLINDE LEGAL ANTES DE USAR EL SISTEMA.');
            window.location.href = 'configuracion.html';
            return;
        }

        // B. REVISIÓN DE SUSCRIPCIÓN EXPIRADA O INACTIVA
        if (perfil) {
            const hoy = new Date();
            const fechaExp = perfil.fecha_expiracion ? new Date(perfil.fecha_expiracion) : null;
            const estaVencida = fechaExp && fechaExp < hoy;

            if (!perfil.suscripcion_activa || estaVencida) {
                console.warn("Suscripción inactiva o vencida.");
                sessionStorage.setItem('mensaje_bloqueo', '💳 TU SUSCRIPCIÓN HA VENCIDO O SE ENCUENTRA INACTIVA. POR FAVOR SELECCIONA UN PLAN PARA CONTINUAR.');
                window.location.href = 'suscripcion.html';
            }
        }

    } catch (error) {
        console.error("Error en el portero de seguridad:", error);
    }
}

// Ejecutar automáticamente al cargar cualquier página
document.addEventListener('DOMContentLoaded', verificarPerfilCompleto);

// ==========================================
// 4. FUNCIONES AUXILIARES Y FORMATO
// ==========================================
export function procesarNombreMexicano(textoCompleto) {
    if (!textoCompleto) return { nombre: "", paterno: "", materno: "" };
    
    const conectores = ["DE", "DEL", "LA", "LAS", "LOS", "SAN", "SANTA"];
    let palabras = textoCompleto.toUpperCase().trim().split(/\s+/);
    let piezas = [];
    
    for (let i = 0; i < palabras.length; i++) {
        if (conectores.includes(palabras[i]) && i + 1 < palabras.length) {
            piezas.push(palabras[i] + " " + palabras[i + 1]);
            i++;
        } else { 
            piezas.push(palabras[i]); 
        }
    }
    
    let nombre = "", paterno = "", materno = "";
    const n = piezas.length;
    
    if (n >= 3) {
        materno = piezas[n - 1]; 
        paterno = piezas[n - 2];
        nombre = piezas.slice(0, n - 2).join(" ");
    } else if (n === 2) {
        nombre = piezas[0]; 
        paterno = piezas[1];
    } else { 
        nombre = piezas[0] || ""; 
    }
    
    return { nombre, paterno, materno };
}

export function formatearFechaCorta(fechaStr) {
    if (!fechaStr) return "";
    return new Date(fechaStr + "T00:00:00").toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
}

export function obtenerFechaLocal() {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

// ==========================================
// 5. REGISTRO EN SCOPE GLOBAL (WINDOW)
// ==========================================
window.salir = salir;
window.validarCuotaPaciente = validarCuotaPaciente;
window.verificarPerfilCompleto = verificarPerfilCompleto;
window.procesarNombreMexicano = procesarNombreMexicano;
window.formatearFechaCorta = formatearFechaCorta;
window.obtenerFechaLocal = obtenerFechaLocal;