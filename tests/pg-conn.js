// Connection settings for the throwaway Postgres cluster the schema
// tests run against. Never point this at a real Supabase project — the
// suite applies docs/schema.sql, which DROPS every Feyn table first.
//
// Override with env vars if you already have a Postgres you want to use:
//   PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
//
// Defaults match what scripts/local-pg.sh starts (a unix socket in
// /tmp, so no TCP port is exposed and no password is needed).
module.exports = {
  host:     process.env.PGHOST     || '/tmp/feyn-pgrun',
  port:     Number(process.env.PGPORT || 55432),
  user:     process.env.PGUSER     || 'postgres',
  password: process.env.PGPASSWORD || undefined,
  database: process.env.PGDATABASE || 'postgres',
};
