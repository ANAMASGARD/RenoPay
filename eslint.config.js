// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      '.wdk/**',
      '.wdk-bundle/**',
      '**/*.bundle.js',
    ],
  },
  {
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
          conditionNames: ['react-native', 'import', 'require', 'default', 'node'],
        },
        node: {
          extensions: [
            '.js',
            '.jsx',
            '.ts',
            '.tsx',
            '.native.js',
            '.native.jsx',
            '.native.ts',
            '.native.tsx',
            '.web.js',
            '.web.jsx',
            '.web.ts',
            '.web.tsx',
          ],
        },
      },
    },
  },
  {
    files: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
    rules: {
      'import/first': 'off',
    },
  },
]);
