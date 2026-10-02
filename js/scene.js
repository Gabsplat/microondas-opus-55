// Base común de los capítulos: reloj propio, fases, notas y foco interactivo.
export const PHASES = ['Preparación', 'Dibujo', 'Descubrimiento', 'Demostración', 'Reposo'];

export class Scene {
  constructor() {
    this.t = 0;
    this.paused = false;
    this.built = false;
    this.visited = false;
    this.focus = null;
    this.focusRev = 0;
    this.loop = false; // ¿sigue animando en reposo?
    this.world = { x: 0, y: 0, w: 1600, h: 1000 };
  }
  ensure() {
    if (!this.built) {
      this.build();
      this.built = true;
    }
  }
  setFocus(r) {
    this.focus = r;
    this.focusRev++;
  }
  reset() {
    this.t = 0;
    this.setFocus(null);
    this.resetState?.();
  }
  phaseIndex(t = this.t) {
    let i = 0;
    for (let k = 0; k < this.phases.length; k++) if (t >= this.phases[k]) i = k;
    return t >= this.dur ? 4 : Math.min(i, 3);
  }
  tick(dt) {
    this.t += dt;
    this.sim?.(dt);
  }
  // ¿Necesita redibujar aunque nada cambie desde afuera?
  animating() {
    return this.t < this.dur + 400 || this.loop || this.busy?.();
  }
  camera() { return this.world; }
  noteKey() { return 'intro'; }
  // Punto (en el mundo) desde el que la siguiente idea nace.
  exitPoint() { return null; }
  controls() { return ''; }
  bind() {}
  onPick() {}
  onHover() {}
}
