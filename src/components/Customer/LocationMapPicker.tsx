import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Check, X, Compass, AlertCircle } from 'lucide-react';
import { MATALE_AREAS } from '../../services/seedData';
import { MataleArea } from '../../types';
import { formatLKR } from '../../utils/formatters';

interface LocationMapPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialArea?: string;
  onLocationSelect: (location: {
    lat: number;
    lng: number;
    area: string;
    description: string;
  }) => void;
  onClose?: () => void;
  compact?: boolean;
}

// Default Matale coordinates (Clock Tower / Central Market area)
const DEFAULT_MATALE_LAT = 7.4675;
const DEFAULT_MATALE_LNG = 80.6234;

// Calculate distance between two coordinates in kilometers
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find nearest Matale delivery zone
function findNearestMataleArea(lat: number, lng: number): { area: MataleArea; distanceKm: number } {
  let closest = MATALE_AREAS[0];
  let minDistance = 9999;

  for (const a of MATALE_AREAS) {
    if (a.lat !== undefined && a.lng !== undefined) {
      const dist = getDistanceKm(lat, lng, a.lat, a.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closest = a;
      }
    }
  }

  return { area: closest, distanceKm: minDistance };
}

export const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  initialLat,
  initialLng,
  initialArea,
  onLocationSelect,
  onClose,
  compact = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Initial coordinates priority: passed lat/lng > area coordinates > default Matale
  const areaMatch = MATALE_AREAS.find((a) => a.name === initialArea);
  const startLat = initialLat || areaMatch?.lat || DEFAULT_MATALE_LAT;
  const startLng = initialLng || areaMatch?.lng || DEFAULT_MATALE_LNG;

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: startLat,
    lng: startLng,
  });

  const [detectedArea, setDetectedArea] = useState<MataleArea>(() => {
    return areaMatch || findNearestMataleArea(startLat, startLng).area;
  });

  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Prevent duplicate map initialization
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: 15,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    // OpenStreetMap standard tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Custom modern green delivery pin icon
    const customPinIcon = L.divIcon({
      className: 'matale-delivery-pin',
      html: `
        <div style="transform: translate(-50%, -100%);">
          <div style="background: linear-gradient(135deg, #059669, #0f766e); color: white; width: 38px; height: 38px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.35); border: 3px solid #ffffff;">
            <span style="transform: rotate(45deg); font-size: 18px;">📍</span>
          </div>
          <div style="width: 12px; height: 4px; background: rgba(0,0,0,0.3); border-radius: 50%; margin: 2px auto 0 auto;"></div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 38],
    });

    // Create draggable marker
    const marker = L.marker([startLat, startLng], {
      icon: customPinIcon,
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    const updatePosition = (lat: number, lng: number) => {
      setCurrentCoords({ lat, lng });
      const nearest = findNearestMataleArea(lat, lng);
      setDetectedArea(nearest.area);
    };

    // Marker drag event
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      updatePosition(position.lat, position.lng);
    });

    // Map click event
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      updatePosition(lat, lng);
    });

    // Invalidate size to handle modal animation sizing
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Pan to area when detectedArea changes via preset buttons
  const handleSelectAreaPreset = (areaName: string) => {
    const area = MATALE_AREAS.find((a) => a.name === areaName);
    if (!area || !area.lat || !area.lng) return;

    setDetectedArea(area);
    setCurrentCoords({ lat: area.lat, lng: area.lng });

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([area.lat, area.lng], 15);
      markerRef.current.setLatLng([area.lat, area.lng]);
    }
  };

  // Detect Current GPS Location
  const handleDetectGPS = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });

        const nearest = findNearestMataleArea(latitude, longitude);
        setDetectedArea(nearest.area);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16);
          markerRef.current.setLatLng([latitude, longitude]);
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        setGpsError('Unable to retrieve GPS location. Please tap the map or select your area below.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleConfirmLocation = () => {
    onLocationSelect({
      lat: Number(currentCoords.lat.toFixed(5)),
      lng: Number(currentCoords.lng.toFixed(5)),
      area: detectedArea.name,
      description: `GPS: ${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)} (${detectedArea.name})`,
    });
    if (onClose) onClose();
  };

  return (
    <div className={`flex flex-col bg-white rounded-2xl overflow-hidden ${compact ? 'border border-emerald-200' : 'shadow-xl'}`}>
      {/* Header Bar */}
      <div className="p-3 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-300" />
          <div>
            <h4 className="text-xs font-black">Mark Your Delivery Location on Map</h4>
            <p className="text-[10px] text-emerald-200">
              Drag the green pin or tap anywhere in Matale
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleDetectGPS}
            disabled={isLocating}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors"
            title="Locate via device GPS"
          >
            <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'My GPS'}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-emerald-200 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {gpsError && (
        <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-[10px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Interactive Map View */}
      <div className="relative">
        <div 
          ref={mapContainerRef} 
          className="w-full h-64 sm:h-72 z-0" 
          style={{ minHeight: '250px' }}
        />

        {/* Floating Quick Hint Badge */}
        <div className="absolute top-2 left-2 z-10 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-emerald-300 shadow-md text-[10px] font-bold text-emerald-950 flex items-center gap-1.5 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
          <span>Tap on map or drag pin to your doorstep</span>
        </div>
      </div>

      {/* Area & Coordinate Details */}
      <div className="p-3 bg-emerald-50/60 border-t border-emerald-100 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-500">Nearest Matale Area:</span>
              <span className="text-xs font-black text-emerald-950 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                {detectedArea.name}
              </span>
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Coordinates: <span className="font-mono text-emerald-900 font-bold">{currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}</span> • Delivery: {formatLKR(detectedArea.deliveryFee)} ({detectedArea.estMinutes})
            </p>
          </div>

          <button
            type="button"
            onClick={handleConfirmLocation}
            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-700/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Confirm & Use This Pin</span>
          </button>
        </div>

        {/* Quick Area Jump Buttons */}
        <div className="pt-1 border-t border-emerald-200/60">
          <span className="text-[10px] font-bold text-gray-500 block mb-1">
            Quick jump to Matale area:
          </span>
          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
            {MATALE_AREAS.slice(0, 8).map((a) => (
              <button
                key={a.name}
                type="button"
                onClick={() => handleSelectAreaPreset(a.name)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  detectedArea.name === a.name
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white text-gray-700 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
