// Cierra el modal al navegar (vía Link) a cualquier otra ruta que no lo use:
// los slots paralelos mantienen su último estado en navegaciones de cliente,
// así que necesitamos que el slot resuelva a null en el resto de rutas.
export default function ModalCatchAll() {
  return null;
}
