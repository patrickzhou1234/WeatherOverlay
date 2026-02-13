// ─────────────────────────────────────────────────────────
// aurora.glsl — Fragment shader
// Realistic aurora borealis — vertical ray curtains that
// undulate across the sky with green/cyan/purple bands,
// soft glow, and layered depth. Viewed as a transparent
// overlay on the user's desktop.
// ─────────────────────────────────────────────────────────

precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uSpeed;
uniform float uOpacity;

// ── Noise ───────────────────────────────────────────────

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453);
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
  for (int i = 0; i < 6; i++) {
    v += a * vnoise(p);
    p = rot * p * 2.02 + vec2(100.0);
    a *= 0.5;
  }
  return v;
}

// Higher-frequency noise for ray detail
float detailNoise(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.866, 0.5, -0.5, 0.866);
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = rot * p * 2.3 + vec2(50.0);
    a *= 0.45;
  }
  return v;
}

// ── Aurora curtain ──────────────────────────────────────
// Each curtain is a band of light with vertical ray
// structure. The key is:
// 1. A horizontal wave defines the curtain's Y position
// 2. Vertical falloff from that wave creates the drape
// 3. Vertical noise streaks create the "ray" structure

float auroraCurtain(vec2 uv, float offset, float waveScale, float waveSpeed, float thickness) {
  float t = uTime * uSpeed;

  // ── Horizontal wave — the curtain's undulating centerline ──
  float wx = uv.x * waveScale;
  float wave = 0.0;
  wave += sin(wx * 1.0 + t * waveSpeed * 0.7 + offset) * 0.12;
  wave += sin(wx * 2.3 + t * waveSpeed * 0.5 + offset * 2.0) * 0.07;
  wave += sin(wx * 0.5 + t * waveSpeed * 0.3 + offset * 0.5) * 0.15;
  wave += fbm(vec2(uv.x * 2.0 + t * 0.05, offset)) * 0.08 - 0.04;

  // The curtain center Y
  float centerY = 0.65 + wave + offset * 0.08;

  // ── Vertical extent — aurora hangs down from the center ──
  float distAbove = uv.y - centerY;
  float distBelow = centerY - uv.y;

  // Sharp top edge, long flowing bottom
  float topFade = smoothstep(0.05, 0.0, distAbove);
  float bottomFade = smoothstep(thickness, 0.0, distBelow);
  bottomFade = pow(bottomFade, 0.6); // softer falloff at bottom

  float curtainMask = topFade * bottomFade;

  // ── Vertical ray structure ──
  // This is what makes aurora look like aurora — vertical streaks
  float rayFreq = 15.0 + offset * 5.0;
  float rayScroll = t * waveSpeed * 0.2;

  // Layered vertical noise at different frequencies
  float rays = 0.0;
  rays += vnoise(vec2(uv.x * rayFreq + rayScroll, uv.y * 0.5 + offset)) * 0.6;
  rays += vnoise(vec2(uv.x * rayFreq * 2.3 + rayScroll * 0.7, uv.y * 0.8 + offset * 2.0)) * 0.3;
  rays += detailNoise(vec2(uv.x * rayFreq * 0.7 + rayScroll * 1.3, uv.y * 0.3)) * 0.4;

  // Sharpen the rays — create distinct vertical streaks
  rays = smoothstep(0.25, 0.75, rays);

  // Some rays are brighter — add occasional bright columns
  float brightRays = vnoise(vec2(uv.x * 6.0 + t * 0.08, offset * 3.0));
  brightRays = pow(smoothstep(0.5, 0.9, brightRays), 2.0);

  float intensity = curtainMask * (rays * 0.7 + brightRays * 0.5);

  // ── Height-dependent brightness ──
  // Brighter near the top of the curtain, fading lower
  float heightBright = smoothstep(centerY - thickness, centerY, uv.y);
  intensity *= 0.5 + heightBright * 0.5;

  return clamp(intensity, 0.0, 1.0);
}

// ── Aurora color mapping ────────────────────────────────
// Real aurora: green dominates the middle, purple/blue at
// the top, sometimes cyan, with hints of pink at the bottom.

vec3 auroraColor(vec2 uv, float curtainY, float offset) {
  float t = uTime * uSpeed;

  // Height-relative position within the curtain
  float relH = clamp((uv.y - (curtainY - 0.3)) / 0.4, 0.0, 1.0);

  // Base: green/cyan
  vec3 green  = vec3(0.1, 0.95, 0.4);
  vec3 cyan   = vec3(0.1, 0.85, 0.75);
  vec3 purple = vec3(0.4, 0.15, 0.8);
  vec3 pink   = vec3(0.6, 0.2, 0.5);

  // Green in the middle, purple at the top, hints of pink at bottom
  vec3 col = green;
  col = mix(col, cyan, smoothstep(0.3, 0.6, relH) * 0.5);
  col = mix(col, purple, smoothstep(0.7, 1.0, relH));
  col = mix(col, pink, smoothstep(0.2, 0.0, relH) * 0.3);

  // Slow color shift over time so it's not static
  float shift = sin(t * 0.1 + offset * 2.0 + uv.x * 3.0) * 0.5 + 0.5;
  vec3 altColor = mix(green, cyan, shift);
  col = mix(col, altColor, 0.2);

  return col;
}

// ── Soft glow / bloom ───────────────────────────────────
// Aurora has a wide soft glow around the bright curtains.

float auroraGlow(vec2 uv, float offset, float waveScale, float waveSpeed) {
  float t = uTime * uSpeed;

  // Same wave as the curtain, but much wider/softer
  float wx = uv.x * waveScale;
  float wave = 0.0;
  wave += sin(wx * 1.0 + t * waveSpeed * 0.7 + offset) * 0.12;
  wave += sin(wx * 2.3 + t * waveSpeed * 0.5 + offset * 2.0) * 0.07;
  wave += sin(wx * 0.5 + t * waveSpeed * 0.3 + offset * 0.5) * 0.15;

  float centerY = 0.65 + wave + offset * 0.08;

  float dist = abs(uv.y - centerY);
  float glow = exp(-dist * dist * 8.0);

  return glow * 0.3;
}

// ── Stars ───────────────────────────────────────────────

float stars(vec2 uv) {
  float s = 0.0;
  // Grid of potential star positions
  for (float i = 0.0; i < 3.0; i++) {
    vec2 grid = uv * (80.0 + i * 40.0);
    vec2 id = floor(grid);
    vec2 fd = fract(grid);

    float h = hash(id + i * 100.0);
    // Only some cells have stars
    if (h > 0.92) {
      vec2 starPos = vec2(hash(id * 1.1 + i), hash(id * 2.3 + i));
      float d = length(fd - starPos);
      float brightness = smoothstep(0.03, 0.0, d);

      // Twinkle
      float twinkle = sin(uTime * (2.0 + h * 4.0) + h * 100.0) * 0.5 + 0.5;
      brightness *= 0.5 + twinkle * 0.5;

      s += brightness * (0.5 + h * 0.5);
    }
  }
  return clamp(s, 0.0, 1.0);
}

// ── Main ────────────────────────────────────────────────

void main() {
  vec2 uv = vUv;

  // Gentle UV distortion — atmosphere shimmer
  float t = uTime * uSpeed;
  uv.x += sin(uv.y * 12.0 + t * 0.3) * 0.002;
  uv.y += sin(uv.x * 8.0 + t * 0.25) * 0.001;

  vec3 color = vec3(0.0);
  float alpha = 0.0;

  // ── Layer 1: Background glow (wide, soft) ──
  float glow1 = auroraGlow(uv, 0.0, 3.0, 0.3);
  float glow2 = auroraGlow(uv, 1.5, 2.5, 0.25);
  float glow3 = auroraGlow(uv, -0.8, 3.5, 0.2);

  vec3 glowCol1 = auroraColor(uv, 0.65, 0.0);
  vec3 glowCol2 = auroraColor(uv, 0.77, 1.5);
  vec3 glowCol3 = auroraColor(uv, 0.59, -0.8);

  color += glowCol1 * glow1;
  color += glowCol2 * glow2;
  color += glowCol3 * glow3;
  alpha += (glow1 + glow2 + glow3) * 0.6;

  // ── Layer 2: Main aurora curtains (detailed, bright) ──
  // Curtain 1: Primary — wide, bright green
  float c1 = auroraCurtain(uv, 0.0, 3.0, 0.3, 0.35);
  vec3 col1 = auroraColor(uv, 0.65, 0.0);
  color += col1 * c1 * 1.2;
  alpha += c1 * 0.8;

  // Curtain 2: Secondary — offset, slightly different movement
  float c2 = auroraCurtain(uv, 1.5, 2.5, 0.25, 0.28);
  vec3 col2 = auroraColor(uv, 0.77, 1.5);
  color += col2 * c2 * 0.9;
  alpha += c2 * 0.6;

  // Curtain 3: Tertiary — lower, purple-tinted
  float c3 = auroraCurtain(uv, -0.8, 3.5, 0.2, 0.22);
  vec3 col3 = auroraColor(uv, 0.59, -0.8);
  color += col3 * c3 * 0.7;
  alpha += c3 * 0.5;

  // Curtain 4: Accent — thin, fast-moving
  float c4 = auroraCurtain(uv, 2.5, 4.0, 0.4, 0.18);
  vec3 col4 = auroraColor(uv, 0.85, 2.5);
  color += col4 * c4 * 0.6;
  alpha += c4 * 0.4;

  // ── Layer 3: Stars (behind aurora, dimmed where aurora is bright) ──
  float starField = stars(vUv);
  float starDim = 1.0 - clamp(alpha * 1.5, 0.0, 0.9); // dim behind bright aurora
  color += vec3(0.8, 0.85, 1.0) * starField * starDim * 0.6;
  alpha = max(alpha, starField * starDim * 0.3);

  // ── Post-processing ──

  // Boost saturation slightly
  float lum = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(lum), color, 1.3);

  // Slight vignette toward bottom — aurora is a sky effect
  float bottomFade = smoothstep(0.0, 0.35, uv.y);
  alpha *= bottomFade;
  color *= bottomFade;

  // Edge fade for clean overlay
  float edgeFade = smoothstep(0.0, 0.05, uv.x) * smoothstep(1.0, 0.95, uv.x);
  edgeFade *= smoothstep(0.0, 0.03, uv.y) * smoothstep(1.0, 0.97, uv.y);

  alpha = clamp(alpha, 0.0, 0.85);
  alpha *= edgeFade * uOpacity;

  gl_FragColor = vec4(color, alpha);
}
