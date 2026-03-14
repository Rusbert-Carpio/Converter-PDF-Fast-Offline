export async function ensureMediaPermission() {
  return true;
}

export async function saveImageToAmedaAlbum() {
  throw new Error('La exportación directa a la galería fue retirada para evitar permisos amplios de medios en Google Play. Usa guardado en carpeta o compartir.');
}
