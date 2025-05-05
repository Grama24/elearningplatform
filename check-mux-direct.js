require('dotenv').config();
const Mux = require('@mux/mux-node');

// Verificăm dacă avem configurația necesară
if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
  console.error("Lipsesc variabilele de mediu MUX_TOKEN_ID sau MUX_TOKEN_SECRET");
  process.exit(1);
}

// Inițializăm client-ul Mux
const { video } = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

// Funcție pentru a testa conexiunea la Mux
async function testMuxConnection() {
  try {
    console.log("Testez conexiunea la Mux...");

    // Încercăm să listăm assets-urile (doar pentru a verifica conectivitatea)
    const assets = await video.assets.list({ limit: 1 });
    console.log("✅ Conexiune reușită la Mux API!");
    console.log(`Număr total de assets: ${assets.total}`);
    
    return true;
  } catch (error) {
    console.error("❌ Eroare la conectarea la Mux:", error.message);
    if (error.status === 401) {
      console.error("Eroare de autentificare. Verifică dacă token-urile sunt corecte.");
    }
    return false;
  }
}

// Funcție pentru a testa crearea unui asset
async function testCreateAsset(videoUrl) {
  if (!videoUrl) {
    console.log("Nu s-a furnizat un URL pentru video. Vom folosi un exemplu.");
    videoUrl = "https://storage.googleapis.com/muxdemofiles/mux-video-intro.mp4";
  }
  
  try {
    console.log(`Testez crearea unui asset cu URL-ul: ${videoUrl}`);
    
    const asset = await video.assets.create({
      input: videoUrl,
      playback_policy: ['public'],
      test: true // folosim modul test pentru a nu consuma credite
    });
    
    console.log("✅ Asset creat cu succes!");
    console.log("Asset ID:", asset.id);
    console.log("Playback ID:", asset.playback_ids?.[0]?.id);
    return true;
  } catch (error) {
    console.error("❌ Eroare la crearea asset-ului:", error.message);
    console.error("Detalii eroare:", error);
    return false;
  }
}

// Rulăm testele
async function runTests() {
  const connectionOk = await testMuxConnection();
  
  if (connectionOk) {
    // Testeaza crearea unui asset de test
    await testCreateAsset();
    
    // Dacă ai un URL real, poți testa cu el
    // const videoUrl = "URL_VIDEO_UPLOADTHING";
    // await testCreateAsset(videoUrl);
  }
}

runTests().catch(err => {
  console.error("Eroare neașteptată:", err);
  process.exit(1);
}); 