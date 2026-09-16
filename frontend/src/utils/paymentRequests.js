// Persist before transport. Unknown outcomes keep the exact key and frozen input.
// One unresolved operation per actor prevents a new draft replacing an ambiguous save.
export function createPaymentRequests({ storage, rpc, actorId, uuid, lock, beforeNewRequest = async () => {} }) {
  const key = `rk-payment-intent-v1:${actorId}`;
  let inFlight;
  let inFlightInput;
  const pending = () => JSON.parse(storage.getItem(key) || "null");
  const execute = async (operation, payload, recover = false) => {
    const existing = pending();
    if (recover && !existing) return null;
    const input = JSON.parse(JSON.stringify({ operation, payload }));
    if (existing && !recover && JSON.stringify(existing.input) !== JSON.stringify(input)) {
      throw new Error("A previous payment operation needs recovery. Use Recover Payment before starting another save.");
    }
    // Check readiness inside the actor lock, before persisting a new intent.
    // Existing intents must remain recoverable even during an activation pause.
    if (!existing) await beforeNewRequest();
    const intent = existing || { requestId: uuid(), input };
    // Storage failure must happen before any financial request.
    storage.setItem(key, JSON.stringify(intent));
    const { data, error } = await rpc(intent.requestId, intent.input.operation, intent.input.payload);
    if (error) {
      // Only a confirmed server rejection can release the draft. Network/timeout
      // errors (including statement cancellation) conservatively retain it.
      if (!existing && (["P0001", "P0002", "42501", "PGRST202"].includes(error.code) || /^(22|23)/.test(error.code || ""))) {
        storage.removeItem(key);
      }
      throw new Error(error.message || "Payment outcome unknown. Recover this payment before submitting another.");
    }
    if (!data || data.version !== 1 || !Array.isArray(data.payments)) {
      throw new Error("Payment response could not be verified. Use Recover Payment.");
    }
    // Leave success durable until the caller acknowledges receipt of the result.
    return { ...data, requestId: intent.requestId };
  };
  return {
    pending,
    acknowledge(requestId) {
      if (pending()?.requestId === requestId) storage.removeItem(key);
    },
    run(operation, payload, recover = false) {
      const input = JSON.stringify({ operation, payload, recover });
      if (inFlight) {
        if (input !== inFlightInput) return Promise.reject(new Error("Another payment operation is in progress."));
        return inFlight;
      }
      inFlightInput = input;
      inFlight = lock(key, () => execute(operation, payload, recover))
        .finally(() => { inFlight = undefined; });
      return inFlight;
    },
  };
}
