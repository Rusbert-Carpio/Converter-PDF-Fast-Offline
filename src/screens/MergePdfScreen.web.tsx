import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../hooks/useAppTheme";

export default function MergePdfScreenWeb() {
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="layers-triple" size={26} color={colors.primary} />
        </View>
        <Text style={styles.title}>Fusionar PDFs</Text>
        <Text style={styles.sub}>
          Esta función usa módulos nativos y está disponible en Android/iOS.
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
    icon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 10 },
    title: { fontSize: 20, fontWeight: "900", color: colors.text },
    sub: { marginTop: 6, fontSize: 14, color: colors.textMuted, lineHeight: 20 },
    btn: { marginTop: 14, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 14, alignItems: "center" },
    btnText: { color: colors.textOnPrimary, fontWeight: "900" },
  });
