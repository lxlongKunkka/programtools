import cron from 'node-cron';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import SudokuResult from '../models/SudokuResult.js';
import SokobanResult from '../models/SokobanResult.js';
import LightbotResult from '../models/LightbotResult.js';
import { MAIL_CONFIG, DIRS } from '../config.js';

const transporter = nodemailer.createTransport({
    host: MAIL_CONFIG.host,
    port: MAIL_CONFIG.port,
    secure: MAIL_CONFIG.secure,
    auth: {
        user: MAIL_CONFIG.user,
        pass: MAIL_CONFIG.pass
    }
});

export function startDailyReportJob() {
    console.log(`[CRON] Initializing daily report job with schedule: ${MAIL_CONFIG.cron}`);
    
    // Schedule the task
    cron.schedule(MAIL_CONFIG.cron, async () => {
        console.log('[CRON] Running daily report job...');
        try {
            // Calculate yesterday's date range
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const yesterdayEnd = new Date(today);
            
            console.log(`[CRON] Fetching records from ${yesterday.toISOString()} to ${yesterdayEnd.toISOString()}`);

            // Fetch Sudoku records
            const sudokuResults = await SudokuResult.find({
                createdAt: {
                    $gte: yesterday,
                    $lt: yesterdayEnd
                }
            }).sort({ createdAt: -1 });

            // Fetch Sokoban records
            const sokobanResults = await SokobanResult.find({
                createdAt: {
                    $gte: yesterday,
                    $lt: yesterdayEnd
                }
            }).sort({ createdAt: -1 });

            // Fetch Lightbot records
            const lightbotResults = await LightbotResult.find({
                completedAt: {
                    $gte: yesterday,
                    $lt: yesterdayEnd
                }
            }).sort({ completedAt: -1 });

            // Count Lightbot event log entries for yesterday
            const LIGHTBOT_EVENTS_FILE = path.join(DIRS.root, 'logs', 'lightbot-events.ndjson');
            let lightbotEventStats = { game_start: 0, level_complete: 0, unique_ips: 0 };
            try {
                if (fs.existsSync(LIGHTBOT_EVENTS_FILE)) {
                    const ips = new Set();
                    const lines = fs.readFileSync(LIGHTBOT_EVENTS_FILE, 'utf8').split('\n').filter(Boolean);
                    const yStr = yesterday.toISOString().slice(0, 10);
                    for (const line of lines) {
                        try {
                            const ev = JSON.parse(line);
                            const day = new Date(ev.t || 0).toISOString().slice(0, 10);
                            if (day === yStr) {
                                if (ev.event === 'game_start') lightbotEventStats.game_start++;
                                if (ev.event === 'level_complete') lightbotEventStats.level_complete++;
                                if (ev.ip) ips.add(ev.ip);
                            }
                        } catch { /* skip */ }
                    }
                    lightbotEventStats.unique_ips = ips.size;
                }
            } catch (e) {
                console.error('[CRON] Error reading lightbot events:', e);
            }

            console.log(`[CRON] Found ${sudokuResults.length} Sudoku records and ${sokobanResults.length} Sokoban records.`);

            // Prepare attachments
            const attachments = [];
            
            // Try to find yesterday's log file
            try {
                const yYear = yesterday.getFullYear();
                const yMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
                const yDay = String(yesterday.getDate()).padStart(2, '0');
                const logFileName = `${yYear}-${yMonth}-${yDay}.log`;
                const logFilePath = path.join(DIRS.logs, logFileName);

                if (fs.existsSync(logFilePath)) {
                    console.log(`[CRON] Found log file: ${logFilePath}`);
                    attachments.push({
                        filename: logFileName,
                        path: logFilePath
                    });
                } else {
                    console.log(`[CRON] Log file not found: ${logFilePath}`);
                }
            } catch (err) {
                console.error('[CRON] Error preparing log attachment:', err);
            }

            // Format email content
            const htmlContent = `
                <h2>Daily Report - ${yesterday.toLocaleDateString()}</h2>
                
                <h3>Sudoku (${sudokuResults.length})</h3>
                <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>User</th>
                            <th>Size</th>
                            <th>Difficulty</th>
                            <th>Time Elapsed</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sudokuResults.map(r => `
                            <tr>
                                <td>${new Date(r.createdAt).toLocaleTimeString()}</td>
                                <td>${r.username || 'Anonymous'}</td>
                                <td>${r.size}x${r.size}</td>
                                <td>${r.difficulty}</td>
                                <td>${r.timeElapsed}s</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <h3>Sokoban (${sokobanResults.length})</h3>
                <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>User</th>
                            <th>Level ID</th>
                            <th>Moves</th>
                            <th>Time Elapsed</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sokobanResults.map(r => `
                            <tr>
                                <td>${new Date(r.createdAt).toLocaleTimeString()}</td>
                                <td>${r.username || 'Anonymous'}</td>
                                <td>${r.levelId}</td>
                                <td>${r.moves}</td>
                                <td>${r.timeElapsed}s</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <h3>Lightbot 通关记录 (${lightbotResults.length} 条，事件统计：开局 ${lightbotEventStats.game_start} 次 / 通关 ${lightbotEventStats.level_complete} 次 / 独立 IP ${lightbotEventStats.unique_ips})</h3>
                <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th>时间</th>
                            <th>用户</th>
                            <th>关卡</th>
                            <th>指令数</th>
                            <th>执行步数</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lightbotResults.map(r => `
                            <tr>
                                <td>${new Date(r.completedAt).toLocaleTimeString('zh-CN')}</td>
                                <td>${r.username || '匿名'}</td>
                                <td>${r.levelId}</td>
                                <td>${r.totalCommands}</td>
                                <td>${r.executionSteps}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            // Send email
            const mailOptions = {
                from: MAIL_CONFIG.from,
                to: '110076790@qq.com', // Keep the hardcoded email as requested OR use MAIL_CONFIG.to
                subject: `Daily Report - ${yesterday.toLocaleDateString()}`,
                html: htmlContent,
                attachments: attachments
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('[CRON] Email sent:', info.messageId);

        } catch (error) {
            console.error('[CRON] Error in daily report job:', error);
        }
    });
}
