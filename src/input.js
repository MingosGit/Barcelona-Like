// Entrada: joystick virtual táctil + teclado (WASD / flechas) para pruebas en escritorio.
export class Input {
  constructor() {
    this.keys = new Set();
    this.joy = null; // { id, baseX, baseY, dx, dy }
    this.joyEl = document.getElementById("joy");
    this.baseEl = document.getElementById("joybase");
    this.knobEl = document.getElementById("joyknob");

    window.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));

    const canvas = document.getElementById("game");
    canvas.addEventListener("touchstart", (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener("touchend", (e) => this.onTouchEnd(e), { passive: false });
    canvas.addEventListener("touchcancel", (e) => this.onTouchEnd(e), { passive: false });
  }

  onTouchStart(e) {
    e.preventDefault();
    if (this.joy) return;
    const t = e.changedTouches[0];
    this.joy = { id: t.identifier, baseX: t.clientX, baseY: t.clientY, dx: 0, dy: 0 };
    this.joyEl.style.display = "block";
    this.baseEl.style.left = t.clientX + "px";
    this.baseEl.style.top = t.clientY + "px";
    this.moveKnob(t.clientX, t.clientY);
  }

  onTouchMove(e) {
    e.preventDefault();
    if (!this.joy) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== this.joy.id) continue;
      const R = 55;
      let dx = t.clientX - this.joy.baseX;
      let dy = t.clientY - this.joy.baseY;
      const l = Math.hypot(dx, dy);
      if (l > R) { dx = (dx / l) * R; dy = (dy / l) * R; }
      this.joy.dx = dx / R;
      this.joy.dy = dy / R;
      this.moveKnob(this.joy.baseX + dx, this.joy.baseY + dy);
    }
  }

  onTouchEnd(e) {
    e.preventDefault();
    if (!this.joy) return;
    for (const t of e.changedTouches) {
      if (t.identifier === this.joy.id) {
        this.joy = null;
        this.joyEl.style.display = "none";
      }
    }
  }

  moveKnob(x, y) {
    this.knobEl.style.left = x + "px";
    this.knobEl.style.top = y + "px";
  }

  // Vector de movimiento normalizado (magnitud <= 1).
  getMove() {
    if (this.joy) return { x: this.joy.dx, y: this.joy.dy };
    let x = 0, y = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) x += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) y -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) y += 1;
    const l = Math.hypot(x, y);
    return l > 1 ? { x: x / l, y: y / l } : { x, y };
  }
}
