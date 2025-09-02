// client/src/pages/contents/Matiere.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { api } from "../../api";

const CODE_RE = /^[A-Z0-9]{2,10}$/; // A–Z, 0–9, 2..10 chars

export default function Matiere() {
  const nav = useNavigate();

  const [form, setForm] = useState({ nom: "", code: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!String(form.nom).trim()) e.nom = "Nom obligatoire.";
    if (!CODE_RE.test(String(form.code).trim()))
      e.code = "Code: 2–10 caractères en A–Z/0–9.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const reset = () => {
    setForm({ nom: "", code: "" });
    setErrors({});
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await api("/api/matieres"); // ← GET liste
      const items = r?.matieres || r?.items || [];
      setList(items);
    } catch (e) {
      Swal.fire("Erreur", e?.message || "Chargement des matières impossible.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      return Swal.fire("Champs invalides", "Corrige les zones en rouge.", "warning");
    }
    try {
      setSaving(true);
      // POST JSON (adapter si ton backend attend multipart)
      await api("/api/matieres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: form.nom.trim(), code: form.code.trim() }),
      });
      await Swal.fire("Succès", "Matière enregistrée.", "success");
      reset();
      load();
    } catch (err) {
      // gère les doublons (contraintes uniques)
      const msg = err?.message || "Échec de l’enregistrement.";
      Swal.fire("Erreur", msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`
        .wrap{ display:flex; flex-direction:column; gap:18px; }
        .title{
          font-weight:800; font-size:32px; text-align:center;
          color:rgb(8,57,64); margin-top:4px;
        }

        .card{
          background:#fff; border:1px solid #e5e7eb; border-radius:16px;
          padding:18px; box-shadow:0 10px 30px rgba(2,6,23,.06);
        }

        .row{ display:flex; align-items:center; gap:14px; margin:12px 0; }
        .label{ width:240px; font-weight:800; color:#0f172a; font-size:20px; }
        .input{
          flex:1; padding:12px 14px; border:1px solid #e2e8f0; border-radius:10px;
          font-size:16px; transition:.15s;
        }
        .input:focus{ outline:none; border-color:#93c5fd; box-shadow:0 0 0 3px rgba(147,197,253,.35); }
        .invalid{ border-color:#dc2626 !important; box-shadow:0 0 0 3px rgba(220,38,38,.18); }
        .hint{ color:#475569; font-size:14px; margin-top:6px; }

        .actions{ display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-top:10px; }
        .btn{
          padding:12px 16px; border:0; border-radius:10px; font-weight:800; cursor:pointer;
          display:inline-flex; align-items:center; gap:10px; color:#fff;
          box-shadow:0 8px 20px rgba(2,6,23,.12); transition: transform .06s ease;
        }
        .btn:active{ transform: translateY(1px); }

        .btn-save{ background:linear-gradient(160deg,#0f766e,#063b3f); }
        .btn-reset{ background:#64748b; }
        .btn-coef{ background:linear-gradient(160deg,#a855f7,#7c3aed); } /* violet modern */
        .btn-coef:hover, .btn-save:hover{ filter:brightness(1.06); }
        .btn-reset:hover{ filter:brightness(0.98); }
        .btn:disabled{ opacity:.7; cursor:not-allowed; }

        .panel-title{ font-size:26px; font-weight:800; color:#0f172a; margin-bottom:10px; }
        .table{ width:100%; border-collapse:collapse; }
        th, td{ padding:12px 10px; border-bottom:1px solid #e5e7eb; }
        th{
          background:rgb(8,57,64); color:#fff; text-align:left;
          position:sticky; top:0; z-index:1;
        }
        tr:nth-child(even){ background:#f8fafc; }
        .id-col{ width:80px; text-align:center; }

        .sql-hint{
          margin-top:8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          background:#f8fafc; border:1px dashed #e5e7eb; color:#334155;
          border-radius:10px; padding:10px; white-space:pre-wrap;
        }
      `}</style>

      <div className="wrap">
        <div className="title">Ajouter une matière</div>

        <form className="card" onSubmit={submit} noValidate>
          <div className="row">
            <div className="label">Nom de la matière</div>
            <input
              className={`input ${errors.nom ? "invalid" : ""}`}
              placeholder="ex: Mathématique"
              value={form.nom}
              onChange={(e) => setField("nom", e.target.value)}
            />
          </div>

          <div className="row">
            <div className="label">Code matière</div>
            <input
              className={`input ${errors.code ? "invalid" : ""}`}
              placeholder="ex: MTHS"
              value={form.code}
              onChange={(e) => {
                // transforme en MAJUSCULES + filtre A–Z / 0–9
                const up = (e.target.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
                setField("code", up);
              }}
              maxLength={10}
            />
          </div>

          <div className="actions">
            <button className="btn btn-save" type="submit" disabled={saving}>
              <span>💾</span> {saving ? "Enregistrement..." : "Enregistrer"}
            </button>

            <button
              type="button"
              className="btn btn-reset"
              onClick={reset}
              disabled={saving}
              title="Vider les champs"
            >
              <span>🔄</span> Réinitialiser
            </button>

            <button
              type="button"
              className="btn btn-coef"
              onClick={() => {
                // redirige si la route existe; sinon affiche une info
                try { nav("/dashboard/coefficients"); }
                catch {
                  Swal.fire("Info", "La page Coefficient arrive bientôt.", "info");
                }
              }}
              title="Aller à la gestion des coefficients"
            >
              <span>🧮</span> Coefficient
            </button>
          </div>

          <div className="hint">
            💡 <b>Astuce :</b> le <b>code</b> est automatiquement mis en <u>MAJUSCULES</u>.
            Format conseillé : <b>2–10</b> caractères (A–Z, 0–9).
          </div>

          <div className="sql-hint">
            (Info) Les doublons sont déjà verrouillés par Prisma : <code>code_matiere</code> et <code>nom_matiere</code> sont <b>uniques</b>.
          </div>
        </form>

        <div className="card">
          <div className="panel-title">Matières existantes</div>

          {loading ? (
            <div style={{ color: "#475569" }}>Chargement…</div>
          ) : !list.length ? (
            <div style={{ color: "#475569" }}>Aucune matière enregistrée.</div>
          ) : (
            <div style={{ maxHeight: 420, overflow: "auto", borderRadius: 12 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th className="id-col">#</th>
                    <th>Nom</th>
                    <th style={{ width: 160 }}>Code</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((m) => (
                    <tr key={m.id ?? m.id_matiere}>
                      <td className="id-col">{m.id ?? m.id_matiere}</td>
                      <td>{m.nom ?? m.nom_matiere}</td>
                      <td style={{ fontWeight: 800 }}>{m.code ?? m.code_matiere}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
