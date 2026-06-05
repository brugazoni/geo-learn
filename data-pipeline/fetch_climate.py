#ETL script: extract, transform, load

import os
import json
import sqlite3
import requests
from datetime import datetime, timezone

DB_PATH = 'ecopulse.db'

def fetch_data(openaq_token, waqi_token):
    print("fetching opeAQ data")
    openaq_url = 'https://api.openaq.org/v3/parameters/2/latest?&limit=100'
    openaq_res = requests.get(openaq_url, headers={'X-API-Key': openaq_token})
    openaq_data = openaq_res.json() if openaq_res.status_code == 200 else {}

    print("fetching WAQI data")
    #using a "brazil-bounding" latlng box
    waqi_url = f'https://api.waqi.info/map/bounds/?latlng=-33.7,-73.9,5.2,-34.8&token={waqi_token}'
    waqi_res = requests.get(waqi_url)
    waqi_data = waqi_res.json() if waqi_res.status_code == 200 else {}

    return openaq_data, waqi_data

def transform_to_geojson(openaq_data, waqi_data):
    print("transforming data to GeoJSON")
    features = []

    if 'results' in openaq_data:
        for measurement in openaq_data['results']:
            if 'coordinates' in measurement and measurement['coordinates'].get('latitude'):
                features.append({
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [
                            measurement['coordinates']['longitude'],
                            measurement['coordinates']['latitude']
                        ]
                    },
                    "properties": {
                        "id": f"openaq_{measurement.get('locationsId')}",
                        "pm25": measurement.get('value', 0),
                        "source": "OpenAQ",
                        "lastUpdated": measurement.get('datetime', {}).get('utc', datetime.now(timezone.utc).isoformat())
                    }
                })

    if waqi_data.get('status') == 'ok':
        for station in waqi_data.get('data', []):
            aqi_val = station.get('aqi')
            if aqi_val and str(aqi_val).lstrip('-').isdigit():
                features.append({
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [station['lon'], station['lat']]
                    },
                    "properties": {
                        "id": f"waqi_{station.get('uid')}",
                        "pm25": float(aqi_val), #air quality index, but maps to our visual scale as pm25 would
                        "source": "WAQI",
                        "lastUpdated": datetime.now(timezone.utc).isoformat()
                    }
                })

    return {
        "type": "FeatureCollection",
        "features": features
    }

def save_to_db(openaq_raw, waqi_raw, combined_geojson):
    print("loading data into sqlite database")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('''
            CREATE TABLE IF NOT EXISTS climate_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                openaq_raw TEXT,
                waqi_raw TEXT,
                cleaned_geojson TEXT
            )
        ''')
    
    cursor.execute('''
            INSERT INTO climate_data (openaq_raw, waqi_raw, cleaned_geojson)
            VALUES (?, ?, ?)
        ''', (
            json.dumps(openaq_raw),
            json.dumps(waqi_raw),
            json.dumps(combined_geojson)
        ))
    
    conn.commit()
    conn.close()
    print(f"data saved to {DB_PATH}")

if __name__ == "__main__":
    from dotenv import load_dotenv, find_dotenv

    load_dotenv(find_dotenv())
    
    OPENAQ_TOKEN = os.environ.get("NEXT_PUBLIC_OPENAQ_TOKEN")
    WAQI_TOKEN = os.environ.get("NEXT_PUBLIC_WAQI_TOKEN")

    if OPENAQ_TOKEN == "YOUR_OPENAQ_TOKEN" or WAQI_TOKEN == "YOUR_WAQI_TOKEN":
        print("insert API tokens into python script")
        exit(1)


    print("tokens loaded successfully")
    openaq, waqi = fetch_data(OPENAQ_TOKEN, WAQI_TOKEN)
    geojson = transform_to_geojson(openaq, waqi)
    save_to_db(openaq, waqi, geojson)