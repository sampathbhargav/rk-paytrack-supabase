import { useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Deals from "./pages/Deals";
import AddPayment from "./pages/AddPayment";
import AddDeal from "./pages/AddDeal";
import DuePayments from "./pages/DuePayments";
import Promises from "./pages/Promises";
import CustomerDetail from "./pages/CustomerDetail";
import ConnectionStatus from "./components/ConnectionStatus";
import EditDeal from "./pages/EditDeal";
import logo from "./assets/rk-paytrack-logo.png";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: "Dashboard", path: "/" },
    { label: "Deals", path: "/deals" },
    { label: "Add Deal", path: "/add-deal" },
    { label: "Add Payment", path: "/add-payment" },
    { label: "Due Payments", path: "/due-payments" },
    { label: "Promises", path: "/promises" },
  ];

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname.startsWith(path);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Arial" }}>
      <aside
        style={{
          width: collapsed ? "72px" : "250px",
          background: "#0A1A2F",
          color: "white",
          padding: collapsed ? "16px 10px" : "20px",
          transition: "width 0.25s ease",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            marginBottom: "25px",
          }}
        >
          {!collapsed && (
            <div>
              <img
                src={logo}
                alt="RK PayTrack Logo"
                style={{
                  width: "190px",
                  height: "auto",
                  display: "block",
                  marginBottom: "10px",
                }}
              />
              <p style={{ color: "#cbd5e1", fontSize: "13px", marginTop: "6px" }}>
                Dealer Payment Tracking
              </p>
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: "transparent",
              color: "white",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "8px 10px",
              cursor: "pointer",
              fontSize: "18px",
            }}
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            ☰
          </button>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {navItems.map((item) => {
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : ""}
                style={{
                  ...linkStyle,
                  justifyContent: collapsed ? "center" : "flex-start",
                  background: active ? "#1D4ED8" : "transparent",
                  color: active ? "#ffffff" : "#cbd5e1",
                  fontWeight: active ? "bold" : "normal",
                }}
              >
                <span style={{ fontSize: "18px" }}>{getIcon(item.label)}</span>

                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main style={{ flex: 1, padding: "25px", background: "#f4f6f8" }}>
        <ConnectionStatus />
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/deals/:dealId" element={<CustomerDetail />} />
            <Route path="/deals/:dealId/edit" element={<EditDeal />} />
            <Route path="/add-deal" element={<AddDeal />} />
            <Route path="/add-payment" element={<AddPayment />} />
            <Route path="/due-payments" element={<DuePayments />} />
            <Route path="/promises" element={<Promises />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}

function getIcon(label) {
  const icons = {
    Dashboard: "📊",
    Deals: "🚚",
    "Add Deal": "➕",
    "Add Payment": "💵",
    "Due Payments": "📅",
    Promises: "🤝",
  };

  return icons[label] || "•";
}

const linkStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  color: "white",
  textDecoration: "none",
  fontSize: "15px",
  padding: "12px",
  borderRadius: "10px",
  transition: "background 0.2s ease, color 0.2s ease",
  whiteSpace: "nowrap",
};

export default App;