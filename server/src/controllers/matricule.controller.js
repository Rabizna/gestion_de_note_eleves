// server/src/controllers/matricule.controller.js
import { prisma } from "../prisma.js";

const START_MATRICULE = 950;

/**
 * GET /api/matricule/eleves
 * Liste des élèves triés par nom puis prénom
 */
export const getAllEleves = async (_req, res) => {
  try {
    const eleves = await prisma.eleve.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        matricule: true,
        niveau: { select: { nom: true } },
        section: { select: { nom: true } },
      },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    });

    res.json({ success: true, data: eleves });
  } catch (error) {
    console.error("Erreur lors de la récupération des élèves:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des élèves",
    });
  }
};

/**
 * POST /api/matricule/attribuer
 * Attribue des matricules UNIQUEMENT aux élèves sans matricule,
 * en continuant après le max existant, et en démarrant MIN=950.
 */
export const attribuerMatricules = async (_req, res) => {
  try {
    const aMettreAJour = await prisma.eleve.findMany({
      where: { inscrit: true, matricule: null }, // retire "inscrit: true" si pas de champ
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      select: { id: true },
    });

    if (aMettreAJour.length === 0) {
      return res.json({
        success: true,
        message: "Aucun élève sans matricule trouvé.",
        data: { elevesMisAJour: 0 },
      });
    }

    const { _max } = await prisma.eleve.aggregate({
      _max: { matricule: true },
      where: { matricule: { not: null } },
    });

    let next = Math.max(
      START_MATRICULE,
      (_max?.matricule ?? START_MATRICULE - 1) + 1
    );

    const updates = aMettreAJour.map((e, i) =>
      prisma.eleve.update({
        where: { id: e.id },
        data: { matricule: next + i },
      })
    );

    const results = await prisma.$transaction(updates);

    res.json({
      success: true,
      message: `${results.length} matricule(s) attribué(s).`,
      data: {
        elevesMisAJour: results.length,
        matriculeDebut: next,
        matriculeFin: next + results.length - 1,
      },
    });
  } catch (error) {
    console.error("Erreur lors de l'attribution des matricules:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'attribution des matricules",
    });
  }
};

/**
 * PUT /api/matricule/reordonner
 * Réattribue des matricules à TOUS les élèves inscrits,
 * triés Nom, Prénom, en partant de 950 sans trou,
 * en évitant les collisions avec les non-inscrits.
 *
 * Stratégie:
 *  - (1) mettre les inscrits à NULL (évite P2002 pendant la réécriture)
 *  - (2) construire la séquence 950, 951, ... en SKIPPANT les numéros
 *        déjà occupés par des non-inscrits
 *  - (3) réécrire les nouveaux numéros
 */
export const reordonnerMatricules = async (_req, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1) Liste des inscrits à réordonner (ordre Nom, Prénom)
      const inscrits = await tx.eleve.findMany({
        where: { inscrit: true },
        orderBy: [{ nom: "asc" }, { prenom: "asc" }],
        select: { id: true },
      });

      if (!inscrits.length) {
        return {
          elevesMisAJour: 0,
          matriculeDebut: null,
          matriculeFin: null,
        };
      }

      const inscritIds = inscrits.map((e) => e.id);

      // 2) Libérer leurs numéros pour éviter la collision temporaire P2002
      await tx.eleve.updateMany({
        where: { id: { in: inscritIds } },
        data: { matricule: null },
      });

      // 3) Numéros "réservés" par des NON-inscrits -> à éviter
      const reservedRows = await tx.eleve.findMany({
        where: { inscrit: { not: true }, matricule: { not: null } },
        select: { matricule: true },
      });
      const reserved = new Set((reservedRows || []).map((r) => r.matricule));

      // 4) Construire la séquence cible en sautant les "reserved"
      const targets = [];
      let cur = START_MATRICULE;
      for (let i = 0; i < inscrits.length; i++) {
        while (reserved.has(cur)) cur++;
        targets.push(cur++);
      }

      // 5) Réécriture des numéros (pas de collision : tous les inscrits sont à NULL)
      //    NB: pas de nested $transaction dans le callback; on exécute en parallèle.
      await Promise.all(
        inscrits.map((e, idx) =>
          tx.eleve.update({
            where: { id: e.id },
            data: { matricule: targets[idx] },
          })
        )
      );

      return {
        elevesMisAJour: inscrits.length,
        matriculeDebut: targets[0],
        matriculeFin: targets[targets.length - 1],
      };
    });

    res.json({
      success: true,
      message: `Réordonnancement terminé (${result.elevesMisAJour} élèves).`,
      data: result,
    });
  } catch (error) {
    console.error("Erreur lors du réordonnancement des matricules:", error);
    res.status(500).json({
      success: false,
      message:
        "Erreur lors du réordonnancement des matricules (vérifie la contrainte unique et les valeurs existantes).",
    });
  }
};

/**
 * PUT /api/matricule/reset (optionnel)
 * Remet tous les matricules à NULL
 */
export const resetMatricules = async (_req, res) => {
  try {
    const result = await prisma.eleve.updateMany({ data: { matricule: null } });
    res.json({
      success: true,
      message: `${result.count} matricule(s) remis à zéro.`,
      data: { elevesReset: result.count },
    });
  } catch (error) {
    console.error("Erreur lors de la remise à zéro des matricules:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la remise à zéro des matricules",
    });
  }
};
