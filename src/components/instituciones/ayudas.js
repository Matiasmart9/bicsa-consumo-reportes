// src/components/instituciones/ayudas.js
import { parsearFecha } from '../../utils/contratos';

export const iniciales = (nombre = '') =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';

export const gradienteCategoria = (categoria = '') => {
  if (categoria.includes('Gold')) return 'from-amber-400 to-yellow-500';
  if (categoria.includes('Premium')) return 'from-brand-500 to-amber-500';
  if (categoria.includes('BUSINESS')) return 'from-indigo-500 to-blue-500';
  return 'from-slate-400 to-slate-500';
};

export const diasParaVencer = (institucion) => {
  const fin = parsearFecha(institucion.contrato?.fechaFin);
  if (!fin || isNaN(fin.getTime())) return null;
  return Math.ceil((fin.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

export const colorUso = (pct) => (pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981');
