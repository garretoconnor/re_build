# V0 catalog mapping

[v0-inventory.json](v0-inventory.json) contains the ten actions keyed by V0 slug, the starting character and the first-wave rules. Its source revision pins the engine. Each action's sourceEvidence records the node, explicit requirement, locations it reveals, and the slugs behind its prerequisite UUIDs.

## Import decisions

- Keep the original label, description, base hours and positive start costs. Every action takes one rep per cycle. The engine's once flag makes a cycle nonrepeatable. All source gains are per-rep bonuses.
- In fresh(), camp, yard and ridge start visible. For other nodes, use the action that reveals the node as a direct prerequisite alongside any explicit requires. Deduplicate harvest → cultivate, where both checks encode the same gate. Keep crossing → signal as a direct reveal gate even though signal also requires rescue.
- V0 has no skill minimums. Every requiredStats map is empty. Affordability stays a start cost. Future minimums must be met before costs are spent on each rep.
- Restoring the farm (cultivate) grants 6 gathering once, on cycle completion. Only harvest adds gathering to its food bonus, one for one, using the value before rewards are applied. The missing starting value is zero. Harvest gives 6 food before restoration and 12 after. Storeroom food and the farm's immediate 8 food stay fixed. Gathering itself and this grant are rebuild decisions. V0 implements the same food change by checking whether cultivate is done.
- Use Noah as the rebuild's name for V0's unnamed starting character. IDs in the inventory are stable. They were assigned using UUIDv5 with the URL namespace and the literal prefix https://github.com/garretoconnor/re_build/v0/ followed by action/<slug>, character/survivor or rules/first-wave. Keep assigned IDs when display text changes.

## Runtime and presentation

The first run begins with 160 hours remaining, zero progress and no active rep. Start deducts costs immediately. Only active work advances the clock. At the deadline, finish any rep due exactly then and apply rewards before evaluating defense ≥ 12 and people ≥ 3. Interrupted work earns nothing and spent costs stay spent. Facing the wave early uses the same thresholds. These are run-engine behaviors.

The catalog carries base durations. V0's cross-run knowledge, speed adjustment, remembered locations and run count require separate progression state. Coordinates, location prose, restored artwork, activity verbs, discovery messages and logs belong to presentation. The action graph preserves unlock order. Historical browser saves, including the older combined farm location, need a separate conversion decision if save compatibility is wanted.

## Build the database

From the repository checkout, run `npm run import:catalog` with Node.js 24 or newer and Git. The command reads the pinned engine revision from Git, checks its action data and unlocks against the reviewed inventory, and writes `db/catalog.sqlite`. To choose another destination, run `npm run import:catalog -- /path/to/game.sqlite`. A matching catalog can be imported again with saved runs present. A conflicting catalog produces an error and requires an explicit migration or a fresh destination.

## Verify the imported catalog

Run `npm run verify:catalog` to compare the existing database, opened read-only, with the pinned V0 engine. Pass `-- /path/to/game.sqlite` to inspect another database. The verifier uses the inventory for identity and the source revision. It reads gameplay values from SQLite and compares them with prototype definitions and engine behavior.

The replay covers every action, including the optional farm and relay branches. The deadline scenarios offset the route clock by 20 or 21 hours to exercise a decisive final barricade. Skill minimums and additive Gathering at intermediate values use verification fixtures because V0 has no corresponding actions. The runtime and presentation differences above remain outside first-run catalog parity.
