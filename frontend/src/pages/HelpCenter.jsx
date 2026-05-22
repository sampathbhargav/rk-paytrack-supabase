import { useState } from "react";

function HelpCenter() {
  const [activeArticle, setActiveArticle] = useState("gettingStarted");

  const selectedArticle = articles.find(
    (article) => article.id === activeArticle
  );

  return (
    <div style={pageWrapper}>
      <div style={pageHeader}>
        <div>
          <h1 style={pageTitle}>Help Center</h1>
          <p style={pageDescription}>
            Quick training articles for employees and first-time users learning
            how to use RK PayTrack.
          </p>
        </div>
      </div>

      <div style={noticeBox}>
        <strong>Tip:</strong> New users should start with “Getting Started” and
        then read the payment, promise, due schedule, and reports articles.
      </div>

      <div style={contentGrid}>
        <div style={articleList}>
          {articles.map((article) => (
            <button
              key={article.id}
              type="button"
              onClick={() => setActiveArticle(article.id)}
              style={{
                ...articleButton,
                ...(activeArticle === article.id ? activeArticleButton : {}),
              }}
            >
              <span style={articleIcon}>{article.icon}</span>
              <span>{article.title}</span>
            </button>
          ))}
        </div>

        <div style={articleContent}>
          <div style={articleHeader}>
            <h2 style={articleTitle}>
              {selectedArticle.icon} {selectedArticle.title}
            </h2>
            <p style={articleSubtitle}>{selectedArticle.summary}</p>
          </div>

          {selectedArticle.sections.map((section) => (
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
        </div>
      </div>
    </div>
  );
}

const articles = [
  {
    id: "gettingStarted",
    title: "Getting Started",
    icon: "🚀",
    summary:
      "A quick overview of RK PayTrack and how employees should use it daily.",
    sections: [
      {
        heading: "What is RK PayTrack?",
        text:
          "RK PayTrack is used to manage dealership deals, customer balances, payments, due schedules, promises, receipts, and reports.",
      },
      {
        heading: "Main Things You Can Do",
        text: "Employees can use the system to track customer payment activity.",
        items: [
          "View customer deal details.",
          "Check balances and monthly payment amounts.",
          "Add payments.",
          "Create promises for partial or delayed payments.",
          "Print receipts and account summaries.",
          "Review due payments and past-due accounts.",
          "Export reports for management or accounting.",
        ],
      },
      {
        heading: "Best Practice",
        text:
          "Always review the customer name, deal tag, payment amount, and due date before saving any payment or promise.",
      },
    ],
  },
  {
    id: "customerDeal",
    title: "Customer Detail Page",
    icon: "👤",
    summary:
      "Explains the customer detail page and what information employees can find there.",
    sections: [
      {
        heading: "Purpose",
        text:
          "The customer detail page gives a complete view of one customer deal, including balance, payments, promises, due schedule, notes, and receipts.",
      },
      {
        heading: "Important Sections",
        text: "Employees should review these sections carefully.",
        items: [
          "Customer and truck information.",
          "Total amount, total paid, and balance.",
          "Internal deal notes.",
          "Due schedule.",
          "Payment history.",
          "Promise history.",
        ],
      },
      {
        heading: "When to Use This Page",
        text:
          "Use this page when a customer calls, makes a payment, requests a promise date, asks for a receipt, or when management needs account details.",
      },
    ],
  },
  {
    id: "addPayment",
    title: "How to Add a Payment",
    icon: "💵",
    summary:
      "Steps employees should follow when entering a customer payment.",
    sections: [
      {
        heading: "Before Adding Payment",
        text:
          "Before saving a payment, confirm the customer, deal tag, amount received, payment method, and correct installment due date.",
      },
      {
        heading: "Steps",
        text: "Follow these steps when adding a payment.",
        items: [
          "Open the customer deal.",
          "Review the balance and due schedule.",
          "Select the correct installment or due date.",
          "Enter the amount paid.",
          "Choose payment method.",
          "Add notes if needed.",
          "Save the payment.",
          "Print or download the receipt if required.",
        ],
      },
      {
        heading: "Important",
        text:
          "Do not enter fake or estimated payments. Only record payments that were actually received and verified.",
      },
    ],
  },
  {
    id: "dueSchedule",
    title: "Due Schedule",
    icon: "📆",
    summary:
      "Explains how to read the monthly installment schedule.",
    sections: [
      {
        heading: "What the Due Schedule Shows",
        text:
          "The due schedule shows each installment, due date, amount due, amount paid, remaining amount, and current status.",
      },
      {
        heading: "Status Meaning",
        text: "Each installment can have a different status.",
        items: [
          "Paid means the installment is fully paid.",
          "Partial means some money was received but balance remains.",
          "Due means the installment is currently due.",
          "Past Due means the due date has passed and money is still owed.",
          "Promise Pending means the customer promised to pay later.",
          "Promise Broken means the promised date passed without full payment.",
        ],
      },
      {
        heading: "Calendar Reminders",
        text:
          "Use the reminder buttons to create Google Calendar or ICS reminders for unpaid installments.",
      },
    ],
  },
  {
    id: "promises",
    title: "Payment Promises",
    icon: "🤝",
    summary:
      "Explains how payment promises should be used.",
    sections: [
      {
        heading: "What is a Promise?",
        text:
          "A promise is used when a customer cannot fully pay now but gives a future date to pay the remaining amount.",
      },
      {
        heading: "When to Create a Promise",
        text:
          "Create a promise when the customer gives a clear payment date and amount expectation.",
        items: [
          "Customer makes a partial payment.",
          "Customer requests extra time.",
          "Customer gives a specific promised payment date.",
          "Management wants follow-up tracking.",
        ],
      },
      {
        heading: "Important",
        text:
          "Do not create a promise without a clear promised date. Always add notes explaining the customer agreement.",
      },
    ],
  },
  {
    id: "receipts",
    title: "Receipts & Account Summary",
    icon: "🧾",
    summary:
      "Explains how to print receipts and account summaries.",
    sections: [
      {
        heading: "Payment Receipt",
        text:
          "A receipt can be printed from the payment history after a payment is saved. It shows customer, deal, payment amount, payment method, date, and remaining balance.",
      },
      {
        heading: "Account Summary",
        text:
          "The account summary gives a broader view of the customer account, including deal details, total paid, balance, payments, and promises.",
      },
      {
        heading: "Best Practice",
        text:
          "Print or save receipts immediately after payment when the customer requests proof of payment.",
      },
    ],
  },
  {
    id: "reports",
    title: "Reports",
    icon: "📊",
    summary:
      "Explains how employees and managers can use reports.",
    sections: [
      {
        heading: "Purpose",
        text:
          "Reports help management review collections, balances, due payments, paid-off deals, defaulted deals, registration money, and payment activity.",
      },
      {
        heading: "Common Reports",
        text: "The Reports page may include several useful exports.",
        items: [
          "Full Deals Report.",
          "Past Due Scheduled Payments.",
          "Due Today.",
          "Past Due Promises.",
          "Paid Off Deals.",
          "Defaulted Deals.",
          "Registration Money.",
          "Monthly Collection.",
        ],
      },
      {
        heading: "Important",
        text:
          "Exported reports may contain customer and financial information. Do not share them with unauthorized people.",
      },
    ],
  },
  {
    id: "calendarReminders",
    title: "Calendar Reminders",
    icon: "⏰",
    summary:
      "Explains how to create reminders for customer collections.",
    sections: [
      {
        heading: "Purpose",
        text:
          "Calendar reminders help employees remember when to follow up with customers for upcoming or past-due payments.",
      },
      {
        heading: "Reminder Options",
        text:
          "RK PayTrack supports reminder options from the customer page and from individual due schedule rows.",
        items: [
          "Use Google Calendar to open a pre-filled calendar event.",
          "Use ICS download for Apple Calendar, Outlook, or Google Calendar import.",
          "Use Add All reminders to create reminders for all unpaid due dates.",
        ],
      },
      {
        heading: "Best Practice",
        text:
          "Use reminders for customers with upcoming payments, partial payments, promises, or repeated late payments.",
      },
    ],
  },
  {
    id: "voidPayment",
    title: "Voiding a Payment",
    icon: "🚫",
    summary:
      "Explains when and how voiding should be used.",
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
        heading: "Best Practice",
        text:
          "Always enter a clear void reason so management can understand why the payment was voided.",
      },
    ],
  },
  {
    id: "commonMistakes",
    title: "Common Mistakes to Avoid",
    icon: "⚠️",
    summary:
      "Important mistakes employees should avoid while using RK PayTrack.",
    sections: [
      {
        heading: "Avoid These Mistakes",
        text:
          "Small data entry mistakes can affect balances, due reports, receipts, and customer follow-up.",
        items: [
          "Do not select the wrong customer or deal tag.",
          "Do not enter payment under the wrong due date.",
          "Do not forget to mark incorrect payments as voided.",
          "Do not create promises without a promised date.",
          "Do not export reports and share them without approval.",
          "Do not ignore broken promises or past-due installments.",
        ],
      },
      {
        heading: "Best Practice",
        text:
          "Before saving anything, verify customer name, deal tag, payment amount, due date, and notes.",
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
  background: "#eff6ff",
  color: "#1e3a8a",
  border: "1px solid #bfdbfe",
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

const articleList = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "10px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  position: "sticky",
  top: "20px",
};

const articleButton = {
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

const activeArticleButton = {
  background: "#0A1A2F",
  color: "white",
};

const articleIcon = {
  width: "24px",
};

const articleContent = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "22px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const articleHeader = {
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "14px",
  marginBottom: "18px",
};

const articleTitle = {
  margin: 0,
  color: "#111827",
};

const articleSubtitle = {
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

export default HelpCenter;