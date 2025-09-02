// client/src/pages/contents/AbsenceArchive.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { api } from "../../api";
import Chart from "chart.js/auto";

const DEFAULT_STUDENT = "/uploads/defaut.png";

export default function AbsenceArchive() {
  const navigate = useNavigate();
  const { cycle, sub } = useParams(); // seconde|premiere|terminale + A|B|C|L|S|OSE
  const [eleves, setEleves] = useState([]);
  const [selected, setSelected] = useState(null); // élève sélectionné
  const [absences, setAbsences] = useState([]);
  const [index, setIndex] = useState(0);
  const [canEdit, setCanEdit] = useState(false);
  const [motif, setMotif] = useState("");
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const title = `Archive des Absences ${cap(cycle)} ${sub}`;

  // Chargement élèves + stats (graph)
  useEffect(() => {
    (async () => {
      try {
        const qs = new URLSearchParams({ niveau: cycle, section: sub });
        const [{ eleves }, { stats }] = await Promise.all([
          api(`/api/absence/eleves?${qs}`),
          api(`/api/absence/archive/stats?${qs}`),
        ]);
        setEleves(eleves || []);
        drawChart(stats || []);
      } catch (e) {
        Swal.fire("Erreur", e.message || "Chargement impossible.", "error");
      }
    })();

    // cleanup chart on unmount/route change
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle, sub]);

  function drawChart(stats) {
    // Prépare les labels (nom le plus court entre nom/prénom) & couleurs
    const labels = stats.map((s) => shortestWord(`${s.nom} ${s.prenom}`));
    const data = stats.map((s) => s.total);
    const colors = data.map((n) => {
      if (n === 0) return "#28a745";
      if (n <= 3) return "#ffc107";
      if (n <= 6) return "#fd7e14";
      return "#dc3545";
    });

    if (chartRef.current) chartRef.current.destroy();
    const ctx = canvasRef.current.getContext("2d");
    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Absences",
            data,
            backgroundColor: colors,
            borderColor: colors,
            borderWidth: 1,
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
          x: { ticks: { maxRotation: 45, minRotation: 45 } },
        },
      },
    });
  }

  // Quand on clique un élève, on charge ses absences
  const pickEleve = async (e) => {
    setSelected(e);
    setAbsences([]);
    setIndex(0);
    setCanEdit(false);
    setMotif("");

    try {
      const res = await api(`/api/absence/by-student/${e.id}`);
      const list = res.absences || [];
      setAbsences(list);
      if (list.length) setMotif(list[0].motif || "");
    } catch (err) {
      Swal.fire("Erreur", err.message || "Impossible de charger les absences.", "error");
    }
  };

  // Naviguer dans les absences
  const curAbs = useMemo(() => (absences.length ? absences[index] : null), [absences, index]);

  useEffect(() => {
    setMotif(curAbs?.motif || "");
  }, [curAbs?.id]); // eslint-disable-line

  const saveMotif = async () => {
    if (!canEdit) {
      return Swal.fire("Modification désactivée", "Active le switch pour modifier.", "warning");
    }
    if (!curAbs) return;

    try {
      await api(`/api/absence/${curAbs.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motif }),
      });
      setAbsences((arr) =>
        arr.map((a) => (a.id === curAbs.id ? { ...a, motif } : a))
      );
      Swal.fire("Succès", "Motif mis à jour.", "success");
    } catch (e) {
      Swal.fire("Erreur", e.message || "Échec de la mise à jour.", "error");
    }
  };

  const normPhoto = (p) => {
    if (!p) return DEFAULT_STUDENT;
    return p.startsWith("/uploads/") ? p : p.startsWith("uploads/") ? "/" + p : p;
  };

  return (
    <>
      <style>{`
        .wrap{ display:flex; flex-direction:column; gap:16px; }
        .title{ color:rgb(8,57,64); font-size:22px; font-weight:800; padding-bottom:10px; border-bottom:2px solid rgb(243,117,33); }
        .grid{ display:grid; grid-template-columns: 2fr 1fr; gap:18px; }
        @media (max-width:900px){ .grid{ grid-template-columns:1fr; } }
        .card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px; }
        table{ width:100%; border-collapse: collapse; }
        th,td{ border:1px solid #e5e7eb; padding:10px; }
        th{ background:rgb(8,57,64); color:#fff; }
        tr:nth-child(even){ background:#f8fafc; }
        tr:hover{ background:#e6f7ff; cursor:pointer; }
        .selected{ background: rgba(8,57,64,.08) !important; }
        .photo{ width:100px; height:100px; border-radius:50%; object-fit:cover; border:4px solid rgb(8,57,64); margin:10px auto; display:block; }
        .name{ text-align:center; color:rgb(8,57,64); font-weight:700; margin-top:8px; }
        .chip{ display:inline-block; background:rgba(243,117,33,.1); color:rgb(243,117,33); font-weight:700; border-radius:14px; padding:3px 10px; margin:6px auto; }
        .row{ display:flex; align-items:center; gap:10px; margin:8px 0; }
        .lbl{ width:120px; color:#334155; font-weight:600; }
        .read{ flex:1; background:#f5f5f5; border-radius:6px; padding:8px; min-height:20px; }
        .switch{ position:relative; width:52px; height:28px; }
        .switch input{ opacity:0; width:0; height:0; }
        .slider{ position:absolute; inset:0; background:#cbd5e1; border-radius:999px; transition:.2s; }
        .slider::before{ content:""; position:absolute; width:22px; height:22px; left:3px; top:3px; background:#fff; border-radius:50%; transition:.2s; box-shadow:0 2px 6px rgba(0,0,0,.2); }
        .switch input:checked + .slider{ background:rgb(8,57,64); }
        .switch input:checked + .slider::before{ transform: translateX(24px); }
        .btn{ padding:10px 12px; border:0; border-radius:10px; font-weight:700; cursor:pointer; color:#fff; }
        .btn:hover{ opacity:.92; }
        .primary{ background: rgb(8,57,64); }
        .secondary{ background:#6c757d; }
        .danger{ background:#dc3545; }
        .chartBox{ height:400px; margin-top:14px; }
      `}</style>

      <div className="wrap">
        <div className="title">{title}</div>

        <button className="btn secondary" onClick={() => navigate(`/dashboard/absence/${cycle}`)}>
          ← Retour
        </button>

        <div className="grid">
          {/* GAUCHE : Tableau élèves + Graph */}
          <div className="card">
            <h3 className="section-title" style={{margin:"0 0 10px 0"}}>Élèves</h3>
            {eleves.length ? (
              <table>
                <thead>
                  <tr><th>N°</th><th>Nom</th><th>Prénom</th></tr>
                </thead>
                <tbody>
                  {eleves.map((e, i) => (
                    <tr
                      key={e.id}
                      className={selected?.id === e.id ? "selected" : ""}
                      onClick={() => pickEleve(e)}
                    >
                      <td>{i + 1}</td>
                      <td>{e.nom}</td>
                      <td>{e.prenom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{color:"#dc3545"}}>Aucun élève trouvé.</div>
            )}

            <div className="chartBox">
              <h3 className="section-title" style={{margin:"14px 0 10px 0"}}>Statistiques des absences</h3>
              <canvas ref={canvasRef} />
            </div>
          </div>

          {/* DROITE : Fiche élève + navigation + edit motif */}
          <div className="card" style={{display:"flex", flexDirection:"column", alignItems:"center"}}>
            {!selected ? (
              <div style={{color:"#475569"}}>Clique un élève pour afficher ses absences.</div>
            ) : (
              <>
                <img className="photo" src={normPhoto(selected.photo)} alt="Photo élève" />
                <div className="name">{selected.nom} {selected.prenom}</div>
                <div className="chip">{selected.niveau?.nom ?? "-"} — {selected.section?.nom ?? "-"}</div>

                <div className="row" style={{marginTop:10}}>
                  <span className="lbl">Modifier :</span>
                  <label className="switch">
                    <input type="checkbox" checked={canEdit} onChange={(e)=>setCanEdit(e.target.checked)} />
                    <span className="slider"></span>
                  </label>
                </div>

                {curAbs ? (
                  <>
                    <div className="row"><span className="lbl">Date</span><span className="read">{curAbs.date}</span></div>
                    <div className="row"><span className="lbl">Période</span><span className="read">{curAbs.plage === "MATIN" ? "Matin" : "Après-midi"}</span></div>
                    <div className="row" style={{alignItems:"flex-start"}}>
                      <span className="lbl" style={{marginLeft: "20px"}}>Motif</span>
                      <textarea
                        className="read"
                        style={{minHeight:80, background:"#fff", border:"1px solid #e5e7eb"}}
                        disabled={!canEdit}
                        value={motif}
                        onChange={(e)=>setMotif(e.target.value)}
                      />
                    </div>
                    <div className="row" style={{justifyContent:"space-between", width:"100%"}}>
                      <button className="btn secondary" disabled={index<=0} onClick={()=>setIndex(i=>Math.max(0,i-1))}>← Précédent</button>
                      <button className="btn primary" disabled={!canEdit} onClick={saveMotif}>💾 Enregistrer</button>
                      <button className="btn secondary" disabled={index>=absences.length-1} onClick={()=>setIndex(i=>Math.min(absences.length-1,i+1))}>Suivant →</button>
                    </div>
                  </>
                ) : (
                  <div className="row" style={{marginTop:10, color:"#475569"}}>Aucune absence pour cet élève.</div>
                )}

                <button className="btn danger" style={{marginTop:14}} onClick={()=>navigate("/dashboard")}>🏠 Quitter</button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function cap(s){ return s ? s[0].toUpperCase()+s.slice(1) : ""; }
function shortestWord(full){
  const parts = String(full||"").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return parts.reduce((min,w)=> (w.length<min.length? w : min), parts[0]);
}
