export type Stage =
  | "Awaiting triage"
  | "Awaiting doctor"
  | "In consultation"
  | "Nurse care"
  | "Observation"
  | "Urgent care"
  | "Closed";
export type Role = "Nurse" | "Doctor";
export type Student = {
  id: string;
  name: string;
  age: number;
  className: string;
  house: string;
  allergy: string;
  conditions: string;
  medicines: string;
  contact: string;
  initials: string;
  color: string;
};
export type SignedNote = {
  text: string;
  author: Role;
  time: string;
  kind: "Original" | "Amendment";
};
export type MedicationEvent = {
  kind: "Prescribed" | "Dispensed" | "Administered";
  text: string;
  author: Role;
  time: string;
};
export type Visit = {
  id: string;
  studentId: string;
  complaint: string;
  stage: Stage;
  priority: "Routine" | "Priority" | "Urgent";
  time: string;
  vitals: { temp: string; pulse: string; bp: string; spo2: string };
  triage: string;
  assessment: string;
  plan: string;
  instructions: string;
  confirmed: boolean;
  signed: SignedNote[];
  medications: MedicationEvent[];
};
export const students: Student[] = [
  {
    id: "ST-0241",
    name: "Akosua Mensah",
    age: 16,
    className: "IB 1",
    house: "Volta House",
    allergy: "Penicillin · rash",
    conditions: "Asthma",
    medicines: "See clinician-verified medication list",
    contact: "Ama Mensah · guardian · contact withheld in demo",
    initials: "AM",
    color: "pink",
  },
  {
    id: "ST-0186",
    name: "Kwame Boateng",
    age: 15,
    className: "IGCSE 2",
    house: "Densu House",
    allergy: "No known allergies",
    conditions: "None recorded",
    medicines: "None recorded",
    contact: "Kofi Boateng · guardian · contact withheld in demo",
    initials: "KB",
    color: "blue",
  },
  {
    id: "ST-0309",
    name: "Abena Owusu",
    age: 17,
    className: "IB 2",
    house: "Pra House",
    allergy: "Not yet assessed",
    conditions: "None recorded",
    medicines: "Not yet reviewed",
    contact: "Efua Owusu · guardian · contact withheld in demo",
    initials: "AO",
    color: "purple",
  },
  {
    id: "ST-0118",
    name: "Kofi Asante",
    age: 15,
    className: "IGCSE 1",
    house: "Volta House",
    allergy: "No known allergies",
    conditions: "None recorded",
    medicines: "None recorded",
    contact: "Akua Asante · guardian · contact withheld in demo",
    initials: "KA",
    color: "orange",
  },
  {
    id: "ST-0275",
    name: "Efua Agyeman",
    age: 16,
    className: "IB 1",
    house: "Densu House",
    allergy: "No known allergies",
    conditions: "None recorded",
    medicines: "None recorded",
    contact: "Kojo Agyeman · guardian · contact withheld in demo",
    initials: "EA",
    color: "green",
  },
  {
    id: "ST-0332",
    name: "Yaw Osei",
    age: 17,
    className: "IB 2",
    house: "Pra House",
    allergy: "Not yet assessed",
    conditions: "None recorded",
    medicines: "Not yet reviewed",
    contact: "Adwoa Osei · guardian · contact withheld in demo",
    initials: "YO",
    color: "blue",
  },
];
export const makeVisit = (studentId: string): Visit => ({
  id: crypto.randomUUID(),
  studentId,
  complaint: "",
  stage: "Awaiting triage",
  priority: "Routine",
  time: new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }),
  vitals: { temp: "", pulse: "", bp: "", spo2: "" },
  triage: "",
  assessment: "",
  plan: "",
  instructions: "",
  confirmed: false,
  signed: [],
  medications: [],
});
export const initialVisits: Visit[] = students
  .slice(0, 5)
  .map((s, i) => ({
    ...makeVisit(s.id),
    id: `visit-${i}`,
    complaint: [
      "Headache and feeling unwell",
      "Ankle discomfort after football",
      "Sore throat",
      "Small abrasion on left knee",
      "Rest and repeat observations",
    ][i],
    stage: (
      [
        "Awaiting doctor",
        "Awaiting doctor",
        "Awaiting triage",
        "Nurse care",
        "Observation",
      ] as Stage[]
    )[i],
    priority: i === 0 ? "Priority" : "Routine",
    time: ["09:05", "09:12", "09:24", "09:31", "09:38"][i],
    vitals:
      i === 2
        ? { temp: "", pulse: "", bp: "", spo2: "" }
        : { temp: "36.8", pulse: "78", bp: "112/72", spo2: "99" },
    triage:
      i === 0
        ? "Student reports headache since this morning. Alert and able to describe symptoms. Allergy history reviewed."
        : "",
  }));
export type Task = {
  id: string;
  studentId: string;
  text: string;
  due: string;
  owner: Role;
  done: boolean;
};
export const initialTasks: Task[] = [
  {
    id: "t1",
    studentId: "ST-0275",
    text: "Review student in observation",
    due: "Today · 10:15",
    owner: "Nurse",
    done: false,
  },
  {
    id: "t2",
    studentId: "ST-0186",
    text: "Follow up after ankle assessment",
    due: "Tomorrow · 09:00",
    owner: "Nurse",
    done: false,
  },
];
