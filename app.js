const TROY_OZ_TO_G = 31.1034768;

// IMPORTANT: Replace these URLs with the actual endpoints you pick.
// Tip: choose a provider that supports browser CORS (gold-api.com says it does).
const PRICE_ENDPOINTS = {
  gold:  "https://api.gold-api.com/price/XAU",
  silver:"https://api.gold-api.com/price/XAG"
};

let coins = [];
const QTY_STORAGE_KEY = "price-tracker-qty-v1";

function loadQtyMap() {
  try {
    return JSON.parse(localStorage.getItem(QTY_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveQtyMap(map) {
  localStorage.setItem(QTY_STORAGE_KEY, JSON.stringify(map));
}

// stable key per item (name+metal is good enough for your use)
function coinKey(c) {
  return `${c.metal}::${c.name}`;
}

let spot = {
  gold:   { perOzt: null, perGram: null },
  silver: { perOzt: null, perGram: null }
};

function money(n, currency = "USD") {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

function num(n, decimals = 3) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(decimals);
}

// Provider responses differ. Adjust parsing here based on the API you choose.
async function fetchSpot(url) {
  console.log("Fetching spot:", url);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Spot fetch failed (${url}): ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (typeof data.price !== "number") {
    throw new Error(`Unexpected spot response (${url}): ${JSON.stringify(data).slice(0,200)}`);
  }
  return data.price;
}


async function loadCoins() {
  const res = await fetch("./coins.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`coins.json load failed: ${res.status}`);
  coins = await res.json();

  const qtyMap = loadQtyMap();
  coins = coins.map(c => ({
    ...c,
    qty: Number.isFinite(qtyMap[coinKey(c)]) ? qtyMap[coinKey(c)] : 1
  }));
}

function render() {
  const currency = document.querySelector("#currency").value;

  const silverBody = document.querySelector("#silverBody");
  const goldBody = document.querySelector("#goldBody");
  silverBody.innerHTML = "";
  goldBody.innerHTML = "";

  const makeRow = (c) => {
  const perGram = spot[c.metal]?.perGram;

  const qty = Number.isFinite(c.qty) ? c.qty : 1;
  const melt = (typeof perGram === "number")
    ? (c.fine_grams * qty * perGram)
    : null;

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${c.name}</td>
    <td class="text-end">${num(c.fine_grams, 3)}</td>
    <td class="text-end" style="width:110px;">
      <input
        type="number"
        min="0"
        step="1"
        class="form-control form-control-sm text-end"
        value="${qty}"
        data-key="${coinKey(c)}"
      />
    </td>
    <td class="text-end">${money(melt, currency)}</td>
  `;

  // hook change event
  const input = tr.querySelector("input");
  input.addEventListener("input", (e) => {
    const newQty = Math.max(0, parseInt(e.target.value || "0", 10));

    // update coin in memory
    c.qty = newQty;

    // persist
    const qtyMap = loadQtyMap();
    qtyMap[coinKey(c)] = newQty;
    saveQtyMap(qtyMap);

    // re-render to update melt values
    render();
  });

  return tr;
};


  coins
    .filter(c => c.metal === "silver")
    .forEach(c => silverBody.appendChild(makeRow(c)));

  coins
    .filter(c => c.metal === "gold")
    .forEach(c => goldBody.appendChild(makeRow(c)));

  document.querySelector("#goldSpot").textContent   = money(spot.gold.perOzt, currency);
  document.querySelector("#goldGram").textContent   = money(spot.gold.perGram, currency);
  document.querySelector("#silverSpot").textContent = money(spot.silver.perOzt, currency);
  document.querySelector("#silverGram").textContent = money(spot.silver.perGram, currency);
}

async function refreshPrices() {
  const goldOzt = await fetchSpot(PRICE_ENDPOINTS.gold);
  const silvOzt = await fetchSpot(PRICE_ENDPOINTS.silver);

  spot.gold.perOzt   = goldOzt;
  spot.gold.perGram  = goldOzt / TROY_OZ_TO_G;

  spot.silver.perOzt  = silvOzt;
  spot.silver.perGram = silvOzt / TROY_OZ_TO_G;

  document.querySelector("#lastUpdated").textContent = new Date().toLocaleString();
  render();
}

async function main() {
  await loadCoins();

  document.querySelector("#refreshBtn").addEventListener("click", () => {
    refreshPrices().catch(err => alert(err.message));
  });

    document.querySelector("#currency").addEventListener("change", render);

  // Initial load
  await refreshPrices();
}

main().catch(err => {
  console.error("MAIN ERROR:", err);
  alert(`MAIN ERROR: ${err.message}`);
});
