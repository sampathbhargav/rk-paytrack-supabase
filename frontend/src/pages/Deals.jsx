import { useEffect, useState } from "react";
import { getDeals } from "../api/dealsApi";
import DealTable from "../components/DealTable";
import SearchBar from "../components/SearchBar";

function Deals() {
  const [deals, setDeals] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    try {
      const data = await getDeals();
      setDeals(data);
    } catch (error) {
      setError(error.message);
    }
  };

  const filteredDeals = deals.filter((deal) => {
    const text = search.toLowerCase();
  
    const matchesSearch =
      deal.deal_tag?.toLowerCase().includes(text) ||
      deal.customers?.customer_name?.toLowerCase().includes(text) ||
      deal.customers?.phone?.toLowerCase().includes(text) ||
      deal.truck?.toLowerCase().includes(text) ||
      deal.year?.toLowerCase().includes(text);
  
    const matchesStatus =
      statusFilter === "All" || deal.status === statusFilter;
  
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <h1>Deals</h1>
      <p>All financed customer deals.</p>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by deal tag, customer, phone, truck, or year..."
      />

      <div style={{ marginBottom: "20px" }}>
        <label>Status Filter: </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            marginLeft: "10px",
          }}
        >
          <option>All</option>
          <option>Active</option>
          <option>Paid Off</option>
          <option>Closed</option>
          <option>Repo</option>
          <option>Cancelled</option>
          <option>Defaulted</option>
        </select>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <DealTable deals={filteredDeals} />
    </div>
  );
}

export default Deals;