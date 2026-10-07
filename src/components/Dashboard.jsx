// src/components/Dashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart2, AlertCircle, AlertTriangle, CheckCircle2, Loader2, RefreshCw, Building, Search, X, Clock,
  FileSpreadsheet, EyeOff, ChevronDown, ChevronLeft, ChevronRight, Calendar, Gauge, RotateCcw, ArrowUpDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area
} from 'recharts';
import { useInstituciones } from '../hooks/useFirebase';
import { generarReporteConsumoExcel } from '../utils/reporteConsumo';
import { etiquetaEstado, formatearFecha } from '../utils/excel';
import { APP_VERSION } from '../version';
import { debeMonitorearVencimiento } from '../utils/plan';
import { MedidorUso, ChipVigencia } from './instituciones/piezas';
import { colorUso, diasParaVencer, gradienteCategoria, iniciales } from './instituciones/ayudas';

const ITEMS_POR_PAGINA = 12;

// Nivel de consumo según el porcentaje usado del contrato
const nivelDeConsumo = (pct) => {
  if (pct > 90) return { clave: 'critico', texto: 'Crítico', color: '#ef4444', badge: 'bg-red-100 text-red-800 border-red-200', barra: 'from-red-500 to-rose-500', icono: AlertCircle };
  if (pct > 70) return { clave: 'atencion', texto: 'Atención', color: '#f59e0b', badge: 'bg-amber-100 text-amber-800 border-amber-200', barra: 'from-amber-400 to-orange-500', icono: AlertTriangle };
  return { clave: 'saludable', texto: 'Saludable', color: '#10b981', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', barra: 'from-emerald-500 to-teal-400', icono: CheckCircle2 };
};

const estiloEstado = (estado) => {
  switch (estado) {
    case 'pendiente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'vencido': return 'bg-red-100 text-red-800 border-red-200';
    case 'renovacion': return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
};

const textoEstado = (estado) => (estado === 'renovacion' ? 'En Renovación' : etiquetaEstado(estado).replace(/^./, c => c.toUpperCase()));

const esActiva = (i) => i.estado === 'activo' || !i.estado;

// Plan que ya no requiere seguimiento mensual de consumo (aunque el contrato siga activo)
const sinSeguimiento = (i) => !debeMonitorearVencimiento(i);

const NIVEL_SIN_SEGUIMIENTO = {
  clave: 'libre', texto: 'Sin seguimiento', color: '#94a3b8',
  badge: 'bg-slate-100 text-slate-700 border-slate-300', barra: 'from-slate-300 to-slate-400', icono: EyeOff
};

const TarjetaGrafico = ({ titulo, icono: Icono, children, vacio, mensajeVacio = 'Sin datos para mostrar' }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
    <h3 className="flex items-center text-sm font-extrabold text-slate-800 mb-3">
      <Icono size={16} className="mr-2 text-brand-500" /> {titulo}
    </h3>
    {vacio ? <p className="h-52 flex items-center justify-center text-center px-6 text-sm text-slate-400 font-medium">{mensajeVacio}</p> : <div className="h-52">{children}</div>}
  </div>
);

const estiloTooltip = {
  borderRadius: '12px',
  background: 'rgba(255,255,255,0.97)',
  border: '1px solid rgba(0,0,0,0.08)',
  boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
  fontSize: '12px'
};

const Dashboard = ({ onExportExcel }) => {
  const { instituciones, loading, error } = useInstituciones();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [orden, setOrden] = useState('consumo');
  const [isExporting, setIsExporting] = useState(false);
  const [expandidas, setExpandidas] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filtro, orden]);

  // --- LÓGICA DE EXPORTACIÓN INTACTA ---
  const generarReporteExcel = async () => {
    try {
      setIsExporting(true);
      const nombreArchivo = generarReporteConsumoExcel(instituciones);

      alert(`¡Reporte Excel generado exitosamente!\n\nArchivo: ${nombreArchivo}\n\nIncluye:\n- Dashboard: Estadísticas generales\n- Instituciones: Datos detallados e historial\n- Monitoreo Contratos: Vencidos y por vencer\n- Consumo Mensual: Registro completo\n- Análisis Estadístico: Métricas avanzadas`);

    } catch (error) {
      console.error('Error al generar reporte Excel:', error);
      alert(`Error al generar el reporte: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };
  // ---------------------------------------------

  useEffect(() => {
    if (onExportExcel && window.location.pathname === '/dashboard') {
      onExportExcel(generarReporteExcel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onExportExcel]);

  const datosUso = (inst) => {
    const asignadas = inst.contrato?.asignadas || 0;
    const consumidas = inst.contrato?.consumidas || 0;
    return { asignadas, consumidas, restantes: asignadas - consumidas, pct: asignadas > 0 ? (consumidas / asignadas) * 100 : 0 };
  };

  // Contadores de los filtros rápidos (sobre todas las instituciones)
  const conteos = useMemo(() => ({
    todas: instituciones.length,
    activo: instituciones.filter(esActiva).length,
    pendiente: instituciones.filter(i => i.estado === 'pendiente').length,
    vencido: instituciones.filter(i => i.estado === 'vencido').length,
    alto: instituciones.filter(i => !sinSeguimiento(i) && datosUso(i).pct >= 75).length,
    sin: instituciones.filter(sinSeguimiento).length
  }), [instituciones]);

  const institucionesFiltradas = useMemo(() => {
    const texto = searchTerm.trim().toLowerCase();
    return instituciones
      .filter(i => {
        if (texto && !i.nombre.toLowerCase().includes(texto)) return false;
        if (filtro === 'activo') return esActiva(i);
        if (filtro === 'pendiente') return i.estado === 'pendiente';
        if (filtro === 'vencido') return i.estado === 'vencido';
        if (filtro === 'alto') return !sinSeguimiento(i) && datosUso(i).pct >= 75;
        if (filtro === 'sin') return sinSeguimiento(i);
        return true;
      })
      .sort((a, b) => {
        if (orden === 'nombre') return a.nombre.localeCompare(b.nombre);
        if (orden === 'vence') {
          const da = diasParaVencer(a); const db = diasParaVencer(b);
          return (da === null ? Infinity : da) - (db === null ? Infinity : db);
        }
        // Los que no tienen seguimiento van al final: no son prioridad
        const sa = sinSeguimiento(a); const sb = sinSeguimiento(b);
        if (sa !== sb) return sa ? 1 : -1;
        return datosUso(b).pct - datosUso(a).pct;
      });
  }, [instituciones, searchTerm, filtro, orden]);

  // ---- Resumen general y gráficos (sobre lo que se está viendo, sin las que no tienen seguimiento) ----
  const seguidas = useMemo(() => institucionesFiltradas.filter(i => !sinSeguimiento(i)), [institucionesFiltradas]);
  const excluidas = institucionesFiltradas.length - seguidas.length;
  const mensajeVacio = seguidas.length === 0 && excluidas > 0
    ? 'Estas instituciones no tienen seguimiento de consumo, por eso no se incluyen en los gráficos.'
    : undefined;

  const resumen = useMemo(() => {
    const niveles = { saludable: 0, atencion: 0, critico: 0 };
    seguidas.forEach(i => {
      const u = datosUso(i);
      if (u.asignadas > 0) niveles[nivelDeConsumo(u.pct).clave] += 1;
    });
    return { niveles };
  }, [seguidas]);

  const datosDonut = [
    { name: 'Saludable', value: resumen.niveles.saludable, color: '#10b981' },
    { name: 'Atención', value: resumen.niveles.atencion, color: '#f59e0b' },
    { name: 'Crítico', value: resumen.niveles.critico, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const datosTop = useMemo(() => seguidas
    .map(i => ({ nombre: i.nombre, ...datosUso(i) }))
    .filter(d => d.asignadas > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 8)
    .map(d => ({ name: d.nombre.length > 16 ? d.nombre.slice(0, 15) + '…' : d.nombre, completo: d.nombre, pct: Math.round(d.pct * 10) / 10, color: colorUso(d.pct) })),
  [seguidas]);

  const serieMensual = useMemo(() => {
    const porMes = {};
    seguidas.forEach(i => Object.entries(i.consumoPorMes || {}).forEach(([m, v]) => { porMes[m] = (porMes[m] || 0) + (Number(v) || 0); }));
    return Object.entries(porMes).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([m, v]) => ({
      name: new Date(m + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).toUpperCase(),
      consumo: v
    }));
  }, [seguidas]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(institucionesFiltradas.length / ITEMS_POR_PAGINA));
  const indexOfFirstItem = (currentPage - 1) * ITEMS_POR_PAGINA;
  const currentItems = institucionesFiltradas.slice(indexOfFirstItem, indexOfFirstItem + ITEMS_POR_PAGINA);
  const paginasVisibles = () => {
    const paginas = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) paginas.push(p);
      else if (paginas[paginas.length - 1] !== '…') paginas.push('…');
    }
    return paginas;
  };

  const hayFiltros = searchTerm || filtro !== 'todas';
  const limpiar = () => { setSearchTerm(''); setFiltro('todas'); };

  // Mostrar loading
  if (loading && instituciones.length === 0) {
    return (
      <div className="bg-slate-50 p-6 sm:p-10 min-h-screen flex items-center justify-center relative overflow-hidden grid-overlay">
        <div className="text-center relative z-10">
          <Loader2 size={48} className="animate-spin text-brand-500 mx-auto mb-4" />
          <p className="text-slate-500 font-medium tracking-wide">Cargando datos desde Firebase...</p>
        </div>
      </div>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <div className="bg-slate-50 p-6 sm:p-10 min-h-screen flex items-center justify-center relative overflow-hidden grid-overlay">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 max-w-md shadow-lg relative z-10 backdrop-blur-md">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-800 font-bold mb-2 text-lg">Error de conexión</p>
          <p className="text-slate-600 text-sm mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-2.5 rounded-xl hover:bg-red-700 flex items-center space-x-2 mx-auto font-bold transition-all active:scale-95 shadow-lg shadow-red-600/10"
          >
            <RefreshCw size={18} />
            <span>Reintentar</span>
          </button>
        </div>
      </div>
    );
  }

  const filtrosRapidos = [
    { clave: 'todas', texto: 'Todas' },
    { clave: 'activo', texto: 'Activas' },
    { clave: 'pendiente', texto: 'Pendientes' },
    { clave: 'vencido', texto: 'No Renov.' },
    { clave: 'alto', texto: 'Alto consumo' },
    { clave: 'sin', texto: 'Sin seg Premium', ayuda: 'Instituciones que pasaron a Plan Premium y no hace falta hacerles seguimiento de consultas.' }
  ];

  return (
    <div className="bg-slate-50 p-4 sm:p-8 min-h-screen relative overflow-hidden grid-overlay">
      <div className="absolute top-10 left-10 w-96 h-96 rounded-full blur-[150px] glow-spot-orange pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-[150px] glow-spot-purple pointer-events-none"></div>

      {/* Indicador de exportación */}
      {isExporting && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-brand-600 to-amber-500 text-white p-3 text-center shadow-lg border-b border-brand-500/20 backdrop-blur-md">
          <div className="flex items-center justify-center space-x-3">
            <Loader2 size={20} className="animate-spin" />
            <span className="font-bold tracking-wide">Generando reporte Excel corporativo...</span>
          </div>
        </div>
      )}

      {/* ENCABEZADO */}
      <header className="mb-6 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-400 text-white flex items-center justify-center shadow-lg shadow-brand-500/20 mr-4">
            <BarChart2 size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Dashboard de Consumo</h1>
            <p className="text-slate-500 font-medium">
              Monitoreo de Instituciones
              {loading && <span className="inline-flex items-center text-brand-500 ml-2 animate-pulse text-sm"><RefreshCw size={13} className="mr-1 animate-spin" /> Sincronizando...</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 shadow-sm inline-flex items-center">
            <Calendar size={16} className="mr-2 text-brand-500" />
            Actualizado: <span className="text-slate-800 ml-1">{new Date().toLocaleString('es-ES')}</span>
          </div>
          <button onClick={generarReporteExcel} disabled={isExporting || instituciones.length === 0} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center shadow-lg shadow-emerald-600/10 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50">
            <FileSpreadsheet size={18} className="mr-2" /> Excel
          </button>
        </div>
      </header>

      {instituciones.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-md relative z-10">
          <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building size={40} className="text-slate-400" />
          </div>
          <p className="text-xl font-bold text-slate-800 mb-2">No hay instituciones registradas</p>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            Aún no se ha cargado información. Las instituciones aparecerán aquí una vez que sean creadas en el sistema.
          </p>
          <div className="inline-flex items-center bg-brand-50 px-4 py-2 rounded-lg border border-brand-100">
            <p className="text-brand-800 text-sm font-medium flex items-center">
              <RefreshCw size={16} className="mr-2 text-brand-500" />
              Sincronización automática activa
            </p>
          </div>
        </div>
      ) : (
        <>
          {excluidas > 0 && (
            <p className="relative z-10 mb-3 flex items-center text-xs font-semibold text-slate-500">
              <EyeOff size={13} className="mr-1.5 text-slate-400" />
              Los gráficos no incluyen {excluidas} {excluidas === 1 ? 'institución sin seguimiento' : 'instituciones sin seguimiento'} de consumo.
            </p>
          )}

          {/* GRÁFICOS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 relative z-10">
            <TarjetaGrafico titulo="Estado del consumo" icono={Gauge} vacio={datosDonut.length === 0} mensajeVacio={mensajeVacio}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={datosDonut} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={3} stroke="none">
                    {datosDonut.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={estiloTooltip} formatter={(v, n) => [`${v} ${v === 1 ? 'institución' : 'instituciones'}`, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 -mt-1 text-xs font-bold text-slate-500">
                {datosDonut.map(d => (
                  <span key={d.name} className="inline-flex items-center"><span className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: d.color }} />{d.name} ({d.value})</span>
                ))}
              </div>
            </TarjetaGrafico>

            <TarjetaGrafico titulo="Mayor consumo (% del contrato)" icono={BarChart2} vacio={datosTop.length === 0} mensajeVacio={mensajeVacio}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosTop} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="name" width={104} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={estiloTooltip} formatter={(v) => [`${v}%`, 'Uso']} labelFormatter={(_, p) => p?.[0]?.payload?.completo || ''} />
                  <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={14}>
                    {datosTop.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </TarjetaGrafico>

            <TarjetaGrafico titulo="Consumo mensual (total)" icono={Clock} vacio={serieMensual.length === 0} mensajeVacio={mensajeVacio}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serieMensual} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradMensual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff5105" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ff5105" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} />
                  <YAxis hide />
                  <Tooltip contentStyle={estiloTooltip} formatter={(v) => [v.toLocaleString(), 'Consultas']} />
                  <Area type="monotone" dataKey="consumo" stroke="#ff5105" strokeWidth={2} fill="url(#gradMensual)" />
                </AreaChart>
              </ResponsiveContainer>
            </TarjetaGrafico>
          </div>

          {/* FILTROS */}
          <div className="relative z-10 mb-6 bg-white/80 backdrop-blur border border-slate-200 rounded-2xl p-3 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
              <div className="relative w-full lg:w-80 lg:flex-none">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500" size={18} />
                <input
                  type="text"
                  placeholder="Buscar institución por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 border-2 border-brand-200 rounded-xl bg-white text-slate-800 placeholder-slate-500 font-medium outline-none shadow-sm focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 text-sm transition-all"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 lg:mr-auto">
                {filtrosRapidos.map(f => (
                  <button
                    key={f.clave}
                    title={f.ayuda}
                    onClick={() => setFiltro(f.clave)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${filtro === f.clave ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {f.texto} <span className="ml-1 opacity-60">{conteos[f.clave]}</span>
                  </button>
                ))}
              </div>

              <div className="relative lg:w-52">
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select value={orden} onChange={(e) => setOrden(e.target.value)} className="w-full pl-9 pr-8 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-medium appearance-none cursor-pointer transition-all">
                  <option value="consumo">Orden: Mayor consumo</option>
                  <option value="nombre">Orden: Nombre (A-Z)</option>
                  <option value="vence">Orden: Vence primero</option>
                </select>
              </div>
            </div>
            {hayFiltros && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{institucionesFiltradas.length} de {instituciones.length} instituciones</span>
                <button onClick={limpiar} className="inline-flex items-center text-xs font-bold text-brand-600 hover:text-brand-700">
                  <RotateCcw size={13} className="mr-1" /> Limpiar filtros
                </button>
              </div>
            )}
          </div>

          {/* LISTADO */}
          {institucionesFiltradas.length === 0 ? (
            <div className="relative z-10 bg-white p-12 rounded-2xl text-center border border-slate-200 shadow-md">
              <Search size={44} className="mx-auto mb-3 text-slate-300" />
              <p className="text-lg font-bold text-slate-800">No se encontraron resultados</p>
              <p className="text-slate-500 text-sm mt-1">No hay instituciones que coincidan con los filtros aplicados.</p>
              <button onClick={limpiar} className="mt-5 text-brand-600 font-bold bg-brand-50 border border-brand-100 hover:bg-brand-100 px-5 py-2.5 rounded-xl text-sm transition-all active:scale-95">Limpiar filtros</button>
            </div>
          ) : (
            <div className="relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-5">
              {currentItems.map((inst, indice) => {
                const { asignadas, consumidas, restantes, pct } = datosUso(inst);
                const libre = sinSeguimiento(inst);
                const nivel = libre ? NIVEL_SIN_SEGUIMIENTO : nivelDeConsumo(pct);
                const IconoNivel = nivel.icono;
                const meses = Object.entries(inst.consumoPorMes || {}).sort(([a], [b]) => a.localeCompare(b));
                const abierto = !!expandidas[inst.id];

                return (
                  <motion.article
                    key={inst.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(indice, 8) * 0.04, duration: 0.35 }}
                    className={`rounded-2xl border border-slate-200/80 hover:border-brand-500/30 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col ${libre ? 'bg-slate-50' : 'bg-white'}`}
                  >
                    <div className={`h-1.5 w-full bg-gradient-to-r ${nivel.barra}`} />
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-start min-w-0">
                          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradienteCategoria(inst.categoria)} text-white text-base font-black flex items-center justify-center mr-3 flex-shrink-0 shadow-md`}>
                            {iniciales(inst.nombre)}
                          </div>
                          <div className="min-w-0">
                            <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-tight leading-tight">{inst.nombre}</h2>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold border bg-slate-100 text-slate-700 border-slate-200">{inst.categoria || 'Sin Categoría'}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${estiloEstado(inst.estado)}`}>{textoEstado(inst.estado)}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${nivel.badge}`}>
                          <IconoNivel size={14} className="mr-1.5" /> {nivel.texto}
                        </span>
                      </div>

                      <div className="flex items-center gap-5 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                        <MedidorUso porcentaje={Math.min(pct, 100)} color={libre ? '#94a3b8' : undefined} />
                        <div className="grid grid-cols-3 gap-3 text-center flex-1">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Asignadas</p>
                            <p className="text-xl font-black text-blue-600">{asignadas.toLocaleString()}</p>
                          </div>
                          <div className="border-l border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Consumidas</p>
                            <p className="text-xl font-black text-slate-800">{consumidas.toLocaleString()}</p>
                          </div>
                          <div className="border-l border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Disponibles</p>
                            <p className="text-xl font-black text-emerald-600">{restantes.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <Calendar size={12} className="mr-1" /> Vence: {formatearFecha(inst.contrato?.fechaFin)}
                        </span>
                        {inst.estado !== 'vencido' && !libre && <ChipVigencia dias={diasParaVencer(inst)} fechaFin={inst.contrato?.fechaFin} />}
                        {inst.contrato?.duracionMeses && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <Clock size={12} className="mr-1" /> {inst.contrato.duracionMeses} meses
                          </span>
                        )}
                      </div>

                      {libre && (
                        <p className="mt-3 flex items-start text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <EyeOff size={14} className="mr-2 mt-0.5 flex-shrink-0 text-slate-400" />
                          Migró a un plan con el consumo liberado: ya no se le da seguimiento mensual, aunque su contrato siga activo.
                        </p>
                      )}

                      {meses.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <button
                            onClick={() => setExpandidas(prev => ({ ...prev, [inst.id]: !prev[inst.id] }))}
                            className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-brand-600 transition-colors"
                          >
                            <span className="inline-flex items-center uppercase tracking-widest"><BarChart2 size={14} className="mr-1.5 text-brand-500" /> Historial mensual ({meses.length})</span>
                            <ChevronDown size={16} className={`transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
                          </button>
                          {abierto && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                              {meses.map(([mes, consumo]) => (
                                <div key={mes} className="bg-gradient-to-br from-white to-brand-50/30 p-3 rounded-xl border border-brand-100 text-center">
                                  <div className="text-[10px] font-bold text-brand-800 uppercase tracking-widest opacity-80">
                                    {new Date(mes + '-01T00:00:00').toLocaleDateString('es-ES', { year: '2-digit', month: 'short' })}
                                  </div>
                                  <div className="text-xl font-black text-brand-600 leading-none my-1.5">{consumo.toLocaleString()}</div>
                                  <div className="text-[9px] font-bold text-brand-500 uppercase tracking-widest">Consultas</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}

          {/* PAGINACIÓN */}
          {totalPages > 1 && (
            <div className="relative z-10 mt-8 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-slate-200">
              <span className="text-sm font-medium text-slate-500">
                Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfFirstItem + ITEMS_POR_PAGINA, institucionesFiltradas.length)} de {institucionesFiltradas.length} instituciones
              </span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"><ChevronLeft size={16} /></button>
                {paginasVisibles().map((p, i) => p === '…' ? (
                  <span key={`e${i}`} className="px-2 text-slate-400">…</span>
                ) : (
                  <button key={p} onClick={() => setCurrentPage(p)} className={`min-w-[36px] h-9 rounded-lg text-sm font-bold shadow-sm transition-all ${p === currentPage ? 'bg-brand-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{p}</button>
                ))}
                <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}

          {/* Pie informativo */}
          <div className="relative z-10 mt-8 bg-brand-50 p-5 rounded-xl border border-brand-100/80 flex items-start shadow-sm">
            <div className="bg-brand-100 p-2 rounded-lg mr-4">
              <BarChart2 className="text-brand-500" size={24} />
            </div>
            <p className="text-sm text-brand-800 font-medium">
              <strong>Versión V{APP_VERSION}:</strong> Los datos se actualizan de acuerdo a los datos de la intranet BICSA.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
