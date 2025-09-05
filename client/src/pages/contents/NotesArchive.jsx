// client/src/pages/contents/NotesArchive.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import Chart from "chart.js/auto";
import { api } from "../../api";

const DEFAULT_STUDENT = "/Uploads/defaut-eleve.png";

export default function NotesArchive() {
  const navigate = useNavigate();
  const { cycle, sub } = useParams();

  const [eleves, setEleves] = useState([]);
  const [matieres, setMatieres] = useState([]);

  const [selectedMatiere, setSelectedMatiere] = useState("");
  const [selectedMatiereNom, setSelectedMatiereNom] = useState("");
  const [selectedTrimestre, setSelectedTrimestre] = useState("");
  const [selectedType, setSelectedType] = useState("tout");

  const [selectedEleve, setSelectedEleve] = useState(null);
  const [archiveNote, setArchiveNote] = useState({ note: null, coefficient: 1 });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const radarRef = useRef(null);
  const chartRef = useRef(null);

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
        setLoading(true);
        const qs = new URLSearchParams({ cycle, sub });
        const [E, M] = await Promise.all([
          api(`/api/notes/eleves?${qs.toString()}`),
          api(`/api/notes/matieres?${qs.toString()}`),
        ]);
        setEleves(E?.eleves || []);
        setMatieres(M?.matieres || []);
      } catch (e) {
        SWAL({ icon: "error", title: "Erreur", text: e.message || "Chargement impossible." });
      } finally {
        setLoading(false);
      }
    })();

    // reset si on change d’URL
    resetAll();
  }, [cycle, sub]);

  const labelsForRadar = useMemo(
    () => (matieres || []).map((m) => m.code || m.nom),
    [matieres]
  );

  function resetAll() {
    setSelectedMatiere("");
    setSelectedMatiereNom("");
    setSelectedTrimestre("");
    setSelectedType("tout");
    setSelectedEleve(null);
    setArchiveNote({ note: null, coefficient: 1 });
    setIsEditing(false);
    destroyChart();
  }

  function destroyChart() {
    try {
      chartRef.current?.destroy();
      chartRef.current = null;
    } catch {}
  }

  function normPhoto(photo) {
    if (!photo || typeof photo !== "string") return DEFAULT_STUDENT;
    if (photo.startsWith("data:image/")) return photo;
    let p = photo.replace(/\\/g, "/").trim();
    p = p.replace(/^\/?uploads\//i, "Uploads/").replace(/^\/?Uploads\//, "Uploads/");
    return `/${p}`;
  }

  function mentionFrom(note) {
    const n = Number(note);
    if (!Number.isFinite(n)) return "";
    if (n >= 16) return "Excellent";
    if (n >= 14) return "Très Bien";
    if (n >= 12) return "Bien";
    if (n >= 10) return "Assez Bien";
    if (n >= 8) return "Passable";
    return "Insuffisant";
  }

  async function fetchForRadar(idEleve, trimestre) {
    const qs = new URLSearchParams({ cycle, sub, idEleve, trimestre, type: "tout" });
    const data = await api(`/api/notes/radar?${qs.toString()}`);
    const notes_j = Array.isArray(data?.notes_j) ? data.notes_j : [];
    const notes_e = Array.isArray(data?.notes_e) ? data.notes_e : [];

    if (!radarRef.current) return;
    destroyChart();

    chartRef.current = new Chart(radarRef.current.getContext("2d"), {
      type: "radar",
      data: {
        labels: labelsForRadar,
        datasets: [
          {
            label: "Journalière",
            data: notes_j,
            backgroundColor: "rgba(243,117,33,0.2)",
            borderColor: "rgb(8,57,64)",
            pointBackgroundColor: "rgb(8,57,64)",
            borderWidth: 2,
          },
          {
            label: "Examen",
            data: notes_e,
            backgroundColor: "rgba(255,99,132,0.2)",
            borderColor: "rgb(255,99,132)",
            pointBackgroundColor: "rgb(255,99,132)",
            borderWidth: 2,
          },
        ],
      },
      options: {
        scales: { r: { suggestedMin: 0, suggestedMax: 20, ticks: { stepSize: 5 } } },
        plugins: { legend: { display: true } },
      },
    });
  }

  async function fetchForArchive(idEleve, trimestre, type) {
    const qs = new URLSearchParams({
      cycle,
      sub,
      matiere: String(selectedMatiere),
      trimestre,
      type,
    });
    const data = await api(`/api/notes/archive?${qs.toString()}`);
    const row = (data?.notes || []).find((n) => Number(n.idEleve) === Number(idEleve));
    setArchiveNote({
      note: row?.note ?? null,
      coefficient: Number(row?.coefficient ?? 1),
    });
  }

  async function onAfficher() {
    if (!selectedEleve) return SWAL({ icon: "info", title: "Info", text: "Sélectionnez d’abord un élève." });
    if (!selectedTrimestre)
      return SWAL({ icon: "info", title: "Info", text: "Choisissez un trimestre." });

    if (selectedType === "tout") {
      await fetchForRadar(selectedEleve.id, selectedTrimestre);
    } else {
      if (!selectedMatiere || selectedMatiere === "tout") {
        return SWAL({ icon: "info", title: "Info", text: "Choisissez une matière." });
      }
      await fetchForArchive(selectedEleve.id, selectedTrimestre, selectedType);
    }
  }

  async function handleRowClick(eleve) {
    setSelectedEleve(eleve);
    setIsEditing(false);
    destroyChart();

    if (!selectedTrimestre) return;
    if (selectedType === "tout") {
      await fetchForRadar(eleve.id, selectedTrimestre);
    } else if (selectedMatiere && selectedMatiere !== "tout") {
      await fetchForArchive(eleve.id, selectedTrimestre, selectedType);
    }
  }

  async function handleUpdateNote() {
    const input = document.getElementById("noteEdit");
    const note = Number(input?.value);
    if (!Number.isFinite(note) || note < 0 || note > 20) {
      return SWAL({ icon: "error", title: "Erreur", text: "La note doit être comprise entre 0 et 20." });
    }

    const ok = await Swal.fire({
      title: "Confirmer la modification",
      text: "Voulez-vous vraiment modifier cette note ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Oui, modifier",
      cancelButtonText: "Annuler",
    }).then((r) => r.isConfirmed);

    if (!ok) return;

    await api("/api/notes/update", {
      method: "PUT",
      body: {
        eleveId: selectedEleve.id,
        matiereId: Number(selectedMatiere),
        trimestre: selectedTrimestre,
        noteStatut: selectedType, // "Note Journalière" | "Note Examen"
        note,
      },
    });

    await SWAL({ icon: "success", title: "Succès", text: "Note enregistrée." });
    await fetchForArchive(selectedEleve.id, selectedTrimestre, selectedType);
    setIsEditing(false);
  }

  const coef = useMemo(() => Number(archiveNote?.coefficient || 1), [archiveNote]);
  const total = useMemo(() => {
    const n = Number(archiveNote?.note);
    return Number.isFinite(n) ? (n * (Number.isFinite(coef) ? coef : 1)).toFixed(2) : "";
  }, [archiveNote, coef]);

  useEffect(() => {
    if (selectedMatiere === "tout") setSelectedMatiereNom("Toutes les matières");
    else if (selectedMatiere) {
      const m = matieres.find((x) => String(x.id) === String(selectedMatiere));
      setSelectedMatiereNom(m?.nom || "");
    } else {
      setSelectedMatiereNom("");
    }
  }, [selectedMatiere, matieres]);

  if (loading) return <div>Chargement…</div>;

  return (
    <div className="content" style={{ padding: 15, background: "#fff" }}>
      <style>{`
        .section-title { color: rgb(8,57,64); margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid rgb(243,117,33); text-align: center; font-size: 22px; }
        .filters-container { background-color:#f8f9fa; padding:10px; border-radius:8px; margin-bottom:20px; box-shadow:0 2px 5px rgba(0,0,0,0.1); box-sizing:border-box; }
        .filters-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .filter-group { display:flex; align-items:center; gap:8px; flex-direction:row; flex-wrap:wrap; }
        .filter-group label { font-weight:bold; color:rgb(8,57,64); min-width:60px; font-size:14px; white-space:nowrap; }
        .filter-group select { padding:8px 10px; border:2px solid #ddd; border-radius:5px; background-color:white; cursor:pointer; font-size:12px; min-width:120px; max-width:150px; box-sizing:border-box; }
        .filter-group select:focus { outline:none; border-color:rgb(8,57,64); }
        .apply-filters-btn { padding:8px 15px; background-color:rgb(8,57,64); color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold; transition:all .3s ease; font-size:13px; white-space:nowrap; }
        .reset-filters-btn { padding:8px 15px; background-color:#6c757d; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold; transition:all .3s ease; font-size:13px; white-space:nowrap; }
        .content-body { display:flex; gap:15px; min-height:0; }
        .centre { flex:1; background-color:white; border-radius:8px; padding:15px; box-shadow:0 2px 5px rgba(0,0,0,0.1); overflow-y:auto; min-width:0; }
        .notes-table { width:100%; border-collapse:collapse; margin-top:20px; box-shadow:0 2px 5px rgba(0,0,0,0.1); table-layout:fixed; }
        .notes-table th, .notes-table td { border:1px solid #ddd; padding:10px; text-align:left; word-wrap:break-word; overflow:hidden; text-overflow:ellipsis; }
        .notes-table th:first-child, .notes-table td:first-child { width:50px; }
        .notes-table th:nth-child(2), .notes-table td:nth-child(2) { width:45%; }
        .notes-table th:nth-child(3), .notes-table td:nth-child(3) { width:45%; }
        .notes-table th { background-color:rgb(8,57,64); color:white; font-weight:bold; font-size:14px; }
        .notes-table tr:nth-child(even) { background-color:#f2f2f2; }
        .notes-table tr:hover { background-color:#e6f7ff; cursor:pointer; }
        .droite { width:300px; background:linear-gradient(135deg,#f8f9fa,#e0e7ff); border-radius:12px; padding:10px; box-shadow:0 4px 10px rgba(0,0,0,0.15); display:flex; flex-direction:column; align-items:center; }
        .student-photo { width:100px; height:100px; border-radius:50%; object-fit:cover; border:4px solid rgb(8,57,64); margin:0 auto 10px; display:block; }
        .student-name { color:rgb(8,57,64); text-align:center; margin-bottom:6px; font-weight:bold; font-size:15px; }
        .student-class { color:rgb(243,117,33); font-weight:bold; text-align:center; font-size:15px; margin-bottom:10px; }
        .toggle { display:flex; align-items:center; justify-content:space-between; width:100%; padding:6px 8px; background:rgba(8,57,64,.05); border-radius:5px; margin-bottom:10px; }
        .update-note-btn { padding:8px 12px; background-color:rgb(8,57,64); color:white; border:none; border-radius:6px; cursor:pointer; font-weight:700; width:100%; }
        .selected-row { background-color:#b3d9ff !important; border-left:4px solid rgb(8,57,64); }
        .no-selection { text-align:center; color:#666; }
        @media (max-width: 980px){ .content-body { flex-direction:column; } .droite { width:100%; } }
      `}</style>

      <h2 className="section-title">Consultation des Notes - {cap(cycle)} {sub}</h2>

      {/* Filtres */}
      <div className="filters-container">
        <div className="filters-row">
          <div className="filter-group">
            <label>Matière :</label>
            <select
              value={selectedMatiere}
              onChange={(e) => setSelectedMatiere(e.target.value)}
            >
              <option value="">-- Sélectionner une matière --</option>
              <option value="tout">Tout</option>
              {matieres.map((m) => (
                <option key={m.id} value={m.id}>{m.nom}</option>
              ))}
            </select>

            <label>Trimestre :</label>
            <select
              value={selectedTrimestre}
              onChange={(e) => setSelectedTrimestre(e.target.value)}
            >
              <option value="">-- Sélectionner un trimestre --</option>
              <option value="1er trimestre">1er Trimestre</option>
              <option value="2eme trimestre">2ème Trimestre</option>
              <option value="3eme trimestre">3ème Trimestre</option>
            </select>

            <label>Type :</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="tout">Tout (les deux)</option>
              <option value="Note Journalière">Note Journalière</option>
              <option value="Note Examen">Note Examen</option>
            </select>
          </div>

          <button className="apply-filters-btn" onClick={onAfficher}>Afficher les notes</button>
          <button className="reset-filters-btn" onClick={resetAll}>Réinitialiser</button>
          <button className="reset-filters-btn" onClick={() => navigate(`/dashboard/notes/${cycle}/${sub}`)}>Retour</button>
        </div>
      </div>

      {/* Corps */}
      <div className="content-body">
        {/* Liste élèves */}
        <div className="centre">
          {eleves?.length ? (
            <table className="notes-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Nom</th>
                  <th>Prénom</th>
                </tr>
              </thead>
              <tbody>
                {eleves.map((e, i) => (
                  <tr
                    key={e.id}
                    onClick={() => handleRowClick(e)}
                    className={selectedEleve?.id === e.id ? "selected-row" : ""}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{i + 1}</td>
                    <td>{e.nom}</td>
                    <td>{e.prenom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-selection">Aucun élève trouvé pour {cap(cycle)} {sub}.</div>
          )}
        </div>

        {/* Panneau droit */}
        <div className="droite">
          {selectedEleve ? (
            <>
              <img
                className="student-photo"
                src={normPhoto(selectedEleve.photo || selectedEleve.photoUrl)}
                alt="Élève"
                onError={(e) => (e.currentTarget.src = DEFAULT_STUDENT)}
              />
              <div className="student-name">{selectedEleve.nom} {selectedEleve.prenom}</div>
              <div className="student-class">{cap(cycle)} {sub}</div>

              {selectedMatiereNom && (
                <p style={{ textAlign: "center", color: "rgb(8,57,64)", fontSize: 13, marginBottom: 5 }}>
                  <strong>Matière :</strong> {selectedMatiereNom}
                </p>
              )}
              {selectedTrimestre && (
                <p style={{ textAlign: "center", color: "rgb(8,57,64)", fontSize: 13, marginBottom: 10 }}>
                  <strong>Trimestre :</strong> {selectedTrimestre}
                </p>
              )}

              {/* Si "tout" → radar */}
              {selectedType === "tout" && selectedTrimestre ? (
                <div className="radar-container" style={{ width: "100%", padding: 10 }}>
                  <canvas id="radarChart" ref={radarRef} />
                </div>
              ) : selectedTrimestre && selectedMatiere && selectedMatiere !== "tout" ? (
                <>
                  <div className="toggle">
                    <span className="modify-label" style={{ fontSize: 12, fontWeight: 800, color: "rgb(8,57,64)", textTransform: "uppercase" }}>
                      Modifier :
                    </span>
                    <input
                      type="checkbox"
                      checked={isEditing}
                      onChange={(e) => setIsEditing(e.target.checked)}
                    />
                  </div>

                  <div className="student-details" style={{ width: "100%" }}>
                    <label>Note :</label>
                    <input
                      id="noteEdit"
                      type="number"
                      step="0.25"
                      min="0"
                      max="20"
                      defaultValue={archiveNote.note ?? ""}
                      disabled={!isEditing}
                      style={{ width: "100%", marginBottom: 6 }}
                      onChange={(e) =>
                        setArchiveNote((p) => ({ ...p, note: e.target.value === "" ? null : Number(e.target.value) }))
                      }
                    />

                    <label>Mention :</label>
                    <input
                      type="text"
                      readOnly
                      value={archiveNote.note != null ? mentionFrom(archiveNote.note) : ""}
                      style={{ width: "100%", marginBottom: 6 }}
                    />

                    <label>Note Total :</label>
                    <input
                      readOnly
                      value={archiveNote.note != null ? total : ""}
                      style={{ width: "100%", marginBottom: 8 }}
                    />

                    <button
                      className="update-note-btn"
                      onClick={handleUpdateNote}
                      disabled={!isEditing}
                    >
                      Enregistrer
                    </button>
                  </div>
                </>
              ) : (
                <div className="no-selection">Sélectionnez une matière et un type pour éditer la note, ou “Tout” pour le radar.</div>
              )}
            </>
          ) : (
            <div className="no-selection">Cliquez sur un élève pour afficher ses détails</div>
          )}
        </div>
      </div>
    </div>
  );
}

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}
