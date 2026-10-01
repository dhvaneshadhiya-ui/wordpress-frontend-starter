# Claude — Motion Design Showreel 2026

A 15-second, 1920×1080 @ 60 fps motion-graphics showreel. Everything is drawn in code on a
`<canvas>` and timed to a 128 BPM soundtrack that is also synthesized from code.

**Watch:** [`showreel.mp4`](showreel.mp4) · **Play live in a browser:** open `index.html` from a local server (`npx serve showreel`)

## Structure: 8 bars, 8 scenes, one per bar (1.875 s each)

| # | Scene | What it shows off | Hand-off to the next scene |
|---|-------|-------------------|-------------------------|
| 01 | DROP | squash & stretch, impact ripples, split/orbit | ball becomes a circle wipe |
| 02 | KINETIC TYPE | masked per-letter reveals, staggers, rotating badge, physics fall | the **O** in MOVE becomes a ring |
| 03 | SHAPE MORPH | radial-interpolated circle→square→triangle→star, echo trails, live data annotations | star squashes into a line |
| 04 | PATTERN | Bauhaus tile grid, distance-delayed wave and 3D card flips | dots fly into 3D |
| 05 | DEPTH | 576 particles in perspective: sphere → burst → torus → double helix | particles collapse onto the graph line |
| 06 | TIMING | graph editor with spring-loaded bezier handles, linear vs eased spacing charts | "TIMING IS EVERYTHING." slam |
| 07 | PRINCIPLES | 8th-note montage of animation principles, each word animated *as* its principle, glitch cuts | IMPACT |
| 08 | RESOLVE | four shapes collide into a logo mark, name reveal, typed subtitle | loops cleanly back to black |

Applied to every frame: 5-sample motion blur (180° shutter), camera shake and RGB split on
impacts, film grain, vignette, and a viewfinder HUD (timecode, beat counter, progress).

## Rebuild

```bash
node showreel/audio.mjs    # -> audio.wav (synth: kick, clap, hats, bass, plucks, bells, pad, FX, reverb)
node showreel/render.mjs   # -> showreel.mp4 (Playwright renders each frame and pipes it to ffmpeg)
node showreel/render.mjs --stills 2.5,7.6 --out /tmp/stills   # spot-check frames
```

Every frame is a pure function of time, so renders are deterministic.
Fonts: Inter Tight and JetBrains Mono (OFL, via Fontsource).
