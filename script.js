// ===================================================
// Task Manager - script.js
// ===================================================

const STORAGE_KEY = "task-manager-tasks";
const THEME_KEY = "task-manager-theme";

// ---------- 1) State (the main data) ----------
let tasks = [];            // all tasks
let filter = "all";        // all | active | done
let searchText = "";       // text in the search box
let sortBy = "newest";     // newest | due | priority
let editingId = null;      // id of the task being edited, or null

// ---------- 2) Grab elements from the page ----------
const titleInput = document.getElementById("title");
const descInput = document.getElementById("description");
const dueInput = document.getElementById("due");
const priorityInput = document.getElementById("priority");
const saveBtn = document.getElementById("save-btn");
const cancelBtn = document.getElementById("cancel-btn");
const formTitle = document.getElementById("form-title");
const formError = document.getElementById("form-error");
const listEl = document.getElementById("task-list");
const emptyEl = document.getElementById("empty");
const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sort");
const themeBtn = document.getElementById("theme-toggle");

// ---------- 3) Save and load (browser storage) ----------
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error("Could not save tasks", e);
  }
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : [];
  } catch (e) {
    tasks = [];
  }
}

// ---------- 4) Helpers ----------
function todayString() {
  // today's date in YYYY-MM-DD format
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + month + "-" + day;
}

function isOverdue(task) {
  return !task.done && task.due && task.due < todayString();
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABEL = { high: "High", medium: "Medium", low: "Low" };

// ---------- 5) Add / edit / delete ----------
function saveTask() {
  const title = titleInput.value.trim();
  if (title === "") {
    formError.textContent = "Please enter a title for the task.";
    titleInput.focus();
    return;
  }
  formError.textContent = "";

  if (editingId !== null) {
    // update an existing task
    const task = tasks.find(function (t) { return t.id === editingId; });
    if (task) {
      task.title = title;
      task.description = descInput.value.trim();
      task.due = dueInput.value;
      task.priority = priorityInput.value;
    }
  } else {
    // create a new task
    tasks.push({
      id: Date.now(),
      title: title,
      description: descInput.value.trim(),
      due: dueInput.value,
      priority: priorityInput.value,
      done: false
    });
  }

  saveTasks();
  resetForm();
  render();
}

function startEdit(id) {
  const task = tasks.find(function (t) { return t.id === id; });
  if (!task) return;
  editingId = id;
  titleInput.value = task.title;
  descInput.value = task.description;
  dueInput.value = task.due;
  priorityInput.value = task.priority;
  formTitle.textContent = "Edit task";
  saveBtn.textContent = "Save changes";
  cancelBtn.hidden = false;
  titleInput.focus();
}

function resetForm() {
  editingId = null;
  titleInput.value = "";
  descInput.value = "";
  dueInput.value = "";
  priorityInput.value = "medium";
  formError.textContent = "";
  formTitle.textContent = "New task";
  saveBtn.textContent = "Add task";
  cancelBtn.hidden = true;
}

function toggleDone(id) {
  const task = tasks.find(function (t) { return t.id === id; });
  if (task) {
    task.done = !task.done;
    saveTasks();
    render();
  }
}

function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  tasks = tasks.filter(function (t) { return t.id !== id; });
  if (editingId === id) resetForm();
  saveTasks();
  render();
}

// ---------- 6) Filter + search + sort ----------
function getVisibleTasks() {
  let result = tasks.filter(function (t) {
    if (filter === "active" && t.done) return false;
    if (filter === "done" && !t.done) return false;
    if (searchText) {
      const text = (t.title + " " + t.description).toLowerCase();
      if (!text.includes(searchText.toLowerCase())) return false;
    }
    return true;
  });

  result.sort(function (a, b) {
    if (sortBy === "due") {
      // tasks without a due date go to the end
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    }
    if (sortBy === "priority") {
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    }
    return b.id - a.id; // newest first
  });

  return result;
}

// ---------- 7) Draw the page ----------
function makeButton(label, className, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.className = className;
  btn.addEventListener("click", onClick);
  return btn;
}

function renderTask(task) {
  const li = document.createElement("li");
  li.className = "task " + task.priority + (task.done ? " done" : "");

  const check = document.createElement("input");
  check.type = "checkbox";
  check.checked = task.done;
  check.setAttribute("aria-label", "Mark as completed: " + task.title);
  check.addEventListener("change", function () { toggleDone(task.id); });

  const body = document.createElement("div");
  const title = document.createElement("p");
  title.className = "task-title";
  title.textContent = task.title;   // textContent is safe against malicious HTML
  body.appendChild(title);

  if (task.description) {
    const desc = document.createElement("p");
    desc.className = "task-desc";
    desc.textContent = task.description;
    body.appendChild(desc);
  }

  const meta = document.createElement("div");
  meta.className = "meta";
  const pr = document.createElement("span");
  pr.className = "tag";
  pr.textContent = PRIORITY_LABEL[task.priority] + " priority";
  meta.appendChild(pr);
  if (task.due) {
    const due = document.createElement("span");
    due.className = "tag" + (isOverdue(task) ? " overdue" : "");
    due.textContent = (isOverdue(task) ? "Overdue: " : "Due: ") + task.due;
    meta.appendChild(due);
  }
  body.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.appendChild(makeButton("Edit", "edit", function () { startEdit(task.id); }));
  actions.appendChild(makeButton("Delete", "delete", function () { deleteTask(task.id); }));

  li.appendChild(check);
  li.appendChild(body);
  li.appendChild(actions);
  return li;
}

function renderStats() {
  const total = tasks.length;
  const done = tasks.filter(function (t) { return t.done; }).length;
  const overdue = tasks.filter(isOverdue).length;
  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-done").textContent = done;
  document.getElementById("stat-overdue").textContent = overdue;
  document.getElementById("bar-fill").style.width = (total ? (done / total) * 100 : 0) + "%";
}

function render() {
  const visible = getVisibleTasks();
  listEl.innerHTML = "";
  visible.forEach(function (task) { listEl.appendChild(renderTask(task)); });

  if (visible.length === 0) {
    emptyEl.hidden = false;
    if (tasks.length === 0) {
      emptyEl.textContent = "No tasks yet. Add your first task using the form.";
    } else {
      emptyEl.textContent = "No tasks match your search or filter.";
    }
  } else {
    emptyEl.hidden = true;
  }
  renderStats();
}

// ---------- 8) Dark mode ----------
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeBtn.textContent = theme === "dark" ? "Light mode" : "Dark mode";
}

function initTheme() {
  let theme = null;
  try { theme = localStorage.getItem(THEME_KEY); } catch (e) {}
  if (!theme) {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  applyTheme(theme);
}

themeBtn.addEventListener("click", function () {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
});

// ---------- 9) Events ----------
saveBtn.addEventListener("click", saveTask);
cancelBtn.addEventListener("click", resetForm);

titleInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") saveTask();
});

searchInput.addEventListener("input", function () {
  searchText = searchInput.value.trim();
  render();
});

sortSelect.addEventListener("change", function () {
  sortBy = sortSelect.value;
  render();
});

document.querySelectorAll(".filter").forEach(function (btn) {
  btn.addEventListener("click", function () {
    filter = btn.dataset.filter;
    document.querySelectorAll(".filter").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    render();
  });
});

// ---------- 10) Start ----------
initTheme();
loadTasks();
render();
