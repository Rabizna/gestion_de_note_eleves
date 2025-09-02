// server/src/middleware/auth.js
import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  // Nouveau nom + fallback pour l'ancien
  const cookieToken = req.cookies?.lycee3f_token || req.cookies?.token;
  const header = req.headers.authorization;
  const headerToken = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const token = cookieToken || headerToken;

  if (!token) return res.status(401).json({ message: "Non authentifié" });

  try {
    // même valeur de secours que dans ensureEnv()
    const secret = process.env.JWT_SECRET || "dev-secret-change-me";
    const payload = jwt.verify(token, secret);
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch (e) {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
}

// alias utile si du code ancien importe encore 'authRequired'
export const authRequired = requireAuth;
