import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function ConnectionStatus() {
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkConnection();

    const handleOnline = () => {
      checkConnection();
    };

    const handleOffline = () => {
      setStatus("error");
      setMessage("No internet connection. RK PayTrack may not save or load data.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = setInterval(() => {
      if (navigator.onLine) {
        checkConnection();
      }
    }, 60000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const checkConnection = async () => {
    try {
      if (!navigator.onLine) {
        setStatus("error");
        setMessage("No internet connection. RK PayTrack may not save or load data.");
        return;
      }

      const { error } = await supabase.from("deals").select("id").limit(1);

      if (error) {
        setStatus("error");
        setMessage("Unable to connect to RK PayTrack database.");
        return;
      }

      setStatus("connected");
      setMessage("");
    } catch (error) {
      setStatus("error");
      setMessage("No internet or database connection failed.");
    }
  };

  if (status !== "error") {
    return null;
  }

  return (
    <div style={style}>
      <div>
        <strong>Connection Problem</strong>
        <p style={messageStyle}>{message}</p>
      </div>

      <button type="button" onClick={checkConnection} style={retryButton}>
        Retry
      </button>
    </div>
  );
}

const style = {
  padding: "12px 14px",
  borderRadius: "12px",
  marginBottom: "16px",
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  fontWeight: "900",
};

const messageStyle = {
  margin: "4px 0 0",
  color: "#991b1b",
  fontSize: "13px",
  fontWeight: "700",
};

const retryButton = {
  background: "#991b1b",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: "900",
};

export default ConnectionStatus;