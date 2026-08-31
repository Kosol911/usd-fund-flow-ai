/**
 * API client for USD Fund Flow AI backend
 */
import axios from 'axios';

const API_BASE_URL = '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Event API
export const eventApi = {
  getEvents: async (params?: {
    start_date?: string;
    end_date?: string;
    category?: string;
    min_importance?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get('/api/events', { params });
    return response.data;
  },

  getEventDetail: async (eventId: number) => {
    const response = await apiClient.get(`/api/events/${eventId}`);
    return response.data;
  },

  getUpcomingEvents: async (days: number = 30, minImportance: number = 6) => {
    const response = await apiClient.get('/api/events/upcoming', {
      params: { days, min_importance: minImportance },
    });
    return response.data;
  },
};

// Timeline API
export const timelineApi = {
  getAnnualTimeline: async (year?: number) => {
    const response = await apiClient.get('/api/timeline/annual', {
      params: year ? { year } : {},
    });
    return response.data;
  },

  getMonthlyTimeline: async (year?: number, month?: number) => {
    const response = await apiClient.get('/api/timeline/monthly', {
      params: { year, month },
    });
    return response.data;
  },
};

// Liquidity API
export const liquidityApi = {
  getCurrentLiquidity: async () => {
    const response = await apiClient.get('/api/liquidity/current');
    return response.data;
  },

  getLiquidityHistory: async (days: number = 90) => {
    const response = await apiClient.get('/api/liquidity/history', {
      params: { days },
    });
    return response.data;
  },
};

// Cross-Asset API
export const crossAssetApi = {
  getCrossAssetSummary: async () => {
    const response = await apiClient.get('/api/cross-asset');
    return response.data;
  },
};

// Regime API
export const regimeApi = {
  getCurrentRegime: async () => {
    const response = await apiClient.get('/api/regime');
    return response.data;
  },
};

export default apiClient;
