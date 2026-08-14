const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

function load() {
  if (!fs.existsSync(DATA_FILE)) {
    return { employees: [], assignments: [] };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function save(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function listEmployees() {
  return load().employees;
}

function addEmployee(name) {
  const data = load();
  const employee = { id: crypto.randomUUID(), name };
  data.employees.push(employee);
  save(data);
  return employee;
}

function deleteEmployee(id) {
  const data = load();
  data.employees = data.employees.filter((e) => e.id !== id);
  data.assignments = data.assignments.filter((a) => a.employeeId !== id);
  save(data);
}

function listAssignments() {
  const data = load();
  return data.assignments.map((a) => {
    const employee = data.employees.find((e) => e.id === a.employeeId);
    return { ...a, employeeName: employee ? employee.name : 'Unknown' };
  });
}

function addAssignment({ employeeId, redditUsername, focusNote }) {
  const data = load();
  const assignment = {
    id: crypto.randomUUID(),
    employeeId,
    redditUsername,
    focusNote: focusNote || '',
    updatedAt: new Date().toISOString(),
  };
  data.assignments.push(assignment);
  save(data);
  return assignment;
}

function updateAssignment(id, { focusNote }) {
  const data = load();
  const assignment = data.assignments.find((a) => a.id === id);
  if (!assignment) return null;
  if (focusNote !== undefined) assignment.focusNote = focusNote;
  assignment.updatedAt = new Date().toISOString();
  save(data);
  return assignment;
}

function deleteAssignment(id) {
  const data = load();
  data.assignments = data.assignments.filter((a) => a.id !== id);
  save(data);
}

function getAssignment(id) {
  const data = load();
  return data.assignments.find((a) => a.id === id) || null;
}

module.exports = {
  listEmployees,
  addEmployee,
  deleteEmployee,
  listAssignments,
  addAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignment,
};
