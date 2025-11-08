import Database from "better-sqlite3";
import { v4 as uuid } from "uuid";

export interface AgentRecord {
  id: string;
  userId: string;
  type: string;
  name: string;
  config: Record<string, any>;
  createdAt: number;
  lastActiveAt: number;
}

export class AgentDB {
  private db: Database.Database;

  constructor(dbPath: string = "agentverse.db") {
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        config TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_active_at INTEGER NOT NULL
      );
    `);
  }

  createAgent(userId: string, type: string, name: string, config: Record<string, any>): AgentRecord {
    const agent: AgentRecord = {
      id: uuid(),
      userId,
      type,
      name,
      config,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    const stmt = this.db.prepare(
      "INSERT INTO agents (id, user_id, type, name, config, created_at, last_active_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(agent.id, agent.userId, agent.type, agent.name, JSON.stringify(agent.config), agent.createdAt, agent.lastActiveAt);

    return agent;
  }

  getAgent(id: string): AgentRecord | null {
    const stmt = this.db.prepare("SELECT * FROM agents WHERE id = ?");
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      name: row.name,
      config: JSON.parse(row.config),
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
    };
  }

  getUserAgents(userId: string): AgentRecord[] {
    const stmt = this.db.prepare("SELECT * FROM agents WHERE user_id = ? ORDER BY last_active_at DESC");
    const rows = stmt.all(userId) as any[];
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      name: row.name,
      config: JSON.parse(row.config),
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
    }));
  }

  updateLastActive(id: string) {
    const stmt = this.db.prepare("UPDATE agents SET last_active_at = ? WHERE id = ?");
    stmt.run(Date.now(), id);
  }

  deleteAgent(id: string) {
    const stmt = this.db.prepare("DELETE FROM agents WHERE id = ?");
    stmt.run(id);
  }
}

