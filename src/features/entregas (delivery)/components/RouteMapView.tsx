import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronsUp,
  ChevronUp,
  ClipboardList,
  Clock,
  FileText,
  List as ListIcon,
  Locate,
  Map as MapIcon,
  MapPin,
  Minus,
  Package,
  Phone,
  Plus,
  Truck,
  User
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Linking,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type Region,
} from "react-native-maps";
import Svg, {
  Defs,
  Rect,
  Stop,
  LinearGradient as SvgGradient,
} from "react-native-svg";

import { Badge, Button } from "@/shared/ui";
import { Text, useAppTheme } from "@/theme";
import { updateStopStatus, useDeliveryStore } from "../data/delivery-store";
import {
  SANTA_CRUZ_CLOSED_LOOP_POLYLINE,
  SANTA_CRUZ_COMPLETED_SEGMENT,
  SANTA_CRUZ_DEPOT,
  SANTA_CRUZ_INITIAL_REGION,
  SANTA_CRUZ_STOPS_COORDINATES,
} from "../data/santa-cruz-route";
import type { DeliveryStop } from "../types";

type Props = {
  stops: DeliveryStop[];
  onSelectStopDetail: (stop: DeliveryStop) => void;
  onRegistrarVisita?: (stop: DeliveryStop) => void;
  tripCode?: string;
  statsLabel?: string;
  onSwitchToLista?: () => void;
  onBack?: () => void;
};

type SheetState = "collapsed" | "medium" | "expanded";

/** Generador de mapa interactivo Leaflet para entorno Web con Pines de entrega realistas y trazado GPS */
function generateLeafletHtml({
  stops,
  selectedStopId,
  isDark,
}: {
  stops: DeliveryStop[];
  selectedStopId?: string;
  isDark: boolean;
}): string {
  const plannedPolylineJson = JSON.stringify(
    SANTA_CRUZ_CLOSED_LOOP_POLYLINE.map((p) => [p.latitude, p.longitude])
  );
  const completedPolylineJson = JSON.stringify(
    SANTA_CRUZ_COMPLETED_SEGMENT.map((p) => [p.latitude, p.longitude])
  );
  const depotJson = JSON.stringify([SANTA_CRUZ_DEPOT.latitude, SANTA_CRUZ_DEPOT.longitude]);

  const stopsData = stops.map((s) => {
    const coords = SANTA_CRUZ_STOPS_COORDINATES[s.sequence] || SANTA_CRUZ_DEPOT;
    return {
      id: s.id,
      sequence: s.sequence,
      clientName: s.clientName,
      address: s.address,
      status: s.status,
      lat: coords.latitude,
      lng: coords.longitude,
      packages: s.packagesCount,
      isSelected: s.id === selectedStopId,
    };
  });
  const stopsJson = JSON.stringify(stopsData);

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Route Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; background: ${isDark ? "#0f172a" : "#f8fafc"}; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    
    /* Pin de Entrega personalizado */
    .delivery-pin-wrap {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      user-select: none;
      transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .delivery-pin-wrap:hover {
      transform: scale(1.18) translateY(-4px);
      z-index: 9999 !important;
    }
    .delivery-pin-wrap.selected {
      transform: scale(1.25) translateY(-6px);
      z-index: 10000 !important;
    }
    
    .pin-head {
      width: 32px;
      height: 32px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.35);
      border: 2.5px solid #ffffff;
      position: relative;
      z-index: 2;
    }
    .selected .pin-head {
      width: 36px;
      height: 36px;
      border-radius: 18px;
      border-width: 3px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.45);
    }
    .pin-seq {
      color: #ffffff;
      font-size: 12px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .selected .pin-seq {
      font-size: 13px;
    }

    /* Estilos específicos para Parada Entregada */
    .delivery-pin-wrap.delivered .pin-head {
      background-color: #10b981 !important;
      border-color: #ffffff;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.5);
    }
    .delivery-pin-wrap.delivered .pin-needle {
      border-top-color: #10b981 !important;
    }
    .delivered-check-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      width: 16px;
      height: 16px;
      border-radius: 8px;
      background: #047857;
      border: 1.5px solid #ffffff;
      color: #ffffff;
      font-size: 10px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      z-index: 5;
    }
    
    .pin-needle {
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 8px solid;
      margin-top: -1px;
      z-index: 1;
      filter: drop-shadow(0 2px 2px rgba(0,0,0,0.25));
    }
    
    .pulse-ring {
      position: absolute;
      top: -10px;
      left: -10px;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      animation: pulse-ring 1.8s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
      pointer-events: none;
      z-index: 0;
    }
    @keyframes pulse-ring {
      0% { transform: scale(0.6); opacity: 0.9; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    
    .pin-label {
      position: absolute;
      top: 42px;
      background: rgba(15, 23, 42, 0.92);
      color: #ffffff;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 3px 8px rgba(0,0,0,0.35);
      pointer-events: none;
      border: 1px solid rgba(255,255,255,0.2);
      z-index: 3;
    }
    .pin-label.delivered-label {
      background: rgba(6, 78, 59, 0.95);
      border-color: rgba(52, 211, 153, 0.4);
    }

    /* Reset Leaflet divIcon box model to prevent square background cuts */
    .leaflet-div-icon {
      background: transparent !important;
      border: none !important;
    }

    /* Centro de Distribución (Depot Pin) */
    .depot-pin-wrap {
      width: 140px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      user-select: none;
      position: relative;
      cursor: pointer;
      transition: transform 0.2s ease;
      overflow: visible;
    }
    .depot-pin-wrap:hover {
      transform: scale(1.12) translateY(-3px);
      z-index: 10000 !important;
    }
    .depot-glow {
      position: absolute;
      top: -6px;
      left: 45px;
      width: 50px;
      height: 50px;
      border-radius: 25px;
      background: rgba(30, 58, 138, 0.3);
      border: 2px solid rgba(59, 130, 246, 0.6);
      animation: pulse-ring 2.2s infinite ease-out;
      pointer-events: none;
    }
    .depot-head {
      width: 38px;
      height: 38px;
      border-radius: 19px;
      background: #0f172a;
      border: 2.5px solid #3b82f6;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      position: relative;
      z-index: 2;
    }
    .depot-needle {
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 8px solid #0f172a;
      margin-top: -1px;
      z-index: 1;
      filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));
    }
    .depot-label {
      margin-top: 3px;
      background: #0f172a;
      color: #ffffff;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4);
      border: 1px solid rgba(59, 130, 246, 0.4);
      z-index: 3;
      pointer-events: none;
    }

    /* Truck Driver Pin */
    .truck-pin-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .truck-glow {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(37, 99, 235, 0.35);
      animation: pulse-ring 2s infinite ease-out;
    }
    .truck-head {
      background: #2563eb;
      border: 2.5px solid #ffffff;
      width: 34px;
      height: 34px;
      border-radius: 17px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.5);
      font-size: 16px;
      position: relative;
      z-index: 2;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var plannedCoords = ${plannedPolylineJson};
    var completedCoords = ${completedPolylineJson};
    var depotCoords = ${depotJson};
    var stops = ${stopsJson};
    var isDark = ${isDark};

    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([-17.772, -63.175], 13);

    L.tileLayer('${tileUrl}', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    // 1. Trazado planificado (Gris punteado)
    L.polyline(plannedCoords, {
      color: isDark ? '#64748b' : '#94a3b8',
      weight: 4,
      dashArray: '6, 6',
      opacity: 0.85
    }).addTo(map);

    // 2. Tramo completado (Azul vibrante)
    L.polyline(completedCoords, {
      color: '#2563eb',
      weight: 5,
      opacity: 0.95
    }).addTo(map);

    // 3. Almacén Central Marker con SVG Building2 Vectorial
    var depotBuildingSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>' +
      '<path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>' +
      '<path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>' +
      '<path d="M10 6h4"/>' +
      '<path d="M10 10h4"/>' +
      '<path d="M10 14h4"/>' +
      '<path d="M10 18h4"/>' +
    '</svg>';

    var depotIcon = L.divIcon({
      className: 'custom-div-icon',
      html: '<div class="depot-pin-wrap">' +
        '<div class="depot-glow"></div>' +
        '<div class="depot-head">' + depotBuildingSvg + '</div>' +
        '<div class="depot-needle"></div>' +
        '<div class="depot-label">Almacén Central (Depósito)</div>' +
      '</div>',
      iconSize: [140, 74],
      iconAnchor: [70, 46]
    });
    L.marker(depotCoords, { icon: depotIcon, zIndexOffset: 8000 }).addTo(map);

    // 4. Paradas de entrega Pins
    function getStatusColor(st) {
      if (st === 'ARRIVED') return '#0284c7';
      if (st === 'DELIVERED') return '#10b981';
      if (st === 'INCIDENT') return '#ef4444';
      return '#eab308';
    }

    stops.forEach(function(stop) {
      var color = getStatusColor(stop.status);
      var isSelected = stop.isSelected;
      var isDelivered = stop.status === 'DELIVERED';
      
      var pulseHtml = isSelected ? '<div class="pulse-ring" style="border: 3px solid ' + color + ';"></div>' : '';
      var checkBadgeHtml = isDelivered ? '<div class="delivered-check-badge">✓</div>' : '';
      var labelText = '#' + stop.sequence + ' ' + stop.clientName + (isDelivered ? ' (Entregado ✓)' : '');
      var labelHtml = '<div class="pin-label ' + (isDelivered ? 'delivered-label' : '') + '">' + labelText + '</div>';

      var pinSeqText = isDelivered ? ('✓ ' + stop.sequence) : ('#' + stop.sequence);

      var pinHtml = '<div class="delivery-pin-wrap ' + (isSelected ? 'selected' : '') + ' ' + (isDelivered ? 'delivered' : '') + '" id="pin-' + stop.id + '">' +
        pulseHtml +
        '<div class="pin-head" style="background-color: ' + color + ';">' +
          checkBadgeHtml +
          '<span class="pin-seq">' + pinSeqText + '</span>' +
        '</div>' +
        '<div class="pin-needle" style="border-top-color: ' + color + ';"></div>' +
        (isSelected ? labelHtml : '') +
      '</div>';

      var pinIcon = L.divIcon({
        className: 'custom-div-icon',
        html: pinHtml,
        iconSize: [36, 46],
        iconAnchor: [18, 46]
      });

      var marker = L.marker([stop.lat, stop.lng], { icon: pinIcon, zIndexOffset: isDelivered ? 500 : 1000 }).addTo(map);
      marker.on('click', function() {
        if (window.parent) {
          window.parent.postMessage({ type: 'SELECT_STOP', stopId: stop.id }, '*');
        }
      });
    });

    // 5. Camión / Chofer Marker (Ubicado en la parada activa no entregada o siguiente parada)
    var pendingDriverStop = stops.find(function(s) { return s.status === 'ARRIVED' || s.status === 'EN_ROUTE'; }) ||
      stops.find(function(s) { return s.status === 'PENDING'; }) ||
      stops[stops.length - 1];

    if (pendingDriverStop) {
      var truckIcon = L.divIcon({
        className: 'custom-div-icon',
        html: '<div class="truck-pin-wrap" title="Tu camión en ruta"><div class="truck-glow"></div><div class="truck-head">🚚</div></div>',
        iconSize: [36, 36],
        iconAnchor: [-6, 18] // Desplazado al costado para no tapar el pin de la parada
      });
      L.marker([pendingDriverStop.lat, pendingDriverStop.lng], { icon: truckIcon, zIndexOffset: 2500 }).addTo(map);
    }

    // Centrar en parada seleccionada
    var sel = stops.find(function(s) { return s.isSelected; });
    if (sel) {
      map.setView([sel.lat, sel.lng], 14);
    }

    // Escuchar mensajes desde React Native
    window.addEventListener('message', function(event) {
      var data = event.data;
      if (!data) return;
      if (data.type === 'ZOOM_IN') {
        map.zoomIn();
      } else if (data.type === 'ZOOM_OUT') {
        map.zoomOut();
      } else if (data.type === 'RECENTER' || data.type === 'FIT_ALL') {
        var group = new L.featureGroup([
          L.polyline(plannedCoords),
          L.marker(depotCoords)
        ]);
        map.fitBounds(group.getBounds(), { padding: [50, 50] });
      } else if (data.type === 'PAN_TO' && data.lat && data.lng) {
        map.flyTo([data.lat, data.lng], 15, { duration: 0.8 });
      }
    });
  </script>
</body>
</html>`;

}

export function RouteMapView({
  stops,
  onSelectStopDetail,
  onRegistrarVisita,
  tripCode = "OT-98421",
  statsLabel = "2/6 (33%)",
  onSwitchToLista,
  onBack,
}: Props) {
  const theme = useAppTheme();
  const isDark = theme.colors.mainBackground === "#18181b";
  const mapRef = useRef<MapView>(null);
  const iframeRef = useRef<any>(null);
  const currentRegionRef = useRef<Region>(SANTA_CRUZ_INITIAL_REGION);
  const [tracksViewChanges, setTracksViewChanges] = useState<boolean>(true);

  const storeSelectedStopId = useDeliveryStore((state) => state.selectedStopId);
  const setStoreSelectedStop = useDeliveryStore((state) => state.setSelectedStop);

  const isWeb = Platform.OS === "web";

  // SELECCIÓN AUTOMÁTICA DE PARADA ACTIVA POR DEFECTO (EN CURSO O SIGUIENTE PENDIENTE)
  const activeStop = useMemo(() => {
    return (
      stops.find((s) => s.status === "ARRIVED") ||
      stops.find((s) => s.status === "EN_ROUTE") ||
      stops.find((s) => s.status === "PENDING") ||
      stops.find((s) => s.status === "INCIDENT") ||
      stops[0]
    );
  }, [stops]);

  // DERIVAR LA PARADA SELECCIONADA EN TIEMPO REAL:
  // Si la parada anteriormente seleccionada ya está completada (DELIVERED) y hay paradas pendientes,
  // se sincroniza automáticamente con activeStop (el siguiente punto de entrega con su botón de acción).
  const selectedStop = useMemo(() => {
    if (storeSelectedStopId) {
      const found = stops.find((s) => s.id === storeSelectedStopId);
      if (found && found.status !== "DELIVERED") {
        return found;
      }
      if (
        found &&
        found.status === "DELIVERED" &&
        activeStop &&
        activeStop.status !== "DELIVERED"
      ) {
        return activeStop;
      }
      if (found) return found;
    }
    return activeStop;
  }, [stops, storeSelectedStopId, activeStop]);

  useEffect(() => {
    if (selectedStop && storeSelectedStopId !== selectedStop.id) {
      setStoreSelectedStop(selectedStop);
    }
  }, [selectedStop, storeSelectedStopId, setStoreSelectedStop]);

  // CENTRAR EL MAPA EN LA PARADA SELECCIONADA AL CAMBIAR DE SELECCIÓN DE PARADA
  useEffect(() => {
    if (selectedStop) {
      const coords = SANTA_CRUZ_STOPS_COORDINATES[selectedStop.sequence];
      if (coords) {
        if (isWeb && iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            { type: "PAN_TO", lat: coords.latitude, lng: coords.longitude },
            "*"
          );
        } else if (mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: coords.latitude,
              longitude: coords.longitude,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            },
            350
          );
        }
      }
    }
  }, [selectedStop?.id, isWeb]);


  // Temporizador para tracksViewChanges en Native Maps (evita parpadeos y asegura render de iconos)
  useEffect(() => {
    setTracksViewChanges(true);
    const t = setTimeout(() => setTracksViewChanges(false), 800);
    return () => clearTimeout(t);
  }, [selectedStop?.id, stops]);

  // Escucha de mensajes en Web desde Leaflet
  useEffect(() => {
    if (isWeb && typeof window !== "undefined") {
      const handleWebMessage = (e: MessageEvent) => {
        if (e.data && e.data.type === "SELECT_STOP" && e.data.stopId) {
          const target = stops.find((s) => s.id === e.data.stopId);
          if (target) {
            handleSelectStop(target);
          }
        }
      };
      window.addEventListener("message", handleWebMessage);
      return () => window.removeEventListener("message", handleWebMessage);
    }
  }, [isWeb, stops]);

  // ALTURA ANIMADA EN TIEMPO REAL CON EL DEDO DEL CHOFER
  const currentHeightRef = useRef<number>(290); // 290px por defecto (medium)
  const sheetHeight = useRef(new Animated.Value(290)).current;
  const [sheetState, setSheetState] = useState<SheetState>("medium");

  const animateToHeight = (targetHeight: number) => {
    currentHeightRef.current = targetHeight;
    if (targetHeight <= 120) {
      setSheetState("collapsed");
    } else if (targetHeight >= 380) {
      setSheetState("expanded");
    } else {
      setSheetState("medium");
    }

    Animated.spring(sheetHeight, {
      toValue: targetHeight,
      useNativeDriver: false,
      friction: 7,
      tension: 65,
    }).start();
  };

  const cycleSheetState = (direction?: "up" | "down") => {
    const current = currentHeightRef.current;
    if (direction === "up") {
      if (current < 200) animateToHeight(290);
      else animateToHeight(480);
    } else if (direction === "down") {
      if (current > 380) animateToHeight(290);
      else animateToHeight(80);
    } else {
      if (current < 200) animateToHeight(290);
      else if (current < 380) animateToHeight(480);
      else animateToHeight(80);
    }
  };

  // PAN RESPONDER CON SEGUIMIENTO CONTINUO EN TIEMPO REAL AL DEDO
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 2,
      onPanResponderGrant: () => {
        sheetHeight.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        let newHeight = currentHeightRef.current - gestureState.dy;
        if (newHeight < 75) newHeight = 75;
        if (newHeight > 520) newHeight = 520;
        sheetHeight.setValue(newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        const finalDragHeight = currentHeightRef.current - gestureState.dy;
        let target = 290;

        if (gestureState.vy < -0.4 || finalDragHeight > 360) {
          target = 480;
        } else if (gestureState.vy > 0.4 || finalDragHeight < 160) {
          target = 80;
        } else {
          target = 290;
        }

        animateToHeight(target);
      },
    })
  ).current;

  const getPinColor = (status: string) => {
    if (status === "ARRIVED") return "#0284c7";
    if (status === "DELIVERED") return "#22c55e";
    if (status === "INCIDENT") return "#ef4444";
    return "#eab308";
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleSelectStop = (stop: DeliveryStop) => {
    setStoreSelectedStop(stop);
    if (currentHeightRef.current < 200) {
      animateToHeight(290);
    }
  };

  const handleZoomIn = () => {
    if (isWeb) {
      iframeRef.current?.contentWindow?.postMessage({ type: "ZOOM_IN" }, "*");
      return;
    }
    const current = currentRegionRef.current;
    const nextRegion = {
      ...current,
      latitudeDelta: Math.max(0.008, current.latitudeDelta * 0.6),
      longitudeDelta: Math.max(0.008, current.longitudeDelta * 0.6),
    };
    currentRegionRef.current = nextRegion;
    mapRef.current?.animateToRegion(nextRegion, 300);
  };

  const handleZoomOut = () => {
    if (isWeb) {
      iframeRef.current?.contentWindow?.postMessage({ type: "ZOOM_OUT" }, "*");
      return;
    }
    const current = currentRegionRef.current;
    const nextRegion = {
      ...current,
      latitudeDelta: Math.min(0.3, current.latitudeDelta * 1.6),
      longitudeDelta: Math.min(0.3, current.longitudeDelta * 1.6),
    };
    currentRegionRef.current = nextRegion;
    mapRef.current?.animateToRegion(nextRegion, 300);
  };

  const handleOrientNorth = () => {
    if (isWeb) {
      iframeRef.current?.contentWindow?.postMessage({ type: "RECENTER" }, "*");
      return;
    }
    currentRegionRef.current = SANTA_CRUZ_INITIAL_REGION;
    mapRef.current?.animateToRegion(SANTA_CRUZ_INITIAL_REGION, 400);
  };

  const handleMyLocation = () => {
    const driverStop =
      stops.find((s) => s.status === "ARRIVED") ||
      stops.find((s) => s.status === "EN_ROUTE") ||
      stops[0];

    if (driverStop) {
      handleSelectStop(driverStop);
      const coords = SANTA_CRUZ_STOPS_COORDINATES[driverStop.sequence];
      if (coords) {
        if (isWeb) {
          iframeRef.current?.contentWindow?.postMessage(
            { type: "PAN_TO", lat: coords.latitude, lng: coords.longitude },
            "*"
          );
        } else if (mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: coords.latitude,
              longitude: coords.longitude,
              latitudeDelta: 0.012,
              longitudeDelta: 0.012,
            },
            400
          );
        }
      }
    }
  };

  const handleCenterDepot = () => {
    if (isWeb) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "PAN_TO", lat: SANTA_CRUZ_DEPOT.latitude, lng: SANTA_CRUZ_DEPOT.longitude },
        "*"
      );
    } else if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: SANTA_CRUZ_DEPOT.latitude,
          longitude: SANTA_CRUZ_DEPOT.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        400
      );
    }
  };

  const leafletHtml = useMemo(() => {
    return generateLeafletHtml({
      stops,
      selectedStopId: selectedStop?.id,
      isDark,
    });
  }, [stops, selectedStop?.id, isDark]);

  const driverCoords = useMemo(() => {
    const driverStop =
      stops.find((s) => s.status === "ARRIVED") ||
      stops.find((s) => s.status === "EN_ROUTE") ||
      stops.find((s) => s.status === "PENDING") ||
      stops[stops.length - 1];
    return driverStop ? SANTA_CRUZ_STOPS_COORDINATES[driverStop.sequence] : undefined;
  }, [stops]);

  return (
    <View
      style={{
        flex: 1,
        position: "relative",
        backgroundColor: theme.colors.mainBackground,
      }}
    >
      {/* 1. MAPA FULL SCREEN */}
      <View
        style={{
          flex: 1,
          position: "relative",
          backgroundColor: isDark ? "#1e293b" : "#e2e8f0",
        }}
      >
        {isWeb ? (
          <View style={{ flex: 1, position: "relative" }}>
            <iframe
              ref={iframeRef}
              title="Interactive Route Map"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              srcDoc={leafletHtml}
            />
          </View>
        ) : (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFillObject}
            initialRegion={SANTA_CRUZ_INITIAL_REGION}
            onRegionChangeComplete={(r) => {
              currentRegionRef.current = r;
            }}
            customMapStyle={isDark ? darkMapStyle : lightMapStyle}
          >
            {/* Trazado planificado */}
            <Polyline
              coordinates={SANTA_CRUZ_CLOSED_LOOP_POLYLINE}
              strokeColor={isDark ? "#64748b" : "#94a3b8"}
              strokeWidth={4}
              lineDashPattern={[6, 4]}
            />
            {/* Tramo completado */}
            <Polyline
              coordinates={SANTA_CRUZ_COMPLETED_SEGMENT}
              strokeColor="#2563eb"
              strokeWidth={5}
            />

            {/* Centro de Distribución (Depósito) */}
            <Marker
              coordinate={SANTA_CRUZ_DEPOT}
              anchor={{ x: 0.5, y: 1 }}
              title="Centro de Distribución"
              description="Almacén Central • Parque Industrial"
              tracksViewChanges={tracksViewChanges}
            >
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                {/* Halo del depósito */}
                <View
                  style={{
                    position: "absolute",
                    top: -6,
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "rgba(15, 23, 42, 0.15)",
                    borderWidth: 1.5,
                    borderColor: "rgba(15, 23, 42, 0.3)",
                  }}
                />

                {/* Cabeza circular del pin de Almacén */}
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "#0f172a",
                    borderWidth: 2.5,
                    borderColor: "#ffffff",
                    alignItems: "center",
                    justifyContent: "center",
                    elevation: 7,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.4,
                    shadowRadius: 4,
                  }}
                >
                  <Building2 size={18} color="#ffffff" />
                </View>

                {/* Aguja apuntando al suelo GPS */}
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderLeftWidth: 6,
                    borderRightWidth: 6,
                    borderTopWidth: 8,
                    borderLeftColor: "transparent",
                    borderRightColor: "transparent",
                    borderTopColor: "#0f172a",
                    marginTop: -1,
                  }}
                />

                {/* Etiqueta descriptiva inferior */}
                <View
                  style={{
                    marginTop: 3,
                    backgroundColor: "#0f172a",
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.2)",
                    elevation: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 10,
                      fontWeight: "700",
                    }}
                  >
                    Centro de Distribución
                  </Text>
                </View>
              </View>
            </Marker>

            {/* Camión del Chofer (Ligeramente desplazado para no tapar el pin de la parada) */}
            {driverCoords && (
              <Marker
                coordinate={driverCoords}
                anchor={{ x: 0.5, y: 0.5 }}
                centerOffset={{ x: 26, y: 0 }}
                title="Tu Camión"
                description="Ubicación en ruta"
                tracksViewChanges={tracksViewChanges}
              >
                <View style={{ alignItems: "center", justifyContent: "center" }}>
                  <View
                    style={{
                      position: "absolute",
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: "rgba(37, 99, 235, 0.35)",
                    }}
                  />
                  <View
                    style={{
                      backgroundColor: "#2563eb",
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      borderWidth: 2.5,
                      borderColor: "#ffffff",
                      alignItems: "center",
                      justifyContent: "center",
                      elevation: 6,
                    }}
                  >
                    <Truck size={16} color="#ffffff" />
                  </View>
                </View>
              </Marker>
            )}

            {/* Marcadores de Paradas de Entrega con Aguja / Teardrop Pin */}
            {stops.map((stop) => {
              const coords =
                SANTA_CRUZ_STOPS_COORDINATES[stop.sequence] || SANTA_CRUZ_DEPOT;
              const isSelected = selectedStop.id === stop.id;
              const isDelivered = stop.status === "DELIVERED";
              const pinBg = isDelivered ? "#10b981" : getPinColor(stop.status);

              return (
                <Marker
                  key={`stop-marker-${stop.id}-${stop.status}-${isSelected}`}
                  coordinate={coords}
                  anchor={{ x: 0.5, y: 1 }}
                  title={`#${stop.sequence} • ${stop.clientName}${isDelivered ? " (Entregado)" : ""}`}
                  description={stop.address}
                  onPress={() => handleSelectStop(stop)}
                  tracksViewChanges={tracksViewChanges}
                >
                  <View style={{ alignItems: "center", justifyContent: "center" }}>
                    {/* Anillo de pulso para la parada seleccionada */}
                    {isSelected && (
                      <View
                        style={{
                          position: "absolute",
                          top: -8,
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: pinBg,
                          opacity: 0.35,
                        }}
                      />
                    )}

                    {/* Cabeza del Pin */}
                    <View
                      style={{
                        width: isSelected ? 36 : 30,
                        height: isSelected ? 36 : 30,
                        borderRadius: isSelected ? 18 : 15,
                        backgroundColor: pinBg,
                        borderWidth: 2.5,
                        borderColor: "#ffffff",
                        alignItems: "center",
                        justifyContent: "center",
                        elevation: isSelected ? 8 : 4,
                      }}
                    >
                      {/* Badge check verde en esquina si ya fue entregado */}
                      {isDelivered && (
                        <View
                          style={{
                            position: "absolute",
                            top: -5,
                            right: -5,
                            width: 15,
                            height: 15,
                            borderRadius: 8,
                            backgroundColor: "#047857",
                            borderWidth: 1.5,
                            borderColor: "#ffffff",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: "#ffffff",
                              fontSize: 9,
                              fontWeight: "900",
                            }}
                          >
                            ✓
                          </Text>
                        </View>
                      )}

                      <Text
                        style={{
                          color: "#ffffff",
                          fontWeight: "900",
                          fontSize: isSelected
                            ? isDelivered
                              ? 12
                              : 13
                            : isDelivered
                              ? 10
                              : 11,
                        }}
                      >
                        {isDelivered ? `✓ ${stop.sequence}` : `#${stop.sequence}`}
                      </Text>
                    </View>

                    {/* Aguja / Punta del Pin apuntando al suelo GPS */}
                    <View
                      style={{
                        width: 0,
                        height: 0,
                        borderLeftWidth: 5,
                        borderRightWidth: 5,
                        borderTopWidth: 7,
                        borderLeftColor: "transparent",
                        borderRightColor: "transparent",
                        borderTopColor: pinBg,
                        marginTop: -1,
                      }}
                    />

                    {/* Etiqueta flotante con nombre de cliente */}
                    {isSelected && (
                      <View
                        style={{
                          marginTop: 3,
                          backgroundColor: isDelivered ? "#064e3b" : "#0f172a",
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: isDelivered
                            ? "rgba(52, 211, 153, 0.4)"
                            : "rgba(255,255,255,0.2)",
                          elevation: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: "#ffffff",
                            fontSize: 10,
                            fontWeight: "700",
                          }}
                        >
                          #{stop.sequence} {stop.clientName}
                          {isDelivered ? " (Entregado ✓)" : ""}
                        </Text>
                      </View>
                    )}
                  </View>
                </Marker>
              );
            })}
          </MapView>
        )}
      </View>


      {/* 2. GRADIENTE DEGRADADO SUAVE DESDE ARRIBA HACIA ABAJO (ADAPTATIVO MODO CLARO / OSCURO) */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 160,
          zIndex: 15,
        }}
      >
        <Svg height="100%" width="100%">
          <Defs>
            <SvgGradient id="topGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset="0"
                stopColor={isDark ? "#18181b" : "#ffffff"}
                stopOpacity={isDark ? 0.92 : 0.95}
              />
              <Stop
                offset="0.55"
                stopColor={isDark ? "#18181b" : "#ffffff"}
                stopOpacity={isDark ? 0.55 : 0.65}
              />
              <Stop
                offset="1"
                stopColor={isDark ? "#18181b" : "#ffffff"}
                stopOpacity="0.0"
              />
            </SvgGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="url(#topGradient)"
          />
        </Svg>
      </View>

      <View
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          right: 12,
          gap: 10,
          zIndex: 30,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 14,
            padding: 10,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
            elevation: 6,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View>
              <Text
                variant="caption"
                style={{ color: theme.colors.mutedForeground, fontSize: 10 }}
              >
                HOJA DE RUTA
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Text
                  variant="header"
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: theme.colors.foreground,
                  }}
                >
                  {tripCode}
                </Text>
                <Badge
                  label={statsLabel}
                  tone="primary"
                  size="sm"
                />
              </View>
            </View>
          </View>

          {onSwitchToLista && (
            <View
              style={{
                flexDirection: "row",
                backgroundColor: theme.colors.secondary,
                borderRadius: 8,
                padding: 2,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <TouchableOpacity
                onPress={onSwitchToLista}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <ListIcon size={14} color={theme.colors.mutedForeground} />
                <Text
                  variant="label"
                  style={{ fontSize: 11, color: theme.colors.mutedForeground }}
                >
                  Lista
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 6,
                  backgroundColor: theme.colors.cardBackground,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  elevation: 1,
                }}
              >
                <MapIcon size={14} color={theme.colors.primary} />
                <Text
                  variant="label"
                  style={{
                    fontSize: 11,
                    color: theme.colors.primary,
                    fontWeight: "700",
                  }}
                >
                  Mapa
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* LEYENDA POR COLOR DE ESTADOS DE ENTREGA */}
        <View
          style={{
            flexDirection: "row",
            gap: 6,
            paddingHorizontal: 2,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: 14,
              paddingHorizontal: 8,
              paddingVertical: 4,
              gap: 5,
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#0284c7",
              }}
            />
            <Text
              variant="caption"
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: theme.colors.foreground,
              }}
            >
              En Sitio / Llegada
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: 14,
              paddingHorizontal: 8,
              paddingVertical: 4,
              gap: 5,
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#eab308",
              }}
            />
            <Text
              variant="caption"
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: theme.colors.foreground,
              }}
            >
              Pendientes
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: 14,
              paddingHorizontal: 8,
              paddingVertical: 4,
              gap: 5,
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#22c55e",
              }}
            />
            <Text
              variant="caption"
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: theme.colors.foreground,
              }}
            >
              Entregados
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: 14,
              paddingHorizontal: 8,
              paddingVertical: 4,
              gap: 5,
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#ef4444",
              }}
            />
            <Text
              variant="caption"
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: theme.colors.foreground,
              }}
            >
              Incidencias
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleCenterDepot}
            activeOpacity={0.8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.colors.cardBackground,
              borderColor: "#3b82f6",
              borderWidth: 1.5,
              borderRadius: 14,
              paddingHorizontal: 8,
              paddingVertical: 4,
              gap: 5,
              elevation: 2,
            }}
          >
            <Building2 size={12} color="#3b82f6" />
            <Text
              variant="caption"
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: theme.colors.foreground,
              }}
            >
              Almacén Central
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. BOTONES DE CONTROL DE MAPA: COMPÁS, MI UBICACIÓN Y ZOOM +, - */}
      <View
        style={{
          position: "absolute",
          top: 140,
          right: 12,
          gap: 8,
          zIndex: 30,
        }}
      >
        {/* BOTÓN COMPÁS */}
        {/* <TouchableOpacity
          onPress={handleOrientNorth}
          activeOpacity={0.8}
          style={{
            backgroundColor: theme.colors.cardBackground,
            width: 38,
            height: 38,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 5,
          }}
        >
          <Compass size={20} color={theme.colors.foreground} />
        </TouchableOpacity> */}

        {/* 4TO BOTÓN: MI UBICACIÓN (CHOFER) */}
        <TouchableOpacity
          onPress={handleMyLocation}
          activeOpacity={0.8}
          style={{
            backgroundColor: theme.colors.cardBackground,
            width: 38,
            height: 38,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            elevation: 5,
          }}
        >
          <Locate size={20} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* BOTONES DE ZOOM +, - */}
        <View
          style={{
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.colors.border,
            elevation: 5,
            overflow: "hidden",
          }}
        >
          <TouchableOpacity
            onPress={handleZoomIn}
            activeOpacity={0.8}
            style={{
              width: 38,
              height: 38,
              alignItems: "center",
              justifyContent: "center",
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <Plus size={20} color={theme.colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleZoomOut}
            activeOpacity={0.8}
            style={{
              width: 38,
              height: 38,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Minus size={20} color={theme.colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. DRAGGABLE BOTTOM SHEET EN TIEMPO REAL PEGADO ABAJO DE LA PANTALLA */}
      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: sheetHeight,
          overflow: "hidden",
          backgroundColor: theme.colors.cardBackground,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 2.5,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: getPinColor(selectedStop.status),
          paddingHorizontal: 16,
          paddingBottom: Platform.OS === "ios" ? 24 : 16,
          zIndex: 40,
          elevation: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.22,
          shadowRadius: 12,
        }}
      >
        {/* ZONA DRAGGABLE ASIDERO CON GESTOS Y SENSACIÓN TÁCTIL */}
        <View
          {...panResponder.panHandlers}
          style={{
            paddingVertical: 10,
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <TouchableOpacity
            onPress={() => cycleSheetState()}
            activeOpacity={0.7}
            style={{
              width: "100%",
              alignItems: "center",
              gap: 4,
            }}
          >
            <View
              style={{
                width: 52,
                height: 5,
                borderRadius: 3,
                backgroundColor: theme.colors.mutedForeground + "60",
              }}
            />
            {sheetState === "medium" && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 2,
                  marginTop: 2,
                }}
              >
                <ChevronsUp size={12} color={theme.colors.mutedForeground} />
                <Text
                  variant="caption"
                  style={{ fontSize: 10, color: theme.colors.mutedForeground }}
                >
                  Deslizar arriba para ver detalles completos
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* CABECERA RESUMEN PRINCIPAL */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => cycleSheetState()}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: sheetState === "collapsed" ? 0 : 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              flex: 1,
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor:
                  selectedStop.status === "ARRIVED"
                    ? "#e0f2fe"
                    : selectedStop.status === "DELIVERED"
                      ? "#dcfce7"
                      : selectedStop.status === "INCIDENT"
                        ? "#fee2e2"
                        : "#fef3c7",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color:
                    selectedStop.status === "ARRIVED"
                      ? "#0369a1"
                      : selectedStop.status === "DELIVERED"
                        ? "#166534"
                        : selectedStop.status === "INCIDENT"
                          ? "#991b1b"
                          : "#92400e",
                }}
              >
                #{selectedStop.sequence}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                variant="title"
                style={{ fontSize: 15, fontWeight: "700" }}
                numberOfLines={1}
              >
                {selectedStop.clientName}
              </Text>
              <Text
                variant="caption"
                style={{ color: theme.colors.mutedForeground, fontSize: 11 }}
                numberOfLines={1}
              >
                {selectedStop.address}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Badge
              label={
                selectedStop.status === "ARRIVED"
                  ? "En Descarga"
                  : selectedStop.status === "DELIVERED"
                    ? "Entregado"
                    : selectedStop.status === "INCIDENT"
                      ? "Incidencia"
                      : "Pendiente"
              }
              tone={
                selectedStop.status === "ARRIVED"
                  ? "primary"
                  : selectedStop.status === "DELIVERED"
                    ? "success"
                    : selectedStop.status === "INCIDENT"
                      ? "danger"
                      : "neutral"
              }
              size="sm"
            />
            {sheetState === "expanded" ? (
              <ChevronDown size={20} color={theme.colors.mutedForeground} />
            ) : (
              <ChevronUp size={20} color={theme.colors.mutedForeground} />
            )}
          </View>
        </TouchableOpacity>

        {/* CONTENIDO INTERMEDIO (sheetState === 'medium') */}
        {sheetState === "medium" && (
          <View style={{ gap: 10, marginTop: 2 }}>
            <View
              style={{
                gap: 6,
                backgroundColor: theme.colors.secondary,
                padding: 10,
                borderRadius: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 6,
                }}
              >
                <MapPin
                  size={14}
                  color={theme.colors.primary}
                  style={{ marginTop: 2 }}
                />
                <Text
                  variant="bodySmall"
                  style={{
                    color: theme.colors.foreground,
                    flex: 1,
                    fontSize: 12,
                  }}
                >
                  Punto de Entrega:{" "}
                  <Text variant="label" style={{ fontSize: 12 }}>
                    {selectedStop.deliveryPointId}
                  </Text>
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Clock size={12} color={theme.colors.mutedForeground} />
                  <Text
                    variant="caption"
                    style={{
                      color: theme.colors.mutedForeground,
                      fontSize: 11,
                    }}
                  >
                    {selectedStop.deliveryWindow}
                  </Text>
                </View>

                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <User size={12} color={theme.colors.mutedForeground} />
                  <Text
                    variant="caption"
                    style={{
                      color: theme.colors.mutedForeground,
                      fontSize: 11,
                    }}
                  >
                    {selectedStop.contactName}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
              >
                <Package size={13} color={theme.colors.mutedForeground} />
                <Text
                  variant="caption"
                  style={{ color: theme.colors.mutedForeground, fontSize: 11 }}
                >
                  Carga:{" "}
                  <Text variant="label" style={{ fontSize: 11 }}>
                    {selectedStop.packagesCount}
                  </Text>
                </Text>
              </View>

              <Text
                variant="caption"
                style={{ color: theme.colors.mutedForeground, fontSize: 11 }}
              >
                Monto:{" "}
                <Text
                  variant="label"
                  style={{ fontSize: 12, fontWeight: "700" }}
                >
                  {selectedStop.netTotal}
                </Text>
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              {selectedStop.status === "PENDING" && (
                <>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Llamar"
                      icon={Phone}
                      variant="outline"
                      size="sm"
                      fullWidth
                      onPress={() => handleCall(selectedStop.contactPhone)}
                    />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Button
                      label="Estoy en camino"
                      icon={Truck}
                      variant="primary"
                      size="sm"
                      fullWidth
                      onPress={() =>
                        updateStopStatus(selectedStop.id, "EN_ROUTE")
                      }
                    />
                  </View>
                </>
              )}

              {selectedStop.status === "EN_ROUTE" && (
                <>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Llamar"
                      icon={Phone}
                      variant="outline"
                      size="sm"
                      fullWidth
                      onPress={() => handleCall(selectedStop.contactPhone)}
                    />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Button
                      label="Marcar llegada"
                      icon={CheckCircle2}
                      variant="primary"
                      size="sm"
                      fullWidth
                      onPress={() =>
                        updateStopStatus(selectedStop.id, "ARRIVED")
                      }
                    />
                  </View>
                </>
              )}

              {(selectedStop.status === "ARRIVED" ||
                selectedStop.status === "DELIVERED") && (
                <>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Llamar"
                      icon={Phone}
                      variant="outline"
                      size="sm"
                      fullWidth
                      onPress={() => handleCall(selectedStop.contactPhone)}
                    />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Button
                      label={
                        selectedStop.status === "ARRIVED"
                          ? "Ver detalle y cobrar"
                          : "Ver detalle"
                      }
                      variant="primary"
                      size="sm"
                      fullWidth
                      endIcon={ArrowRight}
                      onPress={() => onSelectStopDetail(selectedStop)}
                    />
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* CONTENIDO TOTALMENTE EXPANDIDO BIEN ALTO (sheetState === 'expanded' ~ 70% DE LA PANTALLA) */}
        {sheetState === "expanded" && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingBottom: 12 }}
          >
            {/* TARJETA DETALLADA DE UBICACIÓN Y CONTACTO */}
            <View
              style={{
                gap: 8,
                backgroundColor: theme.colors.secondary,
                padding: 12,
                borderRadius: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  variant="caption"
                  style={{
                    color: theme.colors.mutedForeground,
                    fontWeight: "700",
                  }}
                >
                  DATOS DE ENTREGA
                </Text>
                {selectedStop.isCold && (
                  <Badge
                    label="Cadena de Frío"
                    tone="primary"
                    size="sm"
                  />
                )}
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <MapPin
                  size={16}
                  color={theme.colors.primary}
                  style={{ marginTop: 2 }}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    variant="label"
                    style={{ fontSize: 13, color: theme.colors.foreground }}
                  >
                    {selectedStop.address}
                  </Text>
                  <Text
                    variant="caption"
                    style={{
                      color: theme.colors.mutedForeground,
                      fontSize: 11,
                    }}
                  >
                    Código de Punto: {selectedStop.deliveryPointId}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: theme.colors.border,
                  marginVertical: 2,
                }}
              />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <User size={14} color={theme.colors.primary} />
                  <Text variant="label" style={{ fontSize: 12 }}>
                    {selectedStop.contactName}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleCall(selectedStop.contactPhone)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: theme.colors.primarySoft,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}
                >
                  <Phone size={12} color={theme.colors.primary} />
                  <Text
                    variant="caption"
                    style={{
                      color: theme.colors.primary,
                      fontWeight: "700",
                      fontSize: 11,
                    }}
                  >
                    Llamar
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Clock size={14} color={theme.colors.mutedForeground} />
                <Text
                  variant="caption"
                  style={{ color: theme.colors.mutedForeground, fontSize: 12 }}
                >
                  Ventana Horaria:{" "}
                  <Text variant="label" style={{ fontSize: 12 }}>
                    {selectedStop.deliveryWindow}
                  </Text>
                </Text>
              </View>
            </View>

            {/* NOTAS OPERATIVAS PARA EL CHOFER */}
            {selectedStop.notes && (
              <View
                style={{
                  backgroundColor: "#fef3c7",
                  borderRadius: 10,
                  padding: 10,
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "flex-start",
                  borderWidth: 1,
                  borderColor: "#f59e0b",
                }}
              >
                <FileText size={16} color="#92400e" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    variant="caption"
                    style={{
                      color: "#78350f",
                      fontWeight: "700",
                      fontSize: 11,
                    }}
                  >
                    Instrucciones de Entrega:
                  </Text>
                  <Text
                    variant="caption"
                    style={{ color: "#92400e", fontSize: 12, lineHeight: 16 }}
                  >
                    {selectedStop.notes}
                  </Text>
                </View>
              </View>
            )}

            {/* RESUMEN COMPLETO DE CARGA Y MONTO NETO */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: theme.colors.cardBackground,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: 12,
                justifyContent: "space-between",
              }}
            >
              <View style={{ gap: 2 }}>
                <Text
                  variant="caption"
                  style={{ color: theme.colors.mutedForeground, fontSize: 11 }}
                >
                  Bultos / Unidades
                </Text>
                <Text
                  variant="label"
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: theme.colors.foreground,
                  }}
                >
                  {selectedStop.totalUnits} unidades
                </Text>
              </View>

              <View
                style={{
                  height: 30,
                  width: 1,
                  backgroundColor: theme.colors.border,
                }}
              />

              <View style={{ gap: 2 }}>
                <Text
                  variant="caption"
                  style={{ color: theme.colors.mutedForeground, fontSize: 11 }}
                >
                  Peso & Volumen
                </Text>
                <Text
                  variant="label"
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: theme.colors.foreground,
                  }}
                >
                  {selectedStop.packagesCount}
                </Text>
              </View>

              <View
                style={{
                  height: 30,
                  width: 1,
                  backgroundColor: theme.colors.border,
                }}
              />

              <View style={{ gap: 2 }}>
                <Text
                  variant="caption"
                  style={{ color: theme.colors.mutedForeground, fontSize: 11 }}
                >
                  Monto Neto
                </Text>
                <Text
                  variant="label"
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: theme.colors.primary,
                  }}
                >
                  {selectedStop.netTotal}
                </Text>
              </View>
            </View>

            {/* BOTONES DE ACCIÓN PRINCIPALES */}
            <View style={{ gap: 8, marginTop: 4 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Llamar"
                    icon={Phone}
                    variant="outline"
                    fullWidth
                    onPress={() => handleCall(selectedStop.contactPhone)}
                  />
                </View>

                {onRegistrarVisita && (
                  <View style={{ flex: 1.2 }}>
                    <Button
                      label="Registrar Visita"
                      icon={ClipboardList}
                      variant="secondary"
                      fullWidth
                      onPress={() => onRegistrarVisita(selectedStop)}
                    />
                  </View>
                )}
              </View>

              {selectedStop.status === "PENDING" && (
                <Button
                  label="Estoy en camino"
                  icon={Truck}
                  variant="primary"
                  fullWidth
                  onPress={() => updateStopStatus(selectedStop.id, "EN_ROUTE")}
                />
              )}

              {selectedStop.status === "EN_ROUTE" && (
                <Button
                  label="Marcar llegada"
                  icon={CheckCircle2}
                  variant="primary"
                  fullWidth
                  onPress={() => updateStopStatus(selectedStop.id, "ARRIVED")}
                />
              )}

              {(selectedStop.status === "ARRIVED" ||
                selectedStop.status === "DELIVERED") && (
                <Button
                  label={
                    selectedStop.status === "ARRIVED"
                      ? "Ver detalle y cobrar"
                      : "Ver detalle"
                  }
                  variant="primary"
                  fullWidth
                  endIcon={ArrowRight}
                  onPress={() => onSelectStopDetail(selectedStop)}
                />
              )}
            </View>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

// Estilos JSON para Google Maps
const lightMapStyle = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
];

const darkMapStyle = [
  {
    elementType: "geometry",
    stylers: [{ color: "#212121" }],
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#212121" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ color: "#2c2c2c" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#000000" }],
  },
];
