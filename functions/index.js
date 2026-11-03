// Cloud Function that reads a pasted university page with the OpenAI API and
// returns deadline, fees and requirements for the Add Program form.
//
// The OpenAI key lives only in Secret Manager (OPENAI_API_KEY) and never
// reaches the browser. Callers must be signed in, and each user gets a small
// daily quota so the key cannot be drained.
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret, defineString, defineInt } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import OpenAI from "openai";
import { checkInput, extractProgram } from "./extract.js";

initializeApp();
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const OPENAI_MODEL = defineString("OPENAI_MODEL", { default: "gpt-5.4-mini" });
const DAILY_LIMIT = defineInt("AI_DAILY_LIMIT", { default: 20 });

export const extractProgramInfo = onCall(
  {
    secrets: [OPENAI_API_KEY],
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "256MiB",
    maxInstances: 5,
    cors: true
  },
  async request => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to use page reading.");
    const input = checkInput(request.data);
    if (input.error) throw new HttpsError("invalid-argument", input.error);

    // Per-user daily quota, stored where client rules deny all access.
    const day = new Date().toISOString().slice(0, 10);
    const ref = getFirestore().doc(`aiUsage/${request.auth.uid}`);
    const allowed = await getFirestore().runTransaction(async tx => {
      const snap = await tx.get(ref);
      const d = snap.exists ? snap.data() : {};
      const used = d.day === day ? d.count || 0 : 0;
      if (used >= DAILY_LIMIT.value()) return false;
      tx.set(ref, { day, count: used + 1, total: FieldValue.increment(1) }, { merge: true });
      return true;
    });
    if (!allowed) throw new HttpsError("resource-exhausted", "Daily page-reading limit reached. Try again tomorrow.");

    try {
      const client = new OpenAI({ apiKey: OPENAI_API_KEY.value() });
      const result = await extractProgram(client, OPENAI_MODEL.value(), input);
      return { ...result, truncated: input.truncated };
    } catch (err) {
      console.error("OpenAI extraction failed", err?.status, err?.message);
      throw new HttpsError("internal", "Could not read the page right now. You can still type the details.");
    }
  }
);
