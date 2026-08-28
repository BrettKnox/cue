/**
 * Invented conversations for screenshots, seeded through the real database.
 *
 * Portfolio and store images must never contain someone's actual conversations — the first
 * batch of captures pulled in real family names and had to be thrown away. This seeds a
 * small, obviously fictional set instead, so the marketing images show the shipping code
 * running over made-up inputs rather than anyone's private life.
 *
 * **It cannot run in a shipped app.** Cue ships to Google Play as an Android build, and this
 * requires BOTH `Platform.OS === 'web'` and `?demo=1` in the URL. The web export exists only
 * as a test and capture lane, so no route through the store build can reach this. (An earlier
 * version also required `__DEV__`, which was the wrong gate: `expo export` produces a
 * production bundle, so it disabled the seeder in exactly the build used for captures.)
 */
import { Platform } from 'react-native';

import * as db from '@/db';

type Seed = {
  minutesAgo: number;
  title: string;
  summary: string;
  people: string[];
  lines: string[];
};

const SEEDS: Seed[] = [
  {
    minutesAgo: 34,
    title: 'Roof quote and photo send',
    summary:
      'Dan quoted $4,200 all-in for the roof and will hold that price until the end of the '
      + 'month. You agreed to send him photos of the flashing tomorrow morning. Sarah wants to '
      + 'see the quote before anything is signed.',
    people: ['Dan', 'Sarah'],
    lines: [
      'So Dan quoted four thousand two hundred for the roof, all in.',
      "I said I'd send him the photos of the flashing tomorrow morning.",
      "He'll hold that price until the end of the month.",
      'Sarah wants to see it before we sign anything.',
    ],
  },
  {
    minutesAgo: 190,
    title: 'Cardiology follow-up',
    summary:
      'Dr Whitfield is happy with the bloodwork and is halving the dose rather than stopping '
      + 'it. You agreed to keep a log of the dizzy spells with the time of day. Next appointment '
      + 'is in six weeks; the clinic will call to confirm.',
    people: ['Dr Whitfield'],
    lines: [
      'The bloodwork came back and everything there looks good.',
      "We're going to halve the dose rather than stop it altogether.",
      "If the dizziness comes back, write down what time of day it happens.",
      "We'll see you in about six weeks, the front desk will call you.",
    ],
  },
  {
    minutesAgo: 1520,
    title: 'Standup, blocked on auth',
    summary:
      'Priya is blocked on the auth migration until the staging keys land. You agreed to get '
      + 'them to her before end of day. The release moves to Thursday.',
    people: ['Priya', 'Marcus'],
    lines: [
      "I'm still blocked on the auth migration.",
      "It's the staging keys, I can't test the refresh flow without them.",
      "I'll get those over to you before end of day.",
      "Then let's move the release to Thursday and not rush it.",
    ],
  },
];

/** True only when this is the capture build. */
export function demoRequested(): boolean {
  if (Platform.OS !== 'web') return false;
  try {
    return new URLSearchParams(window.location.search).get('demo') === '1';
  } catch {
    return false;
  }
}

/** Seed once. Existing data is left alone, so this cannot destroy anything. */
export async function seedDemo(): Promise<void> {
  if (!demoRequested()) return;
  if ((await db.conversations()).length > 0) return;

  const now = Date.now();
  for (const s of [...SEEDS].reverse()) {
    const id = await db.startConversation(s.title);
    for (const line of s.lines) await db.addUtterance(id, line);
    await db.setSummary(id, s.summary, s.title);
    await db.attachNames(id, s.people);
    await db.setStartedAt(id, now - s.minutesAgo * 60_000);
  }
  await db.setPersonNotes(
    (await db.personByName('Dan')) ?? 0,
    'Roofer. Prefers a phone call over email, and answers early mornings.',
  );
}
