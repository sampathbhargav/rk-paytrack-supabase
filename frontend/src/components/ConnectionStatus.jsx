import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function ConnectionStatus() {
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("Checking database connection...");

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { error } = await supabase.from("deals").select("id").limit(1);

      if (error) {
        setStatus("error");
        setMessage("Unable to connect to RK PayTrack database.");
        return;
      }

      setStatus("connected");
      setMessage("Connected to RK PayTrack database.");
    } catch (error) {
      setStatus("error");
      setMessage("No internet or database connection failed.");
    }
  };

  const style = {
    padding: "10px 14px",
    borderRadius: "8px",
    marginBottom: "20px",
    background:
      status === "connected"
        ? "#dcfce7"
        : status === "error"
        ? "#fee2e2"
        : "#fef9c3",
    color:
      status === "connected"
        ? "#166534"
        : status === "error"
        ? "#991b1b"
        : "#854d0e",
  };

  return <div style={style}>{message}</div>;
}

export default ConnectionStatus;