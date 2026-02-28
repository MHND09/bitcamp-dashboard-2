'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface HistoryPoint {
  timestamp: number;
  temperature?: number;
  humidity?: number;
}

interface SensorChartProps {
  sensorId: string;
  history: HistoryPoint[];
}

export function SensorChart({ sensorId, history }: SensorChartProps) {
  if (history.length === 0) {
    return (
      <Card className="border-slate-700">
        <CardHeader>
          <CardTitle className="text-base">Sensor {sensorId} - History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-slate-400">
            Waiting for data...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for chart - combine temperature and humidity if available
  const chartData = history.map((point) => ({
    timestamp: new Date(point.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    temperature: point.temperature,
    humidity: point.humidity,
  }));

  // Determine which data we have
  const hasTemperature = history.some((p) => p.temperature !== undefined);
  const hasHumidity = history.some((p) => p.humidity !== undefined);

  return (
    <Card className="border-slate-700">
      <CardHeader>
        <CardTitle className="text-base">Sensor {sensorId} - History</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="timestamp"
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#cbd5e1' }}
            />
            <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} tick={{ fill: '#cbd5e1' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#e2e8f0' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px', color: '#cbd5e1' }}
              iconType="line"
            />
            {hasTemperature && (
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#f97316"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                name="Temperature (°C)"
              />
            )}
            {hasHumidity && (
              <Line
                type="monotone"
                dataKey="humidity"
                stroke="#3b82f6"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                name="Humidity (%)"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
