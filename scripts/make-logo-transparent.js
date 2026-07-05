const fs = require('fs');
const { PNG } = require('pngjs');

const src = fs.readFileSync('public/images/logo.png');
const png = PNG.sync.read(src);

for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    const i = (png.width * y + x) * 4;
    const r = png.data[i], g = png.data[i+1], b = png.data[i+2];
    const brightness = (r + g + b) / 3;
    // 어두운 픽셀(검은 배경)을 투명하게
    if (brightness < 60) {
      png.data[i+3] = 0;
    } else if (brightness < 120) {
      // 반투명 처리 (경계 부드럽게)
      png.data[i+3] = Math.round((brightness - 60) / 60 * 255);
    }
  }
}

fs.writeFileSync('public/images/logo.png', PNG.sync.write(png));
console.log('Done: logo.png is now transparent background');
