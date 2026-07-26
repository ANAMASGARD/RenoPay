import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { RenoPayBrand } from '@/constants/renopay-brand';

type NeoBrutalSectionButtonProps = {
  header: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function NeoBrutalSectionButton({
  header,
  label,
  onPress,
  disabled,
  loading,
  style,
}: NeoBrutalSectionButtonProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.shadow} />
      <View style={styles.card}>
        <View style={styles.headerBand}>
          <Text style={styles.headerText}>{header}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={disabled || loading}
          onPress={onPress}
          style={({ pressed }) => [
            styles.body,
            pressed && !disabled ? styles.bodyPressed : null,
            disabled ? styles.bodyDisabled : null,
          ]}>
          {loading ? (
            <ActivityIndicator color={RenoPayBrand.border} />
          ) : (
            <Text style={styles.label}>{label}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    marginBottom: 8,
  },
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -5,
    top: 5,
    borderRadius: 14,
    backgroundColor: RenoPayBrand.border,
  },
  card: {
    borderWidth: 3,
    borderColor: RenoPayBrand.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  headerBand: {
    backgroundColor: RenoPayBrand.accentGreen,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomColor: RenoPayBrand.border,
  },
  headerText: {
    color: RenoPayBrand.foreground,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  body: {
    backgroundColor: RenoPayBrand.cream,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  bodyPressed: {
    backgroundColor: RenoPayBrand.creamPressed,
    transform: [{ translateY: 2 }],
  },
  bodyDisabled: {
    opacity: 0.6,
  },
  label: {
    color: RenoPayBrand.border,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
