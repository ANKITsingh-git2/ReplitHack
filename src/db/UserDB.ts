import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";

export type Role = "admin" | "user" | "agent";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  preferences?: Record<string, any>;
  createdAt: number;
}

export class UserDB {
  private db: Database.Database;

  constructor(dbPath: string = "agentverse.db") {
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        preferences TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        details TEXT,
        timestamp INTEGER NOT NULL
      );
    `);
  }

  async createUser(email: string, password: string, role: Role = "user", preferences?: Record<string, any>): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);
    const user: User = {
      id: uuid(),
      email,
      passwordHash,
      role,
      preferences,
      createdAt: Date.now(),
    };

    const stmt = this.db.prepare(
      "INSERT INTO users (id, email, password_hash, role, preferences, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    );
    stmt.run(user.id, user.email, user.passwordHash, user.role, JSON.stringify(user.preferences || {}), user.createdAt);

    this.auditLog(user.id, "user_created", "user", user.id, { email });
    return user;
  }

  async authenticate(email: string, password: string): Promise<User | null> {
    const stmt = this.db.prepare("SELECT * FROM users WHERE email = ?");
    const row = stmt.get(email) as any;
    if (!row) return null;

    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) return null;

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role as Role,
      preferences: row.preferences ? JSON.parse(row.preferences) : {},
      createdAt: row.created_at,
    };
  }

  getUser(id: string): User | null {
    const stmt = this.db.prepare("SELECT * FROM users WHERE id = ?");
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role as Role,
      preferences: row.preferences ? JSON.parse(row.preferences) : {},
      createdAt: row.created_at,
    };
  }

  getUserByEmail(email: string): User | null {
    const stmt = this.db.prepare("SELECT * FROM users WHERE email = ?");
    const row = stmt.get(email) as any;
    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role as Role,
      preferences: row.preferences ? JSON.parse(row.preferences) : {},
      createdAt: row.created_at,
    };
  }

  updatePreferences(userId: string, preferences: Record<string, any>) {
    const stmt = this.db.prepare("UPDATE users SET preferences = ? WHERE id = ?");
    stmt.run(JSON.stringify(preferences), userId);
    this.auditLog(userId, "preferences_updated", "user", userId, { preferences });
  }

  auditLog(userId: string | null, action: string, resourceType: string, resourceId: string, details?: any) {
    const stmt = this.db.prepare(
      "INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)"
    );
    stmt.run(userId, action, resourceType, resourceId, JSON.stringify(details || {}), Date.now());
  }

  getAuditLogs(userId?: string, limit: number = 100) {
    let stmt;
    if (userId) {
      stmt = this.db.prepare("SELECT * FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?");
      return stmt.all(userId, limit);
    } else {
      stmt = this.db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?");
      return stmt.all(limit);
    }
  }
}

