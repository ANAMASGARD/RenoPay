#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
source scripts/android-env.sh

PACKAGE_ID="com.anonymous.renopay"
CLEAN_PREBUILD="${CLEAN_PREBUILD:-0}"
REGENERATE_BUNDLES="${REGENERATE_BUNDLES:-0}"

echo "=== Reno Pay Android runner ==="
echo "ANDROID_HOME=$ANDROID_HOME"
echo ""
echo "IMPORTANT: Reno Pay cannot run in Expo Go."
echo "Open the 'renopay' app on your phone — NOT 'Expo Go'."
echo "Expo Go will crash with PlatformConstants / runtime-not-ready errors."
echo ""
echo "This script installs a DEVELOPMENT BUILD (needs Metro + USB)."
echo "For a phone that runs WITHOUT your laptop, use: npm run android:install-standalone"
echo ""

adb_cmd() {
  if [ -n "${ANDROID_SERIAL:-}" ]; then
    adb -s "$ANDROID_SERIAL" "$@"
  else
    adb "$@"
  fi
}

resolve_android_serial() {
  if [ -n "${ANDROID_SERIAL:-}" ]; then
    if ! adb_cmd get-state >/dev/null 2>&1; then
      echo "ANDROID_SERIAL=$ANDROID_SERIAL is not authorized or not connected."
      exit 1
    fi
    echo "$ANDROID_SERIAL"
    return
  fi

  mapfile -t authorized_devices < <(adb devices | awk '/device$/{print $1}')
  if [ "${#authorized_devices[@]}" -eq 0 ]; then
    echo ""
    echo "No authorized device. Enable USB debugging and re-run: npm run android:device"
    exit 1
  fi
  if [ "${#authorized_devices[@]}" -gt 1 ]; then
    echo ""
    echo "Multiple devices connected. Set ANDROID_SERIAL to one of:"
    adb devices -l
    exit 1
  fi
  echo "${authorized_devices[0]}"
}

resolve_device_name() {
  local serial="$1"
  local model
  model="$(adb devices -l | awk -v serial="$serial" '
    $1 == serial {
      for (i = 1; i <= NF; i++) {
        if ($i ~ /^model:/) {
          sub(/^model:/, "", $i)
          print $i
          exit
        }
      }
    }
  ')"
  if [ -n "$model" ]; then
    echo "$model"
    return
  fi
  echo "$serial"
}

adb kill-server >/dev/null 2>&1 || true
adb start-server

echo "Waiting for Android device (30s)..."
for _ in $(seq 1 30); do
  if adb devices | grep -v "List" | grep -q "device$"; then
    break
  fi
  if adb devices | grep -q "unauthorized"; then
    echo ""
    echo ">>> Phone shows as UNAUTHORIZED."
    echo ">>> Unlock screen → tap 'Allow USB debugging' → check 'Always allow'"
    echo ""
  fi
  sleep 1
done

ANDROID_SERIAL="$(resolve_android_serial)"
export ANDROID_SERIAL
DEVICE_NAME="$(resolve_device_name "$ANDROID_SERIAL")"

echo "Target device serial: $ANDROID_SERIAL"
echo "Target device name: $DEVICE_NAME"
adb devices -l

if adb shell pm list packages 2>/dev/null | grep -q "host.exp.exponent"; then
  echo ""
  echo "NOTE: Expo Go is installed on this device."
  echo "Do NOT use Expo Go for Reno Pay — open the renopay dev client app instead."
  echo ""
fi

echo "Forwarding Metro port over USB (required for physical devices)..."
adb_cmd reverse tcp:8081 tcp:8081

if [ "$REGENERATE_BUNDLES" = "1" ]; then
  echo "Regenerating WDK bundle..."
  npm run generate:wdk
fi

if [ "$CLEAN_PREBUILD" = "1" ]; then
  echo "Building patched libbare-kit for arm64 (WDK JVM attach fix)..."
  npm run build:bare-kit
  bash scripts/patch-bare-kit-android-vm.sh
  echo "Running clean Android prebuild (fixes stale native/JS mismatch)..."
  npx expo prebuild --clean --platform android
fi

echo "Removing old install to avoid stale native/JS mismatch..."
adb_cmd uninstall "$PACKAGE_ID" >/dev/null 2>&1 || true

echo "Building and installing dev client (first run takes 15-40 min)..."
export REACT_NATIVE_PACKAGER_HOSTNAME=localhost
npx expo run:android --device "$DEVICE_NAME" --no-build-cache

echo "Launching Reno Pay dev client on device..."
adb_cmd shell am start -n "$PACKAGE_ID/.MainActivity" >/dev/null 2>&1 || true
