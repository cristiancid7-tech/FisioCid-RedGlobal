import React, { useState } from 'react';
// Importaciones apuntando a tus nuevas carpetas
import { useAnalizador } from '../hooks/useAnalizador'; 
import BotonExploracion from '../components/BotonExploracion';
import ModalApoyo from '../components/ModalApoyo';

const NuevaConsulta = () => {
  const [motivo, setMotivo] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // El hook "escucha" lo que escribes y busca en data/protocolos.js
  const protocoloDetectado = useAnalizador(motivo);

  return (
    <div className="p-6 max-w-4xl mx-auto bg-slate-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-blue-900">FisioCid <span className="text-blue-500">App</span></h1>
        <p className="text-gray-500">Santiago Miahuatlán, Puebla | Registro Clínico</p>
      </header>
      
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="space-y-6">
          
          {/* SECCIÓN: MOTIVO DE CONSULTA */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
              Motivo de la Consulta
            </label>
            <textarea
              className="w-full p-4 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-gray-700"
              rows="5"
              placeholder="Escribe aquí el motivo... (ej: dolor lumbar, parálisis facial, etc.)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
            
            {/* Si el analizador encuentra una coincidencia, muestra el botón */}
            <div className="mt-4 flex justify-end">
              {protocoloDetectado && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-blue-200 transition-all transform hover:scale-105"
                >
                  <span className="text-xl">💡</span>
                  Apoyo para {protocoloDetectado.titulo}
                </button>
              )}
            </div>
          </div>

          {/* VENTANA DE APOYO (MODAL) */}
          <ModalApoyo 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            protocolo={protocoloDetectado} 
          />

          <div className="pt-6 border-t border-gray-100">
            <button className="w-full bg-gray-800 text-white py-4 rounded-xl font-bold hover:bg-gray-900 transition">
              Guardar Nota en FisioCid
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NuevaConsulta;