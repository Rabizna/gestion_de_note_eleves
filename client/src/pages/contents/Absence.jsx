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
        :root{
          --ink:#0f172a; --muted:#475569; --line:#e5e7eb; --ring:#93c5fd;
        }

        /* ===== Page gradient & layout ===== */
        .wrap{
          min-height:100vh;
          padding:28px 18px;
          background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #f97316 100%);
          display:flex; flex-direction:column; gap:18px; align-items:center;
        }

        .title{
          color:#ffffff; font-size: clamp(22px, 2.4vw, 32px); font-weight:900;
          letter-spacing:.3px; text-align:center; margin:2px 0 4px;
          text-shadow:0 2px 10px rgba(0,0,0,.25);
          border-bottom:none;
        }

        /* ===== Grid de choix (3 boutons) ===== */
        .grid-3{
          width:100%; max-width:1100px;
          display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:18px; margin-top:18px;
        }
        @media (max-width: 900px){ .grid-3{ grid-template-columns:1fr; } }

        /* ===== Gros boutons MODERNES (dégradé + glow) ===== */
        .btnBig{
          margin-top: 100px;
          background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 55%, #7c3aed 100%);
          color:#fff;
          border:0;
          border-radius:18px; padding:22px;
          font-size:18px; font-weight:900; cursor:pointer;
          box-shadow: 0 16px 38px rgba(2,6,23,.22), inset 0 1px 0 rgba(255,255,255,.25);
          transition: transform .08s ease, filter .15s ease, box-shadow .2s ease;
        }
        .btnBig:hover{
          transform: translateY(-2px);
          filter: brightness(1.06);
          box-shadow: 0 20px 44px rgba(2,6,23,.28);
        }
        .btnBig:active{ transform: translateY(-1px); }

        /* ===== Petits boutons / breadcrumbs ===== */
        .back{
          align-self:flex-start;
          background: linear-gradient(135deg,#cbd5e1,#94a3b8);
          color:#0f172a;
          border:0; border-radius:12px; padding:8px 12px; font-weight:900; cursor:pointer;
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

        /* ===== Form container (glass) ===== */
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
        .right{ width:220px; display:flex; flex-direction:column; align-items:center; gap:15px; }

        /* ===== Inputs modernisés ===== */
        .row{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .lbl{ width:180px; font-weight:900; color:#083940; }
        .read{ flex:1; background:#fff; border-radius:12px; min-height:20px; padding:10px 12px; border:1px solid var(--line); }
        .select{
          flex:1; padding:10px 12px; border:1px solid var(--line); border-radius:12px; background:#fff;
          transition:border-color .15s, box-shadow .15s;
        }
        .select:focus{ outline:none; border-color:var(--ring); box-shadow:0 0 0 4px rgba(147,197,253,.35); }

        /* ===== Photo ===== */
        .photo{
          width:160px; height:160px; border-radius:50%; object-fit:cover;
          border:4px solid #0ea5e9; box-shadow:0 10px 24px rgba(2,6,23,.18);
          transition: transform .12s ease, box-shadow .2s ease;
        }
        .photo:hover{ transform: translateY(-2px); box-shadow:0 14px 30px rgba(2,6,23,.26); }

        /* ===== Boutons (gradients) ===== */
        .btns{ display:flex; gap:12px; margin:18px 0; justify-content:center; }
        .btn{
          padding:10px 16px; border:none; border-radius:12px; font-size:16px; font-weight:900; cursor:pointer;
          color:#fff; box-shadow:0 10px 24px rgba(2,6,23,.18);
          transition: transform .08s ease, filter .12s ease, box-shadow .2s ease, opacity .15s ease;
        }
        .btn:hover{ transform: translateY(-1px); filter: brightness(1.03); box-shadow:0 14px 28px rgba(2,6,23,.24); }
        .primary{ background: linear-gradient(135deg,#0ea5e9,#6366f1); }
        .secondary{ background: linear-gradient(135deg,#cbd5e1,#94a3b8); color:#0f172a; }
        .danger{ background: linear-gradient(135deg,#ef4444,#b91c1c); }

        /* ===== Radios Matin / Après-midi ===== */
        .radioInput { position:absolute; opacity:0; width:0; height:0; }
        .radioLabel{
          padding: 8px 14px; border:2px solid transparent; border-radius:999px; cursor:pointer; user-select:none;
          transition: border-color .15s, box-shadow .15s, background .15s;
        }
        .radioInput:checked + .radioLabel{
          border-color:#0ea5e9; box-shadow:0 0 0 3px rgba(14,165,233,.22); background:#f0f9ff;
        }

        /* Astuce permission */
        .perm-hint{ color:#b91c1c; font-weight:800; }
      `}</style>

      <div className="wrap">
        <div className="title">🗓️ Absence</div>

        {/* NIVEAU: pas de param → 3 gros boutons (dégradé moderne) */}
        {!cycle && (
          <div className="grid-3">
            <button className="btnBig" onClick={() => goCycle("seconde")}>🎓 Seconde</button>
            <button className="btnBig" onClick={() => goCycle("premiere")}>🎓 Première</button>
            <button className="btnBig" onClick={() => goCycle("terminale")}>🎓 Terminale</button>
          </div>
        )}

        {/* SOUS-NIVEAU: A/B/C ou L/S/OSE — mêmes boutons modernes */}
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

        {/* FORMULAIRE */}
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

  // === Nouveaux états permission ===
  const [me, setMe] = useState(null);          // { role, titulaireNiveauId, titulaireSectionId, ... }
  const [canWrite, setCanWrite] = useState(false);

  const title = `Absence ${cap(cycle)} ${sub}`;

  // Charge session utilisateur
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

  // Quand on choisit un élève → calcule le droit d’écriture
  const onSelectEleve = () => {
    const e = eleves.find((x) => String(x.id) === String(selId));
    setCur(e || null);

    // Permission : proviseur = OK ; prof titulaire sur la classe de l'élève = OK
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
    setCanWrite(false);
  };

  const enregistrer = async () => {
    if (!cur) return Swal.fire("Erreur", "Veuillez sélectionner un élève.", "error");
    if (!dateAbs) return Swal.fire("Erreur", "Veuillez sélectionner une date.", "error");
    if (!plage) return Swal.fire("Erreur", "Choisissez Matin ou Après-midi.", "error");
    if (!canWrite) {
      return Swal.fire("Accès refusé", "Action réservée au proviseur ou au titulaire de cette classe.", "warning");
    }

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
      await Swal.fire("Succès", "Absence enregistrée avec succès✅.", "success");
      resetForm();
    } catch (e) {
      Swal.fire("Erreur", e.message || "Échec de l'enregistrement.", "error");
    }
  };

  return (
    <>
      <h2 style={{ textAlign:"center", color:"#ffffff", marginTop:8, textShadow:"0 2px 10px rgba(0,0,0,.25)" }}>📋 {title}</h2>

      <div className="formWrap">
        {/* Colonne gauche : formulaire */}
        <div className="col">
          <div className="row">
            <label className="lbl">Numéro :</label>
            <select className="select" value={selId} onChange={(e)=>setSelId(e.target.value)}>
              <option value="">Sélectionner un élève</option>
              {eleves.map(e => (
                <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>
              ))}
            </select>
            <button className="btn primary" onClick={onSelectEleve} style={{padding:"10px 16px"}}>👁️ Sélectionner</button>
          </div>

          <div className="row"><label className="lbl">Nom</label><span className="read">{cur?.nom ?? "-"}</span></div>
          <div className="row"><label className="lbl">Prénom</label><span className="read">{cur?.prenom ?? "-"}</span></div>
          <div className="row"><label className="lbl">Sexe</label><span className="read">{cur?.sexe ?? "-"}</span></div>
          <div className="row">
            <label className="lbl">Naissance</label>
            <span className="read">{cur?.dateNais ? new Date(cur.dateNais).toLocaleDateString() : "-"}</span>
            <span className="read" style={{flex:"unset"}}>📍 {cur?.lieuNais ?? "-"}</span>
          </div>
          <div className="row">
            <label className="lbl">Classe</label>
            <span className="read">{cur?.niveau?.nom ?? "-"}</span>
            <span className="read" style={{flex:"unset"}}>{cur?.section?.nom ?? "-"}</span>
          </div>
          <div className="row">
            <label className="lbl">Téléphone</label>
            <span className="read">📞 {cur?.telephone ?? "-"}</span>
            <label className="lbl" style={{width:120}}>Domicile</label>
            <span className="read">🏠 {cur?.domicile ?? "-"}</span>
          </div>

          <div className="row">
            <label className="lbl">Date d'absence</label>
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
              <label className="radioLabel" htmlFor="matin">🌞 Matin</label>

              <input
                className="radioInput"
                type="radio"
                id="apm"
                name="plage"
                value="APRES_MIDI"
                checked={plage==="APRES_MIDI"}
                onChange={(e)=>setPlage(e.target.value)}
              />
              <label className="radioLabel" htmlFor="apm">🌇 Après-midi</label>
            </div>
          </div>

          <div className="row">
            <label className="lbl">Motif</label>
            <input className="select" type="text" value={motif} onChange={(e)=>setMotif(e.target.value)} style={{height:60}} placeholder="(optionnel)" />
          </div>

          {/* Indication permission */}
          {cur && (
            <div className="row">
              <span className="perm-hint">
                {canWrite ? "✅ Vous pouvez enregistrer pour cette classe." : "⛔ Réservé au proviseur ou au titulaire de cette classe."}
              </span>
            </div>
          )}
        </div>

        {/* Colonne droite : photo */}
        <div className="right">
          <img className="photo" src={normPhoto(cur?.photo)} alt="Photo élève" />
        </div>
      </div>

      {/* Boutons */}
      <div className="btns">
        <button className="btn" disabled={!canWrite} onClick={enregistrer} style={{ background: 'linear-gradient(135deg,#22c55e 0%, #16a34a 50%, #14532d 100%)', opacity: canWrite ? 1 : .6 }}>💾 Enregistrer</button>
        <button className="btn secondary" onClick={resetForm}>🔄 Actualiser</button>
        <button className="btn danger" onClick={() => navigate("/dashboard")} style={{ background: 'linear-gradient(135deg,#ef4444 0%, #dc2626 55%, #b91c1c 100%)' }}>🏠 Quitter</button>
      </div>

      <button
        className="btn primary"
        style={{ display:"block", margin:"1px auto 50px", maxWidth:800 }}
        onClick={()=>navigate(`/dashboard/absence/archive/${cycle}/${sub}`)}
      >
        👁️ Voir les archives des absences du {cap(cycle)} {sub}
      </button>
    </>
  );
}

function cap(s){ return s ? s[0].toUpperCase()+s.slice(1) : ""; }
