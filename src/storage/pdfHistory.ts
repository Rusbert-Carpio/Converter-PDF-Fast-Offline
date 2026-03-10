import AsyncStorage from "@react-native-async-storage/async-storage";
import { sanitizePdfName } from "../utils/files";

export type PdfHistoryItem = {
  id: string;
  name: string;
  uri: string;
  createdAt: number;
};

const KEY = "ameda_pdf_history_v1";

export async function getPdfHistory(): Promise<PdfHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PdfHistoryItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  } catch {
    return [];
  }
}

export async function setPdfHistory(items: PdfHistoryItem[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export async function addPdfToHistory(input: { uri: string; name: string }): Promise<PdfHistoryItem> {
  const items = await getPdfHistory();
  const name = sanitizePdfName(input.name);
  const now = Date.now();

  const existing = items.find((x) => x.uri === input.uri);
  if (existing) {
    existing.name = name;
    existing.createdAt = now;
    await setPdfHistory(items);
    return existing;
  }

  const item: PdfHistoryItem = {
    id: `${now}-${Math.random().toString(16).slice(2)}`,
    name,
    uri: input.uri,
    createdAt: now,
  };

  await setPdfHistory([item, ...items].slice(0, 200));
  return item;
}

export async function removePdfFromHistory(id: string): Promise<void> {
  const items = await getPdfHistory();
  await setPdfHistory(items.filter((x) => x.id !== id));
}

export async function searchPdfHistory(query: string): Promise<PdfHistoryItem[]> {
  const q = (query || "").trim().toLowerCase();
  const items = await getPdfHistory();
  if (!q) return items;
  return items.filter((x) => (x.name || "").toLowerCase().includes(q));
}
