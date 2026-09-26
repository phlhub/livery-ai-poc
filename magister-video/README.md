# MAGISTER — Reimagining the CSAM Role

A motion-graphics film of about 108 seconds (1920×1080, 30 fps). It's built entirely in code as one continuous camera move through one world.

* **Finished film:** `out/magister.mp4` (H.264 + AAC)
* **Storyboard and continuity system:** [`STORYBOARD.md`](STORYBOARD.md)

## How it's built

Every frame is a pure function of time. `renderFrame(t)` draws the whole frame onto a 2D canvas, so any frame can be rendered on its own, which makes rendering deterministic and parallel.

| File | Role |
|---|---|
| `src/core.js` | Easing, deterministic randomness, colour, and a 2.5D camera (log-space zoom, screen-consistent dives, depth parallax) |
| `src/data.js` | **Story and layout.** Key times, camera keyframes, agents, categories, the 56 information cards, events, briefing copy and captions |
| `src/scene.js` | Every visual layer (cards, spokes, Magister ring, agents, account model, signals, briefing, stakeholders, typography) plus the audio cue sheet |
| `index.html` | Preview player: scrub bar, <kbd>Space</kbd> to play, <kbd>←</kbd>/<kbd>→</kbd> to step ±1 s (hold <kbd>Shift</kbd> for ±5 s), `?t=42` to start at a time |
| `tools/render.mjs` | Headless Chromium workers pipe PNG frames to x264, then the segments are concatenated and muxed with the soundtrack |
| `tools/audio.py` | Generative score (pads, plucks, bells, ticks, swells, convolution reverb), timed from `out/cues.json` |
| `tools/stills.mjs`, `tools/contact.py` | QC: render chosen frames and build labelled contact sheets |

## Requirements

* Node 18+ with Playwright and Chromium
* Python 3 with `numpy`, `scipy`, `pillow` and `imageio-ffmpeg`

The imageio-ffmpeg binary is used for encoding. To use a different ffmpeg, set `FFMPEG=/path/to/ffmpeg`.

## Commands

```bash
# preview
npx http-server . -p 8080   # then open http://localhost:8080/?t=0

# QC stills and a contact sheet
node tools/stills.mjs out/qc 5 16 25.8 34 46 55.8 63.5 69.5 99 105
python3 tools/contact.py out/qc out/sheet.png 4

# full render (writes out/magister.mp4, out/cues.json, out/soundtrack.wav)
node tools/render.mjs --workers 4
```

## Editing

* **Copy and timing** live in `src/data.js`: `CAPTIONS`, `BRIEF`, `AGENTS`, `EVENTS`, `T` and `CAM_KEYS`.
* The soundtrack follows picture changes automatically, because it is re-timed from the cue sheet on every render.

Fonts: Inter (SIL Open Font License, see `src/fonts/OFL-LICENSE.txt`). No third-party logos or assets are used.
