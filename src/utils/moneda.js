// src/utils/moneda.js
// Monedas de los contratos: PYG (guaraníes, sin decimales) y USD (dólares, con centavos).
export const MONEDAS = [
  { valor: 'PYG', etiqueta: 'PYG - Guaraníes' },
  { valor: 'USD', etiqueta: 'USD - Dólares' }
];

// Las instituciones creadas antes de existir este campo son todas PYG.
export const monedaDe = (registro) => registro?.moneda || 'PYG';

const conPuntos = (digitos) => digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Convierte lo que escribe el usuario ("3.200.000" o "1.234,5") en un valor limpio ("3200000" o "1234.5").
// En USD la coma es el separador decimal (máx. 2 decimales); en PYG solo se aceptan dígitos.
export const limpiarMonto = (texto, moneda = 'PYG') => {
  const t = String(texto ?? '');
  if (moneda === 'USD') {
    const [entera, ...resto] = t.replace(/\./g, '').split(',');
    const digitos = entera.replace(/\D/g, '');
    if (resto.length === 0) return digitos;
    return `${digitos}.${resto.join('').replace(/\D/g, '').slice(0, 2)}`;
  }
  return t.replace(/\D/g, '');
};

// Valor limpio -> texto del campo, con puntos de miles ("3200000" -> "3.200.000").
export const formatearMontoInput = (valor, moneda = 'PYG') => {
  const s = String(valor ?? '');
  if (s === '') return '';
  const [entera, decimales] = s.split('.');
  const enteraFmt = conPuntos(entera.replace(/^0+(?=\d)/, ''));
  if (moneda === 'USD' && s.includes('.')) return `${enteraFmt || '0'},${decimales ?? ''}`;
  return enteraFmt;
};

// Número -> texto para mostrar ("3.200.000" o "1.234,50").
export const formatearMonto = (valor, moneda = 'PYG') => {
  const decimales = moneda === 'USD' ? 2 : 0;
  return Number(valor || 0).toLocaleString('es-PY', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  });
};

// Cuota = total / plazo, redondeada según la moneda (PYG entero, USD con centavos).
export const redondearCuota = (valor, moneda = 'PYG') =>
  moneda === 'USD' ? Math.round(valor * 100) / 100 : Math.round(valor);

// "3.200.000 PYG"
export const montoConMoneda = (valor, moneda = 'PYG') => `${formatearMonto(valor, moneda)} ${moneda}`;

// Suma montos agrupados por moneda: [{ monto, moneda }] -> { PYG: n, USD: n }
export const sumarPorMoneda = (items) => {
  const totales = {};
  items.forEach(({ monto, moneda }) => {
    const m = moneda || 'PYG';
    totales[m] = (totales[m] || 0) + (Number(monto) || 0);
  });
  return totales;
};

// { PYG: 100, USD: 5 } -> "100 PYG + 5,00 USD" (0 PYG si no hay nada)
export const textoTotales = (totales) => {
  const entradas = Object.entries(totales);
  if (entradas.length === 0) return montoConMoneda(0, 'PYG');
  return entradas.map(([m, v]) => montoConMoneda(v, m)).join(' + ');
};
