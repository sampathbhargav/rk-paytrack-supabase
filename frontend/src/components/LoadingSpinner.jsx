function LoadingSpinner({
    message = "Loading data...",
    height = "220px",
    size = 42,
  }) {
    return (
      <div style={{ ...wrapperStyle, minHeight: height }}>
        <div
          style={{
            ...spinnerStyle,
            width: `${size}px`,
            height: `${size}px`,
          }}
        />
  
        <div style={messageStyle}>{message}</div>
      </div>
    );
  }
  
  const wrapperStyle = {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "14px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    color: "#475569",
  };
  
  const spinnerStyle = {
    border: "4px solid #e5e7eb",
    borderTop: "4px solid #0A1A2F",
    borderRadius: "50%",
    animation: "rkSpin 0.8s linear infinite",
  };
  
  const messageStyle = {
    fontSize: "14px",
    fontWeight: "800",
    color: "#475569",
  };
  
  export default LoadingSpinner;