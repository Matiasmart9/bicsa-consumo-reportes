// src/utils/excel.js
// Estilos y utilidades compartidas para todos los reportes Excel del sistema.
import XLSX from 'xlsx-js-style';

const COLOR = {
  marca: 'FF5105',
  marcaClaro: 'FFE5D1',
  marcaOscuro: '9F2405',
  azul: '1E3A5F',
  zebra: 'F8FAFC',
  gris: 'F1F5F9',
  borde: 'CBD5E1',
  texto: '1E293B'
};

const FUENTE = 'Calibri';
const lado = { style: 'thin', color: { rgb: COLOR.borde } };
const BORDES = { top: lado, bottom: lado, left: lado, right: lado };

// Colores de semáforo para estados conocidos
const SEMAFORO = {
  verde: { fill: 'D1FAE5', font: '065F46' },
  ambar: { fill: 'FEF3C7', font: '92400E' },
  rojo: { fill: 'FEE2E2', font: '991B1B' },
  naranja: { fill: 'FFEDD5', font: '9A3412' },
  azul: { fill: 'DBEAFE', font: '1E40AF' },
  gris: { fill: 'E2E8F0', font: '475569' },
  amarillo: { fill: 'FEF9C3', font: '854D0E' }
};

const semaforoDeTexto = (texto) => {
  const t = String(texto).trim().toLowerCase();
  if (t === 'activo' || t === 'uso normal' || t === 'pagado' || t === 'sí') return SEMAFORO.verde;
  if (t === 'pendiente' || t === 'uso óptimo' || t === 'próximo' || t === 'renovacion') return SEMAFORO.ambar;
  if (t === 'vencido' || t === 'no renov.' || t === 'finalizada' || t === 'no_renovada' || t === 'uso crítico' || t.includes('contrato vencido')) return SEMAFORO.rojo;
  if (t === 'crítico') return SEMAFORO.naranja;
  if (t === 'medio') return SEMAFORO.amarillo;
  if (t === 'bajo uso') return SEMAFORO.azul;
  if (t === 'no') return SEMAFORO.gris;
  return null;
};

// Etiqueta visible del estado de una institución (el valor guardado sigue siendo 'vencido')
export const etiquetaEstado = (estado) => (estado === 'vencido' ? 'No Renov.' : estado || 'activo');

const esTexto = (c) => c && typeof c.v === 'string' && c.v.trim() !== '';
const tieneValor = (c) => c && c.v !== undefined && c.v !== null && c.v !== '';

// dd/mm/yyyy para cualquier formato de fecha que maneje el sistema
// (Timestamp de Firestore, ISO yyyy-mm-dd, dd/mm/yyyy o Date).
export const formatearFecha = (valor) => {
  if (!valor) return 'N/A';
  try {
    if (typeof valor === 'string' && valor.includes('/')) return valor;
    const fecha = typeof valor?.toDate === 'function' ? valor.toDate() : new Date(valor);
    if (isNaN(fecha.getTime())) return 'N/A';
    return fecha.toLocaleDateString('es-ES');
  } catch {
    return 'N/A';
  }
};

export const formatearFechaHora = (valor) => {
  if (!valor) return 'Reciente';
  try {
    const fecha = typeof valor?.toDate === 'function' ? valor.toDate() : new Date(valor);
    return isNaN(fecha.getTime()) ? 'Reciente' : fecha.toLocaleString('es-ES');
  } catch {
    return 'Reciente';
  }
};

const estilo = (fuente, relleno, alineacion, bordes = true) => ({
  font: { name: FUENTE, sz: 11, color: { rgb: COLOR.texto }, ...fuente },
  ...(relleno ? { fill: { patternType: 'solid', fgColor: { rgb: relleno } } } : {}),
  alignment: { vertical: 'center', ...alineacion },
  ...(bordes ? { border: BORDES } : {})
});

const asegurarCelda = (ws, r, c) => {
  const ref = XLSX.utils.encode_cell({ r, c });
  if (!ws[ref]) ws[ref] = { t: 's', v: '' };
  return ws[ref];
};

/**
 * Aplica el estilo corporativo a una hoja ya creada (aoa_to_sheet o json_to_sheet).
 * - conTitulo: la fila 0 es un título (hojas armadas con aoa_to_sheet).
 * - Detecta títulos, secciones "=== X ===", encabezados de tabla, filas de estadística y datos.
 */
export const estilizarHoja = (ws, { conTitulo = true, filtro = false } = {}) => {
  if (!ws['!ref']) return ws;
  const rango = XLSX.utils.decode_range(ws['!ref']);
  const filas = rango.e.r;
  const cols = rango.e.c;

  const celdasFila = (r) => {
    const lista = [];
    for (let c = 0; c <= cols; c++) {
      const cel = ws[XLSX.utils.encode_cell({ r, c })];
      if (tieneValor(cel)) lista.push({ c, cel });
    }
    return lista;
  };

  // 1) Clasificar filas
  const tipos = [];
  const encabezados = {}; // fila de encabezado -> { c: texto }
  let enTabla = false;
  let encabezadoActual = null;
  let filaEncabezadoActual = -1;
  let anchoMax = 1;

  for (let r = 0; r <= filas; r++) {
    const llenas = celdasFila(r);
    const previo = tipos[r - 1];
    let tipo;

    if (conTitulo && r === 0) {
      tipo = 'titulo';
    } else if (llenas.length === 0) {
      tipo = 'vacia';
      enTabla = false;
    } else if (llenas.length === 1 && esTexto(llenas[0].cel) && llenas[0].cel.v.startsWith('===')) {
      tipo = 'seccion';
      enTabla = false;
    } else if (
      llenas.length >= (conTitulo ? 3 : 2) &&
      llenas.every(({ cel }) => esTexto(cel)) &&
      (r === 0 || ['vacia', 'seccion', 'titulo'].includes(previo)) &&
      !enTabla
    ) {
      tipo = 'encabezado';
      enTabla = true;
      encabezadoActual = {};
      llenas.forEach(({ c, cel }) => { encabezadoActual[c] = cel.v; });
      encabezados[r] = encabezadoActual;
      filaEncabezadoActual = r;
      anchoMax = Math.max(anchoMax, llenas[llenas.length - 1].c + 1);
    } else if (!enTabla && llenas.length <= 2) {
      tipo = 'stat';
    } else {
      tipo = 'dato';
    }
    tipos.push(tipo);
    tipos[r] = tipo;
    // guardamos a qué encabezado pertenece cada fila de datos
    if (tipo === 'dato') tipos[r] = { tipo, encabezado: encabezadoActual, inicio: filaEncabezadoActual };
  }

  const anchoTitulo = Math.max(anchoMax, 4);
  const merges = ws['!merges'] || [];
  const filasAlto = ws['!rows'] || [];
  const anchos = new Array(cols + 1).fill(10);

  const medir = (c, texto) => {
    anchos[c] = Math.max(anchos[c], Math.min(String(texto).length + 4, 60));
  };

  // 2) Aplicar estilos
  for (let r = 0; r <= filas; r++) {
    const t = typeof tipos[r] === 'object' ? tipos[r].tipo : tipos[r];

    if (t === 'titulo') {
      for (let c = 0; c < anchoTitulo; c++) {
        asegurarCelda(ws, r, c).s = estilo({ sz: 16, bold: true, color: { rgb: 'FFFFFF' } }, COLOR.azul, { horizontal: 'left', indent: 1 }, false);
      }
      merges.push({ s: { r, c: 0 }, e: { r, c: anchoTitulo - 1 } });
      filasAlto[r] = { hpx: 34 };
    } else if (t === 'seccion') {
      for (let c = 0; c < anchoTitulo; c++) {
        asegurarCelda(ws, r, c).s = estilo({ sz: 12, bold: true, color: { rgb: COLOR.marcaOscuro } }, COLOR.marcaClaro, { horizontal: 'left', indent: 1 }, false);
      }
      const cel = ws[XLSX.utils.encode_cell({ r, c: 0 })];
      cel.v = cel.v.replace(/^=+\s*|\s*=+$/g, '').trim();
      merges.push({ s: { r, c: 0 }, e: { r, c: anchoTitulo - 1 } });
      filasAlto[r] = { hpx: 24 };
    } else if (t === 'encabezado') {
      const enc = encabezados[r];
      const ultimo = Math.max(...Object.keys(enc).map(Number));
      for (let c = 0; c <= ultimo; c++) {
        const cel = asegurarCelda(ws, r, c);
        cel.s = estilo({ bold: true, color: { rgb: 'FFFFFF' } }, COLOR.marca, { horizontal: 'center', wrapText: true });
        medir(c, cel.v);
      }
      filasAlto[r] = { hpx: 30 };
    } else if (t === 'stat') {
      celdasFila(r).forEach(({ c, cel }, i) => {
        cel.s = i === 0
          ? estilo({ bold: true }, COLOR.gris, { horizontal: 'left', indent: 1 })
          : estilo({ bold: true, color: { rgb: COLOR.marcaOscuro } }, null, { horizontal: 'left' });
        if (typeof cel.v === 'number') cel.z = '#,##0';
        if (c === 0) medir(c, cel.v);
      });
    } else if (t === 'dato') {
      const { encabezado, inicio } = tipos[r];
      const ultimo = Math.max(...Object.keys(encabezado).map(Number));
      const zebra = (r - inicio) % 2 === 0 ? COLOR.zebra : null;

      for (let c = 0; c <= ultimo; c++) {
        const cel = asegurarCelda(ws, r, c);
        const titulo = (encabezado[c] || '').toLowerCase();
        const esNumero = typeof cel.v === 'number';
        const largo = /comentario|detalle/.test(titulo);

        let fuente = {};
        let relleno = zebra;
        const semaforo = typeof cel.v === 'string' ? semaforoDeTexto(cel.v) : null;
        if (semaforo) {
          fuente = { bold: true, color: { rgb: semaforo.font } };
          relleno = semaforo.fill;
        }

        if (typeof cel.v === 'string' && /%$/.test(cel.v) && /^%|\(%\)|uso/.test(titulo)) {
          const pct = parseFloat(cel.v);
          if (pct >= 90) fuente = { bold: true, color: { rgb: SEMAFORO.rojo.font } };
          else if (pct >= 70) fuente = { bold: true, color: { rgb: SEMAFORO.ambar.font } };
        }

        let alineacion = { horizontal: 'left', wrapText: largo };
        if (esNumero) alineacion = { horizontal: 'right' };
        else if (semaforo || /%$/.test(String(cel.v)) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(cel.v))) alineacion = { horizontal: 'center' };

        if (esNumero) {
          const dinero = /monto|\(gs\)|consulta|asignada|consumida|restante|consumo|promedio|cobrado|saldo/.test(titulo);
          cel.z = dinero ? '#,##0' : '0';
        }

        cel.s = estilo(fuente, relleno, alineacion);
        medir(c, esNumero ? Number(cel.v).toLocaleString('es-ES') : cel.v);
      }
    }
  }

  // Un solo ancho por columna: el mayor entre encabezados, datos y etiquetas de estadística
  ws['!cols'] = anchos.map((wch) => ({ wch: Math.min(Math.max(wch, 12), 60) }));
  ws['!merges'] = merges;
  ws['!rows'] = filasAlto;

  if (filtro) {
    const filaEnc = Object.keys(encabezados).map(Number)[0];
    if (filaEnc !== undefined) {
      const ultimo = Math.max(...Object.keys(encabezados[filaEnc]).map(Number));
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: filaEnc, c: 0 }, e: { r: filas, c: ultimo } }) };
    }
  }
  return ws;
};

// Hoja a partir de una lista de objetos (primera fila = encabezados) ya estilizada.
export const hojaDesdeObjetos = (datos) =>
  estilizarHoja(XLSX.utils.json_to_sheet(datos), { conTitulo: false, filtro: true });

// Hoja a partir de filas ya estilizada (con título, secciones, etc.).
export const hojaDesdeFilas = (filas) => estilizarHoja(XLSX.utils.aoa_to_sheet(filas), { conTitulo: true });

export const descargarLibro = (hojas, nombreArchivo) => {
  const wb = XLSX.utils.book_new();
  hojas.forEach(({ nombre, hoja }) => XLSX.utils.book_append_sheet(wb, hoja, nombre));
  XLSX.writeFile(wb, nombreArchivo);
};
