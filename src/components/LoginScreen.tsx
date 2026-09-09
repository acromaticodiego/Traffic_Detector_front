import { useState } from "react";
import { useAuth } from "../state/auth";
import { IconAlert, IconTower } from "./icons";

/**
 * Puerta de entrada.
 *
 * Sigue la paleta del sistema: marino de fondo, mostaza para la acción. El
 * mapa no se ve aquí a propósito — antes de identificarse, nadie tiene por
 * qué saber qué cámaras existen ni dónde están.
 */
export function LoginScreen() {
  const login = useAuth((s) => s.login);
  const submitting = useAuth((s) => s.submitting);
  const error = useAuth((s) => s.error);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || submitting) return;
    await login(email, password);
  }

  return (
    <div className="login">
      <div className="login-glow" aria-hidden />

      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <span className="login-mark">
            <IconTower width={20} height={20} />
          </span>
          <div>
            <strong>Traffic Intelligence</strong>
            <span>Monitoreo vial por visión artificial</span>
          </div>
        </div>

        <label className="login-field">
          <span>Correo</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoFocus
            required
            disabled={submitting}
            placeholder="tu@organizacion.com"
          />
        </label>

        <label className="login-field">
          <span>Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={submitting}
            placeholder="••••••••"
          />
        </label>

        {error && (
          <p className="login-error" role="alert">
            <IconAlert width={14} height={14} />
            <span>{error}</span>
          </p>
        )}

        <button
          className="login-submit"
          type="submit"
          disabled={submitting || !email || !password}
        >
          {submitting ? "Entrando…" : "Entrar"}
        </button>

        <p className="login-foot">
          ¿Sin cuenta? Pídesela a un administrador: las cuentas se crean desde
          el servidor, no se registran solas.
        </p>
      </form>
    </div>
  );
}
