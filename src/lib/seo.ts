const ORIGIN='https://www.resumemakery.com';
const PUBLIC: Record<string,{title:string;description:string}> = {
  '/':{title:'Free ATS Resume Builder India | 50 Templates | ResumeMakery',description:'Build, import, edit and ATS-check your resume free. 50 professional templates, clean PDF downloads, no watermark, built for Indian freshers and professionals.'},
  '/resume-builder':{title:'Free ATS Resume Builder for India | ResumeMakery',description:'Create an ATS-friendly resume free with 50 templates, live preview, existing-resume import and clean PDF downloads with no watermark.'},
  '/ats-resume-checker':{title:'Free ATS Resume Checker 2.0 — Job Match + Resume Score | ResumeMakery',description:'Check job-description match and resume readiness separately, then get prioritized Issue → Why → Fix guidance while you edit.'},
  '/job-description-resume-match':{title:'Resume vs Job Description Match Checker | ResumeMakery',description:'Compare your resume with a real job description, see covered and missing role terms, identify evidence gaps and re-check while editing.'},
  '/ats-keyword-checker':{title:'Free ATS Keyword Checker — Find Missing Resume Keywords | ResumeMakery',description:'Extract relevant job-description terms, see covered and missing resume keywords, and identify matched skills that still need evidence.'},
  '/resume-score-checker':{title:'Free Resume Score Checker — Resume Readiness | ResumeMakery',description:'Check contact completeness, summary quality, evidence bullets, measurable results, action verbs and readability separately from job match.'},
  '/resume-editor':{title:'Edit Existing Resume Online — PDF & DOCX | ResumeMakery',description:'Upload a PDF, DOCX, TXT or resume photo, extract the content into editable fields, improve it and export a clean professional PDF.'},
  '/resume-templates':{title:'50 Free ATS-Friendly Resume Templates | ResumeMakery',description:'Browse 50 unlocked professional and fresher resume templates. Switch layouts without retyping and download clean PDFs with no watermark.'},
  '/resume-for-freshers':{title:'Free Resume Maker for Freshers & Students India | ResumeMakery',description:'Create a focused fresher resume with education, projects, internships and skills, then compare it with real job descriptions before applying.'},
  '/about':{title:'About ResumeMakery',description:'Learn why ResumeMakery exists and how the free resume builder is designed for job seekers.'},
  '/faq':{title:'ResumeMakery FAQ — Resume Builder, ATS & Downloads',description:'Answers about ResumeMakery templates, resume imports, ATS matching, privacy and clean PDF downloads.'},
  '/privacy':{title:'Privacy Policy | ResumeMakery',description:'How ResumeMakery handles account data, resume content, imports, analytics and user privacy.'},
  '/terms':{title:'Terms of Service | ResumeMakery',description:'Terms for using the ResumeMakery free resume builder.'},
  '/contact':{title:'Contact ResumeMakery',description:'Contact ResumeMakery about the resume builder, privacy or product support.'},
  '/cookies':{title:'Cookie Policy | ResumeMakery',description:'Cookie and analytics information for ResumeMakery.'},
  '/disclaimer':{title:'Disclaimer | ResumeMakery',description:'Important limitations and disclaimers for ResumeMakery and ATS guidance.'},
  '/eula':{title:'EULA | ResumeMakery',description:'End-user licence terms for ResumeMakery.'}
};
function meta(name:string,value:string,property=false){const selector=property?`meta[property="${name}"]`:`meta[name="${name}"]`;let el=document.head.querySelector(selector) as HTMLMetaElement|null;if(!el){el=document.createElement('meta');property?el.setAttribute('property',name):el.setAttribute('name',name);document.head.appendChild(el)}el.content=value}
export function applySeo(path:string){
  const clean=path.length>1?path.replace(/\/$/,''):path;
  const data=PUBLIC[clean];
  const isPublic=!!data;
  const title=data?.title||'ResumeMakery — Free Resume Builder';
  const description=data?.description||'ResumeMakery resume workspace.';
  const url=`${ORIGIN}${isPublic&&clean!=='/'?clean:''}${clean==='/'?'/':''}`;
  document.title=title;
  meta('description',description);
  meta('robots',isPublic?'index, follow':'noindex, nofollow');
  meta('og:title',title,true);
  meta('og:description',description,true);
  meta('og:url',url,true);
  meta('og:site_name','ResumeMakery',true);
  meta('og:locale','en_IN',true);
  meta('og:image:alt','ResumeMakery free ATS resume builder',true);
  meta('twitter:title',title);
  meta('twitter:description',description);
  meta('twitter:image:alt','ResumeMakery free ATS resume builder');
  let canonical=document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement|null;
  if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}
  canonical.href=url;
}
