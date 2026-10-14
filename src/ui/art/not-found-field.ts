/**
 * The 404 backdrop: the digits "404" as a solid made of points, turning slowly in 3D and drawn as
 * text in the painting's ochre ink, with its reflection rippling under a waterline. The home
 * page crops Narcissus above the water; this page is where only the reflection is left.
 *
 * Taken from a reference that renders a baked point cloud with three.js and a dither shader
 * (about 520 kB of JavaScript): here the points come from the display font at load, and a 2D
 * canvas bins them into character cells, so the effect speaks the painting's ASCII language and
 * needs no library (ADR 0020). State lives in local variables rather than objects so the
 * minifier can shorten it: the script has to fit the site's JavaScript budget.
 */

/** Points of a solid, x y z interleaved, in units where the shape spans -1 to 1 horizontally. */
export interface Cloud {
  readonly points: Float32Array;
  /** Half the height of the shape, in the same units. */
  readonly halfHeight: number;
}

/** Light to dense, picked from the coverage ramp measured for the painting (generate-ascii). */
export const RAMP = '.:;!+*xoa#@8W';

/** @param level 0 (lightest glyph) to 1 (densest); values outside are clamped. */
export const glyphIndex = (level: number): number =>
  Math.round(Math.min(1, Math.max(0, level)) * (RAMP.length - 1));

/**
 * Turns the ink of a text mask into a solid: two points per sample, at random depths through the
 * thickness and scattered within the sample's square, so the grid never shows as moiré. The solid
 * only sways a little, so a filled volume reads the same as faces and sides, for less code.
 *
 * @param alpha the mask's pixels, RGBA (only alpha is read)
 * @param target roughly how many points to produce; the sampling step follows from it
 * @param depth half the thickness, in the cloud's units
 */
export const sampleMask = (
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  target: number,
  depth: number,
): Cloud => {
  const inked = (index: number): boolean => (alpha[index * 4 + 3] ?? 0) > 127;
  let ink = 0;
  for (let index = 0; index < width * height; index += 1) if (inked(index)) ink += 1;
  const step = Math.max(1, Math.round(Math.sqrt((2 * ink) / Math.max(1, target))));
  const half = width / 2;
  const points: number[] = [];
  for (let py = 0; py < height; py += step) {
    for (let px = 0; px < width; px += step) {
      if (!inked(py * width + px)) continue;
      for (let copy = 0; copy < 2; copy += 1) {
        points.push(
          (px + (Math.random() - 0.5) * step - half) / half,
          (py + (Math.random() - 0.5) * step - height / 2) / half,
          (Math.random() * 2 - 1) * depth,
        );
      }
    }
  }
  return { points: Float32Array.from(points), halfHeight: height / width };
};

// The solid leans back and tilts a little, as the reference's "error-tilted" pose, but less: a
// strong tilt over a level waterline reads as a mistake.
const SIN_PITCH = Math.sin(-0.32);
const COS_PITCH = Math.cos(-0.32);
const SIN_ROLL = Math.sin(-0.05);
const COS_ROLL = Math.cos(-0.05);

/**
 * Mounts the field on a canvas. The canvas carries `font-mono` and `text-ascii`: its computed
 * font and colour are the glyphs' font and ink, so the theme and the tokens stay the source.
 * The solid stands on the top edge of the `[data-field-floor]` element beside the canvas, if any.
 */
export const mountNotFoundField = async (canvas: HTMLCanvasElement): Promise<void> => {
  const context = canvas.getContext('2d');
  const mask = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  // A copy of what stands above the water: drawing a canvas onto itself makes the browser
  // snapshot all of it on every call, which for a few hundred strips pinned the main thread.
  const mirror = document.createElement('canvas').getContext('2d');
  if (!context || !mask || !mirror) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mono = getComputedStyle(canvas).fontFamily;
  const display = `500 240px ${getComputedStyle(document.documentElement).getPropertyValue('--font-display')}`;
  await document.fonts.load(display, '404').catch(() => undefined);
  await document.fonts.load(`600 16px ${mono}`, RAMP).catch(() => undefined);

  // The display font's "404", rasterised once and cropped to its ink.
  mask.font = display;
  const metrics = mask.measureText('404');
  const maskWidth = Math.ceil(metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);
  const maskHeight = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);
  mask.canvas.width = maskWidth;
  mask.canvas.height = maskHeight;
  mask.font = display;
  mask.fillText('404', metrics.actualBoundingBoxLeft, metrics.actualBoundingBoxAscent);
  const { points, halfHeight } = sampleMask(
    mask.getImageData(0, 0, maskWidth, maskHeight).data,
    maskWidth,
    maskHeight,
    7000,
    0.09,
  );
  // Per point: the screen offset the pointer's wake adds, and its velocity (x, y, vx, vy).
  const wake = new Float32Array((points.length / 3) * 4);
  const floor = canvas.parentElement?.querySelector('[data-field-floor]');

  let ratio = 1;
  let width = 0;
  let height = 0;
  let cell = 0;
  let columns = 0;
  let cells = new Float32Array(0);
  // Weight of a full cell, measured on the first frame after every resize.
  let full = 0;
  // Where the solid stands: the top of the words in front of it, or the middle of the stage.
  let water = 0;
  let pointerX = 0;
  let pointerY = 0;
  let pushX = 0;
  let pushY = 0;
  let pointerOn = false;
  // When the pointer last moved, on the animation clock.
  let moved = -1e5;

  const resize = (): void => {
    const box = canvas.getBoundingClientRect();
    ratio = Math.min(2, devicePixelRatio || 1);
    width = box.width;
    height = box.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    // Cells are 0.6 wide for 1 tall: 160 columns on a desktop, never glyphs under 6 px.
    cell = Math.max(6, width / 96);
    columns = Math.ceil(width / (cell * 0.6));
    cells = new Float32Array(columns * Math.ceil(height / cell));
    full = 0;
    water = Math.round(
      Math.min(height / 2, (floor?.getBoundingClientRect().top ?? 1e5) - box.top - cell * 2),
    );
    mirror.canvas.width = canvas.width;
    mirror.canvas.height = Math.max(1, water * ratio);
  };

  const frame = (time: number): void => {
    const t = still ? 0 : time / 1000;
    // The solid stands on the waterline and its reflection hangs from it. It spans most of the
    // width, unless that would push its top out of the stage.
    const scale = Math.min(width * 0.44, (water - cell * 2) / (halfHeight * 2.4));
    const centreY = water - scale * halfHeight * 1.15;
    const camera = scale * 3.5;
    const reach = Math.max(60, width * 0.07);
    const yaw = Math.sin(t * 0.25) * 0.32;
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);
    // The wake only needs work while the pointer moves and for the few seconds it takes to
    // settle; after that the offsets are well under a pixel.
    const stirred = time - moved < 5000;

    cells.fill(0);
    for (let index = 0; index < points.length / 3; index += 1) {
      const baseX = points[index * 3] ?? 0;
      const baseY = points[index * 3 + 1] ?? 0;
      // A slow drift, so the solid breathes like the reference's curl noise.
      const x = (baseX + Math.sin(baseY * 3 + t * 0.7) * 0.01) * scale;
      const y = (baseY + Math.cos(baseX * 3 + t * 0.6) * 0.01) * scale;
      const z = ((points[index * 3 + 2] ?? 0) + Math.sin((baseX + baseY) * 2.5 + t) * 0.02) * scale;
      // Yaw, then the fixed lean back (pitch) and tilt (roll).
      const x1 = x * cosY + z * sinY;
      const z1 = z * cosY - x * sinY;
      const y2 = y * COS_PITCH - z1 * SIN_PITCH;
      const z2 = z1 * COS_PITCH + y * SIN_PITCH;
      const perspective = camera / (camera - z2);
      const w = index * 4;
      const screenX = width / 2 + (x1 * COS_ROLL - y2 * SIN_ROLL) * perspective + (wake[w] ?? 0);
      const screenY = centreY + (y2 * COS_ROLL + x1 * SIN_ROLL) * perspective + (wake[w + 1] ?? 0);

      // The wake: points near the pointer are pushed away and dragged along, then spring back.
      // (Math.hypot is several times slower than this in V8, and it runs for every point.)
      const dx = screenX - pointerX;
      const dy = screenY - pointerY;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = pointerOn ? Math.max(0, 1 - distance / reach) : 0;
      for (let axis = 0; stirred && axis < 2; axis += 1) {
        const speed =
          ((wake[w + 2 + axis] ?? 0) +
            force * (((axis ? dy : dx) / distance) * 2.4 + (axis ? pushY : pushX) * 0.2) -
            (wake[w + axis] ?? 0) * 0.06) *
          0.86;
        wake[w + 2 + axis] = speed;
        wake[w + axis] = (wake[w + axis] ?? 0) + speed;
      }

      if (screenY >= water || screenX < 0 || screenX >= width || screenY < 0) continue;
      const at = Math.floor(screenY / cell) * columns + Math.floor(screenX / (cell * 0.6));
      // Nearer points weigh more: the front face reads denser than the back.
      cells[at] = (cells[at] ?? 0) + 0.6 + (0.4 * z2) / (scale * 0.1 + Math.abs(z2));
    }
    pushX /= 2;
    pushY /= 2;
    if (!full) {
      const filled = cells.filter((value) => value > 0).sort();
      full = filled[Math.floor(filled.length * 0.85)] ?? 1;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    // Read on every frame, so the ink follows the theme toggle.
    context.fillStyle = getComputedStyle(canvas).color;
    context.font = `600 ${String(cell * ratio)}px ${mono}`;
    context.textBaseline = 'top';
    for (let at = 0; at < cells.length; at += 1) {
      const level = (cells[at] ?? 0) / full;
      if (level < 0.05) continue;
      context.fillText(
        RAMP.charAt(glyphIndex(level)),
        Math.round((at % columns) * cell * 0.6 * ratio),
        Math.round(Math.floor(at / columns) * cell * ratio),
      );
    }

    // The reflection: thin strips copied from above the waterline to below it, in reverse
    // order, fading and swaying more the further they are from the edge. Only the solid's span
    // is copied, and only as deep as the solid is tall.
    const strip = 4 * ratio;
    const top = water * ratio;
    const left = Math.max(0, (width / 2 - scale * 1.3) * ratio);
    const span = Math.min(canvas.width - left, scale * 2.6 * ratio);
    const depth = Math.min(canvas.height - top, scale * halfHeight * 2.4 * ratio);
    mirror.clearRect(0, 0, canvas.width, top);
    mirror.drawImage(canvas, 0, 0);
    for (let index = 0; index * strip < depth; index += 1) {
      const source = top - (index + 1) * strip * 1.25;
      if (source < 0) break;
      context.globalAlpha = 0.3 * (1 - (index * strip) / depth) ** 2;
      context.drawImage(
        mirror.canvas,
        left,
        source,
        span,
        strip * 1.25,
        left + Math.sin(index * 0.5 - t * 2.4) * (1 + index * 0.08) * ratio,
        top + index * strip,
        span,
        strip,
      );
    }
    context.globalAlpha = 1;
  };

  resize();
  // Resizes and theme changes redraw at once; in motion the next frame would anyway.
  new ResizeObserver(() => {
    resize();
    frame(0);
  }).observe(canvas);
  new MutationObserver(() => {
    frame(0);
  }).observe(document.documentElement, { attributeFilter: ['data-theme'] });
  canvas.dataset.ready = '';
  if (still) return;

  // The wake follows a mouse or a pen, as the lamp on the home painting does.
  addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const box = canvas.getBoundingClientRect();
    if (pointerOn) {
      pushX = event.clientX - box.left - pointerX;
      pushY = event.clientY - box.top - pointerY;
    }
    pointerX = event.clientX - box.left;
    pointerY = event.clientY - box.top;
    pointerOn = true;
    moved = event.timeStamp;
  });
  // Leaving the window: the wake settles.
  document.addEventListener('pointerout', (event) => {
    if (!event.relatedTarget) pointerOn = false;
  });

  // 25 frames a second while the pointer stirs it, 12 at rest: enough for text, whose grid
  // quantises motion anyway. The browser pauses it in a background tab.
  let last = 0;
  const loop = (time: number): void => {
    if (time - last > (time - moved < 2000 ? 38 : 80)) {
      last = time;
      frame(time);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};
