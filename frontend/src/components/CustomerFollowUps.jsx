import { useEffect, useState } from "react";
import LoadingSpinner from "./LoadingSpinner";
import {
  createCustomerFollowUp,
  getCustomerFollowUps,
  updateCustomerFollowUpStatus,
} from "../api/customerFollowUpsApi";

const todayString = new Date().toISOString().split("T")[0];

const initialForm = {
  followup_type: "Called customer",
  contact_method: "Phone",
  note: "",
  followup_date: todayString,
  next_followup_date: "",
  priority: "Normal",
  status: "Completed",
};

function CustomerFollowUps({
  customerId,
  customerName = "",
  dealId = null,
  maintenanceJobId = null,
}) {
  const [followUps, setFollowUps] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    loadFollowUps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const loadFollowUps = async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      setMessage("");
      setMessageType("");

      const data = await getCustomerFollowUps(customerId);
      setFollowUps(data || []);
    } catch (error) {
      setMessage(error.message || "Unable to load follow-up notes.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field, value) => {
    setMessage("");
    setMessageType("");

    setForm((prev) => {
      const next = {
        ...prev,
        [field]: value,
      };

      if (field === "next_followup_date") {
        next.status = value ? "Needs Follow-up" : "Completed";
      }

      if (field === "followup_type") {
        if (value === "Customer did not answer") {
          next.status = "Needs Follow-up";
        }

        if (value === "Customer disputed amount") {
          next.priority = "High";
          next.status = "Open";
        }
      }

      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!customerId) {
      setMessage("Customer ID is missing.");
      setMessageType("error");
      return;
    }

    if (!form.note.trim()) {
      setMessage("Follow-up note is required.");
      setMessageType("error");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setMessageType("");

      await createCustomerFollowUp({
        customer_id: customerId,
        customer_name: customerName,
        deal_id: dealId,
        maintenance_job_id: maintenanceJobId,
        followup_type: form.followup_type,
        contact_method: form.contact_method,
        note: form.note.trim(),
        followup_date: form.followup_date,
        next_followup_date: form.next_followup_date || null,
        priority: form.priority,
        status: form.status,
      });

      setMessage("Customer follow-up note saved successfully.");
      setMessageType("success");
      setForm(initialForm);
      setShowForm(false);

      await loadFollowUps();
    } catch (error) {
      setMessage(error.message || "Unable to save follow-up note.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      setMessage("");
      setMessageType("");

      await updateCustomerFollowUpStatus(id, status);
      await loadFollowUps();
    } catch (error) {
      setMessage(error.message || "Unable to update follow-up status.");
      setMessageType("error");
    }
  };

  return (
    <div style={wrapperStyle}>
      <div style={headerStyle}>
        <div>
          <div style={eyebrow}>Communication History</div>
          <h2 style={titleStyle}>Customer Follow-Up Notes</h2>
          <p style={descriptionStyle}>
            Track calls, texts, promises, disputes, no answers, and manager notes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          style={primaryButton}
        >
          {showForm ? "Close" : "+ Add Follow-Up"}
        </button>
      </div>

      {message && (
        <div
          style={{
            ...messageBox,
            ...(messageType === "success" ? successMessage : errorMessage),
          }}
        >
          {message}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={formCard}>
          <div style={formGrid}>
            <SelectField
              label="Follow-Up Type"
              value={form.followup_type}
              onChange={(value) => updateForm("followup_type", value)}
              options={[
                "Called customer",
                "Texted customer",
                "Customer promised payment",
                "Customer did not answer",
                "Customer disputed amount",
                "Manager note",
                "Other",
              ]}
            />

            <SelectField
              label="Contact Method"
              value={form.contact_method}
              onChange={(value) => updateForm("contact_method", value)}
              options={["Phone", "Text", "Email", "In Person", "Other"]}
            />

            <InputField
              label="Follow-Up Date"
              type="date"
              value={form.followup_date}
              onChange={(value) => updateForm("followup_date", value)}
            />

            <InputField
              label="Next Follow-Up Date"
              type="date"
              value={form.next_followup_date}
              onChange={(value) => updateForm("next_followup_date", value)}
            />

            <SelectField
              label="Priority"
              value={form.priority}
              onChange={(value) => updateForm("priority", value)}
              options={["Low", "Normal", "High"]}
            />

            <SelectField
              label="Status"
              value={form.status}
              onChange={(value) => updateForm("status", value)}
              options={["Open", "Completed", "Needs Follow-up", "Resolved"]}
            />
          </div>

          <div style={{ marginTop: "14px" }}>
            <label style={labelStyle}>
              Note <span style={requiredMark}>*</span>
            </label>

            <textarea
              value={form.note}
              onChange={(event) => updateForm("note", event.target.value)}
              placeholder="Example: Called customer. No answer. Left voicemail about past due payment."
              style={notesInput}
              required
            />
          </div>

          <div style={buttonRow}>
            <button type="submit" disabled={saving} style={saveButton}>
              {saving ? "Saving..." : "Save Follow-Up Note"}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setForm(initialForm);
                setShowForm(false);
              }}
              style={cancelButton}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingSpinner message="Loading follow-up notes..." height="260px" />
      ) : followUps.length === 0 ? (
        <div style={emptyState}>
          No follow-up notes yet. Add the first call, text, promise, dispute, or
          manager note for this customer.
        </div>
      ) : (
        <div style={timelineStyle}>
          {followUps.map((item) => (
            <div key={item.id} style={timelineItem}>
              <div style={timelineDot(item.priority)} />

              <div style={timelineCard}>
                <div style={timelineTop}>
                  <div>
                    <strong style={followupTypeStyle}>
                      {item.followup_type}
                    </strong>

                    <div style={metaText}>
                      {formatDate(item.followup_date)} ·{" "}
                      {item.contact_method || "Phone"} ·{" "}
                      {item.created_by_email || "User"}
                    </div>
                  </div>

                  <div style={badgeRow}>
                    <span style={priorityBadge(item.priority)}>
                      {item.priority}
                    </span>
                    <span style={statusBadge(item.status)}>{item.status}</span>
                  </div>
                </div>

                <p style={noteText}>{item.note}</p>

                <div style={timelineBottom}>
                  <div>
                    {item.next_followup_date ? (
                      <span style={nextFollowupText}>
                        Next follow-up: {formatDate(item.next_followup_date)}
                      </span>
                    ) : (
                      <span style={mutedText}>No next follow-up date</span>
                    )}
                  </div>

                  <div style={statusActions}>
                    {item.status !== "Completed" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleStatusChange(item.id, "Completed")
                        }
                        style={smallActionButton}
                      >
                        Mark Completed
                      </button>
                    )}

                    {item.status !== "Resolved" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, "Resolved")}
                        style={smallActionButton}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InputField({ label, type = "text", value, onChange }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = String(dateString).split("-");
  if (!year || !month || !day) return dateString;

  return `${month}/${day}/${year}`;
}

const wrapperStyle = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "16px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.07)",
  display: "grid",
  gap: "14px",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  flexWrap: "wrap",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "14px",
};

const eyebrow = {
  color: "#2563eb",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: "6px",
};

const titleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "21px",
};

const descriptionStyle = {
  margin: "6px 0 0",
  color: "#667085",
  fontSize: "14px",
  lineHeight: "1.45",
};

const primaryButton = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "11px 14px",
  cursor: "pointer",
  fontWeight: "900",
};

const formCard = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "14px",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "12px",
};

const labelStyle = {
  display: "block",
  color: "#374151",
  fontSize: "13px",
  fontWeight: "900",
  marginBottom: "6px",
};

const requiredMark = {
  color: "#dc2626",
};

const inputStyle = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  padding: "10px 11px",
  boxSizing: "border-box",
  fontSize: "14px",
  background: "white",
};

const notesInput = {
  ...inputStyle,
  minHeight: "95px",
  resize: "vertical",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  lineHeight: "1.45",
};

const buttonRow = {
  display: "flex",
  gap: "10px",
  marginTop: "14px",
  flexWrap: "wrap",
};

const saveButton = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "11px 14px",
  cursor: "pointer",
  fontWeight: "900",
};

const cancelButton = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  borderRadius: "999px",
  padding: "11px 14px",
  cursor: "pointer",
  fontWeight: "900",
};

const messageBox = {
  padding: "12px",
  borderRadius: "12px",
  fontWeight: "900",
};

const successMessage = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #bbf7d0",
};

const errorMessage = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
};

const emptyState = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  color: "#667085",
  borderRadius: "14px",
  padding: "18px",
  textAlign: "center",
  fontWeight: "800",
};

const timelineStyle = {
  display: "grid",
  gap: "12px",
};

const timelineItem = {
  display: "grid",
  gridTemplateColumns: "18px minmax(0, 1fr)",
  gap: "10px",
};

function timelineDot(priority) {
  return {
    width: "12px",
    height: "12px",
    borderRadius: "999px",
    marginTop: "15px",
    background:
      priority === "High"
        ? "#dc2626"
        : priority === "Low"
        ? "#94a3b8"
        : "#2563eb",
  };
}

const timelineCard = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "13px",
};

const timelineTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
};

const followupTypeStyle = {
  color: "#111827",
  fontSize: "15px",
};

const metaText = {
  color: "#667085",
  fontSize: "12px",
  marginTop: "4px",
};

const badgeRow = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
};

function priorityBadge(priority) {
  const base = {
    borderRadius: "999px",
    padding: "5px 8px",
    fontSize: "11px",
    fontWeight: "900",
    border: "1px solid transparent",
  };

  if (priority === "High") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
      borderColor: "#fecaca",
    };
  }

  if (priority === "Low") {
    return {
      ...base,
      background: "#f1f5f9",
      color: "#475569",
      borderColor: "#e2e8f0",
    };
  }

  return {
    ...base,
    background: "#eff6ff",
    color: "#1d4ed8",
    borderColor: "#bfdbfe",
  };
}

function statusBadge(status) {
  const base = {
    borderRadius: "999px",
    padding: "5px 8px",
    fontSize: "11px",
    fontWeight: "900",
    border: "1px solid transparent",
  };

  if (status === "Completed" || status === "Resolved") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
      borderColor: "#bbf7d0",
    };
  }

  if (status === "Needs Follow-up") {
    return {
      ...base,
      background: "#fef3c7",
      color: "#92400e",
      borderColor: "#fde68a",
    };
  }

  return {
    ...base,
    background: "#fee2e2",
    color: "#991b1b",
    borderColor: "#fecaca",
  };
}

const noteText = {
  color: "#334155",
  lineHeight: "1.5",
  margin: "10px 0",
  whiteSpace: "pre-wrap",
};

const timelineBottom = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
  borderTop: "1px solid #f1f5f9",
  paddingTop: "9px",
};

const nextFollowupText = {
  color: "#92400e",
  fontWeight: "900",
  fontSize: "12px",
};

const mutedText = {
  color: "#94a3b8",
  fontSize: "12px",
};

const statusActions = {
  display: "flex",
  gap: "7px",
  flexWrap: "wrap",
};

const smallActionButton = {
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #d1d5db",
  borderRadius: "999px",
  padding: "6px 9px",
  cursor: "pointer",
  fontWeight: "900",
  fontSize: "11px",
};

export default CustomerFollowUps;