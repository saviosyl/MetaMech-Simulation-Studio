GOLDMETA LEARN + AUDIO — TRANSFER PACKAGE
=========================================

Source Learn commit:
4c4c8012b3704653f13b8f83434d342850e4d0bd

Production base (apply patch ON TOP of this commit):
36b9a8518c2de496a6b52243040c9b665b1f187a

Branch name used by authoring agent:
cursor/learn-goldsmeta-audio-c2c2

Feature modified in this package:
NO (exact reviewed implementation only)

Production deployed:
NO

------------------------------------------------
WHAT THIS PATCH CONTAINS
------------------------------------------------

- Route /learn (lesson home)
- Route /learn/:lessonId (lesson detail)
- All 21 beginner lessons
- Read Along (text identical to spoken script)
- Play / Pause / Resume / Restart audio controls
- Browser/device text-to-speech (Web Speech API)
- English voice selection
- Educational diagrams
- Learn navigation entry (desktop Account + mobile More → Account)
- Help → Learn link

No Decision Engine / Score / Plan / Market Report calculation /
qualification / AutoTrade / broker / Live changes.

------------------------------------------------
CHANGED FILES
------------------------------------------------

web/src/App.tsx
web/src/components/layout/AppShell.tsx
web/src/components/learn/LearnDiagrams.tsx
web/src/components/learn/LessonAudioPlayer.tsx
web/src/lib/learn/lessons.ts
web/src/lib/learn/speechController.ts
web/src/lib/learn/types.ts
web/src/main.tsx
web/src/pages/HelpPage.tsx
web/src/pages/LearnPage.test.tsx
web/src/pages/LearnPage.tsx
web/src/pages/RouteInventory.test.tsx
web/src/pages/UiReviewApp.tsx
web/src/styles/learn.css

------------------------------------------------
EXACT COMMANDS TO APPLY THE PATCH
------------------------------------------------

# 1) Open GOLDSMETA with write access and fetch
git fetch origin

# 2) Start from the approved production base
git checkout 36b9a8518c2de496a6b52243040c9b665b1f187a
git checkout -b cursor/learn-goldsmeta-audio-c2c2

# 3) Apply this patch (preferred — verified on the CRLF production tree)
git apply --index /path/to/learn-goldsmeta.patch
git commit -m "feat(web): Learn GoldMeta education hub with audio guide"

# Optional alternate:
# git am --ignore-whitespace /path/to/learn-goldsmeta.patch

# 4) Verify tree matches the reviewed source commit
git rev-parse HEAD^{tree}
# Expected tree:
# 418f6bd8babc6b917451776224ef23cf01241863
#
# Or, if the source commit is available locally:
# git diff --stat 4c4c8012b3704653f13b8f83434d342850e4d0bd

# 5) Quick checks
cd web
npm ci
npx vitest run src/pages/LearnPage.test.tsx src/pages/RouteInventory.test.tsx
npx tsc -b --pretty false

# 6) Push from a GitHub-connected agent with write access to saviosyl/GOLDSMETA
git push -u origin cursor/learn-goldsmeta-audio-c2c2

DO NOT deploy until human review.
