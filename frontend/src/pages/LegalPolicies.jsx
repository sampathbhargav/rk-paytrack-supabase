import { useMemo, useState } from "react";

function LegalPolicies() {
  const [activePolicy, setActivePolicy] = useState("acceptableUse");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [acknowledged, setAcknowledged] = useState(false);

  const selectedPolicy =
    policies.find((policy) => policy.id === activePolicy) || policies[0];

  const categories = ["All", ...new Set(policies.map((policy) => policy.category))];

  const filteredPolicies = useMemo(() => {
    const text = search.trim().toLowerCase();

    return policies.filter((policy) => {
      const matchesCategory =
        categoryFilter === "All" || policy.category === categoryFilter;

      const searchableText = [
        policy.title,
        policy.category,
        policy.purpose,
        ...policy.sections.map((section) => section.heading),
        ...policy.sections.map((section) => section.text),
        ...policy.sections.flatMap((section) => section.items || []),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !text || searchableText.includes(text);

      return matchesCategory && matchesSearch;
    });
  }, [search, categoryFilter]);

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("All");
  };

  const handlePrintPolicy = () => {
    const html = buildPolicyPrintHtml(selectedPolicy);
    printHtmlWithIframe(html, selectedPolicy.title);
  };

  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <div>
          <div style={eyebrow}>RK PayTrack Governance</div>
          <h1 style={pageTitle}>Legal & Policies</h1>
          <p style={pageDescription}>
            Review internal software use rules, data handling expectations,
            security responsibilities, and payment record policies.
          </p>

          <div style={heroPills}>
            <span style={heroPill}>Internal Use</span>
            <span style={heroPill}>Customer Data</span>
            <span style={heroPill}>Payment Records</span>
            <span style={heroPill}>Security</span>
          </div>
        </div>

        <div style={heroStats}>
          <div style={heroStatCard}>
            <span>Total Policies</span>
            <strong>{policies.length}</strong>
          </div>

          <div style={heroStatCard}>
            <span>Categories</span>
            <strong>{categories.length - 1}</strong>
          </div>
        </div>
      </div>

      <div style={noticeBox}>
        <strong>Important:</strong> These are internal policy templates for RK
        PayTrack usage. Management should review them, and legal counsel should
        approve them before they are treated as final company policy.
      </div>

      <div style={quickPolicyGrid}>
        <QuickPolicyCard
          icon="✅"
          title="Acceptable Use"
          text="Use RK PayTrack only for approved business purposes."
        />

        <QuickPolicyCard
          icon="🔒"
          title="Customer Privacy"
          text="Protect customer names, phone numbers, balances, payments, and notes."
        />

        <QuickPolicyCard
          icon="💵"
          title="Payment Accuracy"
          text="Verify customer, deal, invoice, amount, method, and date before saving."
        />

        <QuickPolicyCard
          icon="🛡️"
          title="Security"
          text="Do not share access, export data without approval, or bypass controls."
        />
      </div>

      <div style={toolbar}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search policies..."
          style={searchInput}
        />

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          style={selectStyle}
        >
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>

        <button type="button" onClick={handleClearFilters} style={clearButton}>
          Clear
        </button>
      </div>

      <div style={contentGrid}>
        <aside style={policyList}>
          <div style={policyListHeader}>
            <strong>Policies</strong>
            <span>{filteredPolicies.length} shown</span>
          </div>

          {filteredPolicies.length === 0 ? (
            <div style={emptySearchBox}>
              No policies found. Try clearing the search.
            </div>
          ) : (
            filteredPolicies.map((policy) => (
              <button
                key={policy.id}
                type="button"
                onClick={() => {
                  setActivePolicy(policy.id);
                  setAcknowledged(false);
                }}
                style={{
                  ...policyButton,
                  ...(activePolicy === policy.id ? activePolicyButton : {}),
                }}
              >
                <span style={policyIcon}>{policy.icon}</span>

                <span style={policyButtonText}>
                  <strong>{policy.title}</strong>
                  <small>{policy.category}</small>
                </span>
              </button>
            ))
          )}
        </aside>

        <main style={policyContent}>
          <div style={policyContentHeader}>
            <div>
              <div style={policyCategoryBadge}>{selectedPolicy.category}</div>

              <h2 style={policyTitle}>
                <span style={policyTitleIcon}>{selectedPolicy.icon}</span>
                {selectedPolicy.title}
              </h2>

              <p style={policySubtitle}>{selectedPolicy.purpose}</p>
            </div>

            <button type="button" onClick={handlePrintPolicy} style={printButton}>
              Print Policy
            </button>
          </div>

          <div style={policyMetaGrid}>
            <PolicyMeta label="Policy Type" value={selectedPolicy.category} />
            <PolicyMeta label="Owner" value="Management / System Admin" />
            <PolicyMeta label="Applies To" value="Authorized RK PayTrack Users" />
            <PolicyMeta label="Review" value="Review before final approval" />
          </div>

          <div style={policyBody}>
            {selectedPolicy.sections.map((section, index) => (
              <div key={section.heading} style={sectionBox}>
                <div style={sectionNumber}>{index + 1}</div>

                <div>
                  <h3 style={sectionHeading}>{section.heading}</h3>
                  <p style={sectionText}>{section.text}</p>

                  {section.items && (
                    <ul style={sectionList}>
                      {section.items.map((item) => (
                        <li key={item} style={sectionListItem}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={acknowledgementBox}>
            <div>
              <h3 style={acknowledgementTitle}>Acknowledgement</h3>
              <p style={acknowledgementText}>
                By using RK PayTrack, users acknowledge that they have read,
                understood, and agree to follow this policy and all related
                company procedures.
              </p>
            </div>

            <label style={acknowledgementCheck}>
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              I reviewed this policy.
            </label>
          </div>

          {acknowledged && (
            <div style={acknowledgedBox}>
              Policy reviewed on {new Date().toLocaleString()}.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function QuickPolicyCard({ icon, title, text }) {
  return (
    <div style={quickPolicyCard}>
      <div style={quickPolicyIcon}>{icon}</div>
      <div>
        <h3 style={quickPolicyTitle}>{title}</h3>
        <p style={quickPolicyText}>{text}</p>
      </div>
    </div>
  );
}

function PolicyMeta({ label, value }) {
  return (
    <div style={policyMetaCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const policies = [
  {
    id: "acceptableUse",
    title: "Acceptable Use Policy",
    icon: "✅",
    category: "System Use",
    purpose:
      "Defines how authorized users may use RK PayTrack and company technology resources.",
    sections: [
      {
        heading: "Purpose",
        text:
          "This policy helps protect company data, customer information, payment records, and dealership operations by setting clear rules for proper system use.",
      },
      {
        heading: "Allowed Use",
        text:
          "Users may access RK PayTrack only for authorized business purposes related to dealership operations, customer accounts, payments, maintenance invoices, reporting, and management review.",
        items: [
          "Use the system only with approved login credentials.",
          "Enter accurate customer, deal, maintenance, payment, and promise information.",
          "Use reports only for legitimate business needs.",
          "Protect customer and company information from unauthorized access.",
          "Print receipts, invoices, and account summaries only for approved business purposes.",
        ],
      },
      {
        heading: "Prohibited Use",
        text:
          "Users must not misuse RK PayTrack or company systems in a way that creates security, privacy, financial, or operational risk.",
        items: [
          "Do not share passwords or login access.",
          "Do not enter false payment, promise, customer, deal, or maintenance information.",
          "Do not export reports for personal or unauthorized use.",
          "Do not attempt to bypass security controls.",
          "Do not delete, alter, or misuse records without authorization.",
          "Do not use another employee’s account.",
        ],
      },
      {
        heading: "Violation",
        text:
          "Violations may result in access removal, management review, disciplinary action, or other appropriate action based on company policy.",
      },
    ],
  },
  {
    id: "termsOfUse",
    title: "Terms of Use",
    icon: "📄",
    category: "System Use",
    purpose:
      "Explains the basic terms users accept when using RK PayTrack.",
    sections: [
      {
        heading: "Authorized Users",
        text:
          "RK PayTrack is intended for authorized company users only. Access may be granted, modified, or removed by management at any time.",
      },
      {
        heading: "System Purpose",
        text:
          "The software is used to manage dealership payment tracking, customer records, deal balances, maintenance invoices, promises, due schedules, receipts, and reports.",
      },
      {
        heading: "User Responsibility",
        text:
          "Users are responsible for entering accurate information and reviewing records carefully before saving payments, promises, deal updates, maintenance records, or exported reports.",
      },
      {
        heading: "No Unauthorized Distribution",
        text:
          "Users may not copy, distribute, resell, or provide access to the software or its data without company approval.",
      },
    ],
  },
  {
    id: "privacyPolicy",
    title: "Privacy Policy",
    icon: "🔒",
    category: "Privacy",
    purpose:
      "Describes how customer and business information should be handled inside RK PayTrack.",
    sections: [
      {
        heading: "Information Stored",
        text:
          "RK PayTrack may store customer names, phone numbers, addresses, vehicle information, VINs, deal details, maintenance invoices, payment records, promise dates, notes, and report data.",
      },
      {
        heading: "Use of Information",
        text:
          "Information should only be used for dealership business purposes such as payment tracking, customer follow-up, maintenance billing, accounting, reporting, and management review.",
      },
      {
        heading: "Confidentiality",
        text:
          "Users must protect customer and company information and must not disclose it to unauthorized people.",
        items: [
          "Do not share customer balances with unauthorized people.",
          "Do not send reports to personal email accounts.",
          "Do not leave exported reports on shared or public computers.",
          "Do not discuss customer financial information outside business needs.",
        ],
      },
      {
        heading: "Data Export",
        text:
          "Exported CSV reports may contain sensitive information. Users must store, share, and delete exported files carefully.",
      },
    ],
  },
  {
    id: "paymentRecords",
    title: "Payment Records Policy",
    icon: "💵",
    category: "Payments",
    purpose:
      "Defines expectations for entering, reviewing, voiding, and protecting payment records.",
    sections: [
      {
        heading: "Payment Accuracy",
        text:
          "Users must verify the customer, deal tag or invoice number, payment amount, payment date, due date, and payment method before saving any payment.",
      },
      {
        heading: "Deal Payments",
        text:
          "Deal payments should be recorded only under the correct customer deal and correct due installment.",
        items: [
          "Select the correct customer deal.",
          "Select the correct due installment.",
          "Enter the actual amount received.",
          "Use notes for special situations or partial payments.",
        ],
      },
      {
        heading: "Maintenance Payments",
        text:
          "Maintenance payments should be recorded only under the correct maintenance invoice.",
        items: [
          "Verify the invoice number.",
          "Verify the customer name and work title.",
          "Confirm the open maintenance balance.",
          "Print or save the maintenance receipt if requested.",
        ],
      },
      {
        heading: "No Estimated Payments",
        text:
          "Users must not enter estimated, expected, or fake payments. Only actual received and verified payments should be recorded.",
      },
    ],
  },
  {
    id: "voidPayment",
    title: "Voiding a Payment",
    icon: "🚫",
    category: "Payments",
    purpose:
      "Explains when voiding should be used instead of deleting payment records.",
    sections: [
      {
        heading: "When to Void",
        text:
          "Void a payment only when it was entered incorrectly, duplicated, or needs to be removed from balance calculations.",
      },
      {
        heading: "Why Void Instead of Delete?",
        text:
          "Voiding keeps a record that the payment existed while excluding it from totals. This helps maintain better audit history.",
      },
      {
        heading: "Void Reason",
        text:
          "Users should enter a clear void reason so management can understand why the payment was voided.",
        items: [
          "Wrong customer selected.",
          "Wrong amount entered.",
          "Duplicate payment entry.",
          "Wrong payment method.",
          "Payment was not actually received.",
        ],
      },
    ],
  },
  {
    id: "dataRetention",
    title: "Data Retention Policy",
    icon: "🗂️",
    category: "Data",
    purpose:
      "Explains how long records should be kept and how they should be handled.",
    sections: [
      {
        heading: "Business Records",
        text:
          "Deal records, maintenance records, payment history, customer notes, promises, invoices, receipts, and reports should be retained according to company recordkeeping needs and applicable business requirements.",
      },
      {
        heading: "Deleted or Voided Records",
        text:
          "Payment records should generally be voided instead of permanently deleted so the business can maintain a clear history of account activity.",
      },
      {
        heading: "Archived Data",
        text:
          "Old, closed, paid-off, cancelled, or defaulted accounts may be archived when they are no longer active but should remain available for business review when needed.",
      },
    ],
  },
  {
    id: "accessControl",
    title: "User Access Policy",
    icon: "👤",
    category: "Access",
    purpose:
      "Defines who should have access to RK PayTrack and what responsibilities come with that access.",
    sections: [
      {
        heading: "Access Approval",
        text:
          "Only approved users should receive access to RK PayTrack. Access should be based on job role and business need.",
      },
      {
        heading: "Least Privilege",
        text:
          "Users should only receive the permissions needed to perform their job duties. Sensitive actions such as deleting, voiding, exporting, or editing financial records should be limited.",
      },
      {
        heading: "Access Removal",
        text:
          "Access should be removed when an employee no longer needs the system, changes roles, or leaves the company.",
      },
      {
        heading: "Account Security",
        text:
          "Users must protect their login credentials and immediately report suspected unauthorized access.",
      },
    ],
  },
  {
    id: "securityPolicy",
    title: "Security Policy",
    icon: "🛡️",
    category: "Security",
    purpose:
      "Outlines basic security expectations for protecting RK PayTrack and its data.",
    sections: [
      {
        heading: "System Security",
        text:
          "The company should use reasonable safeguards to protect customer records, payment data, reports, and system access.",
      },
      {
        heading: "Recommended Controls",
        text:
          "Security controls should be reviewed regularly and improved as the software grows.",
        items: [
          "Use strong passwords.",
          "Enable multi-factor authentication where available.",
          "Restrict database access.",
          "Use role-based permissions.",
          "Review exported reports carefully.",
          "Avoid storing passwords in code.",
          "Keep software dependencies updated.",
          "Package and distribute the Electron app only through approved channels.",
        ],
      },
      {
        heading: "Suspicious Activity",
        text:
          "Users should report unusual system behavior, incorrect records, unauthorized changes, suspicious exports, or suspected security incidents immediately.",
      },
    ],
  },
  {
    id: "backupRecovery",
    title: "Backup & Disaster Recovery Policy",
    icon: "💾",
    category: "Data",
    purpose:
      "Defines expectations for protecting data and restoring operations if something goes wrong.",
    sections: [
      {
        heading: "Backups",
        text:
          "The company should maintain regular backups of important RK PayTrack data, including customers, deals, payments, promises, maintenance records, maintenance payments, and reports.",
      },
      {
        heading: "Recovery",
        text:
          "If the system becomes unavailable, management should have a process to restore access, recover data, and continue critical payment operations.",
      },
      {
        heading: "Testing",
        text:
          "Backups and recovery steps should be tested periodically to confirm that data can actually be restored when needed.",
      },
    ],
  },
  {
    id: "incidentResponse",
    title: "Incident Response Policy",
    icon: "🚨",
    category: "Security",
    purpose:
      "Explains what should happen if there is a suspected security, data, or system incident.",
    sections: [
      {
        heading: "Incident Examples",
        text:
          "An incident may include unauthorized access, missing records, incorrect payment changes, suspicious exports, system failure, or possible data exposure.",
      },
      {
        heading: "Reporting",
        text:
          "Users should immediately report suspected incidents to management or the person responsible for system administration.",
      },
      {
        heading: "Response Steps",
        text:
          "The company should review the issue, preserve important records, limit further damage, correct the problem, and document what happened.",
        items: [
          "Identify what happened.",
          "Limit access if needed.",
          "Review affected records.",
          "Correct incorrect data.",
          "Document the issue.",
          "Improve controls to prevent repeat issues.",
        ],
      },
    ],
  },
  {
    id: "exportPolicy",
    title: "Report Export Policy",
    icon: "📊",
    category: "Reports",
    purpose:
      "Defines safe use of exported reports and customer financial information.",
    sections: [
      {
        heading: "Exported Data",
        text:
          "Reports may include customer names, phone numbers, deal balances, payment history, promises, maintenance balances, and other sensitive business information.",
      },
      {
        heading: "Approved Use",
        text:
          "Reports should be exported only for management review, accounting, reconciliation, collections, or authorized business needs.",
      },
      {
        heading: "Sharing Restrictions",
        text:
          "Users must not share exported reports with unauthorized people or store them in unsafe locations.",
        items: [
          "Do not send reports to personal email accounts.",
          "Do not upload reports to unapproved websites.",
          "Do not leave reports on shared computers.",
          "Delete old exports when they are no longer needed.",
        ],
      },
    ],
  },
  {
    id: "softwareDisclaimer",
    title: "Software Disclaimer",
    icon: "⚠️",
    category: "Disclaimer",
    purpose:
      "Clarifies that users are responsible for reviewing information before making business decisions.",
    sections: [
      {
        heading: "Accuracy",
        text:
          "RK PayTrack helps organize and calculate dealership payment information, but users must verify important records before relying on them for financial, legal, tax, or collection decisions.",
      },
      {
        heading: "No Legal or Tax Advice",
        text:
          "The software does not provide legal, tax, accounting, or financial advice. Management should consult qualified professionals when needed.",
      },
      {
        heading: "User Review Required",
        text:
          "Users should review payment amounts, balances, due dates, promises, exports, invoices, receipts, and reports for accuracy before taking action.",
      },
    ],
  },
];

function printHtmlWithIframe(html, title) {
  const iframe = document.createElement("iframe");

  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";

  document.body.appendChild(iframe);

  const iframeWindow = iframe.contentWindow;
  const iframeDocument = iframeWindow.document;

  iframeDocument.open();
  iframeDocument.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            background: white;
            padding: 28px;
            font-size: 13px;
          }
          .doc {
            max-width: 850px;
            margin: 0 auto;
            border: 1px solid #d1d5db;
            border-radius: 14px;
            padding: 26px;
          }
          .header {
            border-bottom: 4px solid #0A1A2F;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          h1 {
            margin: 0;
            color: #0A1A2F;
            font-size: 26px;
          }
          .subtitle {
            color: #475569;
            line-height: 1.5;
          }
          .meta {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin: 16px 0;
          }
          .box {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 12px;
          }
          .label {
            color: #64748b;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .value {
            font-weight: bold;
          }
          section {
            margin-bottom: 18px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 14px;
          }
          h2 {
            margin: 0 0 8px;
            color: #111827;
            font-size: 18px;
          }
          p {
            line-height: 1.6;
            color: #374151;
          }
          li {
            margin-bottom: 6px;
            line-height: 1.5;
          }
          .ack {
            margin-top: 24px;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            padding: 14px;
          }
          .signature-row {
            margin-top: 38px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 42px;
          }
          .signature-line {
            border-top: 1px solid #111827;
            padding-top: 8px;
            color: #475569;
          }
          .footer {
            margin-top: 28px;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
            color: #64748b;
            font-size: 11px;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);

  iframeDocument.close();

  setTimeout(() => {
    iframeWindow.focus();
    iframeWindow.print();

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }, 500);
}

function buildPolicyPrintHtml(policy) {
  return `
    <div class="doc">
      <div class="header">
        <h1>${escapeHtml(policy.title)}</h1>
        <p class="subtitle">${escapeHtml(policy.purpose)}</p>
      </div>

      <div class="meta">
        <div class="box">
          <div class="label">Category</div>
          <div class="value">${escapeHtml(policy.category)}</div>
        </div>
        <div class="box">
          <div class="label">Applies To</div>
          <div class="value">Authorized RK PayTrack Users</div>
        </div>
        <div class="box">
          <div class="label">Owner</div>
          <div class="value">Management / System Admin</div>
        </div>
        <div class="box">
          <div class="label">Status</div>
          <div class="value">Template - Review Required</div>
        </div>
      </div>

      ${policy.sections
        .map(
          (section) => `
            <section>
              <h2>${escapeHtml(section.heading)}</h2>
              <p>${escapeHtml(section.text)}</p>
              ${
                section.items
                  ? `<ul>${section.items
                      .map((item) => `<li>${escapeHtml(item)}</li>`)
                      .join("")}</ul>`
                  : ""
              }
            </section>
          `
        )
        .join("")}

      <div class="ack">
        <strong>Acknowledgement:</strong>
        <p>
          By using RK PayTrack, users acknowledge that they have read,
          understood, and agree to follow this policy and all related company
          procedures.
        </p>
      </div>

      <div class="signature-row">
        <div class="signature-line">Employee Signature</div>
        <div class="signature-line">Manager Signature</div>
      </div>

      <div class="footer">
        <span>RK PayTrack Legal & Policies</span>
        <span>Generated ${new Date().toLocaleString()}</span>
      </div>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const pageWrapper = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
  display: "grid",
  gap: "18px",
};

const heroCard = {
  background: "linear-gradient(135deg, #0A1A2F 0%, #102A4C 55%, #1d4ed8 100%)",
  borderRadius: "22px",
  padding: "26px",
  color: "white",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  flexWrap: "wrap",
  boxShadow: "0 16px 38px rgba(15, 23, 42, 0.24)",
};

const eyebrow = {
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#bfdbfe",
  marginBottom: "8px",
};

const pageTitle = {
  margin: 0,
  fontSize: "32px",
  lineHeight: "1.1",
  color: "white",
};

const pageDescription = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#dbeafe",
  maxWidth: "760px",
  lineHeight: "1.5",
};

const heroPills = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "14px",
};

const heroPill = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.25)",
  color: "#e0f2fe",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: "900",
};

const heroStats = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const heroStatCard = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.22)",
  borderRadius: "16px",
  padding: "13px 16px",
  minWidth: "120px",
  display: "grid",
  gap: "5px",
};

const noticeBox = {
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
  padding: "14px",
  borderRadius: "16px",
  lineHeight: "1.5",
  boxShadow: "0 8px 22px rgba(15, 23, 42, 0.05)",
};

const quickPolicyGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "14px",
};

const quickPolicyCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "16px",
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.07)",
};

const quickPolicyIcon = {
  width: "44px",
  height: "44px",
  borderRadius: "14px",
  background: "#eff6ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "21px",
  flexShrink: 0,
};

const quickPolicyTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "16px",
};

const quickPolicyText = {
  margin: "6px 0 0",
  color: "#667085",
  fontSize: "13px",
  lineHeight: "1.45",
};

const toolbar = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "14px",
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
};

const searchInput = {
  flex: "1 1 360px",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "11px 13px",
  fontSize: "14px",
  outline: "none",
};

const selectStyle = {
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "11px 13px",
  fontSize: "14px",
  outline: "none",
  background: "white",
};

const clearButton = {
  border: "none",
  borderRadius: "12px",
  background: "#e5e7eb",
  color: "#111827",
  padding: "11px 14px",
  cursor: "pointer",
  fontWeight: "900",
};

const contentGrid = {
  display: "grid",
  gridTemplateColumns: "320px minmax(0, 1fr)",
  gap: "18px",
  alignItems: "flex-start",
};

const policyList = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  padding: "12px",
  boxShadow: "0 10px 26px rgba(15, 23, 42, 0.07)",
  position: "sticky",
  top: "20px",
  maxHeight: "calc(100vh - 40px)",
  overflowY: "auto",
};

const policyListHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  padding: "6px 6px 12px",
  color: "#475569",
  fontSize: "13px",
};

const policyButton = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "11px",
  background: "transparent",
  border: "1px solid transparent",
  borderRadius: "14px",
  padding: "12px",
  cursor: "pointer",
  textAlign: "left",
  color: "#374151",
  fontWeight: "900",
  marginBottom: "6px",
};

const activePolicyButton = {
  background: "#0A1A2F",
  color: "white",
  borderColor: "#0A1A2F",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.18)",
};

const policyIcon = {
  width: "32px",
  height: "32px",
  borderRadius: "10px",
  background: "#eff6ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const policyButtonText = {
  display: "grid",
  gap: "3px",
};

const emptySearchBox = {
  border: "1px dashed #cbd5e1",
  borderRadius: "14px",
  padding: "18px",
  color: "#667085",
  textAlign: "center",
  lineHeight: "1.5",
};

const policyContent = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  padding: "24px",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  minWidth: 0,
};

const policyContentHeader = {
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "16px",
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const policyCategoryBadge = {
  display: "inline-flex",
  width: "fit-content",
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  padding: "7px 11px",
  fontSize: "12px",
  fontWeight: "900",
  marginBottom: "10px",
};

const policyTitle = {
  margin: 0,
  color: "#111827",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "26px",
};

const policyTitleIcon = {
  fontSize: "28px",
};

const policySubtitle = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#667085",
  lineHeight: "1.5",
  maxWidth: "850px",
};

const printButton = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: "900",
};

const policyMetaGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "12px",
  marginBottom: "18px",
};

const policyMetaCard = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "12px",
  display: "grid",
  gap: "5px",
  color: "#111827",
};

const policyBody = {
  display: "grid",
  gap: "16px",
};

const sectionBox = {
  display: "grid",
  gridTemplateColumns: "38px minmax(0, 1fr)",
  gap: "14px",
  padding: "16px",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  background: "#ffffff",
};

const sectionNumber = {
  width: "38px",
  height: "38px",
  borderRadius: "14px",
  background: "#0A1A2F",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
};

const sectionHeading = {
  margin: 0,
  marginBottom: "8px",
  color: "#111827",
  fontSize: "17px",
};

const sectionText = {
  margin: 0,
  color: "#374151",
  lineHeight: "1.6",
};

const sectionList = {
  marginTop: "10px",
  color: "#374151",
  lineHeight: "1.6",
};

const sectionListItem = {
  marginBottom: "6px",
};

const acknowledgementBox = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "16px",
  marginTop: "20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  flexWrap: "wrap",
};

const acknowledgementTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "17px",
};

const acknowledgementText = {
  margin: "8px 0 0",
  color: "#374151",
  lineHeight: "1.6",
  maxWidth: "760px",
};

const acknowledgementCheck = {
  background: "white",
  border: "1px solid #d1d5db",
  borderRadius: "999px",
  padding: "10px 13px",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  cursor: "pointer",
  fontWeight: "900",
  color: "#111827",
};

const acknowledgedBox = {
  marginTop: "12px",
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #86efac",
  borderRadius: "14px",
  padding: "12px",
  fontWeight: "900",
};

export default LegalPolicies;