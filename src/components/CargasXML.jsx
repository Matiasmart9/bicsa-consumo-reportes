// src/components/CargasXML.jsx
import React, { useState } from 'react';
import { UploadCloud, Building, Search, FileSpreadsheet, Loader2, Calendar, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useInstituciones, logAuditoria } from '../hooks/useFirebase';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sileo } from './sileo';
import { descargarLibro, formatearFecha, hojaDesdeObjetos } from '../utils/excel';

const CargasXML = ({ userRole }) => {
  const { instituciones, loading, error } = useInstituciones();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroXML, setFiltroXML] = useState('todos');
  const [updatingId, setUpdatingId] = useState(null);

  // 🆕 ESTADOS PARA PAGINACIÓN (Punto 2: 15 items por página)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Permisos: Admin y Contabilidad pueden modificar.
  const canModify = userRole === 'admin' || userRole === 'contabilidad' || userRole === 'usuario';

  // 🆕 RESETEAR PÁGINA A 1 SI CAMBIAN LOS FILTROS
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroXML]);

  // 🆕 FUNCIÓN TOGGLE: Valida que exista fecha de primera carga antes de activar a SÍ
  const handleToggleXML = async (id, nombre, currentVal, fechaPrimeraCarga) => {
    if (!canModify) {
      return sileo.warning({ title: 'Acceso Denegado', description: 'No tienes permisos para modificar el estado de carga XML.' });
    }
    
    const newVal = !currentVal;

    // Validación solicitada: antes de activar ("SÍ"), verificar que tenga fecha
    if (newVal && !fechaPrimeraCarga) {
      return sileo.warning({ 
        title: 'Fecha Requerida', 
        description: `Debe ingresar primero la fecha de la primera carga de XML para "${nombre}" en la columna correspondiente antes de activarla.` 
      });
    }
    
    try {
      setUpdatingId(id);
      const docRef = doc(db, 'instituciones', id);
      
      const updateData = {
        cortaXML: newVal
      };
      
      await updateDoc(docRef, updateData);
      
      // Registrar auditoría
      await logAuditoria(id, 'Carga XML Toggled', `Se cambió estado de carga XML para ${nombre} a: ${newVal ? 'SÍ' : 'NO'}`);
      
      sileo.success({ 
        title: 'Estado actualizado', 
        description: `Carga XML para "${nombre}" establecida en ${newVal ? 'ACTIVA' : 'INACTIVA'}.` 
      });
    } catch (err) {
      console.error(err);
      sileo.error({ title: 'Error de red', description: 'No se pudo actualizar el estado en la base de datos.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleFechaChange = async (id, nombre, fecha) => {
    if (!canModify) {
      return sileo.warning({ title: 'Acceso Denegado', description: 'No tienes permisos para modificar la fecha de carga XML.' });
    }
    
    try {
      const docRef = doc(db, 'instituciones', id);
      await updateDoc(docRef, {
        fechaPrimeraCargaXML: fecha
      });
      
      // Registrar auditoría
      await logAuditoria(id, 'Fecha XML Actualizada', `Primera carga XML para ${nombre} fijada al: ${fecha}`);
      
      sileo.success({ 
        title: 'Fecha registrada', 
        description: `Se registró la fecha de primera carga de XML para "${nombre}".` 
      });
    } catch (err) {
      console.error(err);
      sileo.error({ title: 'Error al guardar', description: 'No se pudo actualizar la fecha.' });
    }
  };

  const exportarExcelXML = () => {
    const listado = institucionesFiltradas.filter(i => i.cortaXML === true);
    
    if (listado.length === 0) {
      return alert("No hay instituciones cargando XML para exportar con los filtros actuales.");
    }

    const data = listado.map((inst, index) => ({
      'Nro': index + 1,
      'Institución': inst.nombre,
      'Plan / Categoría': inst.categoria || 'Sin Categoría',
      'Cargas XML': 'SÍ',
      'Fecha Primera Carga XML': inst.fechaPrimeraCargaXML ? formatearFecha(inst.fechaPrimeraCargaXML) : 'No Especificada',
      'Inicio Contrato': formatearFecha(inst.contrato?.fechaInicio),
      'Vencimiento Contrato': formatearFecha(inst.contrato?.fechaFin)
    }));

    descargarLibro(
      [{ nombre: 'Cargas_XML_BICSA', hoja: hojaDesdeObjetos(data) }],
      `BICSA_Reporte_Cargas_XML_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const institucionesFiltradas = instituciones.filter(inst => {
    const matchSearch = inst.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filtroXML === 'todos') return matchSearch;
    if (filtroXML === 'si') return matchSearch && inst.cortaXML === true;
    if (filtroXML === 'no') return matchSearch && inst.cortaXML !== true;
    
    return matchSearch;
  });

  // 🆕 LÓGICA DE PAGINACIÓN: Obtener los ítems de la página actual (hasta 15)
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = institucionesFiltradas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(institucionesFiltradas.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const totalCargan = instituciones.filter(i => i.cortaXML === true).length;
  const totalNoCarganActivos = instituciones.filter(i => (i.estado === 'activo' || !i.estado) && i.cortaXML !== true).length;

  if (loading && instituciones.length === 0) {
    return (
      <div className="p-6 sm:p-10 bg-slate-50 min-h-screen flex items-center justify-center relative overflow-hidden grid-overlay">
        <div className="text-center relative z-10">
          <Loader2 size={48} className="animate-spin text-brand-500 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Cargando datos de Cargas XML...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 sm:p-10 bg-slate-50 min-h-screen flex items-center justify-center relative overflow-hidden grid-overlay">
        <div className="text-center bg-red-50 p-8 rounded-2xl border border-red-200 max-w-md shadow-lg relative z-10">
          <p className="text-red-800 font-bold text-lg mb-2">Error de conexión</p>
          <p className="text-slate-655 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 bg-slate-50 min-h-screen relative overflow-hidden grid-overlay">
      
      {/* Background Glow Spots */}
      <div className="absolute top-10 left-10 w-96 h-96 rounded-full blur-[150px] glow-spot-orange pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-[150px] glow-spot-purple pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative z-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center tracking-tight">
            <UploadCloud className="mr-3 text-brand-500" size={32}/> Cargas XML de Cartera
          </h1>
          <p className="text-slate-500 font-medium mt-1">Control de instituciones que reportan su cartera</p>
        </div>
        <button 
          onClick={exportarExcelXML} 
          className="mt-4 md:mt-0 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center shadow-lg shadow-emerald-600/10 hover:bg-emerald-700 transition-all active:scale-95"
        >
          <FileSpreadsheet size={18} className="mr-2"/> Descargar Excel
        </button>
      </div>

      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 relative z-10">
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 flex items-center shadow-md">
          <Building className="text-slate-400 mr-3 animate-pulse" size={24} />
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Clientes</p>
            <p className="text-2xl font-black text-slate-800">{instituciones.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 flex items-center shadow-md border-l-4 border-emerald-500">
          <CheckCircle className="text-emerald-500 mr-3" size={24} />
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Cargan XML</p>
            <p className="text-2xl font-black text-emerald-600">{totalCargan}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 flex items-center shadow-md border-l-4 border-amber-500">
          <XCircle className="text-amber-500 mr-3" size={24} />
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Sin Cargas XML Activos</p>
            <p className="text-2xl font-black text-amber-600">{totalNoCarganActivos}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 mb-6 flex flex-col md:flex-row gap-4 relative z-10 shadow-sm items-center justify-between">
        {/* 🆕 Buscador reducido a la mitad (w-full md:w-80) */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar institución..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm transition-all" 
          />
        </div>
        <select 
          value={filtroXML} 
          onChange={e => setFiltroXML(e.target.value)} 
          className="w-full md:w-auto p-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-medium cursor-pointer transition-all"
        >
          <option value="todos">Todos los Clientes</option>
          <option value="si">Solo los que Cargan XML</option>
          <option value="no">Solo los que NO Cargan XML</option>
        </select>
      </div>

      {/* Tabla Listado */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-x-auto relative z-10 shadow-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <th className="p-4 font-bold">Institución / Categoría</th>
              <th className="p-4 font-bold text-center">Carga XML Activa</th>
              <th className="p-4 font-bold text-center">Fecha Primera Carga</th>
              <th className="p-4 font-bold text-center">Contrato Vence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-750">
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-10 text-slate-400 font-medium">
                  No hay instituciones que coincidan con la búsqueda.
                </td>
              </tr>
            ) : currentItems.map(inst => {
              const cargando = inst.cortaXML === true;
              return (
                <tr key={inst.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{inst.nombre}</p>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase mt-1 inline-block">
                      {inst.categoria || 'Sin Categoría'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {/* 🆕 Toggle valida la fecha actual de primera carga */}
                    <button
                      onClick={() => handleToggleXML(inst.id, inst.nombre, cargando, inst.fechaPrimeraCargaXML)}
                      disabled={updatingId === inst.id || !canModify}
                      className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 shadow-sm border ${
                        cargando 
                          ? 'bg-emerald-100 border-emerald-250 text-emerald-800 hover:bg-emerald-200' 
                          : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {updatingId === inst.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : cargando ? (
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      )}
                      {cargando ? 'SÍ' : 'NO'}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    {/* 🆕 Fecha siempre visible y editable para poder configurarla primero */}
                    <div className="flex items-center justify-center space-x-2">
                      <Calendar size={14} className="text-slate-400" />
                      <input
                        type="date"
                        value={inst.fechaPrimeraCargaXML || ''}
                        onChange={(e) => handleFechaChange(inst.id, inst.nombre, e.target.value)}
                        disabled={!canModify}
                        className="p-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                      />
                    </div>
                  </td>
                  <td className="p-4 text-center text-xs font-bold text-slate-600">
                    {inst.contrato?.fechaFin || 'N/A'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* 🆕 CONTROLES DE PAGINACIÓN COMPLETA A 15 ELEMENTOS */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="text-sm text-slate-550 font-medium">
              Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, institucionesFiltradas.length)} de {institucionesFiltradas.length} clientes
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-slate-300 bg-white rounded-lg text-slate-655 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm shadow-sm"
              >
                Anterior
              </button>
              
              <div className="hidden sm:flex space-x-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => paginate(i + 1)}
                    className={`w-10 h-10 rounded-lg font-bold transition-all text-sm shadow-sm ${
                      currentPage === i + 1 
                        ? 'bg-brand-500 text-white shadow-lg border border-brand-500' 
                        : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-slate-300 bg-white rounded-lg text-slate-655 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm shadow-sm"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 bg-brand-50 p-5 rounded-xl border border-brand-100/80 flex items-start shadow-sm relative z-10">
        <div className="bg-brand-100 p-2 rounded-lg mr-4">
          <FileText className="text-brand-500" size={24} />
        </div>
        <div>
          <p className="text-sm text-brand-850 font-medium">
            <strong>Instrucciones de Carga XML:</strong> Primero debe seleccionar la fecha de primera carga en el selector de la derecha, y luego podrá activar la carga XML a "SÍ". El reporte de Microsoft Excel sólo exportará los clientes que tienen la carga activa en "SÍ".
          </p>
        </div>
      </div>

    </div>
  );
};

export default CargasXML;
