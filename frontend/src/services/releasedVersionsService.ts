import { ReleasedVersion } from '../contracts/ReleasedVersion';

const API_BASE_URL = 'http://localhost:3000/api';

export const fetchReleasedVersions = async (environment: string): Promise<ReleasedVersion[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/azure/releasedVersions?environment=${environment}`,
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
