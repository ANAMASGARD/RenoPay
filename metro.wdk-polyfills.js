/**
 * Local Metro polyfills for WDK — extracted from legacy provider config.
 * Keeps Node.js core module resolution working after removing wdk-react-native-provider.
 */

const path = require('path');

function getMetroPolyfills() {
  return {
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('@craftzdog/react-native-buffer'),
    crypto: require.resolve('react-native-crypto'),
    net: require.resolve('react-native-tcp-socket'),
    tls: require.resolve('react-native-tcp-socket'),
    url: require.resolve('react-native-url-polyfill'),
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    http2: require.resolve('http2-wrapper'),
    zlib: require.resolve('browserify-zlib'),
    path: require.resolve('path-browserify'),
    querystring: require.resolve('querystring-es3'),
    events: require.resolve('events'),
    'nice-grpc': require.resolve('nice-grpc-web'),
    'sodium-universal': require.resolve('sodium-javascript'),
  };
}

function configureMetroForWDK(config) {
  const polyfills = getMetroPolyfills();
  const projectRoot = path.resolve(__dirname);
  const existingResolveRequest = config.resolver?.resolveRequest;

  const wdkSourcePackages = {
    '@tetherto/wdk-react-native-core': path.resolve(
      projectRoot,
      'node_modules/@tetherto/wdk-react-native-core/src/index.ts',
    ),
    '@tetherto/wdk-react-native-secure-storage': path.resolve(
      projectRoot,
      'node_modules/@tetherto/wdk-react-native-secure-storage/src/index.ts',
    ),
  };

  config.resolver = {
    ...config.resolver,
    extraNodeModules: {
      ...config.resolver?.extraNodeModules,
      ...polyfills,
    },
    resolveRequest: (context, moduleName, platform) => {
      if (platform !== 'web' && wdkSourcePackages[moduleName]) {
        return {
          filePath: wdkSourcePackages[moduleName],
          type: 'sourceFile',
        };
      }
      if (moduleName === 'stream') {
        return {
          filePath: require.resolve('stream-browserify'),
          type: 'sourceFile',
        };
      }
      if (moduleName === 'url') {
        return {
          filePath: require.resolve('react-native-url-polyfill'),
          type: 'sourceFile',
        };
      }
      if (moduleName === 'react-native-svg') {
        return {
          filePath: path.resolve(projectRoot, 'node_modules/react-native-svg/lib/commonjs/index.js'),
          type: 'sourceFile',
        };
      }
      if (existingResolveRequest) {
        return existingResolveRequest(context, moduleName, platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  };

  return config;
}

module.exports = { getMetroPolyfills, configureMetroForWDK };
