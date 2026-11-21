
import { useState, type FormEvent } from "react";
import { Activity, LockKeyhole, Mail, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible de se connecter."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">
            <Activity size={27} />
          </div>
          <div>
            <h1>Maintenix</h1>
            <span>Maintenance Management System</span>
          </div>
        </div>

        <div className="login-heading">
          <span className="login-eyebrow">SECURE ACCESS</span>
          <h2>Welcome back</h2>
          <p>Connectez-vous pour accéder à votre espace de travail.</p>
        </div>

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="login-field">
            <span>Email address</span>
            <div className="login-input">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                autoComplete="username"
                required
              />
            </div>
          </label>

          <label className="login-field">
            <span>Password</span>
            <div className="login-input">
              <LockKeyhole size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button
            className="login-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Connexion..." : "Sign in"}
          </button>
        </form>

        <div className="login-footer">
          <LockKeyhole size={14} />
          <span>Accès sécurisé réservé aux utilisateurs autorisés</span>
        </div>
      </section>

      <p className="login-copyright">
        © {new Date().getFullYear()} Maintenix · Maintenance Management System
      </p>
    </main>
  );
}
