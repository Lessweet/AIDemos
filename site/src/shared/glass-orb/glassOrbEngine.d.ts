/* glassOrbEngine.js 的类型声明(引擎从 design-gallery 原样搬入,保持 JS 不动) */
export interface GlassOrbGalaxy {
  speed?: number;
  spin?: number;
  starDensity?: number;
  aurora?: number;
  meteor?: number;
  colorful?: number;
}
export interface GlassOrbOptions {
  size?: number;
  seed?: string;
  archetype?: 'spiral' | 'nebula' | 'core' | 'deep' | 'auto';
  background?: string;
  palette?: { anchor?: string; accents?: [string, string, string] };
  galaxy?: GlassOrbGalaxy;
  glass?: Record<string, number>;
}
export interface GlassOrbHandle {
  canvas: HTMLCanvasElement;
  setAudio(v: number): void;
  set(o: {
    palette?: GlassOrbOptions['palette'];
    galaxy?: GlassOrbGalaxy;
    archetype?: GlassOrbOptions['archetype'];
    background?: string;
  }): void;
  setGlass(o: Record<string, number>): void;
  destroy(): void;
}
export function createGlassOrb(
  container: HTMLElement,
  opts?: GlassOrbOptions,
): GlassOrbHandle | null;
