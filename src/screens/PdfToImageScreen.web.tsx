import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../hooks/useAppTheme";

export default function PdfToImageScreenWeb() {
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="file-pdf-box" size={28} color={colors.primary} />
        </View>

        <Text style={styles.title}>PDF a imagen</Text>
        <Text style={styles.subtitle}>
          Esta función requiere módulos nativos y no está disponible en la versión Web.
        </Text>

        <Text style={styles.tip}>{`Pruébalo en Android o iOS usando:\n• npx expo run:android\n• npx expo run:ios\n• o Dev Client`}</Text>

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
    title: { fontSize: 20, fontWeight: "800", color: colors.text },
    subtitle: { marginTop: 6, fontSize: 14, color: colors.textMuted, lineHeight: 20 },
    tip: { marginTop: 12, fontSize: 13, color: colors.textMuted, lineHeight: 18, backgroundColor: colors.surfaceSoft, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
    btn: { marginTop: 14, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 14, alignItems: "center" },
    btnText: { color: colors.textOnPrimary, fontWeight: "800" },
  });
