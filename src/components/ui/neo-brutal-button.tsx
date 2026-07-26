import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { RenoPayBrand } from '@/constants/renopay-brand';

type NeoBrutalButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
};

export function NeoBrutalButton({
  label,
  variant = 'primary',
  style,
  disabled,
  ...rest
}: NeoBrutalButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
      {...rest}>
      <Text style={[styles.label, isPrimary ? styles.primaryLabel : styles.secondaryLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    borderWidth: 3,
    borderColor: RenoPayBrand.border,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: RenoPayBrand.primary,
    marginBottom: 4,
    transform: [{ translateY: 0 }],
  },
  secondary: {
    backgroundColor: RenoPayBrand.backgroundElevated,
  },
  pressed: {
    transform: [{ translateY: 3 }],
    marginBottom: 1,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  primaryLabel: {
    color: RenoPayBrand.border,
  },
  secondaryLabel: {
    color: RenoPayBrand.foreground,
  },
});
