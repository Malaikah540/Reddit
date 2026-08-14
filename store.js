const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

function load() {
  if (!fs.existsSync(DATA_FILE)) {
    return { employees: [], assignments: [], clients: [] };
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (!data.clients) data.clients = [];
  return data;
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

function listClients() {
  return load().clients;
}

function getClient(id) {
  return load().clients.find((c) => c.id === id) || null;
}

function addClient({ name, website, notes }) {
  const data = load();
  const client = {
    id: crypto.randomUUID(),
    name,
    website,
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };
  data.clients.push(client);
  save(data);
  return client;
}

function updateClient(id, { name, website, notes }) {
  const data = load();
  const client = data.clients.find((c) => c.id === id);
  if (!client) return null;
  if (name !== undefined) client.name = name;
  if (website !== undefined) client.website = website;
  if (notes !== undefined) client.notes = notes;
  save(data);
  return client;
}

function deleteClient(id) {
  const data = load();
  data.clients = data.clients.filter((c) => c.id !== id);
  save(data);
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
  listClients,
  getClient,
  addClient,
  updateClient,
  deleteClient,
};
