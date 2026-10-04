import { useState } from 'react';
import Editor from './Editor';
import ExactResumeEditor from './ExactResumeEditor';
import { importInfoFor } from '../lib/importDraft';

/**
 * Keeps the existing guided editor intact. Freshly imported resumes open in
 * Exact Edit first so the uploaded page artwork, photo, spacing and alignment
 * stay visually locked to the source file. Users can still switch to the
 * structured editor whenever they want the normal CraftCV workflow.
 */
export default function EnhancedEditor({ id }: { id: string }) {
  const [mode, setMode] = useState<'exact' | 'guided'>(() =>
    id !== 'new' && !!importInfoFor(id) ? 'exact' : 'guided'
  );

  if (mode === 'guided') return <Editor id={id} />;

  return <ExactResumeEditor id={id} onOpenGuided={() => setMode('guided')} />;
}
