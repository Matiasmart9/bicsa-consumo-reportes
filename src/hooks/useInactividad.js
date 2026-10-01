// src/hooks/useInactividad.js
// Cierra la sesión tras un tiempo sin actividad y avisa antes de hacerlo.
import { useCallback, useEffect, useRef, useState } from 'react';

export const LIMITE_INACTIVIDAD_MS = 15 * 60 * 1000; // 15 minutos
export const AVISO_INACTIVIDAD_MS = 60 * 1000;       // aviso 1 minuto antes

export const CLAVE_ULTIMA_ACTIVIDAD = 'mipyme_ultima_actividad';
export const CLAVE_SESION_EXPIRADA = 'mipyme_sesion_expirada';

const EVENTOS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel', 'click'];

const leerUltimaGuardada = () => {
  try { return parseInt(localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD), 10) || 0; } catch { return 0; }
};

// ¿La última actividad guardada (de una sesión anterior) ya superó el límite?
export const sesionCaducada = () => {
  const ultima = leerUltimaGuardada();
  return ultima > 0 && Date.now() - ultima > LIMITE_INACTIVIDAD_MS;
};

/**
 * activo: true mientras haya una sesión iniciada.
 * onTimeout: se llama una vez al cumplirse el límite sin actividad.
 * Devuelve { segundosRestantes, continuar }: segundosRestantes es null salvo durante el aviso.
 */
export const useInactividad = ({ activo, onTimeout }) => {
  const [segundosRestantes, setSegundosRestantes] = useState(null);
  const ultima = useRef(Date.now());
  const guardada = useRef(0);
  const enAviso = useRef(false);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => { onTimeoutRef.current = onTimeout; });

  const registrar = useCallback(() => {
    const ahora = Date.now();
    ultima.current = ahora;
    // Se comparte entre pestañas; se escribe como máximo cada 5 s
    if (ahora - guardada.current > 5000) {
      guardada.current = ahora;
      try { localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, String(ahora)); } catch { /* sin almacenamiento */ }
    }
  }, []);

  const continuar = useCallback(() => {
    enAviso.current = false;
    guardada.current = 0;
    registrar();
    setSegundosRestantes(null);
  }, [registrar]);

  useEffect(() => {
    if (!activo) {
      enAviso.current = false;
      setSegundosRestantes(null);
      return undefined;
    }

    guardada.current = 0;
    registrar();

    // Durante el aviso solo cuenta el botón "Seguir conectado"
    const alActividad = () => { if (!enAviso.current) registrar(); };
    EVENTOS.forEach(e => window.addEventListener(e, alActividad, { passive: true }));

    const revisar = setInterval(() => {
      const ultimaActividad = Math.max(ultima.current, leerUltimaGuardada());
      const inactivo = Date.now() - ultimaActividad;

      if (inactivo >= LIMITE_INACTIVIDAD_MS) {
        clearInterval(revisar);
        enAviso.current = false;
        setSegundosRestantes(null);
        onTimeoutRef.current?.();
      } else if (inactivo >= LIMITE_INACTIVIDAD_MS - AVISO_INACTIVIDAD_MS) {
        enAviso.current = true;
        setSegundosRestantes(Math.ceil((LIMITE_INACTIVIDAD_MS - inactivo) / 1000));
      } else if (enAviso.current) {
        // otra pestaña registró actividad
        enAviso.current = false;
        setSegundosRestantes(null);
      }
    }, 1000);

    return () => {
      clearInterval(revisar);
      EVENTOS.forEach(e => window.removeEventListener(e, alActividad));
    };
  }, [activo, registrar]);

  return { segundosRestantes, continuar };
};
