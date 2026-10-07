// src/hooks/usePermisosUsuario.js
// Rol y permisos del usuario con sesión iniciada, en tiempo real.
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

export const usePermisosUsuario = () => {
  const [estado, setEstado] = useState({ cargando: true, rol: null, permisos: null, uid: null });

  useEffect(() => {
    let cancelarDoc = null;
    const cancelarAuth = onAuthStateChanged(auth, (user) => {
      if (cancelarDoc) { cancelarDoc(); cancelarDoc = null; }
      if (!user) {
        setEstado({ cargando: false, rol: null, permisos: null, uid: null });
        return;
      }
      cancelarDoc = onSnapshot(
        doc(db, 'usuarios', user.uid),
        (snap) => {
          const data = snap.exists() ? snap.data() : {};
          setEstado({ cargando: false, rol: data.rol || null, permisos: data.permisos || null, uid: user.uid });
        },
        () => setEstado({ cargando: false, rol: null, permisos: null, uid: user.uid })
      );
    });
    return () => {
      cancelarAuth();
      if (cancelarDoc) cancelarDoc();
    };
  }, []);

  return estado;
};
