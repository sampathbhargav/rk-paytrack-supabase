import { supabase } from "../supabaseClient";

export async function createCustomer(customerData) {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      customer_name: customerData.customerName,
      phone: customerData.phone,
      email: customerData.email,
      address: customerData.address,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCustomer(customerId, customerData) {
  const { data, error } = await supabase
    .from("customers")
    .update({
      customer_name: customerData.customerName,
      phone: customerData.phone,
      email: customerData.email,
      address: customerData.address,
    })
    .eq("id", customerId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function getCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("customer_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function getCustomerDashboardRows() {
  const { data: customers, error: customerError } = await supabase
    .from("customers")
    .select("*")
    .order("customer_name", { ascending: true });

  if (customerError) {
    throw new Error(customerError.message);
  }

  const { data: deals, error: dealsError } = await supabase
    .from("deals")
    .select("id, customer_id, total_amount, status");

  if (dealsError) {
    throw new Error(dealsError.message);
  }

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("deal_id, amount_paid, payment_status");

  if (paymentsError) {
    throw new Error(paymentsError.message);
  }

  const { data: maintenanceJobs, error: maintenanceError } = await supabase
    .from("maintenance_jobs")
    .select(`
      *,
      maintenance_payments (*)
    `);

  if (maintenanceError) {
    throw new Error(maintenanceError.message);
  }

  return (customers || []).map((customer) => {
    const customerDeals = (deals || []).filter(
      (deal) => deal.customer_id === customer.id
    );

    const customerDealIds = customerDeals.map((deal) => deal.id);

    const customerPayments = (payments || []).filter(
      (payment) =>
        customerDealIds.includes(payment.deal_id) &&
        payment.payment_status !== "Voided"
    );

    const dealTotal = customerDeals.reduce(
      (sum, deal) => sum + Number(deal.total_amount || 0),
      0
    );

    const dealPaid = customerPayments.reduce(
      (sum, payment) => sum + Number(payment.amount_paid || 0),
      0
    );

    const dealBalance = Math.max(dealTotal - dealPaid, 0);

    const customerMaintenance = (maintenanceJobs || []).filter(
      (job) => job.customer_id === customer.id
    );

    const maintenanceTotal = customerMaintenance.reduce((sum, job) => {
      const total =
        Number(job.labor_amount || 0) +
        Number(job.parts_amount || 0) +
        Number(job.tax_amount || 0) -
        Number(job.discount_amount || 0);

      return sum + Math.max(total, 0);
    }, 0);

    const maintenancePaid = customerMaintenance.reduce((sum, job) => {
      const paid = (job.maintenance_payments || [])
        .filter((payment) => payment.payment_status !== "Voided")
        .reduce(
          (paymentSum, payment) =>
            paymentSum + Number(payment.amount_paid || 0),
          0
        );

      return sum + paid;
    }, 0);

    const maintenanceBalance = Math.max(maintenanceTotal - maintenancePaid, 0);

    return {
      ...customer,
      deal_count: customerDeals.length,
      maintenance_count: customerMaintenance.length,
      deal_balance: dealBalance,
      maintenance_balance: maintenanceBalance,
      total_balance: dealBalance + maintenanceBalance,
    };
  });
}