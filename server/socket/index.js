import { Server } from 'socket.io'

let io = null

export function setupSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket) => {
    // Typing PK matchmaking
    socket.on('join_queue', (data) => {
      socket.join('typing_queue')
      const queueSize = io.sockets.adapter.rooms.get('typing_queue')?.size || 0
      io.to('typing_queue').emit('queue_count', queueSize)

      // Try to match when 2+ players are waiting
      if (queueSize >= 2) {
        const room = io.sockets.adapter.rooms.get('typing_queue')
        const players = [...room].slice(0, 2)
        const roomId = `room_${Date.now()}`
        const text = data?.text || ''

        players.forEach(id => {
          const s = io.sockets.sockets.get(id)
          if (s) {
            s.leave('typing_queue')
            s.join(roomId)
          }
        })

        io.to(roomId).emit('match_start', { roomId, text, players })

        const afterQueue = io.sockets.adapter.rooms.get('typing_queue')?.size || 0
        io.to('typing_queue').emit('queue_count', afterQueue)
      }
    })

    socket.on('leave_queue', () => {
      socket.leave('typing_queue')
      const queueSize = io.sockets.adapter.rooms.get('typing_queue')?.size || 0
      io.to('typing_queue').emit('queue_count', queueSize)
    })

    socket.on('typing_progress', (data) => {
      if (data?.roomId) {
        socket.to(data.roomId).emit('opponent_progress', data)
      }
    })

    socket.on('typing_finish', (data) => {
      if (data?.roomId) {
        io.to(data.roomId).emit('player_finished', data)
      }
    })

    socket.on('disconnect', () => {
      const queueSize = io.sockets.adapter.rooms.get('typing_queue')?.size || 0
      io.to('typing_queue').emit('queue_count', queueSize)
    })
  })

  return io
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized')
  return io
}
