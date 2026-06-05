'use client';

import React, { useState, useRef, useEffect } from 'react';
import Map, { Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

import { MAPBOX_TOKEN, sensorLayerStyle } from '../config/mapConfig';
import { useClimateData } from '../hooks/useClimateData';
import { useMidiControl } from '../hooks/useMidiControl';
import { usePdAudio } from '../hooks/usePdAudio';
import StationPopup from '../components/StationPopup';

export default function EcoPulseMap() {
    const mapRef = useRef(null);
    const [hoverInfo, setHoverInfo] = useState(null);

    // fetch data
    const { climateData, featuresRef, error } = useClimateData();

    // init midi control
    const { midiStatus, lastCc } = useMidiControl(mapRef, featuresRef, setHoverInfo);

    // init pd audio hook - NOW EXTRACTING isScriptLoaded
    const { isAudioReady, isScriptLoaded, initAudio, sendPm25ToPd } = usePdAudio();

    // watch for station hopping and sending data to pd
    useEffect(() => {
        if (isAudioReady && hoverInfo && hoverInfo.feature) {
            const currentPm25 = hoverInfo.feature.properties.pm25;
            sendPm25ToPd(currentPm25);
        }
    }, [hoverInfo, isAudioReady]);

    // hover interactions
    const onHover = (event) => {
        const { features, point: { x, y } } = event;
        const hoveredFeature = features && features.find(f => f.layer.id === 'sensor-points');

        if (hoveredFeature) {
            setHoverInfo({
                feature: hoveredFeature, x, y,
                lng: hoveredFeature.geometry.coordinates[0],
                lat: hoveredFeature.geometry.coordinates[1]
            });
        } else {
            setHoverInfo(null);
        }
    };

    if (error) return <div>Error loading data: {error}</div>;

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            {!isAudioReady && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
                }}>
                    <h1 style={{ color: '#00ffcc', fontFamily: 'monospace', marginBottom: '20px' }}>
                        AirPulse Audio Engine
                    </h1>
                    <button 
                        onClick={initAudio}
                        disabled={!isScriptLoaded} // Lock the button if not loaded
                        style={{
                            padding: '15px 30px', fontSize: '1.2rem', 
                            cursor: isScriptLoaded ? 'pointer' : 'not-allowed',
                            backgroundColor: isScriptLoaded ? '#ffcc00' : '#555555', 
                            color: isScriptLoaded ? '#000' : '#aaaaaa', 
                            border: 'none', fontFamily: 'monospace', 
                            borderRadius: '4px', fontWeight: 'bold',
                            transition: 'background-color 0.3s'
                        }}
                    >
                        {isScriptLoaded ? "CLICK TO INITIALIZE AUDIO" : "LOADING AUDIO FILES..."}
                    </button>
                </div>
            )}
            
            <div style={{ 
                position: 'absolute', top: 10, left: 10, zIndex: 1, 
                background: 'rgba(0,0,0,0.8)', color: '#00ffcc', 
                padding: '12px', fontFamily: 'monospace', borderRadius: '4px' 
            }}>
                <div><strong>Status:</strong> {midiStatus}</div>
                <div style={{ marginTop: '4px', color: '#ffcc00' }}>
                    <strong>Last CC:</strong> {lastCc !== null ? `Knob ${lastCc}` : "None"}
                </div>
            </div>

            <Map
                ref={mapRef}
                initialViewState={{ longitude: -51.9253, latitude: -14.235, zoom: 4, pitch: 30 }}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                mapboxAccessToken={MAPBOX_TOKEN}
                onMouseMove={onHover}
                onMouseLeave={() => setHoverInfo(null)}
                interactiveLayerIds={['sensor-points']}
            >
                {climateData && (
                    <Source id="climate-resource" type="geojson" data={climateData}>
                        <Layer {...sensorLayerStyle} />
                    </Source>
                )}

                <StationPopup hoverInfo={hoverInfo} />
            </Map>
        </div>
    );
}