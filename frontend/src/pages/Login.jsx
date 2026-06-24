import { useEffect, useState } from "react";
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
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 820 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 820);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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
    <div style={isMobile ? mobilePageWrapper : pageWrapper}>
      <div style={isMobile ? mobileLoginShell : loginShell}>
        <div style={isMobile ? mobileBrandPanel : brandPanel}>
          <div style={isMobile ? mobileLogoCard : logoCard}>
            <img
              src={loginLogo}
              alt="RK PayTrack Logo"
              style={isMobile ? mobileLogoStyle : logoStyle}
            />
          </div>

          <div style={isMobile ? mobileBrandContent : brandContent}>
            <div style={isMobile ? mobileBrandBadge : brandBadge}>
              RK PAYTRACK
            </div>

            <h1 style={isMobile ? mobileBrandTitle : brandTitle}>
              Welcome to RK PayTrack
            </h1>

            <p style={isMobile ? mobileBrandDescription : brandDescription}>
              Securely manage financed deals, customer payments, promises,
              maintenance balances, and account follow-up in one place.
            </p>

            <div style={isMobile ? mobileFeatureGrid : featureGrid}>
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

        <form
          onSubmit={handleSubmit}
          style={isMobile ? mobileLoginCard : loginCard}
        >
          <div style={cardHeader}>
            <div style={miniLogoWrap}>
              <img
                src={loginLogo}
                alt="RK PayTrack"
                style={isMobile ? mobileMiniLogoStyle : miniLogoStyle}
              />
            </div>

            <h2 style={isMobile ? mobileCardTitle : cardTitle}>Sign In</h2>

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
              style={isMobile ? mobileInputStyle : inputStyle}
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
                style={isMobile ? mobilePasswordInput : passwordInput}
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
              ...(isMobile ? mobileLoginButton : loginButton),
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

const mobilePageWrapper = {
  ...pageWrapper,
  minHeight: "100dvh",
  alignItems: "flex-start",
  padding: "14px",
  overflowY: "auto",
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

const mobileLoginShell = {
  ...loginShell,
  maxWidth: "460px",
  gridTemplateColumns: "1fr",
  borderRadius: "22px",
  overflow: "hidden",
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

const mobileBrandPanel = {
  ...brandPanel,
  padding: "20px",
  minHeight: "auto",
  gap: "14px",
  alignItems: "center",
  textAlign: "center",
};

const logoCard = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "22px",
  padding: "22px",
  width: "fit-content",
  boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
};

const mobileLogoCard = {
  ...logoCard,
  padding: "12px",
  borderRadius: "18px",
};

const logoStyle = {
  width: "260px",
  maxWidth: "100%",
  height: "auto",
  display: "block",
  objectFit: "contain",
};

const mobileLogoStyle = {
  ...logoStyle,
  width: "180px",
};

const brandContent = {
  maxWidth: "620px",
};

const mobileBrandContent = {
  ...brandContent,
  maxWidth: "100%",
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

const mobileBrandBadge = {
  ...brandBadge,
  margin: "0 auto 10px",
  fontSize: "11px",
  padding: "7px 10px",
};

const brandTitle = {
  margin: 0,
  fontSize: "42px",
  lineHeight: "1.08",
  color: "white",
};

const mobileBrandTitle = {
  ...brandTitle,
  fontSize: "25px",
  lineHeight: "1.15",
};

const brandDescription = {
  marginTop: "14px",
  color: "#dbeafe",
  lineHeight: "1.6",
  fontSize: "15px",
};

const mobileBrandDescription = {
  ...brandDescription,
  marginTop: "10px",
  fontSize: "13px",
  lineHeight: "1.5",
};

const featureGrid = {
  display: "grid",
  gap: "14px",
  marginTop: "26px",
};

const mobileFeatureGrid = {
  display: "none",
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

const mobileLoginCard = {
  ...loginCard,
  padding: "22px",
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

const mobileMiniLogoStyle = {
  ...miniLogoStyle,
  width: "150px",
};

const cardTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "28px",
};

const mobileCardTitle = {
  ...cardTitle,
  fontSize: "24px",
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
  lineHeight: "1.4",
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

const mobileInputStyle = {
  ...inputStyle,
  fontSize: "16px",
  minHeight: "46px",
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
  minWidth: 0,
};

const mobilePasswordInput = {
  ...passwordInput,
  fontSize: "16px",
  minHeight: "46px",
};

const showButton = {
  border: "none",
  borderLeft: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#0A1A2F",
  padding: "0 12px",
  cursor: "pointer",
  fontWeight: "900",
  flexShrink: 0,
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

const mobileLoginButton = {
  ...loginButton,
  minHeight: "48px",
  fontSize: "15px",
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