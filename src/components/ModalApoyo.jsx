import React, { useState } from 'react';

const ModalApoyo = ({ isOpen, onClose, protocolo }) => {
  const [tab, setTab] = useState('exploracion');

  if (!isOpen || !protocolo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header con gradiente FisioCid */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{protocolo.titulo}</h2>
            <p className="text-blue-100 text-sm opacity-80">{protocolo.categoria} | Soporte de Decisiones</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full transition">✕</button>
        </div>

        {/* Alerta de Seguridad */}
        <div className="bg-amber-50 border-b border-amber-100 p-4 flex items-center gap-3 text-amber-800">
          <span className="text-2xl">⚠️</span>
          <p className="text-sm font-semibold">{protocolo.exploracion.alerta_seguridad}</p>
        </div>

        {/* Navegación por Pestañas */}
        <div className="flex border-b">
          {['exploracion', 'eco', 'nota'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 font-medium transition-colors ${tab === t ? 'text-blue-700 border-b-2 border-blue-700 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Contenido Dinámico */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {tab === 'exploracion' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-gray-800 mb-3 underline decoration-blue-500">Diferenciación Clínica</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {protocolo.exploracion.diagnostico_diferencial.map((d, i) => (
                    <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <p className="font-bold text-blue-800 mb-1">{d.tipo}</p>
                      <p className="text-sm text-gray-600 italic">"{d.hallazgos}"</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 mb-2">Tests de Oro (Evidencia)</h3>
                <ul className="space-y-2">
                  {protocolo.exploracion.tests_oro.map((test, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span className="font-semibold">{test.nombre}:</span> {test.utilidad}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {tab === 'eco' && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800">Guía Sonocel M3L</h3>
              {protocolo.eco.map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <span className="bg-indigo-600 text-white w-8 h-8 flex items-center justify-center rounded-full text-xs">{i+1}</span>
                  <p className="text-indigo-900 font-medium">{item}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'nota' && (
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              <p className="text-gray-500 mb-2">// Sugerencia de redacción técnica:</p>
              {protocolo.nota_clínica_sugerida}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition">Entendido</button>
        </div>
      </div>
    </div>
  );
};

export default ModalApoyo;