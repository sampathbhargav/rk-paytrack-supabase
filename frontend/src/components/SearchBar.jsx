function SearchBar({ value, onChange, placeholder }) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search..."}
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "12px",
          border: "1px solid #ccc",
          borderRadius: "8px",
          marginBottom: "20px",
          fontSize: "15px",
        }}
      />
    );
  }
  
  export default SearchBar;