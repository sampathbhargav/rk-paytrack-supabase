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
    const totalAmount = Number(
      job.total_amount || job.totalAmount || job.labor_amount || 0
    );
  
    return {
      customer_id: job.customer_id || null,
  
      invoice_no: job.invoice_no || null,
      customer_type: job.customer_id ? "Deal Customer" : "Maintenance Only",
  
      customer_name: job.customer_name || "",
      phone: job.phone || "",
      email: job.email || "",
      address: job.address || "",
  
      year: job.year || "",
      make: job.make || "",
      model: job.model || "",
      truck: job.truck || "",
      vin: job.vin || "",
      miles: job.miles ? Number(job.miles) : null,
  
      technician: job.technician || "",
  
      job_title: job.job_title || "Maintenance",
      job_description: job.job_description || "",
  
      work_status: job.work_status || "Open",
  
      total_amount: totalAmount,
      labor_amount: totalAmount,
      parts_amount: 0,
      tax_amount: 0,
      discount_amount: 0,
  
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

  await fulfillMaintenancePromisesAfterPayment(
    payment.maintenance_job_id,
    payment.amount_paid
  );
  
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

  const totalAmount = Number(job.total_amount || job.labor_amount || 0);
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

  const safeText = text.replaceAll(",", "").replaceAll("%", "");

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .or(
      [
        `customer_name.ilike.%${safeText}%`,
        `company_name.ilike.%${safeText}%`,
        `phone.ilike.%${safeText}%`,
        `email.ilike.%${safeText}%`,
      ].join(",")
    )
    .order("customer_name", { ascending: true })
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}
  
export async function findOrCreateCustomerFromMaintenance(form) {
  const customerName = String(form.customer_name || "").trim();
  const phone = String(form.phone || "").trim();

  if (!customerName) return null;

  if (form.customer_id) {
    const { data, error } = await supabase
      .from("customers")
      .update({
        customer_name: customerName,
        phone: phone || "",
        email: form.email || "",
        address: form.address || "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", form.customer_id)
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

  for (const item of paymentRows) {
    await fulfillMaintenancePromisesAfterPayment(
      item.maintenance_job_id,
      item.amount_paid
    );
  }

  return {
    batch: batchData,
    payments: paymentsData || [],
  };
}

export async function updateMaintenancePayment(id, payment) {
  const payload = {
    customer_id: payment.customer_id || null,
    payment_date: payment.payment_date || new Date().toISOString().split("T")[0],
    amount_paid: Number(payment.amount_paid || 0),
    payment_method: payment.payment_method || "Other",
    payment_status: payment.payment_status || "Paid",
    notes: payment.notes || "",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("maintenance_payments")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function voidMaintenancePayment(id, payment = {}) {
  const notes = payment.notes
    ? `${payment.notes}\n\nVoided on ${new Date().toLocaleString()}`
    : `Voided on ${new Date().toLocaleString()}`;

  const { data, error } = await supabase
    .from("maintenance_payments")
    .update({
      payment_status: "Voided",
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function fulfillMaintenancePromisesAfterPayment(maintenanceJobId, amountPaid) {
  const paymentAmount = Number(amountPaid || 0);

  if (!maintenanceJobId || paymentAmount <= 0) {
    return true;
  }

  const { data: promises, error } = await supabase
    .from("maintenance_promises")
    .select("*")
    .eq("maintenance_job_id", maintenanceJobId)
    .in("promise_status", ["Pending", "Broken", "Partial Paid"])
    .order("promised_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  let remainingPayment = paymentAmount;

  for (const promise of promises || []) {
    if (remainingPayment <= 0) break;

    const promisedAmount = Number(promise.promised_amount || 0);

    if (remainingPayment >= promisedAmount) {
      const { error: updateError } = await supabase
        .from("maintenance_promises")
        .update({
          promise_status: "Paid",
          notes: promise.notes
            ? `${promise.notes}\n\nFulfilled by maintenance payment.`
            : "Fulfilled by maintenance payment.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", promise.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      remainingPayment -= promisedAmount;
    } else {
      const { error: updateError } = await supabase
        .from("maintenance_promises")
        .update({
          promise_status: "Partial Paid",
          notes: promise.notes
            ? `${promise.notes}\n\nPartially fulfilled by maintenance payment of $${remainingPayment.toFixed(
                2
              )}.`
            : `Partially fulfilled by maintenance payment of $${remainingPayment.toFixed(
                2
              )}.`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", promise.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      remainingPayment = 0;
    }
  }

  return true;
}