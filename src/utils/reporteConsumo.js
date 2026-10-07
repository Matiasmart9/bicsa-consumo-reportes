// src/utils/reporteConsumo.js
// Reporte Excel principal de consumo (usado por el Dashboard y por el panel Admin).
import { descargarLibro, etiquetaEstado, formatearFecha, hojaDesdeFilas } from './excel';
import { describirVigencia, obtenerContratosPorVencer } from './contratos';
import { tieneSeguimientoVencimiento } from './plan';

const porcentaje = (consumidas, asignadas, decimales = 1) =>
  `${asignadas > 0 ? ((consumidas / asignadas) * 100).toFixed(decimales) : 0}%`;

const resumenContrato = (inst) => {
  const asignadas = inst.contrato?.asignadas || 0;
  const consumidas = inst.contrato?.consumidas || 0;
  return { asignadas, consumidas, restantes: asignadas - consumidas };
};

// Filas de la hoja "Monitoreo Contratos" (se usa en el reporte de consumo y en el Excel propio de Monitoreo)
const filasMonitoreo = (instituciones, fecha) => {
  const monitoreados = obtenerContratosPorVencer(instituciones);
  // Crítico: 15 días o menos. Medio: de 16 días hasta 1 mes. Próximo: hasta 2 meses.
  const situacionDe = (c) => {
    if (c.tipo === 'vencido') return 'Vencido';
    if (c.tipo === 'advertencia') return 'Próximo';
    return c.dias <= 15 ? 'Crítico' : 'Medio';
  };
  const monitoreo = [
    ['MONITOREO DE CONTRATOS - VENCIMIENTOS'],
    [''],
    ['Fecha de Generación:', fecha],
    [''],
    ['=== RESUMEN ==='],
    ['Contratos Vencidos:', monitoreados.filter(c => c.tipo === 'vencido').length],
    ['Contratos Críticos (15 días o menos):', monitoreados.filter(c => situacionDe(c) === 'Crítico').length],
    ['Contratos Medios (de 16 días hasta 1 mes):', monitoreados.filter(c => situacionDe(c) === 'Medio').length],
    ['Contratos Próximos a Vencer (2 meses):', monitoreados.filter(c => c.tipo === 'advertencia').length],
    [''],
    ['=== DETALLE DE CONTRATOS ==='],
    ['Institución', 'Plan / Categoría', 'Fecha Vencimiento', 'Situación', 'Tiempo', 'Avance del Contrato']
  ];
  monitoreados.forEach((c) => {
    monitoreo.push([
      c.nombre,
      c.categoria,
      formatearFecha(c.fecha),
      situacionDe(c),
      describirVigencia(c.fecha),
      c.progreso !== null ? `${Math.round(c.progreso)}%` : 'N/A'
    ]);
  });
  return monitoreo;
};

// Excel solo con la hoja de Monitoreo Contratos
export const generarReporteMonitoreoExcel = (instituciones) => {
  const fecha = new Date().toLocaleDateString('es-ES');
  const nombreArchivo = `Monitoreo_Contratos_${new Date().toISOString().split('T')[0]}.xlsx`;
  descargarLibro(
    [{ nombre: 'Monitoreo Contratos', hoja: hojaDesdeFilas(filasMonitoreo(instituciones, fecha)) }],
    nombreArchivo
  );
  return nombreArchivo;
};

export const generarReporteConsumoExcel = (instituciones) => {
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('es-ES');
  const hora = ahora.toLocaleTimeString('es-ES');

  const activas = instituciones.filter(i => i.estado === 'activo' || !i.estado).length;
  const pendientes = instituciones.filter(i => i.estado === 'pendiente').length;
  const vencidas = instituciones.filter(i => i.estado === 'vencido').length;
  const conHistorial = instituciones.filter(i => i.historial && i.historial.length > 0).length;
  const totalAsignadas = instituciones.reduce((t, i) => t + (i.contrato?.asignadas || 0), 0);
  const totalConsumidas = instituciones.reduce((t, i) => t + (i.contrato?.consumidas || 0), 0);
  const totalRenovaciones = instituciones.reduce((t, i) => t + (i.historial ? i.historial.length : 0), 0);

  // === HOJA 1: DASHBOARD ===
  const dashboard = [
    ['REPORTE DE CONSUMO MiPymes - BICSA'],
    [''],
    ['Fecha de Generación:', fecha],
    ['Hora de Generación:', hora],
    [''],
    ['=== ESTADÍSTICAS GENERALES ==='],
    ['Total de Instituciones:', instituciones.length],
    ['Instituciones Activas:', activas],
    ['Instituciones Pendientes:', pendientes],
    ['Instituciones Vencidas (No Renovadas):', vencidas],
    ['Instituciones con Historial (Renovaciones):', conHistorial],
    ['Promedio de Uso General (%):', porcentaje(totalConsumidas, totalAsignadas)],
    [''],
    ['=== CONSUMO DETALLADO POR INSTITUCIÓN ==='],
    ['Institución', 'Plan / Categoría', 'Estado', 'Consultas Asignadas', 'Consultas Consumidas', 'Consultas Restantes', '% Consumo', 'Fecha Inicio', 'Fecha Vencimiento', 'Vigencia del Contrato', 'Duración (meses)', 'Períodos Anteriores']
  ];

  instituciones.forEach((inst) => {
    const { asignadas, consumidas, restantes } = resumenContrato(inst);
    dashboard.push([
      inst.nombre,
      inst.categoria || 'Sin Categoría',
      etiquetaEstado(inst.estado),
      asignadas,
      consumidas,
      restantes,
      porcentaje(consumidas, asignadas),
      formatearFecha(inst.contrato?.fechaInicio || inst.fechaCreacion),
      formatearFecha(inst.contrato?.fechaFin),
      describirVigencia(inst.contrato?.fechaFin),
      inst.contrato?.duracionMeses || 0,
      inst.historial ? inst.historial.length : 0
    ]);
  });

  dashboard.push(['']);
  dashboard.push(['=== CONSUMO MENSUAL DETALLADO ===']);
  dashboard.push(['Institución', 'Mes', 'Consumo Registrado', 'Estado Institución']);
  instituciones.forEach((inst) => {
    Object.entries(inst.consumoPorMes || {})
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([mes, consumo]) => dashboard.push([inst.nombre, mes, consumo, etiquetaEstado(inst.estado)]));
  });

  // === HOJA 2: INSTITUCIONES ===
  const detalle = [
    ['DETALLE COMPLETO DE INSTITUCIONES'],
    [''],
    ['Fecha de Generación:', fecha],
    [''],
    ['ID', 'Nombre', 'Plan / Categoría', 'Seguimiento de Vencimiento', 'Estado', 'Fecha Creación', 'Fecha Inicio Contrato', 'Fecha Vencimiento', 'Vigencia del Contrato', 'Duración (meses)', 'Consultas Asignadas', 'Consultas Consumidas', 'Consultas Restantes', '% Consumo', 'Períodos Anteriores', 'Meses Registrados']
  ];

  instituciones.forEach((inst, index) => {
    const { asignadas, consumidas, restantes } = resumenContrato(inst);
    detalle.push([
      index + 1,
      inst.nombre,
      inst.categoria || 'Sin Categoría',
      tieneSeguimientoVencimiento(inst) ? 'Sí' : 'No',
      etiquetaEstado(inst.estado),
      formatearFecha(inst.fechaCreacion),
      formatearFecha(inst.contrato?.fechaInicio),
      formatearFecha(inst.contrato?.fechaFin),
      describirVigencia(inst.contrato?.fechaFin),
      inst.contrato?.duracionMeses || 0,
      asignadas,
      consumidas,
      restantes,
      porcentaje(consumidas, asignadas),
      inst.historial ? inst.historial.length : 0,
      inst.consumoPorMes ? Object.keys(inst.consumoPorMes).length : 0
    ]);
  });

  detalle.push(['']);
  detalle.push(['=== HISTORIAL DE RENOVACIONES ===']);
  detalle.push(['Institución', 'Período #', 'Inicio Período', 'Fin Período', 'Duración (meses)', 'Consultas Asignadas', 'Consultas Consumidas', 'Consultas Restantes', '% Consumo', 'Fecha Renovación', 'Renovado Por', 'Comentario']);
  instituciones.forEach((inst) => {
    [...(inst.historial || [])].reverse().forEach((periodo, index) => {
      const asignadas = periodo.consultasAsignadas || 0;
      const consumidas = periodo.consultasConsumidas || 0;
      detalle.push([
        inst.nombre,
        index + 1,
        formatearFecha(periodo.periodoInicio),
        formatearFecha(periodo.periodoFin),
        periodo.duracionMeses || 0,
        asignadas,
        consumidas,
        asignadas - consumidas,
        porcentaje(consumidas, asignadas),
        formatearFecha(periodo.fechaRenovacion),
        periodo.renovadoPor || 'N/A',
        periodo.comentario || 'Sin comentarios'
      ]);
    });
  });

  // === HOJA 3: MONITOREO DE CONTRATOS ===
  const monitoreo = filasMonitoreo(instituciones, fecha);

  // === HOJA 4: CONSUMO MENSUAL ===
  const consumoMensual = [
    ['CONSUMO MENSUAL DETALLADO POR INSTITUCIÓN'],
    [''],
    ['Fecha de Generación:', fecha],
    [''],
    ['Institución', 'Mes/Año', 'Consumo Registrado', 'Estado Institución', '% del Total Asignado']
  ];
  const filasMensuales = [];
  instituciones.forEach((inst) => {
    const asignadas = inst.contrato?.asignadas || 0;
    Object.entries(inst.consumoPorMes || {})
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([mes, consumo]) => {
        filasMensuales.push([inst.nombre, mes, consumo, etiquetaEstado(inst.estado), porcentaje(consumo, asignadas, 2)]);
      });
  });
  filasMensuales.sort((a, b) => a[1].localeCompare(b[1]));
  consumoMensual.push(...filasMensuales);

  // === HOJA 5: ANÁLISIS ESTADÍSTICO ===
  const analisis = [
    ['ANÁLISIS ESTADÍSTICO DEL SISTEMA'],
    [''],
    ['Fecha de Generación:', fecha],
    [''],
    ['=== MÉTRICAS GENERALES ==='],
    ['Total de Instituciones:', instituciones.length],
    ['Instituciones con Historial:', conHistorial],
    ['Total de Renovaciones Registradas:', totalRenovaciones],
    ['Promedio de Renovaciones por Institución:', instituciones.length > 0 ? (totalRenovaciones / instituciones.length).toFixed(2) : 0],
    [''],
    ['=== ANÁLISIS DE CONSUMO ==='],
    ['Institución', 'Plan / Categoría', 'Consultas Asignadas', 'Consultas Consumidas', 'Consultas Restantes', '% Uso', 'Eficiencia', 'Períodos Históricos', 'Promedio Consumo/Mes']
  ];
  instituciones.forEach((inst) => {
    const { asignadas, consumidas, restantes } = resumenContrato(inst);
    const duracion = inst.contrato?.duracionMeses || 1;
    let eficiencia = 'N/A';
    if (asignadas > 0) {
      const uso = (consumidas / asignadas) * 100;
      eficiencia = uso < 50 ? 'Bajo Uso' : uso < 80 ? 'Uso Normal' : uso < 95 ? 'Uso Óptimo' : 'Uso Crítico';
    }
    analisis.push([
      inst.nombre,
      inst.categoria || 'Sin Categoría',
      asignadas,
      consumidas,
      restantes,
      porcentaje(consumidas, asignadas),
      eficiencia,
      inst.historial ? inst.historial.length : 0,
      Math.round(consumidas / duracion)
    ]);
  });

  const fechaHora = ahora.toISOString().slice(0, 19).replace(/:/g, '-');
  const nombreArchivo = `SegConsumo_Reporte_Usuario_${fechaHora}.xlsx`;

  descargarLibro([
    { nombre: 'Dashboard', hoja: hojaDesdeFilas(dashboard) },
    { nombre: 'Instituciones', hoja: hojaDesdeFilas(detalle) },
    { nombre: 'Monitoreo Contratos', hoja: hojaDesdeFilas(monitoreo) },
    { nombre: 'Consumo Mensual', hoja: hojaDesdeFilas(consumoMensual) },
    { nombre: 'Análisis Estadístico', hoja: hojaDesdeFilas(analisis) }
  ], nombreArchivo);

  return nombreArchivo;
};
