// ─────────────────────────────────────────────────────────
// skyGradient.glsl — Fragment shader
// Smooth time-of-day gradient with subtle animated noise
// and weather-based atmosphere tinting.
// ─────────────────────────────────────────────────────────

precision mediump float;

varying vec2 vUv;

uniform float uTime;
uniform float uTimeOfDay;   // 0 = midnight-ish, 0.5 = noon, 1 = night
uniform float uWeatherTint; // 0 = clear, 1 = fully overcast

// ── Palette definitions ─────────────────────────────────

vec3 nightTop    = vec3(0.02, 0.02, 0.07);
vec3 nightBottom = vec3(0.04, 0.05, 0.12);

vec3 dawnTop     = vec3(0.20, 0.25, 0.45);
vec3 dawnBottom  = vec3(0.45, 0.35, 0.40);

vec3 dayTop      = vec3(0.30, 0.55, 0.90);
vec3 dayBottom   = vec3(0.62, 0.78, 0.95);

vec3 duskTop     = vec3(0.12, 0.12, 0.28);
vec3 duskBottom  = vec3(0.40, 0.25, 0.35);

vec3 overcastTint = vec3(0.32, 0.35, 0.42);

// ── Smooth noise for subtle atmosphere ──────────────────

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float smoothNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // smoothstep

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  float y = vUv.y;

  // Slight curve for more natural gradient distribution
  float curvedY = y * y * (3.0 - 2.0 * y);

  // Choose palette by uTimeOfDay
  vec3 top;
  vec3 bottom;

  if (uTimeOfDay < 0.25) {
    float t = smoothstep(0.0, 0.25, uTimeOfDay);
    top    = mix(nightTop,    dawnTop,    t);
    bottom = mix(nightBottom, dawnBottom, t);
  } else if (uTimeOfDay < 0.5) {
    float t = smoothstep(0.25, 0.5, uTimeOfDay);
    top    = mix(dawnTop,    dayTop,    t);
    bottom = mix(dawnBottom, dayBottom, t);
  } else if (uTimeOfDay < 0.75) {
    float t = smoothstep(0.5, 0.75, uTimeOfDay);
    top    = mix(dayTop,    duskTop,    t);
    bottom = mix(dayBottom, duskBottom, t);
  } else {
    float t = smoothstep(0.75, 1.0, uTimeOfDay);
    top    = mix(duskTop,    nightTop,    t);
    bottom = mix(duskBottom, nightBottom, t);
  }

  vec3 skyColor = mix(bottom, top, curvedY);

  // Weather tint: smoothly lerp toward overcast
  skyColor = mix(skyColor, overcastTint, uWeatherTint * 0.5);

  // Very subtle animated grain (much softer than before)
  float grain = smoothNoise(vUv * 120.0 + uTime * 0.15);
  skyColor += (grain - 0.5) * 0.008;

  // Alpha: mostly transparent on clear, more opaque when overcast
  float alpha = 0.6 + uWeatherTint * 0.2;

  gl_FragColor = vec4(skyColor, alpha);
}
