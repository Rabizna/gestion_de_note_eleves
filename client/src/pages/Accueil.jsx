// client/src/pages/Accueil.jsx
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
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, sans-serif; display: flex; flex-direction: column; overflow: hidden; background: #fff; }

        /* HEADER */
        .header {
          height: 64px; background-color: rgb(8, 57, 64);
          display: flex; align-items: center; justify-content: space-between;
          font-size: 24px; font-weight: bold; padding: 0 12px;
        }
        .title-box { margin-left: 10px; display: flex; align-items: center; background: #000; color: #fff; padding: 10px; border-radius: 5px; }
        .text-left { color: #fff; font-size: 20px; margin-right: 10px; }
        .box { background-color: rgb(243,117,33); padding: 5px 15px; font-size: 20px; }

        .burger { display: none; background: transparent; border: 0; width: 40px; height: 40px; margin-right: 8px; cursor: pointer; }
        .burger:focus { outline: 2px solid #fff; outline-offset: 2px; }
        .burger-lines, .burger-lines::before, .burger-lines::after {
          content: ""; display: block; height: 2px; background: #fff; border-radius: 2px; transition: transform .2s ease;
        }
        .burger-lines { width: 20px; }
        .burger-lines::before { width: 16px; margin-top: 6px; }
        .burger-lines::after { width: 20px; margin-top: 6px; }

        .user-info { display: flex; align-items: center; gap: 10px; cursor: pointer; }
        .user-info span { color: white !important; font-weight: 600; }
        .user-info img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; }

        /* LAYOUT */
        .container { display: flex; width: 100vw; height: calc(100vh - 64px); position: relative; }
        .menu {
          width: 250px; min-width: 250px; background-color: rgb(8, 57, 64);
          padding: 10px; box-shadow: 2px 0 5px rgba(0,0,0,0.1);
          display: flex; flex-direction: column; justify-content: space-between; overflow-y: auto;
        }
        .menu-items { display: flex; flex-direction: column; gap: 15px; text-transform: uppercase; }

        .menu .menu-link {
          display: block; padding: 10px; border-radius: 5px; text-decoration: none;
          color: white; transition: background-color .3s ease, color .3s ease;
        }
        .menu .menu-link:hover,
        .menu .menu-link.active {
          background-color: rgb(243,117,33); color: black; font-weight: bold;
        }

        .content { flex: 1; min-width: 0; padding: 10px; background: #fff; overflow-y: auto; }

        .logout-container { margin-top: auto; padding: 20px 0; text-align: center; }
        .logout-btn {
          display: inline-block; padding: 10px 20px; background-color: #d9534f; color: white;
          font-size: 16px; font-weight: bold; border-radius: 5px; transition: .3s ease; width: 80%;
          text-align: center; border: none; cursor: pointer;
        }
        .logout-btn:hover { background-color: #c9302c; transform: scale(1.05); }

        .backdrop { display: none; position: fixed; top: 64px; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.4); z-index: 15; }

        /* POPUP PROFIL */
        .user-panel-overlay { display:none; position:fixed; inset:0; z-index: 98; background: transparent; }
        .user-panel-overlay.show { display:block; }

        .user-panel {
          position: fixed; top: 70px; right: 12px; z-index: 99;
          width: 340px; max-width: calc(100vw - 24px);
          background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
          box-shadow: 0 18px 48px rgba(2,6,23,.25);
          padding: 14px 14px 12px;

          display: flex; flex-direction: column;
          transform: translateY(-6px); opacity: 0; pointer-events: none;
          transition: transform .15s ease, opacity .15s ease;
        }
        .user-panel.open { transform: translateY(0); opacity: 1; pointer-events: auto; }

        .up-header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px; }
        .up-title { font-weight: 700; font-size: 16px; }

        .toggle { display:inline-flex; align-items:center; gap:8px; user-select:none; }
        .switch { position: relative; width: 44px; height: 24px; display:inline-block; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; inset: 0; background: #cbd5e1; border-radius: 999px; transition: .2s; }
        .slider::before { content: ""; position: absolute; height: 18px; width: 18px; left: 3px; top: 3px; background: white; border-radius: 999px; transition: .2s; }
        input:checked + .slider { background: #2563eb; }
        input:checked + .slider::before { transform: translateX(20px); }

        /* Contenu du panneau (vertical) */
        .up-head { display:flex; flex-direction:column; align-items:center; text-align:center; gap:10px; margin-top: 8px; }
        .up-avatar { width: 84px; height: 84px; border-radius: 50%; object-fit: cover; border: 2px solid #e5e7eb; }

        .up-name { font-weight:700; margin: 0; }
        .up-role { display:inline-block; padding:2px 8px; border-radius:999px; background:#eef2ff; color:#3730a3; font-weight:600; font-size:12px; margin-top: 4px; }
        .up-email { color:#334155; font-size:14px; word-break: break-all; margin-top: 4px; }

        .up-edit { margin-top: 12px; display:flex; flex-direction:column; gap:10px; }
        .fld { display:flex; flex-direction:column; gap:6px; width: 100%; }
        .lbl { font-weight:600; font-size: 13px; text-align: left; }
        .in, .fi { width:100%; padding:10px 12px; border:1px solid #e2e8f0; border-radius:10px; font-size:14px; }
        .in:focus, .fi:focus { outline:none; border-color:#93c5fd; box-shadow:0 0 0 3px rgba(147,197,253,.3); }

        .photo-box { display:flex; gap:10px; align-items:center; width: 100%; }
        .photo-wrap { width:72px; height:72px; border:1px solid #e5e7eb; border-radius: 50%; overflow:hidden; background:#f8fafc; display:flex; align-items:center; justify-content:center; }
        .photo-wrap img { width:100%; height:100%; object-fit: cover; }
        .file-col { display:flex; flex-direction:column; gap:6px; min-width:0; }
        .file-name { max-width: 200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#475569; font-size:12px; text-align: left; }

        /* ---------- Actions du popup ---------- */
        .up-actions { margin-top: auto; }

        /* Boutons SCOPÉS au popup (évite les collisions avec d'autres pages) */
        .user-panel .up-btn{
          padding:10px 14px; border:0; border-radius:10px; font-weight:700;
          cursor:pointer; display:inline-flex; align-items:center; gap:6px;
        }
        .user-panel .up-btn:disabled{ opacity:.6; cursor:not-allowed; }

        /* variantes */
        .user-panel .up-btn-edit{ background:linear-gradient(160deg,#2563eb,#1d4ed8) !important; color:#fff; }
        .user-panel .up-btn-cancel{ background:#f1f5f9 !important; color:#0f172a; }
        .user-panel .up-btn-green{ background:#16a34a !important; color:#fff; }  /* vert */
        .user-panel .up-btn-pink{  background:#ec4899 !important; color:#fff; }  /* rose */

        /* Triple barre (Matière | Matricule | Modifier) */
        .up-triple{
          width:100%;
          display:grid;
          grid-template-columns:1fr auto 1fr;
          align-items:center;
          gap:8px;
          margin-top:10px;
        }
        .up-triple .left{ justify-self:start; }
        .up-triple .center{ justify-self:center; }
        .up-triple .right{ justify-self:end; }

        /* Responsive */
        @media (max-width: 1024px) { .menu { width: 220px; min-width: 220px; } }
        @media (max-width: 768px) {
          .burger { display: inline-block; }
          .title-box { margin-left: 0; }
          .menu {
            position: fixed; top: 64px; left: -260px; height: calc(100vh - 64px);
            width: 220px; min-width: 220px; z-index: 20; transition: left .25s ease;
          }
          .menu.open { left: 0; }
          .content { width: 100%; }
          .backdrop.show { display: block; }
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
                onClick={() => nav("/dashboard/matiere")}
                disabled={!isProviseur}
                title={isProviseur ? "" : "Réservé au proviseur"}
              >
                Matière
              </button>

              <button
                className="up-btn up-btn-pink center"
                onClick={() => nav("/dashboard/matricule")}
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
        {/* overlay mobile pour le menu */}
        <div
          className={`backdrop ${menuOpen ? "show" : ""}`}
          onClick={() => setMenuOpen(false)}
        />

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
