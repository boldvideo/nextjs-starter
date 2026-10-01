/**
 * The tube. Takes the 320×240 frame and shows it through curved glass:
 * barrel distortion, RGB split (wider when you get hit), a soft phosphor
 * glow, scanlines, an aperture grille and a vignette. WebGL 1, one quad.
 * Returns null when WebGL isn't there; the caller then draws the frame flat.
 */

const VERTEX = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
uniform sampler2D u_tex;
uniform vec2 u_src;
uniform float u_split;
uniform float u_flash;
uniform float u_curve;
varying vec2 v_uv;

vec2 bend(vec2 uv) {
  uv = uv * 2.0 - 1.0;
  vec2 off = abs(uv.yx) * u_curve;
  uv = uv + uv * off * off;
  return uv * 0.5 + 0.5;
}

vec3 sample(vec2 uv) {
  float s = u_split / u_src.x;
  return vec3(
    texture2D(u_tex, uv + vec2(s, 0.0)).r,
    texture2D(u_tex, uv).g,
    texture2D(u_tex, uv - vec2(s, 0.0)).b
  );
}

void main() {
  vec2 uv = bend(v_uv);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  vec3 col = sample(uv);

  // Phosphor glow: a cheap blur added back on top
  vec2 px = 1.0 / u_src;
  vec3 glow = texture2D(u_tex, uv + vec2(px.x * 1.5, 0.0)).rgb
    + texture2D(u_tex, uv - vec2(px.x * 1.5, 0.0)).rgb
    + texture2D(u_tex, uv + vec2(0.0, px.y * 1.5)).rgb
    + texture2D(u_tex, uv - vec2(0.0, px.y * 1.5)).rgb
    + texture2D(u_tex, uv + px * 3.0).rgb
    + texture2D(u_tex, uv - px * 3.0).rgb;
  col += glow / 6.0 * 0.45;

  // Scanlines, one per source row
  float scan = 0.78 + 0.22 * sin((uv.y * u_src.y) * 6.28318);
  col *= scan;

  // Aperture grille
  float m = mod(gl_FragCoord.x, 3.0);
  col *= m < 1.0 ? vec3(1.08, 0.94, 0.94) : m < 2.0 ? vec3(0.94, 1.08, 0.94) : vec3(0.94, 0.94, 1.08);

  // Vignette
  vec2 d = uv - 0.5;
  col *= 1.0 - dot(d, d) * 1.25;

  col += u_flash * vec3(1.0, 0.18, 0.65) * 0.35;
  gl_FragColor = vec4(col * 1.08, 1.0);
}`;

export interface Crt {
  draw: (source: HTMLCanvasElement, fx: { split: number; flash: number }) => void;
  dispose: () => void;
}

export function createCrt(canvas: HTMLCanvasElement, reducedMotion: boolean): Crt | null {
  const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("[dodger] CRT shader:", gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const uSrc = gl.getUniformLocation(program, "u_src");
  const uSplit = gl.getUniformLocation(program, "u_split");
  const uFlash = gl.getUniformLocation(program, "u_flash");
  const uCurve = gl.getUniformLocation(program, "u_curve");

  return {
    draw(source, fx) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
      gl.uniform2f(uSrc, source.width, source.height);
      gl.uniform1f(uSplit, 0.35 + (reducedMotion ? 0 : fx.split));
      gl.uniform1f(uFlash, reducedMotion ? fx.flash * 0.3 : fx.flash);
      gl.uniform1f(uCurve, 0.2);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
