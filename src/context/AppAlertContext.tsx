import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

type AlertButton = { text?: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' };
type AlertOptions = { title?: string; message?: string; buttons?: AlertButton[] };
type Ctx = { showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void };

const AppAlertContext = createContext<Ctx>({ showAlert: () => {} });

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const queue = useRef<AlertOptions[]>([]);
  const originalAlertRef = useRef(Alert.alert);
  const [current, setCurrent] = useState<AlertOptions | null>(null);
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const showNext = () => {
    setCurrent((prev) => {
      if (prev) return prev;
      const next = queue.current.shift() ?? null;
      return next;
    });
  };

  const showAlert = (title: string, message?: string, buttons?: AlertButton[]) => {
    queue.current.push({ title, message, buttons });
    showNext();
  };

  const close = (button?: AlertButton) => {
    setCurrent(null);
    try { button?.onPress?.(); } catch {}
    setTimeout(showNext, 40);
  };

  useEffect(() => {
    const original = Alert.alert;
    originalAlertRef.current = original;
    Alert.alert = ((title?: string, message?: string, buttons?: AlertButton[]) => {
      queue.current.push({ title, message, buttons });
      showNext();
    }) as typeof Alert.alert;
    return () => {
      Alert.alert = original;
    };
  }, []);

  const value = useMemo(() => ({ showAlert }), []);
  const buttons = current?.buttons?.length ? current.buttons : [{ text: 'OK' }];

  return (
    <AppAlertContext.Provider value={value}>
      {children}
      <Modal visible={!!current} transparent animationType="fade" onRequestClose={() => close(buttons[buttons.length - 1])}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>✓</Text>
            </View>
            {!!current?.title && <Text style={styles.title}>{current.title}</Text>}
            {!!current?.message && <Text style={styles.message}>{current.message}</Text>}
            <View style={[styles.actions, buttons.length > 2 && { flexDirection: 'column' }]}> 
              {buttons.map((btn, idx) => {
                const destructive = btn.style === 'destructive';
                const secondary = btn.style === 'cancel' || idx < buttons.length - 1;
                return (
                  <Pressable
                    key={`${btn.text ?? 'btn'}-${idx}`}
                    onPress={() => close(btn)}
                    style={({ pressed }) => [
                      styles.button,
                      secondary ? styles.buttonSecondary : styles.buttonPrimary,
                      destructive && styles.buttonDestructive,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text style={[styles.buttonText, secondary ? styles.buttonTextSecondary : styles.buttonTextPrimary]}>{btn.text ?? 'OK'}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AppAlertContext.Provider>
  );
}

export function useAppAlert() {
  return useContext(AppAlertContext);
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 24,
      padding: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOpacity: 0.24,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 12,
    },
    icon: { fontSize: 24, fontWeight: '900', color: colors.primary },
    title: { fontSize: 20, lineHeight: 24, fontWeight: '900', color: colors.text, textAlign: 'center' },
    message: { marginTop: 8, fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
    actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
    button: { flex: 1, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
    buttonPrimary: { backgroundColor: colors.primary },
    buttonSecondary: { backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border },
    buttonDestructive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    buttonText: { fontSize: 15, fontWeight: '900' },
    buttonTextPrimary: { color: colors.textOnPrimary },
    buttonTextSecondary: { color: colors.text },
  });
