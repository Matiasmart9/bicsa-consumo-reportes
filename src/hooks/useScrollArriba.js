// src/hooks/useScrollArriba.js
// Sube la pantalla al inicio cada vez que cambia la página de un listado paginado.
import { useEffect, useRef } from 'react';

export const useScrollArriba = (pagina) => {
  const anterior = useRef(pagina);

  useEffect(() => {
    if (anterior.current !== pagina) {
      anterior.current = pagina;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pagina]);
};
