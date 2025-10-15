// client/src/pages/contents/Bulletin.jsx
import { useEffect, useState, Fragment } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Swal from "sweetalert2";
import { api } from "../../api";

const DEFAULT_STUDENT = "/uploads/defaut.png";

export default function Bulletin() {
  const navigate = useNavigate();
  const { cycle, sub } = useParams();
  const [meta, setMeta] = useState(null);

  // Cacher le menu latéral quand on est au niveau sub (formulaire)
  useEffect(() => {
    const asideMenu = document.querySelector("aside.menu");
    if (asideMenu) {
      if (cycle && sub) {
        asideMenu.style.display = "none";
      } else {
        asideMenu.style.display = "flex";
      }
    }
    // Nettoyage
    return () => {
      const asideMenu = document.querySelector("aside.menu");
      if (asideMenu) asideMenu.style.display = "flex";
    };
  }, [cycle, sub]);

  useEffect(() => {
    (async () => {
      try {
        const m = await api("/api/bulletin/meta");
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

  const goCycle = (c) => navigate(`/dashboard/bulletin/${c}`);
  const goSub = (code) => {
    if (!cycle) return;
    navigate(`/dashboard/bulletin/${cycle}/${code}`);
  };

  const subButtons = cycle ? meta?.buttons?.[cycle] ?? [] : [];

  return (
    <>
      <style>{`
        :root{
          --ink:#1f2937; --line:#222; --bg:#e9f3f6;
          --muted:#475569; --ring:#93c5fd;
        }

        /* Empêche tout scroll horizontal global */
        html, body { max-width: 100%; overflow-x: hidden; }

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

        .grid-3{
          width:100%; max-width:1100px;
          display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:18px; margin-top:18px;
        }
        @media (max-width: 900px){ .grid-3{ grid-template-columns:1fr; } }

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
          width:100%; max-width:1280px;
          display:flex; gap:10px; align-items:center; color:#e2e8f0;
          background: rgba(255,255,255,0.16);
          backdrop-filter: blur(6px);
          border:1px solid rgba(255,255,255,.35);
          border-radius:12px; padding:10px 12px;
          box-shadow:0 8px 20px rgba(2,6,23,.14);
          overflow: hidden;
        }
        .crumbs a{ color:#fff; text-decoration:underline; }

        .bulletin-container{
          width:100%; 
          max-width:1320px;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(8px);
          border:1px solid rgba(255,255,255,.7);
          border-radius:18px;
          box-shadow:0 12px 30px rgba(2,6,23,.16);
          padding:20px;
          margin-top:16px;
          overflow-x: hidden; /* pas de scroll horizontal */
        }

        .bulletin-controls{
          display:flex; gap:12px; align-items:center; margin-bottom:16px; flex-wrap:wrap;
        }

        .bulletin-controls select{
          padding:8px 12px; border:1px solid #bbb; border-radius:8px; background:#fff;
          transition:border-color .15s, box-shadow .15s;
          max-width: 100%;
        }
        .bulletin-controls select:focus{
          outline:none; border-color:var(--ring); box-shadow:0 0 0 4px rgba(147,197,253,.35);
        }

        .bulletin-controls button{
          padding:8px 16px; border:1px solid #083940; background:#083940; color:#fff;
          border-radius:8px; cursor:pointer; font-weight:700;
          transition: transform .08s ease, filter .12s ease;
        }
        .bulletin-controls button:hover{ transform: translateY(-1px); filter: brightness(1.1); }

        /* SHEET - Cadre du bulletin */
        .bulletin-sheet{
          width: 100%;
          max-width: 100%;
          margin:0 auto;
          padding:14px 16px 18px;
          border:2px solid var(--line);
          background:var(--bg);
          box-sizing: border-box;
        }

        /* En-tête: UNE SEULE LIGNE, ordre: NOM -> classe -> N° -> IM -> R/P/T/trans -> Année */
        .bulletin-topline{
          display:flex;
          align-items:center;
          gap:12px;
          white-space:nowrap;
          margin-bottom:10px;
          flex-wrap: nowrap;            /* reste sur une ligne */
          overflow: hidden;             /* pas d'overflow visuel */
          min-width: 0;
        }

        .bulletin-pair{
          display:flex; align-items:center; gap:6px;
          min-width: 0;                 /* autorise la réduction */
          flex: 1 1 auto;               /* se compresse si nécessaire */
        }

        .bulletin-fill{
          border-bottom:1.6px solid var(--line);
          height:18px;
          min-width:0;                  /* peut rétrécir */
          flex:1 1 0;                   /* prend l'espace restant mais se compresse */
        }

        /* Largeurs adaptatives (se compressent avant d'overflow) */
        .w-lg{ width: clamp(260px, 36vw, 480px); }
        .w-sm{ width: clamp(110px, 16vw, 140px); }
        .w-xs{ width: clamp(90px, 12vw, 110px); }
        .w-md{ width: clamp(150px, 20vw, 190px); }
        .year{ font-weight:700; }

        table.bulletin{
          width:100%;
          border-collapse:collapse;
          table-layout:auto;            /* flexible */
          background:var(--bg);
        }

        table.bulletin th, table.bulletin td{
          border:1.6px solid var(--line); padding:6px 4px; text-align:center;
          vertical-align:middle; font-size:clamp(11px, 1.05vw, 13px);
          word-wrap: break-word;
          overflow-wrap: anywhere;
        }

        table.bulletin thead th{ font-weight:700;}
        .matieres{ width:auto; text-align:left; font-weight:700;}
        .group{ background:#d7e9ef; font-size:clamp(10px, 0.95vw, 12px); letter-spacing:.2px;}
        .sub{ font-weight:600; font-size:clamp(10px, 0.95vw, 12px);}
        .thin{ height:32px;}
        .total, .moyenne{ font-weight:700; background:#dfeef3;}
        .left{text-align:left}

        .moyennes-bloc{
          display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;
          margin:10px 0 4px; font-size:clamp(11px, 1vw, 13px);
        }
        @media (max-width: 900px){
          .moyennes-bloc{ grid-template-columns: 1fr; }
        }

        .moyennes-bloc .cell{
          border:1.6px solid var(--line); padding:6px 8px; background:var(--bg);
          display:flex; align-items:center; gap:8px; white-space:nowrap; overflow:hidden;
          flex-wrap: wrap;
        }

        .uline{
          border-bottom:1.4px solid var(--line); display:inline-block; height:16px;
          transform:translateY(2px);
        }

        .w120{ width:60px } .w90{ width:60px }

        .t-small th, .t-small td{ font-size:clamp(11px, 1vw, 12.5px); padding:8px 6px }
        .recap{ text-align:left; line-height:1.55;}
        .recap-line{ 
          display:flex; align-items:center; gap:8px; white-space:nowrap; flex-wrap:wrap;
        }
        .recap-line .uline.w120{ flex:0 0 120px; }
        .recap-line .uline.w90{ flex:0 0 90px; }

        .annual-average{ font-weight:bold; color:#083940;}

        .print-btn{
          margin-top:16px;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #14532d 100%);
          color:#fff; border:0; border-radius:12px; padding:12px 24px;
          font-size:16px; font-weight:900; cursor:pointer;
          box-shadow: 0 10px 24px rgba(2,6,23,.18);
          transition: transform .08s ease, filter .12s ease;
        }
        .print-btn:hover{ transform: translateY(-1px); filter: brightness(1.03); }

        /* Petits écrans : on resserre davantage pour éviter tout overflow */
        @media (max-width: 720px){
          .bulletin-topline{ gap:8px; }
          .bulletin-controls span{ display:block; }
          table.bulletin th, table.bulletin td{ padding:5px 3px; }
        }

        /* IMPRESSION EN PAYSAGE */
        @media print{
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          
          body{ margin:0; padding:0; background:#fff; }
          .wrap{ background:#fff; padding:0; min-height:auto; }
          .title, .crumbs, .back, .bulletin-controls, .print-btn{ display:none !important; }
          .bulletin-container{ 
            box-shadow:none; border:none; margin:0; padding:0;
            background:transparent; max-width:none;
          }
          .bulletin-sheet{ 
            border:2px solid var(--line); 
            width:100%; 
            max-width:none;
            margin:0;
            page-break-after:avoid;
          }
          table.bulletin th, table.bulletin td{
            font-size:11px; /* taille homogène à l'impression */
          }
        }
      `}</style>

      <div className="wrap">
        <div className="title">📊 Bulletin de Notes</div>

        {!cycle && (
          <div className="grid-3">
            <button className="btnBig" onClick={() => goCycle("seconde")}>🎓 Seconde</button>
            <button className="btnBig" onClick={() => goCycle("premiere")}>🎓 Première</button>
            <button className="btnBig" onClick={() => goCycle("terminale")}>🎓 Terminale</button>
          </div>
        )}

        {cycle && !sub && (
          <>
            <button className="back" onClick={() => navigate("/dashboard/bulletin")}>← Retour</button>
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
              <button className="back" onClick={() => navigate(`/dashboard/bulletin/${cycle}`)}>← Retour</button>
              <span>
                <Link to="/dashboard/bulletin">Bulletin</Link> / <Link to={`/dashboard/bulletin/${cycle}`}>{cap(cycle)}</Link> / {sub}
              </span>
            </div>
            <BulletinForm cycle={cycle} sub={sub} />
          </>
        )}
      </div>
    </>
  );
}

function BulletinForm({ cycle, sub }) {
  const [eleves, setEleves] = useState([]);
  const [selId, setSelId] = useState("");
  const [bulletinData, setBulletinData] = useState(null);
  const [loading, setLoading] = useState(false);
  const anneeScolaire = "2024-2025";

  const title = `Bulletin ${cap(cycle)} ${sub}`;

  useEffect(() => {
    (async () => {
      try {
        const qs = new URLSearchParams({ niveau: cycle, section: sub });
        const { eleves: els } = await api(`/api/bulletin/eleves?${qs.toString()}`);
        setEleves(els || []);
        if (els && els.length > 0) {
          setSelId(String(els[0].id));
        }
      } catch (e) {
        Swal.fire("Erreur", e.message || "Chargement des élèves impossible.", "error");
      }
    })();
  }, [cycle, sub]);

  useEffect(() => {
    if (selId) {
      loadBulletin();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId]);

  const loadBulletin = async () => {
    if (!selId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ niveau: cycle, section: sub, eleveId: selId });
      const data = await api(`/api/bulletin/data?${qs.toString()}`);
      setBulletinData(data);
    } catch (e) {
      Swal.fire("Erreur", e.message || "Chargement du bulletin impossible.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="bulletin-container"><p style={{textAlign:"center"}}>Chargement...</p></div>;
  }

  if (!bulletinData) {
    return <div className="bulletin-container"><p style={{textAlign:"center"}}>Sélectionnez un élève</p></div>;
  }

  const { eleve, matieres, studentNotes, classStats, effectif, nomNiveau, nomSection } = bulletinData;

  return (
    <div className="bulletin-container">
      <h2 style={{ textAlign:"center", color:"#083940", marginTop:0, marginBottom:16 }}>📋 {title}</h2>

      <form className="bulletin-controls" onSubmit={(e)=>e.preventDefault()}>
        <label>
          Élève :
          <select value={selId} onChange={(e)=>setSelId(e.target.value)}>
            {eleves.map(e => (
              <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={loadBulletin}>Afficher</button>
        <span style={{color:"#666"}}>Classe: {nomNiveau} {nomSection} — Effectif: {effectif}</span>
      </form>

      <div className="bulletin-sheet">
        {/* Ordre exact sur UNE ligne */}
        <div className="bulletin-topline">
          <div className="bulletin-pair w-lg">
            <span style={{ fontWeight: "bold" }}>NOM ET PRENOMS :</span>
            <span className="bulletin-fill">{eleve.nom.toUpperCase()} {eleve.prenom}</span>
          </div>
          <div className="bulletin-pair w-sm">
            <span style={{ fontWeight: "bold" }}>classe</span>
            <span className="bulletin-fill">{nomNiveau} {nomSection}</span>
          </div>
          <div className="bulletin-pair w-xs">
            <span style={{ fontWeight: "bold" }}>N°</span>
            <span className="bulletin-fill">{eleve.numero || ""}</span>
          </div>
          <div className="bulletin-pair w-xs">
            <span style={{ fontWeight: "bold" }}>IM</span>
            <span className="bulletin-fill">{eleve.matricule || ""}</span>
          </div>
          <div className="bulletin-pair w-md">
            <span style={{ fontWeight: "bold" }}>R/P/T/trans</span>
            <span className="bulletin-fill"></span>
          </div>
          <div className="bulletin-pair">
            <span style={{ fontWeight: "bold" }}>Année Scolaire</span>&nbsp;<span className="year">{anneeScolaire}</span>
          </div>
        </div>

        <BulletinTable 
          matieres={matieres} 
          studentNotes={studentNotes}
          classStats={classStats}
          effectif={effectif}
          eleveId={eleve.id}
          nomNiveau={nomNiveau}
        />
      </div>

      <button className="print-btn" onClick={handlePrint}>🖨️ Imprimer le bulletin</button>
    </div>
  );
}

function BulletinTable({ matieres, studentNotes, classStats, effectif, eleveId, nomNiveau }) {
  const [computed, setComputed] = useState({});

  useEffect(() => {
    computeAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matieres, studentNotes, classStats]);

  const fmt = (v) => {
    if (v == null || isNaN(v)) return '';
    const rounded = Math.round(v * 100) / 100;
    return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
  };

  const appr = (m) => {
    if (m == null || isNaN(m)) return '';
    const v = Number(m);
    if (v < 10) return 'insuffisant';
    if (v < 12) return 'passable';
    if (v < 14) return 'assez-bien';
    if (v < 16) return 'bien';
    if (v < 18) return 'très bien';
    return 'top';
  };

  const computeAll = () => {
    const totals = { 1: 0, 2: 0, 3: 0 };
    const sumCoef = { 1: 0, 2: 0, 3: 0 };
    const matData = {};

    matieres.forEach(m => {
      const mid = m.id;
      const coef = m.coef;
      matData[mid] = {};

      [1, 2, 3].forEach(t => {
        const notes = studentNotes[mid]?.[t] || {};
        const nj = notes.NJ != null ? Number(notes.NJ) : null;
        const ne = notes.NE != null ? Number(notes.NE) : null;

        let moy = null;
        if (nj != null && ne != null) moy = (nj + ne) / 2;
        else if (nj != null) moy = nj;
        else if (ne != null) moy = ne;

        matData[mid][t] = {
          moy: moy != null ? fmt(moy) : '',
          tot: moy != null ? fmt(moy * coef) : '',
          app: moy != null ? appr(moy) : ''
        };

        if (moy != null) {
          totals[t] += moy * coef;
          sumCoef[t] += coef;
        }
      });
    });

    const moyGens = {};
    [1, 2, 3].forEach(t => {
      moyGens[t] = sumCoef[t] > 0 ? fmt(totals[t] / sumCoef[t]) : '';
    });

    // Moyenne annuelle
    const moyVals = [1, 2, 3].map(t => moyGens[t] ? parseFloat(moyGens[t]) : null).filter(v => v !== null);
    const annualAvg = moyVals.length === 3 ? fmt(moyVals.reduce((s, v) => s + v, 0) / 3) : '';

    // Décision
    let decision = '';
    if (annualAvg) {
      const avg = parseFloat(annualAvg);
      if (avg >= 10) {
        let nextClass = '';
        const niv = nomNiveau.toLowerCase();
        if (niv.includes('seconde')) nextClass = 'Première';
        else if (niv.includes('première') || niv.includes('premiere')) nextClass = 'Terminale';
        else nextClass = '________';
        decision = `Admis(e) en classe de : ${nextClass}`;
      } else if (avg >= 8) {
        decision = `Autorisé(e) à doubler la classe de : ${nomNiveau}`;
      } else {
        decision = 'Remise à sa famille';
      }
    }

    setComputed({
      matData,
      totals: { 1: fmt(totals[1]), 2: fmt(totals[2]), 3: fmt(totals[3]) },
      moyGens,
      classAvgs: classStats?.classAvgs || {},
      ranks: classStats?.ranks || {},
      annualAvg,
      annualRank: classStats?.annualRank || '',
      decision
    });
  };

  return (
    <>
      <table className="bulletin">
        <colgroup>
          <col className="matieres" />
          <col span="7" /><col span="7" /><col span="7" />
        </colgroup>
        <thead>
          <tr>
            <th rowSpan="2" className="matieres">MATIERES</th>
            <th colSpan="7" className="group">PREMIERE COMPOSITION</th>
            <th colSpan="7" className="group">DEUXIEME COMPOSITION</th>
            <th colSpan="7" className="group">TROISIEME COMPOSITION</th>
          </tr>
          <tr>
            {[1, 2, 3].map(t => (
              <Fragment key={t}>
                <th className="sub">Coef</th>
                <th className="sub">NJ</th>
                <th className="sub">NE</th>
                <th className="sub">moy</th>
                <th className="sub">tot</th>
                <th className="sub" colSpan="2">Appreciations</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {matieres.map(m => {
            const mid = m.id;
            const coef = fmt(m.coef);
            return (
              <tr key={mid} className="thin">
                <td className="matieres">{m.nom}</td>
                {[1, 2, 3].map(t => {
                  const notes = studentNotes[mid]?.[t] || {};
                  const data = computed.matData?.[mid]?.[t] || {};
                  return (
                    <Fragment key={`${mid}-${t}`}>
                      <td>{coef}</td>
                      <td>{notes.NJ ?? ''}</td>
                      <td>{notes.NE ?? ''}</td>
                      <td>{data.moy || ''}</td>
                      <td>{data.tot || ''}</td>
                      <td colSpan="2">{data.app || ''}</td>
                    </Fragment>
                  );
                })}
              </tr>
            );
          })}

          <tr className="total">
            <td className="left"><b>TOTAL</b></td>
            {[1, 2, 3].map(t => (
              <Fragment key={`total-${t}`}>
                <td colSpan="4"></td>
                <td>{computed.totals?.[t] || ''}</td>
                <td colSpan="2"></td>
              </Fragment>
            ))}
          </tr>

          <tr className="moyenne">
            <td className="left"><b>MOYENNE :</b></td>
            {[1, 2, 3].map(t => (
              <Fragment key={`moy-${t}`}>
                <td colSpan="4"></td>
                <td>{computed.moyGens?.[t] || ''}</td>
                <td colSpan="2"></td>
              </Fragment>
            ))}
          </tr>
        </tbody>
      </table>

      <div className="moyennes-bloc">
        {[1, 2, 3].map(t => (
          <div key={t} className="cell">
            <b>MOYENNE DE CLASSE :</b>
            <span className="uline w120">{computed.classAvgs?.[t] || ''}</span>
            <b>Rang :</b>
            <span className="uline w90">{computed.ranks?.[t] || ''}</span>
          </div>
        ))}
      </div>

      <table className="bulletin t-small">
        <colgroup>
          <col style={{ width: "120px" }} />
          <col />
          <col style={{ width: "160px" }} />
          <col style={{ width: "160px" }} />
          <col style={{ width: "160px" }} />
          <col style={{ width: "320px" }} />
        </colgroup>
        <thead>
          <tr>
            <th>COMPOSITION</th>
            <th>OBSERVATION</th>
            <th>TITULAIRE</th>
            <th>PARENT</th>
            <th>PROVISEUR</th>
            <th>RECAPITULATION ANNUELLE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="left">I</td>
            <td></td><td></td><td></td><td></td>
            <td className="recap" rowSpan="3">
              <div className="recap-line">
                <b>Moyenne</b>
                <span className="uline annual-average" style={{ width: "90px" }}>
                  {computed.annualAvg || ''}
                </span>
                <b>rang :</b>
                <span className="uline" style={{ width: "90px" }}>
                  {computed.annualRank || ''}
                </span>
              </div>
              <div style={{ marginTop: "8px" }}><b>DECISION DU CONSEIL</b></div>
              {computed.decision ? (
                <div><span className="decision-box">{computed.decision}</span></div>
              ) : (
                <div>
                  <div>Autorisé(e) à tripler : OUI - NON</div>
                  <div>Remise à sa famille</div>
                </div>
              )}
              <div style={{ marginTop: "14px" }}><b>LE PROVISEUR</b></div>
            </td>
          </tr>
          <tr>
            <td className="left">II</td>
            <td></td><td></td><td></td><td></td>
          </tr>
          <tr>
            <td className="left">III</td>
            <td></td><td></td><td></td><td></td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}
