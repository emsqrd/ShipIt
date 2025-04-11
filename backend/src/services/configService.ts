// Configuration singleton to manage all environment variables
class ConfigService {
  readonly port: number = Number(process.env.PORT) || 3000;
  readonly azureBaseUrl: string = process.env.AZURE_BASE_URL || '';
  readonly azurePat: string = process.env.AZURE_PAT || '';
  readonly manualReleaseDirectory: string = process.env.MANUAL_RELEASE_DIRECTORY || '';
  readonly automatedReleaseDirectory: string = process.env.AUTOMATED_RELEASE_DIRECTORY || '';

  validate() {
    if (!this.azureBaseUrl || !this.azurePat) {
      throw new Error(
        `Missing required environment variables: ${[
          !this.azureBaseUrl && 'azureBaseUrl',
          !this.azurePat && 'azurePat',
          !this.manualReleaseDirectory && 'manualReleaseDirectory',
          !this.automatedReleaseDirectory && 'automatedReleaseDirectory',
        ]
          .filter(Boolean)
          .join(', ')}`,
      );
    }
  }
}

// Export a singleton instance
export default new ConfigService();
