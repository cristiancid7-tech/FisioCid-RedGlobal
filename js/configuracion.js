document.addEventListener('DOMContentLoaded', () => {
    const mensaje = sessionStorage.getItem('mensaje_bloqueo');
    if (mensaje) {
        alert(mensaje);
        sessionStorage.removeItem('mensaje_bloqueo'); 
    }
});

// =========================================================================
// 🛠️ FUNCIÓN AUXILIAR: VALIDADOR VISUAL CON ENFOQUE Y PARPADEO
// =========================================================================
function destacarCampoRequerido(elemento, mensajeError) {
    if (!elemento) return;

    // Scroll suave hasta el elemento
    elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
    elemento.focus();

    // Aplicar estilo de error y parpadeo visual
    elemento.style.border = "2px solid #ef4444";
    elemento.style.boxShadow = "0 0 10px rgba(239, 68, 68, 0.5)";
    elemento.classList.add("animate__animated", "animate__shakeX");

    // Quitar la animación al terminar
    setTimeout(() => {
        elemento.classList.remove("animate__animated", "animate__shakeX");
    }, 1000);

    // Limpiar el borde rojo cuando el usuario comience a escribir
    const limpiarEstilo = () => {
        elemento.style.border = "";
        elemento.style.boxShadow = "";
        elemento.removeEventListener('input', limpiarEstilo);
        elemento.removeEventListener('change', limpiarEstilo);
    };
    elemento.addEventListener('input', limpiarEstilo);
    elemento.addEventListener('change', limpiarEstilo);

    alert(`⚠️ CASILLA INCOMPLETA:\n\n${mensajeError}`);
}

document.addEventListener('DOMContentLoaded', async () => {

    const { data: { user } } = await fisioNet.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    const idClinicaActiva = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');

    // 💡 INYECTAR AYUDA VISUAL EN EL CAMPO DE DOMINIO
    const inputDomHelp = document.getElementById('dom-empresa');
    if (inputDomHelp && !document.getElementById('ayudaDominioTexto')) {
        const spanAyuda = document.createElement('small');
        spanAyuda.id = 'ayudaDominioTexto';
        spanAyuda.style.cssText = "display: block; color: #2563eb; font-weight: 700; font-size: 0.75rem; margin-top: 4px;";
        spanAyuda.innerHTML = "💡 <strong>¿Para qué es esto?</strong> Este dominio servirá para vincular a tu equipo de Staff y Colaboradores con correo propio (Ejemplo: <em>mi-clinica.com</em> o <em>rehabilitacion-tehuacan.mx</em>). <u>No uses 'fisiocid.com'</u>.";
        inputDomHelp.parentNode.insertBefore(spanAyuda, inputDomHelp.nextSibling);
    }

    try {
        // 1. CARGA DE IDENTIDAD GLOBAL DEL PERFIL (Siempre por user.id)
        const { data: perfil } = await fisioNet
            .from('perfiles_profesionales')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        // 2. CARGA DE LA CLÍNICA ACTIVA
        let clinica = null;
        if (idClinicaActiva) {
            const { data: clinicaData } = await fisioNet
                .from('clinicas')
                .select('*')
                .eq('id', idClinicaActiva)
                .maybeSingle();
            clinica = clinicaData;
        }

        // Si no se encontró por ID activo, fallback a la primera clínica donde sea dueño
        if (!clinica) {
            const { data: clinicaDueno } = await fisioNet
                .from('clinicas')
                .select('*')
                .eq('id_dueno', user.id)
                .maybeSingle();
            clinica = clinicaDueno;
            if (clinica) localStorage.setItem('id_clinica_activa', clinica.id);
        }

        // 3. CARGA DE CONFIGURACIÓN OPERATIVA EN COLABORADORES_CLINICA
        let colab = null;
        if (clinica) {
            const { data: colabData } = await fisioNet
                .from('colaboradores_clinica')
                .select('*')
                .eq('id_profesional', user.id)
                .eq('id_clinica', clinica.id)
                .maybeSingle();
            colab = colabData;
        }

        // =========================================================================
        // A. PINTAR DATOS DE IDENTIDAD DEL PERFIL PROFESIONAL
        // =========================================================================
        if (perfil) {
            const inputNombre = document.getElementById('nombreProfesional');
            const inputTelefono = document.getElementById('telefonoContacto');
            const inputInstitucion = document.getElementById('institucionEgreso');
            const inputCedula = document.getElementById('cedulaProf');
            const inputEspecialidad = document.getElementById('especialidad');

            if (inputNombre) inputNombre.value = perfil.nombre_completo || '';
            if (inputTelefono) inputTelefono.value = perfil.teléfono_contacto || perfil.telefono_contacto || '';
            if (inputInstitucion) inputInstitucion.value = perfil.institución_egreso || perfil.institucion_egreso || '';
            if (inputCedula) inputCedula.value = perfil.cedula_profesional || '';
            if (inputEspecialidad) inputEspecialidad.value = perfil.especialidad || '';

            // 🔒 Candado de Identidad
            if (perfil.identidad_confirmada === true) {
                [inputNombre, inputTelefono, inputInstitucion, inputCedula, inputEspecialidad].forEach(input => {
                    if (input) {
                        input.disabled = true;
                        input.style.backgroundColor = "#e2e8f0";
                        input.style.cursor = "not-allowed";
                        input.title = "Identidad validada y bloqueada.";
                    }
                });
                mostrarAvisoCandadoIdentidad(true);
            } else {
                mostrarAvisoCandadoIdentidad(false);
            }

            // Cédulas Adicionales
            if (perfil.cedulas_adicionales && Array.isArray(perfil.cedulas_adicionales)) {
                const contenedor = document.getElementById('listaEspecialidades');
                if (contenedor) {
                    contenedor.innerHTML = ''; 
                    perfil.cedulas_adicionales.forEach(c => {
                        agregarCampoEspecialidad(c.numero, c.especialidad);
                    });
                }
            }
            
            const chkDeslinde = document.getElementById('checkDeslinde');
            if (chkDeslinde) chkDeslinde.checked = perfil.deslinde_aceptado || false;

            if (document.getElementById('formatoImpresion')) {
                document.getElementById('formatoImpresion').value = perfil.formato_impresion || 'CARTA';
            }
            if (document.getElementById('firmaUrl')) {
                document.getElementById('firmaUrl').value = perfil.firma_digital_url || '';
            }
        }

        // =========================================================================
        // B. PINTAR DATOS DE LA SEDE ACTIVA (CLINICAS)
        // =========================================================================
        if (clinica) {
            if (document.getElementById('nombreClinica')) document.getElementById('nombreClinica').value = clinica.nombre_clinica || '';
            if (document.getElementById('telefonoContacto') && !document.getElementById('telefonoContacto').value) {
                document.getElementById('telefonoContacto').value = clinica.telefono_contacto || '';
            }
            if (document.getElementById('direccionConsultorio')) document.getElementById('direccionConsultorio').value = clinica.direccion || '';
            if (document.getElementById('entidadfederativa')) document.getElementById('entidadfederativa').value = clinica.entidad_federativa || "";

            const inputPrefijo = document.getElementById('conf_prefijo');
            const inputSede = document.getElementById('conf_sede');
            const inputSeparador = document.getElementById('conf_separador');

            if (inputPrefijo) inputPrefijo.value = clinica.folio_prefijo || 'FC';
            if (inputSede) inputSede.value = clinica.folio_sede || 'MIA';
            if (inputSeparador) inputSeparador.value = clinica.folio_separador || '-';

            // 🛡️ Candado Legal de Folio
            if (clinica.folio_confirmado === true && inputPrefijo) {
                inputPrefijo.disabled = true;
                inputSede.disabled = true;
                inputSeparador.disabled = true;
                inputPrefijo.style.backgroundColor = "#e2e8f0";
                inputSede.style.backgroundColor = "#e2e8f0";
                inputSeparador.style.backgroundColor = "#e2e8f0";
            }

            const inputDom = document.getElementById('dom-empresa');
            if (inputDom) {
                inputDom.value = clinica.dominio_corporativo || '';
                if (clinica.dominio_corporativo && clinica.dominio_corporativo.trim() !== "") {
                    inputDom.disabled = true;
                    inputDom.style.backgroundColor = "#e2e8f0"; 
                }
            }

            if (typeof actualizarVistaPrevia === "function") actualizarVistaPrevia();

            if (clinica.color_institucional) {
                const elColor = document.getElementById('colorTema');
                if (elColor) elColor.value = clinica.color_institucional;
                document.documentElement.style.setProperty('--primary', clinica.color_institucional);
            }
            
            if (clinica.logo_url) {
                const elLogo = document.getElementById('logoUrl');
                if (elLogo) elLogo.value = clinica.logo_url;
                mostrarPreview(clinica.logo_url);
            }

            if (clinica.config_pdf) {
                const conf = clinica.config_pdf;
                if (document.getElementById('modoMembretado')) document.getElementById('modoMembretado').value = conf.modo_membretado || 'DIGITAL';
                if (document.getElementById('checkMostrarVitales')) document.getElementById('checkMostrarVitales').checked = conf.mostrar_vitales !== false;
                if (document.getElementById('checkMostrarCIE10')) document.getElementById('checkMostrarCIE10').checked = conf.mostrar_cie10 !== false;
                if (document.getElementById('checkMostrarQR')) document.getElementById('checkMostrarQR').checked = conf.mostrar_qr !== false;
                if (document.getElementById('leyendaPie')) document.getElementById('leyendaPie').value = conf.leyenda_pie || '';
            }
        }

        // =========================================================================
        // C. PINTAR CONFIGURACIÓN OPERATIVA (COLABORADORES_CLINICA O FALLBACK)
        // =========================================================================
        const elConsultorio = document.getElementById('baseConsultorio');
        const elDomicilio = document.getElementById('baseDomicilio');
        const elIntervalo = document.getElementById('intervaloCita');

        if (colab) {
            if (elConsultorio) elConsultorio.value = colab.costo_consulta_base ?? 0;
            if (elDomicilio) elDomicilio.value = colab.costo_domicilio_base ?? 0;
            if (elIntervalo) elIntervalo.value = colab.intervalo_cita ?? 30;
        } else if (perfil) {
            // Si la sede es nueva y aún no existe fila en colaboradores_clinica, 
            // sugerimos los valores por defecto del perfil
            if (elConsultorio) elConsultorio.value = perfil.costo_consulta_base ?? 0;
            if (elDomicilio) elDomicilio.value = perfil.costo_domicilio_base ?? 0;
            if (elIntervalo) elIntervalo.value = perfil.intervalo_cita ?? 30;
        }

    } catch (error) {
        console.error("Error al cargar configuración:", error);
    }
});

// =========================================================================
// FUNCIONES AUXILIARES Y PREVISUALIZACIONES
// =========================================================================

function mostrarAvisoCandadoIdentidad(estaBloqueado) {
    if (document.getElementById('avisoCandadoIdentidad')) return;

    const inputNombre = document.getElementById('nombreProfesional');
    if (!inputNombre) return;

    const contenedorFila = inputNombre.closest('.row') || inputNombre.closest('.grid') || inputNombre.parentElement;

    const divFilaAviso = document.createElement('div');
    divFilaAviso.id = 'avisoCandadoIdentidad';
    divFilaAviso.className = "row w-100 mx-0 mb-3";

    const estiloBox = estaBloqueado 
        ? "background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569;"
        : "background: #fefce8; border: 1px solid #fde047; color: #854d0e;";

    const textoBox = estaBloqueado
        ? `🔒 <span><strong>IDENTIDAD VERIFICADA Y BLOQUEADA:</strong> Tus datos profesionales están protegidos contra alteraciones. Si requieres corregir algún dato por causa de fuerza mayor, contacta a Soporte FisioCid.</span>`
        : `✏️ <span><strong>OPORTUNIDAD DE CORRECCIÓN ACTIVA:</strong> Revisa tu Nombre, Teléfono e Institución de Egreso. Tienes <u>una sola oportunidad</u> para corregir cualquier error de tecleo antes de que el expediente legal quede sellado.</span>`;

    divFilaAviso.innerHTML = `
        <div class="col-12 px-0">
            <div style="padding: 10px 14px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; gap: 8px; ${estiloBox}">
                ${textoBox}
            </div>
        </div>
    `;

    contenedorFila.parentNode.insertBefore(divFilaAviso, contenedorFila);
}

function agregarCampoEspecialidad(numero = "", nombre = "") {
    const contenedor = document.getElementById('listaEspecialidades');
    if (!contenedor) return;
    const div = document.createElement('div');
    div.className = "d-flex gap-2 mb-2 animate__animated animate__fadeIn";
    div.innerHTML = `
        <input type="text" placeholder="Cédula" class="form-control form-control-sm input-ced-ext" value="${numero}" style="width: 30%;">
        <input type="text" placeholder="Especialidad / Postgrado" class="form-control form-control-sm input-nom-ext" value="${nombre}" style="flex: 1;">
        <button type="button" onclick="this.parentElement.remove()" class="btn btn-outline-danger btn-sm border-0">
            <i class="bi bi-trash"></i>
        </button>
    `;
    contenedor.appendChild(div);
}

//function verificarEnSep() {
//    const num = document.getElementById('cedulaProf').value.trim();
//    if(!num) return alert("Ingresa tu cédula principal.");
 //   window.open(`https://www.buholegal.com/consultasep/?cedula=${num}`, '_blank');
//}

function mostrarPreview(url) {
    const img = document.getElementById('previewLogo');
    if (img && url) {
        img.src = url;
        img.classList.remove('d-none');
    }
}

document.getElementById('logoUrl')?.addEventListener('input', (e) => {
    mostrarPreview(e.target.value.trim());
});

// =========================================================================
// 4. GUARDADO DE CONFIGURACIÓN Y OPERACIÓN POR SEDE (ARQUITECTURA MULTISEDE)
// =========================================================================
document.getElementById('formConfiguracion').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Captura de elementos DOM
    const elNombreProf = document.getElementById('nombreProfesional');
    const elCedulaProf = document.getElementById('cedulaProf');
    const elEspecialidad = document.getElementById('especialidad');
    const elNombreClinica = document.getElementById('nombreClinica');
    const elDir = document.getElementById('direccionConsultorio');
    const elTel = document.getElementById('telefonoContacto');
    const elEntidad = document.getElementById('entidadfederativa');
    const elCheckAceptado = document.getElementById('checkDeslinde');
    const elDominio = document.getElementById('dom-empresa');

    // Extraer valores
    const vNombreProf = elNombreProf.value.trim().toUpperCase();
    const vCedulaProf = elCedulaProf.value.trim();
    const vEspecialidad = elEspecialidad.value.trim();
    const vNombreClinica = elNombreClinica.value.trim().toUpperCase();
    const vDir = elDir.value.trim().toUpperCase();
    const vTel = elTel.value.trim();
    const vEntidad = elEntidad.value.trim();
    const checkAceptado = elCheckAceptado.checked;
    const vDominio = elDominio ? elDominio.value.trim().toLowerCase() : '';

    const vPrefijo = document.getElementById('conf_prefijo').value.trim().toUpperCase();
    const vSede = document.getElementById('conf_sede').value.trim().toUpperCase();
    const vSep = document.getElementById('conf_separador').value;
    const vColor = document.getElementById('colorTema').value;
    const vLogo = document.getElementById('logoUrl').value.trim();
    const btn = document.getElementById('btnGuardarConfig');

    // PDF e Impresión
    const vFormatoImpresion = document.getElementById('formatoImpresion')?.value || 'CARTA';
    const vFirmaUrl = document.getElementById('firmaUrl')?.value.trim() || '';
    const vModoMembretado = document.getElementById('modoMembretado')?.value || 'DIGITAL';
    const vMostrarVitales = document.getElementById('checkMostrarVitales')?.checked ?? true;
    const vMostrarCIE10 = document.getElementById('checkMostrarCIE10')?.checked ?? true;
    const vMostrarQR = document.getElementById('checkMostrarQR')?.checked ?? true;
    const vLeyendaPie = document.getElementById('leyendaPie')?.value.trim().toUpperCase() || '';

    // Operación por Sede
    const vBaseConsultorio = parseFloat(document.getElementById('baseConsultorio')?.value) || 0;
    const vBaseDomicilio = parseFloat(document.getElementById('baseDomicilio')?.value) || 0;
    const vIntervaloCita = parseInt(document.getElementById('intervaloCita')?.value, 10) || 30;

    // 🚨 1. ADUANA DE VALIDACIÓN DE CAMPOS VACÍOS
    if (!vNombreProf) return destacarCampoRequerido(elNombreProf, "Por favor escribe tu Nombre Completo Profesional.");
    if (!vCedulaProf) return destacarCampoRequerido(elCedulaProf, "Por favor ingresa tu Cédula Profesional principal.");
    if (!vEspecialidad) return destacarCampoRequerido(elEspecialidad, "Selecciona tu Especialidad Profesional.");
    if (!vNombreClinica) return destacarCampoRequerido(elNombreClinica, "Escribe el Nombre Comercial de tu Clínica o Consultorio.");
    if (!vDir) return destacarCampoRequerido(elDir, "Ingresa la Dirección física de tu consultorio.");
    if (!vTel) return destacarCampoRequerido(elTel, "Ingresa un Teléfono de Contacto oficial.");
    if (!vEntidad) return destacarCampoRequerido(elEntidad, "Selecciona el Estado / Entidad Federativa donde operas.");
    if (!checkAceptado) return destacarCampoRequerido(elCheckAceptado, "Debes marcar la casilla de Aceptación de Declaración Jurada y Deslinde Legal.");

    if (vDominio !== '') {
        const regexDominio = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
        if (!regexDominio.test(vDominio)) {
            return destacarCampoRequerido(elDominio, "El dominio no es válido. Debe incluir una extensión comercial como '.com', '.net', '.mx', etc.");
        }
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> VALIDANDO Y GUARDANDO...';

    const { data: { user } } = await fisioNet.auth.getUser();

    try {
        // 🔒 CONSULTA DE UNICIDAD DE DOMINIO
        if (vDominio !== '') {
            const { data: dominioOcupado } = await fisioNet
                .from('clinicas')
                .select('id, id_dueno')
                .eq('dominio_corporativo', vDominio)
                .neq('id_dueno', user.id)
                .maybeSingle();

            if (dominioOcupado) {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-save"></i> GUARDAR Y APLICAR CAMBIOS';
                return destacarCampoRequerido(elDominio, `El dominio "${vDominio}" ya se encuentra registrado por otra clínica.`);
            }
        }

        // 🔒 CHECK DE SELLADO
        const { data: perfilActual } = await fisioNet
            .from('perfiles_profesionales')
            .select('identidad_confirmada')
            .eq('id', user.id)
            .single();

        let solicitarSellado = false;
        if (!perfilActual?.identidad_confirmada) {
            const folioEjemplo = `${vPrefijo}${vSep}${vSede}-${new Date().getFullYear()}-0001`;
            const confirmar = confirm(
                `⚠️ ATENCIÓN - CONFIRMACIÓN DE IDENTIDAD Y FOLIO LEGAL:\n\n` +
                `• Nombre: ${vNombreProf}\n` +
                `• Clínica: ${vNombreClinica}\n` +
                `• Folio de recetas: ${folioEjemplo}\n\n` +
                `¿Confirmas que la información está escrita correctamente? Una vez guardada quedará BLOQUEADA para validez legal.`
            );

            if (!confirmar) {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-save"></i> GUARDAR Y APLICAR CAMBIOS';
                return;
            }
            solicitarSellado = true;
        }

        // A. GUARDAR PERFIL PROFESIONAL (IDENTIDAD ÚNICA GLOBAL)
        const especialidadesExtra = [];
        document.querySelectorAll('#listaEspecialidades > div').forEach(div => {
            const num = div.querySelector('.input-ced-ext')?.value.trim();
            const nom = div.querySelector('.input-nom-ext')?.value.trim();
            if (num || nom) especialidadesExtra.push({ numero: num, especialidad: nom });
        });

        const payloadPerfil = {
            nombre_completo: vNombreProf,
            cedula_profesional: vCedulaProf,
            institucion_egreso: document.getElementById('institucionEgreso').value.trim().toUpperCase(),
            especialidad: vEspecialidad,
            cedulas_adicionales: especialidadesExtra,
            deslinde_aceptado: checkAceptado,
            fecha_deslinde: new Date().toISOString(),
            formato_impresion: vFormatoImpresion,
            firma_digital_url: vFirmaUrl
        };

        if (solicitarSellado) payloadPerfil.identidad_confirmada = true;

        const { error: errPerfil } = await fisioNet
            .from('perfiles_profesionales')
            .update(payloadPerfil)
            .eq('id', user.id);

        if (errPerfil) throw new Error("Error en Perfil: " + errPerfil.message);

        // B. GUARDAR DATOS DE LA CLÍNICA ACTIVA
        const idClinicaActiva = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');
        if (!idClinicaActiva) throw new Error("No hay una sucursal activa seleccionada para actualizar.");

        const configPdfObjeto = {
            modo_membretado: vModoMembretado,
            mostrar_vitales: vMostrarVitales,
            mostrar_cie10: vMostrarCIE10,
            mostrar_qr: vMostrarQR,
            leyenda_pie: vLeyendaPie
        };

        const { data: nuevaClinica, error: errClinica } = await fisioNet
            .from('clinicas')
            .update({
                nombre_clinica: vNombreClinica,
                dominio_corporativo: vDominio || null,
                direccion: vDir,
                telefono_contacto: vTel,
                color_institucional: vColor,
                logo_url: vLogo,
                especialidad_principal: vEspecialidad,
                folio_prefijo: vPrefijo,
                folio_sede: vSede,
                folio_confirmado: true,
                folio_separador: vSep,
                estado: true,
                entidad_federativa: vEntidad,
                config_pdf: configPdfObjeto
            })
            .eq('id', idClinicaActiva)
            .select()
            .single();

        if (errClinica) throw new Error("Error en Clínica: " + errClinica.message);

        // C. GUARDAR PRECIOS Y OPERACIÓN EN COLABORADORES_CLINICA (ESPECÍFICO POR SEDE)
        const { data: colabExiste } = await fisioNet
            .from('colaboradores_clinica')
            .select('id')
            .eq('id_profesional', user.id)
            .eq('id_clinica', idClinicaActiva)
            .maybeSingle();

        if (colabExiste) {
            const { error: errColab } = await fisioNet
                .from('colaboradores_clinica')
                .update({
                    costo_consulta_base: vBaseConsultorio,
                    costo_domicilio_base: vBaseDomicilio,
                    intervalo_cita: vIntervaloCita
                })
                .eq('id', colabExiste.id);

            if (errColab) console.error("Error al actualizar colaborador:", errColab);
        } else {
            const { error: errColabIns } = await fisioNet
                .from('colaboradores_clinica')
                .insert([{
                    id_profesional: user.id,
                    id_clinica: idClinicaActiva,
                    costo_consulta_base: vBaseConsultorio,
                    costo_domicilio_base: vBaseDomicilio,
                    intervalo_cita: vIntervaloCita,
                    rol_sistema: 'ADMIN_SISTEMA',
                    estado: 'ACTIVO',
                    tipo_vinculo: 'INTERNO'
                }]);

            if (errColabIns) console.error("Error al crear colaborador:", errColabIns);
        }

        // D. SINCRONIZAR LOCALSTORAGE DE LA SEDE
        if (nuevaClinica) { 
            localStorage.setItem('id_clinica_activa', nuevaClinica.id);
            localStorage.setItem('nombre_clinica', nuevaClinica.nombre_clinica);
            localStorage.setItem('clinica_color', nuevaClinica.color_institucional);
            localStorage.setItem('clinica_logo', nuevaClinica.logo_url);
            localStorage.setItem('intervalo_cita', vIntervaloCita);
            
            document.documentElement.style.setProperty('--primary', nuevaClinica.color_institucional);
        }
        
        alert("✅ CONFIGURACIÓN GUARDADA CON ÉXITO EN ESTA SEDE");
        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error("Fallo al guardar:", error);
        alert("⚠️ " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-save"></i> GUARDAR Y APLICAR CAMBIOS';
    }
});

// =========================================================================
// 5. VISTA PREVIA Y UTILIDADES
// =========================================================================
const actualizarVistaPrevia = () => {
    const prefijo = (document.getElementById('conf_prefijo')?.value || 'FC').toUpperCase();
    const sede = (document.getElementById('conf_sede')?.value || 'MIA').toUpperCase();
    const separador = document.getElementById('conf_separador')?.value || '-';
    const anio = new Date().getFullYear();
    
    const previewElement = document.getElementById('previewFolio');
    if (previewElement) {
        previewElement.innerText = `${prefijo}${separador}${sede}${separador}${anio}${separador}0001`;
    }
};

['conf_prefijo', 'conf_sede', 'conf_separador'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', actualizarVistaPrevia);
});

function aplicarColorEnVivo(nuevoColor) {
    document.documentElement.style.setProperty('--primary', nuevoColor);
    const headerLegal = document.getElementById('headerFolio');
    if (headerLegal) headerLegal.style.backgroundColor = nuevoColor;
    const previewTxt = document.getElementById('previewFolio');
    if (previewTxt) previewTxt.style.color = nuevoColor;
}

const inputDominio = document.getElementById('dom-empresa');
if (inputDominio) {
    inputDominio.addEventListener('blur', () => {
        let valor = inputDominio.value.trim().toLowerCase();
        if (valor !== '' && !valor.includes('.')) {
            inputDominio.value = valor + '.com';
        }
    });
}

function generarSiglasSugeridas(nombreClinica, entidadFederativa) {
    if (!nombreClinica) return { prefijo: 'FC', sede: 'MIA' };

    const palabrasIgnoradas = ['DE', 'LA', 'DEL', 'LOS', 'LAS', 'Y', 'EL', 'S.A.', 'C.V.'];
    const palabras = nombreClinica.toUpperCase().split(' ')
        .filter(p => p.length > 1 && !palabrasIgnoradas.includes(p));

    let prefijo = 'FC';
    if (palabras.length >= 3) prefijo = (palabras[0][0] + palabras[1][0] + palabras[2][0]);
    else if (palabras.length === 2) prefijo = (palabras[0].substring(0, 2) + palabras[1][0]);
    else if (palabras.length === 1) prefijo = palabras[0].substring(0, 3);

    let sede = 'MIA';
    if (entidadFederativa) sede = entidadFederativa.toUpperCase().trim().substring(0, 3);

    return { prefijo, sede };
}

document.getElementById('nombreClinica')?.addEventListener('blur', () => {
    const elPrefijo = document.getElementById('conf_prefijo');
    const elSede = document.getElementById('conf_sede');

    if (elPrefijo && !elPrefijo.disabled && (elPrefijo.value === 'FC' || elPrefijo.value === 'FISIO' || elPrefijo.value === '')) {
        const vNombre = document.getElementById('nombreClinica').value.trim();
        const vEntidad = document.getElementById('entidadfederativa').value.trim();
        const sugerencia = generarSiglasSugeridas(vNombre, vEntidad);

        elPrefijo.value = sugerencia.prefijo;
        elSede.value = sugerencia.sede;

        if (typeof actualizarVistaPrevia === "function") actualizarVistaPrevia();
    }
});