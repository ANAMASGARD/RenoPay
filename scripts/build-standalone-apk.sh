#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
source scripts/android-env.sh

PACKAGE_ID="com.anonymous.renopay"
INSTALL_ON_DEVICE="${INSTALL:-0}"
# Lower Gradle memory + workers so the laptop stays responsive.
export GRADLE_OPTS="${GRADLE_OPTS:--Xmx1536m -XX:MaxMetaspaceSize=384m -Dorg.gradle.workers.max=2}"

adb_cmd() {
  if [ -n "${ANDROID_SERIAL:-}" ]; then
    adb -s "$ANDROID_SERIAL" "$@"
  else
    adb "$@"
  fi
}

echo "=== Reno Pay standalone APK (release) ==="
echo ""
echo "Embeds JavaScript inside the APK — no Metro, no USB, no Development Build screen."
echo "Use this for demo phones and hackathon submission. NOT app-debug.apk."
echo ""

echo "Regenerating WDK bundle..."
npm run generate:wdk

echo ""
echo "Building release APK (first run: 10–25 min; Gradle uses low memory so your PC stays usable)..."
cd android
nice -n 10 ./gradlew :app:assembleRelease --no-daemon --max-workers=2

APK_PATH="$(pwd)/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK_PATH" ]; then
  echo "ERROR: Release APK not found at $APK_PATH"
  exit 1
fi

echo ""
echo "=== Standalone APK ready ==="
ls -lh "$APK_PATH"
echo ""
echo "Share or sideload this file (works offline from your laptop after install):"
echo "  $APK_PATH"
echo ""

if [ "$INSTALL_ON_DEVICE" = "1" ]; then
  if ! adb devices | awk '/device$/{print $1}' | grep -q .; then
    echo "No USB device connected — copy the APK manually or run: INSTALL=1 npm run android:standalone-apk"
    exit 0
  fi
  echo "Replacing dev-client install with standalone release..."
  adb_cmd uninstall "$PACKAGE_ID" >/dev/null 2>&1 || true
  adb_cmd install -r "$APK_PATH"
  adb_cmd shell am start -n "$PACKAGE_ID/.MainActivity" >/dev/null 2>&1 || true
  echo "Installed and launched on device."
fi
