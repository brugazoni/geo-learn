import { useState, useEffect, useRef } from 'react';
import { CC_ZOOM_KNOB, CC_STATION_KNOB, MIN_MIDI_ZOOM, MAX_MIDI_ZOOM } from '../config/mapConfig';

export function useMidiControl(mapRef, featuresRef, setHoverInfo) {
    const [midiStatus, setMidiStatus] = useState("disconnected");
    const [lastCc, setLastCc] = useState(null); // New state to track CC number

    const currentIndexRef = useRef(0);
    const prevCcValuesRef = useRef({});
    const lastCcRef = useRef(null); // Ref to prevent excessive re-renders

    const navigateToStationIndex = (index) => {
        const features = featuresRef.current;
        if (!features || features.length === 0 || !mapRef.current) return;

        const selectedFeature = features[index];
        const [lng, lat] = selectedFeature.geometry.coordinates;

        mapRef.current.easeTo({
            center: [lng, lat],
            duration: 200,
            zoom: Math.max(mapRef.current.getZoom(), MIN_MIDI_ZOOM + 2)
        });

        setHoverInfo({ feature: selectedFeature, lng, lat });
    };

    useEffect(() => {
        if (!navigator.requestMIDIAccess) {
            setMidiStatus("web midi not supported in this browser");
            return;
        }

        let isMounted = true; // Protects against React Fast-Refresh race conditions
        let activeInputs = [];
        let lastEventTime = 0;

        function handleMidiMessage(message) {
            const [status, data1, data2] = message.data;
            const isControlChange = (status & 0xF0) === 0xB0;
            
            if (!isControlChange) return;

            const ccNumber = data1;
            const ccValue = data2;

            // Update UI with the current CC knob being turned (throttled to avoid lag)
            if (lastCcRef.current !== ccNumber) {
                lastCcRef.current = ccNumber;
                setLastCc(ccNumber);
            }

            // Anti-Jitter Throttle
            const now = Date.now();
            if (now - lastEventTime < 50) return; 

            // Zoom Knob Logic
            if (ccNumber === CC_ZOOM_KNOB && mapRef.current) {
                const prevValue = prevCcValuesRef.current[ccNumber];
                prevCcValuesRef.current[ccNumber] = ccValue;
                
                if (prevValue !== undefined) {
                    const delta = (ccValue - prevValue) * 0.5; 
                    if (Math.abs(delta) > 0) {
                        lastEventTime = now;
                        const currentZoom = mapRef.current.getZoom();
                        const newZoom = Math.min(Math.max(currentZoom + delta, MIN_MIDI_ZOOM), MAX_MIDI_ZOOM);
                        mapRef.current.easeTo({ zoom: newZoom, duration: 150 });
                    }
                }
            }

            // Station Hopping Logic
            if (ccNumber === CC_STATION_KNOB) {
                const features = featuresRef.current;
                if (!features || features.length === 0) return;

                const prevValue = prevCcValuesRef.current[ccNumber];
                prevCcValuesRef.current[ccNumber] = ccValue;
                
                if (prevValue !== undefined) {
                    const delta = ccValue - prevValue;
                    
                    if (Math.abs(delta) > 0) {
                        lastEventTime = now;
                        let newIndex = (currentIndexRef.current + delta) % features.length;
                        if (newIndex < 0) newIndex = (newIndex + features.length) % features.length;
                        
                        currentIndexRef.current = newIndex;
                        navigateToStationIndex(newIndex);
                    }
                }
            }
        }

        navigator.requestMIDIAccess().then((midiAccess) => {
            if (!isMounted) return; // Abort if React unmounted while waiting

            setMidiStatus("midi status ready for CC");

            // Attach to already connected devices
            for (let input of midiAccess.inputs.values()) {
                input.onmidimessage = handleMidiMessage;
                activeInputs.push(input);
            }

            // Attach to devices plugged in AFTER the page loads
            midiAccess.onstatechange = (e) => {
                setMidiStatus(`${e.port.name} is ${e.port.state}`);
                if (e.port.type === "input" && e.port.state === "connected") {
                    e.port.onmidimessage = handleMidiMessage;
                    if (!activeInputs.includes(e.port)) activeInputs.push(e.port);
                }
            };
        }).catch(() => {
            if (isMounted) setMidiStatus("midi hardware failure");
        });

        // Cleanup: remove listeners and flag as unmounted
        return () => {
            isMounted = false;
            activeInputs.forEach(input => {
                input.onmidimessage = null;
            });
        };
    }, [mapRef, featuresRef, setHoverInfo]);

    // Export both the status and the last used CC
    return { midiStatus, lastCc };
}