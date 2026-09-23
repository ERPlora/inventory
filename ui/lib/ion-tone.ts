// The colour of an `ion-*` element as INLINE custom properties, read from the theme token
// (ERPlora/pm#392). `color="…"` cannot be used in a module: Ionic resolves it through a global
// `.ion-color-*` rule that does not reach inside a shadow root. A `static styles` rule does not work
// either for this module, because half of its coloured elements live in `ion-modal`s that Ionic
// reparents to <body> (inventory#45). Custom properties set on the element itself paint the same in
// all three places: the component's shadow root, `ok-data-table`'s cell and a reparented modal.

export type IonToneKind = 'solid' | 'text' | 'chip';
export type IonTone = 'danger' | 'success' | 'warning' | 'medium';

/** Ionic 8's default palette: the fallback when the theme does not define the token. */
const PALETTE: Record<IonTone, { base: string; rgb: string; contrast: string; shade: string; tint: string }> = {
  danger: { base: '#c5000f', rgb: '197, 0, 15', contrast: '#fff', shade: '#ad000d', tint: '#cb1a27' },
  success: { base: '#2dd55b', rgb: '45, 213, 91', contrast: '#000', shade: '#28bb50', tint: '#42d96b' },
  warning: { base: '#ffc409', rgb: '255, 196, 9', contrast: '#000', shade: '#e0ac08', tint: '#ffca22' },
  medium: { base: '#636469', rgb: '99, 100, 105', contrast: '#fff', shade: '#57585c', tint: '#737478' },
};

/**
 * The `style` value that paints an element in `tone`:
 * - `solid`: a filled `ion-button` (background, its pressed/focused/hover states and its text);
 * - `text`: an `ion-note` (`--color`) or an `ion-icon` (`color`);
 * - `chip`: an `ion-chip`, translucent background and shade text — what `color=` does in Ionic.
 */
export function ionTone(kind: IonToneKind, tone: IonTone): string {
  const p = PALETTE[tone];
  const token = (suffix: string, fallback: string) => `var(--ion-color-${tone}${suffix}, ${fallback})`;
  switch (kind) {
    case 'solid':
      return [
        `--background: ${token('', p.base)}`,
        `--background-activated: ${token('-shade', p.shade)}`,
        `--background-focused: ${token('-shade', p.shade)}`,
        `--background-hover: ${token('-tint', p.tint)}`,
        `--color: ${token('-contrast', p.contrast)};`,
      ].join('; ');
    case 'text':
      return `--color: ${token('', p.base)}; color: ${token('', p.base)};`;
    case 'chip':
      return `--background: rgba(${token('-rgb', p.rgb)}, 0.08); --color: ${token('-shade', p.shade)};`;
  }
}
