// client/src/pages/contents/Absence.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Swal from "sweetalert2";
import { api } from "../../api";

const DEFAULT_STUDENT = "/uploads/defaut.png";

export default function Absence() {
  const navigate = useNavigate();
  const { cycle, sub } = useParams(); // cycle: "seconde"|"premiere"|"terminale", sub: "A"|"B"|"C"|"L"|"S"|"OSE"
  const [meta, setMeta] = useState(null);

  // charge les libellés de sous-boutons (A/B/C ou L/S/OSE)
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

  const goCycle = (c) => navigate(`/dashboard/absence/${c}`);
  const goSub = (code) => {
    if (!cycle) return;
    navigate(`/dashboard/absence/${cycle}/${code}`);
  };

  const subButtons = cycle ? meta?.buttons?.[cycle] ?? [] : [];

  return (
    <>
      <style>{`
        .wrap { display:flex; flex-direction:column; gap:16px; }
        .title { color: rgb(8,57,64); font-size:22px; font-weight:800; padding-bottom:10px;
                 border-bottom:2px solid rgb(243,117,33); }
        .grid-3 { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:24px; margin-top:30px; }
        .btnBig { background: rgb(8,57,64); color:#fff;margin-top: 120px; border:0; border-radius:12px; padding:22px;
                  font-size:18px; font-weight:700; cursor:pointer; transition: transform .15s ease, filter .15s ease;}
        .btnBig:hover { filter: brightness(1.06); transform: translateY(-1px); }
        .back { align-self:flex-start; background:#f1f5f9; border:0; border-radius:10px; padding:8px 12px; font-weight:700; cursor:pointer; }
        .crumbs { display:flex; gap:8px; align-items:center; color:#334155; }
        .crumbs a { color:#0f766e; text-decoration:none; }
      `}</style>

      <div className="wrap">
        <div className="title">Absence</div>

        {/* NIVEAU: pas de param → 3 gros boutons */}
        {!cycle && (
          <div className="grid-3">
            <button className="btnBig" onClick={() => goCycle("seconde")}>Seconde</button>
            <button className="btnBig" onClick={() => goCycle("premiere")}>Première</button>
            <button className="btnBig" onClick={() => goCycle("terminale")}>Terminale</button>
          </div>
        )}

        {/* SOUS-NIVEAU: on montre A/B/C ou L/S/OSE */}
        {cycle && !sub && (
          <>
            <button className="back" onClick={() => navigate("/dashboard/absence")}>← Retour</button>
            <div className="grid-3">
              {(subButtons.length ? subButtons : ["A","B","C"]).map(code => (
                <button key={code} className="btnBig" onClick={() => goSub(code)}>{code}</button>
              ))}
            </div>
          </>
        )}

        {/* FORMULAIRE: route finale → plus de boutons, juste le formulaire */}
        {cycle && sub && (
          <>
            <div className="crumbs">
              <button className="back" onClick={() => navigate(`/dashboard/absence/${cycle}`)}>← Retour</button>
              <span>
                <Link to="/dashboard/absence">Absence</Link> / <Link to={`/dashboard/absence/${cycle}`}>{cap(cycle)}</Link> / {sub}
              </span>
            </div>
            <AbsenceForm cycle={cycle} sub={sub} />
          </>
        )}
      </div>
    </>
  );
}

/* ------------------------ Formulaire détaillé ------------------------ */
function AbsenceForm({ cycle, sub }) {
  const navigate = useNavigate(); // ← pour rediriger "Quitter" vers Accueil
  const [eleves, setEleves] = useState([]);
  const [selId, setSelId] = useState("");
  const [cur, setCur] = useState(null);
  const [dateAbs, setDateAbs] = useState("");
  const [plage, setPlage] = useState(""); // "MATIN" | "APRES_MIDI"
  const [motif, setMotif] = useState("");

  const title = `Absence ${cap(cycle)} ${sub}`;

  useEffect(() => {
    (async () => {
      try {
        const qs = new URLSearchParams({ niveau: cycle, section: sub });
        const { eleves } = await api(`/api/absence/eleves?${qs.toString()}`);
        setEleves(eleves || []);
      } catch (e) {
        Swal.fire("Erreur", e.message || "Chargement des élèves impossible.", "error");
      }
    })();
    // reset à chaque route
    setSelId("");
    setCur(null);
    setDateAbs("");
    setPlage("");
    setMotif("");
  }, [cycle, sub]);

  const onSelectEleve = () => {
    const e = eleves.find((x) => String(x.id) === String(selId));
    setCur(e || null);
  };

  const normPhoto = (p) => {
    if (!p) return DEFAULT_STUDENT;
    return p.startsWith("/uploads/") ? p : p.startsWith("uploads/") ? "/" + p : p;
  };

  const resetForm = () => {
    setSelId("");
    setCur(null);
    setDateAbs("");
    setPlage("");
    setMotif("");
  };

  const enregistrer = async () => {
    if (!cur) return Swal.fire("Erreur", "Veuillez sélectionner un élève.", "error");
    if (!dateAbs) return Swal.fire("Erreur", "Veuillez sélectionner une date.", "error");
    if (!plage) return Swal.fire("Erreur", "Choisissez Matin ou Après-midi.", "error");

    try {
      await api("/api/absence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eleveId: cur.id,
          date: dateAbs,     // YYYY-MM-DD
          plage,             // "MATIN" | "APRES_MIDI"
          motif: motif || null,
        }),
      });
      await Swal.fire("Succès", "Absence enregistrée avec succès.", "success");
      resetForm();
    } catch (e) {
      Swal.fire("Erreur", e.message || "Échec de l'enregistrement.", "error");
    }
  };

  return (
    <>
      <style>{`
        .formWrap { display:flex; justify-content:space-between; gap:30px; margin-top:24px; }
        .col { flex:1; display:flex; flex-direction:column; gap:14px; }
        .row { display:flex; align-items:center; gap:12px; }
        .lbl { width:180px; font-weight:bold; color:rgb(8,57,64); }
        .read { flex:1; background:#f5f5f5; border-radius:6px; min-height:20px; padding:8px; }
        .select { flex:1; padding:8px; border:1px solid #ddd; border-radius:6px; }
        .right { width:200px; display:flex; flex-direction:column; align-items:center; gap:15px; }
        .photo { width:150px; height:150px; border-radius:4px; object-fit:cover; border:1px solid #ddd; }
        .btns { display:flex; gap:15px; margin:20px 0; justify-content:center; }
        .btn { padding:10px 20px; border:none; border-radius:6px; font-size:16px; cursor:pointer; transition:.2s; color:#fff; }
        .btn:hover{ opacity:.9; transform: translateY(-2px); }
        .primary{ background: rgb(8,57,64); }
        .secondary{ background:#6c757d; }
        .danger{ background:#dc3545; }
        .success{ background:#16a34a; } /* ← vert pour Enregistrer */

        /* ——— Radios Matin / Après-midi : bordure invisible puis visible quand coché ——— */
        .radioInput { 
          position: absolute; 
          opacity: 0; 
          width: 0; 
          height: 0; 
        }
        .radioLabel {
          padding: 8px 14px;
          border: 2px solid transparent; /* invisible par défaut */
          border-radius: 999px;          /* encercle le label */
          cursor: pointer;
          user-select: none;
          transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
        }
        .radioInput:checked + .radioLabel {
          border-color: rgb(8,57,64);    /* devient visible */
          box-shadow: 0 0 0 3px rgba(8,57,64,.12);
          background: #f1f5f9;
        }
      `}</style>

      <h2 style={{ textAlign:"center", color:"rgb(8,57,64)", marginTop:30 }}>{title}</h2>

      <div className="formWrap">
        {/* Colonne gauche : formulaire */}
        <div className="col">
          <div className="row">
            <label className="lbl">Numero :</label>
            <select className="select" value={selId} onChange={(e)=>setSelId(e.target.value)}>
              <option value="">Sélectionner un élève</option>
              {eleves.map(e => (
                <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>
              ))}
            </select>
            <button className="btn primary" onClick={onSelectEleve} style={{padding:"8px 15px"}}>Sélectionner</button>
          </div>

          <div className="row"><label className="lbl">Nom:</label><span className="read">{cur?.nom ?? "-"}</span></div>
          <div className="row"><label className="lbl">Prénom:</label><span className="read">{cur?.prenom ?? "-"}</span></div>
          <div className="row"><label className="lbl">Sexe:</label><span className="read">{cur?.sexe ?? "-"}</span></div>
          <div className="row">
            <label className="lbl">Date de Naissance:</label>
            <span className="read">{cur?.dateNais ? new Date(cur.dateNais).toLocaleDateString() : "-"}</span>
            <span className="read" style={{flex:"unset"}}>à {cur?.lieuNais ?? "-"}</span>
          </div>
          <div className="row">
            <label className="lbl">Classe:</label>
            <span className="read">{cur?.niveau?.nom ?? "-"}</span>
            <span className="read" style={{flex:"unset"}}>{cur?.section?.nom ?? "-"}</span>
          </div>
          <div className="row">
            <label className="lbl">Téléphone:</label>
            <span className="read">{cur?.telephone ?? "-"}</span>
            <label className="lbl" style={{width:120}}>Domicile:</label>
            <span className="read">{cur?.domicile ?? "-"}</span>
          </div>

          <div className="row">
            <label className="lbl">Date d'absence:</label>
            <input className="select" type="date" value={dateAbs} onChange={(e)=>setDateAbs(e.target.value)} />
            {/* Radios Matin / Après-midi */}
            <div className="row" style={{gap:8}}>
              <input
                className="radioInput"
                type="radio"
                id="matin"
                name="plage"
                value="MATIN"
                checked={plage==="MATIN"}
                onChange={(e)=>setPlage(e.target.value)}
              />
              <label className="radioLabel" htmlFor="matin">Matin</label>

              <input
                className="radioInput"
                type="radio"
                id="apm"
                name="plage"
                value="APRES_MIDI"
                checked={plage==="APRES_MIDI"}
                onChange={(e)=>setPlage(e.target.value)}
              />
              <label className="radioLabel" htmlFor="apm">Après-midi</label>
            </div>
          </div>

          <div className="row">
            <label className="lbl">MOTIF:</label>
            <input className="select" type="text" value={motif} onChange={(e)=>setMotif(e.target.value)} style={{height:60}} placeholder="(optionnel)" />
          </div>
        </div>

        {/* Colonne droite : photo */}
        <div className="right">
          <img className="photo" src={normPhoto(cur?.photo)} alt="Photo élève" />
        </div>
      </div>

      {/* Boutons */}
      <div className="btns">
        <button className="btn success" onClick={enregistrer}>💾 Enregistrer</button>
        <button className="btn secondary" onClick={resetForm}>🔄 Actualiser</button>
        <button className="btn danger" onClick={()=>navigate("/dashboard")}>🏠 Quitter</button>
      </div>

      <button
        className="btn primary"
        style={{ display:"block", margin:"1px 265px 50px 265px", background:"rgb(243,117,33)" }}
        onClick={()=>navigate(`/dashboard/absence/archive/${cycle}/${sub}`)}
      >
        👁️Voir les archives des absences du {cap(cycle)} {sub}
      </button>
    </>
  );
}

function cap(s){ return s ? s[0].toUpperCase()+s.slice(1) : ""; }
