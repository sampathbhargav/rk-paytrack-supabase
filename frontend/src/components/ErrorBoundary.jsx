import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      errorMessage: "",
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("RK PayTrack app error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      errorMessage: "",
    });

    window.location.hash = "/";
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "30px",
            background: "#fee2e2",
            color: "#991b1b",
            borderRadius: "12px",
          }}
        >
          <h2>Something went wrong</h2>
          <p>
            RK PayTrack had an error on this page. You can go back to dashboard
            and continue working.
          </p>

          <pre
            style={{
              background: "white",
              padding: "12px",
              borderRadius: "8px",
              whiteSpace: "pre-wrap",
            }}
          >
            {this.state.errorMessage}
          </pre>

          <button
            onClick={this.handleReset}
            style={{
              background: "#0A1A2F",
              color: "white",
              padding: "10px 16px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Go to Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;