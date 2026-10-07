// src/components/instituciones/CampoMonto.jsx
import React from 'react';
import { limpiarMonto, formatearMontoInput } from '../../utils/moneda';

// Campo de monto con puntos de miles automáticos (3200000 -> 3.200.000) y etiqueta de moneda
const CampoMonto = ({ value, moneda, onChange, className, placeholder, disabled }) => (
  <div className="relative">
    <input
      type="text"
      inputMode={moneda === 'USD' ? 'decimal' : 'numeric'}
      value={formatearMontoInput(value, moneda)}
      onChange={(e) => onChange(limpiarMonto(e.target.value, moneda))}
      className={`${className} pr-16`}
      placeholder={placeholder}
      disabled={disabled}
    />
    {moneda && (
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400 pointer-events-none">{moneda}</span>
    )}
  </div>
);

export default CampoMonto;
