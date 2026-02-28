import { useEffect, useRef, useState, useCallback } from 'react'
import mqtt from 'mqtt'

export interface SensorData {
  [key: string]: {
    temperature: number
    humidity: number
    status: 'online' | 'offline'
    lastUpdate: number
  }
}

export interface MQTTConnectionState {
  connected: boolean
  error: string | null
  isDemo: boolean
}

const MQTT_BROKER = process.env.NEXT_PUBLIC_MQTT_BROKER || 'ws://localhost:9001'
const MQTT_USERNAME = process.env.NEXT_PUBLIC_MQTT_USERNAME || ''
const MQTT_PASSWORD = process.env.NEXT_PUBLIC_MQTT_PASSWORD || ''

export function useMQTT() {
  const clientRef = useRef<mqtt.MqttClient | null>(null)
  const [connectionState, setConnectionState] = useState<MQTTConnectionState>({
    connected: false,
    error: null,
    isDemo: false,
  })
  const [sensorData, setSensorData] = useState<SensorData>({})
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const demoIntervalRef = useRef<NodeJS.Timeout>()

  // Generate mock sensor data for demo mode
  const generateDemoData = useCallback(() => {
    const sensors = ['sensor-01', 'sensor-02', 'sensor-03', 'sensor-04']
    const newData: SensorData = {}

    sensors.forEach((sensorId) => {
      newData[sensorId] = {
        temperature: 20 + Math.random() * 15,
        humidity: 40 + Math.random() * 40,
        status: Math.random() > 0.1 ? 'online' : 'offline',
        lastUpdate: Date.now(),
      }
    })

    setSensorData(newData)
  }, [])

  // Initialize MQTT connection
  const initializeMQTT = useCallback(() => {
    try {
      if (clientRef.current?.connected) {
        return
      }

      const mqttOptions: mqtt.IClientOptions = {
        reconnectPeriod: 5000,
        connectTimeout: 5000,
        clean: true,
      }

      if (MQTT_USERNAME) {
        mqttOptions.username = MQTT_USERNAME
        mqttOptions.password = MQTT_PASSWORD
      }

      const client = mqtt.connect(MQTT_BROKER, mqttOptions)

      client.on('connect', () => {
        setConnectionState({
          connected: true,
          error: null,
          isDemo: false,
        })

        // Subscribe to sensor topics
        client.subscribe(['sensors/+/temperature', 'sensors/+/humidity', 'sensors/+/status'], (err) => {
          if (err) {
            console.error('[v0] MQTT subscription error:', err)
          }
        })
      })

      client.on('message', (topic: string, message: Buffer) => {
        try {
          const value = message.toString()
          const parts = topic.split('/')

          if (parts.length === 3) {
            const sensorId = parts[1]
            const dataType = parts[2]

            setSensorData((prevData) => {
              const currentSensor = prevData[sensorId] || {
                temperature: 0,
                humidity: 0,
                status: 'offline',
                lastUpdate: Date.now(),
              }

              const updatedSensor = { ...currentSensor, lastUpdate: Date.now() }

              if (dataType === 'temperature') {
                updatedSensor.temperature = parseFloat(value)
              } else if (dataType === 'humidity') {
                updatedSensor.humidity = parseFloat(value)
              } else if (dataType === 'status') {
                updatedSensor.status = value as 'online' | 'offline'
              }

              return {
                ...prevData,
                [sensorId]: updatedSensor,
              }
            })
          }
        } catch (error) {
          console.error('[v0] Error processing MQTT message:', error)
        }
      })

      client.on('error', (error: Error) => {
        console.error('[v0] MQTT error:', error.message)
        setConnectionState((prev) => ({
          ...prev,
          error: error.message,
          connected: false,
        }))
      })

      client.on('disconnect', () => {
        setConnectionState((prev) => ({
          ...prev,
          connected: false,
        }))
      })

      clientRef.current = client
    } catch (error) {
      console.error('[v0] Failed to initialize MQTT:', error)

      // Fall back to demo mode
      setConnectionState({
        connected: false,
        error: 'MQTT connection failed, running in demo mode',
        isDemo: true,
      })

      // Start demo data generation
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current)
      }

      generateDemoData()
      demoIntervalRef.current = setInterval(generateDemoData, 2000)
    }
  }, [generateDemoData])

  // Initialize on mount
  useEffect(() => {
    initializeMQTT()

    return () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (clientRef.current) {
        clientRef.current.end()
      }
    }
  }, [initializeMQTT])

  return {
    connectionState,
    sensorData,
    client: clientRef.current,
  }
}
