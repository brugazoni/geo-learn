import { useState, useEffect, useRef, useCallback } from 'react';

export function usePdAudio() {
    const [isAudioReady, setIsAudioReady] = useState(false);
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);
    const [loadStatus, setLoadStatus] = useState('Loading audio engine...');
    const pd4webRef = useRef(null);
    const moduleRef = useRef(null);

    useEffect(() => {
        let cancelled = false;

        function loadScript() {
            return new Promise((resolve, reject) => {
                if (typeof window.Pd4WebModule === 'function') {
                    resolve();
                    return;
                }

                const existing = document.querySelector('script[src="/audio/pd4web.js"]');
                if (existing) {
                    const check = setInterval(() => {
                        if (typeof window.Pd4WebModule === 'function') {
                            clearInterval(check);
                            resolve();
                        }
                    }, 100);
                    return;
                }

                const script = document.createElement('script');
                script.src = '/audio/pd4web.js';
                script.async = true;
                script.onload = () => {
                    const check = setInterval(() => {
                        if (typeof window.Pd4WebModule === 'function') {
                            clearInterval(check);
                            resolve();
                        }
                    }, 50);
                };
                script.onerror = () => reject(new Error('Failed to load pd4web.js'));
                document.body.appendChild(script);
            });
        }

        async function fetchWasm() {
            const response = await fetch('/audio/pd4web.wasm');
            if (!response.ok) throw new Error(`WASM fetch failed: ${response.status}`);

            const reader = response.body.getReader();
            const contentLength = +response.headers.get('Content-Length') || 0;
            const chunks = [];
            let received = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                received += value.length;
                if (contentLength > 0) {
                    const pct = Math.round((received / contentLength) * 100);
                    if (!cancelled) setLoadStatus(`Downloading WASM... ${pct}%`);
                }
            }

            const full = new Uint8Array(received);
            let offset = 0;
            for (const chunk of chunks) {
                full.set(chunk, offset);
                offset += chunk.length;
            }
            return full.buffer;
        }

        async function init() {
            try {
                if (!cancelled) setLoadStatus('Loading audio script...');
                await loadScript();
                if (cancelled) return;

                if (!cancelled) setLoadStatus('Downloading WASM...');
                const wasmBinary = await fetchWasm();
                if (cancelled) return;

                if (!cancelled) setLoadStatus('Initializing audio engine...');
                const module = await window.Pd4WebModule({
                    wasmBinary,
                    locateFile: (path) => `/audio/${path}`,
                });
                if (cancelled) return;

                moduleRef.current = module;
                const pd4web = new module.Pd4Web();
                pd4webRef.current = pd4web;

                console.log('pd4web instance ready.');
                if (!cancelled) {
                    setIsScriptLoaded(true);
                    setLoadStatus('Ready — click to start');
                }
            } catch (err) {
                console.error('pd4web initialization failed:', err);
                if (!cancelled) setLoadStatus(`Error: ${err.message}`);
            }
        }

        init();

        return () => { cancelled = true; };
    }, []);

    const initAudio = useCallback(() => {
        const pd4web = pd4webRef.current;
        if (!pd4web) {
            console.error('Pd4Web not initialized yet.');
            return;
        }

        try {
            pd4web.openPatch('index.pd', {
                canvasId: 'Pd4WebCanvas',
                soundToggleId: 'Pd4WebAudioSwitch',
            });
            console.log('pd patch opened.');

            const switchEl = document.getElementById('Pd4WebAudioSwitch');
            if (switchEl) {
                switchEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                console.log('audio engine started by user click.');
            }

            setIsAudioReady(true);
        } catch (err) {
            console.error('Failed to open patch:', err);
        }
    }, []);

    const sendPm25ToPd = useCallback((value) => {
        const pd4web = pd4webRef.current;
        if (isAudioReady && pd4web) {
            try {
                pd4web.sendFloat('pm25', value);
                console.log(`pm25 sent to pd patch: ${value}`);
            } catch (err) {
                console.error('sendFloat error:', err);
            }
        }
    }, [isAudioReady]);

    return { isAudioReady, isScriptLoaded, loadStatus, initAudio, sendPm25ToPd };
}