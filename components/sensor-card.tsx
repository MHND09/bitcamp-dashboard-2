'use client';

import { Cloud, CloudOff, Droplets, Thermometer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';

interface SensorCardProps {
  sensorId: string;
  temperature?: number;
  humidity?: number;
  status?: 'online' | 'offline';
  lastUpdate?: number;
}

export function SensorCard({
  sensorId,
  temperature,
  humidity,
  status = 'offline',
  lastUpdate,
}: SensorCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 1000);
    return () => clearTimeout(timer);
  }, [temperature, humidity]);

  const isOnline = status === 'online';
  const timeAgo = lastUpdate
    ? Math.floor((Date.now() - lastUpdate) / 1000)
    : null;

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 ${
        isAnimating ? 'ring-2 ring-cyan-500' : ''
      } ${isOnline ? 'border-cyan-500/50' : 'border-red-500/50 opacity-60'}`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none ${
          isAnimating ? 'animate-pulse' : ''
        }`}
      />

      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex-1">
          <CardTitle className="text-lg font-semibold">Sensor {sensorId}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {isOnline ? 'Online' : 'Offline'}
            {timeAgo !== null && ` • ${timeAgo}s ago`}
          </p>
        </div>
        <div className={`p-2 rounded-lg ${isOnline ? 'bg-cyan-500/20' : 'bg-red-500/20'}`}>
          {isOnline ? (
            <Cloud className="w-5 h-5 text-cyan-500" />
          ) : (
            <CloudOff className="w-5 h-5 text-red-500" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-medium text-muted-foreground">Temperature</span>
            </div>
            <div
              className={`text-2xl font-bold transition-all duration-300 ${
                isAnimating ? 'scale-110' : 'scale-100'
              } ${temperature ? 'text-orange-500' : 'text-muted-foreground'}`}
            >
              {temperature !== undefined ? `${temperature.toFixed(1)}°C` : '—'}
            </div>
          </div>

          {/* Humidity */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Humidity</span>
            </div>
            <div
              className={`text-2xl font-bold transition-all duration-300 ${
                isAnimating ? 'scale-110' : 'scale-100'
              } ${humidity ? 'text-blue-500' : 'text-muted-foreground'}`}
            >
              {humidity !== undefined ? `${humidity.toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>

        {/* Status indicator bar */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-cyan-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {isOnline ? 'Receiving data' : 'No signal'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
