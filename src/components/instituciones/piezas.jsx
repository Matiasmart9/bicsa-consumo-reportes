// src/components/instituciones/piezas.jsx
import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CalendarClock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { describirVigencia } from '../../utils/contratos';
import { colorUso } from './ayudas';

// ---------- Piezas visuales de la pantalla de Instituciones ----------

// Número que sube animado hasta su valor
export const NumeroAnimado = ({ valor }) => {
  const [mostrado, setMostrado] = useState(0);
  useEffect(() => {
    let frame;
    const inicio = performance.now();
    const duracion = 700;
    const paso = (t) => {
      const p = Math.min((t - inicio) / duracion, 1);
      setMostrado(Math.round(valor * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(paso);
    };
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [valor]);
  return <>{mostrado.toLocaleString()}</>;
};

// Medidor circular de uso del contrato
export const MedidorUso = ({ porcentaje, color: colorPropio }) => {
  const radio = 34;
  const circunferencia = 2 * Math.PI * radio;
  const color = colorPropio || colorUso(porcentaje);
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90">
        <circle cx="42" cy="42" r={radio} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <motion.circle
          cx="42" cy="42" r={radio} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circunferencia}
          initial={{ strokeDashoffset: circunferencia }}
          animate={{ strokeDashoffset: circunferencia * (1 - porcentaje / 100) }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-slate-800 leading-none">{Math.round(porcentaje)}%</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">uso</span>
      </div>
    </div>
  );
};

export const ChipVigencia = ({ dias, fechaFin }) => {
  if (dias === null) return null;
  let estilos = 'bg-slate-100 text-slate-600 border-slate-200';
  let Icono = CalendarClock;
  if (dias < 0) { estilos = 'bg-red-100 text-red-700 border-red-200'; Icono = AlertOctagon; }
  else if (dias <= 31) { estilos = 'bg-orange-100 text-orange-700 border-orange-200'; Icono = AlertTriangle; }
  else if (dias <= 62) { estilos = 'bg-amber-100 text-amber-700 border-amber-200'; }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${estilos}`}>
      <Icono size={12} className="mr-1" /> {describirVigencia(fechaFin)}
    </span>
  );
};

export const TarjetaKpi = ({ icono: Icono, etiqueta, valor, total, color, barra, activa, onClick, indice }) => (
  <motion.button
    type="button"
    onClick={onClick}
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: indice * 0.07, duration: 0.35 }}
    className={`text-left bg-white rounded-2xl border p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all ${
      activa ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200'
    }`}
  >
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{etiqueta}</span>
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icono size={20} />
      </span>
    </div>
    <p className="text-4xl font-black text-slate-800 mt-2 text-center"><NumeroAnimado valor={valor} /></p>
    <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${barra}`}
        initial={{ width: 0 }}
        animate={{ width: `${total > 0 ? (valor / total) * 100 : 0}%` }}
        transition={{ duration: 0.8, delay: indice * 0.07 }}
      />
    </div>
    <p className="text-[11px] font-semibold text-slate-400 mt-1.5 text-center">
      {total > 0 ? Math.round((valor / total) * 100) : 0}% del total
    </p>
  </motion.button>
);
