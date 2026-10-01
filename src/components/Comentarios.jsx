// src/components/Comentarios.jsx
import React, { useState } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Edit3, 
  Trash2, 
  User,
  Clock,
  Save,
  AlertCircle,
  Loader2,
  Pin
} from 'lucide-react';
import { useComentarios, useUsuarios } from '../hooks/useFirebase';
import { auth } from '../firebase';
import { sileo } from './sileo';
import { confirmar } from '../utils/confirmar';

const ModalComentarios = ({ institucion, onClose }) => {
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [etiqueta, setEtiqueta] = useState('General');
  const [comentarioEditando, setComentarioEditando] = useState(null);
  const [textoEditando, setTextoEditando] = useState('');
  const [saving, setSaving] = useState(false);

  const { 
    comentarios, 
    loading, 
    error,
    agregarComentario,
    editarComentario,
    eliminarComentario,
    toggleFijarComentario
  } = useComentarios(institucion.id);

  const { usuarios } = useUsuarios();
  const currentUser = auth.currentUser;

  const getNombreUsuario = (uid, defaultName) => {
    const usuario = usuarios?.find(u => u.uid === uid || u.id === uid);
    return usuario?.nombre || defaultName;
  };

  const handleAgregarComentario = async () => {
    if (!nuevoComentario.trim()) {
      sileo.warning({ title: 'Campo vacío', description: 'Por favor, escribe un comentario antes de enviarlo.' });
      return;
    }

    setSaving(true);
    try {
      const resultado = await agregarComentario({
        texto: nuevoComentario.trim(),
        institucionId: institucion.id,
        etiqueta
      });

      if (!resultado.success) {
        sileo.error({ title: 'Error al agregar comentario', description: resultado.error });
      } else {
        setNuevoComentario('');
        setEtiqueta('General');
      }
    } catch (error) {
      sileo.error({ title: 'Error inesperado', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleEditarComentario = async (comentarioId) => {
    if (!textoEditando.trim()) {
      sileo.warning({ title: 'Campo vacío', description: 'El comentario no puede estar vacío.' });
      return;
    }

    setSaving(true);
    try {
      const resultado = await editarComentario(comentarioId, textoEditando.trim());
      
      if (resultado.success) {
        setComentarioEditando(null);
        setTextoEditando('');
      } else {
        sileo.error({ title: 'Error al editar comentario', description: resultado.error });
      }
    } catch (error) {
      sileo.error({ title: 'Error inesperado', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarComentario = async (comentarioId, autorNombre) => {
    confirmar(
      'Eliminar comentario',
      `¿Estás seguro de que quieres eliminar este comentario? Esta acción no se puede deshacer.`,
      async () => {
        setSaving(true);
        try {
          const resultado = await eliminarComentario(comentarioId);
          if (!resultado.success) {
            sileo.error({ title: 'Error al eliminar comentario', description: resultado.error });
          }
        } catch (error) {
          sileo.error({ title: 'Error inesperado', description: error.message });
        } finally {
          setSaving(false);
        }
      }
    );
  };

  const iniciarEdicion = (comentario) => {
    setComentarioEditando(comentario.id);
    setTextoEditando(comentario.texto);
  };

  const cancelarEdicion = () => {
    setComentarioEditando(null);
    setTextoEditando('');
  };

  const formatearFecha = (fecha) => {
    try {
      const fechaObj = fecha?.toDate ? fecha.toDate() : new Date(fecha);
      return fechaObj.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const puedeEditar = (comentario) => {
    return currentUser && comentario.autorUid === currentUser.uid;
  };

  const parseMensajes = (texto) => {
    if (!texto) return null;
    const regex = /(@\w+)/g;
    const parts = texto.split(regex);
    return parts.map((part, i) => {
      if (regex.test(part)) {
        return <span key={i} className="font-bold text-blue-700 bg-blue-100 px-1 rounded-sm">{part}</span>;
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Añadimos flex y flex-col al contenedor principal para que los hijos respeten el max-h */}
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header - Aplicamos el degradado Naranja/Ámbar */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-500 text-white p-6 shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold flex items-center drop-shadow-sm">
                <MessageCircle className="mr-3" size={28} />
                Comentarios - {institucion.nombre}
              </h2>
              <p className="text-orange-100 text-sm mt-1 font-medium">
                Espacio para notas, observaciones y comunicación del equipo
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="text-orange-100 hover:text-white transition-colors p-1"
              disabled={saving}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Contenido - Quitamos el h-[600px] fijo y usamos flex-1 overflow-hidden */}
        <div className="flex flex-col flex-1 overflow-hidden">
          
          {/* Lista de comentarios - Esta parte es la que hace el scroll (overflow-y-auto) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading && comentarios.length === 0 ? (
              <div className="text-center py-8">
                <Loader2 size={32} className="animate-spin text-orange-500 mx-auto mb-2" />
                <p className="text-gray-600">Cargando comentarios...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                <AlertCircle size={32} className="mx-auto mb-2" />
                <p>Error al cargar comentarios: {error}</p>
              </div>
            ) : comentarios.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No hay comentarios aún</h3>
                <p className="text-gray-500">Sé el primero en dejar un comentario sobre esta institución.</p>
              </div>
            ) : (
              comentarios.map((comentario) => (
                <div key={comentario.id} className={`rounded-lg p-4 border shadow-sm transition-all ${comentario.fijado ? 'border-amber-400 bg-amber-50' : 'bg-gray-50 border-gray-200'}`}>
                  
                  {/* Header del comentario */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${comentario.fijado ? 'bg-amber-600' : 'bg-orange-500'}`}>
                        <User size={20} className="text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 flex items-center flex-wrap gap-2">
                          {getNombreUsuario(comentario.autorUid, comentario.autorNombre)}
                          <span className="text-[10px] px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full font-bold uppercase tracking-wider">{comentario.autorArea || (comentario.etiqueta === 'General' ? 'Sin Dato área' : (comentario.etiqueta || 'Sin Dato área'))}</span>
                          {comentario.fijado && <span className="text-[10px] px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full font-bold uppercase tracking-wider">📌 Fijado</span>}
                        </div>
                        <div className="text-sm text-gray-500">{comentario.autorEmail}</div>
                      </div>
                    </div>
                    
                    {/* Acciones */}
                    {puedeEditar(comentario) && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => toggleFijarComentario(comentario.id, comentario.fijado || false)}
                          className={`p-1.5 rounded transition-colors ${comentario.fijado ? 'text-amber-600 hover:bg-amber-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                          title={comentario.fijado ? "Desfijar comentario" : "Fijar comentario"}
                          disabled={saving}
                        >
                          <Pin size={16} className={comentario.fijado ? "fill-amber-600" : ""} />
                        </button>
                        
                        {comentarioEditando === comentario.id ? (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleEditarComentario(comentario.id)}
                              className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1.5 rounded transition-colors"
                              title="Guardar cambios"
                              disabled={saving}
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={cancelarEdicion}
                              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded transition-colors"
                              title="Cancelar edición"
                              disabled={saving}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => iniciarEdicion(comentario)}
                              className="text-orange-500 hover:text-orange-700 hover:bg-orange-50 p-1.5 rounded transition-colors"
                              title="Editar comentario"
                              disabled={saving}
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleEliminarComentario(comentario.id, comentario.autorNombre)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"
                              title="Eliminar comentario"
                              disabled={saving}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Contenido del comentario */}
                  <div className="mb-3">
                    {comentarioEditando === comentario.id ? (
                      <textarea
                        value={textoEditando}
                        onChange={(e) => setTextoEditando(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                        rows="3"
                        placeholder="Edita tu comentario..."
                        disabled={saving}
                      />
                    ) : (
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap pl-13">
                        {parseMensajes(comentario.texto)}
                      </p>
                    )}
                  </div>

                  {/* Footer del comentario */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200 mt-2">
                    <div className="flex items-center font-medium">
                      <Clock size={12} className="mr-1.5 text-orange-400" />
                      <span>Publicado: {formatearFecha(comentario.fechaCreacion)}</span>
                    </div>
                    {comentario.fechaModificacion && (
                      <div className="flex items-center font-medium">
                        <Edit3 size={12} className="mr-1.5 text-orange-400" />
                        <span>Editado: {formatearFecha(comentario.fechaModificacion)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Área para nuevo comentario - Aplicamos shrink-0 para que nunca se oculte ni achique */}
            <div className="border-t border-gray-200 p-6 bg-gray-50 shrink-0">
            <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner">
                <User size={20} className="text-white" />
                </div>
                <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                    <div className="text-sm text-gray-600">
                        Comentando como: <span className="font-bold text-orange-700">{getNombreUsuario(currentUser?.uid, currentUser?.displayName || currentUser?.email)}</span>
                    </div>
                </div>
                <textarea
                    value={nuevoComentario}
                    onChange={(e) => setNuevoComentario(e.target.value)}
                    onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAgregarComentario();
                    }
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-shadow"
                    rows="3"
                    placeholder="Escribe tu comentario... (Enter para enviar, Shift+Enter para nueva línea)"
                    disabled={saving}
                    maxLength="500"
                />
                <div className="flex justify-between items-center mt-3">
                    <div className="text-xs font-medium text-gray-500">
                    {nuevoComentario.length}/500 caracteres
                    </div>
                    <button
                    onClick={handleAgregarComentario}
                    disabled={saving || !nuevoComentario.trim() || nuevoComentario.length > 500}
                    className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold flex items-center hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                    {saving ? (
                        <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Enviando...
                        </>
                    ) : (
                        <>
                        <Send size={16} className="mr-2" />
                        Enviar
                        </>
                    )}
                    </button>
                </div>
                </div>
            </div>
            </div>
        </div>
      </div>
    </div>
  );
};

// Componente del botón para abrir comentarios
export const BotonComentarios = ({ institucion, comentariosCount = 0 }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="bg-orange-500 text-white p-3 rounded-lg hover:bg-orange-600 transition-colors relative shadow-sm"
        title="Ver y agregar comentarios"
      >
        <MessageCircle size={18} />
        {comentariosCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
            {comentariosCount > 9 ? '9+' : comentariosCount}
          </span>
        )}
      </button>

      {showModal && (
        <ModalComentarios 
          institucion={institucion}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default ModalComentarios;