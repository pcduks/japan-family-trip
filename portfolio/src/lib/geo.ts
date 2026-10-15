import { Vector3 } from 'three'

const D2R = Math.PI / 180

/** lat/lon in degrees to a point on a sphere of radius r. Longitude 0 faces +z, east is +x. */
export function latLonToVector3(lat: number, lon: number, r = 1, out = new Vector3()) {
  const phi = lat * D2R
  const lambda = lon * D2R
  return out.set(r * Math.cos(phi) * Math.sin(lambda), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(lambda))
}

/** Euler angles (x, y) that bring lat/lon to face the camera at +z, north up. */
export function facingRotation(lat: number, lon: number) {
  return { x: lat * D2R, y: -lon * D2R }
}

/** Shortest-path equivalent of `target` relative to `current` on a circle. */
export function nearestAngle(current: number, target: number) {
  const twoPi = Math.PI * 2
  let t = target
  while (t - current > Math.PI) t -= twoPi
  while (t - current < -Math.PI) t += twoPi
  return t
}

export function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}
