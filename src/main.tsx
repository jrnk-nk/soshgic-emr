import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Activity,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileCheck2,
  HeartPulse,
  LayoutDashboard,
  ListFilter,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
  AlertTriangle,
  History,
  Pill,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "./components/ui/button";
import {
  students,
  initialVisits,
  initialTasks,
  makeVisit,
  type Visit,
  type Role,
  type Stage,
  type Task,
} from "./data";
import "./styles.css";

type Page = "Overview" | "Clinic queue" | "Students" | "Follow-ups" | "Reports";
const nav = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Clinic queue", icon: ClipboardList },
  { name: "Students", icon: Users },
  { name: "Follow-ups", icon: CalendarDays },
  { name: "Reports", icon: Activity },
] as const;
const studentFor = (id: string) => students.find((s) => s.id === id)!;
const stamp = () => new Date().toLocaleString("en-GB");
function App() {
  const [page, setPage] = useState<Page>("Overview");
  const [role, setRole] = useState<Role>("Nurse");
  const [visits, setVisits] = useState<Visit[]>(initialVisits);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All active");
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState("Assessment");
  const [finding, setFinding] = useState(false);
  const [notice, setNotice] = useState("");
  const [amendment, setAmendment] = useState("");
  const [medText, setMedText] = useState("");
  const [medKind, setMedKind] = useState<
    "Prescribed" | "Dispensed" | "Administered"
  >("Administered");
  const [followText, setFollowText] = useState("");
  const [followDate, setFollowDate] = useState("");
  const [error, setError] = useState("");
  const active = visits.filter((v) => v.stage !== "Closed");
  const current = visits.find((v) => v.id === selected);
  const student = current ? studentFor(current.studentId) : null;
  const signed = !!current?.signed.length;
  const update = (patch: Partial<Visit>) =>
    setVisits((old) =>
      old.map((v) => (v.id === selected ? { ...v, ...patch } : v)),
    );
  const notify = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 5000);
  };
  const open = (id: string) => {
    setSelected(id);
    setTab("Assessment");
    setError("");
    setAmendment("");
    setMedText("");
    setFollowText("");
    setFollowDate("");
  };
  const start = (studentId: string) => {
    const existing = active.find((v) => v.studentId === studentId);
    if (existing) {
      open(existing.id);
    } else {
      const v = makeVisit(studentId);
      setVisits((old) => [...old, v]);
      open(v.id);
    }
    setFinding(false);
    setQuery("");
  };
  const matches = (id: string) => {
    const s = studentFor(id);
    return `${s.name} ${s.id} ${s.className}`
      .toLowerCase()
      .includes(query.toLowerCase());
  };
  const shown = visits.filter(
    (v) =>
      matches(v.studentId) &&
      (filter === "All active"
        ? v.stage !== "Closed"
        : filter === "All visits" || v.stage === filter),
  );
  const route = (stage: Stage) => {
    if (!current?.confirmed || !current.complaint.trim()) {
      setError(
        "Confirm the student’s identity and enter a complaint before handing over.",
      );
      return;
    }
    update({ stage });
    setError("");
    notify(`Visit moved to ${stage.toLowerCase()}.`);
  };
  const sign = () => {
    if (role === "Nurse" && current?.stage !== "Nurse care") {
      setError(
        "Only nurse-only care can be closed in the nurse demo. Return to Assessment and choose Nurse-only care, or hand over to the doctor.",
      );
      return;
    }
    if (
      !current ||
      !current.confirmed ||
      !current.complaint.trim() ||
      !current.instructions.trim() ||
      (role === "Doctor" ? !current.assessment.trim() : !current.triage.trim())
    ) {
      setError(
        "Confirm identity, complete your clinical note and add follow-up instructions before signing.",
      );
      return;
    }
    const text = JSON.stringify(
      {
        complaint: current.complaint,
        vitals: current.vitals,
        triage: current.triage,
        assessment: current.assessment,
        plan: current.plan,
        instructions: current.instructions,
      },
      null,
      2,
    );
    update({
      stage: "Closed",
      signed: [
        ...current.signed,
        { text, author: role, time: stamp(), kind: "Original" },
      ],
    });
    setError("");
    notify("Demo visit signed. The original note is now read-only.");
    setTab("History");
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("Overview");
          }}
        >
          <span className="brand-mark">
            <Plus size={25} strokeWidth={3} />
          </span>
          <span>
            School Clinic<small>STUDENT HEALTH SERVICES</small>
          </span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {nav.map(({ name, icon: Icon }) => (
            <button
              key={name}
              aria-label={name}
              aria-current={page === name ? "page" : undefined}
              className={`nav-item ${page === name ? "active" : ""}`}
              onClick={() => {
                setPage(name);
                setQuery("");
                setFilter("All active");
              }}
            >
              <Icon size={20} />
              <span>{name}</span>
              {name === "Clinic queue" && <b>{active.length}</b>}
              {name === "Follow-ups" && (
                <span className="nav-count">
                  {tasks.filter((t) => !t.done).length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <ShieldCheck size={21} />
            <div>
              Care with confidence<small>One student. One shared record.</small>
            </div>
          </div>
          <div className="staff">
            <span className="avatar staff-avatar">
              {role === "Nurse" ? "NA" : "DK"}
            </span>
            <div>
              <strong>{role === "Nurse" ? "Nurse Adjei" : "Dr. Kusi"}</strong>
              <small>Demo {role.toLowerCase()} account</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Clinic workspace <ChevronRight size={15} />
            <strong>{page}</strong>
          </div>
          <div className="top-actions">
            <span className="demo-pill">Interactive prototype</span>
            <label className="role-label">
              View as
              <select
                aria-label="Demo staff role"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as Role);
                  setMedKind(
                    e.target.value === "Doctor" ? "Prescribed" : "Administered",
                  );
                }}
              >
                <option>Nurse</option>
                <option>Doctor</option>
              </select>
            </label>
            <button
              className="icon-button"
              aria-label="View follow-ups"
              onClick={() => setPage("Follow-ups")}
            >
              <Bell size={20} />
              {tasks.some((t) => !t.done) && (
                <span className="notification-dot" />
              )}
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">MONDAY, 5 OCTOBER 2026 · DEMO DAY</div>
              <h1>
                {page === "Overview"
                  ? `Good morning, ${role === "Nurse" ? "Nurse Adjei" : "Dr. Kusi"}`
                  : page}
              </h1>
              <p>
                {page === "Overview"
                  ? "A clear view of your clinic. More time for your students."
                  : page === "Clinic queue"
                    ? "Coordinate care, from first assessment to follow-up."
                    : page === "Students"
                      ? "Find a student and open their health record."
                      : page === "Follow-ups"
                        ? "Keep the next step in care close at hand."
                        : "A snapshot of clinic activity, without individual medical records."}
              </p>
            </div>
            <Button
              onClick={() => {
                setFinding(true);
                setQuery("");
              }}
            >
              <Plus size={18} /> New visit
            </Button>
          </div>
          <div className="demo-banner">
            <ShieldCheck size={17} />
            <span>
              <strong>Fictional records only.</strong> Changes last until you
              refresh. Staff roles and signatures are demonstrations.
            </span>
          </div>
          {(page === "Overview" || page === "Clinic queue") && (
            <>
              <div className="stats-grid">
                {[
                  {
                    label: "Visits today",
                    value: visits.length,
                    detail: "Across the clinic",
                    icon: HeartPulse,
                    color: "teal",
                  },
                  {
                    label: "Waiting for doctor",
                    value: active.filter((v) => v.stage === "Awaiting doctor")
                      .length,
                    detail: "Ready for consultation",
                    icon: Clock3,
                    color: "amber",
                  },
                  {
                    label: "In observation",
                    value: active.filter((v) => v.stage === "Observation")
                      .length,
                    detail: "Continuing care",
                    icon: Stethoscope,
                    color: "blue",
                  },
                  {
                    label: "Completed visits",
                    value: visits.filter((v) => v.stage === "Closed").length,
                    detail: "Signed and closed",
                    icon: FileCheck2,
                    color: "purple",
                  },
                ].map(({ label, value, detail, icon: Icon, color }) => (
                  <div className="stat-card" key={label}>
                    <div className="stat-top">
                      <span>{label}</span>
                      <span className={`stat-icon ${color}`}>
                        <Icon size={20} />
                      </span>
                    </div>
                    <strong className="stat-value">
                      {value.toString().padStart(2, "0")}
                    </strong>
                    <span className="stat-detail">{detail}</span>
                  </div>
                ))}
              </div>
              <div className="content-grid">
                <section className="panel queue-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        Clinic queue{" "}
                        <span className="count-pill">
                          {active.length} active
                        </span>
                      </h2>
                      <p>Your shared handover, all in one place.</p>
                    </div>
                    <span className="muted">Demo session</span>
                  </div>
                  <div className="queue-toolbar">
                    <div className="search-box">
                      <Search size={18} />
                      <input
                        aria-label="Search queue"
                        placeholder="Search name or student ID…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <label className="filter-select">
                      <ListFilter size={17} />
                      <select
                        aria-label="Filter queue"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        {[
                          "All active",
                          "Awaiting triage",
                          "Awaiting doctor",
                          "In consultation",
                          "Nurse care",
                          "Observation",
                          "Urgent care",
                          "Closed",
                          "All visits",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>STUDENT</th>
                          <th>COMPLAINT</th>
                          <th>STATUS</th>
                          <th>ARRIVAL</th>
                          <th aria-label="Open visit" />
                        </tr>
                      </thead>
                      <tbody>
                        {shown.map((v) => {
                          const s = studentFor(v.studentId);
                          return (
                            <tr key={v.id} onClick={() => open(v.id)}>
                              <td>
                                <div className="person">
                                  <span className={`avatar ${s.color}`}>
                                    {s.initials}
                                  </span>
                                  <div>
                                    <strong>{s.name}</strong>
                                    <small>
                                      {s.id} <span>·</span> {s.className}
                                    </small>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="complaint">
                                  {v.complaint || "New assessment"}
                                </span>
                                {v.priority !== "Routine" && (
                                  <span className="priority">
                                    <span /> {v.priority}
                                  </span>
                                )}
                              </td>
                              <td>
                                <span
                                  className={`badge ${v.stage.replaceAll(" ", "-").toLowerCase()}`}
                                >
                                  {v.stage}
                                </span>
                              </td>
                              <td className="time-cell">{v.time}</td>
                              <td>
                                <button
                                  className="row-open"
                                  aria-label={`Open visit for ${s.name}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    open(v.id);
                                  }}
                                >
                                  <ChevronRight size={19} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {shown.length === 0 && (
                      <div className="empty">
                        <Search size={27} />
                        <h3>No matching visits</h3>
                        <p>Try another name or change the queue filter.</p>
                      </div>
                    )}
                  </div>
                  <div className="table-footer">
                    <span>{shown.length} visits shown</span>
                    <span>
                      <LockKeyhole size={13} /> Clinical workspace
                    </span>
                  </div>
                </section>
                {page === "Overview" && (
                  <aside className="right-column">
                    <section className="handover-card">
                      <div className="section-kicker">
                        <ClipboardCheck size={18} /> CARE AT A GLANCE
                      </div>
                      <h2>
                        Every handover.
                        <br />
                        Nothing missed.
                      </h2>
                      <p>
                        Review identity and allergies before continuing a
                        student’s care.
                      </p>
                      <div className="handover-step">
                        <span>1</span> Confirm the student
                      </div>
                      <div className="handover-step">
                        <span>2</span> Review clinical alerts
                      </div>
                      <div className="handover-step">
                        <span>3</span> Record and hand over
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setPage("Students")}
                      >
                        Find a student <Search size={16} />
                      </Button>
                    </section>
                    <section className="panel followup-card">
                      <div className="panel-heading">
                        <h2>Next follow-ups</h2>
                        <CalendarDays size={18} />
                      </div>
                      {tasks
                        .filter((t) => !t.done)
                        .slice(0, 2)
                        .map((t) => (
                          <button
                            className="mini-task"
                            key={t.id}
                            onClick={() => setPage("Follow-ups")}
                          >
                            <span className="task-marker" />
                            <div>
                              <strong>{studentFor(t.studentId).name}</strong>
                              <p>{t.text}</p>
                              <small>{t.due}</small>
                            </div>
                          </button>
                        ))}
                      {tasks.every((t) => t.done) && (
                        <p className="padded">All follow-ups completed.</p>
                      )}
                      <button
                        className="text-link"
                        onClick={() => setPage("Follow-ups")}
                      >
                        View all follow-ups <ArrowUpRight size={16} />
                      </button>
                    </section>
                  </aside>
                )}
              </div>
            </>
          )}
          {page === "Students" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    Student directory{" "}
                    <span className="count-pill">
                      {students.length} demo records
                    </span>
                  </h2>
                  <p>Confirm name and student ID before starting a visit.</p>
                </div>
                <div className="search-box">
                  <Search size={18} />
                  <input
                    aria-label="Search students"
                    placeholder="Name, student ID or class…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="student-grid">
                {students
                  .filter((s) => matches(s.id))
                  .map((s) => (
                    <article className="student-card" key={s.id}>
                      <div className="person">
                        <span className={`avatar large ${s.color}`}>
                          {s.initials}
                        </span>
                        <div>
                          <h3>{s.name}</h3>
                          <small>
                            {s.id} · {s.age} years · {s.className}
                          </small>
                        </div>
                      </div>
                      <dl>
                        <dt>House</dt>
                        <dd>{s.house}</dd>
                        <dt>Allergies</dt>
                        <dd>{s.allergy}</dd>
                        <dt>Important conditions</dt>
                        <dd>{s.conditions}</dd>
                      </dl>
                      <Button variant="outline" onClick={() => start(s.id)}>
                        {active.some((v) => v.studentId === s.id)
                          ? "Open active visit"
                          : "Start visit"}
                        <ChevronRight size={16} />
                      </Button>
                    </article>
                  ))}
              </div>
              {!students.some((s) => matches(s.id)) && (
                <div className="empty">No students match your search.</div>
              )}
            </section>
          )}
          {page === "Follow-ups" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Care beyond the visit</h2>
                  <p>{tasks.filter((t) => !t.done).length} tasks to complete</p>
                </div>
              </div>
              {tasks.map((t) => (
                <div
                  className={`task-row ${t.done ? "task-done" : ""}`}
                  key={t.id}
                >
                  <button
                    aria-label={`${t.done ? "Reopen" : "Complete"} ${t.text}`}
                    className="check-task"
                    onClick={() =>
                      setTasks((old) =>
                        old.map((x) =>
                          x.id === t.id ? { ...x, done: !x.done } : x,
                        ),
                      )
                    }
                  >
                    {t.done && <Check size={18} />}
                  </button>
                  <div>
                    <strong>{t.text}</strong>
                    <p>
                      {studentFor(t.studentId).name} · {t.owner}
                    </p>
                  </div>
                  <span className="task-due">
                    {t.done ? "Completed" : t.due}
                  </span>
                </div>
              ))}
            </section>
          )}
          {page === "Reports" && (
            <section className="panel reports">
              <div className="panel-heading">
                <div>
                  <h2>Clinic activity</h2>
                  <p>Aggregate demonstration · current session only</p>
                </div>
                <ShieldCheck size={24} />
              </div>
              <div className="report-summary">
                <div>
                  <strong>{visits.length}</strong>
                  <span>Total visits</span>
                </div>
                <div>
                  <strong>
                    {visits.filter((v) => v.stage === "Closed").length}
                  </strong>
                  <span>Signed visits</span>
                </div>
                <div>
                  <strong>{tasks.filter((t) => !t.done).length}</strong>
                  <span>Open follow-ups</span>
                </div>
              </div>
              <h3>Visits by care stage</h3>
              {[
                "Awaiting triage",
                "Awaiting doctor",
                "In consultation",
                "Nurse care",
                "Observation",
                "Urgent care",
                "Closed",
              ].map((stage) => (
                <div className="report-bar" key={stage}>
                  <span>{stage}</span>
                  <div>
                    <i
                      style={{
                        width: `${visits.length ? (visits.filter((v) => v.stage === stage).length / visits.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <b>{visits.filter((v) => v.stage === stage).length}</b>
                </div>
              ))}
              <p className="report-note">
                This staff preview uses small fictional counts. Leadership
                reporting will need suppression of small groups before use with
                real records.
              </p>
            </section>
          )}
          <footer className="app-footer">
            <span>
              School Clinic <span className="footer-dot">·</span> Student care
              comes first.
            </span>
            <span>Phase 1 design preview</span>
          </footer>
        </main>
      </div>
      <Dialog.Root open={finding} onOpenChange={setFinding}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="find-dialog">
            <div className="dialog-heading">
              <div>
                <Dialog.Title>Find a student</Dialog.Title>
                <Dialog.Description>
                  Choose a fictional student to begin a visit.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  className="icon-button"
                  aria-label="Close student search"
                >
                  <X />
                </button>
              </Dialog.Close>
            </div>
            <div className="search-box">
              <Search size={19} />
              <input
                autoFocus
                aria-label="Find student"
                placeholder="Search name or student ID…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="find-results">
              {students
                .filter((s) => matches(s.id))
                .map((s) => (
                  <button
                    key={s.id}
                    className="find-row"
                    onClick={() => start(s.id)}
                  >
                    <span className={`avatar ${s.color}`}>{s.initials}</span>
                    <span>
                      <strong>{s.name}</strong>
                      <small>
                        {s.id} · {s.className}
                      </small>
                    </span>
                    <ChevronRight size={20} />
                  </button>
                ))}
              {!students.some((s) => matches(s.id)) && (
                <p className="empty">No matching students.</p>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={!!current}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="visit-drawer">
            {current && student && (
              <>
                <div className="drawer-top">
                  <span className="section-kicker">STUDENT HEALTH RECORD</span>
                  <Dialog.Close asChild>
                    <button className="icon-button" aria-label="Close visit">
                      <X />
                    </button>
                  </Dialog.Close>
                </div>
                <div className="drawer-identity">
                  <span className={`avatar large ${student.color}`}>
                    {student.initials}
                  </span>
                  <div>
                    <Dialog.Title>{student.name}</Dialog.Title>
                    <Dialog.Description>
                      {student.id} · {student.age} years · {student.className} ·{" "}
                      {student.house}
                    </Dialog.Description>
                  </div>
                </div>
                <div
                  className={`allergy-banner ${student.allergy === "No known allergies" ? "no-allergy" : ""}`}
                >
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Allergies</strong>
                    <span>{student.allergy}</span>
                  </div>
                </div>
                <div className="drawer-meta">
                  <span
                    className={`badge ${current.stage.replaceAll(" ", "-").toLowerCase()}`}
                  >
                    {current.stage}
                  </span>
                  <span>Arrival {current.time}</span>
                  <span>{role} view · simulated</span>
                </div>
                <div
                  className="drawer-tabs"
                  role="tablist"
                  aria-label="Visit sections"
                >
                  {["Assessment", "Consultation", "Treatment", "History"].map(
                    (t) => (
                      <button
                        role="tab"
                        aria-selected={tab === t}
                        key={t}
                        onClick={() => {
                          setTab(t);
                          setError("");
                        }}
                        className={tab === t ? "selected" : ""}
                      >
                        {t}
                      </button>
                    ),
                  )}
                </div>
                <div className="drawer-body">
                  {tab === "Assessment" && (
                    <>
                      <div className="clinical-summary">
                        <div>
                          <span>Important conditions</span>
                          <strong>{student.conditions}</strong>
                        </div>
                        <div>
                          <span>Current medicines</span>
                          <strong>{student.medicines}</strong>
                        </div>
                      </div>
                      <label className="identity-check">
                        <input
                          type="checkbox"
                          checked={current.confirmed}
                          disabled={signed}
                          onChange={(e) =>
                            update({ confirmed: e.target.checked })
                          }
                        />
                        <span>
                          I confirmed the student’s name and student ID, and
                          reviewed allergies.
                        </span>
                      </label>
                      <fieldset disabled={signed || role !== "Nurse"}>
                        <label className="field">
                          Presenting complaint
                          <textarea
                            value={current.complaint}
                            onChange={(e) =>
                              update({ complaint: e.target.value })
                            }
                            placeholder="What brings the student to the clinic?"
                            rows={2}
                          />
                        </label>
                        <div className="form-section-heading">
                          <h3>Vital signs</h3>
                          <span>Record measured values only</span>
                        </div>
                        <div className="vitals-grid">
                          {(
                            [
                              {
                                key: "temp",
                                label: "Temperature",
                                unit: "°C",
                                placeholder: "36.8",
                              },
                              {
                                key: "pulse",
                                label: "Pulse",
                                unit: "bpm",
                                placeholder: "78",
                              },
                              {
                                key: "bp",
                                label: "Blood pressure",
                                unit: "mmHg",
                                placeholder: "112/72",
                              },
                              {
                                key: "spo2",
                                label: "Oxygen saturation",
                                unit: "%",
                                placeholder: "99",
                              },
                            ] as const
                          ).map((f) => (
                            <label className="field" key={f.key}>
                              {f.label}
                              <div className="unit-input">
                                <input
                                  aria-label={f.label}
                                  inputMode={
                                    f.key === "bp" ? "text" : "decimal"
                                  }
                                  value={current.vitals[f.key]}
                                  placeholder={f.placeholder}
                                  onChange={(e) =>
                                    update({
                                      vitals: {
                                        ...current.vitals,
                                        [f.key]: e.target.value,
                                      },
                                    })
                                  }
                                />
                                <span>{f.unit}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                        <label className="field">
                          Nurse assessment
                          <textarea
                            value={current.triage}
                            onChange={(e) => update({ triage: e.target.value })}
                            rows={4}
                            placeholder="Observations, relevant history and handover notes…"
                          />
                        </label>
                        <label className="field">
                          Priority
                          <select
                            value={current.priority}
                            onChange={(e) =>
                              update({
                                priority: e.target.value as Visit["priority"],
                              })
                            }
                          >
                            <option>Routine</option>
                            <option>Priority</option>
                            <option>Urgent</option>
                          </select>
                        </label>
                      </fieldset>
                      <div className="contact-box">
                        <Users size={18} />
                        <div>
                          <strong>Emergency contact</strong>
                          <p>{student.contact}</p>
                        </div>
                      </div>
                      {!signed && role === "Nurse" && (
                        <div className="routing">
                          <h3>Next step in care</h3>
                          <div className="button-wrap">
                            <Button onClick={() => route("Awaiting doctor")}>
                              Send to doctor
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => route("Nurse care")}
                            >
                              Nurse-only care
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => route("Observation")}
                            >
                              Observation
                            </Button>
                            <Button
                              variant="outline"
                              className="urgent-button"
                              onClick={() => {
                                update({
                                  stage: "Urgent care",
                                  priority: "Urgent",
                                });
                                notify(
                                  "Urgent care started. Document identity and findings when safe.",
                                );
                              }}
                            >
                              Urgent care
                            </Button>
                          </div>
                          <small>
                            Nurse-only treatment requires a locally approved
                            protocol. Urgent care bypasses the queue.
                          </small>
                        </div>
                      )}
                      {role === "Doctor" && (
                        <p className="helper">
                          The nurse’s assessment is read-only in the doctor
                          view. Continue in Consultation.
                        </p>
                      )}
                    </>
                  )}
                  {tab === "Consultation" && (
                    <>
                      {!signed &&
                        role === "Doctor" &&
                        current.stage !== "In consultation" && (
                          <Button
                            variant="outline"
                            onClick={() => route("In consultation")}
                          >
                            Begin consultation
                          </Button>
                        )}
                      <fieldset disabled={signed || role !== "Doctor"}>
                        <label className="field">
                          Assessment and diagnosis
                          <textarea
                            rows={5}
                            value={current.assessment}
                            onChange={(e) =>
                              update({ assessment: e.target.value })
                            }
                            placeholder="History, examination findings and clinical assessment…"
                          />
                        </label>
                        <label className="field">
                          Care plan
                          <textarea
                            rows={4}
                            value={current.plan}
                            onChange={(e) => update({ plan: e.target.value })}
                            placeholder="Treatment plan, investigations or referral…"
                          />
                        </label>
                      </fieldset>
                      <fieldset disabled={signed}>
                        <label className="field">
                          Follow-up and return instructions
                          <textarea
                            rows={3}
                            value={current.instructions}
                            onChange={(e) =>
                              update({ instructions: e.target.value })
                            }
                            placeholder="Instructions given to the student and when to seek review…"
                          />
                        </label>
                      </fieldset>
                      {role === "Nurse" && (
                        <p className="helper">
                          Doctor notes are read-only. For nurse-only care,
                          record the approved protocol and care in Nurse
                          assessment, then add instructions here.
                        </p>
                      )}
                      <div className="form-section-heading">
                        <h3>Add a follow-up task</h3>
                        <CalendarDays size={18} />
                      </div>
                      <label className="field">
                        Task
                        <input
                          value={followText}
                          onChange={(e) => setFollowText(e.target.value)}
                          placeholder="e.g. Review symptoms"
                        />
                      </label>
                      <label className="field">
                        Due date
                        <input
                          type="date"
                          value={followDate}
                          onChange={(e) => setFollowDate(e.target.value)}
                        />
                      </label>
                      <Button
                        variant="outline"
                        disabled={!followText.trim() || !followDate}
                        onClick={() => {
                          setTasks((old) => [
                            ...old,
                            {
                              id: crypto.randomUUID(),
                              studentId: student.id,
                              text: followText,
                              due: followDate,
                              owner: role,
                              done: false,
                            },
                          ]);
                          setFollowText("");
                          setFollowDate("");
                          notify("Follow-up added to the shared task list.");
                        }}
                      >
                        <Plus size={16} /> Add task
                      </Button>
                      {!signed && (
                        <div className="sign-panel">
                          <LockKeyhole size={22} />
                          <div>
                            <h3>Review, sign and close</h3>
                            <p>
                              Signing preserves this demo note. Later
                              corrections are added as amendments.
                            </p>
                            <Button onClick={sign}>
                              <CheckCheck size={17} /> Sign {role.toLowerCase()}{" "}
                              visit
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {tab === "Treatment" && (
                    <>
                      <div className="info-box">
                        <Pill size={21} />
                        <p>
                          Prescribing, dispensing and administration are
                          separate events. Recording one never creates the
                          others.
                        </p>
                      </div>
                      <fieldset disabled={signed}>
                        <label className="field">
                          Record type
                          <select
                            value={medKind}
                            onChange={(e) =>
                              setMedKind(e.target.value as typeof medKind)
                            }
                          >
                            {role === "Doctor" && <option>Prescribed</option>}
                            <option>Dispensed</option>
                            <option>Administered</option>
                          </select>
                        </label>
                        <label className="field">
                          Medication or treatment details
                          <textarea
                            rows={4}
                            value={medText}
                            onChange={(e) => setMedText(e.target.value)}
                            placeholder="For the demo, enter fictional treatment details, including dose, route and relevant instructions. No prescribing guidance is provided."
                          />
                        </label>
                        <Button
                          disabled={!medText.trim() || !current.confirmed}
                          onClick={() => {
                            update({
                              medications: [
                                ...current.medications,
                                {
                                  kind: medKind,
                                  text: medText,
                                  author: role,
                                  time: stamp(),
                                },
                              ],
                            });
                            setMedText("");
                            notify(
                              "Separate treatment event recorded in this demo.",
                            );
                          }}
                        >
                          <Plus size={16} /> Record event
                        </Button>
                        {!current.confirmed && (
                          <p className="helper">
                            Confirm identity in Assessment before recording
                            treatment.
                          </p>
                        )}
                      </fieldset>
                      <h3 className="section-title">Treatment record</h3>
                      {current.medications.length === 0 ? (
                        <div className="empty">
                          <Pill size={28} />
                          <p>No treatment events recorded.</p>
                        </div>
                      ) : (
                        current.medications.map((m, i) => (
                          <article className="timeline-note" key={i}>
                            <span className="badge">{m.kind}</span>
                            <p>{m.text}</p>
                            <small>
                              {m.author} · {m.time}
                            </small>
                          </article>
                        ))
                      )}
                    </>
                  )}
                  {tab === "History" && (
                    <>
                      <div className="info-box">
                        <History size={21} />
                        <p>
                          This fictional chart contains today’s visits only. No
                          historical medical folders have been imported.
                        </p>
                      </div>
                      {visits
                        .filter((v) => v.studentId === student.id)
                        .map((v) => (
                          <article className="history-visit" key={v.id}>
                            <div className="panel-heading">
                              <h3>{v.complaint || "New visit"}</h3>
                              <span className="badge">{v.stage}</span>
                            </div>
                            <small>Demo day · {v.time}</small>
                            {v.signed.map((n, i) => (
                              <div className="timeline-note" key={i}>
                                <strong>
                                  {n.kind} · {n.author}
                                </strong>
                                <small>{n.time}</small>
                                {n.kind === "Original" ? (
                                  <dl className="signed-content">
                                    {Object.entries(
                                      JSON.parse(n.text) as Record<
                                        string,
                                        unknown
                                      >,
                                    ).map(([key, value]) => (
                                      <React.Fragment key={key}>
                                        <dt>{key}</dt>
                                        <dd>
                                          {typeof value === "object"
                                            ? Object.entries(
                                                value as Record<string, string>,
                                              )
                                                .map(
                                                  ([k, val]) =>
                                                    `${k}: ${val || "Not recorded"}`,
                                                )
                                                .join(" · ")
                                            : String(value || "Not recorded")}
                                        </dd>
                                      </React.Fragment>
                                    ))}
                                  </dl>
                                ) : (
                                  <p>{n.text}</p>
                                )}
                              </div>
                            ))}
                          </article>
                        ))}
                      {signed && (
                        <>
                          <label className="field">
                            Add an amendment
                            <textarea
                              value={amendment}
                              onChange={(e) => setAmendment(e.target.value)}
                              rows={3}
                              placeholder="State the correction and the reason. The signed original stays unchanged."
                            />
                          </label>
                          <Button
                            disabled={!amendment.trim()}
                            onClick={() => {
                              update({
                                signed: [
                                  ...current.signed,
                                  {
                                    text: amendment,
                                    author: role,
                                    time: stamp(),
                                    kind: "Amendment",
                                  },
                                ],
                              });
                              setAmendment("");
                              notify(
                                "Amendment added; original note retained.",
                              );
                            }}
                          >
                            Save amendment
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  {error && (
                    <div className="form-error" role="alert">
                      <AlertTriangle size={17} />
                      {error}
                    </div>
                  )}
                </div>
                <div className="drawer-footer">
                  <span>
                    {signed ? (
                      <>
                        <LockKeyhole size={15} /> Signed record · demo
                      </>
                    ) : (
                      <>
                        <Check size={15} /> Draft held in this demo session
                      </>
                    )}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(null)}
                  >
                    Done
                  </Button>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {notice && (
        <div className="toast" role="status">
          <Check size={19} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
