import axios from 'axios';
import FormData from 'form-data';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envPath = path.join(__dirname, '../server/.env');
dotenv.config({ path: envPath });

const CONFIG = {
    API_URL: process.env.HYDRO_API_URL,
    USERNAME: process.env.HYDRO_USERNAME,
    PASSWORD: process.env.HYDRO_PASSWORD
};

if (!CONFIG.API_URL || !CONFIG.USERNAME || !CONFIG.PASSWORD) {
    console.error('Missing config in .env');
    process.exit(1);
}

let currentCookie = '';

function mergeCookies(oldCookieString, newSetCookieHeader) {
    if (!newSetCookieHeader) return oldCookieString
    
    const cookieMap = new Map()
    
    // Parse old cookies
    if (oldCookieString) {
        oldCookieString.split(';').forEach(c => {
            const [key, ...val] = c.trim().split('=')
            if (key) cookieMap.set(key, val.join('='))
        })
    }
    
    // Parse new cookies
    const newCookies = Array.isArray(newSetCookieHeader) ? newSetCookieHeader : [newSetCookieHeader]
    newCookies.forEach(c => {
        const part = c.split(';')[0]
        const [key, ...val] = part.trim().split('=')
        if (key) {
            const value = val.join('=')
            if (value === '' || value.toLowerCase() === 'deleted') {
                cookieMap.delete(key)
            } else {
                cookieMap.set(key, value)
            }
        }
    })
    
    return Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ')
}

async function login() {
    console.log('[Test] Logging in...');
    const loginUrl = `${CONFIG.API_URL.replace(/\/$/, '')}/login`;
    try {
        const response = await axios.post(loginUrl, {
            uname: CONFIG.USERNAME,
            password: CONFIG.PASSWORD
        }, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (response.headers['set-cookie']) {
            currentCookie = mergeCookies('', response.headers['set-cookie']);
            console.log('[Test] Login Success. Cookie:', currentCookie);
        } else {
            console.error('[Test] Login failed: No cookie received');
        }
    } catch (e) {
        console.error('[Test] Login Error:', e.message);
    }
}

async function uploadFile(filename, content, problemId = '213') {
    console.log(`[Test] Uploading ${filename}...`);
    const uploadUrl = `${CONFIG.API_URL.replace(/\/$/, '')}/p/${problemId}/files?type=additional_file`;
    
    const form = new FormData();
    form.append('operation', 'upload_file');
    form.append('type', 'additional_file');
    form.append('file', Buffer.from(content), {
        filename: filename,
        contentType: 'application/octet-stream'
    });

    const headers = {
        'User-Agent': 'Mozilla/5.0',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': currentCookie,
        ...form.getHeaders()
    };

    try {
        const response = await axios.post(uploadUrl, form, { 
            headers,
            maxRedirects: 0,
            validateStatus: status => status >= 200 && status < 400 
        });

        console.log(`[Test] Upload Status: ${response.status}`);
        
        if (response.headers['set-cookie']) {
            console.log('[Test] Server returned new cookies!');
            const oldCookie = currentCookie;
            currentCookie = mergeCookies(currentCookie, response.headers['set-cookie']);
            if (oldCookie !== currentCookie) {
                console.log('[Test] Cookie CHANGED.');
                console.log('Old:', oldCookie);
                console.log('New:', currentCookie);
            } else {
                console.log('[Test] Cookie content unchanged.');
            }
        } else {
            console.log('[Test] No new cookies in response.');
        }
        
    } catch (e) {
        console.error(`[Test] Upload Failed: ${e.message}`);
        if (e.response) {
            console.error('Status:', e.response.status);
            if (e.response.headers['set-cookie']) {
                 console.log('[Test] Error response had cookies!');
            }
        }
    }
}

async function run() {
    await login();
    if (!currentCookie) return;

    console.log('\n--- Upload 1 ---');
    await uploadFile('test_cookie_1.txt', 'test content 1');
    
    console.log('\n--- Upload 2 ---');
    await uploadFile('test_cookie_2.txt', 'test content 2');
}

run();
