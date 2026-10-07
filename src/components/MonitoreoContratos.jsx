// src/components/MonitoreoContratos.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  Clock,
  CalendarClock,
  CalendarX,
  PhoneCall,
  Search,
  X,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Tag,
  Layers,
  Lock
} from 'lucide-react';
import { useInstituciones } from '../hooks/useFirebase';
import { obtenerContratosPorVencer } from '../utils/contratos';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

const ESTILOS = {
  vencido: {
    titulo: 'Contrato vencido',
    icono: AlertOctagon,
    borde: 'border-l-red-600',
    fondo: 'bg-red-50/70 border-red-200',
    iconoBox: 'bg-red-100 text-red-600',
    pill: 'bg-red-600 text-white',
    barra: 'bg-red-500',
    texto: 'text-red-700'
  },
  critico: {
    titulo: 'Contrato crítico',
    icono: AlertTriangle,
    borde: 'border-l-orange-500',
    fondo: 'bg-orange-50/70 border-orange-200',
    iconoBox: 'bg-orange-100 text-orange-600',
    pill: 'bg-orange-100 text-orange-800',
    barra: 'bg-orange-500',
    texto: 'text-orange-700'
  },
  advertencia: {
    titulo: 'Vencimiento próximo',
    icono: Clock,
    borde: 'border-l-amber-400',
    fondo: 'bg-amber-50/70 border-amber-200',
    iconoBox: 'bg-amber-100 text-amber-600',
    pill: 'bg-amber-100 text-amber-800',
    barra: 'bg-amber-400',
    texto: 'text-amber-700'
  }
};

const textoTiempo = (n) => {
  if (n.tipo === 'vencido') {
    const d = Math.abs(n.dias);
    return `${d} ${d === 1 ? 'Día' : 'Días'} Contrato Vencido`;
  }
  if (n.meses === 0) return n.dias <= 0 ? 'Vence hoy' : `${n.dias} ${n.dias === 1 ? 'día restante' : 'días restantes'}`;
  return n.meses === 1 ? '1 mes restante' : `${n.meses} meses restantes`;
};

const TarjetaResumen = ({ icono: Icono, etiqueta, valor, color, activa, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left bg-white rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.98] ${
      activa ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200'
    }`}
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{etiqueta}</span>
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icono size={18} />
      </span>
    </div>
    <p className="mt-3 text-4xl font-extrabold text-slate-800 text-center">{valor}</p>
  </button>
);

const MonitoreoContratos = ({ userRole }) => {
  const { instituciones, loading, error } = useInstituciones();
  const [acceso, setAcceso] = useState(userRole === 'admin' ? true : null);

  useEffect(() => {
    let unsubscribeDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }
      if (user) {
        unsubscribeDoc = onSnapshot(doc(db, 'usuarios', user.uid), (docSnap) => {
          const data = docSnap.exists() ? docSnap.data() : null;
          setAcceso(data?.rol === 'admin' || data?.permisos?.monitoreoContratos?.acceso !== false);
        });
      } else {
        setAcceso(false);
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const contratos = useMemo(() => obtenerContratosPorVencer(instituciones), [instituciones]);

  const conteo = useMemo(() => ({
    vencido: contratos.filter(c => c.tipo === 'vencido').length,
    critico: contratos.filter(c => c.tipo === 'critico').length,
    advertencia: contratos.filter(c => c.tipo === 'advertencia').length
  }), [contratos]);

  const visibles = contratos.filter(c =>
    (filtro === 'todos' || c.tipo === filtro) &&
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const alternarFiltro = (tipo) => setFiltro(prev => (prev === tipo ? 'todos' : tipo));

  if (acceso === false) {
    return (
      <div className="bg-slate-50 min-h-[70vh] flex items-center justify-center p-6">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 max-w-md shadow-lg">
          <Lock size={44} className="text-slate-400 mx-auto mb-3" />
          <p className="text-slate-800 font-bold mb-2 text-lg">Acceso restringido</p>
          <p className="text-slate-500 text-sm">No tienes permiso para ver el Monitoreo de Contratos. Solicítalo a un administrador.</p>
        </div>
      </div>
    );
  }

  if (acceso === null || (loading && instituciones.length === 0)) {
    return (
      <div className="bg-slate-50 min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={44} className="animate-spin text-brand-500 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Cargando contratos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50 min-h-[70vh] flex items-center justify-center p-6">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 max-w-md shadow-lg">
          <AlertOctagon size={44} className="text-red-500 mx-auto mb-3" />
          <p className="text-red-800 font-bold mb-2 text-lg">Error de conexión</p>
          <p className="text-slate-600 text-sm mb-5">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-2.5 rounded-xl hover:bg-red-700 inline-flex items-center space-x-2 font-bold"
          >
            <RefreshCw size={16} />
            <span>Reintentar</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 p-4 sm:p-8 min-h-screen">
      {/* Encabezado */}
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-400 text-white flex items-center justify-center shadow-lg shadow-brand-500/20 mr-4">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Monitoreo de Contratos</h1>
            <p className="text-slate-500 font-medium">Seguimiento de vencimientos de instituciones</p>
          </div>
        </div>
        <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 shadow-sm inline-flex items-center self-start sm:self-auto">
          <CalendarClock size={16} className="mr-2 text-brand-500" />
          Actualizado: <span className="text-slate-800 ml-1">{new Date().toLocaleString('es-ES')}</span>
        </div>
      </header>

      {/* Resumen / filtros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <TarjetaResumen icono={Layers} etiqueta="En seguimiento" valor={contratos.length} color="bg-slate-100 text-slate-600" activa={filtro === 'todos'} onClick={() => setFiltro('todos')} />
        <TarjetaResumen icono={AlertOctagon} etiqueta="Vencidos" valor={conteo.vencido} color="bg-red-100 text-red-600" activa={filtro === 'vencido'} onClick={() => alternarFiltro('vencido')} />
        <TarjetaResumen icono={AlertTriangle} etiqueta="Críticos" valor={conteo.critico} color="bg-orange-100 text-orange-600" activa={filtro === 'critico'} onClick={() => alternarFiltro('critico')} />
        <TarjetaResumen icono={Clock} etiqueta="Próximos" valor={conteo.advertencia} color="bg-amber-100 text-amber-600" activa={filtro === 'advertencia'} onClick={() => alternarFiltro('advertencia')} />
      </div>

      {/* Buscador */}
      <div className="relative w-full max-w-xl mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar institución por nombre..."
          className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Listado */}
      {visibles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" />
          <p className="text-lg font-bold text-slate-800">
            {contratos.length === 0 ? 'Todo al día' : 'Sin resultados'}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {contratos.length === 0
              ? 'No hay contratos vencidos ni por vencer en los próximos 2 meses.'
              : 'Ningún contrato coincide con el filtro o la búsqueda.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {visibles.map((n) => {
            const e = ESTILOS[n.tipo];
            const Icono = e.icono;
            return (
              <article key={n.id} className={`rounded-2xl border border-l-4 p-5 shadow-sm ${e.fondo} ${e.borde}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${e.iconoBox}`}>
                    <Icono size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-xs font-bold uppercase tracking-wide ${e.texto}`}>{e.titulo}</p>
                        <h3 className="text-lg font-extrabold text-slate-900 leading-tight truncate">{n.nombre}</h3>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${e.pill}`}>
                        {textoTiempo(n)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                      <span className="inline-flex items-center">
                        <CalendarX size={15} className="mr-1.5 text-slate-400" />
                        Vence: <strong className="ml-1 text-slate-800">{n.fecha}</strong>
                      </span>
                      <span className="inline-flex items-center">
                        <Tag size={15} className="mr-1.5 text-slate-400" />
                        {n.categoria}
                      </span>
                    </div>

                    {n.progreso !== null && (
                      <div className="mt-3">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                          <span>Avance del contrato</span>
                          <span>{Math.round(n.progreso)}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/80 rounded-full overflow-hidden border border-slate-200/60">
                          <div className={`h-full rounded-full ${e.barra}`} style={{ width: `${n.progreso}%` }} />
                        </div>
                      </div>
                    )}

                    {n.tipo !== 'advertencia' && (
                      <div className={`mt-3 inline-flex items-center text-xs font-bold px-3 py-2 rounded-lg bg-white/70 border border-white ${e.texto}`}>
                        <PhoneCall size={14} className="mr-2" />
                        {n.tipo === 'vencido'
                          ? 'Contactar para regularizar o renovar el contrato.'
                          : 'Sugerimos contactar urgentemente para renovación.'}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MonitoreoContratos;
