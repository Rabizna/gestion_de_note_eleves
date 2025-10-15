// server/src/controllers/auth.controller.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";
import { Prisma } from "@prisma/client";

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const COOKIE_NAME = "lycee3f_token";
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

/** Sérialise l'utilisateur côté client (avec infos titularisation) */
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    fullName: u.fullName ?? u.nom_complet ?? null,
    email: u.email,
    role: u.role,
    profileImage: u.profileImage ?? null,

    // Titularisation (ids + libellés si relations chargées)
    titulaireNiveauId: u.titulaireNiveauId ?? null,
    titulaireSectionId: u.titulaireSectionId ?? null,
    titulaireNiveauNom:
      u.titulaireNiveau?.nom ?? u.titulaireNiveau?.nom_niveau ?? null,
    titulaireSectionNom:
      u.titulaireSection?.nom ?? u.titulaireSection?.nom_section ?? null,
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
    if (roleEnum === "PROVISEUR") {
      const provCount = await prisma.user.count({ where: { role: "PROVISEUR" } });
      if (provCount > 0) return res.status(400).json({ message: "Un proviseur existe déjà." });
    }

    const password = await bcrypt.hash(pass, 10);

    const created = await prisma.user.create({
      data: {
        fullName: _fullName,
        email,
        password,
        role: roleEnum,
        profileImage: null,
        titulaireNiveauId: null,
        titulaireSectionId: null,
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

    const user = await prisma.user.findUnique({
      where: { email },
      include: { titulaireNiveau: true, titulaireSection: true },
    });
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
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { titulaireNiveau: true, titulaireSection: true },
    });
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

/** Helpers parse */
function parseNullableInt(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** PUT /api/auth/profile  (JSON OU multipart) */
export async function updateProfile(req, res) {
  try {
    ensureEnv();
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Non autorisé." });

    // Récupération utilisateur (avec role)
    const current = await prisma.user.findUnique({
      where: { id: userId },
      include: { titulaireNiveau: true, titulaireSection: true },
    });
    if (!current) return res.status(404).json({ message: "Utilisateur introuvable." });

    // Champs texte
    let fullName = req.body?.fullName ?? req.body?.name ?? null;
    let email = req.body?.email ?? null;

    // Titularisation (accepté si role = PROFESSEUR)
    let titulaireNiveauId = parseNullableInt(req.body?.titulaireNiveauId);
    let titulaireSectionId = parseNullableInt(req.body?.titulaireSectionId);

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

    // ====== Gestion TITULARISATION ======
    const isProf = current.role === "PROFESSEUR";
    const isProviseur = current.role === "PROVISEUR";

    if (isProviseur) {
      // Un proviseur ne peut pas être titulaire
      data.titulaireNiveauId = null;
      data.titulaireSectionId = null;
    } else if (isProf) {
      // Si l'un des deux est renseigné, exiger les deux
      const oneFilled = titulaireNiveauId !== null || titulaireSectionId !== null;
      const bothFilled = titulaireNiveauId !== null && titulaireSectionId !== null;

      if (oneFilled && !bothFilled) {
        return res
          .status(400)
          .json({ message: "Sélectionnez le niveau ET la section pour la titularisation." });
      }

      // Si none => on efface (nullable). Si both => vérifier unicité
      if (!bothFilled) {
        data.titulaireNiveauId = null;
        data.titulaireSectionId = null;
      } else {
        // Vérifier que le couple n'est pas déjà attribué à quelqu'un d'autre
        const conflict = await prisma.user.findFirst({
          where: {
            id: { not: userId },
            titulaireNiveauId,
            titulaireSectionId,
          },
          select: { id: true, fullName: true },
        });
        if (conflict) {
          const who = conflict.fullName || "Un autre professeur";
          return res.status(400).json({
            message: `${who.toLocaleUpperCase()} est déjà titulaire de cette classe.`,
          });
        }

        // Vérifier existence des clés étrangères (évite erreur 23503)
        const [nivExists, secExists] = await Promise.all([
          prisma.niveau.findUnique({ where: { id: titulaireNiveauId } }),
          prisma.section.findUnique({ where: { id: titulaireSectionId } }),
        ]);
        if (!nivExists || !secExists) {
          return res.status(400).json({ message: "Niveau/Section introuvable." });
        }

        data.titulaireNiveauId = titulaireNiveauId;
        data.titulaireSectionId = titulaireSectionId;
      }
    }
    // ====== fin titularisation ======

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "Aucun changement fourni." });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      include: { titulaireNiveau: true, titulaireSection: true },
    });

    return res.json({ user: publicUser(updated) });
  } catch (e) {
    // Email unique
    if (e?.code === "P2002" && Array.isArray(e?.meta?.target) && e.meta.target.includes("email")) {
      return res.status(400).json({ message: "Cet email est déjà utilisé." });
    }
    console.error(e);
    return res.status(500).json({ message: "Erreur lors de la mise à jour du profil." });
  }
}
