// src/utils/permisos.js
// Reglas de acceso que se repiten en varias pantallas.

// Auditoría: el administrador siempre; el resto según el permiso "Acceso a Auditoría".
// Los usuarios de Contabilidad anteriores a este permiso (sin valor guardado) la conservan.
export const puedeVerAuditoria = (rol, permisos) => {
  if (rol === 'admin') return true;
  const acceso = permisos?.auditoria?.acceso;
  if (typeof acceso === 'boolean') return acceso;
  return rol === 'contabilidad';
};

// Monitoreo Contratos: todos conservan el acceso salvo que se les quite explícitamente.
export const puedeVerMonitoreo = (rol, permisos) =>
  rol === 'admin' || permisos?.monitoreoContratos?.acceso !== false;
