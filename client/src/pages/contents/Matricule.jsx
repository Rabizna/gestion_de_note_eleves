// client/src/pages/contents/Matricule.jsx
import { useNavigate } from "react-router-dom";

export default function Matricule() {
  const navigate = useNavigate();
  return (
    <>
      <style>{`
        .wrap{ display:flex; flex-direction:column; gap:12px; }
        .title{ font-weight:800; font-size:20px; color:rgb(8,57,64); padding-bottom:8px; border-bottom:2px solid rgb(243,117,33); }
        .btn{ padding:10px 14px; border:0; border-radius:10px; font-weight:700; cursor:pointer; color:#fff; background:rgb(8,57,64); width:max-content; }
      `}</style>

      <div className="wrap">
        <div className="title">Gestion des matricules</div>
        <div style={{ color:"#475569" }}>
          (UI à venir) — Page réservée à la création/édition/affectation des matricules.
        </div>
        <button className="btn" onClick={()=>navigate(-1)}>← Retour</button>
      </div>
    </>
  );
}
