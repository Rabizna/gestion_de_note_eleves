// client/src/pages/contents/ProfilEleve.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { api } from "../../api";

const TEL_REGEX = /^\+261\d{9}$/;
const DEFAULT_STUDENT = "/uploads/defaut.png";

// Uniformise n'importe quel format de photo (Buffer->dataURL, base64 nu, /uploads, http, etc.)
const toPhotoSrc = (p) => {
  if (!p) return DEFAULT_STUDENT;
  const s = String(p);

  if (s.startsWith("data:image")) return s;
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("blob:")) return s;
  if (s.startsWith("/uploads/")) return s;
  if (s.startsWith("uploads/")) return `/${s}`;

  // base64 "nu" (longue chaîne)
  if (/^[A-Za-z0-9+/=\s]+$/.test(s) && s.length > 100) {
    return `data:image/jpeg;base64,${s.replace(/\s/g, "")}`;
  }
  return DEFAULT_STUDENT;
};

// même logique que le back
const norm = (x) => String(x || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const classNiveauName = (nom) => {
  const n = norm(nom);
  if (n.includes("2nde") || n.includes("2de") || /\b2e?\b/.test(n) || n.includes("2eme") || n.includes("secon")) return "seconde";
  if (n.includes("prem") || n.includes("1re") || n.includes("1ere") || /\b1e?\b/.test(n)) return "premiere";
  if (n.includes("term") || n.includes("tale") || /\btle\b/.test(n) || n.includes("terminal")) return "terminale";
  return null;
};

export default function ProfilEleve() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [userRole, setUserRole] = useState("Inconnu");
  const isProviseur = String(userRole).toUpperCase() === "PROVISEUR";

  const [niveaux, setNiveaux] = useState([]);
  const [sections, setSections] = useState([]);
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
    sectionId: "",
  });

  const [errors, setErrors] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(DEFAULT_STUDENT);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { user } = await api("/api/auth/me");
        setUserRole(user?.role || "Inconnu");
      } catch {/* ignore */}

      try {
        const { niveaux, sections } = await api("/api/inscription/refs");
        setNiveaux(niveaux || []);
        setSections(sections || []);
      } catch {
        Swal.fire("Erreur", "Impossible de charger les références.", "error");
      }

      try {
        const { eleve } = await api(`/api/students/${id}`);
        if (!eleve) throw new Error("Élève introuvable.");
        setForm({
          nom: eleve.nom || "",
          prenom: eleve.prenom || "",
          numeroActe: eleve.numeroActe || "",
          dateNaissance: eleve.dateNais ? new Date(eleve.dateNais).toISOString().slice(0,10) : "",
          lieuNaissance: eleve.lieuNais || "",
          niveauId: eleve.niveauId || "",
          domicile: eleve.domicile || "",
          telephone: eleve.telephone || "",
          sexe: eleve.sexe || "",
          nbFrere: (Number.isFinite(eleve.nbrFrere) ? String(eleve.nbrFrere) : ""),
          nbSoeur: (Number.isFinite(eleve.nbrSoeur) ? String(eleve.nbrSoeur) : ""),
          distanceKm: eleve.distance || "",
          pereNom: eleve.nomPere || "",
          pereProfession: eleve.professionPere || "",
          pereTel: eleve.telephonePere || "",
          mereNom: eleve.nomMere || "",
          mereProfession: eleve.professionMere || "",
          mereTel: eleve.telephoneMere || "",
          tuteurNom: eleve.nomTuteur || "",
          tuteurProfession: eleve.professionTuteur || "",
          tuteurTel: eleve.telephoneTuteur || "",
          sectionId: eleve.sectionId || "",
        });
        setPhotoPreview(toPhotoSrc(eleve.photo));
      } catch (e) {
        Swal.fire("Erreur", e.message || "Impossible de charger l'élève.", "error");
        navigate(-1);
      }
    })();
  }, [id]);

  // Quand niveau ou sections changent, si sectionId courant n'est pas valide, on l'efface
  useEffect(() => {
    const niv = niveaux.find(n => String(n.id) === String(form.niveauId));
    if (!niv) return;
    const isSeconde = classNiveauName(niv.nom) === "seconde";
    const allowed = isSeconde ? ["A", "B", "C"] : ["L", "S", "OSE"];
    const ok = sections.some(s => allowed.includes(String(s.code || s.nom).toUpperCase()) && String(s.id) === String(form.sectionId));
    if (!ok && form.sectionId) {
      setForm(f => ({ ...f, sectionId: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.niveauId, sections]);

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
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isProviseur) {
      return Swal.fire("Accès refusé", "Seul le PROVISEUR peut modifier le profil.", "error");
    }
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
      // on n'envoie PAS niveauId (niveau non modifiable côté serveur)
      const {
        niveauId, // eslint-disable-line no-unused-vars
        ...rest
      } = form;
      Object.entries(rest).forEach(([k, v]) => fd.append(k, String(v ?? "")));
      if (photoFile) fd.append("photo", photoFile);

      await api(`/api/students/${id}`, { method: "PUT", body: fd });
      await Swal.fire("Succès", "Modifications enregistrées✅.", "success");
    } catch (err) {
      Swal.fire("Erreur", err?.message || "Échec de la modification.", "error");
    } finally {
      setLoading(false);
    }
  };

  const lock = !isProviseur ? { disabled: true } : {};

  // options de section selon niveau courant
  const currNiv = niveaux.find(n => String(n.id) === String(form.niveauId));
  const isSeconde = classNiveauName(currNiv?.nom) === "seconde";
  const allowedCodes = isSeconde ? ["A","B","C"] : ["L","S","OSE"];
  const sectionOptions = sections.filter(
    s => allowedCodes.includes(String(s.code || s.nom).toUpperCase())
  );

  return (
    <>
      <style>{`
        :root{
          --label-w: 140px;
          --line:#e5e7eb; --ring:#93c5fd; --ink:#0f172a;
        }

        /* ===== Page gradient & layout (scopé) ===== */
        .profil-page{
          min-height:100vh;
          padding:28px 18px;
          background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #f97316 100%);
          display:flex; flex-direction:column; gap:14px; align-items:center;
        }

        /* ===== Title chip (glass) ===== */
        .form-title{
          width:100%;
          max-width:1200px;
          text-align:center;
          font-size: clamp(20px, 2.2vw, 30px);
          font-weight:900;
          color:#ffffff;
          letter-spacing:.3px;
          text-shadow:0 2px 10px rgba(0,0,0,.25);
          margin:2px 0 8px;
        }

        /* ===== Glass card for form ===== */
        .class-form{
          width:100%;
          max-width:1200px;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.7);
          border-radius: 18px;
          box-shadow: 0 12px 30px rgba(2,6,23,.16);
          padding: 16px 18px;
          color: var(--ink);
        }

        .top-grid{ display:grid; grid-template-columns: 1fr 220px; column-gap:18px; align-items:start; }
        .left-col{ min-width:0; }

        .row{ display:flex; align-items:center; gap:10px; margin-top:10px; }
        .row .label-inline{ width:var(--label-w); font-weight:800; color:#083940; }
        .row .control{ flex:1; min-width:0; }

        .grid3{ display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:12px; align-items:start; }
        .cell{ display:block; }
        .cell .label-inline{ display:inline-block; width:var(--label-w); font-weight:800; color:#083940; vertical-align:middle; }
        .cell .control{ display:inline-block; width:calc(100% - var(--label-w)); vertical-align:middle; }

        /* Inputs / selects modernisés */
        .input, .select{
          padding:10px 12px;
          border:1px solid var(--line);
          border-radius:12px;
          font-size:14px;
          background:#ffffff;
          transition:border-color .15s, box-shadow .15s, transform .06s ease;
          outline:none;
        }
        .input:focus, .select:focus{
          border-color:var(--ring);
          box-shadow:0 0 0 4px rgba(147,197,253,.35);
        }
        .invalid{ border-color:#dc2626 !important; box-shadow:0 0 0 4px rgba(220,38,38,.16); }
        .error{ color:#dc2626; font-size:12px; margin-top:4px; margin-left:var(--label-w); min-height:16px; }

        /* Photo panel */
        .photo-col{ width:220px; }
        .photo-wrap{
          width:180px; height:200px;
          border-radius:14px; overflow:hidden;
          background:#f8fafc;
          border:1px solid rgba(226,232,240,.9);
          box-shadow:0 10px 24px rgba(2,6,23,.12);
          display:flex; align-items:center; justify-content:center;
          transition: transform .12s ease, box-shadow .2s ease;
        }
        .photo-wrap:hover{ transform: translateY(-2px); box-shadow:0 14px 30px rgba(2,6,23,.18); }
        .photo-wrap img{ width:100%; height:100%; object-fit:cover; }
        .uploader{ width:180px; margin-top:10px; }
        .file-name{
          width:180px; font-size:12px; color:#334155; margin-top:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }

        /* Buttons */
        .button-container{ display:flex; gap:12px; justify-content:center; margin-top:16px; flex-wrap:wrap; }
        .btn{
          padding:10px 16px; font-weight:900; border:0; border-radius:12px; cursor:pointer;
          display:inline-flex; align-items:center; gap:8px; color:#fff;
          box-shadow:0 10px 24px rgba(2,6,23,.16);
          transition: transform .08s ease, filter .12s ease, box-shadow .2s ease, opacity .15s ease;
        }
        .btn:hover{ transform: translateY(-1px); filter: brightness(1.03); box-shadow:0 14px 28px rgba(2,6,23,.24); }
        .btn:active{ transform: translateY(0); }

        .btn-valide{ background: linear-gradient(135deg,#22c55e,#16a34a); }
        .btn-primary{ background: linear-gradient(135deg,#0ea5e9,#6366f1); }
        .btn-danger{ background: linear-gradient(135deg,#ef4444,#b91c1c); }
        .btn:disabled{ opacity:.7; cursor:not-allowed; box-shadow:none; }

        /* Small helpers on hoverable labels (emojis via content) */
        .row .label-inline::before,
        .cell .label-inline::before{
          content:"";
          display:inline-block;
          width:0.9em;
          margin-right:6px;
        }
        /* Exemple: on embellit seulement quelques champs courants */
        .row .label-inline:nth-child(1)[data-icon="nom"]::before{ content:"🪪"; }
        .row .label-inline[data-icon="prenom"]::before{ content:"👤"; }
        .row .label-inline[data-icon="numeroActe"]::before{ content:"📄"; }
        .cell .label-inline[data-icon="date"]::before{ content:"📅"; }
        .cell .label-inline[data-icon="lieu"]::before{ content:"📍"; }
        .cell .label-inline[data-icon="niveau"]::before{ content:"🎓"; }
        .label-inline[data-icon="section"]::before{ content:"🏷️"; }
        .label-inline[data-icon="tel"]::before{ content:"📞"; }
      `}</style>

      <div className="profil-page">
        <div className="form-title">🧑‍🎓 Profil élève — #{id}</div>

        <form className="class-form" onSubmit={onSubmit} noValidate>
          <div className="top-grid">
            {/* Colonne gauche */}
            <div className="left-col">
              {/* Nom */}
              <div className="row">
                <label className="label-inline" data-icon="nom">Nom:</label>
                <div className="control">
                  <input {...lock}
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
                <label className="label-inline" data-icon="prenom">Prénom:</label>
                <div className="control">
                  <input {...lock} className="input" value={form.prenom} onChange={onChange("prenom")} onBlur={(e)=>setField("prenom", e.target.value)} />
                </div>
              </div>
              {/* Numéro acte */}
              <div className="row">
                <label className="label-inline" data-icon="numeroActe">Numéro acte:</label>
                <div className="control">
                  <input {...lock}
                    className={`input ${errors.numeroActe ? "invalid" : ""}`}
                    value={form.numeroActe}
                    onChange={onChange("numeroActe")}
                    onBlur={(e) => setField("numeroActe", e.target.value)}
                  />
                  <div className="error">{errors.numeroActe || ""}</div>
                </div>
              </div>

              {/* Date | Lieu | Niveau (niveau jamais modifiable) */}
              <div className="grid3" style={{ marginTop: 10 }}>
                <div className="cell">
                  <span className="label-inline" data-icon="date">Date de Naissance:</span>
                  <span className="control">
                    <input {...lock}
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
                  <span className="label-inline" data-icon="lieu" style={{ visibility: "hidden" }}>Lieu de naissance:</span>
                  <span className="control">
                    <input {...lock}
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
                  <span className="" data-icon="niveau" style={{ marginLeft: "60px" }}>Niveau:</span>
                  <span className="control">
                    <select
                      className={`select ${errors.niveauId ? "invalid" : ""}`}
                      value={form.niveauId}
                      onChange={onChange("niveauId")}
                      onBlur={(e) => setField("niveauId", e.target.value)}
                      disabled
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

              {/* Section — modifiable seulement par PROVISEUR */}
              <div className="row" style={{ marginTop: 10 }}>
                <label className="label-inline" data-icon="section">Section:</label>
                <div className="control" style={{ maxWidth: 400 }}>
                  <select
                    className="select"
                    value={form.sectionId}
                    onChange={onChange("sectionId")}
                    onBlur={(e)=>setField("sectionId", e.target.value)}
                    disabled={!isProviseur}
                  >
                    <option value=""></option>
                    {sectionOptions.map((s) => (
                      <option key={s.id} value={s.id}>{s.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Domicile | Téléphone | Sexe */}
              <div className="grid3" style={{ marginTop: 10 }}>
                <div className="cell">
                  <span className="label-inline">Domicile:</span>
                  <span className="control">
                    <input {...lock}
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
                    <input {...lock}
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
                  <span className="" style={{ marginLeft: "60px" }}>Sexe:</span>
                  <span className="control">
                    <select {...lock}
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

              {/* Frères/Sœurs/Distance */}
              <div className="grid3" style={{ marginTop: 10 }}>
                <div className="cell">
                  <span className="label-inline">Nombre frères/sœurs:</span>
                  <span className="control">
                    <select {...lock}
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
                  <span className="control">
                    <select {...lock}
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
                    <select {...lock}
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
                    <input {...lock} className={`input ${errors.pereNom ? "invalid" : ""}`}
                           style={{ width: "200px" }}
                           value={form.pereNom} onChange={onChange("pereNom")}
                           onBlur={(e) => setField("pereNom", e.target.value)} />
                  </span>
                  <div className="error">{errors.pereNom || ""}</div>
                </div>
                <div className="cell">
                  <span className="label-inline" style={{ visibility:"hidden" }}>Profession du père</span>
                  <span className="control">
                    <input {...lock} className={`input ${errors.pereProfession ? "invalid" : ""}`}
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
                    <input {...lock} className={`input ${errors.pereTel ? "invalid" : ""}`}
                           placeholder="Téléphone du père"
                           style={{ width: "200px" }}
                           value={form.pereTel} onChange={onChange("pereTel")}
                           onBlur={(e) => setField("pereTel", e.target.value)} />
                  </span>
                  <div className="error">{errors.pereTel || ""}</div>
                </div>
              </div>

              {/* Mère */}
              <div className="grid3" style={{ marginTop: 10 }}>
                <div className="cell">
                  <span className="label-inline">Nom de la mère:</span>
                  <span className="control">
                    <input {...lock} className={`input ${errors.mereNom ? "invalid" : ""}`}
                           style={{ width: "200px" }}
                           value={form.mereNom} onChange={onChange("mereNom")}
                           onBlur={(e) => setField("mereNom", e.target.value)} />
                  </span>
                  <div className="error">{errors.mereNom || ""}</div>
                </div>
                <div className="cell">
                  <span className="label-inline" style={{ visibility:"hidden" }}>Profession de la mère</span>
                  <span className="control">
                    <input {...lock} className={`input ${errors.mereProfession ? "invalid" : ""}`}
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
                    <input {...lock} className={`input ${errors.mereTel ? "invalid" : ""}`}
                           placeholder="Téléphone de la mère"
                           style={{ width: "200px" }}
                           value={form.mereTel} onChange={onChange("mereTel")}
                           onBlur={(e) => setField("mereTel", e.target.value)} />
                  </span>
                  <div className="error">{errors.mereTel || ""}</div>
                </div>
              </div>

              {/* Tuteur */}
              <div className="grid3" style={{ marginTop: 10 }}>
                <div className="cell">
                  <span className="label-inline">Nom du tuteur:</span>
                  <span className="control">
                    <input {...lock} className={`input ${errors.tuteurNom ? "invalid" : ""}`}
                           style={{ width: "200px" }}
                           value={form.tuteurNom} onChange={onChange("tuteurNom")}
                           onBlur={(e) => setField("tuteurNom", e.target.value)} />
                  </span>
                  <div className="error">{errors.tuteurNom || ""}</div>
                </div>
                <div className="cell">
                  <span className="label-inline" style={{ visibility:"hidden" }}>Profession du tuteur</span>
                  <span className="control">
                    <input {...lock} className={`input ${errors.tuteurProfession ? "invalid" : ""}`}
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
                    <input {...lock} className={`input ${errors.tuteurTel ? "invalid" : ""}`}
                           placeholder="Téléphone du tuteur"
                           style={{ width: "200px" }}
                           value={form.tuteurTel} onChange={onChange("tuteurTel")}
                           onBlur={(e) => setField("tuteurTel", e.target.value)} />
                  </span>
                  <div className="error">{errors.tuteurTel || ""}</div>
                </div>
              </div>
            </div>

            {/* Colonne droite : photo */}
            <div className="photo-col">
              <div className="photo-wrap" title="📷 Photo élève">
                <img src={photoPreview} alt="Photo élève" />
              </div>
              <div className="uploader">
                <input
                  ref={fileInputRef}
                  id="photoInput"
                  type="file"
                  accept="image/*"
                  onChange={onSelectPhoto}
                  style={{ width: "180px" }}
                  disabled={!isProviseur}
                />
                <div className="file-name" title={fileName || "Aucun fichier"}>
                  {fileName || "Aucun fichier sélectionné"}
                </div>
              </div>
            </div>
          </div>

          <div className="button-container">
            <button
              className="btn btn-valide"
              type="submit"
              disabled={loading || !isProviseur}
              title={isProviseur ? "" : "Seul le PROVISEUR peut modifier."}
            >
              <span>✏️</span> {loading ? "Modification..." : "Modifier"}
            </button>
            <button className="btn btn-primary" type="button" onClick={()=>navigate(-1)}>
              <span>↩️</span> Retour
            </button>
            <button className="btn btn-danger" type="button" onClick={() => navigate("/dashboard")}>
              <span>❌</span> Quitter
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
