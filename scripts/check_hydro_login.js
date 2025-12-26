const path = require('path');
const fs = require('fs');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables from server/.env
const envPath = path.join(__dirname, '../server/.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.error('Error: server/.env file not found at', envPath);
    process.exit(1);
}

const CONFIG = {
    API_URL: process.env.HYDRO_API_URL,
    USERNAME: process.env.HYDRO_USERNAME,
    PASSWORD: process.env.HYDRO_PASSWORD
};

console.log('--- HydroOJ Login Check ---');
console.log('API URL:', CONFIG.API_URL);
console.log('Username:', CONFIG.USERNAME);
console.log('Password:', CONFIG.PASSWORD ? '******' : '(Not Set)');

if (!CONFIG.API_URL || !CONFIG.USERNAME || !CONFIG.PASSWORD) {
    console.error('Error: Missing configuration in .env');
    console.error('Please ensure HYDRO_API_URL, HYDRO_USERNAME, and HYDRO_PASSWORD are set.');
    process.exit(1);
}

async function testLogin() {
    try {
        const loginUrl = `${CONFIG.API_URL.replace(/\/$/, '')}/login`;
        console.log(`\nAttempting to login to ${loginUrl}...`);

        const response = await axios.post(loginUrl, {
            uname: CONFIG.USERNAME,
            password: CONFIG.PASSWORD
        }, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            },
            validateStatus: status => status >= 200 && status < 400,
            maxRedirects: 0
        });

        const setCookie = response.headers['set-cookie'];
        
        if (setCookie) {
            console.log('✅ Login Successful!');
            console.log('Received Cookies:', setCookie.map(c => c.split(';')[0]).join('; '));
            
            // Optional: Verify by fetching user profile or similar if possible, 
            // but getting a cookie is usually enough proof for Hydro.
        } else {
            console.log('⚠️  Request finished but no Set-Cookie header received.');
            console.log('Response Status:', response.status);
            console.log('Response Data:', response.data);
            
            if (response.data && response.data.error) {
                console.error('❌ Login Failed: Server returned error:', response.data.error);
            } else {
                console.error('❌ Login Failed: Unknown reason.');
            }
        }

    } catch (error) {
        console.error('❌ Login Request Failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testLogin();
