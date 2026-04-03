import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Tone = 'coral' | 'blue' | 'amber' | 'violet';
type Variant = 'hero' | 'compact' | 'wide';
type HeroGraphicMode = 'default' | 'single';

type Density = 'regular' | 'tight';

type Props = {
  title: string;
  subtitle?: string;
  onPress: () => void;
  variant?: Variant;
  tone?: Tone;
  leftIconName?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  rightIconName?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  titleLines?: number;
  style?: ViewStyle;
  density?: Density;
  heroGraphicMode?: HeroGraphicMode;
};

const tones = {
  coral: {
    background: '#F78B83',
    overlayA: 'rgba(255,255,255,0.16)',
    overlayB: 'rgba(255,255,255,0.10)',
    tile: '#FF6553',
    accent: '#FFFFFF',
    text: '#FFFFFF',
    subtitle: 'rgba(255,255,255,0.92)',
  },
  blue: {
    background: '#5EA8F6',
    overlayA: 'rgba(255,255,255,0.16)',
    overlayB: 'rgba(255,255,255,0.08)',
    tile: '#4E86F7',
    accent: '#FFFFFF',
    text: '#FFFFFF',
    subtitle: 'rgba(255,255,255,0.9)',
  },
  amber: {
    background: '#F7B36D',
    overlayA: 'rgba(255,255,255,0.18)',
    overlayB: 'rgba(255,255,255,0.08)',
    tile: '#FFA24F',
    accent: '#FFFFFF',
    text: '#FFFFFF',
    subtitle: 'rgba(255,255,255,0.92)',
  },
  violet: {
    background: '#9D7CF7',
    overlayA: 'rgba(255,255,255,0.16)',
    overlayB: 'rgba(255,255,255,0.08)',
    tile: '#8B5CF6',
    accent: '#FFFFFF',
    text: '#FFFFFF',
    subtitle: 'rgba(255,255,255,0.9)',
  },
} as const;

export default function ActionCard({
  title,
  subtitle,
  onPress,
  variant = 'compact',
  tone = 'coral',
  leftIconName,
  rightIconName,
  leftIcon,
  rightIcon,
  titleLines,
  style,
  density = 'regular',
  heroGraphicMode = 'default',
}: Props) {
  const palette = tones[tone];
  const isHero = variant === 'hero';
  const isCompact = variant === 'compact';
  const isTight = density === 'tight';

  const renderLeft = () => {
    if (leftIcon) return leftIcon;
    if (leftIconName) {
      return <MaterialCommunityIcons name={leftIconName} size={isHero ? 54 : 32} color={palette.accent} />;
    }
    return <View style={{ width: isHero ? 54 : 32, height: isHero ? 54 : 32 }} />;
  };

  const renderRight = () => {
    if (rightIcon) return rightIcon;
    if (rightIconName) {
      return <MaterialCommunityIcons name={rightIconName} size={isHero ? 64 : 44} color={palette.accent} />;
    }
    return <View style={{ width: isHero ? 64 : 44, height: isHero ? 64 : 44 }} />;
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'hero' && styles.hero,
        variant === 'hero' && isTight && styles.heroTight,
        variant === 'compact' && styles.compact,
        variant === 'compact' && isTight && styles.compactTight,
        variant === 'wide' && styles.wide,
        variant === 'wide' && isTight && styles.wideTight,
        { backgroundColor: palette.background },
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={[styles.waveLarge, { backgroundColor: palette.overlayA }]} />
      <View style={[styles.waveSmall, { backgroundColor: palette.overlayB }]} />

      {isHero ? (
        <>
          <View style={styles.heroTitleWrap}>
            <Text style={[styles.heroTitle, isTight && styles.heroTitleTight, { color: palette.text }]} numberOfLines={titleLines ?? 1}>
              {title}
            </Text>
            {!!subtitle && (
              <Text style={[styles.heroSubtitle, isTight && styles.heroSubtitleTight, { color: palette.subtitle }]} numberOfLines={2}>
                {subtitle}
              </Text>
            )}
          </View>

          <View style={[styles.heroGraphicArea, isTight && styles.heroGraphicAreaTight]}>
            {heroGraphicMode === 'single' ? (
              <View style={[styles.heroSingleTile, isTight && styles.heroSingleTileTight, { backgroundColor: palette.tile }]}>{renderLeft()}</View>
            ) : (
              <>
                <View style={[styles.heroPrimaryTile, isTight && styles.heroPrimaryTileTight, { backgroundColor: palette.tile }]}>{renderLeft()}</View>
                <View style={[styles.heroSecondaryWrap, isTight && styles.heroSecondaryWrapTight]}>{renderRight()}</View>
                <View style={[styles.heroArrowBadge, isTight && styles.heroArrowBadgeTight]}>
                  <MaterialCommunityIcons name="arrow-top-right" size={28} color={palette.accent} />
                </View>
              </>
            )}
          </View>
        </>
      ) : (
        <View style={styles.compactContent}>
          <View style={styles.compactHeader}>
            <View style={[styles.compactIconWrap, isTight && styles.compactIconWrapTight]}>{renderLeft()}</View>
            <MaterialCommunityIcons name="chevron-right" size={isTight ? 22 : 24} color={palette.accent} style={styles.compactChevron} />
          </View>

          <View style={styles.compactFooter}>
            <Text style={[styles.compactTitle, isTight && styles.compactTitleTight, { color: palette.text }]} numberOfLines={titleLines ?? (isCompact ? 1 : 2)}>
              {title}
            </Text>
            {!!subtitle && variant === 'wide' && (
              <Text style={[styles.compactSubtitle, isTight && styles.compactSubtitleTight, { color: palette.subtitle }]} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  hero: {
    minHeight: 280,
    padding: 22,
    justifyContent: 'space-between',
  },

  heroTight: {
    minHeight: 236,
    padding: 18,
  },
  compact: {
    minHeight: 132,
    padding: 18,
  },
  compactTight: {
    minHeight: 120,
    padding: 16,
  },
  wide: {
    minHeight: 128,
    padding: 18,
  },
  wideTight: {
    minHeight: 110,
    padding: 16,
  },
  waveLarge: {
    position: 'absolute',
    right: -32,
    bottom: -26,
    width: 220,
    height: 118,
    borderTopLeftRadius: 130,
    borderTopRightRadius: 110,
    borderBottomLeftRadius: 90,
    borderBottomRightRadius: 32,
  },
  waveSmall: {
    position: 'absolute',
    right: 14,
    bottom: 22,
    width: 160,
    height: 74,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 90,
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 24,
  },
  heroTitleWrap: {
    zIndex: 2,
    paddingRight: 6,
  },
  heroTitle: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  heroTitleTight: {
    fontSize: 22,
    lineHeight: 27,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  heroSubtitleTight: {
    marginTop: 6,
    fontSize: 12.5,
    lineHeight: 17,
  },
  heroGraphicArea: {
    minHeight: 140,
    justifyContent: 'flex-end',
  },
  heroGraphicAreaTight: {
    minHeight: 120,
  },
  heroSingleTile: {
    alignSelf: 'center',
    width: 126,
    height: 126,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  heroSingleTileTight: {
    width: 110,
    height: 110,
    borderRadius: 24,
  },
  heroPrimaryTile: {
    position: 'absolute',
    left: 16,
    bottom: 4,
    width: 126,
    height: 126,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  heroPrimaryTileTight: {
    left: 10,
    bottom: 2,
    width: 110,
    height: 110,
    borderRadius: 24,
  },
  heroSecondaryWrap: {
    position: 'absolute',
    right: 18,
    bottom: 12,
    opacity: 0.96,
  },
  heroSecondaryWrapTight: {
    right: 12,
    bottom: 12,
    transform: [{ scale: 0.88 }],
  },
  heroArrowBadge: {
    position: 'absolute',
    left: 96,
    bottom: 64,
    transform: [{ rotate: '-8deg' }],
  },
  heroArrowBadgeTight: {
    left: 82,
    bottom: 58,
    transform: [{ rotate: '-8deg' }, { scale: 0.88 }],
  },
  compactContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  compactIconWrap: {
    minHeight: 44,
    justifyContent: 'center',
  },
  compactIconWrapTight: {
    minHeight: 38,
  },
  compactChevron: {
    opacity: 0.82,
    marginTop: -2,
    marginRight: -4,
  },
  compactFooter: {
    marginTop: 8,
    paddingRight: 18,
  },
  compactTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  compactSubtitle: {
    marginTop: 6,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '700',
  },
});
