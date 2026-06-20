/* =====================================================
   KALENDER.JS
   Schichtkalender mit automatischer Stundenberechnung
   Speichert alle Schichten im localStorage
===================================================== */

/* =========================
   SPEICHER-KEY
========================= */

const STORAGE_KEY = "schichtkalender";
const LAST_SAVE_KEY = "schichtkalender:lastSaved";
const VIEW_KEY = "schichtkalender:selectedView";

/* =========================
   SCHICHTEN
========================= */

const SHIFT_OPTIONS = [
  "",
  "F1",
  "M1",
  "M2",
  "S1",
  "S2",
  "N1",
  "Urlaub",
  "Krank",
  "Frei",
];

/* =========================
   SCHICHTZEITEN
========================= */

const SHIFT_TIMES = {
  F1: {
    start: "06:24",
    end: "15:00",
    pauseStart: "10:00",
    pauseEnd: "10:45",
  },

  M1: {
    start: "08:30",
    end: "17:06",
    pauseStart: "12:00",
    pauseEnd: "12:45",
  },

  M2: {
    start: "11:30",
    end: "20:06",
    pauseStart: "15:00",
    pauseEnd: "15:45",
  },

  S1: {
    start: "14:57",
    end: "23:33",
    pauseStart: "18:00",
    pauseEnd: "18:45",
  },

  S2: {
    start: "14:57",
    end: "22:33",
    pauseStart: "18:00",
    pauseEnd: "18:45",
  },

  N1: {
    start: "22:00",
    end: "06:36",
    pauseStart: "02:00",
    pauseEnd: "02:45",
  },
};

/* =========================
   HILFSFUNKTIONEN
========================= */

// Uhrzeit "22:30" in Minuten umwandeln
function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Zahl deutsch formatieren
function formatNumber(value) {
  return Number(value || 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Datumsschlüssel erzeugen: 2026-05-01
function createDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
}

// Kalenderdaten laden
function loadCalendarData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (error) {
    console.error("Kalenderdaten konnten nicht gelesen werden.", error);
    return {};
  }
}

// Kalenderdaten speichern
function saveCalendarData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  localStorage.setItem(LAST_SAVE_KEY, new Date().toISOString());
  updateSaveStatus("Gespeichert");
}

function loadSelectedView() {
  try {
    return JSON.parse(localStorage.getItem(VIEW_KEY)) || null;
  } catch (error) {
    console.error("Kalenderansicht konnte nicht gelesen werden.", error);
    return null;
  }
}

function saveSelectedView(month, year) {
  localStorage.setItem(VIEW_KEY, JSON.stringify({ month, year }));
}

function updateSaveStatus(prefix = "Automatisch gespeichert") {
  const saveStatus = document.getElementById("saveStatus");
  if (!saveStatus) return;

  const lastSaved = localStorage.getItem(LAST_SAVE_KEY);
  if (!lastSaved) {
    saveStatus.textContent = "Noch keine Speicherung";
    return;
  }

  const savedAt = new Date(lastSaved);
  saveStatus.textContent = `${prefix}: ${savedAt.toLocaleString("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  })}`;
}

function exportCalendarData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    type: "lohnapp-schichtkalender",
    version: 1,
    shifts: loadCalendarData(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `schichtkalender-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importCalendarData(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = JSON.parse(String(reader.result || "{}"));
      const shifts = imported.shifts && typeof imported.shifts === "object"
        ? imported.shifts
        : imported;

      if (!shifts || Array.isArray(shifts) || typeof shifts !== "object") {
        throw new Error("ungueltiges Format");
      }

      saveCalendarData(shifts);
      renderCalendar();
      updateSaveStatus("Importiert und gespeichert");
    } catch (error) {
      console.error("Kalenderdaten konnten nicht importiert werden.", error);
      alert("Die Kalenderdatei konnte nicht gelesen werden.");
    }
  });
  reader.readAsText(file);
}

/* =========================
   FEIERTAGE HESSEN
========================= */

// Ostersonntag berechnen
function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);

  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month, day);
}

// Tage zu Datum addieren
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Datum in Key umwandeln
function keyFromDate(date) {
  return createDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

// Feiertage Hessen automatisch berechnen
function getHessenHolidays(year) {
  const easter = getEasterSunday(year);

  return {
    [`${year}-01-01`]: "Neujahr",
    [keyFromDate(addDays(easter, -2))]: "Karfreitag",
    [keyFromDate(addDays(easter, 1))]: "Ostermontag",
    [`${year}-05-01`]: "Tag der Arbeit",
    [keyFromDate(addDays(easter, 39))]: "Christi Himmelfahrt",
    [keyFromDate(addDays(easter, 50))]: "Pfingstmontag",
    [keyFromDate(addDays(easter, 60))]: "Fronleichnam",
    [`${year}-10-03`]: "Tag der Deutschen Einheit",
    [`${year}-12-25`]: "1. Weihnachtstag",
    [`${year}-12-26`]: "2. Weihnachtstag",
  };
}

/* =========================
   SCHICHTSTUNDEN BERECHNEN
========================= */

function calculateShift(shift) {
  // Frei oder leer
  if (!shift || shift === "Frei") {
    return {
      paidHours: 0,
      night35: 0,
      night50: 0,
      vacationDay: 0,
      sickDay: 0,
    };
  }

  // Urlaub = Tageswert ohne Zuschläge
  if (shift === "Urlaub") {
    return {
      paidHours: 7.85,
      night35: 0,
      night50: 0,
      vacationDay: 1,
      sickDay: 0,
    };
  }

  // Krank = Tageswert ohne Zuschläge
  if (shift === "Krank") {
    return {
      paidHours: 7.85,
      night35: 0,
      night50: 0,
      vacationDay: 0,
      sickDay: 1,
    };
  }

  const rule = SHIFT_TIMES[shift];

  if (!rule) {
    return {
      paidHours: 0,
      night35: 0,
      night50: 0,
      vacationDay: 0,
      sickDay: 0,
    };
  }

  let start = toMinutes(rule.start);
  let end = toMinutes(rule.end);
  let pauseStart = toMinutes(rule.pauseStart);
  let pauseEnd = toMinutes(rule.pauseEnd);

  // Schicht über Mitternacht
  if (end <= start) end += 1440;
  if (pauseStart < start) pauseStart += 1440;
  if (pauseEnd < start) pauseEnd += 1440;

  const pauseMinutes = pauseEnd - pauseStart;
  const paidMinutes = end - start - pauseMinutes;

  let night35Minutes = 0;
  let night50Minutes = 0;

  // Jede bezahlte Minute prüfen
  for (let minute = start; minute < end; minute++) {
    if (minute >= pauseStart && minute < pauseEnd) continue;

    const dayMinute = minute % 1440;

    // 20:00 bis 00:00 = 35 %
    if (dayMinute >= 20 * 60 && dayMinute < 24 * 60) {
      night35Minutes++;
    }

    // 00:00 bis 04:00 = 50 %
    if (dayMinute >= 0 && dayMinute < 4 * 60) {
      night50Minutes++;
    }

    // 04:00 bis 06:00 = 35 %
    if (dayMinute >= 4 * 60 && dayMinute < 6 * 60) {
      night35Minutes++;
    }
  }

  return {
    paidHours: paidMinutes / 60,
    night35: night35Minutes / 60,
    night50: night50Minutes / 60,
    vacationDay: 0,
    sickDay: 0,
  };
}

/* =========================
   MONAT / JAHR LESEN
========================= */

function getSelectedMonthYear() {
  return {
    month: Number(document.getElementById("monthSelect").value),
    year: Number(document.getElementById("yearInput").value),
  };
}

/* =========================
   KALENDER ERSTELLEN
========================= */

function renderCalendar() {
  const calendarBody = document.getElementById("calendarBody");
  if (!calendarBody) return;

  const { month, year } = getSelectedMonthYear();
  saveSelectedView(month, year);

  const calendarData = loadCalendarData();
  const holidays = getHessenHolidays(year);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  calendarBody.innerHTML = "";

  for (let day = 1; day <= daysInMonth; day++) {
    const key = createDateKey(year, month, day);
    const date = new Date(year, month, day);

    const savedShift = calendarData[key] || "";
    const calculated = calculateShift(savedShift);

    const isSunday = date.getDay() === 0;
    const holidayName = holidays[key] || "";

    const sundayHours = isSunday ? calculated.paidHours : 0;
    const holidayHours = holidayName ? calculated.paidHours : 0;

    const row = document.createElement("tr");

    if (isSunday) row.classList.add("sunday-row");
    if (holidayName) row.classList.add("holiday-row");

    row.innerHTML = `
      <td>${day}</td>
      <td>${date.toLocaleDateString("de-DE", { weekday: "long" })}</td>
      <td>${holidayName}</td>

      <td>
        <select class="shift-select" data-date="${key}">
          ${SHIFT_OPTIONS.map(
            (shift) =>
              `<option value="${shift}" ${
                shift === savedShift ? "selected" : ""
              }>${shift || "-"}</option>`,
          ).join("")}
        </select>
      </td>

      <td class="hours-cell">${formatNumber(calculated.paidHours)}</td>
      <td>${formatNumber(calculated.night35)}</td>
      <td>${formatNumber(calculated.night50)}</td>
      <td>${formatNumber(sundayHours)}</td>
      <td>${formatNumber(holidayHours)}</td>
    `;

    calendarBody.appendChild(row);
  }

  activateShiftSelectors();
  updateSummary();
}

/* =========================
   SCHICHT SPEICHERN
========================= */

function activateShiftSelectors() {
  const selects = document.querySelectorAll(".shift-select");

  selects.forEach((select) => {
    select.addEventListener("change", () => {
      const calendarData = loadCalendarData();
      const date = select.dataset.date;

      if (select.value) {
        calendarData[date] = select.value;
      } else {
        delete calendarData[date];
      }

      saveCalendarData(calendarData);
      renderCalendar();
    });
  });
}

/* =========================
   MONAT AUSWERTEN
========================= */

function calculateMonth(month, year) {
  const calendarData = loadCalendarData();
  const holidays = getHessenHolidays(year);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let totalHours = 0;
  let night35 = 0;
  let night50 = 0;
  let sundayHours = 0;
  let holidayHours = 0;
  let vacationDays = 0;
  let sickDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const key = createDateKey(year, month, day);
    const date = new Date(year, month, day);

    const shift = calendarData[key] || "";
    const calculated = calculateShift(shift);

    const isSunday = date.getDay() === 0;
    const isHoliday = Boolean(holidays[key]);

    totalHours += calculated.paidHours;
    night35 += calculated.night35;
    night50 += calculated.night50;

    if (isSunday) sundayHours += calculated.paidHours;
    if (isHoliday) holidayHours += calculated.paidHours;

    vacationDays += calculated.vacationDay;
    sickDays += calculated.sickDay;
  }

  return {
    totalHours,
    night35,
    night50,
    sundayHours,
    holidayHours,
    vacationDays,
    sickDays,
  };
}

/* =========================
   ZUSAMMENFASSUNG
========================= */

function updateSummary() {
  const { month, year } = getSelectedMonthYear();
  const result = calculateMonth(month, year);

  document.getElementById("totalHours").textContent = formatNumber(
    result.totalHours,
  );

  document.getElementById("hours35").textContent = formatNumber(result.night35);

  document.getElementById("hours50").textContent = formatNumber(result.night50);

  document.getElementById("sundayHours").textContent = formatNumber(
    result.sundayHours,
  );

  document.getElementById("holidayHours").textContent = formatNumber(
    result.holidayHours,
  );

  document.getElementById("vacationDays").textContent = result.vacationDays;
  document.getElementById("sickDays").textContent = result.sickDays;
}

/* =========================
   MONAT LÖSCHEN
========================= */

function clearCurrentMonth() {
  const { month, year } = getSelectedMonthYear();
  const calendarData = loadCalendarData();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const key = createDateKey(year, month, day);
    delete calendarData[key];
  }

  saveCalendarData(calendarData);
  renderCalendar();
}

/* =========================
   START
========================= */

document.addEventListener("DOMContentLoaded", () => {
  const monthSelect = document.getElementById("monthSelect");
  const yearInput = document.getElementById("yearInput");
  const createCalendarBtn = document.getElementById("createCalendarBtn");
  const clearMonthBtn = document.getElementById("clearMonthBtn");
  const exportCalendarBtn = document.getElementById("exportCalendarBtn");
  const importCalendarInput = document.getElementById("importCalendarInput");

  if (!monthSelect || !yearInput) return;

  const today = new Date();
  const savedView = loadSelectedView();

  monthSelect.value = savedView?.month ?? today.getMonth();
  yearInput.value = savedView?.year ?? today.getFullYear();

  if (createCalendarBtn) {
    createCalendarBtn.addEventListener("click", renderCalendar);
  }

  if (clearMonthBtn) {
    clearMonthBtn.addEventListener("click", clearCurrentMonth);
  }

  if (exportCalendarBtn) {
    exportCalendarBtn.addEventListener("click", exportCalendarData);
  }

  if (importCalendarInput) {
    importCalendarInput.addEventListener("change", () => {
      importCalendarData(importCalendarInput.files?.[0]);
      importCalendarInput.value = "";
    });
  }

  monthSelect.addEventListener("change", renderCalendar);
  yearInput.addEventListener("input", renderCalendar);

  renderCalendar();
  updateSaveStatus();
});
