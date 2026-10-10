# Guest-first resume flow QA

Expected behavior:

1. Signed-out visitor can open `/editor/new` and fill all resume steps without an account.
2. Guest edits are held only in session storage and never added to the account dashboard/cloud before auth.
3. First guest PDF export succeeds without auth and records the one-time browser entitlement.
4. A later guest PDF export sends the user to free sign-up/login, preserving the current temporary draft.
5. Successful sign-up/login claims that draft into the authenticated resume store and reopens it.
6. Signed-in users keep the existing unlimited PDF and autosave behavior.
