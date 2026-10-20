import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  APIProvider, 
  Map as GoogleMap, 
  AdvancedMarker, 
  Pin,
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import { 
  MapPin, 
  Navigation, 
  Check, 
  X, 
  AlertCircle, 
  Search, 
  Layers, 
  ExternalLink,
  Crosshair,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { MATALE_AREAS } from '../../services/seedData';
import { MataleArea } from '../../types';
import { formatLKR, getGoogleMapsPinUrl } from '../../utils/formatters';

interface LocationMapPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialArea?: string;
  onLocationSelect: (location: {
    lat: number;
    lng: number;
    area: string;
    description: string;
    streetAddress?: string;
  }) => void;
  onClose?: () => void;
  compact?: boolean;
}

// Default Matale coordinates (Clock Tower / Central Market area)
const DEFAULT_MATALE_LAT = 7.4675;
const DEFAULT_MATALE_LNG = 80.6234;

// Calculate distance between two coordinates in kilometers (Haversine formula)
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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

// Internal map controller for panning and geocoding
const MapController: React.FC<{
  coords: { lat: number; lng: number };
  onCoordsChange: (coords: { lat: number; lng: number }) => void;
  onResolvedAddress: (address: string) => void;
  mapType: 'roadmap' | 'hybrid';
}> = ({ coords, onCoordsChange, onResolvedAddress, mapType }) => {
  const map = useMap();
  const geocodingLib = useMapsLibrary('geocoding');
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Initialize Geocoder once library is loaded
  useEffect(() => {
    if (geocodingLib && !geocoderRef.current) {
      geocoderRef.current = new geocodingLib.Geocoder();
    }
  }, [geocodingLib]);

  // Sync camera when coordinates change externally
  useEffect(() => {
    if (map) {
      map.panTo(coords);
      map.setMapTypeId(mapType);
    }
  }, [map, coords, mapType]);

  // Reverse geocode whenever coordinates settle
  useEffect(() => {
    if (!geocoderRef.current) return;

    geocoderRef.current.geocode(
      { location: { lat: coords.lat, lng: coords.lng } },
      (results: any, status: any) => {
        if (status === 'OK' && results && results[0]) {
          onResolvedAddress(results[0].formatted_address);
        }
      }
    );
  }, [coords.lat, coords.lng, onResolvedAddress]);

  // Click on map to move pin
  useEffect(() => {
    if (!map) return;

    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        onCoordsChange({ lat: newLat, lng: newLng });
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, onCoordsChange]);

  return null;
};

export const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  initialLat,
  initialLng,
  initialArea,
  onLocationSelect,
  onClose,
  compact = false,
}) => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

  // Calculate starting point
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

  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  // Update area when coordinates change
  const handleCoordsChange = useCallback((newCoords: { lat: number; lng: number }) => {
    setCurrentCoords(newCoords);
    const nearest = findNearestMataleArea(newCoords.lat, newCoords.lng);
    setDetectedArea(nearest.area);
  }, []);

  // Marker drag end
  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      handleCoordsChange({
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      });
    }
  };

  // Detect Current GPS Location
  const handleDetectGPS = () => {
    setGpsNotice(null);
    if (!navigator.geolocation) {
      setGpsNotice('Geolocation is not supported by your browser. Please tap the map or select your area below.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        const nearest = findNearestMataleArea(latitude, longitude);

        // Check if GPS is within Matale region (e.g. within 25km of Matale)
        if (nearest.distanceKm > 25) {
          setGpsNotice(`Your current location (${latitude.toFixed(2)}, ${longitude.toFixed(2)}) is outside our Matale delivery zone. Pin set to nearest Matale delivery point.`);
        } else {
          setGpsNotice(`✓ GPS detected: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (${nearest.area.name})`);
        }

        handleCoordsChange({ lat: latitude, lng: longitude });
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation warning:', err);
        setGpsNotice('GPS signal weak or permission required. You can tap anywhere on the Google Map to pinpoint your exact home.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  };

  // Jump to specific Matale preset area
  const handleSelectAreaPreset = (areaName: string) => {
    const area = MATALE_AREAS.find((a) => a.name === areaName);
    if (!area || !area.lat || !area.lng) return;

    setDetectedArea(area);
    handleCoordsChange({ lat: area.lat, lng: area.lng });
  };

  // Search Matale location
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if query matches a known area name first
    const matched = MATALE_AREAS.find((a) =>
      a.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );

    if (matched && matched.lat && matched.lng) {
      handleSelectAreaPreset(matched.name);
      setGpsNotice(`Centered on ${matched.name}, Matale`);
      return;
    }

    // Otherwise use Google Geocoder if available
    const winGoogle = (window as unknown as { google?: typeof google }).google;
    if (winGoogle && winGoogle.maps) {
      const geocoder = new winGoogle.maps.Geocoder();
      geocoder.geocode(
        { 
          address: `${searchQuery}, Matale, Central Province, Sri Lanka`,
          componentRestrictions: { country: 'LK' }
        },
        (results: any, status: any) => {
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location;
            handleCoordsChange({ lat: loc.lat(), lng: loc.lng() });
            setResolvedAddress(results[0].formatted_address);
            setGpsNotice(`Found: ${results[0].formatted_address}`);
          } else {
            setGpsNotice(`Could not locate "${searchQuery}". Please select a Matale zone below or tap the map.`);
          }
        }
      );
    }
  };

  const handleConfirmLocation = () => {
    const latFormatted = Number(currentCoords.lat.toFixed(5));
    const lngFormatted = Number(currentCoords.lng.toFixed(5));
    
    onLocationSelect({
      lat: latFormatted,
      lng: lngFormatted,
      area: detectedArea.name,
      description: resolvedAddress || `GPS Pin: ${latFormatted}, ${lngFormatted} (${detectedArea.name})`,
      streetAddress: resolvedAddress || `${detectedArea.name}, Matale`,
    });
    if (onClose) onClose();
  };

  return (
    <div className={`flex flex-col bg-white rounded-2xl overflow-hidden ${compact ? 'border border-emerald-200' : 'shadow-2xl'}`}>
      {/* Google Maps Header Bar */}
      <div className="p-3 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-xs">
            <MapPin className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <h4 className="text-xs font-black flex items-center gap-1.5">
              <span>Google Maps Pinpoint Delivery</span>
              <span className="px-1.5 py-0.2 bg-emerald-500/40 text-[9px] rounded font-bold uppercase tracking-wider">
                Live Satellite & Roads
              </span>
            </h4>
            <p className="text-[10px] text-emerald-100">
              Drag the green pin or tap anywhere in Matale to mark your exact doorstep
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Locate GPS Button */}
          <button
            type="button"
            onClick={handleDetectGPS}
            disabled={isLocating}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white text-emerald-900 hover:bg-emerald-50 disabled:opacity-50 rounded-lg text-[11px] font-black shadow-xs transition-colors cursor-pointer"
            title="Detect your device GPS location"
          >
            <Navigation className={`w-3.5 h-3.5 text-emerald-700 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'My GPS'}</span>
          </button>

          {/* Satellite / Road Toggle */}
          <button
            type="button"
            onClick={() => setMapType(mapType === 'roadmap' ? 'hybrid' : 'roadmap')}
            className="flex items-center gap-1 px-2 py-1.5 bg-emerald-900/60 hover:bg-emerald-900 text-emerald-100 rounded-lg text-[11px] font-bold border border-emerald-600/50 transition-colors cursor-pointer"
            title="Toggle Satellite view"
          >
            <Layers className="w-3 h-3" />
            <span className="capitalize">{mapType === 'roadmap' ? 'Satellite' : 'Roads'}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-emerald-200 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search & Address Bar */}
      <div className="p-2 bg-emerald-50 border-b border-emerald-100 flex flex-col sm:flex-row items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search street, temple, mosque, landmark or area in Matale..."
            className="w-full pl-8 pr-16 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
          >
            Search
          </button>
        </form>

        <a
          href={getGoogleMapsPinUrl(currentCoords.lat, currentCoords.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-white px-2 py-1.5 rounded-lg border border-emerald-200 shadow-2xs"
        >
          <ExternalLink className="w-3 h-3" />
          <span>Open in Google Maps</span>
        </a>
      </div>

      {/* GPS Notification / Status Notice */}
      {gpsNotice && (
        <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-[11px] flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{gpsNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setGpsNotice(null)}
            className="text-amber-700 hover:text-amber-900 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Interactive Google Map Container */}
      <div className="relative w-full h-72 sm:h-80 bg-gray-100">
        <APIProvider apiKey={apiKey} libraries={['marker', 'geocoding', 'places']}>
          <GoogleMap
            mapId="DEMO_MAP_ID"
            defaultCenter={currentCoords}
            defaultZoom={16}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapTypeControl={false}
            streetViewControl={false}
            internalUsageAttributionIds={['gmp_git_agentskills_v1']}
            className="w-full h-full"
          >
            <MapController
              coords={currentCoords}
              onCoordsChange={handleCoordsChange}
              onResolvedAddress={setResolvedAddress}
              mapType={mapType}
            />

            {/* Draggable Matale Fresh Delivery Pin */}
            <AdvancedMarker
              position={currentCoords}
              draggable={true}
              onDragEnd={handleMarkerDragEnd}
              title="Matale Fresh Delivery Pin - Drag to doorstep"
            >
              <div className="relative group cursor-grab active:cursor-grabbing">
                {/* Floating Pin Label */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-emerald-950 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-md pointer-events-none flex items-center gap-1 border border-emerald-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>My Doorstep</span>
                </div>
                
                {/* Custom Branded SVG Pin */}
                <div className="w-10 h-10 bg-gradient-to-tr from-emerald-700 to-teal-500 rounded-full border-2 border-white shadow-xl flex items-center justify-center transform hover:scale-110 transition-transform">
                  <span className="text-white text-base">📍</span>
                </div>
              </div>
            </AdvancedMarker>
          </GoogleMap>
        </APIProvider>

        {/* Floating Quick Action Badge */}
        <div className="absolute bottom-2 left-2 z-10 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-emerald-300 shadow-lg text-[10px] font-bold text-emerald-950 flex items-center gap-1.5 pointer-events-none">
          <Crosshair className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
          <span>Tap anywhere or drag pin directly to your gate</span>
        </div>
      </div>

      {/* Delivery Zone, Address & Confirmation Section */}
      <div className="p-3 bg-gradient-to-b from-white to-emerald-50/50 border-t border-emerald-100 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-500">Matale Delivery Zone:</span>
              <span className="text-xs font-black text-emerald-950 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-300 shadow-2xs">
                {detectedArea.name}
              </span>
              <span className="text-[10px] text-emerald-800 font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                Fee: {formatLKR(detectedArea.deliveryFee)} • {detectedArea.estMinutes}
              </span>
            </div>

            {/* Resolved Street Name from Google Geocoding */}
            {resolvedAddress ? (
              <p className="text-[11px] text-gray-700 font-medium mt-1 line-clamp-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="font-semibold text-gray-900">{resolvedAddress}</span>
              </p>
            ) : (
              <p className="text-[10px] text-gray-500 mt-1">
                Coordinates: <span className="font-mono text-emerald-900 font-bold">{currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleConfirmLocation}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Set This Doorstep Pin</span>
          </button>
        </div>

        {/* Quick Area Jump Buttons */}
        <div className="pt-1.5 border-t border-emerald-200/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-gray-500">
              Quick jump to Matale town & suburban areas:
            </span>
            <span className="text-[9px] text-emerald-700 font-medium">10+ Matale zones</span>
          </div>
          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
            {MATALE_AREAS.map((a) => (
              <button
                key={a.name}
                type="button"
                onClick={() => handleSelectAreaPreset(a.name)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  detectedArea.name === a.name
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-gray-700 border border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300'
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
