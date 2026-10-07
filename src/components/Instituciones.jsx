// src/components/Instituciones.jsx
import React, { useState, useEffect } from 'react';
import { useScrollArriba } from '../hooks/useScrollArriba';
import {
  AlertOctagon,
  ArrowUpDown,
  BarChart2,
  Building,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Edit3,
  EyeOff,
  FileSpreadsheet,
  Flame,
  History,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  PlusCircle,
  RotateCcw,
  Search,
  Tag,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from 'recharts';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useInstituciones } from '../hooks/useFirebase';
import { auth, db } from '../firebase';
import { BotonComentarios } from './Comentarios';
import { sileo } from './sileo';
import { esPlanPremium, debeMonitorearVencimiento, tieneSeguimientoVencimiento } from '../utils/plan';
import { puedeVerAuditoria } from '../utils/permisos';
import { confirmar } from '../utils/confirmar';
import { descargarLibro, etiquetaEstado, formatearFecha, hojaDesdeObjetos } from '../utils/excel';
import { describirVigencia } from '../utils/contratos';
import { monedaDe } from '../utils/moneda';
import { MedidorUso, ChipVigencia, TarjetaKpi } from './instituciones/piezas';
import { iniciales, gradienteCategoria, diasParaVencer, colorUso } from './instituciones/ayudas';
import ModalAgregarInstitucion from './instituciones/ModalAgregarInstitucion';
import ModalEditarInstitucion from './instituciones/ModalEditarInstitucion';
import ModalConsumoMensual from './instituciones/ModalConsumoMensual';
import ModalEditarConsumoMes from './instituciones/ModalEditarConsumoMes';
import ModalHistorial from './instituciones/ModalHistorial';
import ModalAuditoria from './instituciones/ModalAuditoria';

const Instituciones = () => {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConsumoModal, setShowConsumoModal] = useState(false);
  const [showEditConsumoModal, setShowEditConsumoModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [showAuditoriaModal, setShowAuditoriaModal] = useState(false);
  const [institucionSeleccionada, setInstitucionSeleccionada] = useState(null);
  const [mesSeleccionadoParaEditar, setMesSeleccionadoParaEditar] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); 
  const [filtroCategoria, setFiltroCategoria] = useState('todos'); // ✨ NUEVO FILTRO CATEGORIA
  const [filtroAlerta, setFiltroAlerta] = useState('todas'); // ✨ NUEVO FILTRO ALERTA (Punto 1)
  const [orden, setOrden] = useState('nombre');
  const [vista, setVista] = useState('tarjetas');
  const [currentPage, setCurrentPage] = useState(1);
  useScrollArriba(currentPage);
  const itemsPerPage = 12;

  const [userRol, setUserRol] = useState(null);
  const [permisos, setPermisos] = useState(null);

  useEffect(() => {
    let unsubscribeDoc = null;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }
      
      if (user) {
        unsubscribeDoc = onSnapshot(doc(db, 'usuarios', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserRol(docSnap.data().rol);
            setPermisos(docSnap.data().permisos);
          }
        });
      } else {
        setUserRol(null);
        setPermisos(null);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const canAdd = userRol === 'admin' || permisos?.instituciones?.agregar;
  const canEdit = userRol === 'admin' || permisos?.instituciones?.editar;
  const canDelete = userRol === 'admin' || permisos?.instituciones?.eliminar;
  const canConsume = userRol === 'admin' || permisos?.instituciones?.registrarConsumo;
  const canComment = userRol === 'admin' || permisos?.instituciones?.comentar;
  const canHistory = userRol === 'admin' || permisos?.instituciones?.verHistorial;

  const { 
    instituciones, 
    loading, 
    error, 
    agregarInstitucion, 
    editarInstitucion,
    eliminarInstitucion,
    registrarConsumoMensual,
    editarConsumoMensual,
    eliminarConsumoMensual  
  } = useInstituciones();

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroEstado, filtroCategoria, filtroAlerta, orden, vista]);

  // ✨ LOGICA DE FILTROS COMBINADOS (Buscador + Estado + Categoria + Alerta)
  const institucionesFiltradas = instituciones.filter((institucion) => {
    const searchLower = searchTerm.toLowerCase();
    const coincideBusqueda = institucion.nombre.toLowerCase().includes(searchLower);

    let coincideFiltroEstado = true;
    if (filtroEstado !== 'todos') {
      const estadoReal = institucion.estado || 'activo';
      if (filtroEstado !== estadoReal) coincideFiltroEstado = false;
    }

    let coincideFiltroCategoria = true;
    if (filtroCategoria !== 'todos') {
      const catReal = institucion.categoria || 'Sin Categoría';
      if (filtroCategoria === 'Sin Categoría' && catReal !== 'Sin Categoría') coincideFiltroCategoria = false;
      else if (filtroCategoria !== 'Sin Categoría' && catReal !== filtroCategoria) coincideFiltroCategoria = false;
    }

    let coincideFiltroAlerta = true;
    if (filtroAlerta === 'consumo_alto') {
      const consumidas = institucion.contrato?.consumidas || 0;
      const asignadas = institucion.contrato?.asignadas || 0;
      const porcentaje = asignadas > 0 ? (consumidas / asignadas) * 100 : 0;
      if (porcentaje < 75 || !debeMonitorearVencimiento(institucion)) coincideFiltroAlerta = false;
    }

    return coincideBusqueda && coincideFiltroEstado && coincideFiltroCategoria && coincideFiltroAlerta;
  }).sort((a, b) => {
    if (orden === 'consumo') {
      const pct = (i) => (i.contrato?.asignadas > 0 ? (i.contrato.consumidas || 0) / i.contrato.asignadas : 0);
      return pct(b) - pct(a);
    }
    if (orden === 'vence') {
      const da = diasParaVencer(a);
      const db = diasParaVencer(b);
      return (da === null ? Infinity : da) - (db === null ? Infinity : db);
    }
    return a.nombre.localeCompare(b.nombre);
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = institucionesFiltradas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(institucionesFiltradas.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleSave = async (nuevaInstitucion) => {
    return await agregarInstitucion(nuevaInstitucion);
  };

  const handleEdit = async (id, datosActualizados) => {
    return await editarInstitucion(id, datosActualizados);
  };

  const handleConsumoMensual = async (id, datosConsumo) => {
    return await registrarConsumoMensual(id, datosConsumo);
  };

  const handleEditarConsumoMensual = async (id, datosConsumo) => {
    return await editarConsumoMensual(id, datosConsumo);
  };

  const handleEliminarConsumoMensual = async (institucion, mes) => {
    const consumo = institucion.consumoPorMes[mes];
    const nombreMes = new Date(mes + '-01T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
    confirmar(
      `Eliminar consumo de ${nombreMes}`,
      `Se eliminarán ${consumo.toLocaleString()} consultas registradas para "${institucion.nombre}". Esta acción no se puede deshacer.`,
      async () => {
        const resultado = await eliminarConsumoMensual(institucion.id, mes);
        if (resultado.success) {
          sileo.success({ title: 'Consumo eliminado', description: `Consumo de ${nombreMes} eliminado. Se restaron ${consumo.toLocaleString()} consultas.` });
        } else {
          sileo.error({ title: 'Error al eliminar consumo', description: resultado.error });
        }
      }
    );
  };

  const handleDelete = async (id, nombre) => {
    confirmar(
      'Eliminar institución',
      `¿Estás seguro de que quieres eliminar "${nombre}"? Esta acción no se puede deshacer.`,
      async () => {
        const resultado = await eliminarInstitucion(id);
        if (resultado.success) {
          sileo.success({ title: 'Institución eliminada', description: `"${nombre}" fue eliminada exitosamente.` });
        } else {
          sileo.error({ title: 'Error al eliminar', description: resultado.error });
        }
      }
    );
  };

  // ✨ NUEVA FUNCION: DESCARGAR EXCEL DE LOS FILTROS ACTUALES
  const exportarExcelFiltrado = () => {
    if (institucionesFiltradas.length === 0) return sileo.warning({ title: 'Sin datos', description: 'No hay datos para exportar con estos filtros.' });
    
    const data = institucionesFiltradas.map((inst, index) => ({
      'Nro': index + 1,
      'Institución': inst.nombre,
      'Plan / Categoría': inst.categoria || 'Sin Categoría',
      'Seguimiento de Vencimiento': tieneSeguimientoVencimiento(inst) ? 'Sí' : 'No',
      'Moneda': monedaDe(inst),
      'Monto Total': inst.montoTotal || 0,
      'Plazo Meses': inst.plazoMeses || 1,
      'Estado': inst.estado === 'no_renovada' ? 'FINALIZADA' : etiquetaEstado(inst.estado).toUpperCase(),
      'Asignadas': inst.contrato?.asignadas || 0,
      'Consumidas': inst.contrato?.consumidas || 0,
      'Restantes': (inst.contrato?.asignadas || 0) - (inst.contrato?.consumidas || 0),
      'Uso (%)': inst.contrato?.asignadas > 0 ? `${((inst.contrato.consumidas / inst.contrato.asignadas) * 100).toFixed(1)}%` : '0%',
      'Fecha Inicio': formatearFecha(inst.contrato?.fechaInicio || inst.fechaCreacion),
      'Fecha Venc.': formatearFecha(inst.contrato?.fechaFin),
      'Vigencia del Contrato': describirVigencia(inst.contrato?.fechaFin),
      'Meses Contrato': inst.contrato?.duracionMeses || 0
    }));

    descargarLibro(
      [{ nombre: 'Instituciones', hoja: hojaDesdeObjetos(data) }],
      `Reporte_Instituciones_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  if (loading && instituciones.length === 0) {
    return (
      <div className="p-6 sm:p-10 bg-slate-50 min-h-screen flex items-center justify-center relative overflow-hidden grid-overlay">
        <div className="text-center relative z-10">
          <Loader2 size={48} className="animate-spin text-brand-500 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Cargando instituciones desde Firebase...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 sm:p-10 bg-slate-50 min-h-screen flex items-center justify-center relative overflow-hidden grid-overlay">
        <div className="text-center bg-red-50 p-8 rounded-2xl border border-red-200 max-w-md shadow-lg relative z-10 backdrop-blur-md">
          <p className="text-red-800 font-bold text-lg mb-2">Error al conectar con Firebase</p>
          <p className="text-red-655 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 bg-red-600 text-white px-6 py-2.5 rounded-xl hover:bg-red-700 flex items-center justify-center mx-auto font-bold transition-all active:scale-95 shadow-lg shadow-red-600/10"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const hayFiltros = searchTerm || filtroEstado !== 'todos' || filtroCategoria !== 'todos' || filtroAlerta !== 'todas';
  const limpiarFiltros = () => {
    setSearchTerm('');
    setFiltroEstado('todos');
    setFiltroCategoria('todos');
    setFiltroAlerta('todas');
  };

  const conteoEstado = (estado) => instituciones.filter(i => (i.estado || 'activo') === estado).length;

  const estiloEstado = (estado) => {
    switch (estado) {
      case 'pendiente': return { badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', texto: 'Pendiente', acento: 'from-yellow-400 to-amber-500' };
      case 'vencido': return { badge: 'bg-red-100 text-red-800 border-red-200', texto: 'No Renov.', acento: 'from-red-500 to-rose-500' };
      case 'renovacion': return { badge: 'bg-blue-100 text-blue-800 border-blue-200', texto: 'En Renovación', acento: 'from-blue-500 to-sky-400' };
      default: return { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', texto: 'Activo', acento: 'from-emerald-500 to-teal-400' };
    }
  };

  const renderAcciones = (institucion) => (
    <div className="flex flex-wrap gap-1.5 shrink-0">
      {canConsume && (
        <button
          onClick={() => { setInstitucionSeleccionada(institucion); setShowConsumoModal(true); }}
          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white p-2 rounded-lg border border-emerald-200 hover:border-emerald-600 transition-all shadow-sm active:scale-95"
          title="Registrar consumo mensual" disabled={loading}
        >
          <Plus size={16} />
        </button>
      )}
      {canComment && <BotonComentarios institucion={institucion} comentariosCount={0} />}
      {canEdit && (
        <button
          onClick={() => { setInstitucionSeleccionada(institucion); setShowEditModal(true); }}
          className="bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white p-2 rounded-lg border border-blue-200 transition-all shadow-sm active:scale-95"
          title="Editar institución" disabled={loading}
        >
          <Edit3 size={16} />
        </button>
      )}
      {canHistory && (
        <button
          onClick={() => { setInstitucionSeleccionada(institucion); setShowHistorialModal(true); }}
          className="bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white p-2 rounded-lg border border-purple-200 transition-all shadow-sm active:scale-95"
          title="Ver historial de períodos" disabled={loading}
        >
          <History size={16} />
        </button>
      )}
      {puedeVerAuditoria(userRol, permisos) && (
        <button
          onClick={() => { setInstitucionSeleccionada(institucion); setShowAuditoriaModal(true); }}
          className="bg-slate-100 text-slate-700 hover:bg-slate-700 hover:text-white p-2 rounded-lg border border-slate-200 transition-all shadow-sm active:scale-95"
          title="Ver Auditoría de Cambios" disabled={loading}
        >
          <ClipboardList size={16} />
        </button>
      )}
      {canDelete && (
        <button
          onClick={() => handleDelete(institucion.id, institucion.nombre)}
          className="bg-red-50 text-red-700 hover:bg-red-600 hover:text-white p-2 rounded-lg border border-red-200 transition-all shadow-sm active:scale-95"
          title="Eliminar institución" disabled={loading}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );

  const datosUso = (institucion) => {
    const asignadas = institucion.contrato?.asignadas || 0;
    const consumidas = institucion.contrato?.consumidas || 0;
    return {
      asignadas,
      consumidas,
      restantes: asignadas - consumidas,
      porcentaje: asignadas > 0 ? Math.min((consumidas / asignadas) * 100, 100) : 0
    };
  };

  const paginasVisibles = () => {
    const paginas = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) paginas.push(p);
      else if (paginas[paginas.length - 1] !== '…') paginas.push('…');
    }
    return paginas;
  };

  return (
    <div className="p-4 sm:p-8 bg-slate-50 min-h-screen relative overflow-hidden grid-overlay">
      <div className="absolute top-10 left-10 w-96 h-96 rounded-full blur-[150px] glow-spot-orange pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-[150px] glow-spot-purple pointer-events-none"></div>

      {/* HERO */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 mb-6 rounded-3xl bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 text-white p-6 sm:p-8 shadow-xl shadow-brand-500/20 overflow-hidden"
      >
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute right-24 -bottom-16 w-44 h-44 rounded-full bg-white/10" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mr-4 flex-shrink-0">
              <Building size={30} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Gestión de Instituciones</h1>
              <p className="text-white/85 font-medium mt-0.5">
                {institucionesFiltradas.length} {institucionesFiltradas.length === 1 ? 'institución' : 'instituciones'}
                {hayFiltros ? ' con los filtros aplicados' : ' registradas'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={exportarExcelFiltrado} className="bg-white/15 text-white border border-white/50 backdrop-blur px-5 py-2.5 rounded-xl font-bold flex items-center hover:bg-white/25 transition-all active:scale-95 text-sm" title="Descargar Excel del listado filtrado">
              <FileSpreadsheet size={18} className="mr-2" /> Excel
            </button>
            {canAdd && (
              <button onClick={() => setShowModal(true)} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center hover:bg-emerald-700 ring-1 ring-white/40 shadow-lg transition-all active:scale-95 text-sm whitespace-nowrap">
                <PlusCircle size={18} className="mr-2" /> Nueva institución
              </button>
            )}
          </div>
        </div>
      </motion.header>

      {/* KPIs (también filtran por estado) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 relative z-10">
        <TarjetaKpi indice={0} icono={Users} etiqueta="Total" valor={instituciones.length} total={instituciones.length} color="bg-brand-100 text-brand-600" barra="bg-brand-500" activa={filtroEstado === 'todos'} onClick={() => setFiltroEstado('todos')} />
        <TarjetaKpi indice={1} icono={CheckCircle2} etiqueta="Activos" valor={conteoEstado('activo')} total={instituciones.length} color="bg-emerald-100 text-emerald-600" barra="bg-emerald-500" activa={filtroEstado === 'activo'} onClick={() => setFiltroEstado(filtroEstado === 'activo' ? 'todos' : 'activo')} />
        <TarjetaKpi indice={2} icono={Clock} etiqueta="Pendientes" valor={conteoEstado('pendiente')} total={instituciones.length} color="bg-amber-100 text-amber-600" barra="bg-amber-500" activa={filtroEstado === 'pendiente'} onClick={() => setFiltroEstado(filtroEstado === 'pendiente' ? 'todos' : 'pendiente')} />
        <TarjetaKpi indice={3} icono={AlertOctagon} etiqueta="No renovados" valor={conteoEstado('vencido')} total={instituciones.length} color="bg-red-100 text-red-600" barra="bg-red-500" activa={filtroEstado === 'vencido'} onClick={() => setFiltroEstado(filtroEstado === 'vencido' ? 'todos' : 'vencido')} />
      </div>

      {/* BARRA DE FILTROS */}
      <div className="relative z-10 mb-6 bg-white/80 backdrop-blur border border-slate-200 rounded-2xl p-3 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative w-full lg:w-80 lg:flex-none lg:mr-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500" size={18} />
            <input type="text" placeholder="Buscar institución por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-9 py-2.5 border-2 border-brand-200 rounded-xl bg-white text-slate-800 placeholder-slate-500 font-medium outline-none shadow-sm focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 text-sm transition-all" />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>
            )}
          </div>

          <div className="relative lg:w-56">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="w-full pl-9 pr-8 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-medium appearance-none cursor-pointer transition-all">
              <option value="todos">Todas las categorías</option>
              <option value="BUSINESS Micro">BUSINESS Micro</option>
              <option value="BUSINESS Pequeña">BUSINESS Pequeña</option>
              <option value="BUSINESS Mediana">BUSINESS Mediana</option>
              <option value="Plan Premium">Plan Premium</option>
              <option value="Plan Premium Gold">Plan Premium Gold</option>
              <option value="Sin Categoría">Sin Categoría</option>
            </select>
          </div>

          <div className="relative lg:w-52">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select value={orden} onChange={(e) => setOrden(e.target.value)} className="w-full pl-9 pr-8 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-medium appearance-none cursor-pointer transition-all">
              <option value="nombre">Orden: Nombre (A-Z)</option>
              <option value="consumo">Orden: Mayor consumo</option>
              <option value="vence">Orden: Vence primero</option>
            </select>
          </div>

          <button
            onClick={() => setFiltroAlerta(filtroAlerta === 'consumo_alto' ? 'todas' : 'consumo_alto')}
            className={`flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 whitespace-nowrap ${filtroAlerta === 'consumo_alto' ? 'bg-red-100 border-red-300 text-red-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            title="Instituciones con uso avanzado (75% o más)"
          >
            <Flame size={16} className="mr-1.5" /> Alto consumo
          </button>

          <div className="flex bg-slate-100 rounded-xl p-1 self-start lg:self-auto">
            <button onClick={() => setVista('tarjetas')} className={`p-2 rounded-lg transition-all ${vista === 'tarjetas' ? 'bg-white shadow text-brand-600' : 'text-slate-500 hover:text-slate-700'}`} title="Vista de tarjetas"><LayoutGrid size={18} /></button>
            <button onClick={() => setVista('lista')} className={`p-2 rounded-lg transition-all ${vista === 'lista' ? 'bg-white shadow text-brand-600' : 'text-slate-500 hover:text-slate-700'}`} title="Vista de lista"><List size={18} /></button>
          </div>
        </div>

        {hayFiltros && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Filtros:</span>
            {searchTerm && <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">Búsqueda: {searchTerm}</span>}
            {filtroEstado !== 'todos' && <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold capitalize">Estado: {filtroEstado}</span>}
            {filtroCategoria !== 'todos' && <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">{filtroCategoria}</span>}
            {filtroAlerta !== 'todas' && <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">Alto consumo</span>}
            <button onClick={limpiarFiltros} className="ml-auto inline-flex items-center text-xs font-bold text-brand-600 hover:text-brand-700">
              <RotateCcw size={13} className="mr-1" /> Limpiar filtros
            </button>
          </div>
        )}
      </div>

      <div className="relative z-10">
        {institucionesFiltradas.length === 0 ? (
          hayFiltros ? (
            <div className="bg-white p-12 rounded-2xl text-center text-slate-500 border border-slate-200/80 shadow-md">
              <Search size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-bold text-slate-800 mb-2">No se encontraron resultados</p>
              <p className="text-slate-500">No hay instituciones que coincidan con los filtros aplicados.</p>
              <button onClick={limpiarFiltros} className="mt-6 text-brand-600 hover:text-brand-700 font-bold bg-brand-50 border border-brand-100 hover:bg-brand-100 px-5 py-2.5 rounded-xl transition-all active:scale-95 text-sm">
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl text-center text-slate-500 border border-slate-200/80 shadow-md">
              <Building size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-bold text-slate-800 mb-2">No hay instituciones registradas</p>
              <p className="text-slate-500">Haz clic en «Nueva institución» para comenzar.</p>
            </div>
          )
        ) : vista === 'lista' ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[980px]">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200">
                  <th className="text-left px-5 py-3">Institución</th>
                  <th className="text-left px-3 py-3">Estado</th>
                  <th className="text-left px-3 py-3 w-48">Uso del contrato</th>
                  <th className="text-right px-3 py-3">Asignadas</th>
                  <th className="text-right px-3 py-3">Restantes</th>
                  <th className="text-left px-3 py-3">Vencimiento</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((institucion, i) => {
                  const est = estiloEstado(institucion.estado);
                  const uso = datosUso(institucion);
                  const dias = diasParaVencer(institucion);
                  return (
                    <tr key={institucion.id} className={`border-b border-slate-100 hover:bg-brand-50/40 transition-colors ${i % 2 ? 'bg-slate-50/50' : ''}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradienteCategoria(institucion.categoria)} text-white text-sm font-black flex items-center justify-center mr-3 flex-shrink-0`}>
                            {iniciales(institucion.nombre)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-800 uppercase tracking-tight truncate">{institucion.nombre}</p>
                            <p className="text-xs text-slate-500 font-medium">{institucion.categoria || 'Sin Categoría'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${est.badge}`}>{est.texto}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${uso.porcentaje}%`, backgroundColor: colorUso(uso.porcentaje) }} />
                          </div>
                          <span className="text-xs font-bold w-12 text-right" style={{ color: colorUso(uso.porcentaje) }}>{uso.porcentaje.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-blue-600">{uso.asignadas.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right font-bold text-emerald-600">{uso.restantes.toLocaleString()}</td>
                      <td className="px-3 py-3">
                        <p className="text-xs font-semibold text-slate-700 mb-1">{formatearFecha(institucion.contrato?.fechaFin)}</p>
                        {institucion.estado !== 'vencido' && <ChipVigencia dias={dias} fechaFin={institucion.contrato?.fechaFin} />}
                      </td>
                      <td className="px-5 py-3"><div className="flex justify-end">{renderAcciones(institucion)}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {currentItems.map((institucion, indice) => {
              const est = estiloEstado(institucion.estado);
              const uso = datosUso(institucion);
              const dias = diasParaVencer(institucion);
              const sinSeguimiento = esPlanPremium(institucion.categoria) && !debeMonitorearVencimiento(institucion);
              const meses = Object.entries(institucion.consumoPorMes || {}).sort(([a], [b]) => a.localeCompare(b));

              return (
                <motion.article
                  key={institucion.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(indice, 8) * 0.04, duration: 0.35 }}
                  className="bg-white rounded-2xl border border-slate-200/80 hover:border-brand-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col overflow-hidden"
                >
                  <div className={`h-1.5 w-full bg-gradient-to-r ${est.acento}`} />

                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-start min-w-0 flex-1">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradienteCategoria(institucion.categoria)} text-white text-base font-black flex items-center justify-center mr-3 flex-shrink-0 shadow-md`}>
                          {iniciales(institucion.nombre)}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-tight leading-tight">{institucion.nombre}</h2>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold border bg-slate-100 text-slate-700 border-slate-200">
                              {institucion.categoria || 'Sin Categoría'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${est.badge}`}>{est.texto}</span>
                          </div>
                        </div>
                      </div>
                      {renderAcciones(institucion)}
                    </div>

                    {/* Medidor + cifras */}
                    <div className="flex items-center gap-5 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                      <MedidorUso porcentaje={uso.porcentaje} />
                      <div className="grid grid-cols-3 gap-3 text-center flex-1">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Asignadas</p>
                          <p className="text-xl font-black text-blue-600">{uso.asignadas.toLocaleString()}</p>
                        </div>
                        <div className="border-l border-slate-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Consumidas</p>
                          <p className="text-xl font-black text-slate-800">{uso.consumidas.toLocaleString()}</p>
                        </div>
                        <div className="border-l border-slate-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Restantes</p>
                          <p className="text-xl font-black text-emerald-600">{uso.restantes.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Contrato */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        <Calendar size={12} className="mr-1" />
                        {formatearFecha(institucion.contrato?.fechaInicio || institucion.fechaCreacion)} → {formatearFecha(institucion.contrato?.fechaFin)}
                      </span>
                      {institucion.estado !== 'vencido' && <ChipVigencia dias={dias} fechaFin={institucion.contrato?.fechaFin} />}
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Plazo: {institucion.plazoMeses || 1} {(institucion.plazoMeses || 1) === 1 ? 'mes' : 'meses'}
                      </span>
                      {sinSeguimiento && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-white" title="Su vencimiento no aparece en Monitoreo Contratos">
                          <EyeOff size={12} className="mr-1" /> Sin seguimiento de vencimiento
                        </span>
                      )}
                      {institucion.historial && institucion.historial.length > 0 && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                          <History size={12} className="mr-1" /> {institucion.historial.length} {institucion.historial.length === 1 ? 'período anterior' : 'períodos anteriores'}
                        </span>
                      )}
                    </div>

                    {/* Tendencia */}
                    {meses.length > 0 ? (
                      <div className="pt-3 border-t border-slate-100 flex flex-col flex-1">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center">
                          <BarChart2 className="mr-1 text-brand-500" size={14} />
                          Tendencia de consumo
                        </h4>
                        <div className="h-28 w-full mt-2">
                          <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                            <AreaChart data={meses.map(([mes, consumo]) => ({ name: new Date(mes + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'short' }).toUpperCase(), consumo, mesRaw: mes }))} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id={`color-${institucion.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ff5105" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="#ff5105" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <Tooltip
                                formatter={(value) => [value.toLocaleString(), 'Consultas']}
                                contentStyle={{ borderRadius: '12px', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(0, 0, 0, 0.08)', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)', fontSize: '12px', color: '#1e293b' }}
                                itemStyle={{ color: '#ff5105' }}
                                labelStyle={{ fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}
                              />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: '500' }} height={14} dy={5} />
                              <Area type="monotone" dataKey="consumo" stroke="#ff5105" strokeWidth={2} fillOpacity={1} fill={`url(#color-${institucion.id})`} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                        {(canEdit || canDelete) && (
                          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-dashed border-slate-100">
                            {meses.map(([mes, consumo]) => (
                              <div key={mes} className="group/item flex items-center text-xs bg-brand-50 border border-brand-100 rounded-lg px-2 py-1 shadow-sm transition-all hover:border-brand-300">
                                <span className="font-bold text-brand-800 pr-1.5 border-r border-brand-200 mr-1.5">{new Date(mes + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}</span>
                                <span className="text-brand-700 font-extrabold mr-1">{consumo.toLocaleString()}</span>
                                <div className="flex space-x-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 w-0 overflow-hidden group-hover/item:w-auto group-hover/item:ml-1">
                                  {canEdit && <button onClick={() => { setInstitucionSeleccionada(institucion); setMesSeleccionadoParaEditar(mes); setShowEditConsumoModal(true); }} className="text-slate-500 hover:text-blue-600 bg-white hover:bg-slate-50 rounded p-1 transition-colors" title="Editar"><Edit3 size={11} /></button>}
                                  {canDelete && <button onClick={() => handleEliminarConsumoMensual(institucion, mes)} className="text-slate-500 hover:text-red-600 bg-white hover:bg-slate-50 rounded p-1 transition-colors" title="Eliminar"><Trash2 size={11} /></button>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pt-5 pb-3 border-t border-slate-100 flex flex-col items-center justify-center flex-1">
                        <div className="bg-slate-50 p-3 rounded-full mb-2">
                          <BarChart2 className="text-slate-400" size={20} />
                        </div>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider text-center">Aún sin movimientos</p>
                      </div>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-slate-200">
            <span className="text-sm font-medium text-slate-500">Página {currentPage} de {totalPages} · {institucionesFiltradas.length} resultados</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"><ChevronLeft size={16} /></button>
              {paginasVisibles().map((p, i) => p === '…' ? (
                <span key={`e${i}`} className="px-2 text-slate-400">…</span>
              ) : (
                <button key={p} onClick={() => setCurrentPage(p)} className={`min-w-[36px] h-9 rounded-lg text-sm font-bold transition-all shadow-sm ${p === currentPage ? 'bg-brand-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{p}</button>
              ))}
              <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {showModal && <ModalAgregarInstitucion onClose={() => setShowModal(false)} onSave={handleSave} />}
      {showEditModal && institucionSeleccionada && <ModalEditarInstitucion institucion={institucionSeleccionada} onClose={() => { setShowEditModal(false); setInstitucionSeleccionada(null); }} onSave={handleEdit} />}
      {showConsumoModal && institucionSeleccionada && <ModalConsumoMensual institucion={institucionSeleccionada} onClose={() => { setShowConsumoModal(false); setInstitucionSeleccionada(null); }} onSave={handleConsumoMensual} />}
      {showEditConsumoModal && institucionSeleccionada && mesSeleccionadoParaEditar && <ModalEditarConsumoMes institucion={institucionSeleccionada} mesSeleccionado={mesSeleccionadoParaEditar} onClose={() => { setShowEditConsumoModal(false); setInstitucionSeleccionada(null); setMesSeleccionadoParaEditar(null); }} onSave={handleEditarConsumoMensual} />}
      {showHistorialModal && institucionSeleccionada && <ModalHistorial institucion={institucionSeleccionada} onClose={() => { setShowHistorialModal(false); setInstitucionSeleccionada(null); }} />}
      {showAuditoriaModal && institucionSeleccionada && <ModalAuditoria institucion={institucionSeleccionada} onClose={() => { setShowAuditoriaModal(false); setInstitucionSeleccionada(null); }} />}
    </div>
  );
};

export default Instituciones;
