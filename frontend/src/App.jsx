import { useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
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
import LegalPolicies from "./pages/LegalPolicies";
import HelpCenter from "./pages/HelpCenter";
import Maintenance from "./pages/Maintenance";
import CustomerProfile from "./pages/CustomerProfile";
import Customers from "./pages/Customers";
import AIAssistant from "./pages/AIAssistant";
import Login from "./pages/Login";
import ActivityLogs from "./pages/ActivityLogs";

import GlobalSearch from "./components/GlobalSearch";
import ConnectionStatus from "./components/ConnectionStatus";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import UserMenu from "./components/UserMenu";

import logo from "./assets/rk-paytrack-logo.png";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 820 : false
  );

  const [searchMinimized, setSearchMinimized] = useState(false);
  const [searchHovered, setSearchHovered] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const searchWrapperRef = useRef(null);
  const location = useLocation();

  const searchActive = searchHovered || searchFocused;
  // const showFullSearch = isMobile ? true : !searchMinimized || searchActive;
  const showFullSearch = !searchMinimized || searchActive;
const showMobileSearchRow = isMobile && showFullSearch;
  const showSidebarLabels = isMobile || !collapsed;

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth <= 820;

      setIsMobile(nextIsMobile);

      if (!nextIsMobile) {
        setMobileNavOpen(false);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
    setSearchMinimized(false);
    setSearchHovered(false);
    setSearchFocused(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) return;

    document.body.style.overflow = mobileNavOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, mobileNavOpen]);

  const handleMainScroll = (event) => {
    if (searchActive) return;
  
    const scrollTop = event.currentTarget.scrollTop;
    const minimizeAfter = isMobile ? 45 : 80;
    const shouldMinimize = scrollTop > minimizeAfter;
  
    setSearchMinimized((prev) => {
      if (prev === shouldMinimize) return prev;
      return shouldMinimize;
    });
  };

  const navItems = [
    { label: "Dashboard", path: "/" },
    { label: "Customers", path: "/customers" },
    { label: "Deals", path: "/deals" },
    { label: "Add Deal", path: "/add-deal" },
    { label: "Add Payment", path: "/add-payment" },
    { label: "Due Payments", path: "/due-payments" },
    { label: "Promises", path: "/promises" },
    { label: "Maintenance", path: "/maintenance" },
    { label: "Reports", path: "/reports" },
    { label: "AI Assistant", path: "/ai-assistant" },
    { label: "Help Center", path: "/help-center" },
    { label: "Policy Center", path: "/legal-policies" },
    { label: "Activity Logs", path: "/activity-logs" },
  ];

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname.startsWith(path);
  };

  const computedSidebarStyle = isMobile
    ? {
        ...sidebarStyle,
        ...mobileSidebarStyle,
        width: "288px",
        padding: "18px",
        transform: mobileNavOpen ? "translateX(0)" : "translateX(-105%)",
      }
    : {
        ...sidebarStyle,
        width: collapsed ? "72px" : "250px",
        padding: collapsed ? "16px 10px" : "20px",
      };

  return (
    <div style={isMobile ? mobileAppShell : appShell}>
      {isMobile && mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
          style={mobileOverlay}
        />
      )}

      <aside style={computedSidebarStyle}>
        <div
          style={{
            ...sidebarHeaderStyle,
            justifyContent:
              isMobile || !collapsed ? "space-between" : "center",
          }}
        >
          {showSidebarLabels && (
            <div style={simpleLogoWrapper}>
              <div style={logoHighlightBox}>
                <img
                  src={logo}
                  alt="RK PayTrack Logo"
                  style={simpleLogoStyle}
                />
              </div>

              <p style={sidebarSubtitle}>Dealer Payment Tracking</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (isMobile) {
                setMobileNavOpen(false);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            style={collapseButton}
            title={
              isMobile
                ? "Close menu"
                : collapsed
                ? "Expand menu"
                : "Collapse menu"
            }
          >
            {isMobile ? "×" : "☰"}
          </button>
        </div>

        <nav style={sidebarNavStyle} className="sidebar-nav-scroll">
          {navItems.map((item) => {
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                title={!showSidebarLabels ? item.label : ""}
                onClick={() => {
                  if (isMobile) {
                    setMobileNavOpen(false);
                  }
                }}
                style={{
                  ...linkStyle,
                  justifyContent: showSidebarLabels ? "flex-start" : "center",
                  background: active ? "#1D4ED8" : "transparent",
                  color: active ? "#ffffff" : "#cbd5e1",
                  fontWeight: active ? "bold" : "normal",
                }}
              >
                <span style={{ fontSize: "18px" }}>{getIcon(item.label)}</span>

                {showSidebarLabels && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main
        style={isMobile ? mobileMainStyle : mainStyle}
        onScroll={handleMainScroll}
      >
        <div
          style={{
            ...topHeaderStyle,
            ...(showFullSearch
              ? topHeaderExpandedStyle
              : topHeaderMinimizedStyle),
            ...(isMobile ? mobileTopHeaderStyle : {}),
          }}
        >
          <div
            style={{
              ...topHeaderContent,
              ...(isMobile ? mobileTopHeaderContent : {}),
            }}
          >
            {isMobile && (
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                style={mobileMenuButton}
              >
                <span style={mobileMenuIcon}>☰</span>
                <span>Menu</span>
              </button>
            )}

              <div
                style={{
                  ...topSearchArea,
                  ...(isMobile
                    ? showMobileSearchRow
                      ? mobileTopSearchArea
                      : mobileTopSearchAreaHidden
                    : {}),
                  justifyContent: showFullSearch ? "center" : "flex-end",
                }}
              >
              {showFullSearch ? (
                <div
                  ref={searchWrapperRef}
                  style={{
                    ...searchExpandedWrapper,
                    ...(isMobile ? mobileSearchExpandedWrapper : {}),
                  }}
                  onMouseEnter={() => setSearchHovered(true)}
                  onMouseLeave={() => setSearchHovered(false)}
                  onFocusCapture={() => setSearchFocused(true)}
                  onBlurCapture={() => {
                    setTimeout(() => {
                      const activeElement = document.activeElement;

                      if (
                        searchWrapperRef.current &&
                        !searchWrapperRef.current.contains(activeElement)
                      ) {
                        setSearchFocused(false);
                      }
                    }, 150);
                  }}
                >
                  <GlobalSearch />
                </div>
              ) : (
                <button
                  type="button"
                  style={searchMiniPill}
                  onMouseEnter={() => setSearchHovered(true)}
                  onFocus={() => setSearchFocused(true)}
                  onClick={() => {
                    setSearchHovered(true);
                    setSearchFocused(true);
                  }}
                >
                  <span style={searchMiniIcon}>⌕</span>
                  <span>Search</span>
                </button>
              )}
            </div>

            <div
              style={{
                ...userMenuWrapper,
                ...(isMobile ? mobileUserMenuWrapper : {}),
              }}
            >
              <UserMenu />
            </div>
          </div>
        </div>

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
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:customerId" element={<CustomerProfile />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/help-center" element={<HelpCenter />} />
            <Route path="/legal-policies" element={<LegalPolicies />} />
            <Route path="/activity-logs" element={<ActivityLogs />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>

        {location.pathname !== "/ai-assistant" && (
          <Link
            to="/ai-assistant"
            style={{
              ...floatingAiButton,
              ...(isMobile ? mobileFloatingAiButton : {}),
            }}
          >
            <span style={floatingAiIcon}>🤖</span>
            <span
              style={{
                ...floatingAiText,
                ...(isMobile ? mobileFloatingAiText : {}),
              }}
            >
              Ask AI
            </span>
          </Link>
        )}
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
    Maintenance: "🔧",
    Customers: "👥",
    Reports: "📈",
    "AI Assistant": "🤖",
    "Help Center": "📚",
    "Policy Center": "📘",
    "Activity Logs": "🧾",
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

const mobileAppShell = {
  minHeight: "100dvh",
  width: "100vw",
  maxWidth: "100vw",
  fontFamily: "Arial",
  overflow: "hidden",
  background: "#f4f6f8",
};

const sidebarStyle = {
  background: "#0A1A2F",
  color: "white",
  transition: "width 0.25s ease, transform 0.25s ease",
  overflow: "hidden",
  flexShrink: 0,
  boxSizing: "border-box",
  height: "100vh",
  position: "sticky",
  top: 0,
  alignSelf: "flex-start",
  display: "flex",
  flexDirection: "column",
};

const mobileSidebarStyle = {
  position: "fixed",
  left: 0,
  top: 0,
  bottom: 0,
  height: "100dvh",
  zIndex: 1000,
  boxShadow: "18px 0 45px rgba(15, 23, 42, 0.35)",
};

const mobileOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.55)",
  border: "none",
  padding: 0,
  margin: 0,
  zIndex: 990,
  cursor: "pointer",
};

const sidebarHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginBottom: "14px",
  flexShrink: 0,
};

const collapseButton = {
  background: "transparent",
  color: "white",
  border: "1px solid #334155",
  borderRadius: "8px",
  padding: "8px 10px",
  cursor: "pointer",
  fontSize: "20px",
  flexShrink: 0,
  lineHeight: 1,
};

const sidebarNavStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  overflowY: "auto",
  overflowX: "hidden",
  paddingRight: "0",
  paddingBottom: "18px",
  flex: 1,
  scrollbarWidth: "none",
  msOverflowStyle: "none",
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

const mobileMainStyle = {
  width: "100%",
  minWidth: 0,
  height: "100dvh",
  padding: "12px",
  paddingBottom: "84px",
  background: "#f4f6f8",
  overflowX: "hidden",
  overflowY: "auto",
  boxSizing: "border-box",
};

const topHeaderStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  position: "sticky",
  top: 0,
  zIndex: 60,
  background: "transparent",
  pointerEvents: "none",
  minHeight: "58px",
  marginBottom: "18px",
  transition: "justify-content 0.2s ease",
};

const mobileTopHeaderStyle = {
  background: "transparent",
  borderBottom: "none",
  pointerEvents: "auto",
  minHeight: "auto",
  marginBottom: "10px",
  padding: "0",
  justifyContent: "flex-start",
};

const topHeaderExpandedStyle = {
  justifyContent: "center",
  padding: "0 0 12px",
};

const topHeaderMinimizedStyle = {
  justifyContent: "flex-end",
  padding: "0 0 12px",
};

const topHeaderContent = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "14px",
  pointerEvents: "none",
};

const mobileTopHeaderContent = {
  flexWrap: "wrap",
  gap: "10px",
  pointerEvents: "auto",
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "10px",
  boxShadow: "0 8px 22px rgba(15, 23, 42, 0.08)",
};

const mobileMenuButton = {
  order: 1,
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  background: "#0A1A2F",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "10px 13px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.16)",
};

const mobileMenuIcon = {
  fontSize: "18px",
  lineHeight: 1,
};

const topSearchArea = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  pointerEvents: "none",
};

const mobileTopSearchArea = {
  order: 3,
  flex: "1 0 100%",
  width: "100%",
  marginTop: "2px",
};

const mobileTopSearchAreaHidden = {
  display: "none",
};

const userMenuWrapper = {
  pointerEvents: "auto",
  flexShrink: 0,
};

const mobileUserMenuWrapper = {
  order: 2,
  marginLeft: "auto",
  maxWidth: "calc(100% - 120px)",
};

const searchExpandedWrapper = {
  width: "100%",
  maxWidth: "620px",
  pointerEvents: "auto",
  transition: "opacity 0.18s ease, transform 0.18s ease",
};

const mobileSearchExpandedWrapper = {
  maxWidth: "100%",
};

const searchMiniPill = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  background: "#0A1A2F",
  color: "white",
  borderRadius: "999px",
  padding: "9px 14px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.18)",
  border: "1px solid #1e293b",
  pointerEvents: "auto",
  fontFamily: "Arial",
};

const searchMiniIcon = {
  fontSize: "18px",
  fontWeight: "900",
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

const sidebarSubtitle = {
  color: "#cbd5e1",
  fontSize: "13px",
  marginTop: "8px",
  marginBottom: 0,
};

const floatingAiButton = {
  position: "fixed",
  right: "22px",
  bottom: "22px",
  zIndex: 9999,
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  background: "linear-gradient(135deg, #0A1A2F 0%, #1D4ED8 55%, #7C3AED 100%)",
  color: "white",
  textDecoration: "none",
  borderRadius: "999px",
  padding: "12px 16px",
  fontWeight: "900",
  fontSize: "13px",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.28)",
  border: "1px solid rgba(255,255,255,0.25)",
  cursor: "pointer",
};

const mobileFloatingAiButton = {
  right: "14px",
  bottom: "14px",
  padding: "12px",
  borderRadius: "999px",
};

const floatingAiIcon = {
  fontSize: "20px",
  lineHeight: 1,
};

const floatingAiText = {
  whiteSpace: "nowrap",
};

const mobileFloatingAiText = {
  display: "none",
};

export default App;