type PaymentEnvironment = Readonly<Record<string, string | undefined>>;

export function readPaymentPolicy(environment: PaymentEnvironment) {
  const mode = environment.FAURIO_PAYMENT_MODE ?? "test";
  if (mode === "disabled") return { mode, ready: false, reason: "PAYMENTS_DISABLED" } as const;
  if (mode === "live") return { mode, ready: false, reason: "LIVE_PAYMENTS_NOT_RELEASED" } as const;
  if (mode !== "test") return { mode: "invalid", ready: false, reason: "INVALID_PAYMENT_MODE" } as const;
  const key = environment.STRIPE_SECRET_KEY || "";
  if (key !== key.trim() || !/^sk_test_[A-Za-z0-9]+$/.test(key)) {
    return { mode, ready: false, reason: "TEST_KEY_REQUIRED" } as const;
  }
  return { mode, ready: true, reason: null } as const;
}

export function acceptsTestPaymentEvent(event: { livemode?: boolean }) {
  return event.livemode === false;
}

export function acceptsTestCheckoutSession(session: { id: string; livemode?: boolean }) {
  return session.livemode === false && session.id === session.id.trim() && /^cs_test_[A-Za-z0-9]+$/.test(session.id);
}
