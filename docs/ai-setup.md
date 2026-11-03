# AI page reading setup

The **Read with AI** button on Add Program sends the pasted page text to a Firebase Cloud Function, `extractProgramInfo` (`functions/index.js`). The function calls the OpenAI Responses API with a strict JSON schema and returns the deadline, tuition, application fee, currency, duration, intake and GRE/English requirements, each with the exact quote it came from. The browser never sees the OpenAI key.

Safeguards:
- Only signed-in users can call it (Firebase Auth is checked on the server).
- Each user gets `AI_DAILY_LIMIT` reads per day (default 20), counted in `aiUsage/{uid}`, which client rules can't touch.
- Page text is capped at 60,000 characters, and the model is told to ignore instructions inside the page.
- The server re-validates everything the model returns (dates must be `YYYY-MM-DD`, amounts must be numbers, currency must be one the app supports).
- Nothing is saved until the person presses **Add to Compass**, and every field still starts as *Needs checking*.

## One-time setup

1. **Blaze plan.** Cloud Functions need the pay-as-you-go plan: Firebase console > Upgrade. Usage at this scale stays inside the free tier; set a budget alert to be safe.
2. **OpenAI key.** Create one at <https://platform.openai.com/api-keys> (a project key with a monthly spend limit is best).
3. **Store it as a secret** (never commit it):
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase functions:secrets:set OPENAI_API_KEY   # paste the key when asked
   ```
4. **Deploy:**
   ```bash
   cd functions && npm install && cd ..
   firebase deploy --only functions,firestore:rules
   ```
   The first deploy asks for `OPENAI_MODEL` (default `gpt-5.4-mini`) and `AI_DAILY_LIMIT` (default 20). Press Enter to accept.
5. **Authorised domain.** If the site is served from a custom domain, make sure it's listed under Firebase console > Authentication > Settings > Authorised domains (already needed for Google sign-in).

## Tests

```bash
cd functions && npm test
```

The tests cover the schema, output validation and the request sent to OpenAI using a fake client, so they need no key.
