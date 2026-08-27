// Test harness runner: applies the Supabase shim + docs/schema.sql to the
// local cluster and reports the first failure with context.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const REPO = path.resolve(__dirname, '..');
const CONN = require('./pg-conn');

async function main() {
  const target = process.argv[2] || path.join(REPO, 'docs/schema.sql');
  const c = new Client(CONN);
  await c.connect();

  const shim = fs.readFileSync(path.join(__dirname, 'supabase-shim.sql'), 'utf8');
  try {
    await c.query(shim);
    console.log('shim: OK');
  } catch (e) {
    console.log('shim FAILED:', e.message);
    await c.end();
    process.exit(1);
  }

  const sql = fs.readFileSync(target, 'utf8');
  try {
    await c.query(sql);
    console.log('schema: APPLIED CLEAN');
  } catch (e) {
    console.log('schema FAILED');
    console.log('  message :', e.message);
    console.log('  detail  :', e.detail || '-');
    console.log('  hint    :', e.hint || '-');
    console.log('  where   :', e.where || '-');
    if (e.position) {
      const pos = Number(e.position);
      const upto = sql.slice(0, pos);
      const line = upto.split('\n').length;
      console.log('  line    :', line);
      const lines = sql.split('\n');
      for (let i = Math.max(0, line - 6); i < Math.min(lines.length, line + 4); i++) {
        console.log(String(i + 1).padStart(5), (i + 1 === line ? '>> ' : '   ') + lines[i]);
      }
    }
    await c.end();
    process.exit(2);
  }
  await c.end();
}
main();
