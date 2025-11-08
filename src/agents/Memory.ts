import Database from "better-sqlite3";

type MemoryItem = { id: string; key: string; value: any; ts: number };

export class Memory {
  private db: Database.Database;

  constructor(dbPath: string = "memory.db") {
    // Support in-memory database for testing
    this.db = new Database(dbPath === ":memory:" ? ":memory:" : dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        ts INTEGER NOT NULL
      )
    `);
  }

  add(key: string, value: any) {
    const stmt = this.db.prepare("INSERT INTO memories (key, value, ts) VALUES (?, ?, ?)");
    stmt.run(key, JSON.stringify(value), Date.now());
  }

  query(key: string) {
    // Support pattern matching with LIKE
    const usePattern = key.includes('%') || key.endsWith('_');
    const query = usePattern 
      ? "SELECT value FROM memories WHERE key LIKE ? ORDER BY ts DESC"
      : "SELECT value FROM memories WHERE key = ? ORDER BY ts DESC";
    const stmt = this.db.prepare(query);
    return stmt.all(key).map((row: any) => JSON.parse(row.value));
  }

  dump() {
    return this.db.prepare("SELECT * FROM memories ORDER BY ts DESC").all();
  }
}
