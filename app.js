"use strict";

const STORAGE_KEY = "finantrack-transactions-v1";
const CATEGORIES = ["Alimentação", "Transporte", "Educação", "Lazer", "Saúde", "Moradia", "Salário", "Outros"];
const CHART_COLORS = ["#57d99a", "#65a8f4", "#e7ae68", "#ab8df4", "#eb7f8e", "#45c4c4", "#d4d96a", "#8796a2"];
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
let transactions = [];
let charts = {};
let toastTimer;
let returnFocus;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return dateFormatter.format(new Date(year, month - 1, day));
}

function showToast(message, isError = false) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.toggle("error-toast", isError);
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3200);
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    return true;
  } catch (error) {
    console.error("Não foi possível salvar as movimentações.", error);
    showToast("Não foi possível salvar os dados neste dispositivo.", true);
    return false;
  }
}

function readTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new Error("O conteúdo salvo não é uma lista.");
    return parsed.filter((item) =>
      item && typeof item.id === "string" &&
      (item.type === "income" || item.type === "expense") &&
      Number.isFinite(Number(item.amount)) && Number(item.amount) > 0 &&
      typeof item.category === "string" && typeof item.description === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.date)
    ).map((item) => ({ ...item, amount: Number(item.amount) }));
  } catch (error) {
    console.error("Não foi possível carregar as movimentações.", error);
    showToast("Os dados salvos não puderam ser lidos. Confira o console do navegador.", true);
    return [];
  }
}

function demoTransactions() {
  const today = new Date();
  const daysAgo = (days) => {
    const date = new Date(today);
    date.setDate(date.getDate() - days);
    return localDateString(date);
  };
  const rows = [
    ["income", 4200, "Salário", "Salário mensal", daysAgo(2)],
    ["expense", 680.4, "Moradia", "Aluguel", daysAgo(3)],
    ["expense", 245.9, "Alimentação", "Mercado da semana", daysAgo(5)],
    ["expense", 89.9, "Transporte", "Cartão de transporte", daysAgo(7)],
    ["income", 350, "Outros", "Projeto freelancer", daysAgo(9)],
    ["expense", 129.9, "Educação", "Curso de programação", daysAgo(11)],
    ["expense", 74.5, "Lazer", "Cinema com amigos", daysAgo(13)],
    ["expense", 56, "Saúde", "Farmácia", daysAgo(15)],
    ["income", 4000, "Salário", "Salário mensal", daysAgo(35)],
    ["expense", 640, "Moradia", "Aluguel", daysAgo(36)],
    ["expense", 310.25, "Alimentação", "Compras do mês", daysAgo(40)],
    ["expense", 115, "Transporte", "Combustível", daysAgo(44)],
    ["income", 380, "Outros", "Aulas particulares", daysAgo(48)],
    ["expense", 95, "Lazer", "Passeio no fim de semana", daysAgo(52)]
  ];
  return rows.map(([type, amount, category, description, date]) => ({
    id: crypto.randomUUID(),
    type,
    amount,
    category,
    description,
    date
  }));
}

function navigate(page) {
  const target = $(`#page-${page}`);
  if (!target) return;
  $$(".page-view").forEach((view) => view.classList.toggle("active", view === target));
  $$(".nav-link").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
  const names = { inicio: "Início", painel: "Painel", movimentacoes: "Movimentações", relatorios: "Relatórios" };
  $("#breadcrumb-current").textContent = names[page];
  $("#sidebar").classList.remove("open");
  $("#mobile-menu").setAttribute("aria-expanded", "false");
  window.location.hash = page === "inicio" ? "inicio" : page;
  renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function dateRange(period) {
  if (period === "all") return null;
  const today = new Date();
  if (period === "month") return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: today };
  const days = Number(period);
  if (!Number.isFinite(days)) return null;
  const start = new Date(today);
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  return { start, end: today };
}

function withinPeriod(item, period) {
  const range = dateRange(period);
  if (!range) return true;
  const [year, month, day] = item.date.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date >= range.start && date <= range.end;
}

function filteredByPeriod(period) {
  return transactions.filter((item) => withinPeriod(item, period));
}

function totals(items) {
  const income = items.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = items.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  return { income, expense, balance: income - expense };
}

function setAmount(id, amount, tone) {
  const element = document.getElementById(id);
  element.textContent = currency.format(amount);
  element.classList.toggle("amount-income", tone === "income");
  element.classList.toggle("amount-expense", tone === "expense");
}

function updateDashboard() {
  const rows = filteredByPeriod($("#dashboard-period").value);
  const sum = totals(rows);
  const currentBalance = totals(transactions).balance;
  setAmount("stat-balance", currentBalance, currentBalance < 0 ? "expense" : "");
  setAmount("stat-income", sum.income, "income");
  setAmount("stat-expense", sum.expense, "expense");
  setAmount("stat-savings", sum.balance, sum.balance < 0 ? "expense" : "income");

  const recent = [...rows].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  $("#recent-transactions").innerHTML = recent.map((item) => `
    <tr>
      <td><span class="transaction-name"><span class="transaction-symbol ${item.type === "expense" ? "expense-symbol" : ""}">${item.type === "income" ? "↗" : "↘"}</span>${escapeHtml(item.description)}</span></td>
      <td><span class="category-tag">${escapeHtml(item.category)}</span></td>
      <td>${formatDate(item.date)}</td>
      <td class="${item.type === "income" ? "amount-income" : "amount-expense"}">${item.type === "income" ? "+" : "−"} ${currency.format(item.amount)}</td>
    </tr>`).join("");
  $("#recent-empty").classList.toggle("hidden", recent.length > 0);
  $("#recent-transactions").closest("table").classList.toggle("hidden", recent.length === 0);
  renderTrendChart(rows, "income-expense-chart", "trend-empty", "dashboard-trend");
  renderCategoryChart(rows, "category-chart", "category-empty", "category-legend", "dashboard-category");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function updateTransactions() {
  const query = $("#transaction-search").value.trim().toLocaleLowerCase("pt-BR");
  const type = $("#type-filter").value;
  const period = $("#transaction-period").value;
  const rows = transactions.filter((item) =>
    (type === "all" || item.type === type) &&
    withinPeriod(item, period) &&
    `${item.description} ${item.category} ${item.date}`.toLocaleLowerCase("pt-BR").includes(query)
  ).sort((a, b) => b.date.localeCompare(a.date));
  $("#transactions-list").innerHTML = rows.map((item) => `
    <tr>
      <td><span class="transaction-name"><span class="transaction-symbol ${item.type === "expense" ? "expense-symbol" : ""}">${item.type === "income" ? "↗" : "↘"}</span>${escapeHtml(item.description)}</span></td>
      <td><span class="category-tag">${escapeHtml(item.category)}</span></td>
      <td>${formatDate(item.date)}</td>
      <td><span class="type-label">${item.type === "income" ? "Receita" : "Despesa"}</span></td>
      <td class="${item.type === "income" ? "amount-income" : "amount-expense"}">${item.type === "income" ? "+" : "−"} ${currency.format(item.amount)}</td>
      <td><div class="row-actions"><button class="row-action" data-action="edit-transaction" data-id="${item.id}" aria-label="Editar ${escapeHtml(item.description)}" title="Editar">✎</button><button class="row-action delete" data-action="delete-transaction" data-id="${item.id}" aria-label="Excluir ${escapeHtml(item.description)}" title="Excluir">×</button></div></td>
    </tr>`).join("");
  $("#transactions-empty").classList.toggle("hidden", rows.length > 0);
  $("#transactions-list").closest("table").classList.toggle("hidden", rows.length === 0);
  $("#transaction-count").textContent = `${rows.length} ${rows.length === 1 ? "movimentação encontrada" : "movimentações encontradas"}`;
  if (!rows.length) {
    const hasFilters = Boolean(query) || type !== "all" || period !== "all";
    $("#transactions-empty-title").textContent = hasFilters ? "Nenhuma movimentação encontrada" : "Você ainda não tem movimentações";
    $("#transactions-empty-copy").textContent = hasFilters ? "Experimente ajustar os filtros ou a busca." : "Adicione um registro para começar a acompanhar suas finanças.";
  }
}

function makeChart(id, config) {
  if (typeof Chart === "undefined") {
    showToast("Os gráficos não carregaram. Verifique sua conexão com a internet.", true);
    return;
  }
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(config.canvas), config.options);
}

function monthKey(date) {
  return date.slice(0, 7);
}

function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(year, month - 1, 1)).replace(".", "");
}

function renderTrendChart(rows, canvas, emptyId, chartId) {
  const byMonth = new Map();
  rows.forEach((item) => {
    const key = monthKey(item.date);
    if (!byMonth.has(key)) byMonth.set(key, { income: 0, expense: 0 });
    byMonth.get(key)[item.type] += item.amount;
  });
  let keys;
  if (rows.length === 0) keys = [];
  else if ($("#dashboard-period").value === "month") keys = [localDateString().slice(0, 7)];
  else if ($("#dashboard-period").value === "30") keys = [...new Set([localDateString().slice(0, 7), ...byMonth.keys()])].sort().slice(-2);
  else if ($("#dashboard-period").value === "90") keys = [...new Set([localDateString().slice(0, 7), ...byMonth.keys()])].sort().slice(-3);
  else keys = [...byMonth.keys()].sort().slice(-6);
  const empty = keys.length === 0;
  document.getElementById(canvas).classList.toggle("hidden", empty);
  document.getElementById(emptyId).classList.toggle("hidden", !empty);
  if (empty) {
    if (charts[chartId]) { charts[chartId].destroy(); delete charts[chartId]; }
    return;
  }
  makeChart(chartId, { canvas, options: {
    type: "bar",
    data: {
      labels: keys.map(monthLabel),
      datasets: [
        { label: "Receitas", data: keys.map((key) => byMonth.get(key)?.income || 0), backgroundColor: "#57d99a", borderRadius: 4, maxBarThickness: 22 },
        { label: "Despesas", data: keys.map((key) => byMonth.get(key)?.expense || 0), backgroundColor: "#65a8f4", borderRadius: 4, maxBarThickness: 22 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${currency.format(context.raw)}` } } },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: "#788791", font: { family: "DM Sans", size: 9 } } },
        y: { beginAtZero: true, grid: { color: "rgba(165,186,202,.08)", drawTicks: false }, border: { display: false }, ticks: { color: "#6d7a83", padding: 9, font: { family: "DM Sans", size: 8 }, callback: (value) => `R$ ${value >= 1000 ? `${(value / 1000).toLocaleString("pt-BR")}k` : value}` } }
      }
    }
  }});
}

function renderCategoryChart(rows, canvas, emptyId, legendId, chartId) {
  const groups = new Map();
  rows.filter((item) => item.type === "expense").forEach((item) => groups.set(item.category, (groups.get(item.category) || 0) + item.amount));
  const entries = [...groups.entries()].sort((a, b) => b[1] - a[1]);
  const empty = entries.length === 0;
  document.getElementById(canvas).classList.toggle("hidden", empty);
  document.getElementById(emptyId).classList.toggle("hidden", !empty);
  const legend = document.getElementById(legendId);
  legend.innerHTML = entries.slice(0, 6).map(([name, value], index) => `
    <div class="legend-item"><span class="legend-swatch" style="background:${CHART_COLORS[index % CHART_COLORS.length]}"></span><span>${escapeHtml(name)}</span><b>${Math.round(value / entries.reduce((sum, entry) => sum + entry[1], 0) * 100)}%</b></div>`).join("");
  if (empty) {
    if (charts[chartId]) { charts[chartId].destroy(); delete charts[chartId]; }
    return;
  }
  makeChart(chartId, { canvas, options: {
    type: "doughnut",
    data: { labels: entries.map(([name]) => name), datasets: [{ data: entries.map(([, value]) => value), backgroundColor: entries.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]), borderColor: "#0e151b", borderWidth: 3, hoverOffset: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: "72%", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.label}: ${currency.format(context.raw)}` } } } }
  }});
}

function updateReports() {
  const period = $("#report-period").value;
  const rows = filteredByPeriod(period);
  const sum = totals(rows);
  setAmount("report-income", sum.income, "income");
  setAmount("report-expense", sum.expense, "expense");
  setAmount("report-net", sum.balance, sum.balance < 0 ? "expense" : "income");
  renderCategoryChart(rows, "report-category-chart", "report-category-empty", "report-category-legend", "report-category");
  renderMonthlyReport(period);
  renderBalanceChart(rows);
}

function reportMonthKeys(period, rows) {
  if (period === "month") return [localDateString().slice(0, 7)];
  const months = [...new Set(rows.map((item) => monthKey(item.date)))].sort();
  if (period === "30") return months.slice(-2);
  if (period === "90") return months.slice(-3);
  return months.slice(-6);
}

function renderMonthlyReport(period) {
  const rows = filteredByPeriod(period);
  const keys = reportMonthKeys(period, rows);
  const canvas = $("#monthly-chart");
  const empty = keys.length === 0;
  canvas.classList.toggle("hidden", empty);
  $("#monthly-empty").classList.toggle("hidden", !empty);
  if (empty) {
    if (charts["monthly-report"]) { charts["monthly-report"].destroy(); delete charts["monthly-report"]; }
    return;
  }
  const grouped = new Map(keys.map((key) => [key, { income: 0, expense: 0 }]));
  rows.forEach((item) => {
    const key = monthKey(item.date);
    if (!grouped.has(key)) return;
    grouped.get(key)[item.type] += item.amount;
  });
  makeChart("monthly-report", { canvas: "monthly-chart", options: {
    type: "line",
    data: {
      labels: keys.map(monthLabel),
      datasets: [
        { label: "Receitas", data: keys.map((key) => grouped.get(key).income), borderColor: "#57d99a", backgroundColor: "rgba(87,217,154,.08)", fill: true, tension: .35, pointRadius: 3, pointBackgroundColor: "#57d99a" },
        { label: "Despesas", data: keys.map((key) => grouped.get(key).expense), borderColor: "#65a8f4", backgroundColor: "rgba(101,168,244,.05)", fill: true, tension: .35, pointRadius: 3, pointBackgroundColor: "#65a8f4" }
      ]
    },
    options: chartLineOptions()
  }});
}

function chartLineOptions() {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { color: "#9aa7ad", usePointStyle: true, pointStyle: "circle", boxWidth: 7, boxHeight: 7, padding: 17, font: { family: "DM Sans", size: 9 } } },
      tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${currency.format(context.raw)}` } }
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: "#788791", font: { family: "DM Sans", size: 9 } } },
      y: { beginAtZero: true, grid: { color: "rgba(165,186,202,.08)" }, border: { display: false }, ticks: { color: "#6d7a83", font: { family: "DM Sans", size: 8 }, callback: (value) => `R$ ${value >= 1000 ? `${(value / 1000).toLocaleString("pt-BR")}k` : value}` } }
    }
  };
}

function renderBalanceChart(rows) {
  const selectedDates = new Set(rows.map((item) => item.date));
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const canvas = $("#balance-chart");
  const empty = sorted.length === 0;
  canvas.classList.toggle("hidden", empty);
  $("#balance-empty").classList.toggle("hidden", !empty);
  if (empty) {
    if (charts["balance-report"]) { charts["balance-report"].destroy(); delete charts["balance-report"]; }
    return;
  }
  let balance = 0;
  const pointsByDate = new Map();
  sorted.forEach((item) => {
    balance += item.type === "income" ? item.amount : -item.amount;
    if (selectedDates.has(item.date)) pointsByDate.set(item.date, balance);
  });
  const points = [...pointsByDate.entries()];
  makeChart("balance-report", { canvas: "balance-chart", options: {
    type: "line",
    data: {
      labels: points.map(([date]) => formatDate(date)),
      datasets: [{ label: "Saldo acumulado", data: points.map(([, value]) => value), borderColor: "#57d99a", backgroundColor: "rgba(87,217,154,.09)", fill: true, tension: .3, pointRadius: points.length > 20 ? 0 : 3, pointBackgroundColor: "#57d99a" }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `Saldo: ${currency.format(context.raw)}` } } },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 7, color: "#788791", font: { family: "DM Sans", size: 8 } } },
        y: { grid: { color: "rgba(165,186,202,.08)" }, border: { display: false }, ticks: { color: "#6d7a83", font: { family: "DM Sans", size: 8 }, callback: (value) => currency.format(value) } }
      }
    }
  }});
}

function renderAll() {
  updateDashboard();
  updateTransactions();
  updateReports();
}

function populateCategories(selected = "Alimentação") {
  $("#category").innerHTML = CATEGORIES.map((category) => `<option value="${category}" ${category === selected ? "selected" : ""}>${category}</option>`).join("");
}

function setType(type) {
  const input = $(`input[name="type"][value="${type}"]`);
  input.checked = true;
  $$(".type-option").forEach((option) => option.classList.toggle("selected", option.dataset.type === type));
  populateCategories(type === "income" ? "Salário" : "Alimentação");
}

function openModal(item = null) {
  returnFocus = document.activeElement;
  $("#transaction-form").reset();
  $("#transaction-id").value = item?.id || "";
  $("#modal-title").textContent = item ? "Editar movimentação" : "Nova movimentação";
  $("#save-transaction").innerHTML = item ? "Salvar alterações <span>→</span>" : "Salvar movimentação <span>→</span>";
  setType(item?.type || "expense");
  $("#amount").value = item ? item.amount.toFixed(2) : "";
  $("#date").value = item?.date || localDateString();
  populateCategories(item?.category || (item?.type === "income" ? "Salário" : "Alimentação"));
  $("#description").value = item?.description || "";
  $("#form-error").classList.add("hidden");
  $("#transaction-modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  window.setTimeout(() => $("#amount").focus(), 30);
}

function closeModal() {
  $("#transaction-modal").classList.add("hidden");
  document.body.style.overflow = "";
  if (returnFocus && typeof returnFocus.focus === "function") returnFocus.focus();
}

function submitTransaction(event) {
  event.preventDefault();
  const amount = Number($("#amount").value);
  const date = $("#date").value;
  const description = $("#description").value.trim();
  const error = $("#form-error");
  if (!Number.isFinite(amount) || amount <= 0 || !date || !description) {
    error.textContent = "Preencha todos os campos com valores válidos.";
    error.classList.remove("hidden");
    return;
  }
  const id = $("#transaction-id").value;
  const item = {
    id: id || crypto.randomUUID(),
    type: $('input[name="type"]:checked').value,
    amount,
    category: $("#category").value,
    description,
    date
  };
  if (id) transactions = transactions.map((existing) => existing.id === id ? item : existing);
  else transactions.push(item);
  if (!saveTransactions()) return;
  closeModal();
  renderAll();
  showToast(id ? "Movimentação atualizada com sucesso." : "Movimentação adicionada com sucesso.");
}

function deleteTransaction(id) {
  const item = transactions.find((row) => row.id === id);
  if (!item || !window.confirm(`Excluir "${item.description}"? Esta ação não pode ser desfeita.`)) return;
  transactions = transactions.filter((row) => row.id !== id);
  if (!saveTransactions()) return;
  renderAll();
  showToast("Movimentação excluída.");
}

function clearData() {
  if (!transactions.length) {
    showToast("Não há dados para limpar.");
    return;
  }
  if (!window.confirm("Deseja apagar todas as movimentações salvas? Esta ação não pode ser desfeita.")) return;
  const previous = transactions;
  transactions = [];
  if (!saveTransactions()) {
    transactions = previous;
    return;
  }
  renderAll();
  showToast("Todas as movimentações foram removidas.");
}

function loadDemo() {
  const demo = demoTransactions();
  const combined = [...transactions, ...demo];
  const previous = transactions;
  transactions = combined;
  if (!saveTransactions()) {
    transactions = previous;
    return;
  }
  renderAll();
  navigate("painel");
  showToast("Demonstração adicionada. Você pode editar ou remover os registros.");
}

function initialize() {
  transactions = readTransactions();
  $("#today-label").textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).format(new Date());
  populateCategories();
  const page = window.location.hash.replace("#", "");
  navigate(["painel", "movimentacoes", "relatorios"].includes(page) ? page : "inicio");

  $$(".nav-link").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.page)));
  $$("[data-go]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.go)));
  $$("[data-action='new-transaction']").forEach((button) => button.addEventListener("click", () => openModal()));
  $$("[data-action='clear-data']").forEach((button) => button.addEventListener("click", clearData));
  $("#hero-demo").addEventListener("click", loadDemo);
  $("#dashboard-period").addEventListener("change", updateDashboard);
  $("#report-period").addEventListener("change", updateReports);
  ["transaction-search", "type-filter", "transaction-period"].forEach((id) => {
    const element = document.getElementById(id);
    element.addEventListener(id === "transaction-search" ? "input" : "change", updateTransactions);
  });
  $("#transaction-form").addEventListener("submit", submitTransaction);
  $("#close-modal").addEventListener("click", closeModal);
  $("#cancel-modal").addEventListener("click", closeModal);
  $$(".type-option").forEach((option) => option.addEventListener("click", () => setType(option.dataset.type)));
  $("#mobile-menu").addEventListener("click", () => {
    const open = $("#sidebar").classList.toggle("open");
    $("#mobile-menu").setAttribute("aria-expanded", String(open));
  });
  $("#transaction-modal").addEventListener("click", (event) => {
    if (event.target === $("#transaction-modal")) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("#transaction-modal").classList.contains("hidden")) closeModal();
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='edit-transaction'], [data-action='delete-transaction']");
    if (!button) return;
    if (button.dataset.action === "edit-transaction") {
      const item = transactions.find((row) => row.id === button.dataset.id);
      if (item) openModal(item);
    } else deleteTransaction(button.dataset.id);
  });
  window.addEventListener("hashchange", () => {
    const requested = window.location.hash.replace("#", "");
    if (["inicio", "painel", "movimentacoes", "relatorios"].includes(requested) &&
        !$(`#page-${requested}`).classList.contains("active")) navigate(requested);
  });
}

document.addEventListener("DOMContentLoaded", initialize);
