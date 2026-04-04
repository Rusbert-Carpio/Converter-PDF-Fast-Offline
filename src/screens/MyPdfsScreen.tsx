import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Screen from "../components/layout/Screen";
import AppHeader from "../components/layout/AppHeader";
import { getPdfHistory, removePdfFromHistory, PdfHistoryItem } from "../storage/pdfHistory";
import * as Sharing from "expo-sharing";
import { makeShareableCopy } from "../utils/files";
import { useAppTheme } from "../hooks/useAppTheme";
import { useApp } from "../context/AppContext";

export default function MyPdfsScreen() {
  const colors = useAppTheme();
  const { t } = useApp();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<PdfHistoryItem[]>([]);
  const load = useCallback(async () => setItems(await getPdfHistory()), []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onOpen = (item: PdfHistoryItem) => {
    router.push({ pathname: "/pdf-viewer", params: { uri: item.uri, name: item.name } });
  };

  const onShare = async (item: PdfHistoryItem) => {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert(t('myPdfs', 'shareUnavailableTitle'), t('myPdfs', 'shareUnavailableBody'));
      return;
    }
    const local = await makeShareableCopy({ uri: item.uri, fileName: item.name });
    await Sharing.shareAsync(local, { dialogTitle: item.name });
  };

  const onDelete = async (item: PdfHistoryItem) => {
    Alert.alert(
      t('myPdfs', 'deleteTitle'),
      `${t('myPdfs', 'deleteBodyPrefix')} "${item.name}" ${t('myPdfs', 'deleteBodySuffix')}\n\n${t('myPdfs', 'deleteHelper')}`,
      [
      { text: t('common', 'cancel'), style: "cancel" },
      {
        text: t('common', 'delete'),
        style: "destructive",
        onPress: async () => {
          await removePdfFromHistory(item.id);
          await load();
        },
      },
    ],
    );
  };

  return (
    <Screen>
      <AppHeader title={t('myPdfs', 'title')} onBackPress={() => router.back()} />

      {items.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="folder-outline" size={34} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('myPdfs', 'emptyTitle')}</Text>
          <Text style={styles.emptySub}>{t('myPdfs', 'emptyBody')}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.leftIcon}>
                <MaterialCommunityIcons name="file-pdf-box" size={20} color={colors.primary} />
              </View>

              <Pressable style={{ flex: 1 }} onPress={() => onOpen(item)}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
              </Pressable>

              <Pressable onPress={() => onShare(item)} style={styles.smallBtn}>
                <MaterialCommunityIcons name="share-variant" size={18} color={colors.text} />
              </Pressable>

              <Pressable onPress={() => onDelete(item)} style={styles.smallBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.text} />
              </Pressable>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    emptyTitle: { marginTop: 10, fontSize: 16, fontWeight: "900", color: colors.text },
    emptySub: { marginTop: 6, color: colors.textMuted, fontWeight: "600", textAlign: 'center' },
    listContent: { gap: 12, paddingBottom: 6 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 12,
    },
    leftIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
    name: { fontWeight: "900", color: colors.text },
    meta: { marginTop: 2, color: colors.textMuted, fontWeight: "600", fontSize: 12 },
    smallBtn: { width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  });
