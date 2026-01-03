/**
 * Build Performance Metrics
 * Tracks and reports on incremental build performance
 */

import fs from 'fs';
import path from 'path';

const CACHE_DIR = './.build-cache';
const METRICS_FILE = path.join(CACHE_DIR, 'build-metrics.json');

export function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

export function loadMetrics() {
  if (fs.existsSync(METRICS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
    } catch {
      return { builds: [], summary: {} };
    }
  }
  return { builds: [], summary: {} };
}

export function saveMetrics(metrics) {
  ensureCacheDir();
  // Keep only last 50 builds
  if (metrics.builds.length > 50) {
    metrics.builds = metrics.builds.slice(-50);
  }
  fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
}

export function createBuildMetrics(phase) {
  return {
    phase,
    startTime: Date.now(),
    timestamp: new Date().toISOString(),
    stats: {},
    timings: {}
  };
}

export function recordTiming(metrics, label, startTime) {
  metrics.timings[label] = Date.now() - startTime;
}

export function recordStat(metrics, key, value) {
  metrics.stats[key] = value;
}

export function finalizeBuildMetrics(metrics) {
  metrics.totalDuration = Date.now() - metrics.startTime;
  
  // Calculate cache efficiency
  if (metrics.stats.filesWritten !== undefined && metrics.stats.filesSkipped !== undefined) {
    const total = metrics.stats.filesWritten + metrics.stats.filesSkipped;
    metrics.stats.cacheHitRate = total > 0 
      ? ((metrics.stats.filesSkipped / total) * 100).toFixed(1) + '%'
      : '0%';
  }
  
  if (metrics.stats.postsModified !== undefined && metrics.stats.totalPosts !== undefined) {
    metrics.stats.incrementalRate = metrics.stats.totalPosts > 0
      ? ((1 - metrics.stats.postsModified / metrics.stats.totalPosts) * 100).toFixed(1) + '%'
      : '0%';
  }
  
  return metrics;
}

export function saveBuildMetrics(metrics) {
  const allMetrics = loadMetrics();
  allMetrics.builds.push(metrics);
  
  // Update rolling summary
  const recentBuilds = allMetrics.builds.slice(-10);
  allMetrics.summary = {
    lastBuild: metrics.timestamp,
    averageDuration: Math.round(
      recentBuilds.reduce((sum, b) => sum + b.totalDuration, 0) / recentBuilds.length
    ),
    averageCacheHitRate: calculateAverageCacheHitRate(recentBuilds),
    totalBuilds: allMetrics.builds.length,
    fastestBuild: Math.min(...recentBuilds.map(b => b.totalDuration)),
    slowestBuild: Math.max(...recentBuilds.map(b => b.totalDuration))
  };
  
  saveMetrics(allMetrics);
  return allMetrics;
}

function calculateAverageCacheHitRate(builds) {
  const rates = builds
    .filter(b => b.stats?.filesWritten !== undefined)
    .map(b => {
      const total = b.stats.filesWritten + b.stats.filesSkipped;
      return total > 0 ? (b.stats.filesSkipped / total) * 100 : 0;
    });
  
  if (rates.length === 0) return '0%';
  return (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1) + '%';
}

export function printMetricsSummary(metrics, allMetrics) {
  console.log('\n📊 Build Performance Metrics:');
  console.log('─'.repeat(50));
  
  // Phase breakdown
  console.log('⏱️  Phase Timings:');
  for (const [label, duration] of Object.entries(metrics.timings)) {
    console.log(`   ${label}: ${formatDuration(duration)}`);
  }
  
  // Stats
  console.log('\n📈 Statistics:');
  for (const [key, value] of Object.entries(metrics.stats)) {
    console.log(`   ${formatKey(key)}: ${value}`);
  }
  
  // Total
  console.log(`\n⚡ Total Duration: ${formatDuration(metrics.totalDuration)}`);
  
  // Rolling summary
  if (allMetrics?.summary) {
    console.log('\n📋 Rolling Summary (last 10 builds):');
    console.log(`   Average: ${formatDuration(allMetrics.summary.averageDuration)}`);
    console.log(`   Fastest: ${formatDuration(allMetrics.summary.fastestBuild)}`);
    console.log(`   Slowest: ${formatDuration(allMetrics.summary.slowestBuild)}`);
    console.log(`   Avg Cache Hit Rate: ${allMetrics.summary.averageCacheHitRate}`);
  }
  
  console.log('─'.repeat(50));
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
}

function formatKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// CLI: View metrics summary
if (process.argv[1].endsWith('build-metrics.js') && process.argv.includes('--summary')) {
  const metrics = loadMetrics();
  
  console.log('\n📊 Build Metrics Summary');
  console.log('═'.repeat(50));
  
  if (metrics.summary?.lastBuild) {
    console.log(`Last build: ${metrics.summary.lastBuild}`);
    console.log(`Total builds tracked: ${metrics.summary.totalBuilds}`);
    console.log(`\nLast 10 builds average:`);
    console.log(`  Duration: ${formatDuration(metrics.summary.averageDuration)}`);
    console.log(`  Fastest: ${formatDuration(metrics.summary.fastestBuild)}`);
    console.log(`  Slowest: ${formatDuration(metrics.summary.slowestBuild)}`);
    console.log(`  Cache Hit Rate: ${metrics.summary.averageCacheHitRate}`);
    
    console.log('\nRecent builds:');
    metrics.builds.slice(-5).forEach((build, i) => {
      console.log(`  ${i + 1}. ${build.phase} - ${formatDuration(build.totalDuration)} (${build.stats.cacheHitRate || 'N/A'})`);
    });
  } else {
    console.log('No build metrics recorded yet.');
  }
  
  console.log('═'.repeat(50));
}
