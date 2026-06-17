// GeoJSON Point, the single geo primitive used everywhere a location is stored.
// Coordinates are ALWAYS [longitude, latitude] (GeoJSON order), enabling
// MongoDB 2dsphere proximity queries ($near / $geoWithin / $geoNear).
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}
