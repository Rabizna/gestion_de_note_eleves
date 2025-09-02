// server/src/controllers/auth.controller.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";
import { Prisma } from "@prisma/client";

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const COOKIE_NAME = "lycee3f_token"; // nom unique pour éviter les collisions
const WEEK = 7 * 24 * 60 * 60 * 1000;

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WEEK,
  };
}

function ensureEnv() {
  if (!process.env.JWT_SECRET) {
    console.warn("⚠️  JWT_SECRET manquant. Valeur par défaut utilisée (dev).");
    process.env.JWT_SECRET = "dev-secret-change-me";
  }
}

/** Map 'professeur'/'proviseur' -> enum Prisma */
function resolveRoleEnum(input) {
  const wanted = String(input || "").trim().toUpperCase();
  const Role = Prisma?.Role;
  const allowed = Role ? Object.values(Role) : ["PROVISEUR", "PROFESSEUR"];
  return allowed.includes(wanted) ? wanted : null;
}

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    fullName: u.fullName ?? u.nom_complet ?? null,
    email: u.email,
    role: u.role,
    profileImage: u.profileImage ?? null,
  };
}

/** POST /api/auth/register */
export async function register(req, res) {
  try {
    ensureEnv();
    const { name, fullName, email, pass, role } = req.body || {};

    const _fullName = (fullName || name || "").trim();
    if (!_fullName || !email || !pass || !role) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires." });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: "Email invalide." });
    }

    const roleEnum = resolveRoleEnum(role);
    if (!roleEnum) {
      const Role = Prisma?.Role;
      const allowed = Role ? Object.values(Role).join(", ") : "PROVISEUR, PROFESSEUR";
      return res.status(400).json({ message: `Rôle invalide. Valeurs possibles: ${allowed}` });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ message: "Cet email est déjà utilisé." });

    // Un seul proviseur
    const proviseurEnum = resolveRoleEnum("proviseur");
    if (roleEnum === proviseurEnum) {
      const provCount = await prisma.user.count({ where: { role: proviseurEnum } });
      if (provCount > 0) return res.status(400).json({ message: "Un proviseur existe déjà." });
    }

    const password = await bcrypt.hash(pass, 10);

    const created = await prisma.user.create({
      data: {
        fullName: _fullName,
        email,
        password,
        role: roleEnum,
        profileImage: null, // côté client: fallback /uploads/defaut.png
      },
    });

    return res.status(201).json({ user: publicUser(created) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Erreur serveur lors de l'inscription." });
  }
}

/** POST /api/auth/login */
export async function login(req, res) {
  try {
    ensureEnv();
    const { email, pass } = req.body || {};
    if (!email || !pass) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: "Email non trouvé." });

    const ok = await bcrypt.compare(pass, user.password);
    if (!ok) return res.status(400).json({ message: "Mot de passe incorrect." });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie(COOKIE_NAME, token, cookieOpts());
    return res.json({ user: publicUser(user) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Erreur serveur lors de la connexion." });
  }
}

/** GET /api/auth/me */
export async function me(req, res) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });
    return res.json({ user: publicUser(user) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

/** POST /api/auth/logout */
export async function logout(_req, res) {
  try {
    res.clearCookie(COOKIE_NAME, cookieOpts());
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Erreur serveur lors de la déconnexion." });
  }
}

/** PUT /api/auth/profile  (JSON OU multipart + n'importe quel nom de champ fichier) */
export async function updateProfile(req, res) {
  try {
    ensureEnv();
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Non autorisé." });

    // Champs texte
    let fullName = req.body?.fullName ?? req.body?.name ?? null;
    let email = req.body?.email ?? null;

    const data = {};

    if (typeof fullName === "string") {
      fullName = fullName.trim();
      if (!fullName) return res.status(400).json({ message: "Nom complet requis." });
      data.fullName = fullName;
    }

    if (typeof email === "string") {
      email = email.trim();
      if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Email invalide." });
      data.email = email;
    }

    // FICHIER (avec .any(), c'est req.files[])
    const file =
      (Array.isArray(req.files) && req.files.find(f => f.fieldname === "profile")) ||
      (Array.isArray(req.files) && req.files.length ? req.files[0] : null) ||
      req.file || null;

    if (file) {
      data.profileImage = `/uploads/${file.filename}`;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "Aucun changement fourni." });
    }

    const updated = await prisma.user.update({ where: { id: userId }, data });

    return res.json({ user: publicUser(updated) });
  } catch (e) {
    if (e?.code === "P2002") {
      return res.status(400).json({ message: "Cet email est déjà utilisé." });
    }
    console.error(e);
    return res.status(500).json({ message: "Erreur lors de la mise à jour du profil." });
  }
}
