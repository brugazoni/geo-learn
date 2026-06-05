import { useState, useEffect, useRef } from 'react';

export function usePdAudio() {
    const [isAudioReady, setIsAudioReady] = useState(false);
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);

    useEffect(() => {
        // 1. Pre-configure Emscripten paths
        window.Module = window.Module || {};
        window.Module.locateFile = function (path) {
            if (path.endsWith('.wasm') || path.endsWith('.data')) {
                return `/audio/${path}`;
            }
            return path;
        };

        // 2. Load the script (if not already loading)
        if (!document.querySelector('script[src="/audio/pd4web.js"]')) {
            const script = document.createElement('script');
            script.src = '/audio/pd4web.js';
            script.async = true;
            document.body.appendChild(script);
        }

        // 3. THE FIX: The Polling Mechanism
        // Check every 100ms if the pd4web C++ bindings have successfully mounted to the window
        const checkEngineInterval = setInterval(() => {
            if (window.Module && typeof window.Module.resumeAudio === 'function') {
                console.log("AirPulse Audio Engine detected and ready!");
                setIsScriptLoaded(true);
                clearInterval(checkEngineInterval); // Stop checking once we find it
            }
        }, 100);

        return () => {
            clearInterval(checkEngineInterval); // Cleanup interval if user navigates away
        };
    }, []);

    const initAudio = () => {
        if (!isScriptLoaded) return;

        let resumed = false;

        // Try to unlock audio
        if (window.Module && typeof window.Module.resumeAudio === 'function') {
            window.Module.resumeAudio();
            console.log("Audio Engine Started via Module!");
            resumed = true;
        } else if (window.audioContext && window.audioContext.state === 'suspended') {
            window.audioContext.resume().then(() => console.log("Audio Context Resumed!"));
            resumed = true;
        }

        if (resumed) {
            setIsAudioReady(true);
        } else {
            console.error("Could not unlock audio context.");
        }
    };

    const sendPm25ToPd = (value) => {
        if (isAudioReady && typeof window.sendFloat === 'function') {
            window.sendFloat('pm25', value);
            console.log(`Sent PM2.5 to Audio Engine: ${value}`);
        }
    };

    return { isAudioReady, isScriptLoaded, initAudio, sendPm25ToPd };
}