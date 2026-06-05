import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

export async function GET() {
    try {
        const dbPath = path.join(process.cwd(), 'data-pipeline', 'ecopulse.db');
        console.log("attempting db connection at", dbPath);

        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        console.log("db connected")

        //for now it only returns the latest measurement.
        //TO-DO: feature where you can select other measurements, chosen by a given time.
        const result = await db.get(`
            SELECT cleaned_geojson
            FROM climate_data
            ORDER BY timestamp DESC
            LIMIT 1
        `);

        await db.close();

        if (!result || !result.cleaned_geojson) {
            return NextResponse.json({ error: "No data found in database" }, { status: 404 });
        }

        const geoJson = JSON.parse(result.cleaned_geojson);
        
        return NextResponse.json(geoJson);

    } catch (error) {
        console.error("database query error:", error);
        return NextResponse.json({ error: "failed to fetch local air data from db" }, { status: 500 });
    }
}