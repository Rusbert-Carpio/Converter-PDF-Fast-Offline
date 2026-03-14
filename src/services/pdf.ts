import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { PDFDocument } from "pdf-lib";

type CreatePdfOptions = {
  fileName?: string;
  maxDimension?: number;
  jpegQuality?: number;
};

function safeBaseName(name: string) {
  return name.trim().replace(/[^\w-]+/g, "_").slice(0, 40) || "img2pdf";
}

function sanitizePdfName(name: string) {
  const safe = safeBaseName(name || "img2pdf");
  return safe.toLowerCase().endsWith('.pdf') ? safe : `${safe}.pdf`;
}

async function ensureDir(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
  }
}

async function optimizeImageForPdf(uri: string, maxDimension: number, jpegQuality: number): Promise<string> {
  const actions: ImageManipulator.Action[] = [];
  try {
    const meta = await ImageManipulator.manipulateAsync(uri, [], { base64: false });
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    const largestSide = Math.max(width, height);

    if (largestSide > maxDimension && largestSide > 0) {
      if (width >= height) {
        actions.push({ resize: { width: maxDimension } });
      } else {
        actions.push({ resize: { height: maxDimension } });
      }
    }
  } catch {
    // Si no podemos leer dimensiones, al menos reconvertimos a JPEG comprimido.
  }

  const output = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: jpegQuality,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: false,
  });

  return output.uri;
}

async function readFileAsDataUri(uri: string, mime: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:${mime};base64,${base64}`;
}

export async function getPdfPageCount(uri: string): Promise<number> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const pdf = await PDFDocument.load(`data:application/pdf;base64,${base64}`);
  return pdf.getPageCount();
}

export async function createPdfFromImages(
  imageUris: string[],
  opts?: CreatePdfOptions
): Promise<{ uri: string; pages: number }> {
  if (!imageUris.length) {
    throw new Error("No hay imágenes para convertir.");
  }

  const maxDimension = Math.max(1200, Math.min(opts?.maxDimension ?? 1800, 2600));
  const jpegQuality = Math.max(0.65, Math.min(opts?.jpegQuality ?? 0.82, 0.95));

  const pdf = await PDFDocument.create();

  for (const uri of imageUris) {
    const optimizedUri = await optimizeImageForPdf(uri, maxDimension, jpegQuality);
    const dataUri = await readFileAsDataUri(optimizedUri, 'image/jpeg');
    const embedded = await pdf.embedJpg(dataUri);
    const page = pdf.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: embedded.width,
      height: embedded.height,
    });
  }

  const pdfBase64 = await pdf.saveAsBase64({ dataUri: false });
  const dir = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}pdfs/`;
  await ensureDir(dir);

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = sanitizePdfName(opts?.fileName || `img2pdf-${ts}`);
  const outUri = `${dir}${ts}-${fileName}`;

  await FileSystem.writeAsStringAsync(outUri, pdfBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return { uri: outUri, pages: imageUris.length };
}
