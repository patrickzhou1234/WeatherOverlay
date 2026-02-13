// ─────────────────────────────────────────────────────────
// windowNoise.glsl — Fragment shader
// Procedural noise used for the "city window" flicker effect.
// Can be sampled as a texture in CityLights or applied inline.
// ─────────────────────────────────────────────────────────

precision mediump float;

varying vec2 vUv;

uniform float uTime;

// Simple pseudo-random from UV
float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

// Value noise (block-style for pixel look)
float blockNoise(vec2 uv, float scale) {
  vec2 id = floor(uv * scale);
  return rand(id + floor(uTime * 2.0));
}

void main() {
  float n = blockNoise(vUv, 32.0);

  // Warm colour ramp
  vec3 color = mix(
    vec3(0.85, 0.55, 0.15),  // dim amber
    vec3(1.0,  0.90, 0.60),  // bright warm white
    n
  );

  // Only show "lit" windows (threshold)
  float alpha = step(0.55, n) * 0.9;

  gl_FragColor = vec4(color, alpha);
}
