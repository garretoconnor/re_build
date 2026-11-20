// Rotate the live board about its center. Pull the camera back just far enough
// that even the nearest projected corner stays inside the original map frame.
function planeTransform(width: number, height: number, yaw: number, pitch: number) {
  const radians = Math.PI / 180;
  const cx = Math.cos(pitch * radians), sx = Math.sin(pitch * radians);
  const cy = Math.cos(yaw * radians), sy = Math.sin(yaw * radians);
  const distance = 1.5 * Math.max(width, height);
  let retreat = 0;
  for (const x of [-width / 2, width / 2]) {
    for (const y of [-height / 2, height / 2]) {
      const rx = x * cy;
      const ry = y * cx + x * sy * sx;
      const rz = y * sx - x * sy * cx;
      const extent = Math.max(2 * Math.abs(rx) / width, 2 * Math.abs(ry) / height);
      retreat = Math.max(retreat, rz + distance * (extent - 1));
    }
  }
  return `perspective(${distance}px) translateZ(${-retreat}px) rotateX(${pitch}deg) rotateY(${yaw}deg)`;
}

export function enableMapRotation(
  viewport: HTMLElement, board: HTMLElement, reset: HTMLButtonElement, hideTip: () => void
) {
  let yaw = 0, pitch = 0;
  let dragged = false;
  let pointer: {id: number, x: number, y: number} | null = null;

  function draw() {
    reset.hidden = yaw === 0 && pitch === 0;
    viewport.classList.toggle('rotated', !reset.hidden);
    board.style.transform = reset.hidden ? '' : planeTransform(board.offsetWidth, board.offsetHeight, yaw, pitch);
  }
  function turn(horizontal: number, vertical: number) {
    yaw = (yaw + horizontal) % 360;
    pitch = Math.max(-85, Math.min(85, pitch + vertical));
    draw();
  }
  function faceForward() {
    yaw = pitch = 0;
    hideTip();
    draw();
    viewport.focus({preventScroll: true});
  }
  reset.addEventListener('click', faceForward);
  new ResizeObserver(draw).observe(board);
  viewport.addEventListener('keydown', e => {
    if (e.target !== viewport || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    switch (e.key) {
      case 'ArrowLeft': turn(-10, 0); break;
      case 'ArrowRight': turn(10, 0); break;
      case 'ArrowUp': turn(0, 10); break;
      case 'ArrowDown': turn(0, -10); break;
      case 'Home': faceForward(); break;
      default: return;
    }
    e.preventDefault();
  });

  function release() {
    pointer = null;
    viewport.classList.remove('dragging');
  }
  viewport.addEventListener('pointerdown', e => {
    if (!e.isPrimary) {
      // Give two-finger scrolling and pinch zoom entirely to the browser.
      dragged = true;
      release();
      hideTip();
      return;
    }
    if (e.button !== 0 || e.target === viewport) return;
    dragged = false;
    pointer = {id: e.pointerId, x: e.clientX, y: e.clientY};
  });
  window.addEventListener('pointermove', e => {
    if (!pointer || e.pointerId !== pointer.id) return;
    if (!e.buttons) {
      release();
      return;
    }
    const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
    if (!dragged) {
      if (Math.hypot(dx, dy) < 6) return;
      dragged = true;
      viewport.setPointerCapture(e.pointerId);
      viewport.classList.add('dragging');
      hideTip();
    }
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    const degreesPerPixel = 180 / Math.min(800, viewport.clientWidth);
    turn(dx * degreesPerPixel, -dy * degreesPerPixel);
  });
  function endPointer(e: PointerEvent) {
    if (e.pointerId === pointer?.id) release();
  }
  window.addEventListener('pointerup', endPointer);
  window.addEventListener('pointercancel', endPointer);
  viewport.addEventListener('lostpointercapture', e => {
    if (e.target === viewport) endPointer(e);
  });
  window.addEventListener('blur', release);
  viewport.addEventListener('click', e => {
    // Some browsers dispatch a click after a drag. Keyboard clicks have detail 0.
    if (dragged && e.detail > 0) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
}
