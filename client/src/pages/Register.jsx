import { useState } from "react";
import Swal from "sweetalert2";
import { api } from "../api";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", pass: "", role: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const { name, email, pass, role } = form;
    if (!name || !email || !pass || !role) {
      return Swal.fire({
        icon: "warning",
        title: "Champs requis!",
        text: "Tous les champs sont obligatoires.",
      });
    }
    try {
      setLoading(true);
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, pass, role }),
      });
      await Swal.fire({
        icon: "success",
        title: "Inscription réussie!",
        text: "Vous pouvez maintenant vous connecter.",
      });
      nav("/login");
    } catch (err) {
      Swal.fire({ icon: "error", title: "Erreur!", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="form-row">
        <label htmlFor="name" style={{ fontWeight: 600 }}>Nom complet</label>
        <input
          id="name"
          className="input"
          placeholder="Nom et prénom"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="form-row">
        <label htmlFor="email" style={{ fontWeight: 600 }}>Email</label>
        <input
          id="email"
          className="input"
          type="email"
          placeholder="votre@email.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
      </div>

      <div className="form-row">
        <label htmlFor="pass" style={{ fontWeight: 600 }}>Mot de passe</label>
        <input
          id="pass"
          className="input"
          type="password"
          placeholder="••••••••"
          value={form.pass}
          onChange={(e) => setForm({ ...form, pass: e.target.value })}
          required
        />
      </div>

      <div className="role-group">
        <span className="role-title">Rôle :</span>

        <input
          id="proviseur"
          className="role-input"
          type="radio"
          name="role"
          value="PROVISEUR"
          checked={form.role === "PROVISEUR"}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        />
        <label className="chip" htmlFor="proviseur">Proviseur</label>

        <input
          id="professeur"
          className="role-input"
          type="radio"
          name="role"
          value="PROFESSEUR"
          checked={form.role === "PROFESSEUR"}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        />
        <label className="chip" htmlFor="professeur">Professeur</label>
      </div>

      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Création du compte..." : "S'inscrire"}
      </button>

      <div className="divider" />

      <p className="bottom-text">
        Avez-vous déjà un compte ? <Link to="/login">Se connecter</Link>
      </p>
    </form>
  );
}
