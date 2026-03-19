const STORAGE_KEY = "escalation-tracker-v2-sheet";
const THEME_KEY = "escalation-tracker-theme";

const fallbackSeedData = [
  {
    id: "ESC-1042",
    customer: "Northwind Health",
    vendor: "Atlas Components",
    category: "Supply",
    severity: "Critical",
    status: "Open",
    owner: "Dana Reed",
    summary: "Critical backorder affecting implant kit fulfillment",
    description:
      "Vendor allocation change reduced available stock below committed demand for this week. Customer escalation opened after three missed shipment promises.",
    createdAt: "2026-03-10T10:30:00",
    dueDate: "2026-03-18",
    closedAt: null,
    attachments: ["allocation-update.pdf", "customer-demand.xlsx"],
    actions: [
      { id: crypto.randomUUID(), title: "Confirm recovery plan", owner: "Dana Reed", dueDate: "2026-03-17", done: false },
      { id: crypto.randomUUID(), title: "Ship partial emergency order", owner: "Warehouse Ops", dueDate: "2026-03-16", done: false }
    ],
    notes: [
      { id: crypto.randomUUID(), content: "Customer requested executive callback before 3 PM ET.", createdAt: "2026-03-14T09:00:00" }
    ],
    history: [
      { id: crypto.randomUUID(), type: "Created", message: "Escalation opened by support", createdAt: "2026-03-10T10:30:00" },
      { id: crypto.randomUUID(), type: "Status", message: "Status set to Open", createdAt: "2026-03-10T10:31:00" }
    ]
  },
  {
    id: "ESC-1043",
    customer: "BrightPath Labs",
    vendor: "Helix Freight",
    category: "Logistics",
    severity: "High",
    status: "Pending",
    owner: "Maya Chen",
    summary: "Temperature-controlled shipment delayed in transit",
    description:
      "Freight handoff missed overnight linehaul and monitoring exception was not escalated for seven hours.",
    createdAt: "2026-03-11T14:20:00",
    dueDate: "2026-03-19",
    closedAt: null,
    attachments: ["temp-log.csv"],
    actions: [
      { id: crypto.randomUUID(), title: "Obtain lane failure RCA", owner: "Helix Freight", dueDate: "2026-03-18", done: false }
    ],
    notes: [],
    history: [
      { id: crypto.randomUUID(), type: "Created", message: "Imported from pasted ticket", createdAt: "2026-03-11T14:20:00" }
    ]
  },
  {
    id: "ESC-1044",
    customer: "Keystone Surgical",
    vendor: "Nova Precision",
    category: "Quality",
    severity: "Medium",
    status: "Closed",
    owner: "Luis Ortega",
    summary: "Packaging defect found on two lots",
    description:
      "Customer identified seal integrity issue during receiving. Containment and lot replacement completed.",
    createdAt: "2026-03-04T08:45:00",
    dueDate: "2026-03-12",
    closedAt: "2026-03-13T16:40:00",
    attachments: ["8d-report.pdf", "lot-photos.zip"],
    actions: [
      { id: crypto.randomUUID(), title: "Approve CAPA", owner: "QA", dueDate: "2026-03-12", done: true }
    ],
    notes: [
      { id: crypto.randomUUID(), content: "Customer accepted closure with weekly monitoring for 30 days.", createdAt: "2026-03-13T16:00:00" }
    ],
    history: [
      { id: crypto.randomUUID(), type: "Created", message: "Escalation logged by quality", createdAt: "2026-03-04T08:45:00" },
      { id: crypto.randomUUID(), type: "Closed", message: "Closed after containment verified", createdAt: "2026-03-13T16:40:00" }
    ]
  }
];

const seedData = Array.isArray(window.ESCALATION_SOURCE_DATA) && window.ESCALATION_SOURCE_DATA.length
  ? window.ESCALATION_SOURCE_DATA
  : fallbackSeedData;

const state = {
  records: loadRecords(),
  selectedId: null,
  filters: {
    customer: "All",
    vendor: "All",
    category: "All",
    status: "All",
    severity: "All",
    owner: "All",
    week: "All"
  },
  searchTerm: "",
  currentView: "intake"
};

const els = {
  navLinks: [...document.querySelectorAll(".nav-link")],
  views: [...document.querySelectorAll(".view")],
  viewTitle: document.getElementById("viewTitle"),
  themeToggle: document.getElementById("themeToggle"),
  themeToggleLabel: document.getElementById("themeToggleLabel"),
  recordCount: document.getElementById("recordCount"),
  openCount: document.getElementById("openCount"),
  sidebarStats: document.getElementById("sidebarStats"),
  intakeForm: document.getElementById("intakeForm"),
  parseTicketBtn: document.getElementById("parseTicketBtn"),
  ticketPaste: document.getElementById("ticketPaste"),
  listHighlights: document.getElementById("listHighlights"),
  listSearch: document.getElementById("listSearch"),
  exportFilteredBtn: document.getElementById("exportFilteredBtn"),
  exportAllBtn: document.getElementById("exportAllBtn"),
  filterBar: document.getElementById("filterBar"),
  listTableBody: document.getElementById("listTableBody"),
  detailEmpty: document.getElementById("detailEmpty"),
  detailContent: document.getElementById("detailContent"),
  detailTitle: document.getElementById("detailTitle"),
  detailBadge: document.getElementById("detailBadge"),
  detailHero: document.getElementById("detailHero"),
  detailControls: document.getElementById("detailControls"),
  detailLinks: document.getElementById("detailLinks"),
  detailMeta: document.getElementById("detailMeta"),
  detailDescription: document.getElementById("detailDescription"),
  detailActions: document.getElementById("detailActions"),
  detailNotes: document.getElementById("detailNotes"),
  detailHistory: document.getElementById("detailHistory"),
  detailAttachments: document.getElementById("detailAttachments"),
  actionForm: document.getElementById("actionForm"),
  noteForm: document.getElementById("noteForm"),
  reviewOpenItems: document.getElementById("reviewOpenItems"),
  reviewOverdue: document.getElementById("reviewOverdue"),
  reviewClosed: document.getElementById("reviewClosed"),
  reviewTrends: document.getElementById("reviewTrends")
};

bootstrap();

function bootstrap() {
  applyInitialTheme();
  bindEvents();
  render();
}

function bindEvents() {
  els.navLinks.forEach((button) =>
    button.addEventListener("click", () => setView(button.dataset.view))
  );

  els.intakeForm.addEventListener("submit", handleCreateEscalation);
  els.parseTicketBtn.addEventListener("click", handleParseTicket);
  els.actionForm.addEventListener("submit", handleAddAction);
  els.noteForm.addEventListener("submit", handleAddNote);
  els.themeToggle.addEventListener("click", toggleTheme);
  els.listSearch.addEventListener("input", handleSearchInput);
  els.exportFilteredBtn.addEventListener("click", () => exportRecords("filtered"));
  els.exportAllBtn.addEventListener("click", () => exportRecords("all"));
}

function setView(view) {
  if (view === "detail") {
    ensureSelectedRecord();
  }

  state.currentView = view;
  els.navLinks.forEach((link) => link.classList.toggle("active", link.dataset.view === view));
  els.views.forEach((panel) => panel.classList.toggle("active", panel.id === `view-${view}`));
  els.viewTitle.textContent =
    view === "intake" ? "Intake" : view === "list" ? "List" : view === "detail" ? "Detail" : "Weekly Review";
}

function render() {
  persistRecords();
  renderHeaderStats();
  renderSidebarStats();
  renderFilters();
  renderListHighlights();
  renderList();
  renderDetail();
  renderReview();
}

function renderHeaderStats() {
  els.recordCount.textContent = state.records.length;
  els.openCount.textContent = state.records.filter((item) => item.status !== "Closed").length;
}

function renderSidebarStats() {
  const openItems = state.records.filter((item) => item.status !== "Closed").length;
  const overdueActions = state.records.flatMap((item) =>
    item.actions
      .filter((action) => !action.done && isPast(action.dueDate))
      .map((action) => action)
  ).length;
  const critical = state.records.filter((item) => item.severity === "Critical" && item.status !== "Closed").length;
  const closedThisWeek = state.records.filter(
    (item) => item.closedAt && getWeekLabel(item.closedAt) === getWeekLabel(new Date().toISOString())
  ).length;

  els.sidebarStats.innerHTML = "";
  [
    ["Open escalations", openItems],
    ["Overdue actions", overdueActions],
    ["Critical open", critical],
    ["Closed this week", closedThisWeek]
  ].forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "stat-line";
    row.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    els.sidebarStats.appendChild(row);
  });
}

function renderFilters() {
  const options = {
    customer: uniqueValues("customer").filter((value) => value !== "All"),
    vendor: uniqueValues("vendor").filter((value) => value !== "All"),
    category: uniqueValues("category"),
    status: uniqueValues("status"),
    severity: ["Critical", "Urgent"],
    owner: uniqueValues("owner"),
    week: [...new Set(state.records.map((item) => getWeekLabel(item.createdAt)))].sort().reverse()
  };

  els.filterBar.innerHTML = "";

  Object.entries(options).forEach(([key, values]) => {
    const wrapper = document.createElement("label");
    wrapper.className = "stacked";
    wrapper.textContent = capitalize(key);

    const select = document.createElement("select");
    ["All", ...values].forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      if (state.filters[key] === value) option.selected = true;
      select.appendChild(option);
    });

    select.addEventListener("change", (event) => {
      state.filters[key] = event.target.value;
      render();
    });

    wrapper.appendChild(select);
    els.filterBar.appendChild(wrapper);
  });
}

function renderList() {
  const filtered = getFilteredRecords();
  els.listTableBody.innerHTML = "";
  els.listSearch.value = state.searchTerm;

  if (!filtered.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="10"><div class="empty-state small">No escalations match the active filters.</div></td>`;
    els.listTableBody.appendChild(row);
    return;
  }

  filtered.forEach((item) => {
    const tr = document.createElement("tr");
    if (item.id === state.selectedId) {
      tr.classList.add("selected-row");
    }
    tr.innerHTML = `
      <td>${item.ticketNumber || "NA"}</td>
      <td>${item.sourceFunction || "Service"}</td>
      <td>${item.customer}</td>
      <td>${item.vendor}</td>
      <td>${item.category}</td>
      <td><span class="status-pill status-${item.status.toLowerCase()}">${item.status}</span></td>
      <td><span class="severity-pill severity-${item.severity.toLowerCase()}">${item.severity}</span></td>
      <td>${item.owner}</td>
      <td>${getWeekLabel(item.createdAt)}</td>
      <td>${item.actions.find((action) => !action.done)?.title || "No open actions"}</td>
    `;
    tr.addEventListener("click", () => {
      state.selectedId = item.id;
      setView("detail");
      render();
    });
    els.listTableBody.appendChild(tr);
  });
}

function renderDetail() {
  ensureSelectedRecord();
  const record = state.records.find((item) => item.id === state.selectedId);

  if (!record) {
    els.detailEmpty.classList.remove("hidden");
    els.detailContent.classList.add("hidden");
    return;
  }

  els.detailEmpty.classList.add("hidden");
  els.detailContent.classList.remove("hidden");
  els.detailTitle.textContent = `${record.ticketNumber || record.id} · ${record.summary}`;
  els.detailBadge.className = `status-pill status-${record.status.toLowerCase()}`;
  els.detailBadge.textContent = record.status;
  els.detailDescription.textContent = record.description;
  renderDetailHero(record);
  renderDetailControls(record);
  renderDetailLinks(record);

  els.detailMeta.innerHTML = "";
  [
    ["Customer", record.customer],
    ["Vendor", record.vendor],
    ["Severity", record.severity],
    ["Owner", record.owner],
    ["Category", record.category],
    ["Ticket #", record.ticketNumber || "NA"],
    ["Equipment", record.equipment || "Unspecified"],
    ["Function", record.sourceFunction || "Manual Entry"],
    ["Created", formatDateTime(record.createdAt)],
    ["Due", formatDate(record.dueDate)],
    ["Week", getWeekLabel(record.createdAt)]
  ].forEach(([label, value]) => {
    const block = document.createElement("div");
    block.className = "meta-block";
    block.innerHTML = `<span class="eyebrow">${label}</span><strong>${value}</strong>`;
    els.detailMeta.appendChild(block);
  });

  renderCollection(
    els.detailActions,
    record.actions,
    (action) => `
      <div class="list-item">
        <strong>${action.title}</strong>
        <div>${action.owner} · Due ${formatDate(action.dueDate)}${action.done ? " · Complete" : ""}</div>
        ${!action.done ? `<button class="secondary-btn" data-complete-action="${action.id}">Mark complete</button>` : ""}
      </div>
    `
  );

  renderCollection(
    els.detailNotes,
    record.notes,
    (note) => `
      <div class="list-item">
        <strong>${formatDateTime(note.createdAt)}</strong>
        <div>${note.content}</div>
      </div>
    `
  );

  renderCollection(
    els.detailHistory,
    [...record.history].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    (event) => `
      <div class="timeline-item">
        <strong>${event.type}</strong>
        <div>${event.message}</div>
        <small>${formatDateTime(event.createdAt)}</small>
      </div>
    `
  );

  renderCollection(
    els.detailAttachments,
    record.attachments,
    (attachment) => `
      <div class="list-item">
        <strong>${attachment}</strong>
        <div>Linked at intake</div>
      </div>
    `
  );

  els.detailActions.querySelectorAll("[data-complete-action]").forEach((button) => {
    button.addEventListener("click", () => completeAction(button.dataset.completeAction));
  });
}

function renderReview() {
  const openItems = state.records.filter((item) => item.status !== "Closed");
  const overdue = state.records.flatMap((item) =>
    item.actions
      .filter((action) => !action.done && isPast(action.dueDate))
      .map((action) => ({ ...action, escalationId: item.id, summary: item.summary }))
  );
  const recentlyClosed = state.records
    .filter((item) => item.closedAt)
    .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt))
    .slice(0, 5);

  renderCollection(
    els.reviewOpenItems,
    openItems,
    (item) => `
      <div class="list-item">
        <strong>${item.id} · ${item.customer}</strong>
        <div>${item.summary}</div>
        <small>${item.owner} · ${item.status} · ${item.severity}</small>
      </div>
    `
  );

  renderCollection(
    els.reviewOverdue,
    overdue,
    (action) => `
      <div class="list-item">
        <strong>${action.escalationId} · ${action.title}</strong>
        <div>${action.summary}</div>
        <small>${action.owner} · Due ${formatDate(action.dueDate)}</small>
      </div>
    `
  );

  renderCollection(
    els.reviewClosed,
    recentlyClosed,
    (item) => `
      <div class="list-item">
        <strong>${item.id} · ${item.customer}</strong>
        <div>${item.summary}</div>
        <small>Closed ${formatDateTime(item.closedAt)}</small>
      </div>
    `
  );

  const trends = buildTrendCards();
  els.reviewTrends.innerHTML = "";
  trends.forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "trend-card";
    card.innerHTML = `<span class="eyebrow">${label}</span><strong>${value}</strong>`;
    els.reviewTrends.appendChild(card);
  });
}

function renderDetailControls(record) {
  const ownerOptions = uniqueValues("owner")
    .filter(Boolean)
    .filter((owner) => owner !== record.owner);

  els.detailControls.innerHTML = `
    <section class="control-card">
      <span class="eyebrow">Status Control</span>
      <div class="status-toggle-group">
        <button class="status-toggle ${record.status !== "Closed" ? "active" : ""}" data-status-target="Open" type="button">Open</button>
        <button class="status-toggle ${record.status === "Closed" ? "active" : ""}" data-status-target="Closed" type="button">${record.status === "Closed" ? "Closed" : "Close Ticket"}</button>
      </div>
    </section>
    <section class="control-card">
      <span class="eyebrow">Owner Assignment</span>
      <form id="ownerForm" class="owner-form">
        <input name="owner" value="${escapeAttribute(record.owner || "")}" list="ownerSuggestions" placeholder="Assign owner" required />
        <datalist id="ownerSuggestions">
          ${ownerOptions.map((owner) => `<option value="${escapeAttribute(owner)}"></option>`).join("")}
        </datalist>
        <button class="secondary-btn" type="submit">Save owner</button>
      </form>
    </section>
  `;

  els.detailControls.querySelectorAll("[data-status-target]").forEach((button) => {
    button.addEventListener("click", () => updateRecordStatus(button.dataset.statusTarget));
  });

  els.detailControls.querySelector("#ownerForm").addEventListener("submit", handleOwnerAssignment);
}

function renderListHighlights() {
  const open = state.records.filter((item) => item.status !== "Closed").length;
  const overdue = state.records.flatMap((item) => item.actions.filter((action) => !action.done && isPast(action.dueDate))).length;
  const critical = state.records.filter((item) => item.severity === "Critical" && item.status !== "Closed").length;
  const depot = state.records.filter((item) => item.sourceFunction === "Depot" && item.status !== "Closed").length;

  els.listHighlights.innerHTML = "";
  [
    ["Open", open, "Active backlog this week"],
    ["Overdue", overdue, "Action items past due"],
    ["Critical", critical, "High-risk escalations"],
    ["Depot Open", depot, "Depot-owned active work"]
  ].forEach(([label, value, subline]) => {
    const card = document.createElement("div");
    card.className = "highlight-card";
    card.innerHTML = `<span class="eyebrow">${label}</span><strong>${value}</strong><small>${subline}</small>`;
    els.listHighlights.appendChild(card);
  });
}

function handleCreateEscalation(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const attachments = [...formData.getAll("attachments")]
    .filter((file) => file && file.name)
    .map((file) => file.name);
  const now = new Date().toISOString();
  const newRecord = {
    id: nextEscalationId(),
    customer: formData.get("customer").trim(),
    vendor: formData.get("vendor").trim(),
    category: formData.get("category"),
    severity: formData.get("severity"),
    status: formData.get("status"),
    owner: formData.get("owner").trim(),
    summary: formData.get("summary").trim(),
    description: formData.get("description").trim(),
    createdAt: now,
    dueDate: formData.get("dueDate"),
    closedAt: formData.get("status") === "Closed" ? now : null,
    ticketNumber: formData.get("ticketNumber").trim() || "NA",
    equipment: formData.get("equipment").trim() || "Unspecified",
    sourceFunction: formData.get("sourceFunction"),
    sourceLine: "",
    attachments,
    actions: [
      {
        id: crypto.randomUUID(),
        title: formData.get("actionTitle").trim(),
        owner: formData.get("actionOwner").trim(),
        dueDate: formData.get("actionDue"),
        done: false
      }
    ],
    notes: [],
    history: [
      { id: crypto.randomUUID(), type: "Created", message: "Escalation created from intake form", createdAt: now },
      { id: crypto.randomUUID(), type: "Action", message: `Initial action created: ${formData.get("actionTitle").trim()}`, createdAt: now }
    ]
  };

  state.records.unshift(newRecord);
  state.selectedId = newRecord.id;
  event.target.reset();
  render();
  setView("detail");
}

function handleParseTicket() {
  const parsed = parseTicketText(els.ticketPaste.value);
  Object.entries(parsed).forEach(([key, value]) => {
    const field = els.intakeForm.elements.namedItem(key);
    if (field && value) field.value = value;
  });
}

function handleSearchInput(event) {
  state.searchTerm = event.target.value.trim().toLowerCase();
  renderList();
}

function handleAddAction(event) {
  event.preventDefault();
  const record = getSelectedRecord();
  if (!record) return;

  const formData = new FormData(event.target);
  const action = {
    id: crypto.randomUUID(),
    title: formData.get("title").trim(),
    owner: formData.get("owner").trim(),
    dueDate: formData.get("dueDate"),
    done: false
  };

  record.actions.push(action);
  record.history.unshift({
    id: crypto.randomUUID(),
    type: "Action",
    message: `Action added: ${action.title}`,
    createdAt: new Date().toISOString()
  });

  event.target.reset();
  render();
}

function handleOwnerAssignment(event) {
  event.preventDefault();
  const record = getSelectedRecord();
  if (!record) return;

  const nextOwner = new FormData(event.target).get("owner").trim();
  if (!nextOwner || nextOwner === record.owner) return;

  const previousOwner = record.owner || "Unassigned";
  record.owner = nextOwner;
  record.history.unshift({
    id: crypto.randomUUID(),
    type: "Owner",
    message: `Owner changed from ${previousOwner} to ${nextOwner}`,
    createdAt: new Date().toISOString()
  });

  render();
}

function handleAddNote(event) {
  event.preventDefault();
  const record = getSelectedRecord();
  if (!record) return;

  const formData = new FormData(event.target);
  const note = {
    id: crypto.randomUUID(),
    content: formData.get("content").trim(),
    createdAt: new Date().toISOString()
  };

  record.notes.unshift(note);
  record.history.unshift({
    id: crypto.randomUUID(),
    type: "Note",
    message: "Note added",
    createdAt: note.createdAt
  });

  event.target.reset();
  render();
}

function completeAction(actionId) {
  const record = getSelectedRecord();
  if (!record) return;

  const action = record.actions.find((item) => item.id === actionId);
  if (!action) return;

  action.done = true;
  record.history.unshift({
    id: crypto.randomUUID(),
    type: "Action",
    message: `Action completed: ${action.title}`,
    createdAt: new Date().toISOString()
  });

  if (record.status === "Open") {
    record.status = "Pending";
    record.history.unshift({
      id: crypto.randomUUID(),
      type: "Status",
      message: "Status moved to Pending after action completion",
      createdAt: new Date().toISOString()
    });
  }

  render();
}

function updateRecordStatus(nextStatus) {
  const record = getSelectedRecord();
  if (!record || record.status === nextStatus) return;

  const previousStatus = record.status;
  record.status = nextStatus;
  record.closedAt = nextStatus === "Closed" ? new Date().toISOString() : null;
  record.history.unshift({
    id: crypto.randomUUID(),
    type: "Status",
    message: `Status changed from ${previousStatus} to ${nextStatus}`,
    createdAt: new Date().toISOString()
  });

  render();
}

function renderCollection(container, items, templateFn) {
  container.innerHTML = "";
  if (!items.length) {
    const template = document.getElementById("emptyListTemplate");
    container.appendChild(template.content.cloneNode(true));
    return;
  }

  items.forEach((item) => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = templateFn(item).trim();
    container.appendChild(wrapper.firstElementChild);
  });
}

function getFilteredRecords() {
  return state.records.filter((item) =>
    Object.entries(state.filters).every(([key, value]) => {
      if (value === "All") return true;
      if (key === "week") return getWeekLabel(item.createdAt) === value;
      return item[key] === value;
    }) && matchesSearch(item)
  );
}

function ensureSelectedRecord() {
  const exists = state.records.some((item) => item.id === state.selectedId);
  if (exists) return;

  const filtered = getFilteredRecords();
  state.selectedId = filtered[0]?.id ?? state.records[0]?.id ?? null;
}

function uniqueValues(key) {
  return [...new Set(state.records.map((item) => item[key]))].sort();
}

function nextEscalationId() {
  const max = state.records.reduce((highest, item) => {
    const numeric = Number(item.id.split("-")[1]);
    return Number.isNaN(numeric) ? highest : Math.max(highest, numeric);
  }, 1040);
  return `ESC-${max + 1}`;
}

function getSelectedRecord() {
  return state.records.find((item) => item.id === state.selectedId);
}

function loadRecords() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedData;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : seedData;
  } catch {
    return seedData;
  }
}

function persistRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
}

function parseTicketText(text) {
  const fields = {
    customer: matchField(text, /customer:\s*(.+)/i),
    vendor: matchField(text, /vendor:\s*(.+)/i),
    category: matchEnum(text, /category:\s*(.+)/i, ["Supply", "Quality", "Logistics", "Billing", "Technical", "Compliance"]),
    severity: matchEnum(text, /severity:\s*(.+)/i, ["Critical", "High", "Medium", "Low"]),
    status: matchEnum(text, /status:\s*(.+)/i, ["Open", "Pending", "Monitoring", "Closed"]),
    owner: matchField(text, /owner:\s*(.+)/i),
    summary: matchField(text, /summary:\s*(.+)/i) || firstSentence(text),
    description: text.trim()
  };

  return {
    customer: fields.customer || "",
    vendor: fields.vendor || "",
    category: fields.category || "Technical",
    severity: fields.severity || "High",
    status: fields.status || "Open",
    owner: fields.owner || "",
    summary: fields.summary || "",
    description: fields.description || ""
  };
}

function matchField(text, regex) {
  return text.match(regex)?.[1]?.trim();
}

function matchEnum(text, regex, values) {
  const value = matchField(text, regex);
  return values.find((entry) => entry.toLowerCase() === String(value).toLowerCase());
}

function firstSentence(text) {
  return text.split(/\n|\./).find((line) => line.trim())?.trim();
}

function buildTrendCards() {
  const open = state.records.filter((item) => item.status !== "Closed").length;
  const closedThisWeek = state.records.filter(
    (item) => item.closedAt && getWeekLabel(item.closedAt) === getWeekLabel(new Date().toISOString())
  ).length;
  const critical = state.records.filter((item) => item.severity === "Critical" && item.status !== "Closed").length;
  const avgOpenActions = (
    state.records.reduce((sum, item) => sum + item.actions.filter((action) => !action.done).length, 0) /
      Math.max(state.records.length, 1)
  ).toFixed(1);

  return [
    ["Open escalations", open],
    ["Closed this week", closedThisWeek],
    ["Critical open", critical],
    ["Avg. open actions", avgOpenActions]
  ];
}

function matchesSearch(item) {
  if (!state.searchTerm) return true;
  const haystack = [
    item.ticketNumber,
    item.customer,
    item.vendor,
    item.category,
    item.summary,
    item.description,
    item.equipment,
    item.sourceFunction
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(state.searchTerm);
}

function renderDetailHero(record) {
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(record.createdAt).getTime()) / 86400000));
  const nextAction = record.actions.find((action) => !action.done);
  const tiles = [
    { label: "Customer", value: record.customer, image: buildAvatar(record.customer, "#00CBB7", "#009CF4") },
    { label: "Vendor", value: record.vendor, image: buildAvatar(record.vendor, "#009CF4", "#003763") },
    { label: "Equipment", value: record.equipment || "Unspecified", image: buildAvatar(record.equipment || "EQ", "#003763", "#00CBB7") }
  ];

  els.detailHero.innerHTML = `
    <div class="identity-strip">
      ${tiles
        .map(
          (tile) => `
            <article class="identity-card">
              <img src="${tile.image}" alt="${tile.label}" />
              <div>
                <span class="eyebrow">${tile.label}</span>
                <strong>${tile.value}</strong>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
    <div class="next-action-card">
      <span class="eyebrow">Next Best Action</span>
      <strong>${nextAction?.title || "No open action"}</strong>
      <small>${nextAction ? `${nextAction.owner} · Due ${formatDate(nextAction.dueDate)}` : `${ageDays} days old`}</small>
    </div>
  `;
}

function renderDetailLinks(record) {
  const links = [
    { label: "Customer Search", href: buildSearchUrl(record.customer) },
    { label: "Vendor Search", href: buildSearchUrl(record.vendor) },
    { label: "Ticket Search", href: buildSearchUrl(record.ticketNumber && record.ticketNumber !== "NA" ? record.ticketNumber : `${record.customer} ${record.summary}`) }
  ];

  els.detailLinks.innerHTML = links
    .map((link) => `<a class="link-chip" href="${link.href}" target="_blank" rel="noreferrer">${link.label}</a>`)
    .join("");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getWeekLabel(value) {
  const date = new Date(value);
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(value);
}

function isPast(dateString) {
  const date = new Date(dateString);
  date.setHours(23, 59, 59, 999);
  return date < new Date();
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function applyInitialTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  document.documentElement.dataset.theme = savedTheme;
  updateThemeToggleLabel(savedTheme);
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem(THEME_KEY, nextTheme);
  updateThemeToggleLabel(nextTheme);
}

function updateThemeToggleLabel(theme) {
  els.themeToggleLabel.textContent = theme === "dark" ? "Light mode" : "Dark mode";
}

function exportRecords(mode) {
  const records = mode === "all" ? state.records : getFilteredRecords();
  const rows = records.map((record) => ({
    ticket_number: record.ticketNumber || "NA",
    function: record.sourceFunction || "",
    customer: record.customer || "",
    vendor: record.vendor || "",
    category: record.category || "",
    status: record.status || "",
    severity: record.severity || "",
    owner: record.owner || "",
    summary: record.summary || "",
    description: record.description || "",
    equipment: record.equipment || "",
    due_date: record.dueDate || "",
    created_at: record.createdAt || "",
    closed_at: record.closedAt || "",
    next_action: record.actions.find((action) => !action.done)?.title || "",
    notes: record.notes.map((note) => note.content).join(" | ")
  }));

  const csv = toCsv(rows);
  const filename = `escalations-${mode}-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(filename, csv, "text/csv;charset=utf-8;");
}

function toCsv(rows) {
  if (!rows.length) {
    return "ticket_number,function,customer,vendor,category,status,severity,owner,summary,description,equipment,due_date,created_at,closed_at,next_action,notes\n";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
  ];

  return lines.join("\n");
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildSearchUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(query || "")}`;
}

function buildAvatar(label, startColor, endColor) {
  const initials = getInitials(label);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${startColor}"/>
          <stop offset="100%" stop-color="${endColor}"/>
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="24" fill="url(#g)"/>
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="30" font-weight="700" fill="white">${initials}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getInitials(label) {
  return String(label || "?")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

function escapeAttribute(value) {
  return String(value).replace(/"/g, "&quot;");
}
