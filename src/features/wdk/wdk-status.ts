export function getWdkUnavailableMessage(state: unknown): string | null {
  if (
    typeof state === 'object' &&
    state !== null &&
    'status' in state &&
    (state as { status: string }).status === 'UNAVAILABLE' &&
    'message' in state &&
    typeof (state as { message: unknown }).message === 'string'
  ) {
    return (state as { message: string }).message;
  }
  return null;
}
