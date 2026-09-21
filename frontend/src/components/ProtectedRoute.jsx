import { Navigate, useLocation } from "react-router-dom";
import LoadingSpinner from "./LoadingSpinner";
import { useAuth } from "../auth/AuthContext";

function ProtectedRoute({ children }) {
  const { isLoggedIn, loading, sessionStatus } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={loadingWrapper}>
        <LoadingSpinner message="Checking login session..." height="360px" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location, sessionReason: sessionStatus }} />;
  }

  return <>
    {sessionStatus.startsWith("warning:") && <div role="status" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 10000, maxWidth: "90vw", width: 420, boxSizing: "border-box", padding: 20, background: "#fffbeb", color: "#78350f", border: "1px solid #f59e0b", borderRadius: 12, boxShadow: "0 8px 24px #0002" }}>
      <strong>Session ends in {sessionStatus.split(":")[1]} seconds</strong>
      <p>Activity extends the inactivity timer, but a fresh login is required after 24 hours. Unconfirmed payments remain available in Recover Payment after signing in.</p>
    </div>}
    {children}
  </>;
}

const loadingWrapper = {
  width: "100%",
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f8fafc",
  padding: "24px",
  boxSizing: "border-box",
};

export default ProtectedRoute;
