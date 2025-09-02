// client/src/pages/contents/InscriptionEleve.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { api } from "../../api";

const DEFAULT_STUDENT = "/uploads/defaut.png";

export default function InscriptionEleve() {
  const [tab, setTab] = useState("root"); // "root" | "seconde" | "pt"
  const [userRole, setUserRole] = useState("Inconnu");
  const navigate = useNavigate();

  // Récupère le rôle pour activer/désactiver le bouton "Diviser"
  useEffect(() => {
    (async () => {
      try {
        const { user } = await api("/api/auth/me");
        setUserRole(user?.role || "Inconnu");
      } catch {
        // ignore → restera "Inconnu"
      }
    })();
  }, []);

  return (
    <>
      <style>{`
        .insc-wrap { display:flex; flex-direction:column; gap:16px; }
        .insc-title {
          color: rgb(8,57,64); margin-bottom: 10px; padding-bottom: 10px;
          border-bottom: 2px solid rgb(243,117,33); font-size: 1.4em; font-weight: 700;
        }
        .btn-grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 24px; margin-top: 30px; }
        .big-btn { background: rgb(8,57,64);margin-top: 130px; color:#fff; border:0; border-radius:12px; padding:24px;
          text-align:center; font-size:18px; font-weight:700; text-decoration:none; display:block;
          transition: transform .15s ease, filter .15s ease; cursor:pointer; }
        .big-btn:hover { transform: translateY(-2px); filter: brightness(1.05); }
        .back-btn { align-self:flex-start; background:#f1f5f9; color:#0f172a; border:0; border-radius:10px; padding:8px 12px; font-weight:700; cursor:pointer; }
        @media (max-width:700px){ .btn-grid{ grid-template-columns: 1fr; } }

        /* blocs */
        .zone { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-top: 14px; }
        .card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; }
        .title { font-weight:700; color:rgb(8,57,64); border-bottom:2px solid rgb(243,117,33); padding-bottom:8px; margin-bottom:12px; }
        @media (max-width:900px){ .zone{ grid-template-columns:1fr; } }

        /* table */
        table { width:100%; border-collapse: collapse; }
        th, td { border:1px solid #e5e7eb; padding:10px; }
        th { background: rgb(8,57,64); color:#fff; }
        tr:nth-child(even){ background:#f8fafc; }
        tr:hover{ background:#eef2ff; cursor:pointer; }

        /* droite */
        .right { display:flex; flex-direction:column; align-items:center; gap:10px; }
        .avatar { width:150px; height:150px; border-radius:50%; object-fit:cover; border:3px solid rgb(8,57,64); }
        .muted { color:#475569; }

        /* boutons */
        .btn { padding:10px 14px; border:0; border-radius:10px; font-weight:700; cursor:pointer; }
        .btn-primary { background: rgb(8,57,64); color:#fff; }
        .btn-secondary { background:#6c757d; color:#fff; }
        .btn-danger { background:#dc3545; color:#fff; }
        .btn-disabled { opacity:.55; cursor:not-allowed; }

        /* PT */
        .form-grid { display:grid; grid-template-columns: 2fr 1fr; gap:16px; }
        .row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
        .lbl { width: 170px; font-weight:600; color:rgb(8,57,64); }
        .read { flex:1; background:#f1f5f9; border-radius:8px; padding:8px 10px; min-height: 18px; }
        .sel { padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; }
        .rect-avatar { width:150px; height:150px; border-radius:8px; object-fit:cover; border:1px solid #e5e7eb; }
        .btns { display:flex; gap:10px; justify-content:flex-end; margin-top: 12px; }
        @media (max-width:900px){ .form-grid{ grid-template-columns:1fr; } }

        /* Modal voir profil */
        .modal-bg { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index: 60; }
        .modal { width:min(640px, 92vw); background:#fff; border-radius:12px; border:1px solid #e5e7eb; box-shadow:0 18px 48px rgba(2,6,23,.25); }
        .modal-hd { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #e5e7eb; font-weight:700; }
        .modal-bd { padding:16px; display:grid; grid-template-columns:140px 1fr; gap:16px; }
        .modal-ft { padding:12px 16px; border-top:1px solid #e5e7eb; display:flex; justify-content:flex-end; }
        .kv { display:flex; gap:8px; margin-bottom:6px; }
        .k { width:180px; color:#334155; font-weight:600; }
        .v { flex:1; }
        @media (max-width:600px){ .modal-bd{ grid-template-columns:1fr; } .k{ width:120px; } }
      `}</style>

      <div className="insc-wrap">
        <div className="insc-title">Inscription</div>

        {tab === "root" && (
          <div className="btn-grid">
            <button className="big-btn" onClick={() => setTab("seconde")}>Seconde</button>
            <button className="big-btn" onClick={() => setTab("pt")}>Première & Terminal</button>
          </div>
        )}

        {tab === "seconde" && (
          <>
            <button className="back-btn" onClick={() => setTab("root")}>← Retour</button>
            <SecondeView userRole={userRole} />
          </>
        )}

        {tab === "pt" && (
          <>
            <button className="back-btn" onClick={() => setTab("root")}>← Retour</button>
            <PremiereTerminalView />
          </>
        )}
      </div>
    </>
  );
}

/* ======================== SOUS-VUE : SECONDE ======================== */
function SecondeView({ userRole }) {
  const navigate = useNavigate();
  const [eleves, setEleves] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const isProviseur = String(userRole).toUpperCase() === "PROVISEUR";
  const isProf = String(userRole).toUpperCase() === "PROFESSEUR";

  const load = async () => {
    setLoading(true);
    try {
      const { eleves } = await api("/api/inscription/eleves?seconde=1");
      setEleves(eleves || []);
    } catch (e) {
      Swal.fire("Erreur", e.message || "Chargement impossible", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let on = true;
    (async () => {
      if (!on) return;
      await load();
    })();
    return () => { on = false; };
  }, []);

  const normPhoto = (p) => {
    if (!p) return DEFAULT_STUDENT;
    return p.startsWith("/uploads/") ? p : (p.startsWith("uploads/") ? "/" + p : p);
  };

  // Map id_section → lettre (fallback via section.code/nom)
  const sectionLetter = (id, sectionObj) => {
    if (id === 1) return "A";
    if (id === 2) return "B";
    if (id === 3) return "C";
    const code = (sectionObj?.code || sectionObj?.nom || "").toString().toUpperCase();
    if (["A", "B", "C"].includes(code)) return code;
    return null;
  };

  const divide = async () => {
    if (!isProviseur) return;
    const ok = await Swal.fire({
      title: "Diviser en sections ?",
      text: "Tous les élèves de Seconde seront répartis équitablement dans A, B et C (ordre alphabétique) et marqués comme inscrits.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, diviser",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#0f766e",
    });
    if (!ok.isConfirmed) return;

    try {
      const res = await api("/api/inscription/seconde/diviser", { method: "POST" });
      Swal.fire(
        "Succès",
        `Répartition effectuée (A:${res.assigned?.A ?? 0}, B:${res.assigned?.B ?? 0}, C:${res.assigned?.C ?? 0}).`,
        "success"
      );
      await load();
    } catch (e) {
      Swal.fire("Erreur", e.message || "Erreur lors de la division des sections.", "error");
    }
  };

  return (
    <>
      <div className="zone">
        <div className="card">
          <div className="title" style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <span>Élèves de Seconde</span>
            <button
              className={`btn btn-primary ${!isProviseur ? "btn-disabled" : ""}`}
              onClick={divide}
              disabled={!isProviseur}
              title={isProf ? "Seul le proviseur peut diviser les sections." : ""}
            >
              ➗Diviser en sections
            </button>
          </div>

          {loading ? "Chargement..." : eleves.length ? (
            <table>
              <thead>
                <tr><th>N°</th><th>Nom</th><th>Prénom</th></tr>
              </thead>
              <tbody>
                {eleves.map((e, i) => (
                  <tr key={e.id} onClick={() => setSelected(e)}>
                    <td>{i + 1}</td>
                    <td>{e.nom}</td>
                    <td>{e.prenom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="muted">Aucun élève trouvé.</div>
          )}
          <div>
              <button
                className="btn btn-primary"
                style={{ alignSelf: "center", marginTop: 10 }}
                onClick={() => navigate("/dashboard/inscrits")}>
                👁️Voir liste des élèves inscrits
              </button>
          </div>
        </div>

        <div className="card right">
          {!selected ? (
            <div className="muted">Clique un élève pour afficher ses détails.</div>
          ) : (
            <>
              <img className="avatar" src={normPhoto(selected.photo)} alt="Photo élève" />
              <div style={{ fontWeight:700, fontSize:18 }}>{selected.nom} {selected.prenom}</div>
              <div className="muted">
                {(selected.niveau?.nom || "Seconde")}
                {(() => {
                  const letter = sectionLetter(selected.sectionId, selected.section);
                  return letter ? ` — ${letter}` : "";
                })()}
              </div>

              <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setShowModal(true)}>
                Voir le profil
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal Voir le profil */}
      {showModal && selected && (
        <div className="modal-bg" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-hd">
              <span>Profil élève</span>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Fermer</button>
            </div>
            <div className="modal-bd">
              <img className="rect-avatar" src={normPhoto(selected.photo)} alt="Photo élève" />
              <div>
                <div className="kv"><div className="k">Nom</div><div className="v">{selected.nom}</div></div>
                <div className="kv"><div className="k">Prénom</div><div className="v">{selected.prenom}</div></div>
                <div className="kv"><div className="k">Sexe</div><div className="v">{selected.sexe || "-"}</div></div>
                <div className="kv"><div className="k">Date de naissance</div><div className="v">{selected.dateNais ? new Date(selected.dateNais).toLocaleDateString() : "-"}</div></div>
                <div className="kv"><div className="k">Lieu de naissance</div><div className="v">{selected.lieuNais || "-"}</div></div>
                <div className="kv"><div className="k">Niveau</div><div className="v">{selected.niveau?.nom || "Seconde"}</div></div>
                <div className="kv"><div className="k">Section</div><div className="v">{(() => {
                  const letter = (selected.section?.code || selected.section?.nom || "").toString().toUpperCase();
                  const viaId = sectionLetter(selected.sectionId, selected.section);
                  return viaId || (["A","B","C"].includes(letter) ? letter : "-");
                })()}</div></div>
                <div className="kv"><div className="k">Domicile</div><div className="v">{selected.domicile || "-"}</div></div>
                <div className="kv"><div className="k">Téléphone</div><div className="v">{selected.telephone || "-"}</div></div>
              </div>
            </div>
            <div className="modal-ft">
              <button className="btn btn-primary" onClick={() => setShowModal(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ============== SOUS-VUE : PREMIÈRE & TERMINAL ===================== */
function PremiereTerminalView() {
  const navigate = useNavigate();
  const [eleves, setEleves] = useState([]);
  const [selId, setSelId] = useState("");
  const [cur, setCur] = useState(null);
  const [section, setSection] = useState("L");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(DEFAULT_STUDENT);
  const fileRef = useRef(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const { eleves } = await api("/api/inscription/eleves?pt=1&nonInscrits=true");
        if (on) setEleves(eleves || []);
      } catch (e) {
        Swal.fire("Erreur", e.message || "Chargement impossible", "error");
      }
    })();
    return () => { on = false; };
  }, []);

  const onSelect = () => {
    const e = eleves.find(x => String(x.id) === String(selId));
    if (!e) {
      setCur(null);
      setPhotoPreview(DEFAULT_STUDENT);
      return;
    }
    setCur(e);
    const p = e.photo
      ? (e.photo.startsWith("/uploads/") ? e.photo : (e.photo.startsWith("uploads/") ? "/" + e.photo : e.photo))
      : DEFAULT_STUDENT;
    setPhotoPreview(p);
  };

  const pickPhoto = (ev) => {
    const f = ev.target.files?.[0];
    setPhotoFile(f || null);
    if (f) {
      const rd = new FileReader();
      rd.onload = (e) => setPhotoPreview(String(e.target?.result || ""));
      rd.readAsDataURL(f);
    } else {
      setPhotoPreview(cur?.photo || DEFAULT_STUDENT);
    }
  };

  const save = async () => {
    if (!cur) return Swal.fire("Erreur", "Sélectionne d'abord un élève.", "error");
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("sectionCode", section); // "L" | "S" | "OSE"
      if (photoFile) fd.append("photo", photoFile);

      const { eleve } = await api(`/api/inscription/eleves/${cur.id}`, {
        method: "PUT",
        body: fd,
      });

      Swal.fire("Succès", "Inscription enregistrée.", "success");
      setEleves((arr) => arr.filter(x => x.id !== cur.id));
      setSelId("");
      setCur(null);
      setPhotoFile(null);
      setPhotoPreview(DEFAULT_STUDENT);
      if (fileRef.current) fileRef.current.value = "";
      console.log("Inscrit:", eleve);
    } catch (e) {
      Swal.fire("Erreur", e.message || "Échec de l'inscription.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="title">Inscription — Première & Terminal</div>

      <div className="form-grid">
        <div className="card">
          <div className="row">
            <label className="lbl">Élève:</label>
            <select className="sel" value={selId} onChange={(e)=>setSelId(e.target.value)} style={{flex:1}}>
              <option value="">Sélectionner un élève (non inscrit)</option>
              {eleves.map(e => (
                <option key={e.id} value={e.id}>{e.id} — {e.nom} {e.prenom}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={onSelect}>Sélectionner</button>
          </div>

          <div className="row"><span className="lbl">Nom:</span><span className="read">{cur?.nom || "-"}</span></div>
          <div className="row"><span className="lbl">Prénom:</span><span className="read">{cur?.prenom || "-"}</span></div>
          <div className="row"><span className="lbl">Sexe:</span><span className="read">{cur?.sexe || "-"}</span></div>
          <div className="row"><span className="lbl">Date de naissance:</span><span className="read">{cur?.dateNais ? new Date(cur.dateNais).toLocaleDateString() : "-"}</span></div>
          <div className="row"><span className="lbl">Lieu de naissance:</span><span className="read">{cur?.lieuNais || "-"}</span></div>

          <div className="row">
            <span className="lbl">Niveau:</span>
            <span className="read">{cur?.niveau?.nom || "-"}</span>
            <span className="lbl" style={{ width:100, marginLeft:12 }}>Section:</span>
            <select className="sel" value={section} onChange={(e)=>setSection(e.target.value)} style={{flex:1}}>
              <option value="L">L</option>
              <option value="S">S</option>
              <option value="OSE">OSE</option>
            </select>
          </div>

          <div className="row"><span className="lbl">Domicile:</span><span className="read">{cur?.domicile || "-"}</span></div>
          <div className="row"><span className="lbl">Téléphone:</span><span className="read">{cur?.telephone || "-"}</span></div>
          <div className="row"><span className="lbl">Nom du père:</span><span className="read">{cur?.nomPere || "-"}</span></div>
          <div className="row"><span className="lbl">Nom de la mère:</span><span className="read">{cur?.nomMere || "-"}</span></div>

          <div className="btns">
            <button
              className="btn btn-secondary"
              onClick={()=>{
                setSelId("");
                setCur(null);
                setPhotoFile(null);
                setPhotoPreview(DEFAULT_STUDENT);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              🔄️Actualiser
            </button>
            <button className="btn btn-danger" onClick={()=>window.history.back()}>❌Quitter</button>
            <button className="btn btn-primary" onClick={save} disabled={!cur || saving}>
              {saving ? "✅Enregistrement..." : "✅Enregistrer"}
            </button>
          </div>
        </div>

        <div className="card right">
          <img className="rect-avatar" src={photoPreview} alt="Photo étudiant" />
        </div>
      </div>

      <button
        className="btn btn-primary"
        style={{ alignSelf: "center", marginTop: 10 }}
        onClick={() => navigate("/dashboard/inscrits")}
      >
        👁️Voir liste des élèves inscrits
      </button>


    </>
  );
}
