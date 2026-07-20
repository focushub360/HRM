const fs = require('fs');
const https = require('https');
const path = require('path');

const modelsDir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const files = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model.weights',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.weights',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.weights'
];

const downloadFile = (file) => {
  return new Promise((resolve, reject) => {
    const dest = path.join(modelsDir, file);
    if (fs.existsSync(dest)) {
      console.log(`Already exists: ${file}`);
      return resolve();
    }
    console.log(`Downloading ${file}...`);
    const fileStream = fs.createWriteStream(dest);
    https.get(baseUrl + file, (response) => {
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded ${file}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

async function downloadAll() {
  for (const file of files) {
    try {
      await downloadFile(file);
    } catch (e) {
      console.error(`Failed to download ${file}`, e);
    }
  }
  console.log('All models downloaded!');
}

downloadAll();
