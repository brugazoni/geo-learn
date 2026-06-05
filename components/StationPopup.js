import { Popup } from 'react-map-gl/mapbox';

export default function StationPopup({ hoverInfo }) {
    if (!hoverInfo) return null;

    return (
        <Popup
            longitude={hoverInfo.lng}
            latitude={hoverInfo.lat}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
            offsetTop={-10}
        >
            <div style={{ fontFamily: 'monospace', fontSize: '12px', padding: '4px', color: '#000000' }}>
                <strong>Source:</strong> {hoverInfo.feature.properties.source}<br />
                <strong>PM2.5:</strong> {hoverInfo.feature.properties.pm25.toFixed(1)} µg/m³ <br />
                <strong>Lat:</strong> {hoverInfo.lat.toFixed(4)}<br />
                <strong>Lng:</strong> {hoverInfo.lng.toFixed(4)}
            </div>
        </Popup>
    );
}