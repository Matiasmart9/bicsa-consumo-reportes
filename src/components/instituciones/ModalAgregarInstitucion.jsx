// src/components/instituciones/ModalAgregarInstitucion.jsx
import React, { useState } from 'react';
import {
  Building,
  ClipboardList,
  Loader2,
  PlusCircle,
  Tag,
  X
} from 'lucide-react';
import { sileo } from '../sileo';
import { esPlanPremium } from '../../utils/plan';
import { MONEDAS } from '../../utils/moneda';
import CampoMonto from './CampoMonto';

const ModalAgregarInstitucion = ({ onClose, onSave }) => {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('BUSINESS Micro'); // ✨ NUEVO ESTADO CATEGORIA
  const [seguimientoConsumo, setSeguimientoConsumo] = useState('');
  const [consultas, setConsultas] = useState('');
  const [duracion, setDuracion] = useState(6);
  const [fechaInicio, setFechaInicio] = useState('');
  const [saving, setSaving] = useState(false);
  const [montoTotal, setMontoTotal] = useState('');
  const [moneda, setMoneda] = useState('');
  const [plazoMeses, setPlazoMeses] = useState('1');

  const obtenerFechaHoy = () => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  };

  const asignarFechaHoy = () => {
    setFechaInicio(obtenerFechaHoy());
  };

  const cambiarMoneda = (nueva) => {
    setMoneda(nueva);
    if (nueva !== 'USD') setMontoTotal((prev) => String(prev).split('.')[0]);
  };

  const handleSubmit = async () => {
    if (!nombre.trim()) return sileo.warning({ title: 'Campo requerido', description: 'Falta completar el Nombre de la Institución.' });
    if (esPlanPremium(categoria) && !seguimientoConsumo) return sileo.warning({ title: 'Campo requerido', description: 'Falta indicar si se deja de dar seguimiento al consumo.' });
    if (!moneda) return sileo.warning({ title: 'Campo requerido', description: 'Falta seleccionar la Moneda (PYG o USD).' });
    if (montoTotal === '' || parseFloat(montoTotal) < 0) return sileo.warning({ title: 'Campo requerido', description: 'Falta completar el Monto Total (puede ser 0 pero no vacío).' });
    if (!consultas || parseInt(consultas) <= 0) return sileo.warning({ title: 'Campo requerido', description: 'Falta completar la Cantidad de Consultas Asignadas (mayor a 0).' });
    if (!duracion || parseInt(duracion) <= 0) return sileo.warning({ title: 'Campo requerido', description: 'Falta seleccionar la Duración del Contrato.' });
    if (!fechaInicio) return sileo.warning({ title: 'Campo requerido', description: 'Falta seleccionar la Fecha de Inicio del Contrato.' });

    setSaving(true);
    const resultado = await onSave({ 
      nombre: nombre.trim(), 
      categoria,
      moneda,
      seguimientoConsumo: esPlanPremium(categoria) ? seguimientoConsumo : null,
      consultas: parseInt(consultas), 
      duracion: parseInt(duracion),
      fechaInicio: fechaInicio,
      montoTotal: parseFloat(montoTotal) || 0,
      plazoMeses: parseInt(plazoMeses) || 1
    });
    
    if (resultado.success) {
      setNombre('');
      setCategoria('BUSINESS Micro');
      setSeguimientoConsumo('');
      setMontoTotal('');
      setMoneda('');
      setPlazoMeses('1');
      setConsultas('');
      setDuracion(6);
      setFechaInicio('');
      onClose();
      sileo.success({ title: 'Institución creada', description: `"${nombre.trim()}" fue registrada exitosamente.` });
    } else {
      sileo.error({ title: 'Error al guardar', description: resultado.error });
    }
    setSaving(false);
  };

  const inputCls = 'w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/60 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition-all disabled:opacity-60';
  const labelCls = 'block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-400 px-6 py-5 flex items-center justify-between text-white">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <PlusCircle size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold leading-tight">Nueva Institución</h2>
              <p className="text-sm text-white/80 truncate">Registra una institución y su contrato</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 transition-colors" disabled={saving}>
            <X size={22} />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/40">
          {/* Datos generales */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="flex items-center text-sm font-extrabold text-slate-800">
              <Building size={16} className="mr-2 text-brand-500" /> Datos generales
            </h3>
            <div>
              <label className={labelCls}>Nombre de la Institución</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} placeholder="Ingresar nombre de institución" disabled={saving} />
            </div>
            <div>
              <label className={labelCls}>Plan / Categoría</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputCls} disabled={saving}>
                <option value="BUSINESS Micro">BUSINESS Micro</option>
                <option value="BUSINESS Pequeña">BUSINESS Pequeña</option>
                <option value="BUSINESS Mediana">BUSINESS Mediana</option>
                <option value="Plan Premium">Plan Premium</option>
                <option value="Plan Premium Gold">Plan Premium Gold</option>
              </select>
            </div>
            {esPlanPremium(categoria) && (
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
                <label className={`${labelCls} text-brand-700`}>Dejar de dar seguimiento consumo</label>
                <select value={seguimientoConsumo} onChange={(e) => setSeguimientoConsumo(e.target.value)} className={inputCls} disabled={saving}>
                  <option value="">--Seleccionar--</option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
                <p className="text-xs text-brand-700/80 mt-2">
                  Con «No», el vencimiento deja de aparecer en el Monitoreo de Instituciones y Contratos.
                </p>
              </div>
            )}
          </section>

          {/* Facturación */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="flex items-center text-sm font-extrabold text-slate-800 mb-4">
              <Tag size={16} className="mr-2 text-brand-500" /> Facturación
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Moneda</label>
                <select value={moneda} onChange={(e) => cambiarMoneda(e.target.value)} className={inputCls} disabled={saving}>
                  <option value="">--Seleccionar--</option>
                  {MONEDAS.map(m => (
                    <option key={m.valor} value={m.valor}>{m.etiqueta}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Monto Total</label>
                <CampoMonto value={montoTotal} moneda={moneda} onChange={setMontoTotal} className={inputCls} placeholder={moneda === 'USD' ? 'Ej: 1.500,50' : 'Ej: 3.200.000'} disabled={saving} />
              </div>
              <div>
                <label className={labelCls}>Plazo de Pago</label>
                <select value={plazoMeses} onChange={(e) => setPlazoMeses(e.target.value)} className={inputCls} disabled={saving}>
                  <option value="1">1 Mes (Al contado)</option>
                  {[2,3,4,5,6,7,8,9,10,11,12].map(num => (
                    <option key={num} value={num}>{num} Meses</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Contrato */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="flex items-center text-sm font-extrabold text-slate-800">
              <ClipboardList size={16} className="mr-2 text-brand-500" /> Contrato
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Consultas Asignadas</label>
                <input type="number" value={consultas} onChange={(e) => setConsultas(e.target.value)} className={inputCls} placeholder="Ej: 206" min="1" disabled={saving} />
              </div>
              <div>
                <label className={labelCls}>Duración (meses)</label>
                <select value={duracion} onChange={(e) => setDuracion(parseInt(e.target.value))} className={inputCls} disabled={saving}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                    <option key={num} value={num}>{num} {num === 1 ? 'mes' : 'meses'}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Fecha de Inicio del Contrato</label>
              <div className="flex space-x-2">
                <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={`flex-1 ${inputCls}`} disabled={saving} />
                <button
                  type="button"
                  onClick={asignarFechaHoy}
                  className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold text-sm disabled:opacity-50"
                  disabled={saving}
                >
                  Hoy
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Fecha desde la cual comenzarán a contar los {duracion} meses del contrato
              </p>
            </div>
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
            <span>{saving ? 'Guardando...' : 'Guardar Institución'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAgregarInstitucion;
