// 3D background: a glowing brass-and-steel ATM floating over a starfield
(() => {
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070b14, 0.045);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0.6, 8);

  scene.add(new THREE.AmbientLight(0x6688aa, 0.6));
  const key = new THREE.PointLight(0xe0a93b, 2.2, 30); key.position.set(4, 4, 5); scene.add(key);
  const rim = new THREE.PointLight(0x4fd1ff, 2.5, 30); rim.position.set(-5, 2, 3); scene.add(rim);

  const atm = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x1b2540, metalness: 0.9, roughness: 0.3 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xe0a93b, metalness: 1, roughness: 0.25, emissive: 0x3a2705 });
  const glow = new THREE.MeshBasicMaterial({ color: 0x4fd1ff });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); atm.add(m); return m; };

  add(new THREE.BoxGeometry(2.4, 4, 1.4), steel, 0, 0, 0);          // body
  add(new THREE.BoxGeometry(2.5, 0.12, 1.5), brass, 0, 2.05, 0);    // top trim
  add(new THREE.BoxGeometry(1.7, 1.1, 0.06), glow, 0, 1.0, 0.72);   // screen
  add(new THREE.BoxGeometry(1.2, 0.9, 0.1), steel, 0, -0.3, 0.75);  // keypad plate
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++)
    add(new THREE.BoxGeometry(0.28, 0.16, 0.08), brass, -0.38 + c * 0.38, -0.05 - r * 0.2, 0.82);
  add(new THREE.BoxGeometry(1.4, 0.22, 0.12), new THREE.MeshBasicMaterial({ color: 0x2f7d4f }), 0, -1.35, 0.74); // cash slot
  atm.position.set(3.4, -0.4, 0); atm.rotation.y = -0.5;
  scene.add(atm);

  // floating coins
  const coins = [];
  const coinGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.05, 28);
  for (let i = 0; i < 28; i++) {
    const m = new THREE.Mesh(coinGeo, brass);
    m.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 10, -Math.random() * 8);
    m.rotation.x = Math.random() * 3; m.userData = { s: 0.3 + Math.random(), y0: m.position.y };
    coins.push(m); scene.add(m);
  }
  // star particles
  const pts = new Float32Array(900 * 3).map(() => (Math.random() - 0.5) * 40);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x4fd1ff, size: 0.05 })); scene.add(stars);

  let mx = 0, my = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  const clock = new THREE.Clock();
  (function loop() {
    const t = clock.getElapsedTime();
    atm.rotation.y += ((-0.5 + mx * 0.9) - atm.rotation.y) * 0.05;
    atm.rotation.x += ((my * 0.3) - atm.rotation.x) * 0.05;
    atm.position.y = -0.4 + Math.sin(t) * 0.12;
    coins.forEach(c => { c.rotation.x += 0.01 * c.userData.s; c.rotation.y += 0.02 * c.userData.s; c.position.y = c.userData.y0 + Math.sin(t * c.userData.s) * 0.4; });
    stars.rotation.y = t * 0.01;
    camera.position.x += (mx * 1.2 - camera.position.x) * 0.03;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();
})();
