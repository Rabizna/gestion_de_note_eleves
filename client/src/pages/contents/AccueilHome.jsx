import { useEffect, useMemo, useState } from "react";
import { api, BASE_URL } from "../../api";

const DEFAULT_STUDENT = "/uploads/defaut.png";

export default function AccueilHome() {
  /* ================= Horloge ================= */
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const two = (n) => String(n).padStart(2, "0");
  const H = two(now.getHours());
  const M = two(now.getMinutes());
  const S = two(now.getSeconds());
  const DD = two(now.getDate());
  const MM = two(now.getMonth() + 1);
  const YYYY = now.getFullYear();

  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const todayIdx = (now.getDay() + 6) % 7; // 0=Lun … 6=Dim
  const blink = now.getSeconds() % 2 === 0;

  /* ================= Slider absents ================= */
  const [classesStats, setClassesStats] = useState([]);
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const data = await api("/api/absence/today-by-class");
        const arr = Array.isArray(data?.classes) ? data.classes : [];
        const fallback = [
          "Seconde A", "Seconde B", "Seconde C",
          "Première L", "Première S", "Première OSE",
          "Terminale L", "Terminale S", "Terminale OSE",
        ].map((label) => ({ label, count: 0 }));
        setClassesStats(arr.length ? arr : fallback);
        setSlideIdx(0);
      } catch {
        setClassesStats([
          "Seconde A", "Seconde B", "Seconde C",
          "Première L", "Première S", "Première OSE",
          "Terminale L", "Terminale S", "Terminale OSE",
        ].map((label) => ({ label, count: 0 })));
        setSlideIdx(0);
      }
    })();
  }, []);

  useEffect(() => {
    if (!classesStats.length) return;
    const id = setInterval(
      () => setSlideIdx((i) => (i + 1) % classesStats.length),
      5000
    );
    return () => clearInterval(id);
  }, [classesStats]);

  /* ================= Élève aléatoire ================= */
  const [students, setStudents] = useState([]);
  const [stuIndex, setStuIndex] = useState(0);

  // normalise l'URL photo (dataURL, /uploads/..., chemin relatif…)
  const normPhoto = (p) => {
    if (!p) return DEFAULT_STUDENT;
    if (p.startsWith("data:image")) return p;
    if (p.startsWith("/uploads/")) return p;
    if (/^https?:\/\//i.test(p)) return p;
    return `${BASE_URL}${p.startsWith("/") ? "" : "/"}${p}`;
  };

  useEffect(() => {
    (async () => {
      try {
        // prévois une route /api/eleves/all qui renvoie [{id,nom,prenom,numero,matricule,niveau:{nom},section:{nom},photo}, ...]
        const data = await api("/api/eleves/all");
        const arr = Array.isArray(data?.eleves) ? data.eleves : [];
        // petit shuffle soft
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        setStudents(arr);
        setStuIndex(0);
      } catch {
        setStudents([]);
        setStuIndex(0);
      }
    })();
  }, []);

  useEffect(() => {
    if (!students.length) return;
    const id = setInterval(
      () => setStuIndex((i) => (i + 1) % students.length),
      10000
    );
    return () => clearInterval(id);
  }, [students]);

  const student = useMemo(() => students[stuIndex] ?? null, [students, stuIndex]);

  return (
    <div className="page-center">
      <style>{`
        .page-center{
          --wrap-w: min(820px, 94vw);
          --card-h: clamp(220px, 26vw, 260px);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 12px;
          padding: 28px 18px;
          background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #f97316 100%);
        }

        /* ============ CLOCK ============ */
        .clock-wrap{
          width: var(--wrap-w);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.7);
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.15), 0 12px 30px rgba(2, 6, 23, 0.16);
          padding: 12px 18px;
        }
        .grid-fit{
          display: grid;
          grid-template-columns: 64px 1fr max-content;
          gap: 12px;
          align-items: center;
        }
        .days{ margin: 0; padding: 0; list-style: none; }
        .days li{
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.3px;
          color: #64748b;
          user-select: none;
        }
        .days li .dot{
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #64748b;
        }
        .days li.active{ color: #0ea5e9; }
        .days li.active .dot{
          background: #0ea5e9;
          box-shadow: 0 0 10px #0ea5e9, 0 0 20px rgba(14, 165, 233, 0.6);
        }
        .today-label{
          color: #0ea5e9;
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 6px;
          text-align: center;
          text-shadow: 0 0 8px rgba(14, 165, 233, 0.5);
          user-select: none;
        }
        .digits{
          color: #0f172a;
          font-weight: 900;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
          line-height: 1;
          text-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);
          font-size: clamp(44px, 9.2vw, 100px);
        }
        .colon{
          display: inline-block;
          margin: 0 0.06em;
          opacity: 0.25;
          transition: opacity 0.35s ease;
        }
        .colon.on{ opacity: 1; }
        .right-num{
          text-align: right;
          user-select: none;
          white-space: nowrap;
          color: #0ea5e9;
          font-weight: 900;
          font-variant-numeric: tabular-nums;
          text-shadow: 0 2px 8px rgba(14, 165, 233, 0.4);
        }
        .sec{
          font-size: clamp(18px, 3.6vw, 30px);
          line-height: 1;
        }
        .date{
          font-size: clamp(16px, 3vw, 28px);
          margin-top: 4px;
          line-height: 1;
        }

        @media (max-width: 430px){
          .grid-fit{
            grid-template-columns: 56px 1fr max-content;
            gap: 10px;
          }
          .days li{ font-size: 12px; }
        }

        /* ============ DOUBLE CARTES (hauteur 100% identique) ============ */
        .box-grid{
          width: var(--wrap-w);
          display: grid;
          grid-template-columns: 48% 2% 48%;
          align-items: stretch;
        }

        .card{
          height: var(--card-h);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.7);
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.12), 0 12px 30px rgba(2, 6, 23, 0.16);
          color: #0f172a;
          overflow: hidden;
        }

        /* ===== Ticker gauche (forme carrée/rectangle) ===== */
        .ticker-card{
          padding: 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .ticker-top{
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .pill{
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #fff;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          box-shadow: 0 8px 22px rgba(34, 197, 94, 0.25);
          white-space: nowrap;
        }
        .class-label{
          color: #0f172a;
          font-weight: 900;
          letter-spacing: 0.02em;
        }
        .count{
          color: #0ea5e9;
          font-weight: 900;
          font-size: 32px;
          font-variant-numeric: tabular-nums;
          text-shadow: 0 2px 8px rgba(14, 165, 233, 0.4);
        }
        .ticker-body{
          flex: 1;
          border-radius: 10px;
          background: linear-gradient(180deg, rgba(14, 165, 233, 0.08), transparent);
          margin-top: 12px;
        }

        /* ===== Carte élève droite ===== */
        .student-card{
          padding: 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .badge{
          align-self: flex-start;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          color: #fff;
          font-weight: 900;
          font-size: 12px;
          border-radius: 999px;
          padding: 8px 12px;
          box-shadow: 0 8px 22px rgba(59, 130, 246, 0.28);
        }
        .student-row{
          display: flex;
          gap: 14px;
          margin-top: 8px;
        }
        .student-photo{
          width: 92px;
          height: 92px;
          border-radius: 10px;
          overflow: hidden;
          background: #0f172a;
          border: 2px solid #0ea5e9;
          flex-shrink: 0;
        }
        .student-photo img{
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .student-info{
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .student-name{
          color: #0f172a;
          font-weight: 900;
          font-size: 20px;
        }
        .student-class{
          color: #475569;
          font-weight: 800;
        }
        .student-meta{
          color: #64748b;
          font-weight: 700;
          font-size: 14px;
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .student-actions{
          display: flex;
          justify-content: flex-end;
          margin-top: auto;
        }
        .btn-green{
          background: linear-gradient(135deg, #0ea5e9, #6366f1);
          color: #fff;
          border: 0;
          border-radius: 12px;
          padding: 10px 16px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(14, 165, 233, 0.25);
          transition: transform 0.08s ease, filter 0.12s ease;
        }
        .btn-green:hover{
          transform: translateY(-1px);
          filter: brightness(1.05);
        }
        .btn-green:active{
          transform: translateY(0);
        }
      `}</style>

      {/* ========= Horloge ========= */}
      <div className="clock-wrap">
        <div className="grid-fit">
          <ul className="days">
            {days.map((d, i) => (
              <li key={d} className={i === todayIdx ? "active" : ""}>
                <span className="dot" />
                <span>{d}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col items-center justify-center">
            <div className="today-label">Aujourd'hui</div>
            <div className="digits select-none">
              {H}
              <span className={`colon ${blink ? "on" : ""}`}>:</span>
              {M}
            </div>
          </div>

          <div className="right-num">
            <div className="sec">
              {S}
              <sup style={{ fontSize: "0.55em", marginLeft: 2 }}>s</sup>
            </div>
            <div className="date">{DD}.{MM}.{YYYY}</div>
          </div>
        </div>
      </div>

      {/* ========= Deux cartes (mêmes dimensions) ========= */}
      <div className="box-grid">
        {/* gauche : ticker absents */}
        <div className="card ticker-card">
          {classesStats.length ? (
            <>
              <div className="ticker-top">
                <div className="pill">Absents aujourd'hui</div>
                <div className="class-label">{classesStats[slideIdx].label}</div>
                <div className="count">{classesStats[slideIdx].count}</div>
              </div>
              <div className="ticker-body" />
            </>
          ) : (
            <>
              <div className="ticker-top">
                <div className="pill">Absents aujourd'hui</div>
                <div className="class-label">—</div>
                <div className="count">0</div>
              </div>
              <div className="ticker-body" />
            </>
          )}
        </div>

        {/* séparateur 2% */}
        <div />

        {/* droite : élève */}
        <div className="card student-card">
          <div className="badge">Élève à l'honneur</div>

          <div className="student-row">
            <div className="student-photo">
              {/* vraie image */}
              <img
                src={normPhoto(student?.photo)}
                alt="Élève"
                onError={(e) => { e.currentTarget.src = DEFAULT_STUDENT; }}
              />
            </div>

            <div className="student-info">
              <div className="student-name">
                {student ? `${student.prenom ?? ""} ${student.nom ?? ""}`.trim() : "—"}
              </div>
              <div className="student-class">
                {student ? `${student?.niveau?.nom ?? ""} ${student?.section?.nom ?? ""}`.trim() : ""}
              </div>
              <div className="student-meta">
                <span>Numéro : {student?.numero ?? "—"}</span>
                <span>IM : {student?.matricule ?? "—"}</span>
              </div>
            </div>
          </div>

          <div className="student-actions">
            <button className="btn-green" onClick={() => (window.location.href = "/dashboard/inscrits")}>
              Voir liste des élèves
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}