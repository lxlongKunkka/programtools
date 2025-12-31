import cron from 'node-cron';
import nodemailer from 'nodemailer';
import SudokuResult from '../models/SudokuResult.js';
import { MAIL_CONFIG } from '../config.js';

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

            // Fetch records
            const results = await SudokuResult.find({
                createdAt: {
                    $gte: yesterday,
                    $lt: yesterdayEnd
                }
            }).sort({ createdAt: -1 });

            console.log(`[CRON] Found ${results.length} records.`);

            // Format email content
            const htmlContent = `
                <h2>Sudoku Daily Report - ${yesterday.toLocaleDateString()}</h2>
                <p>Total games played: ${results.length}</p>
                <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
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
                        ${results.map(r => `
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
            `;

            // Send email
            const mailOptions = {
                from: MAIL_CONFIG.from,
                to: '110076790@qq.com',
                subject: `Sudoku Daily Report - ${yesterday.toLocaleDateString()}`,
                html: htmlContent
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('[CRON] Email sent:', info.messageId);

        } catch (error) {
            console.error('[CRON] Error in daily report job:', error);
        }
    });
}
