import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator, Modal, TextInput } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import Screen from "../components/layout/Screen";
import AppHeader from "../components/layout/AppHeader";
import { useApp } from "../context/AppContext";
import { addPdfToHistory } from "../storage/pdfHistory";
import { ensureLocalFile, sanitizePdfName, makeShareableCopy } from "../utils/files";
import { showRewarded } from "../services/ads";
import PdfHistoryPickerModal from "../components/PdfHistoryPickerModal";
import { useAppTheme } from "../hooks/useAppTheme";
import {
  requiresRewardedForMerge,
  recordMerge,
  shouldShowMergePaywall,
  canUseRewarded,
  consumeRewarded,
} from "../services/monetization";

type Picked = { uri: string; name: string };

export default function MergePdfScreenNative() {
  const colors = useAppTheme();
  const { isPremium, t } = useApp();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [files, setFiles] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const [outUri, setOutUri] = useState<string | null>(null);
  const [outName, setOutName] = useState<string>(t('merge', 'defaultOutputName'));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(t('merge', 'defaultOutputName'));

  const pickPdf = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true, multiple: true as any });
      if (res.canceled) return;
      const assets = (res as any).assets ?? [];
      if (!assets.length) return;
      const picked: Picked[] = assets.map((a: any) => ({
        uri: a.uri,
        name: sanitizePdfName(a.name || t('common', 'file') + '.pdf'),
      }));
      setFiles((prev) => [...prev, ...picked].slice(0, 10));
    } catch (e) {
      console.log("pick merge pdf error", e);
      Alert.alert(t('common', 'error'), t('merge', 'pickError'));
    }
  };

  const addPdfFromHistory = async (uri: string, name?: string) => {
    const local = await ensureLocalFile({ uri, fileName: name || `${t('common', 'file')}.pdf` });
    setFiles((prev) => [...prev, { uri: local, name: sanitizePdfName(name || `${t('common', 'file')}.pdf`) }].slice(0, 10));
  };

  const removeAt = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));
  const canMerge = files.length >= 2 && !busy;

  const doMerge = async () => {
    if (files.length < 2) {
      Alert.alert(t('merge', 'minFilesTitle'), t('merge', 'minFilesBody'));
      return;
    }

    let usedRewarded = false;
    if (await requiresRewardedForMerge(isPremium)) {
      const okQuota = await canUseRewarded(isPremium, "merge_pdf");
      if (!okQuota) {
        router.push("/plans");
        return;
      }

      const ok = await showRewarded();
      if (!ok) {
        Alert.alert(t('common', 'premium'), t('merge', 'rewardedBody'));
        return;
      }
      await consumeRewarded("merge_pdf");
      usedRewarded = true;
    }

    setBusy(true);
    setOutUri(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const merged = await PDFDocument.create();

      for (const f of files) {
        const local = await ensureLocalFile({ uri: f.uri, fileName: f.name });
        const b64 = await FileSystem.readAsStringAsync(local, { encoding: FileSystem.EncodingType.Base64 });
        const pdf = await PDFDocument.load(b64);
        const pages = await merged.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }

      const b64Out = await merged.saveAsBase64({ dataUri: false });
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) throw new Error("cacheDirectory not available");

      const name = sanitizePdfName(outName || t('merge', 'defaultOutputName'));
      const dest = `${cacheDir}${Date.now()}-${name}`;
      await FileSystem.writeAsStringAsync(dest, b64Out, { encoding: FileSystem.EncodingType.Base64 });

      setOutUri(dest);
      await addPdfToHistory({ uri: dest, name });
      await recordMerge(isPremium, usedRewarded);
      Alert.alert(t('common', 'done'), t('merge', 'mergedDone'));

      if (!isPremium && usedRewarded) {
        const showPaywall = await shouldShowMergePaywall();
        if (showPaywall) router.push("/plans");
      }
    } catch (e: any) {
      console.log("merge error", e);
      Alert.alert(
        t('common', 'error'),
        e?.message?.includes("pdf-lib") ? t('merge', 'missingPdfLib') : t('merge', 'mergeError')
      );
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    if (!outUri) return;
    if (!(await Sharing.isAvailableAsync())) return;
    const shareUri = await makeShareableCopy({ uri: outUri, fileName: outName });
    await Sharing.shareAsync(shareUri, { dialogTitle: outName });
  };

  const goOpen = () => {
    if (!outUri) return;
    router.push({ pathname: "/pdf-viewer", params: { uri: outUri, name: sanitizePdfName(outName) } });
  };

  const hint = isPremium ? t('merge', 'subtitlePremium') : t('merge', 'subtitleFree');

  return (
    <Screen>
      <AppHeader title={t('merge', 'title')} onBackPress={() => router.back()} />

      <PdfHistoryPickerModal
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onPick={(item) => addPdfFromHistory(item.uri, item.name)}
        title={t('historyPicker', 'addFromHistoryTitle')}
      />

      <Modal visible={renameOpen} transparent animationType="fade" onRequestClose={() => setRenameOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setRenameOpen(false)} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{t('merge', 'renameTitle')}</Text>
          <TextInput
            value={renameValue}
            onChangeText={setRenameValue}
            placeholder={t('merge', 'defaultOutputName')}
            placeholderTextColor={colors.textMuted}
            style={styles.modalInput}
            autoCapitalize="none"
          />
          <View style={styles.modalRow}>
            <Pressable style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setRenameOpen(false)}>
              <Text style={styles.modalBtnGhostText}>{t('common', 'cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.modalBtn, styles.modalBtnPrimary]}
              onPress={() => {
                setOutName(sanitizePdfName(renameValue || t('merge', 'defaultOutputName')));
                setRenameOpen(false);
              }}
            >
              <Text style={styles.modalBtnPrimaryText}>{t('common', 'save')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {!isPremium && (
            <View style={styles.pill}>
              <MaterialCommunityIcons name="star" size={16} color={colors.primary} />
              <Text style={styles.pillText}>{t('merge', 'premiumBadge')}</Text>
            </View>
          )}

          <Text style={styles.title}>{t('merge', 'title')}</Text>
          <Text style={styles.sub}>{hint}</Text>

          <View style={styles.actionColumn}>
            <Pressable style={styles.pickBtn} onPress={pickPdf} disabled={busy}>
              <MaterialCommunityIcons name="file-pdf-box" size={18} color={colors.primary} />
              <Text style={styles.pickText}>{t('merge', 'pickFiles')}</Text>
            </Pressable>

            <Pressable style={styles.pickBtn} onPress={() => setHistoryOpen(true)} disabled={busy}>
              <MaterialCommunityIcons name="history" size={18} color={colors.primary} />
              <Text style={styles.pickText}>{t('merge', 'fromHistory')}</Text>
            </Pressable>
          </View>

          <View style={styles.list}>
            {files.length === 0 ? (
              <Text style={styles.empty}>{t('merge', 'empty')}</Text>
            ) : (
              files.map((f, idx) => (
                <View key={`${f.uri}-${idx}`} style={styles.row}>
                  <MaterialCommunityIcons name="file-pdf-box" size={18} color={colors.primary} />
                  <Text style={styles.rowText} numberOfLines={1}>{f.name}</Text>
                  <Pressable onPress={() => removeAt(idx)} style={styles.xBtn}>
                    <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))
            )}
          </View>

          <Text style={styles.label}>{t('merge', 'outputName')}</Text>
          <View style={styles.nameRow}>
            <MaterialCommunityIcons name="rename-box" size={18} color={colors.textMuted} />
            <Text style={styles.nameValue} numberOfLines={1}>{sanitizePdfName(outName)}</Text>
            <Pressable
              onPress={() => {
                setRenameValue(outName);
                setRenameOpen(true);
              }}
              style={styles.smallBtn}
            >
              <MaterialCommunityIcons name="pencil" size={18} color={colors.text} />
            </Pressable>
          </View>

          <Pressable style={[styles.primaryBtn, !canMerge && styles.disabledBtn]} onPress={doMerge} disabled={!canMerge}>
            {busy ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <>
                <MaterialCommunityIcons name="layers-triple" size={18} color={colors.textOnPrimary} />
                <Text style={styles.primaryText}>{t('merge', 'mergeButton')}</Text>
              </>
            )}
          </Pressable>

          {!isPremium && (
            <Pressable style={styles.secondaryBtn} onPress={() => router.push("/plans")}>
              <MaterialCommunityIcons name="star" size={18} color={colors.primary} />
              <Text style={styles.secondaryText}>{t('common', 'viewPlans')}</Text>
            </Pressable>
          )}

          {outUri && (
            <View style={styles.resultActions}>
              <Pressable style={styles.secondaryBtn} onPress={goOpen}>
                <MaterialCommunityIcons name="open-in-new" size={18} color={colors.primary} />
                <Text style={styles.secondaryText}>{t('merge', 'openResult')}</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={onShare}>
                <MaterialCommunityIcons name="share-variant" size={18} color={colors.primary} />
                <Text style={styles.secondaryText}>{t('merge', 'shareResult')}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  scroll: { paddingBottom: 6 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  pillText: { fontWeight: "900", color: colors.text },
  title: { fontSize: 18, fontWeight: "900", color: colors.text },
  sub: { marginTop: 6, fontSize: 13, color: colors.textMuted, lineHeight: 18, fontWeight: '700' },
  actionColumn: { gap: 10, marginTop: 14 },
  pickBtn: { minHeight: 48, borderRadius: 18, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  pickText: { fontWeight: "900", color: colors.text },
  list: { marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 12, backgroundColor: colors.surfaceSoft },
  empty: { color: colors.textMuted, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  rowText: { flex: 1, color: colors.text, fontWeight: "800" },
  xBtn: { width: 34, height: 34, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  label: { marginTop: 16, fontSize: 12, color: colors.textMuted, fontWeight: "800" },
  nameRow: { marginTop: 8, minHeight: 50, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSoft, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12 },
  nameValue: { flex: 1, fontWeight: "900", color: colors.text },
  smallBtn: { width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  primaryBtn: { marginTop: 16, minHeight: 50, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 },
  primaryText: { color: colors.textOnPrimary, fontWeight: "900" },
  disabledBtn: { opacity: 0.45 },
  secondaryBtn: { marginTop: 10, minHeight: 48, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSoft, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 },
  secondaryText: { fontWeight: "900", color: colors.text },
  resultActions: { marginTop: 14 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  modalCard: { position: "absolute", left: 18, right: 18, top: 160, borderRadius: 20, backgroundColor: colors.surface, padding: 14, borderWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 16, fontWeight: "900", color: colors.text, marginBottom: 10 },
  modalInput: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSoft, paddingHorizontal: 12, color: colors.text },
  modalRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  modalBtn: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modalBtnGhost: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSoft },
  modalBtnPrimary: { backgroundColor: colors.primary },
  modalBtnGhostText: { fontWeight: "900", color: colors.text },
  modalBtnPrimaryText: { fontWeight: "900", color: colors.textOnPrimary },
});
