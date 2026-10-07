// src/components/Auditoria.jsx
// Registro general de auditoría: quién hizo qué y cuándo, en todo el sistema.
import React, { useEffect, useMemo, useState } from 'react';
import { useScrollArriba } from '../hooks/useScrollArriba';
import {
  ClipboardList, Search, X, Loader2, Lock, FileSpreadsheet, ChevronLeft, ChevronRight, RotateCcw, CalendarClock
} from 'lucide-react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useInstituciones } from '../hooks/useFirebase';
import { usePermisosUsuario } from '../hooks/usePermisosUsuario';
import { puedeVerAuditoria } from '../utils/permisos';
import { descargarLibro, formatearFechaHora, hojaDesdeObjetos } from '../utils/excel';

const LIMITE_REGISTROS = 1000;
const POR_PAGINA = 25;

// Color de la insignia según el tipo de acción
const estiloAccion = (accion = '') => {
  const a = accion.toLowerCase();
  if (a.includes('elimin')) return 'bg-red-100 text-red-700 border-red-200';
  if (a.includes('creaci') || a.includes('nuevo') || a.includes('registro')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (a.includes('renov')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (a.includes('edici') || a.includes('modific') || a.includes('actualiz')) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

const aFecha = (valor) => (typeof valor?.toDate === 'function' ? valor.toDate() : valor ? new Date(valor) : null);

const Auditoria = () => {
  const { cargando: cargandoPermisos, rol, permisos } = usePermisosUsuario();
  const { instituciones } = useInstituciones();
  const autorizado = puedeVerAuditoria(rol, permisos);

  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('todos');
  const [filtroAccion, setFiltroAccion] = useState('todas');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagina, setPagina] = useState(1);
  useScrollArriba(pagina);

  useEffect(() => {
    if (cargandoPermisos || !autorizado) return undefined;
    const q = query(collection(db, 'auditoria'), orderBy('fecha', 'desc'), limit(LIMITE_REGISTROS));
    const cancelar = onSnapshot(
      q,
      (snap) => {
        setRegistros(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setCargando(false);
      },
      (e) => { setError(e.message); setCargando(false); }
    );
    return () => cancelar();
  }, [cargandoPermisos, autorizado]);

  useEffect(() => { setPagina(1); }, [busqueda, filtroUsuario, filtroAccion, desde, hasta]);

  const nombresInstituciones = useMemo(() => {
    const mapa = {};
    instituciones.forEach(i => { mapa[i.id] = i.nombre; });
    return mapa;
  }, [instituciones]);

  const usuarios = useMemo(() => [...new Set(registros.map(r => r.usuario).filter(Boolean))].sort(), [registros]);
  const acciones = useMemo(() => [...new Set(registros.map(r => r.accion).filter(Boolean))].sort(), [registros]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const fDesde = desde ? new Date(desde + 'T00:00:00') : null;
    const fHasta = hasta ? new Date(hasta + 'T23:59:59') : null;
    return registros.filter(r => {
      if (filtroUsuario !== 'todos' && r.usuario !== filtroUsuario) return false;
      if (filtroAccion !== 'todas' && r.accion !== filtroAccion) return false;
      const f = aFecha(r.fecha);
      if (fDesde && f && f < fDesde) return false;
      if (fHasta && f && f > fHasta) return false;
      if (texto) {
        const institucion = nombresInstituciones[r.institucionId] || '';
        const pajar = `${r.accion} ${r.detalles} ${r.usuario} ${institucion}`.toLowerCase();
        if (!pajar.includes(texto)) return false;
      }
      return true;
    });
  }, [registros, busqueda, filtroUsuario, filtroAccion, desde, hasta, nombresInstituciones]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const hayFiltros = busqueda || filtroUsuario !== 'todos' || filtroAccion !== 'todas' || desde || hasta;

  const limpiar = () => {
    setBusqueda(''); setFiltroUsuario('todos'); setFiltroAccion('todas'); setDesde(''); setHasta('');
  };

  const exportar = () => {
    const datos = filtrados.map(r => ({
      Fecha: formatearFechaHora(r.fecha),
      Usuario: r.usuario || '',
      Acción: r.accion || '',
      Institución: nombresInstituciones[r.institucionId] || (r.institucionId && r.institucionId !== 'N/A' ? r.institucionId : ''),
      Detalles: r.detalles || ''
    }));
    descargarLibro(
      [{ nombre: 'Auditoría', hoja: hojaDesdeObjetos(datos) }],
      `Auditoria_General_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  if (cargandoPermisos) {
    return (
      <div className="bg-slate-50 min-h-[70vh] flex items-center justify-center">
        <Loader2 size={44} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div className="bg-slate-50 min-h-[70vh] flex items-center justify-center p-6">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 max-w-md shadow-lg">
          <Lock size={44} className="text-slate-400 mx-auto mb-3" />
          <p className="text-slate-800 font-bold mb-2 text-lg">Acceso restringido</p>
          <p className="text-slate-500 text-sm">No tienes permiso para ver la Auditoría. Solicítalo a un administrador.</p>
        </div>
      </div>
    );
  }

  const campo = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-medium transition-all';

  return (
    <div className="bg-slate-50 p-4 sm:p-8 min-h-screen">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-400 text-white flex items-center justify-center shadow-lg shadow-brand-500/20 mr-4">
            <ClipboardList size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Auditoría</h1>
            <p className="text-slate-500 font-medium">
              {filtrados.length} {filtrados.length === 1 ? 'registro' : 'registros'}
              {registros.length >= LIMITE_REGISTROS ? ` (se muestran los últimos ${LIMITE_REGISTROS})` : ''}
            </p>
          </div>
        </div>
        <button onClick={exportar} disabled={filtrados.length === 0} className="self-start sm:self-auto bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center shadow-lg shadow-emerald-600/10 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50">
          <FileSpreadsheet size={18} className="mr-2" /> Excel
        </button>
      </header>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500" size={18} />
            <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar en acciones, detalles, usuarios..." className="w-full pl-10 pr-9 py-2.5 border-2 border-brand-200 rounded-xl bg-white text-slate-800 placeholder-slate-500 font-medium outline-none shadow-sm focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 text-sm transition-all" />
            {busqueda && <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>}
          </div>
          <select value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)} className={campo}>
            <option value="todos">Todos los usuarios</option>
            {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={filtroAccion} onChange={(e) => setFiltroAccion(e.target.value)} className={campo}>
            <option value="todas">Todas las acciones</option>
            {acciones.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={campo} title="Desde" />
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={campo} title="Hasta" />
        </div>
        {hayFiltros && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
            <button onClick={limpiar} className="inline-flex items-center text-xs font-bold text-brand-600 hover:text-brand-700">
              <RotateCcw size={13} className="mr-1" /> Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Listado */}
      {cargando ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <Loader2 size={36} className="animate-spin text-brand-500 mx-auto" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-800 font-medium">{error}</div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <Search size={44} className="text-slate-300 mx-auto mb-3" />
          <p className="text-lg font-bold text-slate-800">Sin registros</p>
          <p className="text-slate-500 text-sm mt-1">No hay movimientos que coincidan con los filtros.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200">
                <th className="text-left px-5 py-3">Fecha</th>
                <th className="text-left px-3 py-3">Usuario</th>
                <th className="text-left px-3 py-3">Acción</th>
                <th className="text-left px-3 py-3">Institución</th>
                <th className="text-left px-3 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((r, i) => (
                <tr key={r.id} className={`border-b border-slate-100 hover:bg-brand-50/40 transition-colors align-top ${i % 2 ? 'bg-slate-50/50' : ''}`}>
                  <td className="px-5 py-3 whitespace-nowrap text-slate-600 font-medium">
                    <span className="inline-flex items-center"><CalendarClock size={14} className="mr-1.5 text-slate-400" />{formatearFechaHora(r.fecha)}</span>
                  </td>
                  <td className="px-3 py-3 font-semibold text-slate-700">{r.usuario || '—'}</td>
                  <td className="px-3 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${estiloAccion(r.accion)}`}>{r.accion}</span></td>
                  <td className="px-3 py-3 font-bold text-slate-800">{nombresInstituciones[r.institucionId] || <span className="text-slate-300">—</span>}</td>
                  <td className="px-3 py-3 text-slate-600">{r.detalles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">Página {pagina} de {totalPaginas}</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPagina(p => p - 1)} disabled={pagina === 1} className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"><ChevronLeft size={16} /></button>
            <button onClick={() => setPagina(p => p + 1)} disabled={pagina === totalPaginas} className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auditoria;
