import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { askRkAssistant } from "../api/assistantApi";
import { formatMoney } from "../utils/moneyUtils";
import "./AIAssistant.css";

const welcomeMessage = {
  role: "assistant",
  text:
    "What would you like to check? Ask about a deal balance, recent payments, promises, maintenance invoices, or customer follow-ups. Include a deal tag or invoice number for a more specific answer.",
  rows: [],
  suggestions: [],
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

  const messagesBoxRef = useRef(null);
  const busyRef = useRef(false);
  const requestRef = useRef(0);
  const [copyError, setCopyError] = useState("");

  useEffect(() => () => { requestRef.current += 1; }, []);
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
    const box = messagesBoxRef.current;
    box?.scrollTo({ top: box.scrollHeight, behavior: "auto" });
  }, [messages, loading]);

  const chooseQuestion = text => {
    setQuestion(text);
    textareaRef.current?.focus();
  };

  const submitQuestion = async (customQuestion, retryContext = null) => {
    const text = String(customQuestion || question).trim();

    if (!text || busyRef.current) return;
    busyRef.current = true;
    const request = ++requestRef.current;
    const contextualQuestion = retryContext || buildContextualQuestion(text, messages);

    setQuestion("");
    setCopiedIndex(null);

    if (!retryContext) setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text,
        rows: [],
        suggestions: [],
      },
    ]);

    try {
      setLoading(true);

      const result = await askRkAssistant(contextualQuestion);
      if (request !== requestRef.current) return;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          answeredAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          text: result.answer || "I could not find an answer for that.",
          rows: result.rows || [],
          suggestions: buildFollowUpSuggestions(text, result),
        },
      ]);
    } catch (error) {
      if (request !== requestRef.current) return;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I couldn’t load an answer. Check your connection, then try this question again.",
          errorDetail: error.message || "Request failed",
          retryQuestion: text,
          retryContext: contextualQuestion,
          rows: [],
          suggestions: [],
        },
      ]);
    } finally {
      if (request === requestRef.current) {
        busyRef.current = false;
        setLoading(false);
        textareaRef.current?.focus();
      }
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submitQuestion();
    }
  };

  const clearChat = () => {
    if (busyRef.current) return;
    if (messages.length > 1 && !window.confirm("Start a new conversation? This clears the current chat, not application records.")) return;
    setCopyError("");
    setMessages([welcomeMessage]);
    setQuestion("");
    setCopiedIndex(null);
    textareaRef.current?.focus();
  };

  const copyMessage = async (message, index) => {
    try {
      setCopyError("");
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
      setCopyError("Copy was unavailable. You can select the answer text and copy it manually.");
    }
  };

  return (
    <div className="rk-assistant" style={isMobile ? mobilePageWrapper : pageWrapper}>
      <div className="rk-assistant-hero" style={isMobile ? mobileHeroCard : heroCard}>
        <div>
          <div style={eyebrow}>RK PayTrack Assistant</div>

          <h1 style={isMobile ? mobilePageTitle : pageTitle}>AI Assistant</h1>

          <p style={isMobile ? mobilePageDescription : pageDescription}>
            Ask business questions about customer balances, company names,
            payments, maintenance invoices, collections, promises, follow-up
            notes, referral information, due dates, and deal history.
          </p>

          <div className="rk-assistant-topics" style={isMobile ? mobileHeroPills : heroPills}>
            <span style={heroPill}>Collections</span>
            <span style={heroPill}>Deal Balances</span>
            <span style={heroPill}>Follow-Ups</span>
            <span style={heroPill}>Referrals</span>
            <span style={heroPill}>Maintenance</span>
            <span style={heroPill}>Reports</span>
          </div>
        </div>

        <div style={isMobile ? mobileHeroRight : heroRight}>
          <div style={isMobile ? mobileStatusPill : statusPill}>
            Read-only record lookup
          </div>

          <button type="button" onClick={clearChat} disabled={loading || messages.length === 1} style={clearChatButton}>
            New conversation
          </button>
        </div>
      </div>

      <div className="rk-assistant-layout" style={isMobile ? mobileAssistantLayout : assistantLayout}>
        <div style={chatPanel}>
          <div style={isMobile ? mobileChatHeader : chatHeader}>
            <div>
              <h2 style={chatTitle}>Ask RK Assistant</h2>
              <p style={chatSubtitle}>
                Use customer name, company name, phone number, deal tag, invoice
                number, payment date, or referral name.
              </p>
            </div>

            <div style={chatStats}>
              <span>{messages.length} messages</span>
            </div>
          </div>

          <div ref={messagesBoxRef} className="rk-assistant-messages" role="region" aria-label="Conversation" aria-busy={loading} tabIndex={0} style={isMobile ? mobileMessagesBox : messagesBox}>
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
                  {message.answeredAt && <small className="rk-assistant-answer-time">Answered at {message.answeredAt} · Open the linked record to verify current details.</small>}
                  {message.retryQuestion && <div className="rk-assistant-retry" role="alert">
                    <details><summary>Technical details</summary>{message.errorDetail}</details>
                    <button type="button" disabled={loading} onClick={() => submitQuestion(message.retryQuestion, message.retryContext)}>Try this question again</button>
                  </div>}

                  {message.rows && message.rows.length > 0 && (
                    <ResultTable rows={message.rows} isMobile={isMobile} />
                  )}

                  {message.role === "assistant" &&
                    message.suggestions &&
                    message.suggestions.length > 0 && (
                      <div style={followUpSection}>
                        <div style={followUpLabel}>You can also ask</div>

                        <div style={followUpButtons}>
                          {message.suggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => chooseQuestion(suggestion)}
                              disabled={loading}
                              style={{
                                ...followUpButton,
                                ...(loading ? disabledFollowUpButton : {}),
                              }}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
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
                  <div style={typingBox} role="status">
                    <span style={typingDot}>●</span>
                    <span style={typingDot}>●</span>
                    <span style={typingDot}>●</span>
                    <span style={typingText}>Checking application records…</span>
                  </div>
                </div>
              </div>
            )}


          </div>

          {copyError && <p role="status" className="rk-assistant-notice">{copyError}</p>}
          <p className="rk-assistant-notice">Answers are lookups of application records, not financial advice. This assistant cannot save payments, change balances, or update records.</p>
          <div style={isMobile ? mobileInputBar : inputBar}>
            <textarea
              ref={textareaRef}
              aria-label="Ask RK Assistant"
              maxLength={2000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question, or choose a prompt and replace its example name or deal number…"
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
              Choose a question, edit any example name or number, then press Ask.
            </p>
          </div>

          <div style={isMobile ? mobileCategoryTabs : categoryTabs}>
            {quickQuestionGroups.map((group) => (
              <button
                key={group.title}
                type="button"
                onClick={() => setActiveCategory(group.title)}
                aria-pressed={activeCategory === group.title}
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
                onClick={() => chooseQuestion(item)}
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
            <p>“Show follow-up notes for Peter.”</p>
            <p>“Who referred customers?”</p>
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
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const hiddenColumns = [
    "customer_id",
    "deal_id",
    "maintenance_job_id",
    "followup_id",
    "payment_id",
    "promise_id",
  ];

  const columns = Object.keys(rows[0] || {}).filter(
    (column) => !hiddenColumns.includes(column)
  );

  if (columns.length === 0) return null;

  const visibleRows = rows.slice(0, visibleCount);
  const hasMore = visibleCount < rows.length;
  const remainingCount = Math.max(rows.length - visibleCount, 0);

  const showMore = () => {
    setVisibleCount((current) => Math.min(current + PAGE_SIZE, rows.length));
  };

  if (isMobile) {
    return (
      <div style={mobileResultCardWrapper}>
        <div style={resultCountText}>
          Showing {visibleRows.length} of {rows.length} result
          {rows.length === 1 ? "" : "s"}
        </div>

        <div style={mobileResultCardList}>
          {visibleRows.map((row, rowIndex) => (
            <div key={rowIndex} style={mobileResultCard}>
              {columns.map((column) => (
                <div key={column} style={mobileResultField}>
                  <span style={mobileResultLabel}>
                    {formatColumnName(column)}
                  </span>
                  <strong style={mobileResultValue}>
                    {formatCellValue(column, row[column])}
                  </strong>
                </div>
              ))}

              <div style={mobileResultActionsSection}>
                <span style={mobileResultLabel}>Actions</span>
                <ResultActions row={row} />
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <button type="button" onClick={showMore} style={showMoreButton}>
            Show {Math.min(PAGE_SIZE, remainingCount)} More
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={resultCountText}>
        Showing {visibleRows.length} of {rows.length} result
        {rows.length === 1 ? "" : "s"}
      </div>

      <div style={resultTableWrapper}>
        <table style={resultTable}>
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
            {visibleRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column) => (
                  <td key={column} style={resultTd}>
                    {formatCellValue(column, row[column])}
                  </td>
                ))}

                <td style={resultTd}>
                  <ResultActions row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button type="button" onClick={showMore} style={showMoreButton}>
          Show {Math.min(PAGE_SIZE, remainingCount)} More
        </button>
      )}
    </div>
  );
}

function ResultActions({ row }) {
  return (
    <div style={resultActions}>
      {row.customer_id && (
        <Link to={`/customers/${row.customer_id}`} style={resultActionLink}>
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

      {!row.customer_id && !row.deal_id && !row.maintenance_job_id && (
        <span style={noActionText}>—</span>
      )}
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
    lowerColumn.includes("remaining") ||
    lowerColumn.includes("collected") ||
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


function buildContextualQuestion(question, messages = []) {
  const text = String(question || "").trim();

  if (!text || !needsConversationContext(text)) {
    return text;
  }

  const hint = findLatestConversationEntity(messages);

  if (!hint) {
    return text;
  }

  if (hint.type === "deal") {
    return `${text} Deal ${hint.value}`;
  }

  if (hint.type === "invoice") {
    return `${text} Invoice ${hint.value}`;
  }

  return `${text} Customer ${hint.value}`;
}

function needsConversationContext(question) {
  const q = String(question || "").toLowerCase();

  const contextWords = [
    " he ",
    " him ",
    " his ",
    " she ",
    " her ",
    " they ",
    " them ",
    " their ",
    " this customer",
    " that customer",
    " the customer",
    " this deal",
    " that deal",
    " the deal",
    " this invoice",
    " that invoice",
    " the invoice",
    " this account",
    " that account",
    " their account",
  ];

  const padded = ` ${q} `;

  return contextWords.some((word) => padded.includes(word));
}

function findLatestConversationEntity(messages = []) {
  const recentMessages = [...messages].reverse();

  for (const message of recentMessages) {
    if (message.role !== "assistant" || !Array.isArray(message.rows)) {
      continue;
    }

    const rows = message.rows || [];

    if (rows.length === 0) continue;

    const customers = [
      ...new Set(
        rows
          .map((row) => row.customer || row.customer_name)
          .filter(
            (value) =>
              value &&
              String(value).trim() &&
              String(value).toLowerCase() !== "unknown"
          )
          .map((value) => String(value).trim())
      ),
    ];

    if (customers.length === 1) {
      return {
        type: "customer",
        value: customers[0],
      };
    }

    const dealReferences = [
      ...new Set(
        rows
          .filter(
            (row) =>
              row.deal_id ||
              String(row.type || "").toLowerCase() === "deal" ||
              row.deal_tag
          )
          .map((row) => row.deal_tag || row.reference)
          .filter(Boolean)
          .map((value) => String(value).trim())
      ),
    ];

    if (dealReferences.length === 1) {
      return {
        type: "deal",
        value: dealReferences[0],
      };
    }

    const invoiceReferences = [
      ...new Set(
        rows
          .filter(
            (row) =>
              row.maintenance_job_id ||
              String(row.type || "").toLowerCase() === "maintenance" ||
              row.invoice_no
          )
          .map((row) => row.invoice_no || row.reference)
          .filter(Boolean)
          .map((value) => String(value).trim())
      ),
    ];

    if (invoiceReferences.length === 1) {
      return {
        type: "invoice",
        value: invoiceReferences[0],
      };
    }
  }

  for (const message of recentMessages) {
    if (message.role !== "user") continue;

    const text = String(message.text || "");

    const dealMatch = text.match(/\bdeal\s+#?\s*([a-z0-9-]+)\b/i);
    if (dealMatch) {
      return {
        type: "deal",
        value: dealMatch[1],
      };
    }

    const invoiceMatch = text.match(/\binvoice\s+#?\s*([a-z0-9-]+)\b/i);
    if (invoiceMatch) {
      return {
        type: "invoice",
        value: invoiceMatch[1],
      };
    }

    const customerPatterns = [
      /what is (.+?)'?s?\s+balance\b/i,
      /customer summary for (.+)$/i,
      /when did (.+?)\s+last pay\b/i,
      /show (?:the )?payment history for (.+)$/i,
      /show payments for (.+)$/i,
      /follow-up notes for (.+)$/i,
    ];

    for (const pattern of customerPatterns) {
      const match = text.match(pattern);

      if (match?.[1]) {
        const value = match[1]
          .replace(/[?.!]+$/g, "")
          .trim();

        if (value) {
          return {
            type: "customer",
            value,
          };
        }
      }
    }
  }

  return null;
}

function buildFollowUpSuggestions(question, result = {}) {
  const q = String(question || "").toLowerCase();
  const rows = Array.isArray(result.rows) ? result.rows : [];

  if (
    q.includes("balance") ||
    q.includes("customer summary") ||
    q.includes("last pay") ||
    q.includes("payment history")
  ) {
    return [
      "When did this customer last pay?",
      "Show this customer's payment history",
      "Is this customer past due?",
    ];
  }

  if (
    q.includes("past due") ||
    q.includes("due today") ||
    q.includes("collection priority") ||
    q.includes("not paid this month")
  ) {
    return [
      "Who has broken promises?",
      "Collection priority list",
      "Who has not paid this month?",
    ];
  }

  if (
    q.includes("collected") ||
    q.includes("payment") ||
    q.includes("paid today") ||
    q.includes("paid last week")
  ) {
    return [
      "Show partial payments",
      "Show extra payments",
      "Show payment method breakdown",
    ];
  }

  if (q.includes("maintenance") || q.includes("invoice")) {
    return [
      "Who owes maintenance money?",
      "Maintenance past due",
      "Show broken maintenance promises",
    ];
  }

  if (q.includes("referral") || q.includes("referred")) {
    return [
      "Show unpaid referrals",
      "How much referral money was paid?",
      "Show referrals by customer",
    ];
  }

  if (
    q.includes("deal") ||
    rows.some((row) => row.deal_id || row.deal_tag)
  ) {
    return [
      "When did this customer last pay?",
      "Show this customer's payment history",
      "Is this customer past due?",
    ];
  }

  return [
    "Who is past due?",
    "How much collected today?",
    "Who owes the most?",
  ];
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
      "Show partial payments",
      "Show extra payments",
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
      "Search by company name",
      "Show customers by company",
    ],
  },
  {
    title: "Follow-Ups",
    icon: "📝",
    questions: [
      "Show customer follow-up notes",
      "Show follow-ups due today",
      "Show overdue follow-ups",
      "Show high priority follow-ups",
      "Show follow-up notes for Peter",
      "Who needs follow-up?",
      "Show unresolved follow-ups",
    ],
  },
  {
    title: "Referrals",
    icon: "🤝",
    questions: [
      "Who referred customers?",
      "Show referral information",
      "Show deals with referral money paid",
      "Show unpaid referrals",
      "How much referral money was paid?",
      "Show referrals by customer",
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
      "Show registration money deals",
    ],
  },
  {
    title: "Reports",
    icon: "📊",
    questions: [
      "Show monthly collection summary",
      "Show customer balance report",
      "Show collection priority report",
      "Show paid off deals report",
      "Show defaulted deals report",
      "Show past due scheduled payments",
      "Show payment method breakdown",
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
  background: "linear-gradient(115deg, #0d2038, #193e6c)",
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
  height: "clamp(360px, 55dvh, 760px)",
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
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#e5e7eb",
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


const followUpSection = {
  marginTop: "12px",
  paddingTop: "10px",
  borderTop: "1px solid #e5e7eb",
};

const followUpLabel = {
  color: "#667085",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: "7px",
};

const followUpButtons = {
  display: "flex",
  gap: "7px",
  flexWrap: "wrap",
};

const followUpButton = {
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #dbe3ee",
  borderRadius: "999px",
  padding: "7px 10px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "800",
  textAlign: "left",
};

const disabledFollowUpButton = {
  opacity: 0.55,
  cursor: "not-allowed",
};

const resultCountText = {
  marginTop: "10px",
  marginBottom: "7px",
  color: "#667085",
  fontSize: "11px",
  fontWeight: "800",
};

const showMoreButton = {
  marginTop: "10px",
  background: "white",
  color: "#0A1A2F",
  border: "1px solid #cbd5e1",
  borderRadius: "999px",
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "900",
};

const mobileResultCardWrapper = {
  marginTop: "10px",
  width: "100%",
};

const mobileResultCardList = {
  display: "grid",
  gap: "9px",
};

const mobileResultCard = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "11px",
  display: "grid",
  gap: "8px",
  minWidth: 0,
};

const mobileResultField = {
  display: "grid",
  gap: "2px",
  minWidth: 0,
};

const mobileResultLabel = {
  color: "#667085",
  fontSize: "10px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const mobileResultValue = {
  color: "#111827",
  fontSize: "13px",
  overflowWrap: "anywhere",
};

const mobileResultActionsSection = {
  display: "grid",
  gap: "6px",
  paddingTop: "3px",
  borderTop: "1px solid #e5e7eb",
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
