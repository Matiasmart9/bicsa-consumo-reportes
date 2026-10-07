// src/hooks/useNotificaciones.js
// Notificaciones calculadas a partir de los datos (contratos y consumo).
// El estado "leída" es propio de cada usuario: se guarda en su propio perfil (usuarios/{uid}.notificacionesLeidas).
// Solo se conservan las lecturas de avisos que siguen vigentes, así que nunca crece sin control.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useInstituciones } from './useFirebase';
import { obtenerContratosPorVencer } from '../utils/contratos';
import { puedeVerMonitoreo } from '../utils/permisos';
import { debeMonitorearVencimiento } from '../utils/plan';

export const UMBRAL_CONSUMO_ALTO = 75;
export const UMBRAL_CONSUMO_CRITICO = 90;

// Las claves se guardan como campos de un mapa de Firestore: solo letras, números, guion y guion bajo
const limpiarClave = (texto) => String(texto).replace(/[^A-Za-z0-9_-]/g, '_');

const ORDEN_SEVERIDAD = { vencido: 0, critico: 1, consumo_critico: 2, advertencia: 3, consumo_alto: 4 };

export const useNotificaciones = ({ rol, permisos }) => {
  const { instituciones } = useInstituciones();
  const [uid, setUid] = useState(null);
  const [leidas, setLeidas] = useState({});
  const [cargadoLecturas, setCargadoLecturas] = useState(false);

  // Lecturas del usuario actual
  useEffect(() => {
    let cancelarDoc = null;
    const cancelarAuth = onAuthStateChanged(auth, (user) => {
      if (cancelarDoc) { cancelarDoc(); cancelarDoc = null; }
      setUid(user ? user.uid : null);
      setLeidas({});
      setCargadoLecturas(false);
      if (!user) return;
      cancelarDoc = onSnapshot(
        doc(db, 'usuarios', user.uid),
        (snap) => { setLeidas(snap.exists() ? (snap.data().notificacionesLeidas || {}) : {}); setCargadoLecturas(true); },
        () => setCargadoLecturas(true)
      );
    });
    return () => { cancelarAuth(); if (cancelarDoc) cancelarDoc(); };
  }, []);

  // Todas las notificaciones vigentes (leídas o no)
  const notificaciones = useMemo(() => {
    const lista = [];

    if (puedeVerMonitoreo(rol, permisos)) {
      obtenerContratosPorVencer(instituciones)
        .filter(c => c.tipo === 'vencido' || c.tipo === 'critico')
        .forEach(c => {
          lista.push({
            clave: limpiarClave(`c_${c.id}_${c.fecha}_${c.tipo}`),
            tipo: c.tipo,
            titulo: c.tipo === 'vencido' ? 'Contrato vencido' : 'Contrato por vencer',
            institucion: c.nombre,
            detalle: c.tipo === 'vencido'
              ? `Venció el ${c.fecha} (${Math.abs(c.dias)} ${Math.abs(c.dias) === 1 ? 'día' : 'días'})`
              : `Vence el ${c.fecha}`,
            ruta: '/monitoreo-contratos'
          });
        });
    }

    instituciones.forEach(inst => {
      if (!(inst.estado === 'activo' || !inst.estado)) return;
      // Las Premium marcadas "sin seguimiento" no generan ningún aviso
      if (!debeMonitorearVencimiento(inst)) return;
      const asignadas = inst.contrato?.asignadas || 0;
      const consumidas = inst.contrato?.consumidas || 0;
      if (asignadas <= 0) return;
      const pct = (consumidas / asignadas) * 100;
      if (pct < UMBRAL_CONSUMO_ALTO) return;
      const critico = pct >= UMBRAL_CONSUMO_CRITICO;
      lista.push({
        // Incluye el inicio del contrato: al renovar, el aviso vuelve a aparecer
        clave: limpiarClave(`u_${inst.id}_${inst.contrato?.fechaInicio}_${critico ? 'critico' : 'alto'}`),
        tipo: critico ? 'consumo_critico' : 'consumo_alto',
        titulo: critico ? 'Consumo crítico' : 'Consumo alto',
        institucion: inst.nombre,
        detalle: `Usó el ${pct.toFixed(0)}% de sus consultas (${consumidas.toLocaleString()} de ${asignadas.toLocaleString()})`,
        ruta: '/instituciones'
      });
    });

    return lista.sort((a, b) => (ORDEN_SEVERIDAD[a.tipo] - ORDEN_SEVERIDAD[b.tipo]) || a.institucion.localeCompare(b.institucion));
  }, [instituciones, rol, permisos]);

  const sinLeer = useMemo(() => notificaciones.filter(n => !leidas[n.clave]), [notificaciones, leidas]);

  // Guarda las lecturas; se descartan las claves que ya no corresponden a ninguna notificación vigente
  const guardar = useCallback(async (claves) => {
    if (!uid) return;
    const vigentes = new Set(notificaciones.map(n => n.clave));
    const siguiente = {};
    Object.keys(leidas).forEach(k => { if (vigentes.has(k)) siguiente[k] = leidas[k]; });
    claves.forEach(k => { siguiente[k] = Date.now(); });
    setLeidas(siguiente); // se refleja de inmediato
    try {
      await updateDoc(doc(db, 'usuarios', uid), { notificacionesLeidas: siguiente });
    } catch (e) {
      console.error('No se pudo guardar la lectura de notificaciones:', e);
    }
  }, [uid, leidas, notificaciones]);

  const marcarLeida = useCallback((clave) => guardar([clave]), [guardar]);
  const marcarTodasLeidas = useCallback(() => guardar(sinLeer.map(n => n.clave)), [guardar, sinLeer]);

  return { notificaciones, sinLeer, leidas, cargadoLecturas, marcarLeida, marcarTodasLeidas };
};
