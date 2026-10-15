import { feature } from 'topojson-client'
import { geoEquirectangular, geoPath } from 'd3-geo'
import type { Topology, GeometryCollection } from 'topojson-specification'
import land110 from 'world-atlas/land-110m.json'

/**
 * Samples a Fibonacci sphere and keeps the points that fall on land, by rasterising the
 * Natural Earth 1:110m land polygons to an offscreen canvas once. Returns [lat, lon] pairs.
 */
export function sampleLandPoints(count = 16000): Float32Array {
  const W = 1024
  const H = 512
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return new Float32Array(0)

  const topo = land110 as unknown as Topology<{ land: GeometryCollection }>
  const land = feature(topo, topo.objects.land)
  const projection = geoEquirectangular().fitSize([W, H], { type: 'Sphere' })
  const path = geoPath(projection, ctx)
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  path(land)
  ctx.fill()
  const pixels = ctx.getImageData(0, 0, W, H).data

  const out: number[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const lat = Math.asin(y) * (180 / Math.PI)
    const lon = ((((i * golden) % (Math.PI * 2)) / Math.PI) * 180 + 540) % 360 - 180
    const px = Math.min(W - 1, Math.floor(((lon + 180) / 360) * W))
    const py = Math.min(H - 1, Math.floor(((90 - lat) / 180) * H))
    if (pixels[(py * W + px) * 4 + 3] > 0) out.push(lat, lon)
  }
  return new Float32Array(out)
}
