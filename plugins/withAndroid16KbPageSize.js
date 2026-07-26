const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Pixel 8a / Android 15+ devices use 16 KB memory pages.
 * Enable flexible page size support for native builds (NDK r28+).
 */
function withAndroid16KbPageSize(config) {
  return withGradleProperties(config, (modConfig) => {
    const props = modConfig.modResults;
    const entries = [
      { type: 'property', key: 'android.ndkVersion', value: '28.0.12674087' },
      { type: 'property', key: 'android.experimental.enable16kPageSize', value: 'true' },
    ];

    for (const entry of entries) {
      const index = props.findIndex((item) => item.type === 'property' && item.key === entry.key);
      if (index >= 0) {
        props[index].value = entry.value;
      } else {
        props.push(entry);
      }
    }

    return modConfig;
  });
}

module.exports = withAndroid16KbPageSize;
