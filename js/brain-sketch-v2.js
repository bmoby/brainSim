/**
 * @author tsarag
 */

// === VARIABLES PRINCIPALES ===
let img;
let particles = [];
let validPixels = [];
let hotZones = [];
const NUM_PARTICLES = 500;
let canvasContainer;

// Système de vagues de flou
let nextBlurWave = 0;

// Variables audio simplifiées mais fonctionnelles
let audioEnabled = false;
let audioContext;
let gainNode;

// 🚀 OPTIMISATION DOM : Throttling des mises à jour de stats
let lastStatsUpdate = 0;
const STATS_UPDATE_INTERVAL = 16; // Mise à jour toutes les 16 frames (~0.5s à 30 FPS)

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
const POOL_SIZE = 20;

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
  mouseWorldX = mouseX - imgOffsetX;
  mouseWorldY = mouseY - imgOffsetY;

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
  let cnv = createCanvas(canvasContainer.width, canvasContainer.height);
  cnv.parent("canvas-container");

  img.resize(img.width * 2, 0); // Scale up the image

  // Échantillonnage des pixels valides
  img.loadPixels();
  const sampleSize = NUM_PARTICLES * 3;

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

  // 🚀 OPTIMISATION FRAME RATE : Limiter à 30 FPS pour réduire la charge CPU
  frameRate(30);

  // 🚀 INITIALISATION DU CACHE DE PERFORMANCE
  updatePerformanceCache();
  generateRandomPools();

  // Initialiser l'audio simplifié
  initAudio();
}

function draw() {
  // 🚀 MISE À JOUR DU CACHE DE PERFORMANCE (une fois par frame)
  updatePerformanceCache();

  background("#0a0a0a");
  translate(imgOffsetX, imgOffsetY); // Utilise le cache au lieu de recalculer

  // Création automatique de zones d'activité (utilise cache)
  if (frameCount % 45 === 0 && validPixelsCount > 0 && hotZonesCount < 8) {
    const randomPixel = getRandomPixel(); // Utilise pool optimisé
    if (randomPixel) {
      hotZones.push(new SimpleHotZone(randomPixel.x, randomPixel.y));
      hotZonesCount++; // Mise à jour cache locale
    }
  }

  // Zones aléatoires supplémentaires (utilise cache)
  if (random() < 0.008 && validPixelsCount > 0 && hotZonesCount < 8) {
    const randomPixel = getRandomPixel(); // Utilise pool optimisé
    if (randomPixel) {
      hotZones.push(new SimpleHotZone(randomPixel.x, randomPixel.y));
      hotZonesCount++; // Mise à jour cache locale
    }
  }

  // Détection zones souris (utilise objet réutilisable)
  if (mouseIsPressed && validPixelsCount > 0 && hotZonesCount < 8) {
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

  // Limite des zones (avec cache)
  if (hotZonesCount > 8) {
    const toRemove = hotZonesCount - 8;
    hotZones.splice(0, toRemove);
    hotZonesCount = 8; // Mise à jour cache
  }

  // Vagues de flou automatiques
  if (frameCount > nextBlurWave) {
    nextBlurWave = frameCount + random(180, 360);
    triggerBlurWave();
  }

  // Effets shimmer RÉDUITS ÷3 (utilise pool optimisé)
  if (random(1) < 0.083) {
    // Réduit de 0.25 à 0.083 (÷3)
    let p = getRandomParticle(); // Pool optimisé
    if (p) p.shine();
  }

  // Shimmer en cascade RÉDUIT ÷3 (utilise pool optimisé)
  if (random(1) < 0.017) {
    // Réduit de 0.05 à 0.017 (÷3)
    for (let i = 0; i < 3; i++) {
      // Réduit de 5 à 3 particules en cascade
      let p = getRandomParticle(); // Pool optimisé
      if (p) {
        // TODO: Remplacer setTimeout par système unifié
        setTimeout(() => p.shine(), i * 50);
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
  displayInfo();
}

// === SYSTÈME DE CONNEXIONS ULTRA-OPTIMISÉ ===
function connectParticles() {
  const threshold = 50;
  const thresholdSquared = threshold * threshold; // 🚀 Éviter sqrt dans la boucle
  let activityLevel = 0;
  const maxConnections = min(particlesCount * 6, 1500); // 🚀 Réduction légère des connexions
  let connectionCount = 0;

  // 🚀 OPTIMISATION MAJEURE : Regrouper les lignes par style pour éviter stroke() répétés
  const normalConnections = [];
  const activeConnections = [];
  const electricConnections = [];

  for (let i = 0; i < particlesCount && connectionCount < maxConnections; i++) {
    let particleConnections = 0;
    const maxPerParticle = 6; // 🚀 Réduction de 8 à 6 connexions max par particule

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

  // 🚀 OPTIMISATION MAJEURE : Dessiner par groupes avec un seul style par groupe
  drawConnectionGroup(normalConnections, [100, 150, 200], 1.0);
  drawConnectionGroup(activeConnections, [200, 220, 255], 1.2);
  drawConnectionGroup(electricConnections, [255, 255, 255], 1.5);

  return activityLevel;
}

// 🚀 FONCTION OPTIMISÉE : Dessiner un groupe de connexions avec le même style
function drawConnectionGroup(connections, baseColor, intensityMultiplier) {
  if (connections.length === 0) return;

  for (const conn of connections) {
    const finalAlpha = min(conn.alpha * intensityMultiplier, 255);
    stroke(baseColor[0], baseColor[1], baseColor[2], finalAlpha);
    strokeWeight(conn.strokeWidth * intensityMultiplier);
    line(conn.p1.x, conn.p1.y, conn.p2.x, conn.p2.y);
  }
}

// 🚀 FONCTION OPTIMISÉE : Utilise les variables de cache
function isParticleActive(particle) {
  // Utilise les coordonnées pré-calculées au lieu de recalculer
  const mouseDistance = dist(particle.x, particle.y, mouseWorldX, mouseWorldY);

  if (mouseDistance < 70) return true; // Réduit de 100 à 70 pour cohérence avec la répulsion

  // Optimisation: utilise cache de longueur pour éviter .length à chaque itération
  for (let i = 0; i < hotZonesCount; i++) {
    const zone = hotZones[i];
    if (dist(particle.x, particle.y, zone.x, zone.y) < zone.radius) {
      return true;
    }
  }

  return false;
}

// === AFFICHAGE INFO OPTIMISÉ ===
function displayInfo() {
  // 🚀 OPTIMISATION DOM : Throttling des mises à jour de stats pour éviter 60 redraws/s
  if (frameCount - lastStatsUpdate >= STATS_UPDATE_INTERVAL) {
    const statsElement = document.getElementById("dynamic-stats");

    if (statsElement) {
      const zones = hotZones.length;

      let statsHTML = `${particles.length} neurons active`;
      statsHTML += `<br>Connections firing`;
      statsHTML += `<br>🚀 ${zones}/8 zones`;
      statsHTML += `<br><span style="color: #00ff88; font-size: 0.8em;">⚡ Brain V2 - 30FPS</span>`;

      statsElement.innerHTML = statsHTML;
    }
    lastStatsUpdate = frameCount;
  }

  // Audio toggle (simplifié)
  resetMatrix();
  const buttonX = width - 50;
  const buttonY = 40;

  noStroke();
  fill(0, 0, 0, 100);
  ellipse(buttonX, buttonY, 35, 35);

  stroke(100, 100, 100, 150);
  strokeWeight(1);
  noFill();
  ellipse(buttonX, buttonY, 35, 35);

  noStroke();
  textAlign(CENTER, CENTER);
  textSize(18);

  if (audioEnabled) {
    fill(200, 200, 200, 255);
    text("♪", buttonX, buttonY - 2);
  } else {
    fill(120, 120, 120, 200);
    text("♪", buttonX, buttonY - 2);
    stroke(120, 120, 120, 200);
    strokeWeight(2);
    line(buttonX - 10, buttonY - 10, buttonX + 10, buttonY + 10);
  }

  // Contrôles
  if (mouseX < 150 && mouseY > height - 70) {
    fill(0, 0, 0, 40);
    noStroke();
    rect(10, height - 65, 140, 55);

    textAlign(LEFT);
    textSize(8);
    fill(120, 120, 140, 120);
    text("+ : Add neurons", 15, height - 50);
    text("- : Remove neurons", 15, height - 40);
    text("R : Reset • C : Clear", 15, height - 30);
    text("🎨 B : Blur Wave", 15, height - 20);
  }
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

    // Système de flou
    this.blurPhase = random(TWO_PI);
    this.blurSpeed = random(0.01, 0.05);
    this.maxBlur = random(5, 25);
    this.blurIntensity = 0;
  }

  update() {
    // 🚀 RÉPULSION SOURIS ULTRA-OPTIMISÉE : Effet plus subtil et agréable
    const dx = this.x - mouseWorldX;
    const dy = this.y - mouseWorldY;
    const distSquared = dx * dx + dy * dy;

    if (distSquared < 1600) {
      // 40*40, zone d'influence réduite de 50 à 40px
      const d = Math.sqrt(distSquared);
      const force = 12 / d; // Force réduite de 50 à 12 pour un effet plus doux
      this.x += dx * force * 0.4; // Facteur d'atténuation supplémentaire
      this.y += dy * force * 0.4;
    }

    // 🚀 Mouvement Perlin noise adapté pour 30 FPS - RÉDUIT ÷2 pour plus de calme
    const noiseSpeed = 0.0075; // Réduit de 0.015 à 0.0075 (÷2)
    const noiseMagnitude = 0.075; // Réduit de 0.15 à 0.075 (÷2)
    let noiseX = noise(this.noiseOffsetX + frameCount * noiseSpeed);
    let noiseY = noise(this.noiseOffsetY + frameCount * noiseSpeed);
    this.vx += map(noiseX, 0, 1, -noiseMagnitude, noiseMagnitude);
    this.vy += map(noiseY, 0, 1, -noiseMagnitude, noiseMagnitude);

    // 🚀 Force de retour adaptée pour 30 FPS - RÉDUITE ÷2
    this.vx += (this.targetX - this.x) * 0.004; // Réduit de 0.008 à 0.004 (÷2)
    this.vy += (this.targetY - this.y) * 0.004;

    // 🚀 Amortissement adapté pour 30 FPS
    this.vx *= 0.96; // Réduit de 0.98 à 0.96 pour plus de fluidité
    this.vy *= 0.96;

    this.x += this.vx;
    this.y += this.vy;

    // Fade shimmer - Plus lent pour compenser la réduction d'intensité
    this.shimmer *= 0.92; // Changé de 0.88 à 0.92 pour durer plus longtemps

    // 🚀 Flou dynamique adapté pour 30 FPS
    this.blurPhase += this.blurSpeed;
    this.blurIntensity = (sin(this.blurPhase) + 1) / 2;

    if (random() < 0.025) {
      // Augmenté de 0.015 à 0.025 pour compenser 30 FPS
      this.blurSpeed = random(0.03, 0.12); // Augmenté pour compenser le framerate
      this.maxBlur = random(12, 30); // Réduit la valeur max pour économiser des performances
    }
  }

  shine() {
    this.shimmer = 1.2;
  }

  show() {
    noStroke();

    const shimmerColor = color(255, 255, 255, 255);
    let finalColor = lerpColor(this.color, shimmerColor, this.shimmer / 3); // Intensité ÷3
    let size = this.baseSize + (this.shimmer / 2) * (this.baseSize * 2); // Taille shimmer ÷3

    // 🚀 OPTIMISATION FLOU : Seulement pour les cas importants
    const needsBlur =
      this.shimmer > 0.1 || this.depth > 0.7 || this.blurIntensity > 0.8;

    if (needsBlur) {
      // Système de flou limité aux cas nécessaires
      const depthBlur = this.depth > 0.7 ? map(this.depth, 0.7, 1, 0, 5) : 0; // Réduction du flou de profondeur
      const shimmerGlow = (this.shimmer / 3) * 20; // Intensité shimmer ÷3
      const dynamicBlur =
        this.blurIntensity > 0.8 ? this.blurIntensity * this.maxBlur * 0.6 : 0; // Seuil plus haut et réduction
      const totalBlur = depthBlur + shimmerGlow + dynamicBlur;

      drawingContext.shadowBlur = Math.min(totalBlur, 25); // 🚀 Plafond à 25px au lieu de illimité

      if (this.shimmer > 0.1) {
        drawingContext.shadowColor = `rgba(255, 255, 255, ${
          (this.shimmer / 3) * 0.4
        })`; // Intensité ÷3
      } else if (this.blurIntensity > 0.8) {
        const haloIntensity = this.blurIntensity * 0.2; // Réduction de l'intensité
        drawingContext.shadowColor = `rgba(150, 220, 255, ${haloIntensity})`; // Couleur fixe au lieu de random
      } else {
        const shadowIntensity = map(this.depth, 0.7, 1, 0.1, 0.2);
        drawingContext.shadowColor = `rgba(200, 200, 200, ${shadowIntensity})`;
      }
    } else {
      // 🚀 Pas de flou pour les particules normales = gain de performance majeur
      drawingContext.shadowBlur = 0;
    }

    fill(finalColor);
    ellipse(this.x, this.y, size, size);

    if (needsBlur) {
      drawingContext.shadowBlur = 0; // Reset seulement si on avait du flou
    }
  }
}

// === FONCTIONS INTERACTIVES ===
function triggerBlurWave() {
  const waveCenter = getRandomPixel(); // 🚀 Pool optimisé
  if (waveCenter) {
    const waveRadius = random(150, 250);

    // 🚀 Optimisation: utilise cache de longueur au lieu de forEach
    for (let i = 0; i < particlesCount; i++) {
      const particle = particles[i];
      const distance = dist(particle.x, particle.y, waveCenter.x, waveCenter.y);
      if (distance < waveRadius) {
        const intensity = map(distance, 0, waveRadius, 1, 0.3);
        particle.blurSpeed = random(0.08, 0.2) * intensity;
        particle.maxBlur = random(20, 50) * intensity;
        particle.blurPhase = random(TWO_PI);
      }
    }
  }
}

function addParticles(count) {
  let added = 0;
  let attempts = 0;
  let maxAttempts = count * 10;

  while (added < count && attempts < maxAttempts && validPixelsCount > 0) {
    attempts++;
    let randomPixel = getRandomPixel(); // 🚀 Utilise pool optimisé

    if (randomPixel) {
      let newParticle = new Particle(randomPixel.x, randomPixel.y);
      particles.push(newParticle);
      newParticle.shine();
      added++;
      depthSortNeeded = true; // 🚀 Marquer tri nécessaire
    }
  }

  // 🚀 Mise à jour cache après ajout
  particlesCount = particles.length;

  // Ajouter zones proportionnelles (utilise pool optimisé)
  const newZones = Math.floor(added / 20);
  for (let i = 0; i < newZones && hotZonesCount < 8; i++) {
    let randomPixel = getRandomPixel(); // 🚀 Pool optimisé
    if (randomPixel) {
      hotZones.push(new SimpleHotZone(randomPixel.x, randomPixel.y));
      hotZonesCount++; // 🚀 Mise à jour cache
    }
  }

  if (added > 0) triggerBlurWave();
}

function removeParticles(count) {
  let toRemove = min(count, particlesCount); // 🚀 Utilise cache
  let indicesToRemove = [];

  let availableIndices = Array.from({ length: particlesCount }, (_, i) => i); // 🚀 Cache
  for (let i = 0; i < toRemove; i++) {
    let randomIndex = floor(random(availableIndices.length));
    indicesToRemove.push(availableIndices[randomIndex]);
    availableIndices.splice(randomIndex, 1);
  }

  indicesToRemove.forEach((index) => {
    if (particles[index]) particles[index].shine();
  });

  setTimeout(() => {
    indicesToRemove.sort((a, b) => b - a);
    indicesToRemove.forEach((index) => particles.splice(index, 1));

    // 🚀 Mise à jour cache après suppression
    particlesCount = particles.length;
    depthSortNeeded = true; // Tri nécessaire après suppression

    const zonesToRemove = Math.floor(toRemove / 30);
    for (let i = 0; i < zonesToRemove && hotZonesCount > 1; i++) {
      hotZones.pop();
      hotZonesCount--; // 🚀 Mise à jour cache
    }
  }, 100);
}

function resetParticles() {
  particles.forEach((particle) => particle.shine());

  setTimeout(() => {
    particles = [];
    hotZones = [];

    for (let i = 0; i < NUM_PARTICLES; i++) {
      let randomPixel = getRandomPixel(); // 🚀 Pool optimisé
      if (randomPixel) {
        particles.push(new Particle(randomPixel.x, randomPixel.y));
      }
    }

    const initialZones = Math.floor(NUM_PARTICLES / 50);
    for (let i = 0; i < Math.min(initialZones, 3); i++) {
      let randomPixel = getRandomPixel(); // 🚀 Pool optimisé
      if (randomPixel) {
        hotZones.push(new SimpleHotZone(randomPixel.x, randomPixel.y));
      }
    }

    // 🚀 Mise à jour cache après reset
    particlesCount = particles.length;
    hotZonesCount = hotZones.length;
    depthSortNeeded = true;
    generateRandomPools(); // Régénérer pools

    triggerBlurWave();
  }, 200);
}

function clearAllParticles() {
  particles.forEach((particle) => particle.shine());

  for (let i = 0; i < 3; i++) {
    setTimeout(() => triggerBlurWave(), i * 100);
  }

  setTimeout(() => {
    particles = [];
    hotZones = [];

    // 🚀 Mise à jour cache après clear
    particlesCount = 0;
    hotZonesCount = 0;
    generateRandomPools(); // Régénérer pools vides
  }, 400);
}

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

function mousePressed() {
  audioEnabled = !audioEnabled;

  if (audioEnabled) {
    startAudio();
  } else {
    stopAudio();
  }
}

function keyPressed() {
  if (key === "+" || key === "=") {
    addParticles(50);
  } else if (key === "-" || key === "_") {
    removeParticles(50);
  } else if (key.toLowerCase() === "r") {
    resetParticles();
  } else if (key.toLowerCase() === "c") {
    clearAllParticles();
  } else if (key.toLowerCase() === "b") {
    triggerBlurWave();
  }
}
