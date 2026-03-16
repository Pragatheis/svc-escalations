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
  filterBar: document.getElementById("filterBar"),
  listTableBody: document.getElementById("listTableBody"),
  detailEmpty: document.getElementById("detailEmpty"),
  detailContent: document.getElementById("detailContent"),
  detailTitle: document.getElementById("detailTitle"),
  detailBadge: document.getElementById("detailBadge"),
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

  if (!filtered.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="9"><div class="empty-state small">No escalations match the active filters.</div></td>`;
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
  els.detailTitle.textContent = `${record.id} · ${record.summary}`;
  els.detailBadge.className = `status-pill status-${record.status.toLowerCase()}`;
  els.detailBadge.textContent = record.status;
  els.detailDescription.textContent = record.description;

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
    sourceFunction: "Manual Entry",
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
    })
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
