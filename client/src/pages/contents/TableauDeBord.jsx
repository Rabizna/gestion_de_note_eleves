// client/src/pages/contents/TableauDeBord.jsx
import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import Swal from "sweetalert2";
// Chart.js auto-register
import Chart from "chart.js/auto";

export default function TableauDeBord() {
  const [stats, setStats] = useState(null);
  const pieRef = useRef(null);
  const barRef = useRef(null);
  const pieChart = useRef(null);
  const barChart = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api("/api/stats/eleves");
        setStats(data);
      } catch (e) {
        Swal.fire("Erreur", e.message || "Impossible de charger les statistiques.", "error");
      }
    })();
  }, []);

  // Dessine les charts quand stats arrivent
  useEffect(() => {
    if (!stats) return;

    // ——— Pie sexe ———
    const sexes = stats.bySexe?.map(s => s.sexe) ?? [];
    const sexVals = stats.bySexe?.map(s => s.count) ?? [];

    if (pieChart.current) pieChart.current.destroy();
    if (pieRef.current) {
      pieChart.current = new Chart(pieRef.current, {
        type: "pie",
        data: {
          labels: sexes,
          datasets: [
            {
              label: "Répartition par sexe",
              data: sexVals,
            },
          ],
        },
        options: {
          plugins: {
            legend: { position: "bottom" },
          },
        },
      });
    }

    // ——— Bar Niv+Sec ———
    const labels = (stats.byNiveauSection ?? []).map(
      r => `${labelClasse(r.classe) || r.niveauNom} — ${r.sectionNom}`
    );
    const vals = (stats.byNiveauSection ?? []).map(r => r.count);

    if (barChart.current) barChart.current.destroy();
    if (barRef.current) {
      barChart.current = new Chart(barRef.current, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Élèves par niveau & section",
              data: vals,
              borderWidth: 1,
            },
          ],
        },
        options: {
          scales: {
            x: { ticks: { autoSkip: false, maxRotation: 60, minRotation: 0 } },
            y: { beginAtZero: true, ticks: { stepSize: 1 } },
          },
          plugins: {
            legend: { display: false },
            tooltip: { mode: "index", intersect: false },
          },
        },
      });
    }

    return () => {
      if (pieChart.current) pieChart.current.destroy();
      if (barChart.current) barChart.current.destroy();
    };
  }, [stats]);

  const g = stats?.global ?? { total: 0, inscrits: 0, nonInscrits: 0, redoublants: 0, renvoyes: 0 };

  return (
    <>
      <style>{`
        .dash-wrap{ display:flex; flex-direction:column; gap:16px; }
        .title{ color:rgb(8,57,64); font-size:22px; font-weight:800; padding-bottom:10px; border-bottom:2px solid rgb(243,117,33); }
        .cards{ display:grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap:14px; }
        .card{ background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:14px; box-shadow: 0 6px 24px rgba(2,6,23,.06); }
        .k{ color:#475569; font-weight:600; font-size:13px; }
        .v{ color:#0f172a; font-weight:800; font-size:24px; margin-top:4px; }
        .charts{ display:grid; grid-template-columns: 1fr 1fr; gap:16px; }
        .panel{ background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:16px; }
        .panel h3{ margin:0 0 10px; color:rgb(8,57,64); }
        @media (max-width: 1100px){
          .cards{ grid-template-columns: repeat(2, minmax(0,1fr)); }
          .charts{ grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="dash-wrap">
        <div className="title">Tableau de bord — Statistiques élèves</div>

        {/* Cartes KPI */}
        <div className="cards">
          <div className="card"><div className="k">Total élèves</div><div className="v">{g.total}</div></div>
          <div className="card"><div className="k">Inscrits</div><div className="v">{g.inscrits}</div></div>
          <div className="card"><div className="k">Non inscrits</div><div className="v">{g.nonInscrits}</div></div>
          <div className="card"><div className="k">Redoublants</div><div className="v">{g.redoublants}</div></div>
          <div className="card"><div className="k">Renvoyés</div><div className="v">{g.renvoyes}</div></div>
        </div>

        {/* Graphiques */}
        <div className="charts">
          <div className="panel">
            <h3>Répartition par sexe</h3>
            <canvas ref={pieRef} height={260} />
          </div>

            <div className="panel">
              <h3>Effectifs par niveau & section</h3>
              <canvas ref={barRef} height={260} />
            </div>
        </div>

        {/* Tableau rapide par niveau & section */}
        <div className="panel" style={{marginTop:16}}>
          <h3>Détail par niveau & section</h3>
          {!stats?.byNiveauSection?.length ? (
            <div style={{color:"#475569"}}>Aucune donnée.</div>
          ) : (
            <table style={{width:"100%", borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  <th style={th}>Classe</th>
                  <th style={th}>Niveau</th>
                  <th style={th}>Section</th>
                  <th style={th}>Effectif</th>
                </tr>
              </thead>
              <tbody>
                {stats.byNiveauSection.map((r, i) => (
                  <tr key={i}>
                    <td style={td}>{labelClasse(r.classe) || "-"}</td>
                    <td style={td}>{r.niveauNom}</td>
                    <td style={td}>{r.sectionNom}</td>
                    <td style={td}>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

const th = { textAlign:"left", border:"1px solid #e5e7eb", padding:"8px", background:"rgb(8,57,64)", color:"#fff" };
const td = { border:"1px solid #e5e7eb", padding:"8px" };

function labelClasse(c) {
  if (c === "seconde") return "Seconde";
  if (c === "premiere") return "Première";
  if (c === "terminale") return "Terminale";
  return null;
}
