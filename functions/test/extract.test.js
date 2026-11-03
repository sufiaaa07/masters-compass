import { test } from "node:test";
import assert from "node:assert/strict";
import { clean, checkInput, extractProgram, SCHEMA, FIELDS } from "../extract.js";

const f = (value, evidence = "quote") => ({ value, evidence });
const full = over => ({ ...Object.fromEntries(Object.keys(FIELDS).map(k => [k, f(null, null)])), notes: null, ...over });

test("schema requires every field (OpenAI strict mode)", () => {
  assert.deepEqual(SCHEMA.required.sort(), [...Object.keys(FIELDS), "notes"].sort());
  for (const k of Object.keys(FIELDS)) assert.deepEqual(SCHEMA.properties[k].required, ["value", "evidence"]);
});

test("clean keeps valid values and drops bad ones", () => {
  const out = clean(full({
    uni: f(" TU Munich "), dl: f("2027-01-15"), tuition: f("12,000"), appfee: f("€75"),
    cur: f("EUR"), eng: f("IELTS 6.5"), notes: "Two rounds; final is Jan 15."
  }));
  assert.equal(out.fields.uni.value, "TU Munich");
  assert.equal(out.fields.dl.value, "2027-01-15");
  assert.equal(out.fields.tuition.value, "12000");
  assert.equal(out.fields.appfee, undefined, "non-numeric amount dropped");
  assert.equal(out.fields.cur.value, "EUR");
  assert.equal(out.notes, "Two rounds; final is Jan 15.");
  assert.equal(out.fields.name, undefined, "null values are left out");
});

test("clean rejects malformed dates and unknown currencies", () => {
  const out = clean(full({ dl: f("15 Jan 2027"), cur: f("JPY") }));
  assert.equal(out.fields.dl, undefined);
  assert.equal(out.fields.cur, undefined);
  assert.deepEqual(clean(null), { fields: {}, notes: "" });
});

test("checkInput needs real page text and caps length", () => {
  assert.ok(checkInput({ text: "short" }).error);
  const r = checkInput({ text: "x".repeat(70000), url: "https://example.edu" });
  assert.equal(r.text.length, 60000);
  assert.equal(r.truncated, true);
});

test("extractProgram sends strict json_schema and parses output", async () => {
  let sent;
  const client = { responses: { create: async req => { sent = req; return { output_text: JSON.stringify(full({ uni: f("ETH Zurich"), cur: f("CHF") })) }; } } };
  const out = await extractProgram(client, "test-model", { text: "page text ".repeat(10), url: "https://ethz.ch" });
  assert.equal(sent.model, "test-model");
  assert.equal(sent.text.format.type, "json_schema");
  assert.equal(sent.text.format.strict, true);
  assert.match(sent.input, /<page>/);
  assert.equal(out.fields.uni.value, "ETH Zurich");
  assert.equal(out.fields.cur.value, "CHF");
});

test("extractProgram survives non-JSON output", async () => {
  const client = { responses: { create: async () => ({ output_text: "sorry" }) } };
  assert.deepEqual(await extractProgram(client, "m", { text: "x".repeat(50) }), { fields: {}, notes: "" });
});
