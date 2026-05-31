const cloudinary = require('cloudinary').v2;
const ImageKit = require('imagekit');
const axios = require('axios');
const sharp = require('sharp');

// ===== 填入你的信息 =====
cloudinary.config({
  cloud_name: 'demfj39xl',
  api_key: '614619994392318',
  api_secret: 'gNr5SzuAfpSGHWmYKxHYcZPUOiU',
});

const imagekit = new ImageKit({
  publicKey: 'public_6gMR+2nYtbFpp0EBOulsqt4gy5k=',
  privateKey: 'private_KKR0VHURT3IcqWUkGH/Ml7vOmXs=',
  urlEndpoint: 'https://ik.imagekit.io/ruihouse',
});
// =======================

async function getAllImages() {
  let resources = [];
  let nextCursor = null;
  do {
    const result = await cloudinary.api.resources({
      type: 'upload',
      max_results: 500,
      next_cursor: nextCursor,
    });
    resources = resources.concat(result.resources);
    nextCursor = result.next_cursor;
    console.log(`已获取 ${resources.length} 张...`);
  } while (nextCursor);
  return resources;
}

async function migrateImage(resource, index, total) {
  try {
    const response = await axios.get(resource.secure_url, {
      responseType: 'arraybuffer',
    });

    // 压缩图片到最大 800px 宽，质量 80%
    const compressed = await sharp(Buffer.from(response.data))
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const fileName = resource.public_id.replace(/\//g, '_') + '.jpg';

    await imagekit.upload({
      file: compressed,
      fileName: fileName,
    });

    const originalKB = Math.round(response.data.byteLength / 1024);
    const compressedKB = Math.round(compressed.byteLength / 1024);
    console.log(`✅ ${index}/${total} ${fileName} | ${originalKB}KB → ${compressedKB}KB`);
  } catch (err) {
    console.log(`❌ ${index}/${total} 失败: ${resource.public_id} - ${err.message}`);
  }
}

async function main() {
  console.log('获取 Cloudinary 图片列表...');
  const images = await getAllImages();
  console.log(`共 ${images.length} 张，开始压缩迁移...\n`);

  for (let i = 0; i < images.length; i++) {
    await migrateImage(images[i], i + 1, images.length);
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n🎉 全部迁移完成！');
}

main().catch(console.error);