import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAppTheme } from "../hooks/useAppTheme";

export default function PdfViewerScreenWeb() {
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { name } = useLocalSearchParams<{ name?: string }>();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{name ? String(name) : "PDF"}</Text>
        <Text style={styles.sub}>
          El visor nativo de PDF funciona en Android/iOS. En Web no está disponible en esta versión.
        </Text>
        <Pressable style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Volver</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 16 },
    card: { width: "100%", maxWidth: 520, backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border },
    title: { fontSize: 18, fontWeight: "900", color: colors.text },
    sub: { marginTop: 8, color: colors.textMuted, lineHeight: 20, fontWeight: "600" },
    btn: { marginTop: 14, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 14, alignItems: "center" },
    btnText: { color: colors.textOnPrimary, fontWeight: "900" },
  });
