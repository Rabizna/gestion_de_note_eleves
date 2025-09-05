import { useEffect, useState, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { api, BASE_URL } from "../api";

const DEFAULT_AVATAR_PATH = "/uploads/defaut.png";
const EMAIL_RE = /^\S+@\S+\.\S+$/;

// Convertit un chemin renvoyé par l'API en URL affichable
function makeSrc(p) {
  if (!p) return "";
  if (/^(https?:|data:)/i.test(p)) return p;      // URL absolue ou data:
  if (p.startsWith("/")) return `${BASE_URL}${p}`; // /uploads/xxx -> http://localhost:4000/uploads/xxx
  return p;
}

export default function Accueil() {
  const nav = useNavigate();
  const location = useLocation();

  // Données utilisateur
  const [userName, setUserName] = useState("");
  theEmail: {}
  const [userEmail, setUserEmail] = useState(null);
  const [userRole, setUserRole] = useState("Inconnu");
  const [profileImage, setProfileImage] = useState(DEFAULT_AVATAR_PATH);

  // UI
  const [menuOpen, setMenuOpen] = useState(false);
  const [userPanelOpen, setUserPanelOpen] = useState(false);

  // Édition du profil
  const [editEnabled, setEditEnabled] = useState(false);
  const [edit, setEdit] = useState({ fullName: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(DEFAULT_AVATAR_PATH);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);

  // rôle
  const isProviseur = String(userRole).toUpperCase() === "PROVISEUR";

  // Chargement /me + bienvenue
  useEffect(() => {
    let mounted = true;
    document.title = "Accueil";

    api("/api/auth/me")
      .then(({ user }) => {
        if (!mounted) return;
        const fullName = user.fullName || "";
        const email = user.email || null;
        const role = user.role || "Inconnu";
        const imgPath = user.profileImage || DEFAULT_AVATAR_PATH;

        setUserName(fullName);
        setUserEmail(email);
        setUserRole(role);
        setProfileImage(imgPath);

        setEdit({ fullName, email: email || "" });
        setPhotoPreview(imgPath);

        const shouldWelcome =
          location.state?.welcome === true &&
          !sessionStorage.getItem("WELCOME_SHOWN");

        if (shouldWelcome) {
          Swal.fire({
            icon: "success",
            title: "Connexion réussie!",
            text: `Bienvenue ${fullName}`,
            confirmButtonColor: "#3085d6",
          });
          sessionStorage.setItem("WELCOME_SHOWN", "1");
          nav(location.pathname, { replace: true, state: {} });
        }
      })
      .catch(() => {
        nav("/login");
      });

    const onResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setUserPanelOpen(false);
        setEditEnabled(false);
      }
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);

    return () => {
      mounted = false;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, [location.pathname, location.state, nav]);

  // Déconnexion
  const handleLogout = async () => {
    const res = await Swal.fire({
      title: "Êtes-vous sûr ?",
      text: "Vous allez être déconnecté.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, déconnectez-moi",
      cancelButtonText: "Annuler",
      allowOutsideClick: false,
      backdrop: "rgba(0,0,0,0.7)",
      customClass: { container: "swal2-container", popup: "swal2-popup" },
    });
    if (res.isConfirmed) {
      try {
        await api("/api/auth/logout", { method: "POST" });
      } finally {
        sessionStorage.removeItem("WELCOME_SHOWN");
        nav("/login");
      }
    }
  };

  const toggleUserPanel = () => setUserPanelOpen((v) => !v);

  // Choix photo en édition
  const onPickPhoto = (e) => {
    const f = e.target.files?.[0];
    setPhotoFile(f || null);
    setFileName(f?.name || "");
    if (f) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(String(ev.target?.result || ""));
      reader.readAsDataURL(f);
    } else {
      setPhotoPreview(profileImage || DEFAULT_AVATAR_PATH);
    }
  };

  const cancelEdit = () => {
    setEditEnabled(false);
    setEdit({ fullName: userName || "", email: userEmail || "" });
    setPhotoFile(null);
    setFileName("");
    setPhotoPreview(profileImage || DEFAULT_AVATAR_PATH);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Sauvegarde profil (multipart si fichier)
  const saveProfile = async () => {
    const fullName = (edit.fullName || "").trim();
    const email = (edit.email || "").trim();
    if (!fullName) {
      return Swal.fire("Champs requis", "Le nom complet est obligatoire.", "warning");
    }
    if (!EMAIL_RE.test(email)) {
      return Swal.fire("Email invalide", "Merci de saisir un email valide.", "warning");
    }

    try {
      setSaving(true);
      let payload;
      let headers = undefined;

      if (photoFile) {
        const fd = new FormData();
        fd.append("fullName", fullName);
        fd.append("email", email);
        fd.append("profile", photoFile);
        payload = fd;
      } else {
        headers = { "Content-Type": "application/json" };
        payload = JSON.stringify({ fullName, email });
      }

      const { user } = await api("/api/auth/profile", {
        method: "PUT",
        body: payload,
        headers,
      });

      const newName = user?.fullName || fullName;
      const newEmail = user?.email || email;
      const newImgPath = user?.profileImage || profileImage;

      setUserName(newName);
      setUserEmail(newEmail);
      setProfileImage(newImgPath);

      setEdit({ fullName: newName, email: newEmail });
      setPhotoFile(null);
      setFileName("");
      setPhotoPreview(newImgPath || DEFAULT_AVATAR_PATH);
      if (fileInputRef.current) fileInputRef.current.value = "";

      setEditEnabled(false);
      Swal.fire("Succès", "Profil mis à jour.", "success");
    } catch (err) {
      Swal.fire("Erreur", err?.message || "Impossible de mettre à jour le profil.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Évite un flash avant /me
  if (userEmail === null && !userName) return null;

  return (
    <>
      {/* ---------- CSS ---------- */}
      <style>{`
        :root{
          /* === Palette modernisée (header + sidebar) === */
          --brand:#0b1020;         /* Navy profond */
          --brand-800:#1e3a8a;     /* Bleu 800 */
          --brand-900:#6d28d9;     /* Violet 700 */

          /* Actif/hover du menu (bleu → violet) */
          --menu-active1:#60a5fa;  /* Bleu clair */
          --menu-active2:#a78bfa;  /* Violet clair */

          /* Tu peux garder ton accent orange pour le badge "IKALAMAVONY" */
          --accent:#f37521;
          --accent-light:#ff8a3d;

          --paper:#ffffff;
          --paper-2:#fbfdff;
          --paper-3:#eef2f7;
          --line:#e5e7eb;
        }

        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }

        body {
          background:
            radial-gradient(120% 160% at 0% 0%, rgba(8,57,64,.08) 0%, rgba(8,57,64,0) 60%),
            linear-gradient(135deg, #ffffff 0%, #fdf7f2 60%, #ffffff 100%);
          background-attachment: fixed;
          font-family: Arial, sans-serif;
          overflow: hidden;
        }

        /* ===== HEADER — bleu → violet (seules règles modifiées) ===== */
        .header {
          height: 70px;
          background: linear-gradient(135deg,
                      #0b1020 0%,
                      #1e3a8a 48%,
                      #6d28d9 100%);
          position: relative;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 14px; color:#fff; box-shadow:0 10px 24px rgba(2,6,23,.18);
        }
        .header::after{
          content:""; position:absolute; inset:0; pointer-events:none;
          background:
            radial-gradient(120% 180% at 100% 0%,
              rgba(96,165,250,.18) 0%,   /* bleu */
              rgba(167,139,250,.16) 35%, /* violet */
              rgba(99,102,241,0) 70%);
        }

        .title-box {
          display:flex; align-items:center; gap:10px;
          background:#111827; color:#fff; border-radius:12px; padding:8px 10px;
        }
        .text-left { font-weight:800; letter-spacing:.2px; }
        .box {
          background: linear-gradient(135deg, var(--accent), var(--accent-light));
          color:#111827; font-weight:900; border-radius:10px; padding:6px 12px;
          box-shadow:0 8px 18px rgba(243,117,33,.35);
        }

        .burger{ display:none; background:transparent; border:0; width:40px; height:40px; cursor:pointer; }
        .burger-lines, .burger-lines::before, .burger-lines::after{
          content:""; display:block; height:2px; background:#fff; border-radius:2px; transition: transform .2s;
        }
        .burger-lines{ width:22px; }
        .burger-lines::before{ width:18px; margin-top:6px; }
        .burger-lines::after{ width:22px; margin-top:6px; }

        .user-info { display:flex; align-items:center; gap:10px; cursor:pointer; }
        .user-info img{ width:42px; height:42px; border-radius:999px; border:2px solid #fff; object-fit:cover; }
        .user-info span{ font-weight:700; }

        /* ===== Layout principal ===== */
        .container{ display:flex; width:100vw; height:calc(100vh - 70px); }

        /* ===== SIDEBAR — navy sombre + tint bleu/violet (seules règles modifiées) ===== */
        .menu{
          width:260px; min-width:260px; padding:16px 12px;
          background:
            linear-gradient(180deg,
              #0b1020 0%,
              #0f172a 55%,
              #111827 100%),
            radial-gradient(100% 80% at 100% 0%,
              rgba(96,165,250,.14) 0%,
              rgba(167,139,250,.12) 40%,
              rgba(99,102,241,0) 75%);
          background-blend-mode: normal, overlay;
          box-shadow: 2px 0 18px rgba(2,6,23,.15);
          display:flex; flex-direction:column; justify-content:space-between; overflow-y:auto;
        }
        .menu-items{ display:flex; flex-direction:column; gap:10px; text-transform:uppercase; }
        .menu-link{
          display:block; padding:12px; border-radius:10px; text-decoration:none;
          color:#fff; font-weight:800; letter-spacing:.2px;
          transition: transform .06s, box-shadow .18s, background .2s, color .2s;
        }
        .menu-link:hover{
          transform: translateY(-1px);
          background: rgba(255,255,255,.10);
          box-shadow:0 10px 20px rgba(96,165,250,.25);
        }
        .menu-link.active{
          color:#0f172a;
          background: linear-gradient(135deg, var(--menu-active1) 0%, var(--menu-active2) 100%);
          box-shadow:0 10px 24px rgba(96,165,250,.35);
        }

        .logout-container{ margin-top:18px; text-align:center; }
        .logout-btn{
          width:85%; padding:10px 14px; border:0; border-radius:10px; cursor:pointer; color:#fff; font-weight:900;
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          box-shadow:0 10px 22px rgba(239,68,68,.28);
          transition: transform .06s ease, filter .15s ease;
        }
        .logout-btn:hover{ transform: translateY(-1px); filter:brightness(1.03); }

        /* ===== Zone contenu ===== */
        .content{
          flex:1; min-width:0; padding:12px; overflow-y:auto;
          background:
            linear-gradient(180deg, rgba(255,255,255,.98) 0%, rgba(255,255,255,.96) 100%),
            radial-gradient(150% 120% at 100% 0%, rgba(243,117,33,.06) 0%, rgba(243,117,33,0) 60%);
          background-blend-mode: normal, multiply;
        }

        /* ===== Panneau profil (inchangé sur la logique) ===== */
        .user-panel-overlay { display:none; position:fixed; inset:0; z-index:98; }
        .user-panel-overlay.show { display:block; }

        .user-panel{
          position:fixed; top:76px; right:12px; z-index:99; width:340px; max-width:calc(100vw - 24px);
          background:
            linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 60%, var(--paper-3) 100%),
            radial-gradient(110% 100% at 100% 0%, rgba(243,117,33,.12) 0%, rgba(243,117,33,0) 60%);
          border:1px solid #e5e7eb; border-radius:12px; padding:14px;
          box-shadow:0 18px 48px rgba(2,6,23,.25);
          transform:translateY(-6px); opacity:0; pointer-events:none;
          transition: transform .15s, opacity .15s; background-blend-mode: normal, overlay;
          display:flex; flex-direction:column;
        }
        .user-panel.open{ transform:translateY(0); opacity:1; pointer-events:auto; }

        .up-header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
        .up-title{ font-weight:700; }

        .toggle{ display:inline-flex; align-items:center; gap:8px; }
        .switch{ position:relative; width:44px; height:24px; display:inline-block; }
        .switch input{ opacity:0; width:0; height:0; }
        .slider{ position:absolute; inset:0; background:#cbd5e1; border-radius:999px; transition:.2s; }
        .slider::before{ content:""; position:absolute; width:18px; height:18px; left:3px; top:3px; background:#fff; border-radius:999px; transition:.2s; }
        input:checked + .slider{ background:#2563eb; }
        input:checked + .slider::before{ transform: translateX(20px); }

        .up-head{ display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center; }
        .up-avatar{ width:84px; height:84px; border-radius:50%; border:2px solid #e5e7eb; object-fit:cover; }
        .up-name{ font-weight:700; margin:0; }
        .up-role{ display:inline-block; padding:2px 8px; border-radius:999px; background:#eef2ff; color:#3730a3; font-weight:600; font-size:12px; margin-top:4px; }
        .up-email{ color:#334155; font-size:14px; word-break:break-all; }

        .up-edit{ margin-top:12px; display:flex; flex-direction:column; gap:10px; }
        .fld{ display:flex; flex-direction:column; gap:6px; width:100%; }
        .lbl{ font-weight:600; font-size:13px; text-align:left; }
        .in, .fi{ width:100%; padding:10px 12px; border:1px solid #e2e8f0; border-radius:10px; font-size:14px; }
        .in:focus, .fi:focus{ outline:none; border-color:#93c5fd; box-shadow:0 0 0 3px rgba(147,197,253,.3); }

        .photo-box{ display:flex; gap:10px; align-items:center; width:100%; }
        .photo-wrap{ width:72px; height:72px; border:1px solid #e5e7eb; border-radius:50%; overflow:hidden; background:#f8fafc; display:flex; align-items:center; justify-content:center; }
        .photo-wrap img{ width:100%; height:100%; object-fit:cover; }
        .file-col{ display:flex; flex-direction:column; gap:6px; min-width:0; }
        .file-name{ max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#475569; font-size:12px; text-align:left; }

        .user-panel .up-btn{
          padding:10px 14px; border:0; border-radius:10px; font-weight:700; cursor:pointer;
          display:inline-flex; align-items:center; gap:6px;
          transition: transform .08s, filter .15s, box-shadow .18s;
        }
        .user-panel .up-btn:hover{ transform: translateY(-1px); filter: brightness(1.03); box-shadow:0 10px 20px rgba(2,6,23,.15); }
        .user-panel .up-btn:disabled{ opacity:.6; cursor:not-allowed; }
        .up-btn-edit{ background: linear-gradient(135deg,#2563eb,#1d4ed8) !important; color:#fff; }
        .up-btn-cancel{ background: linear-gradient(135deg,#f8fafc,#e2e8f0) !important; color:#0f172a; }
        .up-btn-green{ background: linear-gradient(135deg,#16a34a,#15803d) !important; color:#fff; }
        .up-btn-pink{ background: linear-gradient(135deg,#ec4899,#db2777) !important; color:#fff; }

        .up-triple{ width:100%; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:8px; margin-top:10px; }
        .up-triple .left{ justify-self:start; }
        .up-triple .center{ justify-self:center; }
        .up-triple .right{ justify-self:end; }

        @media (max-width: 1024px){ .menu{ width:230px; min-width:230px; } }
        @media (max-width: 768px){
          .burger{ display:inline-block; }
          .menu{
            position:fixed; top:70px; left:-260px; height:calc(100vh - 70px);
            width:220px; min-width:220px; z-index:20; transition:left .25s ease;
          }
          .menu.open{ left:0; }
          .content{ width:100%; }
        }
      `}</style>

      {/* ---------- HEADER ---------- */}
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="burger" aria-label="Ouvrir/fermer le menu" onClick={() => setMenuOpen((v) => !v)}>
            <span className="burger-lines" />
          </button>

          <div className="title-box">
            <span className="text-left">LYCEE</span>
            <span className="box">IKALAMAVONY</span>
          </div>
        </div>

        {/* Zone utilisateur → ouvre le panneau */}
        <div
          className="user-info"
          onClick={toggleUserPanel}
          role="button"
          aria-haspopup="dialog"
          aria-expanded={userPanelOpen}
          title="Voir le profil"
        >
          <img src={makeSrc(profileImage || DEFAULT_AVATAR_PATH)} alt="Photo de profil" />
          <span>{userName}</span>
        </div>
      </div>

      {/* Overlay pour fermer d’un clic extérieur */}
      <div
        className={`user-panel-overlay ${userPanelOpen ? "show" : ""}`}
        onClick={() => { setUserPanelOpen(false); setEditEnabled(false); }}
      />

      {/* ---------- POPUP PROFIL ---------- */}
      <aside className={`user-panel ${userPanelOpen ? "open" : ""}`} role="dialog" aria-label="Profil utilisateur">
        <div className="up-header">
          <div className="up-title">Profil</div>

          {/* Label "Modifier" + toggle */}
          <label className="toggle" title="Activer la modification">
            <span>Modifier</span>
            <span className="switch">
              <input
                type="checkbox"
                checked={editEnabled}
                onChange={(e) => {
                  const on = e.target.checked;
                  setEditEnabled(on);
                  if (on) {
                    setEdit({ fullName: userName || "", email: userEmail || "" });
                    setPhotoPreview(profileImage || DEFAULT_AVATAR_PATH);
                  } else {
                    cancelEdit();
                  }
                }}
              />
              <span className="slider"></span>
            </span>
          </label>
        </div>

        {/* Contenu vertical */}
        <div className="up-head">
          <img
            className="up-avatar"
            src={makeSrc(editEnabled ? (photoPreview || DEFAULT_AVATAR_PATH) : (profileImage || DEFAULT_AVATAR_PATH))}
            alt="Avatar utilisateur"
          />

          {!editEnabled ? (
            <>
              <h3 className="up-name">{userName || "Utilisateur"}</h3>
              <span className="up-role">{userRole || "Inconnu"}</span>
              <div className="up-email">{userEmail || ""}</div>
            </>
          ) : (
            <>
              <div className="fld">
                <label className="lbl" htmlFor="fullName">Nom complet</label>
                <input
                  id="fullName"
                  className="in"
                  value={edit.fullName}
                  onChange={(e) => setEdit((s) => ({ ...s, fullName: e.target.value }))}
                />
              </div>

              <div className="fld">
                <label className="lbl" htmlFor="email">Email</label>
                <input
                  id="email"
                  className="in"
                  type="email"
                  value={edit.email}
                  onChange={(e) => setEdit((s) => ({ ...s, email: e.target.value }))}
                />
              </div>

              <div className="fld">
                <label className="lbl">Photo de profil</label>
                <div className="photo-box">
                  <div className="photo-wrap">
                    <img src={makeSrc(photoPreview || profileImage || DEFAULT_AVATAR_PATH)} alt="Aperçu photo" />
                  </div>
                  <div className="file-col">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="fi"
                      onChange={onPickPhoto}
                    />
                    <div className="file-name" title={fileName || "Aucun fichier"}>
                      {fileName || "Aucun fichier sélectionné"}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="up-actions">
          {editEnabled ? (
            // === Mode édition : boutons Annuler / Enregistrer
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="up-btn up-btn-cancel" onClick={cancelEdit} disabled={saving}>Annuler</button>
              <button className="up-btn up-btn-edit" onClick={saveProfile} disabled={saving}>
                {saving ? "✏️Modification..." : "✏️Modifier"}
              </button>
            </div>
          ) : (
            // === Mode affichage : 3 boutons sur la même ligne (Matière | Matricule | Modifier)
            <div className="up-triple">
              <button
                className="up-btn up-btn-green left"
                onClick={() => { setUserPanelOpen(false); setEditEnabled(false); nav("/dashboard/matiere"); }}
                disabled={!isProviseur}
                title={isProviseur ? "" : "Réservé au proviseur"}
              >
                Matière
              </button>

              <button
                className="up-btn up-btn-pink center"
                onClick={() => { setUserPanelOpen(false); setEditEnabled(false); nav("/dashboard/matricule"); }}
                disabled={!isProviseur}
                title={isProviseur ? "" : "Réservé au proviseur"}
              >
                Matricule
              </button>

              <button
                className="up-btn up-btn-edit right"
                onClick={() =>
                  Swal.fire({
                    icon: "info",
                    title: "Astuce",
                    text: "Active le bouton 'Modifier' (en haut à droite du panneau) pour changer les infos du profil.",
                    confirmButtonColor: "#1d4ed8",
                  })
                }
              >
                Modifier
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ---------- LAYOUT PRINCIPAL ---------- */}
      <div className="container">
        {/* Sidebar */}
        <aside className={`menu ${menuOpen ? "open" : ""}`}>
          <nav className="menu-items" onClick={() => setMenuOpen(false)}>
            <NavLink to="/dashboard" end className={({ isActive }) => "menu-link" + (isActive ? " active" : "")}>
              Accueil
            </NavLink>
            <NavLink to="/dashboard/tableau-de-bord" className={({ isActive }) => "menu-link" + (isActive ? " active" : "")}>
              Tableau de bord
            </NavLink>
            <NavLink to="/dashboard/enregistrer-eleve" className={({ isActive }) => "menu-link" + (isActive ? " active" : "")}>
              Enregistrer un élève
            </NavLink>
            <NavLink to="/dashboard/inscription" className={({ isActive }) => "menu-link" + (isActive ? " active" : "")}>
              Inscription
            </NavLink>
            <NavLink to="/dashboard/absence" className={({ isActive }) => "menu-link" + (isActive ? " active" : "")}>
              Absence
            </NavLink>
            <NavLink to="/dashboard/notes" className={({ isActive }) => "menu-link" + (isActive ? " active" : "")}>
              Notes
            </NavLink>
            <NavLink to="/dashboard/bulletin" className={({ isActive }) => "menu-link" + (isActive ? " active" : "")}>
              Bulletin de notes
            </NavLink>
          </nav>

          <div className="logout-container">
            <button className="logout-btn" id="logoutTrigger" onClick={handleLogout}>
              Déconnexion
            </button>
          </div>
        </aside>

        {/* Contenu routes enfants */}
        <main className="content">
          <Outlet />
        </main>
      </div>
    </>
  );
}
