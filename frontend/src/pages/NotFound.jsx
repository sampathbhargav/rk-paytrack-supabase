import { Link, useNavigate } from "react-router-dom";
import "./NotFound.css";

export default function NotFound() {
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/", { replace: true });
  };

  return <section className="not-found" aria-labelledby="not-found-title">
    <div className="not-found-card">
      <span className="not-found-code">404 · PAGE NOT FOUND</span>
      <div className="not-found-icon" aria-hidden="true">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M9 13l6 5m0-5-6 5"/></svg>
      </div>
      <h1 id="not-found-title">We couldn’t find that page</h1>
      <p>The link may be incorrect, or the page may have moved. Check the address or return to your dashboard to continue.</p>
      <div className="not-found-actions">
        <Link to="/" replace className="not-found-primary">Go to Dashboard</Link>
        <button type="button" onClick={goBack}>Go back</button>
      </div>
      <Link to="/help-center" className="not-found-help">Visit Help Center</Link>
    </div>
  </section>;
}
