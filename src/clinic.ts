import { students } from "./data";
import type { Student } from "./data";

/**
 * Synthetic, browser-only workflow demonstration. These role checks are UX
 * constraints, not authentication, backend authorization, or a clinical audit log.
 * A production backend must independently enforce every invariant.
 */
export const roles = ["Nurse", "Doctor"] as const;
export type Role = (typeof roles)[number];
export const stages = [
  "Triage", "Awaiting doctor", "In consultation", "Nurse care",
  "Awaiting treatment", "Observation", "Ready to close", "Closed", "Referred",
] as const;
export type Stage = (typeof stages)[number];
export type Priority = "Routine" | "Priority" | "Urgent";
export type Vitals = {
  temp: string; pulse: string; bp: string; spo2: string; resp: string; weight: string;
};
export type TreatmentKind = "Prescribed" | "Dispensed" | "Administered" | "Not given" | "Procedure";
export type Treatment = {
  id: string; kind: TreatmentKind; text: string; role: Role; at: string; orderId?: string;
};
export type Signature = {
  readonly id: string;
  readonly role: Role;
  readonly at: string;
  readonly snapshot: {
    readonly complaint: string;
    readonly vitals: Readonly<Vitals>;
    readonly note: string;
    readonly plan: string;
    readonly instructions: string;
    readonly protocol: string;
  };
};
export type Amendment = {
  id: string; signatureId: string; role: Role; at: string; reason: string; text: string;
};
export type Handover = {
  id: string; summary: string; sentAt: string; sentBy: "Nurse"; acknowledgedAt?: string;
};
export type CareMessage = {
  id: string; text: string; from: Role; to: Role; at: string; acknowledgedAt?: string;
};
export type TimelineEvent = { id: string; at: string; role: Role; text: string };
export type Observation = { reviewAt: string; owner: Role; reason: string };
export type ObservationReading = {
  id: string; at: string; role: Role; vitals: Vitals; note: string;
};
export type Visit = {
  id: string;
  studentId: string;
  arrivedAt: string;
  stage: Stage;
  priority: Priority;
  confirmed: boolean;
  alertsReviewed: boolean;
  complaint: string;
  vitals: Vitals;
  nurseNote: string;
  doctorNote: string;
  plan: string;
  instructions: string;
  protocol: string;
  requiresDoctor: boolean;
  handover?: Handover;
  observation?: Observation;
  observations: ObservationReading[];
  signatures: Signature[];
  amendments: Amendment[];
  treatments: Treatment[];
  messages: CareMessage[];
  timeline: TimelineEvent[];
};
export type Task = {
  id: string; visitId: string; studentId: string; text: string;
  due: string; owner: Role; done: boolean; completedAt?: string; completedBy?: Role;
};
export type ClinicState = { visits: Visit[]; tasks: Task[] };
export type Action =
  | { type: "create"; studentId: string; complaint?: string }
  | { type: "confirm"; visitId: string }
  | { type: "saveTriage"; visitId: string; complaint: string; vitals: Vitals; nurseNote: string; priority: Priority; protocol: string }
  | { type: "saveConsultation"; visitId: string; doctorNote: string; plan: string; instructions: string }
  | { type: "saveInstructions"; visitId: string; instructions: string }
  | { type: "sendHandover"; visitId: string; summary: string }
  | { type: "acknowledge"; visitId: string }
  | { type: "startConsultation"; visitId: string }
  | { type: "nurseCare"; visitId: string; protocol: string }
  | { type: "observe"; visitId: string; reviewAt: string; owner: Role; reason: string }
  | { type: "recordObservation"; visitId: string; vitals: Vitals; note: string }
  | { type: "route"; visitId: string; stage: "Awaiting treatment" | "Ready to close" }
  | { type: "urgent"; visitId: string; reason: string }
  | { type: "refer"; visitId: string; reason: string }
  | { type: "sign"; visitId: string }
  | { type: "amend"; visitId: string; signatureId: string; reason: string; text: string }
  | { type: "treatment"; visitId: string; kind: TreatmentKind; text: string; orderId?: string }
  | { type: "sendMessage"; visitId: string; text: string; to: Role }
  | { type: "acknowledgeMessage"; visitId: string; messageId: string }
  | { type: "addTask"; visitId: string; text: string; due: string; owner: Role }
  | { type: "toggleTask"; taskId: string }
  | { type: "close"; visitId: string };
export type ActionResult = { state: ClinicState; error?: string; message?: string };

const blankVitals = (): Vitals => ({ temp: "", pulse: "", bp: "", spo2: "", resp: "", weight: "" });
const uid = (): string => crypto.randomUUID();
const trimmed = (text: string): string => text.trim();
const validDate = (value: string): boolean => Number.isFinite(new Date(value).getTime());
const signedBy = (visit: Visit, role: Role): boolean => visit.signatures.some((signature) => signature.role === role);
export function studentFor(id: string): Student {
  const student = students.find((item) => item.id === id);
  if (!student) throw new Error("Unknown demo student: " + id);
  return student;
}
export const isActive = (visit: Visit): boolean => visit.stage !== "Closed" && visit.stage !== "Referred";

export function orderedQueue(visits: Visit[]): Visit[] {
  const rank: Record<Priority, number> = { Urgent: 0, Priority: 1, Routine: 2 };
  return visits.filter(isActive).slice().sort((a, b) =>
    rank[a.priority] - rank[b.priority] || Date.parse(a.arrivedAt) - Date.parse(b.arrivedAt),
  );
}

function makeVisit(studentId: string, role: Role, at: string): Visit {
  return {
    id: uid(), studentId, arrivedAt: at, stage: "Triage", priority: "Routine",
    confirmed: false, alertsReviewed: false, complaint: "", vitals: blankVitals(),
    nurseNote: "", doctorNote: "", plan: "", instructions: "", protocol: "",
    requiresDoctor: role === "Doctor", observations: [], signatures: [], amendments: [],
    treatments: [], messages: [], timeline: [{ id: uid(), at, role, text: "Visit opened" }],
  };
}

function signatureFor(visit: Visit, role: Role, at: string): Signature {
  return {
    id: uid(), role, at,
    snapshot: {
      complaint: visit.complaint, vitals: { ...visit.vitals },
      note: role === "Nurse" ? visit.nurseNote : visit.doctorNote,
      plan: role === "Doctor" ? visit.plan : "",
      instructions: visit.instructions,
      protocol: role === "Nurse" ? visit.protocol : "",
    },
  };
}

function completionIssue(visit: Visit): string | undefined {
  if (!visit.confirmed || !visit.alertsReviewed) return "Confirm the student identity and review alerts first.";
  if (!trimmed(visit.instructions)) return "Record discharge or referral instructions before completing the visit.";
  if (trimmed(visit.nurseNote) && !signedBy(visit, "Nurse")) return "The nurse must sign their own assessment.";
  if (visit.requiresDoctor && !signedBy(visit, "Doctor")) return "The doctor must sign their own consultation.";
  if (!visit.requiresDoctor && (!signedBy(visit, "Nurse") || !trimmed(visit.protocol)))
    return "Nurse-only care needs a protocol reference and the nurse's signature.";
  const pending = visit.treatments.some((order) =>
    order.kind === "Prescribed" &&
    !visit.treatments.some((event) =>
      event.orderId === order.id && ["Dispensed", "Administered", "Not given"].includes(event.kind),
    ),
  );
  if (pending) return "Resolve each prescription with a separate dispensing, administration, or not-given record.";
  return undefined;
}

/** Returns the original state on every rejected action. Signed snapshots are never edited. */
export function applyAction(
  state: ClinicState,
  role: Role,
  action: Action,
  now: Date = new Date(),
): ActionResult {
  const fail = (error: string): ActionResult => ({ state, error });
  if (!roles.includes(role)) return fail("Choose a valid demo role.");
  if (!Number.isFinite(now.getTime())) return fail("The current time is invalid.");
  const at = now.toISOString();

  if (action.type === "create") {
    if (!students.some((student) => student.id === action.studentId)) return fail("Student not found.");
    if (role === "Doctor" && !trimmed(action.complaint ?? ""))
      return fail("Enter the presenting complaint to start a direct doctor consultation.");
    if (state.visits.some((visit) => visit.studentId === action.studentId && isActive(visit)))
      return fail("This student already has an active visit. Open that visit instead.");
    const visit = makeVisit(action.studentId, role, at);
    visit.complaint = trimmed(action.complaint ?? "");
    if (role === "Doctor") visit.stage = "In consultation";
    return {
      state: { ...state, visits: [visit, ...state.visits] },
      message: "Visit opened. Confirm identity and review alerts.",
    };
  }

  const next = structuredClone(state);
  if (action.type === "toggleTask") {
    const task = next.tasks.find((item) => item.id === action.taskId);
    if (!task) return fail("Follow-up task not found.");
    if (task.owner !== role) return fail("Only the assigned role can complete or reopen this task.");
    task.done = !task.done;
    task.completedAt = task.done ? at : undefined;
    task.completedBy = task.done ? role : undefined;
    const visit = next.visits.find((item) => item.id === task.visitId);
    visit?.timeline.push({ id: uid(), at, role, text: (task.done ? "Completed follow-up: " : "Reopened follow-up: ") + task.text });
    return { state: next, message: task.done ? "Follow-up completed." : "Follow-up reopened." };
  }

  const visit = next.visits.find((item) => item.id === action.visitId);
  if (!visit) return fail("Visit not found.");
  if (!isActive(visit) && action.type !== "amend" && action.type !== "addTask")
    return fail("This visit is complete. Add a signed amendment or open a new visit.");
  const log = (text: string): void => { visit.timeline.push({ id: uid(), at, role, text }); };
  const identityIssue = (): string | undefined =>
    visit.confirmed && visit.alertsReviewed ? undefined : "Confirm identity and review allergies and alerts first.";
  const nurseOnly = (): string | undefined => role === "Nurse" ? undefined : "Only the nurse can perform this action.";
  const doctorOnly = (): string | undefined => role === "Doctor" ? undefined : "Only the doctor can perform this action.";
  let issue: string | undefined;
  let message = "Saved.";

  switch (action.type) {
    case "confirm":
      visit.confirmed = true;
      visit.alertsReviewed = true;
      log("Confirmed identity using two identifiers and reviewed allergies and alerts");
      message = "Identity and alerts confirmed.";
      break;
    case "saveTriage":
      issue = nurseOnly();
      if (issue) return fail(issue);
      if (signedBy(visit, "Nurse")) return fail("The signed nurse assessment is locked. Add an amendment or a repeat observation.");
      if (!["Triage", "Nurse care", "Observation"].includes(visit.stage))
        return fail("The assessment has been handed over. Use a care message or amendment for updates.");
      if (!["Routine", "Priority", "Urgent"].includes(action.priority)) return fail("Select a valid priority.");
      visit.complaint = trimmed(action.complaint);
      visit.vitals = { ...action.vitals };
      visit.nurseNote = trimmed(action.nurseNote);
      visit.priority = action.priority;
      if (action.priority === "Urgent") visit.requiresDoctor = true;
      visit.protocol = trimmed(action.protocol);
      log("Saved nurse assessment");
      message = "Nurse assessment saved.";
      break;
    case "saveConsultation":
      issue = doctorOnly() || identityIssue();
      if (issue) return fail(issue);
      if (signedBy(visit, "Doctor")) return fail("The signed doctor consultation is locked. Add an amendment.");
      if (visit.stage !== "In consultation") return fail("Start the consultation before editing the doctor's note.");
      visit.doctorNote = trimmed(action.doctorNote);
      visit.plan = trimmed(action.plan);
      visit.instructions = trimmed(action.instructions);
      visit.requiresDoctor = true;
      log("Saved doctor consultation and care plan");
      message = "Consultation saved.";
      break;
    case "saveInstructions":
      issue = identityIssue();
      if (issue) return fail(issue);
      if (!["Nurse care", "In consultation", "Awaiting treatment", "Observation", "Ready to close"].includes(visit.stage))
        return fail("Start care before recording discharge instructions.");
      if (!trimmed(action.instructions)) return fail("Enter the instructions given to the student.");
      visit.instructions = trimmed(action.instructions);
      // Discharge instructions are a separate visit record. Prior signed snapshots
      // retain exactly the instructions present at the time of signing.
      log("Updated separate discharge instructions: " + visit.instructions);
      message = "Discharge instructions saved; existing signed notes are unchanged.";
      break;
    case "sendHandover":
      issue = nurseOnly() || identityIssue();
      if (issue) return fail(issue);
      if (!["Triage", "Nurse care", "Observation", "Awaiting doctor"].includes(visit.stage))
        return fail("The visit is already with the doctor. Send a care message instead.");
      if (visit.handover?.acknowledgedAt) return fail("The doctor has accepted this handover. Send a care message for updates.");
      if (!signedBy(visit, "Nurse")) return fail("Sign the nurse assessment before sending the handover.");
      if (!trimmed(action.summary)) return fail("Enter the handover summary and requested review.");
      visit.handover = { id: uid(), summary: trimmed(action.summary), sentAt: at, sentBy: "Nurse" };
      visit.requiresDoctor = true;
      visit.stage = "Awaiting doctor";
      visit.observation = undefined;
      log("Sent handover to doctor: " + visit.handover.summary);
      message = "Handover sent to the doctor queue.";
      break;
    case "acknowledge":
      issue = doctorOnly();
      if (issue) return fail(issue);
      if (!visit.handover) return fail("There is no handover to accept.");
      if (visit.handover.acknowledgedAt) return { state, message: "This handover has already been accepted." };
      if (!["Awaiting doctor", "Nurse care", "Observation"].includes(visit.stage))
        return fail("This visit is no longer awaiting handover.");
      visit.handover.acknowledgedAt = at;
      log("Doctor accepted the nurse handover");
      message = "Handover accepted. Start the consultation when ready.";
      break;
    case "startConsultation":
      issue = doctorOnly() || identityIssue();
      if (issue) return fail(issue);
      if (visit.stage === "Awaiting doctor") {
        if (!visit.handover?.acknowledgedAt) return fail("Accept the nurse handover before starting consultation.");
      } else if (visit.stage === "Observation" && visit.requiresDoctor && visit.handover?.acknowledgedAt) {
        // Resume an accepted consultation after a period of observation.
      } else if (!(visit.priority === "Urgent" && ["Triage", "Nurse care", "Observation"].includes(visit.stage))) {
        return fail("This visit is not ready for doctor consultation.");
      }
      if (visit.handover && !visit.handover.acknowledgedAt) {
        visit.handover.acknowledgedAt = at;
        log("Doctor accepted urgent handover");
      }
      visit.stage = "In consultation";
      visit.requiresDoctor = true;
      visit.observation = undefined;
      log("Doctor started consultation");
      message = "Consultation started.";
      break;
    case "nurseCare":
      issue = nurseOnly() || identityIssue();
      if (issue) return fail(issue);
      if (!["Triage", "Nurse care", "Observation"].includes(visit.stage) || visit.requiresDoctor)
        return fail("Doctor review is already required. Continue the doctor handover.");
      if (!trimmed(action.protocol)) return fail("Enter the approved protocol name and version for nurse-only care.");
      if (signedBy(visit, "Nurse") && visit.protocol !== trimmed(action.protocol))
        return fail("A signed protocol reference cannot be replaced. Add an amendment.");
      visit.protocol = trimmed(action.protocol);
      visit.stage = "Nurse care";
      visit.observation = undefined;
      log("Started nurse-only care under protocol: " + visit.protocol);
      message = "Nurse care started.";
      break;
    case "observe":
      issue = identityIssue();
      if (issue) return fail(issue);
      if (role === "Doctor" && ["Triage", "Awaiting doctor", "Nurse care"].includes(visit.stage))
        return fail("Accept the handover and start the consultation before ordering observation.");
      if (role === "Nurse" && ["In consultation", "Awaiting doctor"].includes(visit.stage))
        return fail("The doctor must route this visit to observation, or send a care message.");
      if (!validDate(action.reviewAt) || Date.parse(action.reviewAt) <= now.getTime())
        return fail("Choose a future observation review time.");
      if (!roles.includes(action.owner) || !trimmed(action.reason))
        return fail("Choose the responsible role and record the observation reason.");
      visit.observation = { reviewAt: new Date(action.reviewAt).toISOString(), owner: action.owner, reason: trimmed(action.reason) };
      visit.stage = "Observation";
      log("Observation assigned to " + action.owner + " for " + visit.observation.reviewAt + ": " + visit.observation.reason);
      message = "Observation review scheduled.";
      break;
    case "recordObservation":
      issue = identityIssue();
      if (issue) return fail(issue);
      if (visit.stage !== "Observation") return fail("Repeat observations can be recorded while the student is in observation.");
      if (!trimmed(action.note)) return fail("Describe the repeat assessment.");
      visit.observations.push({ id: uid(), at, role, vitals: { ...action.vitals }, note: trimmed(action.note) });
      log("Recorded repeat observations: " + trimmed(action.note));
      message = "Repeat observations saved without changing signed notes.";
      break;
    case "route":
      issue = identityIssue();
      if (issue) return fail(issue);
      if (!["In consultation", "Nurse care", "Awaiting treatment", "Observation", "Ready to close"].includes(visit.stage))
        return fail("Start the appropriate clinical workflow before routing the visit.");
      if (visit.requiresDoctor && !signedBy(visit, "Doctor"))
        return fail("The doctor must sign the consultation before the visit leaves clinical review.");
      if (!visit.requiresDoctor && (!signedBy(visit, "Nurse") || !trimmed(visit.protocol)))
        return fail("Sign the nurse assessment and record a protocol before completing nurse-only care.");
      if (action.stage === "Awaiting treatment" && role !== "Doctor" && visit.requiresDoctor)
        return fail("The doctor sends their treatment plan to the nurse.");
      if (action.stage === "Ready to close") {
        issue = completionIssue(visit);
        if (issue) return fail(issue);
      }
      visit.stage = action.stage;
      visit.observation = undefined;
      log("Moved visit to " + action.stage);
      message = action.stage === "Awaiting treatment" ? "Treatment handover is ready for the nurse." : "Visit ready for final closure.";
      break;
    case "urgent":
      if (!trimmed(action.reason)) return fail("Record the reason for urgent escalation.");
      visit.priority = "Urgent";
      visit.requiresDoctor = true;
      visit.observation = undefined;
      if (role === "Doctor") {
        visit.stage = "In consultation";
        if (visit.handover && !visit.handover.acknowledgedAt) visit.handover.acknowledgedAt = at;
      } else if (visit.stage !== "In consultation") {
        visit.stage = "Nurse care";
        if (!visit.handover) visit.handover = { id: uid(), summary: trimmed(action.reason), sentAt: at, sentBy: "Nurse" };
      }
      visit.messages.push({ id: uid(), text: "URGENT: " + trimmed(action.reason), from: role, to: role === "Nurse" ? "Doctor" : "Nurse", at });
      log("Urgent care started; routine queue bypassed: " + trimmed(action.reason));
      message = "Urgent care flagged. Alert the clinician directly; this demo is not an emergency paging system.";
      break;
    case "refer":
      issue = identityIssue();
      if (issue) return fail(issue);
      if (!trimmed(action.reason)) return fail("Record the referral destination and reason.");
      issue = completionIssue(visit);
      if (issue) return fail(issue);
      visit.stage = "Referred";
      visit.observation = undefined;
      log("Referred or transferred: " + trimmed(action.reason));
      message = "Referral recorded and visit completed.";
      break;
    case "sign":
      issue = identityIssue();
      if (issue) return fail(issue);
      if (signedBy(visit, role)) return fail("Your original note is already signed. Add a traceable amendment.");
      if (!trimmed(visit.complaint)) return fail("Record the presenting complaint before signing.");
      if (role === "Nurse" && !trimmed(visit.nurseNote)) return fail("Record the nurse assessment before signing.");
      if (role === "Doctor") {
        if (visit.stage !== "In consultation") return fail("Start the consultation before signing the doctor note.");
        if (!trimmed(visit.doctorNote) || !trimmed(visit.plan))
          return fail("Record the doctor's assessment and plan before signing.");
      }
      visit.signatures.push(signatureFor(visit, role, at));
      log(role + " signed their own original note");
      message = role + " note signed. The visit remains open.";
      break;
    case "amend": {
      const signature = visit.signatures.find((item) => item.id === action.signatureId);
      if (!signature) return fail("Original signed note not found.");
      if (signature.role !== role) return fail("You can amend only your own role's signed note.");
      if (!trimmed(action.reason) || !trimmed(action.text)) return fail("Enter both the amendment and the reason for it.");
      visit.amendments.push({ id: uid(), signatureId: signature.id, role, at, reason: trimmed(action.reason), text: trimmed(action.text) });
      log("Added signed amendment to " + role + " note; reason: " + trimmed(action.reason));
      message = "Amendment added. The original signed note is preserved.";
      break;
    }
    case "treatment":
      issue = identityIssue();
      if (issue) return fail(issue);
      if (!["In consultation", "Nurse care", "Awaiting treatment", "Observation"].includes(visit.stage))
        return fail("Start clinical care before recording treatment.");
      if (!trimmed(action.text)) return fail("Enter the treatment details.");
      if (action.kind === "Prescribed") {
        issue = doctorOnly();
        if (issue) return fail(issue);
        if (!visit.requiresDoctor) return fail("A prescription needs a doctor consultation.");
        if (action.orderId) return fail("A new prescription cannot reference another order.");
      } else if (["Dispensed", "Administered", "Not given"].includes(action.kind)) {
        const order = visit.treatments.find((item) => item.id === action.orderId && item.kind === "Prescribed");
        if (!order) return fail("Select the prescription this medication event relates to.");
        // A later omitted dose remains a separate event even when an earlier dose was given.
      } else if (action.kind !== "Procedure") {
        return fail("Choose a valid treatment event.");
      }
      if (role === "Nurse" && !visit.requiresDoctor && !trimmed(visit.protocol))
        return fail("Record the approved protocol before nurse-only treatment.");
      visit.treatments.push({ id: uid(), kind: action.kind, text: trimmed(action.text), role, at, orderId: action.orderId });
      log(action.kind + ": " + trimmed(action.text));
      message = action.kind + " recorded as a separate event.";
      break;
    case "sendMessage":
      if (!roles.includes(action.to) || action.to === role) return fail("Send care messages to the other clinical role.");
      if (!trimmed(action.text)) return fail("Enter a care message.");
      visit.messages.push({ id: uid(), text: trimmed(action.text), from: role, to: action.to, at });
      log("Sent care message to " + action.to + ": " + trimmed(action.text));
      message = "Care message sent.";
      break;
    case "acknowledgeMessage": {
      const careMessage = visit.messages.find((item) => item.id === action.messageId);
      if (!careMessage) return fail("Care message not found.");
      if (careMessage.to !== role) return fail("Only the recipient can acknowledge this message.");
      if (careMessage.acknowledgedAt) return { state, message: "This message has already been acknowledged." };
      careMessage.acknowledgedAt = at;
      log("Acknowledged care message from " + careMessage.from);
      message = "Care message acknowledged.";
      break;
    }
    case "addTask":
      if (!trimmed(action.text) || !roles.includes(action.owner)) return fail("Enter a follow-up task and choose its owner.");
      if (!validDate(action.due) || Date.parse(action.due) <= now.getTime()) return fail("Choose a future follow-up date and time.");
      next.tasks.push({
        id: uid(), visitId: visit.id, studentId: visit.studentId, text: trimmed(action.text),
        due: new Date(action.due).toISOString(), owner: action.owner, done: false,
      });
      log("Assigned follow-up to " + action.owner + ": " + trimmed(action.text));
      message = "Follow-up assigned.";
      break;
    case "close":
      if (visit.stage !== "Ready to close") return fail("Move the visit to Ready to close after reviewing care and instructions.");
      issue = completionIssue(visit);
      if (issue) return fail(issue);
      visit.stage = "Closed";
      visit.observation = undefined;
      log("Closed visit after checking signatures, treatment records and instructions");
      message = "Visit closed. Signed originals remain available.";
      break;
    default: {
      const exhaustive: never = action;
      void exhaustive;
      return fail("Unsupported action.");
    }
  }
  return { state: next, message };
}

/** Synthetic fixtures are relative to the current day so queue timers remain useful. */
export function createInitialState(now: Date = new Date()): ClinicState {
  const ago = (minutes: number): string => new Date(now.getTime() - minutes * 60_000).toISOString();
  const later = (minutes: number): string => new Date(now.getTime() + minutes * 60_000).toISOString();
  const complaints = [
    "Headache and feeling unwell", "Ankle discomfort after football",
    "Sore throat", "Small abrasion on left knee", "Rest and repeat observations",
  ];
  const visits = students.slice(0, 5).map((student, index) => {
    const visit = makeVisit(student.id, "Nurse", ago(52 - index * 8));
    visit.id = "demo-visit-" + index;
    visit.complaint = complaints[index];
    if (index !== 2) {
      visit.confirmed = true;
      visit.alertsReviewed = true;
      visit.vitals = { temp: "36.8", pulse: "78", bp: "112/72", spo2: "99", resp: "16", weight: "" };
      visit.nurseNote = [
        "Student reports headache since this morning. History and allergy alert reviewed. Request doctor assessment.",
        "Student reports ankle discomfort after football. Injury history recorded. Request doctor assessment.",
        "",
        "Small abrasion reported after outdoor activity. Nursing assessment documented for demonstration.",
        "Student resting in clinic; repeat observations and review arranged.",
      ][index];
      visit.timeline.push({ id: uid(), at: ago(48 - index * 8), role: "Nurse", text: "Confirmed identity, reviewed alerts and recorded nurse assessment" });
    }
    if (index < 2) {
      visit.priority = index === 0 ? "Priority" : "Routine";
      visit.requiresDoctor = true;
      visit.stage = "Awaiting doctor";
      visit.signatures.push(signatureFor(visit, "Nurse", ago(45 - index * 8)));
      visit.handover = { id: uid(), summary: visit.nurseNote, sentAt: ago(44 - index * 8), sentBy: "Nurse" };
      visit.timeline.push({ id: uid(), at: visit.handover.sentAt, role: "Nurse", text: "Signed nurse assessment and sent handover to doctor" });
    }
    if (index === 3) {
      visit.stage = "Nurse care";
      visit.protocol = "DEMO protocol reference — school clinical approval required";
    }
    if (index === 4) {
      visit.stage = "Observation";
      visit.protocol = "DEMO observation protocol — school clinical approval required";
      visit.observation = { reviewAt: later(15), owner: "Nurse", reason: "Repeat observations and clinical review" };
    }
    return visit;
  });
  return {
    visits,
    tasks: [{
      id: "demo-follow-up", visitId: visits[1].id, studentId: visits[1].studentId,
      text: "Review the student after today's ankle assessment", due: later(24 * 60), owner: "Nurse", done: false,
    }],
  };
}
