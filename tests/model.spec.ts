import { expect, test } from "@playwright/test";
import {
  applyAction, createInitialState, isActive, orderedQueue,
  type Action, type ClinicState, type Role, type Vitals,
} from "../src/clinic";

const now = new Date("2026-10-19T09:00:00.000Z");
const vitals: Vitals = { temp: "36.8", pulse: "78", bp: "112/72", spo2: "99", resp: "16", weight: "" };

function fixture() {
  let state = createInitialState(now);
  return {
    get state() { return state; },
    act(role: Role, action: Action) {
      const result = applyAction(state, role, action, now);
      expect(result.error).toBeUndefined();
      state = result.state;
      return result;
    },
    reject(role: Role, action: Action, error: RegExp) {
      const original = JSON.stringify(state);
      const result = applyAction(state, role, action, now);
      expect(result.error).toMatch(error);
      expect(result.state).toBe(state);
      expect(JSON.stringify(state)).toBe(original);
    },
  };
}

function consult(f: ReturnType<typeof fixture>, visitId = "demo-visit-0") {
  f.act("Doctor", { type: "acknowledge", visitId });
  f.act("Doctor", { type: "startConsultation", visitId });
  f.act("Doctor", {
    type: "saveConsultation", visitId, doctorNote: "Assessment documented for demonstration.",
    plan: "Documented care and review plan.", instructions: "Return to clinic for the agreed review.",
  });
}

test("a student cannot acquire two active visits and rejected actions do not mutate state", () => {
  const f = fixture();
  f.reject("Nurse", { type: "create", studentId: "ST-0241" }, /already has an active visit/);
  f.reject("Nurse", { type: "create", studentId: "missing" }, /Student not found/);
  f.act("Nurse", { type: "create", studentId: "ST-0332" });
  expect(f.state.visits.filter((visit) => visit.studentId === "ST-0332" && isActive(visit))).toHaveLength(1);
});

test("nursing handover requires confirmation and a nurse signature; doctor explicitly accepts it", () => {
  const f = fixture();
  const visitId = "demo-visit-2";
  f.reject("Nurse", { type: "sendHandover", visitId, summary: "Please assess." }, /Confirm identity/);
  f.act("Nurse", { type: "confirm", visitId });
  f.act("Nurse", {
    type: "saveTriage", visitId, complaint: "Sore throat", nurseNote: "Assessment recorded.",
    vitals, priority: "Routine", protocol: "",
  });
  f.reject("Nurse", { type: "sendHandover", visitId, summary: "Please assess." }, /Sign the nurse assessment/);
  f.act("Nurse", { type: "sign", visitId });
  f.act("Nurse", { type: "sendHandover", visitId, summary: "Please assess the presenting complaint." });
  f.reject("Doctor", { type: "startConsultation", visitId }, /Accept the nurse handover/);
  f.act("Doctor", { type: "acknowledge", visitId });
  f.reject("Nurse", { type: "sendHandover", visitId, summary: "Changed summary" }, /accepted/);
  f.act("Doctor", { type: "startConsultation", visitId });
  expect(f.state.visits.find((visit) => visit.id === visitId)?.stage).toBe("In consultation");
});

test("nurse and doctor cannot write or sign each other's contributions", () => {
  const f = fixture();
  const visitId = "demo-visit-0";
  f.reject("Nurse", { type: "acknowledge", visitId }, /Only the doctor/);
  consult(f, visitId);
  f.reject("Nurse", { type: "saveConsultation", visitId, doctorNote: "Edited", plan: "Edited", instructions: "Edited" }, /Only the doctor/);
  f.reject("Doctor", {
    type: "saveTriage", visitId, complaint: "Edited", nurseNote: "Edited", vitals, priority: "Routine", protocol: "",
  }, /Only the nurse/);
  f.act("Doctor", { type: "sign", visitId });
  const visit = f.state.visits.find((item) => item.id === visitId)!;
  expect(visit.signatures.map((signature) => signature.role)).toEqual(["Nurse", "Doctor"]);
  expect(visit.stage).toBe("In consultation");
  f.reject("Nurse", { type: "amend", visitId, signatureId: visit.signatures[1].id, reason: "Correction", text: "Changed" }, /own role/);
});

test("signed originals survive amendments and separate discharge updates unchanged", () => {
  const f = fixture();
  const visitId = "demo-visit-0";
  consult(f, visitId);
  f.act("Doctor", { type: "sign", visitId });
  const signature = f.state.visits.find((visit) => visit.id === visitId)!.signatures.find((item) => item.role === "Doctor")!;
  const original = JSON.stringify(signature);
  f.reject("Doctor", { type: "saveConsultation", visitId, doctorNote: "Overwrite", plan: "Overwrite", instructions: "Overwrite" }, /locked/);
  f.act("Doctor", { type: "amend", visitId, signatureId: signature.id, reason: "Clarification", text: "Additional context for the original assessment." });
  f.act("Nurse", { type: "saveInstructions", visitId, instructions: "Updated instructions actually given to student." });
  const current = f.state.visits.find((visit) => visit.id === visitId)!;
  expect(JSON.stringify(current.signatures.find((item) => item.id === signature.id))).toBe(original);
  expect(current.amendments).toHaveLength(1);
  expect(current.instructions).toContain("Updated instructions");
});

test("nurse-only care needs a protocol and a signature; signing never closes the visit", () => {
  const f = fixture();
  const visitId = "demo-visit-2";
  f.act("Nurse", { type: "confirm", visitId });
  f.act("Nurse", { type: "saveTriage", visitId, complaint: "Minor complaint", nurseNote: "Nurse assessment.", vitals, priority: "Routine", protocol: "" });
  f.reject("Nurse", { type: "nurseCare", visitId, protocol: "" }, /approved protocol/);
  f.act("Nurse", { type: "nurseCare", visitId, protocol: "School-approved demonstration protocol v1" });
  f.act("Nurse", { type: "saveInstructions", visitId, instructions: "Follow the agreed review plan." });
  f.reject("Nurse", { type: "route", visitId, stage: "Ready to close" }, /Sign the nurse assessment/);
  f.act("Nurse", { type: "sign", visitId });
  expect(f.state.visits.find((visit) => visit.id === visitId)?.stage).toBe("Nurse care");
  f.act("Nurse", { type: "route", visitId, stage: "Ready to close" });
  f.act("Nurse", { type: "close", visitId });
  expect(f.state.visits.find((visit) => visit.id === visitId)?.stage).toBe("Closed");
});

test("medication prescriptions, dispensing and administration are separate, linked events", () => {
  const f = fixture();
  const visitId = "demo-visit-0";
  consult(f, visitId);
  f.reject("Nurse", { type: "treatment", visitId, kind: "Prescribed", text: "Demo order" }, /Only the doctor/);
  f.act("Doctor", { type: "treatment", visitId, kind: "Prescribed", text: "Synthetic order — no dosing recommendation" });
  const orderId = f.state.visits.find((visit) => visit.id === visitId)!.treatments[0].id;
  expect(f.state.visits.find((visit) => visit.id === visitId)!.treatments.map((item) => item.kind)).toEqual(["Prescribed"]);
  f.act("Doctor", { type: "sign", visitId });
  f.act("Doctor", { type: "route", visitId, stage: "Awaiting treatment" });
  f.reject("Nurse", { type: "route", visitId, stage: "Ready to close" }, /Resolve each prescription/);
  f.reject("Nurse", { type: "treatment", visitId, kind: "Administered", text: "Given", orderId: "unknown" }, /Select the prescription/);
  f.act("Nurse", { type: "treatment", visitId, kind: "Dispensed", text: "Separate dispensing record", orderId });
  expect(f.state.visits.find((visit) => visit.id === visitId)!.treatments.map((item) => item.kind)).toEqual(["Prescribed", "Dispensed"]);
  f.act("Nurse", { type: "treatment", visitId, kind: "Administered", text: "Separate administration record", orderId });
  expect(f.state.visits.find((visit) => visit.id === visitId)!.treatments.map((item) => item.kind)).toEqual(["Prescribed", "Dispensed", "Administered"]);
  f.act("Nurse", { type: "route", visitId, stage: "Ready to close" });
  f.act("Nurse", { type: "close", visitId });
});

test("observation requires a responsible role and future review, retaining signed baseline vitals", () => {
  const f = fixture();
  const visitId = "demo-visit-3";
  f.act("Nurse", { type: "sign", visitId });
  const original = JSON.stringify(f.state.visits.find((visit) => visit.id === visitId)!.signatures);
  f.reject("Nurse", { type: "observe", visitId, reviewAt: now.toISOString(), owner: "Nurse", reason: "Review" }, /future/);
  f.act("Nurse", { type: "observe", visitId, reviewAt: "2026-10-19T09:30:00Z", owner: "Nurse", reason: "Repeat observations" });
  f.act("Nurse", { type: "recordObservation", visitId, vitals: { ...vitals, pulse: "80" }, note: "Repeat assessment recorded." });
  const visit = f.state.visits.find((item) => item.id === visitId)!;
  expect(visit.observations[0].vitals.pulse).toBe("80");
  expect(visit.vitals.pulse).toBe("78");
  expect(JSON.stringify(visit.signatures)).toBe(original);
});

test("doctor consultation resumes after observation without creating another handover", () => {
  const f = fixture();
  const visitId = "demo-visit-0";
  consult(f, visitId);
  f.act("Doctor", { type: "observe", visitId, reviewAt: "2026-10-19T09:30:00Z", owner: "Nurse", reason: "Repeat observations" });
  f.act("Nurse", { type: "recordObservation", visitId, vitals, note: "Repeat assessment recorded." });
  f.act("Doctor", { type: "startConsultation", visitId });
  expect(f.state.visits.find((visit) => visit.id === visitId)?.stage).toBe("In consultation");
});

test("urgent care bypasses normal handover and sorts above older routine visits", () => {
  const f = fixture();
  const visitId = "demo-visit-2";
  f.act("Nurse", { type: "urgent", visitId, reason: "Immediate in-person doctor assessment requested." });
  expect(orderedQueue(f.state.visits)[0].id).toBe(visitId);
  f.reject("Doctor", { type: "startConsultation", visitId }, /Confirm identity/);
  f.act("Nurse", { type: "confirm", visitId });
  f.act("Doctor", { type: "startConsultation", visitId });
  const visit = f.state.visits.find((item) => item.id === visitId)!;
  expect(visit.stage).toBe("In consultation");
  expect(visit.requiresDoctor).toBe(true);
  expect(visit.messages[0].to).toBe("Doctor");
});

test("care messages are separate from handover and only the recipient acknowledges", () => {
  const f = fixture();
  const visitId = "demo-visit-0";
  const handoverBefore = JSON.stringify(f.state.visits.find((visit) => visit.id === visitId)!.handover);
  f.reject("Nurse", { type: "sendMessage", visitId, to: "Nurse", text: "Self" }, /other clinical role/);
  f.act("Nurse", { type: "sendMessage", visitId, to: "Doctor", text: "Please review the updated context." });
  const messageId = f.state.visits.find((visit) => visit.id === visitId)!.messages[0].id;
  f.reject("Nurse", { type: "acknowledgeMessage", visitId, messageId }, /Only the recipient/);
  f.act("Doctor", { type: "acknowledgeMessage", visitId, messageId });
  const visit = f.state.visits.find((item) => item.id === visitId)!;
  expect(visit.messages[0].acknowledgedAt).toBe(now.toISOString());
  expect(JSON.stringify(visit.handover)).toBe(handoverBefore);
});

test("follow-up ownership and real timestamps are enforced", () => {
  const f = fixture();
  const visitId = "demo-visit-0";
  f.reject("Nurse", { type: "addTask", visitId, text: "Review", due: "not-a-date", owner: "Doctor" }, /future/);
  f.act("Nurse", { type: "addTask", visitId, text: "Review progress", due: "2026-10-20T09:00:00Z", owner: "Doctor" });
  const taskId = f.state.tasks.at(-1)!.id;
  f.reject("Nurse", { type: "toggleTask", taskId }, /assigned role/);
  f.act("Doctor", { type: "toggleTask", taskId });
  expect(f.state.tasks.at(-1)?.completedAt).toBe(now.toISOString());
  f.act("Doctor", { type: "toggleTask", taskId });
  expect(f.state.tasks.at(-1)?.done).toBe(false);
  expect(f.state.tasks.at(-1)?.completedAt).toBeUndefined();
});

test("closed records accept amendments and follow-up tasks but not clinical overwrites", () => {
  const f = fixture();
  const visitId = "demo-visit-0";
  consult(f, visitId);
  f.act("Doctor", { type: "sign", visitId });
  f.act("Doctor", { type: "route", visitId, stage: "Ready to close" });
  f.act("Nurse", { type: "close", visitId });
  const visit = f.state.visits.find((item) => item.id === visitId)!;
  const signatureId = visit.signatures.find((item) => item.role === "Doctor")!.id;
  f.reject("Nurse", { type: "saveInstructions", visitId, instructions: "Overwrite" }, /complete/);
  f.act("Doctor", { type: "amend", visitId, signatureId, reason: "Clarification", text: "Additional signed context." });
  f.act("Nurse", { type: "addTask", visitId, text: "Follow-up call", due: "2026-10-20T09:00:00Z", owner: "Nurse" });
  f.act("Nurse", { type: "create", studentId: visit.studentId });
  expect(f.state.visits.filter((item) => item.studentId === visit.studentId && isActive(item))).toHaveLength(1);
});

test("incomplete doctor care cannot be silently downgraded to nurse-only or closed", () => {
  const f = fixture();
  const visitId = "demo-visit-0";
  f.reject("Nurse", { type: "nurseCare", visitId, protocol: "Protocol v1" }, /Doctor review is already required/);
  f.reject("Doctor", { type: "close", visitId }, /Ready to close/);
  consult(f, visitId);
  f.reject("Doctor", { type: "route", visitId, stage: "Ready to close" }, /doctor must sign/);
});

test("every successful clinical action appends a timeline event without changing prior state", () => {
  const original: ClinicState = createInitialState(now);
  const before = JSON.stringify(original);
  const result = applyAction(original, "Nurse", { type: "confirm", visitId: "demo-visit-2" }, now);
  expect(result.error).toBeUndefined();
  expect(JSON.stringify(original)).toBe(before);
  expect(result.state.visits.find((visit) => visit.id === "demo-visit-2")!.timeline.at(-1)?.text).toContain("two identifiers");
});

test("doctor-direct visits capture complaint and do not require an invented nurse signature", () => {
  const f = fixture();
  f.reject("Doctor", { type: "create", studentId: "ST-0332" }, /presenting complaint/);
  f.act("Doctor", { type: "create", studentId: "ST-0332", complaint: "Direct doctor review" });
  const visitId = f.state.visits[0].id;
  expect(f.state.visits[0].stage).toBe("In consultation");
  f.act("Doctor", { type: "confirm", visitId });
  f.act("Doctor", { type: "saveConsultation", visitId, doctorNote: "Direct assessment.", plan: "Agreed plan.", instructions: "Return for review." });
  f.act("Doctor", { type: "sign", visitId });
  f.act("Doctor", { type: "route", visitId, stage: "Ready to close" });
  f.act("Doctor", { type: "close", visitId });
  expect(f.state.visits[0].signatures.map((item) => item.role)).toEqual(["Doctor"]);
});

test("repeated acknowledgement is idempotent and does not add timeline events", () => {
  const f = fixture();
  const visitId = "demo-visit-0";
  f.act("Doctor", { type: "acknowledge", visitId });
  const before = f.state;
  f.act("Doctor", { type: "acknowledge", visitId });
  expect(f.state).toBe(before);
});
