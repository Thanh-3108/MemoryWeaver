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
    hospitality_gallery: [],
    studio_workshop: []
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
    } else if (/dining|kitchen|restaurant|cafe|bar|canteen|bakery|cafeteria|pub|counter|cook|bistro|table/i.test(text)) {
      buckets.dining_kitchen.push(item);
    } else if (/office|study|desk|boardroom|meeting|conference|library|reading|classroom|school|university|computer/i.test(text)) {
      buckets.office_study.push(item);
    } else if (/hall|gallery|museum|church|palace|mansion|theater|cinema|ballroom|cathedral|chapel/i.test(text)) {
      buckets.hospitality_gallery.push(item);
    } else {
      buckets.studio_workshop.push(item);
    }
  }

  console.log('Classified counts:');
  console.log(' - Living rooms & Lounges:', buckets.living_room.length);
  console.log(' - Bedrooms & Hotel Rooms:', buckets.bedroom.length);
  console.log(' - Dining & Kitchens:', buckets.dining_kitchen.length);
  console.log(' - Offices & Studies:', buckets.office_study.length);
  console.log(' - Hospitality & Galleries:', buckets.hospitality_gallery.length);
  console.log(' - Studios & Workshops:', buckets.studio_workshop.length);

  // Curate 200 rooms across 6 archetypes
  const targetCounts200 = {
    living_room: Math.min(buckets.living_room.length, 42),
    bedroom: Math.min(buckets.bedroom.length, 10),
    dining_kitchen: Math.min(buckets.dining_kitchen.length, 42),
    office_study: Math.min(buckets.office_study.length, 10),
    hospitality_gallery: Math.min(buckets.hospitality_gallery.length, 46),
    studio_workshop: Math.min(buckets.studio_workshop.length, 50)
  };

  const archetypeVN = {
    living_room: 'Phòng khách & Sinh hoạt chung',
    bedroom: 'Phòng ngủ & Khách sạn',
    dining_kitchen: 'Phòng ăn, Bếp & Quán Cafe',
    office_study: 'Phòng làm việc & Thư viện',
    hospitality_gallery: 'Sảnh tiệc, Bảo tàng & Hội trường',
    studio_workshop: 'Studio, Gác xép & Không gian sáng tạo'
  };

  const curated200 = [];
  for (const [key, target] of Object.entries(targetCounts200)) {
    const list = buckets[key] || [];
    const take = list.slice(0, target);
    take.forEach(item => {
      curated200.push({
        ...item,
        archetype: key,
        archetype_vn: archetypeVN[key] || key
      });
    });
  }

  // If slightly under 200, fill from studio_workshop
  if (curated200.length < 200 && buckets.studio_workshop.length > targetCounts200.studio_workshop) {
    const extraNeeded = 200 - curated200.length;
    const extra = buckets.studio_workshop.slice(targetCounts200.studio_workshop, targetCounts200.studio_workshop + extraNeeded);
    extra.forEach(item => {
      curated200.push({
        ...item,
        archetype: 'studio_workshop',
        archetype_vn: archetypeVN.studio_workshop
      });
    });
  }

  const catalog200 = {
    title: 'MemoryWeaver 200 Indoor Panorama Dataset & Benchmark',
    total_rooms: curated200.length,
    description: '200 curated, CC0 licensed, high-resolution equirectangular 360 indoor panoramas across 6 room archetypes for 3D spatial layout reconstruction and multi-stage texture synthesis.',
    source: 'Poly Haven & Open Indoor Datasets',
    license: 'CC0 / Public Domain',
    categories: {
      living_room: curated200.filter(c => c.archetype === 'living_room').length,
      bedroom: curated200.filter(c => c.archetype === 'bedroom').length,
      dining_kitchen: curated200.filter(c => c.archetype === 'dining_kitchen').length,
      office_study: curated200.filter(c => c.archetype === 'office_study').length,
      hospitality_gallery: curated200.filter(c => c.archetype === 'hospitality_gallery').length,
      studio_workshop: curated200.filter(c => c.archetype === 'studio_workshop').length
    },
    rooms: curated200
  };

  const outputPath200 = path.join(__dirname, 'indoor_panoramas_200.json');
  await fs.writeFile(outputPath200, JSON.stringify(catalog200, null, 2), 'utf8');
  console.log(`Saved ${curated200.length} indoor panoramas to: ${outputPath200}`);

  // Also preserve 100 rooms catalog
  const curated100 = curated200.slice(0, 100);
  const catalog100 = {
    title: 'MemoryWeaver 100 Indoor Panorama Dataset & Benchmark',
    total_rooms: curated100.length,
    description: '100 curated, CC0 licensed, high-resolution equirectangular 360 indoor panoramas for 3D reconstruction and layout testing.',
    source: 'Poly Haven & Open Indoor Datasets',
    license: 'CC0 / Public Domain',
    categories: {
      living_room: curated100.filter(c => c.archetype === 'living_room').length,
      bedroom: curated100.filter(c => c.archetype === 'bedroom').length,
      dining_kitchen: curated100.filter(c => c.archetype === 'dining_kitchen').length,
      office_study: curated100.filter(c => c.archetype === 'office_study').length,
      hospitality_gallery: curated100.filter(c => c.archetype === 'hospitality_gallery').length,
      studio_workshop: curated100.filter(c => c.archetype === 'studio_workshop').length
    },
    rooms: curated100
  };
  const outputPath100 = path.join(__dirname, 'indoor_panoramas_100.json');
  await fs.writeFile(outputPath100, JSON.stringify(catalog100, null, 2), 'utf8');
  console.log(`Saved ${curated100.length} indoor panoramas to: ${outputPath100}`);
}

main().catch(err => {
  console.error('Error building panorama catalog:', err);
  process.exit(1);
});
