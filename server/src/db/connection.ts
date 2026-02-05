import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js-fts5';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.join(os.homedir(), '.kohout');

// --- Compatibility wrapper mimicking better-sqlite3 API ---

interface RunResult {
  lastInsertRowid: number;
  changes: number;
}

interface Statement {
  all(...params: any[]): any[];
  get(...params: any[]): any | undefined;
  run(...params: any[]): RunResult;
}

export interface WrappedDatabase {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  pragma(pragma: string): any;
  close(): void;
}

class SqlJsWrapper implements WrappedDatabase {
  private db: SqlJsDatabase;
  private dbPath: string;

  constructor(db: SqlJsDatabase, dbPath: string) {
    this.db = db;
    this.dbPath = dbPath;
  }

  prepare(sql: string): Statement {
    const db = this.db;
    const save = () => this.save();

    return {
      all(...params: any[]): any[] {
        const stmt = db.prepare(sql);
        if (params.length) stmt.bind(params);
        const rows: any[] = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
      },

      get(...params: any[]): any | undefined {
        const stmt = db.prepare(sql);
        if (params.length) stmt.bind(params);
        let row: any | undefined;
        if (stmt.step()) {
          row = stmt.getAsObject();
        }
        stmt.free();
        return row;
      },

      run(...params: any[]): RunResult {
        db.run(sql, params);
        // Retrieve last_insert_rowid and changes via SQL (no shell involved)
        const lastId = db.exec('SELECT last_insert_rowid() as id');
        const lastInsertRowid = lastId.length > 0 ? Number(lastId[0].values[0][0]) : 0;
        const changesResult = db.exec('SELECT changes() as c');
        const changes = changesResult.length > 0 ? Number(changesResult[0].values[0][0]) : 0;
        save();
        return { lastInsertRowid, changes };
      },
    };
  }

  exec(sql: string): void {
    this.db.run(sql);
    this.save();
  }

  pragma(pragma: string): any {
    const results = this.db.exec(`PRAGMA ${pragma}`);
    if (results.length > 0 && results[0].values.length > 0) {
      return results[0].values[0][0];
    }
    return undefined;
  }

  close(): void {
    this.save();
    this.db.close();
  }

  private save(): void {
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }
}

// --- Module state ---

let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;
let db: WrappedDatabase | null = null;

export async function initDb(): Promise<void> {
  if (SQL) return;
  const require = createRequire(import.meta.url);
  const wasmDir = path.dirname(require.resolve('sql.js-fts5'));
  const wasmBinary = fs.readFileSync(path.join(wasmDir, 'sql-wasm.wasm'));
  SQL = await initSqlJs({ wasmBinary });
}

export function getDb(): WrappedDatabase {
  if (!db) {
    if (!SQL) throw new Error('sql.js not initialized. Call initDb() first.');
    const dbPath = process.env.DATABASE_PATH || path.join(DATA_DIR, 'kohout.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    let sqlJsDb: SqlJsDatabase;
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      sqlJsDb = new SQL.Database(buffer);
    } else {
      sqlJsDb = new SQL.Database();
    }

    db = new SqlJsWrapper(sqlJsDb, dbPath);
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function runMigrations(): void {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const applied = new Set(
    database.prepare('SELECT name FROM _migrations').all()
      .map((r: any) => r.name)
  );

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    database.exec(sql);
    database.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    console.log(`Migration applied: ${file}`);
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
