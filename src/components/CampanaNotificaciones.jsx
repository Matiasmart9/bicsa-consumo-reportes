// src/components/CampanaNotificaciones.jsx
// Campanita de la barra superior. Cada usuario marca sus propias notificaciones como leídas.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, Bell, BellOff, CheckCheck, Flame, Gauge } from 'lucide-react';
import { useNotificaciones } from '../hooks/useNotificaciones';

// En la pestaña "Leídas" se muestran como máximo las últimas de este número
const MAX_LEIDAS_VISIBLES = 20;

const ESTILO = {
  vencido: { icono: AlertOctagon, caja: 'bg-red-100 text-red-600' },
  critico: { icono: AlertTriangle, caja: 'bg-orange-100 text-orange-600' },
  consumo_critico: { icono: Flame, caja: 'bg-red-100 text-red-600' },
  consumo_alto: { icono: Gauge, caja: 'bg-amber-100 text-amber-600' }
};

const CampanaNotificaciones = ({ rol, permisos }) => {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [verLeidas, setVerLeidas] = useState(false);
  const { notificaciones, sinLeer, leidas, marcarLeida, marcarTodasLeidas } = useNotificaciones({ rol, permisos });

  const todasLeidas = notificaciones
    .filter(n => leidas[n.clave])
    .sort((a, b) => (leidas[b.clave] || 0) - (leidas[a.clave] || 0)); // las más recientes primero
  const lista = verLeidas ? todasLeidas.slice(0, MAX_LEIDAS_VISIBLES) : sinLeer;
  const cantidadLeidas = todasLeidas.length;

  const abrirNotificacion = (n) => {
    if (!leidas[n.clave]) marcarLeida(n.clave);
    setAbierto(false);
    navigate(n.ruta);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto(v => !v)}
        className="relative p-2 hover:bg-white/10 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 active:scale-95"
        title="Notificaciones"
      >
        <Bell size={22} />
        {sinLeer.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full bg-white text-[#ff5105] text-[11px] font-extrabold flex items-center justify-center shadow">
            {sinLeer.length > 9 ? '9+' : sinLeer.length}
          </span>
        )}
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 mt-2 w-[22rem] max-w-[92vw] bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <p className="font-extrabold text-sm">Notificaciones</p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {sinLeer.length === 0 ? 'Estás al día' : `${sinLeer.length} sin leer`}
                </p>
              </div>
              {sinLeer.length > 0 && !verLeidas && (
                <button onClick={marcarTodasLeidas} className="inline-flex items-center text-xs font-bold text-brand-600 hover:text-brand-700">
                  <CheckCheck size={14} className="mr-1" /> Marcar todas
                </button>
              )}
            </div>

            <div className="flex border-b border-slate-100 text-xs font-bold">
              <button onClick={() => setVerLeidas(false)} className={`flex-1 py-2 transition-colors ${!verLeidas ? 'text-brand-600 border-b-2 border-brand-500' : 'text-slate-400 hover:text-slate-600'}`}>
                Sin leer ({sinLeer.length})
              </button>
              <button onClick={() => setVerLeidas(true)} className={`flex-1 py-2 transition-colors ${verLeidas ? 'text-brand-600 border-b-2 border-brand-500' : 'text-slate-400 hover:text-slate-600'}`}>
                Leídas ({cantidadLeidas})
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {verLeidas && cantidadLeidas > MAX_LEIDAS_VISIBLES && (
                <p className="px-4 py-2 text-[11px] text-slate-400 bg-slate-50 border-b border-slate-100">
                  Se muestran las últimas {MAX_LEIDAS_VISIBLES} de {cantidadLeidas}. Las leídas se eliminan solas cuando el aviso deja de aplicar.
                </p>
              )}
              {lista.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <BellOff size={30} className="mx-auto mb-2" />
                  <p className="text-sm font-semibold">{verLeidas ? 'No hay notificaciones leídas' : 'No tienes notificaciones nuevas'}</p>
                </div>
              ) : lista.map((n) => {
                const e = ESTILO[n.tipo];
                const Icono = e.icono;
                const leida = !!leidas[n.clave];
                return (
                  <div key={n.clave} className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 hover:bg-brand-50/40 transition-colors ${leida ? 'opacity-70' : ''}`}>
                    <button onClick={() => abrirNotificacion(n)} className="flex items-start gap-3 flex-1 min-w-0 text-left">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${e.caja}`}><Icono size={18} /></span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">{n.titulo}</span>
                        <span className="block text-sm font-extrabold text-slate-800 truncate">{n.institucion}</span>
                        <span className="block text-xs text-slate-500 leading-snug">{n.detalle}</span>
                      </span>
                    </button>
                    {!leida && (
                      <button onClick={() => marcarLeida(n.clave)} className="mt-1 p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Marcar como leída">
                        <CheckCheck size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CampanaNotificaciones;
