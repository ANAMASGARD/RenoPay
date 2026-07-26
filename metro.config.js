const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { configureMetroForWDK } = require('./metro.wdk-polyfills');

const config = getDefaultConfig(__dirname);

const blockList = config.resolver.blockList;
const bareKitBuildBlock = /vendor\/bare-kit\/build\/.*/;
const nativeHelperBuildBlock = /plugins\/nativehelper-lib\/build\/.*/;

config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
  blockList: Array.isArray(blockList)
    ? [...blockList, bareKitBuildBlock, nativeHelperBuildBlock]
    : blockList
      ? [blockList, bareKitBuildBlock, nativeHelperBuildBlock]
      : [bareKitBuildBlock, nativeHelperBuildBlock],
};

module.exports = configureMetroForWDK(config);
