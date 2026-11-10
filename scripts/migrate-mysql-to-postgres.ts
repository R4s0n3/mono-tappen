/**
 * Copy every Tappen data table from MySQL into PostgreSQL.
 *
 * The target schema must already exist. From play/: `npx prisma migrate deploy`.
 * pgloader is not used: 3.6.10 fails while reading MySQL 8.4 collation metadata
 * ("76 fell through ECASE expression").
 *
 *   SOURCE_MYSQL_URL=mysql://USER:PASSWORD@HOST:3306/DB \
 *   TARGET_POSTGRES_URL=postgresql://USER:PASSWORD@HOST:5432/DB \
 *   npx tsx migrate-mysql-to-postgres.ts [--truncate]
 *
 * Connection URLs are read from the environment only and are never printed.
 * Passwords in those URLs must be percent-encoded.
 *
 * The copy runs in one target transaction. A mismatch rolls it back.
 * Re-running against a target that already has rows exits non-zero unless
 * `--truncate` is passed. `--truncate` replaces data tables and does not
 * touch `_prisma_migrations`.
 */
import mysql from "mysql2/promise";
import pg from "pg";

const MIGRATIONS_TABLE = "_prisma_migrations";
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

type MysqlColumn = {
  name: string;
  dataType: string;
  columnType: string;
};

type PgColumn = {
  name: string;
  dataType: string;
  udt: string;
  precision: number | null;
  charLength: number | null;
  identity: boolean;
};

type FkEdge = {
  name: string;
  table: string;
  columns: string[];
  refTable: string;
  nullable: boolean;
};

type CountRow = {
  table: string;
  source: number;
  target: number;
};

class CopyError extends Error {}

function fail(message: string): never {
  throw new CopyError(message);
}

function redact(message: string): string {
  return message
    .replace(/mysql2?:\/\/[^\s'"]+/gi, "mysql://***")
    .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, "postgresql://***");
}

function quoteIdent(name: string): string {
  if (!IDENT.test(name)) fail(`Refusing unexpected identifier: ${name}`);
  return `"${name}"`;
}

function quoteMysql(name: string): string {
  if (!IDENT.test(name)) fail(`Refusing unexpected identifier: ${name}`);
  return "`" + name + "`";
}

function parseMysqlUrl(urlString: string): mysql.ConnectionOptions {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    fail("SOURCE_MYSQL_URL is not a valid URL");
  }
  if (url.protocol !== "mysql:" && url.protocol !== "mysql2:") {
    fail("SOURCE_MYSQL_URL must use the mysql:// scheme");
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database) fail("SOURCE_MYSQL_URL is missing a database name");
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
    timezone: "Z",
    multipleStatements: false,
    charset: "utf8mb4",
  };
}

function parsePostgresUrl(urlString: string): string {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    fail("TARGET_POSTGRES_URL is not a valid URL");
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    fail("TARGET_POSTGRES_URL must use the postgresql:// scheme");
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database) fail("TARGET_POSTGRES_URL is missing a database name");
  return urlString;
}

function readArgs(): { truncate: boolean } {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(
      "Usage: SOURCE_MYSQL_URL=... TARGET_POSTGRES_URL=... npx tsx migrate-mysql-to-postgres.ts [--truncate]",
    );
    process.exit(0);
  }
  for (const arg of args) {
    if (arg === "--truncate") continue;
    if (arg.includes("://")) {
      fail("Pass connection URLs in the environment, not on the command line.");
    }
    fail(`Unknown argument: ${arg}`);
  }
  return { truncate: args.includes("--truncate") };
}

function isTinyIntBoolean(column: MysqlColumn): boolean {
  return column.dataType === "tinyint" && column.columnType.startsWith("tinyint(1)");
}

function toBoolean(value: unknown, table: string, column: string): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number" || typeof value === "bigint") return value !== 0 && value !== 0n;
  if (typeof value === "string") {
    if (value === "0" || value.toLowerCase() === "false") return false;
    if (value === "1" || value.toLowerCase() === "true") return true;
  }
  if (Buffer.isBuffer(value)) return value.length > 0 && value[0] !== 0;
  fail(`Cannot convert ${table}.${column} to boolean`);
}

function toTimestamp(value: unknown, table: string, column: string): string {
  if (value instanceof Date) {
    fail(
      `Refusing ${table}.${column}: driver returned a JS Date, which can shift a MySQL DATETIME. Expected a clock-time string.`,
    );
  }
  const text = String(value).trim();
  if (text.startsWith("0000-00-00")) {
    fail(`Refusing ${table}.${column}: MySQL zero date ${text} has no PostgreSQL timestamp.`);
  }
  return text;
}

function toJson(value: unknown): string {
  if (typeof value === "string") {
    JSON.parse(value);
    return value;
  }
  return JSON.stringify(value);
}

function convertValue(
  value: unknown,
  source: MysqlColumn,
  target: PgColumn,
  table: string,
): unknown {
  if (value === null || value === undefined) return null;
  if (target.udt === "bool" || isTinyIntBoolean(source)) {
    return toBoolean(value, table, source.name);
  }
  if (
    target.dataType.startsWith("timestamp") ||
    source.dataType === "datetime" ||
    source.dataType === "timestamp"
  ) {
    return toTimestamp(value, table, source.name);
  }
  if (target.udt === "json" || target.udt === "jsonb" || source.dataType === "json") {
    return toJson(value);
  }
  if (typeof value === "bigint" || source.dataType === "bigint" || target.udt === "int8") {
    return value.toString();
  }
  if (source.dataType === "decimal" || source.dataType === "numeric" || target.udt === "numeric") {
    return value.toString();
  }
  if (Buffer.isBuffer(value)) {
    if (target.udt === "bytea") return value;
    return value.toString("utf8");
  }
  return value;
}

function castType(column: PgColumn): string {
  if (column.udt === "varchar") {
    return column.charLength ? `character varying(${column.charLength})` : "character varying";
  }
  if (column.udt === "bpchar" && column.charLength) return `character(${column.charLength})`;
  if (column.udt === "timestamp") {
    const precision = column.precision ?? 3;
    return `timestamp(${precision})`;
  }
  if (column.udt === "timestamptz") {
    const precision = column.precision ?? 3;
    return `timestamptz(${precision})`;
  }
  if (column.udt === "int2") return "smallint";
  if (column.udt === "int4") return "integer";
  if (column.udt === "int8") return "bigint";
  if (column.udt === "bool") return "boolean";
  if (column.udt === "text") return "text";
  if (column.udt === "json") return "json";
  if (column.udt === "jsonb") return "jsonb";
  if (column.udt === "float4") return "real";
  if (column.udt === "float8") return "double precision";
  if (column.udt === "numeric") return "numeric";
  if (column.udt === "bytea") return "bytea";
  if (column.udt === "date") return "date";
  // Enum labels and extension types (citext) are first-class Postgres types.
  return quoteIdent(column.udt);
}

function orderTables(
  tables: string[],
  edges: FkEdge[],
): { order: string[]; deferred: FkEdge[] } {
  const deferred: FkEdge[] = [];
  let active = edges.filter((edge) => {
    if (edge.table === edge.refTable && edge.nullable) {
      deferred.push(edge);
      return false;
    }
    return true;
  });
  const remaining = new Set(tables);
  const order: string[] = [];

  while (remaining.size > 0) {
    const indegree = new Map<string, number>();
    for (const table of remaining) indegree.set(table, 0);
    for (const edge of active) {
      if (
        edge.table !== edge.refTable &&
        remaining.has(edge.table) &&
        remaining.has(edge.refTable)
      ) {
        indegree.set(edge.table, (indegree.get(edge.table) ?? 0) + 1);
      }
    }
    const ready = [...remaining].filter((table) => (indegree.get(table) ?? 0) === 0).sort();
    if (ready.length === 0) {
      const breaker = active.find(
        (edge) =>
          edge.nullable &&
          edge.table !== edge.refTable &&
          remaining.has(edge.table) &&
          remaining.has(edge.refTable),
      );
      if (!breaker) {
        fail(
          `Foreign keys cycle among: ${[...remaining].sort().join(", ")}. No nullable foreign key can be deferred.`,
        );
      }
      deferred.push(breaker);
      active = active.filter((edge) => edge !== breaker);
      continue;
    }
    for (const table of ready) {
      order.push(table);
      remaining.delete(table);
    }
  }
  return { order, deferred };
}

async function mysqlTables(source: mysql.Connection): Promise<string[]> {
  const [rows] = await source.query(
    `SELECT TABLE_NAME AS name
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`,
  );
  return (rows as Array<{ name: string }>).map((row) => row.name);
}

async function mysqlColumns(source: mysql.Connection): Promise<Map<string, MysqlColumn[]>> {
  const [rows] = await source.query(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS name, DATA_TYPE AS dataType, COLUMN_TYPE AS columnType
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     ORDER BY TABLE_NAME, ORDINAL_POSITION`,
  );
  const byTable = new Map<string, MysqlColumn[]>();
  for (const row of rows as Array<{
    tableName: string;
    name: string;
    dataType: string;
    columnType: string;
  }>) {
    const list = byTable.get(row.tableName) ?? [];
    list.push({ name: row.name, dataType: row.dataType, columnType: row.columnType });
    byTable.set(row.tableName, list);
  }
  return byTable;
}

async function pgTables(target: pg.Client): Promise<string[]> {
  const result = await target.query<{ name: string }>(
    `SELECT c.relname AS name
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'
     ORDER BY c.relname`,
  );
  return result.rows.map((row) => row.name);
}

async function pgColumns(target: pg.Client): Promise<Map<string, PgColumn[]>> {
  const result = await target.query<{
    table_name: string;
    name: string;
    data_type: string;
    udt: string;
    precision: number | null;
    char_length: number | null;
    identity: string;
  }>(
    `SELECT c.relname AS table_name,
            a.attname AS name,
            format_type(a.atttypid, a.atttypmod) AS data_type,
            t.typname AS udt,
            CASE
              WHEN t.typname IN ('timestamp', 'timestamptz')
                THEN NULLIF(a.atttypmod, -1)
              ELSE NULL
            END AS precision,
            information_schema._pg_char_max_length(a.atttypid, a.atttypmod) AS char_length,
            a.attidentity AS identity
     FROM pg_attribute a
     JOIN pg_class c ON c.oid = a.attrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     JOIN pg_type t ON t.oid = a.atttypid
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND a.attnum > 0
       AND NOT a.attisdropped
     ORDER BY c.relname, a.attnum`,
  );
  const byTable = new Map<string, PgColumn[]>();
  for (const row of result.rows) {
    // atttypmod for timestamp(p) is the precision itself on this server. -1 means unspecified.
    const precision = row.precision;
    const list = byTable.get(row.table_name) ?? [];
    list.push({
      name: row.name,
      dataType: row.udt === row.data_type || row.data_type.startsWith(row.udt) ? row.data_type : row.data_type,
      udt: row.udt,
      precision,
      charLength: row.char_length,
      identity: row.identity === "a" || row.identity === "d",
    });
    byTable.set(row.table_name, list);
  }
  return byTable;
}

async function pgForeignKeys(target: pg.Client): Promise<FkEdge[]> {
  const result = await target.query<{
    name: string;
    table_name: string;
    column_name: string;
    ref_table: string;
    nullable: boolean;
    ordinal: number;
  }>(
    `SELECT con.conname AS name,
            src.relname AS table_name,
            att.attname AS column_name,
            dst.relname AS ref_table,
            NOT att.attnotnull AS nullable,
            ord.ordinality AS ordinal
     FROM pg_constraint con
     JOIN pg_class src ON src.oid = con.conrelid
     JOIN pg_class dst ON dst.oid = con.confrelid
     JOIN pg_namespace ns ON ns.oid = src.relnamespace
     JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS ord(attnum, ordinality) ON true
     JOIN pg_attribute att ON att.attrelid = src.oid AND att.attnum = ord.attnum
     WHERE con.contype = 'f' AND ns.nspname = 'public'
     ORDER BY con.conname, ord.ordinality`,
  );
  const grouped = new Map<string, FkEdge>();
  for (const row of result.rows) {
    const edge = grouped.get(row.name) ?? {
      name: row.name,
      table: row.table_name,
      columns: [],
      refTable: row.ref_table,
      nullable: true,
    };
    edge.columns.push(row.column_name);
    edge.nullable = edge.nullable && row.nullable;
    grouped.set(row.name, edge);
  }
  return [...grouped.values()];
}

async function pgPrimaryKeys(target: pg.Client): Promise<Map<string, string[]>> {
  const result = await target.query<{ table_name: string; column_name: string }>(
    `SELECT c.relname AS table_name, a.attname AS column_name
     FROM pg_constraint con
     JOIN pg_class c ON c.oid = con.conrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS ord(attnum, ordinality) ON true
     JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ord.attnum
     WHERE con.contype = 'p' AND n.nspname = 'public'
     ORDER BY c.relname, ord.ordinality`,
  );
  const keys = new Map<string, string[]>();
  for (const row of result.rows) {
    const list = keys.get(row.table_name) ?? [];
    list.push(row.column_name);
    keys.set(row.table_name, list);
  }
  return keys;
}

async function countTable(target: pg.Client, table: string): Promise<number> {
  const result = await target.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM ${quoteIdent(table)}`,
  );
  return Number(result.rows[0]?.n ?? "0");
}

async function countMysql(source: mysql.Connection, table: string): Promise<number> {
  const [rows] = await source.query(
    `SELECT COUNT(*) AS n FROM ${quoteMysql(table)}`,
  );
  const n = (rows as Array<{ n: number | string }>)[0]?.n ?? 0;
  return Number(n);
}

async function readRows(
  source: mysql.Connection,
  table: string,
  columns: string[],
): Promise<unknown[][]> {
  const sql = `SELECT ${columns.map(quoteMysql).join(", ")} FROM ${quoteMysql(table)}`;
  const [rows] = await source.query({ sql, rowsAsArray: true });
  return rows as unknown[][];
}

function placeholders(columns: PgColumn[], offset: number): string {
  return columns
    .map((column, index) => `$${offset + index}::${castType(column)}`)
    .join(", ");
}

async function insertRows(
  target: pg.Client,
  table: string,
  columns: PgColumn[],
  rows: unknown[][],
  deferredColumns: Set<string>,
): Promise<unknown[][]> {
  if (rows.length === 0) return [];
  const overridesIdentity = columns.some((column) => column.identity);
  const overrideSql = overridesIdentity ? " OVERRIDING SYSTEM VALUE" : "";
  const batchSize = Math.max(1, Math.floor(5000 / columns.length));
  const originals: unknown[][] = [];
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const values: unknown[] = [];
    const tuples: string[] = [];
    for (const row of batch) {
      const stored = row.slice();
      const insertable = stored.map((value, index) => {
        const column = columns[index];
        if (!column) fail(`Row for ${table} is missing column ${index}`);
        if (deferredColumns.has(column.name)) return null;
        return value;
      });
      if (deferredColumns.size > 0) originals.push(stored);
      const offset = values.length + 1;
      tuples.push(`(${placeholders(columns, offset)})`);
      values.push(...insertable);
    }
    const sql =
      `INSERT INTO ${quoteIdent(table)} (${columns.map((column) => quoteIdent(column.name)).join(", ")})` +
      `${overrideSql} VALUES ${tuples.join(", ")}`;
    await target.query(sql, values);
  }
  return originals;
}

async function applyDeferred(
  target: pg.Client,
  table: string,
  columns: PgColumn[],
  primaryKey: string[],
  deferredColumns: string[],
  originals: unknown[][],
): Promise<void> {
  if (originals.length === 0 || deferredColumns.length === 0) return;
  if (primaryKey.length === 0) {
    fail(`Cannot fill deferred foreign keys on ${table}: the table has no primary key.`);
  }
  const indexOf = new Map(columns.map((column, index) => [column.name, index]));
  const batchSize = Math.max(1, Math.floor(5000 / (deferredColumns.length + primaryKey.length)));
  const pending = originals.filter((row) =>
    deferredColumns.some((name) => row[indexOf.get(name) ?? -1] !== null),
  );
  for (let start = 0; start < pending.length; start += batchSize) {
    const batch = pending.slice(start, start + batchSize);
    for (const row of batch) {
      const values: unknown[] = [];
      const assignments = deferredColumns.map((name) => {
        const column = columns[indexOf.get(name) ?? -1];
        if (!column) fail(`Deferred column ${table}.${name} is missing from the insert list.`);
        values.push(row[indexOf.get(name) ?? -1]);
        return `${quoteIdent(name)} = $${values.length}::${castType(column)}`;
      });
      const where = primaryKey.map((name) => {
        const column = columns[indexOf.get(name) ?? -1];
        if (!column) fail(`Primary key ${table}.${name} is missing from the insert list.`);
        values.push(row[indexOf.get(name) ?? -1]);
        return `${quoteIdent(name)} = $${values.length}::${castType(column)}`;
      });
      await target.query(
        `UPDATE ${quoteIdent(table)} SET ${assignments.join(", ")} WHERE ${where.join(" AND ")}`,
        values,
      );
    }
  }
}

async function resetSequences(target: pg.Client, tables: string[]): Promise<void> {
  const sequences = await target.query<{ table_name: string; column_name: string; sequence_name: string }>(
    `SELECT c.relname AS table_name,
            a.attname AS column_name,
            pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) AS sequence_name
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) IS NOT NULL
     ORDER BY c.relname, a.attname`,
  );
  const wanted = new Set(tables);
  for (const row of sequences.rows) {
    if (!wanted.has(row.table_name)) continue;
    const max = await target.query<{ max: string | null }>(
      `SELECT MAX(${quoteIdent(row.column_name)})::text AS max FROM ${quoteIdent(row.table_name)}`,
    );
    const maxText = max.rows[0]?.max ?? null;
    if (maxText === null) {
      await target.query("SELECT setval($1::regclass, 1, false)", [row.sequence_name]);
      console.log(`sequence ${row.table_name}.${row.column_name} next=1`);
      continue;
    }
    await target.query("SELECT setval($1::regclass, $2::bigint, true)", [
      row.sequence_name,
      maxText,
    ]);
    const next = BigInt(maxText) + 1n;
    console.log(`sequence ${row.table_name}.${row.column_name} next=${next.toString()}`);
  }
}

async function main(): Promise<void> {
  const { truncate } = readArgs();
  const sourceUrl = process.env.SOURCE_MYSQL_URL;
  const targetUrl = process.env.TARGET_POSTGRES_URL;
  if (!sourceUrl || !targetUrl) {
    fail("SOURCE_MYSQL_URL and TARGET_POSTGRES_URL are required.");
  }

  const source = await mysql.createConnection(parseMysqlUrl(sourceUrl));
  const target = new pg.Client({ connectionString: parsePostgresUrl(targetUrl) });
  await target.connect();
  const run = target.query.bind(target);
  target.query = (async (sql: unknown, params?: unknown) => {
    try {
      return await run(sql as never, params as never);
    } catch (error) {
      if (typeof sql === "string" && error && typeof error === "object") {
        Object.assign(error, { query: sql.slice(0, 300) });
      }
      throw error;
    }
  }) as typeof target.query;

  let committed = false;
  let sourceTx = false;
  let targetTx = false;
  try {
    const sourceTables = (await mysqlTables(source)).filter((table) => table !== MIGRATIONS_TABLE);
    const targetTables = (await pgTables(target)).filter((table) => table !== MIGRATIONS_TABLE);
    const sourceSet = new Set(sourceTables);
    const targetSet = new Set(targetTables);
    const missingOnTarget = sourceTables.filter((table) => !targetSet.has(table));
    const missingOnSource = targetTables.filter((table) => !sourceSet.has(table));
    if (missingOnTarget.length > 0 || missingOnSource.length > 0) {
      if (missingOnTarget.length > 0) {
        console.error(`Missing on target: ${missingOnTarget.join(", ")}`);
      }
      if (missingOnSource.length > 0) {
        console.error(`Missing on source: ${missingOnSource.join(", ")}`);
      }
      fail("Source and target table sets differ. Refusing to copy.");
    }

    const occupied: string[] = [];
    for (const table of targetTables) {
      const n = await countTable(target, table);
      if (n > 0) occupied.push(`${table} (${n})`);
    }
    if (occupied.length > 0 && !truncate) {
      fail(
        `Refusing to copy because target tables are not empty: ${occupied.join(", ")}. Re-run with --truncate to replace those rows.`,
      );
    }

    const sourceColumns = await mysqlColumns(source);
    const targetColumns = await pgColumns(target);
    const aligned = new Map<string, { source: MysqlColumn[]; target: PgColumn[] }>();
    for (const table of targetTables) {
      const from = sourceColumns.get(table) ?? [];
      const to = targetColumns.get(table) ?? [];
      const fromNames = from.map((column) => column.name);
      const toNames = to.map((column) => column.name);
      const fromSet = new Set(fromNames);
      const toSet = new Set(toNames);
      if (
        fromNames.length !== toNames.length ||
        fromNames.some((name) => !toSet.has(name)) ||
        toNames.some((name) => !fromSet.has(name))
      ) {
        const onlySource = fromNames.filter((name) => !toSet.has(name));
        const onlyTarget = toNames.filter((name) => !fromSet.has(name));
        fail(
          `Column mismatch on ${table}. Only in source: ${onlySource.join(", ") || "(none)"}. Only in target: ${onlyTarget.join(", ") || "(none)"}.`,
        );
      }
      const sourceByName = new Map(from.map((column) => [column.name, column]));
      aligned.set(table, {
        source: to.map((column) => sourceByName.get(column.name)!),
        target: to,
      });
    }

    const edges = await pgForeignKeys(target);
    const primaryKeys = await pgPrimaryKeys(target);
    const { order, deferred } = orderTables(targetTables, edges);
    const deferredByTable = new Map<string, string[]>();
    for (const edge of deferred) {
      const list = deferredByTable.get(edge.table) ?? [];
      list.push(...edge.columns);
      deferredByTable.set(edge.table, list);
    }
    console.log(`copy order: ${order.join(", ")}`);
    if (deferred.length > 0) {
      console.log(
        `deferred nullable foreign keys: ${deferred
          .map((edge) => `${edge.table}.${edge.columns.join("+")}`)
          .join(", ")}`,
      );
    }
    console.log(`skipped ${MIGRATIONS_TABLE}`);

    await source.query("START TRANSACTION WITH CONSISTENT SNAPSHOT");
    sourceTx = true;
    await target.query("BEGIN");
    targetTx = true;
    if (truncate && targetTables.length > 0) {
      await target.query(
        `TRUNCATE TABLE ${targetTables.map(quoteIdent).join(", ")} RESTART IDENTITY CASCADE`,
      );
    }

    const deferredWork: Array<{
      table: string;
      columns: PgColumn[];
      primaryKey: string[];
      deferredColumns: string[];
      originals: unknown[][];
    }> = [];
    for (const table of order) {
      const pair = aligned.get(table);
      if (!pair) fail(`No column mapping for ${table}`);
      const rows = await readRows(
        source,
        table,
        pair.target.map((column) => column.name),
      );
      const converted = rows.map((row) =>
        row.map((value, index) =>
          convertValue(value, pair.source[index]!, pair.target[index]!, table),
        ),
      );
      const deferredColumns = new Set(deferredByTable.get(table) ?? []);
      const originals = await insertRows(target, table, pair.target, converted, deferredColumns);
      if (deferredColumns.size > 0) {
        deferredWork.push({
          table,
          columns: pair.target,
          primaryKey: primaryKeys.get(table) ?? [],
          deferredColumns: [...deferredColumns],
          originals,
        });
      }
    }
    for (const work of deferredWork) {
      await applyDeferred(
        target,
        work.table,
        work.columns,
        work.primaryKey,
        work.deferredColumns,
        work.originals,
      );
    }

    await resetSequences(target, targetTables);

    const counts: CountRow[] = [];
    let mismatches = 0;
    for (const table of [...targetTables].sort()) {
      const sourceCount = await countMysql(source, table);
      const targetCount = await countTable(target, table);
      counts.push({ table, source: sourceCount, target: targetCount });
      if (sourceCount !== targetCount) mismatches += 1;
    }
    for (const row of counts) {
      const mark = row.source === row.target ? "OK" : "MISMATCH";
      console.log(`${row.table} source=${row.source} target=${row.target} ${mark}`);
    }
    if (mismatches > 0) {
      fail(`${mismatches} table(s) differed. Target copy was rolled back.`);
    }

    await target.query("COMMIT");
    committed = true;
    targetTx = false;
    await source.query("ROLLBACK");
    sourceTx = false;
    console.log(`copied ${counts.length} tables`);
  } catch (error) {
    if (targetTx && !committed) {
      await target.query("ROLLBACK").catch(() => undefined);
    }
    if (sourceTx) {
      await source.query("ROLLBACK").catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : String(error);
    const code =
      error && typeof error === "object" && "code" in error && typeof error.code === "string"
        ? error.code
        : "";
    const position =
      error && typeof error === "object" && "position" in error && error.position != null
        ? String(error.position)
        : "";
    const queryText =
      error && typeof error === "object" && "query" in error && typeof error.query === "string"
        ? error.query.slice(0, 240)
        : "";
    const detail = [
      code ? `code=${code}` : "",
      position ? `position=${position}` : "",
      queryText ? `query=${queryText}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    fail(redact(detail ? `${message} ${detail}` : message));
  } finally {
    await source.end().catch(() => undefined);
    await target.end().catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(redact(message));
  process.exit(1);
});
