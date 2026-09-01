import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

/**
 * Thin wrapper over GCP Secret Manager. This is the ONLY place in this
 * deployable that reads CONSOLIDATION_MASTER_SEED - the main API's and the
 * sweeper's service accounts are both explicitly never granted
 * secretAccessor on it (see scripts/gcp/bootstrap-consolidator-iam.sh), so
 * this class only ever runs under the consolidator's own dedicated runtime
 * service account (veyro-consolidator).
 */
export class SecretManagerClient {
  private readonly client = new SecretManagerServiceClient();
  private readonly cache = new Map<string, string>();

  constructor(private readonly gcpProjectId: string) {}

  async getSecret(name: string): Promise<string> {
    const cached = this.cache.get(name);
    if (cached) return cached;

    const [version] = await this.client.accessSecretVersion({
      name: `projects/${this.gcpProjectId}/secrets/${name}/versions/latest`,
    });

    const payload = version.payload?.data?.toString();
    if (!payload) {
      throw new Error(`Secret ${name} has no payload`);
    }

    this.cache.set(name, payload);
    return payload;
  }
}
