// Configuration singleton to manage all environment variables
class ConfigService {
  readonly port = Number(process.env.PORT) || 3000;
  readonly azureBaseUrl = process.env.AZURE_BASE_URL;
  readonly azurePat = process.env.AZURE_PAT;
  readonly buildDefinitionFolder = process.env.BUILD_DEFINITION_FOLDER;

  validate() {
    if (!this.azureBaseUrl || !this.azurePat) {
      throw new Error(
        `Missing required environment variables: ${[
          !this.azureBaseUrl && 'azureBaseUrl',
          !this.azurePat && 'azurePat',
        ]
          .filter(Boolean)
          .join(', ')}`,
      );
    }
  }
}

// Export a singleton instance
export default new ConfigService();
