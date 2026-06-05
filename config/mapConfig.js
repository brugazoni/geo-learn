export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export const CC_ZOOM_KNOB = 23;
export const CC_STATION_KNOB = 24;
export const MIN_MIDI_ZOOM = 2;
export const MAX_MIDI_ZOOM = 18;

export const sensorLayerStyle = {
    id: 'sensor-points',
    type: 'circle',
    paint: {
        'circle-opacity': [
            'case',
            ['==', ['get', 'source'], 'OpenAQ'], 0.1,
            0.8
        ],

        'circle-stroke-color': [
            'case',
            ['==', ['get', 'source'], 'OpenAQ'], '#ffffff',
            '#aaaaaa'
        ],
        'circle-stroke-width': [
            'case',
            ['==', ['get', 'source'], 'OpenAQ'], 3,
            1
        ],
        'circle-radius': [
            'interpolate', ['linear'], ['get', 'pm25'],
            0, 6,
            100, 25
        ],
        'circle-color': [
            'interpolate', ['linear'], ['get', 'pm25'],
            0, '#00ffcc',
            50, '#ffcc00',
            100, '#ff0033'
        ]
    }
};