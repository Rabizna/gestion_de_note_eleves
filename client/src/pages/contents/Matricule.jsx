// client/src/pages/contents/Matricules.jsx
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { api } from "../../api";

export default function Matricule() {
  const [eleves, setEleves] = useState([]);
  const [loading, setLoading] = useState(true);

  const SWAL = (opts) =>
    Swal.fire({
      confirmButtonText: "OK",
      buttonsStyling: false,
      customClass: { confirmButton: "btn gradSave" },
      ...opts,
    });

  const load = async () => {
    setLoading(true);
    try {
      const r = await api("/api/matricule/eleves");
      setEleves(r?.data || []);
    } catch (e) {
      console.error(e);
      SWAL({ icon: "error", title: "Erreur", text: "Chargement impossible." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attribuer = async () => {
    try {
      const r = await api("/api/matricule/attribuer", { method: "POST" });
      await SWAL({
        icon: "success",
        title: "🎯 Attribué",
        text: r?.message || "Matricules attribués/complétés.",
      });
      load();
    } catch (e) {
      SWAL({ icon: "error", title: "Erreur", text: e.message || "Échec." });
    }
  };

  const reordonner = async () => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "🔁 Réordonner depuis 950 ?",
      text: "Tous les élèves inscrits seront renumérotés (950, 951, ...).",
      showCancelButton: true,
      confirmButtonText: "Oui, réordonner",
      cancelButtonText: "Annuler",
    });
    if (!confirm.isConfirmed) return;

    try {
      const r = await api("/api/matricule/reordonner", { method: "PUT" });
      await SWAL({
        icon: "success",
        title: "✅ Terminé",
        text: r?.message || "Réordonnancement effectué.",
      });
      load();
    } catch (e) {
      SWAL({ icon: "error", title: "Erreur", text: e.message || "Échec." });
    }
  };

  return (
    <div className="matricule-page">
      <style>{`
        /* === Page background with gradient (scopé à cette page) === */
        .matricule-page{
          min-height: 100vh;
          padding: 28px 18px;
          background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #f97316 100%);
          display: flex;
          align-items: flex-start;
          justify-content: center;
        }

        /* === Panel (carte centrale "glass") === */
        .panel{
          width: 100%;
          max-width: 1180px;
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.6);
          border-radius: 18px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.18);
          padding: 22px;
          color: #0f172a; /* slate-900 */
        }

        .heading{
          display:flex;
          align-items:center;
          gap:12px;
          margin: 4px 0 6px;
          font-size: clamp(20px, 2.2vw, 28px);
          font-weight: 800;
          letter-spacing: 0.2px;
        }
        .sub{
          margin: 0 0 18px;
          color: #475569; /* slate-600 */
          font-size: 14px;
        }

        /* === Toolbar === */
        .toolbar{
          display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap
        }
        .btn{
          padding:10px 16px;border:0;border-radius:12px;
          color:#fff;font-weight:800;cursor:pointer;
          box-shadow: 0 6px 16px rgba(0,0,0,0.15);
          transform: translateY(0); transition: transform .12s ease, box-shadow .12s ease, opacity .12s ease;
        }
        .btn:hover{ transform: translateY(-1px); box-shadow: 0 10px 20px rgba(0,0,0,0.2); opacity: .98; }
        .btn:active{ transform: translateY(0); }

        .btn-primary{
          background: linear-gradient(135deg, #0ea5e9, #6366f1);
        }
        .btn-secondary{
          background: linear-gradient(135deg, #10b981, #22c55e);
        }

        /* === Table === */
        .table-wrap{
          overflow:auto;
          border-radius:14px;
          box-shadow: 0 8px 18px rgba(2,6,23,0.08);
          border: 1px solid #e5e7eb; /* gray-200 */
        }
        .table{
          width:100%;
          border-collapse: separate;
          border-spacing: 0;
          background: #ffffff;
        }
        .table th{
          position: sticky; top: 0;
          background: linear-gradient(135deg, #0f172a, #1f2937);
          color:#fff; text-align:left;
          padding:12px 12px; font-weight:800; font-size: 13px;
          letter-spacing: .3px;
        }
        .table td{
          border-top: 1px solid #eef2f7;
          padding:12px;
          color:#0f172a;
          font-size: 14px;
        }
        .table thead th:first-child{ border-top-left-radius: 12px; }
        .table thead th:last-child{ border-top-right-radius: 12px; }
        .table tbody tr:nth-child(even) td{ background:#fafafa; }
        .table tbody tr:hover td{ background:#eef2ff; }

        .muted{ color:#6b7280; }

        /* Badges */
        .badge{
          display:inline-flex; align-items:center; gap:6px;
          padding:3px 9px; border-radius:999px; font-size:12px; font-weight:800;
          border: 1px solid transparent;
        }
        .badge-warn{
          background:#fef3c7; color:#92400e; border-color:#fde68a;
        }
        .badge-ok{
          background:#dcfce7; color:#166534; border-color:#bbf7d0;
        }

        /* Tiny helpers */
        .kpis{
          display:flex; gap:10px; flex-wrap:wrap; margin: 6px 0 14px;
        }
        .kpi{
          background: #ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:10px 12px; font-size:13px; font-weight:700; color:#334155;
        }
      `}</style>

      <div className="panel">
        <div className="heading">🪪 Gestion des matricules</div>
        <p className="sub">Suivez, attribuez et réordonnez les matricules des élèves en un clic. ✨</p>

        <div className="toolbar">
          <button className="btn btn-primary" onClick={attribuer}>
            🎯 Attribuer / MAJ les manquants
          </button>
          <button className="btn btn-secondary" onClick={reordonner}>
            🔁 Réordonner tous depuis 950
          </button>
        </div>

        {/* Petits indicateurs rapides */}
        {!loading && (
          <div className="kpis">
            <div className="kpi">👥 Total: {eleves.length}</div>
            <div className="kpi">
              🧮 Sans matricule:{" "}
              {eleves.filter((e) => !e.matricule).length}
            </div>
          </div>
        )}

        {loading ? (
          <div>⏳ Chargement…</div>
        ) : eleves.length === 0 ? (
          <div>😶 Aucun élève.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>👤 Nom</th>
                  <th>🧍 Prénom</th>
                  <th style={{ width: 160 }}>🪪 Matricule</th>
                  <th style={{ width: 180 }}>🎓 Niveau</th>
                  <th style={{ width: 140 }}>🧩 Section</th>
                </tr>
              </thead>
              <tbody>
                {eleves.map((e, idx) => (
                  <tr key={e.id}>
                    <td>{idx + 1}</td>
                    <td>{e.nom || ""}</td>
                    <td>{e.prenom || ""}</td>
                    <td>
                      {e.matricule ? (
                        <span className="badge badge-ok">✅ {e.matricule}</span>
                      ) : (
                        <span className="badge badge-warn">⛔ Manquant</span>
                      )}
                    </td>
                    <td>{e.niveau?.nom || <span className="muted">—</span>}</td>
                    <td>{e.section?.nom || <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
