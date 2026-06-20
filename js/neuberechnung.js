/* =====================================================
   NEUBERECHNUNG.JS
   Berechnet die Neuberechnung aus Kalenderdaten
   + Urlaubsgeld
   + Weihnachtsgeld
   + Bonus
   + Extras
===================================================== */

/* =====================================================
   SPEICHER
===================================================== */

// Muss gleich sein wie im kalender.js
const STORAGE_KEY = "schichtkalender";
const ABRECHNUNG_RESULTS_KEY = "lohnapp:abrechnung:results";

/* =====================================================
   GRUNDWERTE
===================================================== */

// Fallback-Werte, falls Felder leer sind
const DEFAULT_GRUNDVERGUETUNG = 5718.18;
const DEFAULT_STUNDENLOHN = 35.08;

// Pauschale pro Urlaubs-/Kranktag
const URLAUB_PAUSCHALE = 71.93;
const KRANK_PAUSCHALE = 71.93;

// Zuschlagssätze
const SCHICHTZULAGE_PROZENT = 0.036;
const NACHT_35_PROZENT = 0.35;
const NACHT_50_PROZENT = 0.5;
const SONNTAG_PROZENT = 0.55;
const FEIERTAG_PROZENT = 0.5;

// Gesetzliche Abzüge
const RV_PROZENT = 0.093;
const ALV_PROZENT = 0.013;

/* =====================================================
   ZAHLEN LESEN UND SCHREIBEN
===================================================== */

// Deutsche Zahl lesen
// Beispiel: "1.034,63-" wird zu -1034.63
function readMoney(id, fallback = 0) {
  const el = document.getElementById(id);
  if (!el) return fallback;

  let value = String(el.value || el.textContent || "").trim();

  if (!value) return fallback;

  const isNegative = value.endsWith("-");

  value = value.replace("-", "");
  value = value.replace(/\./g, "");
  value = value.replace(",", ".");

  const number = parseFloat(value);

  if (Number.isNaN(number)) return fallback;

  return isNegative ? -number : number;
}

function loadAbrechnungNettoAlt() {
  try {
    const saved = JSON.parse(localStorage.getItem(ABRECHNUNG_RESULTS_KEY)) || {};
    const netto = Number(saved.netto);

    return Number.isFinite(netto) ? netto : 0;
  } catch (error) {
    console.error("Netto alt konnte nicht aus der Abrechnung gelesen werden.", error);
    return 0;
  }
}

// Zahl deutsch formatieren
function formatMoney(value) {
  const isNegative = value < 0;
  const absValue = Math.abs(value);

  const formatted = absValue.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return isNegative ? `${formatted}-` : formatted;
}

// Zahl in Input schreiben
function writeInput(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  el.value = formatMoney(value);
}

// Zahl in Tabellenzelle schreiben
function writeText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = formatMoney(value);
}

// Stunden/Tage schreiben
function writeNumber(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  el.value = Number(value || 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function readNumber(id, fallback = 0) {
  const el = document.getElementById(id);
  if (!el) return fallback;

  const value = String(el.value || el.textContent || "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getTaxParameters(year) {
  const parameters = {
    2024: {
      basicAllowance: 11784,
      firstProgressionLimit: 17005,
      secondProgressionLimit: 66760,
      richTaxLimit: 277825,
      firstA: 954.8,
      firstB: 1400,
      secondA: 181.19,
      secondB: 2397,
      secondC: 991.21,
      proportionalDeduction: 10636.31,
      richDeduction: 18971.06,
    },
    2025: {
      basicAllowance: 12096,
      firstProgressionLimit: 17443,
      secondProgressionLimit: 68480,
      richTaxLimit: 277825,
      firstA: 932.3,
      firstB: 1400,
      secondA: 176.64,
      secondB: 2397,
      secondC: 1015.13,
      proportionalDeduction: 10911.92,
      richDeduction: 19246.67,
    },
    2026: {
      basicAllowance: 12336,
      firstProgressionLimit: 17800,
      secondProgressionLimit: 69600,
      richTaxLimit: 277825,
      firstA: 910,
      firstB: 1400,
      secondA: 170,
      secondB: 2397,
      secondC: 1040,
      proportionalDeduction: 11180,
      richDeduction: 19514.75,
    },
  };

  return parameters[year] || parameters[2026];
}

function calculateIncomeTax(zve, year, taxClass = 4) {
  if (taxClass === 3) {
    return calculateBasicIncomeTax(zve / 2, year) * 2;
  }

  if (taxClass === 5) {
    return calculateBasicIncomeTax(zve, year) * 1.25;
  }

  if (taxClass === 6) {
    return calculateBasicIncomeTax(zve, year) * 1.35;
  }

  return calculateBasicIncomeTax(zve, year);
}

function calculateBasicIncomeTax(zve, year) {
  const tax = getTaxParameters(year);
  const x = Math.max(0, Math.floor(zve));

  if (x <= tax.basicAllowance) return 0;

  if (x <= tax.firstProgressionLimit) {
    const y = (x - tax.basicAllowance) / 10000;
    return (tax.firstA * y + tax.firstB) * y;
  }

  if (x <= tax.secondProgressionLimit) {
    const z = (x - tax.firstProgressionLimit) / 10000;
    return (tax.secondA * z + tax.secondB) * z + tax.secondC;
  }

  if (x <= tax.richTaxLimit) {
    return 0.42 * x - tax.proportionalDeduction;
  }

  return 0.45 * x - tax.richDeduction;
}

function calculateAutomaticTax({
  laufendesEntgelt,
  sonstigesEntgelt = 0,
  rv = 0,
  alv = 0,
  kv = 0,
  pv = 0,
  year,
}) {
  const taxClass = Math.round(readNumber("steuerklasse", 4));
  const monthlyAllowance = Math.max(0, readMoney("steuerfreibetragMonatlich"));
  const yearlyAllowance = Math.max(0, readMoney("steuerfreibetragJaehrlich"));
  const childAllowances = Math.max(0, readNumber("kinderfreibetraege", 0));

  const annualGross = Math.max(0, laufendesEntgelt * 12 + sonstigesEntgelt);
  const annualSocialInsurance =
    Math.abs(rv) * 12 +
    Math.abs(alv) * 12 +
    Math.abs(kv) * 12 +
    Math.abs(pv) * 12;

  const employeeAllowance = 1230;
  const specialExpensesAllowance = 36;
  const childAllowance = childAllowances * 9600;
  const allowances =
    employeeAllowance +
    specialExpensesAllowance +
    annualSocialInsurance +
    monthlyAllowance * 12 +
    yearlyAllowance +
    childAllowance;

  const annualTaxableIncome = Math.max(0, annualGross - allowances);
  const annualTax = calculateIncomeTax(annualTaxableIncome, year, taxClass);

  return {
    annualTaxableIncome,
    monthlyTax: annualTax / 12,
  };
}

/* =====================================================
   DATUM UND FEIERTAGE HESSEN
===================================================== */

// Datum in yyyy-mm-dd umwandeln
function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

// Tage addieren
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

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

// Feiertage Hessen automatisch berechnen
function getHessenHolidays(year) {
  const easter = getEasterSunday(year);

  return {
    [`${year}-01-01`]: "Neujahr",
    [toDateKey(addDays(easter, -2))]: "Karfreitag",
    [toDateKey(addDays(easter, 1))]: "Ostermontag",
    [`${year}-05-01`]: "Tag der Arbeit",
    [toDateKey(addDays(easter, 39))]: "Christi Himmelfahrt",
    [toDateKey(addDays(easter, 50))]: "Pfingstmontag",
    [toDateKey(addDays(easter, 60))]: "Fronleichnam",
    [`${year}-10-03`]: "Tag der Deutschen Einheit",
    [`${year}-12-25`]: "1. Weihnachtstag",
    [`${year}-12-26`]: "2. Weihnachtstag",
  };
}

/* =====================================================
   KALENDERDATEN LADEN
===================================================== */
function loadCalendar() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (error) {
    console.error("Kalenderdaten konnten nicht gelesen werden.", error);
    return {};
  }
}

/* =====================================================
   SCHICHTREGELN
   Muss zur Zeitlogik in kalender.js passen
===================================================== */

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

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function calculateShift(shift) {
  if (!shift || shift === "Frei") {
    return {
      paidHours: 0,
      night35: 0,
      night50: 0,
      vacationDay: 0,
      sickDay: 0,
    };
  }

  if (shift === "Urlaub") {
    return {
      paidHours: 7.85,
      night35: 0,
      night50: 0,
      vacationDay: 1,
      sickDay: 0,
    };
  }

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

  if (end <= start) end += 1440;
  if (pauseStart < start) pauseStart += 1440;
  if (pauseEnd < start) pauseEnd += 1440;

  const paidMinutes = end - start - (pauseEnd - pauseStart);

  let night35Minutes = 0;
  let night50Minutes = 0;

  for (let minute = start; minute < end; minute++) {
    if (minute >= pauseStart && minute < pauseEnd) continue;

    const dayMinute = minute % 1440;

    if (dayMinute >= 20 * 60 && dayMinute < 24 * 60) {
      night35Minutes++;
    }

    if (dayMinute >= 0 && dayMinute < 4 * 60) {
      night50Minutes++;
    }

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

/* =====================================================
   MONAT AUS TITEL LESEN
   Beispiel: "Mai 2026"
===================================================== */

const MONTHS = {
  januar: 0,
  februar: 1,
  märz: 2,
  maerz: 2,
  april: 3,
  mai: 4,
  juni: 5,
  juli: 6,
  august: 7,
  september: 8,
  oktober: 9,
  november: 10,
  dezember: 11,
};

function getPayrollMonth() {
  const titleInput = document.getElementById("abrechnungTitel");
  const title = titleInput ? titleInput.value.trim() : "Mai 2026";

  const parts = title.toLowerCase().split(" ");

  return {
    month: MONTHS[parts[0]] ?? 4,
    year: Number(parts[1]) || 2026,
  };
}

/* =====================================================
   KALENDER MONAT AUSWERTEN
===================================================== */

function calculateCalendarMonth(month, year) {
  const calendar = loadCalendar();
  const holidays = getHessenHolidays(year);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let totalHours = 0;
  let vacationDays = 0;
  let sickDays = 0;

  let night35Hours = 0;
  let night50Hours = 0;
  let sundayHours = 0;
  let holidayHours = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day,
    ).padStart(2, "0")}`;

    const shiftName = calendar[key] || "";
    const calculated = calculateShift(shiftName);

    const date = new Date(year, month, day);
    const isSunday = date.getDay() === 0;
    const isHoliday = Boolean(holidays[key]);

    totalHours += calculated.paidHours;
    night35Hours += calculated.night35;
    night50Hours += calculated.night50;

    vacationDays += calculated.vacationDay;
    sickDays += calculated.sickDay;

    if (isSunday) {
      sundayHours += calculated.paidHours;
    }

    if (isHoliday) {
      holidayHours += calculated.paidHours;
    }
  }

  return {
    totalHours,
    vacationDays,
    sickDays,
    night35Hours,
    night50Hours,
    sundayHours,
    holidayHours,
  };
}

/* =====================================================
   HAUPTBERECHNUNG
===================================================== */

function calculateNeuberechnung() {
  /* -------------------------
     Monat und Kalenderdaten
  ------------------------- */

  const { month, year } = getPayrollMonth();
  const calendar = calculateCalendarMonth(month, year);

  /* -------------------------
     Grunddaten
  ------------------------- */

  const grund = readMoney("grundBetrag", DEFAULT_GRUNDVERGUETUNG);
  const leasing = readMoney("leasingrateFahrrad");

  const stundenlohn = readMoney("stundenlohnTariflich", DEFAULT_STUNDENLOHN);

  /* -------------------------
     Manuelle Sonderzahlungen
  ------------------------- */

  const urlaubsgeld = readMoney("urlaubsgeldBetrag");
  const weihnachtsgeld = readMoney("weihnachtsgeldBetrag");
  const bonus = readMoney("bonusBetrag");
  const extras = readMoney("extrasBetrag");

  /* -------------------------
     Kalenderbasierte Beträge
  ------------------------- */

  const urlaubPauschale = calendar.vacationDays * URLAUB_PAUSCHALE;
  const krankPauschale = calendar.sickDays * KRANK_PAUSCHALE;

  const schichtzulage = grund * SCHICHTZULAGE_PROZENT;

  const nacht35Betrag = calendar.night35Hours * stundenlohn * NACHT_35_PROZENT;

  const nacht50Betrag = calendar.night50Hours * stundenlohn * NACHT_50_PROZENT;

  const sonntagBetrag = calendar.sundayHours * stundenlohn * SONNTAG_PROZENT;

  const feiertagBetrag = calendar.holidayHours * stundenlohn * FEIERTAG_PROZENT;

  /* -------------------------
     Brutto
  ------------------------- */

  const gesamtBrutto =
    grund +
    urlaubPauschale +
    krankPauschale +
    schichtzulage +
    urlaubsgeld +
    weihnachtsgeld +
    bonus +
    extras +
    leasing +
    nacht35Betrag +
    nacht50Betrag +
    sonntagBetrag +
    feiertagBetrag;

  /* -------------------------
     Steuerfreie / SV-pflichtige Zuschläge

     Vereinfachte Logik:
     - Alle Zuschläge werden als steuerfrei angezeigt
     - SV-pflichtiger Anteil kann später genauer angepasst werden
  ------------------------- */

  const steuerfreieZuschlaege =
    nacht35Betrag + nacht50Betrag + sonntagBetrag + feiertagBetrag;

  const svPflichtigeZuschlaege = 0;

  /* -------------------------
     Gesetzliches Brutto
  ------------------------- */

  const bavEigenbeitrag = readMoney("bavEigenbeitrag");
  const geldwerterVorteilBike = readMoney("geldwerterVorteilBike");

  const gesetzlichesBrutto =
    gesamtBrutto +
    bavEigenbeitrag +
    geldwerterVorteilBike +
    svPflichtigeZuschlaege;

  /* -------------------------
     Gesetzliche Abzüge

     Lohnsteuer, RV und ALV werden berechnet.
  ------------------------- */

  const rentenversicherung = -(gesetzlichesBrutto * RV_PROZENT);
  const arbeitslosenversicherung = -(gesetzlichesBrutto * ALV_PROZENT);
  const steuerpflichtigesLaufend = Math.max(
    0,
    gesetzlichesBrutto - steuerfreieZuschlaege,
  );
  const automaticTax = calculateAutomaticTax({
    laufendesEntgelt: steuerpflichtigesLaufend,
    rv: rentenversicherung,
    alv: arbeitslosenversicherung,
    kv: readMoney("freiwKrankenversicherung"),
    pv: readMoney("freiwPflegeversicherung"),
    year,
  });
  const lohnsteuer = -automaticTax.monthlyTax;

  const gesetzlicheAbzuege =
    lohnsteuer + rentenversicherung + arbeitslosenversicherung;

  const gesetzlichesNetto = gesetzlichesBrutto + gesetzlicheAbzuege;

  /* -------------------------
     Sonstige Abzüge
  ------------------------- */

  const freiwKrankenversicherung = readMoney("freiwKrankenversicherung");
  const freiwPflegeversicherung = readMoney("freiwPflegeversicherung");
  const agaPflegeversicherung = readMoney("agaPflegeversicherung");
  const agaKrankenversicherung = readMoney("agaKrankenversicherung");
  const umwandlEigenbeitragBav = readMoney("umwandlEigenbeitragBav");

  const sonstigeAbzuege =
    freiwKrankenversicherung +
    freiwPflegeversicherung +
    agaPflegeversicherung +
    agaKrankenversicherung +
    umwandlEigenbeitragBav;

  const nettoNeu = gesetzlichesNetto + sonstigeAbzuege;

  const nettoAlt = loadAbrechnungNettoAlt();
  const ueberweisungsbetrag = nettoNeu + nettoAlt;

  /* =====================================================
     AUSGABE IN DIE TABELLE
  ===================================================== */

  /* -------------------------
     Kalenderwerte
  ------------------------- */

  writeNumber("urlaubPauschaleAnzahl", calendar.vacationDays);
  writeInput("urlaubPauschaleBetrag", urlaubPauschale);
  writeInput("urlaubPauschaleDiff", urlaubPauschale);

  writeNumber("krankPauschaleAnzahl", calendar.sickDays);
  writeInput("krankPauschaleBetrag", krankPauschale);
  writeInput("krankPauschaleDiff", krankPauschale);

  writeInput("schichtzulageBetrag", schichtzulage);
  writeInput("schichtzulageDiff", schichtzulage);

  writeNumber("nacht35Anzahl", calendar.night35Hours);
  writeInput("nacht35Betrag", nacht35Betrag);
  writeInput("nacht35Diff", nacht35Betrag);

  writeNumber("nacht50Anzahl", calendar.night50Hours);
  writeInput("nacht50Betrag", nacht50Betrag);
  writeInput("nacht50Diff", nacht50Betrag);

  writeNumber("sonntagAnzahl", calendar.sundayHours);
  writeInput("sonntagBetrag", sonntagBetrag);
  writeInput("sonntagDiff", sonntagBetrag);

  writeNumber("feiertagAnzahl", calendar.holidayHours);
  writeInput("feiertagBetrag", feiertagBetrag);
  writeInput("feiertagDiff", feiertagBetrag);

  /* -------------------------
     Manuelle Sonderzahlungen Diff
  ------------------------- */

  writeInput("urlaubsgeldDiff", urlaubsgeld);
  writeInput("weihnachtsgeldDiff", weihnachtsgeld);
  writeInput("bonusDiff", bonus);
  writeInput("extrasDiff", extras);

  /* -------------------------
     Brutto
  ------------------------- */

  writeText("gesamtBrutto", gesamtBrutto);
  writeText("gesamtBruttoDiff", gesamtBrutto - grund);

  /* -------------------------
     Sonstige Vergütungsbestandteile
  ------------------------- */

  writeInput("grundarbeitSteuerfrei", steuerfreieZuschlaege);
  writeInput("svPflichtigeZuschlaege", svPflichtigeZuschlaege);

  writeInput("bavEntgeltLfd", grund);
  writeInput("bavEntgeltLfdDiff", 0);

  writeInput("bavEigenbeitragDiff", 0);

  writeText("gesetzlichesBrutto", gesetzlichesBrutto);
  writeText("gesetzlichesBruttoDiff", gesetzlichesBrutto - grund);

  /* -------------------------
     Gesetzliche Abzüge
  ------------------------- */

  writeInput("lohnsteuer", lohnsteuer);
  writeInput("lohnsteuerDiff", lohnsteuer);

  writeInput("rentenversicherung", rentenversicherung);
  writeInput("rentenversicherungDiff", rentenversicherung);

  writeInput("arbeitslosenversicherung", arbeitslosenversicherung);
  writeInput("arbeitslosenversicherungDiff", arbeitslosenversicherung);

  writeText("gesetzlicheAbzuegeLaufend", gesetzlicheAbzuege);
  writeText("gesetzlicheAbzuegeLaufendDiff", gesetzlicheAbzuege);

  writeText("gesetzlicheAbzuege", gesetzlicheAbzuege);
  writeText("gesetzlicheAbzuegeDiff", gesetzlicheAbzuege);

  writeText("gesetzlichesNetto", gesetzlichesNetto);
  writeText("gesetzlichesNettoDiff", gesetzlichesNetto - grund);

  /* -------------------------
     Sonstige Abzüge und Netto
  ------------------------- */

  writeText("sonstigeAbzuege", sonstigeAbzuege);

  writeText("nettoNeu", nettoNeu);
  writeInput("nettoAlt", nettoAlt);
  writeText("nettoDifferenz", ueberweisungsbetrag);
}

/* =====================================================
   START
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("neuBerechnenBtn");

  if (btn) {
    btn.addEventListener("click", calculateNeuberechnung);
  }

  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", calculateNeuberechnung);
  });

  calculateNeuberechnung();
});
