import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

mapboxgl.accessToken = MAPBOX_TOKEN;

const defaultCoords = { lat: 20, lng: 0 }; // World center view

interface MapboxMapProps {
  showSearch?: boolean;
  showDefaultMarker?: boolean;
  itineraryData?: any;
}

const MapboxMap: React.FC<MapboxMapProps> = ({ showSearch = true, showDefaultMarker = true, itineraryData }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const itineraryMarkers = useRef<mapboxgl.Marker[]>([]);
  
  const [coords, setCoords] = useState(defaultCoords);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mapContainer.current) return;

    // Clean up any existing map
    if (map.current) {
      if (marker.current) {
        marker.current.remove();
        marker.current = null;
      }
      map.current.remove();
      map.current = null;
    }
    
    // Create new map instance
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [coords.lng, coords.lat],
      zoom: showDefaultMarker ? 13 : 2 // Low zoom for world view when no marker
    });

    // Wait for map to load and then resize
    map.current.on('load', () => {
      if (map.current) {
        setTimeout(() => {
          map.current?.resize();
        }, 100);
      }
    });

    // Add marker only if showDefaultMarker is true
    if (showDefaultMarker) {
      const markerElement = document.createElement('div');
      markerElement.innerHTML = `
        <svg height="32" viewBox="0 0 24 24" style="display: block;">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#FF2D00" />
          <circle cx="12" cy="9" r="2.5" fill="white" />
        </svg>
      `;
      
      marker.current = new mapboxgl.Marker(markerElement)
        .setLngLat([coords.lng, coords.lat])
        .addTo(map.current);
    }

    return () => {
      if (marker.current) {
        marker.current.remove();
        marker.current = null;
      }
      itineraryMarkers.current.forEach(marker => marker.remove());
      itineraryMarkers.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Effect to handle itinerary data and add markers
  useEffect(() => {
    if (!map.current || !itineraryData) return;

    // Clear existing itinerary markers
    itineraryMarkers.current.forEach(marker => marker.remove());
    itineraryMarkers.current = [];

    // Extract coordinates from itinerary data
    const coordinates: Array<{
      lat: number;
      lng: number;
      label: string;
      time?: string;
      type?: string;
      day?: string;
    }> = [];
    
    console.log('Processing itinerary data for map:', itineraryData);
    console.log('itineraryData.itinerary:', itineraryData?.itinerary);
    console.log('Type of itineraryData.itinerary:', typeof itineraryData?.itinerary);
    
    // Handle different possible data structures
    let processedData = null;
    
    if (itineraryData?.itinerary?.itinerary) {
      // Handle double nesting: finalResponse.itinerary.itinerary.day_1
      processedData = itineraryData.itinerary.itinerary;
      console.log('Using double nested itinerary data');
    } else if (itineraryData?.itinerary) {
      // Handle single nesting: finalResponse.itinerary.day_1  
      processedData = itineraryData.itinerary;
      console.log('Using single nested itinerary data');
    } else if (Array.isArray(itineraryData)) {
      // Handle case where itineraryData itself is an array
      processedData = { day_1: itineraryData };
      console.log('Converting array to day_1 structure');
    } else if (itineraryData && typeof itineraryData === 'object') {
      // Handle case where itineraryData might be the day structure directly
      processedData = itineraryData;
      console.log('Using direct day structure');
    }
    
    console.log('Processed data for extraction:', processedData);
    
    if (processedData && typeof processedData === 'object' && !Array.isArray(processedData)) {
      // Handle the standard API response format: { day_1: [...], day_2: [...] }
      Object.entries(processedData).forEach(([day, dayActivities]: [string, any]) => {
        console.log(`Processing ${day}:`, dayActivities);
        
        // Check if dayActivities is an array before calling forEach
        if (Array.isArray(dayActivities)) {
          dayActivities.forEach((activity: any) => {
            if (activity.coordinates) {
              coordinates.push({
                lat: activity.coordinates.latitude,
                lng: activity.coordinates.longitude,
                label: activity.place || activity.name || 'Location',
                time: activity.time,
                type: activity.type,
                day: day.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
              });
            }
          });
        } else {
          console.log(`${day} activities is not an array:`, typeof dayActivities, dayActivities);
        }
      });
    } else {
      console.log('Could not process data - unexpected format:', typeof processedData, processedData);
    }
    
    console.log('Extracted coordinates:', coordinates);

    if (coordinates.length > 0) {
      // Add markers for each location
      coordinates.forEach((coord, index) => {
        const markerElement = document.createElement('div');
        markerElement.innerHTML = `
          <div class="bg-[#FF2D00] text-white px-2 py-1 rounded text-xs font-bold shadow-lg mb-1 max-w-32 text-center">
            ${coord.label}
            ${coord.time ? `<br/><span class="text-xs opacity-75">${coord.time}</span>` : ''}
          </div>
          <svg height="24" viewBox="0 0 24 24" style="display: block; margin: 0 auto;">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#FF2D00" />
            <circle cx="12" cy="9" r="2.5" fill="white" />
            <text x="12" y="13" text-anchor="middle" fill="white" font-size="8" font-weight="bold">${index + 1}</text>
          </svg>
        `;
        
        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([coord.lng, coord.lat])
          .addTo(map.current!);
          
        itineraryMarkers.current.push(marker);
      });

      // Fit bounds to show all markers
      if (coordinates.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach(coord => bounds.extend([coord.lng, coord.lat]));
        map.current.fitBounds(bounds, { padding: 50 });
      } else {
        // Single location - center and zoom
        map.current.setCenter([coordinates[0].lng, coordinates[0].lat]);
        map.current.setZoom(13);
      }
    }
  }, [itineraryData]);

  useEffect(() => {
    if (map.current && marker.current) {
      map.current.setCenter([coords.lng, coords.lat]);
      marker.current.setLngLat([coords.lng, coords.lat]);
    }
  }, [coords]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}`
      );
      const data = await res.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setCoords({ lat, lng });
      } else {
        setError('Location not found');
      }
    } catch (err) {
      setError('Error searching location');
    }
    
    setLoading(false);
  };

  return (
    <div className="w-full h-full flex flex-col items-center">
      {showSearch && (
        <>
          <div className="mb-4 w-full flex">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for a place..."
              className="flex-1 border border-[#FF2D00] rounded-l px-3 py-2 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
            />
            <button
              type="button"
              onClick={handleSearch}
              className="bg-[#FF2D00] text-white px-4 py-2 rounded-r hover:bg-white hover:text-[#FF2D00] border border-[#FF2D00] transition"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          {error && <div className="text-red-500 mb-2">{error}</div>}
        </>
      )}
      <div 
        ref={mapContainer} 
        className="w-full h-[350px] rounded-lg overflow-hidden"
        style={{ minHeight: '350px' }}
      />
    </div>
  );
};

export default MapboxMap;