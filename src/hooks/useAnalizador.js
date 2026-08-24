import { useState, useEffect } from 'react';
import { protocolosClinicos } from '../data/protocolos';

export const useAnalizador = (textoBusqueda) => {
  const [protocoloActivo, setProtocoloActivo] = useState(null);

  useEffect(() => {
    if (!textoBusqueda) {
      setProtocoloActivo(null);
      return;
    }

    const textoMinusculas = textoBusqueda.toLowerCase();
    
    // Buscamos si alguna palabra clave coincide
    const encontrado = protocolosClinicos.find(protocolo => 
      protocolo.triggers.some(trigger => textoMinusculas.includes(trigger))
    );

    setProtocoloActivo(encontrado || null);
  }, [textoBusqueda]);

  return protocoloActivo;
};