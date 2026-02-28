'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  error: string | null;
  brokerUrl?: string;
}

export function ConnectionStatus({
  isConnected,
  error,
  brokerUrl = 'ws://localhost:9001',
}: ConnectionStatusProps) {
  if (isConnected) {
    return (
      <Alert className="border-cyan-500/50 bg-cyan-500/10">
        <Wifi className="h-4 w-4 text-cyan-500" />
        <AlertDescription className="text-cyan-200">
          Connected to MQTT broker at <code className="bg-black/30 px-2 py-1 rounded text-xs">{brokerUrl}</code>
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <AlertDescription className="text-red-200">{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-yellow-500/50 bg-yellow-500/10">
      <WifiOff className="h-4 w-4 text-yellow-500" />
      <AlertDescription className="text-yellow-200">
        Connecting to MQTT broker...
      </AlertDescription>
    </Alert>
  );
}
