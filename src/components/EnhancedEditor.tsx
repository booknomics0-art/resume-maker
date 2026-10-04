import { useState } from 'react';
import Editor from './Editor';
import ExactResumeEditor from './ExactResumeEditor';
import MobileExactResumeEditor from './MobileExactResumeEditor';
import { importInfoFor } from '../lib/importDraft';

/**
 * Keeps the existing guided editor intact. Freshly imported resumes open in
 * Exact Edit first so the uploaded page artwork, photo, spacing and alignment
 * stay visually locked to the source file. Phones use a lighter Exact surface
 * to avoid the desktop editor's large canvases, cramped sticky controls and
 * tiny text hit-targets.
 */
export default function EnhancedEditor({ id }: { id: string }) {
  const [mode, setMode] = useState<'exact' | 'guided'>(() =>
    id !== 'new' && !!importInfoFor(id) ? 'exact' : 'guided'
  );
  const [mobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches);

  if (mode === 'guided') return <Editor id={id} />;

  if (mobile) {
    return <MobileExactResumeEditor id={id} onOpenGuided={() => setMode('guided')} />;
  }

  return <ExactResumeEditor id={id} onOpenGuided={() => setMode('guided')} />;
}
