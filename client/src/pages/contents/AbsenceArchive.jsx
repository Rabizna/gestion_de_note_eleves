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

  // === Nouveaux états permission ===
  const [me, setMe] = useState(null); // user session
  const [canWriteForClass, setCanWriteForClass] = useState(false);

  const [motif, setMotif] = useState("");
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const title = `Archive des Absences ${cap(cycle)} ${sub}`;

  // Chargement session
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
    const labels = stats.map((s) => shortestWord(`${s.nom} ${s.prenom}`));
    const data = stats.map((s) => s.total);
    const colors = data.map((n) => {
      if (n === 0) return "#22c55e";
      if (n <= 3) return "#fde047";
      if (n <= 6) return "#fb923c";
      return "#ef4444";
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
            borderRadius: 6,
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

  // Quand on clique un élève, on charge ses absences et on calcule permission
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

    // Permission par classe de l'élève
    if (me && e?.niveau?.id != null && e?.section?.id != null) {
      const ok =
        me.role === "PROVISEUR" ||
        (me.role === "PROFESSEUR" &&
          Number(me.titulaireNiveauId) === Number(e.niveau.id) &&
          Number(me.titulaireSectionId) === Number(e.section.id));
      setCanWriteForClass(!!ok);
    } else {
      setCanWriteForClass(false);
    }
  };

  // Naviguer dans les absences
  const curAbs = useMemo(() => (absences.length ? absences[index] : null), [absences, index]);

  useEffect(() => {
    setMotif(curAbs?.motif || "");
  }, [curAbs?.id]); // eslint-disable-line

  const saveMotif = async () => {
    if (!canWriteForClass) {
      return Swal.fire("Accès refusé", "Action réservée au proviseur ou au titulaire de cette classe.", "warning");
    }
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
        :root{ --ink:#0f172a; --muted:#475569; --line:#e5e7eb; --ring:#93c5fd; }

        /* ===== Page gradient ===== */
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

        .grid{ width:100%; max-width:1200px; display:grid; grid-template-columns: 2fr 1fr; gap:18px; }
        @media (max-width:900px){ .grid{ grid-template-columns:1fr; } }

        /* ===== Cards “glass” ===== */
        .card{
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,.7);
          border-radius: 18px;
          padding: 14px;
          box-shadow: 0 12px 30px rgba(2,6,23,.16);
          color: var(--ink);
        }

        /* ===== Table ===== */
        table{ width:100%; border-collapse:separate; border-spacing:0; background:#fff; border-radius:12px; overflow:hidden; }
        th,td{ border-bottom:1px solid var(--line); padding:12px 10px; }
        th{
          background: linear-gradient(135deg, #0f172a, #1f2937);
          color:#fff; font-weight:900; letter-spacing:.25px; text-align:left;
          position:sticky; top:0; z-index:1;
        }
        tr:nth-child(even) td{ background:#fafafa; }
        tr:hover td{ background:#eef2ff; cursor:pointer; }
        .selected td{ background:rgba(14,165,233,.14) !important; }

        /* ===== Photo + infos ===== */
        .photo{
          width:110px; height:110px; border-radius:50%; object-fit:cover;
          border:4px solid #0ea5e9; margin:10px auto; display:block;
          box-shadow:0 10px 24px rgba(2,6,23,.18);
          transition: transform .12s ease, box-shadow .2s ease;
        }
        .photo:hover{ transform: translateY(-2px); box-shadow:0 14px 30px rgba(2,6,23,.26); }
        .name{ text-align:center; color:#083940; font-weight:900; margin-top:8px; }
        .chip{
          display:inline-block; background:rgba(14,165,233,.12); color:#0ea5e9; font-weight:800;
          border-radius:14px; padding:4px 10px; margin:6px auto;
        }

        .row{ display:flex; align-items:center; gap:10px; margin:8px 0; }
        .lbl{ width:120px; color:#334155; font-weight:800; }
        .read{ flex:1; background:#fff; border-radius:12px; padding:8px 10px; min-height:20px; border:1px solid var(--line); }

        /* ===== Switch ===== */
        .switch{ position:relative; width:52px; height:28px; }
        .switch input{ opacity:0; width:0; height:0; }
        .slider{ position:absolute; inset:0; background:#cbd5e1; border-radius:999px; transition:.2s; }
        .slider::before{ content:""; position:absolute; width:22px; height:22px; left:3px; top:3px; background:#fff; border-radius:50%; transition:.2s; box-shadow:0 2px 6px rgba(0,0,0,.2); }
        .switch input:checked + .slider{ background:#0ea5e9; }
        .switch input:checked + .slider::before{ transform: translateX(24px); }

        /* ===== Buttons (gradients) ===== */
        .btn{
          padding:10px 14px; border:0; border-radius:12px; font-weight:900; cursor:pointer; color:#fff;
          box-shadow:0 10px 24px rgba(2,6,23,.18);
          transition: transform .08s ease, filter .12s ease, box-shadow .2s ease, opacity .15s ease;
        }
        .btn:hover{ transform: translateY(-1px); filter: brightness(1.03); box-shadow:0 14px 28px rgba(2,6,23,.24); }
        .primary{ background: linear-gradient(135deg,#0ea5e9,#6366f1); }
        .secondary{ background: linear-gradient(135deg,#cbd5e1,#94a3b8); color:#0f172a; }
        .danger{ background: linear-gradient(135deg,#ef4444,#b91c1c); }

        .chartBox{ height:400px; margin-top:14px; }
        .perm-hint{ color:#b91c1c; font-weight:800; text-align:center; }
      `}</style>

      <div className="wrap">
        <div className="title">📚 {title}</div>

        <button className="btn secondary" onClick={() => navigate(`/dashboard/absence/${cycle}`)}>
          ← Retour
        </button>

        <div className="grid">
          {/* GAUCHE : Tableau élèves + Graph */}
          <div className="card">
            <h3 className="section-title" style={{margin:"0 0 10px 0"}}>🧑‍🎓 Élèves</h3>
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
              <div style={{color:"#ef4444"}}>Aucun élève trouvé.</div>
            )}

            <div className="chartBox">
              <h3 className="section-title" style={{margin:"14px 0 10px 0"}}>📊 Statistiques des absences</h3>
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
                  <span className="lbl">Modifier</span>
                  <label className="switch" title={canWriteForClass ? "" : "Réservé au proviseur ou au titulaire"}>
                    <input
                      type="checkbox"
                      checked={canEdit && canWriteForClass}
                      disabled={!canWriteForClass}
                      onChange={(e)=>setCanEdit(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                {!canWriteForClass && (
                  <div className="perm-hint">⛔ Vous n'êtes pas autorisé à modifier pour cette classe.</div>
                )}

                {curAbs ? (
                  <>
                    <div className="row"><span className="lbl">Date</span><span className="read">{curAbs.date}</span></div>
                    <div className="row"><span className="lbl">Période</span><span className="read">{curAbs.plage === "MATIN" ? "Matin" : "Après-midi"}</span></div>
                    <div className="row" style={{alignItems:"flex-start"}}>
                      <span className="lbl" style={{marginLeft: "20px"}}>Motif</span>
                      <textarea
                        className="read"
                        style={{minHeight:80, background:"#fff", border:"1px solid #e5e7eb"}}
                        disabled={!canEdit || !canWriteForClass}
                        value={motif}
                        onChange={(e)=>setMotif(e.target.value)}
                      />
                    </div>
                    <div className="row" style={{justifyContent:"space-between", width:"100%"}}>
                      <button className="btn secondary" disabled={index<=0} onClick={()=>setIndex(i=>Math.max(0,i-1))}>← Précédent</button>
                      <button className="btn primary" disabled={!canEdit || !canWriteForClass} onClick={saveMotif}>💾 Enregistrer</button>
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
