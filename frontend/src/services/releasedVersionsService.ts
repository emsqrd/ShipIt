import { ReleasedVersion } from '../contracts/ReleasedVersion';

// Get the API URL from environment variable, ensuring it's properly formatted
const getApiBaseUrl = (): string => {
  const envApiUrl = import.meta.env.VITE_SHIP_IT_API_URL;

  // If we have a properly formatted URL from the environment, use it
  if (
    envApiUrl &&
    typeof envApiUrl === 'string' &&
    (envApiUrl.startsWith('http://') || envApiUrl.startsWith('https://'))
  ) {
    return envApiUrl;
  }

  // If the environment variable is completely missing or improperly formatted,
  // log an error to help with debugging
  console.error(
    'VITE_SHIP_IT_API_URL environment variable is missing or improperly formatted. ' +
      'API calls may fail. Please ensure it is correctly set in your environment configuration.',
  );

  // Return whatever value we have (or empty string if undefined)
  // This will allow the API call to fail naturally with a clear network error
  // rather than introducing hidden behavior
  return envApiUrl?.toString() || '';
};

// Use the function to get the API base URL
const API_BASE_URL = getApiBaseUrl();

export const fetchReleasedVersions = async (environment: string): Promise<ReleasedVersion[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/azure/releasedVersions?environment=${encodeURIComponent(environment)}`,
    );

    if (!response.ok) {
      throw new Error(`Error fetching released versions: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching released versions:', error);
    throw error;
  }
};
