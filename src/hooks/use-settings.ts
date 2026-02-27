import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { Settings } from '@/types';

interface UseSettingsReturn {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getSettings();
      
      if (response.success && response.data) {
        setSettings(response.data);
      } else {
        setError(response.message || 'Failed to fetch settings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
  };
}
