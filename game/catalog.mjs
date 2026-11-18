import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

export function loadCatalog() {
  const db = new DatabaseSync(fileURLToPath(new URL('../db/catalog.sqlite', import.meta.url)), {readOnly:true});
  try {
    const rows = (sql, ...args) => db.prepare(sql).all(...args);
    const stats = (sql, ...args) => Object.fromEntries(rows(sql, ...args).map(Object.values));
    const actions = rows('SELECT * FROM action ORDER BY rowid').map(row => {
      const id = row.id;
      const effects = phase => stats('SELECT stat_key, amount FROM action_stat WHERE action_id=? AND phase=?', id, phase);
      const beneficialStats = {};
      for (const {reward_stat, benefit_stat} of rows('SELECT * FROM action_beneficial_stat WHERE action_id=?', id)) {
        (beneficialStats[reward_stat] ??= []).push(benefit_stat);
      }
      return {id, name:row.name, desc:row.description, durationHours:row.duration_hours, repsRequired:row.reps_required,
        repeatable:!!row.repeatable, cost:effects('cost'), bonus:effects('bonus'), completion:effects('completion'), beneficialStats,
        prerequisiteIds:rows('SELECT prerequisite_id FROM action_prerequisite WHERE action_id=?',id).map(r=>r.prerequisite_id),
        requiredStats:stats('SELECT stat_key, minimum FROM action_required_stat WHERE action_id=?',id)};
    });
    const [character] = rows('SELECT * FROM character ORDER BY rowid LIMIT 1');
    character.stats = stats('SELECT stat_key,value FROM character_start_stat WHERE character_id=?',character.id);
    const [rule] = rows('SELECT * FROM run_rules ORDER BY rowid LIMIT 1');
    return {actions,character,statKeys:rows('SELECT key FROM stat ORDER BY key').map(r=>r.key),
      rules:{timeBudgetHours:rule.time_budget_hours,survivalMinimums:stats('SELECT stat_key,minimum FROM survival_minimum WHERE rules_id=?',rule.id)}};
  } finally { db.close(); }
}
