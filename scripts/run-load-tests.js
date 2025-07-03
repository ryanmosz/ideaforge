#!/usr/bin/env node

/**
 * Load testing script for cache and rate limiting
 * 
 * This script runs various load tests and generates a performance report
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const path = require('path');

// Configuration
const LOAD_TEST_FILE = 'tests/load/cache-rate-limit.test.ts';
const REPORT_DIR = 'test-reports';
const REPORT_FILE = `load-test-report-${new Date().toISOString().replace(/:/g, '-')}.txt`;

// Ensure report directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR);
}

async function runLoadTests() {
  console.log(chalk.blue('\n🚀 Running Load Tests for Cache and Rate Limiting\n'));
  
  const tests = [
    {
      name: 'Cache Performance Tests',
      pattern: 'Cache Performance',
      description: 'Testing cache operations under high load'
    },
    {
      name: 'Rate Limiter Performance Tests',
      pattern: 'Rate Limiter Performance',
      description: 'Testing rate limiting under burst traffic'
    },
    {
      name: 'Combined Workload Tests',
      pattern: 'Combined Load Test',
      description: 'Testing mixed operations simulating real-world usage'
    },
    {
      name: 'Performance Benchmarks',
      pattern: 'Performance Benchmarks',
      description: 'Measuring latency and throughput targets'
    }
  ];
  
  const results = [];
  let allTestsPassed = true;
  
  for (const test of tests) {
    console.log(chalk.yellow(`\n${test.name}`));
    console.log(chalk.gray(test.description));
    
    const spinner = ora('Running test...').start();
    const startTime = Date.now();
    
    try {
      const output = await runJestTest(test.pattern);
      const duration = Date.now() - startTime;
      
      // Parse test results from output
      const passed = output.includes('PASS');
      const metrics = extractMetrics(output);
      
      if (passed) {
        spinner.succeed(chalk.green(`✓ ${test.name} completed in ${(duration / 1000).toFixed(2)}s`));
      } else {
        spinner.fail(chalk.red(`✗ ${test.name} failed`));
        allTestsPassed = false;
      }
      
      results.push({
        name: test.name,
        passed,
        duration,
        metrics,
        output
      });
      
      // Display key metrics
      if (metrics.length > 0) {
        console.log(chalk.cyan('\nKey Metrics:'));
        metrics.forEach(metric => {
          console.log(`  ${metric}`);
        });
      }
      
    } catch (error) {
      spinner.fail(chalk.red(`✗ ${test.name} encountered an error`));
      allTestsPassed = false;
      results.push({
        name: test.name,
        passed: false,
        error: error.message
      });
    }
  }
  
  // Generate performance report
  console.log(chalk.blue('\n📊 Generating Performance Report...\n'));
  
  const report = generateReport(results);
  const reportPath = path.join(REPORT_DIR, REPORT_FILE);
  fs.writeFileSync(reportPath, report);
  
  console.log(chalk.green(`Report saved to: ${reportPath}`));
  
  // Display summary
  console.log(chalk.blue('\n📈 Summary\n'));
  
  const summary = generateSummary(results);
  console.log(summary);
  
  // Overall result
  if (allTestsPassed) {
    console.log(chalk.green('\n✅ All load tests passed! System is performing well under load.\n'));
  } else {
    console.log(chalk.red('\n❌ Some load tests failed. Review the report for details.\n'));
    process.exit(1);
  }
}

function runJestTest(pattern) {
  return new Promise((resolve, reject) => {
    let output = '';
    
    const jest = spawn('npx', [
      'jest',
      LOAD_TEST_FILE,
      '--testNamePattern',
      pattern,
      '--no-coverage',
      '--verbose'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    jest.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    jest.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    jest.on('close', (code) => {
      if (code === 0 || output.includes('PASS')) {
        resolve(output);
      } else {
        // Even if Jest returns non-zero, we want to capture the output
        resolve(output);
      }
    });
    
    jest.on('error', (error) => {
      reject(error);
    });
  });
}

function extractMetrics(output) {
  const metrics = [];
  const lines = output.split('\n');
  
  lines.forEach(line => {
    // Extract cache performance metrics
    if (line.includes('Cache Load Test Results:')) {
      const match = line.match(/opsPerSecond: ([\d.]+)/);
      if (match) {
        metrics.push(`Cache Operations/sec: ${parseFloat(match[1]).toFixed(2)}`);
      }
    }
    
    // Extract cache hit rate
    if (line.includes('Cache hit rate:')) {
      const match = line.match(/([\d.]+)%/);
      if (match) {
        metrics.push(`Cache Hit Rate: ${match[1]}%`);
      }
    }
    
    // Extract rate limiting metrics
    if (line.includes('Rate Limiter Burst Test:')) {
      const allowed = line.match(/allowed: (\d+)/);
      const blocked = line.match(/blocked: (\d+)/);
      if (allowed && blocked) {
        const total = parseInt(allowed[1]) + parseInt(blocked[1]);
        const blockRate = (parseInt(blocked[1]) / total * 100).toFixed(2);
        metrics.push(`Rate Limit Block Rate: ${blockRate}%`);
      }
    }
    
    // Extract memory usage
    if (line.includes('Memory usage:')) {
      const match = line.match(/([\d.]+) MB/);
      if (match) {
        metrics.push(`Memory Usage: ${match[1]} MB`);
      }
    }
    
    // Extract performance benchmarks
    if (line.includes('Performance Benchmarks:')) {
      const nextLines = lines.slice(lines.indexOf(line), lines.indexOf(line) + 10);
      const jsonStr = nextLines.join('\n').match(/\{[\s\S]*\}/);
      if (jsonStr) {
        try {
          const benchmarks = JSON.parse(jsonStr[0]);
          metrics.push(`Cache GET Avg: ${benchmarks.cacheGet.avg.toFixed(2)}ms`);
          metrics.push(`Cache GET P95: ${benchmarks.cacheGet.p95.toFixed(2)}ms`);
          metrics.push(`Cache SET Avg: ${benchmarks.cacheSet.avg.toFixed(2)}ms`);
          metrics.push(`Rate Check Avg: ${benchmarks.rateLimitCheck.avg.toFixed(2)}ms`);
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  });
  
  return metrics;
}

function generateReport(results) {
  const report = [];
  
  report.push('='.repeat(80));
  report.push('LOAD TEST PERFORMANCE REPORT');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push('='.repeat(80));
  report.push('');
  
  results.forEach(result => {
    report.push(`\n${result.name}`);
    report.push('-'.repeat(result.name.length));
    report.push(`Status: ${result.passed ? 'PASSED' : 'FAILED'}`);
    
    if (result.duration) {
      report.push(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
    }
    
    if (result.metrics && result.metrics.length > 0) {
      report.push('\nMetrics:');
      result.metrics.forEach(metric => {
        report.push(`  - ${metric}`);
      });
    }
    
    if (result.error) {
      report.push(`\nError: ${result.error}`);
    }
    
    report.push('');
  });
  
  return report.join('\n');
}

function generateSummary(results) {
  const summary = [];
  
  // Overall pass rate
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  const passRate = (passedTests / totalTests * 100).toFixed(2);
  
  summary.push(`Test Pass Rate: ${passRate}% (${passedTests}/${totalTests})`);
  
  // Performance highlights
  const allMetrics = results.flatMap(r => r.metrics || []);
  
  const cacheHitRate = allMetrics.find(m => m.includes('Cache Hit Rate'));
  if (cacheHitRate) {
    summary.push(cacheHitRate);
  }
  
  const opsPerSec = allMetrics.find(m => m.includes('Operations/sec'));
  if (opsPerSec) {
    summary.push(opsPerSec);
  }
  
  const memUsage = allMetrics.find(m => m.includes('Memory Usage'));
  if (memUsage) {
    summary.push(memUsage);
  }
  
  // Latency summary
  const getAvg = allMetrics.find(m => m.includes('Cache GET Avg'));
  const getP95 = allMetrics.find(m => m.includes('Cache GET P95'));
  if (getAvg && getP95) {
    summary.push('\nCache Performance:');
    summary.push(`  ${getAvg}`);
    summary.push(`  ${getP95}`);
  }
  
  return summary.join('\n');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n❌ Unhandled error:'), error);
  process.exit(1);
});

// Run the tests
runLoadTests(); 