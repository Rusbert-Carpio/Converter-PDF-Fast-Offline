import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
} from "react-native";

import { getPdfHistory, PdfHistoryItem } from "../storage/pdfHistory";
import { useApp } from "../context/AppContext";
import { useAppTheme } from "../hooks/useAppTheme";

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (item: PdfHistoryItem) => void;
  title?: string;
};

export default function PdfHistoryPickerModal({ visible, onClose, onPick, title }: Props) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PdfHistoryItem[]>([]);
  const { t } = useApp();
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const list = await getPdfHistory();
      setItems(Array.isArray(list) ? list : []);
    })();
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => (it.name || "").toLowerCase().includes(q));
  }, [items, query]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>{title ?? t('historyPicker', 'defaultTitle')}</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('historyPicker', 'searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => {
                if (!item?.uri) return;
                onPick(item);
                onClose();
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>{item.uri.split("/").pop()}</Text>
              </View>
              <Text style={styles.pick}>{t('common', 'choose')}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{t('historyPicker', 'empty')}</Text>}
        />
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheet: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 80,
    bottom: 80,
    borderRadius: 20,
    backgroundColor: colors.surface,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
    color: colors.text,
  },
  input: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    marginBottom: 12,
    color: colors.text,
    backgroundColor: colors.surfaceSoft,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  pick: {
    color: colors.primary,
    fontWeight: "800",
  },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: 20,
  },
});
