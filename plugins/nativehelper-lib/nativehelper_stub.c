#include <dlfcn.h>
#include <jni.h>
#include <pthread.h>

/*
 * 16 KB-aligned libnativehelper for react-native-bare-kit.
 * NDK sysroot copies are 4 KB aligned (fail Android 15+ checks) and are empty
 * stubs. bare-kit needs real JNI_GetCreatedJavaVMs from ART at runtime.
 */

typedef jint (*GetCreatedJavaVMsFn)(JavaVM **, jsize, jsize *);
typedef jint (*CreateJavaVMFn)(JavaVM **, JNIEnv **, void *);
typedef jint (*GetDefaultJavaVMInitArgsFn)(void *);

static void *art_handle;
static GetCreatedJavaVMsFn art_get_created;
static CreateJavaVMFn art_create;
static GetDefaultJavaVMInitArgsFn art_get_default_args;
static pthread_once_t init_once = PTHREAD_ONCE_INIT;

static void init_jni_invocation(void) {
  art_handle = dlopen("libart.so", RTLD_NOW | RTLD_NODELETE);
  if (art_handle == NULL) {
    return;
  }

  art_get_created =
      (GetCreatedJavaVMsFn)dlsym(art_handle, "JNI_GetCreatedJavaVMs");
  art_create = (CreateJavaVMFn)dlsym(art_handle, "JNI_CreateJavaVM");
  art_get_default_args =
      (GetDefaultJavaVMInitArgsFn)dlsym(art_handle, "JNI_GetDefaultJavaVMInitArgs");
}

static void ensure_init(void) {
  pthread_once(&init_once, init_jni_invocation);
}

__attribute__((visibility("default")))
jobject AFileDescriptor_create(void) {
  return NULL;
}

__attribute__((visibility("default")))
int AFileDescriptor_getFd(void) {
  return 0;
}

__attribute__((visibility("default")))
void AFileDescriptor_setFd(void) {}

__attribute__((visibility("default")))
jint JNI_CreateJavaVM(JavaVM **p_vm, JNIEnv **p_env, void *vm_args) {
  ensure_init();
  if (art_create != NULL) {
    return art_create(p_vm, p_env, vm_args);
  }
  return JNI_ERR;
}

__attribute__((visibility("default")))
jint JNI_GetDefaultJavaVMInitArgs(void *vm_args) {
  ensure_init();
  if (art_get_default_args != NULL) {
    return art_get_default_args(vm_args);
  }
  return JNI_ERR;
}

__attribute__((visibility("default")))
jint JNI_GetCreatedJavaVMs(JavaVM **vmBuf, jsize bufLen, jsize *nVMs) {
  ensure_init();
  if (art_get_created != NULL) {
    return art_get_created(vmBuf, bufLen, nVMs);
  }
  if (nVMs != NULL) {
    *nVMs = 0;
  }
  return JNI_ERR;
}
