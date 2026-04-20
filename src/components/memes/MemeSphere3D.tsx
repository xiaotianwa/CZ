'use client';

/**
 * MemeSphere3D —— 基于 Three.js CSS3DRenderer 的真·3D 卡牌球体
 *
 * 对照参考代码：
 *   - 用 CSS3DObject 把每张卡牌变成 3D 空间中的真实 DOM 元素
 *   - 用 object.lookAt 让卡牌法线朝向球心外侧（贴球面）
 *   - 用 TrackballControls 支持鼠标拖动旋转 + 滚轮缩放
 *   - 初始随机散布 → 用手写 tween 动画过渡到球面目标位置
 *   - 自动缓慢旋转，用户拖动时暂停
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import type { MemeItem } from './MemeSpace';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]!);
}

function formatDate(raw: string): string {
  try {
    return new Date(raw).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function createCardElement(meme: MemeItem): HTMLElement {
  const card = document.createElement('div');
  card.className = 'meme-card-three';
  card.dataset.memeId = meme.id;

  const imageHtml = meme.image
    ? `<div class="mct-thumb"><img src="${escapeHtml(meme.image)}" alt="" loading="lazy" /></div>`
    : '';

  card.innerHTML = `
    ${imageHtml}
    <div class="mct-body">
      <div class="mct-title">${escapeHtml(meme.title)}</div>
      <div class="mct-desc">${escapeHtml(meme.description)}</div>
      <div class="mct-time">${formatDate(meme.createdAt)}</div>
    </div>
  `;
  return card;
}

interface Props {
  memes: MemeItem[];
  onSelect: (id: string) => void;
  /** 缩小到极限时触发回粒子态 */
  onZoomOut?: () => void;
  /** 关闭时是否淡出（外部收缩动画） */
  isReturning?: boolean;
}

export default function MemeSphere3D({ memes, onSelect, onZoomOut, isReturning }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onZoomOutRef = useRef(onZoomOut);
  onZoomOutRef.current = onZoomOut;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || memes.length === 0) return;

    let w = container.clientWidth;
    let h = container.clientHeight;
    const isMobile = w < 768;

    // ─── 场景与相机（移动端缩小距离，增大 FOV）───
    const scene = new THREE.Scene();
    const fov = isMobile ? 65 : 50;
    const camZ = isMobile ? 1600 : 3000;
    const camera = new THREE.PerspectiveCamera(fov, w / h, 1, 10000);
    camera.position.z = camZ;

    // ─── 渲染器（CSS3DRenderer 使用 matrix3d 进行真正的 3D 变换）───
    const renderer = new CSS3DRenderer();
    renderer.setSize(w, h);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    // ─── 球面目标布局（每张卡牌均匀分布在球面上）───
    const sphereRadius = isMobile ? 480 : 800;
    type Target = { pos: THREE.Vector3; rot: THREE.Euler };
    const targets: Target[] = [];
    const count = memes.length;
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const pos = new THREE.Vector3(
        sphereRadius * Math.cos(theta) * Math.sin(phi),
        sphereRadius * Math.sin(theta) * Math.sin(phi),
        sphereRadius * Math.cos(phi),
      );
      // lookAt：让卡牌朝向球心外侧 → 法线贴球面
      const dummy = new THREE.Object3D();
      dummy.position.copy(pos);
      dummy.lookAt(pos.clone().multiplyScalar(2));
      targets.push({ pos: pos.clone(), rot: dummy.rotation.clone() });
    }

    // ─── 创建 CSS3DObject ───
    const objects: CSS3DObject[] = [];
    const startStates: { pos: THREE.Vector3; rot: THREE.Euler }[] = [];

    memes.forEach((meme, i) => {
      const el = createCardElement(meme);
      const obj = new CSS3DObject(el);
      // 初始随机分布（远处散点，用于动画飞入）
      const initRadius = isMobile ? 900 : 1800;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      obj.position.set(
        initRadius * Math.sin(ph) * Math.cos(th),
        initRadius * Math.sin(ph) * Math.sin(th),
        initRadius * Math.cos(ph),
      );
      obj.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      );
      startStates.push({ pos: obj.position.clone(), rot: obj.rotation.clone() });
      scene.add(obj);
      objects.push(obj);
    });

    // ─── 卡牌点击检测 ───
    // TrackballControls 会用 setPointerCapture 拦截 pointer 事件，
    // 所以用 mousedown/mouseup + document.elementFromPoint 做可靠命中检测
    let mouseStart = { x: 0, y: 0, t: 0 };
    const onMouseDown = (e: MouseEvent) => {
      mouseStart = { x: e.clientX, y: e.clientY, t: Date.now() };
    };
    const onMouseUp = (e: MouseEvent) => {
      const dx = e.clientX - mouseStart.x;
      const dy = e.clientY - mouseStart.y;
      const dt = Date.now() - mouseStart.t;
      // 短距离 + 短时间 = 点击（而非拖动旋转）
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 400) {
        // elementFromPoint 在 CSS 3D 变换中比 event.target 更准确
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        const card = hit?.closest?.('.meme-card-three') as HTMLElement | null;
        if (card?.dataset?.memeId) {
          e.stopPropagation();
          e.preventDefault();
          onSelectRef.current(card.dataset.memeId);
        }
      }
    };
    container.addEventListener('mousedown', onMouseDown, true);
    container.addEventListener('mouseup', onMouseUp, true);

    // ─── 触控点击支持（移动端）───
    let touchStart = { x: 0, y: 0, t: 0 };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length !== 1) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.x;
      const dy = touch.clientY - touchStart.y;
      const dt = Date.now() - touchStart.t;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 400) {
        const hit = document.elementFromPoint(touch.clientX, touch.clientY);
        const card = hit?.closest?.('.meme-card-three') as HTMLElement | null;
        if (card?.dataset?.memeId) {
          e.stopPropagation();
          e.preventDefault();
          onSelectRef.current(card.dataset.memeId);
        }
      }
    };
    container.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    container.addEventListener('touchend', onTouchEnd, true);

    // ─── 交互控制 ───
    const controls = new TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = isMobile ? 3.5 : 2.4;
    controls.zoomSpeed = isMobile ? 1.8 : 1.2;
    controls.panSpeed = 0;
    controls.noPan = true;
    controls.minDistance = isMobile ? 300 : 600;
    controls.maxDistance = isMobile ? 2800 : 4800;
    controls.staticMoving = false;
    controls.dynamicDampingFactor = isMobile ? 0.22 : 0.18;

    // ─── 自动旋转（用户拖动时暂停）───
    let userInteracting = false;
    const onUserStart = () => { userInteracting = true; };
    const onUserEnd = () => { userInteracting = false; };
    renderer.domElement.addEventListener('pointerdown', onUserStart);
    renderer.domElement.addEventListener('pointerup', onUserEnd);
    renderer.domElement.addEventListener('pointercancel', onUserEnd);

    // ─── 动画：入场 tween + 持续自动旋转 ───
    const DURATION = 2200;
    const startTime = performance.now();
    const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

    let raf = 0;
    let zoomOutFired = false;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / DURATION);
      const e = easeInOut(t);

      if (t < 1) {
        // 入场动画：随机位置 → 球面目标位置
        for (let i = 0; i < objects.length; i++) {
          const obj = objects[i];
          const s = startStates[i];
          const tg = targets[i];
          obj.position.lerpVectors(s.pos, tg.pos, e);
          obj.rotation.x = s.rot.x + (tg.rot.x - s.rot.x) * e;
          obj.rotation.y = s.rot.y + (tg.rot.y - s.rot.y) * e;
          obj.rotation.z = s.rot.z + (tg.rot.z - s.rot.z) * e;
        }
      }

      // 自动缓慢旋转整个场景（用户不在拖动时）
      if (!userInteracting && t >= 1) {
        scene.rotation.y += 0.0018;
      }

      // 距离透视效果：远处卡牌更淡，近处更亮
      const camDist = camera.position.length();
      objects.forEach((obj) => {
        const worldPos = new THREE.Vector3();
        obj.getWorldPosition(worldPos);
        const dist = camera.position.distanceTo(worldPos);
        const minDist = camDist - sphereRadius * 1.2;
        const maxDist = camDist + sphereRadius * 1.2;
        const norm = Math.max(0, Math.min(1, (dist - minDist) / (maxDist - minDist)));
        const el = obj.element as HTMLElement;
        el.style.opacity = String(Math.max(0.08, 1 - norm * 0.88));
      });

      // 监测缩小到极限：相机距离超过阈值时触发回粒子
      const zoomOutThreshold = isMobile ? 2600 : 4500;
      if (camDist > zoomOutThreshold && onZoomOutRef.current && !zoomOutFired) {
        zoomOutFired = true;
        onZoomOutRef.current();
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // ─── 窗口 resize ───
    const onResize = () => {
      w = container.clientWidth;
      h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      controls.handleResize();
    };
    window.addEventListener('resize', onResize);

    // ─── 清理 ───
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchend', onTouchEnd);
      renderer.domElement.removeEventListener('pointerdown', onUserStart);
      renderer.domElement.removeEventListener('pointerup', onUserEnd);
      renderer.domElement.removeEventListener('pointercancel', onUserEnd);
      controls.dispose();
      // 移除所有卡牌 DOM
      objects.forEach((obj) => {
        scene.remove(obj);
        if (obj.element.parentNode) obj.element.parentNode.removeChild(obj.element);
      });
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [memes]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{
        opacity: isReturning ? 0 : 1,
        transition: 'opacity 500ms ease',
      }}
    />
  );
}
