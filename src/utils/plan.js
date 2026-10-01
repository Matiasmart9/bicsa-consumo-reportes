// src/utils/plan.js
export const esPlanPremium = (categoria) =>
  categoria === 'Plan Premium' || categoria === 'Plan Premium Gold';

// Las instituciones sin valor guardado (o que no son Premium) siguen monitoreándose.
export const debeMonitorearVencimiento = (institucion) =>
  !(esPlanPremium(institucion.categoria) && institucion.seguimientoConsumo === 'no');

// Columna "Seguimiento de Vencimiento" de los reportes: solo las instituciones activas se siguen
// (las pendientes y las que no renovaron no aparecen en Monitoreo Contratos).
export const tieneSeguimientoVencimiento = (institucion) =>
  (institucion.estado === 'activo' || !institucion.estado) && debeMonitorearVencimiento(institucion);
