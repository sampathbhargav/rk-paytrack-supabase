import { supabase } from "../supabaseClient";

export async function getMaintenanceJobs() {
  const { data, error } = await supabase
    .from("maintenance_jobs")
    .select(`
      *,
      maintenance_payments (*),
      maintenance_promises (*)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function getMaintenanceJobById(id) {
  const { data, error } = await supabase
    .from("maintenance_jobs")
    .select(`
      *,
      maintenance_payments (*),
      maintenance_promises (*)
    `)
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createMaintenanceJob(job) {
    const customer = await findOrCreateCustomerFromMaintenance(job);
  
    const payload = buildMaintenancePayload({
      ...job,
      customer_id: customer?.id || job.customer_id || null,
    });
  
    const { data, error } = await supabase
      .from("maintenance_jobs")
      .insert(payload)
      .select()
      .single();
  
    if (error) {
      throw new Error(error.message);
    }
  
    return data;
  }

  export async function updateMaintenanceJob(id, job) {
    const customer = await findOrCreateCustomerFromMaintenance(job);
  
    const payload = {
      ...buildMaintenancePayload({
        ...job,
        customer_id: customer?.id || job.customer_id || null,
      }),
      updated_at: new Date().toISOString(),
    };
  
    const { data, error } = await supabase
      .from("maintenance_jobs")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
  
    if (error) {
      throw new Error(error.message);
    }
  
    return data;
  }

function buildMaintenancePayload(job) {
  const totalAmount =
    Number(job.labor_amount || 0) +
    Number(job.parts_amount || 0) +
    Number(job.tax_amount || 0) -
    Number(job.discount_amount || 0);

  return {
    customer_id: job.customer_id || null,
    deal_id: job.deal_id || null,

    invoice_no: job.invoice_no || null,
    customer_type: job.customer_type || "Maintenance Only",

    customer_name: job.customer_name || "",
    phone: job.phone || "",
    email: job.email || "",
    address: job.address || "",

    truck: job.truck || "",
    year: job.year || "",
    vin: job.vin || "",

    technician: job.technician || "",

    job_title: job.job_title || "",
    job_description: job.job_description || "",

    work_status: job.work_status || "Open",

    labor_amount: Number(job.labor_amount || 0),
    parts_amount: Number(job.parts_amount || 0),
    tax_amount: Number(job.tax_amount || 0),
    discount_amount: Number(job.discount_amount || 0),
    total_amount: Math.max(totalAmount, 0),

    start_date: job.start_date || new Date().toISOString().split("T")[0],
    completed_date: job.completed_date || null,
    due_date: job.due_date || null,

    notes: job.notes || "",
  };
}

export async function addMaintenancePayment(payment) {
  const payload = {
    maintenance_job_id: payment.maintenance_job_id,
    customer_id: payment.customer_id || null,
    payment_date: payment.payment_date || new Date().toISOString().split("T")[0],
    amount_paid: Number(payment.amount_paid || 0),
    payment_method: payment.payment_method || "Other",
    payment_status: payment.payment_status || "Paid",
    notes: payment.notes || "",
  };

  const { data, error } = await supabase
    .from("maintenance_payments")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await updateMaintenanceStatusAfterPayment(payment.maintenance_job_id);

  return data;
}

export async function addMaintenancePromise(promise) {
  const payload = {
    maintenance_job_id: promise.maintenance_job_id,
    customer_id: promise.customer_id || null,
    promised_date: promise.promised_date,
    promised_amount: Number(promise.promised_amount || 0),
    promise_status: promise.promise_status || "Pending",
    notes: promise.notes || "",
  };

  const { data, error } = await supabase
    .from("maintenance_promises")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateMaintenancePromiseStatus(id, status) {
  const { data, error } = await supabase
    .from("maintenance_promises")
    .update({ promise_status: status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateBrokenMaintenancePromises() {
  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase
    .from("maintenance_promises")
    .update({ promise_status: "Broken" })
    .lt("promised_date", today)
    .eq("promise_status", "Pending");

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function updateMaintenanceStatusAfterPayment(maintenanceJobId) {
  const job = await getMaintenanceJobById(maintenanceJobId);
  const totals = calculateMaintenanceTotals(job);

  if (totals.balance <= 0 && job.work_status === "Completed") {
    const { error } = await supabase
      .from("maintenance_jobs")
      .update({
        work_status: "Closed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", maintenanceJobId);

    if (error) {
      throw new Error(error.message);
    }
  }

  return true;
}

export function calculateMaintenanceTotals(job) {
  const payments = job.maintenance_payments || [];
  const promises = job.maintenance_promises || [];

  const activePayments = payments.filter(
    (payment) => payment.payment_status !== "Voided"
  );

  const totalPaid = activePayments.reduce(
    (sum, payment) => sum + Number(payment.amount_paid || 0),
    0
  );

  const totalAmount = Number(job.total_amount || 0);
  const balance = Math.max(totalAmount - totalPaid, 0);

  const activePromises = promises.filter(
    (promise) =>
      promise.promise_status === "Pending" ||
      promise.promise_status === "Broken" ||
      promise.promise_status === "Partial Paid"
  );

  const pendingPromises = promises.filter(
    (promise) => promise.promise_status === "Pending"
  );

  const brokenPromises = promises.filter(
    (promise) => promise.promise_status === "Broken"
  );

  const promisedAmount = activePromises.reduce(
    (sum, promise) => sum + Number(promise.promised_amount || 0),
    0
  );

  const balanceStatus = getMaintenanceBalanceStatus({
    job,
    totalAmount,
    totalPaid,
    balance,
    pendingPromises,
    brokenPromises,
  });

  return {
    totalAmount,
    totalPaid,
    balance,
    promisedAmount,
    balanceStatus,
    activePayments,
    activePromises,
    pendingPromises,
    brokenPromises,
  };
}

function getMaintenanceBalanceStatus({
  job,
  totalAmount,
  totalPaid,
  balance,
  pendingPromises,
  brokenPromises,
}) {
  const today = new Date().toISOString().split("T")[0];

  if (Number(totalAmount || 0) <= 0) {
    return "No Charge";
  }

  if (balance <= 0) {
    return "Paid";
  }

  if (brokenPromises.length > 0) {
    return "Broken Promise";
  }

  if (pendingPromises.length > 0) {
    return "Promised";
  }

  if (job.due_date && job.due_date < today) {
    return "Overdue";
  }

  if (totalPaid > 0 && balance > 0) {
    return "Partial";
  }

  return "Unpaid";
}

export async function deleteMaintenanceJob(id) {
  const { error } = await supabase
    .from("maintenance_jobs")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function getCustomerSuggestions(searchText) {
    const text = String(searchText || "").trim();
  
    if (!text) return [];
  
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .or(
        `customer_name.ilike.%${text}%,phone.ilike.%${text}%,email.ilike.%${text}%`
      )
      .order("customer_name", { ascending: true })
      .limit(8);
  
    if (error) {
      throw new Error(error.message);
    }
  
    return data || [];
  }
  
  export async function findOrCreateCustomerFromMaintenance(form) {
    const customerName = String(form.customer_name || "").trim();
    const phone = String(form.phone || "").trim();
  
    if (!customerName) return null;
  
    let query = supabase.from("customers").select("*").limit(1);
  
    if (phone) {
      query = query.or(`phone.eq.${phone},customer_name.ilike.${customerName}`);
    } else {
      query = query.ilike("customer_name", customerName);
    }
  
    const { data: existingCustomers, error: findError } = await query;
  
    if (findError) {
      throw new Error(findError.message);
    }
  
    if (existingCustomers && existingCustomers.length > 0) {
      const existing = existingCustomers[0];
  
      const { data, error } = await supabase
        .from("customers")
        .update({
          customer_name: customerName,
          phone: phone || existing.phone || "",
          email: form.email || existing.email || "",
          address: form.address || existing.address || "",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
  
      if (error) {
        throw new Error(error.message);
      }
  
      return data;
    }
  
    const { data, error } = await supabase
      .from("customers")
      .insert({
        customer_name: customerName,
        phone: phone || "",
        email: form.email || "",
        address: form.address || "",
      })
      .select()
      .single();
  
    if (error) {
      throw new Error(error.message);
    }
  
    return data;
  }

  export async function addMaintenancePaymentBatch(batch, allocations) {
  const receiptNo =
    batch.receipt_no ||
    `MR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now()
      .toString()
      .slice(-5)}`;

  const { data: batchData, error: batchError } = await supabase
    .from("maintenance_payment_batches")
    .insert({
      customer_id: batch.customer_id || null,
      customer_name: batch.customer_name || "",
      phone: batch.phone || "",
      payment_date: batch.payment_date,
      total_amount: Number(batch.total_amount || 0),
      payment_method: batch.payment_method || "Cash",
      notes: batch.notes || "",
      receipt_no: receiptNo,
    })
    .select()
    .single();

  if (batchError) throw new Error(batchError.message);

  const paymentRows = allocations
    .filter((item) => Number(item.amount_paid || 0) > 0)
    .map((item) => ({
      maintenance_job_id: item.maintenance_job_id,
      customer_id: batch.customer_id || null,
      payment_date: batch.payment_date,
      amount_paid: Number(item.amount_paid || 0),
      payment_method: batch.payment_method || "Cash",
      payment_status: item.remaining_after_payment > 0 ? "Partial" : "Paid",
      notes: batch.notes || "",
      batch_id: batchData.id,
    }));

  const { data: paymentsData, error: paymentsError } = await supabase
    .from("maintenance_payments")
    .insert(paymentRows)
    .select();

  if (paymentsError) throw new Error(paymentsError.message);

  return {
    batch: batchData,
    payments: paymentsData || [],
  };
}