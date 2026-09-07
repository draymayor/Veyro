import { createHmac } from "crypto";

export interface Detection {
  network: string;
  address: string;
  txHash: string;
  amount: number;
  reportedSymbol: string;
}

export interface ProviderHealthReport {
  networkCode: string;
  provider: string;
  outcome: "success" | "failure";
  rateLimited?: boolean;
  message?: string;
}

/**
 * Posts detections to apps/api's /webhooks/block-watcher, HMAC-signed the
 * same way BlockWatcherWebhookGuard verifies (see that file): HMAC-SHA256
 * over JSON.stringify(body) with the shared secret, hex-encoded, in an
 * x-block-watcher-signature header. Both ends are this codebase's own code,
 * so there's no third-party byte-exactness concern the way Alchemy's raw-
 * body scheme has - JSON.stringify on the same object here and on apps/api's
 * side (which re-parses then never re-serializes before hashing) will
 * always agree.
 */
export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly sharedSecret: string,
  ) {}

  async postDetections(detections: Detection[]): Promise<void> {
    if (detections.length === 0) return;

    const body = { detections };
    const signature = createHmac("sha256", this.sharedSecret)
      .update(JSON.stringify(body))
      .digest("hex");

    const res = await fetch(`${this.baseUrl}/webhooks/block-watcher`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-block-watcher-signature": signature,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "<unreadable body>");
      throw new Error(
        `POST /webhooks/block-watcher failed: ${res.status} ${text}`,
      );
    }
  }

  // Reports a TronGrid/Alchemy call outcome to apps/api's
  // ProviderHealthService, over the same HMAC-signed channel as
  // postDetections above - routed through apps/api rather than
  // block-watcher writing network_availability directly, so the admin
  // alert-email logic (which only lives in ProviderHealthService) fires
  // for block-watcher-originated trips/recoveries too, not just apps/api's
  // own Tatum/Alchemy call sites. Best-effort: a failure to REPORT health
  // must never crash the watcher loop that's already handling its own
  // real failure - callers catch and log, same posture as every other
  // "reporting, not the operation itself" call in this codebase.
  async postProviderHealth(report: ProviderHealthReport): Promise<void> {
    const signature = createHmac("sha256", this.sharedSecret)
      .update(JSON.stringify(report))
      .digest("hex");

    const res = await fetch(
      `${this.baseUrl}/webhooks/block-watcher/provider-health`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-block-watcher-signature": signature,
        },
        body: JSON.stringify(report),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "<unreadable body>");
      throw new Error(
        `POST /webhooks/block-watcher/provider-health failed: ${res.status} ${text}`,
      );
    }
  }
}
