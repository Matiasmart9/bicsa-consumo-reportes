// src/components/instituciones/ModalConsumoMensual.jsx
import React, { useState } from 'react';
import {
  AlertTriangle,
  BarChart2,
  Calendar,
  CheckCircle2,
  Loader2,
  Plus,
  X
} from 'lucide-react';
import { sileo } from '../sileo';

const ModalConsumoMensual = ({ institucion, onClose, onSave }) => {
  const [mes, setMes] = useState('');
  const [consumo, setConsumo] = useState('');
  const [saving, setSaving] = useState(false);

  const mesesDisponibles = () => {
    const meses = [];
    const consumoRegistrado = institucion.consumoPorMes || {};

    const rawInicio = institucion.contrato?.fechaInicio || institucion.fechaCreacion.split('/').reverse().join('-');
    const fechaInicio = new Date(rawInicio);

    let fechaFin;
    const rawFin = institucion.contrato?.fechaFin;
    if (rawFin && rawFin !== 'N/A') {
      if (rawFin.includes('/')) {
        const partes = rawFin.split('/');
        fechaFin = new Date(`${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`);
      } else {
        fechaFin = new Date(rawFin);
      }
    }

    if (!fechaFin || isNaN(fechaFin.getTime())) {
      fechaFin = new Date(fechaInicio);
      fechaFin.setMonth(fechaInicio.getMonth() + (institucion.contrato.duracionMeses || 6));
    }

    const mesInicio = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 1);
    const mesFin = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), 1);

    const cursor = new Date(mesInicio);
    while (cursor <= mesFin) {
      const valor = `${cursor.getFullYear()}-${(cursor.getMonth() + 1).toString().padStart(2, '0')}`;
      const texto = cursor.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });

      if (!(valor in consumoRegistrado)) {
        meses.push({ valor, texto });
      }

      cursor.setMonth(cursor.getMonth() + 1);
    }

    return meses;
  };

  const mesesPendientes = mesesDisponibles();

  const handleSubmit = async () => {
    if (mes && consumo && parseInt(consumo) >= 0) {
      const consumoInt = parseInt(consumo);
      const disponible = institucion.contrato.asignadas - institucion.contrato.consumidas;
      
      if (consumoInt > disponible) {
        sileo.warning({ title: 'Excede el límite', description: `No puedes registrar más de ${disponible.toLocaleString()} consultas disponibles.` });
        return;
      }

      setSaving(true);
      const resultado = await onSave(institucion.id, {
        mes,
        consumo: consumoInt
      });
      
      if (resultado.success) {
        setMes('');
        setConsumo('');
        onClose();
        sileo.success({ title: 'Consumo registrado', description: `${consumoInt.toLocaleString()} consultas registradas para ${mes}.` });
      } else {
        sileo.error({ title: 'Error al registrar', description: resultado.error });
      }
      setSaving(false);
    } else {
      sileo.warning({ title: 'Campos incompletos', description: 'Por favor, complete todos los campos correctamente.' });
    }
  };

  const asignadas = institucion.contrato.asignadas || 0;
  const consumidas = institucion.contrato.consumidas || 0;
  const disponible = asignadas - consumidas;
  const nuevo = parseInt(consumo) || 0;
  const restante = disponible - nuevo;
  const excede = restante < 0;
  const pctActual = asignadas > 0 ? Math.min((consumidas / asignadas) * 100, 100) : 0;
  const pctNuevo = asignadas > 0 ? Math.min((nuevo / asignadas) * 100, 100 - pctActual) : 0;
  const pctProyectado = pctActual + pctNuevo;
  const colorProyectado = excede || pctProyectado >= 90 ? 'bg-red-500' : pctProyectado >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  const mesElegido = mesesPendientes.find(m => m.valor === mes);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-400 px-6 py-5 flex items-center justify-between text-white">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <BarChart2 size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold leading-tight">Registrar Consumo Mensual</h2>
              <p className="text-sm text-white/80 truncate">{institucion.nombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 transition-colors" disabled={saving}>
            <X size={22} />
          </button>
        </div>

        {mesesPendientes.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={34} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-800 mb-1">¡Todos los meses registrados!</h3>
            <p className="text-slate-500 text-sm">Ya registraste el consumo de todos los meses del contrato actual.</p>
            <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-bold shadow-md">
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/40">
              {/* Resumen del contrato */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Asignadas</p>
                    <p className="text-xl font-black text-blue-600">{asignadas.toLocaleString()}</p>
                  </div>
                  <div className="border-l border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Consumidas</p>
                    <p className="text-xl font-black text-slate-800">{consumidas.toLocaleString()}</p>
                  </div>
                  <div className="border-l border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Disponibles</p>
                    <p className="text-xl font-black text-emerald-600">{disponible.toLocaleString()}</p>
                  </div>
                </div>
              </section>

              {/* Mes */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="flex items-center text-sm font-extrabold text-slate-800 mb-1">
                  <Calendar size={16} className="mr-2 text-brand-500" /> Mes a registrar
                </h3>
                <p className="text-xs text-slate-500 mb-3">Solo se muestran los meses que aún no han sido registrados.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {mesesPendientes.map((m) => (
                    <button
                      key={m.valor}
                      type="button"
                      onClick={() => setMes(m.valor)}
                      disabled={saving}
                      className={`px-3 py-2.5 rounded-xl border-2 text-sm font-bold capitalize transition-all ${
                        mes === m.valor
                          ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {m.texto}
                    </button>
                  ))}
                </div>
              </section>

              {/* Consumo */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="flex items-center text-sm font-extrabold text-slate-800 mb-3">
                  <Plus size={16} className="mr-2 text-brand-500" /> Consultas consumidas{mesElegido ? ` en ${mesElegido.texto}` : ''}
                </h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={consumo}
                    onChange={(e) => setConsumo(e.target.value)}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/60 text-lg font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition-all"
                    placeholder="Ingrese cant. de consultas"
                    min="0"
                    max={disponible}
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() => setConsumo(String(disponible))}
                    disabled={saving || disponible <= 0}
                    className="px-4 py-3 text-sm font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-xl hover:bg-brand-100 transition-colors whitespace-nowrap disabled:opacity-50"
                    title="Usar todas las consultas disponibles"
                  >
                    Máximo
                  </button>
                </div>

                {/* Vista previa del uso del contrato */}
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    <span>Uso del contrato</span>
                    <span className={excede ? 'text-red-600' : 'text-slate-600'}>
                      {pctActual.toFixed(1)}% → {excede ? '100+' : pctProyectado.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200/60">
                    <div className="h-full bg-slate-400 transition-all duration-300" style={{ width: `${pctActual}%` }} />
                    <div className={`h-full transition-all duration-300 ${colorProyectado}`} style={{ width: `${pctNuevo}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="inline-flex items-center text-slate-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400 mr-1.5" /> Consumido
                      <span className={`w-2.5 h-2.5 rounded-full ${colorProyectado} ml-3 mr-1.5`} /> Este registro
                    </span>
                    <span className={`font-extrabold ${excede ? 'text-red-600' : 'text-emerald-600'}`}>
                      Restante: {restante.toLocaleString()}
                    </span>
                  </div>
                </div>

                {excede && (
                  <div className="mt-3 flex items-center text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertTriangle size={14} className="mr-2 flex-shrink-0" />
                    Supera las {disponible.toLocaleString()} consultas disponibles del contrato.
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
                className="px-6 py-2.5 text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors flex items-center space-x-2 disabled:opacity-50 font-bold shadow-md"
                disabled={saving}
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                <span>{saving ? 'Registrando...' : 'Registrar Consumo'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ModalConsumoMensual;
