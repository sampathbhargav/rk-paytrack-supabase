import PaymentForm from "../components/PaymentForm";

function AddPayment() {
  return (
    <div>
      <h1>Add Payment</h1>
      <p>Record full payment, partial payment, or deferred payment.</p>

      <PaymentForm />
    </div>
  );
}

export default AddPayment;