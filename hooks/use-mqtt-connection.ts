'use client';

import { useEffect, useState, useCallback } from 'react';
import mqtt from 'mqtt';

export interface SensorStatusData {
  [sensorId: string]: {
    status?: 'online' | 'offline';
  };
}

interface MQTTConnectionState {
  isConnected: boolean;
  error: string | null;
  sensors: SensorStatusData;
}

export function useMqttConnection(brokerUrl: string = 'ws://localhost:9001') {
  const [state, setState] = useState<MQTTConnectionState>({
    isConnected: false,
    error: null,
    sensors: {},
  });

  const updateSensorStatus = useCallback(
    (sensorId: string, status: 'online' | 'offline') => {
      setState((prevState) => ({
        ...prevState,
        sensors: {
          ...prevState.sensors,
          [sensorId]: { status },
        },
      }));
    },
    []
  );

  useEffect(() => {
    let client: mqtt.MqttClient | null = null;
    const connectTimeout = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        error: 'Connection timeout. Check MQTT broker URL and ensure it is running.',
      }));
    }, 5000);

    try {
      client = mqtt.connect(brokerUrl, {
        reconnectPeriod: 3000,
        connectTimeout: 4000,
        clean: true,
      });

      client.on('connect', () => {
        console.log('[v2] MQTT connected');
        clearTimeout(connectTimeout);
        setState((prev) => ({
          ...prev,
          isConnected: true,
          error: null,
        }));

        // Iteration 2: Only subscribe to status topics
        client!.subscribe('sensors/+/status', (err) => {
          if (err) console.error('[v2] Subscribe error:', err);
        });
      });

      client.on('message', (topic, message) => {
        const parts = topic.split('/');
        if (parts.length === 3) {
          const sensorId = parts[1];
          const fieldType = parts[2];
          const rawString = message.toString();

          if (fieldType === 'status') {
            updateSensorStatus(sensorId, rawString as 'online' | 'offline');
          }
        }
      });

      client.on('error', (err) => {
        console.error('[v0] MQTT error:', err);
        setState((prev) => ({
          ...prev,
          isConnected: false,
          error: `Connection failed: ${err.message || 'Unknown error'}`,
        }));
      });

      client.on('disconnect', () => {
        console.log('[v0] MQTT disconnected');
        setState((prev) => ({
          ...prev,
          isConnected: false,
        }));
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect to MQTT broker';
      setState((prev) => ({
        ...prev,
        error: errorMsg,
      }));
    }

    return () => {
      clearTimeout(connectTimeout);
      if (client) {
        client.end();
      }
    };
  }, [brokerUrl, updateSensorStatus]);

  return state;
}
