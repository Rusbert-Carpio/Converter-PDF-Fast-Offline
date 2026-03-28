import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PDFDocument } from "pdf-lib";
import PdfPageImage from "react-native-pdf-page-image";

import { ensureLocalFile } from "../utils/files";
import { useApp } from "../context/AppContext";
import AdBannerSpacer from "../components/ads/AdBannerSpacer";
import { safeBack } from "../utils/nav";
import { showRewarded } from "../services/ads";
import PdfHistoryPickerModal from "../components/PdfHistoryPickerModal";
import { useAppTheme } from "../hooks/useAppTheme";
import {
  canConvertPdfToImages,
  canUseRewarded,
  consumeRewarded,
  recordPdfToImagesConversion,
  shouldShowPdfToImagesPaywall,
  Limits,
} from "../services/monetization";

type PickedPdf = { uri: string; name: string };
type GeneratedImage = { uri: string; width: number; height: number };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getPdfPageCount(uri: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

function sanitizeBaseName(baseName: string) {
  return (
    (baseName || "ameda-export")
      .replace(/\.[^.]+$/i, "")
      .replace(/[\\/:*?"<>|]+/g, "_")
      .replace(/\s+/g, " ")
      .trim() || "ameda-export"
  );
}

function inferImageMeta(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return { extension: "jpg", mimeType: "image/jpeg" };
  }
  if (lower.endsWith(".webp")) {
    return { extension: "webp", mimeType: "image/webp" };
  }
  return { extension: "png", mimeType: "image/png" };
}

async function ensureDir(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
  }
}

async function copyImagesToAndroidFolder(imageUris: string[], baseName: string) {
  const saf: any = (FileSystem as any).StorageAccessFramework;
  if (!saf) {
    throw new Error(
      "Storage Access Framework no disponible. Necesitas un Development Build para elegir carpeta."
    );
  }

  const permission = await saf.requestDirectoryPermissionsAsync();
  if (!permission.granted) return false;

  const cleanBase = sanitizeBaseName(baseName);

  for (let i = 0; i < imageUris.length; i += 1) {
    const source = imageUris[i];
    const { extension, mimeType } = inferImageMeta(source);
    const fileName = `${cleanBase}-p${i + 1}.${extension}`;
    const destinationUri = await saf.createFileAsync(permission.directoryUri, fileName, mimeType);
    const base64 = await FileSystem.readAsStringAsync(source, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await FileSystem.writeAsStringAsync(destinationUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  return true;
}

async function persistGeneratedImages(params: { imageUris: string[]; baseName: string }) {
  const exportRoot = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}exports/`;
  await ensureDir(exportRoot);

  const cleanBase = sanitizeBaseName(params.baseName);
  const stamp = Date.now();
  const storedUris: string[] = [];

  for (let index = 0; index < params.imageUris.length; index += 1) {
    const source = params.imageUris[index];
    const { extension } = inferImageMeta(source);
    const destination = `${exportRoot}${cleanBase}-${stamp}-p${index + 1}.${extension}`;
    await FileSystem.copyAsync({ from: source, to: destination });
    storedUris.push(destination);
  }

  return storedUris;
}

async function openPdfNative(uri: string, fallbackPageCount?: number) {
  try {
    const info = await PdfPageImage.open(uri);
    if (info?.pageCount) return info;
  } catch {
    // seguimos con fallback abajo
  }

  if (fallbackPageCount && fallbackPageCount > 0) {
    return { uri, pageCount: fallbackPageCount };
  }

  throw new Error("No se pudo preparar el PDF para convertirlo.");
}

export default function PdfToImageScreenNative() {
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isPremium, t } = useApp();

  const [source, setSource] = useState<PickedPdf | null>(null);
  const [pages, setPages] = useState(0);
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [rangeFrom, setRangeFrom] = useState("1");
  const [rangeTo, setRangeTo] = useState("1");
  const [progressText, setProgressText] = useState("");
  const [nativeReady, setNativeReady] = useState(false);
  const [nativeError, setNativeError] = useState<string | null>(null);

  const title = source?.name ?? t("pdfToImages", "title");

  useEffect(() => {
    if (!pages) return;
    setRangeFrom("1");
    setRangeTo(String(isPremium ? pages : Math.min(pages, Limits.pdfToImageMaxPagesPerConversionFree)));
  }, [pages, isPremium]);

  const pageList = useMemo(() => {
    if (!pages) return [] as number[];

    const from = clamp(Number(rangeFrom || 1), 1, pages);
    const to = clamp(Number(rangeTo || from), 1, pages);
    const start = Math.min(from, to);
    const end = Math.max(from, to);

    let picked = Array.from({ length: end - start + 1 }, (_, i) => start + i);

    if (!isPremium && picked.length > Limits.pdfToImageMaxPagesPerConversionFree) {
      picked = picked.slice(0, Limits.pdfToImageMaxPagesPerConversionFree);
    }

    return picked;
  }, [pages, rangeFrom, rangeTo, isPremium]);

  const setPdf = async (pdf: PickedPdf) => {
    setBusy(true);
    setProgressText(t("common", "loading") + "…");

    try {
      const localUri = await ensureLocalFile({ uri: pdf.uri, fileName: pdf.name });
      const count = await getPdfPageCount(localUri);
      await openPdfNative(localUri, count);

      setSource({ uri: localUri, name: pdf.name });
      setPages(count);
      setImages([]);
      setProgressText("");
      setNativeReady(true);
      setNativeError(null);
      setRangeFrom("1");
      setRangeTo(String(isPremium ? count : Math.min(count, Limits.pdfToImageMaxPagesPerConversionFree)));
    } catch (e: any) {
      setSource(null);
      setPages(0);
      setImages([]);
      setNativeReady(false);
      setNativeError(e?.message ?? t("pdfToImages", "convertError"));
      setProgressText("");
      Alert.alert(t("common", "error"), e?.message ?? t("pdfToImages", "convertError"));
    } finally {
      setBusy(false);
    }
  };

  const pickPdfFromFiles = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });

    if (res.canceled) return;
    const f = res.assets?.[0];
    if (!f?.uri) return;

    await setPdf({ uri: f.uri, name: f.name || `${t("common", "file")}.pdf` });
  };

  const onConvert = async () => {
    if (!source?.uri || !pages) return;

    const from = Number(rangeFrom);
    const to = Number(rangeTo);

    if (
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from < 1 ||
      to < 1 ||
      from > pages ||
      to > pages ||
      from > to
    ) {
      Alert.alert("Rango inválido");
      return;
    }

    if (!pageList.length) {
      Alert.alert("Rango inválido");
      return;
    }

    let usedRewarded = false;
    if (!isPremium) {
      const { freeOk, requiresRewarded } = await canConvertPdfToImages(isPremium);
      if (!freeOk && requiresRewarded) {
        const rewardQuotaAvailable = await canUseRewarded(isPremium, 'pdf_to_image_unlock');
        if (!rewardQuotaAvailable) {
          router.push('/plans');
          return;
        }

        const ok = await showRewarded();
        if (!ok) {
          Alert.alert(t("common", "premium"), t("pdfToImages", "rewardedBody"));
          return;
        }

        await consumeRewarded('pdf_to_image_unlock');
        usedRewarded = true;
      }
    }

    setBusy(true);
    setProgressText(`${t("common", "loading")} 0/${pageList.length}`);

    try {
      await openPdfNative(source.uri, pages);

      const generatedForRange: GeneratedImage[] = [];
      const renderScale = Platform.OS === "android" ? 2 : 2.5;

      for (let idx = 0; idx < pageList.length; idx += 1) {
        const page = pageList[idx];
        const internalPageIndex = page - 1;

        setProgressText(`${t("common", "loading")} ${idx + 1}/${pageList.length}`);

        const image = await PdfPageImage.generate(source.uri, internalPageIndex, renderScale);

        if (!image?.uri) {
          throw new Error(`No se pudo generar la imagen de la página ${page}.`);
        }

        generatedForRange.push(image);
        await sleep(60);
      }

      const persistentUris = await persistGeneratedImages({
        imageUris: generatedForRange.map((item) => item.uri),
        baseName: source.name || "ameda-export",
      });

      setImages(persistentUris);
      await recordPdfToImagesConversion(isPremium, usedRewarded);

      if (Platform.OS === "android") {
        const saved = await copyImagesToAndroidFolder(persistentUris, source.name || "ameda-export");
        if (!saved) {
          Alert.alert(t("common", "info"), t("imageToPdf", "saveCancelled"));
        } else {
          Alert.alert(t("imageToPdf", "saveDoneTitle"), t("pdfToImages", "savedToFolderDone"));
        }
      } else {
        Alert.alert(
          t("common", "done"),
          `${t("pdfToImages", "doneBodyPrefix")} ${persistentUris.length} ${t("pdfToImages", "doneBodySuffix")}`
        );
      }

      if (!isPremium && usedRewarded) {
        const showPaywall = await shouldShowPdfToImagesPaywall(isPremium);
        if (showPaywall) router.push("/plans");
      }
    } catch (e: any) {
      Alert.alert(t("common", "error"), e?.message ?? t("pdfToImages", "convertError"));
    } finally {
      try {
        if (source?.uri) {
          await PdfPageImage.close(source.uri);
        }
      } catch {
        // no-op
      }
      setBusy(false);
      setProgressText("");
    }
  };

  const canConvert = !!source?.uri && !!pages && pageList.length > 0 && nativeReady && !busy;

  return (
    <View style={styles.container}>
      <PdfHistoryPickerModal
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onPick={async (item) => {
          await setPdf({ uri: item.uri, name: item.name });
        }}
        title={t("historyPicker", "fromHistoryTitle")}
      />

      <View style={styles.header}>
        <Pressable onPress={() => safeBack("/home")} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t("pdfToImages", "title")}</Text>
        <Text style={styles.subtitle}>{t("pdfToImages", "subtitle")}</Text>

        <View style={styles.rowBtns}>
          <Pressable style={styles.pickBtn} onPress={pickPdfFromFiles} disabled={busy}>
            <MaterialCommunityIcons name="file-pdf-box" size={18} color={colors.primary} />
            <Text style={styles.pickBtnText}>{t("pdfToImages", "choosePdf")}</Text>
          </Pressable>
          <Pressable style={styles.pickBtn} onPress={() => setHistoryOpen(true)} disabled={busy}>
            <MaterialCommunityIcons name="history" size={18} color={colors.primary} />
            <Text style={styles.pickBtnText}>{t("pdfToImages", "fromHistory")}</Text>
          </Pressable>
        </View>

        <Text style={styles.meta}>
          {t("pdfToImages", "fileLabel")}: {source?.name ?? "—"}
        </Text>
        <Text style={styles.meta}>
          {t("pdfToImages", "pagesLabel")}: {pages ? String(pages) : source ? `${t("common", "loading")}…` : "—"}
        </Text>

        {!!pages && (
          <View style={styles.rangeCard}>
            <Text style={styles.rangeTitle}>{t("pdfToImages", "pageRangeTitle")}</Text>
            <Text style={styles.rangeSub}>
              {isPremium
                ? t("pdfToImages", "pickerSubtitlePremium")
                : `${t("pdfToImages", "pickerSubtitleFreePrefix")} ${Limits.pdfToImageMaxPagesPerConversionFree} ${t("pdfToImages", "pickerSubtitleFreeSuffix")}`}
            </Text>

            <View style={styles.rangeRow}>
              <View style={styles.rangeBox}>
                <Text style={styles.rangeLabel}>{t("pdfToImages", "from")}</Text>
                <TextInput
                  value={rangeFrom}
                  onChangeText={setRangeFrom}
                  keyboardType="number-pad"
                  style={styles.rangeInput}
                />
              </View>
              <View style={styles.rangeBox}>
                <Text style={styles.rangeLabel}>{t("pdfToImages", "to")}</Text>
                <TextInput
                  value={rangeTo}
                  onChangeText={setRangeTo}
                  keyboardType="number-pad"
                  style={styles.rangeInput}
                />
              </View>
            </View>

            <Text style={styles.selectedMeta}>
              {t("pdfToImages", "selectedSummaryPrefix")}: {pageList.join(", ") || "—"}
            </Text>
          </View>
        )}

        {!!nativeError && !busy && <Text style={styles.errorText}>{nativeError}</Text>}
        {!!progressText && <Text style={styles.progressText}>{progressText}</Text>}

        <Pressable
          style={[styles.primary, !canConvert && styles.disabled]}
          disabled={!canConvert}
          onPress={onConvert}
        >
          {busy ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <>
              <MaterialCommunityIcons name="image-multiple" size={18} color={colors.textOnPrimary} />
              <Text style={styles.primaryText}>{t("pdfToImages", "convertButton")}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      <AdBannerSpacer />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: 54,
      paddingHorizontal: 16,
      paddingBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.text },
    content: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 20, fontWeight: "900", color: colors.text },
    subtitle: { marginTop: 6, color: colors.textMuted },
    rowBtns: { flexDirection: "row", gap: 10, marginTop: 14 },
    pickBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickBtnText: { fontWeight: "800", color: colors.text },
    meta: { marginTop: 10, color: colors.textMuted, fontWeight: "700" },
    rangeCard: {
      marginTop: 14,
      padding: 14,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rangeTitle: { fontWeight: "900", color: colors.text, fontSize: 16 },
    rangeSub: { marginTop: 4, color: colors.textMuted },
    rangeRow: { flexDirection: "row", gap: 10, marginTop: 12, alignItems: "flex-end" },
    rangeBox: { flex: 1 },
    rangeLabel: { fontWeight: "800", color: colors.textMuted, marginBottom: 6 },
    rangeInput: {
      height: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 12,
      color: colors.text,
      fontWeight: "800",
    },
    selectedMeta: { marginTop: 12, color: colors.text, fontWeight: "700" },
    progressText: { marginTop: 14, color: colors.textMuted, fontWeight: "700" },
    errorText: { marginTop: 12, color: colors.error, fontWeight: "700" },
    primary: {
      marginTop: 14,
      minHeight: 50,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
    },
    primaryText: { color: colors.textOnPrimary, fontWeight: "900", fontSize: 16 },
    disabled: { opacity: 0.45 },
  });
