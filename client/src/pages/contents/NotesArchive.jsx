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

  // Permissions
  const [me, setMe] = useState(null);
  const [canWriteForClass, setCanWriteForClass] = useState(false);

  const radarRef = useRef(null);
  const chartRef = useRef(null);

  const SWAL = (opts) =>
    Swal.fire({
      confirmButtonText: "OK",
      buttonsStyling: false,
      customClass: { confirmButton: "btn gradSave" },
      ...opts,
    });

  /* ---------------- Session ---------------- */
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

  /* ------- Data: élèves+matières (avec ids Classe) ------- */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const qsAbs = new URLSearchParams({ niveau: cycle, section: sub });
        const qsNotes = new URLSearchParams({ cycle, sub });
        const [E, M] = await Promise.all([
          api(`/api/absence/eleves?${qsAbs.toString()}`), // élève avec niveau.id / section.id
          api(`/api/notes/matieres?${qsNotes.toString()}`),
        ]);
        setEleves(E?.eleves || []);
        setMatieres(M?.matieres || []);
      } catch (e) {
        SWAL({ icon: "error", title: "Erreur", text: e.message || "Chargement impossible." });
      } finally {
        setLoading(false);
      }
    })();

    resetAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle, sub]);

  const labelsForRadar = useMemo(
    () => (matieres || []).map((m) => m.code || m.nom),
    [matieres]
  );

  /* ---------------- Utils ---------------- */
  function resetAll() {
    setSelectedMatiere("");
    setSelectedMatiereNom("");
    setSelectedTrimestre("");
    setSelectedType("tout");
    setSelectedEleve(null);
    setArchiveNote({ note: null, coefficient: 1 });
    setIsEditing(false);
    setCanWriteForClass(false);
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

  /* ---------------- Radar ----------------
     - mode "tout"        : 2 datasets (journalière + examen)
     - mode "monoDataset" : 1 dataset (selon selectedType)
  ---------------------------------------------------------*/
  async function fetchRadar(idEleve, trimestre, monoDataset /* "Note Journalière" | "Note Examen" | null */) {
    const qs = new URLSearchParams({ cycle, sub, idEleve, trimestre, type: "tout" });
    const data = await api(`/api/notes/radar?${qs.toString()}`);
    const notes_j = Array.isArray(data?.notes_j) ? data.notes_j : [];
    const notes_e = Array.isArray(data?.notes_e) ? data.notes_e : [];

    if (!radarRef.current) return;
    destroyChart();

    const ctx = radarRef.current.getContext("2d");
    let datasets;

    if (monoDataset === "Note Journalière") {
      datasets = [
        {
          label: "Journalière",
          data: notes_j,
          backgroundColor: "rgba(14,165,233,0.2)",
          borderColor: "rgb(14,165,233)",
          pointBackgroundColor: "rgb(14,165,233)",
          borderWidth: 2,
        },
      ];
    } else if (monoDataset === "Note Examen") {
      datasets = [
        {
          label: "Examen",
          data: notes_e,
          backgroundColor: "rgba(99,102,241,0.2)",
          borderColor: "rgb(99,102,241)",
          pointBackgroundColor: "rgb(99,102,241)",
          borderWidth: 2,
        },
      ];
    } else {
      datasets = [
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
      ];
    }

    chartRef.current = new Chart(ctx, {
      type: "radar",
      data: { labels: labelsForRadar, datasets },
      options: {
        scales: { r: { suggestedMin: 0, suggestedMax: 20, ticks: { stepSize: 5 } } },
        plugins: { legend: { display: true } },
      },
    });
  }

  /* ------------- Archive d’une matière/type ------------- */
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

  /* ---------------- Afficher selon filtres ---------------- */
  async function onAfficher() {
    if (!selectedEleve) return SWAL({ icon: "info", title: "Info", text: "Sélectionnez d’abord un élève." });
    if (!selectedTrimestre) return SWAL({ icon: "info", title: "Info", text: "Choisissez un trimestre." });

    // Matière = "tout" -> radar
    if (selectedMatiere === "tout") {
      const mono = selectedType === "tout" ? null : selectedType; // un seul dataset si type ≠ tout
      await fetchRadar(selectedEleve.id, selectedTrimestre, mono);
      return;
    }

    // Matière spécifique -> archive d’édition
    if (!selectedMatiere) {
      return SWAL({ icon: "info", title: "Info", text: "Choisissez une matière." });
    }
    if (selectedType === "tout") {
      return SWAL({ icon: "info", title: "Info", text: "Choisissez un type (Journalière ou Examen)." });
    }
    await fetchForArchive(selectedEleve.id, selectedTrimestre, selectedType);
  }

  /* -------------- Sélection d’un élève (table) -------------- */
  async function handleRowClick(eleve) {
    setSelectedEleve(eleve);
    setIsEditing(false);
    destroyChart();

    // Permission pour la classe de l'élève
    if (me && eleve?.niveau?.id != null && eleve?.section?.id != null) {
      const ok =
        me.role === "PROVISEUR" ||
        (me.role === "PROFESSEUR" &&
          Number(me.titulaireNiveauId) === Number(eleve.niveau.id) &&
          Number(me.titulaireSectionId) === Number(eleve.section.id));
      setCanWriteForClass(!!ok);
    } else {
      setCanWriteForClass(false);
    }

    // Rejouer l’affichage si les filtres sont déjà renseignés
    if (!selectedTrimestre) return;
    if (selectedMatiere === "tout") {
      const mono = selectedType === "tout" ? null : selectedType;
      await fetchRadar(eleve.id, selectedTrimestre, mono);
    } else if (selectedMatiere && selectedMatiere !== "tout" && selectedType && selectedType !== "tout") {
      await fetchForArchive(eleve.id, selectedTrimestre, selectedType);
    }
  }

  /* ------------------- Update note ------------------- */
  async function handleUpdateNote() {
    // Interdictions
    if (!canWriteForClass) {
      return SWAL({ icon: "warning", title: "Accès refusé", text: "Action réservée au proviseur ou au titulaire de cette classe." });
    }
    if (!selectedEleve || !selectedMatiere || !selectedTrimestre || !selectedType || selectedType === "tout") {
      return SWAL({ icon: "info", title: "Info", text: "Élève, matière, trimestre et type requis." });
    }
    if (archiveNote.note == null) {
      return SWAL({ icon: "warning", title: "Modification impossible", text: "Aucune note existante pour cette matière et ce type — vous ne pouvez pas créer depuis l’archive." });
    }

    const input = document.getElementById("noteEdit");
    const note = Number(input?.value);
    if (!Number.isFinite(note) || note < 0 || note > 20) {
      return SWAL({ icon: "error", title: "Erreur", text: "La note doit être comprise entre 0 et 20." });
    }

    // 1) Confirmation
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

    // 2) Requête + 3) Alerte de résultat (succès/erreur)
    try {
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

      await SWAL({ icon: "success", title: "Modification réussie", text: "La note a été mise à jour avec succès ✅." });
      await fetchForArchive(selectedEleve.id, selectedTrimestre, selectedType);
      setIsEditing(false);
    } catch (e) {
      await SWAL({ icon: "error", title: "Échec de la modification", text: e?.message || "Impossible de mettre à jour la note." });
    }
  }

  /* ----------------- Dérivés ----------------- */
  const total = useMemo(() => {
    const n = Number(archiveNote?.note);
    const c = Number(archiveNote?.coefficient || 1);
    return Number.isFinite(n) ? (n * c).toFixed(2) : "";
  }, [archiveNote]);

  // Nom de matière affiché
  useEffect(() => {
    if (selectedMatiere === "tout") setSelectedMatiereNom("Toutes les matières");
    else if (selectedMatiere) {
      const m = matieres.find((x) => String(x.id) === String(selectedMatiere));
      setSelectedMatiereNom(m?.nom || "");
    } else {
      setSelectedMatiereNom("");
    }
  }, [selectedMatiere, matieres]);

  // 🔁 Forcer un type valide si on choisit une matière ≠ "tout"
  useEffect(() => {
    if (selectedMatiere && selectedMatiere !== "tout" && selectedType === "tout") {
      setSelectedType("Note Journalière"); // valeur par défaut
    }
  }, [selectedMatiere, selectedType]);

  // Quand on change les filtres, on réinitialise l’édition + graphique
  useEffect(() => {
    setIsEditing(false);
    setArchiveNote((p) => ({ ...p, note: null })); // évite d’éditer une valeur périmée
    destroyChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatiere, selectedType, selectedTrimestre]);

  if (loading) return <div>Chargement…</div>;

  return (
    <div className="wrap">
      <style>{`
        :root{ --ink:#083940; --muted:#475569; --line:#e5e7eb; --ring:#93c5fd; }
        .wrap{
          min-height:100vh; padding:28px 18px;
          background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #f97316 100%);
        }
        .section-title{
          color:black; text-align:center; font-size: clamp(22px, 2.2vw, 30px);
          font-weight:900; letter-spacing:.3px; margin-bottom:16px;
          text-shadow:0 2px 10px rgba(0,0,0,.25);
        }
        .content-body{
          width:min(1100px, 100%); margin:0 auto;
          display:grid; grid-template-columns: 1fr 320px; gap:16px;
        }
        @media (max-width:980px){ .content-body{ grid-template-columns: 1fr; } }
        .centre{
          background: rgba(255,255,255,.92); backdrop-filter: blur(8px);
          border:1px solid rgba(255,255,255,.7); border-radius:16px;
          box-shadow:0 12px 30px rgba(2,6,23,.16); padding:14px; min-width:0;
        }
        .filters-container{
          margin:0 0 14px 0; background: rgba(255,255,255,.92);
          backdrop-filter: blur(8px); border:1px solid rgba(255,255,255,.7);
          border-radius:16px; box-shadow:0 12px 30px rgba(2,6,23,.16); padding:12px;
        }
        .filters-row{ display:flex; flex-direction:column; align-items:stretch; gap:10px; }
        .filter-group{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
        .filter-group label{ font-weight:900; color:var(--ink); min-width:60px; font-size:14px; }
        .filter-group select{
          padding:10px 12px; border:1px solid var(--line); border-radius:12px; background:#fff; font-size:13px;
          outline:none; transition:border-color .15s, box-shadow .15s; min-width:180px;
        }
        .filter-group select:focus{ border-color:var(--ring); box-shadow:0 0 0 4px rgba(147,197,253,.30); }
        .filters-actions{ display:flex; gap:10px; flex-wrap:wrap; }
        .apply-filters-btn, .reset-filters-btn{
          padding:10px 14px; border:0; border-radius:12px; font-weight:900; cursor:pointer; white-space:nowrap;
          box-shadow:0 10px 22px rgba(2,6,23,.18); transition: transform .08s ease, filter .12s ease, box-shadow .2s ease;
          color:#fff;
        }
        .apply-filters-btn{ background: linear-gradient(135deg,#22c55e,#16a34a); }
        .reset-filters-btn{ background: linear-gradient(135deg,#0ea5e9,#0284c7); }
        table.notes-table{ width:100%; border-collapse:collapse; margin-top:6px; table-layout:fixed; }
        .notes-table th, .notes-table td{ border:1px solid var(--line); padding:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .notes-table th{ background:#083940; color:#fff; font-size:14px; text-align:left; }
        .notes-table tr:nth-child(even){ background:#f8fafc; }
        .notes-table tr:hover{ background:#eef2ff; cursor:pointer; }
        .selected-row{ background:rgba(8,57,64,.10) !important; border-left:4px solid #083940; }
        .droite{
          width:320px; background: rgba(255,255,255,.92);
          backdrop-filter: blur(8px); border:1px solid rgba(255,255,255,.7);
          border-radius:16px; box-shadow:0 12px 30px rgba(2,6,23,.16);
          padding:14px; display:flex; flex-direction:column; align-items:center; gap:8px;
          position: sticky; top: 28px; height: calc(100vh - 56px); overflow: hidden;
        }
        @media (max-width:980px){ .droite{ position: static; width:100%; height:auto; overflow:visible; } }
        .student-photo{ width:110px; height:110px; border-radius:50%; object-fit:cover; border:4px solid #0ea5e9; box-shadow:0 8px 22px rgba(2,6,23,.15); }
        .student-name{ color:#0f172a; font-weight:900; text-align:center; }
        .student-class{ color:#f97316; font-weight:900; text-align:center; }
        .toggle{
          display:flex; align-items:center; justify-content:space-between; width:100%;
          padding:8px 10px; background:rgba(2,6,23,.04); border-radius:12px; margin:6px 0 8px;
        }
        .update-note-btn{
          padding:10px 12px; border:0; border-radius:12px; font-weight:900; cursor:pointer; width:100%;
          background: linear-gradient(135deg,#22c55e,#16a34a); color:#fff;
          box-shadow:0 10px 24px rgba(2,6,23,.18);
        }
        .update-note-btn:disabled{ opacity:.6; cursor:not-allowed; box-shadow:none; }
        .no-selection{ text-align:center; color:#475569; }
        .perm-hint{ color:#b91c1c; font-weight:800; text-align:center; }
        .btn{ padding:10px 14px; border:0; border-radius:12px; font-weight:900; cursor:pointer; }
        .gradSave{ background: linear-gradient(135deg,#22c55e,#16a34a); color:#fff; }
      `}</style>

      <div className="content-body">
        {/* Gauche : Filtres + Liste */}
        <div className="centre">
          <h2 className="section-title">📚 Consultation des Notes — {cap(cycle)} {sub}</h2>

          <div className="filters-container">
            <div className="filters-row">
              <div className="filter-group">
                <label>📘 Matière :</label>
                <select value={selectedMatiere} onChange={(e) => setSelectedMatiere(e.target.value)}>
                  <option value="">-- Sélectionner une matière --</option>
                  <option value="tout">Tout</option>
                  {matieres.map((m) => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>🗓️ Trimestre :</label>
                <select value={selectedTrimestre} onChange={(e) => setSelectedTrimestre(e.target.value)}>
                  <option value="">-- Sélectionner un trimestre --</option>
                  <option value="1er trimestre">1er Trimestre</option>
                  <option value="2eme trimestre">2ème Trimestre</option>
                  <option value="3eme trimestre">3ème Trimestre</option>
                </select>
              </div>

              <div className="filter-group">
                <label>🏷️ Type :</label>
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                  {/* Si matière ≠ "tout" → on masque l’option "tout" */}
                  {selectedMatiere && selectedMatiere !== "tout" ? (
                    <>
                      <option value="Note Journalière">Note Journalière</option>
                      <option value="Note Examen">Note Examen</option>
                    </>
                  ) : (
                    <>
                      <option value="Note Journalière">Note Journalière</option>
                      <option value="Note Examen">Note Examen</option>
                      <option value="tout">Tout (les deux)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="filters-actions">
                <button className="apply-filters-btn" onClick={onAfficher}>👀 Afficher</button>
                <button className="reset-filters-btn" onClick={resetAll}>♻️ Réinitialiser</button>
                <button className="reset-filters-btn" onClick={() => navigate(`/dashboard/notes/${cycle}/${sub}`)}>↩️ Retour</button>
              </div>
            </div>
          </div>

          {eleves?.length ? (
            <table className="notes-table">
              <thead>
                <tr><th>N°</th><th>Nom</th><th>Prénom</th></tr>
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

        {/* Droite : Panneau radial / édition */}
        <div className="droite">
          {selectedEleve ? (
            <>
              <img
                className="student-photo"
                src={normPhoto(selectedEleve.photo || selectedEleve.photoUrl)}
                alt="Élève"
                onError={(e) => (e.currentTarget.src = DEFAULT_STUDENT)}
              />
              <div className="student-name">👤 {selectedEleve.nom} {selectedEleve.prenom}</div>
              <div className="student-class">🏫 {cap(cycle)} {sub}</div>

              {selectedMatiereNom && (
                <p style={{ textAlign: "center", color: "rgb(8,57,64)", fontSize: 13, marginBottom: 5 }}>
                  <strong>📘 Matière :</strong> {selectedMatiereNom}
                </p>
              )}
              {selectedTrimestre && (
                <p style={{ textAlign: "center", color: "rgb(8,57,64)", fontSize: 13, marginBottom: 10 }}>
                  <strong>🗓️ Trimestre :</strong> {selectedTrimestre}
                </p>
              )}

              {/* Radar */}
              {selectedTrimestre && selectedMatiere === "tout" ? (
                <div className="radar-container" style={{ width: "100%", padding: 10 }}>
                  <canvas id="radarChart" ref={radarRef} />
                </div>
              ) : selectedTrimestre && selectedMatiere && selectedMatiere !== "tout" && selectedType && selectedType !== "tout" ? (
                <>
                  <div className="toggle" title={canWriteForClass ? "" : "Réservé au proviseur ou au titulaire"}>
                    <span className="modify-label" style={{ fontSize: 12, fontWeight: 800, color: "rgb(8,57,64)", textTransform: "uppercase" }}>
                      ✏️ Modifier :
                    </span>
                    <input
                      type="checkbox"
                      checked={isEditing && canWriteForClass && archiveNote.note != null}
                      disabled={!canWriteForClass || archiveNote.note == null}
                      onChange={(e) => setIsEditing(e.target.checked)}
                    />
                  </div>

                  {!canWriteForClass && (
                    <div className="perm-hint">⛔ Vous n'êtes pas autorisé à modifier pour cette classe.</div>
                  )}
                  {archiveNote.note == null && (
                    <div className="perm-hint">ℹ️ Aucune note enregistrée pour cette matière/type — modification impossible.</div>
                  )}

                  <div className="student-details" style={{ width: "100%" }}>
                    <label>Note :</label>
                    <input
                      id="noteEdit"
                      type="number"
                      step="0.25"
                      min="0"
                      max="20"
                      defaultValue={archiveNote.note ?? ""}
                      disabled={!isEditing || !canWriteForClass || archiveNote.note == null}
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
                      disabled={!isEditing || !canWriteForClass || archiveNote.note == null}
                    >
                      💾 Enregistrer
                    </button>
                  </div>
                </>
              ) : (
                <div className="no-selection">Sélectionnez une matière (≠ “Tout”) et un type pour éditer la note, ou “Tout” pour le radar.</div>
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

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ""; }
