"use client";

export interface TelemetryEventPayload {
  userId: string;
  listingId: string;
  eventType: string;
  metadata?: Record<string, any>;
}

/**
 * Fire-and-forget telemetry tracking. Errors are logged but never surfaced to the UI.
 */
export async function trackEvent(params: TelemetryEventPayload): Promise<void> {
  try {
    await fetch("/api/telemetry/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch (error) {
    console.error("[Telemetry] Failed to track event", error);
  }
}
