const fs = require('fs');
const { PNG } = require('pngjs');

const src = fs.readFileSync('public/images/logo.png');
const png = PNG.sync.read(src);

// 코너 픽셀로 배경색 감지
const corners = [
  [0, 0], [png.width - 1, 0],
  [0, png.height - 1], [png.width - 1, png.height - 1]
];
let bgR = 0, bgG = 0, bgB = 0;
corners.forEach(([x, y]) => {
  const i = (png.width * y + x) * 4;
  bgR += png.data[i]; bgG += png.data[i+1]; bgB += png.data[i+2];
});
bgR = Math.round(bgR / 4); bgG = Math.round(bgG / 4); bgB = Math.round(bgB / 4);
console.log(`배경색 감지: RGB(${bgR}, ${bgG}, ${bgB})`);

const tolerance = 40;

for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    const i = (png.width * y + x) * 4;
    const r = png.data[i], g = png.data[i+1], b = png.data[i+2];
    const diff = Math.max(Math.abs(r - bgR), Math.abs(g - bgG), Math.abs(b - bgB));
    if (diff < tolerance) {
      png.data[i+3] = 0; // 배경 투명
    } else if (diff < tolerance + 20) {
      png.data[i+3] = Math.round((diff - tolerance) / 20 * 255); // 경계 부드럽게
    }
  }
}

fs.writeFileSync('public/images/logo.png', PNG.sync.write(png));
console.log('Done');
