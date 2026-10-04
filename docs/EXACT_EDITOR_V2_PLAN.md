# Exact Editor V2

Goal: preserve the uploaded resume visually while keeping editing simple and non-destructive.

## Keep
- Existing OCR/parser and structured editor.
- Original source file capture in IndexedDB.
- Original PDF/image as the visual source of truth.
- Original-file download.

## Replace
- Remove the always-on Word-like fragment toolbar UX from the imported-resume default.
- Do not make every PDF text fragment a visible editable box.
- Do not rebuild the uploaded resume into a CraftCV template for the exact view.

## V2 UX
- Default opens in **Original** view: clean, untouched resume only.
- **Quick edit** mode is explicit.
- Clicking a text line selects it without changing the page until the user edits.
- Editing controls live in a compact side panel on desktop and bottom sheet on mobile.
- Only changed text is overlaid; photos/graphics/layout remain locked.
- Compare switch lets the user instantly see Original vs Edited.
- Always offer **Download original** separately from **Download edited copy**.

## Motion
- Route transitions should be owned by React, not only a global DOM listener.
- Re-clicking Upload should replay the transition and scroll the workspace to the top.
