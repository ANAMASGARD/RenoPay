#include <assert.h>
#include <jni.h>
#include <pthread.h>
#include <stddef.h>

typedef struct bare_worklet_s bare_worklet_t;

static JavaVM *g_worklet_java_vm = NULL;
static pthread_mutex_t g_worklet_java_vm_mutex = PTHREAD_MUTEX_INITIALIZER;

int
bare_worklet_android_attach_vm(bare_worklet_t *worklet, JavaVM *java_vm) {
  (void) worklet;

  assert(java_vm != NULL);

  pthread_mutex_lock(&g_worklet_java_vm_mutex);
  g_worklet_java_vm = java_vm;
  pthread_mutex_unlock(&g_worklet_java_vm_mutex);

  return 0;
}

JavaVM *
bare_kit_android_get_attached_java_vm(void) {
  JavaVM *java_vm;

  pthread_mutex_lock(&g_worklet_java_vm_mutex);
  java_vm = g_worklet_java_vm;
  pthread_mutex_unlock(&g_worklet_java_vm_mutex);

  return java_vm;
}
