// A simple script to perform a basic SEO audit on a given URL.
// Usage: node scripts/seo-audit.js <URL>
// Example: node scripts/seo-audit.js http://localhost:3000

const axios = require('axios');
const cheerio = require('cheerio'); // You might need to run: npm install axios cheerio

async function runAudit(url) {
  console.log(`🔍 Running SEO audit for: ${url}\n`);

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // 1. Check for Title tag
    const title = $('title').text();
    if (title) {
      console.log(`✅ Title: "${title}" (Length: ${title.length})`);
    } else {
      console.log('❌ Missing <title> tag.');
    }

    // 2. Check for Meta Description
    const description = $('meta[name="description"]').attr('content');
    if (description) {
      console.log(`✅ Meta Description: "${description}" (Length: ${description.length})`);
    } else {
      console.log('❌ Missing <meta name="description"> tag.');
    }

    // 3. Check for H1 tag
    const h1 = $('h1').first().text();
    if (h1) {
      console.log(`✅ H1 Tag: "${h1}"`);
    } else {
      console.log('❌ Missing <h1> tag.');
    }

    // 4. Check image alt tags
    const images = $('img');
    const imagesWithoutAlt = images.filter((i, el) => !$(el).attr('alt')).length;
    console.log(`ℹ️  Found ${images.length} images.`);
    if (imagesWithoutAlt > 0) {
      console.log(`❌ ${imagesWithoutAlt} images are missing "alt" attributes.`);
    } else {
      console.log('✅ All images have "alt" attributes.');
    }

  } catch (error) {
    console.error(`Error fetching URL: ${error.message}`);
  }
}

const url = process.argv[2];
if (!url) {
  console.error('Please provide a URL to audit.');
  console.log('Usage: node scripts/seo-audit.js <URL>');
  process.exit(1);
}

runAudit(url);
