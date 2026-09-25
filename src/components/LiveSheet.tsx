/**
 * LiveSheet — the A4 resume preview that sits next to the form.
 *
 * Thin wrapper over DeviceSheet in 'a4' mode: the sheet is laid out at true A4
 * pixels (794×1123), scaled to the pane width inside an exact-size frame, and
 * grows to show extra pages when the content is longer than one page.
 */

import DeviceSheet from './DeviceSheet';
import type { Resume } from '../lib/types';

export default function LiveSheet({ r, maxHeight }: { r: Resume; maxHeight?: number }) {
  return (
    <div className="live-sheet" style={maxHeight ? { maxHeight } : undefined}>
      <DeviceSheet r={r} mode="a4" idPrefix="live" />
    </div>
  );
}
