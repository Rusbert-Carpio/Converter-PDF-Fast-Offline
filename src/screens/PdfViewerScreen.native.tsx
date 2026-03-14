import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import Pdf from "react-native-pdf";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";

import { ensureLocalFile, makeShareableCopy } from "../utils/files";
import { useApp } from "../context/AppContext";
import { showInterstitial } from "../services/ads";
import { recordPdfView } from "../services/monetization";
import { useAppTheme } from "../hooks/useAppTheme";
import Screen from "../components/layout/Screen";
import AppHeader from "../components/layout/AppHeader";

export default function PdfViewerScreenNative() {
  const colors = useAppTheme();
  const { isPremium, t } = useApp();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ uri?: string; name?: string }>();
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const title = useMemo(() => (params?.name ? String(params.name) : 'PDF'), [params?.name]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!params?.uri) return;
      setLoading(true);
      setLoadError(null);
      setLocalUri(null);

      try {
        const { shouldShowInterstitial } = await recordPdfView(isPremium);
        if (shouldShowInterstitial) await showInterstitial();
      } catch {}

      try {
        const copy = await ensureLocalFile({ uri: String(params.uri), fileName: title });
        if (alive) setLocalUri(copy);
      } catch (e: any) {
        console.log('viewer local file error', e);
        if (alive) {
          setLoadError(e?.message ?? t('pdfViewer', 'openError'));
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [params?.uri, title, isPremium, t]);

  const onShare = async () => {
    if (!localUri) return;
    if (!(await Sharing.isAvailableAsync())) return;
    const shareUri = await makeShareableCopy({ uri: localUri, fileName: title });
    await Sharing.shareAsync(shareUri, { dialogTitle: title });
  };

  return (
    <Screen>
      <AppHeader
        title={title}
        onBackPress={() => router.back()}
        right={
          <Pressable onPress={onShare} style={styles.iconBtn} disabled={!localUri}>
            <MaterialCommunityIcons name="share-variant" size={20} color={localUri ? colors.text : colors.textMuted} />
          </Pressable>
        }
      />

      <View style={styles.metaBar}>
        <Text style={styles.topSub}>
          {pageCount ? `${pageCount} ${t('pdfViewer', 'pagesSuffix')}` : loading ? t('common', 'loading') : t('pdfViewer', 'ready')}
        </Text>
      </View>

      <View style={styles.viewer}>
        {!localUri ? (
          <View style={styles.loader}>
            {loading ? <ActivityIndicator color={colors.primary} /> : <MaterialCommunityIcons name="file-alert-outline" size={30} color={colors.textMuted} />}
            <Text style={styles.loaderText}>{loading ? t('pdfViewer', 'preparing') : loadError ?? t('pdfViewer', 'openError')}</Text>
          </View>
        ) : (
          <Pdf
            key={localUri}
            source={{ uri: localUri, cache: true }}
            style={styles.pdf}
            trustAllCerts={false}
            enablePaging={false}
            onLoadComplete={(pages) => {
              setPageCount(pages);
              setLoading(false);
              setLoadError(null);
            }}
            onError={(e) => {
              console.log('PDF viewer error', e);
              setLoading(false);
              setLoadError(t('pdfViewer', 'openError'));
            }}
          />
        )}

        {loading && localUri && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {!!loadError && !!localUri && !loading && (
          <View style={styles.errorOverlay}>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.primaryDark} />
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    iconBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    metaBar: { marginTop: -6, marginBottom: 10 },
    topSub: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
    viewer: { flex: 1 },
    pdf: { flex: 1, width: '100%', borderRadius: 18, backgroundColor: colors.surface },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
    loaderText: { marginTop: 8, color: colors.textMuted, fontWeight: '700', textAlign: 'center' },
    loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 12, alignItems: 'center' },
    errorOverlay: { position: 'absolute', left: 12, right: 12, bottom: 12, borderRadius: 14, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 },
    errorText: { flex: 1, color: colors.text, fontWeight: '700' },
  });
