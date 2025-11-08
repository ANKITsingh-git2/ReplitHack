import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { UserDB } from "../db/UserDB";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface AuthRequest extends FastifyRequest {
  user?: { id: string; email: string; role: string };
}

export function createAuthRoutes(userDB: UserDB) {
  return {
    async register(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as { email: string; password: string; role?: string };
      try {
        const user = await userDB.createUser(body.email, body.password, (body.role as any) || "user");
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
        return { token, user: { id: user.id, email: user.email, role: user.role } };
      } catch (error: any) {
        reply.code(400);
        return { error: error.message || "Registration failed" };
      }
    },

    async login(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as { email: string; password: string };
      const user = await userDB.authenticate(body.email, body.password);
      if (!user) {
        reply.code(401);
        return { error: "Invalid credentials" };
      }
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
      return { token, user: { id: user.id, email: user.email, role: user.role, preferences: user.preferences } };
    },
  };
}

export async function authenticateToken(req: AuthRequest, reply: FastifyReply) {
  const authHeader = (req.headers as any).authorization;
  if (!authHeader) {
    reply.code(401);
    throw new Error("No authorization header");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
  } catch (error) {
    reply.code(401);
    throw new Error("Invalid token");
  }
}

export function requireRole(role: string) {
  return async (req: AuthRequest, reply: FastifyReply) => {
    if (!req.user || req.user.role !== role) {
      reply.code(403);
      throw new Error("Insufficient permissions");
    }
  };
}

