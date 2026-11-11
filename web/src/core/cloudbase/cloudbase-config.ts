/**
 * CloudBase client configuration.
 *
 * EnvId, region and publishable key are required at runtime.
 * The publishable key is safe to expose to the browser; it is NOT a secret.
 */

export interface CloudBaseAuthConfig {
  envId: string;
  region: string;
  publishableKey: string;
}

export interface CloudBaseAuthFeatures {
  phone: boolean;
  github: boolean;
}

export function readCloudBaseAuthFeatures(): CloudBaseAuthFeatures {
  return {
    phone: import.meta.env.VITE_AUTH_PHONE_ENABLED === 'true',
    github: import.meta.env.VITE_AUTH_GITHUB_ENABLED === 'true',
  };
}

export function readCloudBaseAuthConfig(): CloudBaseAuthConfig {
  const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID as string | undefined;
  const region = (import.meta.env.VITE_CLOUDBASE_REGION as string | undefined) || 'ap-shanghai';
  const publishableKey = import.meta.env.VITE_CLOUDBASE_PUBLISHABLE_KEY as string | undefined;

  if (!envId || !publishableKey) {
    throw new CloudBaseConfigError(
      'Missing CloudBase configuration. Set VITE_CLOUDBASE_ENV_ID and VITE_CLOUDBASE_PUBLISHABLE_KEY.'
    );
  }

  return { envId, region, publishableKey };
}

export class CloudBaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloudBaseConfigError';
  }
}
