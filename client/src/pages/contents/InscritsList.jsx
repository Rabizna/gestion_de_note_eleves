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
  const [pageSize, setPageSize] = useState(20);
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
        .wrap{ display:flex; flex-direction:column; gap:14px; }
        .title{ color:rgb(8,57,64); font-size:22px; font-weight:800; padding-bottom:10px; border-bottom:2px solid rgb(243,117,33); }
        .filters{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
        .sel, .input{ padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; }
        .btn{ padding:10px 14px; border:0; border-radius:10px; font-weight:700; cursor:pointer; color:#fff; background:rgb(8,57,64); }
        .btn-muted{ background:#64748b; }
        .btn-small{ padding:6px 10px; border-radius:8px; font-weight:700; }
        .table{ width:100%; border-collapse:collapse; }
        th, td{ border:1px solid #e5e7eb; padding:10px; vertical-align:top; }
        th{ background:rgb(8,57,64); color:#fff; }
        tr:nth-child(even){ background:#f8fafc; }

        .row{ display:flex; gap:8px; align-items:center; }
        .avatar{ width:36px; height:36px; border-radius:50%; object-fit:cover; border:2px solid rgb(8,57,64); }

        .cell-el{ display:flex; align-items:center; justify-content:space-between; width:100%; gap:10px; }
        .cell-el-left{ display:flex; align-items:center; gap:8px; min-width:0; }
        .eye-btn{
          border:0; background:transparent; cursor:pointer;
          font-size:18px; line-height:1; padding:4px 6px; border-radius:8px;
          transition: transform .08s ease, background .15s ease;
          margin-right:0; /* demandé */
        }
        .eye-btn:hover{ background:#e2e8f0; transform: translateY(-1px); }
        .inline-actions{ margin-top:6px; display:flex; justify-content:flex-end; }
        .foot{ display:flex; justify-content:space-between; align-items:center; }
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

          <span style={{marginLeft:"auto", color:"#475569"}}>Total: <b>{total}</b></span>
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
            <span style={{padding:"0 10px"}}>Page {page} / {Math.max(1, Math.ceil(total / pageSize))}</span>
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
