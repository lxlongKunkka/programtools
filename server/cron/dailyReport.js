import cron from 'node-cron';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import SudokuResult from '../models/SudokuResult.js';
import SokobanResult from '../models/SokobanResult.js';
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
