import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { type ReactNode } from 'react';

import { RenoPayBrand } from '@/constants/renopay-brand';

type NeoBrutalMenuRowProps = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function NeoBrutalMenuRow({ title, subtitle, icon, onPress, style }: NeoBrutalMenuRowProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.shadow} />
      <Pressable
        accessibilityRole="button"
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && onPress ? styles.rowPressed : null]}>
        <View style={styles.iconSlot}>{icon}</View>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    marginBottom: 14,
  },
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -4,
    top: 4,
    borderRadius: 14,
    backgroundColor: RenoPayBrand.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: RenoPayBrand.cream,
    borderWidth: 3,
    borderColor: RenoPayBrand.border,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  rowPressed: {
    transform: [{ translateY: 2 }],
    backgroundColor: RenoPayBrand.creamPressed,
  },
  iconSlot: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: RenoPayBrand.border,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: RenoPayBrand.border,
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.85,
  },
});
