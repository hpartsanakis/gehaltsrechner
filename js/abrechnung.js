/* =====================================================
   ABRECHNUNG.JS
   Laufende Vergütungsabrechnung
   passend zu deiner aktuellen abrechnung.html
===================================================== */

/* =========================
   SPEICHER
========================= */

const ABRECHNUNG_STORAGE_KEY = "lohnapp:abrechnung";
const ABRECHNUNG_LAST_SAVE_KEY = "lohnapp:abrechnung:lastSaved";
const ABRECHNUNG_RESULTS_KEY = "lohnapp:abrechnung:results";
const ABRECHNUNG_RESULTS_BY_MONTH_KEY = "lohnapp:abrechnung:resultsByMonth";

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

const MONTH_LABELS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

/* =========================
   ZAHLEN LESEN / SCHREIBEN
========================= */

// Liest deutsche Beträge.
// Beispiele:
// 5718,18  -> 5718.18
// 68,61-   -> -68.61
function readMoney(id) {
  const el = document.getElementById(id);
  if (!el) return 0;

  let value = String(el.value || el.textContent || "0").trim();

  const isNegative = value.endsWith("-");

  value = value.replace("-", "");
  value = value.replace(/\./g, "");
  value = value.replace(",", ".");

  const number = parseFloat(value) || 0;

  return isNegative ? -number : number;
}

// Formatiert Beträge wieder wie auf der Abrechnung.
// Beispiel:
// -68.61 -> 68,61-
function formatMoney(value) {
  const isNegative = value < 0;

  const formatted = Math.abs(value).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return isNegative ? `${formatted}-` : formatted;
}

// Schreibt Wert in <td>
function writeText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = formatMoney(value);
}

// Schreibt Wert in <input>
function writeInput(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  el.value = formatMoney(value);
}

// Liest Prozentwerte wie 9,30 oder 1,30
function readPercent(id) {
  const el = document.getElementById(id);
  if (!el) return 0;

  return Number(String(el.value).replace(",", ".")) || 0;
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

function getPersistableInputs() {
  return Array.from(document.querySelectorAll("input:not([readonly])"));
}

function updateAbrechnungSaveStatus(prefix = "Abrechnung gespeichert") {
  const status = document.getElementById("abrechnungSaveStatus");
  if (!status) return;

  const lastSaved = localStorage.getItem(ABRECHNUNG_LAST_SAVE_KEY);
  if (!lastSaved) {
    status.textContent = "Abrechnung noch nicht gespeichert";
    return;
  }

  const savedAt = new Date(lastSaved);
  status.textContent = `${prefix}: ${savedAt.toLocaleString("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  })}`;
}

function loadSavedAbrechnung() {
  try {
    const saved = JSON.parse(localStorage.getItem(ABRECHNUNG_STORAGE_KEY)) || {};
    getPersistableInputs().forEach((input) => {
      if (Object.prototype.hasOwnProperty.call(saved, input.id)) {
        input.value = saved[input.id];
      }
    });
  } catch (error) {
    console.error("Abrechnung konnte nicht geladen werden.", error);
  }
}

function saveAbrechnung() {
  const values = {};
  getPersistableInputs().forEach((input) => {
    if (input.id) values[input.id] = input.value;
  });
  localStorage.setItem(ABRECHNUNG_STORAGE_KEY, JSON.stringify(values));
  localStorage.setItem(ABRECHNUNG_LAST_SAVE_KEY, new Date().toISOString());
  updateAbrechnungSaveStatus();
}

function readPayrollPeriod() {
  const title =
    document.getElementById("abrechnungTitel")?.value ||
    document.getElementById("abrechnungTitel2")?.value ||
    "";
  const parts = title.trim().toLowerCase().split(/\s+/);
  const month = MONTHS[parts[0]] ?? new Date().getMonth();
  const year = Number(parts.find((part) => /^\d{4}$/.test(part))) || new Date().getFullYear();

  return {
    month,
    year,
    key: `${year}-${String(month + 1).padStart(2, "0")}`,
    label: `${MONTH_LABELS[month]} ${year}`,
  };
}

function saveAbrechnungResults({ netto }) {
  const period = readPayrollPeriod();
  const savedAt = new Date().toISOString();
  const result = {
    netto,
    month: period.month,
    year: period.year,
    monthKey: period.key,
    label: period.label,
    savedAt,
  };

  localStorage.setItem(
    ABRECHNUNG_RESULTS_KEY,
    JSON.stringify(result),
  );

  try {
    const byMonth =
      JSON.parse(localStorage.getItem(ABRECHNUNG_RESULTS_BY_MONTH_KEY)) || {};
    byMonth[period.key] = result;
    localStorage.setItem(ABRECHNUNG_RESULTS_BY_MONTH_KEY, JSON.stringify(byMonth));
  } catch (error) {
    console.error("Abrechnungsergebnis konnte nicht pro Monat gespeichert werden.", error);
  }
}

function readPayrollYear() {
  return readPayrollPeriod().year;
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

function calculateIncomeTax(zve, year, taxClass) {
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
}) {
  const year = readPayrollYear();
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
  const monthlyTax = annualTax / 12;

  let taxOnBonus = 0;
  if (sonstigesEntgelt > 0) {
    const taxableWithoutBonus = Math.max(
      0,
      annualTaxableIncome - sonstigesEntgelt,
    );
    taxOnBonus =
      annualTax -
      calculateIncomeTax(taxableWithoutBonus, year, taxClass);
  }

  return {
    annualTaxableIncome,
    annualTax,
    monthlyTax,
    taxOnBonus,
  };
}

/* =========================
   HAUPTBERECHNUNG
========================= */

function calculateAbrechnung() {
  /* -------------------------
     1. Vergütungsbestandteile
  ------------------------- */

  const grund = readMoney("grundBetrag");

  // Sonderzahlungen manuell
  const urlaubsgeld = readMoney("urlaubsgeldBetrag");
  const weihnachtsgeld = readMoney("weihnachtsgeldBetrag");
  const bonus = readMoney("bonusBetrag");
  const extras = readMoney("extrasBetrag");

  // Fahrrad-Leasing ist negativ, wenn Minus am Ende steht
  const leasingrateFahrrad = readMoney("leasingrateFahrrad");

  /* -------------------------
     2. Gesamtbrutto

     Gesamtbrutto =
     Grundvergütung
     + Urlaubsgeld
     + Weihnachtsgeld
     + Bonus
     + Extras
     + Leasingrate Fahrrad
  ------------------------- */

  const gesamtBrutto =
    grund +
    urlaubsgeld +
    weihnachtsgeld +
    bonus +
    extras +
    leasingrateFahrrad;

  writeText("gesamtBrutto", gesamtBrutto);

  /* -------------------------
     3. BAV-Werte

     BAV Entgelt sonst. =
     Urlaubsgeld + Weihnachtsgeld + Bonus + Extras

     BAV Entgelt lfd. =
     Grundvergütung
  ------------------------- */

  const bavSonst = urlaubsgeld + weihnachtsgeld + bonus + extras;
  const bavLfd = grund;

  writeInput("bavSonst", bavSonst);
  writeInput("bavLfd", bavLfd);

  // Wandlungen
  const wandlBavSonst = readMoney("wandlBavSonst");
  const wandlBavLfd = readMoney("bavEigenbeitrag");

  // Geldwerter Vorteil
  const geldwerterVorteilBike = readMoney("geldwerterVorteilBike");

  /* -------------------------
     4. Gesetzliches Brutto

     Gesetzliches Brutto =
     Gesamtbrutto
     + geldwerter Vorteil Bike
     + Wandl. bAV sonst.
     + Wandl. bAV lfd.
  ------------------------- */

  const gesetzlichesBrutto =
    gesamtBrutto + geldwerterVorteilBike + wandlBavSonst + wandlBavLfd;

  writeText("gesetzlichesBrutto", gesetzlichesBrutto);

  /* -------------------------
     5. Bemessungsentgelte Seite 2
  ------------------------- */

  const steuerpflEntgeltLfd = grund + geldwerterVorteilBike + wandlBavLfd;
  const steuerpflEntgeltSonst = bavSonst + wandlBavSonst;

  writeInput("steuerpflEntgeltLfd", steuerpflEntgeltLfd);
  writeInput("steuerpflEntgeltSonst", steuerpflEntgeltSonst);

  writeInput("rvEntgeltLaufend", steuerpflEntgeltLfd);
  writeInput("rvEntgeltEinmal", steuerpflEntgeltSonst);

  writeInput("alvEntgeltLaufend", steuerpflEntgeltLfd);
  writeInput("alvEntgeltEinmal", steuerpflEntgeltSonst);

  /* -------------------------
     6. Gesetzliche Abzüge

     Lohnsteuer, RV, ALV und Pflege werden berechnet.
  ------------------------- */

  const rvLfdProzent = readPercent("rvAnaProzent") || 9.3;
  const rvEinmalProzent = readPercent("rvEinmalProzent") || 9.3;

  const alvLfdProzent = readPercent("alvAnaProzent") || 1.3;
  const alvEinmalProzent = readPercent("alvEinmalProzent") || 1.3;

  const pvProzent = readPercent("pvAnaProzent") || 0;

  // Laufende Beiträge aus Grundvergütung
  const rentenversicherungLfd = -(grund * rvLfdProzent) / 100;
  const arbeitslosenversicherungLfd = -(grund * alvLfdProzent) / 100;
  const pflegeversicherungLfd = -(grund * pvProzent) / 100;

  // Einmalige Beiträge aus BAV Entgelt sonst.
  const rentenversicherungEinmalig = -(bavSonst * rvEinmalProzent) / 100;
  const arbeitslosenversicherungEinmalig = -(bavSonst * alvEinmalProzent) / 100;
  const pflegeversicherungEinmalig = -(bavSonst * pvProzent) / 100;

  const automaticTax = calculateAutomaticTax({
    laufendesEntgelt: steuerpflEntgeltLfd,
    sonstigesEntgelt: Math.max(0, steuerpflEntgeltSonst),
    rv: rentenversicherungLfd,
    alv: arbeitslosenversicherungLfd,
    kv: readMoney("freiwKrankenversicherung"),
    pv: readMoney("freiwPflegeversicherung") + pflegeversicherungLfd,
  });

  const lohnsteuerLaufend = -automaticTax.monthlyTax;
  const lohnsteuerSonstBezug = -automaticTax.taxOnBonus;

  writeInput("lohnsteuerLaufend", lohnsteuerLaufend);
  writeInput("lohnsteuerSonstBezug", lohnsteuerSonstBezug);
  writeInput("steuerpflichtigesEinkommen", automaticTax.annualTaxableIncome);
  writeInput("jahresLohnsteuer", automaticTax.annualTax);

  writeInput("rentenversicherungLfd", rentenversicherungLfd);
  writeInput("rentenversicherungEinmalig", rentenversicherungEinmalig);

  writeInput("arbeitslosenversicherungLfd", arbeitslosenversicherungLfd);
  writeInput(
    "arbeitslosenversicherungEinmalig",
    arbeitslosenversicherungEinmalig,
  );

  writeInput("pflegeversicherungEinmalig", pflegeversicherungEinmalig);

  /* -------------------------
     7. SV-Tabelle Seite 2
  ------------------------- */

  writeInput("rvEinkommen", grund);
  writeInput("rvAnaEuro", Math.abs(rentenversicherungLfd));
  writeInput("rvAgaEuro", Math.abs(rentenversicherungLfd));

  writeInput("rvEinmalEinkommen", bavSonst);
  writeInput("rvEinmalAnaEuro", Math.abs(rentenversicherungEinmalig));
  writeInput("rvEinmalAgaEuro", Math.abs(rentenversicherungEinmalig));

  writeInput("alvEinkommen", grund);
  writeInput("alvAnaEuro", Math.abs(arbeitslosenversicherungLfd));
  writeInput("alvAgaEuro", Math.abs(arbeitslosenversicherungLfd));

  writeInput("alvEinmalEinkommen", bavSonst);
  writeInput("alvEinmalAnaEuro", Math.abs(arbeitslosenversicherungEinmalig));
  writeInput("alvEinmalAgaEuro", Math.abs(arbeitslosenversicherungEinmalig));

  writeInput("pvEinkommen", grund);
  writeInput("pvAnaEuro", Math.abs(pflegeversicherungLfd));
  writeInput("pvAgaEuro", Math.abs(pflegeversicherungLfd));

  /* -------------------------
     8. Summe gesetzliche Abzüge
  ------------------------- */

  const gesetzlicheAbzuege =
    lohnsteuerLaufend +
    lohnsteuerSonstBezug +
    rentenversicherungLfd +
    rentenversicherungEinmalig +
    arbeitslosenversicherungLfd +
    arbeitslosenversicherungEinmalig +
    pflegeversicherungLfd +
    pflegeversicherungEinmalig;

  writeText("gesetzlicheAbzuege", gesetzlicheAbzuege);

  const gesetzlichesNetto = gesetzlichesBrutto + gesetzlicheAbzuege;

  writeText("gesetzlichesNetto", gesetzlichesNetto);

  /* -------------------------
     9. Sonstige Bezüge / Abzüge

     Umwandl. Eigenbeitrag bAV =
     Wandl. bAV sonst. Entgelt
     + Wandl. bAV lfd. Entgelt
  ------------------------- */

  const freiwKV = readMoney("freiwKrankenversicherung");
  const freiwPV = readMoney("freiwPflegeversicherung");
  const agaPV = readMoney("agaPflegeversicherung");
  const agaKV = readMoney("agaKrankenversicherung");

  const umwandlEigenbeitragBav = wandlBavSonst + wandlBavLfd;

  writeInput("umwandlEigenbeitragBav", umwandlEigenbeitragBav);

  const sonstigeAbzuege =
    freiwKV + freiwPV + agaPV + agaKV + umwandlEigenbeitragBav;

  writeText("sonstigeAbzuege", sonstigeAbzuege);

  /* -------------------------
     10. Netto
  ------------------------- */

  const netto = gesetzlichesNetto + sonstigeAbzuege;

  writeText("netto", netto);
  saveAbrechnungResults({ netto });

  /* -------------------------
     11. Laufende Abrechnung hat keine steuerfreien Zulagen
  ------------------------- */

  writeInput("steuerfreieZulagen", 0);
}

/* =========================
   START
========================= */

document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("abrechnungBerechnenBtn");

  loadSavedAbrechnung();

  if (button) {
    button.addEventListener("click", () => {
      calculateAbrechnung();
      saveAbrechnung();
    });
  }

  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      calculateAbrechnung();
      saveAbrechnung();
    });
  });

  calculateAbrechnung();
  updateAbrechnungSaveStatus();
});
