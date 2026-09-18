// Read-only primary closure verification; synthetic IDs only, no secret output.
import { readFileSync, writeFileSync } from 'node:fs';
import { createClerkClient } from '@clerk/backend';
import { readEnv, queryD1, USER_TABLES, HISTORICAL_TOMBSTONES, verifyDeployment } from './run_remaining_proofs.mjs';
const report = JSON.parse(readFileSync(new URL('./report.json', import.meta.url)));
await verifyDeployment();
const client = createClerkClient({ secretKey: readEnv().CLERK_SECRET_KEY });
// Resolve only the two known IDs from the preceding primary run (safe truncated log identifiers).
const previous = await queryD1('SELECT id FROM users WHERE id LIKE ? OR id LIKE ?;', ['user_3JQE7Tmfa%', 'user_3JQE7UK9U%']);
if (previous.length !== 2) throw new Error('Previous primary pair could not be resolved uniquely.');
const ids = [...HISTORICAL_TOMBSTONES, ...previous.map(row => row.id), ...report.synthetic_user_ids];
if (new Set(ids).size !== 6) throw new Error('Expected six distinct synthetic identities.');
const outcomes = [];
for (const id of ids) {
  let providerStatus;
  try { await client.users.getUser(id); providerStatus = 200; }
  catch (error) { providerStatus = error.status; }
  const tombstones = await queryD1('SELECT deleted_at FROM users WHERE id = ?;', [id]);
  const counts = [];
  for (let i = 0; i < USER_TABLES.length; i += 4) {
    const group = USER_TABLES.slice(i, i + 4);
    counts.push(...await queryD1(group.map(table => `SELECT '${table}' AS table_name, count(*) AS count FROM ${table} WHERE user_id = ?`).join(' UNION ALL '), group.map(() => id)));
  }
  const passed = providerStatus === 404 && tombstones.length === 1 && Boolean(tombstones[0].deleted_at) && counts.length === 14 && counts.every(row => row.count === 0);
  outcomes.push({synthetic_user_id:id,provider_status:providerStatus,tombstone_preserved:Boolean(tombstones[0]?.deleted_at),counts,passed});
}
const result = {verified_at:new Date().toISOString(),read_only:true,passed:outcomes.every(row=>row.passed),outcomes};
writeFileSync(new URL('./primary-cleanup-final.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:result.passed,identities:outcomes.length,tables_per_identity:14}));
if (!result.passed) process.exitCode=1;
