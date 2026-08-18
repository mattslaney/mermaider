export const layouts = ['auto', 'source-left', 'preview-top', 'preview-left', 'source-top'] as const;

export type Layout = (typeof layouts)[number];
export type Pane = 'source' | 'preview';
export type Axis = 'horizontal' | 'vertical';

export interface ResolvedLayout {
  axis: Axis;
  first: Pane;
}

export function resolveLayout(layout: Layout, width: number, height: number): ResolvedLayout {
  if (layout === 'auto') {
    return width >= height
      ? { axis: 'horizontal', first: 'source' }
      : { axis: 'vertical', first: 'source' };
  }

  return {
    axis: layout === 'source-left' || layout === 'preview-left' ? 'horizontal' : 'vertical',
    first: layout.startsWith('source') ? 'source' : 'preview',
  };
}

export function clampRatio(ratio: number): number {
  return Math.min(0.85, Math.max(0.15, ratio));
}
