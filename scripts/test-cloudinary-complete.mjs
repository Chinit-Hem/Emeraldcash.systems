#!/usr/bin/env node
/**
 * Comprehensive Cloudinary Testing Script
 * Tests all vehicle categories and API endpoints
 */

import { config } from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

// Load environment variables
config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';
const TEST_RESULTS = [];

// Test image (1x1 red PNG)
const TEST_IMAGE_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAXAYUJAAAAABJRU5ErkJggg==';

// Helper to log results
function log(category, test, status, details = '') {
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${emoji} [${category}] ${test}: ${status} ${details}`);
  TEST_RESULTS.push({ category, test, status, details });
}

// Helper to make API requests
async function apiRequest(method, endpoint, body = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  
  if (body) {
    if (body instanceof FormData) {
      delete options.headers['Content-Type']; // Let browser set it with boundary
      options.body = body;
    } else {
      options.body = JSON.stringify(body);
    }
  }
  
  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, error: error.message, data: {} };
  }
}

// Test 1: Cloudinary Configuration
async function testCloudinaryConfig() {
  console.log('\n========================================');
  console.log('Test 1: Cloudinary Configuration');
  console.log('========================================');
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloudName || !apiKey || !apiSecret) {
    log('Config', 'Environment Variables', 'FAIL', 'Missing credentials');
    return false;
  }
  
  log('Config', 'Environment Variables', 'PASS', `Cloud: ${cloudName}`);
  
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  
  // Test connection
  try {
    await cloudinary.api.ping();
    log('Config', 'Cloudinary Connection', 'PASS');
    return true;
  } catch (error) {
    log('Config', 'Cloudinary Connection', 'FAIL', error.message);
    return false;
  }
}

// Test 2: Folder Structure
async function testFolderStructure() {
  console.log('\n========================================');
  console.log('Test 2: Folder Structure');
  console.log('========================================');
  
  const expectedFolders = ['vms/cars', 'vms/motorcycles', 'vms/tuktuks'];
  
  try {
    const result = await cloudinary.api.sub_folders('vms');
    const existingFolders = result.folders.map(f => f.path);
    
    for (const folder of expectedFolders) {
      if (existingFolders.includes(folder)) {
        log('Folders', folder, 'PASS', 'Exists');
      } else {
        log('Folders', folder, 'FAIL', 'Not found');
      }
    }
  } catch (error) {
    log('Folders', 'List Folders', 'FAIL', error.message);
  }
}

// Test 3: Upload to Each Folder
async function testUploads() {
  console.log('\n========================================');
  console.log('Test 3: Upload to Each Folder');
  console.log('========================================');
  
  const categories = [
    { name: 'Cars', folder: 'vms/cars', category: 'SUV' },
    { name: 'Motorcycles', folder: 'vms/motorcycles', category: 'Motorcycle' },
    { name: 'TukTuks', folder: 'vms/tuktuks', category: 'Tuk Tuk' },
  ];
  
  for (const { name, folder, category } of categories) {
    try {
      const result = await cloudinary.uploader.upload(TEST_IMAGE_BASE64, {
        folder: folder,
        public_id: `test_${category.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
        resource_type: 'image',
        tags: ['test', category],
      });
      
      if (result.secure_url && result.secure_url.includes(folder)) {
        log('Upload', `${name} Folder`, 'PASS', `URL: ${result.secure_url.substring(0, 60)}...`);
        
        // Clean up test image
        try {
          await cloudinary.uploader.destroy(result.public_id);
          log('Upload', `${name} Cleanup`, 'PASS');
        } catch (cleanupError) {
          log('Upload', `${name} Cleanup`, 'WARN', cleanupError.message);
        }
      } else {
        log('Upload', `${name} Folder`, 'FAIL', 'URL does not contain expected folder');
      }
    } catch (error) {
      log('Upload', `${name} Folder`, 'FAIL', error.message);
    }
  }
}

// Test 4: API Endpoints
async function testAPIEndpoints() {
  console.log('\n========================================');
  console.log('Test 4: API Endpoints');
  console.log('========================================');
  
  // Test health endpoint
  try {
    const health = await apiRequest('GET', '/api/health');
    if (health.status === 200) {
      log('API', 'Health Check', 'PASS');
    } else {
      log('API', 'Health Check', 'FAIL', `Status: ${health.status}`);
    }
  } catch (error) {
    log('API', 'Health Check', 'FAIL', error.message);
  }
  
  // Note: Vehicle creation/update tests require authentication
  // We'll test the endpoints are accessible but may return 401
  console.log('\n--- Authenticated Endpoints (expecting 401 without auth) ---');
  
  // Test vehicle list (should work without auth or return 401)
  try {
    const vehicles = await apiRequest('GET', '/api/vehicles');
    if (vehicles.status === 200) {
      log('API', 'GET /api/vehicles', 'PASS', `Found ${vehicles.data.data?.length || 0} vehicles`);
    } else if (vehicles.status === 401) {
      log('API', 'GET /api/vehicles', 'PASS', 'Returns 401 (auth required)');
    } else {
      log('API', 'GET /api/vehicles', 'WARN', `Status: ${vehicles.status}`);
    }
  } catch (error) {
    log('API', 'GET /api/vehicles', 'FAIL', error.message);
  }
}

// Test 5: getCloudinaryFolder Function
async function testFolderMapping() {
  console.log('\n========================================');
  console.log('Test 5: Folder Mapping Logic');
  console.log('========================================');
  
  // Import the function
  try {
    const { getCloudinaryFolder } = await import('../src/lib/cloudinary-folders.ts');
    
    const testCases = [
      { input: 'SUV', expected: 'vms/cars' },
      { input: 'Car', expected: 'vms/cars' },
      { input: 'Sedan', expected: 'vms/cars' },
      { input: 'Motorcycle', expected: 'vms/motorcycles' },
      { input: 'Scooter', expected: 'vms/motorcycles' },
      { input: 'Tuk Tuk', expected: 'vms/tuktuks' },
      { input: 'TukTuk', expected: 'vms/tuktuks' },
    ];
    
    for (const { input, expected } of testCases) {
      const result = getCloudinaryFolder(input);
      if (result === expected) {
        log('Mapping', `${input} → ${result}`, 'PASS');
      } else {
        log('Mapping', `${input} → ${result}`, 'FAIL', `Expected: ${expected}`);
      }
    }
  } catch (error) {
    log('Mapping', 'Import getCloudinaryFolder', 'FAIL', error.message);
  }
}

// Print Summary
function printSummary() {
  console.log('\n========================================');
  console.log('  Test Summary');
  console.log('========================================');
  
  const passed = TEST_RESULTS.filter(r => r.status === 'PASS').length;
  const failed = TEST_RESULTS.filter(r => r.status === 'FAIL').length;
  const warnings = TEST_RESULTS.filter(r => r.status === 'WARN').length;
  
  console.log(`Total Tests: ${TEST_RESULTS.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  
  if (failed === 0) {
    console.log('\n🎉 All critical tests passed!');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Review the output above.`);
    process.exit(1);
  }
}

// Main
async function main() {
  console.log('========================================');
  console.log('  Cloudinary Comprehensive Test Suite');
  console.log('========================================');
  console.log(`Testing against: ${BASE_URL}`);
  console.log('');
  
  // Run all tests
  const configOk = await testCloudinaryConfig();
  if (!configOk) {
    console.log('\n❌ Cannot continue without Cloudinary configuration');
    process.exit(1);
  }
  
  await testFolderStructure();
  await testUploads();
  await testAPIEndpoints();
  await testFolderMapping();
  
  printSummary();
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
