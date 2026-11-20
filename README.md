# re_build
single-player apocalyptic incrementalish citybuilder roguelite

## synopsis

in re:build, you awaken amidst a zombie apocalypse. navigate a node-based map to gain skills and equipment, meet survivors, and attempt to rebuild civilization.

watch out, though - as you spend your time on nodes, waves of zombies grow closer!

gain taskspeed multipliers and expand your knowledge of the map with each run.

## inspiration

we would be remiss not to acknlowledge the wonderful games in this genre we are spiritually indebted to:

...
Reincarnated as a Dark Lord Before Taking Over the World with Power 999999999
Surviving Magic Academy as a Demon Lord
Legendum
The World Is Doomed Unless I Can Raise My Power Level to 1,000,000 and Confront the Demon Lord
...
and many more!

## Play the action network

With Node.js 24 or later, run `npm run dev` in this directory and open
[the local application](http://127.0.0.1:4173/). The server reads the action catalog
from SQLite and serves the HTML5 interface from `game/flow`. Each click starts one
rep. An in-game hour takes 0.4 seconds during work. Refreshing starts a fresh run.

Drag anywhere on the map to rotate it. Click or tap a card to play. On touchscreens,
scroll with two fingers. To rotate with a keyboard, focus the map and use the arrow
keys. Home or **Reset view** returns the map to its original angle.
