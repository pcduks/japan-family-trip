# Your CV goes here

Drop your PDF in this folder as `Pedro-Parra-CV.pdf` (or change `cv.file` in `content/profile.json`).
The "Download CV" button on the site links straight to it.

Everything in `public/` is published as-is, so only put a version here that you are happy to have on the open web
(for example, one without your phone number).

To refresh the site's text from a new CV, run `npm run import-cv -- public/cv/Pedro-Parra-CV.pdf`.
It writes `content/profile.draft.json` for you to review and merge into `content/profile.json`.
