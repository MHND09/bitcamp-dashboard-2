import { useEffect, useState, useCallback, useRef } from 'react';

interface SensorDatabaseData {
  temperature?: { value: number; unit: string; timestamp: string };
  humidity?: { value: number; unit: string; timestamp: string };
  history?: { timestamp: number; temperature?: number; humidity?: number }[];
}

interface ApiResponse {
  timestamp: string;
  sensors: Record<string, SensorDatabaseData>;
  error?: string;
  queryTimeMs?: number;
}

export function useSensorData() {
  const [data, setData] = useState<Record<string, SensorDatabaseData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryTime, setQueryTime] = useState<number>(0);
  const isFirstLoad = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const start = performance.now();
      const response = await fetch('/api/sensors');
      const end = performance.now();
      
      const json = (await response.json()) as ApiResponse;
      
      if (!response.ok) {
        throw new Error(json.error || 'Failed to fetch sensor data');
      }

      if (json.error) {
         throw new Error(json.error);
      }
      
      setData(json.sensors || {});
      setQueryTime(Math.round(end - start));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      if (isFirstLoad.current) {
        setLoading(false);
        isFirstLoad.current = false;
      }
    }
  }, []);

  useEffect(() => {
    fetchData(); // Initial fetch
    
    // Poll every 2 seconds
    const interval = setInterval(fetchData, 2000);
    
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, queryTime };
}
