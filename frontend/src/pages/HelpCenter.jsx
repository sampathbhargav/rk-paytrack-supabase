import { useEffect, useMemo, useState } from "react";

function HelpCenter() {
  const [activeArticle, setActiveArticle] = useState("gettingStarted");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 820 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 820);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const selectedArticle =
    articles.find((article) => article.id === activeArticle) || articles[0];

  const categories = [
    "All",
    ...new Set(articles.map((article) => article.category)),
  ];

  const filteredArticles = useMemo(() => {
    const text = search.trim().toLowerCase();

    return articles.filter((article) => {
      const matchesCategory =
        categoryFilter === "All" || article.category === categoryFilter;

      const searchableText = [
        article.title,
        article.summary,
        article.category,
        ...article.sections.map((section) => section.heading),
        ...article.sections.map((section) => section.text),
        ...article.sections.flatMap((section) => section.items || []),
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

  return (
    <div style={isMobile ? mobilePageWrapper : pageWrapper}>
      <div style={isMobile ? mobileHeroCard : heroCard}>
        <div>
          <div style={eyebrow}>RK PayTrack Training</div>

          <h1 style={isMobile ? mobilePageTitle : pageTitle}>Help Center</h1>

          <p style={isMobile ? mobilePageDescription : pageDescription}>
            Quick employee training articles for deals, payments, maintenance,
            receipts, promises, reports, and daily workflow.
          </p>

          <div style={isMobile ? mobileHeroPills : heroPills}>
            <span style={heroPill}>Payments</span>
            <span style={heroPill}>Maintenance</span>
            <span style={heroPill}>Receipts</span>
            <span style={heroPill}>Reports</span>
            <span style={heroPill}>Best Practices</span>
          </div>
        </div>

        <div style={isMobile ? mobileHeroStats : heroStats}>
          <div style={isMobile ? mobileHeroStatCard : heroStatCard}>
            <span>Total Articles</span>
            <strong>{articles.length}</strong>
          </div>

          <div style={isMobile ? mobileHeroStatCard : heroStatCard}>
            <span>Categories</span>
            <strong>{categories.length - 1}</strong>
          </div>
        </div>
      </div>

      <div style={quickStartGrid}>
        <QuickStartCard
          icon="🚀"
          title="New Employee Path"
          text="Start with Getting Started, then read Add Payment, Due Schedule, Promises, and Receipts."
        />

        <QuickStartCard
          icon="💵"
          title="Taking Payments"
          text="Use Payment Center for deal payments and maintenance invoice payments."
        />

        <QuickStartCard
          icon="🧾"
          title="Receipts"
          text="Print receipts immediately when a customer asks for proof of payment."
        />

        <QuickStartCard
          icon="⚠️"
          title="Important Rule"
          text="Always verify customer, deal/invoice, amount, date, and method before saving."
        />
      </div>

      <div style={noticeBox}>
        <strong>Tip:</strong> New users should start with{" "}
        <button
          type="button"
          style={inlineArticleButton}
          onClick={() => setActiveArticle("gettingStarted")}
        >
          Getting Started
        </button>{" "}
        and then review payments, maintenance, receipts, promises, due schedule,
        and reports.
      </div>

      <div style={isMobile ? mobileToolbar : toolbar}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search help articles..."
          style={isMobile ? mobileSearchInput : searchInput}
        />

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          style={isMobile ? mobileSelectStyle : selectStyle}
        >
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleClearFilters}
          style={isMobile ? mobileClearButton : clearButton}
        >
          Clear
        </button>
      </div>

      <div style={isMobile ? mobileContentGrid : contentGrid}>
        <aside style={isMobile ? mobileArticleList : articleList}>
          <div style={articleListHeader}>
            <strong>Articles</strong>
            <span>{filteredArticles.length} shown</span>
          </div>

          {filteredArticles.length === 0 ? (
            <div style={emptySearchBox}>
              No articles found. Try clearing the search.
            </div>
          ) : (
            filteredArticles.map((article) => (
              <button
                key={article.id}
                type="button"
                onClick={() => setActiveArticle(article.id)}
                style={{
                  ...(isMobile ? mobileArticleButton : articleButton),
                  ...(activeArticle === article.id ? activeArticleButton : {}),
                }}
              >
                <span style={articleIcon}>{article.icon}</span>

                <span style={articleButtonText}>
                  <strong>{article.title}</strong>
                  <small>{article.category}</small>
                </span>
              </button>
            ))
          )}
        </aside>

        <main style={isMobile ? mobileArticleContent : articleContent}>
          <div style={articleHeader}>
            <div>
              <div style={articleCategoryBadge}>
                {selectedArticle.category}
              </div>

              <h2 style={isMobile ? mobileArticleTitle : articleTitle}>
                <span style={articleTitleIcon}>{selectedArticle.icon}</span>
                {selectedArticle.title}
              </h2>

              <p style={articleSubtitle}>{selectedArticle.summary}</p>
            </div>
          </div>

          <div style={articleBody}>
            {selectedArticle.sections.map((section, index) => (
              <div
                key={section.heading}
                style={isMobile ? mobileSectionBox : sectionBox}
              >
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

          <div style={articleFooter}>
            <strong>Best practice:</strong> Verify customer details, payment
            amount, payment method, date, notes, and balance before saving any
            financial record.
          </div>
        </main>
      </div>
    </div>
  );
}

function QuickStartCard({ icon, title, text }) {
  return (
    <div style={quickStartCard}>
      <div style={quickStartIcon}>{icon}</div>
      <div>
        <h3 style={quickStartTitle}>{title}</h3>
        <p style={quickStartText}>{text}</p>
      </div>
    </div>
  );
}

const articles = [
  {
    id: "gettingStarted",
    title: "Getting Started",
    icon: "🚀",
    category: "Basics",
    summary:
      "A quick overview of RK PayTrack and how employees should use it daily.",
    sections: [
      {
        heading: "What is RK PayTrack?",
        text:
          "RK PayTrack is used to manage dealership deals, customer balances, payments, due schedules, promises, receipts, maintenance invoices, and reports.",
      },
      {
        heading: "Main Things You Can Do",
        text: "Employees can use the system to track customer payment activity.",
        items: [
          "View customer and deal details.",
          "Check balances and monthly payment amounts.",
          "Add deal payments and maintenance payments.",
          "Create promises for partial or delayed payments.",
          "Print receipts, invoices, and account summaries.",
          "Review due payments and past-due accounts.",
          "Export reports for management or accounting.",
        ],
      },
      {
        heading: "Best Practice",
        text:
          "Always review the customer name, deal tag or invoice number, payment amount, payment method, and due date before saving any payment or promise.",
      },
    ],
  },
  {
    id: "paymentCenter",
    title: "Payment Center",
    icon: "💳",
    category: "Payments",
    summary:
      "Explains the Add Payment page and how to choose between deal payments and maintenance payments.",
    sections: [
      {
        heading: "Purpose",
        text:
          "The Payment Center is used to take both deal installment payments and maintenance invoice payments from one screen.",
      },
      {
        heading: "Payment Types",
        text: "Employees should choose the correct payment mode before saving.",
        items: [
          "Use Deal / Installment Payment for customer financing payments.",
          "Use Maintenance Payment for repair or service invoice payments.",
          "Use the receipt prompt after saving to print or view a receipt.",
          "Use notes to explain any special payment situation.",
        ],
      },
      {
        heading: "Important",
        text:
          "Do not record a maintenance payment under a deal payment, and do not record a deal payment under maintenance. The balance will update in the wrong place.",
      },
    ],
  },
  {
    id: "customerDeal",
    title: "Customer Detail Page",
    icon: "👤",
    category: "Customers",
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
    title: "How to Add a Deal Payment",
    icon: "💵",
    category: "Payments",
    summary:
      "Steps employees should follow when entering a customer installment payment.",
    sections: [
      {
        heading: "Before Adding Payment",
        text:
          "Before saving a payment, confirm the customer, deal tag, amount received, payment method, and correct installment due date.",
      },
      {
        heading: "Steps",
        text: "Follow these steps when adding a deal payment.",
        items: [
          "Open Add Payment.",
          "Choose Deal / Installment Payment.",
          "Select the correct customer deal.",
          "Select the correct due installment.",
          "Enter the amount paid.",
          "Choose payment method.",
          "Add notes if needed.",
          "Save the payment.",
          "Print or view the receipt if required.",
        ],
      },
      {
        heading: "Partial Payments",
        text:
          "If the customer pays less than the installment amount, enter the partial amount and provide a promised date for the remaining balance.",
      },
      {
        heading: "Important",
        text:
          "Do not enter fake or estimated payments. Only record payments that were actually received and verified.",
      },
    ],
  },
  {
    id: "maintenancePayments",
    title: "Maintenance Payments",
    icon: "🛠️",
    category: "Maintenance",
    summary:
      "Explains how to take payments for maintenance invoices and repair balances.",
    sections: [
      {
        heading: "Purpose",
        text:
          "Maintenance payments are used when a customer pays for a repair, service job, parts, labor, or other maintenance invoice.",
      },
      {
        heading: "Steps",
        text: "Follow these steps when taking a maintenance payment.",
        items: [
          "Open Add Payment.",
          "Choose Maintenance Payment.",
          "Search for the open maintenance invoice.",
          "Select the correct invoice and customer.",
          "Confirm the balance and invoice details.",
          "Enter the amount paid.",
          "Choose the payment method.",
          "Add notes if needed.",
          "Save the payment.",
          "Print or view the maintenance receipt if required.",
        ],
      },
      {
        heading: "Partial Maintenance Payment",
        text:
          "If the customer pays only part of the maintenance invoice, the remaining balance stays open on that maintenance record.",
      },
      {
        heading: "Important",
        text:
          "Always confirm the invoice number, customer name, work title, and balance before saving a maintenance payment.",
      },
    ],
  },
  {
    id: "maintenanceRecords",
    title: "Maintenance Records",
    icon: "🔧",
    category: "Maintenance",
    summary:
      "Explains the maintenance page and how to manage service or repair records.",
    sections: [
      {
        heading: "Purpose",
        text:
          "The Maintenance page tracks repair invoices, customer information, truck details, technician work, parts, labor, payments, promises, and balances.",
      },
      {
        heading: "Common Actions",
        text: "Employees can manage maintenance work from this page.",
        items: [
          "Add a maintenance record.",
          "Edit a maintenance record.",
          "Take a maintenance payment.",
          "Schedule a maintenance payment promise.",
          "Print a maintenance invoice.",
          "View payment and promise history.",
        ],
      },
      {
        heading: "Best Practice",
        text:
          "Keep job title, work description, labor amount, parts amount, due date, and technician information accurate.",
      },
    ],
  },
  {
    id: "dueSchedule",
    title: "Due Schedule",
    icon: "📆",
    category: "Payments",
    summary: "Explains how to read the monthly installment schedule.",
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
    category: "Payments",
    summary: "Explains how payment promises should be used.",
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
    category: "Receipts",
    summary: "Explains how to print receipts, invoices, and account summaries.",
    sections: [
      {
        heading: "Payment Receipt",
        text:
          "A receipt can be printed after a payment is saved. It shows customer, deal or invoice, payment amount, payment method, date, and remaining balance.",
      },
      {
        heading: "Maintenance Receipt",
        text:
          "A maintenance receipt shows the customer name, invoice number, work title, payment amount, previous balance, and remaining balance.",
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
    category: "Reports",
    summary: "Explains how employees and managers can use reports.",
    sections: [
      {
        heading: "Purpose",
        text:
          "Reports help management review collections, balances, due payments, paid-off deals, defaulted deals, maintenance balances, and payment activity.",
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
          "Maintenance Balances.",
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
    category: "Tools",
    summary: "Explains how to create reminders for customer collections.",
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
    category: "Payments",
    summary: "Explains when and how voiding should be used.",
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
    category: "Best Practices",
    summary:
      "Important mistakes employees should avoid while using RK PayTrack.",
    sections: [
      {
        heading: "Avoid These Mistakes",
        text:
          "Small data entry mistakes can affect balances, due reports, receipts, and customer follow-up.",
        items: [
          "Do not select the wrong customer or deal tag.",
          "Do not select the wrong maintenance invoice.",
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
          "Before saving anything, verify customer name, deal tag or invoice number, payment amount, due date, payment method, and notes.",
      },
    ],
  },
];

const pageWrapper = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
  display: "grid",
  gap: "18px",
};

const mobilePageWrapper = {
  ...pageWrapper,
  gap: "12px",
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

const mobileHeroCard = {
  ...heroCard,
  borderRadius: "18px",
  padding: "18px",
  gap: "14px",
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

const mobilePageTitle = {
  ...pageTitle,
  fontSize: "25px",
};

const pageDescription = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#dbeafe",
  maxWidth: "760px",
  lineHeight: "1.5",
};

const mobilePageDescription = {
  ...pageDescription,
  fontSize: "14px",
};

const heroPills = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "14px",
};

const mobileHeroPills = {
  ...heroPills,
  gap: "6px",
  marginTop: "12px",
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

const mobileHeroStats = {
  ...heroStats,
  width: "100%",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
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

const mobileHeroStatCard = {
  ...heroStatCard,
  minWidth: 0,
  padding: "12px",
};

const quickStartGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "14px",
};

const quickStartCard = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "16px",
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.07)",
};

const quickStartIcon = {
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

const quickStartTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "16px",
};

const quickStartText = {
  margin: "6px 0 0",
  color: "#667085",
  fontSize: "13px",
  lineHeight: "1.45",
};

const noticeBox = {
  background: "#eff6ff",
  color: "#1e3a8a",
  border: "1px solid #bfdbfe",
  padding: "14px",
  borderRadius: "16px",
  lineHeight: "1.5",
  boxShadow: "0 8px 22px rgba(15, 23, 42, 0.05)",
};

const inlineArticleButton = {
  border: "none",
  background: "transparent",
  color: "#1d4ed8",
  fontWeight: "900",
  cursor: "pointer",
  padding: 0,
  textDecoration: "underline",
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

const mobileToolbar = {
  ...toolbar,
  padding: "12px",
  gap: "8px",
};

const searchInput = {
  flex: "1 1 360px",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "11px 13px",
  fontSize: "14px",
  outline: "none",
};

const mobileSearchInput = {
  ...searchInput,
  flex: "1 1 100%",
  width: "100%",
  boxSizing: "border-box",
};

const selectStyle = {
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "11px 13px",
  fontSize: "14px",
  outline: "none",
  background: "white",
};

const mobileSelectStyle = {
  ...selectStyle,
  flex: "1 1 100%",
  width: "100%",
  boxSizing: "border-box",
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

const mobileClearButton = {
  ...clearButton,
  width: "100%",
};

const contentGrid = {
  display: "grid",
  gridTemplateColumns: "320px minmax(0, 1fr)",
  gap: "18px",
  alignItems: "flex-start",
};

const mobileContentGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
  alignItems: "start",
};

const articleList = {
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

const mobileArticleList = {
  ...articleList,
  position: "static",
  top: "auto",
  maxHeight: "none",
  overflowY: "visible",
  borderRadius: "18px",
  padding: "10px",
};

const articleListHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  padding: "6px 6px 12px",
  color: "#475569",
  fontSize: "13px",
};

const articleButton = {
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

const mobileArticleButton = {
  ...articleButton,
  padding: "11px",
  marginBottom: "7px",
};

const activeArticleButton = {
  background: "#0A1A2F",
  color: "white",
  borderColor: "#0A1A2F",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.18)",
};

const articleIcon = {
  width: "32px",
  height: "32px",
  borderRadius: "10px",
  background: "#eff6ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const articleButtonText = {
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

const articleContent = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  padding: "24px",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  minWidth: 0,
};

const mobileArticleContent = {
  ...articleContent,
  borderRadius: "18px",
  padding: "16px",
};

const articleHeader = {
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "16px",
  marginBottom: "18px",
};

const articleCategoryBadge = {
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

const articleTitle = {
  margin: 0,
  color: "#111827",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "26px",
};

const mobileArticleTitle = {
  ...articleTitle,
  fontSize: "22px",
  alignItems: "flex-start",
};

const articleTitleIcon = {
  fontSize: "28px",
};

const articleSubtitle = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#667085",
  lineHeight: "1.5",
  maxWidth: "850px",
};

const articleBody = {
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

const mobileSectionBox = {
  ...sectionBox,
  gridTemplateColumns: "1fr",
  gap: "10px",
  padding: "14px",
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

const articleFooter = {
  background: "#fffbeb",
  color: "#92400e",
  border: "1px solid #fde68a",
  borderRadius: "16px",
  padding: "14px",
  marginTop: "18px",
  lineHeight: "1.5",
};

export default HelpCenter;