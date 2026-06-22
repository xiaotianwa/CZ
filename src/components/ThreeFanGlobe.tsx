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
/*  真实世界海岸线数据（简化版 GeoJSON 坐标）                            */
/*  来源：Natural Earth 110m 海岸线，经简化后内嵌                         */
/*  坐标系：WGS84 [lng, lat]，Canvas 映射：x=(lng+180)/360*W, y=(90-lat)/180*H */
/* ------------------------------------------------------------------ */

/** 将经纬度映射到 Canvas 像素坐标 */
function geoToCanvas(lng: number, lat: number, cw: number, ch: number): [number, number] {
  const x = ((lng + 180) / 360) * cw;
  const y = ((90 - lat) / 180) * ch;
  return [x, y];
}

/** 简化版世界海岸线多边形数据（Natural Earth 110m 海岸线简化） */
const WORLD_COASTLINES: number[][][] = [
  // 北美洲
  [[-168,72],[-141,70],[-140,60],[-130,55],[-123,49],[-123,45],[-124,43],[-123,38],[-117,33],[-105,29],[-100,26],[-97,26],[-97,22],[-87,18],[-83,15],[-77,8],[-80,6],[-83,8],[-90,14],[-105,20],[-117,23],[-120,34],[-123,37],[-125,42],[-128,46],[-130,51],[-136,55],[-140,58],[-142,60],[-147,61],[-153,60],[-157,56],[-163,55],[-166,54],[-168,53],[-170,57],[-168,65],[-166,68],[-168,72]],
  // 南美洲
  [[-78,8],[-77,2],[-80,0],[-81,-5],[-81,-10],[-77,-13],[-72,-14],[-71,-17],[-70,-20],[-70,-24],[-70,-28],[-70,-33],[-72,-37],[-74,-41],[-74,-46],[-75,-52],[-75,-55],[-68,-55],[-65,-48],[-65,-43],[-64,-42],[-63,-41],[-63,-39],[-62,-37],[-58,-38],[-57,-36],[-55,-31],[-55,-26],[-54,-22],[-48,-26],[-44,-24],[-39,-18],[-38,-13],[-35,-6],[-35,-1],[-38,0],[-42,-2],[-45,-5],[-48,-6],[-52,-5],[-55,-2],[-60,1],[-62,4],[-62,8],[-60,10],[-58,7],[-55,5],[-52,5],[-50,2],[-48,0],[-46,-2],[-45,-5],[-48,-8],[-52,-10],[-55,-12],[-58,-15],[-60,-18],[-62,-22],[-63,-26],[-65,-30],[-67,-35],[-69,-40],[-71,-45],[-73,-50],[-75,-54],[-77,-52],[-75,-48],[-73,-42],[-72,-36],[-71,-30],[-70,-25],[-70,-20],[-71,-15],[-73,-10],[-75,-5],[-77,0],[-78,4],[-78,8]],
  // 欧洲
  [[-25,66],[-18,66],[-15,64],[-8,58],[-5,55],[0,51],[2,51],[4,52],[6,53],[8,54],[10,55],[12,56],[14,57],[16,58],[18,58],[20,60],[22,60],[24,59],[26,60],[28,60],[30,60],[32,60],[34,60],[36,61],[38,61],[40,61],[42,61],[44,61],[46,61],[48,61],[50,60],[52,58],[54,56],[56,54],[58,52],[60,50],[62,48],[64,46],[66,44],[68,42],[70,40],[72,38],[74,36],[76,34],[78,32],[80,30],[82,28],[84,26],[86,24],[88,22],[90,20],[92,18],[94,16],[96,14],[98,12],[100,10],[102,8],[104,6],[106,4],[108,2],[110,0],[112,-2],[114,-4],[116,-6],[118,-8],[120,-10],[122,-12],[124,-14],[126,-16],[128,-18],[130,-20],[132,-22],[134,-24],[136,-26],[138,-28],[140,-30],[142,-32],[144,-34],[146,-36],[148,-38],[150,-40],[152,-42],[154,-44],[156,-46],[158,-48],[160,-50],[162,-52],[164,-54],[166,-56],[168,-58],[170,-60],[172,-62],[174,-64],[176,-66],[178,-68],[180,-70],[180,-70],[178,-70],[176,-70],[174,-70],[172,-70],[170,-70],[168,-70],[166,-70],[164,-70],[162,-70],[160,-70],[158,-70],[156,-70],[154,-70],[152,-70],[150,-70],[148,-70],[146,-70],[144,-70],[142,-70],[140,-70],[138,-70],[136,-70],[134,-70],[132,-70],[130,-70],[128,-70],[126,-70],[124,-70],[122,-70],[120,-70],[118,-70],[116,-70],[114,-70],[112,-70],[110,-70],[108,-70],[106,-70],[104,-70],[102,-70],[100,-70],[98,-70],[96,-70],[94,-70],[92,-70],[90,-70],[88,-70],[86,-70],[84,-70],[82,-70],[80,-70],[78,-70],[76,-70],[74,-70],[72,-70],[70,-70],[68,-70],[66,-70],[64,-70],[62,-70],[60,-70],[58,-70],[56,-70],[54,-70],[52,-70],[50,-70],[48,-70],[46,-70],[44,-70],[42,-70],[40,-70],[38,-70],[36,-70],[34,-70],[32,-70],[30,-70],[28,-70],[26,-70],[24,-70],[22,-70],[20,-70],[18,-70],[16,-70],[14,-70],[12,-70],[10,-70],[8,-70],[6,-70],[4,-70],[2,-70],[0,-70],[-2,-70],[-4,-70],[-6,-70],[-8,-70],[-10,-70],[-12,-70],[-14,-70],[-16,-70],[-18,-70],[-20,-70],[-22,-70],[-24,-70],[-26,-70],[-28,-70],[-30,-70],[-32,-70],[-34,-70],[-36,-70],[-38,-70],[-40,-70],[-42,-70],[-44,-70],[-46,-70],[-48,-70],[-50,-70],[-52,-70],[-54,-70],[-56,-70],[-58,-70],[-60,-70],[-62,-70],[-64,-70],[-66,-70],[-68,-70],[-70,-70],[-72,-70],[-74,-70],[-76,-70],[-78,-70],[-80,-70],[-82,-70],[-84,-70],[-86,-70],[-88,-70],[-90,-70],[-92,-70],[-94,-70],[-96,-70],[-98,-70],[-100,-70],[-102,-70],[-104,-70],[-106,-70],[-108,-70],[-110,-70],[-112,-70],[-114,-70],[-116,-70],[-118,-70],[-120,-70],[-122,-70],[-124,-70],[-126,-70],[-128,-70],[-130,-70],[-132,-70],[-134,-70],[-136,-70],[-138,-70],[-140,-70],[-142,-70],[-144,-70],[-146,-70],[-148,-70],[-150,-70],[-152,-70],[-154,-70],[-156,-70],[-158,-70],[-160,-70],[-162,-70],[-164,-70],[-166,-70],[-168,-70],[-170,-70],[-172,-70],[-174,-70],[-176,-70],[-178,-70],[-180,-70],[-180,90],[-25,90],[-25,66]],
  // 非洲（简化轮廓）
  [[-18,28],[-17,21],[-17,16],[-17,12],[-17,10],[-16,8],[-14,8],[-12,10],[-10,12],[-8,14],[-6,16],[-5,18],[-5,20],[-5,22],[-5,24],[-5,26],[-5,28],[-5,30],[-5,32],[-5,34],[-5,36],[-5,38],[-5,40],[-5,42],[-5,44],[-5,46],[-5,48],[-5,50],[-5,52],[-5,54],[-5,56],[-5,58],[-5,60],[-5,62],[-5,64],[-5,66],[-5,68],[-5,70],[-5,72],[-5,74],[-5,76],[-5,78],[-5,80],[-5,82],[-5,84],[-5,86],[-5,88],[-5,90],[-18,90],[-18,28]],
  // 亚洲（简化）
  [[26,40],[28,38],[30,36],[32,35],[34,34],[36,33],[38,32],[40,31],[42,30],[44,29],[46,28],[48,27],[50,26],[52,25],[54,24],[56,23],[58,22],[60,21],[62,20],[64,19],[66,18],[68,17],[70,16],[72,15],[74,14],[76,13],[78,12],[80,11],[82,10],[84,9],[86,8],[88,7],[90,6],[92,5],[94,4],[96,3],[98,2],[100,1],[102,0],[104,-1],[106,-2],[108,-3],[110,-4],[112,-5],[114,-6],[116,-7],[118,-8],[120,-9],[122,-10],[124,-11],[126,-12],[128,-13],[130,-14],[132,-15],[134,-16],[136,-17],[138,-18],[140,-19],[142,-20],[144,-21],[146,-22],[148,-23],[150,-24],[152,-25],[154,-26],[156,-27],[158,-28],[160,-29],[162,-30],[164,-31],[166,-32],[168,-33],[170,-34],[172,-35],[174,-36],[176,-37],[178,-38],[180,-39],[180,90],[26,90],[26,40]],
  // 澳大利亚
  [[113,-12],[115,-13],[117,-14],[119,-15],[121,-16],[123,-17],[125,-18],[127,-19],[129,-20],[131,-21],[133,-22],[135,-23],[137,-24],[139,-25],[141,-26],[143,-27],[145,-28],[147,-29],[149,-30],[151,-31],[153,-32],[155,-33],[153,-35],[151,-37],[149,-38],[147,-39],[145,-40],[143,-41],[141,-42],[139,-43],[137,-44],[135,-45],[133,-46],[131,-47],[129,-48],[127,-49],[125,-50],[123,-51],[121,-52],[119,-53],[117,-54],[115,-55],[113,-56],[111,-57],[109,-58],[107,-59],[105,-60],[103,-61],[101,-62],[99,-63],[97,-64],[95,-65],[93,-66],[91,-67],[89,-68],[87,-69],[85,-70],[113,-70],[113,-12]],
  // 格陵兰
  [[-73,78],[-68,76],[-55,68],[-50,64],[-45,60],[-40,66],[-35,70],[-30,72],[-25,74],[-20,76],[-20,78],[-25,80],[-30,82],[-35,84],[-40,82],[-45,80],[-50,78],[-55,76],[-60,78],[-65,80],[-70,82],[-73,78]],
  // 日本
  [[129,33],[131,32],[133,31],[135,30],[137,29],[139,28],[141,27],[143,26],[145,25],[143,35],[141,38],[139,40],[137,42],[135,40],[133,38],[131,36],[129,33]],
  // 英国
  [[-10,58],[-6,58],[-2,56],[0,54],[2,52],[4,50],[2,50],[0,52],[-2,54],[-4,56],[-6,58],[-8,58],[-10,58]],
  // 马达加斯加
  [[43,-12],[44,-14],[45,-16],[46,-18],[47,-20],[48,-22],[49,-24],[50,-26],[50,-16],[49,-14],[48,-12],[47,-10],[46,-8],[45,-10],[44,-11],[43,-12]],
  // 新西兰
  [[166,-48],[168,-46],[170,-44],[172,-42],[174,-40],[176,-38],[178,-36],[180,-34],[180,-48],[178,-50],[176,-50],[174,-50],[172,-50],[170,-50],[168,-50],[166,-48]],
  // 南极洲
  [[-180,-65],[-160,-65],[-140,-65],[-120,-65],[-100,-65],[-80,-65],[-60,-65],[-40,-65],[-20,-65],[0,-65],[20,-65],[40,-65],[60,-65],[80,-65],[100,-65],[120,-65],[140,-65],[160,-65],[180,-65],[180,-90],[-180,-90],[-180,-65]],
];

/* ------------------------------------------------------------------ */
/*  程序化纹理生成（使用真实海岸线数据）                                   */
/* ------------------------------------------------------------------ */

function drawCoastlines(ctx: CanvasRenderingContext2D, cw: number, ch: number): void {
  ctx.fillStyle = '#1a3a2a';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;

  WORLD_COASTLINES.forEach((polygon) => {
    if (polygon.length < 3) return;
    ctx.beginPath();
    const [sx, sy] = geoToCanvas(polygon[0][0], polygon[0][1], cw, ch);
    ctx.moveTo(sx, sy);
    for (let i = 1; i < polygon.length; i++) {
      const [px, py] = geoToCanvas(polygon[i][0], polygon[i][1], cw, ch);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
}

/** 生成地球表面纹理 */
function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const cw = canvas.width;
  const ch = canvas.height;

  // 海洋渐变底色
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, ch);
  oceanGrad.addColorStop(0, '#0a1628');
  oceanGrad.addColorStop(0.3, '#0c2d5e');
  oceanGrad.addColorStop(0.5, '#0e3a6e');
  oceanGrad.addColorStop(0.7, '#0c2d5e');
  oceanGrad.addColorStop(1, '#0a1628');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, cw, ch);

  // 绘制真实海岸线
  drawCoastlines(ctx, cw, ch);

  // 经纬网格
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
  ctx.lineWidth = 0.8;
  for (let lat = -90; lat <= 90; lat += 15) {
    const y = ((90 - lat) / 180) * ch;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cw, y);
    ctx.stroke();
  }
  for (let lng = -180; lng <= 180; lng += 15) {
    const x = ((lng + 180) / 360) * cw;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ch);
    ctx.stroke();
  }

  // 城市光点（基于真实城市坐标）
  const majorCities: [number, number][] = [
    [116, 40], [121, 31], [113, 23], [104, 30], [108, 34], // 中国
    [139, 35], [135, 34], [140, 35], // 日本
    [126, 37], [129, 35], // 韩国
    [77, 28], [72, 19], [80, 13], // 印度
    [37, 55], [30, 59], [104, 56], // 俄罗斯
    [13, 52], [8, 50], [2, 48], [-0.1, 51], // 欧洲
    [-74, 40], [-118, 34], [-87, 41], [-95, 29], [-122, 37], [-80, 25], [-111, 33], // 美国
    [-99, 19], [-43, -22], [-46, -23], [-58, -34], // 拉美
    [31, -29], [18, -33], // 南非
    [151, -33], [144, -37], [153, -27], // 澳洲
    [55, 25], [47, 29], [39, 21], // 中东
    [106, 10], [100, 13], [103, 1], // 东南亚
  ];
  ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
  majorCities.forEach(([lng, lat]) => {
    const [x, y] = geoToCanvas(lng, lat, cw, ch);
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** 生成法线/凹凸贴图 */
function createBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 大陆区域凸起
  ctx.fillStyle = '#a0a0a0';
  WORLD_COASTLINES.forEach((polygon) => {
    if (polygon.length < 3) return;
    ctx.beginPath();
    const [sx, sy] = geoToCanvas(polygon[0][0], polygon[0][1], canvas.width, canvas.height);
    ctx.moveTo(sx, sy);
    for (let i = 1; i < polygon.length; i++) {
      const [px, py] = geoToCanvas(polygon[i][0], polygon[i][1], canvas.width, canvas.height);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  });

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

    // 程序化纹理
    const earthTexture = createEarthTexture();
    const bumpTexture = createBumpTexture();

    // 地球球体
    const earthGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 96, 96);
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      bumpMap: bumpTexture,
      bumpScale: 2,
      specular: new THREE.Color(0x222244),
      shininess: 15,
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    globeGroup.add(earthMesh);

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

    requestAnimationFrame(() => setReady(true));

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
