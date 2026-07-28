import { useEffect, useState } from "react";
import LoadingSpinner from "./LoadingSpinner";
import {
  createCustomerFollowUp,
  deleteCustomerFollowUp,
  getCustomerFollowUps,
  updateCustomerFollowUp,
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
  const [editingId, setEditingId] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

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
      setCurrentPage(1);
    } catch (error) {
      setMessage(error.message || "Unable to load follow-up notes.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
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

  const handleAddNew = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(true);
    setMessage("");
    setMessageType("");
  };

  const handleEdit = (item) => {
    setForm({
      followup_type: item.followup_type || "Called customer",
      contact_method: item.contact_method || "Phone",
      note: item.note || "",
      followup_date: item.followup_date || todayString,
      next_followup_date: item.next_followup_date || "",
      priority: item.priority || "Normal",
      status: item.status || "Completed",
    });

    setEditingId(item.id);
    setShowForm(true);
    setMessage("");
    setMessageType("");
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

      if (editingId) {
        await updateCustomerFollowUp(editingId, {
          followup_type: form.followup_type,
          contact_method: form.contact_method,
          note: form.note.trim(),
          followup_date: form.followup_date,
          next_followup_date: form.next_followup_date || null,
          priority: form.priority,
          status: form.status,
        });

        setMessage("Follow-up note updated.");
      } else {
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

        setMessage("Follow-up note saved.");
      }

      setMessageType("success");
      resetForm();
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

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this follow-up note?"
    );

    if (!confirmed) return;

    try {
      setMessage("");
      setMessageType("");

      await deleteCustomerFollowUp(item.id);

      setMessage("Follow-up note deleted.");
      setMessageType("success");

      if (editingId === item.id) {
        resetForm();
      }

      await loadFollowUps();
    } catch (error) {
      setMessage(error.message || "Unable to delete follow-up note.");
      setMessageType("error");
    }
  };

  const toggleNote = (id) => {
    setExpandedNotes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const totalPages = Math.max(Math.ceil(followUps.length / pageSize), 1);
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pageStart =
    followUps.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;

  const pageEnd = Math.min(safeCurrentPage * pageSize, followUps.length);

  const paginatedFollowUps = followUps.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  const handlePageSizeChange = (value) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  const goToPage = (page) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(nextPage);
  };

  return (
    <div style={wrapperStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>Follow-Up Notes</h2>
          <p style={descriptionStyle}>
            Quick customer notes for calls, texts, promises, and disputes.
          </p>
        </div>

        <button type="button" onClick={handleAddNew} style={primaryButton}>
          + Add Note
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
          <div style={formTitleRow}>
            <strong>{editingId ? "Edit Note" : "Add Note"}</strong>

            <button
              type="button"
              onClick={resetForm}
              style={closeFormButton}
              disabled={saving}
            >
              Close
            </button>
          </div>

          <div style={formGrid}>
            <SelectField
              label="Type"
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
              label="Method"
              value={form.contact_method}
              onChange={(value) => updateForm("contact_method", value)}
              options={["Phone", "Text", "Email", "In Person", "Other"]}
            />

            <InputField
              label="Date"
              type="date"
              value={form.followup_date}
              onChange={(value) => updateForm("followup_date", value)}
            />

            <InputField
              label="Next Follow-Up"
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

          <div style={{ marginTop: "10px" }}>
            <label style={labelStyle}>
              Note <span style={requiredMark}>*</span>
            </label>

            <textarea
              value={form.note}
              onChange={(event) => updateForm("note", event.target.value)}
              placeholder="Example: Called customer. No answer. Left voicemail."
              style={notesInput}
              required
            />
          </div>

          <div style={buttonRow}>
            <button type="submit" disabled={saving} style={saveButton}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Save Note"}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={resetForm}
              style={cancelButton}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingSpinner message="Loading follow-up notes..." height="180px" />
      ) : followUps.length === 0 ? (
        <div style={emptyState}>No follow-up notes yet.</div>
      ) : (
        <>
          <div style={compactList}>
            {paginatedFollowUps.map((item) => {
              const isExpanded = Boolean(expandedNotes[item.id]);
              const noteIsLong = String(item.note || "").length > 120;

              return (
                <div key={item.id} style={compactNoteRow}>
                  <div style={compactNoteMain}>
                    <div style={compactTopLine}>
                      <strong style={compactType}>{item.followup_type}</strong>

                      <span style={compactDate}>
                        {formatDate(item.followup_date)}
                      </span>

                      <span style={statusBadge(item.status)}>
                        {item.status}
                      </span>

                      {item.priority === "High" && (
                        <span style={highPriorityBadge}>High</span>
                      )}
                    </div>

                    <div
                      style={isExpanded ? expandedNoteText : compactNoteText}
                      title={item.note || ""}
                    >
                      {item.note || "—"}
                    </div>

                    <div style={compactMetaLine}>
                      <span>{item.contact_method || "Phone"}</span>

                      {item.next_followup_date && (
                        <span>
                          Next: {formatDate(item.next_followup_date)}
                        </span>
                      )}

                      <span>{item.created_by_email || "User"}</span>

                      {noteIsLong && (
                        <button
                          type="button"
                          onClick={() => toggleNote(item.id)}
                          style={linkButton}
                        >
                          {isExpanded ? "Show less" : "View more"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={compactActions}>
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      style={miniButton}
                    >
                      Edit
                    </button>

                    {item.status !== "Completed" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleStatusChange(item.id, "Completed")
                        }
                        style={miniButton}
                      >
                        Done
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      style={miniDeleteButton}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <PaginationControls
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            totalItems={followUps.length}
            pageStart={pageStart}
            pageEnd={pageEnd}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            onPageChange={goToPage}
          />
        </>
      )}
    </div>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageStart,
  pageEnd,
  pageSize,
  onPageSizeChange,
  onPageChange,
}) {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <div style={paginationWrapper}>
      <div style={paginationInfo}>
        Showing <strong>{pageStart}-{pageEnd}</strong> of{" "}
        <strong>{totalItems}</strong> notes
      </div>

      <div style={paginationActions}>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(event.target.value)}
          style={pageSizeSelect}
        >
          <option value={5}>5 per page</option>
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
        </select>

        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirstPage}
          style={{
            ...pageButton,
            ...(isFirstPage ? disabledPageButton : {}),
          }}
        >
          Prev
        </button>

        <span style={pageBadge}>
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLastPage}
          style={{
            ...pageButton,
            ...(isLastPage ? disabledPageButton : {}),
          }}
        >
          Next
        </button>
      </div>
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

function statusBadge(status) {
  const base = {
    borderRadius: "999px",
    padding: "3px 7px",
    fontSize: "10px",
    fontWeight: "900",
    border: "1px solid transparent",
    whiteSpace: "nowrap",
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

const wrapperStyle = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "14px",
  display: "grid",
  gap: "12px",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "10px",
};

const titleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
};

const descriptionStyle = {
  margin: "4px 0 0",
  color: "#667085",
  fontSize: "13px",
};

const primaryButton = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "9px",
  padding: "9px 12px",
  cursor: "pointer",
  fontWeight: "900",
};

const formCard = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
};

const formTitleRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  marginBottom: "10px",
};

const closeFormButton = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  borderRadius: "8px",
  padding: "6px 9px",
  cursor: "pointer",
  fontWeight: "900",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "10px",
};

const labelStyle = {
  display: "block",
  color: "#374151",
  fontSize: "12px",
  fontWeight: "900",
  marginBottom: "5px",
};

const requiredMark = {
  color: "#dc2626",
};

const inputStyle = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "9px",
  boxSizing: "border-box",
  fontSize: "13px",
  background: "white",
};

const notesInput = {
  ...inputStyle,
  minHeight: "74px",
  resize: "vertical",
  lineHeight: "1.4",
};

const buttonRow = {
  display: "flex",
  gap: "8px",
  marginTop: "10px",
  flexWrap: "wrap",
};

const saveButton = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "9px 12px",
  cursor: "pointer",
  fontWeight: "900",
};

const cancelButton = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  borderRadius: "8px",
  padding: "9px 12px",
  cursor: "pointer",
  fontWeight: "900",
};

const messageBox = {
  padding: "9px 10px",
  borderRadius: "9px",
  fontWeight: "900",
  fontSize: "13px",
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
  borderRadius: "10px",
  padding: "13px",
  textAlign: "center",
  fontWeight: "800",
};

const compactList = {
  display: "grid",
  gap: "7px",
};

const compactNoteRow = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "9px 10px",
  background: "#ffffff",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "10px",
};

const compactNoteMain = {
  minWidth: 0,
  flex: 1,
};

const compactTopLine = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  flexWrap: "wrap",
};

const compactType = {
  color: "#111827",
  fontSize: "13px",
};

const compactDate = {
  color: "#667085",
  fontSize: "12px",
  fontWeight: "800",
};

const compactNoteText = {
  color: "#334155",
  fontSize: "13px",
  lineHeight: "1.35",
  marginTop: "5px",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  whiteSpace: "pre-wrap",
};

const expandedNoteText = {
  ...compactNoteText,
  display: "block",
  WebkitLineClamp: "unset",
  overflow: "visible",
};

const compactMetaLine = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "5px",
  color: "#94a3b8",
  fontSize: "11px",
  fontWeight: "800",
};

const highPriorityBadge = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "999px",
  padding: "3px 7px",
  fontSize: "10px",
  fontWeight: "900",
};

const linkButton = {
  background: "transparent",
  color: "#1d4ed8",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: "900",
};

const compactActions = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  flexShrink: 0,
};

const miniButton = {
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #d1d5db",
  borderRadius: "7px",
  padding: "5px 8px",
  cursor: "pointer",
  fontWeight: "900",
  fontSize: "11px",
};

const miniDeleteButton = {
  ...miniButton,
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
};

const paginationWrapper = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "9px 10px",
};

const paginationInfo = {
  color: "#475569",
  fontSize: "12px",
  fontWeight: "800",
};

const paginationActions = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  flexWrap: "wrap",
};

const pageSizeSelect = {
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "6px 8px",
  background: "white",
  color: "#334155",
  fontSize: "12px",
  fontWeight: "800",
};

const pageButton = {
  background: "white",
  color: "#0A1A2F",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "6px 9px",
  cursor: "pointer",
  fontWeight: "900",
  fontSize: "12px",
};

const disabledPageButton = {
  opacity: 0.45,
  cursor: "not-allowed",
};

const pageBadge = {
  background: "#0A1A2F",
  color: "white",
  borderRadius: "8px",
  padding: "6px 9px",
  fontSize: "12px",
  fontWeight: "900",
};

export default CustomerFollowUps;