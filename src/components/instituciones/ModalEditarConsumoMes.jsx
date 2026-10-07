// src/components/instituciones/ModalEditarConsumoMes.jsx
import React, { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Edit3,
  Loader2,
  Plus,
  X
} from 'lucide-react';
import { sileo } from '../sileo';

const ModalEditarConsumoMes = ({ institucion, mesSeleccionado, onClose, onSave }) => {
  const [consumo, setConsumo] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (mesSeleccionado && institucion.consumoPorMes) {
      const consumoActual = institucion.consumoPorMes[mesSeleccionado] || 0;
      setConsumo(consumoActual.toString());
    }
  }, [mesSeleccionado, institucion.consumoPorMes]);

  const handleSubmit = async () => {
    if (consumo && parseInt(consumo) >= 0) {
      const consumoInt = parseInt(consumo);
      
      const consumoOtrosMeses = Object.entries(institucion.consumoPorMes || {})
        .filter(([mes]) => mes !== mesSeleccionado)
        .reduce((sum, [, valor]) => sum + valor, 0);
      
      const disponible = institucion.contrato.asignadas - consumoOtrosMeses;
      
      if (consumoInt > disponible) {
        sileo.warning({ title: 'Excede el límite', description: `No puedes registrar más de ${disponible.toLocaleString()} consultas disponibles considerando otros meses.` });
        return;
      }

      setSaving(true);
      const resultado = await onSave(institucion.id, {
        mes: mesSeleccionado,
        consumo: consumoInt
      });
      
      if (resultado.success) {
        onClose();
        sileo.success({ title: 'Consumo actualizado', description: `${consumoInt.toLocaleString()} consultas registradas para ${mesSeleccionado}.` });
      } else {
        sileo.error({ title: 'Error al actualizar', description: resultado.error });
      }
      setSaving(false);
    } else {
      sileo.warning({ title: 'Valor inválido', description: 'Por favor, ingresa un valor válido.' });
    }
  };

  const fechaMes = new Date(mesSeleccionado + '-01T00:00:00');
  const nombreMes = fechaMes.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });

  const consumoOtrosMeses = Object.entries(institucion.consumoPorMes || {})
    .filter(([m]) => m !== mesSeleccionado)
    .reduce((sum, [, valor]) => sum + valor, 0);
  const maxDisponibleParaEditar = (institucion.contrato.asignadas || 0) - consumoOtrosMeses;
  const restanteDinamico = maxDisponibleParaEditar - (parseInt(consumo) || 0);

  const consumoAnterior = institucion.consumoPorMes?.[mesSeleccionado] || 0;
  const asignadasTotal = institucion.contrato.asignadas || 0;
  const nuevoValor = parseInt(consumo) || 0;
  const excede = restanteDinamico < 0;
  const diferencia = nuevoValor - consumoAnterior;
  const pctOtros = asignadasTotal > 0 ? Math.min((consumoOtrosMeses / asignadasTotal) * 100, 100) : 0;
  const pctMes = asignadasTotal > 0 ? Math.min((nuevoValor / asignadasTotal) * 100, 100 - pctOtros) : 0;
  const pctTotal = pctOtros + pctMes;
  const colorMes = excede || pctTotal >= 90 ? 'bg-red-500' : pctTotal >= 70 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-400 px-6 py-5 flex items-center justify-between text-white">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Edit3 size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold leading-tight">Editar Consumo Mensual</h2>
              <p className="text-sm text-white/80 truncate">{institucion.nombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 transition-colors" disabled={saving}>
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/40">
          {/* Mes */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div className="flex items-center">
              <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mr-3">
                <Calendar size={20} />
              </span>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mes a editar</p>
                <p className="text-base font-extrabold text-slate-800 capitalize">{nombreMes}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor actual</p>
              <p className="text-base font-extrabold text-slate-800">{consumoAnterior.toLocaleString()}</p>
            </div>
          </section>

          {/* Nuevo valor */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="flex items-center text-sm font-extrabold text-slate-800 mb-3">
              <Plus size={16} className="mr-2 text-brand-500" /> Consultas consumidas en <span className="capitalize ml-1">{nombreMes}</span>
            </h3>
            <div className="flex gap-2">
              <input
                type="number"
                value={consumo}
                onChange={(e) => setConsumo(e.target.value)}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/60 text-lg font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition-all"
                placeholder="Ingrese cant. de consultas"
                min="0"
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => setConsumo(String(Math.max(maxDisponibleParaEditar, 0)))}
                disabled={saving || maxDisponibleParaEditar <= 0}
                className="px-4 py-3 text-sm font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-xl hover:bg-brand-100 transition-colors whitespace-nowrap disabled:opacity-50"
                title="Usar todas las consultas disponibles para este mes"
              >
                Máximo
              </button>
            </div>

            {/* Cambio respecto al valor actual */}
            {consumo !== '' && diferencia !== 0 && (
              <p className={`mt-2 text-xs font-bold ${diferencia > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {diferencia > 0 ? '+' : '−'}{Math.abs(diferencia).toLocaleString()} respecto al valor actual
              </p>
            )}

            {/* Vista previa del uso del contrato */}
            <div className="mt-4">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                <span>Uso del contrato</span>
                <span className={excede ? 'text-red-600' : 'text-slate-600'}>{excede ? '100+' : pctTotal.toFixed(1)}%</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200/60">
                <div className="h-full bg-slate-400 transition-all duration-300" style={{ width: `${pctOtros}%` }} />
                <div className={`h-full transition-all duration-300 ${colorMes}`} style={{ width: `${pctMes}%` }} />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="inline-flex items-center text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 mr-1.5" /> Otros meses
                  <span className={`w-2.5 h-2.5 rounded-full ${colorMes} ml-3 mr-1.5`} /> Este mes
                </span>
                <span className={`font-extrabold ${excede ? 'text-red-600' : 'text-emerald-600'}`}>
                  Restante: {restanteDinamico.toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Máx. disponible para este mes: {maxDisponibleParaEditar.toLocaleString()}</p>
            </div>

            {excede && (
              <div className="mt-3 flex items-center text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertTriangle size={14} className="mr-2 flex-shrink-0" />
                Supera las {maxDisponibleParaEditar.toLocaleString()} consultas disponibles considerando los otros meses.
              </div>
            )}
          </section>
        </div>

        {/* Pie */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-bold"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 text-white bg-brand-500 rounded-xl hover:bg-brand-600 transition-colors flex items-center space-x-2 disabled:opacity-50 font-bold shadow-md"
            disabled={saving}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            <span>{saving ? 'Actualizando...' : 'Actualizar Consumo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEditarConsumoMes;
