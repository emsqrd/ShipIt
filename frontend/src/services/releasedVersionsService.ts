import { ReleasedVersion } from '../contracts/ReleasedVersion';

const API_BASE_URL = import.meta.env.VITE_SHIP_IT_API_URL;

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
