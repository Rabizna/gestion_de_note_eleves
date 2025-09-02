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
