import { supabase } from "../supabaseClient";
import { createPaymentRequests } from "../utils/paymentRequests.js";

const clients = new Map();
export const PAYMENT_OPERATION_CHANGED = "rk-payment-operation-changed";
const notifyPaymentChange = () => {
  globalThis.window?.dispatchEvent(new Event(PAYMENT_OPERATION_CHANGED));
};

async function getClient() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const actorId = data.session?.user?.id;
  if (!actorId) throw new Error("Sign in before recording payments.");
  if (!globalThis.navigator?.locks || !globalThis.crypto?.randomUUID) {
    throw new Error("This app version cannot safely save payments. Update the browser or desktop app.");
  }
  if (!clients.has(actorId)) {
    clients.set(actorId, createPaymentRequests({
      actorId,
      storage: globalThis.localStorage,
      uuid: () => crypto.randomUUID(),
      lock: (key, work) => navigator.locks.request(key, work),
      beforeNewRequest: async () => {
        const capabilities = await getPaymentCapabilities();
        if (capabilities.enabled !== true) {
          throw new Error("Payment saves are unavailable during the application update. No new payment was submitted. Try again after the update is complete.");
        }
      },
      rpc: async (requestId, operation, payload) => {
        const session = await supabase.auth.getSession();
        if (session.data.session?.user?.id !== actorId) {
          throw new Error("Sign back into the original account to recover this payment.");
        }
        return supabase.rpc("rk_payment_operation", {
          p_request_id: requestId, p_operation: operation, p_payload: payload,
        });
      },
    }));
  }
  return clients.get(actorId);
}

export async function runPaymentOperation(operation, payload) {
  const client = await getClient();
  try {
    return await client.run(operation, payload);
  } finally {
    notifyPaymentChange();
  }
}

export async function acknowledgePaymentOperation(requestId) {
  const client = await getClient();
  client.acknowledge(requestId);
  notifyPaymentChange();
}

export async function recoverPaymentOperation() {
  const client = await getClient();
  if (!client.pending()) return null;
  try {
    return await client.run(null, null, true);
  } finally {
    notifyPaymentChange();
  }
}

export async function hasPendingPaymentOperation() {
  return Boolean((await getClient()).pending());
}

export async function getPaymentCapabilities() {
  const { data, error } = await supabase.rpc("rk_payment_capabilities");
  if (error || data?.version !== 1 || data?.enabled !== true) return { enabled: false };
  return data;
}
