// src/components/instituciones/ModalAuditoria.jsx
import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Download,
  Loader2,
  X
} from 'lucide-react';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { sileo } from '../sileo';
import { descargarLibro, formatearFechaHora, hojaDesdeObjetos } from '../../utils/excel';

const ModalAuditoria = ({ institucion, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const q = query(
      collection(db, 'auditoria'), 
      where('institucionId', '==', institucion.id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logData = [];
      snapshot.forEach(doc => logData.push({ id: doc.id, ...doc.data() }));
      logData.sort((a, b) => (b.fecha?.toMillis() || 0) - (a.fecha?.toMillis() || 0));
      setLogs(logData);
      setLoading(false);
    }, (error) => {
      console.error("Error cargando logs:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [institucion.id]);

  const logsFiltrados = logs.filter(log => {
    if (!log.fecha) return true;
    const logDate = log.fecha.toDate();
    logDate.setHours(0,0,0,0);
    
    if (fechaDesde) {
      const desde = new Date(fechaDesde + 'T00:00:00');
      if (logDate < desde) return false;
    }
    if (fechaHasta) {
      const hasta = new Date(fechaHasta + 'T00:00:00');
      if (logDate > hasta) return false;
    }
    return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = logsFiltrados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(logsFiltrados.length / itemsPerPage);

  const exportarExcel = () => {
    try {
      const dataToExport = logsFiltrados.map(log => ({
        Fecha: formatearFechaHora(log.fecha),
        Acción: log.accion,
        Detalles: log.detalles,
        Usuario: log.usuario
      }));
      descargarLibro(
        [{ nombre: 'Auditoría', hoja: hojaDesdeObjetos(dataToExport) }],
        `Auditoria_${institucion.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
      );
    } catch(e) {
      sileo.error({ title: 'Error al exportar', description: 'No se pudo generar el archivo Excel.' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <ClipboardList className="mr-3 text-indigo-600" size={28} />
              Auditoría de Movimientos
            </h2>
            <p className="text-sm text-gray-500 mt-1">Historial de acciones en: <strong>{institucion.nombre}</strong></p>
          </div>
          <div className="flex space-x-2">
            <button onClick={exportarExcel} disabled={logsFiltrados.length === 0} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold text-sm transition-colors">
              <Download size={16} className="mr-2" /> Excel
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex space-x-4 mb-4 shrink-0 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Desde:</label>
            <input type="date" value={fechaDesde} onChange={e => {setFechaDesde(e.target.value); setCurrentPage(1);}} className="w-full mt-1 p-2 border rounded text-sm outline-none"/>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Hasta:</label>
            <input type="date" value={fechaHasta} onChange={e => {setFechaHasta(e.target.value); setCurrentPage(1);}} className="w-full mt-1 p-2 border rounded text-sm outline-none"/>
          </div>
          <div className="flex items-end pb-1">
            <button onClick={() => {setFechaDesde(''); setFechaHasta(''); setCurrentPage(1);}} className="text-sm text-blue-600 font-bold hover:underline">Limpiar Filtros</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {loading ? (
            <div className="text-center py-10"><Loader2 className="animate-spin text-indigo-500 mx-auto" size={32} /></div>
          ) : currentLogs.length === 0 ? (
            <div className="text-center py-10 text-gray-500 font-medium bg-gray-50 rounded-lg">No se encontraron movimientos registrados.</div>
          ) : (
            currentLogs.map(log => (
              <div key={log.id} className="bg-white p-4 rounded-lg border-l-4 border-indigo-500 shadow-sm flex items-start space-x-4">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-gray-800 text-sm">{log.accion}</p>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      {log.fecha?.toDate ? log.fecha.toDate().toLocaleString('es-ES') : 'Reciente'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{log.detalles}</p>
                  <p className="text-xs text-gray-400 mt-2 font-medium">Por: {log.usuario}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 pt-4 border-t flex justify-between items-center shrink-0">
            <span className="text-sm text-gray-500 font-medium">Página {currentPage} de {totalPages}</span>
            <div className="flex space-x-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 text-sm font-bold text-gray-700">Anterior</button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 text-sm font-bold text-gray-700">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalAuditoria;
