// client/src/pages/contents/Coefficients.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { api } from "../../api";

export default function Coefficients() {
  const nav = useNavigate();

  // refs
  const [matieres, setMatieres] = useState([]);
  const [niveaux, setNiveaux] = useState([]);
  const [sections, setSections] = useState([]);

  // form
  const [matiereId, setMatiereId] = useState("");
  const [niveauId, setNiveauId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [coef, setCoef] = useState("");

  // data tableau (brut)
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const norm = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  // ===== Chargement refs + données
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [{ matieres: M1 } = {}, { niveaux: N, sections: S } = {}] =
          await Promise.all([
            api("/api/matieres").catch(() => ({})),
            api("/api/inscription/refs").catch(() => ({})),
          ]);
        setMatieres(Array.isArray(M1) ? M1 : []);
        setNiveaux(Array.isArray(N) ? N : []);
        setSections(Array.isArray(S) ? S : []);
      } catch {
        Swal.fire("Erreur", "Impossible de charger les listes.", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refreshCoeffs = async () => {
    try {
      const resCompact = await api("/api/coefficients/compact").catch(() => null);
      if (resCompact?.rows) {
        setRows(resCompact.__raw || []); // fallback si le back renvoie aussi la brute
        return;
      }
      const { coefficients } = await api("/api/coefficients").catch(() => ({}));
      setRows(Array.isArray(coefficients) ? coefficients : []);
    } catch {
      setRows([]);
    }
  };

  useEffect(() => {
    refreshCoeffs();
  }, []);

  // ====== IDs utilitaires trouvés depuis les libellés
  const idSeconde = useMemo(() => {
    const found = niveaux.find((n) => norm(n.nom ?? n.nom_niveau) === "seconde");
    return found?.id ?? found?.id_niveau ?? null;
  }, [niveaux]);

  const idPremiere = useMemo(() => {
    const found =
      niveaux.find((n) => ["premiere", "première"].includes(norm(n.nom ?? n.nom_niveau))) ||
      niveaux.find((n) => norm(n.nom ?? n.nom_niveau).startsWith("premier"));
    return found?.id ?? found?.id_niveau ?? null;
  }, [niveaux]);

  const idTerminale = useMemo(() => {
    const found =
      niveaux.find((n) => ["terminale", "terminal"].includes(norm(n.nom ?? n.nom_niveau))) ||
      niveaux.find((n) => norm(n.nom ?? n.nom_niveau).startsWith("terminal"));
    return found?.id ?? found?.id_niveau ?? null;
  }, [niveaux]);

  const secId = (wanted) => {
    const s = sections.find((x) => String(x.nom ?? x.nom_section).toUpperCase().trim() === wanted);
    return s?.id ?? s?.id_section ?? null;
  };
  const idA = useMemo(() => secId("A"), [sections]);
  const idB = useMemo(() => secId("B"), [sections]);
  const idC = useMemo(() => secId("C"), [sections]);
  const idL = useMemo(() => secId("L"), [sections]);
  const idS = useMemo(() => secId("S"), [sections]);
  const idOSE = useMemo(() => secId("OSE"), [sections]);

  // ====== Filtrage dynamique des sections
  const selectedNivName = useMemo(() => {
    const n = niveaux.find((x) => (x.id ?? x.id_niveau) == niveauId) ?? null;
    return n ? String(n.nom ?? n.nom_niveau) : "";
  }, [niveauId, niveaux]);

  const filteredSections = useMemo(() => {
    const name = norm(selectedNivName);
    const keep = (txt) =>
      sections.filter((s) => String(s.nom ?? s.nom_section).toUpperCase() === txt);
    if (!niveauId) return sections;
    if (name.includes("seconde"))
      return [{ id: "", nom: "-- Sélectionner --" }, ...keep("A"), ...keep("B"), ...keep("C")];
    if (name.includes("premiere") || name.includes("première") || name.includes("term"))
      return [{ id: "", nom: "-- Sélectionner --" }, ...keep("L"), ...keep("S"), ...keep("OSE")];
    return sections;
  }, [niveauId, sections, selectedNivName]);

  // ====== Compactage tableau (côté client)
  const compact = useMemo(() => {
    const by = {};
    rows.forEach((r) => {
      const m = r.id_matiere ?? r.matiereId ?? r.matiere_id;
      const n = r.id_niveau ?? r.niveauId ?? r.niveau_id;
      const s = r.id_section ?? r.sectionId ?? r.section_id;
      const c = Number(r.coefficient ?? r.coef ?? r.val ?? r.value ?? 0);
      if (!m || !n || !s || !c) return;
      by[m] ??= {};
      by[m][n] ??= {};
      by[m][n][s] = c;
    });

    // infos matières
    const matInfo = {};
    matieres.forEach((m) => {
      const id = m.id ?? m.id_matiere;
      matInfo[id] = {
        nom: m.nom ?? m.nom_matiere ?? "",
        code: m.code ?? m.code_matiere ?? "",
      };
    });

    const groupCoef = (matId, pairs) => {
      const vals = [];
      for (const [niv, sec] of pairs) {
        const v = by?.[matId]?.[niv]?.[sec];
        if (typeof v !== "number") return null;
        vals.push(v);
      }
      return new Set(vals).size === 1 ? vals[0] : null;
    };

    const matIds = Object.keys(matInfo)
      .map((x) => +x)
      .sort((a, b) => (matInfo[a]?.nom || "").localeCompare(matInfo[b]?.nom || "", "fr"));

    return matIds.map((mid) => {
      const lib = `${matInfo[mid]?.nom || ""}${matInfo[mid]?.code ? ` (${matInfo[mid].code})` : ""}`;
      const secABC =
        idSeconde && idA && idB && idC ? groupCoef(mid, [[idSeconde, idA], [idSeconde, idB], [idSeconde, idC]]) : null;
      const ptL =
        idPremiere && idTerminale && idL ? groupCoef(mid, [[idPremiere, idL], [idTerminale, idL]]) : null;
      const ptS =
        idPremiere && idTerminale && idS ? groupCoef(mid, [[idPremiere, idS], [idTerminale, idS]]) : null;
      const ptOSE =
        idPremiere && idTerminale && idOSE ? groupCoef(mid, [[idPremiere, idOSE], [idTerminale, idOSE]]) : null;
      return { matiere: lib, secABC, ptL, ptS, ptOSE };
    });
  }, [rows, matieres, idSeconde, idPremiere, idTerminale, idA, idB, idC, idL, idS, idOSE]);

  // ====== Soumission avec propagation
  const handleSave = async (e) => {
    e.preventDefault();
    const m = Number(matiereId),
      n = Number(niveauId),
      s = Number(sectionId),
      c = Number(coef);
    if (!m || !n || !s || !c) {
      return Swal.fire("Champs manquants", "Sélectionne matière, niveau, section et coefficient (>0).", "warning");
    }
    const payload = { matiereId: m, niveauId: n, sectionId: s, coefficient: c };

    try {
      setSaving(true);
      await api("/api/coefficients/upsert-propagate", {
        method: "POST",
        body: payload,
      });
      await refreshCoeffs();
      Swal.fire("Succès", "Coefficient enregistré ✅", "success");
      setCoef("");
    } catch (err) {
      if (err?.status === 404) {
        const pairs = [];
        const nivName = norm(selectedNivName);
        if (nivName.includes("seconde") && idSeconde && idA && idB && idC) {
          pairs.push({ matiereId: m, niveauId: idSeconde, sectionId: idA, coefficient: c });
          pairs.push({ matiereId: m, niveauId: idSeconde, sectionId: idB, coefficient: c });
          pairs.push({ matiereId: m, niveauId: idSeconde, sectionId: idC, coefficient: c });
        } else if ((nivName.includes("premiere") || nivName.includes("première") || nivName.includes("term")) && idPremiere && idTerminale) {
          if ([idL, idS, idOSE].includes(s)) {
            pairs.push({ matiereId: m, niveauId: idPremiere, sectionId: s, coefficient: c });
            pairs.push({ matiereId: m, niveauId: idTerminale, sectionId: s, coefficient: c });
          } else {
            pairs.push({ matiereId: m, niveauId: n, sectionId: s, coefficient: c });
          }
        } else {
          pairs.push({ matiereId: m, niveauId: n, sectionId: s, coefficient: c });
        }
        await api("/api/coefficients/bulk-upsert", { method: "POST", body: { items: pairs } });
        await refreshCoeffs();
        Swal.fire("Succès", "Coefficient(s) enregistré(s) ✅", "success");
        setCoef("");
      } else {
        Swal.fire("Erreur", err?.message || "Échec de l’enregistrement.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const helperText = useMemo(() => {
    const name = norm(selectedNivName);
    if (name.includes("seconde")) return "Seconde : appliqué automatiquement à A, B et C.";
    if (name.includes("premiere") || name.includes("première") || name.includes("term"))
      return "Première/Terminale : appliqué automatiquement aux 2 niveaux pour la même section (L, S ou OSE).";
    return "Sélectionne un niveau et une section. Les règles de propagation s’appliqueront automatiquement.";
  }, [selectedNivName]);

  const canSave = matiereId && niveauId && sectionId && Number(coef) > 0;

  return (
    <>
      <style>{`
        :root{
          --ink:#083940; --accent:#f37521; --muted:#6b7280; --card:#fff;
          --line:#e5e7eb; --ring:#93c5fd; --head:#0b3b40;
        }
        .wrap { display:flex; flex-direction:column; gap:18px; }
        .title { font-size:32px; font-weight:800; color:var(--head); text-align:center; margin:6px 0 8px; letter-spacing:.2px; }
        .card { background:var(--card); border:1px solid #eef2f7; border-radius:14px; box-shadow:0 10px 30px rgba(2,6,23,.06); padding:16px; }
        .row { display:grid; grid-template-columns: 160px 1fr; gap:12px; align-items:center; margin:8px 0; }
        .label { font-weight:800; color:var(--ink); }
        .control { display:flex; gap:12px; }
        .select, .input {
          width:100%; padding:12px 12px; border:1px solid var(--line); border-radius:10px; background:#f8fafc; font-size:14px;
          transition:border-color .15s, box-shadow .15s; outline:none;
        }
        .select:focus, .input:focus { border-color:var(--ring); box-shadow:0 0 0 3px rgba(147,197,253,.35); }
        .inline { display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:14px; }
        .hint { font-size:12.5px; color:#475569; margin-top:6px; }
        .actions { margin-top:12px; display:flex; gap:10px; }

        /* Boutons en linear-gradient + emojis */
        .btn { padding:10px 14px; border:0; border-radius:12px; font-weight:900; cursor:pointer; letter-spacing:.2px;
               box-shadow:0 8px 22px rgba(15,23,42,.15); transition: transform .04s, filter .15s, box-shadow .2s; }
        .btn:active{ transform: translateY(1px); }

        /* Enregistrer : vert */
        .btn-primary{
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color:#fff;
        }
        .btn-primary:hover{ filter: brightness(1.04); box-shadow:0 12px 28px rgba(34,197,94,.35); }
        .btn-primary:disabled{ opacity:.6; cursor:not-allowed; box-shadow:none; }

        /* Réinitialiser : gris bleuté */
        .btn-secondary{
          background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%);
          color:#0f172a;
        }
        .btn-secondary:hover{ filter: brightness(1.03); }

        /* Lien Matière : turquoise */
        .btn-link{
          background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
          color:#fff;
        }
        .btn-link:hover{ filter: brightness(1.04); }

        .table { width:100%; border-collapse: collapse; }
        .th, .td { border:1px solid var(--line); padding:10px 10px; font-size:14px; }
        .th { background:var(--ink); color:#fff; text-align:left; }
        .td.center { text-align:center; }
        .dash { color:#94a3b8; }

        @media (max-width: 900px){
          .inline { grid-template-columns: 1fr; }
          .row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="wrap">
        <div className="title">🧮 Ajouter / Mettre à jour un coefficient</div>

        {/* === Formulaire === */}
        <div className="card">
          <form onSubmit={handleSave}>
            <div className="row">
              <div className="label">📚 Matière</div>
              <div className="control">
                <select
                  className="select"
                  value={matiereId}
                  onChange={(e) => setMatiereId(e.target.value)}
                  disabled={loading}
                >
                  <option value="">-- Sélectionner --</option>
                  {matieres
                    .slice()
                    .sort((a, b) =>
                      (a.nom ?? a.nom_matiere ?? "").localeCompare(b.nom ?? b.nom_matiere ?? "", "fr")
                    )
                    .map((m) => {
                      const id = m.id ?? m.id_matiere;
                      const name = m.nom ?? m.nom_matiere ?? "";
                      const code = m.code ?? m.code_matiere ?? "";
                      return (
                        <option key={id} value={id}>
                          {name}
                          {code ? ` (${code})` : ""}
                        </option>
                      );
                    })}
                </select>
              </div>
            </div>

            <div className="row">
              <div className="label">🏫 Niveau</div>
              <div className="control inline">
                <select
                  className="select"
                  value={niveauId}
                  onChange={(e) => {
                    setNiveauId(e.target.value);
                    setSectionId("");
                  }}
                >
                  <option value="">-- Sélectionner --</option>
                  {niveaux
                    .slice()
                    .sort((a, b) => (a.id ?? a.id_niveau) - (b.id ?? b.id_niveau))
                    .map((n) => {
                      const id = n.id ?? n.id_niveau;
                      const nom = n.nom ?? n.nom_niveau ?? "";
                      return (
                        <option key={id} value={id}>
                          {nom}
                        </option>
                      );
                    })}
                </select>

                <div>
                  <div className="label" style={{ marginBottom: 6 }}>
                    🔖 Section
                  </div>
                  <select
                    className="select"
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value)}
                  >
                    <option value="">-- Sélectionner --</option>
                    {filteredSections.map((s) => {
                      const id = s.id ?? s.id_section;
                      const nom = s.nom ?? s.nom_section ?? "";
                      if (!id) return null;
                      return (
                        <option key={id} value={id}>
                          {nom}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <div className="label" style={{ marginBottom: 6 }}>
                    ⚖️ Coefficient
                  </div>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={10}
                    step={1}
                    placeholder="ex: 2"
                    value={coef}
                    onChange={(e) => setCoef(e.target.value)}
                  />
                </div>

                <div style={{ alignSelf: "end", display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" type="submit" disabled={!canSave || saving}>
                    {saving ? "⏳ Enregistrement..." : "💾 Enregistrer"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setMatiereId("");
                      setNiveauId("");
                      setSectionId("");
                      setCoef("");
                    }}
                  >
                    ♻️ Réinitialiser
                  </button>
                  <button
                    type="button"
                    className="btn btn-link"
                    onClick={() => nav("/dashboard/matiere")}
                    title="Gérer les matières"
                  >
                    📘 Matière
                  </button>
                </div>
              </div>
            </div>

            <div className="hint">💡 {helperText}</div>
          </form>
        </div>

        {/* === Tableau compact === */}
        <div className="card">
          <h3 style={{ margin: "0 0 12px", color: "var(--ink)" }}>📊 Coefficients (vue compacte)</h3>
          <table className="table">
            <thead>
              <tr>
                <th className="th">📘 Matière</th>
                <th className="th" style={{ textAlign: "center" }}>Seconde A/B/C</th>
                <th className="th" style={{ textAlign: "center" }}>Première/Terminale L</th>
                <th className="th" style={{ textAlign: "center" }}>Première/Terminale S</th>
                <th className="th" style={{ textAlign: "center" }}>Première/Terminale OSE</th>
              </tr>
            </thead>
            <tbody>
              {compact.length === 0 ? (
                <tr>
                  <td className="td" colSpan={5} style={{ textAlign: "center", color: "#64748b" }}>
                    Aucune donnée.
                  </td>
                </tr>
              ) : (
                compact.map((r, i) => (
                  <tr key={i}>
                    <td className="td">{r.matiere}</td>
                    <td className="td center">{r.secABC ?? <span className="dash">—</span>}</td>
                    <td className="td center">{r.ptL ?? <span className="dash">—</span>}</td>
                    <td className="td center">{r.ptS ?? <span className="dash">—</span>}</td>
                    <td className="td center">{r.ptOSE ?? <span className="dash">—</span>}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p className="hint" style={{ marginTop: 8 }}>
            Une cellule <b>—</b> signifie qu’au moins une combinaison attendue est absente ou que les valeurs diffèrent.
          </p>
        </div>
      </div>
    </>
  );
}
