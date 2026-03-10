import AsyncStorage from "@react-native-async-storage/async-storage";

export type StoredPdf = {
  id: string;
  name: string;
  uri: string;
  createdAt: string;
  pages: number;
};

const KEY = "stored_pdfs_v1";

export async function getAllPdfs(): Promise<StoredPdf[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredPdf[]) : [];
  } catch {
    return [];
  }
}

export async function addPdf(entry: StoredPdf): Promise<void> {
  const all = await getAllPdfs();
  await AsyncStorage.setItem(KEY, JSON.stringify([entry, ...all]));
}

export async function removePdf(id: string): Promise<void> {
  const all = await getAllPdfs();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter((x) => x.id !== id)));
}
