CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_rol TEXT;
    v_rol_perfil TEXT; 
    v_nombre TEXT;
    v_telefono TEXT;
    v_tipo_perfil TEXT;
    v_nombre_clinica TEXT;
    v_especialidad TEXT;
    v_id_clinica UUID;
BEGIN
  -- ====================================================================
  -- 1. LECTURA DE DATOS 
  -- ====================================================================
  v_tipo_perfil := UPPER(TRIM(new.raw_user_meta_data->>'tipo_perfil')); 
  v_rol := UPPER(TRIM(COALESCE(new.raw_user_meta_data->>'rol_sistema', new.raw_user_meta_data->>'tipo_usuario', 'DOCTOR'))); 
  
  v_rol_perfil := v_rol;

  IF v_tipo_perfil = 'DUENO_CLINICA' THEN
      v_rol := 'ADMIN_SISTEMA';
      v_rol_perfil := 'DOCTOR'; 
  ELSIF v_tipo_perfil = 'INDEPENDIENTE' THEN
      v_rol := 'DOCTOR';
      v_rol_perfil := 'DOCTOR';
  END IF;

  v_nombre := UPPER(TRIM(COALESCE(new.raw_user_meta_data->>'display_name', 'Usuario FisioCid')));
  v_telefono := TRIM(COALESCE(new.raw_user_meta_data->>'telefono_registro', new.raw_user_meta_data->>'phone'));
  v_nombre_clinica := UPPER(TRIM(new.raw_user_meta_data->>'nombre_clinica'));
  v_especialidad := UPPER(TRIM(COALESCE(new.raw_user_meta_data->>'especialidad', 'FISIOTERAPEUTA')));

  -- ====================================================================
  -- 2. CREAR PERFIL BASE (Identidad) --> ¡ESTO APLICA PARA TODOS!
  -- ====================================================================
  INSERT INTO public.perfiles (
    id, nombre_completo, rol_sistema, correo_institucional, telefono
  )
  VALUES (
    new.id, v_nombre, v_rol_perfil, new.email, v_telefono 
  )
  ON CONFLICT (id) DO UPDATE 
  SET rol_sistema = EXCLUDED.rol_sistema,
      nombre_completo = COALESCE(EXCLUDED.nombre_completo, public.perfiles.nombre_completo);

  -- ====================================================================
  -- 🌟 MAGIA AQUÍ: SOLO CREAMOS EL RESTO SI ES DUEÑO O INDEPENDIENTE
  -- ====================================================================
  IF v_tipo_perfil IN ('DUENO_CLINICA', 'INDEPENDIENTE') THEN

      -- 3. CREAR CLÍNICA 
      IF v_nombre_clinica IS NOT NULL THEN
          INSERT INTO public.clinicas (
              id, nombre_clinica, id_dueno, estado, plan_actual, telefono_contacto, especialidad_principal
          )
          VALUES (
              gen_random_uuid(), v_nombre_clinica, new.id, TRUE, 'GRATUITO', v_telefono, v_especialidad
          )
          RETURNING id INTO v_id_clinica;

          UPDATE public.perfiles
          SET id_clinica_principal = v_id_clinica
          WHERE id = new.id;
      END IF;

      -- 4. CREAR PERFIL PROFESIONAL 
      INSERT INTO public.perfiles_profesionales (
          id, nombre_completo, correo_institucional, telefono_contacto, especialidad,
          tipo_profesional, rol, cargo_clinico, nivel_suscripcion, suscripcion_activa,
          demo_usado, fecha_registro, fecha_expiracion, deslinde_aceptado, fecha_deslinde,
          terminos_aceptados, fecha_terminos, version_legales
      )
      VALUES (
          new.id, v_nombre, new.email, v_telefono, v_especialidad,
          v_especialidad, 'ADMIN_SISTEMA', 'ADMINISTRADOR', 'GRATUITO',             
          TRUE, TRUE, NOW(), NOW() + INTERVAL '1 year', TRUE, NOW(), TRUE, NOW(), 'v1.0'                  
      )
      ON CONFLICT (id) DO UPDATE
      SET nombre_completo = EXCLUDED.nombre_completo,
          especialidad = EXCLUDED.especialidad;

      -- 5. CREAR VÍNCULO EN colaboradores_clinica
      IF v_id_clinica IS NOT NULL THEN
          INSERT INTO public.colaboradores_clinica (
              id, id_clinica, id_profesional, rol_sistema, cargo_clinico, estado, fecha_inicio, tipo_vinculo
          )
          VALUES (
              gen_random_uuid(), v_id_clinica, new.id, 'ADMIN_SISTEMA', 'ADMINISTRADOR', 'ACTIVO', NOW(), 'INTERNO'
          );
      END IF;

  END IF; -- 🟢 Fin del bloque exclusivo para dueños

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;