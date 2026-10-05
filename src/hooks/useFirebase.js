// src/hooks/useFirebase.js
import { useState, useEffect } from 'react';
import { 
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
  onSnapshot, query, orderBy, serverTimestamp, setDoc, getDoc, where
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, updateProfile, deleteUser, onAuthStateChanged
} from 'firebase/auth';
import { auth, db } from '../firebase';

// ✨ NUEVA FUNCIÓN GLOBAL DE AUDITORÍA
export const logAuditoria = async (institucionId, accion, detalles) => {
  try {
    const usuario = auth.currentUser?.email || 'Sistema';
    await addDoc(collection(db, 'auditoria'), {
      institucionId: institucionId || 'N/A',
      accion,
      detalles,
      usuario,
      fecha: serverTimestamp()
    });
    console.log(`📝 Auditoría registrada: ${accion}`);
  } catch (e) {
    console.error("Error registrando auditoría:", e);
  }
};

// Hook para manejar instituciones
export const useInstituciones = () => {
  const [instituciones, setInstituciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const calcularFechaVencimiento = (fechaInicioOrDuracion, duracionMeses = null) => {
    try {
      let fechaInicio, duracion;
      
      if (duracionMeses === null) {
        fechaInicio = new Date();
        duracion = parseInt(fechaInicioOrDuracion);
      } else {
        fechaInicio = new Date(fechaInicioOrDuracion);
        duracion = parseInt(duracionMeses);
      }
      
      if (isNaN(fechaInicio.getTime())) {
        return new Date().toISOString().split('T')[0];
      }
      
      if (isNaN(duracion) || duracion <= 0) {
        return new Date().toISOString().split('T')[0];
      }
      
      const fechaVencimiento = new Date(fechaInicio);
      fechaVencimiento.setMonth(fechaInicio.getMonth() + duracion);
      
      return fechaVencimiento.toISOString().split('T')[0];
    } catch (error) {
      return new Date().toISOString().split('T')[0];
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'instituciones'), orderBy('fechaCreacion', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const institucionesData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          institucionesData.push({
            id: doc.id,
            ...data,
            fechaCreacion: data.fechaCreacion?.toDate?.()?.toLocaleDateString('es-ES') || new Date().toLocaleDateString('es-ES'),
            contrato: {
              ...data.contrato,
              fechaFin: data.contrato?.fechaFin ? new Date(data.contrato.fechaFin).toLocaleDateString('es-ES') : 'N/A'
            }
          });
        });
        setInstituciones(institucionesData);
        setLoading(false);
      },
      (error) => {
        setError(error.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const agregarInstitucion = async (nuevaInstitucion) => {
    try {
      setLoading(true);
      const fechaInicio = nuevaInstitucion.fechaInicio || new Date().toISOString().split('T')[0];
      
      const institucionCompleta = {
        nombre: nuevaInstitucion.nombre,
        categoria: nuevaInstitucion.categoria || 'Sin Categoría',
        seguimientoConsumo: nuevaInstitucion.seguimientoConsumo || null,
        moneda: nuevaInstitucion.moneda || 'PYG',
        montoTotal: nuevaInstitucion.montoTotal || 0, // ✨ NUEVO
        plazoMeses: nuevaInstitucion.plazoMeses || 1, // ✨ NUEVO
        estado: 'activo',
        contrato: {
          asignadas: nuevaInstitucion.consultas,
          consumidas: 0,
          fechaInicio: fechaInicio,
          fechaFin: calcularFechaVencimiento(fechaInicio, nuevaInstitucion.duracion),
          duracionMeses: nuevaInstitucion.duracion
        },
        fechaCreacion: serverTimestamp(),
        activa: true,
        consumoPorMes: {},
        historial: []
      };

      const docRef = await addDoc(collection(db, 'instituciones'), institucionCompleta);
      
      // ✨ CREAR BORRADOR EN FACTURACIÓN AUTOMÁTICAMENTE
      await addDoc(collection(db, 'facturas'), {
        institucionId: docRef.id,
        institucionNombre: nuevaInstitucion.nombre,
        categoria: nuevaInstitucion.categoria || 'Sin Categoría',
        moneda: nuevaInstitucion.moneda || 'PYG',
        montoTotal: nuevaInstitucion.montoTotal || 0,
        plazoMeses: nuevaInstitucion.plazoMeses || 1,
        estadoGeneral: 'incompleta', // Estado que indica que falta RUC y Nro Factura
        cuotas: [], 
        notas: [], 
        fechaCreacion: serverTimestamp()
      });

      // ✨ REGISTRAR AUDITORÍA
      await logAuditoria(docRef.id, 'Creación de Institución', `Se creó ${nuevaInstitucion.nombre} como ${nuevaInstitucion.categoria}.`);
      
      return { success: true, id: docRef.id };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const editarInstitucion = async (id, datosActualizados) => {
    try {
      const institucionActual = instituciones.find(inst => inst.id === id);
      if (!institucionActual) return { success: false, error: 'No encontrada' };

      const institucionRef = doc(db, 'instituciones', id);
      
      if (datosActualizados.estado === 'renovacion' && datosActualizados.nuevaFechaInicio) {
        const historialPeriodo = {
          periodoInicio: institucionActual.contrato?.fechaInicio || institucionActual.fechaCreacion,
          periodoFin: institucionActual.contrato?.fechaFin,
          consultasAsignadas: institucionActual.contrato?.asignadas,
          consultasConsumidas: institucionActual.contrato?.consumidas,
          consumoPorMes: institucionActual.consumoPorMes || {},
          duracionMeses: institucionActual.contrato?.duracionMeses,
          montoTotal: institucionActual.montoTotal || 0,
          moneda: institucionActual.moneda || 'PYG',
          plazoMeses: institucionActual.plazoMeses || 1,
          fechaRenovacion: new Date().toISOString(),
          comentario: datosActualizados.comentarioRenovacion || null,
          renovadoPor: auth.currentUser?.email || 'Sistema'
        };

        await updateDoc(institucionRef, {
          nombre: datosActualizados.nombre,
          categoria: datosActualizados.categoria || 'Sin Categoría',
          seguimientoConsumo: datosActualizados.seguimientoConsumo || null,
          moneda: datosActualizados.moneda || 'PYG',
          montoTotal: datosActualizados.montoTotal || 0,
          plazoMeses: datosActualizados.plazoMeses || 1,
          estado: 'activo',
          'contrato.asignadas': datosActualizados.consultas,
          'contrato.consumidas': 0,
          'contrato.duracionMeses': datosActualizados.duracion,
          'contrato.fechaInicio': datosActualizados.nuevaFechaInicio,
          'contrato.fechaFin': calcularFechaVencimiento(datosActualizados.nuevaFechaInicio, datosActualizados.duracion),
          consumoPorMes: {},
          historial: [...(institucionActual.historial || []), historialPeriodo],
          ultimaRenovacion: {
            fecha: new Date().toISOString(),
            comentario: datosActualizados.comentarioRenovacion || null,
            renovadoPor: auth.currentUser?.email || 'Sistema'
          }
        });

        // ✨ REGISTRAR AUDITORÍA
        await logAuditoria(id, 'Renovación de Contrato', `Se renovó contrato como ${datosActualizados.categoria}.`);

      } else {
        const fechaInicioOriginal = institucionActual.contrato?.fechaInicio || new Date().toISOString().split('T')[0];
        await updateDoc(institucionRef, {
          nombre: datosActualizados.nombre,
          categoria: datosActualizados.categoria || 'Sin Categoría',
          seguimientoConsumo: datosActualizados.seguimientoConsumo || null,
          moneda: datosActualizados.moneda || 'PYG',
          montoTotal: datosActualizados.montoTotal || 0,
          plazoMeses: datosActualizados.plazoMeses || 1,
          estado: datosActualizados.estado || institucionActual.estado || 'activo',
          'contrato.asignadas': datosActualizados.consultas,
          'contrato.duracionMeses': datosActualizados.duracion,
          'contrato.fechaFin': calcularFechaVencimiento(fechaInicioOriginal, datosActualizados.duracion)
        });

        // ✨ REGISTRAR AUDITORÍA
        await logAuditoria(id, 'Edición de Institución', `Se actualizaron datos generales.`);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const eliminarInstitucion = async (id) => {
    try {
      await deleteDoc(doc(db, 'instituciones', id));
      // ✨ REGISTRAR AUDITORÍA
      await logAuditoria(id, 'Eliminación de Institución', `Institución eliminada del sistema.`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const registrarConsumoMensual = async (id, datosConsumo) => {
    try {
      const institucionRef = doc(db, 'instituciones', id);
      const institucionActual = instituciones.find(inst => inst.id === id);
      
      const nuevoConsumoMes = { 
        ...institucionActual.consumoPorMes, 
        [datosConsumo.mes]: datosConsumo.consumo 
      };
      const totalConsumido = Object.values(nuevoConsumoMes).reduce((sum, val) => sum + val, 0);

      await updateDoc(institucionRef, {
        consumoPorMes: nuevoConsumoMes,
        'contrato.consumidas': totalConsumido
      });

      // ✨ REGISTRAR AUDITORÍA
      await logAuditoria(id, 'Registro de Consumo', `Registrado: ${datosConsumo.consumo} consultas para el mes ${datosConsumo.mes}`);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const editarConsumoMensual = async (id, datosConsumo) => {
    try {
      const institucionRef = doc(db, 'instituciones', id);
      const institucionActual = instituciones.find(inst => inst.id === id);
      
      const nuevoConsumoMes = { ...institucionActual.consumoPorMes, [datosConsumo.mes]: datosConsumo.consumo };
      const totalConsumido = Object.values(nuevoConsumoMes).reduce((sum, val) => sum + val, 0);

      await updateDoc(institucionRef, {
        consumoPorMes: nuevoConsumoMes,
        'contrato.consumidas': totalConsumido
      });

      // ✨ REGISTRAR AUDITORÍA
      await logAuditoria(id, 'Edición de Consumo', `Modificado a: ${datosConsumo.consumo} consultas para el mes ${datosConsumo.mes}`);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const eliminarConsumoMensual = async (id, mesAEliminar) => {
    try {
      const institucionDoc = doc(db, 'instituciones', id);
      const institucionSnapshot = await getDoc(institucionDoc);
      
      const datosActuales = institucionSnapshot.data();
      const consumoPorMes = { ...datosActuales.consumoPorMes };
      delete consumoPorMes[mesAEliminar];
      
      const nuevoConsumoTotal = Object.values(consumoPorMes).reduce((sum, consumo) => sum + consumo, 0);
      
      await updateDoc(institucionDoc, {
        consumoPorMes: consumoPorMes,
        'contrato.consumidas': nuevoConsumoTotal
      });
      
      // ✨ REGISTRAR AUDITORÍA
      await logAuditoria(id, 'Eliminación de Consumo', `Se eliminó el registro del mes ${mesAEliminar}`);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return { instituciones, loading, error, agregarInstitucion, editarInstitucion, eliminarInstitucion, registrarConsumoMensual, editarConsumoMensual, eliminarConsumoMensual };
};

// Hook Estadísticas intacto
export const useEstadisticas = () => {
  const [estadisticas, setEstadisticas] = useState({
    totalInstituciones: 0, totalConsultasAsignadas: 0, totalConsultasConsumidas: 0, promedioUso: 0, institucionesActivas: 0
  });
  const { instituciones } = useInstituciones();

  useEffect(() => {
    if (instituciones.length > 0) {
      const totalAsignadas = instituciones.reduce((sum, inst) => sum + (inst.contrato?.asignadas || 0), 0);
      const totalConsumidas = instituciones.reduce((sum, inst) => sum + (inst.contrato?.consumidas || 0), 0);
      const promedio = totalAsignadas > 0 ? (totalConsumidas / totalAsignadas) * 100 : 0;
      const activas = instituciones.filter(inst => inst.activa !== false).length;

      setEstadisticas({ totalInstituciones: instituciones.length, totalConsultasAsignadas: totalAsignadas, totalConsultasConsumidas: totalConsumidas, promedioUso: promedio.toFixed(1), institucionesActivas: activas });
    } else {
      setEstadisticas({ totalInstituciones: 0, totalConsultasAsignadas: 0, totalConsultasConsumidas: 0, promedioUso: 0, institucionesActivas: 0 });
    }
  }, [instituciones]);

  return estadisticas;
};

// Hook Usuarios actualizado
export const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'usuarios'), orderBy('fechaCreacion', 'desc'));
    const unsubscribe = onSnapshot(q,
      (querySnapshot) => {
        const usuariosData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          usuariosData.push({
            id: doc.id,
            uid: data.uid || doc.id,
            ...data,
            fechaCreacion: data.fechaCreacion?.toDate?.()?.toLocaleDateString('es-ES') || 'N/A',
            ultimoAcceso: data.ultimoAcceso ? new Date(data.ultimoAcceso).toLocaleString('es-ES') : 'Nunca'
          });
        });
        setUsuarios(usuariosData);
        setLoading(false);
      },
      (error) => { setError(error.message); setLoading(false); }
    );
    return () => unsubscribe();
  }, []);

  const agregarUsuario = async (nuevoUsuario) => {
    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, nuevoUsuario.email, nuevoUsuario.password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: nuevoUsuario.nombre });
      
      const usuarioData = {
        uid: user.uid,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol, // admin, contabilidad, usuario
        area: nuevoUsuario.area || '', // Guardamos el Área del Usuario
        permisos: nuevoUsuario.permisos || null, // ✨ GUARDAMOS LOS PERMISOS AQUI
        fechaCreacion: serverTimestamp(),
        activo: true,
        ultimoAcceso: null,
        creadoPor: auth.currentUser?.uid || 'sistema'
      };
      
      await setDoc(doc(db, 'usuarios', user.uid), usuarioData);
      
      // ✨ REGISTRAR AUDITORÍA GLOBAL
      await logAuditoria(null, 'Creación de Usuario', `Se creó usuario: ${nuevoUsuario.email}`);
      
      return { success: true, uid: user.uid };
    } catch (error) {
      let errorMessage = 'Error al crear usuario';
      if (error.code === 'auth/email-already-in-use') errorMessage = 'El email ya está registrado';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const eliminarUsuario = async (uid, nombre) => {
    try {
      if (uid === auth.currentUser?.uid) return { success: false, error: 'No puedes eliminar tu propia cuenta' };
      await deleteDoc(doc(db, 'usuarios', uid));
      // ✨ REGISTRAR AUDITORÍA GLOBAL
      await logAuditoria(null, 'Eliminación de Usuario', `Se eliminó al usuario: ${nombre}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const toggleUsuarioActivo = async (uid) => {
    try {
      if (uid === auth.currentUser?.uid) return { success: false, error: 'No puedes desactivar tu cuenta' };
      const usuario = usuarios.find(u => u.uid === uid);
      
      await updateDoc(doc(db, 'usuarios', uid), {
        activo: !usuario.activo,
        modificadoPor: auth.currentUser?.uid,
        fechaModificacion: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const editarUsuario = async (uid, datosActualizados) => {
    try {
      setLoading(true);
      
      const usuarioRef = doc(db, 'usuarios', uid);
      await updateDoc(usuarioRef, {
        nombre: datosActualizados.nombre,
        rol: datosActualizados.rol,
        area: datosActualizados.area || '', // Actualizamos el Área del Usuario al Editar
        permisos: datosActualizados.permisos,
        fechaModificacion: serverTimestamp(),
        modificadoPor: auth.currentUser?.uid
      });

      // Registrar en Auditoría
      await logAuditoria(null, 'Edición de Usuario', `Se editaron los permisos/rol de: ${datosActualizados.email}`);
      
      return { success: true };
    } catch (error) {
      console.error("❌ Error al editar usuario:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return { usuarios, loading, error, agregarUsuario, eliminarUsuario, toggleUsuarioActivo, editarUsuario };
};

// Hook Comentarios actualizado con Auditoría
export const useComentarios = (institucionId) => {
  const [comentarios, setComentarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!institucionId) return;
    const q = query(collection(db, 'comentarios'), where('institucionId', '==', institucionId), orderBy('fechaCreacion', 'desc'));
    const unsubscribe = onSnapshot(q,
      (querySnapshot) => {
        const comentariosData = [];
        querySnapshot.forEach((doc) => { comentariosData.push({ id: doc.id, ...doc.data() }); });
        
        // ✨ ORDENAR: Fijados primero
        comentariosData.sort((a, b) => {
           if (a.fijado && !b.fijado) return -1;
           if (!a.fijado && b.fijado) return 1;
           return 0;
        });

        setComentarios(comentariosData);
        setLoading(false);
      },
      (error) => { setError(error.message); setLoading(false); }
    );
    return () => unsubscribe();
  }, [institucionId]);

  const agregarComentario = async (nuevoComentario) => {
    try {
      let area = 'Sin Dato área';
      let nombre = auth.currentUser.displayName || auth.currentUser.email;
      if (auth.currentUser?.uid) {
        const userDocRef = doc(db, 'usuarios', auth.currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          if (userSnap.data().area) area = userSnap.data().area;
          if (userSnap.data().nombre) nombre = userSnap.data().nombre;
        }
      }

      const docRef = await addDoc(collection(db, 'comentarios'), {
        texto: nuevoComentario.texto,
        institucionId: nuevoComentario.institucionId,
        etiqueta: area, // Guardamos el Area en vez de la etiqueta estatica antigua para compatibilidad retroactiva o en un nuevo campo
        autorArea: area, 
        fijado: false,
        autorNombre: nombre,
        autorEmail: auth.currentUser.email,
        autorUid: auth.currentUser.uid,
        fechaCreacion: serverTimestamp(),
        activo: true
      });

      // ✨ REGISTRAR AUDITORÍA
      await logAuditoria(nuevoComentario.institucionId, 'Nuevo Comentario', `Comentario agregado por ${auth.currentUser.email}`);

      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const editarComentario = async (comentarioId, nuevoTexto) => {
    try {
      const comentarioRef = doc(db, 'comentarios', comentarioId);
      await updateDoc(comentarioRef, {
        texto: nuevoTexto,
        fechaModificacion: serverTimestamp(),
        modificadoPor: auth.currentUser.uid
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const eliminarComentario = async (comentarioId) => {
    try {
      await deleteDoc(doc(db, 'comentarios', comentarioId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const toggleFijarComentario = async (comentarioId, estadoActual) => {
    try {
      const comentarioRef = doc(db, 'comentarios', comentarioId);
      await updateDoc(comentarioRef, {
        fijado: !estadoActual
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return { comentarios, loading, error, agregarComentario, editarComentario, eliminarComentario, toggleFijarComentario };
};

export const useContadorComentarios = (institucionId) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!institucionId) return;
    const q = query(collection(db, 'comentarios'), where('institucionId', '==', institucionId), where('activo', '==', true));
    const unsubscribe = onSnapshot(q, (querySnapshot) => { setCount(querySnapshot.size); });
    return () => unsubscribe();
  }, [institucionId]);
  return count;
};