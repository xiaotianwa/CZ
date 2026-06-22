'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import ThreeGlobe from 'three-globe';
import { MapPin, RotateCcw, Users } from 'lucide-react';
import MapLoadingOverlay from '@/components/MapLoadingOverlay';

interface LocationUser {
  name: string;
  avatar?: string | null;
}

export interface LocationItem {
  city: string;
  count: number;
  users?: Array<string | LocationUser>;
  coord: [number, number];
}

interface FanGlobeStats {
  totalFans: number;
  mappedCount: number;
  mappedCityCount: number;
  coverageRate: number;
}

interface MarkerRecord {
  location: LocationItem;
  mesh: THREE.Mesh;
  ring: THREE.Mesh;
}

interface GlobePoint {
  city: string;
  count: number;
  lat: number;
  lng: number;
  color: string;
  radius: number;
  altitude: number;
}

interface GlobeArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string[];
}

interface GlobeLabel {
  city: string;
  lat: number;
  lng: number;
  color: string;
}

const MARKER_COLOR = '#38bdf8';
const HOT_MARKER_COLOR = '#f59e0b';
const TEXTURE_PATH = '/textures/earth/';

function getUserName(user: string | LocationUser): string {
  return typeof user === 'string' ? user : user.name;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Sprite || child instanceof THREE.Points) {
      child.geometry?.dispose();
      const material = child.material;
      const materials = Array.isArray(material) ? material : [material];
      materials.forEach((item) => item?.dispose());
    }
  });
}

function makeStarField(): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(1200 * 3);
  for (let i = 0; i < 1200; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 900;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 560;
    positions[i * 3 + 2] = -160 - Math.random() * 500;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0xffffff, size: 1.15, transparent: true, opacity: 0.58 })
  );
}

function makeCloudLayer(radius: number): THREE.Mesh {
  const texture = new THREE.TextureLoader().load(`${TEXTURE_PATH}earth_clouds_1024.png`);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.012, 96, 96),
    new THREE.MeshLambertMaterial({
      map: texture,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    })
  );
}

export default function ThreeFanGlobe({
  locations,
  stats,
  resetToken,
  selectedCity,
  onSelectLocation,
  onRequestMapView,
}: {
  locations: LocationItem[];
  stats: FanGlobeStats;
  resetToken?: number;
  selectedCity?: string | null;
  onSelectLocation?: (location: LocationItem | null) => void;
  onRequestMapView?: (location: LocationItem | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const globeRef = useRef<ThreeGlobe | null>(null);
  const markerLayerRef = useRef<THREE.Group | null>(null);
  const cloudRef = useRef<THREE.Mesh | null>(null);
  const markersRef = useRef<MarkerRecord[]>([]);
  const animationRef = useRef<number | null>(null);
  const pointerStateRef = useRef({ dragging: false, previousX: 0, previousY: 0, velocityX: 0.0011, velocityY: 0 });
  const latestLocationsRef = useRef<LocationItem[]>(locations);
  const latestSelectedCityRef = useRef<string | null | undefined>(selectedCity);
  const latestActiveLocationRef = useRef<LocationItem | null>(null);
  const latestRequestMapViewRef = useRef<typeof onRequestMapView>(onRequestMapView);
  const [activeLocation, setActiveLocation] = useState<LocationItem | null>(null);
  const [globeReady, setGlobeReady] = useState(false);

  const maxCount = useMemo(() => Math.max(...locations.map((item) => item.count), 1), [locations]);
  const topCities = useMemo(() => locations.slice(0, 7), [locations]);
  const globePoints = useMemo<GlobePoint[]>(
    () => locations.slice(0, 90).map((location) => {
      const ratio = location.count / maxCount;
      const isHot = location.count >= maxCount * 0.55;
      return {
        city: location.city,
        count: location.count,
        lng: location.coord[0],
        lat: location.coord[1],
        color: isHot ? HOT_MARKER_COLOR : MARKER_COLOR,
        radius: 0.22 + ratio * 0.55,
        altitude: 0.018 + ratio * 0.025,
      };
    }),
    [locations, maxCount]
  );
  const globeArcs = useMemo<GlobeArc[]>(() => {
    const anchor = locations[0];
    if (!anchor) return [];
    return locations
      .slice(1, 16)
      .filter((location) => location.count >= maxCount * 0.45)
      .map((location) => ({
        startLng: anchor.coord[0],
        startLat: anchor.coord[1],
        endLng: location.coord[0],
        endLat: location.coord[1],
        color: ['rgba(56,189,248,0.15)', 'rgba(245,158,11,0.92)'],
      }));
  }, [locations, maxCount]);
  const globeLabels = useMemo<GlobeLabel[]>(
    () => topCities.map((location) => ({
      city: `${location.city} ${location.count}人`,
      lng: location.coord[0],
      lat: location.coord[1],
      color: location.count >= maxCount * 0.55 ? HOT_MARKER_COLOR : '#bae6fd',
    })),
    [topCities, maxCount]
  );

  const selectLocation = (location: LocationItem | null): void => {
    latestActiveLocationRef.current = location;
    setActiveLocation(location);
    onSelectLocation?.(location);
  };

  useEffect(() => {
    latestLocationsRef.current = locations;
    latestSelectedCityRef.current = selectedCity;
    latestActiveLocationRef.current = activeLocation;
    latestRequestMapViewRef.current = onRequestMapView;
  }, [activeLocation, locations, onRequestMapView, selectedCity]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, container.clientWidth / container.clientHeight, 1, 1500);
    camera.position.set(0, 0, 330);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    const globe = new ThreeGlobe({ waitForGlobeReady: true, animateIn: false })
      .globeImageUrl(`${TEXTURE_PATH}earth_day_2048.jpg`)
      .bumpImageUrl(`${TEXTURE_PATH}earth_normal_2048.jpg`)
      .showAtmosphere(true)
      .atmosphereColor('#60a5fa')
      .atmosphereAltitude(0.18)
      .showGraticules(false)
      .globeCurvatureResolution(5)
      .onGlobeReady(() => {
        window.setTimeout(() => setGlobeReady(true), 260);
      });

    globe.rotation.set(0.14, -0.78, 0);
    scene.add(globe);

    const markerLayer = new THREE.Group();
    globe.add(markerLayer);
    const clouds = makeCloudLayer(globe.getGlobeRadius());
    globe.add(clouds);

    scene.add(makeStarField());
    scene.add(new THREE.AmbientLight(0xdbeafe, 1.05));
    const sun = new THREE.DirectionalLight(0xffffff, 3.25);
    sun.position.set(260, 140, 280);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x38bdf8, 1.25);
    rim.position.set(-240, 30, -220);
    scene.add(rim);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    globeRef.current = globe;
    markerLayerRef.current = markerLayer;
    cloudRef.current = clouds;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handleResize = (): void => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    const handlePointerDown = (event: PointerEvent): void => {
      pointerStateRef.current.dragging = true;
      pointerStateRef.current.previousX = event.clientX;
      pointerStateRef.current.previousY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent): void => {
      const state = pointerStateRef.current;
      const currentGlobe = globeRef.current;
      if (!state.dragging || !currentGlobe) return;
      const deltaX = event.clientX - state.previousX;
      const deltaY = event.clientY - state.previousY;
      state.previousX = event.clientX;
      state.previousY = event.clientY;
      state.velocityX = deltaX * 0.00065;
      state.velocityY = deltaY * 0.00036;
      currentGlobe.rotation.y += deltaX * 0.004;
      currentGlobe.rotation.x += deltaY * 0.0022;
      currentGlobe.rotation.x = Math.max(-0.72, Math.min(0.72, currentGlobe.rotation.x));
    };

    const handlePointerUp = (event: PointerEvent): void => {
      pointerStateRef.current.dragging = false;
      renderer.domElement.releasePointerCapture(event.pointerId);
    };

    const handleClick = (event: MouseEvent): void => {
      if (!cameraRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, cameraRef.current);
      const intersects = raycaster.intersectObjects(markersRef.current.map((item) => item.mesh), false);
      if (intersects[0]) {
        const marker = markersRef.current.find((item) => item.mesh === intersects[0].object);
        selectLocation(marker?.location ?? null);
      }
    };

    const handleWheel = (event: WheelEvent): void => {
      if (!cameraRef.current) return;
      event.preventDefault();
      const nextZ = cameraRef.current.position.z + event.deltaY * 0.18;
      cameraRef.current.position.z = Math.max(180, Math.min(520, nextZ));
      cameraRef.current.updateProjectionMatrix();

      if (event.deltaY < 0 && cameraRef.current.position.z <= 205) {
        const latestLocations = latestLocationsRef.current;
        const focusedLocation = latestActiveLocationRef.current
          ?? latestLocations.find((location) => location.city === latestSelectedCityRef.current)
          ?? latestLocations[0]
          ?? null;
        latestRequestMapViewRef.current?.(focusedLocation);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('resize', handleResize);

    const animate = (): void => {
      animationRef.current = requestAnimationFrame(animate);
      const currentGlobe = globeRef.current;
      if (currentGlobe && !pointerStateRef.current.dragging) {
        currentGlobe.rotation.y += pointerStateRef.current.velocityX;
        currentGlobe.rotation.x += pointerStateRef.current.velocityY;
        pointerStateRef.current.velocityX *= 0.986;
        pointerStateRef.current.velocityY *= 0.972;
        if (Math.abs(pointerStateRef.current.velocityX) < 0.00055) {
          pointerStateRef.current.velocityX = 0.00085;
        }
      }
      if (cloudRef.current) cloudRef.current.rotation.y += 0.00028;
      markersRef.current.forEach((marker, index) => {
        const pulse = 1 + Math.sin(Date.now() * 0.004 + index) * 0.18;
        marker.ring.scale.setScalar(pulse);
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      globe._destructor();
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    globe
      .pointsData(globePoints)
      .pointLat('lat')
      .pointLng('lng')
      .pointColor('color')
      .pointAltitude('altitude')
      .pointRadius('radius')
      .pointResolution(18)
      .pointsTransitionDuration(500)
      .arcsData(globeArcs)
      .arcStartLat('startLat')
      .arcStartLng('startLng')
      .arcEndLat('endLat')
      .arcEndLng('endLng')
      .arcColor('color')
      .arcAltitude(0.22)
      .arcStroke(0.55)
      .arcDashLength(0.52)
      .arcDashGap(1.2)
      .arcDashAnimateTime(2400)
      .htmlElementsData(globeLabels)
      .htmlLat('lat')
      .htmlLng('lng')
      .htmlAltitude(0.055)
      .htmlElement((datum) => {
        const label = datum as GlobeLabel;
        const element = document.createElement('div');
        element.textContent = label.city;
        element.style.color = label.color;
        element.style.font = '700 12px "PingFang SC", "Microsoft YaHei", sans-serif';
        element.style.textShadow = '0 1px 8px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)';
        element.style.whiteSpace = 'nowrap';
        element.style.pointerEvents = 'none';
        element.style.transform = 'translate(-50%, -50%)';
        return element;
      })
      .htmlTransitionDuration(400);

    const layer = markerLayerRef.current;
    if (!layer) return;

    while (layer.children.length > 0) {
      const child = layer.children[0];
      layer.remove(child);
      disposeObject(child);
    }
    markersRef.current = [];

    locations.slice(0, 90).forEach((location) => {
      const ratio = location.count / maxCount;
      const color = location.count >= maxCount * 0.55 ? HOT_MARKER_COLOR : MARKER_COLOR;
      const coords = globe.getCoords(location.coord[1], location.coord[0], 0.035 + ratio * 0.025);
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.72 + ratio * 1.1, 24, 24),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.001 })
      );
      marker.position.set(coords.x, coords.y, coords.z);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.4 + ratio * 1.8, 2.2 + ratio * 2.2, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
      );
      ring.position.copy(marker.position);
      ring.lookAt(new THREE.Vector3(0, 0, 0));

      layer.add(marker);
      layer.add(ring);
      markersRef.current.push({ location, mesh: marker, ring });
    });
  }, [globePoints, globeArcs, globeLabels, locations, maxCount]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.rotation.set(0.14, -0.78, 0);
    pointerStateRef.current.velocityX = 0.00085;
    pointerStateRef.current.velocityY = 0;
    selectLocation(null);
  }, [resetToken]);

  useEffect(() => {
    if (!selectedCity) {
      latestActiveLocationRef.current = null;
      setActiveLocation(null);
      return;
    }
    const nextLocation = locations.find((item) => item.city === selectedCity) ?? null;
    latestActiveLocationRef.current = nextLocation;
    setActiveLocation(nextLocation);
  }, [locations, selectedCity]);

  return (
    <div className="relative h-full min-h-[640px] overflow-hidden bg-[#020817] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(56,189,248,0.18),transparent_36%),radial-gradient(circle_at_18%_20%,rgba(245,158,11,0.1),transparent_24%)]" />
      <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />
      {!globeReady ? <MapLoadingOverlay label="正在加载 3D 地球" /> : null}

      <div className="pointer-events-none absolute left-5 top-24 z-10 hidden w-72 rounded-2xl border border-white/10 bg-slate-950/55 p-4 shadow-2xl backdrop-blur-md lg:block">
        <p className="text-caption font-semibold text-white">实时概览</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div>
            <p className="text-[11px] text-white/45">粉丝</p>
            <p className="mt-1 text-body font-semibold">{stats.totalFans}</p>
          </div>
          <div>
            <p className="text-[11px] text-white/45">已上图</p>
            <p className="mt-1 text-body font-semibold">{stats.mappedCount}</p>
          </div>
          <div>
            <p className="text-[11px] text-white/45">城市</p>
            <p className="mt-1 text-body font-semibold">{stats.mappedCityCount}</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-wrap justify-center gap-2 px-4">
        <button
          type="button"
          onClick={() => {
            if (!globeRef.current) return;
            globeRef.current.rotation.set(0.14, -0.78, 0);
            pointerStateRef.current.velocityX = 0.00085;
            pointerStateRef.current.velocityY = 0;
            selectLocation(null);
          }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-slate-950/65 px-4 text-caption font-medium text-white backdrop-blur-md transition-colors hover:bg-slate-950/80"
        >
          <RotateCcw className="h-4 w-4" />
          重置视角
        </button>
      </div>

      {activeLocation ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/20 px-4 backdrop-blur-[1px]">
          <div className="w-[min(440px,calc(100%-32px))] rounded-3xl border border-white/10 bg-slate-950/82 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-body font-semibold text-white">
                <MapPin className="h-4 w-4 text-sky-300" />
                {activeLocation.city}
              </div>
              <p className="mt-1 text-caption text-white/60">这里已经有 {activeLocation.count} 位泽小将。</p>
              <p className="mt-2 text-caption leading-6 text-white/50">
                大概位置：{activeLocation.city} 附近，约 {activeLocation.coord[1].toFixed(2)}°N / {activeLocation.coord[0].toFixed(2)}°E
              </p>
            </div>
            <button type="button" onClick={() => selectLocation(null)} className="text-caption text-white/45 transition-colors hover:text-white">关闭</button>
          </div>
          {(activeLocation.users ?? []).length > 0 ? (
            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] text-white/45">
                <Users className="h-3.5 w-3.5" />
                已记录成员
              </div>
              <div className="flex flex-wrap gap-2">
                {(activeLocation.users ?? []).slice(0, 8).map((user) => (
                  <span key={getUserName(user)} className="max-w-[120px] truncate rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/75">
                    {getUserName(user)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
