// src/utils/confirmar.js
// Utilidad para reemplazar window.confirm() con toasts de sileo
import { sileo } from '../components/sileo';

/**
 * Muestra un toast de confirmación con botón "Confirmar".
 * El usuario puede confirmar haciendo clic en el botón,
 * o cancelar cerrando el toast (X).
 *
 * @param {string} titulo       - Título del toast
 * @param {string} descripcion  - Descripción / pregunta de confirmación
 * @param {Function} onConfirmar - Callback ejecutado al confirmar
 */
export const confirmar = (titulo, descripcion, onConfirmar) => {
  const id = sileo.warning({
    title: titulo,
    description: descripcion,
    duration: null, // No se cierra automáticamente
    button: {
      title: '✓ Confirmar',
      onClick: () => {
        sileo.dismiss(id);
        onConfirmar();
      }
    }
  });
  return id;
};