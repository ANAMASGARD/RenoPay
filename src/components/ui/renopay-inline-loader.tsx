import { StyleSheet, View, type ViewStyle } from 'react-native';

import { RenoPayDotsLoader } from '@/components/ui/renopay-dots-loader';

type RenoPayInlineLoaderProps = {
  label?: string;
  height?: number;
  style?: ViewStyle;
};

export function RenoPayInlineLoader({ label, height = 120, style }: RenoPayInlineLoaderProps) {
  return (
    <View style={[styles.wrap, { minHeight: height }, style]}>
      <RenoPayDotsLoader size="md" label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
  },
});
