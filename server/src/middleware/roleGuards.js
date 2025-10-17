// server/src/middleware/roleGuards.js
import { prisma } from "../prisma.js";

/**
 * Essaie d'extraire (niveauId, sectionId) de la requête.
 * - Depuis body ou query (niveauId/sectionId, id_niveau/id_section, niveau/section)
 * - Depuis params { cycle, sub } -> à vous d’adapter si vous mappez cycle/sub → ids
 * - Depuis eleveId : on va chercher l'élève pour déduire niveauId + sectionId
 */
async function extractClassIds(req) {
  // 1) Body / Query (plusieurs alias tolérés)
  const pick = (src, ...keys) => {
    for (const k of keys) {
      if (src?.[k] !== undefined && src?.[k] !== null && src?.[k] !== "") {
        const n = Number(src[k]);
        if (Number.isFinite(n)) return n;
      }
    }
    return null;
  };

  let niveauId =
    pick(req.body, "niveauId", "id_niveau", "niveau") ??
    pick(req.query, "niveauId", "id_niveau", "niveau");

  let sectionId =
    pick(req.body, "sectionId", "id_section", "section") ??
    pick(req.query, "sectionId", "id_section", "section");

  // 2) Si eleveId fourni on déduit la classe depuis l'élève
  const eleveId =
    pick(req.body, "eleveId", "id_eleve") ??
    pick(req.params, "eleveId", "id") ??
    pick(req.query, "eleveId", "id_eleve");

  if ((niveauId == null || sectionId == null) && eleveId != null) {
    const el = await prisma.eleve.findUnique({
      where: { id: eleveId },
      select: { niveauId: true, sectionId: true },
    });
    if (el) {
      if (niveauId == null) niveauId = el.niveauId ?? null;
      if (sectionId == null) sectionId = el.sectionId ?? null;
    }
  }

  // 3) Tout doit être numérique ou null
  return {
    niveauId: Number.isFinite(niveauId) ? niveauId : null,
    sectionId: Number.isFinite(sectionId) ? sectionId : null,
  };
}

/**
 * Autorise si:
 * - user.role === 'PROVISEUR'
 * - user.role === 'PROFESSEUR' ET (user.titulaireNiveauId, user.titulaireSectionId) === (niveauId, sectionId)
 * Sinon -> 403
 *
 * NB: on exige (niveauId && sectionId). Si absent de la requête,
 *     on tente de les déduire via eleveId, sinon on renvoie 400.
 */
export async function requireTitulaireOrProviseurForClass(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        role: true,
        titulaireNiveauId: true,
        titulaireSectionId: true,
      },
    });

    if (!me) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    if (me.role === "PROVISEUR") {
      // Full access
      return next();
    }

    // Besoin de niveau + section
    const { niveauId, sectionId } = await extractClassIds(req);
    if (niveauId == null || sectionId == null) {
      return res.status(400).json({
        message:
          "Classe manquante. Fournissez niveauId et sectionId (ou eleveId).",
      });
    }

    // Si professeur titulaire de cette classe => OK
    if (
      me.role === "PROFESSEUR" &&
      me.titulaireNiveauId === niveauId &&
      me.titulaireSectionId === sectionId
    ) {
      return next();
    }

    return res
      .status(403)
      .json({ message: "Accès refusé: réservé au proviseur ou au titulaire de cette classe." });
  } catch (e) {
    console.error("requireTitulaireOrProviseurForClass:", e);
    return res.status(500).json({ message: "Erreur serveur d'autorisation." });
  }
}
