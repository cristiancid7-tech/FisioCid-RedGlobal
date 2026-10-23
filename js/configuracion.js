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

    // 💡 INYECTAR AYUDA VISUAL EN EL CAMPO DE DOMINIO PARA EVITAR CONFUSIONES
    const inputDomHelp = document.getElementById('dom-empresa');
    if (inputDomHelp && !document.getElementById('ayudaDominioTexto')) {
        const spanAyuda = document.createElement('small');
        spanAyuda.id = 'ayudaDominioTexto';
        spanAyuda.style.cssText = "display: block; color: #2563eb; font-weight: 700; font-size: 0.75rem; margin-top: 4px;";
        spanAyuda.innerHTML = "💡 <strong>¿Para qué es esto?</strong> Este dominio servirá para vincular a tu equipo de Staff y Colaboradores con correo propio (Ejemplo: <em>mi-clinica.com</em> o <em>rehabilitacion-tehuacan.mx</em>). <u>No uses 'fisiocid.com'</u>.";
        inputDomHelp.parentNode.insertBefore(spanAyuda, inputDomHelp.nextSibling);
    }

    try {
        const [perfilRes, clinicaRes] = await Promise.all([
            fisioNet.from('perfiles_profesionales').select('*').eq('id', user.id).single(),
            fisioNet.from('clinicas').select('*').eq('id_dueno', user.id).maybeSingle()
        ]);

        const perfil = perfilRes.data;
        const clinica = clinicaRes.data;


      // =========================================================================
        // 1. CARGA Y LLENADO DEL PERFIL PROFESIONAL
        // =========================================================================
        if (perfil) {
            const inputNombre = document.getElementById('nombreProfesional');
            const inputTelefono = document.getElementById('telefonoContacto');
            const inputInstitucion = document.getElementById('institucionEgreso');
            const inputCedula = document.getElementById('cedulaProf');
            const inputEspecialidad = document.getElementById('especialidad');

            inputNombre.value = perfil.nombre_completo || '';
            if (inputTelefono) inputTelefono.value = perfil.telefono_contacto || '';
            if (inputInstitucion) inputInstitucion.value = perfil.institucion_egreso || '';
            inputCedula.value = perfil.cedula_profesional || '';
            if (inputEspecialidad) inputEspecialidad.value = perfil.especialidad || '';

            // 🔒 EVALUACIÓN DEL BLOQUEO DE IDENTIDAD DEFINITIVO
            if (perfil.identidad_confirmada === true) {
                // Bloqueo total de campos sensibles
                [inputNombre, inputTelefono, inputInstitucion, inputCedula, inputEspecialidad].forEach(input => {
                    if (input) {
                        input.disabled = true;
                        input.style.backgroundColor = "#e2e8f0";
                        input.style.cursor = "not-allowed";
                        input.title = "Identidad validada y bloqueada. Contacta a soporte para cambios extraordinarios.";
                    }
                });

                // Inyectar insignia de bloqueo
                mostrarAvisoCandadoIdentidad(true);

            } else {
                // Permitir 1 oportunidad de corrección con aviso visual
                mostrarAvisoCandadoIdentidad(false);
            }

            // Cargar cédulas adicionales
            if (perfil.cedulas_adicionales && Array.isArray(perfil.cedulas_adicionales)) {
                const contenedor = document.getElementById('listaEspecialidades');
                contenedor.innerHTML = ''; 
                perfil.cedulas_adicionales.forEach(c => {
                    agregarCampoEspecialidad(c.numero, c.especialidad);
                });
            }
            
            document.getElementById('checkDeslinde').checked = perfil.deslinde_aceptado || false;

            // 🖨️ CARGA DE OPCIONES DE PDF DEL PERFIL
            if (document.getElementById('formatoImpresion')) {
                document.getElementById('formatoImpresion').value = perfil.formato_impresion || 'CARTA';
            }
            if (document.getElementById('firmaUrl')) {
                document.getElementById('firmaUrl').value = perfil.firma_digital_url || '';
            }
        }
        // =========================================================================
        // 2. CARGA Y LLENADO DE DATOS DE LA CLÍNICA Y PDF
        // =========================================================================
        if (clinica) {
            document.getElementById('nombreClinica').value = clinica.nombre_clinica || '';
            document.getElementById('telefonoContacto').value = clinica.telefono_contacto || '';
            document.getElementById('direccionConsultorio').value = clinica.direccion || '';
            document.getElementById('entidadfederativa').value = clinica.entidad_federativa || "";

            const inputPrefijo = document.getElementById('conf_prefijo');
            const inputSede = document.getElementById('conf_sede');
            const inputSeparador = document.getElementById('conf_separador');

            inputPrefijo.value = clinica.folio_prefijo || 'FC';
            inputSede.value = clinica.folio_sede || 'MIA';
            inputSeparador.value = clinica.folio_separador || '-';

            // 🛡️ CANDADO LEGAL DE FOLIO
            if (clinica.folio_confirmado === true) {
                inputPrefijo.disabled = true;
                inputSede.disabled = true;
                inputSeparador.disabled = true;

                inputPrefijo.style.backgroundColor = "#e2e8f0";
                inputSede.style.backgroundColor = "#e2e8f0";
                inputSeparador.style.backgroundColor = "#e2e8f0";
                inputPrefijo.title = "Formato de folio bloqueado para preservar la trazabilidad legal del expediente.";
            } else {
                inputPrefijo.disabled = false;
                inputSede.disabled = false;
                inputSeparador.disabled = false;
                inputPrefijo.style.backgroundColor = "#ffffff";
                inputSede.style.backgroundColor = "#ffffff";
                inputSeparador.style.backgroundColor = "#ffffff";
            }

            const inputDom = document.getElementById('dom-empresa');
            if (inputDom) {
                inputDom.value = clinica.dominio_corporativo || '';
                if (clinica.dominio_corporativo && clinica.dominio_corporativo.trim() !== "") {
                    inputDom.disabled = true;
                    inputDom.style.backgroundColor = "#e2e8f0"; 
                }
            }

            if (typeof actualizarVistaPrevia === "function") {
                actualizarVistaPrevia();
            }

            if (clinica.color_institucional) {
                document.getElementById('colorTema').value = clinica.color_institucional;
                document.documentElement.style.setProperty('--primary', clinica.color_institucional);
            }
            
            if (clinica.logo_url) {
                document.getElementById('logoUrl').value = clinica.logo_url;
                mostrarPreview(clinica.logo_url);
            }

            // 🖨️ CARGA DE CONFIGURACIÓN JSONB DEL PDF (SI EXISTE)
            if (clinica.config_pdf) {
                const conf = clinica.config_pdf;
                if (document.getElementById('modoMembretado')) document.getElementById('modoMembretado').value = conf.modo_membretado || 'DIGITAL';
                if (document.getElementById('checkMostrarVitales')) document.getElementById('checkMostrarVitales').checked = conf.mostrar_vitales !== false;
                if (document.getElementById('checkMostrarCIE10')) document.getElementById('checkMostrarCIE10').checked = conf.mostrar_cie10 !== false;
                if (document.getElementById('checkMostrarQR')) document.getElementById('checkMostrarQR').checked = conf.mostrar_qr !== false;
                if (document.getElementById('leyendaPie')) document.getElementById('leyendaPie').value = conf.leyenda_pie || '';
            }
        }

    } catch (error) {
        console.error("Error al cargar configuración:", error);
    }
});

// =========================================================================
// 3. FUNCIONES AUXILIARES Y PREVISUALIZACIONES
// =========================================================================

function mostrarAvisoCandadoIdentidad(estaBloqueado) {
    if (document.getElementById('avisoCandadoIdentidad')) return;

    const inputNombre = document.getElementById('nombreProfesional');
    if (!inputNombre) return;

    // Buscamos la fila (.row) que contiene las dos columnas de inputs
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

    // Lo insertamos justo ARRIBA de toda la fila de los inputs
    contenedorFila.parentNode.insertBefore(divFilaAviso, contenedorFila);
}

function agregarCampoEspecialidad(numero = "", nombre = "") {
    const contenedor = document.getElementById('listaEspecialidades');
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

function verificarEnSep() {
    const num = document.getElementById('cedulaProf').value.trim();
    if(!num) return alert("Ingresa tu cédula principal.");
    window.open(`https://www.buholegal.com/consultasep/?cedula=${num}`, '_blank');
}

function mostrarPreview(url) {
    const img = document.getElementById('previewLogo');
    if (img && url) {
        img.src = url;
        img.classList.remove('d-none');
    }
}

// Previsualización dinámica de URL de logo
document.getElementById('logoUrl')?.addEventListener('input', (e) => {
    mostrarPreview(e.target.value.trim());
});

// =========================================================================
// 4. GUARDADO DE CONFIGURACIÓN Y PDF EN SUPABASE (CON VALIDACIÓN RIGUROSA)
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

    // 🖨️ CAPTURA DE VARIABLES DE PDF
    const vFormatoImpresion = document.getElementById('formatoImpresion')?.value || 'CARTA';
    const vFirmaUrl = document.getElementById('firmaUrl')?.value.trim() || '';
    const vModoMembretado = document.getElementById('modoMembretado')?.value || 'DIGITAL';
    const vMostrarVitales = document.getElementById('checkMostrarVitales')?.checked ?? true;
    const vMostrarCIE10 = document.getElementById('checkMostrarCIE10')?.checked ?? true;
    const vMostrarQR = document.getElementById('checkMostrarQR')?.checked ?? true;
    const vLeyendaPie = document.getElementById('leyendaPie')?.value.trim().toUpperCase() || '';

    // =========================================================================
    // 🚨 1. ADUANA DE VALIDACIÓN DE CAMPOS VACÍOS (CON ENFOQUE Y SHAKE)
    // =========================================================================
    if (!vNombreProf) {
        return destacarCampoRequerido(elNombreProf, "Por favor escribe tu Nombre Completo Profesional.");
    }
    if (!vCedulaProf) {
        return destacarCampoRequerido(elCedulaProf, "Por favor ingresa tu Cédula Profesional principal.");
    }
    if (!vEspecialidad) {
        return destacarCampoRequerido(elEspecialidad, "Selecciona tu Especialidad Profesional.");
    }
    if (!vNombreClinica) {
        return destacarCampoRequerido(elNombreClinica, "Escribe el Nombre Comercial de tu Clínica o Consultorio.");
    }
    if (!vDir) {
        return destacarCampoRequerido(elDir, "Ingresa la Dirección física de tu consultorio.");
    }
    if (!vTel) {
        return destacarCampoRequerido(elTel, "Ingresa un Teléfono de Contacto oficial.");
    }
    if (!vEntidad) {
        return destacarCampoRequerido(elEntidad, "Selecciona el Estado / Entidad Federativa donde operas.");
    }
    if (!checkAceptado) {
        return destacarCampoRequerido(elCheckAceptado, "Debes marcar la casilla de Aceptación de Declaración Jurada y Deslinde Legal.");
    }

    // =========================================================================
    // 🌐 2. VALIDACIÓN ESTRICTA DE FORMATO DE DOMINIO
    // =========================================================================
    if (vDominio !== '') {
        const regexDominio = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
        if (!regexDominio.test(vDominio)) {
            return destacarCampoRequerido(elDominio, "El dominio no es válido. Debe incluir una extensión comercial como '.com', '.net', '.mx', etc. (Ejemplo: mi-clinica.com)");
        }
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> VALIDANDO Y GUARDANDO...';

    const { data: { user } } = await fisioNet.auth.getUser();

    try {
        // 🔒 A. CONSULTA DE UNICIDAD DE DOMINIO EN SUPABASE
        if (vDominio !== '') {
            const { data: dominioOcupado, error: errConsultaDom } = await fisioNet
                .from('clinicas')
                .select('id, id_dueno, nombre_clinica')
                .eq('dominio_corporativo', vDominio)
                .neq('id_dueno', user.id) // Ignora si eres tú mismo editando tu clínica
                .maybeSingle();

            if (errConsultaDom) {
                console.error("Error al validar el dominio en la base de datos:", errConsultaDom);
            }

            if (dominioOcupado) {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-save"></i> GUARDAR Y APLICAR CAMBIOS';
                return destacarCampoRequerido(elDominio, `El dominio "${vDominio}" ya se encuentra registrado por otra clínica en la plataforma. Por favor ingresa el dominio propio de tu empresa.`);
            }
        }

        // 🔒 B. CONSULTAR SI EL PERFIL YA FUE SELLADO ANTERIORMENTE
        const { data: perfilActual } = await fisioNet
            .from('perfiles_profesionales')
            .select('identidad_confirmada')
            .eq('id', user.id)
            .single();

        let solicitarSellado = false;

        // Si es la primera vez que guarda (aún no está sellado), pedir confirmación explícita
        if (!perfilActual?.identidad_confirmada) {
            const folioEjemplo = `${vPrefijo}${vSep}${vSede}-${new Date().getFullYear()}-0001`;

            let avisoDefault = "";
            if (vPrefijo === 'FC' || vPrefijo === 'FISIO') {
                avisoDefault = `\n\n⚠️ NOTA: Estás conservando las siglas por defecto ("${vPrefijo}"). Te sugerimos personalizarlas con las iniciales de tu clínica.`;
            }

            const confirmar = confirm(
                `⚠️ ATENCIÓN - CONFIRMACIÓN DE IDENTIDAD Y FOLIO LEGAL:\n\n` +
                `• Nombre: ${vNombreProf}\n` +
                `• Clínica: ${vNombreClinica}\n` +
                `• Folio que emitirán tus recetas: ${folioEjemplo}${avisoDefault}\n\n` +
                `¿Confirmas que la información está escrita correctamente? Una vez guardada, la estructura de folios y datos de identidad quedarán BLOQUEADOS para preservar la validez legal del expediente.`
            );

            if (!confirmar) {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-save"></i> GUARDAR Y APLICAR CAMBIOS';
                return; // Se detiene aquí si el doctor decide cancelar para revisar
            }

            solicitarSellado = true;
        }

        // 🚀 C. PREPARAR Y GUARDAR PERFIL PROFESIONAL
        const especialidadesExtra = [];
        document.querySelectorAll('#listaEspecialidades > div').forEach(div => {
            const num = div.querySelector('.input-ced-ext').value.trim();
            const nom = div.querySelector('.input-nom-ext').value.trim();
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

        // Si aceptó la alerta de confirmación, sellamos la casilla en Supabase
        if (solicitarSellado) {
            payloadPerfil.identidad_confirmada = true;
        }

        const { error: errPerfil } = await fisioNet
            .from('perfiles_profesionales')
            .update(payloadPerfil)
            .eq('id', user.id);

        if (errPerfil) throw new Error("Error en Perfil: " + errPerfil.message);

        // Objeto de configuración avanzada de PDF para la clínica
        const configPdfObjeto = {
            modo_membretado: vModoMembretado,
            mostrar_vitales: vMostrarVitales,
            mostrar_cie10: vMostrarCIE10,
            mostrar_qr: vMostrarQR,
            leyenda_pie: vLeyendaPie
        };

        // =========================================================================
        // 🎯 D. ACTUALIZAR SUCURSAL ACTIVA EN TABLA CLINICAS (CORREGIDO PARA MULTISEDE)
        // =========================================================================
        const idClinicaActiva = localStorage.getItem('id_clinica_activa') || localStorage.getItem('clinica_activa_id');

        if (!idClinicaActiva) {
            throw new Error("No hay una sucursal activa seleccionada para actualizar.");
        }

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
            .eq('id', idClinicaActiva) // 🎯 Filtra únicamente por el ID de la sucursal que estás editando
            .select()
            .single();

        if (errClinica) throw new Error("Error en Clínica: " + errClinica.message);

        // 🚀 E. SINCRONIZAR LOCALSTORAGE PARA ACCESO RÁPIDO
        if (nuevaClinica) { 
            localStorage.setItem('id_clinica_activa', nuevaClinica.id);
            localStorage.setItem('clinica_activa_id', nuevaClinica.id);
            localStorage.setItem('fisiocid_id_clinica', nuevaClinica.id);
            
            localStorage.setItem('nombre_clinica', nuevaClinica.nombre_clinica);
            localStorage.setItem('clinica_color', nuevaClinica.color_institucional);
            localStorage.setItem('fisiocid_color', nuevaClinica.color_institucional);
            localStorage.setItem('clinica_logo', nuevaClinica.logo_url);
            localStorage.setItem('dominio_corporativo', nuevaClinica.dominio_corporativo || '');
            localStorage.setItem('clinica_entidad_federativa', nuevaClinica.entidad_federativa);
            localStorage.setItem('formato_folio', `${vPrefijo}${vSep}${vSede}`);

            // LocalStorage para el generador de PDF
            localStorage.setItem('pdf_formato_papel', vFormatoImpresion);
            localStorage.setItem('pdf_firma_url', vFirmaUrl);
            localStorage.setItem('pdf_modo_membretado', vModoMembretado);
            localStorage.setItem('pdf_mostrar_vitales', vMostrarVitales);
            localStorage.setItem('pdf_mostrar_cie10', vMostrarCIE10);
            localStorage.setItem('pdf_mostrar_qr', vMostrarQR);
            localStorage.setItem('pdf_leyenda_pie', vLeyendaPie);
            
            document.documentElement.style.setProperty('--primary', nuevaClinica.color_institucional);
            document.documentElement.style.setProperty('--color-institucional', nuevaClinica.color_institucional);
        }
        
        alert("✅ CONFIGURACIÓN GUARDADA CON ÉXITO");
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
// 5. EFECTOS VISUALES Y VISTA PREVIA DE FOLIO Y COLOR
// =========================================================================
const actualizarVistaPrevia = () => {
    const prefijo = (document.getElementById('conf_prefijo').value || 'FC').toUpperCase();
    const sede = (document.getElementById('conf_sede').value || 'MIA').toUpperCase();
    const separador = document.getElementById('conf_separador').value || '-';
    
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
    if (headerLegal) {
        headerLegal.style.backgroundColor = nuevoColor;
    }
    
    const previewTxt = document.getElementById('previewFolio');
    if (previewTxt) {
        previewTxt.style.color = nuevoColor;
    }
}

// Auto-completar .com si el usuario olvida poner la extensión
const inputDominio = document.getElementById('dom-empresa');
if (inputDominio) {
    inputDominio.addEventListener('blur', () => {
        let valor = inputDominio.value.trim().toLowerCase();
        if (valor !== '' && !valor.includes('.')) {
            inputDominio.value = valor + '.com';
        }
    });
}

// =========================================================================
// 💡 GENERADOR AUTOMÁTICO DE SIGLAS SEGÚN NOMBRE DE CLÍNICA Y ESTADO
// =========================================================================
function generarSiglasSugeridas(nombreClinica, entidadFederativa) {
    if (!nombreClinica) return { prefijo: 'FC', sede: 'MIA' };

    // Limpiar palabras comunes (de, la, del, san, centro, etc.)
    const palabrasIgnoradas = ['DE', 'LA', 'DEL', 'LOS', 'LAS', 'Y', 'EL', 'S.A.', 'C.V.'];
    const palabras = nombreClinica.toUpperCase().split(' ')
        .filter(p => p.length > 1 && !palabrasIgnoradas.includes(p));

    let prefijo = 'FC';
    if (palabras.length >= 3) {
        prefijo = (palabras[0][0] + palabras[1][0] + palabras[2][0]);
    } else if (palabras.length === 2) {
        prefijo = (palabras[0].substring(0, 2) + palabras[1][0]);
    } else if (palabras.length === 1) {
        prefijo = palabras[0].substring(0, 3);
    }

    // Calcular Sede desde Entidad o Municipio
    let sede = 'MIA';
    if (entidadFederativa) {
        const entClean = entidadFederativa.toUpperCase().trim();
        sede = entClean.substring(0, 3);
    }

    return { prefijo, sede };
}

// Escuchar cambios en el Nombre de la Clínica para autocompletar si no ha sido sellado
document.getElementById('nombreClinica')?.addEventListener('blur', () => {
    const elPrefijo = document.getElementById('conf_prefijo');
    const elSede = document.getElementById('conf_sede');

    // Solo autogenerar si los campos están vacíos o tienen el default estático
    if (!elPrefijo.disabled && (elPrefijo.value === 'FC' || elPrefijo.value === 'FISIO' || elPrefijo.value === '')) {
        const vNombre = document.getElementById('nombreClinica').value.trim();
        const vEntidad = document.getElementById('entidadfederativa').value.trim();
        const sugerencia = generarSiglasSugeridas(vNombre, vEntidad);

        elPrefijo.value = sugerencia.prefijo;
        elSede.value = sugerencia.sede;

        if (typeof actualizarVistaPrevia === "function") {
            actualizarVistaPrevia();
        }
    }
});