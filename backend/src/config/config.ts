// Configuration singleton to manage all environment variables
class Config {
  port!: number;
  azureBaseUrl?: string;
  azurePat?: string;
  buildDefinitionFolder?: string;

  // Define required keys as a const array for better type inference
  private readonly requiredKeys = ['azureBaseUrl', 'azurePat'] as const;

  constructor() {
    this.refresh();
  }

  // Refresh values from environment - useful for testing
  refresh() {
    this.port = Number(process.env.PORT) || 3000;
    this.azureBaseUrl = process.env.AZURE_BASE_URL;
    this.azurePat = process.env.AZURE_PAT;
    this.buildDefinitionFolder = process.env.BUILD_DEFINITION_FOLDER;
  }

  validate() {
    const missing = this.requiredKeys.filter((key) => !this[key as keyof Config]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

// Export a singleton instance
export default new Config();
