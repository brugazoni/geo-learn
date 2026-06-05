import { useState, useEffect, useRef } from 'react';

export function useClimateData() {
    const [climateData, setClimateData] = useState(null);
    const [error, setError] = useState(null);
    const featuresRef = useRef([]); //for midi access

    useEffect(() => {
        fetch('/api/climate-data')
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(`server error: ${data.error || res.status}`);
                if (data.type !== "FeatureCollection") throw new Error("received data is not a feature collection");
                return data;
            })
            .then((data) => {
                console.log("front end received valid geojson:", data);
                featuresRef.current = data.features || [];
                setClimateData(data);
            })
            .catch((err) => {
                console.error("frontend fetch error:, err.message");
                setError(err.message);
            });
    }, []);

    return { climateData, featuresRef, error };
}