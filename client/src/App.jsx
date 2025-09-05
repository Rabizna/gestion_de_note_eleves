// client/src/App.jsx
import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import Accueil from "./pages/Accueil";

// enfants du dashboard
import AccueilHome from "./pages/contents/AccueilHome";
import TableauDeBord from "./pages/contents/TableauDeBord";
import EnregistrerEleve from "./pages/contents/EnregistrerEleve";
import InscriptionEleve from "./pages/contents/InscriptionEleve";
import InscritsList from "./pages/contents/InscritsList";
import ProfilEleve from "./pages/contents/ProfilEleve";
import Matiere from "./pages/contents/Matiere";
import Matricule from "./pages/contents/Matricule";
import Absence from "./pages/contents/Absence";
import AbsenceArchive from "./pages/contents/AbsenceArchive";
import Notes from "./pages/contents/Notes";
import NotesArchive from "./pages/contents/NotesArchive";
import Bulletin from "./pages/contents/Bulletin";
import Coefficients from "./pages/contents/Coefficients";

export default function App() {
  return (
    <Routes>
      {/* redirection page d’accueil → /login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth pages avec layout */}
      <Route
        path="/login"
        element={
          <AuthLayout active="login">
            <Login />
          </AuthLayout>
        }
      />
      <Route
        path="/register"
        element={
          <AuthLayout active="register">
            <Register />
          </AuthLayout>
        }
      />

      {/* Dashboard + routes enfants (layout = <Accueil />) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Accueil />
          </ProtectedRoute>
        }
      >
        <Route index element={<AccueilHome />} />
        <Route path="tableau-de-bord" element={<TableauDeBord />} />
        <Route path="enregistrer-eleve" element={<EnregistrerEleve />} />
        <Route path="inscription" element={<InscriptionEleve />} />
        <Route path="inscrits" element={<InscritsList />} />
        <Route path="profil-eleve/:id" element={<ProfilEleve />} />
        <Route path="matiere" element={<Matiere />} />
        <Route path="matricule" element={<Matricule />} />
        <Route path="coefficients" element={<Coefficients />} />
        <Route path="absence" element={<Absence />} />
        <Route path="absence/:cycle" element={<Absence />} />
        <Route path="absence/:cycle/:sub" element={<Absence />} />
        <Route path="absence/archive/:cycle/:sub" element={<AbsenceArchive />} />
        <Route path="notes" element={<Notes />} />

        <Route path="notes/:cycle" element={<Notes />} />
        <Route path="notes/:cycle/:sub" element={<Notes />} />
        <Route path="notes/archive/:cycle/:sub" element={<NotesArchive />} />

        <Route path="bulletin" element={<Bulletin />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

/* ————————————————————————————————————————————————————————
   Layout simple pour Login/Register (inchangé sauf styles)
———————————————————————————————————————————————————————— */
function AuthLayout({ children, active }) {
  return (
    <div className="auth-page">
      <style>{`
        :root{
          --bg1:#0ea5e9; --bg2:#6366f1; --card-bg: rgba(255,255,255,.9);
          --text:#0f172a; --muted:#6b7280; --primary:#2563eb; --primary-700:#1d4ed8;
          --border:#e5e7eb; --chip:#f59e0b;
        }
        *{ box-sizing:border-box; }
        .auth-page{ min-height:100vh; width:100vw; display:grid; place-items:center; background: linear-gradient(120deg, var(--bg1), var(--bg2)); padding:16px; font-family:"Poppins", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:var(--text); overflow-x:hidden; }
        .auth-card{ width:100%; max-width:480px; background:var(--card-bg); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,.4); border-radius:16px; box-shadow:0 20px 48px rgba(2,6,23,.25); overflow:hidden; margin:0; }
        .auth-header{ display:flex; justify-content:space-between; align-items:center; padding:20px 24px 0; }
        .brand{ display:flex; align-items:center; gap:10px; user-select:none; }
        .brand .logo{ width:36px; height:36px; border-radius:10px; background: radial-gradient(120% 120% at 20% 20%, #fff, #dbeafe 60%, #bfdbfe 100%); border:1px solid #e5e7eb; }
        .brand .title{ font-weight:600; letter-spacing:.2px; }
        .auth-tabs{ display:flex; gap:18px; padding:6px 24px 0; }
        .auth-tab{ text-decoration:none; color:var(--muted); padding:8px 2px; position:relative; font-weight:600; }
        .auth-tab.active{ color:var(--text); }
        .auth-tab.active::after{ content:""; position:absolute; left:0; right:0; bottom:-2px; height:3px; background:var(--primary); border-radius:3px; }
        .auth-body{ padding:20px 24px 28px; }

        .form-row{ display:flex; flex-direction:column; gap:8px; margin-bottom:14px; }
        .input{ width:100%; padding:12px 14px; border:1px solid var(--border); border-radius:10px; background:#fff; color:#000; outline:none; transition: box-shadow .2s, border-color .2s; font-size:14.5px; }
        .input:focus{ border-color:#bfdbfe; box-shadow:0 0 0 4px rgba(59,130,246,.15); }
        .input::placeholder{ color:#666; }

        .small-link{ display:block; text-align:right; margin-bottom:12px; color:var(--primary-700); text-decoration:none; font-weight:600; }
        .small-link:hover{ text-decoration:underline; }

        .btn{ width:100%; padding:12px 14px; border:0; border-radius:12px; background: linear-gradient(160deg, var(--primary), var(--primary-700)); color:#fff; font-weight:600; cursor:pointer; box-shadow:0 10px 24px rgba(37,99,235,.28); transition: transform .04s, box-shadow .2s, filter .2s; }
        .btn:hover{ filter:brightness(1.03); box-shadow:0 16px 32px rgba(37,99,235,.35); }
        .btn:active{ transform: translateY(1px); }

        .bottom-text{ text-align:center; margin-top:12px; color:var(--muted); }
        .bottom-text a{ color:var(--primary-700); font-weight:600; text-decoration:none; }
        .bottom-text a:hover{ text-decoration:underline; }

        .role-group{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin: 6px 0 14px; }
        .role-title{ font-weight:600; margin-right:6px; }
        .role-input{ display:none; }
        .chip{ padding: 8px 14px; border:1px solid var(--border); border-radius: 999px; background:#fff; cursor:pointer; transition: all .2s ease; user-select:none; }
        .role-input:checked + .chip{ background: var(--chip); color:#fff; border-color: var(--chip); box-shadow: 0 6px 18px rgba(245,158,11,.35); }

        .divider{ height:1px; background: linear-gradient(90deg, transparent, #e5e7eb, transparent); margin: 8px 0 16px; }
        @media (max-width: 520px){ .auth-card{ max-width:100%; } }
        @media (max-width:520px){ .auth-card{ margin: 8px; } }
      `}</style>

      <div className="auth-card">
        <header className="auth-header">
          <div className="brand">
            <div className="logo" aria-hidden />
            <div className="title">LYCEE 3F</div>
          </div>
          <nav className="auth-tabs">
            <NavLink to="/login" className={`auth-tab ${active==='login'?'active':''}`}>Connexion</NavLink>
            <NavLink to="/register" className={`auth-tab ${active==='register'?'active':''}`}>Inscription</NavLink>
          </nav>
        </header>
        <div className="auth-body">{children}</div>
      </div>
    </div>
  );
}
