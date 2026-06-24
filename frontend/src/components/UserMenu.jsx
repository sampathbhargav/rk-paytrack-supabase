import { useState } from "react";
import { useAuth } from "../auth/AuthContext";

function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email ||
    "User";

  const initials = String(displayName)
    .split("@")[0]
    .split(/[.\s_-]+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
    } catch (error) {
      alert(error.message);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div style={wrapperStyle}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={userButton}
      >
        <span style={avatarStyle}>{initials || "RK"}</span>

        <span style={userText}>
          <strong>{displayName}</strong>
          <small>Signed in</small>
        </span>
      </button>

      {open && (
        <div style={dropdownStyle}>
          <div style={dropdownHeader}>
            <strong>{displayName}</strong>
            <span>{user?.email}</span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            style={logoutButton}
          >
            {signingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      )}
    </div>
  );
}

const wrapperStyle = {
  position: "relative",
  display: "inline-flex",
};

const userButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "999px",
  padding: "7px 10px",
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
};

const avatarStyle = {
  width: "34px",
  height: "34px",
  borderRadius: "999px",
  background: "#0A1A2F",
  color: "white",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "900",
};

const userText = {
  display: "grid",
  gap: "1px",
  textAlign: "left",
  color: "#111827",
  fontSize: "12px",
};

const dropdownStyle = {
  position: "absolute",
  right: 0,
  top: "48px",
  width: "260px",
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)",
  padding: "12px",
  zIndex: 9999,
};

const dropdownHeader = {
  display: "grid",
  gap: "4px",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "10px",
  marginBottom: "10px",
  color: "#111827",
  fontSize: "13px",
};

const logoutButton = {
  width: "100%",
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "12px",
  padding: "10px",
  cursor: "pointer",
  fontWeight: "900",
};

export default UserMenu;