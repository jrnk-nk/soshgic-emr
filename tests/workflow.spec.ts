import { test, expect, type Page } from "@playwright/test";

async function sign(page: Page) { await page.getByRole("dialog").getByRole("button", {name:"Confirm",exact:true}).click(); }
async function openVisit(page: Page, name: string) { await page.getByRole("button", {name:"Open visit for "+name,exact:true}).click(); }
async function switchRole(page: Page, role: "Nurse"|"Doctor") { await page.getByRole("button",{name:role,exact:true}).click(); }

test.afterEach(async ({page}, info) => {
  if (info.status !== info.expectedStatus) {
    console.log("FAILED_PAGE", (await page.locator("body").innerText()).slice(-14000));
    console.log("OVERFLOW", await page.evaluate(() => Array.from(document.querySelectorAll("body *")).filter(e => e.getBoundingClientRect().right > window.innerWidth + 1 && !e.closest(".queue-table")).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}))));
  }
});
test("nurse handover is accepted by doctor and signatures leave nursing treatment open", async ({page}) => {
  const errors:string[]=[]; page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/");
  await openVisit(page,"Abena Owusu");
  await page.getByRole("button",{name:"Confirm identity and alerts",exact:true}).click();
  await page.getByRole("textbox",{name:"Nurse assessment",exact:true}).fill("Synthetic assessment; request doctor review.");
  await page.getByRole("button",{name:"Save nurse assessment",exact:true}).click();
  await page.getByRole("button",{name:"Sign nurse assessment",exact:true}).click();
  await sign(page);
  await page.getByLabel("Handover summary and requested review").fill("Situation: sore throat. Background reviewed. Please assess.");
  await page.getByRole("button",{name:"Send to doctor queue",exact:true}).click();
  await expect(page.locator(".patient-banner")).toContainText("Awaiting doctor");
  await page.getByRole("button",{name:"Back to workspace",exact:true}).click();
  await switchRole(page,"Doctor");
  await expect(page.getByRole("heading",{name:"Doctor worklist",exact:true})).toBeVisible();
  await openVisit(page,"Abena Owusu");
  await page.getByRole("button",{name:"Accept handover",exact:true}).click();
  await expect(page.locator(".handover-summary")).toContainText("Accepted");
  await page.getByRole("button",{name:"Begin consultation",exact:true}).click();
  await page.getByLabel("Assessment and diagnosis").fill("Fictional assessment.");
  await page.getByLabel("Care plan",{exact:true}).fill("Fictional plan and treatment order.");
  await page.getByLabel("Follow-up and return instructions").fill("Fictional instructions supplied.");
  await page.getByRole("button",{name:"Save consultation",exact:true}).click();
  await page.getByRole("button",{name:"Sign doctor consultation",exact:true}).click();
  await sign(page);
  await expect(page.locator(".patient-banner")).not.toContainText("Closed");
  await page.getByLabel("Prescription details").fill("Demo medicine order; fictional details only.");
  await page.getByRole("button",{name:"Record treatment event",exact:true}).click();
  await expect(page.locator(".event-list .event-card")).toHaveCount(1);
  await page.getByRole("button",{name:"Consultation",exact:true}).click();
  await expect(page.getByRole("textbox",{name:"Assessment and diagnosis",exact:true})).toBeDisabled();
  await page.getByRole("button",{name:"Send for nursing treatment",exact:true}).click();
  await page.getByRole("button",{name:"Back to workspace",exact:true}).click();
  await switchRole(page,"Nurse");
  await openVisit(page,"Abena Owusu");
  await expect(page.getByRole("option",{name:"Prescribed",exact:true})).toHaveCount(0);
  await page.getByLabel("Related prescription").selectOption({index:1});
  await page.getByLabel("Treatment details").fill("Fictional administration recorded separately.");
  await page.getByRole("button",{name:"Record treatment event",exact:true}).click();
  await expect(page.locator(".event-list .event-card")).toHaveCount(2);
  await page.getByRole("button",{name:"Review & close",exact:true}).click();
  await page.getByRole("button",{name:"Mark ready to close",exact:true}).click();
  await page.getByRole("button",{name:"Close visit",exact:true}).click();
  await sign(page);
  await expect(page.locator(".patient-banner")).toContainText("Closed");
  await expect(page.getByText("Nurse · signed original",{exact:false})).toBeVisible();
  await expect(page.getByText("Doctor · signed original",{exact:false})).toBeVisible();
  await page.getByLabel("Reason for amendment").fill("Correcting a fictional transcription error.");
  await page.getByLabel("Correction or additional information").fill("Fictional corrected history.");
  await page.getByRole("button",{name:"Save amendment",exact:true}).click();
  await expect(page.getByText("Fictional corrected history.",{exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});

test("urgent escalation bypasses intake and care messages need recipient acknowledgement",async({page})=>{
  await page.goto("/");
  await openVisit(page,"Abena Owusu");
  await page.getByLabel("Urgent concern").fill("Fictional urgent concern requiring immediate review.");
  await page.getByRole("button",{name:"Escalate urgent care",exact:true}).click();
  await expect(page.locator(".patient-banner")).toContainText("Urgent");
  await page.getByLabel("Message to doctor").fill("Please come to the clinic desk for this fictional case.");
  await page.getByRole("button",{name:"Send care message",exact:true}).click();
  await page.getByRole("button",{name:"Back to workspace",exact:true}).click();
  await switchRole(page,"Doctor");
  await expect(page.locator("tbody tr").first()).toContainText("Abena Owusu");
  await page.getByRole("navigation").getByRole("button",{name:"Care messages",exact:true}).click();
  const card=page.locator(".message-card").filter({hasText:"Please come to the clinic desk"});
  await card.getByRole("button",{name:"Acknowledge message",exact:true}).click();
  await expect(card).toContainText("Acknowledged");
  await page.reload();
  await switchRole(page,"Doctor");
  await page.getByRole("navigation").getByRole("button",{name:"Care messages",exact:true}).click();
  await expect(page.locator(".message-card").filter({hasText:"Please come to the clinic desk"})).toContainText("Acknowledged");
});

test("viewing a chart does not create a visit and direct doctor visits are usable",async({page})=>{
  await page.goto("/");
  await page.getByRole("navigation").getByRole("button",{name:"Students",exact:true}).click();
  await page.getByLabel("Search students").fill("Yaw Osei");
  await page.getByRole("button",{name:"View student chart",exact:true}).click();
  await expect(page.getByRole("dialog")).toContainText("No visits recorded");
  await page.getByRole("dialog").getByRole("button",{name:"Close",exact:true}).click();
  await switchRole(page,"Doctor");
  await page.getByRole("button",{name:"New consultation",exact:true}).click();
  await page.getByLabel("Find student").fill("ST-0332");
  await page.getByRole("button",{name:/Yaw Osei/}).click();
  await page.getByRole("dialog").getByLabel("Presenting complaint").fill("Fictional direct doctor visit.");
  await page.getByRole("button",{name:"Create direct consultation",exact:true}).click();
  await expect(page.locator(".patient-banner")).toContainText("In consultation");
  await page.getByRole("button",{name:"Confirm identity and alerts",exact:true}).click();
  await page.getByLabel("Assessment and diagnosis").fill("Fictional direct assessment.");
  await page.getByLabel("Care plan",{exact:true}).fill("Fictional plan.");
  await page.getByLabel("Follow-up and return instructions").fill("Fictional return advice.");
  await page.getByRole("button",{name:"Save consultation",exact:true}).click();
  await expect(page.getByRole("status")).toContainText("saved");
});

test("nurse-only care, dated follow-ups and repeat observations",async({page})=>{
  await page.goto("/");
  await openVisit(page,"Kofi Asante");
  await page.getByRole("button",{name:"Sign nurse assessment",exact:true}).click();
  await sign(page);
  await page.getByRole("button",{name:"Review & close",exact:true}).click();
  await page.getByLabel("Discharge and return instructions").fill("Fictional nurse-only instructions.");
  await page.getByRole("button",{name:"Save instructions",exact:true}).click();
  await page.getByLabel("Task description").fill("Synthetic review task");
  await page.getByLabel("Due date and time (Ghana)",{exact:true}).fill(new Date(Date.now()+86400000).toISOString().slice(0,16));
  await page.getByRole("button",{name:"Add follow-up task",exact:true}).click();
  await page.getByLabel("Review date and time (Ghana)",{exact:true}).fill(new Date(Date.now()+3600000).toISOString().slice(0,16));
  await page.getByLabel("Observation reason",{exact:true}).fill("Fictional observation.");
  await page.getByRole("button",{name:"Start observation",exact:true}).click();
  await page.getByLabel("Observation note",{exact:true}).fill("Fictional repeat assessment.");
  await page.getByRole("button",{name:"Record repeat observations",exact:true}).click();
  await page.getByRole("button",{name:"History",exact:true}).click();
  await expect(page.getByText("Fictional repeat assessment.",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Back to workspace",exact:true}).click();
  await page.getByRole("navigation").getByRole("button",{name:"Follow-ups",exact:true}).click();
  await page.getByRole("button",{name:"Complete Synthetic review task",exact:true}).click();
  await expect(page.locator(".task-row").filter({hasText:"Synthetic review task"})).toHaveClass(/task-complete/);
});

test("unsaved notes are protected when switching roles",async({page})=>{
  await page.goto("/");
  await openVisit(page,"Abena Owusu");
  await page.getByRole("textbox",{name:"Nurse assessment",exact:true}).fill("Unsaved fictional note.");
  page.once("dialog",dialog=>dialog.dismiss());
  await switchRole(page,"Doctor");
  await expect(page.getByRole("textbox",{name:"Nurse assessment",exact:true})).toHaveValue("Unsaved fictional note.");
  await expect(page.locator(".staff-chip")).toContainText("Nurse");
});

test("closed visits stay accessible and mobile layout has no page overflow",async({page},testInfo)=>{
  await page.goto("/");
  await page.getByLabel("Queue view").selectOption("Closed");
  await expect(page.getByText("No visits in this view",{exact:true})).toBeVisible();
  await page.getByLabel("Queue view").selectOption("All active");
  await page.screenshot({path:testInfo.outputPath("worklist-desktop.png"),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.getByRole("button",{name:"Register visit",exact:true}).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button",{name:"Close dialog",exact:true}).click();
  await openVisit(page,"Abena Owusu");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.screenshot({path:testInfo.outputPath("patient-mobile.png"),fullPage:true});
});

test("invalid stored demo is reset safely",async({page})=>{
  await page.addInitScript(()=>sessionStorage.setItem("school-clinic-demo-v2","not valid json"));
  await page.goto("/");
  await expect(page.getByRole("heading",{name:"Nursing worklist",exact:true})).toBeVisible();
});
