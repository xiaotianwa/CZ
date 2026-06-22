'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { MapPin, RotateCcw, Users } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  类型                                                              */
/* ------------------------------------------------------------------ */

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

interface GlobeArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string[];
}

/* ------------------------------------------------------------------ */
/*  常量                                                              */
/* ------------------------------------------------------------------ */

const MARKER_COLOR = '#38bdf8';
const HOT_MARKER_COLOR = '#f59e0b';
const GLOBE_RADIUS = 100;

/* ------------------------------------------------------------------ */
/*  工具函数                                                          */
/* ------------------------------------------------------------------ */

function getUserName(user: string | LocationUser): string {
  return typeof user === 'string' ? user : user.name;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (
      child instanceof THREE.Mesh ||
      child instanceof THREE.Line ||
      child instanceof THREE.Sprite ||
      child instanceof THREE.Points
    ) {
      child.geometry?.dispose();
      const material = child.material;
      const materials = Array.isArray(material) ? material : [material];
      materials.forEach((item) => item?.dispose());
    }
  });
}

/* ------------------------------------------------------------------ */
/*  程序化纹理生成（降级方案）                                           */
/* ------------------------------------------------------------------ */
function loadEarthTexture(): Promise<THREE.CanvasTexture> {
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      '/textures/earth_day_2048.jpg',
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      },
      undefined,
      () => {
        // 纹理加载失败时降级为程序化生成
        resolve(createEarthTextureFallback());
      }
    );
  });
}

/** 降级方案：程序化生成简易地球纹理 */
function createEarthTextureFallback(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  oceanGrad.addColorStop(0, '#0a1628');
  oceanGrad.addColorStop(0.3, '#0c2d5e');
  oceanGrad.addColorStop(0.5, '#0e3a6e');
  oceanGrad.addColorStop(0.7, '#0c2d5e');
  oceanGrad.addColorStop(1, '#0a1628');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 经纬网格
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
  ctx.lineWidth = 0.8;
  for (let lat = -90; lat <= 90; lat += 15) {
    const y = ((90 - lat) / 180) * canvas.height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  for (let lng = -180; lng <= 180; lng += 15) {
    const x = ((lng + 180) / 360) * canvas.width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** 生成法线/凹凸贴图（降级方案） */
function createBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 噪点
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 20;
    imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
    imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
    imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  return new THREE.CanvasTexture(canvas);
}

/* ------------------------------------------------------------------ */
/*  星空背景                                                          */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  大气层光晕                                                        */
/* ------------------------------------------------------------------ */

function makeAtmosphere(radius: number): THREE.Mesh {
  const vertexShader = `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const fragmentShader = `
    varying vec3 vNormal;
    void main() {
      float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.8);
      gl_FragColor = vec4(0.376, 0.647, 0.98, 1.0) * intensity * 0.65;
    }
  `;
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.14, 64, 64),
    new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    })
  );
}

/* ------------------------------------------------------------------ */
/*  主组件                                                            */
/* ------------------------------------------------------------------ */

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
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const markerLayerRef = useRef<THREE.Group | null>(null);
  const markersRef = useRef<MarkerRecord[]>([]);
  const animationRef = useRef<number | null>(null);
  const pointerStateRef = useRef({ dragging: false, previousX: 0, previousY: 0, velocityX: 0.0011, velocityY: 0 });
  const latestLocationsRef = useRef<LocationItem[]>(locations);
  const latestSelectedCityRef = useRef<string | null | undefined>(selectedCity);
  const latestActiveLocationRef = useRef<LocationItem | null>(null);
  const latestRequestMapViewRef = useRef<typeof onRequestMapView>(onRequestMapView);
  const [activeLocation, setActiveLocation] = useState<LocationItem | null>(null);
  const [ready, setReady] = useState(false);

  const maxCount = useMemo(() => Math.max(...locations.map((item) => item.count), 1), [locations]);
  const topCities = useMemo(() => locations.slice(0, 7), [locations]);
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

  const selectLocation = useCallback(
    (location: LocationItem | null): void => {
      latestActiveLocationRef.current = location;
      setActiveLocation(location);
      onSelectLocation?.(location);
    },
    [onSelectLocation]
  );

  useEffect(() => {
    latestLocationsRef.current = locations;
    latestSelectedCityRef.current = selectedCity;
    latestActiveLocationRef.current = activeLocation;
    latestRequestMapViewRef.current = onRequestMapView;
  }, [activeLocation, locations, onRequestMapView, selectedCity]);

  /* ---------- 场景初始化 ---------- */
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

    const globeGroup = new THREE.Group();
    globeGroup.rotation.set(0.14, -0.78, 0);
    scene.add(globeGroup);

    // 加载纹理（真实 NASA 图片，降级为程序化生成）
    loadEarthTexture().then((earthTexture) => {
      const bumpTexture = createBumpTexture();

      const earthGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 96, 96);
      const earthMaterial = new THREE.MeshPhongMaterial({
        map: earthTexture,
        bumpMap: bumpTexture,
        bumpScale: 1.5,
        specular: new THREE.Color(0x333355),
        shininess: 20,
      });
      const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
      globeGroup.add(earthMesh);

      // 纹理就绪后标记为 ready
      setReady(true);
    });

    // 大气层
    const atmosphere = makeAtmosphere(GLOBE_RADIUS);
    globeGroup.add(atmosphere);

    // 标记层
    const markerLayer = new THREE.Group();
    globeGroup.add(markerLayer);

    // 星空
    scene.add(makeStarField());

    // 灯光
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
    globeGroupRef.current = globeGroup;
    markerLayerRef.current = markerLayer;

    /* ---------- 事件 ---------- */
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handleResize = (): void => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const handlePointerDown = (e: PointerEvent): void => {
      pointerStateRef.current.dragging = true;
      pointerStateRef.current.previousX = e.clientX;
      pointerStateRef.current.previousY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent): void => {
      const s = pointerStateRef.current;
      const g = globeGroupRef.current;
      if (!s.dragging || !g) return;
      const dx = e.clientX - s.previousX;
      const dy = e.clientY - s.previousY;
      s.previousX = e.clientX;
      s.previousY = e.clientY;
      s.velocityX = dx * 0.00065;
      s.velocityY = dy * 0.00036;
      g.rotation.y += dx * 0.004;
      g.rotation.x += dy * 0.0022;
      g.rotation.x = Math.max(-0.72, Math.min(0.72, g.rotation.x));
    };

    const handlePointerUp = (e: PointerEvent): void => {
      pointerStateRef.current.dragging = false;
      renderer.domElement.releasePointerCapture(e.pointerId);
    };

    const handleClick = (e: MouseEvent): void => {
      if (!cameraRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, cameraRef.current);
      const hits = raycaster.intersectObjects(markersRef.current.map((m) => m.mesh), false);
      if (hits[0]) {
        const marker = markersRef.current.find((m) => m.mesh === hits[0].object);
        selectLocation(marker?.location ?? null);
      }
    };

    const handleWheel = (e: WheelEvent): void => {
      if (!cameraRef.current) return;
      e.preventDefault();
      const nextZ = cameraRef.current.position.z + e.deltaY * 0.18;
      cameraRef.current.position.z = Math.max(180, Math.min(520, nextZ));
      cameraRef.current.updateProjectionMatrix();

      if (e.deltaY < 0 && cameraRef.current.position.z <= 205) {
        const locs = latestLocationsRef.current;
        const focused =
          latestActiveLocationRef.current ??
          locs.find((l) => l.city === latestSelectedCityRef.current) ??
          locs[0] ??
          null;
        latestRequestMapViewRef.current?.(focused);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('resize', handleResize);

    /* ---------- 动画循环 ---------- */
    const animate = (): void => {
      animationRef.current = requestAnimationFrame(animate);
      const g = globeGroupRef.current;
      if (g && !pointerStateRef.current.dragging) {
        g.rotation.y += pointerStateRef.current.velocityX;
        g.rotation.x += pointerStateRef.current.velocityY;
        pointerStateRef.current.velocityX *= 0.986;
        pointerStateRef.current.velocityY *= 0.972;
        if (Math.abs(pointerStateRef.current.velocityX) < 0.00055) {
          pointerStateRef.current.velocityX = 0.00085;
        }
      }
      markersRef.current.forEach((marker, i) => {
        const pulse = 1 + Math.sin(Date.now() * 0.004 + i) * 0.18;
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
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      markersRef.current = [];
    };
  }, [selectLocation]);

  /* ---------- 经纬度 → 3D 坐标 ---------- */
  const latLngToVec3 = useCallback(
    (lat: number, lng: number, altitude: number): THREE.Vector3 => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      const r = GLOBE_RADIUS + altitude;
      return new THREE.Vector3(
        -(r * Math.sin(phi) * Math.cos(theta)),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    },
    []
  );

  /* ---------- 更新标记 / 弧线 ---------- */
  useEffect(() => {
    const layer = markerLayerRef.current;
    const group = globeGroupRef.current;
    if (!layer || !group) return;

    // 清除旧标记
    while (layer.children.length > 0) {
      const child = layer.children[0];
      layer.remove(child);
      disposeObject(child);
    }
    markersRef.current = [];

    // 城市标记
    locations.slice(0, 90).forEach((location) => {
      const ratio = location.count / maxCount;
      const color = location.count >= maxCount * 0.55 ? HOT_MARKER_COLOR : MARKER_COLOR;
      const pos = latLngToVec3(location.coord[1], location.coord[0], 3.5 + ratio * 2.5);

      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.72 + ratio * 1.1, 24, 24),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
      );
      marker.position.copy(pos);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.4 + ratio * 1.8, 2.2 + ratio * 2.2, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
      );
      ring.position.copy(pos);
      ring.lookAt(new THREE.Vector3(0, 0, 0));

      layer.add(marker);
      layer.add(ring);
      markersRef.current.push({ location, mesh: marker, ring });
    });

    // 弧线
    globeArcs.forEach((arc) => {
      const start = latLngToVec3(arc.startLat, arc.startLng, 0);
      const end = latLngToVec3(arc.endLat, arc.endLng, 0);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      mid.normalize().multiplyScalar(GLOBE_RADIUS + 22);

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48));
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(arc.color[1]),
        transparent: true,
        opacity: 0.35,
      });
      layer.add(new THREE.Line(geometry, material));
    });
  }, [globeArcs, locations, latLngToVec3, maxCount]);

  /* ---------- 重置 ---------- */
  useEffect(() => {
    const g = globeGroupRef.current;
    if (!g) return;
    g.rotation.set(0.14, -0.78, 0);
    pointerStateRef.current.velocityX = 0.00085;
    pointerStateRef.current.velocityY = 0;
    selectLocation(null);
  }, [resetToken, selectLocation]);

  /* ---------- 选中城市 ---------- */
  useEffect(() => {
    if (!selectedCity) {
      latestActiveLocationRef.current = null;
      setActiveLocation(null);
      return;
    }
    const next = locations.find((item) => item.city === selectedCity) ?? null;
    latestActiveLocationRef.current = next;
    setActiveLocation(next);
  }, [locations, selectedCity]);

  /* ---------- 渲染 ---------- */
  return (
    <div className="relative h-full min-h-[640px] overflow-hidden bg-[#020817] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(56,189,248,0.18),transparent_36%),radial-gradient(circle_at_18%_20%,rgba(245,158,11,0.1),transparent_24%)]" />
      <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {!ready && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[#020817]/88 text-white">
          <div className="relative h-28 w-28">
            <div className="absolute inset-0 rounded-full border border-sky-300/20" />
            <div className="absolute inset-2 rounded-full border border-amber-200/15" />
            <div className="absolute inset-0 rounded-full border-t-2 border-sky-300 animate-spin" />
            <div className="absolute inset-5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#7dd3fc,#0f4c81_48%,#031225_76%)] shadow-[0_0_36px_rgba(56,189,248,0.35)] animate-pulse" />
          </div>
        </div>
      )}

      {/* 实时概览 */}
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

      {/* 重置视角 */}
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-wrap justify-center gap-2 px-4">
        <button
          type="button"
          onClick={() => {
            const g = globeGroupRef.current;
            if (!g) return;
            g.rotation.set(0.14, -0.78, 0);
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

      {/* 城市详情弹窗 */}
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
                  大概位置：{activeLocation.city} 附近，约 {activeLocation.coord[1].toFixed(2)}°N /{' '}
                  {activeLocation.coord[0].toFixed(2)}°E
                </p>
              </div>
              <button
                type="button"
                onClick={() => selectLocation(null)}
                className="text-caption text-white/45 transition-colors hover:text-white"
              >
                关闭
              </button>
            </div>
            {(activeLocation.users ?? []).length > 0 ? (
              <div className="mt-4 border-t border-white/10 pt-3">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] text-white/45">
                  <Users className="h-3.5 w-3.5" />
                  已记录成员
                </div>
                <div className="flex flex-wrap gap-2">
                  {(activeLocation.users ?? [])
                    .slice(0, 8)
                    .map((user) => (
                      <span
                        key={getUserName(user)}
                        className="max-w-[120px] truncate rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/75"
                      >
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
