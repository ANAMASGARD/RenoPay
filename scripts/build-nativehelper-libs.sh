#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT/plugins/nativehelper-lib"
OUT_DIR="$SRC_DIR/prebuilt"
MIN_SDK="${MIN_SDK:-29}"

resolve_ndk_home() {
  if [ -n "${ANDROID_NDK_HOME:-}" ] && [ -f "$ANDROID_NDK_HOME/build/cmake/android.toolchain.cmake" ]; then
    echo "$ANDROID_NDK_HOME"
    return
  fi
  if [ -n "${NDK_HOME:-}" ] && [ -f "$NDK_HOME/build/cmake/android.toolchain.cmake" ]; then
    echo "$NDK_HOME"
    return
  fi

  local sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
  local ndk_root="$sdk_root/ndk"
  if [ ! -d "$ndk_root" ]; then
    echo "Android NDK not found under $ndk_root" >&2
    exit 1
  fi

  local version
  while IFS= read -r version; do
    if [ -f "$ndk_root/$version/build/cmake/android.toolchain.cmake" ]; then
      echo "$ndk_root/$version"
      return
    fi
  done < <(ls -1 "$ndk_root" | sort -V | tac)

  echo "No complete Android NDK installation found under $ndk_root" >&2
  exit 1
}

build_with_cmake() {
  local jni_abi="$1"
  local android_abi="$2"
  local build_dir="$SRC_DIR/build/$jni_abi"

  rm -rf "$build_dir"
  mkdir -p "$build_dir"

  "$CMAKE" -S "$SRC_DIR" -B "$build_dir" \
    -DCMAKE_TOOLCHAIN_FILE="$TOOLCHAIN" \
    -DANDROID_ABI="$android_abi" \
    -DANDROID_PLATFORM="android-$MIN_SDK" \
    -DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON \
    -DCMAKE_BUILD_TYPE=Release \
    >&2

  "$CMAKE" --build "$build_dir" --config Release >&2

  find "$build_dir" -name 'libnativehelper.so' -print -quit
}

NDK_HOME="$(resolve_ndk_home)"
TOOLCHAIN="$NDK_HOME/build/cmake/android.toolchain.cmake"
CMAKE="${CMAKE:-cmake}"

if [ ! -f "$TOOLCHAIN" ]; then
  echo "Missing NDK toolchain file: $TOOLCHAIN" >&2
  exit 1
fi

declare -A ABI_MAP=(
  [arm64-v8a]=arm64-v8a
  [armeabi-v7a]=armeabi-v7a
  [x86_64]=x86_64
  [x86]=x86
)

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

for jni_abi in "${!ABI_MAP[@]}"; do
  android_abi="${ABI_MAP[$jni_abi]}"
  vendor_so="$SRC_DIR/vendor/$jni_abi/libnativehelper.so"
  mkdir -p "$OUT_DIR/$jni_abi"

  if [ -f "$vendor_so" ]; then
    cp "$vendor_so" "$OUT_DIR/$jni_abi/libnativehelper.so"
    echo "Vendored $jni_abi -> $OUT_DIR/$jni_abi/libnativehelper.so"
    continue
  fi

  so_path="$(build_with_cmake "$jni_abi" "$android_abi")"
  if [ -z "$so_path" ]; then
    echo "Build failed: libnativehelper.so not found for $jni_abi" >&2
    exit 1
  fi

  cp "$so_path" "$OUT_DIR/$jni_abi/libnativehelper.so"
  echo "Built $jni_abi -> $OUT_DIR/$jni_abi/libnativehelper.so"
done

echo "Native helper prebuilts ready in $OUT_DIR"
