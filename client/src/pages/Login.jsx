import { useState } from "react";
import Swal from "sweetalert2";
import { api } from "../api";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", pass: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.pass) {
      return Swal.fire({
        icon: "warning",
        title: "Champs requis!",
        text: "Tous les champs sont obligatoires.",
      });
    }
    try {
      setLoading(true);
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      nav("/dashboard", { state: { welcome: true } });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Erreur!", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
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
        <a className="small-link" href="#">Mot de passe oublié ?</a>
      </div>

      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Connexion..." : "Se connecter"}
      </button>

      <div className="divider" />

      <p className="bottom-text">
        Pas de compte ? <Link to="/register">Créer un compte</Link>
      </p>
    </form>
  );
}
