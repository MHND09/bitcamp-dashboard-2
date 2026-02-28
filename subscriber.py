#!/usr/bin/env python3
"""
Bitcamp Advanced Workshop - MQTT Subscriber & SQLite Database Writer

This script subscribes to sensor data from the MQTT broker and stores it
in a SQLite database for persistent storage and later visualization.

It listens to:
- sensors/*/temperature
- sensors/*/humidity

And stores the data in a local SQLite database.
"""

import paho.mqtt.client as mqtt
import sqlite3
import json
import logging
from datetime import datetime
from pathlib import Path
import time

# ===== CONFIGURATION =====
MQTT_BROKER = "raspberrypi239.local"  # IP of Raspberry Pi running Mosquitto
MQTT_PORT = 1883
MQTT_KEEPALIVE = 60

# Database file location
DB_FILE = "sensor_data.db"

# Topics to subscribe to (using wildcards)
TOPICS = [
    ("sensors/+/temperature", 0),
    ("sensors/+/humidity", 0),
]

# ===== LOGGING SETUP =====
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ===== GLOBAL STATE =====
mqtt_client = None
db_connection = None
messages_received = 0


# ===== DATABASE SETUP =====
def init_database():
    """Initialize SQLite database with schema"""
    global db_connection
    
    try:
        db_connection = sqlite3.connect(DB_FILE, check_same_thread=False)
        cursor = db_connection.cursor()
        
        # Create table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_name TEXT NOT NULL,
                sensor_type TEXT NOT NULL,  -- 'temperature' or 'humidity'
                value REAL NOT NULL,
                unit TEXT NOT NULL,
                timestamp DATETIME NOT NULL,
                received_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create index on timestamp for efficient queries
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_timestamp 
            ON sensor_readings(timestamp)
        ''')
        
        # Create index on sensor_name for filtering
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_sensor_name 
            ON sensor_readings(sensor_name)
        ''')
        
        db_connection.commit()
        logger.info(f"✓ Database initialized: {DB_FILE}")
        return True
        
    except sqlite3.Error as e:
        logger.error(f"✗ Database initialization error: {e}")
        return False
    except Exception as e:
        logger.error(f"✗ Unexpected error initializing database: {e}")
        return False


# ===== MQTT CALLBACKS =====
def on_connect(client, userdata, flags, rc):
    """Called when client connects to MQTT broker"""
    if rc == 0:
        logger.info(f"✓ Connected to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}")
        
        # Subscribe to all sensor topics
        for topic, qos in TOPICS:
            result = client.subscribe(topic, qos=qos)
            if result[0] == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"  ✓ Subscribed to: {topic}")
            else:
                logger.warning(f"  ✗ Failed to subscribe to: {topic}")
    else:
        logger.error(f"✗ Connection failed. Code: {rc}")


def on_disconnect(client, userdata, rc):
    """Called when client disconnects"""
    if rc != 0:
        logger.warning(f"Unexpected disconnection. Code: {rc}")


def on_message(client, userdata, msg):
    """Called when a message is received"""
    global messages_received
    
    try:
        messages_received += 1
        
        # Parse topic to extract sensor name and type
        # Topic format: sensors/SENSOR_NAME/SENSOR_TYPE
        topic_parts = msg.topic.split('/')
        if len(topic_parts) != 3:
            logger.warning(f"Unexpected topic format: {msg.topic}")
            return
        
        sensor_name = topic_parts[1]
        sensor_type = topic_parts[2]  # 'temperature' or 'humidity'
        
        # Parse payload (should be JSON)
        payload = json.loads(msg.payload.decode())
        value = payload.get('value')
        unit = payload.get('unit', '')
        timestamp = payload.get('timestamp', datetime.now().isoformat())
        
        # Validate data
        if value is None:
            logger.warning(f"No value in payload from {msg.topic}")
            return
        
        # Store in database
        if store_reading(sensor_name, sensor_type, value, unit, timestamp):
            logger.info(f"[{messages_received:04d}] {sensor_name:15} | {sensor_type:10} = {value:6.1f} {unit}")
        
    except json.JSONDecodeError:
        logger.warning(f"Invalid JSON payload from {msg.topic}: {msg.payload}")
    except Exception as e:
        logger.error(f"Error processing message from {msg.topic}: {e}")


# ===== DATABASE OPERATIONS =====
def store_reading(sensor_name, sensor_type, value, unit, timestamp):
    """Store a sensor reading in the database"""
    if db_connection is None:
        logger.error("Database not initialized")
        return False
    
    try:
        cursor = db_connection.cursor()
        cursor.execute('''
            INSERT INTO sensor_readings 
            (sensor_name, sensor_type, value, unit, timestamp)
            VALUES (?, ?, ?, ?, ?)
        ''', (sensor_name, sensor_type, value, unit, timestamp))
        
        db_connection.commit()
        return True
        
    except sqlite3.Error as e:
        logger.error(f"Database error: {e}")
        return False


def get_latest_readings():
    """Get the latest reading from each sensor"""
    if db_connection is None:
        return None
    
    try:
        cursor = db_connection.cursor()
        cursor.execute('''
            SELECT DISTINCT sensor_name, sensor_type, value, unit, timestamp
            FROM sensor_readings
            WHERE (sensor_name, timestamp) IN (
                SELECT sensor_name, MAX(timestamp)
                FROM sensor_readings
                GROUP BY sensor_name
            )
            ORDER BY sensor_name, sensor_type
        ''')
        
        results = cursor.fetchall()
        return results
    except sqlite3.Error as e:
        logger.error(f"Database query error: {e}")
        return None


def get_readings_summary():
    """Get summary statistics of stored readings"""
    if db_connection is None:
        return None
    
    try:
        cursor = db_connection.cursor()
        cursor.execute('''
            SELECT sensor_name, sensor_type, COUNT(*) as count,
                   MIN(value) as min_val, MAX(value) as max_val,
                   AVG(value) as avg_val
            FROM sensor_readings
            GROUP BY sensor_name, sensor_type
            ORDER BY sensor_name, sensor_type
        ''')
        
        results = cursor.fetchall()
        return results
    except sqlite3.Error as e:
        logger.error(f"Database query error: {e}")
        return None


# ===== MQTT CLIENT INITIALIZATION =====
def init_mqtt():
    """Initialize and connect MQTT client"""
    global mqtt_client
    
    try:
        mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
        mqtt_client.on_connect = on_connect
        mqtt_client.on_disconnect = on_disconnect
        mqtt_client.on_message = on_message
        
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, MQTT_KEEPALIVE)
        mqtt_client.loop_start()  # Start background loop
        
        time.sleep(1)  # Give connection time to establish
        return True
    except Exception as e:
        logger.error(f"✗ Failed to initialize MQTT: {e}")
        logger.error(f"  Make sure broker is running at {MQTT_BROKER}:{MQTT_PORT}")
        return False


# ===== MAIN LOOP =====
def main():
    """Main program loop"""
    logger.info("=" * 60)
    logger.info("Bitcamp Advanced - MQTT Subscriber & Database Writer")
    logger.info("=" * 60)
    logger.info(f"MQTT Broker: {MQTT_BROKER}:{MQTT_PORT}")
    logger.info(f"Database: {DB_FILE}")
    logger.info("Subscribing to:")
    for topic, qos in TOPICS:
        logger.info(f"  - {topic}")
    logger.info("=" * 60)
    
    # Initialize database
    if not init_database():
        logger.error("Cannot continue without database. Exiting.")
        return
    
    # Initialize MQTT
    if not init_mqtt():
        logger.error("Cannot continue without MQTT. Exiting.")
        return
    
    logger.info("✓ All systems initialized. Waiting for sensor data...")
    logger.info("Press Ctrl+C to exit\n")
    
    try:
        while True:
            time.sleep(60)  # Print stats every minute
            
            # Print current data summary
            summary = get_readings_summary()
            if summary:
                logger.info("--- Database Summary ---")
                for row in summary:
                    sensor_name, sensor_type, count, min_val, max_val, avg_val = row
                    logger.info(f"  {sensor_name:15} {sensor_type:10}: "
                              f"samples={count:4d} | min={min_val:6.1f} | "
                              f"max={max_val:6.1f} | avg={avg_val:6.1f}")
            
    except KeyboardInterrupt:
        logger.info("\nShutdown requested...")
    except Exception as e:
        logger.error(f"✗ Unexpected error in main loop: {e}")
    finally:
        cleanup()


# ===== CLEANUP =====
def cleanup():
    """Clean shutdown"""
    logger.info("Cleaning up...")
    
    # Stop MQTT client
    if mqtt_client:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        logger.info("✓ MQTT client disconnected")
    
    # Close database
    if db_connection:
        db_connection.close()
        logger.info(f"✓ Database closed. Total messages stored: {messages_received}")
    
    logger.info("✓ Shutdown complete")


# ===== ENTRY POINT =====
if __name__ == "__main__":
    main()