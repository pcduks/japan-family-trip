import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { sampleLandPoints } from './landPoints'
import { latLonToVector3, facingRotation, nearestAngle, damp } from '../lib/geo'
import { useFocus } from '../lib/focus'
import { profile } from '../lib/content'

const R = 1
const INK = new THREE.Color('#f3ead9')
const AMBER = new THREE.Color('#f5b453')
const CORAL = new THREE.Color('#ff7a5c')

type Waypoint = { name: string; lat: number; lon: number }

/* ---------- land as a field of dots ---------- */

const dotVertex = /* glsl */ `
  attribute float aShade;
  varying float vShade;
  uniform float uPixelRatio;
  void main() {
    vShade = aShade;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (2.1 + aShade * 1.1) * uPixelRatio * (2.6 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`
const dotFragment = /* glsl */ `
  varying float vShade;
  uniform vec3 uColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    float a = smoothstep(0.25, 0.12, d);
    gl_FragColor = vec4(uColor, a * (0.55 + 0.45 * vShade));
  }
`

function LandDots() {
  const { gl } = useThree()
  const geometry = useMemo(() => {
    const pts = sampleLandPoints()
    const n = pts.length / 2
    const positions = new Float32Array(n * 3)
    const shade = new Float32Array(n)
    const v = new THREE.Vector3()
    for (let i = 0; i < n; i++) {
      latLonToVector3(pts[i * 2], pts[i * 2 + 1], R * 1.002, v)
      positions.set([v.x, v.y, v.z], i * 3)
      shade[i] = Math.random()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aShade', new THREE.BufferAttribute(shade, 1))
    return g
  }, [])
  const uniforms = useMemo(
    () => ({ uColor: { value: INK }, uPixelRatio: { value: gl.getPixelRatio() } }),
    [gl],
  )
  return (
    <points geometry={geometry}>
      <shaderMaterial vertexShader={dotVertex} fragmentShader={dotFragment} uniforms={uniforms} transparent depthWrite={false} />
    </points>
  )
}

/* ---------- atmosphere ---------- */

const atmoVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
const atmoFragment = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    // Rendered on the back faces of a slightly larger sphere, so the normal points away from the
    // camera: d is -1 in the middle (hidden behind the planet) and 0 at the outer silhouette.
    float d = dot(vNormal, vView);
    float t = clamp((1.0 + d - 0.42) / 0.58, 0.0, 1.0); // 0 at the planet's limb, 1 at the halo's edge
    float glow = pow(1.0 - t, 2.4);
    vec3 col = mix(vec3(0.96, 0.71, 0.33), vec3(0.30, 0.45, 0.95), smoothstep(0.0, 0.6, t));
    gl_FragColor = vec4(col, glow * 0.7);
  }
`

function Atmosphere() {
  return (
    <mesh scale={1.2}>
      <sphereGeometry args={[R, 48, 48]} />
      <shaderMaterial vertexShader={atmoVertex} fragmentShader={atmoFragment} transparent side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}

/* ---------- flight arcs ---------- */

function arcCurve(a: Waypoint, b: Waypoint) {
  const start = latLonToVector3(a.lat, a.lon, R)
  const end = latLonToVector3(b.lat, b.lon, R)
  const dist = start.distanceTo(end)
  const lift = 1 + Math.min(0.55, dist * 0.32)
  const c1 = start.clone().lerp(end, 0.3).normalize().multiplyScalar(R * lift)
  const c2 = start.clone().lerp(end, 0.7).normalize().multiplyScalar(R * lift)
  return new THREE.CubicBezierCurve3(start, c1, c2, end)
}

function Arc({ curve, index, total }: { curve: THREE.CubicBezierCurve3; index: number; total: number }) {
  const points = useMemo(() => curve.getPoints(72), [curve])
  const dot = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!dot.current) return
    const period = 14
    const t = ((clock.elapsedTime / period) * total - index + total) % total
    const visible = t >= 0 && t <= 1
    dot.current.visible = visible
    if (visible) curve.getPointAt(t, dot.current.position)
  })
  return (
    <group>
      <Line points={points} color={AMBER} transparent opacity={0.55} lineWidth={1.1} />
      <mesh ref={dot}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshBasicMaterial color={INK} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Routes() {
  const route = profile.route as Waypoint[]
  const curves = useMemo(() => route.slice(1).map((w, i) => arcCurve(route[i], w)), [route])
  return (
    <group>
      {curves.map((c, i) => (
        <Arc key={i} curve={c} index={i} total={curves.length} />
      ))}
    </group>
  )
}

/* ---------- city markers ---------- */

function Marker({ wp, active }: { wp: Waypoint; active: boolean }) {
  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const pos = useMemo(() => latLonToVector3(wp.lat, wp.lon, R * 1.004), [wp])
  useEffect(() => {
    group.current?.lookAt(0, 0, 0)
  }, [pos])
  useFrame(({ clock }) => {
    if (!ring.current) return
    const pulse = (clock.elapsedTime * 0.9) % 1
    const s = active ? 1 + pulse * 2.6 : 1
    ring.current.scale.setScalar(s)
    const mat = ring.current.material as THREE.MeshBasicMaterial
    mat.opacity = active ? (1 - pulse) * 0.8 : 0.35
  })
  return (
    <group ref={group} position={pos}>
      <mesh>
        <circleGeometry args={[0.011, 20]} />
        <meshBasicMaterial color={active ? CORAL : AMBER} toneMapped={false} />
      </mesh>
      <mesh ref={ring} position={[0, 0, -0.001]}>
        <ringGeometry args={[0.016, 0.02, 32]} />
        <meshBasicMaterial color={CORAL} transparent opacity={0.4} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function Markers() {
  const focus = useFocus()
  const cities = useMemo(() => {
    const seen = new Map<string, Waypoint>()
    for (const w of profile.route as Waypoint[]) seen.set(w.name, w)
    return [...seen.values()]
  }, [])
  return (
    <group>
      {cities.map((c) => {
        const active = !!focus && Math.abs(focus.lat - c.lat) < 0.01 && Math.abs(focus.lon - c.lon) < 0.01
        return <Marker key={c.name} wp={c} active={active} />
      })}
    </group>
  )
}

/* ---------- the globe itself, with camera choreography ---------- */

function Earth({ interactive }: { interactive: boolean }) {
  const group = useRef<THREE.Group>(null)
  const focus = useFocus()
  const yaw = useRef(facingRotation(0, profile.location.lon).y)
  const pitch = useRef(0.25)
  const idleYaw = useRef(yaw.current)
  const drag = useRef({ active: false, x: 0, y: 0, dx: 0, dy: 0, offsetYaw: 0, offsetPitch: 0 })
  const { camera, gl } = useThree()

  useEffect(() => {
    if (!interactive) return
    const el = gl.domElement
    const down = (e: PointerEvent) => {
      drag.current.active = true
      drag.current.x = e.clientX
      drag.current.y = e.clientY
      el.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!drag.current.active) return
      drag.current.offsetYaw += (e.clientX - drag.current.x) * 0.005
      drag.current.offsetPitch += (e.clientY - drag.current.y) * 0.005
      drag.current.offsetPitch = THREE.MathUtils.clamp(drag.current.offsetPitch, -1.2, 1.2)
      drag.current.x = e.clientX
      drag.current.y = e.clientY
    }
    const up = () => {
      drag.current.active = false
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
  }, [gl, interactive])

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const d = drag.current
    // A manual drag decays back to the choreography instead of fighting it.
    if (!d.active) {
      d.offsetYaw = damp(d.offsetYaw, 0, 0.6, dt)
      d.offsetPitch = damp(d.offsetPitch, 0, 0.6, dt)
    }

    let targetYaw: number
    let targetPitch: number
    if (focus) {
      const f = facingRotation(focus.lat, focus.lon)
      // Look slightly left of the city so it sits beside the text rather than under it.
      targetYaw = nearestAngle(yaw.current, f.y - 0.35)
      targetPitch = f.x - 0.1
      idleYaw.current = yaw.current
    } else {
      idleYaw.current += dt * 0.06
      targetYaw = idleYaw.current
      targetPitch = 0.25
    }
    yaw.current = damp(yaw.current, targetYaw, focus ? 2.2 : 4, dt)
    pitch.current = damp(pitch.current, targetPitch, 2.2, dt)

    const breathe = Math.sin(state.clock.elapsedTime * 0.35) * 0.02
    g.rotation.set(pitch.current + d.offsetPitch + breathe, yaw.current + d.offsetYaw, 0, 'XYZ')

    // Gentle parallax from the pointer.
    const px = state.pointer.x * 0.08
    const py = state.pointer.y * 0.05
    camera.position.x = damp(camera.position.x, px, 3, dt)
    camera.position.y = damp(camera.position.y, py, 3, dt)
    camera.lookAt(0, 0, 0)
  })

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[R * 0.996, 64, 64]} />
        <meshStandardMaterial color="#0d1630" roughness={1} metalness={0} />
      </mesh>
      <LandDots />
      <Routes />
      <Markers />
    </group>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 2, 4]} intensity={1.4} color="#f5e6c8" />
      <directionalLight position={[-4, -1, -3]} intensity={0.35} color="#4b6bff" />
    </>
  )
}

export default function Globe({ interactive = true, paused = false }: { interactive?: boolean; paused?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 3.7], fov: 40, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={paused ? 'never' : 'always'}
      style={{ touchAction: 'pan-y' }}
    >
      <Lights />
      <Stars radius={30} depth={40} count={2200} factor={3} saturation={0} fade speed={0.4} />
      <Atmosphere />
      <Earth interactive={interactive} />
    </Canvas>
  )
}
