const ImageKit = require('imagekit');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imagekit = new ImageKit({
  publicKey: 'public_6gMR+2nYtbFpp0EBOulsqt4gy5k=',
  privateKey: 'private_KKR0VHURT3IcqWUkGH/Ml7vOmXs=',
  urlEndpoint: 'https://ik.imagekit.io/ruihouse',
});

const folder = '/Users/nimo/Desktop/卡牌';
const files = fs.readdirSync(folder).filter(f => f.match(/\.(png|PNG|jpg|jpeg)$/i));

(async () => {
  for (const file of files) {
    const filePath = path.join(folder, file);
    const compressed = await sharp(filePath)
      .resize({ width: 600, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    const name = path.basename(file, path.extname(file)) + '.jpg';
    const result = await imagekit.upload({
      file: compressed,
      fileName: name,
      folder: '/cards',
    });
    const kb = Math.round(compressed.byteLength / 1024);
    console.log('✅', name, kb + 'KB', '->', result.url);
  }
  console.log('全部完成！');
})();
