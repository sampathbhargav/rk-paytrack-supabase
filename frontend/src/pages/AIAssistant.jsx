import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { askRkAssistant } from "../api/assistantApi";
import { formatMoney } from "../utils/moneyUtils";

const welcomeMessage = {
  role: "assistant",
  text:
    "Hi, I am RK Assistant. Ask me about customer balances, payments, maintenance, collections, promises, reports, or deal history.",
  rows: [],
};

function AIAssistant() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([welcomeMessage]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Collections");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 820 : false
  );

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const activeQuickQuestions = useMemo(() => {
    return (
      quickQuestionGroups.find((group) => group.title === activeCategory)
        ?.questions || []
    );
  }, [activeCategory]);

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

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 80);
  };

  const submitQuestion = async (customQuestion) => {
    const text = String(customQuestion || question).trim();

    if (!text || loading) return;

    setQuestion("");
    setCopiedIndex(null);

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text,
        rows: [],
      },
    ]);

    try {
      setLoading(true);

      const result = await askRkAssistant(text);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: result.answer || "I could not find an answer for that.",
          rows: result.rows || [],
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `I had trouble answering that: ${error.message}`,
          rows: [],
        },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitQuestion();
    }
  };

  const clearChat = () => {
    setMessages([welcomeMessage]);
    setQuestion("");
    setCopiedIndex(null);
    textareaRef.current?.focus();
  };

  const copyMessage = async (message, index) => {
    try {
      const rowText =
        message.rows && message.rows.length > 0
          ? `\n\nRows:\n${message.rows
              .map((row) =>
                Object.entries(row)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(" | ")
              )
              .join("\n")}`
          : "";

      await navigator.clipboard.writeText(`${message.text}${rowText}`);
      setCopiedIndex(index);

      setTimeout(() => {
        setCopiedIndex(null);
      }, 1600);
    } catch {
      setCopiedIndex(null);
    }
  };

  return (
    <div style={isMobile ? mobilePageWrapper : pageWrapper}>
      <div style={isMobile ? mobileHeroCard : heroCard}>
        <div>
          <div style={eyebrow}>RK PayTrack Assistant</div>

          <h1 style={isMobile ? mobilePageTitle : pageTitle}>AI Assistant</h1>

          <p style={isMobile ? mobilePageDescription : pageDescription}>
            Ask business questions about customer balances, payments,
            maintenance invoices, collections, promises, due dates, and deal
            history.
          </p>

          <div style={isMobile ? mobileHeroPills : heroPills}>
            <span style={heroPill}>Collections</span>
            <span style={heroPill}>Deal Balances</span>
            <span style={heroPill}>Maintenance</span>
            <span style={heroPill}>Customer History</span>
          </div>
        </div>

        <div style={isMobile ? mobileHeroRight : heroRight}>
          <div style={isMobile ? mobileStatusPill : statusPill}>
            Private RK Data Assistant
          </div>

          <button type="button" onClick={clearChat} style={clearChatButton}>
            Clear Chat
          </button>
        </div>
      </div>

      <div style={isMobile ? mobileAssistantLayout : assistantLayout}>
        <div style={chatPanel}>
          <div style={isMobile ? mobileChatHeader : chatHeader}>
            <div>
              <h2 style={chatTitle}>Ask RK Assistant</h2>
              <p style={chatSubtitle}>
                Use customer name, phone number, deal tag, invoice number, or
                payment date.
              </p>
            </div>

            <div style={chatStats}>
              <span>{messages.length} messages</span>
            </div>
          </div>

          <div style={isMobile ? mobileMessagesBox : messagesBox}>
            {messages.map((message, index) => (
              <div
                key={index}
                style={
                  message.role === "user"
                    ? userMessageWrapper
                    : assistantMessageWrapper
                }
              >
                <div
                  style={{
                    ...(message.role === "user" ? userBubble : assistantBubble),
                    ...(isMobile ? mobileBubble : {}),
                  }}
                >
                  <div style={messageTopRow}>
                    <div style={messageRole}>
                      {message.role === "user" ? "You" : "RK Assistant"}
                    </div>

                    {message.role === "assistant" && index !== 0 && (
                      <button
                        type="button"
                        onClick={() => copyMessage(message, index)}
                        style={copyButton}
                      >
                        {copiedIndex === index ? "Copied" : "Copy"}
                      </button>
                    )}
                  </div>

                  <div style={messageText}>{message.text}</div>

                  {message.rows && message.rows.length > 0 && (
                    <ResultTable rows={message.rows} isMobile={isMobile} />
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={assistantMessageWrapper}>
                <div
                  style={{
                    ...assistantBubble,
                    ...(isMobile ? mobileBubble : {}),
                  }}
                >
                  <div style={messageRole}>RK Assistant</div>
                  <div style={typingBox}>
                    <span style={typingDot}>●</span>
                    <span style={typingDot}>●</span>
                    <span style={typingDot}>●</span>
                    <span style={typingText}>Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div style={isMobile ? mobileInputBar : inputBar}>
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask: Who owes the most? What is Peter balance? Show maintenance balance for invoice 1001..."
              style={isMobile ? mobileTextareaStyle : textareaStyle}
              rows={isMobile ? 3 : 2}
            />

            <button
              type="button"
              onClick={() => submitQuestion()}
              disabled={loading || !question.trim()}
              style={{
                ...(isMobile ? mobileSendButton : sendButton),
                opacity: loading || !question.trim() ? 0.65 : 1,
                cursor:
                  loading || !question.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Asking..." : "Ask"}
            </button>
          </div>
        </div>

        <aside style={isMobile ? mobileSidePanel : sidePanel}>
          <div style={sideHeader}>
            <h2 style={sideTitle}>Try asking</h2>
            <p style={sideDescription}>
              Click a question to ask it immediately.
            </p>
          </div>

          <div style={isMobile ? mobileCategoryTabs : categoryTabs}>
            {quickQuestionGroups.map((group) => (
              <button
                key={group.title}
                type="button"
                onClick={() => setActiveCategory(group.title)}
                style={{
                  ...categoryTab,
                  ...(activeCategory === group.title ? activeCategoryTab : {}),
                }}
              >
                {group.icon} {group.title}
              </button>
            ))}
          </div>

          <div style={isMobile ? mobileQuickList : quickList}>
            {activeQuickQuestions.map((item) => (
              <button
                key={item}
                type="button"
                style={quickButton}
                onClick={() => submitQuestion(item)}
                disabled={loading}
              >
                {item}
              </button>
            ))}
          </div>

          <div style={tipsBox}>
            <strong>Good question examples</strong>
            <p>“Who owes the most?”</p>
            <p>“Who is past due?”</p>
            <p>“What is deal 1721 balance?”</p>
            <p>“Show maintenance balances.”</p>
            <p>“When did Peter last pay?”</p>
          </div>

          {!isMobile && (
            <div style={shortcutsBox}>
              <strong>Keyboard shortcut</strong>
              <p>Press Enter to ask.</p>
              <p>Press Shift + Enter for a new line.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ResultTable({ rows, isMobile }) {
  const hiddenColumns = ["customer_id", "deal_id", "maintenance_job_id"];

  const columns = Object.keys(rows[0] || {}).filter(
    (column) => !hiddenColumns.includes(column)
  );

  if (columns.length === 0) return null;

  return (
    <div style={isMobile ? mobileResultTableWrapper : resultTableWrapper}>
      <table style={isMobile ? mobileResultTable : resultTable}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} style={resultTh}>
                {formatColumnName(column)}
              </th>
            ))}

            <th style={resultTh}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={column} style={resultTd}>
                  {formatCellValue(column, row[column])}
                </td>
              ))}

              <td style={resultTd}>
                <div style={resultActions}>
                  {row.customer_id && (
                    <Link
                      to={`/customers/${row.customer_id}`}
                      style={resultActionLink}
                    >
                      Customer
                    </Link>
                  )}

                  {row.deal_id && (
                    <Link to={`/deals/${row.deal_id}`} style={resultActionLink}>
                      Deal
                    </Link>
                  )}

                  {row.maintenance_job_id && (
                    <Link to="/maintenance" style={resultActionLink}>
                      Maintenance
                    </Link>
                  )}

                  {!row.customer_id &&
                    !row.deal_id &&
                    !row.maintenance_job_id && (
                      <span style={noActionText}>—</span>
                    )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatColumnName(column) {
  return String(column || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCellValue(column, value) {
  if (value === null || value === undefined || value === "") return "—";

  const lowerColumn = String(column || "").toLowerCase();

  const looksLikeMoney =
    lowerColumn.includes("amount") ||
    lowerColumn.includes("balance") ||
    lowerColumn.includes("paid") ||
    lowerColumn.includes("due") ||
    lowerColumn.includes("total");

  if (looksLikeMoney && !Number.isNaN(Number(value))) {
    return formatMoney(Number(value));
  }

  const looksLikeDate =
    lowerColumn.includes("date") &&
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(value);

  if (looksLikeDate) {
    return formatDisplayDate(value);
  }

  return String(value);
}

function formatDisplayDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = String(dateString).split("-");
  if (!year || !month || !day) return dateString;

  return `${month}/${day}/${year}`;
}

const quickQuestionGroups = [
  {
    title: "Collections",
    icon: "💰",
    questions: [
      "Who owes the most?",
      "Top 10 balances",
      "Who is due today?",
      "Who is past due?",
      "Who has broken promises?",
      "Who has not paid this month?",
      "Collection priority list",
    ],
  },
  {
    title: "Payments",
    icon: "💵",
    questions: [
      "How much collected today?",
      "How much collected this week?",
      "How much collected this month?",
      "How much collected yesterday?",
      "Who paid last week?",
      "Show payments for deal 1721",
      "When did Peter last pay?",
    ],
  },
  {
    title: "Customers",
    icon: "👤",
    questions: [
      "Customer summary for Peter",
      "What is Peter balance?",
      "What is Gary balance?",
      "Show customer payment history",
      "Show customers with open balance",
      "Show paid off customers",
    ],
  },
  {
    title: "Maintenance",
    icon: "🛠️",
    questions: [
      "Show maintenance balances",
      "Who owes maintenance money?",
      "Maintenance due today",
      "Maintenance past due",
      "Show completed maintenance not paid",
      "Show broken maintenance promises",
    ],
  },
  {
    title: "Deals",
    icon: "🚛",
    questions: [
      "What is deal 1721 balance?",
      "Show active deals",
      "Show defaulted deals",
      "Show paid off deals",
      "Show in-house balances",
      "Show down finance balances",
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
  background: "linear-gradient(135deg, #0A1A2F 0%, #102A4C 55%, #7c3aed 100%)",
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
  color: "#ddd6fe",
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
  color: "#ede9fe",
  maxWidth: "780px",
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
  color: "#f5f3ff",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: "900",
};

const heroRight = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
};

const mobileHeroRight = {
  ...heroRight,
  width: "100%",
  justifyContent: "space-between",
};

const statusPill = {
  background: "rgba(255,255,255,0.14)",
  border: "1px solid rgba(255,255,255,0.28)",
  color: "white",
  borderRadius: "999px",
  padding: "10px 13px",
  fontWeight: "900",
  fontSize: "13px",
};

const mobileStatusPill = {
  ...statusPill,
  fontSize: "12px",
  padding: "9px 11px",
};

const clearChatButton = {
  background: "white",
  color: "#0A1A2F",
  border: "none",
  borderRadius: "999px",
  padding: "10px 13px",
  fontWeight: "900",
  cursor: "pointer",
};

const assistantLayout = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 330px",
  gap: "18px",
  alignItems: "start",
};

const mobileAssistantLayout = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
  alignItems: "start",
};

const chatPanel = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  overflow: "hidden",
  minWidth: 0,
};

const chatHeader = {
  padding: "16px",
  borderBottom: "1px solid #e5e7eb",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
};

const mobileChatHeader = {
  ...chatHeader,
  padding: "14px",
};

const chatTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "20px",
};

const chatSubtitle = {
  margin: "6px 0 0",
  color: "#667085",
  fontSize: "14px",
};

const chatStats = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  padding: "8px 11px",
  height: "fit-content",
  fontSize: "12px",
  fontWeight: "900",
};

const messagesBox = {
  height: "590px",
  overflowY: "auto",
  padding: "18px",
  background: "#f8fafc",
};

const mobileMessagesBox = {
  ...messagesBox,
  height: "52dvh",
  minHeight: "340px",
  padding: "12px",
};

const userMessageWrapper = {
  display: "flex",
  justifyContent: "flex-end",
  marginBottom: "14px",
};

const assistantMessageWrapper = {
  display: "flex",
  justifyContent: "flex-start",
  marginBottom: "14px",
};

const userBubble = {
  background: "linear-gradient(135deg, #0A1A2F 0%, #1d4ed8 100%)",
  color: "white",
  borderRadius: "18px 18px 4px 18px",
  padding: "13px",
  maxWidth: "78%",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.18)",
};

const assistantBubble = {
  background: "white",
  color: "#111827",
  border: "1px solid #e5e7eb",
  borderRadius: "18px 18px 18px 4px",
  padding: "13px",
  maxWidth: "92%",
  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.07)",
};

const mobileBubble = {
  maxWidth: "100%",
  width: "fit-content",
  minWidth: 0,
};

const messageTopRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
  marginBottom: "6px",
};

const messageRole = {
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  opacity: 0.72,
};

const copyButton = {
  background: "#f8fafc",
  color: "#475569",
  border: "1px solid #e5e7eb",
  borderRadius: "999px",
  padding: "4px 8px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: "900",
};

const messageText = {
  lineHeight: "1.5",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
};

const typingBox = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
};

const typingDot = {
  color: "#7c3aed",
  fontSize: "9px",
};

const typingText = {
  color: "#667085",
  fontWeight: "800",
  marginLeft: "5px",
};

const inputBar = {
  display: "flex",
  gap: "10px",
  padding: "14px",
  borderTop: "1px solid #e5e7eb",
  background: "white",
};

const mobileInputBar = {
  ...inputBar,
  flexDirection: "column",
  padding: "12px",
};

const textareaStyle = {
  flex: 1,
  border: "1px solid #d1d5db",
  borderRadius: "14px",
  padding: "12px",
  outline: "none",
  resize: "vertical",
  fontFamily: "Arial",
  fontSize: "14px",
  lineHeight: "1.4",
  minWidth: 0,
};

const mobileTextareaStyle = {
  ...textareaStyle,
  width: "100%",
  boxSizing: "border-box",
  minHeight: "92px",
};

const sendButton = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "14px",
  padding: "0 20px",
  fontWeight: "900",
};

const mobileSendButton = {
  ...sendButton,
  width: "100%",
  minHeight: "46px",
  padding: "12px 16px",
};

const sidePanel = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  padding: "16px",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  position: "sticky",
  top: "20px",
  minWidth: 0,
};

const mobileSidePanel = {
  ...sidePanel,
  position: "static",
  top: "auto",
  borderRadius: "18px",
  padding: "14px",
};

const sideHeader = {
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "12px",
  marginBottom: "12px",
};

const sideTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
};

const sideDescription = {
  margin: "6px 0 0",
  color: "#667085",
  fontSize: "13px",
};

const categoryTabs = {
  display: "flex",
  flexWrap: "wrap",
  gap: "7px",
  marginBottom: "12px",
};

const mobileCategoryTabs = {
  ...categoryTabs,
  flexWrap: "nowrap",
  overflowX: "auto",
  paddingBottom: "4px",
};

const categoryTab = {
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #e5e7eb",
  borderRadius: "999px",
  padding: "7px 9px",
  cursor: "pointer",
  fontWeight: "900",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const activeCategoryTab = {
  background: "#0A1A2F",
  color: "white",
  borderColor: "#0A1A2F",
};

const quickList = {
  display: "grid",
  gap: "9px",
};

const mobileQuickList = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "9px",
};

const quickButton = {
  background: "#f8fafc",
  color: "#0A1A2F",
  border: "1px solid #e5e7eb",
  borderRadius: "13px",
  padding: "11px",
  textAlign: "left",
  cursor: "pointer",
  fontWeight: "800",
  lineHeight: "1.35",
};

const tipsBox = {
  marginTop: "16px",
  background: "#f5f3ff",
  border: "1px solid #ddd6fe",
  borderRadius: "16px",
  padding: "13px",
  color: "#4c1d95",
  fontSize: "13px",
  lineHeight: "1.45",
};

const shortcutsBox = {
  marginTop: "12px",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "16px",
  padding: "13px",
  color: "#78350f",
  fontSize: "13px",
  lineHeight: "1.45",
};

const resultTableWrapper = {
  marginTop: "12px",
  overflowX: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  maxWidth: "100%",
};

const mobileResultTableWrapper = {
  ...resultTableWrapper,
  width: "100%",
  maxWidth: "calc(100vw - 64px)",
};

const resultTable = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  fontSize: "12px",
  background: "white",
};

const mobileResultTable = {
  ...resultTable,
  minWidth: "620px",
};

const resultTh = {
  background: "#f1f5f9",
  color: "#334155",
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #e5e7eb",
  textTransform: "capitalize",
  whiteSpace: "nowrap",
  fontWeight: "900",
};

const resultTd = {
  padding: "10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#111827",
  whiteSpace: "nowrap",
};

const resultActions = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
};

const resultActionLink = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  padding: "6px 9px",
  textDecoration: "none",
  fontWeight: "900",
  fontSize: "11px",
  whiteSpace: "nowrap",
};

const noActionText = {
  color: "#94a3b8",
  fontWeight: "800",
};

export default AIAssistant;