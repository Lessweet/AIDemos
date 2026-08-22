/* silkPillEngine.js 的类型声明(引擎自 design-gallery 搬入,含平滑变速补丁) */
export interface SilkParams {
  speed?: number;
  rotate?: number;
  scale?: number;
  contrast?: number;
  sheen?: number;
  grain?: number;
  drift?: number;
  radius?: number;
}
export interface SilkPillOptions {
  width?: number;
  height?: number;
  seed?: string;
  colors?: string[];
  grainColor?: string;
  fluid?: boolean;
  silk?: SilkParams;
}
export interface SilkPillHandle {
  canvas: HTMLCanvasElement;
  setAudio(v: number): void;
  resize(w: number, h: number): void;
  set(o: { colors?: string[]; grainColor?: string; silk?: SilkParams }): void;
  destroy(): void;
}
export function createSilkPill(
  container: HTMLElement,
  opts?: SilkPillOptions,
): SilkPillHandle | null;
