# From dashboard to survival game

Browser study and first implementation pass — November 17, 2026.

## Scope

Played opening interactions in all four README inspirations using the in-app browser. These are early-game observations, not full playthroughs or claims about their late-game balance. The itch embeds initially displayed but did not reliably receive canvas clicks; opening their observed game-frame URLs directly in the same browser resolved input.

| Game | Interactions tested | Useful lesson |
| --- | --- | --- |
| [Reincarnated as a Dark Lord](https://jetamp.itch.io/reincarnated-as-a-dark-lord-before-taking-over-the-world-with-power-999999999) | Opening scene → Awake → Absorb Mana; watched the five repetitions finish and Grow Limb appear. | The action graph is the main surface. Completed actions remain as route history. A strong selected-state effect and adjacent countdown/progress bars connect effort to danger. |
| [Surviving Magic Academy](https://stripedbutterfly.itch.io/surviving-magic-academy-as-a-demon-lord) | Advanced the introduction, entered the academy, completed Suppress Bloodlust; observed strength rise from 4 to 7 and the threat counter fall from 50 to 46. | Connections explain where a new choice came from. Short narrative responses make a stat change feel like an event. The long opening also shows why our first useful decision should arrive quickly. |
| [Legendum](https://vadeum.itch.io/legendum) | Unlocked the opening Chronicle node, finished the Farmhand narrative, opened Tasks, selected Farmhand and tested an incompatible morning slot. | New systems arrive with an immediate reason to use them. The schedule distinguishes compatible slots and shows rewards, energy, and upgrade requirements. An occupied world scene gives the abstract planning screen a sense of place. |
| [The World Is Doomed](https://reav.itch.io/demon-lord) | New Game → Dream's three repetitions → Farm Carrots; inspected the resulting action grid and locked forest guardian. | Actions themselves contain duration, gains, repetition count, and prerequisites. A plain interface can still feel like a game when choices change the world and the approaching enemy stays visible. |

## Diagnosis of our starting UI

At the default desktop browser size, the large brand header, introductory sidebar and tall map pushed the wave clock below the first screen. The initial selected outpost offered only disabled actions. Active work lived at the bottom of the location inspector, so the player had to search for feedback and controls. Generic “Begin task” buttons weakened the connection between action and consequence.

## Direction implemented

A survivor's field map: charcoal and olive surfaces, weathered paper colors, restrained rust for danger, serif place names and compact monospaced operational readouts. Keep the existing geographic valley and rebuilding theme rather than copying a fantasy action graph or pixel-art treatment.

- Compact supplies and survival requirements above the map; remove the introductory marketing column.
- Keep the wave clock and current task in the main play area on desktop, including when another location is selected.
- Represent the existing countdown with an advancing horde-front marker. This is a visual clock, not a new pathfinding or combat simulation.
- Name the action on its button. Show costs, gains, and remaining wave time after the action; warn when it cannot finish before arrival.
- Link insufficient scrap or food to an appropriate discovered supply source (or the ridge needed to reveal one).
- Give contextual next-step advice in the field log. Keep completed work visually subordinate.
- Add Space to pause/resume when focus is outside native controls, and ? for the guide. Preserve keyboard-selectable map nodes and reduced-motion behavior.
- Adapt supplies, objectives, map, and inspector to a narrow screen without horizontal page overflow.

The simulation, costs, task lengths, save format, and victory conditions are unchanged. This pass does not add narrative encounters, survivor personalities, direct combat, queues, or new progression branches.

## Next design opportunities

Make survivors recognizable through names and short arrival scenes. Give scouting a concrete discovery message that identifies new routes. Make rebuilding visibly alter more of the surrounding terrain. These should grow from playable consequences rather than adding ornamental panels.

## Validation

All five existing simulation tests pass. In-app browser checks covered supply-source navigation, salvaging, restoring the outpost, pausing while inspecting another location, keyboard resume, persisted paused work after reload, and mobile controls at 390 × 844 with no horizontal page overflow. Browser console checks reported no errors.
