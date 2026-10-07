// src/components/GestionUsuarios.jsx
import React, { useState, useEffect } from 'react';
import { sileo } from './sileo';
import { confirmar } from '../utils/confirmar';
import { 
  Users, UserPlus, X, Trash2, Shield, User,
  CheckCircle, AlertCircle, Loader2, Calculator, Edit3, PieChart, ShieldAlert
} from 'lucide-react';
import { useUsuarios } from '../hooks/useFirebase';

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
                <option value="usuario">👤 Operador (Instituciones)</option>
                <option value="contabilidad">📊 Contabilidad</option>
                <option value="admin">🛡️ Administrador (Acceso Total)</option>
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

const GestionUsuarios = () => {
  const [showModal, setShowModal] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null); 
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

  if (loading && usuarios.length === 0) return <div className="p-10 flex justify-center"><Loader2 size={48} className="animate-spin text-blue-600" /></div>;

  return (
    <div className="p-6 sm:p-10 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center"><Users size={32} className="mr-3 text-blue-700"/> Gestión de Usuarios</h1>
        </div>
        <button onClick={() => { setUsuarioSeleccionado(null); setShowModal(true); }} className="bg-blue-600 text-white px-5 py-3 rounded-lg font-semibold flex items-center hover:bg-blue-700 shadow-sm">
          <UserPlus size={20} className="mr-2"/> Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
            <tr>
              <th className="px-6 py-4">Usuario</th>
              <th className="px-6 py-4">Rol / Perfil</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {usuarios.map((usuario) => (
              <tr key={usuario.uid} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${usuario.rol === 'admin' ? 'bg-blue-100' : usuario.rol === 'contabilidad' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                      {usuario.rol === 'admin' ? <Shield className="text-blue-600" size={20} /> : usuario.rol === 'contabilidad' ? <Calculator className="text-purple-600" size={20} /> : <User className="text-gray-600" size={20} />}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-bold text-gray-900">{usuario.nombre} <span className="ml-1 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">{usuario.area || 'Sin Dato área'}</span></div>
                      <div className="text-sm text-gray-500">{usuario.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${usuario.rol === 'admin' ? 'bg-blue-100 text-blue-800' : usuario.rol === 'contabilidad' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                    {usuario.rol === 'admin' ? '🛡️ Admin' : usuario.rol === 'contabilidad' ? '📊 Contabilidad' : '👤 Operador'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleToggleActivo(usuario.uid)} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${usuario.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {usuario.activo ? <><CheckCircle size={14} className="mr-1" /> Activo</> : <><AlertCircle size={14} className="mr-1" /> Inactivo</>}
                  </button>
                </td>
                <td className="px-6 py-4 text-right flex justify-end space-x-2">
                  <button onClick={() => { setUsuarioSeleccionado(usuario); setShowModal(true); }} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-2 rounded-lg" title="Editar"><Edit3 size={18} /></button>
                  <button onClick={() => handleDelete(usuario.uid, usuario.nombre)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg" title="Eliminar"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && <ModalUsuario usuarioAEditar={usuarioSeleccionado} onClose={() => { setShowModal(false); setUsuarioSeleccionado(null); }} onSave={handleSave} onEdit={handleEdit} />}
    </div>
  );
};
export default GestionUsuarios;