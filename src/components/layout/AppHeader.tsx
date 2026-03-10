import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Spacing, Typography } from '../../theme';
import { useAppTheme } from '../../hooks/useAppTheme';

type Props = {
  title?: string;
  onBackPress?: () => void;
  right?: React.ReactNode;
  style?: ViewStyle;
};

export default function AppHeader({ title, onBackPress, right, style }: Props) {
  const colors = useAppTheme();

  return (
    <View style={[styles.row, style]}>
      <View style={styles.left}>
        {onBackPress ? (
          <Pressable
            onPress={onBackPress}
            hitSlop={10}
            style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="chevron-back" size={26} color={colors.icon} />
          </Pressable>
        ) : null}

        {title ? (
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    ...Typography.h2,
    flexShrink: 1,
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
});
