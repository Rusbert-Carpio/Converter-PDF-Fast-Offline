import React from 'react';
import { ViewStyle } from 'react-native';
import ActionCard from './ActionCard';

export default function PremiumActionCard({
  title,
  subtitle,
  onPress,
  density = 'regular',
  style,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  density?: 'regular' | 'tight';
  style?: ViewStyle;
}) {
  return (
    <ActionCard
      title={title}
      subtitle={subtitle}
      onPress={onPress}
      variant="wide"
      tone="violet"
      leftIconName="layers-triple-outline"
      titleLines={1}
      density={density}
      style={style}
    />
  );
}
