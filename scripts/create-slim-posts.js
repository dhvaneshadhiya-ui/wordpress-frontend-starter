/**
 * Creates a slim version of posts.json with only essential fields
 * This reduces bundle size from ~15-25MB to ~1-2MB for fast initial loading
 */

import fs from 'fs';
import path from 'path';

const INPUT_FILE = './src/data/posts.json';
const OUTPUT_FILE = './src/data/slim-posts.json';

function createSlimPosts() {
  console.log('📦 Creating slim-posts.json...');
  
  if (!fs.existsSync(INPUT_FILE)) {
    console.log('⚠️ posts.json not found, skipping slim posts creation');
    return;
  }

  const posts = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  
  const slimPosts = posts.map(post => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    date: post.date,
    modified: post.modified,
    featuredImage: post.featuredImage,
    author: typeof post.author === 'object' ? post.author?.id : post.author,
    categories: Array.isArray(post.categories) 
      ? post.categories.map(c => typeof c === 'object' ? c.id : c)
      : post.categories,
    tags: Array.isArray(post.tags)
      ? post.tags.map(t => typeof t === 'object' ? t.id : t)
      : post.tags,
  }));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(slimPosts));
  
  const originalSize = fs.statSync(INPUT_FILE).size;
  const slimSize = fs.statSync(OUTPUT_FILE).size;
  const reduction = ((1 - slimSize / originalSize) * 100).toFixed(1);
  
  console.log(`✅ Created slim-posts.json`);
  console.log(`   Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Slim: ${(slimSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Reduction: ${reduction}%`);
}

createSlimPosts();
