// client/src/pages/contents/EnregistrerEleve.jsx
import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { api } from "../../api";

const TEL_REGEX = /^\+261\d{9}$/; // +261 + 9 chiffres

export default function EnregistrerEleve() {
  const [niveaux, setNiveaux] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const [form, setForm] = useState({
    nom: "", prenom: "", numeroActe: "",
    dateNaissance: "", lieuNaissance: "", niveauId: "",
    domicile: "", telephone: "", sexe: "",
    nbFrere: "", nbSoeur: "", distanceKm: "",
    pereNom: "", pereProfession: "", pereTel: "",
    mereNom: "", mereProfession: "", mereTel: "",
    tuteurNom: "", tuteurProfession: "", tuteurTel: "",
  });

  const [errors, setErrors] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("/uploads/defaut.png");
  const fileInputRef = useRef(null);

  useEffect(() => {
    api("/api/refs/niveaux")
      .then(({ niveaux }) => setNiveaux(niveaux || []))
      .catch(() => Swal.fire("Erreur", "Impossible de charger les niveaux.", "error"));
  }, []);

  // ---------- Validation ----------
  const validateField = (name, value) => {
    const v = String(value ?? "").trim();
    const required = new Set([
      "nom","numeroActe","dateNaissance","lieuNaissance","niveauId",
      "domicile","telephone","sexe","nbFrere","nbSoeur","distanceKm",
      "pereNom","pereProfession","pereTel",
      "mereNom","mereProfession","mereTel",
      "tuteurNom","tuteurProfession","tuteurTel",
    ]);
    if (required.has(name) && v === "") return "Champ obligatoire.";

    switch (name) {
      case "telephone":
        return TEL_REGEX.test(v) ? "" :
          "Le numéro doit commencer par +261 et contenir 13 caractères (+261 + 9 chiffres).";
      case "dateNaissance": {
        const d = new Date(v), today = new Date();
        if (!v) return "Champ obligatoire.";
        if (isNaN(+d)) return "Date invalide.";
        if (d > today) return "La date ne peut pas être future.";
        return "";
      }
      case "nbFrere":
      case "nbSoeur": {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 0 || n > 20) return "Valeur invalide (0 à 20).";
        return "";
      }
      case "niveauId":
        return v ? "" : "Sélectionnez un niveau.";
      default:
        return "";
    }
  };

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: validateField(name, value) }));
  };
  const onChange = (k) => (e) => setField(k, e.target.value);

  const onSelectPhoto = (e) => {
    const f = e.target.files?.[0];
    setPhotoFile(f || null);
    setFileName(f?.name || "");
    if (f) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(String(ev.target?.result || ""));
      reader.readAsDataURL(f);
    } else {
      setPhotoPreview("/uploads/defaut.png");
    }
  };

  const onReset = () => {
    setForm({
      nom: "", prenom: "", numeroActe: "",
      dateNaissance: "", lieuNaissance: "", niveauId: "",
      domicile: "", telephone: "", sexe: "",
      nbFrere: "", nbSoeur: "", distanceKm: "",
      pereNom: "", pereProfession: "", pereTel: "",
      mereNom: "", mereProfession: "", mereTel: "",
      tuteurNom: "", tuteurProfession: "", tuteurTel: "",
    });
    setErrors({});
    setPhotoFile(null);
    setFileName("");
    setPhotoPreview("/uploads/defaut.png");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    Object.entries(form).forEach(([k, v]) => {
      const m = validateField(k, v);
      if (m) next[k] = m;
    });
    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      return Swal.fire("Champs invalides", "Veuillez corriger les erreurs en rouge.", "error");
    }

    try {
      setLoading(true);
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (photoFile) fd.append("photo", photoFile);
      await api("/api/students", { method: "POST", body: fd });
      await Swal.fire("Succès", "Élève enregistré avec succès.", "success");
      onReset();
    } catch (err) {
      Swal.fire("Erreur", err?.message || "Échec de l’enregistrement.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        :root{ --label-w: 140px; }

        .form-title{
          font-size:1.4em; font-weight:700; color:rgb(8,57,64);
          margin-bottom:12px; padding-bottom:10px; border-bottom:2px solid rgb(243,117,33);
        }

        /* 2 colonnes: gauche (champs) / droite (photo) */
        .top-grid{
          display:grid;
          grid-template-columns: 1fr 200px; /* la gauche s'étire jusqu'à la photo */
          column-gap:16px; align-items:start;
        }
        .left-col{ min-width:0; }

        /* ligne simple (label à gauche, input à droite) */
        .row{ display:flex; align-items:center; gap:10px; margin-top:10px; }
        .row .label-inline{ width:var(--label-w); font-weight:600; }
        .row .control{ flex:1; min-width:0; } /* plus de max-width → les 3 champs touchent la photo */

        /* grilles 3 colonnes alignées */
        .grid3{ display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:12px; align-items:start; }
        .cell{ display:block; }
        .cell .label-inline{ display:inline-block; width:var(--label-w); font-weight:600; vertical-align:middle; }
        .cell .control{ display:inline-block; width:calc(100% - var(--label-w)); vertical-align:middle; }

        .input {
          width:400px; padding:10px 12px; border:1px solid #ddd; border-radius:6px; font-size:14px;
          transition:border-color .15s, box-shadow .15s;
        }
        .select{
          width: 100%; padding:10px 12px; border:1px solid #ddd; border-radius:6px; font-size:14px;
          transition:border-color .15s, box-shadow .15s;
        }

        .input:focus, .select:focus{ border-color:rgb(243,117,33); outline:none; box-shadow:0 0 0 2px rgba(243,117,33,.15); }
        .invalid{ border-color:#dc2626 !important; box-shadow:0 0 0 2px rgba(220,38,38,.12); }
        .error{ color:#dc2626; font-size:12px; margin-top:4px; margin-left:var(--label-w); min-height:16px; }

        /* photo fixe */
        .photo-col{ width:200px; }
        .photo-wrap{
          width:160px; height:180px; border:1px solid #ddd; border-radius:8px; overflow:hidden;
          background:#f8fafc; display:flex; align-items:center; justify-content:center;
        }
        .photo-wrap img{ width:100%; height:100%; object-fit:cover; }
        .uploader{ width:160px; margin-top:8px; }
        .file-name{
          width:160px; font-size:12px; color:#444; margin-top:6px;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }

        .button-container{ display:flex; gap:12px; justify-content:center; margin-top:14px; }
        .btn{ padding:10px 16px; font-weight:600; border:0; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; }
        .btn-valide{ background:green; color:#fff; } .btn-primary{ background:#2563eb; color:#fff; } .btn-danger{ background:#dc2626; color:#fff; }
        .btn:disabled{ opacity:.7; cursor:not-allowed; }

        @media (max-width:980px){
          .top-grid{ grid-template-columns: 1fr; }
          .photo-col{ width:100%; }
        }
        @media (max-width:640px){
          .grid3{ grid-template-columns:1fr; }
        }
      `}</style>

      <div className="form-title">Ajouter une nouvelle élève</div>

      <form className="class-form" onSubmit={onSubmit} onReset={onReset} noValidate>
        <div className="top-grid">
          {/* Colonne gauche */}
          <div className="left-col">
            {/* Nom */}
            <div className="row">
              <label className="label-inline">Nom:</label>
              <div className="control">
                <input
                  className={`input ${errors.nom ? "invalid" : ""}`}
                  style={{marginTop: "25px"}}
                  value={form.nom}
                  onChange={onChange("nom")}
                  onBlur={(e) => setField("nom", e.target.value)}
                />
                <div className="error">{errors.nom || ""}</div>
              </div>
            </div>
            {/* Prénom */}
            <div className="row">
              <label className="label-inline">Prénom:</label>
              <div className="control">
                <input
                  className="input"
                  value={form.prenom}
                  onChange={onChange("prenom")}
                  onBlur={(e) => setField("prenom", e.target.value)}
                />
              </div>
            </div>
            {/* Numéro acte */}
            <div className="row">
              <label className="label-inline">Numéro acte:</label>
              <div className="control">
                <input
                  className={`input ${errors.numeroActe ? "invalid" : ""}`}
                  value={form.numeroActe}
                  onChange={onChange("numeroActe")}
                  onBlur={(e) => setField("numeroActe", e.target.value)}
                />
                <div className="error">{errors.numeroActe || ""}</div>
              </div>
            </div>

            {/* Date | Lieu (placeholder) | Niveau */}
            <div className="grid3" style={{ marginTop: 10 }}>
              <div className="cell">
                <span className="label-inline">Date de Naissance:</span>
                <span className="control">
                  <input
                    type="date"
                    style={{ width: "150px" }}
                    className={`input ${errors.dateNaissance ? "invalid" : ""}`}
                    value={form.dateNaissance}
                    onChange={onChange("dateNaissance")}
                    onBlur={(e) => setField("dateNaissance", e.target.value)}
                  />
                </span>
                <div className="error">{errors.dateNaissance || ""}</div>
              </div>

              <div className="cell">
                {/* pas de label, placeholder seulement */}
                <span className="label-inline" style={{ visibility: "hidden" }}>Lieu de naissance:</span>
                <span className="control">
                  <input
                    className={`input ${errors.lieuNaissance ? "invalid" : ""}`}
                    placeholder="Lieu de naissance"
                    style={{ width: "150px" }}
                    value={form.lieuNaissance}
                    onChange={onChange("lieuNaissance")}
                    onBlur={(e) => setField("lieuNaissance", e.target.value)}
                  />
                </span>
                <div className="error">{errors.lieuNaissance || ""}</div>
              </div>

              <div className="cell">
                <span className="" style={{ marginLeft: "60px", fontweight:"600px" }}>Niveau:</span>
                <span className="control">
                  <select
                    className={`select ${errors.niveauId ? "invalid" : ""}`}
                    value={form.niveauId}
                    onChange={onChange("niveauId")}
                    onBlur={(e) => setField("niveauId", e.target.value)}
                  >
                    <option value=""></option>
                    {niveaux.map((n) => (
                      <option key={n.id} value={n.id}>{n.nom}</option>
                    ))}
                  </select>
                </span>
                <div className="error">{errors.niveauId || ""}</div>
              </div>
            </div>

            {/* Domicile | Téléphone | Sexe (3 labels) */}
            <div className="grid3" style={{ marginTop: 10 }}>
              <div className="cell">
                <span className="label-inline">Domicile:</span>
                <span className="control">
                  <input
                    className={`input ${errors.domicile ? "invalid" : ""}`}
                    style={{ marginLeft: "10px", width: "150px"}}
                    value={form.domicile}
                    onChange={onChange("domicile")}
                    onBlur={(e) => setField("domicile", e.target.value)}
                  />
                </span>
                <div className="error">{errors.domicile || ""}</div>
              </div>

              <div className="cell">
                <span className="control">
                  <input
                    className={`input ${errors.telephone ? "invalid" : ""}`}
                    style={{ marginLeft: "140px", width: "150px"}}
                    placeholder="+261XXXXXXXXX"
                    value={form.telephone}
                    onChange={onChange("telephone")}
                    onBlur={(e) => setField("telephone", e.target.value)}
                  />
                </span>
                <div className="error">{errors.telephone || ""}</div>
              </div>

              <div className="cell">
                <span className="" style={{ marginLeft: "60px", fontweight:"600px" }}>Sexe:</span>
                <span className="control">
                  <select
                    className={`select ${errors.sexe ? "invalid" : ""}`}
                    style={{ marginLeft: "12px" }}
                    value={form.sexe}
                    onChange={onChange("sexe")}
                    onBlur={(e) => setField("sexe", e.target.value)}
                  >
                    <option value=""></option>
                    <option value="Masculin">Masculin</option>
                    <option value="Féminin">Féminin</option>
                    <option value="Autre">Autre</option>
                  </select>
                </span>
                <div className="error">{errors.sexe || ""}</div>
              </div>
            </div>

            {/* Nb frères/sœurs (label) | Sœurs (placeholder) | Distance (label) */}
            <div className="grid3" style={{ marginTop: 10 }}>
              <div className="cell">
                <span className="label-inline">Nombre frères/sœurs:</span>
                <span className="control">
                  <select
                    className={`select ${errors.nbFrere ? "invalid" : ""}`}
                    style={{ width: "150px"}}
                    value={form.nbFrere}
                    onChange={onChange("nbFrere")}
                    onBlur={(e) => setField("nbFrere", e.target.value)}
                  >
                    <option value="">Frère</option>
                    {[0,1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </span>
                <div className="error">{errors.nbFrere || ""}</div>
              </div>

              <div className="cell">
                {/* pas de label → placeholder “Sœurs” */}
                <span className="control">
                  <select
                    className={`select ${errors.nbSoeur ? "invalid" : ""}`}
                    style={{ marginLeft: "60px", width: "150px" }}
                    value={form.nbSoeur}
                    onChange={onChange("nbSoeur")}
                    onBlur={(e) => setField("nbSoeur", e.target.value)}
                  >
                    <option value="">Sœurs</option>
                    {[0,1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </span>
                <div className="error">{errors.nbSoeur || ""}</div>
              </div>

              <div className="cell">
                <span className="" style={{ marginLeft: "12px" }}>Distance:</span>
                <span className="control">
                  <select
                    className={`select ${errors.distanceKm ? "invalid" : ""}`}
                    style={{ marginLeft: "35px" }}
                    value={form.distanceKm}
                    onChange={onChange("distanceKm")}
                    onBlur={(e) => setField("distanceKm", e.target.value)}
                  >
                    <option value=""></option>
                    <option value="0">0</option>
                    <option value="1">1 km</option>
                    <option value="2">2 km</option>
                    <option value="3">3 km</option>
                    <option value="4">4 km</option>
                    <option value="5+">5+ km</option>
                  </select>
                </span>
                <div className="error">{errors.distanceKm || ""}</div>
              </div>
            </div>

            {/* Père : label seulement sur "Nom", le reste en placeholder */}
            <div className="grid3" style={{ marginTop: 10 }}>
              <div className="cell">
                <span className="label-inline">Nom du père:</span>
                <span className="control">
                  <input className={`input ${errors.pereNom ? "invalid" : ""}`}
                         style={{ width: "200px" }}
                         value={form.pereNom} onChange={onChange("pereNom")}
                         onBlur={(e) => setField("pereNom", e.target.value)} />
                </span>
                <div className="error">{errors.pereNom || ""}</div>
              </div>
              <div className="cell">
                <span className="label-inline" style={{ visibility:"hidden" }}>Profession du père</span>
                <span className="control">
                  <input className={`input ${errors.pereProfession ? "invalid" : ""}`}
                         placeholder="Profession du père"
                         style={{ width: "200px" }}
                         value={form.pereProfession} onChange={onChange("pereProfession")}
                         onBlur={(e) => setField("pereProfession", e.target.value)} />
                </span>
                <div className="error">{errors.pereProfession || ""}</div>
              </div>
              <div className="cell">
                <span className="label-inline" style={{ visibility:"hidden" }}>Téléphone du père</span>
                <span className="control">
                  <input className={`input ${errors.pereTel ? "invalid" : ""}`}
                         placeholder="Téléphone du père"
                         style={{ width: "200px" }}
                         value={form.pereTel} onChange={onChange("pereTel")}
                         onBlur={(e) => setField("pereTel", e.target.value)} />
                </span>
                <div className="error">{errors.pereTel || ""}</div>
              </div>
            </div>

            {/* Mère : label seulement sur "Nom" */}
            <div className="grid3" style={{ marginTop: 10 }}>
              <div className="cell">
                <span className="label-inline">Nom de la mère:</span>
                <span className="control">
                  <input className={`input ${errors.mereNom ? "invalid" : ""}`}
                         style={{ width: "200px" }}
                         value={form.mereNom} onChange={onChange("mereNom")}
                         onBlur={(e) => setField("mereNom", e.target.value)} />
                </span>
                <div className="error">{errors.mereNom || ""}</div>
              </div>
              <div className="cell">
                <span className="label-inline" style={{ visibility:"hidden" }}>Profession de la mère</span>
                <span className="control">
                  <input className={`input ${errors.mereProfession ? "invalid" : ""}`}
                         placeholder="Profession de la mère"
                         style={{ width: "200px" }}
                         value={form.mereProfession} onChange={onChange("mereProfession")}
                         onBlur={(e) => setField("mereProfession", e.target.value)} />
                </span>
                <div className="error">{errors.mereProfession || ""}</div>
              </div>
              <div className="cell">
                <span className="label-inline" style={{ visibility:"hidden" }}>Téléphone de la mère</span>
                <span className="control">
                  <input className={`input ${errors.mereTel ? "invalid" : ""}`}
                         placeholder="Téléphone de la mère"
                         style={{ width: "200px" }}
                         value={form.mereTel} onChange={onChange("mereTel")}
                         onBlur={(e) => setField("mereTel", e.target.value)} />
                </span>
                <div className="error">{errors.mereTel || ""}</div>
              </div>
            </div>

            {/* Tuteur : label seulement sur "Nom" */}
            <div className="grid3" style={{ marginTop: 10 }}>
              <div className="cell">
                <span className="label-inline">Nom du tuteur:</span>
                <span className="control">
                  <input className={`input ${errors.tuteurNom ? "invalid" : ""}`}
                         style={{ width: "200px" }}
                         value={form.tuteurNom} onChange={onChange("tuteurNom")}
                         onBlur={(e) => setField("tuteurNom", e.target.value)} />
                </span>
                <div className="error">{errors.tuteurNom || ""}</div>
              </div>
              <div className="cell">
                <span className="label-inline" style={{ visibility:"hidden" }}>Profession du tuteur</span>
                <span className="control">
                  <input className={`input ${errors.tuteurProfession ? "invalid" : ""}`}
                         placeholder="Profession du tuteur"
                         style={{ width: "200px" }}
                         value={form.tuteurProfession} onChange={onChange("tuteurProfession")}
                         onBlur={(e) => setField("tuteurProfession", e.target.value)} />
                </span>
                <div className="error">{errors.tuteurProfession || ""}</div>
              </div>
              <div className="cell">
                <span className="label-inline" style={{ visibility:"hidden" }}>Téléphone du tuteur</span>
                <span className="control">
                  <input className={`input ${errors.tuteurTel ? "invalid" : ""}`}
                         placeholder="Téléphone du tuteur"
                         style={{ width: "200px" }}
                         value={form.tuteurTel} onChange={onChange("tuteurTel")}
                         onBlur={(e) => setField("tuteurTel", e.target.value)} />
                </span>
                <div className="error">{errors.tuteurTel || ""}</div>
              </div>
            </div>
          </div>

          {/* Colonne droite : photo (160×180) + nom de fichier tronqué */}
          <div className="photo-col">
            <div className="photo-wrap">
              <img src={photoPreview} alt="Photo élève" />
            </div>
            <div className="uploader">
              <input
                ref={fileInputRef}
                id="photoInput"
                type="file"
                accept="image/*"
                onChange={onSelectPhoto}
                style={{ width: "160px" }}
              />
              <div className="file-name" title={fileName || "Aucun fichier"}>
                {fileName || "Aucun fichier sélectionné"}
              </div>
            </div>
          </div>
        </div>

        <div className="button-container">
          <button className="btn btn-valide" type="submit" disabled={loading}>
            <span>💾</span> {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
          <button className="btn btn-primary" type="reset" onClick={onReset}>
            <span>🔄</span> Actualiser
          </button>
          <button className="btn btn-danger" type="button" onClick={() => window.history.back()}>
            <span>❌</span> Quitter
          </button>
        </div>
      </form>
    </>
  );
}
