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
        :root{
          --ink:#0f172a; --muted:#475569; --line:#e5e7eb; --ring:#93c5fd;
        }
        .wrap{
          min-height:100vh; padding:28px 18px;
          background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #f97316 100%);
          display:flex; flex-direction:column; gap:18px; align-items:center;
        }
        .title{
          color:#ffffff; font-size: clamp(22px, 2.4vw, 32px); font-weight:900;
          letter-spacing:.3px; text-align:center; margin:2px 0 4px;
          text-shadow:0 2px 10px rgba(0,0,0,.25);
          border-bottom:none;
        }
        .grid-3{
          width:100%; max-width:1100px;
          display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:18px; margin-top:18px;
        }
        @media (max-width: 900px){ .grid-3{ grid-template-columns:1fr; } }
        .btnBig{
          background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 55%, #7c3aed 100%);
          color:#fff; border:0; border-radius:18px; padding:22px;
          font-size:18px; font-weight:900; cursor:pointer;
          box-shadow: 0 16px 38px rgba(2,6,23,.22), inset 0 1px 0 rgba(255,255,255,.25);
          transition: transform .08s ease, filter .15s ease, box-shadow .2s ease;
          margin-top:120px;
        }
        .btnBig:hover{ transform: translateY(-2px); filter: brightness(1.06); box-shadow: 0 20px 44px rgba(2,6,23,.28); }
        .btnBig:active{ transform: translateY(-1px); }
        .back{
          align-self:flex-start;
          background: linear-gradient(135deg,#cbd5e1,#94a3b8);
          color:#0f172a; border:0; border-radius:12px; padding:8px 12px; font-weight:900; cursor:pointer;
          box-shadow:0 8px 20px rgba(2,6,23,.14);
          transition: transform .08s ease, filter .12s ease, box-shadow .2s ease;
        }
        .back:hover{ transform: translateY(-1px); filter: brightness(1.02); }
        .crumbs{
          width:100%; max-width:1100px;
          display:flex; gap:10px; align-items:center; color:#e2e8f0;
          background: rgba(255,255,255,0.16);
          backdrop-filter: blur(6px);
          border:1px solid rgba(255,255,255,.35);
          border-radius:12px; padding:10px 12px;
          box-shadow:0 8px 20px rgba(2,6,23,.14);
        }
        .crumbs a{ color:#fff; text-decoration:underline; }
      `}</style>

      <div className="wrap">
        <div className="title">📝 Notes</div>

        {/* NIVEAU */}
        {!cycle && (
          <div className="grid-3">
            <button className="btnBig" onClick={() => goCycle("seconde")}>🎓 Seconde</button>
            <button className="btnBig" onClick={() => goCycle("premiere")}>🎓 Première</button>
            <button className="btnBig" onClick={() => goCycle("terminale")}>🎓 Terminale</button>
          </div>
        )}

        {/* SOUS-NIVEAU */}
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

        {/* FORMULAIRE */}
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

  // ⚠️ on stocke le champ "note" en string pour contrôler 100% du rendu
  const [note, setNote] = useState("");

  // Permission
  const [me, setMe] = useState(null);
  const [canWrite, setCanWrite] = useState(false);

  const SWAL = (opts) =>
    Swal.fire({
      confirmButtonText: "OK",
      buttonsStyling: false,
      customClass: { confirmButton: "btn gradSave" },
      ...opts,
    });

  // Session
  useEffect(() => {
    (async () => {
      try {
        const { user } = await api("/api/auth/me");
        setMe(user || null);
      } catch {
        setMe(null);
      }
    })();
  }, []);

  // Élèves + matières
  useEffect(() => {
    (async () => {
      try {
        const qs = new URLSearchParams({ niveau: cycle, section: sub });
        const [E, M] = await Promise.all([
          api(`/api/absence/eleves?${qs.toString()}`),
          api(`/api/notes/matieres?${new URLSearchParams({ cycle, sub }).toString()}`),
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
    setCanWrite(false);
  }, [cycle, sub]);

  const onSelectEleve = () => {
    const e = eleves.find((x) => String(x.id) === String(eleveId));
    setEleve(e || null);

    if (me && e?.niveau?.id != null && e?.section?.id != null) {
      const ok =
        me.role === "PROVISEUR" ||
        (me.role === "PROFESSEUR" &&
          Number(me.titulaireNiveauId) === Number(e.niveau.id) &&
          Number(me.titulaireSectionId) === Number(e.section.id));
      setCanWrite(!!ok);
    } else {
      setCanWrite(false);
    }
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
    return p;
  };

  const resetForm = () => {
    setEleveId(""); setEleve(null);
    setMatiereId(""); setTrimestre("1er trimestre");
    setTypeNote(""); setNote("");
    setCanWrite(false);
  };

  /* ---------- Contrôle STRICT du champ "note" ---------- */

  // Bloque les touches non numériques dans un <input type="number">
  const onKeyDownNote = (e) => {
    // autoriser navigation/édition
    const allowedControl = [
      "Backspace","Delete","ArrowLeft","ArrowRight","ArrowUp","ArrowDown",
      "Home","End","Tab","Enter","Escape"
    ];
    if (allowedControl.includes(e.key)) return;

    // Bloquer les signes et l'exponentiel
    if (["e","E","+","-"].includes(e.key)) {
      e.preventDefault();
      return;
    }
  };

  // Empêche la saisie de caractères non numériques AVANT d'entrer dans l'input
  const onBeforeInputNote = (e) => {
    // e.data est null pour Backspace/Delete etc.
    if (e.data == null) return;

    // seuls chiffres + séparateurs décimaux sont autorisés
    if (!/^[0-9.,]$/.test(e.data)) {
      e.preventDefault();
    }
  };

  // Nettoie le collage (paste)
  const onPasteNote = (e) => {
    const raw = (e.clipboardData.getData("text") || "").trim();
    if (!raw) return;

    const sanitized = raw
      .replace(/,/g, ".")       // , -> .
      .replace(/[^0-9.]/g, ""); // retirer tout sauf chiffres et point

    // garder une seule occurrence de '.'
    const i = sanitized.indexOf(".");
    let clean = sanitized;
    if (i !== -1) {
      clean = sanitized.slice(0, i + 1) + sanitized.slice(i + 1).replace(/\./g, "");
    }

    e.preventDefault();
    setNote(clean);
  };

  // Nettoyage continu (onChange) : conserve uniquement chiffres + 1 point
  const onChangeNote = (e) => {
    let v = (e.target.value || "").replace(/,/g, ".");
    // filtre brut
    v = v.replace(/[^0-9.]/g, "");
    // une seule occurrence du point
    const idx = v.indexOf(".");
    if (idx !== -1) {
      v = v.slice(0, idx + 1) + v.slice(idx + 1).replace(/\./g, "");
    }
    setNote(v);
  };

  // À la sortie du champ : clamp 0..20 et arrondi au pas de 0.25
  const onBlurNote = () => {
    if (note === "") return;
    let n = Number(note);
    if (!Number.isFinite(n)) { setNote(""); return; }
    // clamp
    if (n < 0) n = 0;
    if (n > 20) n = 20;
    // arrondi au 1/4 de point
    n = Math.round(n * 4) / 4;
    setNote(String(n));
  };

  const save = async () => {
    const n = Number(note);
    if (!eleve)     return SWAL({ icon:"error", title:"Erreur", text:"Veuillez sélectionner un élève." });
    if (!matiereId) return SWAL({ icon:"error", title:"Erreur", text:"Veuillez sélectionner une matière." });
    if (!typeNote)  return SWAL({ icon:"error", title:"Erreur", text:"Choisissez le type de note." });
    if (!Number.isFinite(n) || n < 0 || n > 20)
      return SWAL({ icon:"error", title:"Erreur", text:"La note doit être comprise entre 0 et 20." });
    if (Math.abs(n*4 - Math.round(n*4)) > 1e-9)
      return SWAL({ icon:"error", title:"Erreur", text:"La note doit respecter un pas de 0,25." });
    if (!canWrite)
      return SWAL({ icon:"warning", title:"Accès refusé", text:"Action réservée au proviseur ou au titulaire de cette classe." });

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
      await SWAL({ icon:"success", title:"Succès", text:"Note enregistrée avec succès ✅." });
      resetForm();
    } catch (e) {
      SWAL({ icon:"error", title:"Erreur", text: e.message || "Échec de l'enregistrement." });
    }
  };

  return (
    <>
      <style>{`
        .formWrap{
          width:100%; max-width:1100px;
          display:flex; justify-content:space-between; gap:20px; margin-top:16px;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(8px);
          border:1px solid rgba(255,255,255,.7);
          border-radius:18px;
          box-shadow:0 12px 30px rgba(2,6,23,.16);
          padding:16px;
        }
        .col{ flex:1; display:flex; flex-direction:column; gap:14px; }
        .row{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .lbl{ width:190px; font-weight:900; color:#083940; }
        .read{ flex:1; background:#fff; border-radius:12px; min-height:20px; padding:10px 12px; border:1px solid #e5e7eb; }
        .select, .input{
          flex:1; padding:12px; border:1px solid #e5e7eb; border-radius:12px; background:#fff; font-size:14px;
          outline:none; transition:border-color .15s, box-shadow .15s;
        }
        .select:focus, .input:focus{ border-color:#93c5fd; box-shadow:0 0 0 4px rgba(147,197,253,.35); }
        .right{ width:220px; display:flex; flex-direction:column; align-items:center; gap:16px; }
        .photo {width: 160px;height: 160px;border-radius: 50%;object-fit: cover;border: 4px solid #0ea5e9;box-shadow: 0 10px 24px rgba(2,6,23,.18);transition: transform .12s ease, box-shadow .2s ease;}
        .photo:hover {transform: translateY(-3px);box-shadow: 0 14px 30px rgba(2,6,23,.26);}
        .btns{ display:flex; gap:14px; margin:22px 0 10px; justify-content:center; flex-wrap:wrap; }
        .btn{
          padding:12px 18px; border:none; border-radius:12px; font-size:15px; font-weight:900; cursor:pointer; color:#fff;
          transition: transform .12s ease, filter .12s ease, box-shadow .12s ease; box-shadow: 0 10px 24px rgba(2,6,23,.18);
        }
        .btn:hover{ filter:brightness(1.06); transform: translateY(-1px); }
        .gradSave  { background: linear-gradient(135deg,#22c55e,#16a34a); }
        .gradSave.disabled{ opacity:.6; cursor:not-allowed; }
        .gradReset { background: linear-gradient(135deg,#cbd5e1,#94a3b8); color:#0f172a; }
        .gradQuit  { background: linear-gradient(135deg,#ef4444,#b91c1c); }
        .pill{
          padding:6px 10px; background:#ecfeff; border:1px solid #bae6fd; border-radius:999px;
          font-size:12px; font-weight:800; color:#075985;
        }
        .perm-hint{ color:#b91c1c; font-weight:800; }
        @media (max-width: 980px){
          .formWrap { flex-direction:column; }
          .right { width:100%; align-items:flex-start; }
        }
      `}</style>

      <h2 style={{ textAlign:"center", color:"#ffffff", marginTop:8, textShadow:"0 2px 10px rgba(0,0,0,.25)" }}>
        🧮 Note {cap(cycle)} {sub}
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
            <span className="read" style={{flex:"unset"}}>📍 {eleve?.lieuNais ?? "-"}</span>
          </div>

          <div className="row">
            <label className="lbl">Classe :</label>
            <span className="read">{eleve?.niveau?.nom ?? "-"}</span>
            <span className="read" style={{flex:"unset"}}>{eleve?.section?.nom ?? "-"}</span>
          </div>

          <div className="row">
            <label className="lbl">Téléphone :</label>
            <span className="read">📞 {eleve?.telephone ?? "-"}</span>
            <label className="lbl" style={{width:120}}>Domicile :</label>
            <span className="read">🏠 {eleve?.domicile ?? "-"}</span>
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
            <input
              className="input"
              type="number"
              min="0"
              max="20"
              step="0.25"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              value={note}
              placeholder="Entrez la note"
              onKeyDown={onKeyDownNote}
              onBeforeInput={onBeforeInputNote}
              onPaste={onPasteNote}
              onChange={onChangeNote}
              onBlur={onBlurNote}
            />
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

          {/* Permission */}
          {eleve && (
            <div className="row">
              <span className="perm-hint">
                {canWrite ? "✅ Vous pouvez enregistrer pour cette classe." : "⛔ Réservé au proviseur ou au titulaire de cette classe."}
              </span>
            </div>
          )}
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
        <button className={`btn gradSave ${canWrite ? "" : "disabled"}`} disabled={!canWrite} onClick={save} style={{ background: 'linear-gradient(135deg,#22c55e 0%, #16a34a 50%, #14532d 100%)' }}>💾 Enregistrer</button>
        <button className="btn gradReset" onClick={resetForm}>🔄 Actualiser</button>
        <button className="btn gradQuit" onClick={()=>navigate("/dashboard") }>🏠 Quitter</button>
      </div>

      <button
        className="btn"
        style={{ display:"block", margin:"1px auto 50px", maxWidth:800,
                 background:"linear-gradient(135deg,#f59e0b,#f97316)" }}
        onClick={()=>navigate(`/dashboard/notes/archive/${cycle}/${sub}`)}
      >
        👁️ Voir les archives des notes du {cap(cycle)} {sub}
      </button>
    </>
  );
}

function cap(s){ return s ? s[0].toUpperCase()+s.slice(1) : ""; }
