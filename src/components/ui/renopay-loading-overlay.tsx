import { Modal, StyleSheet, View } from 'react-native';

import { RenoPayDotsLoader } from '@/components/ui/renopay-dots-loader';

type RenoPayLoadingOverlayProps = {
  visible: boolean;
  label: string;
};

export function RenoPayLoadingOverlay({ visible, label }: RenoPayLoadingOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop} pointerEvents="auto">
        <RenoPayDotsLoader size="lg" label={label} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 16, 11, 0.85)',
    padding: 24,
  },
});
