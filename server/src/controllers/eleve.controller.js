import { prisma } from "../prisma.js";

/** Normalise la photo quel que soit le stockage : Buffer BLOB, dataURL, ou chemin */
function normalizePhoto(raw) {
  if (!raw) return null;
  if (typeof raw === "string") {
    // data:image/...  ou chemin /uploads/...
    return raw.startsWith("data:image") ? raw : (raw.startsWith("/") ? raw : `/${raw}`);
  }
  try {
    // Buffer -> base64
    return `data:image/jpeg;base64,${Buffer.from(raw).toString("base64")}`;
  } catch {
    return null;
  }
}

function mapEleveRow(e) {
  return {
    id: e.id,
    nom: e.nom ?? "",
    prenom: e.prenom ?? "",
    numero: e.numero ?? e.num ?? null,
    matricule: e.matricule ?? e.im ?? e.IM ?? null,
    photo: normalizePhoto(e.photo),
    niveau: e.niveau ? { id: e.niveau.id, nom: e.niveau.nom } : null,
    section: e.section ? { id: e.section.id, nom: e.section.nom } : null,
  };
}

/** GET /api/eleves/all  →  [{ id, nom, prenom, numero, matricule, photo, niveau:{}, section:{} }, ...] */
export async function listAllEleves(_req, res) {
  try {
    const rows = await prisma.eleve.findMany({
      include: { niveau: true, section: true },
      orderBy: [
        { niveauId: "asc" },
        { sectionId: "asc" },
        { nom: "asc" },
        { prenom: "asc" },
      ],
      take: 3000, // limite de sécurité
    });
    res.json({ eleves: rows.map(mapEleveRow) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur chargement élèves." });
  }
}
