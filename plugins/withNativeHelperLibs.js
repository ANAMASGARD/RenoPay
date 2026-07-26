const { withDangerousMod } = require('@expo/config-plugins');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/** ABIs react-native-bare-kit ships for Reno Pay dev client builds. */
const ABIS = ['arm64-v8a', 'armeabi-v7a', 'x86_64', 'x86'];

function buildNativeHelperPrebuilts(projectRoot) {
  const scriptPath = path.join(projectRoot, 'scripts/build-nativehelper-libs.sh');
  execFileSync('bash', [scriptPath], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
  });
}

function resolvePrebuiltDir(projectRoot) {
  return path.join(projectRoot, 'plugins/nativehelper-lib/prebuilt');
}

/**
 * react-native-bare-kit links against libnativehelper.so, which is not exposed on
 * newer Android builds. Ship a 16 KB-aligned stub inside the APK so libappmodules.so loads.
 */
function withNativeHelperLibs(config) {
  return withDangerousMod(config, [
    'android',
    async (configMod) => {
      const projectRoot = configMod.modRequest.projectRoot;
      const prebuiltDir = resolvePrebuiltDir(projectRoot);

      try {
        buildNativeHelperPrebuilts(projectRoot);
      } catch (error) {
        console.warn(
          `[withNativeHelperLibs] Failed to build libnativehelper.so: ${error.message}`,
        );
        return configMod;
      }

      const jniLibsRoot = path.join(projectRoot, 'android/app/src/main/jniLibs');
      let copied = 0;

      for (const abi of ABIS) {
        const src = path.join(prebuiltDir, abi, 'libnativehelper.so');
        if (!fs.existsSync(src)) {
          continue;
        }
        const destDir = path.join(jniLibsRoot, abi);
        fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(src, path.join(destDir, 'libnativehelper.so'));
        copied += 1;
      }

      if (copied === 0) {
        console.warn('[withNativeHelperLibs] No libnativehelper.so prebuilts were copied.');
      } else {
        console.log(
          `[withNativeHelperLibs] Bundled 16 KB-aligned libnativehelper.so for ${copied} ABIs.`,
        );
      }

      return configMod;
    },
  ]);
}

module.exports = withNativeHelperLibs;
