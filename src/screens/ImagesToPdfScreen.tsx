import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Screen from "../components/layout/Screen";
import AppHeader from "../components/layout/AppHeader";
import AppButton from "../components/ui/AppButton";
import { Radii, Spacing, Typography } from "../theme";
import { createPdfFromImages } from "../services/pdf";
import { addPdfToHistory } from "../storage/pdfHistory";
import { useApp } from "../context/AppContext";
import { canUseRewarded, consumeRewarded, recordImgToPdfConversion } from "../services/monetization";
import { showInterstitial, showRewarded } from "../services/ads";
import { useAppTheme } from "../hooks/useAppTheme";

type PickedImage = {
  uri: string;
  width?: number;
  height?: number;
};

function sanitizeBaseName(name: string) {
  const base = (name || "img2pdf")
    .replace(/\.pdf$/i, "")
    .replace(/[\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  return (base || "img2pdf").slice(0, 60);
}

function normalizePdfFileName(name: string) {
  const base = sanitizeBaseName(name);
  return `${base}.pdf`;
}

async function ensureCameraPermission(t: ReturnType<typeof useApp>["t"]): Promise<void> {
  const cam = await ImagePicker.requestCameraPermissionsAsync();
  if (!cam.granted) throw new Error(t('imageToPdf', 'cameraPermissionDenied'));
}

async function pickFromGallery(): Promise<PickedImage[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    quality: 1,
  });

  if (result.canceled) return [];

  return result.assets.map((a) => ({
    uri: a.uri,
    width: a.width,
    height: a.height,
  }));
}

async function takePhoto(): Promise<PickedImage | null> {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
  });

  if (result.canceled) return null;

  const a = result.assets[0];
  return { uri: a.uri, width: a.width, height: a.height };
}

async function optimizeImage(uri: string): Promise<string> {
  const out = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return out.uri;
}

async function sharePdf(uri: string, suggestedName: string, t: ReturnType<typeof useApp>["t"]) {
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert(t('imageToPdf', 'shareUnavailableTitle'), t('imageToPdf', 'shareUnavailableBody'));
    return;
  }
  await Sharing.shareAsync(uri, { dialogTitle: suggestedName });
}

async function savePdfAsAndroid(pdfUri: string, suggestedName: string) {
  const saf: any = (FileSystem as any).StorageAccessFramework;
  if (!saf) {
    throw new Error(
      "Storage Access Framework no disponible. Si usas Expo Go, necesitas un Development Build para elegir carpeta."
    );
  }

  const perm = await saf.requestDirectoryPermissionsAsync();
  if (!perm.granted) return null;

  const finalName = normalizePdfFileName(suggestedName);
  const destUri = await saf.createFileAsync(perm.directoryUri, finalName, "application/pdf");
  const b64 = await FileSystem.readAsStringAsync(pdfUri, { encoding: FileSystem.EncodingType.Base64 });
  await FileSystem.writeAsStringAsync(destUri, b64, { encoding: FileSystem.EncodingType.Base64 });
  return destUri;
}

function ToolChip({
  icon,
  label,
  active,
  onPress,
  disabled,
  colors,
}: {
  icon: any;
  label: string;
  active?: boolean;
  onPress: () => void;
  disabled?: boolean;
  colors: ReturnType<typeof useAppTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        toolStyles.base,
        {
          backgroundColor: active ? colors.primarySoft : colors.surfaceSoft,
          borderColor: active ? colors.primary : colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
        },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={18} color={active ? colors.primary : colors.textMuted} />
      <Text style={[toolStyles.text, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const toolStyles = StyleSheet.create({
  base: {
    flex: 1,
    minWidth: 96,
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
});

export default function ImagesToPdfScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const { isPremium, t } = useApp();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [pdfName, setPdfName] = useState(t('imageToPdf', 'defaultName'));
  const [images, setImages] = useState<PickedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [maxQuality, setMaxQuality] = useState(false);
  const [lastPdfUri, setLastPdfUri] = useState<string | null>(null);
  const [lastPdfName, setLastPdfName] = useState<string>("");

  const canGenerate = useMemo(() => images.length > 0 && !busy, [images.length, busy]);

  function removeAt(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function clearAll() {
    setImages([]);
  }

  async function onPickGallery() {
    try {
      setBusy(true);
      const picked = await pickFromGallery();
      if (!picked.length) return;
      setImages((prev) => [...prev, ...picked]);
    } catch (e: any) {
      Alert.alert(t('common', 'error'), e?.message ?? t('imageToPdf', 'openGalleryError'));
    } finally {
      setBusy(false);
    }
  }

  async function onTakePhoto() {
    try {
      setBusy(true);
      await ensureCameraPermission(t);
      const photo = await takePhoto();
      if (!photo) return;
      setImages((prev) => [...prev, photo]);
    } catch (e: any) {
      Alert.alert(t('common', 'error'), e?.message ?? t('imageToPdf', 'openCameraError'));
    } finally {
      setBusy(false);
    }
  }

  async function onOptimize() {
    if (!images.length) return;

    Alert.alert(t('imageToPdf', 'optimizeTitle'), t('imageToPdf', 'optimizeBody'), [
      { text: t('common', 'cancel'), style: 'cancel' },
      {
        text: t('imageToPdf', 'optimizeConfirm'),
        onPress: async () => {
          try {
            setBusy(true);
            const optimized: PickedImage[] = [];
            for (const img of images) {
              const out = await optimizeImage(img.uri);
              optimized.push({ ...img, uri: out });
            }
            setImages(optimized);
            Alert.alert(t('common', 'done'), t('imageToPdf', 'optimizedDone'));
          } catch (e: any) {
            Alert.alert(t('common', 'error'), e?.message ?? t('imageToPdf', 'optimizeError'));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  async function onGeneratePdf() {
    try {
      if (!images.length) {
        Alert.alert(t('imageToPdf', 'selectOneAlertTitle'), t('imageToPdf', 'selectOneAlertBody'));
        return;
      }

      setBusy(true);
      let usedRewarded = false;

      if (maxQuality && !isPremium) {
        const ok = await canUseRewarded(isPremium, "max_quality");
        if (!ok) {
          router.push("/plans");
          return;
        }

        const earned = await showRewarded();
        if (!earned) {
          Alert.alert(t('imageToPdf', 'maxQualityIncompleteTitle'), t('imageToPdf', 'maxQualityIncompleteBody'));
          return;
        }
        await consumeRewarded("max_quality");
        usedRewarded = true;
        setTimeout(() => router.push("/plans"), 450);
      }

      const fileName = normalizePdfFileName(pdfName);
      const baseNameForGenerator = sanitizeBaseName(pdfName);
      const { uri, pages } = await createPdfFromImages(images.map((x) => x.uri), {
        fileName: baseNameForGenerator,
        maxDimension: maxQuality ? 2200 : 1700,
        jpegQuality: maxQuality ? 0.92 : 0.8,
      });

      await addPdfToHistory({ uri, name: fileName });
      setLastPdfUri(uri);
      setLastPdfName(fileName);

      Alert.alert(
        t('imageToPdf', 'createdTitle'),
        `${t('imageToPdf', 'createdBodyPrefix')} "${fileName}" (${pages} ${t('common', 'pages').toLowerCase()}).`,
        [
          { text: t('imageToPdf', 'viewHistory'), onPress: () => router.push('/my-pdfs') },
          { text: t('common', 'ok') },
        ],
      );

      const { shouldShowInterstitial } = await recordImgToPdfConversion(isPremium, usedRewarded);
      if (shouldShowInterstitial) {
        setTimeout(() => {
          showInterstitial();
        }, 600);
      }
    } catch (e: any) {
      Alert.alert(t('common', 'error'), e?.message ?? 'No se pudo generar el PDF.');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveLastToFolderAndroid() {
    try {
      if (Platform.OS !== 'android') {
        Alert.alert(t('common', 'info'), t('imageToPdf', 'saveFolderAndroidInfo'));
        return;
      }
      if (!lastPdfUri) {
        Alert.alert(t('imageToPdf', 'selectOneAlertTitle'), t('imageToPdf', 'generateFirst'));
        return;
      }

      setBusy(true);
      try {
        const saved = await savePdfAsAndroid(lastPdfUri, lastPdfName || pdfName);
        if (saved) {
          Alert.alert(t('imageToPdf', 'saveDoneTitle'), t('imageToPdf', 'saveDoneBody'));
          return;
        }
      } catch {
        Alert.alert(t('common', 'save'), 'Se abrirá el menú para guardar o compartir el PDF.');
      }

      await sharePdf(lastPdfUri, lastPdfName || normalizePdfFileName(pdfName), t);
    } catch (e: any) {
      Alert.alert(t('common', 'error'), e?.message ?? t('imageToPdf', 'saveFolderError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <AppHeader title={t('imageToPdf', 'title')} onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.label}>{t('imageToPdf', 'fileNameLabel')}</Text>
          <TextInput
            value={pdfName}
            onChangeText={setPdfName}
            placeholder={t('imageToPdf', 'fileNamePlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            editable={!busy}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('imageToPdf', 'selectedImages')}</Text>
          <View style={styles.primaryToolsRow}>
            <AppButton title={t('imageToPdf', 'addFromGallery')} variant="secondary" onPress={onPickGallery} disabled={busy} style={{ flex: 1 }} />
            <AppButton title={t('imageToPdf', 'takePhoto')} variant="secondary" onPress={onTakePhoto} disabled={busy} style={{ flex: 1 }} />
          </View>

          <View style={styles.toolGrid}>
            <ToolChip
              icon="image-filter-hdr"
              label={`${t('imageToPdf', 'optimize')} (${images.length})`}
              onPress={onOptimize}
              disabled={!images.length || busy}
              colors={colors}
            />
            <ToolChip
              icon="diamond-stone"
              label={t('imageToPdf', 'qualityTitle')}
              active={maxQuality}
              onPress={() => setMaxQuality((v) => !v)}
              disabled={busy}
              colors={colors}
            />
            <ToolChip
              icon="broom"
              label={t('imageToPdf', 'clearAll')}
              onPress={clearAll}
              disabled={!images.length || busy}
              colors={colors}
            />
          </View>

          <Text style={styles.rules}>{isPremium ? t('imageToPdf', 'premiumRules') : t('imageToPdf', 'freeRules')}</Text>
        </View>

        {images.length ? (
          <View style={styles.section}>
            <View style={styles.previewHeader}>
              <Text style={styles.label}>{t('imageToPdf', 'selectedImages')}</Text>
              <Text style={styles.previewMeta}>{images.length} {t('imageToPdf', 'selectedCountSuffix')}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
              {images.map((img, idx) => (
                <View key={`${img.uri}-${idx}`} style={styles.thumbWrap}>
                  <Image source={{ uri: img.uri }} style={styles.thumb} />
                  <TouchableOpacity onPress={() => removeAt(idx)} disabled={busy} style={styles.removeBtn}>
                    <Text style={styles.removeText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="image-multiple-outline" size={24} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('imageToPdf', 'noImages')}</Text>
          </View>
        )}

        <View style={styles.section}>
          <AppButton title={busy ? `${t('common', 'loading')}...` : t('imageToPdf', 'generate')} onPress={onGeneratePdf} disabled={!canGenerate} />
          {lastPdfUri ? (
            <View style={styles.secondaryRow}>
              <AppButton
                title={t('common', 'share')}
                variant="secondary"
                onPress={() => sharePdf(lastPdfUri, lastPdfName || normalizePdfFileName(pdfName), t)}
                disabled={busy}
                style={{ flex: 1 }}
              />
              <AppButton
                title={t('imageToPdf', 'saveLastAndroid')}
                variant="secondary"
                onPress={onSaveLastToFolderAndroid}
                disabled={busy}
                style={{ flex: 1 }}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    scroll: {
      paddingBottom: Spacing.md,
      gap: Spacing.md,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.lg,
      shadowColor: colors.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
    label: {
      ...Typography.h1,
      color: colors.text,
      marginBottom: Spacing.md,
    },
    input: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: Spacing.md,
      paddingVertical: 14,
      ...Typography.bodyRegular,
      color: colors.text,
    },
    primaryToolsRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    toolGrid: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
    rules: {
      marginTop: Spacing.md,
      color: colors.textMuted,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: '700',
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    previewMeta: {
      color: colors.textMuted,
      fontWeight: '800',
      fontSize: 12,
    },
    thumbRow: {
      gap: Spacing.sm,
    },
    thumbWrap: {
      width: 118,
      height: 142,
      borderRadius: Radii.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSoft,
    },
    thumb: {
      width: '100%',
      height: '100%',
    },
    removeBtn: {
      position: 'absolute',
      right: 8,
      top: 8,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeText: {
      color: colors.white,
      fontSize: 18,
      fontWeight: '800',
      marginTop: -2,
    },
    emptyState: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 20,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    emptyText: {
      color: colors.textMuted,
      fontWeight: '700',
    },
    secondaryRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
  });
