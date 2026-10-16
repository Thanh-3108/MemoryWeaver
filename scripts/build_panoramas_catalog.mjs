// scripts/build_panoramas_catalog.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('Fetching Poly Haven indoor assets index...');
  const res = await fetch('https://api.polyhaven.com/assets?t=hdris&c=indoor');
  if (!res.ok) {
    throw new Error(`Failed to fetch Poly Haven assets: ${res.status} ${res.statusText}`);
  }
  const assets = await res.json();
  const entries = Object.entries(assets);
  console.log(`Found ${entries.length} indoor HDRIs.`);

  // Define categorized buckets
  const buckets = {
    living_room: [],
    bedroom: [],
    dining_kitchen: [],
    office_study: [],
    hospitality_gallery: []
  };

  for (const [id, a] of entries) {
    const text = [
      id,
      a.name || '',
      a.category || '',
      (a.tags || []).join(' '),
      a.description || ''
    ].join(' ').toLowerCase();

    const item = {
      id,
      name: a.name || id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      category_raw: a.category || 'Indoor',
      tags: a.tags || [],
      description: a.description || 'High-dynamic-range indoor 360 panorama.',
      panorama_url: `https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/${id}.jpg`,
      thumbnail_url: a.thumbnail_url || `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=400&height=240&format=webp`,
      polyhaven_page: `https://polyhaven.com/a/${id}`
    };

    if (/living|lounge|parlor|sitting|sofa|fireplace|apartment|salon|couch/i.test(text)) {
      buckets.living_room.push(item);
    } else if (/bed|hotel|bedroom|dorm|sleeping|wardrobe|suite/i.test(text)) {
      buckets.bedroom.push(item);
    } else if (/dining|kitchen|restaurant|cafe|bar|canteen|bakery|cafeteria|pub|counter|cook/i.test(text)) {
      buckets.dining_kitchen.push(item);
    } else if (/office|study|desk|boardroom|meeting|conference|library|reading|classroom|school|university/i.test(text)) {
      buckets.office_study.push(item);
    } else if (/room|hall|studio|gallery|interior|house|flat|indoor|museum|church|palace|mansion|theater|cinema|shop|store|workshop/i.test(text)) {
      buckets.hospitality_gallery.push(item);
    }
  }

  console.log('Classified counts:');
  console.log(' - Living rooms & Lounges:', buckets.living_room.length);
  console.log(' - Bedrooms & Hotel Rooms:', buckets.bedroom.length);
  console.log(' - Dining & Kitchens:', buckets.dining_kitchen.length);
  console.log(' - Offices & Studies:', buckets.office_study.length);
  console.log(' - Hospitality & Galleries:', buckets.hospitality_gallery.length);

  // Fill up to exactly 100 items with balanced selection
  const curated = [];
  const targetCounts = {
    living_room: 25,
    bedroom: 20,
    dining_kitchen: 22,
    office_study: 18,
    hospitality_gallery: 15
  };

  for (const [key, target] of Object.entries(targetCounts)) {
    const list = buckets[key];
    const take = list.slice(0, target);
    take.forEach(item => {
      curated.push({
        ...item,
        archetype: key,
        archetype_vn: {
          living_room: 'Phòng khách & Lounge',
          bedroom: 'Phòng ngủ & Khách sạn',
          dining_kitchen: 'Phòng ăn & Nhà bếp',
          office_study: 'Phòng làm việc & Thư viện',
          hospitality_gallery: 'Sảnh tiệc & Không gian trưng bày'
        }[key]
      });
    });
  }

  // If slightly under 100, top up from hospitality_gallery
  if (curated.length < 100) {
    const remaining = buckets.hospitality_gallery.slice(targetCounts.hospitality_gallery, targetCounts.hospitality_gallery + (100 - curated.length));
    remaining.forEach(item => {
      curated.push({
        ...item,
        archetype: 'hospitality_gallery',
        archetype_vn: 'Sảnh tiệc & Không gian trưng bày'
      });
    });
  }

  const catalog = {
    title: 'MemoryWeaver 100 Indoor Panorama Dataset & Benchmark',
    total_rooms: curated.length,
    description: '100 curated, CC0 licensed, high-resolution equirectangular 360 indoor panoramas across 5 major room archetypes for 3D reconstruction and layout testing.',
    source: 'Poly Haven & Open Indoor Datasets',
    license: 'CC0 / Public Domain',
    categories: {
      living_room: curated.filter(c => c.archetype === 'living_room').length,
      bedroom: curated.filter(c => c.archetype === 'bedroom').length,
      dining_kitchen: curated.filter(c => c.archetype === 'dining_kitchen').length,
      office_study: curated.filter(c => c.archetype === 'office_study').length,
      hospitality_gallery: curated.filter(c => c.archetype === 'hospitality_gallery').length
    },
    rooms: curated
  };

  const outputPath = path.join(__dirname, 'indoor_panoramas_100.json');
  await fs.writeFile(outputPath, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`Saved ${curated.length} indoor panoramas to: ${outputPath}`);
}

main().catch(err => {
  console.error('Error building panorama catalog:', err);
  process.exit(1);
});
