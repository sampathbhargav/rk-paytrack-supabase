import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import loginLogo from "../assets/login-logo.png";

function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from?.pathname || "/";

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateForm = (field, value) => {
    setError("");
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      await signIn({
        email: form.email,
        password: form.password,
      });

      navigate(redirectTo, { replace: true });
    } catch (error) {
      setError(error.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageWrapper}>
      <div style={loginShell}>
        <div style={brandPanel}>
          <div style={logoCard}>
            <img src={loginLogo} alt="RK PayTrack Logo" style={logoStyle} />
          </div>

          <div style={brandContent}>
            <div style={brandBadge}>RK PAYTRACK</div>

            <h1 style={brandTitle}>Welcome to RK PayTrack</h1>

            <p style={brandDescription}>
              Securely manage financed deals, customer payments, promises,
              maintenance balances, and account follow-up in one place.
            </p>

            <div style={featureGrid}>
              <FeatureItem
                title="Customer Tracking"
                text="Track deals, balances, due dates, and payment history."
              />
              <FeatureItem
                title="Payment Management"
                text="Record full, partial, promised, and maintenance payments."
              />
              <FeatureItem
                title="Daily Follow-Up"
                text="Quickly review due today, past due, and broken promises."
              />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={loginCard}>
          <div style={cardHeader}>
            <div style={miniLogoWrap}>
              <img src={loginLogo} alt="RK PayTrack" style={miniLogoStyle} />
            </div>

            <h2 style={cardTitle}>Sign In</h2>
            <p style={cardDescription}>
              Enter your email and password to access RK PayTrack.
            </p>
          </div>

          {error && <div style={errorBox}>{error}</div>}

          <div style={fieldGroup}>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateForm("email", event.target.value)}
              placeholder="name@company.com"
              style={inputStyle}
              autoComplete="email"
              required
            />
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Password</label>

            <div style={passwordWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => updateForm("password", event.target.value)}
                placeholder="Enter your password"
                style={passwordInput}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={showButton}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...loginButton,
              opacity: loading ? 0.75 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>

          <div style={loginNote}>
            This system is intended only for authorized RK Truck & Trailer Sales
            users.
          </div>
        </form>
      </div>
    </div>
  );
}

function FeatureItem({ title, text }) {
  return (
    <div style={featureItem}>
      <div style={featureDot}>✓</div>
      <div>
        <h3 style={featureTitle}>{title}</h3>
        <p style={featureText}>{text}</p>
      </div>
    </div>
  );
}

const pageWrapper = {
  minHeight: "100vh",
  width: "100%",
  background:
    "radial-gradient(circle at top left, rgba(37, 99, 235, 0.22), transparent 35%), linear-gradient(135deg, #081323 0%, #0A1A2F 45%, #1d4ed8 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  boxSizing: "border-box",
};

const loginShell = {
  width: "100%",
  maxWidth: "1120px",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.2fr) 430px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: "28px",
  overflow: "hidden",
  boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
  backdropFilter: "blur(8px)",
};

const brandPanel = {
  padding: "42px",
  color: "white",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: "26px",
  minHeight: "560px",
};

const logoCard = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "22px",
  padding: "22px",
  width: "fit-content",
  boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
};

const logoStyle = {
  width: "260px",
  maxWidth: "100%",
  height: "auto",
  display: "block",
  objectFit: "contain",
};

const brandContent = {
  maxWidth: "620px",
};

const brandBadge = {
  width: "fit-content",
  background: "rgba(255,255,255,0.14)",
  border: "1px solid rgba(255,255,255,0.28)",
  borderRadius: "999px",
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "0.08em",
  marginBottom: "14px",
};

const brandTitle = {
  margin: 0,
  fontSize: "42px",
  lineHeight: "1.08",
  color: "white",
};

const brandDescription = {
  marginTop: "14px",
  color: "#dbeafe",
  lineHeight: "1.6",
  fontSize: "15px",
};

const featureGrid = {
  display: "grid",
  gap: "14px",
  marginTop: "26px",
};

const featureItem = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "16px",
  padding: "14px",
};

const featureDot = {
  width: "24px",
  height: "24px",
  borderRadius: "999px",
  background: "#22c55e",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  flexShrink: 0,
};

const featureTitle = {
  margin: 0,
  color: "white",
  fontSize: "15px",
};

const featureText = {
  margin: "5px 0 0",
  color: "#dbeafe",
  fontSize: "13px",
  lineHeight: "1.45",
};

const loginCard = {
  background: "white",
  padding: "34px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const cardHeader = {
  marginBottom: "22px",
  textAlign: "center",
};

const miniLogoWrap = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "14px",
};

const miniLogoStyle = {
  width: "180px",
  height: "auto",
  objectFit: "contain",
  display: "block",
};

const cardTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "28px",
};

const cardDescription = {
  margin: "8px 0 0",
  color: "#667085",
  lineHeight: "1.45",
  fontSize: "14px",
};

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "12px",
  padding: "12px",
  marginBottom: "16px",
  fontWeight: "800",
};

const fieldGroup = {
  display: "grid",
  gap: "7px",
  marginBottom: "16px",
};

const labelStyle = {
  color: "#374151",
  fontWeight: "900",
  fontSize: "13px",
};

const inputStyle = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: "13px",
  padding: "12px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const passwordWrapper = {
  display: "flex",
  border: "1px solid #d1d5db",
  borderRadius: "13px",
  overflow: "hidden",
  background: "white",
};

const passwordInput = {
  flex: 1,
  border: "none",
  padding: "12px",
  fontSize: "14px",
  outline: "none",
};

const showButton = {
  border: "none",
  borderLeft: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#0A1A2F",
  padding: "0 12px",
  cursor: "pointer",
  fontWeight: "900",
};

const loginButton = {
  background: "linear-gradient(135deg, #0A1A2F 0%, #1d4ed8 100%)",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "14px 16px",
  fontWeight: "900",
  cursor: "pointer",
  marginTop: "6px",
  boxShadow: "0 10px 22px rgba(29, 78, 216, 0.25)",
};

const loginNote = {
  marginTop: "16px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
  color: "#667085",
  fontSize: "12px",
  lineHeight: "1.45",
  textAlign: "center",
};

export default Login;