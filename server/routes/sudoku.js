import express from 'express';
import { getSudoku } from 'sudoku-gen';
import SudokuResult from '../models/SudokuResult.js';
import DailySudoku from '../models/DailySudoku.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Generate a new Sudoku game
function generateSmallSudoku(size) {
    const boxWidth = size === 4 ? 2 : 3;
    const boxHeight = size === 4 ? 2 : 2;
    
    const board = Array(size).fill().map(() => Array(size).fill(0));
    
    function isValid(board, row, col, num) {
        for (let x = 0; x < size; x++) {
            if (board[row][x] === num || board[x][col] === num) return false;
        }
        const startRow = Math.floor(row / boxHeight) * boxHeight;
        const startCol = Math.floor(col / boxWidth) * boxWidth;
        for (let i = 0; i < boxHeight; i++) {
            for (let j = 0; j < boxWidth; j++) {
                if (board[startRow + i][startCol + j] === num) return false;
            }
        }
        return true;
    }

    function solve(board) {
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (board[r][c] === 0) {
                    const nums = Array.from({length: size}, (_, i) => i + 1).sort(() => Math.random() - 0.5);
                    for (const num of nums) {
                        if (isValid(board, r, c, num)) {
                            board[r][c] = num;
                            if (solve(board)) return true;
                            board[r][c] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    // Check if the board has a unique solution
    function hasUniqueSolution(board) {
        let solutions = 0;
        
        function count(b) {
            if (solutions > 1) return;
            
            let r = -1, c = -1;
            let found = false;
            for(let i=0; i<size; i++){
                for(let j=0; j<size; j++){
                    if(b[i][j] === 0){
                        r=i; c=j; found=true; break;
                    }
                }
                if(found) break;
            }
            
            if(!found) {
                solutions++;
                return;
            }
            
            for(let num=1; num<=size; num++){
                if(isValid(b, r, c, num)){
                    b[r][c] = num;
                    count(b);
                    b[r][c] = 0;
                    if (solutions > 1) return;
                }
            }
        }
        
        // Use a copy to avoid modifying the original board during check
        const boardCopy = board.map(row => [...row]);
        count(boardCopy);
        return solutions === 1;
    }

    solve(board);
    const solution = board.map(row => row.join('')).join('');
    
    const puzzleBoard = board.map(row => [...row]);
    
    // Try to remove numbers while maintaining uniqueness
    // 4x4: Target ~8-10 removed. 6x6: Target ~18-22 removed.
    const targetRemoved = size === 4 ? 10 : 22; 
    
    let coords = [];
    for(let r=0; r<size; r++) for(let c=0; c<size; c++) coords.push([r,c]);
    coords.sort(() => Math.random() - 0.5);
    
    let removed = 0;
    for (const [r, c] of coords) {
        if (removed >= targetRemoved) break;
        
        const backup = puzzleBoard[r][c];
        puzzleBoard[r][c] = 0;
        
        if (hasUniqueSolution(puzzleBoard)) {
            removed++;
        } else {
            puzzleBoard[r][c] = backup; // Put back if not unique
        }
    }
    
    const puzzle = puzzleBoard.map(row => row.map(n => n === 0 ? '-' : n).join('')).join('');
    
    return { puzzle, solution, difficulty: 'generated' };
}

// Get or generate daily sudoku
router.get('/daily', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        let daily = await DailySudoku.findOne({ date: today });
        
        if (!daily) {
            // Generate new daily (Hard 9x9)
            const sudoku = getSudoku('hard');
            daily = new DailySudoku({
                date: today,
                puzzle: sudoku.puzzle,
                solution: sudoku.solution,
                difficulty: 'hard',
                size: 9
            });
            await daily.save();
        }
        
        res.json(daily);
    } catch (error) {
        console.error('Error fetching daily sudoku:', error);
        res.status(500).json({ error: 'Failed to fetch daily sudoku' });
    }
});

router.get('/game', (req, res) => {
    const difficulty = req.query.difficulty || 'easy';
    const size = parseInt(req.query.size) || 9;

    if (size === 9) {
        const sudoku = getSudoku(difficulty);
        res.json(sudoku);
    } else if (size === 4 || size === 6) {
        const sudoku = generateSmallSudoku(size);
        res.json(sudoku);
    } else {
        res.status(400).json({ error: 'Invalid size' });
    }
});

// Submit game result
router.post('/submit', authenticateToken, async (req, res) => {
    try {
        console.log('[Sudoku] Submitting score:', req.body, 'User:', req.user.username);
        const { difficulty, size, timeElapsed, mistakes, isDaily } = req.body;
        
        const result = new SudokuResult({
            userId: req.user.id,
            username: req.user.username || req.user.name || 'Anonymous',
            difficulty,
            size,
            timeElapsed,
            mistakes,
            isDaily: !!isDaily
        });
        
        await result.save();
        console.log('[Sudoku] Score saved successfully');
        res.json({ success: true });
    } catch (error) {
        console.error('Error submitting sudoku result:', error);
        res.status(500).json({ error: 'Failed to submit result' });
    }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const { difficulty, size, isDaily } = req.query;
        const limit = parseInt(req.query.limit) || 20;
        
        const query = { 
            difficulty, 
            size: parseInt(size) 
        };

        if (isDaily === 'true') {
            query.isDaily = true;
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const end = new Date();
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }
        
        const results = await SudokuResult.find(query)
        .sort({ timeElapsed: 1, mistakes: 1, createdAt: -1 })
        .limit(limit)
        .select('username timeElapsed mistakes createdAt');
        
        res.json(results);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Get recent activity
router.get('/activity', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        
        const results = await SudokuResult.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('username size timeElapsed createdAt difficulty');
        
        res.json(results);
    } catch (error) {
        console.error('Error fetching activity:', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

export default router;
