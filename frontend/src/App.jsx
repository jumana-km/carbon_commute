import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  // Core dashboard state
  const [profile, setProfile] = useState({ total_steps: 0, total_karma: 0, co2_saved_kg: 0, history: [] });
  const [mechanism, setMechanism] = useState('cycling');
  
  // Tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [coordinates, setCoordinates] = useState([]);
  const [liveDistance, setLiveDistance] = useState(0);
  const watchId = useRef(null);

  // Fetch profile statistics from MongoDB on load
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = () => {
    fetch('http://192.168.29.204:8000/api/profile')
      .then(res => res.json())
      .then(data => setProfile(data))
      .catch(err => console.error("Error fetching profile:", err));
  };

  // Haversine Formula: Calculates distance between two GPS points in kilometers
  const calculateDistanceDelta = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    setIsTracking(true);
    setCoordinates([]);
    setLiveDistance(0);

    // Turn on the device's GPS hardware sensor
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPoint = { lat: latitude, lng: longitude };

        setCoordinates((prevPoints) => {
          if (prevPoints.length > 0) {
            const lastPoint = prevPoints[prevPoints.length - 1];
            // Calculate distance from last recorded point and add to total
            const delta = calculateDistanceDelta(lastPoint.lat, lastPoint.lng, latitude, longitude);
            
            // Filter out tiny GPS jitters (less than 2 meters)
            if (delta > 0.002) {
              setLiveDistance((prevDist) => prevDist + delta);
            }
          }
          return [...prevPoints, newPoint];
        });
      },
      (error) => console.error("GPS Error:", error),
      {
        enableHighAccuracy: true, // Forces phone/laptop to use actual GPS hardware
        timeout: 30000,
        maximumAge: 5000
      }
    );
  };

  const stopTracking = async () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current); // Shut off the GPS hardware
      setIsTracking(false);

      if (liveDistance <= 0) {
        alert("Trip ended, but no measurable distance was covered.");
        return;
      }

      // Automatically sync data with our FastAPI backend
      try {
        const response = await fetch('http://192.168.29.204:8000/api/log-commute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mechanism: mechanism,
            distance: parseFloat(liveDistance.toFixed(3)),
            steps: mechanism === 'walking' ? Math.round(liveDistance * 1300) : 0 // Estimate steps if walking (~1300 steps/km)
          })
        });

        const data = await response.json();
        if (data.status === 'success') {
          setProfile(data.updated_profile);
          alert(`Commute logged! You covered ${liveDistance.toFixed(2)} km via ${mechanism}.`);
        }
      } catch (error) {
        console.error("Failed to sync trip data with backend:", error);
      }
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '40px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <h1 style={{ color: '#2e7d32', textAlign: 'center' }}>🌱 Carbon Commute</h1>
      
      {/* Metrics Row */}
      <div style={{ display: 'flex', gap: '15px', margin: '20px 0' }}>
        <div style={{ background: '#f1f8e9', padding: '15px', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#33691e' }}>✨ {profile.total_karma}</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>Karma Points</p>
        </div>
        <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#1b5e20' }}>🌍 {profile.co2_saved_kg.toFixed(2)} kg</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>CO₂ Offset</p>
        </div>
        <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#0d47a1' }}>👟 {profile.total_steps}</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>Steps Taken</p>
        </div>
      </div>

      {/* Mode Selection and GPS Tracker */}
      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Track Your Live Journey</h3>
        
        <label style={{ display: 'block', marginBottom: '15px' }}>
          Choose Transit Mechanism:
          <select 
            value={mechanism} 
            onChange={(e) => setMechanism(e.target.value)} 
            disabled={isTracking}
            style={{ width: '100%', padding: '10px', marginTop: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="cycling">🚲 Cycling</option>
            <option value="walking">🚶 Walking</option>
            <option value="public_transit">🚌 Public Transit</option>
          </select>
        </label>

        {isTracking && (
          <div style={{ textAlign: 'center', background: '#fff', padding: '15px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #e0e0e0' }}>
            <span style={{ fontSize: '14px', color: '#d32f2f', fontWeight: 'bold' }}>🔴 LIVE TRACKING ACTIVE</span>
            <h2 style={{ margin: '10px 0 0 0', fontSize: '36px' }}>{liveDistance.toFixed(3)} <span style={{ fontSize: '18px' }}>km</span></h2>
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#777' }}>GPS Updates received: {coordinates.length}</p>
          </div>
        )}

        {!isTracking ? (
          <button onClick={startTracking} style={{ width: '100%', background: '#2e7d32', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
            Start Journey
          </button>
        ) : (
          <button onClick={stopTracking} style={{ width: '100%', background: '#c62828', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
            Stop & Save Commute
          </button>
        )}
      </div>

      {/* History List */}
      <h3 style={{ marginTop: '30px' }}>Recent Green Commutes</h3>
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {profile.history && profile.history.slice().reverse().map((item, idx) => (
          <li key={idx} style={{ padding: '12px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ textTransform: 'capitalize' }}>
                {item.mechanism === 'cycling' ? '🚲' : item.mechanism === 'walking' ? '🚶' : '🚌'} {item.mechanism}
              </strong>
              <div style={{ fontSize: '12px', color: '#666' }}>Distance: {item.distance} km</div>
            </div>
            <span style={{ color: '#2e7d32', fontWeight: 'bold', textAlign: 'right' }}>
              +{item.karma_earned} Karma <br />
              <span style={{ fontSize: '11px', color: '#757575', fontWeight: 'normal' }}>+{item.co2_saved_kg}kg CO₂</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}