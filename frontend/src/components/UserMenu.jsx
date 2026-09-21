import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { PAYMENT_OPERATION_CHANGED } from "../api/paymentOperationsApi";

function UserMenu({ compact = false }) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [error, setError] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const busy = useRef(false);
  const wrapper = useRef(null);
  const trigger = useRef(null);

  useEffect(() => {
    if (!open) return;
    const refresh = () => {
      try {
        setPaymentNotice(localStorage.getItem(`rk-payment-intent-v1:${user.id}`)
          ? "A payment needs confirmation. You can sign out safely. Sign back in with this account on this browser and use Recover Payment before entering it again."
          : "");
      } catch {
        setPaymentNotice("Payment recovery status could not be checked. If a payment was unconfirmed, use Recover Payment after signing back in.");
      }
    };
    const outside = event => {
      if (!wrapper.current?.contains(event.target) && !busy.current) {
        setOpen(false);
        setConfirmAll(false);
      }
    };
    const escape = event => {
      if (event.key === "Escape" && !busy.current) {
        setOpen(false);
        setConfirmAll(false);
        trigger.current?.focus();
      }
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(PAYMENT_OPERATION_CHANGED, refresh);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(PAYMENT_OPERATION_CHANGED, refresh);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, user?.id]);

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

  const handleSignOut = async (allDevices = false) => {
    if (busy.current) return;
    busy.current = true;
    try {
      setSigningOut(true);
      setError("");
      await signOut({ allDevices });
    } catch (error) {
      setError(`Sign-out was not confirmed. ${error.message || "Check your connection and try again."}`);
    } finally {
      busy.current = false;
      setSigningOut(false);
    }
  };

  return (
    <div ref={wrapper} style={wrapperStyle}>
      <button
        type="button"
        ref={trigger}
        disabled={signingOut}
        onClick={() => { setOpen((prev) => !prev); setConfirmAll(false); setError(""); }}
        style={userButton}
        aria-label={`Account menu for ${displayName}`}
        aria-expanded={open}
      >
        <span style={avatarStyle}>{initials || "RK"}</span>

        {!compact && <span style={{ ...userText, maxWidth: "160px" }}>
          <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</strong>
          <small>Signed in</small>
        </span>}
      </button>

      {open && (
        <div style={dropdownStyle} aria-label="Account actions" aria-busy={signingOut}>
          <div style={dropdownHeader}>
            <strong>{displayName}</strong>
            <span>{user?.email}</span>
          </div>

          {paymentNotice && <p role="status" style={noticeStyle}>{paymentNotice}</p>}
          {error && <p role="alert" style={{ ...noticeStyle, background: "#fef2f2", color: "#991b1b" }}>{error}</p>}
          <button
            type="button"
            onClick={() => handleSignOut(false)}
            disabled={signingOut}
            style={logoutButton}
          >
            <span aria-hidden="true">↪ </span>{signingOut ? "Signing out…" : "Sign out"}
          </button>
          <p style={hintStyle}>This browser only, including its other tabs.</p>
          {!confirmAll ? <button type="button" disabled={signingOut} style={secondaryButton} onClick={() => setConfirmAll(true)}>Sign out all devices</button> : <div style={noticeStyle}>
            <strong>Sign out everywhere?</strong>
            <p>This includes this browser. Other devices may remain active briefly until their access tokens expire. Unsaved form changes may be lost.</p>
            <button type="button" disabled={signingOut} style={logoutButton} onClick={() => handleSignOut(true)}>{signingOut ? "Signing out…" : "Confirm sign out all devices"}</button>
            <button type="button" disabled={signingOut} style={secondaryButton} onClick={() => setConfirmAll(false)}>Cancel</button>
          </div>}
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
  width: "300px",
  maxWidth: "calc(100vw - 32px)",
  maxHeight: "calc(100dvh - 100px)",
  overflowY: "auto",
  boxSizing: "border-box",
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
  overflowWrap: "anywhere",
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

const hintStyle = { fontSize: "12px", color: "#64748b", margin: "8px 0 16px", lineHeight: 1.5 };
const noticeStyle = { padding: "12px", background: "#fffbeb", color: "#78350f", borderRadius: "10px", fontSize: "13px", lineHeight: 1.5 };
const secondaryButton = { width: "100%", background: "transparent", border: "1px solid #cbd5e1", color: "#334155", borderRadius: "10px", padding: "10px", marginTop: "8px", cursor: "pointer", fontWeight: 600 };
