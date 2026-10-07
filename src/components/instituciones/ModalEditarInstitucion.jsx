// src/components/instituciones/ModalEditarInstitucion.jsx
import React, { useState } from 'react';
import {
  Building,
  ClipboardList,
  Edit3,
  Loader2,
  Tag,
  X
} from 'lucide-react';
import { sileo } from '../sileo';
import { esPlanPremium } from '../../utils/plan';
import { confirmar } from '../../utils/confirmar';
import { MONEDAS, monedaDe } from '../../utils/moneda';
import CampoMonto from './CampoMonto';

const ModalEditarInstitucion = ({ institucion, onClose, onSave }) => {
  const [nombre, setNombre] = useState(institucion.nombre);
  const [categoria, setCategoria] = useState(institucion.categoria || 'Sin Categoría'); // ✨ ESTADO CATEGORIA
  const [seguimientoConsumo, setSeguimientoConsumo] = useState(institucion.seguimientoConsumo || '');
  const [montoTotal, setMontoTotal] = useState(String(institucion.montoTotal || ''));
  const [moneda, setMoneda] = useState(monedaDe(institucion));
  const [plazoMeses, setPlazoMeses] = useState(institucion.plazoMeses || '1'); // ✨ NUEVO
  const [consultas, setConsultas] = useState(institucion.contrato.asignadas);
  const [duracion, setDuracion] = useState(institucion.contrato.duracionMeses);
  const [estado, setEstado] = useState(institucion.estado || 'activo');
  const [nuevaFechaInicio, setNuevaFechaInicio] = useState('');
  const [comentarioRenovacion, setComentarioRenovacion] = useState('');
  const [saving, setSaving] = useState(false);

  const obtenerFechaHoy = () => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  };

  const cambiarMoneda = (nueva) => {
    setMoneda(nueva);
    if (nueva !== 'USD') setMontoTotal((prev) => String(prev).split('.')[0]);
  };

  const validarFecha = (fecha) => {
    if (!fecha) return false;
    const fechaObj = new Date(fecha);
    return fechaObj instanceof Date && !isNaN(fechaObj);
  };

  const handleSubmit = async () => {
    if (esPlanPremium(categoria) && !seguimientoConsumo) {
      sileo.warning({ title: 'Campo requerido', description: 'Falta indicar si se deja de dar seguimiento al consumo.' });
      return;
    }
    if (nombre.trim() && consultas > 0 && duracion > 0) {
      if (estado === 'renovacion' && !nuevaFechaInicio) {
        sileo.warning({ title: 'Fecha requerida', description: 'Por favor, selecciona la nueva fecha de inicio para la renovación.' });
        return;
      }

      if (estado === 'renovacion' && !validarFecha(nuevaFechaInicio)) {
        sileo.error({ title: 'Fecha inválida', description: 'La fecha seleccionada no es válida. Por favor, selecciona una fecha correcta.' });
        return;
      }

      const ejecutarGuardado = async () => {
        setSaving(true);
        try {
          const datosActualizados = { 
            nombre: nombre.trim(), 
            categoria,
            moneda,
            seguimientoConsumo: esPlanPremium(categoria) ? seguimientoConsumo : null,
            consultas: parseInt(consultas), 
            duracion: parseInt(duracion),
            estado: estado,
            montoTotal: parseFloat(montoTotal) || 0,
            plazoMeses: parseInt(plazoMeses) || 1
          };

          if (estado === 'renovacion' && nuevaFechaInicio) {
            const fechaFormateada = nuevaFechaInicio.includes('/') 
              ? nuevaFechaInicio.split('/').reverse().join('-') 
              : nuevaFechaInicio;
            datosActualizados.nuevaFechaInicio = fechaFormateada;
            if (comentarioRenovacion.trim()) {
              datosActualizados.comentarioRenovacion = comentarioRenovacion.trim();
            }
          }

          const resultado = await onSave(institucion.id, datosActualizados);
          
          if (resultado.success) {
            onClose();
            if (estado === 'renovacion') {
              sileo.success({ title: 'Contrato renovado', description: 'El historial del período anterior está disponible en el apartado Historial.' });
            } else {
              sileo.success({ title: 'Institución actualizada', description: `"${nombre.trim()}" fue actualizada exitosamente.` });
            }
          } else {
            sileo.error({ title: 'Error al actualizar', description: resultado.error });
          }
        } catch (error) {
          console.error('Error en handleSubmit:', error);
          sileo.error({ title: 'Error inesperado', description: error.message });
        }
        setSaving(false);
      };

      if (estado === 'renovacion') {
        confirmar(
          'Renovar contrato',
          'Se guardará el historial actual y se iniciará un nuevo período. Los consumos mensuales se reiniciarán. Esta acción no se puede deshacer.',
          ejecutarGuardado
        );
      } else {
        await ejecutarGuardado();
      }

    } else {
      sileo.warning({ title: 'Campos incompletos', description: 'Por favor, complete todos los campos correctamente.' });
    }
  };

  const inputCls = 'w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/60 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition-all disabled:opacity-60';
  const labelCls = 'block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5';
  const opcionesEstado = [
    { value: 'activo', label: 'Activo', activo: 'bg-emerald-50 border-emerald-500 text-emerald-700' },
    { value: 'pendiente', label: 'Pendiente', activo: 'bg-amber-50 border-amber-500 text-amber-700' },
    { value: 'vencido', label: 'No Renov.', activo: 'bg-red-50 border-red-500 text-red-700' },
    { value: 'renovacion', label: 'Renovación', activo: 'bg-blue-50 border-blue-500 text-blue-700' }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-400 px-6 py-5 flex items-center justify-between text-white">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Edit3 size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold leading-tight">Editar Institución</h2>
              <p className="text-sm text-white/80 truncate">{institucion.nombre}</p>
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
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} disabled={saving} />
            </div>
            <div>
              <label className={labelCls}>Plan / Categoría</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputCls} disabled={saving}>
                <option value="BUSINESS Micro">BUSINESS Micro</option>
                <option value="BUSINESS Pequeña">BUSINESS Pequeña</option>
                <option value="BUSINESS Mediana">BUSINESS Mediana</option>
                <option value="Plan Premium">Plan Premium</option>
                <option value="Plan Premium Gold">Plan Premium Gold</option>
                {(!institucion.categoria || institucion.categoria === 'Sin Categoría') && (
                  <option value="Sin Categoría">Sin Categoría (Requiere Actualizar)</option>
                )}
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
            <div>
              <label className={labelCls}>Estado del Contrato</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {opcionesEstado.map(op => (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() => setEstado(op.value)}
                    disabled={saving}
                    className={`px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                      estado === op.value ? op.activo : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
              {estado === 'renovacion' && (
                <p className="text-xs text-blue-600 mt-2">
                  Al renovar, el historial actual estará disponible en el apartado Historial.
                </p>
              )}
            </div>

            {estado === 'renovacion' && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-blue-800">Renovación de Contrato</h4>
                  <p className="text-xs text-blue-600">Se guardará el historial del periodo actual y se iniciará un nuevo contrato.</p>
                </div>
                <div>
                  <label className={labelCls}>Nueva Fecha de Inicio</label>
                  <div className="flex space-x-2">
                    <input type="date" value={nuevaFechaInicio} onChange={(e) => setNuevaFechaInicio(e.target.value)} className={`flex-1 ${inputCls}`} disabled={saving} />
                    <button
                      type="button"
                      onClick={() => setNuevaFechaInicio(obtenerFechaHoy())}
                      className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-bold"
                      disabled={saving}
                    >
                      Hoy
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Comentarios de Renovación (Opcional)</label>
                  <textarea
                    value={comentarioRenovacion}
                    onChange={(e) => setComentarioRenovacion(e.target.value)}
                    placeholder="Ej: Renovación mismo plan desde 14/09/2025."
                    className={`${inputCls} resize-none`}
                    rows="3"
                    disabled={saving}
                    maxLength="500"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-slate-500">Este comentario se guardará en el historial</p>
                    <p className="text-xs text-slate-400">{comentarioRenovacion.length}/500</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Consultas Asignadas</label>
                <input type="number" value={consultas} onChange={(e) => setConsultas(e.target.value)} className={inputCls} min="1" disabled={saving} />
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
            className={`px-6 py-2.5 text-white rounded-xl transition-colors flex items-center space-x-2 disabled:opacity-50 font-bold shadow-md ${
              estado === 'renovacion' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-brand-500 hover:bg-brand-600'
            }`}
            disabled={saving}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            <span>
              {saving ? 'Actualizando...' :
               estado === 'renovacion' ? 'Renovar Contrato' : 'Actualizar'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEditarInstitucion;
