/**
 * Live transcription on the platform's own recogniser (Android SpeechRecognizer /
 * iOS Speech / Web Speech API). No model download, no server, no per-minute cost.
 *
 * **On-device is the product promise, not a nicety.** Android's default recogniser
 * streams audio to Google unless you ask it not to, so this hook asks for the offline
 * engine explicitly and reports which one it actually got. `onDeviceOnly` (the default)
 * refuses to start rather than quietly uploading a private conversation — a doctor's
 * appointment must not go to a server because a language pack was missing.
 *
 * The other thing that bites: `continuous: true` is best-effort. Both platforms end the
 * session on a long silence, so the hook restarts itself whenever it sees `end` while the
 * user still wants to be recording.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

import { humanError } from '@/speechError';

export { humanError };

/** Google's on-device recogniser. The default service is the cloud one. */
export const ON_DEVICE_PACKAGE = 'com.google.android.as';

export type TranscribeOptions = {
  lang?: string;
  /** Called once per finalised chunk — this is what gets persisted. */
  onFinal?: (text: string) => void;
  /** Refuse to fall back to cloud recognition. Default true. */
  onDeviceOnly?: boolean;
  /** Input level, roughly -2..10. Below 0 is inaudible. */
  onLevel?: (value: number) => void;
};

// ponytail: fixed backoff. If a device turns out to thrash, make it exponential —
// the physical world (mic drivers, recogniser services) needs a knob here.
const RESTART_DELAY_MS = 300;

const androidOnly = <T,>(v: T): T | undefined => (Platform.OS === 'android' ? v : undefined);


export function useTranscription({
  lang = 'en-US',
  onFinal,
  onDeviceOnly = true,
  onLevel,
}: TranscribeOptions = {}) {
  const [recording, setRecording] = useState(false);
  const [partial, setPartial] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** null until probed; true = audio stays on the device. */
  const [onDevice, setOnDevice] = useState<boolean | null>(null);

  // Refs so the event handlers never close over a stale value.
  const wanted = useRef(false);
  const finalCb = useRef(onFinal);
  finalCb.current = onFinal;
  const levelCb = useRef(onLevel);
  levelCb.current = onLevel;
  const onDeviceRef = useRef<boolean>(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Can this device run [lang] offline right now? */
  const probe = useCallback(async (): Promise<boolean> => {
    try {
      if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) return false;
      if (Platform.OS !== 'android') return true;   // iOS decides per-device, no locale list
      const { installedLocales } = await ExpoSpeechRecognitionModule.getSupportedLocales({
        androidRecognitionServicePackage: ON_DEVICE_PACKAGE,
      });
      // Locale tags vary in case and separator between devices; compare loosely.
      const want = lang.toLowerCase().replace('_', '-');
      return installedLocales.some((l) => l.toLowerCase().replace('_', '-') === want);
    } catch {
      return false;   // a throwing probe means "assume not offline", never "assume yes"
    }
  }, [lang]);

  useEffect(() => {
    let alive = true;
    void probe().then((ok) => { if (alive) { setOnDevice(ok); onDeviceRef.current = ok; } });
    return () => { alive = false; };
  }, [probe]);

  const begin = useCallback(() => {
    const offline = onDeviceRef.current;
    ExpoSpeechRecognitionModule.start({
      lang,
      interimResults: true,
      continuous: true,
      requiresOnDeviceRecognition: offline,
      addsPunctuation: true,
      androidRecognitionServicePackage: offline ? androidOnly(ON_DEVICE_PACKAGE) : undefined,
      volumeChangeEventOptions: onLevel ? { enabled: true, intervalMillis: 150 } : undefined,
    });
  }, [lang, onLevel]);

  const start = useCallback(async () => {
    setError(null);
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setError('Cue needs microphone and speech permission to transcribe.');
      return false;
    }

    let offline = await probe();
    if (!offline && onDeviceOnly && Platform.OS === 'android') {
      // Offer the download rather than silently going to the cloud.
      try {
        const r = await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({ locale: lang });
        offline = r.status === 'download_success';
        setError(offline ? null : 'Downloading the offline language pack. Try again once it finishes.');
      } catch {
        setError('This device cannot transcribe offline yet. Turn off "Keep audio on device" in Settings to use cloud recognition.');
      }
      if (!offline) return false;
    }
    setOnDevice(offline);
    onDeviceRef.current = offline;

    wanted.current = true;
    setRecording(true);
    begin();
    return true;
  }, [begin, lang, onDeviceOnly, probe]);

  const stop = useCallback(() => {
    wanted.current = false;              // set BEFORE stopping, or `end` restarts us
    if (timer.current) clearTimeout(timer.current);
    ExpoSpeechRecognitionModule.stop();
    setRecording(false);
    setPartial('');
  }, []);

  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results?.[0]?.transcript ?? '';
    if (e.isFinal) {
      setPartial('');
      if (text.trim()) finalCb.current?.(text);
    } else {
      setPartial(text);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (!wanted.current) return;         // a real stop, leave it stopped
    timer.current = setTimeout(begin, RESTART_DELAY_MS);
  });

  useSpeechRecognitionEvent('volumechange', (e) => {
    levelCb.current?.(e.value);
  });

  useSpeechRecognitionEvent('error', (e) => {
    const friendly = humanError(e.error, e.message);
    if (friendly === null) return;      // expected noise, not something to show anyone
    setError(friendly);
    // Only stop for the errors that will not fix themselves; the rest auto-restart.
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed'
        || e.error === 'audio-capture' || e.error === 'language-not-supported') {
      wanted.current = false;
      setRecording(false);
    }
  });

  useEffect(() => () => {                // unmount: never leave the mic hot
    wanted.current = false;
    if (timer.current) clearTimeout(timer.current);
    ExpoSpeechRecognitionModule.stop();
  }, []);

  /** Dismiss a stale error — a recogniser hiccup should not outlive a successful recap. */
  const clearError = useCallback(() => setError(null), []);

  return { recording, partial, error, onDevice, start, stop, clearError };
}
