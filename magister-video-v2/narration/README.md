# Magister V2: Narration

This folder is the drop-in point for the voice-over. Put one file per line here, named exactly `line01.wav` … `line11.wav`, then run `node tools/render.mjs`.

The renderer places each file at its planned start. It ducks the music by about 9 dB under the voice, with a 0.25 s attack and a 0.9 s release, so the music comes back up in the pauses. No compression is applied. The output is `out/magister_v2_narrated.mp4`. If any line is missing, the render is a no-voice preview instead.

## Recording spec
- **Voice:** a mature, warm, intelligent male voice. Conversational and authoritative, never an announcer read.
- **Pace:** calm, about 145 wpm. Don't rush to fit a slot; small overruns are fine.
- **Format:** WAV, 48 kHz (other rates are resampled), mono or stereo, 24-bit or 16-bit.
- **Files:** one file per line. Trim to about 0.1 s of room tone before the first word, and leave the natural tail after the last.
- **Processing:** no music, reverb or heavy processing on the files.
- **Level:** the renderer levels each file to a consistent spoken level (about −20 dBFS RMS).

## Timing plan
Times are in the V2 film, from 0:00. Durations assume about 145 wpm.

| File | Starts | Planned length | Line |
|---|---|---|---|
| `line01.wav` | 0:02.6 | 4.0 s | At the center of every customer account is one person. |
| `line02.wav` | 0:07.4 | 10.5 s | Meetings, messages, support, consumption, delivery, risk… each living in its own system. Keeping it all connected quietly consumes much of a CSAM’s week. |
| `line03.wav` | 0:22.6 | 7.0 s | Step back, and the problem becomes clear. The information isn’t disconnected. The operating model is. |
| `line04.wav` | 0:30.9 | 11.0 s | Not a chatbot. Not another automation. Magister is a persistent intelligence layer that understands the account, maintains context, and notices when something changes. |
| `line05.wav` | 0:43.3 | 6.0 s | Specialized agents take ownership of specific responsibilities—and continuously monitor them over time. |
| `line06.wav` | 0:52.4 | 5.0 s | Traditional automation follows a script. It’s triggered, it runs, and it stops. |
| `line07.wav` | 1:01.3 | 5.3 s | An agent owns a responsibility. It observes, understands, acts—and keeps watching. |
| `line08.wav` | 1:09.6 | 11.2 s | The account no longer has to be reconstructed from memory every morning. Commitments are tracked. Changes are investigated. Risks surface before someone remembers to look for them. |
| `line09.wav` | 1:25.3 | 6.8 s | And when something genuinely requires human judgment, it comes to the CSAM—with the context already assembled. |
| `line10.wav` | 1:37.0 | 10.5 s | That changes the job itself. Less time maintaining the account. More time with customer leaders, navigating difficult conversations, making decisions, and driving outcomes. |
| `line11.wav` | 2:06.3 | 4.8 s | So the real question isn’t how much faster AI can make the CSAM. |

The final three closing statements are **not narrated**. They play on screen with the music rising, followed by the title card and fade.

The same plan ships as `out/narration_plan.srt`, which you can load in a video player alongside the no-voice preview. To edit a start time, change `NARRATION` in `src/data.js`.
