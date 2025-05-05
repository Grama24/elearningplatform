const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Încărcăm variabilele din .env
dotenv.config();

console.log("Verificare configurație Mux:");

// Verificăm existența variabilelor necesare
if (!process.env.MUX_TOKEN_ID) {
  console.error("❌ MUX_TOKEN_ID lipsește din fișierul .env");
} else {
  console.log("✅ MUX_TOKEN_ID există");
}

if (!process.env.MUX_TOKEN_SECRET) {
  console.error("❌ MUX_TOKEN_SECRET lipsește din fișierul .env");
} else {
  console.log("✅ MUX_TOKEN_SECRET există");
}

// Verificăm formatul cheilor (fără a afișa cheile reale)
if (process.env.MUX_TOKEN_ID) {
  if (process.env.MUX_TOKEN_ID.startsWith('283c') || process.env.MUX_TOKEN_ID.length < 10) {
    console.warn("⚠️ MUX_TOKEN_ID pare să fie un token demo sau incomplet");
  }
}

if (process.env.MUX_TOKEN_SECRET) {
  if (process.env.MUX_TOKEN_SECRET.length < 20) {
    console.warn("⚠️ MUX_TOKEN_SECRET pare să fie prea scurt pentru un token valid");
  }
}

console.log("\nRecomandări:");
console.log("1. Verifică dacă token-urile Mux sunt corecte în dashboard-ul Mux");
console.log("2. Asigură-te că ai un plan activ pe Mux");
console.log("3. Verifică dacă URL-ul video-ului încărcat este valid și accesibil"); 