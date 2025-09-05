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
        /* ===== Palette (on respecte tes couleurs et on ajoute des gradients) ===== */
        :root{
          --brand: rgb(8,57,64);         /* vert foncé */
          --accent: rgb(243,117,33);     /* orange */
          --paper: #ffffff;
          --paper-2: #f8fbff;
          --line: #e5e7eb;
          --danger: #dc2626;
          --primary: #2563eb;
          --ok: #16a34a;
        }

        /* ===== Titre avec touche moderne ===== */
        .form-title{
          font-size:1.4em; font-weight:800; color:var(--brand);
          margin-bottom:14px; padding-bottom:12px; position:relative;
          background: linear-gradient(90deg, rgba(8,57,64,.08), rgba(243,117,33,.08));
          -webkit-background-clip: text; background-clip: text;
        }
        .form-title::after{
          content:""; position:absolute; left:0; bottom:0; height:3px; width:140px;
          background: linear-gradient(90deg, var(--accent), rgba(243,117,33,.4));
          border-radius:999px;
        }

        /* ===== Carte formulaire avec bg gradient ===== */
        .class-form{
          background:
            linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%),
            radial-gradient(120% 120% at 100% 0%, rgba(243,117,33,.08) 0%, rgba(243,117,33,0) 60%);
          background-blend-mode: normal, overlay;
          border:1px solid var(--line);
          border-radius:16px;
          padding:16px;
          box-shadow: 0 12px 36px rgba(2,6,23,.08);
        }

        /* 2 colonnes: gauche (champs) / droite (photo) */
        .top-grid{
          display:grid;
          grid-template-columns: 1fr 200px;
          column-gap:16px; align-items:start;
        }
        .left-col{ min-width:0; }

        /* ligne simple (label à gauche, input à droite) */
        .row{ display:flex; align-items:center; gap:10px; margin-top:10px; }
        .row .label-inline{ width:140px; font-weight:700; color:#0f172a; }
        .row .control{ flex:1; min-width:0; }

        /* grilles 3 colonnes alignées */
        .grid3{ display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:12px; align-items:start; }
        .cell{ display:block; }
        .cell .label-inline{ display:inline-block; width:140px; font-weight:700; color:#0f172a; vertical-align:middle; }
        .cell .control{ display:inline-block; width:calc(100% - 140px); vertical-align:middle; }

        /* ===== Champs ===== */
        .input, .select {
          width:400px; max-width:100%;
          padding:10px 12px; border:1px solid #dbe2ea; border-radius:10px; font-size:14px;
          background: linear-gradient(180deg, #fff, #f9fbfd);
          transition:border-color .15s, box-shadow .15s, transform .04s ease;
          outline:none;
        }
        .select{ width:100%; }
        .input:focus, .select:focus{
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(243,117,33,.25);
        }
        .input:hover, .select:hover{ transform: translateY(-0.5px); }
        .invalid{ border-color:var(--danger) !important; box-shadow:0 0 0 3px rgba(220,38,38,.18); }
        .error{ color:var(--danger); font-size:12px; margin-top:4px; margin-left:140px; min-height:16px; }

        /* ===== Photo ===== */
        .photo-col{ width:200px; }
        .photo-wrap{
          width:160px; height:180px; border:1px solid var(--line); border-radius:12px; overflow:hidden;
          background:
            linear-gradient(180deg,#f8fafc,#eef4ff),
            radial-gradient(120% 80% at 0% 0%, rgba(8,57,64,.08) 0%, rgba(8,57,64,0) 60%);
          display:flex; align-items:center; justify-content:center;
          box-shadow: 0 10px 26px rgba(2,6,23,.08);
        }
        .photo-wrap img{ width:100%; height:100%; object-fit:cover; }
        .uploader{ width:160px; margin-top:8px; }
        .file-name{
          width:160px; font-size:12px; color:#475569; margin-top:6px;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }

        /* ===== Boutons (gradients + hover sans déformer la mise en page) ===== */
        .button-container{ display:flex; gap:12px; justify-content:center; margin-top:14px; }
        .btn{
          padding:10px 16px; font-weight:800; border:0; border-radius:12px; cursor:pointer;
          display:inline-flex; align-items:center; gap:8px; color:#fff;
          box-shadow:0 10px 24px rgba(2,6,23,.10);
          transition: transform .06s ease, filter .15s ease, box-shadow .18s ease;
          will-change: transform;
        }
        .btn:active{ transform: translateY(1px); }

        .btn-valide{
          background: linear-gradient(135deg, #22c55e, #16a34a); /* vert OK */
        }
        .btn-primary{
          background: linear-gradient(135deg, var(--primary), #1d4ed8); /* bleu */
        }
        .btn-danger{
          background: linear-gradient(135deg, #ef4444, #dc2626); /* rouge */
        }

        .btn:hover{
          filter: brightness(1.04);
          transform: translateY(-1px);
          box-shadow:0 14px 28px rgba(2,6,23,.16);
        }
        .btn:disabled{ opacity:.7; cursor:not-allowed; transform:none; box-shadow:0 10px 24px rgba(2,6,23,.10); }

        /* Petites corrections responsives */
        @media (max-width:980px){
          .top-grid{ grid-template-columns: 1fr; }
          .photo-col{ width:100%; }
        }
        @media (max-width:640px){
          .grid3{ grid-template-columns:1fr; }
        }
      `}</style>

      <div className="form-title">🧑‍🎓 Ajouter une nouvelle élève</div>

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

            {/* Père */}
<div className="grid3" style={{ marginTop: 10 }}>
  <div className="cell">
    <span className="label-inline">Nom du père:</span>
    <span className="control">
      <input
        className={`input ${errors.pereNom ? "invalid" : ""}`}
        style={{ width: "200px", maxWidth: "none" }}
        value={form.pereNom}
        onChange={onChange("pereNom")}
        onBlur={(e) => setField("pereNom", e.target.value)}
      />
    </span>
    <div className="error">{errors.pereNom || ""}</div>
  </div>

  <div className="cell">
    <span className="label-inline" style={{ visibility: "hidden" }}>
      Profession du père
    </span>
    <span className="control">
      <input
        className={`input ${errors.pereProfession ? "invalid" : ""}`}
        placeholder="Profession du père"
        style={{ width: "200px", maxWidth: "none" }}
        value={form.pereProfession}
        onChange={onChange("pereProfession")}
        onBlur={(e) => setField("pereProfession", e.target.value)}
      />
    </span>
    <div className="error">{errors.pereProfession || ""}</div>
  </div>

  <div className="cell">
    <span className="label-inline" style={{ visibility: "hidden" }}>
      Téléphone du père
    </span>
    <span className="control">
      <input
        className={`input ${errors.pereTel ? "invalid" : ""}`}
        placeholder="Téléphone du père"
        style={{ width: "200px", maxWidth: "none" }}
        value={form.pereTel}
        onChange={onChange("pereTel")}
        onBlur={(e) => setField("pereTel", e.target.value)}
      />
    </span>
    <div className="error">{errors.pereTel || ""}</div>
  </div>
</div>

{/* Mère */}
<div className="grid3" style={{ marginTop: 10 }}>
  <div className="cell">
    <span className="label-inline">Nom de la mère:</span>
    <span className="control">
      <input
        className={`input ${errors.mereNom ? "invalid" : ""}`}
        style={{ width: "200px", maxWidth: "none" }}
        value={form.mereNom}
        onChange={onChange("mereNom")}
        onBlur={(e) => setField("mereNom", e.target.value)}
      />
    </span>
    <div className="error">{errors.mereNom || ""}</div>
  </div>

  <div className="cell">
    <span className="label-inline" style={{ visibility: "hidden" }}>
      Profession de la mère
    </span>
    <span className="control">
      <input
        className={`input ${errors.mereProfession ? "invalid" : ""}`}
        placeholder="Profession de la mère"
        style={{ width: "200px", maxWidth: "none" }}
        value={form.mereProfession}
        onChange={onChange("mereProfession")}
        onBlur={(e) => setField("mereProfession", e.target.value)}
      />
    </span>
    <div className="error">{errors.mereProfession || ""}</div>
  </div>

  <div className="cell">
    <span className="label-inline" style={{ visibility: "hidden" }}>
      Téléphone de la mère
    </span>
    <span className="control">
      <input
        className={`input ${errors.mereTel ? "invalid" : ""}`}
        placeholder="Téléphone de la mère"
        style={{ width: "200px", maxWidth: "none" }}
        value={form.mereTel}
        onChange={onChange("mereTel")}
        onBlur={(e) => setField("mereTel", e.target.value)}
      />
    </span>
    <div className="error">{errors.mereTel || ""}</div>
  </div>
</div>

{/* Tuteur */}
<div className="grid3" style={{ marginTop: 10 }}>
  <div className="cell">
    <span className="label-inline">Nom du tuteur:</span>
    <span className="control">
      <input
        className={`input ${errors.tuteurNom ? "invalid" : ""}`}
        style={{ width: "200px", maxWidth: "none" }}
        value={form.tuteurNom}
        onChange={onChange("tuteurNom")}
        onBlur={(e) => setField("tuteurNom", e.target.value)}
      />
    </span>
    <div className="error">{errors.tuteurNom || ""}</div>
  </div>

  <div className="cell">
    <span className="label-inline" style={{ visibility: "hidden" }}>
      Profession du tuteur
    </span>
    <span className="control">
      <input
        className={`input ${errors.tuteurProfession ? "invalid" : ""}`}
        placeholder="Profession du tuteur"
        style={{ width: "200px", maxWidth: "none" }}
        value={form.tuteurProfession}
        onChange={onChange("tuteurProfession")}
        onBlur={(e) => setField("tuteurProfession", e.target.value)}
      />
    </span>
    <div className="error">{errors.tuteurProfession || ""}</div>
  </div>

  <div className="cell">
    <span className="label-inline" style={{ visibility: "hidden" }}>
      Téléphone du tuteur
    </span>
    <span className="control">
      <input
        className={`input ${errors.tuteurTel ? "invalid" : ""}`}
        placeholder="Téléphone du tuteur"
        style={{ width: "200px", maxWidth: "none" }}  /* ⬅️ 200px fixe */
        value={form.tuteurTel}
        onChange={onChange("tuteurTel")}
        onBlur={(e) => setField("tuteurTel", e.target.value)}
      />
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
