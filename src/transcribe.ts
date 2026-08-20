/**
 * Live transcription on the platform's own recogniser (Android SpeechRecognizer /
 * iOS Speech / Web Speech API). No model download, no server, no per-minute cost.
 *
 * The one thing that bites: `continuous: true` is best-effort. Both platforms still
 * end the session on a long silence, and Android's on-device recogniser has its own
 * idle timeout. So the hook restarts itself whenever it sees `end` while the user
 * still wants to be recording.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export type TranscribeOptions = {
  lang?: string;
  /** Called once per finalised chunk — this is what gets persisted. */
  onFinal?: (text: string) => void;
};

// ponytail: fixed backoff. If a device turns out to thrash, make it exponential —
// the physical world (mic drivers, recogniser services) needs a knob here.
const RESTART_DELAY_MS = 300;

export function useTranscription({ lang = 'en-US', onFinal }: TranscribeOptions = {}) {
  const [recording, setRecording] = useState(false);
  const [partial, setPartial] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs so the event handlers never close over a stale value.
  const wanted = useRef(false);
  const finalCb = useRef(onFinal);
  finalCb.current = onFinal;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const begin = useCallback(() => {
    ExpoSpeechRecognitionModule.start({
      lang,
      interimResults: true,
      continuous: true,
      requiresOnDeviceRecognition: false,
      addsPunctuation: true,
    });
  }, [lang]);

  const start = useCallback(async () => {
    setError(null);
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setError('Cue needs microphone and speech permission to transcribe.');
      return false;
    }
    wanted.current = true;
    setRecording(true);
    begin();
    return true;
  }, [begin]);

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

  useSpeechRecognitionEvent('error', (e) => {
    // "no-speech" fires constantly in a quiet room; it is not a failure worth showing.
    if (e.error === 'no-speech') return;
    setError(e.message || e.error);
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      wanted.current = false;
      setRecording(false);
    }
  });

  useEffect(() => () => {                // unmount: never leave the mic hot
    wanted.current = false;
    if (timer.current) clearTimeout(timer.current);
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { recording, partial, error, start, stop };
}
