import { Tool } from "./Tool";
import { UserDB, Role } from "../../db/UserDB";

export interface ToolPermission {
  toolName: string;
  allowedRoles: Role[];
  requiresAuth?: boolean;
}

export class ToolAuthorization {
  private permissions: Map<string, ToolPermission>;
  private userDB: UserDB;

  constructor(userDB: UserDB) {
    this.userDB = userDB;
    this.permissions = new Map();
    this.setupDefaultPermissions();
  }

  private setupDefaultPermissions() {
    // Default: all tools accessible to all authenticated users
    const defaultRoles: Role[] = ["admin", "user", "agent"];
    this.registerTool("search_flights", { toolName: "search_flights", allowedRoles: defaultRoles });
    this.registerTool("search_hotels", { toolName: "search_hotels", allowedRoles: defaultRoles });
    this.registerTool("web_scraper", { toolName: "web_scraper", allowedRoles: defaultRoles });
    this.registerTool("respond", { toolName: "respond", allowedRoles: defaultRoles });
  }

  registerTool(toolName: string, permission: ToolPermission) {
    this.permissions.set(toolName, permission);
  }

  async canUseTool(userId: string | null, toolName: string): Promise<boolean> {
    const permission = this.permissions.get(toolName);
    if (!permission) return false; // Unknown tools are denied

    if (!permission.requiresAuth && !userId) return true;
    if (!userId) return false;

    const user = this.userDB.getUser(userId);
    if (!user) return false;

    return permission.allowedRoles.includes(user.role);
  }

  getAuthorizedTools(userId: string | null): string[] {
    const user = userId ? this.userDB.getUser(userId) : null;
    const userRole = user?.role || null;

    return Array.from(this.permissions.entries())
      .filter(([_, perm]) => {
        if (!perm.requiresAuth && !userId) return true;
        if (!userId) return false;
        return perm.allowedRoles.includes(userRole!);
      })
      .map(([toolName]) => toolName);
  }
}

