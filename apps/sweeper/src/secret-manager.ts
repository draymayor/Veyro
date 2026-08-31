import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

/**
 * Thin wrapper over GCP Secret Manager. This is the ONLY place in the
 * entire codebase that reads the 5 master seed secrets - the main API's
 * service account is explicitly denied secretAccessor on all 5 (see
 * scripts/gcp/bootstrap-sweeper-iam.sh), so this class only ever runs
 * under the sweeper's own dedicated runtime service account.
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
