import { useState } from "react";
import { askRkAssistant } from "../api/assistantApi";
import { Link } from "react-router-dom";

function AIAssistant() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi, I am RK Assistant. Ask me about customer balances, payments, maintenance, or deal history.",
      rows: [],
    },
  ]);
  const [loading, setLoading] = useState(false);

  const askQuestion = async () => {
    const text = question.trim();

    if (!text || loading) return;

    setQuestion("");

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
          text: result.answer,
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
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      askQuestion();
    }
  };

  const quickQuestions = [
    "Who owes the most?",
    "Who has not paid this month?",
    "How much collected yesterday?",
    "Who paid last week?",
    "Collections this week",
    "Top 10 balances",
    "Who is due today?",
    "Who is past due?",
    "Who has broken promises?",
    "How much collected today?",
    "How much collected this month?",
    "What is deal 1721 balance?",
    "When did Peter last pay?",
    "Customer summary for Peter",
  ];

  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <div>
          <div style={eyebrow}>RK PayTrack Assistant</div>
          <h1 style={pageTitle}>AI Assistant</h1>
          <p style={pageDescription}>
            Ask questions about customer balances, deal payments, maintenance
            balances, and payment history.
          </p>
        </div>

        <div style={statusPill}>Private RK Data Assistant</div>
      </div>

      <div style={assistantLayout}>
        <div style={chatPanel}>
          <div style={messagesBox}>
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
                  style={
                    message.role === "user" ? userBubble : assistantBubble
                  }
                >
                  <div style={messageRole}>
                    {message.role === "user" ? "You" : "RK Assistant"}
                  </div>

                  <div style={messageText}>{message.text}</div>

                  {message.rows && message.rows.length > 0 && (
                    <ResultTable rows={message.rows} />
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={assistantMessageWrapper}>
                <div style={assistantBubble}>
                  <div style={messageRole}>RK Assistant</div>
                  <div style={typingText}>Thinking...</div>
                </div>
              </div>
            )}
          </div>

          <div style={inputBar}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask: What is Peter balance? When did Gary last pay?"
              style={textareaStyle}
              rows={2}
            />

            <button
              type="button"
              onClick={askQuestion}
              disabled={loading}
              style={{
                ...sendButton,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Ask
            </button>
          </div>
        </div>

        <aside style={sidePanel}>
          <h2 style={sideTitle}>Try asking</h2>

          <div style={quickList}>
            {quickQuestions.map((item) => (
              <button
                key={item}
                type="button"
                style={quickButton}
                onClick={() => setQuestion(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div style={tipsBox}>
            <strong>Examples</strong>
            <p>Use customer name, phone, invoice number, or deal tag.</p>
            <p>Example: “What is Gary balance?”</p>
            <p>Example: “Show payments for deal 1721.”</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ResultTable({ rows }) {
    const hiddenColumns = ["customer_id", "deal_id", "maintenance_job_id"];
  
    const columns = Object.keys(rows[0] || {}).filter(
      (column) => !hiddenColumns.includes(column)
    );
  
    if (columns.length === 0) return null;
  
    return (
      <div style={resultTableWrapper}>
        <table style={resultTable}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} style={resultTh}>
                  {column.replaceAll("_", " ")}
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
                    {row[column] || "—"}
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

const pageWrapper = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const heroCard = {
  background: "linear-gradient(135deg, #0A1A2F 0%, #102A4C 55%, #7c3aed 100%)",
  borderRadius: "18px",
  padding: "24px",
  color: "white",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  flexWrap: "wrap",
  boxShadow: "0 14px 35px rgba(15, 23, 42, 0.22)",
  marginBottom: "18px",
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
  fontSize: "30px",
  lineHeight: "1.1",
  color: "white",
};

const pageDescription = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#ede9fe",
  maxWidth: "760px",
  lineHeight: "1.5",
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

const assistantLayout = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 300px",
  gap: "18px",
  alignItems: "start",
};

const chatPanel = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.07)",
  overflow: "hidden",
};

const messagesBox = {
  height: "560px",
  overflowY: "auto",
  padding: "18px",
  background: "#f8fafc",
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
  background: "#0A1A2F",
  color: "white",
  borderRadius: "18px 18px 4px 18px",
  padding: "13px",
  maxWidth: "78%",
};

const assistantBubble = {
  background: "white",
  color: "#111827",
  border: "1px solid #e5e7eb",
  borderRadius: "18px 18px 18px 4px",
  padding: "13px",
  maxWidth: "90%",
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
};

const messageRole = {
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  opacity: 0.7,
  marginBottom: "6px",
};

const messageText = {
  lineHeight: "1.5",
  whiteSpace: "pre-wrap",
};

const typingText = {
  color: "#667085",
  fontWeight: "800",
};

const inputBar = {
  display: "flex",
  gap: "10px",
  padding: "14px",
  borderTop: "1px solid #e5e7eb",
  background: "white",
};

const textareaStyle = {
  flex: 1,
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "12px",
  outline: "none",
  resize: "vertical",
  fontFamily: "Arial",
  fontSize: "14px",
};

const sendButton = {
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "0 18px",
  fontWeight: "900",
};

const sidePanel = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "16px",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.07)",
};

const sideTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
};

const quickList = {
  display: "grid",
  gap: "9px",
  marginTop: "14px",
};

const quickButton = {
  background: "#f8fafc",
  color: "#0A1A2F",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "11px",
  textAlign: "left",
  cursor: "pointer",
  fontWeight: "800",
};

const tipsBox = {
  marginTop: "16px",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "14px",
  padding: "13px",
  color: "#78350f",
  fontSize: "13px",
  lineHeight: "1.45",
};

const resultTableWrapper = {
  marginTop: "12px",
  overflowX: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
};

const resultTable = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "12px",
  background: "white",
};

const resultTh = {
  background: "#f1f5f9",
  color: "#334155",
  textAlign: "left",
  padding: "9px",
  borderBottom: "1px solid #e5e7eb",
  textTransform: "capitalize",
  whiteSpace: "nowrap",
};

const resultTd = {
  padding: "9px",
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
    borderRadius: "8px",
    padding: "6px 8px",
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