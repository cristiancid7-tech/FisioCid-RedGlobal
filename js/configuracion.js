document.addEventListener('DOMContentLoaded', () => {
    const mensaje = sessionStorage.getItem('mensaje_bloqueo');
    if (mensaje) {
        alert(mensaje);
        sessionStorage.removeItem('mensaje_bloqueo'); 
    }
});

document.addEventListener('DOMContentLoaded', async () => {

    const { data: { user } } = await fisioNet.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

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
            const inputCedula = document.getElementById('cedulaProf');
            const inputEspecialidad = document.getElementById('especialidad');

            inputNombre.value = perfil.nombre_completo || '';
            inputCedula.value = perfil.cedula_profesional || '';
            inputEspecialidad.value = perfil.especialidad || '';
            document.getElementById('institucionEgreso').value = perfil.institucion_egreso || '';

            // 🛡️ CANDADO LEGAL: Bloqueo de Identidad Profesional
            if (perfil.cedula_profesional && perfil.cedula_profesional.trim() !== "") {
                inputCedula.disabled = true;
                inputEspecialidad.disabled = true;

                if (typeof mostrarAvisoCandadoLegal === "function") {
                    mostrarAvisoCandadoLegal();
                }
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
// 4. GUARDADO DE CONFIGURACIÓN Y PDF EN SUPABASE
// =========================================================================
document.getElementById('formConfiguracion').addEventListener('submit', async (e) => {
    e.preventDefault();

    const vPrefijo = document.getElementById('conf_prefijo').value.trim().toUpperCase();
    const vSede = document.getElementById('conf_sede').value.trim().toUpperCase();
    const vSep = document.getElementById('conf_separador').value;
    const vNombreClinica = document.getElementById('nombreClinica').value.trim().toUpperCase();
    const vDir = document.getElementById('direccionConsultorio').value.trim().toUpperCase();
    const vTel = document.getElementById('telefonoContacto').value.trim();
    const vColor = document.getElementById('colorTema').value;
    const vLogo = document.getElementById('logoUrl').value.trim();
    const vEspecialidad = document.getElementById('especialidad').value;
    const checkAceptado = document.getElementById('checkDeslinde').checked;
    const btn = document.getElementById('btnGuardarConfig');
    const vEntidad = document.getElementById('entidadfederativa').value;
    const vDominio = document.getElementById('dom-empresa').value.trim().toLowerCase();

    // 🖨️ CAPTURA DE VARIABLES DE PDF
    const vFormatoImpresion = document.getElementById('formatoImpresion')?.value || 'CARTA';
    const vFirmaUrl = document.getElementById('firmaUrl')?.value.trim() || '';
    const vModoMembretado = document.getElementById('modoMembretado')?.value || 'DIGITAL';
    const vMostrarVitales = document.getElementById('checkMostrarVitales')?.checked ?? true;
    const vMostrarCIE10 = document.getElementById('checkMostrarCIE10')?.checked ?? true;
    const vMostrarQR = document.getElementById('checkMostrarQR')?.checked ?? true;
    const vLeyendaPie = document.getElementById('leyendaPie')?.value.trim().toUpperCase() || '';

    if (!checkAceptado) return alert("Debes aceptar el deslinde.");

    const regexDominio = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    if (vDominio && !regexDominio.test(vDominio)) {
        return alert("❌ El dominio no es válido. Debe tener una extensión válida como '.com', '.net', '.mx', etc. (Ejemplo: fisiocid.com)");
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> GUARDANDO...';

    const { data: { user } } = await fisioNet.auth.getUser();

    try {
        // 🚀 A. ACTUALIZAR PERFIL PROFESIONAL (DATOS + PDF)
        const especialidadesExtra = [];
        document.querySelectorAll('#listaEspecialidades > div').forEach(div => {
            const num = div.querySelector('.input-ced-ext').value.trim();
            const nom = div.querySelector('.input-nom-ext').value.trim();
            if (num || nom) especialidadesExtra.push({ numero: num, especialidad: nom });
        });

        const { error: errPerfil } = await fisioNet
            .from('perfiles_profesionales')
            .update({
                nombre_completo: document.getElementById('nombreProfesional').value.trim().toUpperCase(),
                cedula_profesional: document.getElementById('cedulaProf').value.trim(),
                institucion_egreso: document.getElementById('institucionEgreso').value.trim().toUpperCase(),
                especialidad: vEspecialidad,
                cedulas_adicionales: especialidadesExtra,
                deslinde_aceptado: checkAceptado,
                fecha_deslinde: new Date().toISOString(),
                formato_impresion: vFormatoImpresion,
                firma_digital_url: vFirmaUrl
            })
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

        // 🚀 B. UPSERT CLÍNICA
        const { data: nuevaClinica, error: errClinica } = await fisioNet
            .from('clinicas')
            .upsert({
                id_dueno: user.id,
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
            }, { onConflict: 'id_dueno' })
            .select()
            .single();

        if (errClinica) throw new Error("Error en Clínica: " + errClinica.message);

        // 🚀 C. SINCRONIZAR LOCALSTORAGE PARA ACCESO RÁPIDO EN IMPRESIÓN
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

            // 🖨️ LOCALSTORAGE PARA EL GENERADOR DE PDF (window.generarPDF)
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