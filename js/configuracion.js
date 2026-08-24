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

       if (perfil) {
            const inputNombre = document.getElementById('nombreProfesional');
            const inputCedula = document.getElementById('cedulaProf');
            const inputEspecialidad = document.getElementById('especialidad');

            // Asignamos valores iniciales
            inputNombre.value = perfil.nombre_completo || '';
            inputCedula.value = perfil.cedula_profesional || '';
            inputEspecialidad.value = perfil.especialidad || '';
            document.getElementById('institucionEgreso').value = perfil.institucion_egreso || '';

            // 🛡️ CANDADO LEGAL: Bloqueo de Identidad Profesional para evitar alteraciones
            if (perfil.cedula_profesional && perfil.cedula_profesional.trim() !== "") {
              //  inputNombre.disabled = true;
                inputCedula.disabled = true;
                inputEspecialidad.disabled = true;

                // Inyectamos el aviso monetizado y legal en la UI
                if (typeof mostrarAvisoCandadoLegal === "function") {
                    mostrarAvisoCandadoLegal();
                }
            }

            // Cargar postgrados o cédulas adicionales si existen
            if (perfil.cedulas_adicionales && Array.isArray(perfil.cedulas_adicionales)) {
                const contenedor = document.getElementById('listaEspecialidades');
                contenedor.innerHTML = ''; 
                perfil.cedulas_adicionales.forEach(c => {
                    agregarCampoEspecialidad(c.numero, c.especialidad);
                });
            }
            
            document.getElementById('checkDeslinde').checked = perfil.deslinde_aceptado || false;
        }
        if (clinica) {
            document.getElementById('nombreClinica').value = clinica.nombre_clinica || '';
            document.getElementById('telefonoContacto').value = clinica.telefono_contacto || '';
            document.getElementById('direccionConsultorio').value = clinica.direccion || '';
            document.getElementById('entidadfederativa').value = clinica.entidad_federativa || "";
            //document.getElementById('dom-empresa').value = clinica.dominio_corporativo || '';
            document.getElementById('conf_prefijo').value = clinica.folio_prefijo || 'FC';
            document.getElementById('conf_sede').value = clinica.folio_sede || 'MIA';
            document.getElementById('conf_separador').value = clinica.folio_separador || '-';

    // 🛡️ CANDADO TOTAL DEL DOMINIO EMPRESA
            const inputDom = document.getElementById('dom-empresa');
            inputDom.value = clinica.dominio_corporativo || '';

    if (clinica.dominio_corporativo && clinica.dominio_corporativo.trim() !== "") {
        inputDom.disabled = true;
        // Opcional: Le cambiamos el color de fondo para que se note bloqueado de forma elegante
        inputDom.style.backgroundColor = "#e2e8f0"; 
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
        }

    } catch (error) {
        console.error("Error al cargar configuración:", error);
    }
});

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

document.getElementById('formConfiguracion').addEventListener('submit', async (e) => {
    e.preventDefault();

    // --- RECOLECCIÓN DE VARIABLES (No olvides estas líneas) ---
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


    if (!checkAceptado) return alert("Debes aceptar el deslinde.");
const regexDominio = /^[a-z0-9.-]+$/;
    if (vDominio && !regexDominio.test(vDominio)) {
        return alert("❌ El dominio no es válido. No uses espacios, mayúsculas, ni caracteres como @ o $.");
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> GUARDANDO...';

    const { data: { user } } = await fisioNet.auth.getUser();

    try {
        // 🚀 A. ACTUALIZAR PERFIL PROFESIONAL
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
                fecha_deslinde: new Date().toISOString()
            })
            .eq('id', user.id);

        if (errPerfil) throw new Error("Error en Perfil: " + errPerfil.message);

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
                folio_separador: vSep,
                estado: true,
                entidad_federativa: vEntidad
            }, { onConflict: 'id_dueno' })
                .select()
                .single();

        if (errClinica) throw new Error("Error en Clínica: " + errClinica.message);

    // 🚀 C. SINCRONIZAR LOCALSTORAGE (Actualización en tiempo real)
        if (nuevaClinica) { 
            // 1. IDs de referencia
            localStorage.setItem('id_clinica_activa', nuevaClinica.id); // La que busca tu nuevo Dashboard
            localStorage.setItem('clinica_activa_id', nuevaClinica.id); // Compatibilidad
            localStorage.setItem('fisiocid_id_clinica', nuevaClinica.id);
            
            // 2. Identidad Visual (La clave del color)
            localStorage.setItem('nombre_clinica', nuevaClinica.nombre_clinica);
            localStorage.setItem('clinica_color', nuevaClinica.color_institucional); // Para el Dashboard nuevo
            localStorage.setItem('fisiocid_color', nuevaClinica.color_institucional); // Para scripts viejos
            localStorage.setItem('clinica_logo', nuevaClinica.logo_url);
            localStorage.setItem('dominio_corporativo', nuevaClinica.dominio_corporativo || '');
            // 3. Formato de Folio
            localStorage.setItem('clinica_entidad_federativa', nuevaClinica.entidad_federativa);
            localStorage.setItem('formato_folio', `${vPrefijo}${vSep}${vSede}`);
            
            // 🎯 APLICAR CAMBIO VISUAL INMEDIATO
            // Esto cambia el color en la pantalla actual de configuración
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

function aplicarEfectoCamaleon() {
    const color = localStorage.getItem('fisiocid_color');
    const tipoUnidad = localStorage.getItem('fisiocid_tipo_unidad');

    if (color) {
        // Pintamos elementos clave (botones, headers, bordes)
        document.querySelectorAll('.btn-principal, .header-clinica, .sidebar-active').forEach(el => {
            el.style.backgroundColor = color;
        });
        // Seteamos una variable CSS para uso general
        document.documentElement.style.setProperty('--color-institucional', color);
    }

    // Lógica para mostrar/ocultar Boxes según el tipo de unidad
    if (tipoUnidad === 'CONSULTORIO') {
        // Si es consultorio, ocultamos la complejidad de los boxes/camas
        const areaBoxes = document.getElementById('area-gestion-recursos');
        if (areaBoxes) areaBoxes.style.display = 'none';
    }
}
const actualizarVistaPrevia = () => {
    // Jalamos los valores y les aplicamos mayúsculas a fuerza con JS
    const prefijo = (document.getElementById('conf_prefijo').value || 'FC').toUpperCase();
    const sede = (document.getElementById('conf_sede').value || 'MIA').toUpperCase();
    const separador = document.getElementById('conf_separador').value || '-';
    
    const anio = new Date().getFullYear();
    
    // Actualizamos el cuadro de texto de la vista previa
    const previewElement = document.getElementById('previewFolio');
    if (previewElement) {
        previewElement.innerText = `${prefijo}${separador}${sede}${separador}${anio}${separador}0001`;
    }
};

// Escuchar cambios en los inputs
['conf_prefijo', 'conf_sede', 'conf_separador'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', actualizarVistaPrevia);
});

function aplicarColorEnVivo(nuevoColor) {
    // 1. Cambiamos la variable principal del sistema
    document.documentElement.style.setProperty('--primary', nuevoColor);
    
    // 2. Pintamos el encabezado de los folios (el que acabamos de hacer)
    const headerLegal = document.getElementById('headerFolio');
    if (headerLegal) {
        headerLegal.style.backgroundColor = nuevoColor;
    }
    
    // 3. Opcional: Pintar el texto de la vista previa
    const previewTxt = document.getElementById('previewFolio');
    if (previewTxt) {
        previewTxt.style.color = nuevoColor;
    }
}