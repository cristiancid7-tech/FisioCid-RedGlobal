// ============================================================================
// 👶 MÓDULO AUTÓNOMO DE REGISTRO / VINCULACIÓN DE TUTOR EXPRESS (FISIOCID)
// Compatible con: portal-gabinete.js, portal-laboratorio.js, registro-pacientes.js
// ============================================================================

let tutorExpressExistenteId = null;

/**
 * 1. Abrir modal y reiniciar estado del formulario de tutor
 */
async function abrirModalTutorExpress() {
    const modalEl = document.getElementById('modalTutorExpress');
    if (!modalEl) {
        console.warn("⚠️ No se encontró el elemento #modalTutorExpress en el DOM.");
        return;
    }

    document.getElementById('formTutorExpress')?.reset();
    tutorExpressExistenteId = null;
    
    const nombreClinica = localStorage.getItem('nombre_clinica') || 'Clínica Activa';
    const lblSede = document.getElementById('lblSedeRegistroTutor');
    if (lblSede) lblSede.innerText = `Registrando Tutor en: ${nombreClinica.toUpperCase()}`;

    const statusEl = document.getElementById('statusFolioTutorExpress');
    if (statusEl) statusEl.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> GENERANDO FOLIO...';
    
    // Genera automáticamente el folio para el tutor dentro de la sede activa
    await gestionarFolioAutomatico(null, 'inputFolioTutorExpress', 'statusFolioTutorExpress');

    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalInstance.show();
}

/**
 * 2. Generador de la base de CURP (16 caracteres) para Tutor Express
 */
function generarCurpExpressTutor() {
    const nom = document.getElementById('tutExpNombre')?.value || "";
    const pat = document.getElementById('tutExpPaterno')?.value || "";
    const mat = document.getElementById('tutExpMaterno')?.value || "X";
    const fec = document.getElementById('tutExpFecha')?.value || "";
    const gen = document.getElementById('tutExpGenero')?.value === 'HOMBRE' ? 'H' : 'M';
    const est = document.getElementById('tutExpEstado')?.value || "PL";

    if (nom.length >= 2 && pat.length >= 2 && fec) {
        const pNom = typeof procesarNombreMexicano === 'function' ? procesarNombreMexicano(nom).nombre : nom[0];
        const pPat = typeof limpiarApellidoMexicano === 'function' ? limpiarApellidoMexicano(pat) : pat;
        const pMat = typeof limpiarApellidoMexicano === 'function' ? limpiarApellidoMexicano(mat) : mat;

        const l1 = pPat[0] || "X";
        const l2 = pPat.slice(1).match(/[AEIOU]/)?.[0] || "X";
        const l3 = pMat[0] || "X";
        const l4 = pNom[0] || "X";
        const aa = fec.substring(2, 4);
        const mm = fec.substring(5, 7);
        const dd = fec.substring(8, 10);

        const c1 = pPat.slice(1).match(/[BCDFGHJKLMNPQRSTVWXYZ]/)?.[0] || "X";
        const c2 = pMat.slice(1).match(/[BCDFGHJKLMNPQRSTVWXYZ]/)?.[0] || "X";
        const c3 = pNom.slice(1).match(/[BCDFGHJKLMNPQRSTVWXYZ]/)?.[0] || "X";

        const base16 = `${l1}${l2}${l3}${l4}${aa}${mm}${dd}${gen}${est}${c1}${c2}${c3}`.toUpperCase();
        
        const inputBase = document.getElementById('tutExpCurpBase');
        if (inputBase) inputBase.value = base16;

        evaluarCurpHomoclaveTutorExpress();
    }
}

/**
 * 3. Validador en tiempo real cuando se completa la Homoclave (18 caracteres)
 */
async function evaluarCurpHomoclaveTutorExpress() {
    const parteBase = document.getElementById('tutExpCurpBase')?.value?.trim().toUpperCase() || '';
    const homo = document.getElementById('tutExpCurpHomo')?.value?.trim().toUpperCase() || '';
    
    const inputHomo = document.getElementById('tutExpCurpHomo');
    if (inputHomo && inputHomo.value !== homo) {
        inputHomo.value = homo;
    }

    const curpCompleta = `${parteBase}${homo}`;

    if (curpCompleta.length === 18) {
        await verificarTutorExistentePorCurpModal(curpCompleta);
    }
}

/**
 * 4. Consulta directa de CURP a la base de datos de la red
 */
async function verificarTutorExistentePorCurpModal(curpCompleta) {
    const statusEl = document.getElementById('statusFolioTutorExpress');
    const msjEl = document.getElementById('msjHomoclaveAutoTutor');

    if (!curpCompleta || curpCompleta.length !== 18) return;

    if (statusEl) {
        statusEl.className = 'text-primary fw-bold mt-1';
        statusEl.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> CONSULTANDO EXPEDIENTES EN RED...';
    }

    try {
        const { data: tutor, error } = await fisioNet
            .from('pacientes_maestros')
            .select('*')
            .eq('curp', curpCompleta.toUpperCase())
            .maybeSingle();

        if (error) throw error;

        if (tutor) {
            // TUTOR ENCONTRADO EN LA RED
            tutorExpressExistenteId = tutor.id;

            if (document.getElementById('tutExpTel')) document.getElementById('tutExpTel').value = tutor.telefono || '';
            if (document.getElementById('tutExpEmail')) document.getElementById('tutExpEmail').value = tutor.correo_electronico || '';

            await gestionarFolioAutomatico(tutor.id, 'inputFolioTutorExpress', 'statusFolioTutorExpress');

            if (msjEl) {
                msjEl.innerHTML = "<span class='text-success'>✅ ¡Tutor localizado en la red! Se vinculará directamente.</span>";
            }
        } else {
            // TUTOR NUEVO
            tutorExpressExistenteId = null;
            await gestionarFolioAutomatico(null, 'inputFolioTutorExpress', 'statusFolioTutorExpress');

            if (msjEl) {
                msjEl.innerHTML = "<span class='text-success'>✅ CURP Verificada (Tutor Nuevo)</span>";
            }
        }

    } catch (err) {
        console.error("❌ Error al verificar CURP de tutor:", err.message);
        if (statusEl) {
            statusEl.className = 'text-warning fw-bold mt-1';
            statusEl.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i> ERROR DE CONEXIÓN CON EXPEDIENTES';
        }
    }
}

/**
 * 5. Integración con Edge Function / RENAPO
 */
async function autocompletarHomoclaveRenapoTutor() {
    const btn = document.getElementById('btnAutoHomoTutor');
    const msj = document.getElementById('msjHomoclaveAutoTutor');
    const inputHomo = document.getElementById('tutExpCurpHomo');

    const nombres = document.getElementById('tutExpNombre')?.value.trim().toUpperCase() || "";
    const apellidoPaterno = document.getElementById('tutExpPaterno')?.value.trim().toUpperCase() || "";
    const apellidoMaterno = document.getElementById('tutExpMaterno')?.value.trim().toUpperCase() || "";
    const fechaNacimiento = document.getElementById('tutExpFecha')?.value || ""; 
    const generoFull = document.getElementById('tutExpGenero')?.value || "";
    const estadoSelect = document.getElementById('tutExpEstado');
    const estadoTexto = estadoSelect ? estadoSelect.options[estadoSelect.selectedIndex].text.toUpperCase() : "";

    if (!nombres || !apellidoPaterno || !fechaNacimiento) {
        if (msj) msj.innerHTML = "<span class='text-danger'>⚠️ Completa los datos marcados con * primero.</span>";
        return;
    }

    if (btn) btn.disabled = true;
    if (msj) msj.innerHTML = "<span class='text-primary'>🔍 Verificando en RENAPO...</span>";

    try {
        const clienteSupabase = window.fisioNet || window.supabase;
        const { data, error } = await clienteSupabase.functions.invoke('validar-curp', {
            body: { 
                nombres, 
                apellidoPaterno, 
                apellidoMaterno, 
                fechaNacimiento, 
                genero: (generoFull === 'HOMBRE') ? 'H' : 'M', 
                estado: estadoTexto 
            }
        });

        if (error) throw error;

        if (data.error || !data.curp) {
            if (msj) msj.innerHTML = "<span class='text-danger'>❌ No se encontró la CURP en RENAPO.</span>";
            return;
        }

        const homoclaveExtraida = data.curp.substring(16, 18).toUpperCase(); 
        if (inputHomo) inputHomo.value = homoclaveExtraida;

        await evaluarCurpHomoclaveTutorExpress();

    } catch (err) {
        console.error("❌ Error en RENAPO Tutor:", err);
        if (msj) msj.innerHTML = `<span class='text-danger'>⚠️ ${err.message || 'Error de conexión.'}</span>`;
    } finally {
        if (btn) btn.disabled = false;
    }
}

/**
 * 6. Guardado e Inyección Final del Tutor al Formulario de la Orden/Estudio
 */
async function guardarTutorExpress() {
    const nombre = document.getElementById('tutExpNombre')?.value.trim().toUpperCase();
    const paterno = document.getElementById('tutExpPaterno')?.value.trim().toUpperCase();
    const materno = document.getElementById('tutExpMaterno')?.value.trim().toUpperCase() || "";
    const fechaNac = document.getElementById('tutExpFecha')?.value;
    const genero = document.getElementById('tutExpGenero')?.value;
    const estado = document.getElementById('tutExpEstado')?.value;
    const tel = document.getElementById('tutExpTel')?.value.trim();
    const email = document.getElementById('tutExpEmail')?.value.trim().toLowerCase() || null;
    
    const curpBase = document.getElementById('tutExpCurpBase')?.value.trim().toUpperCase() || "";
    const curpHomo = document.getElementById('tutExpCurpHomo')?.value.trim().toUpperCase() || "";
    const curpCompleta = (curpBase + curpHomo).length === 18 ? (curpBase + curpHomo) : null;

    if (!nombre || !paterno || !fechaNac || !tel || tel.length < 10) {
        alert("⚠️ Por favor completa los campos obligatorios (*): Nombre, A. Paterno, Fecha Nac. y Teléfono a 10 dígitos.");
        return;
    }

    try {
        const { data: { user } } = await fisioNet.auth.getUser();
        const clinicaId = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');

        let tutorFinalId = tutorExpressExistenteId;
        let nombreCompleto = `${nombre} ${paterno} ${materno}`.trim();
        let folioInfoMensaje = "";

        // Búsqueda anti-duplicados por CURP o Nombre + Fecha
        if (!tutorFinalId && curpCompleta) {
            const { data: tutorExiste } = await fisioNet
                .from('pacientes_maestros')
                .select('id')
                .eq('curp', curpCompleta)
                .maybeSingle();
            if (tutorExiste) tutorFinalId = tutorExiste.id;
        }

        if (!tutorFinalId) {
            const { data: tutorNombreExiste } = await fisioNet
                .from('pacientes_maestros')
                .select('id')
                .eq('nombre', nombre)
                .eq('apellido_paterno', paterno)
                .eq('fecha_nacimiento', fechaNac)
                .maybeSingle();
            if (tutorNombreExiste) tutorFinalId = tutorNombreExiste.id;
        }

        // CASO A: EL TUTOR YA EXISTE (Se reautoriza/actualiza)
        if (tutorFinalId) {
            await fisioNet.from('pacientes_maestros').update({
                telefono: tel,
                correo_electronico: email
            }).eq('id', tutorFinalId);

            const { data: expExistente } = await fisioNet
                .from('expedientes_clinicos')
                .select('folio_personalizado')
                .eq('id_paciente', tutorFinalId)
                .eq('id_clinica', clinicaId)
                .maybeSingle();

            if (expExistente) {
                folioInfoMensaje = `Expediente en sede: ${expExistente.folio_personalizado}`;
            } else {
                const datosFolio = await gestionarFolioAutomatico(null, 'inputFolioTutorExpress', 'statusFolioTutorExpress');
                const folioAsignado = datosFolio?.folio || null;
                const consecutivoNum = datosFolio?.numero_consecutivo || 0;

                await fisioNet.from('expedientes_clinicos').insert([{
                    id_paciente: tutorFinalId,
                    id_clinica: clinicaId,
                    folio_personalizado: folioAsignado,
                    numero_consecutivo: consecutivoNum,
                    estado_expediente: 'ACTIVO'
                }]);

                await fisioNet.from('pacientes_maestros').update({
                    numero_expediente_sede: folioAsignado
                }).eq('id', tutorFinalId);

                folioInfoMensaje = `Nuevo expediente en sede asignado: ${folioAsignado}`;
            }

            const { data: vinculoExistente } = await fisioNet
                .from('vinculos_clinicos')
                .select('id')
                .eq('paciente_id', tutorFinalId)
                .eq('id_clinica', clinicaId)
                .maybeSingle();

            if (!vinculoExistente) {
                await fisioNet.from('vinculos_clinicos').insert([{
                    paciente_id: tutorFinalId,
                    profesional_id: user?.id,
                    id_clinica: clinicaId,
                    rol_en_relacion: 'OPERATIVO',
                    estado_vinculo: 'ACTIVO'
                }]);
            }
        } 
        // CASO B: TUTOR NUEVO ABSOLUTO
        else {
            let folioAsignado = document.getElementById('inputFolioTutorExpress')?.value;
            let consecutivoNum = 0;

            if (!folioAsignado) {
                const datosFolio = await gestionarFolioAutomatico(null, 'inputFolioTutorExpress', 'statusFolioTutorExpress');
                folioAsignado = datosFolio?.folio || null;
                consecutivoNum = datosFolio?.numero_consecutivo || 0;
            } else {
                const partes = folioAsignado.split('-');
                consecutivoNum = parseInt((partes[partes.length - 1] || "0").replace(/\D/g, ''), 10) || 0;
            }

            const payloadTutor = {
                nombre: nombre,
                apellido_paterno: paterno,
                apellido_materno: materno,
                fecha_nacimiento: fechaNac,
                genero: genero,
                estado_nacimiento: estado,
                curp: curpCompleta,
                telefono: tel,
                correo_electronico: email,
                creado_por: user?.id,
                id_clinica_origen: clinicaId,
                nombre_clinica: localStorage.getItem('nombre_clinica'),
                es_menor_edad: false,
                acceso_red_activo: true,
                fecha_registro: new Date().toISOString()
            };

            const { data: tutorInsertado, error: errTutor } = await fisioNet
                .from('pacientes_maestros')
                .insert([payloadTutor])
                .select();

            if (errTutor) throw errTutor;

            if (tutorInsertado && tutorInsertado.length > 0) {
                tutorFinalId = tutorInsertado[0].id;

                await fisioNet.from('expedientes_clinicos').insert([{
                    id_paciente: tutorFinalId,
                    id_clinica: clinicaId,
                    folio_personalizado: folioAsignado,
                    numero_consecutivo: consecutivoNum,
                    estado_expediente: 'ACTIVO'
                }]);

                await fisioNet.from('vinculos_clinicos').insert([{
                    paciente_id: tutorFinalId,
                    profesional_id: user?.id,
                    id_clinica: clinicaId,
                    rol_en_relacion: 'OPERATIVO',
                    estado_vinculo: 'ACTIVO'
                }]);

                folioInfoMensaje = `Nuevo folio asignado: ${folioAsignado || 'S/N'}`;
            }
        }

        // 🎯 INYECCIÓN DIRECTA DE DATOS EN LA INTERFAZ DEL PACIENTE MENOR
        if (tutorFinalId) {
            const inputNombreTutor = document.getElementById('tutor-nombre');
            const inputTelTutor = document.getElementById('tutor-tel');
            const inputEmailTutor = document.getElementById('correo-tutor');
            const inputIdTutor = document.getElementById('idTutorSeleccionado');

            if (inputNombreTutor) inputNombreTutor.value = nombreCompleto;
            if (inputTelTutor) inputTelTutor.value = tel;
            if (inputEmailTutor) inputEmailTutor.value = email || "";
            if (inputIdTutor) inputIdTutor.value = tutorFinalId;

            // Recalcular el folio para el paciente menor en la vista principal si aplica
            if (typeof gestionarFolioAutomatico === 'function') {
                await gestionarFolioAutomatico(null, 'inputFolioExpediente', 'statusFolio');
            }

            alert(`✅ ¡Tutor registrado y enlazado!\n📄 ${folioInfoMensaje}`);

            tutorExpressExistenteId = null;
            const modalEl = document.getElementById('modalTutorExpress');
            if (modalEl) {
                const modalInstance = bootstrap.Modal.getInstance(modalEl);
                if (modalInstance) modalInstance.hide();
            }
        }

    } catch (err) {
        console.error("💥 Error al procesar tutor express:", err);
        alert("Error al registrar tutor: " + (err.message || "Error de conexión"));
    }
}

// Delegation global para el input de homoclave en el modal
document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'tutExpCurpHomo') {
        evaluarCurpHomoclaveTutorExpress();
    }
});

window.abrirModalTutorExpress = abrirModalTutorExpress;
window.generarCurpExpressTutor = generarCurpExpressTutor;
window.evaluarCurpHomoclaveTutorExpress = evaluarCurpHomoclaveTutorExpress;
window.autocompletarHomoclaveRenapoTutor = autocompletarHomoclaveRenapoTutor;
window.guardarTutorExpress = guardarTutorExpress;