## What does this change?

<!-- One or two sentences. If it closes an issue, write "Closes #123". -->

## Why?

<!-- What was wrong or missing. Skip if it's obvious from the above. -->

## How did you verify it?

<!-- There's no test suite yet, so say what you actually did.
     e.g. "Played to day 40 on Competitive, shipped 2 features, confirmed churn
     applied on the month tick and cash matched the expected figure." -->

## Checklist

- [ ] `npx tsc -b` passes
- [ ] `npm run build` succeeds
- [ ] I used the tokens in `src/styles/colors.css` rather than hardcoded colours
- [ ] If I changed analytics or leaderboard logic, I updated **both** `server/` and `api/`
- [ ] This PR does one thing
