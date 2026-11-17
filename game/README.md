# re:build — V0: The first light

A dependency-free browser prototype. Run `npm run dev` from the repository root,
then open http://127.0.0.1:4173. Run `npm test` for the simulation checks.

## Play

Select map locations and complete tasks. Time advances only during work (two game
hours per real second). Gather materials, restore the outpost, scout the valley,
repair the bridge, and bring provisions to the survivors. Reach 12 defense and
three survivors before the first wave at hour 160. Barricades are repeatable.
You can face the wave early or let the clock reach it naturally.

Runs save automatically in this browser. Tasks pause when the tab is hidden and
when a saved game is reopened. Ended runs grant knowledge (+12% task speed per
point) and preserve silhouettes of discovered locations for the next run.

## Files

- `dist/engine.js`: pure simulation, action definitions, progression, and outcomes.
- `dist/art.js`: deterministic SVG terrain and structure illustrations.
- `dist/app.js`: rendering, interactions, audio cues, and browser persistence.
- `dist/style.css`: responsive interface and map styling.
- `tests/engine.test.mjs`: viable first-run route, resource constraints, wave
  interruption, idle time, repeated harvesting, and persistent progression.

V0 intentionally has a fixed map and one wave, with abstract combat. The relay
station and reclaimed farm are optional goals. All game artwork is generated
locally as SVG; optional Google Fonts fall back to system fonts when offline.
