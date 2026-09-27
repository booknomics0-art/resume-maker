import { useMemo } from 'react';
import TemplateGallery from './TemplateGallery';
import { sampleResume } from '../lib/store';
import { TEMPLATE_COUNT } from '../lib/templates';
import { navigate } from '../App';

export default function TemplateLibrary() {
  const sample = useMemo(() => sampleResume(), []);
  return <div className="template-library"><div className="page-head"><div><span className="studio-eyebrow">FIND YOUR FIRST IMPRESSION</span><h1 className="page-title">A design for your next chapter.</h1><p className="page-sub">Explore {TEMPLATE_COUNT} free templates. Preview every detail before you choose.</p></div></div><div className="notice">These previews use sample content. Your own details will appear when you start editing.</div><TemplateGallery r={sample} onSelect={(id) => { try { sessionStorage.setItem('craftcv.selected-template', id); } catch {} navigate('/editor/new'); }} /></div>;
}
