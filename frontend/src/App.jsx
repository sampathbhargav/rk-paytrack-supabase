import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Deals from "./pages/Deals";
import AddPayment from "./pages/AddPayment";
import AddDeal from "./pages/AddDeal";
import DuePayments from "./pages/DuePayments";
import Promises from "./pages/Promises";
import CustomerDetail from "./pages/CustomerDetail";
import EditDeal from "./pages/EditDeal";
import Reports from "./pages/Reports";

import ConnectionStatus from "./components/ConnectionStatus";
import ErrorBoundary from "./components/ErrorBoundary";

import logo from "./assets/rk-paytrack-logo.png";

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
    { label: "Reports", path: "/reports" },
  ];

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname.startsWith(path);
  };

  return (
    <div style={appShell}>
      <aside
        style={{
          ...sidebarStyle,
          width: collapsed ? "72px" : "250px",
          padding: collapsed ? "16px 10px" : "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            marginBottom: "25px",
            gap: "10px",
          }}
        >
          {!collapsed && (
            <div style={simpleLogoWrapper}>
              <div style={logoHighlightBox}>
                <img
                  src={logo}
                  alt="RK PayTrack Logo"
                  style={simpleLogoStyle}
                />
              </div>

              <p
                style={{
                  color: "#cbd5e1",
                  fontSize: "13px",
                  marginTop: "8px",
                  marginBottom: 0,
                }}
              >
                Dealer Payment Tracking
              </p>
            </div>
          )}

          {/* {collapsed && (
            <div style={collapsedLogoHighlightBox}>
              <img
                src={logo}
                alt="RK PayTrack"
                style={collapsedLogoStyle}
              />
            </div>
          )} */}

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
              flexShrink: 0,
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

      <main style={mainStyle}>
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
            <Route path="/reports" element={<Reports />} />
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
    Reports: "📈",
  };

  return icons[label] || "•";
}

const appShell = {
  display: "flex",
  minHeight: "100vh",
  width: "100vw",
  maxWidth: "100vw",
  fontFamily: "Arial",
  overflow: "hidden",
};

const sidebarStyle = {
  background: "#0A1A2F",
  color: "white",
  transition: "width 0.25s ease",
  overflow: "hidden",
  flexShrink: 0,
  boxSizing: "border-box",
  height: "100vh",
  position: "sticky",
  top: 0,
  alignSelf: "flex-start",
};

const mainStyle = {
  flex: 1,
  minWidth: 0,
  maxWidth: "100%",
  height: "100vh",
  padding: "25px",
  background: "#f4f6f8",
  overflowX: "hidden",
  overflowY: "auto",
  boxSizing: "border-box",
};

const simpleLogoWrapper = {
  textAlign: "center",
};

const logoHighlightBox = {
  background: "white",
  padding: "4px",
  borderRadius: "8px",
  boxShadow: "0 3px 8px rgba(0,0,0,0.22)",
  display: "inline-block",
};

const simpleLogoStyle = {
  width: "180px",
  height: "auto",
  display: "block",
  objectFit: "contain",
};

const collapsedLogoHighlightBox = {
  background: "white",
  padding: "3px",
  borderRadius: "8px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 3px 8px rgba(0,0,0,0.22)",
  flexShrink: 0,
};

const collapsedLogoStyle = {
  width: "36px",
  height: "36px",
  objectFit: "contain",
};

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