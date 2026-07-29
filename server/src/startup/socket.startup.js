const { WebSocketServer, WebSocket } = require('ws')
const url = require('url')
const jwt = require('jsonwebtoken')

// CONFIGURATION
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here'
const PING_INTERVAL = 30000 // Check connections every 30 seconds

let wss = null

/**
 * Initialize the WebSocket Server
 * @param {http.Server} server - The NodeJS HTTP server instance
 */
const initWebSocket = (server) => {
  wss = new WebSocketServer({ server })

  console.log('🚀 WebSocket Server Initialized')

  wss.on('connection', (ws, req) => {
    ws.isAlive = true

    try {
      const parameters = url.parse(req.url, true).query
      const token = parameters.token

      if (!token) {
        throw new Error('Missing authentication token')
      }

      const decoded = jwt.verify(token, JWT_SECRET)

      ws.companyId = decoded.companyId
      ws.userId = decoded.userId
      ws.role = decoded.role

      console.log(`🔌 Client Connected: ${decoded.companyId} (${decoded.userId})`)
    } catch (error) {
      console.warn(`⛔ Connection Rejected: ${error.message}`)
      ws.close(4001, 'Unauthorized')
      return
    }

    ws.on('pong', () => {
      ws.isAlive = true
    })

    ws.on('close', () => {
      // console.log(`🔌 Client Disconnected: ${ws.companyId}`);
    })
  })

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate()
      }

      ws.isAlive = false
      ws.ping()
    })
  }, PING_INTERVAL)

  wss.on('close', () => {
    clearInterval(interval)
  })
}

/**
 * Broadcast to a specific User (e.g. "Your specific export is ready")
 */
const broadcastToUser = (targetUserId, payload, eventType = 'NOTIFICATION') => {
  if (!wss) return

  const message = JSON.stringify({ type: eventType, data: payload })

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.userId === targetUserId) {
      client.send(message)
    }
  })
}

/**
 * Broadcast to all Users (e.g. "New user registered")
 */
const broadcastToAll = (payload, eventType = 'NOTIFICATION') => {
  if (!wss) return

  const message = JSON.stringify({ type: eventType, data: payload })

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

module.exports = { initWebSocket, broadcastToUser, broadcastToAll }
