#!/usr/bin/env bash
# Rebuild libbare-kit.so for Android with Reno Pay JVM attach fix (arm64-v8a).
# Requires: Node.js, Android NDK (27+), CMake 3.22+, npm.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR="$ROOT/vendor/bare-kit"
PATCH_EVENTS="$ROOT/patches/bare-kit/android-events.c"
OUT_DIR="$ROOT/node_modules/react-native-bare-kit/android/libs/bare-kit/jni/arm64-v8a"
ABI="arm64-v8a"

source "$ROOT/scripts/android-env.sh"

if [ ! -f "$PATCH_EVENTS" ]; then
  echo "[build-bare-kit] Missing patch: $PATCH_EVENTS"
  exit 1
fi

NDK_HOME="${ANDROID_NDK_HOME:-${NDK_HOME:-}}"
if [ -z "$NDK_HOME" ]; then
  NDK_HOME="$(ls -d "$ANDROID_HOME/ndk/"* 2>/dev/null | sort -V | tail -1)"
fi
if [ ! -d "$NDK_HOME" ]; then
  echo "[build-bare-kit] Android NDK not found. Set ANDROID_NDK_HOME."
  exit 1
fi

if [ ! -d "$VENDOR/.git" ]; then
  echo "[build-bare-kit] Cloning bare-kit into vendor/bare-kit..."
  git clone --depth 1 https://github.com/holepunchto/bare-kit.git "$VENDOR"
fi

echo "[build-bare-kit] Installing bare-kit build deps..."
(cd "$VENDOR" && npm install --no-fund --no-audit)

cp "$PATCH_EVENTS" "$VENDOR/shared/android/events.c"

# Patch CMake JNI linking when upstream still uses use_java() + JNI::NativeHelper.
python3 <<'PY'
from pathlib import Path

cmake = Path("/home/linux/Desktop/renopay/vendor/bare-kit/shared/CMakeLists.txt")
text = cmake.read_text()

if "find_package(JNI REQUIRED)" in text and "${JNI_LIBRARIES}" in text:
    print("[build-bare-kit] CMake JNI patch already applied — skipping")
else:
    old = """  use_java()

  target_link_libraries(
    bare_worklet
    PRIVATE
      android
      JNI::NativeHelper
  )"""
    new = """  find_package(JNI REQUIRED)

  target_link_libraries(
    bare_worklet
    PRIVATE
      android
      ${JNI_LIBRARIES}
  )

  target_link_options(
    bare_worklet
    PRIVATE
      "LINKER:--allow-shlib-undefined"
  )"""
    if old not in text:
        raise SystemExit("shared/CMakeLists.txt Android JNI block changed upstream — manual update needed")
    cmake.write_text(text.replace(old, new))
    print("[build-bare-kit] Applied CMake JNI patch")
PY

BUILD_DIR="$VENDOR/build/android-$ABI"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo "[build-bare-kit] Configuring CMake (NDK=$NDK_HOME, ABI=$ABI)..."
cmake -S "$VENDOR" -B "$BUILD_DIR" \
  -DCMAKE_TOOLCHAIN_FILE="$NDK_HOME/build/cmake/android.toolchain.cmake" \
  -DANDROID_ABI="$ABI" \
  -DANDROID_PLATFORM=android-29 \
  -DANDROID_STL=c++_shared \
  -DCMAKE_BUILD_TYPE=RelWithDebInfo

echo "[build-bare-kit] Building libbare-kit.so (this may take several minutes)..."
cmake --build "$BUILD_DIR" --target bare_kit -j"$(nproc)"

BUILT_SO="$(find "$BUILD_DIR" -name 'libbare-kit.so' -type f | head -1)"
if [ -z "$BUILT_SO" ] || [ ! -f "$BUILT_SO" ]; then
  echo "[build-bare-kit] Build finished but libbare-kit.so was not found."
  exit 1
fi

mkdir -p "$OUT_DIR"
cp "$BUILT_SO" "$OUT_DIR/libbare-kit.so"

echo "[build-bare-kit] Installed $OUT_DIR/libbare-kit.so"
nm -D "$OUT_DIR/libbare-kit.so" | grep -E 'bare_worklet_android_attach_vm|bare_kit__on_thread_enter' || true
