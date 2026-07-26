import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RenoPayBrand } from '@/constants/renopay-brand';

type SeedPhraseModalProps = {
  visible: boolean;
  mode: 'display' | 'enter';
  phrase?: string;
  value: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
  onConfirm?: () => void;
  loading?: boolean;
  title: string;
};

export function SeedPhraseModal({
  visible,
  mode,
  phrase,
  value,
  onChangeText,
  onClose,
  onConfirm,
  loading,
  title,
}: SeedPhraseModalProps) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>

          {mode === 'display' ? (
            <Text selectable style={styles.phrase}>
              {phrase}
            </Text>
          ) : (
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              placeholder="Enter your 12 or 24 word seed phrase"
              placeholderTextColor={RenoPayBrand.muted}
              style={styles.input}
              value={value}
              onChangeText={onChangeText}
            />
          )}

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryBtn}>
              <Text style={styles.secondaryLabel}>CLOSE</Text>
            </Pressable>
            {mode === 'enter' && onConfirm ? (
              <Pressable
                accessibilityRole="button"
                disabled={loading}
                onPress={onConfirm}
                style={[styles.primaryBtn, loading ? styles.disabled : null]}>
                <Text style={styles.primaryLabel}>{loading ? 'RESTORING...' : 'RESTORE'}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: RenoPayBrand.backgroundElevated,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 3,
    borderColor: RenoPayBrand.border,
    padding: 20,
    gap: 16,
  },
  title: {
    color: RenoPayBrand.primary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  phrase: {
    color: RenoPayBrand.foreground,
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    paddingVertical: 8,
  },
  input: {
    minHeight: 120,
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
    borderRadius: 12,
    padding: 14,
    color: RenoPayBrand.foreground,
    fontSize: 15,
    textAlignVertical: 'top',
    backgroundColor: RenoPayBrand.background,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 3,
    borderColor: RenoPayBrand.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: RenoPayBrand.backgroundElevated,
  },
  secondaryLabel: {
    color: RenoPayBrand.foreground,
    fontWeight: '900',
    letterSpacing: 1,
  },
  primaryBtn: {
    flex: 1,
    borderWidth: 3,
    borderColor: RenoPayBrand.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: RenoPayBrand.primary,
  },
  primaryLabel: {
    color: RenoPayBrand.border,
    fontWeight: '900',
    letterSpacing: 1,
  },
  disabled: {
    opacity: 0.6,
  },
});
