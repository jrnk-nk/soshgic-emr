import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "./components/ui/button";
import { studentFor, type Visit } from "./clinic";

export function formatDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Not recorded" : new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Accra", dateStyle: "medium", timeStyle: "short" }).format(d);
}
export function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Accra", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
export function waitTime(value: string, now = Date.now()) {
  const mins = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60000));
  return mins >= 60 ? Math.floor(mins / 60) + "h " + mins % 60 + "m" : mins + " min";
}
export function fromDateInput(value: string) {
  return value ? new Date(value + ":00Z").toISOString() : "";
}
export function StudentIdentity({ id, large = false }: { id: string; large?: boolean }) {
  const s = studentFor(id);
  return <div className="student-cell"><span className={"avatar " + s.color + (large ? " large" : "")}>{s.initials}</span><div><strong>{s.name}</strong><small>{s.id} · {s.className}{large && " · " + s.age + " years"}</small></div></div>;
}
export function StageBadge({ visit }: { visit: Visit }) {
  return <><span className="badge stage">{visit.stage}</span>{visit.priority !== "Routine" && <span className={"badge " + visit.priority.toLowerCase()}>{visit.priority}</span>}</>;
}
export function AllergyStrip({ id }: { id: string }) {
  const s = studentFor(id);
  const clear = s.allergy === "No known allergies";
  const unknown = s.allergy === "Not yet assessed";
  return <div className={"allergy-strip " + (clear ? "clear" : unknown ? "unknown" : "")}>{clear ? <CheckCircle2 size={19}/> : <AlertTriangle size={19}/>}<strong>Allergies:</strong><span>{s.allergy}</span>{unknown && <small>Unknown is not the same as none.</small>}</div>;
}
export function Modal({ open, onClose, title, description, children, footer }: { open: boolean; onClose: () => void; title: string; description: string; children: ReactNode; footer?: ReactNode }) {
  return <Dialog.Root open={open} onOpenChange={o => { if (!o) onClose(); }}><Dialog.Portal><Dialog.Overlay className="modal-overlay"/><Dialog.Content className="modal-content"><div className="modal-header"><div><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description}</Dialog.Description></div><Dialog.Close asChild><button className="icon-button" aria-label="Close dialog"><X size={20}/></button></Dialog.Close></div><div className="modal-body">{children}</div>{footer && <div className="modal-footer">{footer}</div>}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty-state"><CheckCircle2 size={30}/><h3>{title}</h3>{children && <p>{children}</p>}</div>;
}
export function ConfirmDialog({ title, description, onConfirm, onClose, children }: { title: string; description: string; onConfirm: () => void; onClose: () => void; children?: ReactNode }) {
  return <Modal open onClose={onClose} title={title} description={description} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={onConfirm}>Confirm</Button></>}>{children}</Modal>;
}
