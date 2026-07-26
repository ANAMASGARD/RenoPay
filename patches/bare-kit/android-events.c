#include <assert.h>
#include <jni.h>
#include <pthread.h>
#include <stddef.h>

#include "../events.h"

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

static JavaVM *
bare_kit__get_java_vm(void) {
  JavaVM *attached;

  pthread_mutex_lock(&g_worklet_java_vm_mutex);
  attached = g_worklet_java_vm;
  pthread_mutex_unlock(&g_worklet_java_vm_mutex);

  if (attached != NULL) {
    return attached;
  }

  JavaVM *vm;
  jsize len;

  jint err = JNI_GetCreatedJavaVMs(&vm, 1, &len);
  assert(err == JNI_OK);
  assert(len == 1);

  return vm;
}

static void
bare_kit__set_context_class_loader(JNIEnv *env) {
  jclass thread_class = (*env)->FindClass(env, "java/lang/Thread");
  assert(thread_class != NULL);

  jmethodID current_thread = (*env)->GetStaticMethodID(env, thread_class, "currentThread", "()Ljava/lang/Thread;");
  assert(current_thread != NULL);

  jobject thread = (*env)->CallStaticObjectMethod(env, thread_class, current_thread);
  assert(thread != NULL);
  assert(!(*env)->ExceptionCheck(env));

  jclass activity_thread_class = (*env)->FindClass(env, "android/app/ActivityThread");
  assert(activity_thread_class != NULL);

  jmethodID current_application = (*env)->GetStaticMethodID(env, activity_thread_class, "currentApplication", "()Landroid/app/Application;");
  assert(current_application != NULL);

  jobject application = (*env)->CallStaticObjectMethod(env, activity_thread_class, current_application);
  assert(application != NULL);
  assert(!(*env)->ExceptionCheck(env));

  jclass application_class = (*env)->GetObjectClass(env, application);
  assert(application_class != NULL);

  jmethodID get_class_loader = (*env)->GetMethodID(env, application_class, "getClassLoader", "()Ljava/lang/ClassLoader;");
  assert(get_class_loader != NULL);

  jobject class_loader = (*env)->CallObjectMethod(env, application, get_class_loader);
  assert(class_loader != NULL);
  assert(!(*env)->ExceptionCheck(env));

  jmethodID set_context_class_loader = (*env)->GetMethodID(env, thread_class, "setContextClassLoader", "(Ljava/lang/ClassLoader;)V");
  assert(set_context_class_loader != NULL);

  (*env)->CallVoidMethod(env, thread, set_context_class_loader, class_loader);
  assert(!(*env)->ExceptionCheck(env));

  (*env)->DeleteLocalRef(env, class_loader);
  (*env)->DeleteLocalRef(env, application_class);
  (*env)->DeleteLocalRef(env, application);
  (*env)->DeleteLocalRef(env, activity_thread_class);
  (*env)->DeleteLocalRef(env, thread);
  (*env)->DeleteLocalRef(env, thread_class);
}

void
bare_kit__on_thread_enter(bare_worklet_state_t *state) {
  (void) state;

  int err;

  JavaVM *vm = bare_kit__get_java_vm();

  JNIEnv *env;
  err = (*vm)->GetEnv(vm, (void **) &env, JNI_VERSION_1_6);
  assert(err == JNI_EDETACHED);

  JavaVMAttachArgs args = {
    JNI_VERSION_1_6,
    "bare-worklet",
    NULL,
  };

  err = (*vm)->AttachCurrentThread(vm, &env, &args);
  assert(err == JNI_OK);

  bare_kit__set_context_class_loader(env);
}

void
bare_kit__on_thread_exit(bare_worklet_state_t *state) {
  (void) state;

  int err;

  JavaVM *vm = bare_kit__get_java_vm();

  JNIEnv *env;
  err = (*vm)->GetEnv(vm, (void **) &env, JNI_VERSION_1_6);
  assert(err == JNI_OK);

  err = (*vm)->DetachCurrentThread(vm);
  assert(err == JNI_OK);
}
