import React, { useState, useEffect, useRef } from 'react';
import { LocationItem } from '../types';
import { isCustomGasUrlSet } from '../utils/gasClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMapMarkerAlt, faSearch, faPlus, faTrashAlt, faEdit, faLocationArrow, faInfoCircle, faTimes, faMap, faLayerGroup, faExpand, faCompress, faList, faSync
} from '@fortawesome/free-solid-svg-icons';
import { Download, Printer } from 'lucide-react';
import LocationsPdfModal from './LocationsPdfModal';
import { exportToExcel } from '../utils/export';
import { motion } from 'motion/react';

const LOCATION_TYPES = ['บ้าน', 'วัด', 'โรงเรียน', 'ร้านค้า', 'คาเฟ่', 'สถานที่ราชการ', 'โรงพยาบาล', 'สถานีตำรวจ', 'เอกชน', 'สถานที่ท่องเที่ยว', 'ตลาด', 'สะพาน', 'แหล่งน้ำ', 'จุดเสี่ยงภัย', 'อื่นๆ'] as const;
type LocationType = typeof LOCATION_TYPES[number];

interface MonJongLocationsProps {
  locations: LocationItem[];
  onSaveLocations: (items: LocationItem[]) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  showConfirm: (title: string, message: string, type: 'save' | 'edit' | 'delete' | 'default') => Promise<boolean>;
  onFullScreenToggle?: (isFull: boolean) => void;
}

const ICONS: Record<string, string> = {
  'บ้าน': '🏠',
  'วัด': '🛕',
  'โรงเรียน': '🏫',
  'ร้านค้า': '🛒',
  'คาเฟ่': '☕',
  'สถานที่ราชการ': '🏛️',
  'โรงพยาบาล': '🏥',
  'สถานีตำรวจ': '👮',
  'เอกชน': '🏢',
  'สถานที่ท่องเที่ยว': '🏔️',
  'ตลาด': '🛍️',
  'สะพาน': '🌉',
  'แหล่งน้ำ': '💧',
  'จุดเสี่ยงภัย': '⚠️',
  'อื่นๆ': '📍'
};
const getIcon = (type?: string) => {
  return ICONS[type || 'อื่นๆ'] || '📍';
};

export default function MonJongLocations({ locations = [], onSaveLocations, showToast, showConfirm, onFullScreenToggle }: MonJongLocationsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [locType, setLocType] = useState<LocationType>(LOCATION_TYPES[0]);
  const [otherType, setOtherType] = useState('');
  const [lat, setLat] = useState<number>(17.5518);
  const [lng, setLng] = useState<number>(98.3444);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showLocationListOverlay, setShowLocationListOverlay] = useState(false);
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  useEffect(() => {
    onFullScreenToggle?.(isFullScreen);
  }, [isFullScreen, onFullScreenToggle]);

  const focusMap = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 16);
    }
  };

  const handleExport = () => {
    const data = locations.map(l => ({
      'ชื่อสถานที่': l.name,
      'รายละเอียด': l.details,
      'ละติจูด': l.lat,
      'ลองจิจูด': l.lng
    }));
    exportToExcel(data, 'สถานที่สำคัญตำบลม่อนจอง', 'รายการสถานที่');
    showToast('ส่งออกไฟล์ Excel เรียบร้อย', 'success');
  };

  // Map references
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const tempMarkerRef = useRef<any>(null);

  // Coordinates for Mon Jong subdistrict center
  const MON_JONG_CENTER: [number, number] = [17.5518, 98.3444];

  const renderForm = () => (
    <>
      <div className="flex justify-between items-center pb-3 border-b border-orange-50 mb-4">
        <h3 className="text-xs font-heading font-bold text-orange-950 flex items-center gap-1.5">
          <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 h-4 text-orange-500" />
          <span>{editingId ? 'แก้ไขข้อมูลสถานที่สำคัญ' : 'ปักหมุดข้อมูลสถานที่สำคัญใหม่'}</span>
        </h3>
        <button
          type="button"
          onClick={resetForm}
          className="p-1 rounded-full hover:bg-orange-50 text-gray-400 hover:text-gray-600"
        >
          <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-heading font-bold text-orange-900">ชื่อสถานที่ <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ระบุชื่อสถานที่..."
              className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-heading font-bold text-orange-900">รายละเอียดสถานที่ <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม..."
              className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-heading font-bold text-orange-900">ประเภทสถานที่ <span className="text-red-500">*</span></label>
            <select
              value={locType}
              onChange={(e) => setLocType(e.target.value as LocationType)}
              className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
            >
              {LOCATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {locType === 'อื่นๆ' && (
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-heading font-bold text-orange-900">ระบุประเภทสถานที่อื่น</label>
              <input
                type="text"
                value={otherType}
                onChange={(e) => setOtherType(e.target.value)}
                placeholder="ระบุประเภท..."
                className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 p-3 bg-orange-50/50 rounded-xl border border-orange-100/50">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-heading font-bold text-orange-900">ละติจูด (Latitude) <span className="text-red-500">*</span></label>
            <input
              type="number"
              step="any"
              required
              value={lat}
              onChange={(e) => setLat(Number(e.target.value))}
              className="w-full p-2 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-lg text-xs outline-none font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
            />
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-heading font-bold text-orange-900">ลองจิจูด (Longitude) <span className="text-red-500">*</span></label>
            <input
              type="number"
              step="any"
              required
              value={lng}
              onChange={(e) => setLng(Number(e.target.value))}
              className="w-full p-2 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-lg text-xs outline-none font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
            />
          </div>
          <div className="col-span-2">
            <button
              type="button"
              onClick={focusMap}
              className="w-full py-2 bg-orange-100 text-orange-800 rounded-lg text-xs font-bold hover:bg-orange-200 transition"
            >
              ค้นหาตำแหน่ง
            </button>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-heading font-bold transition"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-heading font-bold transition"
          >
            {editingId ? 'บันทึก' : 'เพิ่มจุดพิกัด'}
          </button>
        </div>
        <div className="mt-4 pt-3 border-t border-orange-50 text-center">
          <p className="text-[9px] text-gray-400 flex items-center justify-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isCustomGasUrlSet() ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></span>
            {isCustomGasUrlSet() ? 'เชื่อมต่อออนไลน์' : 'โหมดออฟไลน์'}
          </p>
        </div>
      </form>
    </>
  );

  // Initialize Map
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    if (!mapInstanceRef.current) {
      // Create map
      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(MON_JONG_CENTER, 12);
      
      // Load OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      mapInstanceRef.current = map;

      // Handle Map Click
      map.on('click', (e: any) => {
        const clickedLat = Number(e.latlng.lat.toFixed(6));
        const clickedLng = Number(e.latlng.lng.toFixed(6));

        // Default: pin coordinate for form
        setLat(clickedLat);
        setLng(clickedLng);
        
        // Show form if closed
        setIsFormOpen(true);

        // Update temporary pointer marker
        if (tempMarkerRef.current) {
          tempMarkerRef.current.setLatLng(e.latlng);
          if (!map.hasLayer(tempMarkerRef.current)) {
            tempMarkerRef.current.addTo(map);
          }
          tempMarkerRef.current.openPopup();
        } else {
          const redIcon = L.divIcon({
            html: `<div style="background-color: #ef4444; font-size: 16px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(239, 68, 68, 0.5); color: white;">📍</div>`,
            className: 'custom-icon-temp',
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -30]
          });

          tempMarkerRef.current = L.marker(e.latlng, { icon: redIcon })
            .addTo(map)
            .bindPopup('<b>จุดที่เลือกพินใหม่</b><br/>คลิกบันทึกข้อมูลเพื่อเซฟ')
            .openPopup();
        }

        showToast(`เลือกพิกัดพินสำเร็จ: ${clickedLat}, ${clickedLng}`, 'info');
      });
    }

    return () => {
      // Keep map instance alive or clean up
    };
  }, []);

  // Handle map resize on full screen toggle
  useEffect(() => {
    if (mapInstanceRef.current) {
      // Trigger a window resize event to help Leaflet
      window.dispatchEvent(new Event('resize'));

      // Function to invalidate size and nudge tiles
      const invalidate = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          
          // Force a small delay then nudge pan to trigger tile loading
          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
              const center = mapInstanceRef.current.getCenter();
              mapInstanceRef.current.panBy([1, 1], { animate: false });
              mapInstanceRef.current.panTo(center, { animate: false });
            }
          }, 100);
        }
      };

      // Call multiple times to ensure the layout has settled
      requestAnimationFrame(invalidate);
      const timer1 = setTimeout(invalidate, 100);
      const timer2 = setTimeout(invalidate, 500);
      const timer3 = setTimeout(invalidate, 1200);
      const timer4 = setTimeout(invalidate, 3000); 
      
      // Re-open temp marker popup if it exists
      if (tempMarkerRef.current) {
        setTimeout(() => {
          if (tempMarkerRef.current) tempMarkerRef.current.openPopup();
        }, 1200);
      }

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [isFullScreen]);

  // Use ResizeObserver for more robust resizing
  useEffect(() => {
    if (!mapRef.current || !mapInstanceRef.current) return;

    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, [mapRef.current]);

  // Render Pinned Markers
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Remove existing pins
    Object.keys(markersRef.current).forEach(id => {
      map.removeLayer(markersRef.current[id]);
    });
    markersRef.current = {};
    const selectedMarker = selectedLocId ? markersRef.current[selectedLocId] : null;

    // Standard blue pin icon
    const blueIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Add current locations to map
    locations.forEach(loc => {
      if (loc.lat && loc.lng) {
        const emoji = getIcon(loc.type);
        const iconColors: Record<string, string> = {
          'บ้าน': '#dbeafe',
          'วัด': '#fef9c3',
          'โรงเรียน': '#dcfce7',
          'ร้านค้า': '#fef2f2',
          'แหล่งน้ำ': '#dbeafe',
          'จุดเสี่ยงภัย': '#fee2e2',
          'อื่นๆ': '#f3f4f6'
        };
        const bgColor = iconColors[loc.type || 'อื่นๆ'] || '#f3f4f6';

        const customIcon = L.divIcon({
          html: `<div style="background-color: ${bgColor}; font-size: 16px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${emoji}</div>`,
          className: 'custom-icon',
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        });

        const marker = L.marker([loc.lat, loc.lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-1 font-sans">
              <h4 class="font-bold text-sm text-orange-950">${loc.name}</h4>
              <p class="text-xs text-gray-600 mt-1">${loc.details || '-'}</p>
              <div class="text-[10px] text-orange-600 font-mono mt-1.5 font-bold">พิกัด: ${loc.lat}, ${loc.lng}</div>
            </div>
          `);

        markersRef.current[loc.id] = marker;
      }
    });

    // If there was a selected location, re-open its popup
    if (selectedLocId && markersRef.current[selectedLocId]) {
      setTimeout(() => {
        if (markersRef.current[selectedLocId]) {
          markersRef.current[selectedLocId].openPopup();
        }
      }, 500);
    }
  }, [locations, isFullScreen]);


  // Handler for list select to calculate distance
  useEffect(() => {
    // Distance calculator removed
  }, [locations]);

  // Filtered Locations List
  const filteredLocations = locations.filter(
    loc =>
      loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Focus location on map
  const focusLocation = (loc: LocationItem) => {
    const map = mapInstanceRef.current;
    const marker = markersRef.current[loc.id];
    setSelectedLocId(loc.id);
    if (map && marker) {
      map.flyTo([loc.lat, loc.lng], 15);
      marker.openPopup();
    }
  };

  // Handle Form Submit (Add or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('กรุณาระบุชื่อสถานที่', 'error');
      return;
    }

    const finalType = locType === 'อื่นๆ' ? (otherType.trim() || 'อื่นๆ') : locType;
    const newLoc: LocationItem = {
      id: editingId || `loc-${Date.now()}`,
      name: name.trim(),
      details: details.trim(),
      type: finalType as any,
      lat: Number(lat),
      lng: Number(lng)
    };

    let updatedList: LocationItem[];
    if (editingId) {
      const confirmed = await showConfirm(
        'ยืนยันการแก้ไขข้อมูลสถานที่',
        `คุณต้องการบันทึกการแก้ไขสถานที่ "${name.trim()}" ใช่หรือไม่?`,
        'edit'
      );
      if (!confirmed) return;

      updatedList = locations.map(l => (l.id === editingId ? newLoc : l));
      showToast('แก้ไขข้อมูลสถานที่เรียบร้อย', 'success');
    } else {
      const confirmed = await showConfirm(
        'ยืนยันการเพิ่มสถานที่ใหม่',
        `คุณต้องการเพิ่มสถานที่ "${name.trim()}" ลงในแผนที่หรือไม่?`,
        'save'
      );
      if (!confirmed) return;

      updatedList = [...locations, newLoc];
      showToast('เพิ่มสถานที่สำคัญใหม่เรียบร้อย', 'success');
    }

    onSaveLocations(updatedList);
    resetForm();

    // Remove temp red marker if exists
    if (tempMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(tempMarkerRef.current);
      tempMarkerRef.current = null;
    }
  };

  const handleEdit = (loc: LocationItem) => {
    setEditingId(loc.id);
    setName(loc.name);
    
    setDetails(loc.details);
    
    const isStandardType = LOCATION_TYPES.includes(loc.type as any);
    if (isStandardType) {
      setLocType(loc.type as LocationType);
      setOtherType('');
    } else {
      setLocType('อื่นๆ');
      setOtherType(loc.type || '');
    }
    setLat(loc.lat);
    setLng(loc.lng);
    setIsFormOpen(true);
    focusLocation(loc);
  };

  const handleDelete = async (id: string) => {
    const locToDelete = locations.find(l => l.id === id);
    const label = locToDelete ? locToDelete.name : 'สถานที่นี้';

    const confirmed = await showConfirm(
      'ยืนยันการลบสถานที่',
      `คุณต้องการลบสถานที่ "${label}" ออกจากแผนที่ใช่หรือไม่?`,
      'delete'
    );
    if (confirmed) {
      const updated = locations.filter(l => l.id !== id);
      onSaveLocations(updated);
      showToast('ลบสถานที่สำเร็จ', 'success');
      
      if (editingId === id) {
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setName('');
    setDetails('');
    setLocType(LOCATION_TYPES[0]);
    setLat(17.5518);
    setLng(98.3444);
    setEditingId(null);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6 flex-grow flex flex-col" id="mon-jong-locations-panel">
      
      {/* Banner Card */}
      <div className="bg-white rounded-3xl border-2 border-orange-200 p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Top Gradient Glow Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 to-amber-600" />
        {/* Background visual graphics */}
        <div className="absolute -top-10 -right-10 w-80 h-80 bg-gradient-to-br from-orange-500/10 to-amber-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-gradient-to-tr from-amber-500/10 to-orange-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-gradient-to-tr from-orange-500 to-amber-600 text-white rounded-2xl shadow-lg shadow-orange-500/30">
              <FontAwesomeIcon icon={faMap} className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-black text-orange-950 tracking-tight">แผนที่และพิกัดสถานที่</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 font-medium">จัดการข้อมูลพิกัดสถานที่ในเขตตำบลม่อนจอง</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10 shrink-0">
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border-2 border-orange-200 text-orange-800 hover:text-white hover:bg-orange-500 hover:border-orange-500 text-xs sm:text-sm font-heading font-extrabold transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>excel</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsFormOpen(!isFormOpen);
            }}
            className="px-4 py-2.5 bg-gradient-to-tr from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs sm:text-sm font-heading font-extrabold flex items-center gap-1.5 transition-all duration-200 shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 active:scale-95 shrink-0"
          >
            {isFormOpen ? <FontAwesomeIcon icon={faTimes} className="w-4 h-4" /> : <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />}
            <span>{isFormOpen ? 'ปิดฟอร์ม' : 'เพิ่มสถานที่ใหม่'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
        
        {/* SIDEBAR LIST & MEASURER */}
        <div className={`space-y-6 lg:col-span-1 ${isFullScreen ? 'hidden' : ''}`}>
          
          {/* Search Card */}
          <div className="bg-white rounded-2xl p-4 border border-orange-50 shadow-sm space-y-3">
            <h3 className="text-xs font-heading font-bold text-orange-950 flex items-center gap-1.5">
              <FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5 text-orange-500" />
              <span>ค้นหาสถานที่</span>
            </h3>
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหา"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2.5 pl-9 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
              />
              <FontAwesomeIcon icon={faSearch} className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Locations list */}
          <div className="bg-white rounded-2xl p-4 border border-orange-50 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-heading font-bold text-orange-950 flex items-center gap-1.5">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="w-3.5 h-3.5 text-orange-500" />
                <span>สถานที่ทั้งหมด ({filteredLocations.length})</span>
              </h3>
            </div>

            {filteredLocations.length === 0 ? (
              <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-100">
                <p className="text-xs text-gray-400">ยังไม่มีข้อมูลจุดพิกัดในตำบลม่อนจอง</p>
                <button 
                  onClick={() => setIsFormOpen(true)}
                  className="mt-2 text-[10px] text-orange-600 font-bold hover:underline"
                >
                  คลิกที่นี่เพื่อเริ่มเพิ่มพิกัดแรก
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {filteredLocations.map(loc => (
                  <div
                    key={loc.id}
                    className="p-3 bg-orange-50/30 hover:bg-orange-50 border border-orange-100/30 rounded-xl flex items-start justify-between gap-2 transition group"
                  >
                    <div 
                      onClick={() => focusLocation(loc)} 
                      className="text-left cursor-pointer flex-grow min-w-0"
                    >
                      <h4 className="text-xs font-bold text-gray-900 font-heading truncate flex items-center gap-1">
                        <span>{getIcon(loc.type)}</span>
                        <span>{loc.name}</span>
                      </h4>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">{loc.details || '-'}</p>
                      <span className="inline-block mt-1 font-mono text-[9px] text-orange-700 bg-orange-100/50 px-1.5 py-0.25 rounded font-bold">
                        {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0 opacity-100">
                      <button
                        onClick={() => handleEdit(loc)}
                        className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-100 rounded-lg transition-all"
                        title="แก้ไขพิกัด"
                      >
                        <FontAwesomeIcon icon={faEdit} className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(loc.id)}
                        className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-all"
                        title="ลบพิกัด"
                      >
                        <FontAwesomeIcon icon={faTrashAlt} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>


        </div>

        {/* MAP VIEWER & FORM PANEL */}
        <div className="space-y-6 lg:col-span-2 flex flex-col">
          
          {/* Map widget */}
          <div className={`bg-white border border-orange-100 shadow-sm flex flex-col ${isFullScreen ? 'fixed inset-0 w-screen h-screen z-[9999] rounded-none p-0 overflow-hidden' : 'p-4 rounded-3xl min-h-[400px] space-y-3'}`}>
            <div className={`flex justify-between items-center ${isFullScreen ? 'p-4 bg-white border-b border-orange-100 shadow-sm z-[110]' : ''}`}>
              <h3 className="text-xs font-heading font-bold text-orange-950 flex items-center gap-1.5">
                <FontAwesomeIcon icon={faLayerGroup} className="w-3.5 h-3.5 text-orange-500" />
                <span className={isFullScreen ? 'text-sm' : ''}>แผนที่พิกัดเขตตำบลม่อนจอง (Omkoi, Chiang Mai)</span>
              </h3>
              <div className="flex items-center gap-2">
                {isFullScreen && (
                  <button
                    onClick={() => setShowLocationListOverlay(!showLocationListOverlay)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${showLocationListOverlay ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}
                  >
                    <FontAwesomeIcon icon={faList} className="w-3.5 h-3.5" />
                    <span>รายการสถานที่</span>
                  </button>
                )}
                <div className="hidden sm:flex items-center gap-1 text-[9px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                  <FontAwesomeIcon icon={faInfoCircle} className="w-3 h-3 text-orange-500 shrink-0" />
                  <span>คลิกบนแผนที่เพื่อระบุพิกัด / ปักพิน</span>
                </div>
                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-1.5 hover:bg-orange-50 text-orange-600 rounded-lg transition-all"
                  title={isFullScreen ? 'ย่อหน้าจอ' : 'ขยายเต็มจอ'}
                >
                  <FontAwesomeIcon icon={isFullScreen ? faCompress : faExpand} className="w-4 h-4" />
                </button>
              </div>
            </div>

              <div className="flex-1 flex flex-col min-h-0 relative">
                {/* Floating List Overlay for Full Screen */}
              {isFullScreen && showLocationListOverlay && (
                <div className="absolute top-4 right-4 z-[105] w-72 max-h-[80vh] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-orange-100 flex flex-col overflow-hidden animate-fade-in">
                  <div className="p-4 border-b border-orange-50 flex justify-between items-center bg-orange-50/30">
                    <h4 className="text-xs font-heading font-bold text-orange-950">รายการสถานที่</h4>
                    <button onClick={() => setShowLocationListOverlay(false)} className="text-gray-400 hover:text-gray-600">
                      <FontAwesomeIcon icon={faTimes} className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-3 border-b border-orange-50">
                    <div className="relative">
                      <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                      <input
                        type="text"
                        placeholder="ค้นหา"
                        className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-[10px] outline-none focus:border-orange-300 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[60vh]">
                    {filteredLocations.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-[10px] text-gray-400">ไม่พบข้อมูลที่ค้นหา</p>
                      </div>
                    ) : (
                      filteredLocations.map(loc => (
                        <div 
                          key={loc.id} 
                          onClick={() => {
                            focusLocation(loc);
                            if (window.innerWidth < 768) setShowLocationListOverlay(false);
                          }}
                          className="p-2.5 hover:bg-orange-50 border border-transparent hover:border-orange-100 rounded-xl cursor-pointer transition-all group"
                        >
                          <h5 className="text-[10px] font-bold text-gray-900 truncate flex items-center gap-1.5">
                            <span className="text-sm">{getIcon(loc.type)}</span>
                            <span>{loc.name}</span>
                          </h5>
                          <p className="text-[9px] text-gray-500 truncate mt-0.5">{loc.details || '-'}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Map Canvas div */}
              <div 
                ref={mapRef} 
                className={`w-full shadow-inner border border-orange-100/50 overflow-hidden ${isFullScreen ? 'flex-1 h-full min-h-0 relative z-[10]' : 'h-[400px] lg:min-h-[450px] rounded-2xl z-10'}`} 
                id="leaflet-monjong-map" 
                style={isFullScreen ? { height: '100%', minHeight: 'calc(100vh - 64px)' } : {}}
              />

              {/* Form as Overlay in Full Screen */}
              {isFullScreen && isFormOpen && (
                <div className="absolute top-4 left-4 z-[110] w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-orange-100 p-5 max-h-[90vh] overflow-y-auto animate-fade-in shadow-orange-200/50">
                  {renderForm()}
                </div>
              )}
            </div>
          </div>

          {/* Form in Regular View */}
          {!isFullScreen && isFormOpen && (
            <div className="bg-white rounded-2xl p-5 border border-orange-100 shadow-lg animate-fade-in" id="add-location-form">
              {renderForm()}
            </div>
          )}
        </div>
      </div>

      {/* Locations PDF Report Modal */}
      {isPdfModalOpen && (
        <LocationsPdfModal
          locations={filteredLocations}
          allLocations={locations}
          onClose={() => setIsPdfModalOpen(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
