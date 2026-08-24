/**
 * Turning platform speech-error codes into something a person can act on.
 *
 * The platform hands back things like "Other client side errors" and "error_2" — useless
 * to anyone, and worse than useless to someone who needs this app to be legible. Say what
 * happened and what to do about it. Import-free so `checks.ts` runs it under plain node.
 */
export function humanError(code: string, message?: string): string | null {
  switch (code) {
    case 'no-speech':
      return null;                       // fires constantly in a quiet room; not a failure
    case 'aborted':
      return null;                       // we stopped it on purpose
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Cue does not have permission to use the microphone. You can grant it in Android Settings.';
    case 'audio-capture':
      return 'The microphone is not available. Another app may be using it.';
    case 'network':
      return 'The recogniser wanted the network. Cue is set to stay on-device, so recording stopped.';
    case 'language-not-supported':
      return 'That language is not installed for offline recognition. Pick another in Settings.';
    case 'busy':
      return 'The speech recogniser is busy. Give it a second and try again.';
    case 'client':
      return 'The speech recogniser stopped unexpectedly. Tap Listen to start it again.';
    default:
      // Never surface a raw platform string; keep it only where it can be debugged.
      return 'The speech recogniser stopped unexpectedly. Tap Listen to start it again.';
  }
}
