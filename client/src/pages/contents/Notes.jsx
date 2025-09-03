// client/src/pages/contents/Notes.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Swal from "sweetalert2";
import { api } from "../../api";

const DEFAULT_STUDENT = "/uploads/defaut.png";

export default function Notes() {
  const navigate = useNavigate();
  const { cycle, sub } = useParams();
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const m = await api("/api/absence/meta");
        setMeta(m);
      } catch {
        setMeta({
          buttons: {
            seconde: ["A", "B", "C"],
            premiere: ["L", "S", "OSE"],
            terminale: ["L", "S", "OSE"],
          },
        });
      }
    })();
  }, []);

  const goCycle = (c) => navigate(`/dashboard/notes/${c}`);
  const goSub = (code) => { if (!cycle) return; navigate(`/dashboard/notes/${cycle}/${code}`); };
  const subButtons = cycle ? meta?.buttons?.[cycle] ?? [] : [];

  return (
    <>
      <style>{`
        .wrap { display:flex; flex-direction:column; gap:16px; }
        .title { color: rgb(8,57,64); font-size:22px; font-weight:800; padding-bottom:10px;
                 border-bottom:2px solid rgb(243,117,33); }
        .grid-3 { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:24px; margin-top:30px; }

        .btnBig {
          color:#fff; border:0; border-radius:12px; padding:22px; font-size:18px; font-weight:700; cursor:pointer;
          background: linear-gradient(135deg, rgba(8,57,64,1) 0%, rgba(15,118,110,1) 100%);
          transition: transform .15s ease, filter .15s ease, box-shadow .15s ease;
          margin-top: 120px;
          box-shadow: 0 10px 22px rgba(2,6,23,.18);
        }
        .btnBig:hover { filter: brightness(1.06); transform: translateY(-1px); box-shadow: 0 14px 28px rgba(2,6,23,.24); }

        .back { align-self:flex-start; background:#f1f5f9; border:0; border-radius:10px; padding:8px 12px; font-weight:700; cursor:pointer; }
        .crumbs { display:flex; gap:8px; align-items:center; color:#334155; }
        .crumbs a { color:#0f766e; text-decoration:none; }

        .formWrap { display:flex; justify-content:space-between; gap:30px; margin-top:24px; }
        .col { flex:1; display:flex; flex-direction:column; gap:14px; }
        .row { display:flex; align-items:center; gap:12px; }
        .lbl { width:190px; font-weight:800; color:rgb(8,57,64); }
        .read { flex:1; background:#f8fafc; border:1px solid #e5e7eb; border-radius:10px; min-height:20px; padding:10px; }
        .select, .input {
          flex:1; padding:12px; border:1px solid #e5e7eb; border-radius:12px; background:#fff; font-size:14px;
          outline:none; transition:border-color .15s, box-shadow .15s;
        }
        .select:focus, .input:focus { border-color:#93c5fd; box-shadow:0 0 0 3px rgba(147,197,253,.35); }
        .right { width:220px; display:flex; flex-direction:column; align-items:center; gap:16px; }
        .photo { width:160px; height:160px; border-radius:10px; object-fit:cover; border:1px solid #e5e7eb; background:#fff; }

        .btns { display:flex; gap:14px; margin:22px 0 10px; justify-content:center; flex-wrap:wrap; }
        .btn { padding:12px 18px; border:none; border-radius:12px; font-size:15px; font-weight:800; cursor:pointer; color:#fff;
               transition: transform .12s ease, filter .12s ease, box-shadow .12s ease; box-shadow: 0 6px 16px rgba(2,6,23,.14); }
        .btn:hover { filter:brightness(1.06); transform: translateY(-1px); }
        .gradSave   { background: linear-gradient(135deg,#22c55e,#16a34a); }
        .gradReset  { background: linear-gradient(135deg,#64748b,#334155); }
        .gradQuit   { background: linear-gradient(135deg,#ef4444,#dc2626); }
        .pill { padding:6px 10px; background:#ecfeff; border:1px solid #bae6fd; border-radius:999px; font-size:12px; font-weight:700; color:#075985; }

        @media (max-width: 980px){
          .grid-3 { grid-template-columns: 1fr; }
          .formWrap { flex-direction:column; }
          .right { width:100%; align-items:flex-start; }
        }
      `}</style>

      <div className="wrap">
        <div className="title">Notes</div>

        {!cycle && (
          <div className="grid-3">
            <button className="btnBig" onClick={() => goCycle("seconde")}>Seconde</button>
            <button className="btnBig" onClick={() => goCycle("premiere")}>Première</button>
            <button className="btnBig" onClick={() => goCycle("terminale")}>Terminale</button>
          </div>
        )}

        {cycle && !sub && (
          <>
            <button className="back" onClick={() => navigate("/dashboard/notes")}>← Retour</button>
            <div className="grid-3">
              {(subButtons.length ? subButtons : ["A","B","C"]).map(code => (
                <button key={code} className="btnBig" onClick={() => goSub(code)}>{code}</button>
              ))}
            </div>
          </>
        )}

        {cycle && sub && (
          <>
            <div className="crumbs">
              <button className="back" onClick={() => navigate(`/dashboard/notes/${cycle}`)}>← Retour</button>
              <span>
                <Link to="/dashboard/notes">Notes</Link> / <Link to={`/dashboard/notes/${cycle}`}>{cap(cycle)}</Link> / {sub}
              </span>
            </div>
            <NoteForm cycle={cycle} sub={sub} />
          </>
        )}
      </div>
    </>
  );
}

/* ------------------------ Formulaire ------------------------ */
function NoteForm({ cycle, sub }) {
  const navigate = useNavigate();
  const [eleves, setEleves] = useState([]);
  const [matieres, setMatieres] = useState([]);

  const [eleveId, setEleveId] = useState("");
  const [eleve, setEleve] = useState(null);

  const [matiereId, setMatiereId] = useState("");
  const [trimestre, setTrimestre] = useState("1er trimestre");
  const [typeNote, setTypeNote] = useState("");
  const [note, setNote] = useState("");

  const SWAL = (opts) =>
    Swal.fire({
      confirmButtonText: "OK",
      buttonsStyling: false,
      customClass: { confirmButton: "btn gradSave" },
      ...opts,
    });

  useEffect(() => {
    (async () => {
      try {
        const qs = new URLSearchParams({ cycle, sub });
        const [E, M] = await Promise.all([
          api(`/api/notes/eleves?${qs.toString()}`),
          api(`/api/notes/matieres?${qs.toString()}`),
        ]);
        setEleves(E?.eleves || []);
        setMatieres(M?.matieres || []);
      } catch (e) {
        SWAL({ icon: "error", title: "Erreur", text: e.message || "Chargement des données impossible." });
      }
    })();
    setEleveId(""); setEleve(null);
    setMatiereId(""); setTrimestre("1er trimestre");
    setTypeNote(""); setNote("");
  }, [cycle, sub]);

  const onSelectEleve = () => {
    const e = eleves.find((x) => String(x.id) === String(eleveId));
    setEleve(e || null);
  };

  const coef = useMemo(() => {
    const m = matieres.find((x) => String(x.id) === String(matiereId));
    return Number(m?.coefficient || 1);
  }, [matiereId, matieres]);

  const normPhoto = (p) => {
    if (!p) return DEFAULT_STUDENT;
    if (typeof p !== "string") return DEFAULT_STUDENT;
    if (p.startsWith("/uploads/")) return p;
    if (p.startsWith("uploads/")) return "/" + p;
    return p; // data:image/... ou http(s)://...
  };

  const resetForm = () => {
    setEleveId(""); setEleve(null);
    setMatiereId(""); setTrimestre("1er trimestre");
    setTypeNote(""); setNote("");
  };

  const save = async () => {
    const n = Number(note);
    if (!eleve)     return SWAL({ icon:"error", title:"Erreur", text:"Veuillez sélectionner un élève." });
    if (!matiereId) return SWAL({ icon:"error", title:"Erreur", text:"Veuillez sélectionner une matière." });
    if (!typeNote)  return SWAL({ icon:"error", title:"Erreur", text:"Choisissez le type de note." });
    if (Number.isNaN(n) || n < 0 || n > 20)
      return SWAL({ icon:"error", title:"Erreur", text:"La note doit être comprise entre 0 et 20." });

    try {
      await api("/api/notes", {
        method: "POST",
        body: {
          eleveId: Number(eleve.id),
          matiereId: Number(matiereId),
          trimestre,
          type: typeNote,
          note: n,
        },
      });
      await SWAL({ icon:"success", title:"Succès", text:"💾 Note enregistrée avec succès." });
      resetForm();
    } catch (e) {
      SWAL({ icon:"error", title:"Erreur", text: e.message || "Échec de l'enregistrement." });
    }
  };

  return (
    <>
      <h2 style={{ textAlign:"center", color:"rgb(8,57,64)", marginTop:30 }}>
        Note {cap(cycle)} {sub}
      </h2>

      <div className="formWrap">
        {/* Colonne gauche */}
        <div className="col">
          <div className="row">
            <label className="lbl">Numéro :</label>
            <select className="select" value={eleveId} onChange={(e)=>setEleveId(e.target.value)}>
              <option value="">Sélectionner un élève</option>
              {eleves.map(e => (
                <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>
              ))}
            </select>
            <button className="btn gradReset" onClick={onSelectEleve}>👤 Sélectionner</button>
          </div>

          <div className="row"><label className="lbl">Nom :</label><span className="read">{eleve?.nom ?? "-"}</span></div>
          <div className="row"><label className="lbl">Prénom :</label><span className="read">{eleve?.prenom ?? "-"}</span></div>
          <div className="row"><label className="lbl">Sexe :</label><span className="read">{eleve?.sexe ?? "-"}</span></div>

          <div className="row">
            <label className="lbl">Date de naissance :</label>
            <span className="read">{eleve?.dateNais ? new Date(eleve.dateNais).toLocaleDateString() : "-"}</span>
            <span className="read" style={{flex:"unset"}}>à {eleve?.lieuNais ?? "-"}</span>
          </div>

          <div className="row">
            <label className="lbl">Classe :</label>
            <span className="read">{eleve?.niveau?.nom ?? "-"}</span>
            <span className="read" style={{flex:"unset"}}>{eleve?.section?.nom ?? "-"}</span>
          </div>

          <div className="row">
            <label className="lbl">Téléphone :</label>
            <span className="read">{eleve?.telephone ?? "-"}</span>
            <label className="lbl" style={{width:120}}>Domicile :</label>
            <span className="read">{eleve?.domicile ?? "-"}</span>
          </div>

          {/* Sélecteurs */}
          <div className="row">
            <label className="lbl">Matière :</label>
            <select className="select" value={matiereId} onChange={(e)=>setMatiereId(e.target.value)}>
              <option value="">Sélectionner une matière</option>
              {matieres.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nom}{m.code ? ` (${m.code})` : ""} {m.coefficient ? ` · Coeff ${m.coefficient}` : ""}
                </option>
              ))}
            </select>
            <span className="pill">Coeff : {Number.isFinite(coef) ? coef : 1}</span>
          </div>

          <div className="row">
            <label className="lbl">Trimestre :</label>
            <select className="select" value={trimestre} onChange={(e)=>setTrimestre(e.target.value)}>
              <option value="1er trimestre">1er trimestre</option>
              <option value="2eme trimestre">2ème trimestre</option>
              <option value="3eme trimestre">3ème trimestre</option>
            </select>
          </div>

          <div className="row">
            <label className="lbl">Type de note :</label>
            <select className="select" value={typeNote} onChange={(e)=>setTypeNote(e.target.value)}>
              <option value="">Sélectionner le type</option>
              <option value="Note Journalière">Note Journalière</option>
              <option value="Note Examen">Note Examen</option>
            </select>
          </div>

          <div className="row">
            <label className="lbl">Note (sur 20) :</label>
            <input className="input" type="number" min="0" max="20" step="0.5" value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Entrez la note" />
            <label className="lbl" style={{width:110}}>Mention :</label>
            <span className="read" style={{flex:"unset", minWidth:160}}>
              {Number.isFinite(Number(note)) ? (
                Number(note) >= 16 ? "Très Bien" :
                Number(note) >= 14 ? "Bien" :
                Number(note) >= 12 ? "Assez Bien" :
                Number(note) >= 10 ? "Passable" : "Insuffisant"
              ) : "—"}
            </span>
          </div>

          <div className="row">
            <label className="lbl">Total (× Coeff) :</label>
            <span className="read" style={{fontWeight:800}}>
              {(() => {
                const n = Number(note);
                return Number.isFinite(n) && n >= 0 && n <= 20 ? (n * (Number.isFinite(coef) ? coef : 1)).toFixed(2) : "—";
              })()}
            </span>
          </div>
        </div>

        {/* Colonne droite : photo */}
        <div className="right">
          <img
            className="photo"
            src={normPhoto(eleve?.photo ?? eleve?.photoUrl)}
            alt="Photo élève"
            onError={(e)=>{ e.currentTarget.src = DEFAULT_STUDENT; }}
          />
        </div>
      </div>

      <div className="btns">
        <button className="btn gradSave"  onClick={save}>💾 Enregistrer</button>
        <button className="btn gradReset" onClick={resetForm}>🔄 Actualiser</button>
        <button className="btn gradQuit" onClick={()=>navigate("/dashboard")}>🏠 Quitter</button>
      </div>

      <button
        className="btn"
        style={{ display:"block", margin:"1px 265px 50px 265px",
                 background:"linear-gradient(135deg,#f59e0b,#f97316)" }}
        onClick={()=>navigate(`/dashboard/notes/archive/${cycle}/${sub}`)}
      >
        👁️ Voir les archives des notes du {cap(cycle)} {sub}
      </button>
    </>
  );
}

function cap(s){ return s ? s[0].toUpperCase()+s.slice(1) : ""; }
