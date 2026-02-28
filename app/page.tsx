'use client';

import { useMqttConnection } from '@/hooks/use-mqtt-connection';
import { useSensorData } from '@/hooks/use-sensor-data';
import { SensorCard } from '@/components/sensor-card';
import { ConnectionStatus } from '@/components/connection-status';
import { SensorChart } from '@/components/sensor-chart';
import { Activity, Zap, TrendingUp, CheckCircle2, Database } from 'lucide-react';

const MQTT_BROKER_URL = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || 'ws://localhost:9001';

export default function Home() {
  // MQTT is now ONLY used for online/offline status in Iteration 2
  const { isConnected, error: mqttError, sensors: mqttSensors } = useMqttConnection(MQTT_BROKER_URL);
  
  // Database polling for actual sensor values
  const { data: dbData, loading: dbLoading, error: dbError, queryTime } = useSensorData();

  // Combine unique sensor IDs from both MQTT status and DB data
  const sensorIds = Array.from(new Set([
    ...Object.keys(mqttSensors),
    ...Object.keys(dbData)
  ])).sort();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8 space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg">
              <Database className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white">Sensor Dashboard</h1>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm font-semibold rounded-full border border-emerald-500/30">
              Iteration 2
            </span>
          </div>
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Persistent data with MQTT status signaling
          </p>
        </div>

        {/* Iteration 2 Success Banner */}
        <div className="mb-6 bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-4 flex items-start gap-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-emerald-400 font-semibold mb-1">
               Iteration 2: Data is persisted in the database!
            </h3>
            <p className="text-emerald-400/80 text-sm">
              Notice how refreshing the page doesn't clear your data anymore. 
              The temperature and humidity values are fetched securely from the SQLite database.
            </p>
            <div className="mt-3">
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-sm font-medium transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>

        {dbError && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-red-400 mb-2 font-semibold">Database Error</p>
            <p className="text-red-400/80 text-sm">{dbError}</p>
          </div>
        )}

        {/* Connection Status */}
        <div className="mb-8">
          <ConnectionStatus
            isConnected={isConnected}
            error={mqttError}
            brokerUrl={MQTT_BROKER_URL}
          />
        </div>

        {/* Sensors Grid */}
        {dbLoading ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-400">Loading sensor data from database...</p>
          </div>
        ) : sensorIds.length > 0 ? (
          <>
            {/* Current Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {sensorIds.map((sensorId) => {
                const dbSensor = dbData[sensorId] || {};
                const mqttSensor = mqttSensors[sensorId] || {};
                
                // Get most recent timestamp from either sensor reading
                const tempTime = dbSensor.temperature?.timestamp;
                const humTime = dbSensor.humidity?.timestamp;
                const lastUpdateStr = tempTime || humTime;
                
                return (
                  <SensorCard
                    key={sensorId}
                    sensorId={sensorId}
                    temperature={dbSensor.temperature?.value}
                    humidity={dbSensor.humidity?.value}
                    status={mqttSensor.status || 'offline'}
                    lastUpdate={lastUpdateStr ? new Date(lastUpdateStr).getTime() : undefined}
                  />
                );
              })}
            </div>

            {/* Charts Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">History (Last 24 Hours)</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sensorIds.map((sensorId) => (
                  <SensorChart
                    key={`chart-${sensorId}`}
                    sensorId={sensorId}
                    history={dbData[sensorId]?.history || []}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="text-center">
              <div className="inline-flex p-3 bg-slate-800 rounded-lg mb-4">
                <Database className="w-8 h-8 text-slate-400" />
              </div>
              <h2 className="text-xl font-semibold text-slate-200 mb-2">
                No Database Records
              </h2>
              <p className="text-slate-400 max-w-md">
                Ensure the MQTT subscriber script (02_mqtt_subscriber_db.py) is running and storing data in SQLite.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">
            Iteration 2: 
            MQTT for status  
            SQLite for persistence  
            2-second API polling
          </p>
          {queryTime > 0 && (
             <p className="text-xs text-emerald-500/70 font-mono">
               Database query time: {queryTime}ms
             </p>
          )}
        </div>
      </div>
    </main>
  );
}
