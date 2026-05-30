import fs from 'fs';
import path from 'path';
import https from 'https';

const API_KEY = process.argv[2];
if (!API_KEY) { console.error('Usage: node generate-images.mjs YOUR_GEMINI_API_KEY'); process.exit(1); }

const OUT_DIR = path.resolve('public/assets/photos');
fs.mkdirSync(OUT_DIR, { recursive: true });

const IMAGES = [
  {
    file: 'hero-pharmacist.jpg',
    prompt: 'A Tanzanian female pharmaceutical technologist standing behind a pharmacy dispensing counter in a clean well-lit retail pharmacy in Arusha Tanzania. She is wearing a white lab coat and smiling with quiet confidence not a wide commercial smile. Behind her are organized medicine shelves with labeled boxes. Natural daylight from a window. Shallow depth of field. Shot from slightly below eye level. Photorealistic no text no logos. Warm but professional tone. Authentic East African features and skin tones. Natural poses not commercial stock photo poses.',
  },
  {
    file: 'dispensing-safety.jpg',
    prompt: 'A Tanzanian male pharmaceutical technician at a pharmacy dispensing counter looking at a tablet screen with a calm focused expression. He is wearing a white lab coat. A customer hand is visible across the counter receiving a medicine box. The pharmacy behind him has organized shelves. Clean fluorescent lighting. Close crop mid-shot. Photorealistic no text no logos no UI elements. Professional healthcare setting in Tanzania. Authentic East African features and skin tones.',
  },
  {
    file: 'addo-rural.jpg',
    prompt: 'A young Tanzanian woman in a small but organized rural drug dispensing outlet ADDO in Tanzania. She is behind a wooden counter with medicine boxes organized on shelves behind her. She is looking at a phone or small tablet. The shop has natural light from an open door. Simple but clean interior. Warm natural lighting. Photorealistic no text no logos. Authentic rural Tanzanian setting not a modern supermarket pharmacy. Authentic East African features and skin tones.',
  },
  {
    file: 'owner-dashboard.jpg',
    prompt: 'A Tanzanian male pharmacy owner in his 40s sitting at a small office desk looking at a laptop screen with a satisfied expression. He is dressed in smart casual clothing collared shirt. Behind him through a glass window or open door you can see a pharmacy dispensing area with staff working. He appears to be reviewing business performance. Natural office lighting. Photorealistic no text no logos. Authentic Tanzanian business setting. Authentic East African features and skin tones.',
  },
  {
    file: 'inventory-stock.jpg',
    prompt: 'A Tanzanian female pharmacy worker in a white lab coat checking medicine stock on organized shelves in a pharmacy stockroom. She is holding a clipboard or tablet and looking at labeled medicine boxes stacked neatly on metal shelves. The room is well lit and organized. Mid-shot. Photorealistic no text no logos. Professional pharmacy inventory setting in Tanzania. Authentic East African features and skin tones.',
  },
  {
    file: 'wholesale-warehouse.jpg',
    prompt: 'A Tanzanian male wholesale pharmacy worker in his 30s in a large organized pharmaceutical warehouse in Tanzania. He is standing among tall shelves stacked with medicine cartons and boxes holding a tablet. He looks focused and professional. Warehouse fluorescent lighting. Wide mid-shot showing the scale of the stock behind him. Photorealistic no text no logos. Authentic East African pharmaceutical distribution setting.',
  },
  {
    file: 'team-staff.jpg',
    prompt: 'Two Tanzanian pharmacy staff members one male one female both in white lab coats working together at a pharmacy dispensing counter in Tanzania. One is at a computer or tablet the other is organizing medicine boxes. They are communicating with each other in a professional but relaxed way. Clean modern pharmacy interior with organized shelves behind them. Natural and fluorescent lighting mix. Photorealistic no text no logos. Authentic East African features and skin tones.',
  },
  {
    file: 'owner-trust.jpg',
    prompt: 'A Tanzanian pharmacy owner female in her late 30s standing at the entrance of her pharmacy in Arusha Tanzania. She is in smart professional clothing not a lab coat. She is smiling naturally arms relaxed confident posture. The pharmacy signage and interior are visible behind her. Daytime natural light. Street-level shot. Photorealistic no text no logos. Authentic Tanzanian small business setting not a mall or chain pharmacy. Authentic East African features and skin tones.',
  },
];

async function generateImage(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: '4:3' },
    });
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Parse error: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  for (const img of IMAGES) {
    const outPath = path.join(OUT_DIR, img.file);
    if (fs.existsSync(outPath)) { console.log(`⏭  ${img.file} already exists, skipping`); continue; }
    process.stdout.write(`⏳ Generating ${img.file} ... `);
    try {
      const result = await generateImage(img.prompt, API_KEY);
      if (result.error) { console.log(`❌ API error: ${result.error.message}`); continue; }
      const b64 = result.predictions?.[0]?.bytesBase64Encoded;
      if (!b64) { console.log('❌ No image in response'); console.error(JSON.stringify(result).slice(0,300)); continue; }
      fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
      console.log(`✅ saved`);
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
  }
  console.log('\nDone. Images saved to public/assets/photos/');
})();
