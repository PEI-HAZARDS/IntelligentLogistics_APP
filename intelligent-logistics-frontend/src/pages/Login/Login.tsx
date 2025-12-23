import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as workerLogin } from "@/services/workers";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  // Determine the app mode from Vite environment
  const mode = import.meta.env.MODE;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Worker (operator/manager) login - uses email
      const response = await workerLogin({
        email: email,
        password: password,
      });

      // Store token and worker info
      localStorage.setItem("auth_token", response.token);
      localStorage.setItem(
        "user_info",
        JSON.stringify({
          num_worker: response.num_worker,
          name: response.name,
          email: response.email,
          active: response.active,
          role: "operator",
        })
      );

      // Redirect based on mode
      if (mode === 'manager') {
        nav("/manager");
      } else {
        nav("/gate");
      }
    } catch (err: unknown) {
      console.error("Login error:", err);

      // Handle different error types
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number; data?: { detail?: string } } };
        if (axiosError.response?.status === 401) {
          setError("Invalid credentials. Check your email and password.");
        } else if (axiosError.response?.status === 404) {
          setError("User not found.");
        } else {
          setError(axiosError.response?.data?.detail || "Login failed. Please try again.");
        }
      } else {
        setError("Connection error. Please check your network.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background" />

      <div className="login-container">
        <div className="login-card">
          {/* Logo */}
          <div className="login-visual">
            <img
              src="/logo.png"
              alt="Porto de Aveiro Logo"
              className="login-logo"
            />
          </div>

          {/* Título */}
          <h1 className="login-title">INTELLIGENT LOGISTICS</h1>

          {/* Subtítulo baseado no modo */}
          <p className="login-subtitle">
            {mode === 'manager' ? "Logistics Manager" : "Gate Operator"}
          </p>

          {/* Mensagem de erro */}
          {error && (
            <div className="login-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={onSubmit} className="login-form">
            {/* Campo de Email */}
            <div className="input-group">
              <div className="input-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                aria-label="Email"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div className="input-group">
              <div className="input-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                aria-label="Password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
                disabled={isLoading}
              >
                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>

            {/* Botão de Login */}
            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? (
                <span className="login-loading">
                  <svg className="spinner" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" />
                  </svg>
                  Logging in...
                </span>
              ) : (
                "LOGIN"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="login-footer">
            © 2025 Port Logistics Management System
          </div>
        </div>
      </div>
    </div>
  );
}
