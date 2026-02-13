// ─────────────────────────────────────────────────────────
// waterfall.glsl — Fragment shader
// Underwater view looking upward — realistic caustic light,
// god rays, surface ripple distortion, volumetric depth fog,
// and dancing light patterns on a semi-transparent overlay.
// ─────────────────────────────────────────────────────────

precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uSpeed;
uniform float uOpacity;

// ── Noise primitives ────────────────────────────────────

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453);
}

vec2 hash22(vec2 p) {
  return vec2(hash(p), hash2(p));
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.877, 0.480, -0.480, 0.877);
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = rot * p * 2.02 + vec2(100.0);
    a *= 0.5;
  }
  return v;
}

// ── Caustics — dual-layer Voronoi interference ──────────
// This is the key to realistic underwater light. Two offset
// Voronoi distance fields are multiplied together; where
// both cell edges overlap you get the bright caustic lines.

float voronoiDist(vec2 uv, float t) {
  vec2 id = floor(uv);
  vec2 fd = fract(uv);
  float minD = 1.0;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 pt = hash22(id + neighbor);
      pt = 0.5 + 0.45 * sin(t + 6.2831 * pt);
      float d = length(neighbor + pt - fd);
      minD = min(minD, d);
    }
  }
  return minD;
}

float caustics(vec2 uv) {
  float t = uTime * 0.45 * uSpeed;

  // Layer 1 — medium scale
  float v1 = voronoiDist(uv * 5.0 + vec2(t * 0.15, t * 0.1), t * 0.7);
  // Layer 2 — slightly offset and scaled differently
  float v2 = voronoiDist(uv * 5.5 + vec2(-t * 0.12, t * 0.18), t * 0.8 + 2.0);
  // Layer 3 — fine detail
  float v3 = voronoiDist(uv * 9.0 + vec2(t * 0.08, -t * 0.06), t * 0.5 + 5.0);

  // Combine — multiply to get interference pattern
  float c = v1 * v2;
  c = pow(c, 0.65);
  c = 1.0 - smoothstep(0.0, 0.45, c);

  // Blend in fine detail layer softly
  float fine = 1.0 - smoothstep(0.0, 0.3, v3);
  c = c * 0.75 + fine * 0.25;

  return c;
}

// ── God rays — shafts of light from the surface ─────────

float godRays(vec2 uv) {
  float t = uTime * 0.2 * uSpeed;

  float rays = 0.0;

  // Several angled light shafts
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    // Each ray has a different angle and drift
    float angle = 0.3 + fi * 0.55 + sin(t * 0.15 + fi * 1.3) * 0.15;
    float rayX = uv.x * cos(angle) - uv.y * sin(angle);

    // Shift and scale
    float offset = sin(t * 0.1 + fi * 2.0) * 0.3;
    float rayPattern = sin((rayX + offset) * (6.0 + fi * 2.0)) * 0.5 + 0.5;
    rayPattern = pow(rayPattern, 4.0 + fi);

    // Fade toward bottom (rays are stronger near the surface)
    float yFade = smoothstep(0.0, 0.9, uv.y);
    yFade = pow(yFade, 1.5);

    // Gentle brightness pulsation
    float pulse = 0.7 + 0.3 * sin(t * 0.3 + fi * 1.1);

    rays += rayPattern * yFade * pulse * (0.15 - fi * 0.015);
  }

  return clamp(rays, 0.0, 1.0);
}

// ── Water surface (seen from below) ─────────────────────

float surfaceFromBelow(vec2 uv) {
  float t = uTime * 0.3 * uSpeed;

  // Distorted surface ripples — like looking up at a pool surface
  vec2 surfUV = uv * vec2(3.0, 1.0);
  float wave1 = sin(surfUV.x * 4.0 + t * 1.2) * cos(surfUV.x * 2.5 - t * 0.8);
  float wave2 = sin(surfUV.x * 7.0 - t * 0.9 + 1.0) * cos(surfUV.x * 3.0 + t * 0.6);
  float wave3 = sin(surfUV.x * 11.0 + t * 0.5 + 2.5) * 0.5;

  float surface = (wave1 + wave2 * 0.6 + wave3 * 0.3) * 0.5 + 0.5;

  // Only visible near the top of the viewport
  float topFade = smoothstep(0.6, 1.0, uv.y);

  return surface * topFade;
}

// ── Concentric ripples expanding outward ────────────────

float ripples(vec2 uv) {
  float t = uTime * uSpeed;
  float total = 0.0;

  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    // Ripple center — slowly drifting
    vec2 center = vec2(
      0.3 + 0.4 * hash(vec2(fi, 1.0)) + sin(t * 0.08 + fi) * 0.1,
      0.3 + 0.4 * hash(vec2(1.0, fi)) + cos(t * 0.06 + fi * 1.5) * 0.1
    );

    float d = length(uv - center);

    // Expanding ring
    float phase = t * (0.4 + fi * 0.08) + fi * 1.7;
    float ring = sin(d * 35.0 - phase) * 0.5 + 0.5;
    ring = pow(ring, 6.0);

    // Fade with distance from center
    ring *= exp(-d * 4.5);

    // Stagger visibility with a lifetime cycle
    float lifetime = fract(t * 0.08 + fi * 0.17);
    float vis = smoothstep(0.0, 0.1, lifetime) * smoothstep(1.0, 0.6, lifetime);

    total += ring * vis * 0.12;
  }

  return total;
}

// ── Depth fog / volumetric scattering ───────────────────

vec3 depthFog(vec3 baseColor, vec2 uv) {
  // Subtle darkening toward bottom = depth illusion
  float depth = 1.0 - uv.y;
  vec3 deepColor = vec3(0.02, 0.08, 0.18);
  return mix(baseColor, deepColor, depth * 0.35);
}

// ── Floating particles / sediment ───────────────────────

float particles(vec2 uv) {
  float t = uTime * uSpeed;
  float total = 0.0;

  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    vec2 pos = vec2(
      hash(vec2(fi, 0.0)),
      fract(hash(vec2(0.0, fi)) + t * (0.02 + hash(vec2(fi, fi)) * 0.03))
    );
    // Slight horizontal drift
    pos.x += sin(t * 0.3 + fi * 2.0) * 0.05;

    float d = length(uv - pos);
    float dot = smoothstep(0.008, 0.0, d);
    // Soft halo
    dot += smoothstep(0.025, 0.005, d) * 0.3;

    total += dot;
  }

  return clamp(total, 0.0, 1.0);
}

// ── Main ────────────────────────────────────────────────

void main() {
  vec2 uv = vUv;
  float t = uTime * uSpeed;

  // Gentle UV distortion — the whole view wobbles slightly
  // as if seen through moving water
  vec2 distort = vec2(
    sin(uv.y * 8.0 + t * 0.6) * 0.004 + sin(uv.y * 15.0 + t * 1.1) * 0.002,
    sin(uv.x * 6.0 + t * 0.5) * 0.003 + cos(uv.x * 12.0 + t * 0.9) * 0.001
  );
  vec2 distUV = uv + distort;

  // ── Color palette ──
  vec3 deepBlue    = vec3(0.04, 0.12, 0.24);
  vec3 midBlue     = vec3(0.10, 0.25, 0.42);
  vec3 lightBlue   = vec3(0.30, 0.55, 0.72);
  vec3 surfaceBlue = vec3(0.45, 0.70, 0.85);
  vec3 causticWhite = vec3(0.65, 0.85, 0.95);

  // ── Base: depth gradient ──
  // Lighter near the top (surface), deeper blue at the bottom
  float yGrad = pow(uv.y, 0.8);
  vec3 color = mix(deepBlue, midBlue, yGrad);
  float alpha = 0.0;

  // ── Layer 1: Caustic light patterns ──
  float caust = caustics(distUV);
  // Caustics are brightest in the middle, fade toward edges and bottom
  float caustMask = smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.7, uv.y);
  caustMask *= smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x);
  caust *= caustMask;

  color = mix(color, causticWhite, caust * 0.55);
  alpha += caust * 0.5;

  // ── Layer 2: God rays from the surface ──
  float rays = godRays(distUV);
  vec3 rayColor = mix(lightBlue, surfaceBlue, uv.y);
  color += rayColor * rays * 0.6;
  alpha += rays * 0.35;

  // ── Layer 3: Surface ripple pattern at the top ──
  float surf = surfaceFromBelow(distUV);
  color = mix(color, surfaceBlue, surf * 0.3);
  alpha += surf * 0.2;

  // ── Layer 4: Concentric ripples ──
  float rip = ripples(distUV);
  color += causticWhite * rip;
  alpha += rip * 0.3;

  // ── Layer 5: Floating particles / sediment ──
  float parts = particles(distUV);
  color += vec3(0.6, 0.8, 0.9) * parts * 0.4;
  alpha += parts * 0.25;

  // ── Apply depth fog ──
  color = depthFog(color, uv);

  // ── Very subtle chromatic shimmer ──
  float shimmer = vnoise(distUV * 30.0 + t * 0.5);
  color.r += (shimmer - 0.5) * 0.015;
  color.b += (0.5 - shimmer) * 0.015;

  // ── Final alpha ──
  // Gentle edge fade
  float edgeFade = smoothstep(0.0, 0.06, uv.x) * smoothstep(1.0, 0.94, uv.x);
  edgeFade *= smoothstep(0.0, 0.04, uv.y) * smoothstep(1.0, 0.96, uv.y);

  alpha = clamp(alpha, 0.0, 0.85);
  alpha *= edgeFade * uOpacity;

  gl_FragColor = vec4(color, alpha);
}
