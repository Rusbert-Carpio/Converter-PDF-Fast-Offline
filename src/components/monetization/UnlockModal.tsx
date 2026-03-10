import React, { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../hooks/useAppTheme";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onClose: () => void;
};

export default function UnlockModal({
  visible,
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel = "Obtener Premium ilimitado",
  onSecondary,
  onClose,
}: Props) {
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.headRow}>
          <View style={styles.icon}>
            <MaterialCommunityIcons name="star" size={18} color="#B7791F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.msg}>{message}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.close}>
            <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <Pressable style={styles.primary} onPress={onPrimary}>
          <MaterialCommunityIcons name="play-circle" size={18} color={colors.textOnPrimary} />
          <Text style={styles.primaryText}>{primaryLabel}</Text>
        </Pressable>

        <Pressable
          style={styles.secondary}
          onPress={() => {
            onClose();
            if (onSecondary) onSecondary();
            else router.push("/plans");
          }}
        >
          <MaterialCommunityIcons name="crown" size={18} color={colors.primary} />
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
    sheet: {
      position: "absolute",
      left: 16,
      right: 16,
      bottom: 90,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
    icon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: "rgba(192,138,0,0.16)",
      borderWidth: 1,
      borderColor: "rgba(192,138,0,0.25)",
      alignItems: "center",
      justifyContent: "center",
    },
    close: {
      width: 34,
      height: 34,
      borderRadius: 14,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { fontSize: 16, fontWeight: "900", color: colors.text },
    msg: { marginTop: 4, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
    primary: {
      marginTop: 14,
      height: 48,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 10,
    },
    primaryText: { color: colors.textOnPrimary, fontWeight: "900" },
    secondary: {
      marginTop: 10,
      height: 48,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 10,
    },
    secondaryText: { color: colors.primary, fontWeight: "900" },
  });
