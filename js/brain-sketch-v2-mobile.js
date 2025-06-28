// 🧠 BRAIN SKETCH V2 - VERSION MOBILE OPTIMISÉE
// Version spécialement adaptée pour les appareils mobiles tactiles

// === VARIABLES PRINCIPALES MOBILE ===
let img;
let particles = [];
let validPixels = [];
let hotZones = [];
const NUM_PARTICLES = 300; // 📱 FIXE : Nombre constant pour mobile
let canvasContainer;

// Système de vagues de flou
let nextBlurWave = 0;

// Variables audio simplifiées mais fonctionnelles
let audioEnabled = false;
let audioContext;
let gainNode;

// 🚀 OPTIMISATION DOM : Throttling des mises à jour de stats
let lastStatsUpdate = 0;
const STATS_UPDATE_INTERVAL = 20; // Plus lent sur mobile pour économiser

// 👆 GESTION TACTILE MOBILE
let currentTouch = { x: 0, y: 0, active: false };
let touchTrail = []; // Trail des dernières positions tactiles
const TOUCH_TRAIL_LENGTH = 10;

// 🚀 OPTIMISATION PHASE 1 : Variables de cache pour performance
let imgOffsetX = 0,
  imgOffsetY = 0; // Translation calculée une fois
let validPixelsCount = 0,
  hotZonesCount = 0; // Longueurs cachées
let particlesCount = 0; // Cache particles.length
let mouseWorldX = 0,
  mouseWorldY = 0; // Position souris dans le monde
let reusableMousePixel = { x: 0, y: 0 }; // Objet réutilisable
let depthSortNeeded = false; // Flag tri conditionnel

// Pool de sélections aléatoires pré-calculées
let randomPixelPool = [];
let randomParticlePool = [];
let poolIndex = 0;
const POOL_SIZE = 10;

const colorPalette = [
  [255, 255, 255], // White
  [0, 180, 255], // Electric Blue
  [0, 255, 255], // Cyan
  [150, 220, 255], // Light Blue
];

// 🚀 FONCTIONS UTILITAIRES OPTIMISÉES
function updatePerformanceCache() {
  // Mise à jour une fois par frame des calculs coûteux
  imgOffsetX = (width - img.width) / 2;
  imgOffsetY = (height - img.height) / 2;
  validPixelsCount = validPixels.length;
  hotZonesCount = hotZones.length;
  particlesCount = particles.length;

  // 📱 MOBILE : Utiliser touch au lieu de mouse si disponible
  if (currentTouch.active) {
    mouseWorldX = currentTouch.x - imgOffsetX;
    mouseWorldY = currentTouch.y - imgOffsetY;
  } else {
    mouseWorldX = mouseX - imgOffsetX;
    mouseWorldY = mouseY - imgOffsetY;
  }

  // Mise à jour objet réutilisable
  reusableMousePixel.x = mouseWorldX;
  reusableMousePixel.y = mouseWorldY;
}

function generateRandomPools() {
  // Générer pools de sélections aléatoires pré-calculées
  randomPixelPool = [];
  randomParticlePool = [];

  for (let i = 0; i < POOL_SIZE; i++) {
    if (validPixelsCount > 0) {
      randomPixelPool[i] = Math.floor(Math.random() * validPixelsCount);
    }
    if (particlesCount > 0) {
      randomParticlePool[i] = Math.floor(Math.random() * particlesCount);
    }
  }
  poolIndex = 0;
}

function getRandomPixel() {
  // Sélection optimisée depuis le pool pré-calculé
  if (randomPixelPool.length === 0 || validPixelsCount === 0) return null;

  if (poolIndex >= randomPixelPool.length) {
    generateRandomPools(); // Régénérer si nécessaire
  }

  const index = randomPixelPool[poolIndex++];
  return validPixels[index] || null;
}

function getRandomParticle() {
  // Sélection optimisée depuis le pool pré-calculé
  if (randomParticlePool.length === 0 || particlesCount === 0) return null;

  if (poolIndex >= randomParticlePool.length) {
    generateRandomPools(); // Régénérer si nécessaire
  }

  const index = randomParticlePool[poolIndex++];
  return particles[index] || null;
}

// === FONCTIONS CORE ===
function preload() {
  img = loadImage("https://iili.io/FTkLiuV.webp");
}

function setup() {
  canvasContainer = select("#canvas-container");

  // 📱 CANVAS MOBILE : Plein écran optimisé
  const containerWidth = Math.max(canvasContainer.width, 320);
  const containerHeight = Math.max(canvasContainer.height, 480);

  let cnv = createCanvas(containerWidth, containerHeight);
  cnv.parent("canvas-container");

  // 📱 OPTIMISATIONS MOBILE CRITIQUES
  pixelDensity(1); // Force 1x pour performance

  // 📱 IMAGE OPTIMISÉE POUR MOBILE
  img.resize(img.width * 1.0, 0); // Taille légèrement augmentée pour mobile

  // 📱 Échantillonnage optimisé pour 500 particules
  img.loadPixels();
  const sampleSize = NUM_PARTICLES * 4; // Plus d'échantillons pour 500 particules

  for (let i = 0; i < sampleSize; i++) {
    let x = floor(random(img.width));
    let y = floor(random(img.height));
    let index = (x + y * img.width) * 4;
    let a = img.pixels[index + 3];

    if (a > 128) {
      validPixels.push({ x: x, y: y });
    }
  }

  // Fallback si pas assez de pixels
  if (validPixels.length < NUM_PARTICLES) {
    validPixels = [];
    for (let i = 0; i < NUM_PARTICLES * 2; i++) {
      validPixels.push({
        x: random(img.width),
        y: random(img.height),
      });
    }
  }

  // Créer les particules initiales
  for (let i = 0; i < NUM_PARTICLES; i++) {
    let randomPixel = random(validPixels);
    if (randomPixel) {
      particles.push(new Particle(randomPixel.x, randomPixel.y));
    }
  }

  // 📱 FRAME RATE MOBILE OPTIMISÉ
  frameRate(25); // Équilibre performance/fluidité pour mobile

  // 🚀 INITIALISATION DU CACHE DE PERFORMANCE
  updatePerformanceCache();
  generateRandomPools();

  // Initialiser l'audio simplifié
  initAudio();

  console.log(
    "📱 Brain Mobile initialisé avec",
    particles.length,
    "neurones fixes"
  );
}

function draw() {
  // 🚀 MISE À JOUR DU CACHE DE PERFORMANCE (une fois par frame)
  updatePerformanceCache();

  background("#0a0a0a");
  translate(imgOffsetX, imgOffsetY); // Utilise le cache au lieu de recalculer

  // 📱 MOBILE : Création automatique RÉDUITE - Plus espacée dans le temps
  if (frameCount % 90 === 0 && validPixelsCount > 0 && hotZonesCount < 6) {
    const randomPixel = getRandomPixel(); // Utilise pool optimisé
    if (randomPixel) {
      hotZones.push(new SimpleHotZone(randomPixel.x, randomPixel.y));
      hotZonesCount++; // Mise à jour cache locale
    }
  }

  // 📱 MOBILE : Zones aléatoires TRÈS RÉDUITES - Moins fréquentes
  if (random() < 0.004 && validPixelsCount > 0 && hotZonesCount < 6) {
    const randomPixel = getRandomPixel(); // Utilise pool optimisé
    if (randomPixel) {
      hotZones.push(new SimpleHotZone(randomPixel.x, randomPixel.y));
      hotZonesCount++; // Mise à jour cache locale
    }
  }

  // 📱 ZONES TACTILES : Contrôlées et limitées
  if (
    currentTouch.active &&
    currentTouch.y > 120 &&
    validPixelsCount > 0 &&
    hotZonesCount < 6 &&
    frameCount % 20 === 0 // Seulement toutes les 20 frames pour éviter spam
  ) {
    if (
      reusableMousePixel.x >= 0 &&
      reusableMousePixel.x < img.width &&
      reusableMousePixel.y >= 0 &&
      reusableMousePixel.y < img.height
    ) {
      hotZones.push(
        new SimpleHotZone(reusableMousePixel.x, reusableMousePixel.y)
      );
      hotZonesCount++; // Mise à jour cache locale
    }
  }

  // Mise à jour des zones (avec cache local)
  for (let i = hotZonesCount - 1; i >= 0; i--) {
    hotZones[i].update();
    if (hotZones[i].isDead()) {
      hotZones.splice(i, 1);
      hotZonesCount--; // Mise à jour cache locale
    }
  }

  // 📱 MOBILE : Limite des zones RÉDUITE (avec cache)
  if (hotZonesCount > 6) {
    const toRemove = hotZonesCount - 6;
    hotZones.splice(0, toRemove);
    hotZonesCount = 6; // Mise à jour cache
  }

  // 📱 MOBILE : PAS DE VAGUES DE FLOU - Expérience nette et claire
  // Flou désactivé sur mobile pour une meilleure lisibilité

  // 📱 MOBILE : Effets shimmer RÉDUITS pour expérience calme (utilise pool optimisé)
  if (random(1) < 0.05) {
    // Réduit pour mobile : moins fréquent
    let p = getRandomParticle(); // Pool optimisé
    if (p) p.shine();
  }

  // 📱 MOBILE : Shimmer en cascade TRÈS RARE (utilise pool optimisé)
  if (random(1) < 0.01) {
    // Encore plus rare pour mobile
    for (let i = 0; i < 2; i++) {
      // Seulement 2 particules pour être plus discret
      let p = getRandomParticle(); // Pool optimisé
      if (p) {
        setTimeout(() => p.shine(), i * 80); // Plus espacé dans le temps
      }
    }
  }

  // 🚀 TRI CONDITIONNEL : Seulement si nouvelles particules ajoutées
  if (depthSortNeeded) {
    particles.sort((a, b) => a.depth - b.depth);
    depthSortNeeded = false;
  }

  // Régénérer pools périodiquement pour maintenir la randomisation
  if (frameCount % 120 === 0) {
    generateRandomPools();
  }

  for (let p of particles) {
    p.update();
    p.show();
  }

  let activityLevel = connectParticles();
  updateAudio(activityLevel);
  displayMobileInfo();
}

// === SYSTÈME DE CONNEXIONS ULTRA-OPTIMISÉ ===
function connectParticles() {
  const threshold = 40; // 📱 MOBILE : Distance réduite pour plus de connexions
  const thresholdSquared = threshold * threshold; // 🚀 Éviter sqrt dans la boucle
  let activityLevel = 0;
  const maxConnections = min(particlesCount * 7, 1800); // 📱 MOBILE : Plus de connexions pour réseau dense
  let connectionCount = 0;

  // 🚀 OPTIMISATION MAJEURE : Regrouper les lignes par style pour éviter stroke() répétés
  const normalConnections = [];
  const activeConnections = [];
  const electricConnections = [];

  for (let i = 0; i < particlesCount && connectionCount < maxConnections; i++) {
    let particleConnections = 0;
    const maxPerParticle = 7; // 📱 MOBILE : Plus de connexions par particule pour réseau dense

    for (
      let j = i + 1;
      j < particlesCount && particleConnections < maxPerParticle;
      j++
    ) {
      const p1 = particles[i];
      const p2 = particles[j];

      // 🚀 OPTIMISATION : Comparaison distance au carré (évite sqrt)
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const distSquared = dx * dx + dy * dy;

      if (distSquared > 0 && distSquared < thresholdSquared) {
        const d = Math.sqrt(distSquared); // Calculer sqrt seulement si nécessaire
        let maxAlpha = 60;

        const inZone = isParticleActive(p1) || isParticleActive(p2);
        if (inZone) {
          maxAlpha = 220;
          activityLevel++;
        }

        const avgDepth = (p1.depth + p2.depth) / 2;
        const depthAlphaModifier = map(avgDepth, 0, 1, 0.4, 1.2);
        const alpha = map(d, 0, threshold, maxAlpha * depthAlphaModifier, 0);
        const strokeWidth = map(avgDepth, 0, 1, 0.4, 1.8);

        // 🚀 OPTIMISATION : Regrouper par type de connexion au lieu de dessiner immédiatement
        const connectionData = { p1, p2, alpha, strokeWidth };

        if (inZone && random(1) < 0.4) {
          // Connexions électriques actives
          electricConnections.push(connectionData);
        } else if (inZone) {
          // Connexions actives normales
          activeConnections.push(connectionData);
        } else {
          // Connexions normales
          normalConnections.push(connectionData);
        }

        particleConnections++;
        connectionCount++;
      }
    }
  }

  // 📱 MOBILE : Toutes les connexions en bleu électrique
  drawConnectionGroup(normalConnections, [0, 150, 255], 1.0); // Bleu électrique
  drawConnectionGroup(activeConnections, [0, 150, 255], 1.2); // Bleu électrique plus intense
  drawConnectionGroup(electricConnections, [0, 150, 255], 1.5); // Bleu électrique très intense

  return activityLevel;
}

// 📱 MOBILE : Fonction optimisée avec bleu électrique simple
function drawConnectionGroup(connections, baseColor, intensityMultiplier) {
  if (connections.length === 0) return;

  for (const conn of connections) {
    const finalAlpha = min(conn.alpha * intensityMultiplier, 255);
    stroke(baseColor[0], baseColor[1], baseColor[2], finalAlpha);
    strokeWeight(conn.strokeWidth * intensityMultiplier);
    line(conn.p1.x, conn.p1.y, conn.p2.x, conn.p2.y);
  }
}

// 📱 FONCTION OPTIMISÉE MOBILE : Détection de particules actives avec tactile
function isParticleActive(particle) {
  // 📱 Utiliser currentTouch SEULEMENT si actif ET dans l'écran
  if (currentTouch.active && currentTouch.x > 0 && currentTouch.y > 0) {
    const touchDistance = dist(
      particle.x,
      particle.y,
      mouseWorldX,
      mouseWorldY
    );
    if (touchDistance < 35) return true; // 📱 Zone tactile ultra-réduite
  }

  // 📱 Vérifier le trail tactile SEULEMENT s'il y a des positions valides
  for (let touchPos of touchTrail) {
    if (touchPos.x > 0 && touchPos.y > 0) {
      // Position valide
      const trailDistance = dist(
        particle.x,
        particle.y,
        touchPos.x - imgOffsetX,
        touchPos.y - imgOffsetY
      );
      if (trailDistance < 25) return true; // 📱 Trail tactile ultra-réduit
    }
  }

  // Zones chaudes
  for (let i = 0; i < hotZonesCount; i++) {
    const zone = hotZones[i];
    if (dist(particle.x, particle.y, zone.x, zone.y) < zone.radius) {
      return true;
    }
  }

  return false;
}

// === AFFICHAGE INFO MOBILE ===
function displayMobileInfo() {
  // 📱 Throttling stats pour mobile
  if (frameCount - lastStatsUpdate >= STATS_UPDATE_INTERVAL) {
    const statsElement = document.getElementById("dynamic-stats");

    if (statsElement) {
      const zones = hotZones.length;

      let statsHTML = `${NUM_PARTICLES} neurons (fixed)`;
      statsHTML += `<br>Touch precisely to activate`;
      statsHTML += `<br>🔵 ${zones}/6 zones (blue)`;
      statsHTML += `<br><span style="color: #0096ff; font-size: 0.8em;">📱 Mobile v2 - Blue Electric</span>`;

      statsElement.innerHTML = statsHTML;
    }
    lastStatsUpdate = frameCount;
  }

  // 📱 BOUTON AUDIO MOBILE EN HAUT À GAUCHE
  resetMatrix();
  const buttonX = 35; // Coin gauche
  const buttonY = 35; // Coin haut
  const buttonSize = 32; // Taille légèrement plus visible

  // 📱 Style bouton audio élégant en haut à gauche
  noStroke();
  fill(0, 0, 0, 140);
  ellipse(buttonX, buttonY, buttonSize, buttonSize);

  stroke(150, 150, 150, 200);
  strokeWeight(2);
  noFill();
  ellipse(buttonX, buttonY, buttonSize, buttonSize);

  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16); // Taille légèrement plus visible

  if (audioEnabled) {
    fill(255, 255, 255, 255);
    text("♪", buttonX, buttonY - 2);
  } else {
    fill(150, 150, 150, 220);
    text("♪", buttonX, buttonY - 2);
    stroke(150, 150, 150, 200);
    strokeWeight(2);
    line(buttonX - 9, buttonY - 9, buttonX + 9, buttonY + 9);
  }

  // 📱 PAS D'INSTRUCTIONS SUR MOBILE - Expérience pure et immersive
}

// === CLASSES ===
class SimpleHotZone {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = random(80, 140);
    this.speed = random(1.5, 3);
    this.life = 240;
  }

  update() {
    this.radius += this.speed;
    this.life--;
  }

  isDead() {
    return this.life <= 0 || this.radius > this.maxRadius;
  }
}

class Particle {
  constructor(x, y) {
    this.targetX = x;
    this.targetY = y;
    this.x = this.targetX + random(-2, 2);
    this.y = this.targetY + random(-2, 2);
    this.vx = 0;
    this.vy = 0;

    // Distribution équilibrée des profondeurs
    const depthRandom = random();
    if (depthRandom < 0.3) {
      this.depth = random(0.7, 1); // 30% grandes
    } else if (depthRandom < 0.6) {
      this.depth = random(0.4, 0.7); // 30% moyennes
    } else {
      this.depth = random(0, 0.4); // 40% petites
    }

    const grayValue = map(this.depth, 0, 1, 200, 60);
    const alpha = map(this.depth, 0, 1, 120, 220);
    this.color = color(grayValue, grayValue, grayValue, alpha);
    this.baseSize = map(this.depth, 0, 1, 2.5, 7);

    this.noiseOffsetX = random(1000);
    this.noiseOffsetY = random(1000);
    this.shimmer = 0;

    // 📱 MOBILE : Pas de système de flou pour une expérience nette
  }

  update() {
    // 🚀 RÉPULSION SOURIS ULTRA-OPTIMISÉE : Effet plus subtil et agréable
    const dx = this.x - mouseWorldX;
    const dy = this.y - mouseWorldY;
    const distSquared = dx * dx + dy * dy;

    if (distSquared < 625) {
      // 25*25, zone d'influence tactile ultra-réduite pour mobile
      const d = Math.sqrt(distSquared);
      const force = 8 / d; // 📱 Force douce pour mobile
      this.x += dx * force * 0.25; // 📱 Facteur d'atténuation mobile
      this.y += dy * force * 0.25;
    }

    // 📱 Mouvement Perlin noise adapté pour 25 FPS mobile - ULTRA-CALME
    const noiseSpeed = 0.006; // Encore plus lent pour mobile
    const noiseMagnitude = 0.06; // Encore plus subtil pour mobile
    let noiseX = noise(this.noiseOffsetX + frameCount * noiseSpeed);
    let noiseY = noise(this.noiseOffsetY + frameCount * noiseSpeed);
    this.vx += map(noiseX, 0, 1, -noiseMagnitude, noiseMagnitude);
    this.vy += map(noiseY, 0, 1, -noiseMagnitude, noiseMagnitude);

    // 📱 Force de retour adaptée pour 25 FPS mobile
    this.vx += (this.targetX - this.x) * 0.003; // Encore plus lent pour mobile
    this.vy += (this.targetY - this.y) * 0.003;

    // 📱 Amortissement adapté pour 25 FPS mobile
    this.vx *= 0.94; // Plus d'amortissement pour mobile
    this.vy *= 0.94;

    this.x += this.vx;
    this.y += this.vy;

    // 📱 MOBILE : Fade shimmer simple sans flou
    this.shimmer *= 0.92; // Changé de 0.88 à 0.92 pour durer plus longtemps
  }

  shine() {
    this.shimmer = 1.2;
  }

  show() {
    noStroke();

    // 📱 MOBILE : Rendu simple et net SANS FLOU
    const shimmerColor = color(255, 255, 255, 255);
    let finalColor = lerpColor(this.color, shimmerColor, this.shimmer / 3); // Intensité ÷3
    let size = this.baseSize + (this.shimmer / 2) * (this.baseSize * 2); // Taille shimmer ÷3

    // 📱 MOBILE : Pas de flou - Rendu direct pour une expérience nette
    fill(finalColor);
    ellipse(this.x, this.y, size, size);
  }
}

// === FONCTIONS INTERACTIVES MOBILE ===
// 📱 MOBILE : Pas de triggerBlurWave - Flou désactivé pour une expérience nette

// 📱 FONCTIONS SUPPRIMÉES POUR MOBILE : addParticles, removeParticles, resetParticles, clearAllParticles
// Mobile utilise un nombre fixe de 500 neurones - pas d'ajout/suppression dynamique

// === ÉVÉNEMENTS ===
function windowResized() {
  if (canvasContainer) {
    resizeCanvas(canvasContainer.width, canvasContainer.height);
  }
}

// === SYSTÈME AUDIO SOPHISTIQUÉ (V1) ===
function initAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.connect(audioContext.destination);
  } catch (e) {
    console.error(e);
  }
}

function updateAudio(activityLevel) {
  if (!audioEnabled || !audioContext) return;

  const now = audioContext.currentTime;

  // Pure electrical discharge sounds based on activity
  if (activityLevel > 0) {
    // Electrical sparks - short, sharp, random
    if (Math.random() < activityLevel / 150) {
      createElectricalSpark(now);
    }

    // Crackling static during activity
    if (Math.random() < activityLevel / 200) {
      createStaticCrackle(now);
    }
  }

  // Subtle electrical hum (very quiet background)
  if (Math.random() < 0.1) {
    createElectricalHum(now, activityLevel);
  }
}

function createElectricalSpark(startTime) {
  if (!audioContext || !gainNode) return;

  const duration = 0.01 + Math.random() * 0.02;
  const bufferSize = Math.floor(audioContext.sampleRate * duration);
  const buffer = audioContext.createBuffer(
    1,
    bufferSize,
    audioContext.sampleRate
  );
  const data = buffer.getChannelData(0);

  // Generate electrical noise - sharp, crackling
  for (let i = 0; i < bufferSize; i++) {
    const spike = Math.random() < 0.1 ? (Math.random() - 0.5) * 4 : 0;
    const base = (Math.random() - 0.5) * 0.3;
    data[i] = spike + base;
    if (i > 0) {
      data[i] += data[i - 1] * 0.1;
    }
  }

  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  source.buffer = buffer;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.setTargetAtTime(0.4, startTime, 0.001);
  gain.gain.setTargetAtTime(0, startTime + duration * 0.3, 0.005);

  filter.type = "highpass";
  filter.frequency.setValueAtTime(1000 + Math.random() * 2000, startTime);
  filter.Q.setValueAtTime(0.5, startTime);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(gainNode);
  source.start(startTime);
}

function createStaticCrackle(startTime) {
  if (!audioContext || !gainNode) return;

  const duration = 0.05 + Math.random() * 0.1;
  const bufferSize = Math.floor(audioContext.sampleRate * duration);
  const buffer = audioContext.createBuffer(
    1,
    bufferSize,
    audioContext.sampleRate
  );
  const data = buffer.getChannelData(0);

  let energy = 1.0;
  for (let i = 0; i < bufferSize; i++) {
    energy *= 0.9999;
    const pop = Math.random() < 0.02 ? (Math.random() - 0.5) * 2 : 0;
    const crackle = (Math.random() - 0.5) * energy * 0.5;
    data[i] = pop + crackle;
    if (i > 2) {
      data[i] += (data[i - 1] - data[i - 2]) * 0.2;
    }
  }

  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  source.buffer = buffer;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.setTargetAtTime(0.2, startTime, 0.01);
  gain.gain.setTargetAtTime(0, startTime + duration * 0.7, 0.02);

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(800 + Math.random() * 1500, startTime);
  filter.Q.setValueAtTime(2, startTime);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(gainNode);
  source.start(startTime);
}

function createElectricalHum(startTime, activityLevel = 0) {
  if (!audioContext || !gainNode) return;

  const duration = 0.3 + Math.random() * 0.2;
  const bufferSize = Math.floor(audioContext.sampleRate * duration);
  const buffer = audioContext.createBuffer(
    1,
    bufferSize,
    audioContext.sampleRate
  );
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const t = i / audioContext.sampleRate;
    const fundamental = Math.sin(2 * Math.PI * 50 * t) * 0.1;
    const harmonic = Math.sin(2 * Math.PI * 100 * t) * 0.05;
    const noise = (Math.random() - 0.5) * 0.02;
    data[i] = fundamental + harmonic + noise;
  }

  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  source.buffer = buffer;
  const volume = 0.03 + activityLevel * 0.0001;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.setTargetAtTime(volume, startTime, 0.1);
  gain.gain.setTargetAtTime(0, startTime + duration * 0.8, 0.1);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(200, startTime);
  filter.Q.setValueAtTime(0.5, startTime);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(gainNode);
  source.start(startTime);
}

function startAudio() {
  if (!audioContext || !gainNode) return;

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  gainNode.gain.setTargetAtTime(0.1, audioContext.currentTime, 0.1);
}

function stopAudio() {
  if (!audioContext || !gainNode) return;

  gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.1);
  setTimeout(() => {
    if (audioContext && audioContext.state === "running") {
      audioContext.suspend();
    }
  }, 200);
}

// 📱 GESTION TACTILE AVANCÉE
function touchStarted() {
  currentTouch.active = true;
  currentTouch.x = touches[0].x;
  currentTouch.y = touches[0].y;

  // Ajouter au trail
  touchTrail.unshift({ x: currentTouch.x, y: currentTouch.y });
  if (touchTrail.length > TOUCH_TRAIL_LENGTH) {
    touchTrail.pop();
  }

  // Vérifier si c'est le bouton audio
  handleAudioToggle();

  return false;
}

function touchMoved() {
  if (touches.length > 0) {
    currentTouch.x = touches[0].x;
    currentTouch.y = touches[0].y;

    // Mettre à jour le trail
    touchTrail.unshift({ x: currentTouch.x, y: currentTouch.y });
    if (touchTrail.length > TOUCH_TRAIL_LENGTH) {
      touchTrail.pop();
    }
  }
  return false;
}

function touchEnded() {
  currentTouch.active = false;

  // 📱 CORRECTION CRITIQUE : Vider le trail ET réinitialiser les coordonnées
  touchTrail = [];
  currentTouch.x = -1000; // Position hors écran
  currentTouch.y = -1000;

  return false;
}

// 📱 AUDIO TOGGLE MOBILE - Position haut gauche
function handleAudioToggle() {
  const buttonX = 35; // Nouveau: haut gauche
  const buttonY = 35; // Nouveau: haut gauche
  const buttonRadius = 18; // Zone de clic légèrement plus large

  const distance = dist(currentTouch.x, currentTouch.y, buttonX, buttonY);

  if (distance < buttonRadius) {
    audioEnabled = !audioEnabled;

    if (audioEnabled) {
      startAudio();
    } else {
      stopAudio();
    }

    console.log("📱 Audio:", audioEnabled ? "ON" : "OFF");
  }
}

// Gestion souris pour desktop (fallback)
function mousePressed() {
  currentTouch.active = true;
  currentTouch.x = mouseX;
  currentTouch.y = mouseY;
  handleAudioToggle();
}

function mouseDragged() {
  currentTouch.x = mouseX;
  currentTouch.y = mouseY;
}

function mouseReleased() {
  currentTouch.active = false;
  // 📱 CORRECTION : Réinitialiser aussi pour le fallback souris
  currentTouch.x = -1000;
  currentTouch.y = -1000;
}

// 📱 PAS DE CONTRÔLES CLAVIER SUR MOBILE (désactivés)
function keyPressed() {
  // Désactivé volontairement pour mobile - particules fixes à 500
  console.log("📱 Contrôles clavier désactivés - 500 neurones fixes");
}
