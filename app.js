const TROY_OZ_TO_G = 31.1034768;

// IMPORTANT: Replace these URLs with the actual endpoints you pick.
// Tip: choose a provider that supports browser CORS (gold-api.com says it does).
const PRICE_ENDPOINTS = {
  gold:  "https://api.gold-api.com/price/XAU",
  silver:"https://api.gold-api.com/price/XAG"
};

let coins = [];
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
}

function render() {
  const currency = document.querySelector("#currency").value;
  const filter = document.querySelector("#filterMetal").value;
  const body = document.querySelector("#coinsBody");
  body.innerHTML = "";

  const rows = coins
    .filter(c => filter === "all" ? true : c.metal === filter)
    .map(c => {
      const perGram = spot[c.metal]?.perGram;
      const melt = (typeof perGram === "number") ? (c.fine_grams * perGram) : null;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.name}</td>
        <td>${c.metal}</td>
        <td class="num">${num(c.fine_grams, 3)}</td>
        <td class="num">${money(melt, currency)}</td>
      `;
      return tr;
    });

  rows.forEach(r => body.appendChild(r));

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

  document.querySelector("#filterMetal").addEventListener("change", render);

  // Initial load
  await refreshPrices();
}

main().catch(err => {
  console.error("MAIN ERROR:", err);
  alert(`MAIN ERROR: ${err.message}`);
});
