// src/utils/contratos.js
import { debeMonitorearVencimiento } from './plan';

export const parsearFecha = (valor) => {
  if (!valor) return null;
  if (valor.includes('/')) {
    const [d, m, a] = valor.split('/');
    return new Date(`${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
  }
  return new Date(valor);
};

export const mesesHasta = (desde, hasta) => {
  let meses = (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth());
  if (hasta.getDate() < desde.getDate()) meses--;
  return Math.max(0, meses);
};

// tipo: 'vencido' (ya pasó la fecha) | 'critico' (<= 1 mes) | 'advertencia' (<= 2 meses)
export const obtenerContratosPorVencer = (instituciones) => {
  const hoy = new Date();
  const items = [];

  instituciones.forEach((inst) => {
    const activa = inst.estado === 'activo' || !inst.estado;
    if (!activa || !inst.contrato?.fechaFin || !debeMonitorearVencimiento(inst)) return;

    const vencimiento = parsearFecha(inst.contrato.fechaFin);
    if (!vencimiento || isNaN(vencimiento.getTime())) return;

    const meses = mesesHasta(hoy, vencimiento);
    if (meses > 2) return;

    const dias = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    let progreso = null;
    const inicio = parsearFecha(inst.contrato.fechaInicio);
    if (inicio && !isNaN(inicio.getTime()) && vencimiento > inicio) {
      progreso = Math.min(100, Math.max(0, ((hoy - inicio) / (vencimiento - inicio)) * 100));
    }

    items.push({
      id: inst.id,
      nombre: inst.nombre,
      categoria: inst.categoria || 'Sin Categoría',
      fecha: inst.contrato.fechaFin,
      meses,
      dias,
      progreso,
      tipo: dias < 0 ? 'vencido' : meses <= 1 ? 'critico' : 'advertencia'
    });
  });

  return items.sort((a, b) => a.dias - b.dias);
};

// Texto legible de vigencia: "11 Días Contrato Vencido", "12 días restantes", "3 meses restantes"
export const describirVigencia = (fechaFin) => {
  const vencimiento = parsearFecha(fechaFin);
  if (!vencimiento || isNaN(vencimiento.getTime())) return 'N/A';
  const hoy = new Date();
  const dias = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (dias < 0) {
    const d = Math.abs(dias);
    return `${d} ${d === 1 ? 'Día' : 'Días'} Contrato Vencido`;
  }
  if (dias === 0) return 'Vence hoy';
  if (dias <= 31) return `${dias} ${dias === 1 ? 'día restante' : 'días restantes'}`;
  const meses = mesesHasta(hoy, vencimiento);
  return meses === 1 ? '1 mes restante' : `${meses} meses restantes`;
};
