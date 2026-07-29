export type LatLng = {
  latitude: number;
  longitude: number;
};

/** Coordenadas del Depósito Central / Almacén Principal en Santa Cruz (Parque Industrial / 4to Anillo) */
export const SANTA_CRUZ_DEPOT: LatLng = {
  latitude: -17.765,
  longitude: -63.16,
};

/** Región Inicial del Mapa en Santa Cruz de la Sierra */
export const SANTA_CRUZ_INITIAL_REGION = {
  latitude: -17.772,
  longitude: -63.175,
  latitudeDelta: 0.085,
  longitudeDelta: 0.085,
};

/** Coordenadas Reales de las 6 Paradas de la Ruta en Santa Cruz */
export const SANTA_CRUZ_STOPS_COORDINATES: Record<number, LatLng> = {
  1: { latitude: -17.768, longitude: -63.195 },  // Equipetrol Norte (Av. San Martín)
  2: { latitude: -17.752, longitude: -63.181 },  // IC Norte (Av. Cristo Redentor / 3er Anillo)
  3: { latitude: -17.792, longitude: -63.184 },  // Mercado Abasto Norte (5to Anillo Cristo Redentor)
  4: { latitude: -17.805, longitude: -63.201 },  // Mercado Mutualista (Av. Mutualista / 3er Anillo)
  5: { latitude: -17.741, longitude: -63.17 },   // Fidalga (4to Anillo Banzer)
  6: { latitude: -17.789, longitude: -63.138 },  // Hipermaxi Villa 1ro de Mayo (Av. Cumavi)
};

/**
 * Trazado curvo suave y orgánico (GeoJSON Polyline) siguiendo las avenidas radiales
 * y los Anillos concéntricos de Santa Cruz de la Sierra hasta retornar al Depósito.
 */
export const SANTA_CRUZ_CLOSED_LOOP_POLYLINE: LatLng[] = [
  // Origen: Parque Industrial (Depósito Central)
  { latitude: -17.765, longitude: -63.16 },

  // Tramo 1: Curva suave por 4to Anillo Norte hacia Equipetrol (Parada #1)
  { latitude: -17.763, longitude: -63.168 },
  { latitude: -17.762, longitude: -63.176 },
  { latitude: -17.764, longitude: -63.186 },
  { latitude: -17.768, longitude: -63.195 }, // #1 Equipetrol

  // Tramo 2: Curva envolvente por Av. San Martín hacia 3er Anillo Norte / IC Norte (Parada #2)
  { latitude: -17.764, longitude: -63.197 },
  { latitude: -17.758, longitude: -63.193 },
  { latitude: -17.753, longitude: -63.187 },
  { latitude: -17.752, longitude: -63.181 }, // #2 IC Norte

  // Tramo 3: Descenso curvo por Av. Cristo Redentor hacia Plazuela Blacutt / Abasto (Parada #3)
  { latitude: -17.759, longitude: -63.181 },
  { latitude: -17.768, longitude: -63.182 }, // El Cristo Redentor
  { latitude: -17.776, longitude: -63.182 },
  { latitude: -17.784, longitude: -63.183 }, // 1er Anillo
  { latitude: -17.792, longitude: -63.184 }, // #3 Mercado Abasto Norte

  // Tramo 4: Curva por 2do Anillo Sur hacia Urbarí y Mercado Mutualista (Parada #4)
  { latitude: -17.796, longitude: -63.188 },
  { latitude: -17.801, longitude: -63.195 },
  { latitude: -17.805, longitude: -63.201 }, // #4 Mercado Mutualista

  // Tramo 5: Arco concéntrico bordeando el 4to Anillo Oeste hacia Banzer Norte (Parada #5)
  { latitude: -17.799, longitude: -63.207 },
  { latitude: -17.788, longitude: -63.209 },
  { latitude: -17.774, longitude: -63.205 },
  { latitude: -17.759, longitude: -63.197 },
  { latitude: -17.747, longitude: -63.184 },
  { latitude: -17.741, longitude: -63.17 }, // #5 Fidalga Banzer

  // Tramo 6: Arco por Av. Mutualista y 3er Anillo Este hacia Villa 1ro de Mayo (Parada #6)
  { latitude: -17.744, longitude: -63.159 },
  { latitude: -17.753, longitude: -63.148 },
  { latitude: -17.766, longitude: -63.139 },
  { latitude: -17.778, longitude: -63.135 },
  { latitude: -17.789, longitude: -63.138 }, // #6 Villa 1ro de Mayo

  // Tramo 7: Retorno Curvo por Av. Cumavi y Parque Industrial al Depósito (Cierre del Bucle)
  { latitude: -17.785, longitude: -63.144 },
  { latitude: -17.776, longitude: -63.15 },
  { latitude: -17.769, longitude: -63.155 },
  { latitude: -17.765, longitude: -63.16 }, // Retorno al Depósito Central
];

/** Tramo Recorrido Activo (Origen -> #1 -> #2 -> #3) */
export const SANTA_CRUZ_COMPLETED_SEGMENT: LatLng[] = [
  { latitude: -17.765, longitude: -63.16 },
  { latitude: -17.763, longitude: -63.168 },
  { latitude: -17.762, longitude: -63.176 },
  { latitude: -17.764, longitude: -63.186 },
  { latitude: -17.768, longitude: -63.195 }, // #1
  { latitude: -17.764, longitude: -63.197 },
  { latitude: -17.758, longitude: -63.193 },
  { latitude: -17.753, longitude: -63.187 },
  { latitude: -17.752, longitude: -63.181 }, // #2
  { latitude: -17.759, longitude: -63.181 },
  { latitude: -17.768, longitude: -63.182 },
  { latitude: -17.776, longitude: -63.182 },
  { latitude: -17.784, longitude: -63.183 },
  { latitude: -17.792, longitude: -63.184 }, // #3
];
