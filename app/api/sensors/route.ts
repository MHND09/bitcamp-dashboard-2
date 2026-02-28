import { NextResponse } from 'next/server';
import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

let dbInstance: Database | null = null;
let SQL: any = null;

async function getDbConnection() {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'sensor_data.db');

  if (!fs.existsSync(dbPath)) {
    throw new Error('Database not found. Start the MQTT subscriber script (02_mqtt_subscriber_db.py).');
  }

  // Initialize SQL.js if not already done
  if (!SQL) {
    const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
    const wasmBinary = fs.readFileSync(wasmPath).buffer;
    SQL = await initSqlJs({ wasmBinary });
  }

  // Read the database file
  const filebuffer = fs.readFileSync(dbPath);
  
  // Create a new database instance from the buffer
  const db = new SQL.Database(filebuffer);
  return db;
}

export async function GET() {
  try {
    const db = await getDbConnection();
    
    const query = `
      SELECT id, sensor_name, sensor_type, value, unit, timestamp
      FROM sensor_readings
      WHERE timestamp > datetime('now', '-24 hours')
      ORDER BY timestamp DESC
    `;
    
    const stmt = db.prepare(query);
    const rows: any[] = [];
    
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    const sensors: Record<string, any> = {};

    if (rows && rows.length > 0) {
      for (const row of rows) {
        const { sensor_name, sensor_type, value, unit, timestamp } = row;
        
        if (!sensors[sensor_name]) {
          sensors[sensor_name] = { history: [] };
        }

        const tStamp = new Date(timestamp as string).getTime();

        // Assign latest temperature / humidity if not already set
        if (!sensors[sensor_name][sensor_type]) {
          sensors[sensor_name][sensor_type] = {
            value,
            unit,
            timestamp
          };
        }

        // Build history (limiting to ~120 points)
        const historyRef = sensors[sensor_name].history;
        if (historyRef.length < 120) {
          const existingPoint = historyRef.find((h: any) => Math.abs(h.timestamp - tStamp) < 2000);
          if (existingPoint) {
            existingPoint[sensor_type] = value;
          } else {
            historyRef.push({
              timestamp: tStamp,
              [sensor_type]: value
            });
          }
        }
      }
    }

    // Sort history points by timestamp ASC for charting
    for (const s of Object.values(sensors)) {
      (s as any).history.sort((a: any, b: any) => a.timestamp - b.timestamp);
    }
    
    db.close();
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      sensors
    });
    
  } catch (error) {
    console.error('API Error:', error);
    if (error instanceof Error && error.message.includes('Database not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Database query failed: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}