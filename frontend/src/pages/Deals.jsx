import { useEffect, useState } from "react";
import { getDeals } from "../api/dealsApi";
import DealTable from "../components/DealTable";
import SearchBar from "../components/SearchBar";

function Deals() {
  const [deals, setDeals] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

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

    return (
      deal.deal_tag?.toLowerCase().includes(text) ||
      deal.customers?.customer_name?.toLowerCase().includes(text) ||
      deal.customers?.phone?.toLowerCase().includes(text) ||
      deal.truck?.toLowerCase().includes(text) ||
      deal.year?.toLowerCase().includes(text)
    );
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

      {error && <p style={{ color: "red" }}>{error}</p>}

      <DealTable deals={filteredDeals} />
    </div>
  );
}

export default Deals;