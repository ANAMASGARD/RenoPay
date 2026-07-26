cmake_minimum_required(VERSION 3.22)
project(nativehelper LANGUAGES C)

add_library(nativehelper SHARED nativehelper_stub.c)

set_target_properties(nativehelper PROPERTIES
  OUTPUT_NAME "nativehelper"
  C_STANDARD 11
  C_STANDARD_REQUIRED ON
)

target_link_options(nativehelper PRIVATE
  "-Wl,--version-script=${CMAKE_CURRENT_SOURCE_DIR}/libnativehelper.map"
)

target_link_libraries(nativehelper PRIVATE dl)
