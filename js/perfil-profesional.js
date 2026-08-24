// Lógica para habilitar testimonios basada en el historial de pagos
async function habilitarFormularioTestimonio(pacienteId, doctorId) {
    try {
        // Consultamos en tu tabla finanzas_gestion si existe un pago exitoso
        const { data: consultaRealizada, error } = await fisioNet
            .from('finanzas_gestion')
            .select('id_pago')
            .eq('id_paciente', pacienteId)
            .eq('id_profesional', doctorId)
            .eq('pagado', true) // Solo si ya pagó
            .limit(1);

        if (error) throw error;

        const contenedorOpiniones = document.getElementById('seccionEscribirOpinion');
        
        if (consultaRealizada.length > 0) {
            // MOSTRAR FORMULARIO: El paciente es real y verificado
            contenedorOpiniones.innerHTML = `
                <div class="card border-primary-subtle bg-light-subtle rounded-4 p-3 mt-4">
                    <h6 class="fw-bold"><i class="fas fa-pen-fancy me-2"></i>Escribe tu opinión veridica</h6>
                    <textarea class="form-control rounded-3 mb-2" id="textoOpinion" placeholder="Cuéntanos tu experiencia con el especialista..."></textarea>
                    <button class="btn btn-primary rounded-pill btn-sm px-4" onclick="guardarTestimonio()">Publicar Testimonio</button>
                </div>`;
        } else {
            // BLOQUEADO: No hay registro de pago previo
            contenedorOpiniones.innerHTML = `
                <div class="alert alert-secondary rounded-4 mt-4 small">
                    <i class="fas fa-lock me-2"></i> Solo los pacientes atendidos por este especialista pueden dejar una opinión.
                </div>`;
        }
    } catch (err) {
        console.error("Error al validar paciente:", err.message);
    }
}