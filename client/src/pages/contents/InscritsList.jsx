// client/src/pages/contents/InscritsList.jsx
import { useEffect, useState } from "react";
import { api } from "../../api";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const DEFAULT_STUDENT = "/uploads/defaut.png";

export default function InscritsList() {
  const navigate = useNavigate();

  const [refs, setRefs] = useState({ niveaux: [], sections: [] });
  const [niveauId, setNiveauId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  // ↓↓↓ Par défaut: 10 (au lieu de 20). Logique inchangée.
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);

  // ligne "ouverte" (où l’on a cliqué sur l’👁️)
  const [openRowId, setOpenRowId] = useState(null);

  const loadRefs = async () => {
    try {
      const r = await api("/api/inscription/refs");
      setRefs({ niveaux: r.niveaux || [], sections: r.sections || [] });
    } catch (e) {
      Swal.fire("Erreur", e.message || "Impossible de charger les références.", "error");
    }
  };

  const load = async (p = page) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("page", String(p));
      qs.set("pageSize", String(pageSize));
      if (niveauId) qs.set("niveauId", String(niveauId));
      if (sectionId) qs.set("sectionId", String(sectionId));
      if (q.trim()) qs.set("q", q.trim());
      const res = await api(`/api/inscription/inscrits?${qs.toString()}`);
      setItems(res.items || []);
      setTotal(res.total || 0);
      setPage(res.page || p);
      setOpenRowId(null); // reset
    } catch (e) {
      Swal.fire("Erreur", e.message || "Chargement des inscrits impossible.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { (async () => { await loadRefs(); await load(1); })(); }, []);
  useEffect(() => { load(1); /* eslint-disable-next-line */ }, [niveauId, sectionId, pageSize]);

  const normPhoto = (p) =>
    !p ? DEFAULT_STUDENT : (p.startsWith("/uploads/") ? p : (p.startsWith("uploads/") ? "/" + p : p));

  return (
    <>
      <style>{`
        :root{
          --ink:#0f172a; --muted:#475569; --line:#e5e7eb; --ring:#93c5fd;
        }

        /* === Arrière-plan gradient de la page (scopé) === */
        .wrap{
          min-height:100vh;
          padding:28px 18px;
          background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #f97316 100%);
          display:flex; flex-direction:column; gap:16px; align-items:center;
        }

        /* === Titre sur le gradient === */
        .title{
          color:#ffffff; font-size: clamp(20px, 2.2vw, 30px); font-weight:900;
          padding-bottom:6px; letter-spacing:.25px; text-align:center;
          text-shadow:0 2px 10px rgba(0,0,0,.25);
          border-bottom:none;
        }

        /* === Bande filtres (glass) === */
        .filters{
          width:100%; max-width:1200px;
          display:flex; gap:10px; align-items:center; flex-wrap:wrap;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.7);
          border-radius: 16px;
          padding: 12px;
          box-shadow: 0 8px 24px rgba(2,6,23,.14);
        }

        /* === Sélecteurs / input === */
        .sel, .input{
          padding:10px 12px; border:1px solid var(--line); border-radius:12px;
          background:#ffffff; color:var(--ink); font-size:14px;
          transition:border-color .15s, box-shadow .15s, transform .05s ease;
          outline:none;
        }
        .sel:focus, .input:focus{
          border-color:var(--ring);
          box-shadow:0 0 0 4px rgba(147,197,253,.35);
        }

        /* === Boutons (gradients) === */
        .btn{
          padding:10px 14px; border:0; border-radius:12px; font-weight:900; cursor:pointer; color:#fff;
          background: linear-gradient(135deg, #0ea5e9, #6366f1);
          box-shadow:0 8px 22px rgba(15,23,42,.15);
          transition: transform .08s ease, filter .12s ease, box-shadow .2s ease, opacity .15s ease;
        }
        .btn:hover{ transform: translateY(-1px); filter: brightness(1.03); box-shadow:0 12px 26px rgba(15,23,42,.22); }
        .btn:active{ transform: translateY(0); }
        .btn-muted{
          background: linear-gradient(135deg, #cbd5e1, #94a3b8);
          color:#0f172a;
        }
        .btn-small{ padding:8px 10px; border-radius:10px; font-weight:800; }

        /* === Panel tableau (glass) === */
        .panel{
          width:100%; max-width:1200px;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.7);
          border-radius: 18px;
          padding: 14px;
          box-shadow: 0 12px 30px rgba(2,6,23,.16);
        }

        /* === Tableau moderne === */
        .table{ width:100%; border-collapse:separate; border-spacing:0; background:#fff; border-radius:12px; overflow:hidden; }
        th, td{ border-bottom:1px solid var(--line); padding:12px 10px; vertical-align:top; }
        th{
          position: sticky; top: 0; z-index: 1;
          background: linear-gradient(135deg,#0f172a,#1f2937);
          color:#fff; text-align:left; font-weight:900; letter-spacing:.25px; font-size:13px;
        }
        tbody tr:nth-child(even) td{ background:#fafafa; }
        tbody tr:hover td{ background:#eef2ff; }

        /* === Lignes / avatar / œil === */
        .row{ display:flex; gap:8px; align-items:center; }
        .avatar{ width:36px; height:36px; border-radius:50%; object-fit:cover; border:2px solid #0ea5e9; }

        .cell-el{ display:flex; align-items:center; justify-content:space-between; width:100%; gap:10px; }
        .cell-el-left{ display:flex; align-items:center; gap:8px; min-width:0; }
        .eye-btn{
          border:0; background:transparent; cursor:pointer;
          font-size:18px; line-height:1; padding:4px 6px; border-radius:10px;
          transition: transform .08s ease, background .15s ease, opacity .12s ease;
          margin-right:0;
        }
        .eye-btn:hover{ background:#e2e8f0; transform: translateY(-1px); }

        .inline-actions{ margin-top:6px; display:flex; justify-content:flex-end; }

        /* === Footer (pagination) === */
        .foot{
          width:100%; max-width:1200px;
          display:flex; justify-content:space-between; align-items:center;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.7);
          border-radius: 16px;
          padding: 10px 12px;
          box-shadow: 0 8px 22px rgba(2,6,23,.12);
        }
      `}</style>

      <div className="wrap">
        <div className="title">Liste des élèves inscrits</div>

        <div className="filters">
          <button className="btn btn-muted" onClick={() => navigate("/dashboard/inscription")}>← Retour</button>

          <select className="sel" value={niveauId} onChange={e=>setNiveauId(e.target.value)}>
            <option value="">Tous niveaux</option>
            {refs.niveaux.map(n => <option key={n.id} value={n.id}>{n.nom}</option>)}
          </select>

            <select className="sel" value={sectionId} onChange={e=>setSectionId(e.target.value)}>
            <option value="">Toutes sections</option>
            {refs.sections.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>

          <input className="input" placeholder="Recherche nom/prénom…" value={q} onChange={e=>setQ(e.target.value)} />
          <button className="btn" onClick={() => load(1)}>Rechercher</button>

          <span style={{marginLeft:"auto", color:"#f1f5f9"}}>Total: <b>{total}</b></span>
        </div>

        <div className="panel">
          {loading ? (
            <div style={{color:"#475569"}}>Chargement…</div>
          ) : !items.length ? (
            <div style={{color:"#475569"}}>Aucun inscrit trouvé.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Élève</th>
                  <th>Sexe</th>
                  <th>Niveau</th>
                  <th>Section</th>
                  <th>Téléphone</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e, i) => (
                  <tr key={e.id}>
                    <td>{(page - 1) * pageSize + i + 1}</td>

                    <td>
                      {/* Ligne Élève avec oeil tout à droite */}
                      <div className="cell-el">
                        <div className="cell-el-left">
                          <img className="avatar" src={normPhoto(e.photo)} alt="" />
                          <span>{e.nom} {e.prenom}</span>
                        </div>
                        <button
                          className="eye-btn"
                          title="Actions"
                          onClick={() => setOpenRowId(openRowId === e.id ? null : e.id)}
                        >
                          👁️
                        </button>
                      </div>

                      {/* Actions affichées quand l’œil est “ouvert” */}
                      {openRowId === e.id && (
                        <div className="inline-actions">
                          <button
                            className="btn btn-small"
                            onClick={() => navigate(`/dashboard/profil-eleve/${e.id}`)}
                          >
                            Voir profil
                          </button>
                        </div>
                      )}
                    </td>

                    <td>{e.sexe || "-"}</td>
                    <td>{e.niveau?.nom || "-"}</td>
                    <td>{e.section?.nom || "-"}</td>
                    <td>{e.telephone || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* pagination */}
        <div className="foot">
          <div className="row">
            <span style={{color:"#475569"}}>Par page:</span>
            <select className="sel" value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}>
              {[10,20,30,50,100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="row">
            <button
              className="btn btn-muted"
              onClick={()=>{ if (page>1){ setPage(p=>p-1); load(page-1); }}}
              disabled={page<=1}
            >
              ← Précédent
            </button>
            <span style={{padding:"0 10px", color:"#0f172a", fontWeight:800}}>
              Page {page} / {Math.max(1, Math.ceil(total / pageSize))}
            </span>
            <button
              className="btn btn-muted"
              onClick={()=>{
                const max = Math.ceil(total / pageSize)||1;
                if (page<max){ setPage(p=>p+1); load(page+1); }
              }}
              disabled={page >= Math.ceil(total / pageSize)}
            >
              Suivant →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
