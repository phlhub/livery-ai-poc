# MAGISTER — Reimagining the CSAM Role · Storyboard

> This is the **Version 1** storyboard, kept for reference; its times are V1 times. Version 2 keeps the same scenes and continuity system but re-paces them for narration, and runs 2:29. The V2 timing lives in `PACE`, `NARRATION` and `CAPTIONS` in `src/data.js`, and is laid out line by line in [`narration/README.md`](narration/README.md).

1920×1080 · 30 fps · ~108 s · one continuous camera move through one world. There are no cuts.

## Recurring visual elements (continuity system)

| Element | Look | Where it lives through the film |
|---|---|---|
| **The CSAM node** | Warm white core, thin amber ring, soft halo. It sits at world origin (0,0) | It stays at the center of every scene. It's the hub in the opening, the protected center inside Magister, the person in the relationship scene, and the dot inside the final emblem |
| **Information cards** | Dark glass rounded rectangles with a small colored category glyph and a title | The same 56 card objects scatter around the CSAM in the opening. They merge into 14 category **stacks** on the outer ring, flood back in the callback and re-stack. Their particles are the signals Magister receives |
| **Spokes** | Hairlines from each card to the CSAM | The "human as integration layer". They are cut in the transition and rerouted to the Magister ring. They briefly return in the callback |
| **Magister ring** | A calm cool-white orbit (r = 260) with an inner tick ring and slow orchestration arcs | It forms between the information and the human, and stays for the rest of the film. In the end it becomes the emblem around the CSAM dot |
| **Agents** | Eight nodes on the ring, each with a gauge arc and, later, a small living loop | They're introduced in the operating model. One of them is dived into to show the loop, and they're seen working during the living account |
| **Account model** | A faint constellation inside the ring | This is Magister's evolving state. It updates as events are handled |
| **Signals** | Small particles on curved paths | Card → stack → agent → ring → (rarely) the CSAM. Amber means human judgment is needed |
| **Palette** | Near-black navy, cool white (Magister), warm amber (human attention) | Used the same way throughout |
| **Type** | Inter Light captions at the bottom center, and small tracked caps for labels | Used the same way throughout |

## Timeline

| Time | Scene | Picture | On-screen text |
|---|---|---|---|
| 0.0–2.5 | Darkness | Grain and a faint grid. The CSAM point fades up | — |
| 2.5–7.0 | Today's CSAM | Eight cards appear calmly, with hairline spokes to the CSAM | **Today's CSAM** |
| 7.0–13.5 | Accumulation | More cards arrive faster, with badges, background panels and hand-carried "hops" between cards through the CSAM. The camera creeps in | Observe. Remember. Connect. Track. Follow up. Repeat. |
| 13.5–18.0 | Saturation | All the spokes brighten and converge. Pulses keep flowing into the human | **The human has become the integration layer.** |
| 18.0–19.0 | Freeze | Motion stops, color drains and the sound cuts to a tail | — |
| 19.0–24.5 | Something changes | The camera pulls back. Links form between related cards, duplicates merge into 14 stacks on an outer ring, and the spokes are cut | — |
| 22.5–27.5 | Magister forms | The ring sweeps in between the information and the human. The account model lights up inside it | **MAGISTER** |
| 27.0–37.0 | Operating model | Eight agents emerge on the ring. Signals flow from the stacks into them, their gauges change, and their outputs travel along the ring into the model | Agent names and one-line duties · *Specialized agents. Standing responsibilities.* |
| 37.0–39.0 | Dive | The camera dives into the Execution Assistant node, and its light becomes a single point | — |
| 39.0–42.8 | Automation | A straight pipeline (Trigger, Step, Step, Output, Stop) with one pulse that stops and goes grey | **Automation executes a recipe.** |
| 42.8–47.5 | Agentic responsibility | The same line bends into a closed loop (Observe, Understand, Decide, Act, Monitor, Continue) and the pulse keeps circling | **An agent owns a responsibility.** |
| 47.5–49.5 | Return | The loop shrinks back into the agent node. Every agent now carries a tiny live loop | — |
| 49.5–58.0 | Living account | The view widens and an environment field feeds the stacks. Five events are handled quietly: an overdue action, a consumption drop, an approaching commitment, a milestone change and a new risk | *Events happen. Most are handled quietly.* |
| 58.0–66.0 | Surfacing | An opportunity turns amber. For the first time a signal crosses the ring to the CSAM. The world dims and a briefing opens: What changed, Why it matters, Context, Recommended next action | **The system decides when human attention creates value.** |
| 66.0–76.0 | The human role | The camera settles on the CSAM inside a quiet ring. Customer stakeholders appear with warm, two-way connections | **Less administration.** then More judgment · More relationships · More strategy · More customer impact |
| 76.0–83.0 | Callback | The same cards flood back into the opening chaos, then the identical transformation replays: the ring forms and the spokes reroute. One amber signal reaches the human | *The work didn't disappear.* then **Responsibility moved.** |
| 83.0–88.0 | One system | Wide composition with labels: Customer environment, Magister, Specialized agents, CSAM. One signal travels the whole path | Layer labels |
| 88.0–102.0 | Simplify | The stacks and agents dissolve into the ring, leaving the ring and the human, which rise to the top | Three closing lines, one after another |
| 102.0–106.5 | Lockup | Ring + CSAM emblem | **MAGISTER** · Reimagining the CSAM Role |
| 106.5–108.0 | Out | Fade to black | — |

## Sound

A generated score (`tools/audio.py`) is scored to the same cue list that the animation exports:

* **Opening:** a low drone and soft notification ticks that get denser with the accumulation, plus a filtered-noise swell.
* **Freeze:** a hard stop into a reverb tail.
* **Magister:** a warm pad resolution and a shimmer as the ring forms.
* **Living account:** soft mallet plucks for the quiet events, and a warmer bell when a signal is surfaced.
* **Ending:** a resolved final chord with a long tail.
