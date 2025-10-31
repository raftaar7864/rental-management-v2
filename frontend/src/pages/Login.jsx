// src/pages/Login.jsx
import React, { useState, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  
  Code2,
  CreditCard,
} from "lucide-react";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const emailRef = useRef(null);

  useEffect(() => {
    const checkMobile = () =>
      typeof window !== "undefined" ? window.innerWidth < 768 : false;

    setIsMobile(checkMobile());
    if (!checkMobile()) setTimeout(() => emailRef.current?.focus?.(), 120);

    const onResize = () => setIsMobile(checkMobile());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      // Pass remember flag if your backend supports it
      const data = await login(email, password, { remember });
      const role = (data.user.role || "").toLowerCase();
      if (role === "admin") navigate("/admin/dashboard");
      else if (role === "manager") navigate("/manager/dashboard");
      else navigate("/");
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  // Visual-only social handlers — implement OAuth redirect if available
  const handleSocialLogin = (provider) => {
    // e.g. window.location = `/auth/${provider}` or call backend to start OAuth flow
    alert(`Social login (${provider}) — implement handler if desired`);
  };

  return (
    <div className="login-root fullwidth-no-margin" aria-live="polite">
      {/* Watermark centered, hidden on mobile via CSS */}
      {!isMobile && (
        <img
          src="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExdTN2YWlidGZhaW9jYnFmMTZoM3Fnczh6d2diamZxNTlncmhidXlnaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/d9UAwX6gd6d3zYrTF5/giphy.gif"
          alt=""
          aria-hidden="true"
          className="watermark-center"
        />
      )}

      <motion.main
        className="login-card glass"
        initial={{ opacity: 0, y: 18, scale: 0.996 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.36, ease: "easeOut" }}
        role="main"
      >
        <header className="login-header" aria-hidden>
          <div className="logo-and-title">
            <div className="logo-bubble">
              <LogIn size={18} />
            </div>
            <div>
              <h1 className="title" style={{ margin: 0 }}>
                Welcome back
              </h1>
              <div className="subtitle">Sign in to your Rental Admin account</div>
            </div>
          </div>
        </header>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}

          <label className="field">
            <div className="field-label">
              <Mail size={14} className="field-icon" />
              <span className="label-text">Email</span>
            </div>
            <input
              ref={emailRef}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@company.com"
              required
              aria-label="Email"
            />
          </label>

          <label className="field">
            <div className="field-label">
              <Lock size={14} className="field-icon" />
              <span className="label-text">Password</span>
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="pw-toggle"
                aria-pressed={showPw}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPw ? "text" : "password"}
              placeholder="Enter your password"
              required
              aria-label="Password"
              autoComplete="current-password"
            />
          </label>

          <div className="row-between">
            <label className="remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                aria-label="Remember me"
              />{" "}
              Remember me
            </label>

            <button
              type="button"
              className="link-like"
              onClick={() => alert("Implement forgot password flow")}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
            aria-disabled={loading}
          >
            {loading ? <span className="spinner" aria-hidden /> : <><LogIn size={16} /> Sign in</>}
          </button>

          <div className="signup-note">
            <small>Only Admins and Managers can sign in here.</small>
          </div>
        </form>
      </motion.main>
    </div>
  );
}
