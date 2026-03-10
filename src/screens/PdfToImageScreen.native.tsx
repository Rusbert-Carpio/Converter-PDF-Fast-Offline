import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import { captureRef } from "react-native-view-shot";
import Pdf from "react-native-pdf";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ensureLocalFile } from "../utils/files";
import { useApp } from "../context/AppContext";
import AdBannerSpacer from "../components/ads/AdBannerSpacer";
import { safeBack } from "../utils/nav";
import { showRewarded } from "../services/ads";
import PdfHistoryPickerModal from "../components/PdfHistoryPickerModal";
import { useAppTheme } from "../hooks/useAppTheme";
import {
  canConvertPdfToImages,
  recordPdfToImagesConversion,
  shouldShowPdfToImagesPaywall,
  Limits,
} from "../services/monetization";

type PickedPdf = { uri: string; name: string };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export default function PdfToImageScreenNative() {
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { isPremium, t } = useApp();

  const [source, setSource] = useState<PickedPdf | null>(null);
  const [pages, setPages] = useState(0);
  const [pdfReady, setPdfReady] = useState(false);
  const [renderPage, setRenderPage] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [rangeFrom, setRangeFrom] = useState("1");
  const [rangeTo, setRangeTo] = useState("1");

  const title = source?.name ?? t('pdfToImages', 'title');

  useEffect(() => {
    if (!pages) return;
    if (isPremium) {
      const all = Array.from({ length: pages }, (_, i) => i + 1);
      setSelectedPages(all);
      setRangeFrom("1");
      setRangeTo(String(pages));
      return;
    }
    setSelectedPages((prev) => {
      const clean = prev.filter((p) => p >= 1 && p <= pages);
      if (clean.length) return clean;
      const end = Math.min(pages, Limits.pdfToImageMaxPagesPerConversionFree);
      return Array.from({ length: end }, (_, i) => i + 1);
    });
    setRangeFrom("1");
    setRangeTo(String(Math.min(pages, Limits.pdfToImageMaxPagesPerConversionFree)));
  }, [pages, isPremium]);

  const pageList = useMemo(() => {
    if (!pages) return [];
    if (isPremium) return Array.from({ length: pages }, (_, i) => i + 1);
    return [...new Set(selectedPages)]
      .filter((p) => p >= 1 && p <= pages)
      .sort((a, b) => a - b);
  }, [pages, selectedPages, isPremium]);

  const setPdf = async (pdf: PickedPdf) => {
    const localUri = await ensureLocalFile({ uri: pdf.uri, fileName: pdf.name });
    setSource({ uri: localUri, name: pdf.name });
    setPages(0);
    setPdfReady(false);
    setImages([]);
    setRenderPage(1);
    setSelectedPages([]);
    setRangeFrom("1");
    setRangeTo("1");
  };

  const pickPdfFromFiles = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    if (res.canceled) return;
    const f = res.assets?.[0];
    if (!f?.uri) return;
    await setPdf({ uri: f.uri, name: f.name || `${t('common', 'file')}.pdf` });
  };

  const saveToGalleryAlbum = async (fileUri: string) => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") throw new Error(t('imageToPdf', 'galleryPermissionDenied'));
    const asset = await MediaLibrary.createAssetAsync(fileUri);
    try {
      await MediaLibrary.createAlbumAsync("Ameda", asset, true);
    } catch {
      const album = await MediaLibrary.getAlbumAsync("Ameda");
      if (album) await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    }
  };

  const applyRange = () => {
    if (!pages) return;
    const from = clamp(Number(rangeFrom || 1), 1, pages);
    const to = clamp(Number(rangeTo || from), 1, pages);
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    let picked = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    if (!isPremium && picked.length > Limits.pdfToImageMaxPagesPerConversionFree) {
      picked = picked.slice(0, Limits.pdfToImageMaxPagesPerConversionFree);
      Alert.alert(
        t('pdfToImages', 'freeLimitTitle'),
        `${t('pdfToImages', 'freeLimitBodyPrefix')} ${Limits.pdfToImageMaxPagesPerConversionFree} ${t('pdfToImages', 'freeLimitBodySuffix')}`
      );
    }
    setSelectedPages(picked);
    setRangeFrom(String(picked[0] ?? 1));
    setRangeTo(String(picked[picked.length - 1] ?? 1));
    setRenderPage(picked[0] ?? 1);
  };

  const onConvert = async () => {
    if (!source?.uri) return;
    if (!pdfReady || !pages) {
      Alert.alert(t('common', 'file'), t('pdfToImages', 'loadingPages'));
      return;
    }
    if (!pageList.length) {
      Alert.alert(t('pdfToImages', 'selectPages'), t('pdfToImages', 'choosePagesAlert'));
      return;
    }

    let usedRewarded = false;
    if (!isPremium) {
      const { freeOk, requiresRewarded } = await canConvertPdfToImages(false);
      if (!freeOk && requiresRewarded) {
        const ok = await showRewarded();
        if (!ok) {
          Alert.alert(t('common', 'premium'), t('pdfToImages', 'rewardedBody'));
          return;
        }
        usedRewarded = true;
      }
    }

    setBusy(true);
    try {
      const out: string[] = [];
      const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? "";
      for (const p of pageList) {
        setRenderPage(p);
        await new Promise((r) => setTimeout(r, Platform.OS === "android" ? 700 : 420));
        const captureUri = await captureRef("pdfCapture", {
          format: "png",
          quality: 1,
          result: "tmpfile",
        });
        const dest = `${cacheDir}ameda-pdf-${Date.now()}-p${p}.png`;
        await FileSystem.copyAsync({ from: captureUri, to: dest });
        out.push(dest);
        await saveToGalleryAlbum(dest);
      }
      setImages(out);
      await recordPdfToImagesConversion(isPremium, usedRewarded);
      Alert.alert(t('common', 'done'), `${t('pdfToImages', 'doneBodyPrefix')} ${out.length} ${t('pdfToImages', 'doneBodySuffix')}`);
      if (!isPremium && usedRewarded) {
        const showPaywall = await shouldShowPdfToImagesPaywall(false);
        if (showPaywall) router.push("/plans");
      }
    } catch (e: any) {
      Alert.alert(t('common', 'error'), e?.message ?? t('pdfToImages', 'convertError'));
    } finally {
      setBusy(false);
    }
  };

  const canConvert = !!source?.uri && pdfReady && pageList.length > 0 && !busy;

  return (
    <View style={styles.container}>
      <PdfHistoryPickerModal
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onPick={async (item) => {
          await setPdf({ uri: item.uri, name: item.name });
        }}
        title={t('historyPicker', 'fromHistoryTitle')}
      />
      <View style={styles.header}>
        <Pressable onPress={() => safeBack("/home")} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('pdfToImages', 'title')}</Text>
        <Text style={styles.subtitle}>{t('pdfToImages', 'subtitle')}</Text>

        <View style={styles.rowBtns}>
          <Pressable style={styles.pickBtn} onPress={pickPdfFromFiles} disabled={busy}>
            <MaterialCommunityIcons name="file-pdf-box" size={18} color={colors.primary} />
            <Text style={styles.pickBtnText}>{t('pdfToImages', 'choosePdf')}</Text>
          </Pressable>
          <Pressable style={styles.pickBtn} onPress={() => setHistoryOpen(true)} disabled={busy}>
            <MaterialCommunityIcons name="history" size={18} color={colors.primary} />
            <Text style={styles.pickBtnText}>{t('pdfToImages', 'fromHistory')}</Text>
          </Pressable>
        </View>

        <Text style={styles.meta}>{t('pdfToImages', 'fileLabel')}: {source?.name ?? "—"}</Text>
        <Text style={styles.meta}>{t('pdfToImages', 'pagesLabel')}: {pages ? String(pages) : pdfReady ? "—" : `${t('common', 'loading')}…`}</Text>

        {!!pages && (
          <View style={styles.rangeCard}>
            <Text style={styles.rangeTitle}>{t('pdfToImages', 'pageRangeTitle')}</Text>
            <Text style={styles.rangeSub}>
              {isPremium ? t('pdfToImages', 'pickerSubtitlePremium') : `${t('pdfToImages', 'pickerSubtitleFreePrefix')} ${Limits.pdfToImageMaxPagesPerConversionFree} ${t('pdfToImages', 'pickerSubtitleFreeSuffix')}`}
            </Text>
            <View style={styles.rangeRow}>
              <View style={styles.rangeBox}>
                <Text style={styles.rangeLabel}>{t('pdfToImages', 'from')}</Text>
                <TextInput value={rangeFrom} onChangeText={setRangeFrom} keyboardType="number-pad" style={styles.rangeInput} />
              </View>
              <View style={styles.rangeBox}>
                <Text style={styles.rangeLabel}>{t('pdfToImages', 'to')}</Text>
                <TextInput value={rangeTo} onChangeText={setRangeTo} keyboardType="number-pad" style={styles.rangeInput} />
              </View>
              <Pressable style={styles.applyBtn} onPress={applyRange} disabled={busy}>
                <Text style={styles.applyText}>{t('pdfToImages', 'applyRange')}</Text>
              </Pressable>
            </View>
            <View style={styles.quickRow}>
              {!isPremium && (
                <Pressable style={styles.quickChip} onPress={() => {
                  const end = Math.min(pages, Limits.pdfToImageMaxPagesPerConversionFree);
                  setSelectedPages(Array.from({ length: end }, (_, i) => i + 1));
                  setRangeFrom("1");
                  setRangeTo(String(end));
                  setRenderPage(1);
                }}>
                  <Text style={styles.quickChipText}>{t('pdfToImages', 'allPages')} {Math.min(pages, Limits.pdfToImageMaxPagesPerConversionFree)}</Text>
                </Pressable>
              )}
              <Pressable style={styles.quickChip} onPress={() => setPickerOpen(true)}>
                <Text style={styles.quickChipText}>{t('pdfToImages', 'selectPages')}</Text>
              </Pressable>
            </View>
            <Text style={styles.selectedMeta}>{t('pdfToImages', 'selectedSummaryPrefix')}: {pageList.join(", ")}</Text>
          </View>
        )}

        {!!source?.uri && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>{t('pdfToImages', 'previewTitlePrefix')} {renderPage})</Text>
            <View style={styles.previewWrap}>
              <Pdf
                source={{ uri: source.uri }}
                page={renderPage}
                scale={1.0}
                style={styles.previewPdf}
                onLoadComplete={(n) => {
                  setPages(n);
                  setPdfReady(true);
                }}
                onPageChanged={(page) => setRenderPage(page)}
                onError={() => {
                  setPages(0);
                  setPdfReady(false);
                }}
              />
            </View>
          </View>
        )}

        <Pressable style={[styles.primary, !canConvert && styles.disabled]} disabled={!canConvert} onPress={onConvert}>
          {busy ? <ActivityIndicator color={colors.textOnPrimary} /> : <><MaterialCommunityIcons name="image-multiple" size={18} color={colors.textOnPrimary} /><Text style={styles.primaryText}>{t('pdfToImages', 'convertButton')}</Text></>}
        </Pressable>

        {!!images.length && (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.previewTitle}>{t('pdfToImages', 'exportedImages')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {images.map((u, idx) => (
                  <View key={u} style={styles.thumb}><Text style={styles.thumbText}>PNG {idx + 1}</Text></View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {!!source?.uri && pdfReady && (
          <View style={styles.captureWrap} collapsable={false} nativeID="pdfCapture">
            <Pdf
              source={{ uri: source.uri }}
              page={renderPage}
              scale={1.0}
              style={styles.pdf}
            />
          </View>
        )}
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t('pdfToImages', 'pickerTitle')}</Text>
            <Text style={styles.modalSub}>
              {isPremium ? t('pdfToImages', 'pickerSubtitlePremium') : `${t('pdfToImages', 'pickerSubtitleFreePrefix')} ${Limits.pdfToImageMaxPagesPerConversionFree} ${t('pdfToImages', 'pickerSubtitleFreeSuffix')}`}
            </Text>
            <ScrollView style={{ maxHeight: 360, marginTop: 10 }}>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => {
                const checked = pageList.includes(p);
                return (
                  <Pressable
                    key={p}
                    style={styles.pageRow}
                    onPress={() => {
                      if (isPremium) {
                        const all = Array.from({ length: pages }, (_, i) => i + 1);
                        setSelectedPages(all);
                        setRangeFrom("1");
                        setRangeTo(String(pages));
                        setRenderPage(p);
                        return;
                      }
                      setSelectedPages((prev) => {
                        const has = prev.includes(p);
                        let next = has ? prev.filter((x) => x !== p) : [...prev, p];
                        next = [...new Set(next)].sort((a, b) => a - b);
                        if (next.length > Limits.pdfToImageMaxPagesPerConversionFree) {
                          next = next.slice(0, Limits.pdfToImageMaxPagesPerConversionFree);
                        }
                        setRangeFrom(String(next[0] ?? 1));
                        setRangeTo(String(next[next.length - 1] ?? 1));
                        return next;
                      });
                      setRenderPage(p);
                    }}
                  >
                    <MaterialCommunityIcons name={checked ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={checked ? colors.primary : colors.textMuted} />
                    <Text style={styles.pageRowText}>{t('pdfToImages', 'pageShort')} {p}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              {!isPremium && <Pressable style={[styles.pickBtn, { flex: 1 }]} onPress={() => {
                const end = Math.min(pages, Limits.pdfToImageMaxPagesPerConversionFree);
                setSelectedPages(Array.from({ length: end }, (_, i) => i + 1));
                setRangeFrom("1");
                setRangeTo(String(end));
              }}><Text style={styles.pickBtnText}>{t('common', 'choose')}</Text></Pressable>}
              <Pressable style={[styles.primary, { flex: 1 }]} onPress={() => setPickerOpen(false)}><Text style={styles.primaryText}>{t('common', 'done')}</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <AdBannerSpacer />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 54, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.text },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: "900", color: colors.text },
  subtitle: { marginTop: 6, color: colors.textMuted },
  rowBtns: { flexDirection: "row", gap: 10, marginTop: 14 },
  pickBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pickBtnText: { fontWeight: "800", color: colors.text },
  meta: { marginTop: 10, color: colors.textMuted, fontWeight: "700" },
  rangeCard: { marginTop: 14, padding: 14, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  rangeTitle: { fontWeight: "900", color: colors.text, fontSize: 16 },
  rangeSub: { marginTop: 4, color: colors.textMuted },
  rangeRow: { flexDirection: "row", gap: 10, marginTop: 12, alignItems: "flex-end" },
  rangeBox: { flex: 1 },
  rangeLabel: { fontWeight: "800", color: colors.textMuted, marginBottom: 6 },
  rangeInput: { height: 46, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSoft, paddingHorizontal: 12, color: colors.text, fontWeight: "800" },
  applyBtn: { height: 46, borderRadius: 14, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  applyText: { color: colors.textOnPrimary, fontWeight: "900" },
  quickRow: { flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" },
  quickChip: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.primarySoft },
  quickChipText: { color: colors.primary, fontWeight: "800" },
  selectedMeta: { marginTop: 10, color: colors.text, fontWeight: "700" },
  primary: { marginTop: 14, minHeight: 50, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 16 },
  primaryText: { color: colors.textOnPrimary, fontWeight: "900", fontSize: 16 },
  disabled: { opacity: 0.45 },
  previewCard: { marginTop: 14, padding: 12, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  previewTitle: { fontWeight: "900", color: colors.text },
  previewWrap: { marginTop: 10, borderRadius: 16, overflow: "hidden", backgroundColor: colors.surface, height: 360 },
  previewPdf: { flex: 1, width: "100%" },
  thumb: { width: 74, height: 74, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  thumbText: { fontWeight: "800", color: colors.text },
  captureWrap: { position: "absolute", left: -9999, top: -9999, width: 1080, height: 1528, backgroundColor: "white" },
  pdf: { flex: 1, width: "100%", backgroundColor: "white" },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 18 },
  modalCard: { borderRadius: 18, backgroundColor: colors.surface, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: colors.text },
  modalSub: { marginTop: 6, color: colors.textMuted },
  pageRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  pageRowText: { color: colors.text, fontWeight: "700" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 14 },
});
