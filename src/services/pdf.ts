import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";

/**
 * Convierte un URI (file:// o content://) a base64.
 * - Primero intenta FileSystem.readAsStringAsync (rápido para file://).
 * - Si falla (ej. algunos content:// en Android), usa fetch + FileReader.
 */
async function uriToBase64(uri: string): Promise<string> {
  try {
    return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  } catch {
    const res = await fetch(uri);
    if (!res.ok) throw new Error("No se pudo leer la imagen para convertirla a PDF.");
    const blob = await res.blob();

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () =>
        reject(new Error("No se pudo leer la imagen (FileReader)."));
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result !== "string")
          return reject(new Error("Formato de lectura inválido."));
        const commaIdx = result.indexOf(",");
        if (commaIdx < 0) return reject(new Error("Base64 inválido."));
        resolve(result.slice(commaIdx + 1));
      };
      reader.readAsDataURL(blob);
    });

    return base64;
  }
}

function safeBaseName(name: string) {
  return name.trim().replace(/[^\w-]+/g, "_").slice(0, 40) || "img2pdf";
}

export async function createPdfFromImages(
  imageUris: string[],
  opts?: { fileName?: string }
): Promise<{ uri: string; pages: number }> {
  if (!imageUris.length) {
    throw new Error("No hay imágenes para convertir.");
  }

  const imgs: string[] = [];

  for (const uri of imageUris) {
    const base64 = await uriToBase64(uri);
    imgs.push(`data:image/jpeg;base64,${base64}`);
  }

  const html = `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { margin: 0; }
        body { margin: 0; padding: 0; background: #000; }
        .page {
          width: 100%;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          page-break-after: always;
        }
        img {
          width: 100%;
          height: 100vh;
          object-fit: contain;
        }
      </style>
    </head>
    <body>
      ${imgs.map((src) => `<div class="page"><img src="${src}" /></div>`).join("")}
    </body>
  </html>`.trim();

  // Expo genera el PDF aquí
  const { uri: tempUri } = await Print.printToFileAsync({ html });

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = safeBaseName(opts?.fileName || "img2pdf");
  const fileName = `${baseName}-${ts}.pdf`;

  /**
   * Intentamos mover a un directorio persistente si existe.
   * En Expo Go algunos entornos devuelven null en documentDirectory.
   */
  type FSLike = typeof FileSystem & {
    documentDirectory?: string | null;
    cacheDirectory?: string | null;
  };

  const fs = FileSystem as FSLike;
  const dir = fs.documentDirectory ?? fs.cacheDirectory;

  if (dir) {
    const outUri = `${dir}${fileName}`;
    try {
      await FileSystem.moveAsync({ from: tempUri, to: outUri });
      return { uri: outUri, pages: imageUris.length };
    } catch {
      // Si mover falla, usamos el tempUri igualmente
      return { uri: tempUri, pages: imageUris.length };
    }
  }

  // Si no existe directorio (caso Expo Go raro), usamos el archivo generado
  return { uri: tempUri, pages: imageUris.length };
}