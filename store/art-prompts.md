# Cue — art direction and image prompts

Everything here is one illustrator's hand. The failure mode to avoid is a folder of images
that each look fine and together look like stock: same subject, five different styles, three
different line weights, one inexplicably 3D. Read the style bible first; every prompt below
assumes it.

**Deliverable spec** (matters more than it sounds — the app tints these at runtime):

- PNG, **transparent background**, **pure black ink only**. No white paper, no colour, no
  grey fills. The app recolours them per theme and per accent, so any baked-in colour
  fights the palette and any white background shows as a rectangle in dark mode.
- ≥1024px on the long side. Aspect ratios are given per image — they are composed for a
  specific slot, not cropped later.
- Filenames exactly as given, into `assets/art/`.
- Animation frames: same name + `-f2`, `-f3` (e.g. `live-empty-f2.png`).

If a generator insists on a background, ask for "pure white background, no shadow" and
remove it — but transparent-native output is much cleaner.

---

## The style bible

Paste this block at the **top of every prompt**. Consistency comes from repeating it
verbatim, not from remembering it.

> Hand-drawn ink illustration in the style of a naturalist's field notebook. Single-weight
> black pen line, roughly 2–3px, with visible nib texture and slight organic wobble — the
> line of a human wrist, not a vector tool. Sparse, confident, unhurried marks; a drawing
> that was thought about before it was drawn. Generous negative space. Occasional fine
> cross-hatching for shadow, never solid fills. Flat, no perspective tricks, no gradients,
> no glow, no lens blur, no 3D render, no drop shadows, no colour. Pure black on
> transparent. Composed and centred with clear margins.

**Negative prompt** (use every time):

> colour, gradient, glow, neon, glossy, 3D render, photorealistic, drop shadow, vignette,
> lens flare, watermark, signature, text, letters, numbers, UI mockup, device frame,
> busy background, cluttered, symmetrical corporate vector, clip art, stock illustration

Two rules the negative prompt cannot enforce, so check by eye:

1. **No text anywhere.** Generators love to sneak in squiggle-lettering. Any drawing
   containing writing must show it as *abstract wavy lines*, never letterforms — the app is
   shipping in more than one language eventually, and baked-in fake text ages badly.
2. **No phones or app screens** except where explicitly asked. Illustrating an app with a
   picture of an app is the most generic move available.

---

## 1. The mark (logo)

`assets/art/mark.png` — **square, 1024×1024**

The current icon is five waveform bars over a written line, drawn programmatically. It's
serviceable and it's on the store listing; this is the version with a hand in it.

> [STYLE BIBLE]
> A row of five vertical rounded strokes of increasing then decreasing height, like a sound
> waveform, drawn with a hand-inked pen. Directly beneath them, one long horizontal ruled
> line — the kind ruled across a notebook page — as though the sound above has settled into
> a written line below. The waveform strokes are slightly irregular in width, as a hand
> would make them. Nothing else in the frame. Centred, generous margin.

Keep the existing geometric icon as the store icon unless this clearly beats it — a launcher
icon has to survive being 48px, and hand-wobble can turn to mush at that size. Judge them
side by side at thumbnail size before swapping.

---

## 2. Onboarding — four drawings

Landscape-ish, **1024×768**, sitting above each onboarding point. These carry the most
weight: they're the first thing anyone sees, and they're where the app makes its promises.

### `onboard-hears.png` — "It writes down what it hears"

> [STYLE BIBLE]
> On the left, three or four loose concentric arcs radiating outward, suggesting a spoken
> sound travelling. On the right, those same arcs straighten and resolve into four or five
> neat horizontal ruled lines, like handwriting on a page — with the two or three strokes in
> the middle caught halfway between wave and line, mid-transformation. The whole image reads
> left to right as sound becoming writing. No mouth, no person, no speech bubble, no device.

### `onboard-device.png` — "The audio never leaves your phone"

> [STYLE BIBLE]
> A simple closed shape — a rounded rectangle drawn as a single hand-inked outline — with a
> small sound waveform contained entirely inside it, drawn as if folded within. Around the
> outside, two or three short arcs stop short of the shape and curl back on themselves,
> clearly not crossing the boundary. The reading is: the sound stays in. No lock, no
> padlock, no shield, no chain — those are the clichés and they all say "security product"
> rather than "it simply stays here".

### `onboard-asked.png` — "Summaries send text, and nothing else"

> The old caption here read "and only when you ask", which was false: stopping a recording
> sends that transcript on its own. The slide text was corrected 2026-09-09. THE ART STILL
> WORKS and does not need regenerating: one page leaves the stack and the rest stays, which
> is true either way. Only the claim on top of it was wrong.

> [STYLE BIBLE]
> A neat stack of a few pages. One single page has been lifted from the stack and is being
> held out by an open hand, offered deliberately. The rest of the stack sits undisturbed.
> The gesture is unmistakably voluntary — a page handed over, not taken. Draw the hand
> simply, a few confident lines, in the same field-notebook manner. No arrows, no cloud
> symbol, no upload icon.

### `onboard-delete.png` — "You can delete any of it"

> [STYLE BIBLE]
> A single notebook page being torn cleanly from a bound edge, the tear line ragged and
> convincing, the page curling slightly as it comes away. The remaining stub stays in the
> binding. Calm and matter-of-fact, not violent. No bin, no trash can, no X, no fire.

---

## 3. Empty states — four drawings

**1024×1024 square**, rendered small (about 120–160px) above the empty-state text. These
have to read at that size, so they must be *simpler* than the onboarding set — three or four
marks, not twenty.

### `live-empty.png` — Live screen, nothing recorded yet **(animated, see §5)**

> [STYLE BIBLE]
> Three concentric arcs, evenly spaced, suggesting a quiet sound waiting to be heard. Only
> the arcs — no source, no microphone, no dot at the centre. Extremely sparse: three marks
> total. Centred with a lot of air around them.

### `history-empty.png` — History, nothing recorded yet

> [STYLE BIBLE]
> Two or three loose horizontal ruled lines of different lengths, as if the first lines of a
> page that hasn't been written on yet, with the lowest line trailing off shorter than the
> others. Nothing else. Sparse to the point of being almost nothing.

### `people-empty.png` — People, nobody yet **(animated, see §5)**

> [STYLE BIBLE]
> Two very simple figures suggested by a few strokes each — a rounded head shape and a
> shoulder curve, no faces, no features — angled slightly toward each other as if mid-
> conversation. Between and above them, two small arcs suggesting speech passing between.
> No speech bubbles, no facial expressions, no bodies below the shoulder.

### `search-empty.png` — search found nothing

> [STYLE BIBLE]
> A hand-inked circle, drawn as a single unclosed loop with a small gap where the pen lifted,
> and one short straight stroke extending from its lower right — a magnifier reduced to two
> marks. Inside the circle, nothing at all. The emptiness inside is the whole point.

---

## 4. A small flourish

`assets/art/flourish.png` — **wide, 1024×256**

> [STYLE BIBLE]
> A single horizontal ruled line that begins straight on the left and gradually loosens into
> a gentle wave toward the right before tapering away to nothing. A page rule dissolving
> back into sound. Nothing else in the frame.

Sits at the bottom of Settings, above the version number. Purely decorative — the kind of
detail that reads as "someone cared" rather than "someone shipped".

---

## 5. Animation — the line boil

**Do not use a video model for these.** Video models (Sora, Veo, Kling and friends) will
add camera motion, invent depth, drift the composition, and smear the line quality. They're
built for footage, and what we want is the opposite of footage.

What we want is a **line boil**: the traditional hand-animation effect where a drawing is
redrawn two or three times and cycled, so the ink shimmers very slightly and the image feels
alive without anything actually moving. It's what Bill Plympton and a lot of hand-drawn TV
animation uses. Critically, it *turns AI's weakness into the technique* — a model can't
reproduce a drawing exactly, and here that inconsistency is exactly the point.

**How to make it:**

1. Generate the base drawing. Accept it. This is frame 1.
2. Feed frame 1 into an **image-editing** model — one that preserves composition rather than
   generating fresh — with this instruction:

   > Redraw this exact illustration in the identical style, composition, and position. Keep
   > every element in the same place and at the same size. The only difference: the ink lines
   > are drawn again by hand, so they wobble very slightly differently — the natural variance
   > between two passes of the same pen. Do not change, add, or remove anything.

3. Do it again from frame 1 (not from frame 2) for frame 3. Always branch from the original,
   or the drawing drifts.
4. Check all three at 100%: if any element has moved more than a hair, or changed shape,
   regenerate it. Boil works because *only the line* changes.

**Models that do this well** (image-editing, composition-preserving):

- **Gemini image editing ("Nano Banana")** — currently the strongest at "change only this,
  keep everything else", which is precisely the job.
- **Flux Kontext** — purpose-built for instruction-based edits with composition retained.
- **Qwen Image Edit** — solid open-weights option if you'd rather run it locally.

Any of these beats inpainting or img2img at low denoise, which tends to either change
nothing or change everything.

**Only three images need this:** `live-empty`, `people-empty`, and `onboard-hears`. Boil
everything and the app looks like it's vibrating. These three are the ones a user actually
sits and looks at.

The app plays them at **5 fps** and **freezes on frame 1 when the OS reduce-motion setting is
on** — that's handled in code, nothing to do at your end.

---

## Checklist before dropping files in `assets/art/`

- [ ] Transparent background, black ink only, no white rectangle
- [ ] No text, no letterforms, no signature
- [ ] Line weight consistent across **all** images, not just within one
- [ ] Empty-state images still legible shrunk to 140px
- [ ] Boil frames identical in composition; only the line differs
- [ ] Filenames exact, `-f2`/`-f3` for frames

Missing files are safe: every slot falls back to the current text-only layout, so you can
deliver these one at a time and the app never breaks.
