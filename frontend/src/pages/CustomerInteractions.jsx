import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import { getCustomers } from "../api/customersApi";
import {
  createCustomerFollowUp,
  deleteCustomerFollowUp,
  getAllCustomerFollowUps,
  updateCustomerFollowUp,
  updateCustomerFollowUpStatus,
} from "../api/customerFollowUpsApi";

const getLocalDateString = (dateValue = new Date()) => {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const todayString = getLocalDateString();

const initialForm = {
  customer_id: "",
  customer_search: "",
  followup_type: "Spoke with customer",
  contact_method: "Phone",
  note: "",
  followup_date: todayString,
  next_followup_date: "",
  priority: "Normal",
  status: "Completed",
};

const interactionTypes = [
  "Spoke with customer",
  "Called customer",
  "Customer did not answer",
  "Left voicemail",
  "Texted customer",
  "Customer promised payment",
  "Payment taken",
  "Customer requested callback",
  "Customer disputed amount",
  "Manager note",
  "Other",
];

const quickNotes = [
  {
    label: "No answer",
    type: "Customer did not answer",
    method: "Phone",
    note: "Called customer. No answer.",
    status: "Needs Follow-up",
  },
  {
    label: "Left voicemail",
    type: "Left voicemail",
    method: "Phone",
    note: "Called customer. No answer. Left voicemail requesting a callback.",
    status: "Needs Follow-up",
  },
  {
    label: "Promised payment",
    type: "Customer promised payment",
    method: "Phone",
    note: "Spoke with customer. Customer promised to make a payment soon.",
    status: "Needs Follow-up",
  },
  {
    label: "Payment taken",
    type: "Payment taken",
    method: "Phone",
    note: "Spoke with customer and payment was taken.",
    status: "Completed",
  },
  {
    label: "Requested callback",
    type: "Customer requested callback",
    method: "Phone",
    note: "Spoke with customer. Customer requested a callback.",
    status: "Needs Follow-up",
  },
];

function CustomerFollowUpsPage() {
  const [followUps, setFollowUps] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [activeView, setActiveView] = useState("Today");
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);

  const [expandedNotes, setExpandedNotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadPage();
  }, []);

  const loadPage = async () => {
    try {
      setLoading(true);
      setMessage("");

      const [followUpRows, customerRows] = await Promise.all([
        getAllCustomerFollowUps(),
        getCustomers(),
      ]);

      setFollowUps(followUpRows || []);
      setCustomers(customerRows || []);
    } catch (error) {
      setMessage(error.message || "Unable to load customer interactions.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const customerMap = useMemo(() => {
    return new Map((customers || []).map((customer) => [customer.id, customer]));
  }, [customers]);

  const enrichedFollowUps = useMemo(() => {
    return (followUps || []).map((item) => {
      const customer = customerMap.get(item.customer_id);

      return {
        ...item,
        customer_name: customer?.customer_name || "Unknown Customer",
        company_name: customer?.company_name || "",
        phone: customer?.phone || "",
        email: customer?.email || "",
      };
    });
  }, [followUps, customerMap]);

  const stats = useMemo(() => {
    const todayRows = enrichedFollowUps.filter(
      (item) => item.followup_date === todayString
    );

    const uniqueCustomersToday = new Set(
      todayRows.map((item) => item.customer_id).filter(Boolean)
    ).size;

    const needsFollowUp = enrichedFollowUps.filter((item) => {
      return (
        item.next_followup_date &&
        item.next_followup_date <= todayString &&
        ["Open", "Needs Follow-up"].includes(item.status)
      );
    }).length;

    const promisesToday = todayRows.filter(
      (item) => item.followup_type === "Customer promised payment"
    ).length;

    const noAnswersToday = todayRows.filter((item) =>
      ["Customer did not answer", "Left voicemail"].includes(item.followup_type)
    ).length;

    return {
      today: todayRows.length,
      customersToday: uniqueCustomersToday,
      needsFollowUp,
      promisesToday,
      noAnswersToday,
    };
  }, [enrichedFollowUps]);

  const employeeOptions = useMemo(() => {
    return [
      ...new Set(
        enrichedFollowUps
          .map((item) => item.created_by_email)
          .filter(Boolean)
      ),
    ].sort();
  }, [enrichedFollowUps]);

  const filteredFollowUps = useMemo(() => {
    const q = search.trim().toLowerCase();

    return enrichedFollowUps.filter((item) => {
      if (activeView === "Today" && item.followup_date !== todayString) {
        return false;
      }

      if (
        activeView === "Needs Follow-Up" &&
        !(
          item.next_followup_date &&
          item.next_followup_date <= todayString &&
          ["Open", "Needs Follow-up"].includes(item.status)
        )
      ) {
        return false;
      }

      if (
        activeView === "Promises" &&
        item.followup_type !== "Customer promised payment"
      ) {
        return false;
      }

      if (
        activeView === "No Answer" &&
        !["Customer did not answer", "Left voicemail"].includes(
          item.followup_type
        )
      ) {
        return false;
      }

      if (
        activeView === "Payments" &&
        item.followup_type !== "Payment taken"
      ) {
        return false;
      }

      if (employeeFilter && item.created_by_email !== employeeFilter) {
        return false;
      }

      if (typeFilter && item.followup_type !== typeFilter) {
        return false;
      }

      if (q) {
        const haystack = [
          item.customer_name,
          item.company_name,
          item.phone,
          item.email,
          item.followup_type,
          item.contact_method,
          item.note,
          item.created_by_email,
          item.status,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [
    enrichedFollowUps,
    activeView,
    search,
    employeeFilter,
    typeFilter,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeView, search, employeeFilter, typeFilter, pageSize]);

  const totalPages = Math.max(
    Math.ceil(filteredFollowUps.length / pageSize),
    1
  );

  const safePage = Math.min(currentPage, totalPages);

  const paginatedRows = filteredFollowUps.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const customerMatches = useMemo(() => {
    const q = form.customer_search.trim().toLowerCase();

    if (q.length < 2 || form.customer_id) return [];

    return (customers || [])
      .filter((customer) => {
        const haystack = [
          customer.customer_name,
          customer.company_name,
          customer.phone,
          customer.email,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [customers, form.customer_search, form.customer_id]);

  const selectedCustomer = useMemo(() => {
    return customers.find((customer) => customer.id === form.customer_id) || null;
  }, [customers, form.customer_id]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
    setCustomerSearchOpen(false);
  };

  const openAddForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(true);
    setCustomerSearchOpen(false);
    setMessage("");
    setMessageType("");
  };

  const updateForm = (field, value) => {
    setMessage("");
    setMessageType("");

    setForm((prev) => {
      const next = {
        ...prev,
        [field]: value,
      };

      if (field === "customer_search") {
        next.customer_id = "";
      }

      if (field === "next_followup_date") {
        next.status = value ? "Needs Follow-up" : "Completed";
      }

      if (field === "followup_type") {
        if (
          [
            "Customer did not answer",
            "Left voicemail",
            "Customer requested callback",
          ].includes(value)
        ) {
          next.status = "Needs Follow-up";
        }

        if (value === "Customer disputed amount") {
          next.priority = "High";
          next.status = "Open";
        }

        if (value === "Payment taken") {
          next.status = "Completed";
        }
      }

      return next;
    });
  };

  const applyQuickNote = (template) => {
    setForm((prev) => ({
      ...prev,
      followup_type: template.type,
      contact_method: template.method,
      note: template.note,
      status: template.status,
    }));
  };

  const selectCustomer = (customer) => {
    setForm((prev) => ({
      ...prev,
      customer_id: customer.id,
      customer_search: customer.customer_name || "",
    }));

    setCustomerSearchOpen(false);
  };

  const clearSelectedCustomer = () => {
    setForm((prev) => ({
      ...prev,
      customer_id: "",
      customer_search: "",
    }));

    setCustomerSearchOpen(false);
  };

  const handleEdit = (item) => {
    setForm({
      customer_id: item.customer_id || "",
      customer_search: item.customer_name || "",
      followup_type: item.followup_type || "Spoke with customer",
      contact_method: item.contact_method || "Phone",
      note: item.note || "",
      followup_date: item.followup_date || todayString,
      next_followup_date: item.next_followup_date || "",
      priority: item.priority || "Normal",
      status: item.status || "Completed",
    });

    setEditingId(item.id);
    setShowForm(true);
    setCustomerSearchOpen(false);
    setMessage("");
    setMessageType("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.customer_id) {
      setMessage("Select a customer before saving the interaction.");
      setMessageType("error");
      return;
    }

    if (!form.note.trim()) {
      setMessage("Interaction note is required.");
      setMessageType("error");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

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

        setMessage("Customer interaction updated.");
      } else {
        await createCustomerFollowUp({
          customer_id: form.customer_id,
          customer_name: selectedCustomer?.customer_name || "",
          deal_id: null,
          maintenance_job_id: null,
          followup_type: form.followup_type,
          contact_method: form.contact_method,
          note: form.note.trim(),
          followup_date: form.followup_date,
          next_followup_date: form.next_followup_date || null,
          priority: form.priority,
          status: form.status,
        });

        setMessage("Customer interaction saved.");
      }

      setMessageType("success");
      resetForm();
      await loadPage();
    } catch (error) {
      setMessage(error.message || "Unable to save customer interaction.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const markCompleted = async (item) => {
    try {
      await updateCustomerFollowUpStatus(item.id, "Completed");
      await loadPage();
    } catch (error) {
      setMessage(error.message || "Unable to complete follow-up.");
      setMessageType("error");
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Delete this interaction note for ${item.customer_name}?`
    );

    if (!confirmed) return;

    try {
      await deleteCustomerFollowUp(item.id);
      await loadPage();

      setMessage("Interaction deleted.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Unable to delete interaction.");
      setMessageType("error");
    }
  };

  const toggleNote = (id) => {
    setExpandedNotes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const clearFilters = () => {
    setActiveView("All");
    setSearch("");
    setEmployeeFilter("");
    setTypeFilter("");
  };

  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <div>
          <div style={eyebrow}>Customer Communication</div>
          <h1 style={pageTitle}>Customer Interaction Center</h1>
          <p style={pageDescription}>
            See who was contacted, what happened, what needs another call, and
            keep customer conversation notes in one place.
          </p>
        </div>

        <button type="button" onClick={openAddForm} style={primaryButton}>
          + Add Interaction
        </button>
      </div>

      <div style={statsGrid}>
        <StatCard
          label="Interactions Today"
          value={stats.today}
          helper={`${stats.customersToday} customer${
            stats.customersToday === 1 ? "" : "s"
          } contacted`}
        />

        <StatCard
          label="Needs Follow-Up"
          value={stats.needsFollowUp}
          helper="Due or overdue callbacks"
          danger={stats.needsFollowUp > 0}
        />

        <StatCard
          label="Promises Today"
          value={stats.promisesToday}
          helper="Customer payment promises"
        />

        <StatCard
          label="No Answer Today"
          value={stats.noAnswersToday}
          helper="No answer / voicemail"
        />
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
          <div style={formHeader}>
            <div>
              <h2 style={formTitle}>
                {editingId ? "Edit Interaction" : "Add Customer Interaction"}
              </h2>
              <div style={formHelp}>
                Record the outcome of a call, text, conversation, promise, or
                other customer contact.
              </div>
            </div>

            <button
              type="button"
              onClick={resetForm}
              style={secondaryButton}
              disabled={saving}
            >
              Close
            </button>
          </div>

          <div style={quickNoteSection}>
            <div style={quickNoteLabel}>Quick outcomes</div>

            <div style={quickNoteButtons}>
              {quickNotes.map((template) => (
                <button
                  key={template.label}
                  type="button"
                  onClick={() => applyQuickNote(template)}
                  style={quickNoteButton}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>

          <div style={formGrid}>
            <div style={customerSearchWrapper}>
              <label style={labelStyle}>
                Customer <span style={requiredMark}>*</span>
              </label>

              {selectedCustomer ? (
                <div style={selectedCustomerBox}>
                  <div>
                    <strong>{selectedCustomer.customer_name}</strong>

                    <div style={selectedCustomerMeta}>
                      {[
                        selectedCustomer.company_name,
                        selectedCustomer.phone,
                        selectedCustomer.email,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  </div>

                  {!editingId && (
                    <button
                      type="button"
                      onClick={clearSelectedCustomer}
                      style={smallLinkButton}
                    >
                      Change
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <input
                    value={form.customer_search}
                    onChange={(event) => {
                      updateForm("customer_search", event.target.value);
                      setCustomerSearchOpen(true);
                    }}
                    onFocus={() => setCustomerSearchOpen(true)}
                    placeholder="Search customer, company, phone, email..."
                    style={inputStyle}
                    autoComplete="off"
                  />

                  {customerSearchOpen && customerMatches.length > 0 && (
                    <div style={customerDropdown}>
                      {customerMatches.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => selectCustomer(customer)}
                          style={customerOption}
                        >
                          <strong>{customer.customer_name}</strong>

                          <span style={customerOptionMeta}>
                            {[
                              customer.company_name,
                              customer.phone,
                              customer.email,
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <SelectField
              label="Outcome"
              value={form.followup_type}
              onChange={(value) => updateForm("followup_type", value)}
              options={interactionTypes}
            />

            <SelectField
              label="Method"
              value={form.contact_method}
              onChange={(value) => updateForm("contact_method", value)}
              options={["Phone", "Text", "Email", "In Person", "Other"]}
            />

            <InputField
              label="Interaction Date"
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

          <div style={noteSection}>
            <label style={labelStyle}>
              Interaction Note <span style={requiredMark}>*</span>
            </label>

            <textarea
              value={form.note}
              onChange={(event) => updateForm("note", event.target.value)}
              placeholder="Example: Called customer. He answered and said he will make the payment Friday."
              style={notesInput}
              required
            />

            {form.followup_type === "Payment taken" && (
              <div style={paymentNotice}>
                This note records the conversation only. Use the regular Add
                Payment screen to record the actual payment transaction.
              </div>
            )}
          </div>

          <div style={formActions}>
            <button type="submit" disabled={saving} style={primaryButton}>
              {saving
                ? "Saving..."
                : editingId
                ? "Save Changes"
                : "Save Interaction"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              style={secondaryButton}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={toolbarCard}>
        <div style={viewTabs}>
          {[
            "Today",
            "Needs Follow-Up",
            "All",
            "Promises",
            "No Answer",
            "Payments",
          ].map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              style={{
                ...tabButton,
                ...(activeView === view ? activeTabButton : {}),
              }}
            >
              {view}
            </button>
          ))}
        </div>

        <div style={filtersGrid}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customer, company, note, phone..."
            style={inputStyle}
          />

          <select
            value={employeeFilter}
            onChange={(event) => setEmployeeFilter(event.target.value)}
            style={inputStyle}
          >
            <option value="">All Employees</option>

            {employeeOptions.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            style={inputStyle}
          >
            <option value="">All Outcomes</option>

            {interactionTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <button type="button" onClick={clearFilters} style={secondaryButton}>
            Clear Filters
          </button>
        </div>
      </div>

      <div style={sectionHeader}>
        <div>
          <h2 style={sectionTitle}>{activeView}</h2>
          <div style={sectionSubtitle}>
            {filteredFollowUps.length} interaction
            {filteredFollowUps.length === 1 ? "" : "s"}
          </div>
        </div>

        <select
          value={pageSize}
          onChange={(event) => setPageSize(Number(event.target.value))}
          style={pageSizeSelect}
        >
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner
          message="Loading customer interactions..."
          height="220px"
        />
      ) : filteredFollowUps.length === 0 ? (
        <div style={emptyState}>
          No customer interactions found for this view.
        </div>
      ) : (
        <div style={timeline}>
          {paginatedRows.map((item) => {
            const isExpanded = Boolean(expandedNotes[item.id]);
            const noteIsLong = String(item.note || "").length > 180;
            const due =
              item.next_followup_date &&
              item.next_followup_date <= todayString &&
              ["Open", "Needs Follow-up"].includes(item.status);

            return (
              <div key={item.id} style={interactionCard}>
                <div style={timelineMarkerColumn}>
                  <div style={timelineDot(item.followup_type)} />
                  <div style={timelineLine} />
                </div>

                <div style={interactionContent}>
                  <div style={interactionTopRow}>
                    <div style={customerBlock}>
                      <div style={customerNameRow}>
                        <Link
                          to={`/customers/${item.customer_id}`}
                          style={customerLink}
                        >
                          {item.customer_name}
                        </Link>

                        {item.company_name && (
                          <span style={companyText}>
                            {item.company_name}
                          </span>
                        )}
                      </div>

                      <div style={customerMeta}>
                        {[item.phone, item.email].filter(Boolean).join(" • ")}
                      </div>
                    </div>

                    <div style={dateBlock}>
                      <strong>{formatDate(item.followup_date)}</strong>
                      <span>{formatTime(item.created_at)}</span>
                    </div>
                  </div>

                  <div style={badgeRow}>
                    <span style={typeBadge(item.followup_type)}>
                      {item.followup_type}
                    </span>

                    <span style={neutralBadge}>
                      {item.contact_method || "Phone"}
                    </span>

                    <span style={statusBadge(item.status)}>
                      {item.status || "Completed"}
                    </span>

                    {item.priority === "High" && (
                      <span style={highPriorityBadge}>High Priority</span>
                    )}

                    {due && <span style={dueBadge}>Follow-Up Due</span>}
                  </div>

                  <div
                    style={isExpanded ? expandedNoteStyle : noteStyle}
                    title={item.note || ""}
                  >
                    {item.note || "—"}
                  </div>

                  {noteIsLong && (
                    <button
                      type="button"
                      onClick={() => toggleNote(item.id)}
                      style={smallLinkButton}
                    >
                      {isExpanded ? "Show less" : "Read full note"}
                    </button>
                  )}

                  <div style={interactionFooter}>
                    <div style={interactionMeta}>
                      <span>By: {item.created_by_email || "User"}</span>

                      {item.next_followup_date && (
                        <span>
                          Next follow-up: {formatDate(item.next_followup_date)}
                        </span>
                      )}
                    </div>

                    <div style={rowActions}>
                      <Link
                        to={`/customers/${item.customer_id}`}
                        style={actionLink}
                      >
                        Open Customer
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        style={miniButton}
                      >
                        Edit
                      </button>

                      {item.status !== "Completed" &&
                        item.status !== "Resolved" && (
                          <button
                            type="button"
                            onClick={() => markCompleted(item)}
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
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredFollowUps.length > 0 && (
        <div style={paginationWrapper}>
          <div style={paginationText}>
            Page {safePage} of {totalPages}
          </div>

          <div style={paginationButtons}>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              style={{
                ...secondaryButton,
                ...(safePage <= 1 ? disabledButton : {}),
              }}
            >
              Previous
            </button>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(page + 1, totalPages))
              }
              style={{
                ...secondaryButton,
                ...(safePage >= totalPages ? disabledButton : {}),
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, helper, danger = false }) {
  return (
    <div style={statCard}>
      <div style={statLabel}>{label}</div>
      <div style={{ ...statValue, ...(danger ? { color: "#b42318" } : {}) }}>
        {value}
      </div>
      <div style={statHelper}>{helper}</div>
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

function formatTime(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function timelineDot(type) {
  const base = {
    width: "12px",
    height: "12px",
    borderRadius: "999px",
    marginTop: "6px",
    border: "2px solid white",
    boxShadow: "0 0 0 2px #cbd5e1",
  };

  if (type === "Payment taken") return { ...base, background: "#16a34a" };
  if (type === "Customer promised payment") {
    return { ...base, background: "#2563eb" };
  }
  if (type === "Customer did not answer" || type === "Left voicemail") {
    return { ...base, background: "#d97706" };
  }
  if (type === "Customer disputed amount") {
    return { ...base, background: "#dc2626" };
  }

  return { ...base, background: "#64748b" };
}

function typeBadge(type) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    padding: "4px 8px",
    fontSize: "11px",
    fontWeight: "900",
    border: "1px solid transparent",
  };

  if (type === "Payment taken") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
      borderColor: "#bbf7d0",
    };
  }

  if (type === "Customer promised payment") {
    return {
      ...base,
      background: "#dbeafe",
      color: "#1d4ed8",
      borderColor: "#bfdbfe",
    };
  }

  if (type === "Customer did not answer" || type === "Left voicemail") {
    return {
      ...base,
      background: "#fef3c7",
      color: "#92400e",
      borderColor: "#fde68a",
    };
  }

  if (type === "Customer disputed amount") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
      borderColor: "#fecaca",
    };
  }

  return {
    ...base,
    background: "#f1f5f9",
    color: "#334155",
    borderColor: "#e2e8f0",
  };
}

function statusBadge(status) {
  const base = { ...neutralBadge };

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
      background: "#fff7ed",
      color: "#9a3412",
      borderColor: "#fed7aa",
    };
  }

  return {
    ...base,
    background: "#fee2e2",
    color: "#991b1b",
    borderColor: "#fecaca",
  };
}

const pageWrapper = {
  padding: "20px",
  display: "grid",
  gap: "16px",
  maxWidth: "1500px",
  margin: "0 auto",
};

const heroCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
};

const eyebrow = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const pageTitle = {
  margin: "4px 0 0",
  color: "#0A1A2F",
  fontSize: "28px",
};

const pageDescription = {
  margin: "6px 0 0",
  color: "#64748b",
  maxWidth: "760px",
  lineHeight: 1.5,
  fontSize: "14px",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
};

const statCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "14px",
};

const statLabel = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "800",
};

const statValue = {
  color: "#0A1A2F",
  fontSize: "27px",
  fontWeight: "950",
  marginTop: "4px",
};

const statHelper = {
  color: "#94a3b8",
  fontSize: "11px",
  marginTop: "3px",
};

const primaryButton = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "9px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: "900",
};

const secondaryButton = {
  background: "white",
  color: "#334155",
  border: "1px solid #d1d5db",
  borderRadius: "9px",
  padding: "9px 12px",
  cursor: "pointer",
  fontWeight: "900",
};

const formCard = {
  background: "white",
  border: "1px solid #dbe3ee",
  borderRadius: "16px",
  padding: "16px",
};

const formHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  flexWrap: "wrap",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "12px",
};

const formTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
};

const formHelp = {
  color: "#64748b",
  fontSize: "12px",
  marginTop: "3px",
};

const quickNoteSection = {
  padding: "12px 0",
};

const quickNoteLabel = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
  marginBottom: "7px",
};

const quickNoteButtons = {
  display: "flex",
  gap: "7px",
  flexWrap: "wrap",
};

const quickNoteButton = {
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #dbe3ee",
  borderRadius: "999px",
  padding: "7px 10px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "800",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "10px",
};

const labelStyle = {
  display: "block",
  marginBottom: "5px",
  color: "#374151",
  fontSize: "12px",
  fontWeight: "900",
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
  background: "white",
  color: "#111827",
  fontSize: "13px",
};

const customerSearchWrapper = {
  position: "relative",
};

const customerDropdown = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  zIndex: 30,
  background: "white",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
  overflow: "hidden",
  marginTop: "4px",
};

const customerOption = {
  width: "100%",
  border: "none",
  borderBottom: "1px solid #f1f5f9",
  background: "white",
  padding: "9px 10px",
  textAlign: "left",
  cursor: "pointer",
  display: "grid",
  gap: "2px",
};

const customerOptionMeta = {
  color: "#64748b",
  fontSize: "11px",
};

const selectedCustomerBox = {
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  borderRadius: "9px",
  padding: "8px 10px",
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
  minHeight: "40px",
};

const selectedCustomerMeta = {
  color: "#64748b",
  fontSize: "11px",
  marginTop: "2px",
};

const noteSection = {
  marginTop: "12px",
};

const notesInput = {
  ...inputStyle,
  minHeight: "95px",
  resize: "vertical",
  lineHeight: 1.45,
};

const paymentNotice = {
  marginTop: "6px",
  padding: "7px 9px",
  borderRadius: "8px",
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
  fontSize: "11px",
  fontWeight: "700",
};

const formActions = {
  display: "flex",
  gap: "8px",
  marginTop: "12px",
  flexWrap: "wrap",
};

const toolbarCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "12px",
  display: "grid",
  gap: "10px",
};

const viewTabs = {
  display: "flex",
  gap: "7px",
  flexWrap: "wrap",
};

const tabButton = {
  background: "#f8fafc",
  color: "#475569",
  border: "1px solid #e2e8f0",
  borderRadius: "999px",
  padding: "7px 11px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "900",
};

const activeTabButton = {
  background: "#0A1A2F",
  color: "white",
  borderColor: "#0A1A2F",
};

const filtersGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "8px",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const sectionTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
};

const sectionSubtitle = {
  color: "#64748b",
  fontSize: "12px",
  marginTop: "2px",
};

const pageSizeSelect = {
  ...inputStyle,
  width: "auto",
};

const timeline = {
  display: "grid",
};

const interactionCard = {
  display: "grid",
  gridTemplateColumns: "22px minmax(0, 1fr)",
  gap: "8px",
};

const timelineMarkerColumn = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const timelineLine = {
  width: "2px",
  background: "#e2e8f0",
  flex: 1,
  minHeight: "20px",
};

const interactionContent = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
  marginBottom: "9px",
  minWidth: 0,
};

const interactionTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
};

const customerBlock = {
  minWidth: 0,
};

const customerNameRow = {
  display: "flex",
  alignItems: "baseline",
  gap: "7px",
  flexWrap: "wrap",
};

const customerLink = {
  color: "#0A1A2F",
  fontWeight: "950",
  textDecoration: "none",
  fontSize: "14px",
};

const companyText = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "800",
};

const customerMeta = {
  color: "#94a3b8",
  fontSize: "11px",
  marginTop: "2px",
};

const dateBlock = {
  display: "grid",
  textAlign: "right",
  color: "#475569",
  fontSize: "11px",
  flexShrink: 0,
};

const badgeRow = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
  marginTop: "9px",
};

const neutralBadge = {
  display: "inline-flex",
  alignItems: "center",
  background: "#f8fafc",
  color: "#475569",
  border: "1px solid #e2e8f0",
  borderRadius: "999px",
  padding: "4px 8px",
  fontSize: "11px",
  fontWeight: "800",
};

const highPriorityBadge = {
  ...neutralBadge,
  background: "#fee2e2",
  color: "#991b1b",
  borderColor: "#fecaca",
};

const dueBadge = {
  ...neutralBadge,
  background: "#fff7ed",
  color: "#9a3412",
  borderColor: "#fed7aa",
};

const noteStyle = {
  marginTop: "9px",
  color: "#334155",
  fontSize: "13px",
  lineHeight: 1.45,
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  whiteSpace: "pre-wrap",
};

const expandedNoteStyle = {
  ...noteStyle,
  display: "block",
  WebkitLineClamp: "unset",
  overflow: "visible",
};

const smallLinkButton = {
  background: "transparent",
  color: "#1d4ed8",
  border: "none",
  padding: 0,
  marginTop: "5px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: "900",
};

const interactionFooter = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "9px",
  paddingTop: "8px",
  borderTop: "1px solid #f1f5f9",
};

const interactionMeta = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  color: "#94a3b8",
  fontSize: "11px",
  fontWeight: "700",
};

const rowActions = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
};

const actionLink = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "7px",
  padding: "5px 8px",
  textDecoration: "none",
  fontWeight: "900",
  fontSize: "11px",
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
  background: "#fff1f2",
  color: "#be123c",
  borderColor: "#fecdd3",
};

const emptyState = {
  background: "white",
  border: "1px dashed #cbd5e1",
  borderRadius: "12px",
  padding: "25px",
  textAlign: "center",
  color: "#64748b",
  fontWeight: "800",
};

const paginationWrapper = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const paginationText = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "800",
};

const paginationButtons = {
  display: "flex",
  gap: "7px",
};

const disabledButton = {
  opacity: 0.45,
  cursor: "not-allowed",
};

const messageBox = {
  borderRadius: "9px",
  padding: "10px 12px",
  fontSize: "13px",
  fontWeight: "800",
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

export default CustomerFollowUpsPage;
