import { Server } from 'socket.io'
import AncientLevel from '../models/AncientLevel.js';

let io;

export function setupSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // Allow all for now, or configure based on env
      methods: ["GET", "POST"]
    }
  })

  // Simple in-memory room management
  const rooms = new Map() // roomId -> { players: [], state: 'waiting'|'playing'|'finished', text: '' }
  const queue = [] // Players waiting for match

  const broadcastQueueCount = () => {
    io.emit('queue_count', queue.length)
  }

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)
    socket.emit('queue_count', queue.length)

    // Join PK Queue
    socket.on('find_match', ({ username }) => {
      socket.data.username = username || 'Guest'
      
      if (queue.length > 0) {
        // Match found
        const opponent = queue.shift()
        broadcastQueueCount()
        const roomId = `room_${socket.id}_${opponent.id}`
        
        // Create room
        const text = generateTypingText()
        rooms.set(roomId, {
          id: roomId,
          players: [opponent, socket],
          state: 'playing',
          text
        })

        // Join sockets
        socket.join(roomId)
        opponent.join(roomId)

        // Notify start
        io.to(roomId).emit('match_start', {
          roomId,
          text,
          players: [
            { id: opponent.id, username: opponent.data.username },
            { id: socket.id, username: socket.data.username }
          ]
        })
        
        console.log(`Match started: ${opponent.data.username} vs ${socket.data.username} in ${roomId}`)

      } else {
        // Add to queue
        queue.push(socket)
        broadcastQueueCount()
        socket.emit('waiting_for_match')
        console.log(`User ${username} added to queue`)
      }
    })

    // Update Progress
    socket.on('update_progress', ({ roomId, progress, wpm }) => {
      // progress: 0-100
      socket.to(roomId).emit('opponent_progress', {
        id: socket.id,
        progress,
        wpm
      })
    })

    // Finish
    socket.on('match_finish', ({ roomId, time, wpm }) => {
      io.to(roomId).emit('player_finished', {
        id: socket.id,
        username: socket.data.username,
        time,
        wpm
      })
    })

    // --- Ancient Empires Logic ---
    socket.on('ancient_find_match', async () => {
        // Simple queue for Ancient Empires
        const ancientQueue = global.ancientQueue || [];
        global.ancientQueue = ancientQueue;

        // Check if already in queue
        if (ancientQueue.find(p => p.id === socket.id)) return;

        if (ancientQueue.length > 0) {
            const opponent = ancientQueue.shift();
            const roomId = `ancient_${socket.id}_${opponent.id}`;
            
            // Select a random map
            let levelId = null;
            try {
                const count = await AncientLevel.countDocuments();
                if (count > 0) {
                    const random = Math.floor(Math.random() * count);
                    const level = await AncientLevel.findOne().skip(random);
                    if (level) levelId = level._id;
                }
            } catch (err) {
                console.error("Error selecting map:", err);
            }

            socket.join(roomId);
            opponent.join(roomId);

            // Assign teams: Opponent (first in queue) is Blue (First), Socket is Red
            io.to(opponent.id).emit('ancient_match_found', { roomId, team: 'blue', opponentId: socket.id, levelId });
            io.to(socket.id).emit('ancient_match_found', { roomId, team: 'red', opponentId: opponent.id, levelId });

            console.log(`Ancient Match: ${opponent.id} vs ${socket.id} on map ${levelId}`);
        } else {
            ancientQueue.push(socket);
            socket.emit('ancient_waiting');
        }
    });

    socket.on('ancient_action', ({ roomId, action }) => {
        // Relay action to everyone else in the room (which is just the opponent)
        socket.to(roomId).emit('ancient_opponent_action', action);
    });

    socket.on('ancient_leave', ({ roomId }) => {
        socket.to(roomId).emit('ancient_opponent_left');
        socket.leave(roomId);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)
      // Remove from queue if present
      const idx = queue.indexOf(socket)
      if (idx !== -1) {
        queue.splice(idx, 1)
        broadcastQueueCount()
      }
      
      if (global.ancientQueue) {
          const aidx = global.ancientQueue.findIndex(u => u.id === socket.id);
          if (aidx !== -1) global.ancientQueue.splice(aidx, 1);
      }

      // Handle active rooms (notify opponent)
      // This is a simplified implementation
    })
  })

  return io
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

function generateTypingText() {
  const texts = [
    "#include <bits/stdc++.h>\n\nusing namespace std;\n\nint main()\n{\n    cout << \"hello world\";\n    return 0;\n}",
    "#include <bits/stdc++.h>\n\nusing namespace std;\n\nint main()\n{\n    int x, y, z;\n    cin >> x >> y >> z;\n    cout << y; \n    return 0;\n}",
    "#include <bits/stdc++.h>\n\nusing namespace std;\n\nint main()\n{\n    cin >> a;\n    cout << fixed << setprecision(3);\n    cout << a << endl; \n    return 0;\n}",
    "#include <bits/stdc++.h>\n\nusing namespace std;\n\nint main()\n{\n    int a, b;\n    cin >> a >> b;\n    cout << a/b << ' ' << a%b;\n    return 0;\n}",
    "#include <bits/stdc++.h>\n\nusing namespace std;\n\nint main()\n{\n    char c;\n    cin >> c;\n    cout << \"  \" << c << endl;\n    cout << \" \" << c << c << c << endl;\n    cout << c << c << c << c << c << endl;\n    return 0;\n}"
  ]
  return texts[Math.floor(Math.random() * texts.length)]
}
