// scripts/testRoutes.js
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8000';

async function testAPI(endpoint, description) {
    try {
        console.log(`\n🧪 Testing: ${description}`);
        console.log(`   URL: ${BASE_URL}${endpoint}`);
        
        const response = await fetch(`${BASE_URL}${endpoint}`);
        const data = await response.json();
        
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Response:`, JSON.stringify(data, null, 2));
        
        if (response.ok) {
            console.log(`   ✅ Success`);
        } else {
            console.log(`   ❌ Failed`);
        }
        
        return { success: response.ok, data, status: response.status };
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log('🚀 Starting API Route Tests...');
    console.log(`Base URL: ${BASE_URL}`);
    
    const tests = [
        { endpoint: '/', description: 'Health Check' },
        { endpoint: '/debug/routes', description: 'Debug Routes List' },
        { endpoint: '/api/products/debug/count', description: 'Products Debug Count' },
        { endpoint: '/api/products', description: 'Get All Products' },
        { endpoint: '/api/products/women/collections', description: 'Women\'s Collections' },
        { endpoint: '/test-products', description: 'Test Products Endpoint' },
        { endpoint: '/user', description: 'User Routes (should work)' },
        { endpoint: '/nonexistent', description: '404 Test' }
    ];
    
    const results = [];
    
    for (const test of tests) {
        const result = await testAPI(test.endpoint, test.description);
        results.push({ ...test, ...result });
        
        // Add a small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log(`✅ Successful: ${successful}/${total}`);
    console.log(`❌ Failed: ${total - successful}/${total}`);
    
    console.log('\n📋 Detailed Results:');
    results.forEach((result, index) => {
        const status = result.success ? '✅' : '❌';
        console.log(`${index + 1}. ${status} ${result.description} (${result.status || 'ERROR'})`);
        if (!result.success && result.error) {
            console.log(`   Error: ${result.error}`);
        }
    });
    
    if (successful === total) {
        console.log('\n🎉 All tests passed!');
    } else {
        console.log('\n⚠️  Some tests failed. Check your server configuration.');
    }
}

// Run tests if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    runTests()
        .then(() => {
            console.log('\n✅ Test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test failed:', error);
            process.exit(1);
        });
}

export { runTests };