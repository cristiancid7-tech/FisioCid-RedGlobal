// ==========================================
// 1. CERRAR SESIÓN Y LIMPIEZA
// ==========================================
async function salir() {
    try {
        console.log("🧹 Iniciando limpieza profunda de FisioCid...");
        
        localStorage.clear();
        sessionStorage.clear();

        await fisioNet.auth.signOut();

        window.location.replace('login.html');

    } catch (error) {
        console.error("Error al salir:", error);
        localStorage.clear();
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
// 2. VALIDADOR DE CUOTA DE PACIENTES (Para crear nuevos)
// ==========================================
async function validarCuotaPaciente(idUsuarioAuth, codigoPlan) {
    try {
        // 1. Obtener límite del plan en la tabla planes_suscripcion
        const { data: plan, error: errPlan } = await fisioNet
            .from('planes_suscripcion')
            .select('limite_pacientes')
            .eq('codigo_plan', codigoPlan)
            .single();

        if (errPlan || !plan) {
            return { permitido: false, motivo: "No se pudo verificar tu plan de suscripción." };
        }

        // 2. Si el plan es ilimitado (-1)
        if (plan.limite_pacientes === -1) {
            return { permitido: true };
        }

        // 3. Contar pacientes actuales registrados por este profesional
        const { count, error: errCount } = await fisioNet
            .from('pacientes_maestros')
            .select('id', { count: 'exact', head: true })
            .eq('id_usuario_auth', idUsuarioAuth);

        if (errCount) {
            return { permitido: false, motivo: "Error al consultar la cuota de pacientes." };
        }

        // 4. Evaluar cuota disponible
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
// 3. PORTERO DE SEGURIDAD (Perfil completo + Suscripción activa)
// ==========================================
async function verificarPerfilCompleto() {
    const rolActual = localStorage.getItem('rol_actual');
    const esStaff = (rolActual !== 'DUEÑO' && rolActual !== 'ADMIN_SISTEMA' && rolActual !== null);

    if (esStaff) {
        console.log("👥 Seguridad FisioCid: Colaborador detectado. Omitiendo portero de dueños.");
        return; 
    }

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
                window.location.href = 'suscripcion.html'; // Redirige a la pantalla de planes/pago
            }
        }

    } catch (error) {
        console.error("Error en el portero de seguridad:", error);
    }
}

// Ejecutar automáticamente al cargar cualquier página
document.addEventListener('DOMContentLoaded', verificarPerfilCompleto);