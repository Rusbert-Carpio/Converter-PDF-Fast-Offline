import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../hooks/useAppTheme';

export type ToastKind = 'success' | 'error' | 'info';

type ToastInput = {
  kind?: ToastKind;
  title: string;
  message?: string;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastItem = ToastInput & { id: number; kind: ToastKind };

type ToastContextValue = {
  showToast: (input: ToastInput) => void;
  hideToast: () => void;
  success: (title: string, message?: string, extra?: Omit<ToastInput, 'title' | 'message' | 'kind'>) => void;
  error: (title: string, message?: string, extra?: Omit<ToastInput, 'title' | 'message' | 'kind'>) => void;
  info: (title: string, message?: string, extra?: Omit<ToastInput, 'title' | 'message' | 'kind'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const [active, setActive] = useState<ToastItem | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismissAnimated = useCallback((cb?: () => void) => {
    clearTimer();
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setActive(null);
        cb?.();
      }
    });
  }, [anim, clearTimer]);

  const processQueue = useCallback((nextQueue?: ToastItem[]) => {
    const source = nextQueue ?? queue;
    if (active || !source.length) return;
    const [next, ...rest] = source;
    setQueue(rest);
    setActive(next);
    anim.setValue(0);
    Animated.spring(anim, {
      toValue: 1,
      damping: 16,
      mass: 0.9,
      stiffness: 180,
      useNativeDriver: true,
    }).start();
    timerRef.current = setTimeout(() => {
      dismissAnimated(() => processQueue(rest));
    }, next.duration ?? 3200);
  }, [active, anim, dismissAnimated, queue]);

  React.useEffect(() => {
    if (!active && queue.length) processQueue(queue);
  }, [active, queue, processQueue]);

  const showToast = useCallback((input: ToastInput) => {
    const item: ToastItem = { id: Date.now() + Math.floor(Math.random() * 1000), kind: input.kind ?? 'info', ...input };
    setQueue((prev) => [...prev, item]);
  }, []);

  const hideToast = useCallback(() => {
    dismissAnimated(() => processQueue());
  }, [dismissAnimated, processQueue]);

  const value = useMemo<ToastContextValue>(() => ({
    showToast,
    hideToast,
    success: (title, message, extra) => showToast({ kind: 'success', title, message, ...extra }),
    error: (title, message, extra) => showToast({ kind: 'error', title, message, ...extra }),
    info: (title, message, extra) => showToast({ kind: 'info', title, message, ...extra }),
  }), [showToast, hideToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toast={active} progress={anim} onClose={hideToast} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toast, progress, onClose }: { toast: ToastItem | null; progress: Animated.Value; onClose: () => void }) {
  const colors = useAppTheme();
  const insets = useSafeAreaInsets();

  if (!toast) return null;

  const iconName = toast.kind === 'success' ? 'check-circle' : toast.kind === 'error' ? 'alert-circle' : 'information';
  const accent = toast.kind === 'success' ? '#16A34A' : toast.kind === 'error' ? '#DC2626' : colors.primary;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.wrap,
          {
            top: Math.max(insets.top + 8, 16),
            opacity: progress,
            transform: [{ translateY }, { scale }],
          },
        ]}
      >
        <Pressable onPress={onClose} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
            <MaterialCommunityIcons name={iconName} size={22} color={accent} />
          </View>

          <View style={styles.textWrap}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{toast.title}</Text>
            {!!toast.message ? <Text style={[styles.message, { color: colors.textMuted }]} numberOfLines={3}>{toast.message}</Text> : null}
            {!!toast.actionLabel ? (
              <Pressable
                hitSlop={8}
                onPress={() => {
                  toast.onAction?.();
                  onClose();
                }}
              >
                <Text style={[styles.action, { color: colors.primary }]}>{toast.actionLabel}</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable hitSlop={8} onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 1000,
  },
  card: {
    minHeight: 84,
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
    paddingTop: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
  },
  message: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  action: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '900',
  },
  closeBtn: {
    marginLeft: 8,
    paddingTop: 2,
    paddingHorizontal: 2,
  },
});
