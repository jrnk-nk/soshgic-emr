import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, Bell, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Clock3, HeartPulse, Inbox, Plus, RotateCcw, Search, ShieldCheck, Stethoscope, Users, X } from "lucide-react";
import { Button } from "./components/ui/button";
import { students } from "./data";
import { applyAction, createInitialState, isActive, orderedQueue, studentFor, type Action, type ClinicState, type Role, type Visit } from "./clinic";
import { Encounter } from "./Encounter";
import { AllergyStrip, ConfirmDialog, Empty, Modal, StageBadge, StudentIdentity, formatDate, formatTime, waitTime } from "./ui";
import "./clinic.css";

type Page = "Worklist" | "Students" | "Care messages" | "Follow-ups" | "Reports";
type Filter = "My work" | "Awaiting doctor" | "Urgent" | "Observation" | "All active" | "Closed";
const STORE_KEY = "school-clinic-demo-v2";
const nav = [{ name: "Worklist", icon: ClipboardList }, { name: "Students", icon: Users }, { name: "Care messages", icon: Inbox }, { name: "Follow-ups", icon: CalendarDays }, { name: "Reports", icon: Activity }] as const;
function readState(): ClinicState {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null");
    if (saved?.version === 2 && Array.isArray(saved.state?.visits) && Array.isArray(saved.state?.tasks) && saved.state.visits.every((v: Visit) => students.some(s => s.id === v.studentId) && Array.isArray(v.messages) && Array.isArray(v.signatures) && Array.isArray(v.timeline) && Array.isArray(v.treatments) && Array.isArray(v.observations))) return saved.state;
  } catch { /* Invalid or unavailable storage starts a new synthetic demonstration. */ }
  return createInitialState();
}
function belongsToRole(v: Visit, role: Role) {
  if (!isActive(v)) return false;
  return role === "Doctor" ? v.requiresDoctor && !v.signatures.some(s => s.role === "Doctor") : ["Triage", "Nurse care", "Awaiting treatment", "Observation", "Ready to close"].includes(v.stage);
}
function App() {
  const [state, setState] = useState<ClinicState>(readState);
  const stateRef = useRef(state);
  const [role, setRole] = useState<Role>("Nurse");
  const [page, setPage] = useState<Page>("Worklist");
  const [filter, setFilter] = useState<Filter>("My work");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [finding, setFinding] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [findText, setFindText] = useState("");
  const [reset, setReset] = useState(false);
  const [directStudent, setDirectStudent] = useState<string | null>(null);
  const [directComplaint, setDirectComplaint] = useState("");
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [storageFailed, setStorageFailed] = useState(false);
  const [now, setNow] = useState(Date.now());
  const dirtyRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ version: 2, state })); setStorageFailed(false); }
    catch { setStorageFailed(true); }
  }, [state]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => { if (dirtyRef.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", protect);
    return () => { window.removeEventListener("beforeunload", protect); if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);
  function notify(text: string, error = false) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setNotice({ text, error });
    toastTimer.current = setTimeout(() => setNotice(null), 6500);
  }
  function run(action: Action): boolean {
    const result = applyAction(stateRef.current, role, action);
    if (result.error) { notify(result.error, true); return false; }
    stateRef.current = result.state;
    setState(result.state);
    if (result.message) notify(result.message);
    return true;
  }
  function navigate(fn: () => void) {
    if (dirtyRef.current && !window.confirm("You have unsaved clinical notes. Discard those edits and continue?")) return;
    dirtyRef.current = false;
    fn();
  }
  function openVisit(id: string) { navigate(() => { setSelected(id); setStudentId(null); setFinding(false); }); }
  function startVisit(id: string) {
    const existing = stateRef.current.visits.find(v => v.studentId === id && isActive(v));
    if (existing) return openVisit(existing.id);
    if (role === "Doctor") { setDirectStudent(id); setDirectComplaint(""); setStudentId(null); setFinding(false); return; }
    if (run({ type: "create", studentId: id })) {
      const created = stateRef.current.visits.find(v => v.studentId === id && isActive(v));
      if (created) openVisit(created.id);
    }
  }
  const current = state.visits.find(v => v.id === selected);
  const active = state.visits.filter(isActive);
  const incoming = state.visits.flatMap(v => v.messages.filter(m => m.to === role).map(m => ({ ...m, visit: v }))).sort((a, b) => b.at.localeCompare(a.at));
  const unread = incoming.filter(m => !m.acknowledgedAt);
  const openTasks = state.tasks.filter(t => !t.done && t.owner === role);
  const overdue = openTasks.filter(t => new Date(t.due).getTime() < now);
  const matches = (id: string, text: string) => { const s = studentFor(id); return (s.name + " " + s.id + " " + s.className).toLowerCase().includes(text.trim().toLowerCase()); };
  const shown = (filter === "Closed" ? state.visits.filter(v => !isActive(v)).slice().sort((a,b) => b.arrivedAt.localeCompare(a.arrivedAt)) : orderedQueue(state.visits)).filter(v => matches(v.studentId, search) && (filter === "My work" ? belongsToRole(v, role) : filter === "All active" ? isActive(v) : filter === "Closed" ? !isActive(v) : filter === "Urgent" ? isActive(v) && v.priority === "Urgent" : v.stage === filter));
  const student = studentId ? studentFor(studentId) : null;
  const sectionTitle = role === "Nurse" ? "Nursing worklist" : "Doctor worklist";
  const queueTabs: Filter[] = ["My work", "Awaiting doctor", "Urgent", "Observation", "All active", "Closed"];

  return <div className="clinic-app" data-role={role}>
    <aside className="app-sidebar">
      <a href="#" className="clinic-brand" aria-label="School Clinic home" onClick={e => { e.preventDefault(); navigate(() => { setSelected(null); setPage("Worklist"); }); }}><span className="brand-symbol"><Plus size={25}/></span><span className="nav-label">School Clinic<small>STUDENT HEALTH</small></span></a>
      <p className="eyebrow nav-label">CARE WORKSPACE</p>
      <nav aria-label="Main navigation">{nav.map(({ name, icon: Icon }) => <button key={name} className="nav-link" aria-label={name} aria-current={page === name && !current ? "page" : undefined} onClick={() => navigate(() => { setPage(name); setSelected(null); setSearch(""); })}><Icon size={20}/><span className="nav-label">{name}</span>{name === "Care messages" && unread.length > 0 && <b>{unread.length}</b>}{name === "Follow-ups" && openTasks.length > 0 && <b>{openTasks.length}</b>}</button>)}</nav>
      <div className="sidebar-footer"><ShieldCheck size={22}/><div className="nav-label"><strong>School clinic pilot</strong><small>Synthetic demonstration</small></div><button className="icon-button" aria-label="Reset demo" onClick={() => navigate(() => setReset(true))}><RotateCcw size={18}/></button></div>
    </aside>
    <div className="app-main">
      <header className="app-topbar"><div className="staff-chip">{role === "Nurse" ? <HeartPulse size={22}/> : <Stethoscope size={22}/>}<div><strong>{role === "Nurse" ? "Nurse Adjei" : "Dr. Kusi"}</strong><small>{role} workspace</small></div></div><div className="role-switch" aria-label="Demo staff role"><span>Demo role</span>{(["Nurse", "Doctor"] as const).map(r => <button key={r} aria-pressed={role === r} onClick={() => navigate(() => { setRole(r); setSelected(null); setPage("Worklist"); setFilter("My work"); setSearch(""); })}>{r}</button>)}</div><button className="icon-button" aria-label={"Care messages, " + unread.length + " unread"} onClick={() => navigate(() => { setSelected(null); setPage("Care messages"); })}><Bell size={20}/>{unread.length > 0 && <b>{unread.length}</b>}</button></header>
      <main className="workspace">
        <div className="demo-strip"><ShieldCheck size={17}/><span><strong>Fictional records only.</strong> {storageFailed ? "Browser storage is unavailable; refreshing will lose saved demo changes." : "Saved in this tab. Other computers do not share this demo."} Roles are simulated.</span></div>
        {current ? <Encounter key={current.id + role} visit={current} role={role} state={state} run={run} onDirty={dirty => { dirtyRef.current = dirty; }} onBack={() => navigate(() => setSelected(null))}/> : <>
          <div className="page-intro"><div><p className="eyebrow">{new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: "Africa/Accra" }).format(new Date(now))} · GHANA TIME</p><h1>{page === "Worklist" ? sectionTitle : page}</h1><p>{page === "Worklist" ? role === "Nurse" ? "Assess students, hand over clearly, and complete the next step in care." : "Review handovers, accept students, and document your consultation." : page === "Students" ? "Look up a chart without opening an unnecessary visit." : page === "Care messages" ? "Student-specific messages with explicit acknowledgement." : page === "Follow-ups" ? "Assigned tasks with due dates and completion tracking." : "Aggregate activity from this fictional demonstration."}</p></div><div className="page-actions"><Button onClick={() => { setFinding(true); setFindText(""); }}><Plus size={17}/> {role === "Nurse" ? "Register visit" : "New consultation"}</Button></div></div>
          {page === "Worklist" && <>
            <div className="summary-grid">{[{label:"Your active work",value:active.filter(v=>belongsToRole(v,role)).length,detail:role+" worklist",icon:ClipboardList},{label:"Awaiting doctor",value:active.filter(v=>v.stage==="Awaiting doctor").length,detail:"Handover sent",icon:Stethoscope},{label:"Urgent",value:active.filter(v=>v.priority==="Urgent").length,detail:"Prioritised at the top",icon:HeartPulse},{label:"Follow-ups due",value:overdue.length,detail:openTasks.length+" assigned to you",icon:Clock3}].map(({label,value,detail,icon:Icon})=><div className="summary-card" key={label}><span>{label}<Icon size={20}/></span><strong>{value.toString().padStart(2,"0")}</strong><small>{detail}</small></div>)}</div>
            <div className="work-grid"><section className="panel"><div className="panel-head"><div><h2>Shared clinic queue</h2><p className="muted">Urgent first, then priority and arrival time.</p></div><span className="badge stage">{active.length} active</span></div><div className="toolbar"><div className="search-field"><Search size={18}/><input aria-label="Search queue" placeholder="Student name, ID or class" value={search} onChange={e=>setSearch(e.target.value)}/></div><label className="filter-field"><span className="sr-only">Queue view</span><select aria-label="Queue view" value={filter} onChange={e=>setFilter(e.target.value as Filter)}>{queueTabs.map(f=><option key={f}>{f}</option>)}</select></label></div><div className="queue-tabs">{queueTabs.slice(0,5).map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f}</button>)}</div><div className="queue-table"><table><thead><tr><th>Student</th><th>Reason & priority</th><th>Care stage</th><th>Handover / owner</th><th>Waiting</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>{shown.map(v=><tr key={v.id}><td><StudentIdentity id={v.studentId}/></td><td><strong>{v.complaint||"Assessment not yet recorded"}</strong><div><span className={"badge "+v.priority.toLowerCase()}>{v.priority}</span></div></td><td><span className="badge stage">{v.stage}</span></td><td><div className="queue-meta">{v.handover ? v.handover.acknowledgedAt ? <><strong>Accepted by doctor</strong><small>{formatTime(v.handover.acknowledgedAt)}</small></> : <><strong>Waiting for acceptance</strong><small>Sent {formatTime(v.handover.sentAt)}</small></> : <><strong>{v.observation?.owner||"Nurse"}</strong><small>{v.stage==="Observation"&&v.observation ? "Review "+formatTime(v.observation.reviewAt) : "No handover sent"}</small></>}</div></td><td>{isActive(v)?waitTime(v.arrivedAt,now):"Complete"}</td><td><Button size="sm" variant="outline" aria-label={"Open visit for "+studentFor(v.studentId).name} onClick={()=>openVisit(v.id)}>Open<ChevronRight size={15}/></Button></td></tr>)}</tbody></table></div>{shown.length===0&&<Empty title="No visits in this view">Choose All active to see the shared queue, or register a new visit.</Empty>}<div className="queue-footer"><span>{shown.length} visits shown</span><span>Times shown in Ghana time</span></div></section>
              <aside><section className="insight-card"><p className="eyebrow">{role==="Nurse"?"NURSING HANDOVER":"DOCTOR INBOX"}</p><h2>{role==="Nurse"?"A clear handover starts here.":"Know what needs your attention."}</h2><p>{role==="Nurse"?"Confirm identity and allergies, record the assessment, sign your note, then send a summary to the doctor.":"Read the nursing summary, acknowledge the handover, then begin consultation. Signing your note leaves nursing treatment open."}</p><div className="handover-alert"><strong>{role==="Nurse"?unread.length:active.filter(v=>v.handover&&!v.handover.acknowledgedAt).length}</strong><span>{role==="Nurse"?"unread care messages":"handovers awaiting acceptance"}</span></div><Button variant="outline" onClick={()=>role==="Nurse"?setPage("Care messages"):setFilter("Awaiting doctor")}>{role==="Nurse"?"Open care messages":"Review handovers"}</Button></section><section className="panel"><div className="panel-head"><h2>Your next follow-ups</h2></div>{openTasks.slice().sort((a,b)=>a.due.localeCompare(b.due)).slice(0,3).map(t=><button key={t.id} className="mini-task" onClick={()=>openVisit(t.visitId)}><strong>{studentFor(t.studentId).name}</strong><span>{t.text}</span><small>{formatDate(t.due)}</small></button>)}{!openTasks.length&&<Empty title="No pending tasks"/>}<button className="text-button" onClick={()=>setPage("Follow-ups")}>View follow-up list</button></section></aside>
            </div>
          </>}
          {page==="Students"&&<section className="panel"><div className="panel-head"><div><h2>Student directory</h2><p className="muted">{students.length} fictional records</p></div><div className="search-field"><Search size={18}/><input aria-label="Search students" placeholder="Name, student ID or class" value={search} onChange={e=>setSearch(e.target.value)}/></div></div><div className="directory-grid">{students.filter(s=>matches(s.id,search)).map(s=><article className="student-card" key={s.id}><StudentIdentity id={s.id} large/><dl><dt>House</dt><dd>{s.house}</dd><dt>Allergies</dt><dd>{s.allergy}</dd><dt>Important conditions</dt><dd>{s.conditions}</dd></dl><Button variant="outline" onClick={()=>setStudentId(s.id)}>View student chart</Button></article>)}</div>{!students.some(s=>matches(s.id,search))&&<Empty title="No matching students">Try the student ID or a different spelling.</Empty>}</section>}
          {page==="Care messages"&&<section className="panel"><div className="panel-head"><div><h2>{role} inbox</h2><p className="muted">{unread.length} messages awaiting acknowledgement</p></div></div>{incoming.length===0?<Empty title="No incoming care messages">Messages sent by the other role will appear here in this demo tab.</Empty>:incoming.map(m=><article className={"message-card "+(!m.acknowledgedAt?"unread":"")} key={m.id}><div className="event-meta"><strong>{studentFor(m.visit.studentId).name} · from {m.from}</strong><span>{formatDate(m.at)}</span></div><p>{m.text}</p><div className="action-bar"><Button variant="outline" size="sm" onClick={()=>openVisit(m.visit.id)}>Open visit</Button>{!m.acknowledgedAt?<Button size="sm" onClick={()=>run({type:"acknowledgeMessage",visitId:m.visit.id,messageId:m.id})}>Acknowledge message</Button>:<span className="muted">Acknowledged {formatDate(m.acknowledgedAt)}</span>}</div></article>)}</section>}
          {page==="Follow-ups"&&<section className="panel"><div className="panel-head"><div><h2>Assigned follow-ups</h2><p className="muted">You can complete tasks assigned to your role.</p></div></div><div className="task-list">{state.tasks.slice().sort((a,b)=>Number(a.done)-Number(b.done)||a.due.localeCompare(b.due)).map(t=><article key={t.id} className={"task-row "+(t.done?"task-complete":"")}><button className="task-check" disabled={t.owner!==role} aria-label={(t.done?"Reopen ":"Complete ")+t.text} aria-pressed={t.done} onClick={()=>run({type:"toggleTask",taskId:t.id})}>{t.done?"✓":""}</button><div><strong>{t.text}</strong><p>{studentFor(t.studentId).name} · assigned to {t.owner}</p><small className={new Date(t.due).getTime()<now&&!t.done?"error-message":"muted"}>{t.done?"Completed "+formatDate(t.completedAt||t.due):"Due "+formatDate(t.due)}</small></div><Button size="sm" variant="outline" onClick={()=>openVisit(t.visitId)}>Open visit</Button></article>)}</div>{!state.tasks.length&&<Empty title="No follow-up tasks"/>}</section>}
          {page==="Reports"&&<section className="panel"><div className="panel-head"><div><h2>Clinic activity</h2><p className="muted">Aggregate counts from this demo tab. Small counts are fictional.</p></div></div><div className="report-grid">{[{label:"Total visits",value:state.visits.length},{label:"Completed visits",value:state.visits.filter(v=>!isActive(v)).length},{label:"Open follow-ups",value:state.tasks.filter(t=>!t.done).length}].map(x=><div className="report-stat" key={x.label}><strong>{x.value}</strong><span>{x.label}</span></div>)}</div>{["Triage","Awaiting doctor","In consultation","Nurse care","Awaiting treatment","Observation","Ready to close","Closed","Referred"].map(stage=><div className="bar-row" key={stage}><span>{stage}</span><div className="bar-track"><i style={{width:(state.visits.filter(v=>v.stage===stage).length/Math.max(1,state.visits.length)*100)+"%"}}/></div><b>{state.visits.filter(v=>v.stage===stage).length}</b></div>)}<p className="helper-text">Leadership access and small-group suppression must be implemented before reporting on real students.</p></section>}
        </>}
        <footer className="app-footer"><span>School Clinic · student care workspace</span><span>Prototype · no real authentication or shared clinical database</span></footer>
      </main>
    </div>
    <Modal open={finding} onClose={()=>setFinding(false)} title="Register a clinic visit" description="Search fictional students. Existing active visits are opened instead of duplicated."><div className="search-field"><Search size={18}/><input autoFocus aria-label="Find student" placeholder="Name, student ID or class" value={findText} onChange={e=>setFindText(e.target.value)}/></div><div className="search-results">{students.filter(s=>matches(s.id,findText)).map(s=><button className="student-option" key={s.id} onClick={()=>startVisit(s.id)}><StudentIdentity id={s.id}/><span>{active.some(v=>v.studentId===s.id)?"Open active visit":"Register"}<ChevronRight size={15}/></span></button>)}{!students.some(s=>matches(s.id,findText))&&<Empty title="No matching student"/>}</div></Modal>
    {student&&<Modal open onClose={()=>setStudentId(null)} title={student.name} description={student.id+" · "+student.className+" · "+student.house} footer={<><Button variant="outline" onClick={()=>setStudentId(null)}>Close</Button>{active.some(v=>v.studentId===student.id)?<Button onClick={()=>openVisit(active.find(v=>v.studentId===student.id)!.id)}>Open active visit</Button>:<Button onClick={()=>startVisit(student.id)}>{role==="Nurse"?"Register visit":"Start direct consultation"}</Button>}</>}><AllergyStrip id={student.id}/><div className="patient-summary"><dl><dt>Important conditions</dt><dd>{student.conditions}</dd><dt>Current medicines</dt><dd>{student.medicines}</dd><dt>Emergency contact</dt><dd>{student.contact}</dd></dl></div><h3>Visit history</h3>{state.visits.filter(v=>v.studentId===student.id).length===0?<Empty title="No visits recorded">Looking up a chart does not register a visit.</Empty>:state.visits.filter(v=>v.studentId===student.id).map(v=><button className="student-option" key={v.id} onClick={()=>openVisit(v.id)}><div><strong>{v.complaint||"New assessment"}</strong><small>{formatDate(v.arrivedAt)}</small></div><span className="badge stage">{v.stage}</span></button>)}</Modal>}
    {directStudent&&<Modal open onClose={()=>setDirectStudent(null)} title="Start direct doctor consultation" description="For students seen directly by the doctor. A nursing assessment is not invented." footer={<><Button variant="outline" onClick={()=>setDirectStudent(null)}>Cancel</Button><Button disabled={!directComplaint.trim()} onClick={()=>{if(run({type:"create",studentId:directStudent,complaint:directComplaint})){const created=stateRef.current.visits.find(v=>v.studentId===directStudent&&isActive(v));setDirectStudent(null);setDirectComplaint("");if(created)openVisit(created.id);}}}>Create direct consultation</Button></>}><StudentIdentity id={directStudent}/><label className="field">Presenting complaint<textarea rows={3} value={directComplaint} onChange={e=>setDirectComplaint(e.target.value)}/></label></Modal>}
    {reset&&<ConfirmDialog title="Reset the fictional demo?" description="This clears all changes and restores the sample students, queues and tasks in this tab." onClose={()=>setReset(false)} onConfirm={()=>{const fresh=createInitialState();stateRef.current=fresh;setState(fresh);setSelected(null);setStudentId(null);setReset(false);setPage("Worklist");notify("Fictional demo reset.");}}/>}
    {notice&&<div role={notice.error?"alert":"status"} className={"toast "+(notice.error?"toast-error":"")}><span>{notice.text}</span><button aria-label="Dismiss notification" onClick={()=>setNotice(null)}><X size={18}/></button></div>}
  </div>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
