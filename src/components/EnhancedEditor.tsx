import { useState } from 'react';
import Editor from './Editor';
import ExactResumeEditor from './ExactResumeEditor';
import MobileExactResumeEditor from './MobileExactResumeEditor';
import PremiumPdfEditor from './PremiumPdfEditor';
import { importInfoFor } from '../lib/importDraft';

type ImportEditorMode = 'exact' | 'word' | 'guided';

/**
 * Imported resumes always keep the original file as the visual source of truth.
 * Exact mode is a clean untouched view, Premium edit works directly on top of
 * that source PDF/image, and Structured mode remains available for field-level
 * OCR/template editing. Fresh resumes still open in the guided editor.
 */
export default function EnhancedEditor({ id }: { id: string }) {
  const imported = id !== 'new' && !!importInfoFor(id);
  const [mode, setMode] = useState<ImportEditorMode>(() => imported ? 'exact' : 'guided');
  const [mobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches);

  if (!imported) return <Editor id={id} />;

  let surface: React.ReactNode;
  if (mode === 'guided') {
    surface = <Editor id={id} />;
  } else if (mode === 'word') {
    surface = <PremiumPdfEditor id={id} onOpenGuided={() => setMode('guided')} onOpenExact={() => setMode('exact')} />;
  } else if (mobile) {
    surface = <MobileExactResumeEditor id={id} onOpenGuided={() => setMode('guided')} />;
  } else {
    surface = <ExactResumeEditor id={id} onOpenGuided={() => setMode('guided')} />;
  }

  return (
    <div className="import-editor-shell">
      <div className="import-editor-switch no-print" role="tablist" aria-label="Imported resume editor mode">
        <div className="import-editor-copy">
          <b>Edit uploaded resume</b>
          <span>
            {mode === 'exact' && 'Original view keeps the uploaded PDF/photo completely untouched.'}
            {mode === 'word' && 'Premium edit changes text on the real PDF instead of rebuilding your resume into a template.'}
            {mode === 'guided' && 'Structured edit is best for changing parsed resume fields and templates.'}
          </span>
        </div>
        <div className="import-editor-tabs">
          <button type="button" role="tab" aria-selected={mode === 'exact'} className={mode === 'exact' ? 'active' : ''} onClick={() => setMode('exact')}>
            Original
          </button>
          <button type="button" role="tab" aria-selected={mode === 'word'} className={mode === 'word' ? 'active' : ''} onClick={() => setMode('word')}>
            Premium edit
          </button>
          <button type="button" role="tab" aria-selected={mode === 'guided'} className={mode === 'guided' ? 'active' : ''} onClick={() => setMode('guided')}>
            Structured
          </button>
        </div>
      </div>
      {surface}
      <style>{`
        .import-editor-shell{min-width:0}
        .import-editor-switch{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 14px;padding:10px 12px;border:1px solid var(--silver-200);border-radius:12px;background:#fff;box-shadow:0 4px 16px rgba(15,33,72,.06)}
        .import-editor-copy{display:grid;gap:2px;min-width:0}.import-editor-copy b{font-size:13px;color:var(--navy-900)}.import-editor-copy span{font-size:11.5px;color:var(--silver-600);line-height:1.35}
        .import-editor-tabs{display:flex;gap:4px;padding:3px;border-radius:9px;background:var(--silver-100);flex:0 0 auto}
        .import-editor-tabs button{border:0;background:transparent;color:var(--navy-700);border-radius:7px;padding:7px 11px;font:inherit;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap}
        .import-editor-tabs button.active{background:#fff;color:var(--navy-900);box-shadow:0 1px 5px rgba(15,33,72,.13)}
        @media(max-width:760px){.import-editor-switch{display:block;padding:8px;margin-bottom:10px}.import-editor-copy{margin-bottom:7px}.import-editor-tabs{width:100%;overflow-x:auto;scrollbar-width:none}.import-editor-tabs::-webkit-scrollbar{display:none}.import-editor-tabs button{flex:1 0 auto;padding:8px 10px;font-size:11.5px}}
      `}</style>
    </div>
  );
}
