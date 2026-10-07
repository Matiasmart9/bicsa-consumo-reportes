// src/components/GestionUsuarios.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { sileo } from './sileo';
import { confirmar } from '../utils/confirmar';
import { 
  Users, UserPlus, X, Trash2, Shield, User,
  CheckCircle, AlertCircle, Loader2, Calculator, Edit3, PieChart, ShieldAlert,
  Search, Info, Clock, Globe, CalendarClock, RotateCcw, KeyRound
} from 'lucide-react';
import { useUsuarios } from '../hooks/useFirebase';
import { formatearFechaHora } from '../utils/excel';

const ModalUsuario = ({ usuarioAEditar, onClose, onSave, onEdit }) => {
  const isEdit = !!usuarioAEditar;
  
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tipoPerfil, setTipoPerfil] = useState('usuario'); 
  const [area, setArea] = useState('');
  
  const [permisos, setPermisos] = useState({
    instituciones: { ver: true, agregar: false, editar: false, eliminar: false, registrarConsumo: false, comentar: false, verHistorial: false },
    contabilidad: { acceso: false, nivel: 'ninguno', dashboardFacturacion: false },
    monitoreoContratos: { acceso: true },
    auditoria: { acceso: false }
  });

  const [saving, setSaving] = useState(false);

  // Cargar datos SOLO al abrir el modal en modo edición
  useEffect(() => {
    if (isEdit && usuarioAEditar) {
      setNombre(usuarioAEditar.nombre || '');
      setEmail(usuarioAEditar.email || '');
      setTipoPerfil(usuarioAEditar.rol || 'usuario');
      setArea(usuarioAEditar.area || '');
      if (usuarioAEditar.permisos) {
        setPermisos({
          ...usuarioAEditar.permisos,
          monitoreoContratos: {
            acceso: usuarioAEditar.permisos.monitoreoContratos?.acceso !== false
          },
          auditoria: {
            // Contabilidad conservaba el acceso antes de existir este permiso
            acceso: usuarioAEditar.permisos.auditoria?.acceso ?? usuarioAEditar.rol === 'contabilidad'
          },
          contabilidad: {
            ...usuarioAEditar.permisos.contabilidad,
            dashboardFacturacion: usuarioAEditar.permisos.contabilidad?.dashboardFacturacion || false
          }
        });
      }
    }
  }, [isEdit, usuarioAEditar]);

  // ✨ LA SOLUCIÓN: Aplicar plantillas SOLO cuando se cambia el selector manualmente
  const handlePerfilChange = (e) => {
    const nuevoPerfil = e.target.value;
    setTipoPerfil(nuevoPerfil);

    if (nuevoPerfil === 'admin') {
      setPermisos({
        instituciones: { ver: true, agregar: true, editar: true, eliminar: true, registrarConsumo: true, comentar: true, verHistorial: true },
        contabilidad: { acceso: true, nivel: 'full', dashboardFacturacion: true },
        monitoreoContratos: { acceso: true },
        auditoria: { acceso: true }
      });
    } else if (nuevoPerfil === 'usuario') {
      setPermisos({
        instituciones: { ver: true, agregar: false, editar: false, eliminar: false, registrarConsumo: false, comentar: false, verHistorial: false },
        contabilidad: { acceso: false, nivel: 'ninguno', dashboardFacturacion: false },
        monitoreoContratos: { acceso: true },
        auditoria: { acceso: false }
      });
    } else if (nuevoPerfil === 'contabilidad') {
      setPermisos({
        instituciones: { ver: true, agregar: false, editar: false, eliminar: false, registrarConsumo: false, comentar: false, verHistorial: false },
        contabilidad: { acceso: true, nivel: 'vista', dashboardFacturacion: true },
        monitoreoContratos: { acceso: false },
        auditoria: { acceso: true }
      });
    }
  };

  const handlePermisoChange = (categoria, permiso, valor) => {
    setPermisos(prev => ({
      ...prev,
      [categoria]: {
        ...prev[categoria],
        [permiso]: valor
      }
    }));
  };

  const handleSubmit = async () => {
    if (nombre.trim() && email.trim()) {
      if (!isEdit && !password.trim()) {
        sileo.warning({ title: 'Campo requerido', description: 'Por favor, ingrese una contraseña para el nuevo usuario.' });
        return;
      }

      setSaving(true);
      
      if (isEdit) {
        const resultado = await onEdit(usuarioAEditar.uid, {
          nombre: nombre.trim(),
          email: email.trim(),
          rol: tipoPerfil,
          area: area,
          permisos: permisos 
        });
        if (resultado.success) onClose();
        else sileo.error({ title: 'Error al editar usuario', description: resultado.error });
      } else {
        const resultado = await onSave({
          nombre: nombre.trim(),
          email: email.trim(),
          password: password.trim(),
          rol: tipoPerfil,
          area: area,
          permisos: permisos 
        });
        if (resultado.success) onClose();
        else sileo.error({ title: 'Error al crear usuario', description: resultado.error });
      }
      setSaving(false);
    } else {
      sileo.warning({ title: 'Campos incompletos', description: 'Por favor, complete todos los campos requeridos.' });
    }
  };

  const ToggleSwitch = ({ label, isChecked, onChange, disabled }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>{label}</span>
      <button type="button" disabled={disabled} onClick={() => onChange(!isChecked)} className={`${isChecked ? 'bg-blue-600' : 'bg-gray-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}>
        <span className={`${isChecked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-4 border-b">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            {isEdit ? <Edit3 className="mr-2 text-blue-600"/> : <UserPlus className="mr-2 text-blue-600"/>}
            {isEdit ? 'Editar Usuario y Permisos' : 'Nuevo Usuario y Permisos'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={saving}><X size={24} /></button>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" disabled={saving} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`w-full p-2.5 border border-gray-300 rounded-lg outline-none ${isEdit ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`} disabled={saving || isEdit} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña (Min 6 car.)</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" minLength="6" disabled={saving} />
              </div>
            )}
            <div className={isEdit ? "md:col-span-2" : ""}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Perfil Base</label>
              <select value={tipoPerfil} onChange={handlePerfilChange} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" disabled={saving}>
                <option value="usuario">Operador (Instituciones)</option>
                <option value="contabilidad">Contabilidad</option>
                <option value="admin">Administrador (Acceso Total)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Área / Departamento</label>
              <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" disabled={saving}>
                <option value="">Seleccione un área...</option>
                <option value="Informática">Informática</option>
                <option value="Contabilidad">Contabilidad</option>
                <option value="Gerencia">Gerencia</option>
                <option value="Marketing">Marketing</option>
                <option value="ATC">ATC</option>
                <option value="Administración">Administración</option>
                <option value="Comercial">Comercial</option>
              </select>
            </div>
          </div>

          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-600" /> Configuración de Permisos (Personalizable)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h4 className="font-bold text-gray-800 border-b pb-2 mb-3 flex items-center"><User size={18} className="mr-2 text-gray-500"/> Módulo Instituciones</h4>
                <ToggleSwitch label="Agregar Institución" disabled={tipoPerfil === 'admin'} isChecked={permisos.instituciones.agregar} onChange={(v) => handlePermisoChange('instituciones', 'agregar', v)} />
                <ToggleSwitch label="Editar Institución" disabled={tipoPerfil === 'admin'} isChecked={permisos.instituciones.editar} onChange={(v) => handlePermisoChange('instituciones', 'editar', v)} />
                <ToggleSwitch label="Eliminar Institución" disabled={tipoPerfil === 'admin'} isChecked={permisos.instituciones.eliminar} onChange={(v) => handlePermisoChange('instituciones', 'eliminar', v)} />
                <ToggleSwitch label="Registrar Consumos" disabled={tipoPerfil === 'admin'} isChecked={permisos.instituciones.registrarConsumo} onChange={(v) => handlePermisoChange('instituciones', 'registrarConsumo', v)} />
                <ToggleSwitch label="Gestionar Comentarios" disabled={tipoPerfil === 'admin'} isChecked={permisos.instituciones.comentar} onChange={(v) => handlePermisoChange('instituciones', 'comentar', v)} />
                <ToggleSwitch label="Ver Historial" disabled={tipoPerfil === 'admin'} isChecked={permisos.instituciones.verHistorial} onChange={(v) => handlePermisoChange('instituciones', 'verHistorial', v)} />
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h4 className="font-bold text-gray-800 border-b pb-2 mb-3 flex items-center"><Calculator size={18} className="mr-2 text-purple-500"/> Módulo Contabilidad</h4>
                
                <div className="mb-2">
                  <ToggleSwitch 
                    label="Acceso a Dashboard Facturación" 
                    disabled={tipoPerfil === 'admin'}
                    isChecked={permisos.contabilidad.dashboardFacturacion} 
                    onChange={(v) => handlePermisoChange('contabilidad', 'dashboardFacturacion', v)} 
                  />
                </div>

                <ToggleSwitch 
                  label="Habilitar Módulo Facturación" 
                  disabled={tipoPerfil === 'admin'}
                  isChecked={permisos.contabilidad.acceso} 
                  onChange={(v) => {
                    handlePermisoChange('contabilidad', 'acceso', v);
                    if(!v) handlePermisoChange('contabilidad', 'nivel', 'ninguno');
                    else if(permisos.contabilidad.nivel === 'ninguno') handlePermisoChange('contabilidad', 'nivel', 'vista');
                  }} 
                />
                
                {permisos.contabilidad.acceso && (
                  <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <label className="block text-sm font-bold text-purple-800 mb-3">Nivel de Acceso en Facturas</label>
                    <div className="flex flex-col space-y-3">
                      <label className="flex items-center cursor-pointer">
                        <input type="radio" disabled={tipoPerfil === 'admin'} name="nivelContabilidad" value="vista" checked={permisos.contabilidad.nivel === 'vista'} onChange={() => handlePermisoChange('contabilidad', 'nivel', 'vista')} className="w-4 h-4 text-purple-600" />
                        <span className="ml-2 text-sm text-gray-700">Solo Vista (Lectura)</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input type="radio" disabled={tipoPerfil === 'admin'} name="nivelContabilidad" value="full" checked={permisos.contabilidad.nivel === 'full'} onChange={() => handlePermisoChange('contabilidad', 'nivel', 'full')} className="w-4 h-4 text-purple-600" />
                        <span className="ml-2 text-sm text-gray-700 font-medium">Full (Crear/Editar Pagos)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 md:col-span-2">
                <h4 className="font-bold text-gray-800 border-b pb-2 mb-3 flex items-center"><ShieldAlert size={18} className="mr-2 text-brand-500"/> Otros módulos</h4>
                <ToggleSwitch label="Acceso a Monitoreo Contratos" disabled={tipoPerfil === 'admin'} isChecked={permisos.monitoreoContratos?.acceso !== false} onChange={(v) => handlePermisoChange('monitoreoContratos', 'acceso', v)} />
                <ToggleSwitch label="Acceso a Auditoría" disabled={tipoPerfil === 'admin'} isChecked={permisos.auditoria?.acceso === true} onChange={(v) => handlePermisoChange('auditoria', 'acceso', v)} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-4 border-t pt-4">
          <button onClick={onClose} className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium" disabled={saving}>Cancelar</button>
          <button onClick={handleSubmit} className="px-6 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center font-medium shadow-sm disabled:opacity-50" disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin mr-2" />}
            {saving ? 'Guardando...' : (isEdit ? 'Actualizar Usuario' : 'Crear Usuario')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Utilidades del listado ----------
const hace = (iso) => {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms)) return null;
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} ${h === 1 ? 'hora' : 'horas'}`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
  const m = Math.floor(d / 30);
  if (m < 12) return `hace ${m} ${m === 1 ? 'mes' : 'meses'}`;
  const a = Math.floor(d / 365);
  return `hace ${a} ${a === 1 ? 'año' : 'años'}`;
};

// Verde: ingresó en el último día. Gris: en el último mes. Ámbar: hace más de un mes. Rojo suave: nunca.
const frescura = (iso) => {
  if (!iso) return { punto: 'bg-slate-300', texto: 'text-slate-400' };
  const dias = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (dias <= 1) return { punto: 'bg-emerald-500', texto: 'text-emerald-700' };
  if (dias <= 30) return { punto: 'bg-slate-400', texto: 'text-slate-600' };
  return { punto: 'bg-amber-500', texto: 'text-amber-700' };
};

const ESTILO_ROL = {
  admin: { texto: 'Admin', icono: Shield, avatar: 'bg-blue-100 text-blue-600', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  contabilidad: { texto: 'Contabilidad', icono: Calculator, avatar: 'bg-purple-100 text-purple-600', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  usuario: { texto: 'Operador', icono: User, avatar: 'bg-slate-100 text-slate-600', badge: 'bg-slate-100 text-slate-700 border-slate-200' }
};
const estiloRol = (rol) => ESTILO_ROL[rol] || ESTILO_ROL.usuario;

const listarAccesos = (u) => {
  if (u.rol === 'admin') return ['Acceso total'];
  const p = u.permisos || {};
  const i = p.instituciones || {};
  const lista = [];
  if (i.agregar) lista.push('Agregar instituciones');
  if (i.editar) lista.push('Editar instituciones');
  if (i.eliminar) lista.push('Eliminar instituciones');
  if (i.registrarConsumo) lista.push('Registrar consumos');
  if (i.comentar) lista.push('Comentarios');
  if (i.verHistorial) lista.push('Ver historial');
  if (p.contabilidad?.acceso) lista.push(`Facturación (${p.contabilidad.nivel === 'full' ? 'completo' : 'solo vista'})`);
  if (p.contabilidad?.dashboardFacturacion) lista.push('Dashboard Facturación');
  if (p.monitoreoContratos?.acceso !== false) lista.push('Monitoreo Contratos');
  if (p.auditoria?.acceso ?? u.rol === 'contabilidad') lista.push('Auditoría');
  return lista;
};

const GestionUsuarios = () => {
  const [showModal, setShowModal] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [detalle, setDetalle] = useState({});
  const { usuarios, loading, error, agregarUsuario, eliminarUsuario, toggleUsuarioActivo, editarUsuario } = useUsuarios();

  const handleSave = async (nuevoUsuario) => {
    const resultado = await agregarUsuario(nuevoUsuario);
    if (resultado.success) sileo.success({ title: 'Usuario creado', description: `"${nuevoUsuario.nombre}" fue creado exitosamente.` });
    return resultado;
  };

  const handleEdit = async (uid, datos) => {
    const resultado = await editarUsuario(uid, datos);
    if (resultado.success) sileo.success({ title: 'Usuario actualizado', description: `"${datos.nombre}" fue actualizado exitosamente.` });
    return resultado;
  };

  const handleDelete = async (uid, nombre) => {
    confirmar(
      'Eliminar usuario',
      `¿Estás seguro de que quieres eliminar al usuario "${nombre}"? Esta acción no se puede deshacer.`,
      async () => {
        const resultado = await eliminarUsuario(uid, nombre);
        if (resultado.success) sileo.success({ title: 'Usuario eliminado', description: `"${nombre}" fue eliminado exitosamente.` });
        else sileo.error({ title: 'Error al eliminar', description: resultado.error });
      }
    );
  };

  const handleToggleActivo = async (uid) => {
    const resultado = await toggleUsuarioActivo(uid);
    if (!resultado.success) sileo.error({ title: 'Error', description: resultado.error });
  };

  const nombreDe = (uid) => usuarios.find(u => u.uid === uid)?.nombre || null;

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return usuarios.filter(u => {
      if (filtroRol !== 'todos' && u.rol !== filtroRol) return false;
      if (filtroEstado === 'activo' && !u.activo) return false;
      if (filtroEstado === 'inactivo' && u.activo) return false;
      if (texto && !`${u.nombre} ${u.email} ${u.area || ''}`.toLowerCase().includes(texto)) return false;
      return true;
    });
  }, [usuarios, busqueda, filtroRol, filtroEstado]);

  const hayFiltros = busqueda || filtroRol !== 'todos' || filtroEstado !== 'todos';
  const limpiar = () => { setBusqueda(''); setFiltroRol('todos'); setFiltroEstado('todos'); };
  const totalActivos = usuarios.filter(u => u.activo).length;
  const campoFiltro = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-medium transition-all';

  if (loading && usuarios.length === 0) return <div className="p-10 flex justify-center"><Loader2 size={48} className="animate-spin text-brand-500" /></div>;

  if (error) return <div className="p-10 text-center text-red-700 font-medium">{error}</div>;

  return (
    <div className="p-4 sm:p-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-400 text-white flex items-center justify-center shadow-lg shadow-brand-500/20 mr-4">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Gestión de Usuarios</h1>
            <p className="text-slate-500 font-medium">{usuarios.length} usuarios · {totalActivos} activos · {usuarios.length - totalActivos} inactivos</p>
          </div>
        </div>
        <button onClick={() => { setUsuarioSeleccionado(null); setShowModal(true); }} className="self-start sm:self-auto bg-brand-500 text-white px-5 py-3 rounded-xl font-bold flex items-center hover:bg-brand-600 shadow-lg shadow-brand-500/20 transition-all active:scale-95">
          <UserPlus size={20} className="mr-2" /> Nuevo Usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500" size={18} />
            <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, correo o área..." className="w-full pl-10 pr-9 py-2.5 border-2 border-brand-200 rounded-xl bg-white text-slate-800 placeholder-slate-500 font-medium outline-none shadow-sm focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 text-sm transition-all" />
            {busqueda && <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>}
          </div>
          <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)} className={campoFiltro}>
            <option value="todos">Todos los roles</option>
            <option value="admin">Admin</option>
            <option value="contabilidad">Contabilidad</option>
            <option value="usuario">Operador</option>
          </select>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className={campoFiltro}>
            <option value="todos">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>
        {hayFiltros && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{filtrados.length} de {usuarios.length} usuarios</span>
            <button onClick={limpiar} className="inline-flex items-center text-xs font-bold text-brand-600 hover:text-brand-700"><RotateCcw size={13} className="mr-1" /> Limpiar filtros</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[980px]">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Usuario</th>
              <th className="px-4 py-3">Rol / Perfil</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Último inicio de sesión</th>
              <th className="px-6 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-12 text-slate-400 font-medium">No hay usuarios que coincidan con los filtros.</td></tr>
            ) : filtrados.map((usuario) => {
              const rol = estiloRol(usuario.rol);
              const IconoRol = rol.icono;
              const f = frescura(usuario.ultimoAccesoISO);
              const abierto = !!detalle[usuario.uid];
              const accesos = listarAccesos(usuario);
              return (
                <React.Fragment key={usuario.uid}>
                  <tr className={`hover:bg-brand-50/30 transition-colors ${abierto ? 'bg-brand-50/20' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${rol.avatar}`}>
                          <IconoRol size={20} />
                        </div>
                        <div className="ml-4 min-w-0">
                          <div className="text-sm font-extrabold text-slate-800 flex items-center flex-wrap gap-1.5">
                            {usuario.nombre}
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{usuario.area || 'Sin Dato área'}</span>
                          </div>
                          <div className="text-sm text-slate-500 truncate">{usuario.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${rol.badge}`}>
                        <IconoRol size={13} className="mr-1.5" /> {rol.texto}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => handleToggleActivo(usuario.uid)} title="Clic para activar o desactivar" className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border transition-all active:scale-95 ${usuario.activo ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200' : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'}`}>
                        {usuario.activo ? <><CheckCircle size={14} className="mr-1" /> Activo</> : <><AlertCircle size={14} className="mr-1" /> Inactivo</>}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      {usuario.ultimoAccesoISO ? (
                        <div className="flex items-start">
                          <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${f.punto}`} />
                          <div className="ml-2">
                            <p className={`text-sm font-bold ${f.texto}`}>{hace(usuario.ultimoAccesoISO)}</p>
                            <p className="text-xs text-slate-500">{formatearFechaHora(usuario.ultimoAccesoISO)}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center text-sm text-slate-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-slate-300 mr-2" /> Nunca inició sesión
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => setDetalle(d => ({ ...d, [usuario.uid]: !d[usuario.uid] }))} className={`p-2 rounded-lg transition-colors ${abierto ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:text-brand-600 bg-slate-100 hover:bg-brand-50'}`} title="Ver detalle del usuario"><Info size={18} /></button>
                        <button onClick={() => { setUsuarioSeleccionado(usuario); setShowModal(true); }} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-2 rounded-lg transition-colors" title="Editar"><Edit3 size={18} /></button>
                        <button onClick={() => handleDelete(usuario.uid, usuario.nombre)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg transition-colors" title="Eliminar"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                  {abierto && (
                    <tr className="bg-slate-50/70">
                      <td colSpan="5" className="px-6 py-5">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <p className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5"><Clock size={13} className="mr-1.5 text-brand-500" /> Último inicio de sesión</p>
                            {usuario.ultimoAccesoISO ? (
                              <>
                                <p className="text-sm font-extrabold text-slate-800">{formatearFechaHora(usuario.ultimoAccesoISO)}</p>
                                <p className={`text-xs font-bold ${f.texto}`}>{hace(usuario.ultimoAccesoISO)}</p>
                              </>
                            ) : <p className="text-sm font-bold text-slate-400">Nunca inició sesión</p>}
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <p className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5"><Globe size={13} className="mr-1.5 text-brand-500" /> Dirección IP</p>
                            <p className="text-sm font-extrabold text-slate-800">{usuario.ultimoLoginIP || 'Sin registro'}</p>
                            <p className="text-xs text-slate-500">del último inicio de sesión</p>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <p className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5"><CalendarClock size={13} className="mr-1.5 text-brand-500" /> Cuenta creada</p>
                            <p className="text-sm font-extrabold text-slate-800">{usuario.fechaCreacion || 'N/A'}</p>
                            <p className="text-xs text-slate-500">{nombreDe(usuario.creadoPor) ? `por ${nombreDe(usuario.creadoPor)}` : 'creador no registrado'}</p>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <p className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5"><Edit3 size={13} className="mr-1.5 text-brand-500" /> Última modificación</p>
                            <p className="text-sm font-extrabold text-slate-800">{usuario.fechaModificacion ? formatearFechaHora(usuario.fechaModificacion) : 'Sin cambios'}</p>
                            <p className="text-xs text-slate-500">{nombreDe(usuario.modificadoPor) ? `por ${nombreDe(usuario.modificadoPor)}` : ' '}</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2"><KeyRound size={13} className="mr-1.5 text-brand-500" /> Accesos</p>
                          <div className="flex flex-wrap gap-1.5">
                            {accesos.length === 0
                              ? <span className="text-xs text-slate-400 font-medium">Solo consulta (sin permisos adicionales)</span>
                              : accesos.map(a => <span key={a} className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white border border-slate-200 text-slate-600">{a}</span>)}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {showModal && <ModalUsuario usuarioAEditar={usuarioSeleccionado} onClose={() => { setShowModal(false); setUsuarioSeleccionado(null); }} onSave={handleSave} onEdit={handleEdit} />}
    </div>
  );
};

export default GestionUsuarios;
