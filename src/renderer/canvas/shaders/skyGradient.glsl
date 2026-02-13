// ─────────────────────────────────────────────────────────
// skyGradient.glsl — Fragment shader
// Generates a smooth vertical gradient that transitions
// between time-of-day palettes and weather tints.
// ─────────────────────────────────────────────────────────

precision mediump float;

varying vec2 vUv;

uniform float uTime;
uniform float uTimeOfDay;   // 0 = midnight-ish, 0.5 = noon, 1 = night
uniform float uWeatherTint; // 0 = clear, 1 = fully overcast

// ── Palette definitions ─────────────────────────────────

vec3 nightTop    = vec3(0.02, 0.02, 0.08);
vec3 nightBottom = vec3(0.04, 0.04, 0.12);

vec3 dawnTop     = vec3(0.15, 0.10, 0.25);
vec3 dawnBottom  = vec3(0.85, 0.45, 0.25);

vec3 dayTop      = vec3(0.30, 0.55, 0.90);
vec3 dayBottom   = vec3(0.65, 0.80, 1.00);

vec3 duskTop     = vec3(0.12, 0.08, 0.25);
vec3 duskBottom  = vec3(0.80, 0.30, 0.15);

vec3 overcastTint = vec3(0.35, 0.38, 0.42);

void main() {
  // Smooth vertical gradient (bottom = 0, top = 1)
  float y = vUv.y;

  // Choose palette by uTimeOfDay
  vec3 top;
  vec3 bottom;

  if (uTimeOfDay < 0.25) {
    // Night → Dawn
    float t = uTimeOfDay / 0.25;
    top    = mix(nightTop,    dawnTop,    t);
    bottom = mix(nightBottom, dawnBottom, t);
  } else if (uTimeOfDay < 0.5) {
    // Dawn → Day
    float t = (uTimeOfDay - 0.25) / 0.25;
    top    = mix(dawnTop,    dayTop,    t);
    bottom = mix(dawnBottom, dayBottom, t);
  } else if (uTimeOfDay < 0.75) {
    // Day → Dusk
    float t = (uTimeOfDay - 0.5) / 0.25;
    top    = mix(dayTop,    duskTop,    t);
    bottom = mix(dayBottom, duskBottom, t);
  } else {
    // Dusk → Night
    float t = (uTimeOfDay - 0.75) / 0.25;
    top    = mix(duskTop,    nightTop,    t);
    bottom = mix(duskBottom, nightBottom, t);
  }

  vec3 skyColor = mix(bottom, top, y);

  // Weather tint: lerp toward overcast grey
  skyColor = mix(skyColor, overcastTint, uWeatherTint * 0.55);

  // Subtle noise shimmer (lo-fi feel)
  float noise = fract(sin(dot(vUv * 400.0 + uTime * 0.3, vec2(12.9898, 78.233))) * 43758.5453);
  skyColor += (noise - 0.5) * 0.015;

  // Semi-transparent so the desktop shows through slightly
  float alpha = 0.75 + uWeatherTint * 0.15;

  gl_FragColor = vec4(skyColor, alpha);
}
