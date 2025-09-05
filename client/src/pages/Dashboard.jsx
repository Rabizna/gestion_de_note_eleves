// client/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { api } from '../api'
import Swal from 'sweetalert2'
import { NavLink, useNavigate } from 'react-router-dom'
import '../styles/dashboard.css'

export default function Dashboard(){
  const [me, setMe] = useState(null)
  const nav = useNavigate()

  useEffect(() => {
    api('/api/auth/me')
      .then(({ user }) => setMe(user))
      .catch(() => nav('/login'))
  }, [nav])

  const logout = async () => {
    const ask = await Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Vous allez être déconnecté.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, déconnectez-moi',
      cancelButtonText: 'Annuler',
      allowOutsideClick: false,
      backdrop: 'rgba(0,0,0,0.7)'
    })
    if (!ask.isConfirmed) return
    try{
      await api('/api/auth/logout', { method:'POST' })
      nav('/login')
    }catch(e){
      Swal.fire({ icon:'error', title:'Erreur', text:e.message })
    }
  }

  if(!me) return null

  return (
    <div className="dashboard-page">
      {/* === STYLES SPÉCIFIQUES === */}
      <style>{`
        :root{
          --brand:#083940;        /* turquoise foncé */
          --brand-2:#0b3b40;      /* variante */
          --brand-3:#0d4b57;      /* variante + foncée */
          --accent:#f37521;       /* orange */
          --accent-2:#ff8a3d;     /* orange clair */
          --paper:#ffffff;
          --line:#e5e7eb;

          /* === NOUVELLES COULEURS POUR L'ONGLET ACTIF DE LA SIDEBAR === */
          --menu-active1:#0ea5e9;
          --menu-active2:#14b8a6; /* teal *

        .dashboard-page{
          min-height:100vh;
          background:
            radial-gradient(120% 160% at 0% 0%, rgba(8,57,64,.08) 0%, rgba(8,57,64,0) 60%),
            linear-gradient(135deg, #ffffff 0%, #fdf7f2 60%, #ffffff 100%);
        }

        /* ===== Header armonisé (turquoise + lueur orange) ===== */
        .dashboard-header{
          height:70px; display:flex; align-items:center; justify-content:space-between;
          padding:0 16px;
          color:#fff; position:relative; z-index:1;
          background: linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 55%, var(--brand-3) 100%);
          box-shadow:0 10px 24px rgba(2,6,23,.18);
        }
        .dashboard-header::after{
          content:""; position:absolute; inset:0; pointer-events:none;
          background: radial-gradient(120% 180% at 100% 0%, rgba(243,117,33,.22) 0%, rgba(243,117,33,0) 60%);
        }

        .brand-box{ display:flex; align-items:center; gap:10px; font-weight:800; }
        .brand-left{
          background:#111827; border-radius:10px; padding:8px 12px;
          font-size:18px; letter-spacing:.3px;
        }
        .brand-right{
          background:linear-gradient(135deg, var(--accent), var(--accent-2));
          color:#111827; border-radius:10px; padding:8px 14px; font-size:18px; font-weight:900;
          box-shadow:0 8px 18px rgba(243,117,33,.35);
        }

        .user-info{ display:flex; align-items:center; gap:10px; }
        .user-info .avatar img{
          width:42px; height:42px; border-radius:999px; object-fit:cover; border:2px solid #fff;
          box-shadow:0 6px 14px rgba(2,6,23,.25);
        }
        .user-info .name{ font-weight:700; }

        /* ===== Body ===== */
        .dashboard-body{ display:flex; min-height: calc(100vh - 70px); }

        /* ===== Sidebar harmonisée ===== */
        .sidebar{
          width:260px; min-width:260px; padding:16px 12px;
          background:
            linear-gradient(180deg, var(--brand) 0%, #0a5160 60%, #0a3740 100%),
            radial-gradient(120% 70% at 100% 0%, rgba(243,117,33,.18) 0%, rgba(243,117,33,0) 60%);
          background-blend-mode: normal, overlay;
          box-shadow: 2px 0 18px rgba(2,6,23,.15);
          display:flex; flex-direction:column; justify-content:space-between;
        }
        .menu-group{ display:flex; flex-direction:column; gap:8px; }
        .menu-item{
          display:block; padding:12px 12px; border-radius:10px; text-decoration:none;
          color:#fff; font-weight:700; letter-spacing:.2px;
          transition: transform .06s ease, box-shadow .18s ease, background .2s ease;
        }
        .menu-item:hover{
          transform: translateY(-1px);
          background: rgba(255,255,255,.10);
          box-shadow:0 10px 20px rgba(96,165,250,.25); /* léger glow bleuté */
        }

        /* === ACTIF : BLEU→VIOLET (accordé à la page Absence) === */
        .menu-item.active{
          color:#0f172a;
          background: linear-gradient(135deg, var(--menu-active1) 0%, var(--menu-active2) 100%);
          box-shadow:0 10px 24px rgba(96,165,250,.35);
        }

        .logout-wrap{ margin-top:16px; text-align:center; }
        .logout-btn{
          width:85%; padding:10px 14px; border:0; border-radius:10px; cursor:pointer; color:#fff; font-weight:800;
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          box-shadow:0 10px 22px rgba(239,68,68,.28);
          transition: transform .06s ease, filter .15s ease;
        }
        .logout-btn:hover{ transform: translateY(-1px); filter:brightness(1.03); }

        .content{
          flex:1; padding:18px; background: var(--paper);
          border-left:1px solid var(--line);
        }
      `}</style>

      {/* HEADER — dégradé */}
      <header className="dashboard-header">
        <div className="brand-box">
          <span className="brand-left">LYCEE</span>
          <span className="brand-right">IKALAMAVONY</span>
        </div>

        <div className="user-info" title={me.email || ''}>
          <div className="avatar">
            {/* Si tu ajoutes plus tard une vraie image depuis l’API, remplace ce placeholder */}
            <img src="https://api.dicebear.com/9.x/initials/svg?seed=User" alt="avatar" />
          </div>
          <span className="name">{me.fullName}</span>
        </div>
      </header>

      {/* BODY plein écran */}
      <div className="dashboard-body">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <nav className="menu-group">
            {/* Utilise NavLink pour l’état actif */}
            <NavLink end to="/dashboard" className={({isActive}) => `menu-item ${isActive?'active':''}`}>Accueil</NavLink>
            <NavLink to="/dashboard/board" className={({isActive}) => `menu-item ${isActive?'active':''}`}>Tableau de bord</NavLink>
            <NavLink to="/dashboard/register-student" className={({isActive}) => `menu-item ${isActive?'active':''}`}>Enregistrer un élève</NavLink>
            <NavLink to="/dashboard/inscription" className={({isActive}) => `menu-item ${isActive?'active':''}`}>Inscription</NavLink>
            <NavLink to="/dashboard/absence" className={({isActive}) => `menu-item ${isActive?'active':''}`}>Absence</NavLink>
            <NavLink to="/dashboard/notes" className={({isActive}) => `menu-item ${isActive?'active':''}`}>Notes</NavLink>
            <NavLink to="/dashboard/bulletins" className={({isActive}) => `menu-item ${isActive?'active':''}`}>Bulletin de notes</NavLink>
          </nav>

          <div className="logout-wrap">
            <button className="logout-btn" onClick={logout}>Déconnexion</button>
          </div>
        </aside>

        {/* CONTENU */}
        <main className="content">
          <h1>Tableau de bord</h1>
          <p>Bienvenue sur le tableau de bord du lycée Ikalamavony.</p>
          {/* Tu peux ensuite router ici vers des sous-pages si besoin */}
        </main>
      </div>
    </div>
  )
}
