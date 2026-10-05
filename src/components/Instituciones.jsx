// src/components/Instituciones.jsx
import React, { useState, useEffect } from 'react';
import { 
  Building, 
  PlusCircle, 
  X, 
  Trash2, 
  Calendar, 
  Users, 
  Edit3, 
  Plus,
  Loader2,
  History,
  Clock,
  Search,
  BarChart2,
  Filter,
  ShieldAlert,
  ClipboardList,
  FileSpreadsheet, // ✨ NUEVO ICONO EXCEL
  Tag,             // ✨ NUEVO ICONO CATEGORIA
  Download,        // ✨ NUEVO ICONO DESCARGA
  ArrowUpDown,
  LayoutGrid,
  List,
  EyeOff,
  Flame,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  CalendarClock,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useInstituciones } from '../hooks/useFirebase';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth'; // ✨ NUEVO
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { BotonComentarios } from './Comentarios';
import { sileo } from './sileo';
import { esPlanPremium, debeMonitorearVencimiento, tieneSeguimientoVencimiento } from '../utils/plan';
import { confirmar } from '../utils/confirmar';
import { useContadorComentarios } from '../hooks/useFirebase';
import { MessageCircle } from 'lucide-react';
import { descargarLibro, etiquetaEstado, formatearFecha, formatearFechaHora, hojaDesdeObjetos } from '../utils/excel';
import { describirVigencia, parsearFecha } from '../utils/contratos';
import { MONEDAS, monedaDe, limpiarMonto, formatearMontoInput, formatearMonto } from '../utils/moneda';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from 'recharts';

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

const ModalHistorial = ({ institucion, onClose }) => {
  const historial = institucion.historial || [];

  // Totales separados por moneda: nunca se suman PYG con USD
  const totalesPorMoneda = {};
  [
    { monto: institucion.montoTotal || 0, moneda: monedaDe(institucion) },
    ...historial.map(p => ({ monto: p.montoTotal || institucion.montoTotal || 0, moneda: monedaDe(p) }))
  ].forEach(({ monto, moneda }) => { totalesPorMoneda[moneda] = (totalesPorMoneda[moneda] || 0) + monto; });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <History className="mr-3 text-blue-600" size={28} />
            Historial de {institucion.nombre}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {historial.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Sin historial disponible</h3>
            <p className="text-gray-500">
              El historial aparecerá cuando se renueve el contrato de esta institución.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* LTV Acumulado (Punto 4) */}
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-lg flex flex-col md:flex-row items-center justify-between shadow-sm">
              <div className="mb-2 md:mb-0">
                <h3 className="text-emerald-800 font-bold text-lg flex items-center">
                  <span className="bg-emerald-200 p-1.5 rounded-full mr-2">💰</span>
                  Historial Financiero (LTV Acumulado)
                </h3>
                <p className="text-emerald-700 text-sm mt-1">Valor histórico total invertido por este cliente sumando todos sus períodos documentados.</p>
              </div>
              <div className="text-3xl font-black text-emerald-700 tracking-tight text-right drop-shadow-sm">
                {Object.entries(totalesPorMoneda).map(([m, v]) => `${formatearMonto(v, m)} ${m}`).join(' + ')}
              </div>
            </div>

            {/* Período Actual */}
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-blue-800 flex items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-full mr-3"></div>
                  Período Actual
                </h3>
                <span className="text-xs text-blue-600 bg-blue-100 px-3 py-1 rounded-full font-medium">
                  ACTIVO
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-600 font-medium">Inicio:</span>
                  <div className="font-medium text-gray-800">
                    {institucion.contrato?.fechaInicio ? 
                      new Date(institucion.contrato.fechaInicio).toLocaleDateString('es-ES') : 
                      institucion.fechaCreacion
                    }
                  </div>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Vence:</span>
                  <div className="font-medium text-gray-800">{institucion.contrato?.fechaFin}</div>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Consultas:</span>
                  <div className="font-medium text-gray-800">{institucion.contrato?.asignadas?.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Consumidas:</span>
                  <div className="font-medium text-gray-800">{institucion.contrato?.consumidas?.toLocaleString()}</div>
                </div>
              </div>

              {institucion.ultimaRenovacion?.comentario && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="bg-white p-4 rounded-lg border border-blue-100">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">💬</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-gray-800">Comentario de Renovación</h4>
                          <span className="text-xs text-gray-500">
                            {new Date(institucion.ultimaRenovacion.fecha).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          "{institucion.ultimaRenovacion.comentario}"
                        </p>
                        {institucion.ultimaRenovacion.renovadoPor && (
                          <p className="text-xs text-gray-500 mt-1">
                            Por: {institucion.ultimaRenovacion.renovadoPor}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Períodos Anteriores */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                Períodos Anteriores ({historial.length})
              </h3>
              
              <div className="space-y-4">
                {historial
                  .slice() 
                  .reverse() 
                  .map((periodo, reverseIndex) => {
                  const numeroPeriodo = historial.length - reverseIndex;
                  
                  return (
                    <div key={reverseIndex} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-medium text-gray-800 flex items-center">
                          <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                            <span className="text-white text-xs font-bold">{numeroPeriodo}</span>
                          </div>
                          Período #{numeroPeriodo}
                          {numeroPeriodo === 1 && (
                            <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                              Primer Histórico
                            </span>
                          )}
                        </h4>
                        <div className="text-right">
                          <span className="text-xs text-gray-500 block">Renovado:</span>
                          <span className="text-sm font-medium text-gray-700">
                            {new Date(periodo.fechaRenovacion).toLocaleDateString('es-ES')}
                          </span>
                          {periodo.renovadoPor && (
                            <div className="text-xs text-gray-500 mt-1">
                              Por: {periodo.renovadoPor}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-gray-600 font-medium">Período:</span>
                          <div className="font-medium text-gray-800">
                            {new Date(periodo.periodoInicio).toLocaleDateString('es-ES')} - {new Date(periodo.periodoFin).toLocaleDateString('es-ES')}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 font-medium">Duración:</span>
                          <div className="font-medium text-gray-800">{periodo.duracionMeses} meses</div>
                        </div>
                        <div>
                          <span className="text-gray-600 font-medium">Consultas Asignadas:</span>
                          <div className="font-medium text-gray-800">{periodo.consultasAsignadas?.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 font-medium">Consultas Consumidas:</span>
                          <div className="font-medium text-gray-800">{periodo.consultasConsumidas?.toLocaleString()}</div>
                        </div>
                      </div>

                      {periodo.comentario && (
                        <div className="mb-4">
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="flex items-start space-x-3">
                              <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs">💬</span>
                              </div>
                              <div className="flex-1">
                                <h5 className="text-sm font-medium text-gray-800 mb-1">Comentario de Renovación</h5>
                                <p className="text-sm text-gray-700 leading-relaxed italic">
                                  "{periodo.comentario}"
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {periodo.consumoPorMes && Object.keys(periodo.consumoPorMes).length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-3">Consumo Mensual del Período:</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {Object.entries(periodo.consumoPorMes)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([mes, consumo]) => (
                              <div key={mes} className="bg-white p-3 rounded border text-center">
                                <div className="text-xs text-gray-600 font-medium">
                                  {new Date(mes + '-01T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'short' })}
                                </div>
                                <div className="font-bold text-sm text-gray-800">{consumo.toLocaleString()}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold text-gray-800">
                              {periodo.consultasAsignadas > 0 ? 
                                ((periodo.consultasConsumidas / periodo.consultasAsignadas) * 100).toFixed(1) : 0
                              }%
                            </div>
                            <div className="text-xs text-gray-600">Porcentaje de Uso</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-green-600">
                              {(periodo.consultasAsignadas || 0) - (periodo.consultasConsumidas || 0)}
                            </div>
                            <div className="text-xs text-gray-600">Consultas No Utilizadas</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-blue-600">
                              {Object.keys(periodo.consumoPorMes || {}).length}
                            </div>
                            <div className="text-xs text-gray-600">Meses Registrados</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-end pt-6 border-t border-gray-200">
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

const ModalAuditoria = ({ institucion, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const q = query(
      collection(db, 'auditoria'), 
      where('institucionId', '==', institucion.id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logData = [];
      snapshot.forEach(doc => logData.push({ id: doc.id, ...doc.data() }));
      logData.sort((a, b) => (b.fecha?.toMillis() || 0) - (a.fecha?.toMillis() || 0));
      setLogs(logData);
      setLoading(false);
    }, (error) => {
      console.error("Error cargando logs:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [institucion.id]);

  const logsFiltrados = logs.filter(log => {
    if (!log.fecha) return true;
    const logDate = log.fecha.toDate();
    logDate.setHours(0,0,0,0);
    
    if (fechaDesde) {
      const desde = new Date(fechaDesde + 'T00:00:00');
      if (logDate < desde) return false;
    }
    if (fechaHasta) {
      const hasta = new Date(fechaHasta + 'T00:00:00');
      if (logDate > hasta) return false;
    }
    return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = logsFiltrados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(logsFiltrados.length / itemsPerPage);

  const exportarExcel = () => {
    try {
      const dataToExport = logsFiltrados.map(log => ({
        Fecha: formatearFechaHora(log.fecha),
        Acción: log.accion,
        Detalles: log.detalles,
        Usuario: log.usuario
      }));
      descargarLibro(
        [{ nombre: 'Auditoría', hoja: hojaDesdeObjetos(dataToExport) }],
        `Auditoria_${institucion.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
      );
    } catch(e) {
      sileo.error({ title: 'Error al exportar', description: 'No se pudo generar el archivo Excel.' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <ClipboardList className="mr-3 text-indigo-600" size={28} />
              Auditoría de Movimientos
            </h2>
            <p className="text-sm text-gray-500 mt-1">Historial de acciones en: <strong>{institucion.nombre}</strong></p>
          </div>
          <div className="flex space-x-2">
            <button onClick={exportarExcel} disabled={logsFiltrados.length === 0} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold text-sm transition-colors">
              <Download size={16} className="mr-2" /> Excel
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex space-x-4 mb-4 shrink-0 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Desde:</label>
            <input type="date" value={fechaDesde} onChange={e => {setFechaDesde(e.target.value); setCurrentPage(1);}} className="w-full mt-1 p-2 border rounded text-sm outline-none"/>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Hasta:</label>
            <input type="date" value={fechaHasta} onChange={e => {setFechaHasta(e.target.value); setCurrentPage(1);}} className="w-full mt-1 p-2 border rounded text-sm outline-none"/>
          </div>
          <div className="flex items-end pb-1">
            <button onClick={() => {setFechaDesde(''); setFechaHasta(''); setCurrentPage(1);}} className="text-sm text-blue-600 font-bold hover:underline">Limpiar Filtros</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {loading ? (
            <div className="text-center py-10"><Loader2 className="animate-spin text-indigo-500 mx-auto" size={32} /></div>
          ) : currentLogs.length === 0 ? (
            <div className="text-center py-10 text-gray-500 font-medium bg-gray-50 rounded-lg">No se encontraron movimientos registrados.</div>
          ) : (
            currentLogs.map(log => (
              <div key={log.id} className="bg-white p-4 rounded-lg border-l-4 border-indigo-500 shadow-sm flex items-start space-x-4">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-gray-800 text-sm">{log.accion}</p>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      {log.fecha?.toDate ? log.fecha.toDate().toLocaleString('es-ES') : 'Reciente'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{log.detalles}</p>
                  <p className="text-xs text-gray-400 mt-2 font-medium">Por: {log.usuario}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 pt-4 border-t flex justify-between items-center shrink-0">
            <span className="text-sm text-gray-500 font-medium">Página {currentPage} de {totalPages}</span>
            <div className="flex space-x-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 text-sm font-bold text-gray-700">Anterior</button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 text-sm font-bold text-gray-700">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- Piezas visuales de la pantalla de Instituciones ----------

const iniciales = (nombre = '') =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';

const gradienteCategoria = (categoria = '') => {
  if (categoria.includes('Gold')) return 'from-amber-400 to-yellow-500';
  if (categoria.includes('Premium')) return 'from-brand-500 to-amber-500';
  if (categoria.includes('BUSINESS')) return 'from-indigo-500 to-blue-500';
  return 'from-slate-400 to-slate-500';
};

const diasParaVencer = (institucion) => {
  const fin = parsearFecha(institucion.contrato?.fechaFin);
  if (!fin || isNaN(fin.getTime())) return null;
  return Math.ceil((fin.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

const colorUso = (pct) => (pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981');

// Número que sube animado hasta su valor
const NumeroAnimado = ({ valor }) => {
  const [mostrado, setMostrado] = useState(0);
  useEffect(() => {
    let frame;
    const inicio = performance.now();
    const duracion = 700;
    const paso = (t) => {
      const p = Math.min((t - inicio) / duracion, 1);
      setMostrado(Math.round(valor * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(paso);
    };
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [valor]);
  return <>{mostrado.toLocaleString()}</>;
};

// Medidor circular de uso del contrato
const MedidorUso = ({ porcentaje }) => {
  const radio = 34;
  const circunferencia = 2 * Math.PI * radio;
  const color = colorUso(porcentaje);
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90">
        <circle cx="42" cy="42" r={radio} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <motion.circle
          cx="42" cy="42" r={radio} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circunferencia}
          initial={{ strokeDashoffset: circunferencia }}
          animate={{ strokeDashoffset: circunferencia * (1 - porcentaje / 100) }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-slate-800 leading-none">{Math.round(porcentaje)}%</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">uso</span>
      </div>
    </div>
  );
};

const ChipVigencia = ({ dias, fechaFin }) => {
  if (dias === null) return null;
  let estilos = 'bg-slate-100 text-slate-600 border-slate-200';
  let Icono = CalendarClock;
  if (dias < 0) { estilos = 'bg-red-100 text-red-700 border-red-200'; Icono = AlertOctagon; }
  else if (dias <= 31) { estilos = 'bg-orange-100 text-orange-700 border-orange-200'; Icono = AlertTriangle; }
  else if (dias <= 62) { estilos = 'bg-amber-100 text-amber-700 border-amber-200'; }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${estilos}`}>
      <Icono size={12} className="mr-1" /> {describirVigencia(fechaFin)}
    </span>
  );
};

const TarjetaKpi = ({ icono: Icono, etiqueta, valor, total, color, barra, activa, onClick, indice }) => (
  <motion.button
    type="button"
    onClick={onClick}
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: indice * 0.07, duration: 0.35 }}
    className={`text-left bg-white rounded-2xl border p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all ${
      activa ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200'
    }`}
  >
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{etiqueta}</span>
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icono size={20} />
      </span>
    </div>
    <p className="text-4xl font-black text-slate-800 mt-2"><NumeroAnimado valor={valor} /></p>
    <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${barra}`}
        initial={{ width: 0 }}
        animate={{ width: `${total > 0 ? (valor / total) * 100 : 0}%` }}
        transition={{ duration: 0.8, delay: indice * 0.07 }}
      />
    </div>
    <p className="text-[11px] font-semibold text-slate-400 mt-1.5">
      {total > 0 ? Math.round((valor / total) * 100) : 0}% del total
    </p>
  </motion.button>
);

const Instituciones = () => {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConsumoModal, setShowConsumoModal] = useState(false);
  const [showEditConsumoModal, setShowEditConsumoModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [showAuditoriaModal, setShowAuditoriaModal] = useState(false);
  const [institucionSeleccionada, setInstitucionSeleccionada] = useState(null);
  const [mesSeleccionadoParaEditar, setMesSeleccionadoParaEditar] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); 
  const [filtroCategoria, setFiltroCategoria] = useState('todos'); // ✨ NUEVO FILTRO CATEGORIA
  const [filtroAlerta, setFiltroAlerta] = useState('todas'); // ✨ NUEVO FILTRO ALERTA (Punto 1)
  const [orden, setOrden] = useState('nombre');
  const [vista, setVista] = useState('tarjetas');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [userRol, setUserRol] = useState(null);
  const [permisos, setPermisos] = useState(null);

  useEffect(() => {
    let unsubscribeDoc = null;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }
      
      if (user) {
        unsubscribeDoc = onSnapshot(doc(db, 'usuarios', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserRol(docSnap.data().rol);
            setPermisos(docSnap.data().permisos);
          }
        });
      } else {
        setUserRol(null);
        setPermisos(null);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const canAdd = userRol === 'admin' || permisos?.instituciones?.agregar;
  const canEdit = userRol === 'admin' || permisos?.instituciones?.editar;
  const canDelete = userRol === 'admin' || permisos?.instituciones?.eliminar;
  const canConsume = userRol === 'admin' || permisos?.instituciones?.registrarConsumo;
  const canComment = userRol === 'admin' || permisos?.instituciones?.comentar;
  const canHistory = userRol === 'admin' || permisos?.instituciones?.verHistorial;

  const { 
    instituciones, 
    loading, 
    error, 
    agregarInstitucion, 
    editarInstitucion,
    eliminarInstitucion,
    registrarConsumoMensual,
    editarConsumoMensual,
    eliminarConsumoMensual  
  } = useInstituciones();

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroEstado, filtroCategoria, filtroAlerta, orden, vista]);

  // ✨ LOGICA DE FILTROS COMBINADOS (Buscador + Estado + Categoria + Alerta)
  const institucionesFiltradas = instituciones.filter((institucion) => {
    const searchLower = searchTerm.toLowerCase();
    const coincideBusqueda = institucion.nombre.toLowerCase().includes(searchLower);

    let coincideFiltroEstado = true;
    if (filtroEstado !== 'todos') {
      const estadoReal = institucion.estado || 'activo';
      if (filtroEstado !== estadoReal) coincideFiltroEstado = false;
    }

    let coincideFiltroCategoria = true;
    if (filtroCategoria !== 'todos') {
      const catReal = institucion.categoria || 'Sin Categoría';
      if (filtroCategoria === 'Sin Categoría' && catReal !== 'Sin Categoría') coincideFiltroCategoria = false;
      else if (filtroCategoria !== 'Sin Categoría' && catReal !== filtroCategoria) coincideFiltroCategoria = false;
    }

    let coincideFiltroAlerta = true;
    if (filtroAlerta === 'consumo_alto') {
      const consumidas = institucion.contrato?.consumidas || 0;
      const asignadas = institucion.contrato?.asignadas || 0;
      const porcentaje = asignadas > 0 ? (consumidas / asignadas) * 100 : 0;
      if (porcentaje < 75) coincideFiltroAlerta = false;
    }

    return coincideBusqueda && coincideFiltroEstado && coincideFiltroCategoria && coincideFiltroAlerta;
  }).sort((a, b) => {
    if (orden === 'consumo') {
      const pct = (i) => (i.contrato?.asignadas > 0 ? (i.contrato.consumidas || 0) / i.contrato.asignadas : 0);
      return pct(b) - pct(a);
    }
    if (orden === 'vence') {
      const da = diasParaVencer(a);
      const db = diasParaVencer(b);
      return (da === null ? Infinity : da) - (db === null ? Infinity : db);
    }
    return a.nombre.localeCompare(b.nombre);
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = institucionesFiltradas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(institucionesFiltradas.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleSave = async (nuevaInstitucion) => {
    return await agregarInstitucion(nuevaInstitucion);
  };

  const handleEdit = async (id, datosActualizados) => {
    return await editarInstitucion(id, datosActualizados);
  };

  const handleConsumoMensual = async (id, datosConsumo) => {
    return await registrarConsumoMensual(id, datosConsumo);
  };

  const handleEditarConsumoMensual = async (id, datosConsumo) => {
    return await editarConsumoMensual(id, datosConsumo);
  };

  const handleEliminarConsumoMensual = async (institucion, mes) => {
    const consumo = institucion.consumoPorMes[mes];
    const nombreMes = new Date(mes + '-01T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
    confirmar(
      `Eliminar consumo de ${nombreMes}`,
      `Se eliminarán ${consumo.toLocaleString()} consultas registradas para "${institucion.nombre}". Esta acción no se puede deshacer.`,
      async () => {
        const resultado = await eliminarConsumoMensual(institucion.id, mes);
        if (resultado.success) {
          sileo.success({ title: 'Consumo eliminado', description: `Consumo de ${nombreMes} eliminado. Se restaron ${consumo.toLocaleString()} consultas.` });
        } else {
          sileo.error({ title: 'Error al eliminar consumo', description: resultado.error });
        }
      }
    );
  };

  const handleDelete = async (id, nombre) => {
    confirmar(
      'Eliminar institución',
      `¿Estás seguro de que quieres eliminar "${nombre}"? Esta acción no se puede deshacer.`,
      async () => {
        const resultado = await eliminarInstitucion(id);
        if (resultado.success) {
          sileo.success({ title: 'Institución eliminada', description: `"${nombre}" fue eliminada exitosamente.` });
        } else {
          sileo.error({ title: 'Error al eliminar', description: resultado.error });
        }
      }
    );
  };

  // ✨ NUEVA FUNCION: DESCARGAR EXCEL DE LOS FILTROS ACTUALES
  const exportarExcelFiltrado = () => {
    if (institucionesFiltradas.length === 0) return sileo.warning({ title: 'Sin datos', description: 'No hay datos para exportar con estos filtros.' });
    
    const data = institucionesFiltradas.map((inst, index) => ({
      'Nro': index + 1,
      'Institución': inst.nombre,
      'Plan / Categoría': inst.categoria || 'Sin Categoría',
      'Seguimiento de Vencimiento': tieneSeguimientoVencimiento(inst) ? 'Sí' : 'No',
      'Moneda': monedaDe(inst),
      'Monto Total': inst.montoTotal || 0,
      'Plazo Meses': inst.plazoMeses || 1,
      'Estado': inst.estado === 'no_renovada' ? 'FINALIZADA' : etiquetaEstado(inst.estado).toUpperCase(),
      'Asignadas': inst.contrato?.asignadas || 0,
      'Consumidas': inst.contrato?.consumidas || 0,
      'Restantes': (inst.contrato?.asignadas || 0) - (inst.contrato?.consumidas || 0),
      'Uso (%)': inst.contrato?.asignadas > 0 ? `${((inst.contrato.consumidas / inst.contrato.asignadas) * 100).toFixed(1)}%` : '0%',
      'Fecha Inicio': formatearFecha(inst.contrato?.fechaInicio || inst.fechaCreacion),
      'Fecha Venc.': formatearFecha(inst.contrato?.fechaFin),
      'Vigencia del Contrato': describirVigencia(inst.contrato?.fechaFin),
      'Meses Contrato': inst.contrato?.duracionMeses || 0
    }));

    descargarLibro(
      [{ nombre: 'Instituciones', hoja: hojaDesdeObjetos(data) }],
      `Reporte_Instituciones_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  if (loading && instituciones.length === 0) {
    return (
      <div className="p-6 sm:p-10 bg-slate-50 min-h-screen flex items-center justify-center relative overflow-hidden grid-overlay">
        <div className="text-center relative z-10">
          <Loader2 size={48} className="animate-spin text-brand-500 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Cargando instituciones desde Firebase...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 sm:p-10 bg-slate-50 min-h-screen flex items-center justify-center relative overflow-hidden grid-overlay">
        <div className="text-center bg-red-50 p-8 rounded-2xl border border-red-200 max-w-md shadow-lg relative z-10 backdrop-blur-md">
          <p className="text-red-800 font-bold text-lg mb-2">Error al conectar con Firebase</p>
          <p className="text-red-655 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 bg-red-600 text-white px-6 py-2.5 rounded-xl hover:bg-red-700 flex items-center justify-center mx-auto font-bold transition-all active:scale-95 shadow-lg shadow-red-600/10"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const hayFiltros = searchTerm || filtroEstado !== 'todos' || filtroCategoria !== 'todos' || filtroAlerta !== 'todas';
  const limpiarFiltros = () => {
    setSearchTerm('');
    setFiltroEstado('todos');
    setFiltroCategoria('todos');
    setFiltroAlerta('todas');
  };

  const conteoEstado = (estado) => instituciones.filter(i => (i.estado || 'activo') === estado).length;

  const estiloEstado = (estado) => {
    switch (estado) {
      case 'pendiente': return { badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', texto: 'Pendiente', acento: 'from-yellow-400 to-amber-500' };
      case 'vencido': return { badge: 'bg-red-100 text-red-800 border-red-200', texto: 'No Renov.', acento: 'from-red-500 to-rose-500' };
      case 'renovacion': return { badge: 'bg-blue-100 text-blue-800 border-blue-200', texto: 'En Renovación', acento: 'from-blue-500 to-sky-400' };
      default: return { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', texto: 'Activo', acento: 'from-emerald-500 to-teal-400' };
    }
  };

  const renderAcciones = (institucion) => (
    <div className="flex flex-wrap gap-1.5 shrink-0">
      {canConsume && (
        <button
          onClick={() => { setInstitucionSeleccionada(institucion); setShowConsumoModal(true); }}
          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white p-2 rounded-lg border border-emerald-200 hover:border-emerald-600 transition-all shadow-sm active:scale-95"
          title="Registrar consumo mensual" disabled={loading}
        >
          <Plus size={16} />
        </button>
      )}
      {canComment && <BotonComentarios institucion={institucion} comentariosCount={0} />}
      {canEdit && (
        <button
          onClick={() => { setInstitucionSeleccionada(institucion); setShowEditModal(true); }}
          className="bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white p-2 rounded-lg border border-blue-200 transition-all shadow-sm active:scale-95"
          title="Editar institución" disabled={loading}
        >
          <Edit3 size={16} />
        </button>
      )}
      {canHistory && (
        <button
          onClick={() => { setInstitucionSeleccionada(institucion); setShowHistorialModal(true); }}
          className="bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white p-2 rounded-lg border border-purple-200 transition-all shadow-sm active:scale-95"
          title="Ver historial de períodos" disabled={loading}
        >
          <History size={16} />
        </button>
      )}
      {(userRol === 'admin' || userRol === 'contabilidad') && (
        <button
          onClick={() => { setInstitucionSeleccionada(institucion); setShowAuditoriaModal(true); }}
          className="bg-slate-100 text-slate-700 hover:bg-slate-700 hover:text-white p-2 rounded-lg border border-slate-200 transition-all shadow-sm active:scale-95"
          title="Ver Auditoría de Cambios" disabled={loading}
        >
          <ClipboardList size={16} />
        </button>
      )}
      {canDelete && (
        <button
          onClick={() => handleDelete(institucion.id, institucion.nombre)}
          className="bg-red-50 text-red-700 hover:bg-red-600 hover:text-white p-2 rounded-lg border border-red-200 transition-all shadow-sm active:scale-95"
          title="Eliminar institución" disabled={loading}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );

  const datosUso = (institucion) => {
    const asignadas = institucion.contrato?.asignadas || 0;
    const consumidas = institucion.contrato?.consumidas || 0;
    return {
      asignadas,
      consumidas,
      restantes: asignadas - consumidas,
      porcentaje: asignadas > 0 ? Math.min((consumidas / asignadas) * 100, 100) : 0
    };
  };

  const paginasVisibles = () => {
    const paginas = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) paginas.push(p);
      else if (paginas[paginas.length - 1] !== '…') paginas.push('…');
    }
    return paginas;
  };

  return (
    <div className="p-4 sm:p-8 bg-slate-50 min-h-screen relative overflow-hidden grid-overlay">
      <div className="absolute top-10 left-10 w-96 h-96 rounded-full blur-[150px] glow-spot-orange pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-[150px] glow-spot-purple pointer-events-none"></div>

      {/* HERO */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 mb-6 rounded-3xl bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 text-white p-6 sm:p-8 shadow-xl shadow-brand-500/20 overflow-hidden"
      >
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute right-24 -bottom-16 w-44 h-44 rounded-full bg-white/10" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mr-4 flex-shrink-0">
              <Building size={30} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Gestión de Instituciones</h1>
              <p className="text-white/85 font-medium mt-0.5">
                {institucionesFiltradas.length} {institucionesFiltradas.length === 1 ? 'institución' : 'instituciones'}
                {hayFiltros ? ' con los filtros aplicados' : ' registradas'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={exportarExcelFiltrado} className="bg-white/15 text-white border border-white/50 backdrop-blur px-5 py-2.5 rounded-xl font-bold flex items-center hover:bg-white/25 transition-all active:scale-95 text-sm" title="Descargar Excel del listado filtrado">
              <FileSpreadsheet size={18} className="mr-2" /> Excel
            </button>
            {canAdd && (
              <button onClick={() => setShowModal(true)} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center hover:bg-emerald-700 ring-1 ring-white/40 shadow-lg transition-all active:scale-95 text-sm whitespace-nowrap">
                <PlusCircle size={18} className="mr-2" /> Nueva institución
              </button>
            )}
          </div>
        </div>
      </motion.header>

      {/* KPIs (también filtran por estado) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 relative z-10">
        <TarjetaKpi indice={0} icono={Users} etiqueta="Total" valor={instituciones.length} total={instituciones.length} color="bg-brand-100 text-brand-600" barra="bg-brand-500" activa={filtroEstado === 'todos'} onClick={() => setFiltroEstado('todos')} />
        <TarjetaKpi indice={1} icono={CheckCircle2} etiqueta="Activos" valor={conteoEstado('activo')} total={instituciones.length} color="bg-emerald-100 text-emerald-600" barra="bg-emerald-500" activa={filtroEstado === 'activo'} onClick={() => setFiltroEstado(filtroEstado === 'activo' ? 'todos' : 'activo')} />
        <TarjetaKpi indice={2} icono={Clock} etiqueta="Pendientes" valor={conteoEstado('pendiente')} total={instituciones.length} color="bg-amber-100 text-amber-600" barra="bg-amber-500" activa={filtroEstado === 'pendiente'} onClick={() => setFiltroEstado(filtroEstado === 'pendiente' ? 'todos' : 'pendiente')} />
        <TarjetaKpi indice={3} icono={AlertOctagon} etiqueta="No renovados" valor={conteoEstado('vencido')} total={instituciones.length} color="bg-red-100 text-red-600" barra="bg-red-500" activa={filtroEstado === 'vencido'} onClick={() => setFiltroEstado(filtroEstado === 'vencido' ? 'todos' : 'vencido')} />
      </div>

      {/* BARRA DE FILTROS */}
      <div className="relative z-10 mb-6 bg-white/80 backdrop-blur border border-slate-200 rounded-2xl p-3 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative w-full lg:w-80 lg:flex-none lg:mr-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500" size={18} />
            <input type="text" placeholder="Buscar institución por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-9 py-2.5 border-2 border-brand-200 rounded-xl bg-white text-slate-800 placeholder-slate-500 font-medium outline-none shadow-sm focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 text-sm transition-all" />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>
            )}
          </div>

          <div className="relative lg:w-56">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="w-full pl-9 pr-8 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-medium appearance-none cursor-pointer transition-all">
              <option value="todos">Todas las categorías</option>
              <option value="BUSINESS Micro">BUSINESS Micro</option>
              <option value="BUSINESS Pequeña">BUSINESS Pequeña</option>
              <option value="BUSINESS Mediana">BUSINESS Mediana</option>
              <option value="Plan Premium">Plan Premium</option>
              <option value="Plan Premium Gold">Plan Premium Gold</option>
              <option value="Sin Categoría">Sin Categoría</option>
            </select>
          </div>

          <div className="relative lg:w-52">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select value={orden} onChange={(e) => setOrden(e.target.value)} className="w-full pl-9 pr-8 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-medium appearance-none cursor-pointer transition-all">
              <option value="nombre">Orden: Nombre (A-Z)</option>
              <option value="consumo">Orden: Mayor consumo</option>
              <option value="vence">Orden: Vence primero</option>
            </select>
          </div>

          <button
            onClick={() => setFiltroAlerta(filtroAlerta === 'consumo_alto' ? 'todas' : 'consumo_alto')}
            className={`flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 whitespace-nowrap ${filtroAlerta === 'consumo_alto' ? 'bg-red-100 border-red-300 text-red-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            title="Instituciones con uso avanzado (75% o más)"
          >
            <Flame size={16} className="mr-1.5" /> Alto consumo
          </button>

          <div className="flex bg-slate-100 rounded-xl p-1 self-start lg:self-auto">
            <button onClick={() => setVista('tarjetas')} className={`p-2 rounded-lg transition-all ${vista === 'tarjetas' ? 'bg-white shadow text-brand-600' : 'text-slate-500 hover:text-slate-700'}`} title="Vista de tarjetas"><LayoutGrid size={18} /></button>
            <button onClick={() => setVista('lista')} className={`p-2 rounded-lg transition-all ${vista === 'lista' ? 'bg-white shadow text-brand-600' : 'text-slate-500 hover:text-slate-700'}`} title="Vista de lista"><List size={18} /></button>
          </div>
        </div>

        {hayFiltros && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Filtros:</span>
            {searchTerm && <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">Búsqueda: {searchTerm}</span>}
            {filtroEstado !== 'todos' && <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold capitalize">Estado: {filtroEstado}</span>}
            {filtroCategoria !== 'todos' && <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">{filtroCategoria}</span>}
            {filtroAlerta !== 'todas' && <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">Alto consumo</span>}
            <button onClick={limpiarFiltros} className="ml-auto inline-flex items-center text-xs font-bold text-brand-600 hover:text-brand-700">
              <RotateCcw size={13} className="mr-1" /> Limpiar filtros
            </button>
          </div>
        )}
      </div>

      <div className="relative z-10">
        {institucionesFiltradas.length === 0 ? (
          hayFiltros ? (
            <div className="bg-white p-12 rounded-2xl text-center text-slate-500 border border-slate-200/80 shadow-md">
              <Search size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-bold text-slate-800 mb-2">No se encontraron resultados</p>
              <p className="text-slate-500">No hay instituciones que coincidan con los filtros aplicados.</p>
              <button onClick={limpiarFiltros} className="mt-6 text-brand-600 hover:text-brand-700 font-bold bg-brand-50 border border-brand-100 hover:bg-brand-100 px-5 py-2.5 rounded-xl transition-all active:scale-95 text-sm">
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl text-center text-slate-500 border border-slate-200/80 shadow-md">
              <Building size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-bold text-slate-800 mb-2">No hay instituciones registradas</p>
              <p className="text-slate-500">Haz clic en «Nueva institución» para comenzar.</p>
            </div>
          )
        ) : vista === 'lista' ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[980px]">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200">
                  <th className="text-left px-5 py-3">Institución</th>
                  <th className="text-left px-3 py-3">Estado</th>
                  <th className="text-left px-3 py-3 w-48">Uso del contrato</th>
                  <th className="text-right px-3 py-3">Asignadas</th>
                  <th className="text-right px-3 py-3">Restantes</th>
                  <th className="text-left px-3 py-3">Vencimiento</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((institucion, i) => {
                  const est = estiloEstado(institucion.estado);
                  const uso = datosUso(institucion);
                  const dias = diasParaVencer(institucion);
                  return (
                    <tr key={institucion.id} className={`border-b border-slate-100 hover:bg-brand-50/40 transition-colors ${i % 2 ? 'bg-slate-50/50' : ''}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradienteCategoria(institucion.categoria)} text-white text-sm font-black flex items-center justify-center mr-3 flex-shrink-0`}>
                            {iniciales(institucion.nombre)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-800 uppercase tracking-tight truncate">{institucion.nombre}</p>
                            <p className="text-xs text-slate-500 font-medium">{institucion.categoria || 'Sin Categoría'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${est.badge}`}>{est.texto}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${uso.porcentaje}%`, backgroundColor: colorUso(uso.porcentaje) }} />
                          </div>
                          <span className="text-xs font-bold w-12 text-right" style={{ color: colorUso(uso.porcentaje) }}>{uso.porcentaje.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-blue-600">{uso.asignadas.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right font-bold text-emerald-600">{uso.restantes.toLocaleString()}</td>
                      <td className="px-3 py-3">
                        <p className="text-xs font-semibold text-slate-700 mb-1">{formatearFecha(institucion.contrato?.fechaFin)}</p>
                        {institucion.estado !== 'vencido' && <ChipVigencia dias={dias} fechaFin={institucion.contrato?.fechaFin} />}
                      </td>
                      <td className="px-5 py-3"><div className="flex justify-end">{renderAcciones(institucion)}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {currentItems.map((institucion, indice) => {
              const est = estiloEstado(institucion.estado);
              const uso = datosUso(institucion);
              const dias = diasParaVencer(institucion);
              const sinSeguimiento = esPlanPremium(institucion.categoria) && !debeMonitorearVencimiento(institucion);
              const meses = Object.entries(institucion.consumoPorMes || {}).sort(([a], [b]) => a.localeCompare(b));

              return (
                <motion.article
                  key={institucion.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(indice, 8) * 0.04, duration: 0.35 }}
                  className="bg-white rounded-2xl border border-slate-200/80 hover:border-brand-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col overflow-hidden"
                >
                  <div className={`h-1.5 w-full bg-gradient-to-r ${est.acento}`} />

                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-start min-w-0 flex-1">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradienteCategoria(institucion.categoria)} text-white text-base font-black flex items-center justify-center mr-3 flex-shrink-0 shadow-md`}>
                          {iniciales(institucion.nombre)}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-tight leading-tight">{institucion.nombre}</h2>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold border bg-slate-100 text-slate-700 border-slate-200">
                              {institucion.categoria || 'Sin Categoría'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${est.badge}`}>{est.texto}</span>
                          </div>
                        </div>
                      </div>
                      {renderAcciones(institucion)}
                    </div>

                    {/* Medidor + cifras */}
                    <div className="flex items-center gap-5 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                      <MedidorUso porcentaje={uso.porcentaje} />
                      <div className="grid grid-cols-3 gap-3 text-center flex-1">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Asignadas</p>
                          <p className="text-xl font-black text-blue-600">{uso.asignadas.toLocaleString()}</p>
                        </div>
                        <div className="border-l border-slate-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Consumidas</p>
                          <p className="text-xl font-black text-slate-800">{uso.consumidas.toLocaleString()}</p>
                        </div>
                        <div className="border-l border-slate-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Restantes</p>
                          <p className="text-xl font-black text-emerald-600">{uso.restantes.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Contrato */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        <Calendar size={12} className="mr-1" />
                        {formatearFecha(institucion.contrato?.fechaInicio || institucion.fechaCreacion)} → {formatearFecha(institucion.contrato?.fechaFin)}
                      </span>
                      {institucion.estado !== 'vencido' && <ChipVigencia dias={dias} fechaFin={institucion.contrato?.fechaFin} />}
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Plazo: {institucion.plazoMeses || 1} {(institucion.plazoMeses || 1) === 1 ? 'mes' : 'meses'}
                      </span>
                      {sinSeguimiento && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-white" title="Su vencimiento no aparece en Monitoreo Contratos">
                          <EyeOff size={12} className="mr-1" /> Sin seguimiento de vencimiento
                        </span>
                      )}
                      {institucion.historial && institucion.historial.length > 0 && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                          <History size={12} className="mr-1" /> {institucion.historial.length} {institucion.historial.length === 1 ? 'período anterior' : 'períodos anteriores'}
                        </span>
                      )}
                    </div>

                    {/* Tendencia */}
                    {meses.length > 0 ? (
                      <div className="pt-3 border-t border-slate-100 flex flex-col flex-1">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center">
                          <BarChart2 className="mr-1 text-brand-500" size={14} />
                          Tendencia de consumo
                        </h4>
                        <div className="h-28 w-full mt-2">
                          <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                            <AreaChart data={meses.map(([mes, consumo]) => ({ name: new Date(mes + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'short' }).toUpperCase(), consumo, mesRaw: mes }))} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id={`color-${institucion.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ff5105" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="#ff5105" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <Tooltip
                                formatter={(value) => [value.toLocaleString(), 'Consultas']}
                                contentStyle={{ borderRadius: '12px', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(0, 0, 0, 0.08)', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)', fontSize: '12px', color: '#1e293b' }}
                                itemStyle={{ color: '#ff5105' }}
                                labelStyle={{ fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}
                              />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: '500' }} height={14} dy={5} />
                              <Area type="monotone" dataKey="consumo" stroke="#ff5105" strokeWidth={2} fillOpacity={1} fill={`url(#color-${institucion.id})`} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                        {(canEdit || canDelete) && (
                          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-dashed border-slate-100">
                            {meses.map(([mes, consumo]) => (
                              <div key={mes} className="group/item flex items-center text-xs bg-brand-50 border border-brand-100 rounded-lg px-2 py-1 shadow-sm transition-all hover:border-brand-300">
                                <span className="font-bold text-brand-800 pr-1.5 border-r border-brand-200 mr-1.5">{new Date(mes + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}</span>
                                <span className="text-brand-700 font-extrabold mr-1">{consumo.toLocaleString()}</span>
                                <div className="flex space-x-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 w-0 overflow-hidden group-hover/item:w-auto group-hover/item:ml-1">
                                  {canEdit && <button onClick={() => { setInstitucionSeleccionada(institucion); setMesSeleccionadoParaEditar(mes); setShowEditConsumoModal(true); }} className="text-slate-500 hover:text-blue-600 bg-white hover:bg-slate-50 rounded p-1 transition-colors" title="Editar"><Edit3 size={11} /></button>}
                                  {canDelete && <button onClick={() => handleEliminarConsumoMensual(institucion, mes)} className="text-slate-500 hover:text-red-600 bg-white hover:bg-slate-50 rounded p-1 transition-colors" title="Eliminar"><Trash2 size={11} /></button>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pt-5 pb-3 border-t border-slate-100 flex flex-col items-center justify-center flex-1">
                        <div className="bg-slate-50 p-3 rounded-full mb-2">
                          <BarChart2 className="text-slate-400" size={20} />
                        </div>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider text-center">Aún sin movimientos</p>
                      </div>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-slate-200">
            <span className="text-sm font-medium text-slate-500">Página {currentPage} de {totalPages} · {institucionesFiltradas.length} resultados</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"><ChevronLeft size={16} /></button>
              {paginasVisibles().map((p, i) => p === '…' ? (
                <span key={`e${i}`} className="px-2 text-slate-400">…</span>
              ) : (
                <button key={p} onClick={() => setCurrentPage(p)} className={`min-w-[36px] h-9 rounded-lg text-sm font-bold transition-all shadow-sm ${p === currentPage ? 'bg-brand-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{p}</button>
              ))}
              <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {showModal && <ModalAgregarInstitucion onClose={() => setShowModal(false)} onSave={handleSave} />}
      {showEditModal && institucionSeleccionada && <ModalEditarInstitucion institucion={institucionSeleccionada} onClose={() => { setShowEditModal(false); setInstitucionSeleccionada(null); }} onSave={handleEdit} />}
      {showConsumoModal && institucionSeleccionada && <ModalConsumoMensual institucion={institucionSeleccionada} onClose={() => { setShowConsumoModal(false); setInstitucionSeleccionada(null); }} onSave={handleConsumoMensual} />}
      {showEditConsumoModal && institucionSeleccionada && mesSeleccionadoParaEditar && <ModalEditarConsumoMes institucion={institucionSeleccionada} mesSeleccionado={mesSeleccionadoParaEditar} onClose={() => { setShowEditConsumoModal(false); setInstitucionSeleccionada(null); setMesSeleccionadoParaEditar(null); }} onSave={handleEditarConsumoMensual} />}
      {showHistorialModal && institucionSeleccionada && <ModalHistorial institucion={institucionSeleccionada} onClose={() => { setShowHistorialModal(false); setInstitucionSeleccionada(null); }} />}
      {showAuditoriaModal && institucionSeleccionada && <ModalAuditoria institucion={institucionSeleccionada} onClose={() => { setShowAuditoriaModal(false); setInstitucionSeleccionada(null); }} />}
    </div>
  );
};

export default Instituciones;