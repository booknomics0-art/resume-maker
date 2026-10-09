# Fresher Mode 2.0

Fresher Mode is an additive entry-level workflow built on the existing `Resume.fresher` flag.

## Safety invariants

- No parallel resume model or database migration.
- No fake work experience, achievements, metrics or skills are generated.
- Formal work experience is not part of the Fresher Readiness score.
- Existing editor, PDF export, auth, import/OCR, ATS, Recruiter View and job-specific copy flows remain unchanged.
- Entry-level templates are prioritized only when `resume.fresher === true`; other resumes keep the existing ranking.

## Fresher Readiness

The 100-point guide uses six user-controlled signals:

- Target role — 15
- Contact basics — 15
- Education — 20
- Role-relevant skills — 15
- Project proof — 25
- Extra proof (portfolio/LinkedIn, certification or achievement) — 10

The guide is advisory, never a download gate.
