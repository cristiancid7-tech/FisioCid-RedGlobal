import React from 'react';

const BotonExploracion = ({ protocolo }) => {
  if (!protocolo) return null; // Si no hay protocolo detectado, el botón no se ve

  const manejarClick = () => {
    // Aquí es donde abriremos el modal con la info de Sunnybrook o Lumbar
    alert(`Cargando apoyo para: ${protocolo.titulo}`);
    console.log("Datos de exploración:", protocolo.exploracion);
  };

  return (
    <button 
      onClick={manejarClick}
      className="bg-blue-600 text-white p-2 rounded-lg shadow-lg animate-pulse"
    >
      💡 Apoyo para Exploración de {protocolo.titulo}
    </button>
  );
};

export default BotonExploracion;