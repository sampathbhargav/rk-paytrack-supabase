import { useState } from "react";

function LegalPolicies() {
  const [activePolicy, setActivePolicy] = useState("acceptableUse");

  const selectedPolicy = policies.find((policy) => policy.id === activePolicy);

  return (
    <div style={pageWrapper}>
      <div style={pageHeader}>
        <div>
          <h1 style={pageTitle}>Legal & Policies</h1>
          <p style={pageDescription}>
            Review important software usage terms, user responsibilities, data
            handling rules, and security policies for RK PayTrack.
          </p>
        </div>
      </div>

      <div style={noticeBox}>
        <strong>Important:</strong> These policies are internal templates for
        software use. They should be reviewed by management and legal counsel
        before being treated as final company policy.
      </div>

      <div style={contentGrid}>
        <div style={policyList}>
          {policies.map((policy) => (
            <button
              key={policy.id}
              type="button"
              onClick={() => setActivePolicy(policy.id)}
              style={{
                ...policyButton,
                ...(activePolicy === policy.id ? activePolicyButton : {}),
              }}
            >
              <span style={policyIcon}>{policy.icon}</span>
              <span>{policy.title}</span>
            </button>
          ))}
        </div>

        <div style={policyContent}>
          <div style={policyContentHeader}>
            <h2 style={policyTitle}>
              {selectedPolicy.icon} {selectedPolicy.title}
            </h2>
            <p style={policySubtitle}>{selectedPolicy.purpose}</p>
          </div>

          {selectedPolicy.sections.map((section) => (
            <div key={section.heading} style={sectionBox}>
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
          ))}

          <div style={acknowledgementBox}>
            <h3 style={sectionHeading}>Acknowledgement</h3>
            <p style={sectionText}>
              By using RK PayTrack, users acknowledge that they have read,
              understood, and agree to follow this policy and all related
              company procedures.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const policies = [
  {
    id: "acceptableUse",
    title: "Acceptable Use Policy",
    icon: "✅",
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
          "Users may access RK PayTrack only for authorized business purposes related to dealership operations, customer accounts, payments, reporting, and management review.",
        items: [
          "Use the system only with approved login credentials.",
          "Enter accurate customer, deal, payment, and promise information.",
          "Use reports only for legitimate business needs.",
          "Protect customer and company information from unauthorized access.",
        ],
      },
      {
        heading: "Prohibited Use",
        text:
          "Users must not misuse RK PayTrack or company systems in a way that creates security, privacy, financial, or operational risk.",
        items: [
          "Do not share passwords or login access.",
          "Do not enter false payment, promise, or customer information.",
          "Do not export reports for personal or unauthorized use.",
          "Do not attempt to bypass security controls.",
          "Do not delete, alter, or misuse records without authorization.",
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
          "The software is used to manage dealership payment tracking, customer records, deal balances, promises, due schedules, receipts, and reports.",
      },
      {
        heading: "User Responsibility",
        text:
          "Users are responsible for entering accurate information and reviewing records carefully before saving payments, promises, deal updates, or exported reports.",
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
    purpose:
      "Describes how customer and business information should be handled inside RK PayTrack.",
    sections: [
      {
        heading: "Information Stored",
        text:
          "RK PayTrack may store customer names, phone numbers, addresses, vehicle information, deal details, payment records, promise dates, notes, and report data.",
      },
      {
        heading: "Use of Information",
        text:
          "Information should only be used for dealership business purposes such as payment tracking, customer follow-up, accounting, reporting, and management review.",
      },
      {
        heading: "Confidentiality",
        text:
          "Users must protect customer and company information and must not disclose it to unauthorized people.",
      },
      {
        heading: "Data Export",
        text:
          "Exported CSV reports may contain sensitive information. Users must store, share, and delete exported files carefully.",
      },
    ],
  },
  {
    id: "dataRetention",
    title: "Data Retention Policy",
    icon: "🗂️",
    purpose:
      "Explains how long records should be kept and how they should be handled.",
    sections: [
      {
        heading: "Business Records",
        text:
          "Deal records, payment history, customer notes, promises, and reports should be retained according to company recordkeeping needs and applicable business requirements.",
      },
      {
        heading: "Deleted or Voided Records",
        text:
          "Payment records should generally be voided instead of permanently deleted so the business can maintain a clear history of account activity.",
      },
      {
        heading: "Archived Data",
        text:
          "Old, closed, paid-off, or defaulted accounts may be archived when they are no longer active but should remain available for business review when needed.",
      },
    ],
  },
  {
    id: "accessControl",
    title: "User Access Policy",
    icon: "👤",
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
        ],
      },
      {
        heading: "Suspicious Activity",
        text:
          "Users should report unusual system behavior, incorrect records, unauthorized changes, or suspected security incidents immediately.",
      },
    ],
  },
  {
    id: "backupRecovery",
    title: "Backup & Disaster Recovery Policy",
    icon: "💾",
    purpose:
      "Defines expectations for protecting data and restoring operations if something goes wrong.",
    sections: [
      {
        heading: "Backups",
        text:
          "The company should maintain regular backups of important RK PayTrack data, including deals, customers, payments, promises, and reports.",
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
      },
    ],
  },
  {
    id: "softwareDisclaimer",
    title: "Software Disclaimer",
    icon: "⚠️",
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
          "Users should review payment amounts, balances, due dates, promises, exports, and reports for accuracy before taking action.",
      },
    ],
  },
];

const pageWrapper = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const pageHeader = {
  marginBottom: "18px",
};

const pageTitle = {
  margin: 0,
  color: "#111827",
};

const pageDescription = {
  marginTop: "6px",
  color: "#667085",
  lineHeight: "1.5",
};

const noticeBox = {
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
  padding: "14px",
  borderRadius: "12px",
  marginBottom: "18px",
  lineHeight: "1.5",
};

const contentGrid = {
  display: "grid",
  gridTemplateColumns: "280px 1fr",
  gap: "18px",
  alignItems: "flex-start",
};

const policyList = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "10px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  position: "sticky",
  top: "20px",
};

const policyButton = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  background: "transparent",
  border: "none",
  borderRadius: "10px",
  padding: "12px",
  cursor: "pointer",
  textAlign: "left",
  color: "#374151",
  fontWeight: "bold",
};

const activePolicyButton = {
  background: "#0A1A2F",
  color: "white",
};

const policyIcon = {
  width: "24px",
};

const policyContent = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "22px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const policyContentHeader = {
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "14px",
  marginBottom: "18px",
};

const policyTitle = {
  margin: 0,
  color: "#111827",
};

const policySubtitle = {
  marginTop: "8px",
  color: "#667085",
  lineHeight: "1.5",
};

const sectionBox = {
  marginBottom: "18px",
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
  borderRadius: "12px",
  padding: "16px",
  marginTop: "20px",
};

export default LegalPolicies;