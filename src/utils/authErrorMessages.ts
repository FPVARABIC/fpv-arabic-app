// Firebase Auth error-code -> Arabic map (Part B), modeled directly on
// src/components/Community/utils/functionsError.ts's exact convention: a
// typed guard, a code lookup, and a safe generic fallback for anything not
// explicitly mapped (never surface a raw Firebase code/message to the user).
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'هذا البريد الإلكتروني مستخدم بالفعل. جرّب تسجيل الدخول بدلاً من ذلك.',
  'auth/invalid-email':        'صيغة البريد الإلكتروني غير صحيحة.',
  'auth/weak-password':        'كلمة المرور ضعيفة جداً. يجب ألا تقل عن 6 أحرف.',
  'auth/user-not-found':       'لا يوجد حساب بهذا البريد الإلكتروني.',
  'auth/wrong-password':       'كلمة المرور غير صحيحة.',
  // Modern Firebase Auth SDK versions return this single code for both
  // wrong-password and user-not-found (a deliberate security choice — it
  // doesn't reveal whether the account exists), so both messages point to
  // the same safe, non-revealing text.
  'auth/invalid-credential':   'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  'auth/too-many-requests':    'محاولات كثيرة جداً. حاول مرة أخرى لاحقاً.',
  'auth/user-disabled':        'تم تعطيل هذا الحساب. تواصل مع الدعم.',
  'auth/network-request-failed': 'تعذّر الاتصال بالإنترنت. تحقق من اتصالك وحاول مرة أخرى.',
  // sendPasswordResetEmail-specific — defensive; the reset form itself
  // blocks an empty email client-side before ever calling Firebase.
  'auth/missing-email':        'أدخل بريدك الإلكتروني أولاً.',
};

const FALLBACK_MESSAGE = 'حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.';

function isAuthErrorLike(err: unknown): err is { code: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string' &&
    (err as { code: string }).code.startsWith('auth/')
  );
}

export function authErrorMessage(err: unknown): string {
  if (isAuthErrorLike(err) && AUTH_ERROR_MESSAGES[err.code]) {
    return AUTH_ERROR_MESSAGES[err.code];
  }
  return FALLBACK_MESSAGE;
}
