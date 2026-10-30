// Dictionary parity tests: the French dictionary must have exactly the same
// keys and value kinds (string, function, array) as the English one, so no
// screen ever falls back to a blank or an untranslated label at runtime.
import assert from "node:assert/strict";
import test from "node:test";

import { en } from "./en.ts";
import { fr } from "./fr.ts";

function shape(v: unknown, path: string, out: string[]): string[] {
  if (typeof v === "function") out.push(`${path}:fn${v.length}`);
  else if (Array.isArray(v)) { out.push(`${path}:array${v.length}`); v.forEach((x, i) => shape(x, `${path}[${i}]`, out)); }
  else if (v && typeof v === "object") Object.keys(v).sort().forEach((k) => shape((v as Record<string, unknown>)[k], `${path}.${k}`, out));
  else out.push(`${path}:${typeof v}`);
  return out;
}

test("French dictionary has the same shape as English", () => {
  assert.deepEqual(shape(fr, "t", []), shape(en, "t", []));
});

test("no French string is left empty where English has text", () => {
  const blanks: string[] = [];
  const walk = (a: unknown, b: unknown, p: string) => {
    if (typeof a === "string" && a !== "" && b === "") blanks.push(p);
    else if (a && typeof a === "object") for (const k of Object.keys(a)) walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${p}.${k}`);
  };
  walk(en, fr, "t");
  assert.deepEqual(blanks, []);
});

test("templated functions produce text in both languages", () => {
  assert.match(fr.members.listBody(2, "Acme"), /2 membres/);
  assert.match(en.members.listBody(1, "Acme"), /1 member in Acme/);
  assert.match(fr.checklist.progress(1, 4), /1 étape sur 4/);
});
