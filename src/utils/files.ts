import * as FileSystem from "expo-file-system/legacy";

/** Reemplaza caracteres inválidos y asegura extensión .pdf */
export function sanitizePdfName(name: string): string {
  const trimmed = (name || "").trim() || "Documento";
  const safe = trimmed.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ");
  return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe}.pdf`;
}

/**
 * Crea una copia en cache con nombre humano.
 * Android a veces comparte con un "ID" si el nombre del archivo no está en la ruta.
 */
export async function makeShareableCopy(params: { uri: string; fileName: string }): Promise<string> {
  const src = params.uri;
  const name = sanitizePdfName(params.fileName);
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) return src;

  const dest = `${cacheDir}${Date.now()}-${name}`;
  try {
    // Si src es content://, primero lo normalizamos a file://
    const local = await ensureLocalFile({ uri: src, fileName: name });
    await FileSystem.copyAsync({ from: local, to: dest });
    return dest;
  } catch {
    return src;
  }
}

/**
 * Asegura un file:// local estable (Android suele dar content://).
 * - Si ya es file://, devuelve el mismo URI.
 * - Si es content:// u otro, copia a cacheDirectory con un nombre humano.
 */
export async function ensureLocalFile(params: { uri: string; fileName: string }): Promise<string> {
  const { uri } = params;
  if (!uri) throw new Error("ensureLocalFile: uri is required");
  if (uri.startsWith("file://")) return uri;

  const fileName = sanitizePdfName(params.fileName);
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    // fallback raro: intentamos devolver el uri original
    return uri;
  }

  const dest = `${cacheDir}${Date.now()}-${fileName}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}
