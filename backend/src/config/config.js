// Configuration singleton to manage all environment variables
class Config {
  constructor() {
    this.refresh();
  }

  // Refresh values from environment - useful for testing
  refresh() {
    this.port = process.env.PORT || 3000;
    this.azureBaseUrl = process.env.AZURE_BASE_URL;
    this.azurePat = process.env.AZURE_PAT;
    this.buildDefinitionFolder = process.env.BUILD_DEFINITION_FOLDER;
  }

  validate() {
    const required = ['azureBaseUrl', 'azurePat'];
    const missing = required.filter((key) => !this[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

// Export a singleton instance
export default new Config();
