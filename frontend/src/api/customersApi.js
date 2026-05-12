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