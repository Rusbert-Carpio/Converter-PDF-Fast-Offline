import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../hooks/useAppTheme";
import { useApp } from "../context/AppContext";

export default function PremiumModalScreen() {
  const colors = useAppTheme();
  const { t } = useApp();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const perks = [
    { title: t('premiumScreen', 'perk1Title'), desc: t('premiumScreen', 'perk1Body'), icon: 'ad-off' },
    { title: t('premiumScreen', 'perk2Title'), desc: t('premiumScreen', 'perk2Body'), icon: 'image' },
    { title: t('premiumScreen', 'perk3Title'), desc: t('premiumScreen', 'perk3Body'), icon: 'layers-triple' },
    { title: t('premiumScreen', 'perk4Title'), desc: t('premiumScreen', 'perk4Body'), icon: 'layers-outline' },
    { title: t('premiumScreen', 'perk5Title'), desc: t('premiumScreen', 'perk5Body'), icon: 'headset' },
  ];

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      <View style={styles.sheet}>
        <View style={styles.topRow}>
          <View style={styles.icon}>
            <MaterialCommunityIcons name="file-pdf-box" size={20} color={colors.textOnPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('premiumScreen', 'title')}</Text>
            <Text style={styles.sub}>{t('premiumScreen', 'subtitle')}</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.close}>
            <MaterialCommunityIcons name="close" size={18} color={colors.text} />
          </Pressable>
        </View>

        <View style={{ gap: 10, marginTop: 10 }}>
          {perks.map((p) => (
            <View key={p.title} style={styles.perk}>
              <View style={styles.perkIcon}>
                <MaterialCommunityIcons name={p.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.perkTitle}>{p.title}</Text>
                <Text style={styles.perkDesc}>{p.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]} onPress={() => router.push("/plans")}>
          <Text style={styles.ctaText}>{t('common', 'viewPlans')}</Text>
        </Pressable>

        <View style={{ height: 14 }} />
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 16,
      paddingBottom: 28,
      marginBottom: 60,
      borderWidth: 1,
      borderColor: colors.border,
    },
    topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    icon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 18, fontWeight: "900", color: colors.text },
    sub: { marginTop: 2, color: colors.textMuted, fontWeight: "600" },
    close: { width: 36, height: 36, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
    perk: { flexDirection: "row", gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSoft },
    perkIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
    perkTitle: { fontWeight: "900", color: colors.text },
    perkDesc: { marginTop: 2, color: colors.textMuted, lineHeight: 18 },
    cta: { marginTop: 14, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 16, alignItems: "center" },
    ctaText: { color: colors.textOnPrimary, fontWeight: "900", fontSize: 15 },
  });
