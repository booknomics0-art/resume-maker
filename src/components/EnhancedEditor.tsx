import { useState } from 'react';
import Editor from './Editor';
import QuickResumeEditor from './QuickResumeEditor';
import { importInfoFor } from '../lib/importDraft';

/**
 * Keeps the existing guided editor completely intact, but gives freshly
 * imported resumes a much faster Word-like editing surface first.
 *
 * New resumes and normal saved resumes keep the old behaviour. An imported
 * resume opens in Quick Edit, and the user can jump to the full guided editor
 * at any time without losing plain-text changes.
 */
export default function EnhancedEditor({ id }: { id: string }) {
  const [mode, setMode] = useState<'quick' | 'guided'>(() =>
    id !== 'new' && !!importInfoFor(id) ? 'quick' : 'guided'
  );

  if (mode === 'guided') return <Editor id={id} />;

  return <QuickResumeEditor id={id} onOpenGuided={() => setMode('guided')} />;
}
