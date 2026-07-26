#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG="$ROOT/node_modules/react-native-bare-kit"
PATCH_DIR="$ROOT/patches/react-native-bare-kit"

if [ ! -d "$PKG" ]; then
  echo "[patch-bare-kit] react-native-bare-kit not installed; skipping."
  exit 0
fi

cp "$PATCH_DIR/BareKitModuleAndroid.cc" "$PKG/android/BareKitModuleAndroid.cc"
cp "$PATCH_DIR/BareKitModuleDefault.cc" "$PKG/shared/BareKitModuleDefault.cc"
cp "$PATCH_DIR/BareKitModule.h" "$PKG/shared/BareKitModule.h"

ROOT="$ROOT" PKG="$PKG" python3 <<'PY'
import os
from pathlib import Path

root = Path(os.environ["ROOT"])
pkg = Path(os.environ["PKG"])

cmake_path = pkg / "android/CMakeLists.txt"
cmake = cmake_path.read_text()

sources_block = """target_sources(
  react-native-bare-kit
  PRIVATE
    BareKitModuleAndroid.cc
    ../shared/BareKitModule.cc
    ../shared/BareKitModuleDefault.cc
    ../shared/BareKitModule.h
)"""

import re
if "../shared/BareKitModuleDefault.cc" not in cmake:
    cmake = re.sub(
        r"target_sources\(\s*react-native-bare-kit\s*PRIVATE[\s\S]*?\)",
        sources_block,
        cmake,
        count=1,
    )

cmake = cmake.replace("    BareKitAndroidVmAttach.c\n", "")
cmake_path.write_text(cmake)

module_cc_path = pkg / "shared/BareKitModule.cc"
module_cc = module_cc_path.read_text()

old_ctor = (
    "    std::shared_ptr<CallInvoker> jsInvoker\n"
    "  )\n"
    "      : on_terminate(rt, std::move(on_terminate), jsInvoker),"
)
new_ctor = (
    "    std::shared_ptr<CallInvoker> jsInvoker,\n"
    "    BareKitWorkletConfigure configure,\n"
    "    void *configureData\n"
    "  )\n"
    "      : on_terminate(rt, std::move(on_terminate), jsInvoker),"
)
if old_ctor in module_cc:
    module_cc = module_cc.replace(old_ctor, new_ctor)

old_init = (
    "    err = bare_worklet_init(worklet, &options);\n"
    "    assert(err == 0);\n\n"
    "    err = bare_worklet_on_suspend(worklet, on_suspend_, this);"
)
new_init = (
    "    err = bare_worklet_init(worklet, &options);\n"
    "    assert(err == 0);\n\n"
    "    if (configure) {\n"
    "      err = configure(worklet, configureData);\n"
    "      assert(err == 0);\n"
    "    }\n\n"
    "    err = bare_worklet_on_suspend(worklet, on_suspend_, this);"
)
if old_init in module_cc:
    module_cc = module_cc.replace(old_init, new_init)

module_ctor = (
    "BareKitModule::BareKitModule(\n"
    "  std::shared_ptr<CallInvoker> jsInvoker,\n"
    "  BareKitWorkletConfigure configure,\n"
    "  void *configureData)\n"
    "    : NativeBareKitCxxSpec(std::move(jsInvoker)),\n"
    "      configure_(configure),\n"
    "      configureData_(configureData) {}\n\n"
)
if "BareKitModule::BareKitModule(\n  std::shared_ptr<CallInvoker> jsInvoker,\n  BareKitWorkletConfigure configure" not in module_cc:
    module_cc = module_cc.replace(
        "} // namespace\n\nObject\nBareKitModule::init(",
        "} // namespace\n\n" + module_ctor + "Object\nBareKitModule::init(",
    )

old_module_ctor = (
    "BareKitModule::BareKitModule(std::shared_ptr<CallInvoker> jsInvoker)"
    " : NativeBareKitCxxSpec(std::move(jsInvoker)) {}\n\n"
)
module_cc = module_cc.replace(old_module_ctor, "")

old_make = (
    "    std::move(on_resume),\n"
    "    jsInvoker_\n"
    "  );"
)
new_make = (
    "    std::move(on_resume),\n"
    "    jsInvoker_,\n"
    "    configure_,\n"
    "    configureData_\n"
    "  );"
)
if old_make in module_cc:
    module_cc = module_cc.replace(old_make, new_make)

module_cc_path.write_text(module_cc)
PY

echo "[patch-bare-kit] Applied Android VM attach patch to react-native-bare-kit."
