-- Apply once to a new database. Enable foreign_keys on each connection.
PRAGMA foreign_keys = ON;
BEGIN;

-- UUIDs are canonical strings assigned by the writer. Stat keys are shared
-- across rules, characters and effects. Missing entries in stat maps read as 0.
CREATE TABLE stat (
    key TEXT PRIMARY KEY CHECK (length(key) > 0)
) STRICT;

CREATE TABLE action (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    duration_hours REAL NOT NULL CHECK (duration_hours > 0),
    reps_required INTEGER NOT NULL CHECK (reps_required >= 1),
    repeatable INTEGER NOT NULL CHECK (repeatable IN (0, 1))
) STRICT;

-- All listed prerequisites must have cycles_completed >= 1 in this run.
-- The catalog importer must also reject indirect prerequisite cycles.
CREATE TABLE action_prerequisite (
    action_id TEXT NOT NULL REFERENCES action(id),
    prerequisite_id TEXT NOT NULL REFERENCES action(id),
    PRIMARY KEY (action_id, prerequisite_id),
    CHECK (action_id <> prerequisite_id)
) STRICT;

CREATE TABLE action_stat (
    action_id TEXT NOT NULL REFERENCES action(id),
    phase TEXT NOT NULL CHECK (phase IN ('cost', 'bonus', 'completion')),
    stat_key TEXT NOT NULL REFERENCES stat(key),
    amount REAL NOT NULL,
    PRIMARY KEY (action_id, phase, stat_key),
    CHECK (phase <> 'cost' OR amount > 0)
) STRICT;

-- Check every minimum before paying costs at the start of each rep.
CREATE TABLE action_required_stat (
    action_id TEXT NOT NULL REFERENCES action(id),
    stat_key TEXT NOT NULL REFERENCES stat(key),
    minimum REAL NOT NULL,
    PRIMARY KEY (action_id, stat_key)
) STRICT;

-- Each listed stat adds its current value to this specific per-rep bonus.
-- Read all inputs before applying any rewards from the finishing rep.
CREATE TABLE action_beneficial_stat (
    action_id TEXT NOT NULL,
    reward_stat TEXT NOT NULL,
    benefit_stat TEXT NOT NULL REFERENCES stat(key),
    phase TEXT NOT NULL DEFAULT 'bonus' CHECK (phase = 'bonus'),
    PRIMARY KEY (action_id, reward_stat, benefit_stat),
    FOREIGN KEY (action_id, phase, reward_stat)
        REFERENCES action_stat(action_id, phase, stat_key)
) STRICT;

-- Character and rules are starting definitions. Starting a run copies the
-- character name and stats into run and run_stat so later runs start fresh.
CREATE TABLE character (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
) STRICT;
CREATE TABLE character_start_stat (
    character_id TEXT NOT NULL REFERENCES character(id),
    stat_key TEXT NOT NULL REFERENCES stat(key),
    value REAL NOT NULL,
    PRIMARY KEY (character_id, stat_key)
) STRICT;

CREATE TABLE run_rules (
    id TEXT PRIMARY KEY,
    time_budget_hours REAL NOT NULL CHECK (time_budget_hours >= 0)
) STRICT;
CREATE TABLE survival_minimum (
    rules_id TEXT NOT NULL REFERENCES run_rules(id),
    stat_key TEXT NOT NULL REFERENCES stat(key),
    minimum REAL NOT NULL,
    PRIMARY KEY (rules_id, stat_key)
) STRICT;

-- Treat action and rules definitions as immutable while saves reference this
-- catalog. Incompatible content changes require a save migration or new catalog.
CREATE TABLE run (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES character(id),
    character_name TEXT NOT NULL,
    rules_id TEXT NOT NULL REFERENCES run_rules(id),
    hours_left REAL NOT NULL CHECK (hours_left >= 0),
    outcome TEXT NOT NULL CHECK (outcome IN ('playing', 'won', 'lost')),
    active_action_id TEXT REFERENCES action(id),
    active_hours_left REAL,
    CHECK ((active_action_id IS NULL) = (active_hours_left IS NULL)),
    CHECK (active_hours_left IS NULL OR active_hours_left > 0),
    CHECK (outcome = 'playing' OR active_action_id IS NULL)
) STRICT;
CREATE TABLE run_stat (
    run_id TEXT NOT NULL REFERENCES run(id) ON DELETE CASCADE,
    stat_key TEXT NOT NULL REFERENCES stat(key),
    value REAL NOT NULL,
    PRIMARY KEY (run_id, stat_key)
) STRICT;

-- Missing progress reads as (0, 0). The engine resets reps_done to zero
-- and increments cycles_completed on the final rep, including for one-offs.
CREATE TABLE action_progress (
    run_id TEXT NOT NULL REFERENCES run(id) ON DELETE CASCADE,
    action_id TEXT NOT NULL REFERENCES action(id),
    reps_done INTEGER NOT NULL DEFAULT 0 CHECK (reps_done >= 0),
    cycles_completed INTEGER NOT NULL DEFAULT 0 CHECK (cycles_completed >= 0),
    PRIMARY KEY (run_id, action_id)
) STRICT;

COMMIT;
