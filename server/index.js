import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { Server } from 'socket.io'
import cors from 'cors'
import { Readable } from 'stream'

// ES module dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const PORT = process.env.PORT || 8000
const UI_PORT = process.env.UI_PORT || 8080
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:12434'

// Create Express apps for proxy and UI
const proxyApp = express()
const uiApp = express()

// Set up CORS
proxyApp.use(cors())
uiApp.use(cors())

// Create HTTP servers
const proxyServer = http.createServer(proxyApp)
const uiServer = http.createServer(uiApp)

// Set up Socket.IO for the UI server
const io = new Server(uiServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// Store request/response history
const requestHistory = []

// Middleware to capture request data before proxying
proxyApp.use((req, res, next) => {
  // Capture request start time
  req.startTime = Date.now()

  // Create a unique ID for this request
  req.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5)

  console.log(
    `Request: ${req.method} ${req.url} -> ${req.id} (start at ${new Date(req.startTime).toISOString()}) `
  )

  // Create buffer for response chunks
  const responseChunks = []
  const resWrite = res.write
  const resEnd = res.end

  // Set up response handling
  res.write = function (chunk, encoding) {
    if (chunk) {
      responseChunks.push(Buffer.from(chunk))
      const chunkData = {
        id: req.id,
        chunk: chunk.toString()
      }
      console.log(`Response chunk: ${chunkData.chunk} encoded as ${encoding}`)
    }
    return resWrite.apply(this, arguments)
  }

  res.end = function (chunk, encoding) {
    const duration = Date.now() - req.startTime

    if (chunk) {
      responseChunks.push(Buffer.from(chunk, encoding))
    }

    const responseBody = Buffer.concat(responseChunks).toString('utf8')

    console.log(
      `Response: ${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`
    )
    if (req.rawBody) {
      console.log(`Request body: ${req.rawBody}`)
    }
    if (responseBody) {
      console.log(`Response body: ${responseBody}`)
    }

    // Create request/response log entry
    const requestData = {
      id: req.id,
      timestamp: new Date(req.startTime).toISOString(),
      duration: duration,
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.rawBody || null
      },
      response: {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        headers: res.getHeaders ? res.getHeaders() : {},
        body: responseBody || null
      }
    }

    // Add to history (limit to last 100 requests)
    requestHistory.unshift(requestData)
    if (requestHistory.length > 100) {
      requestHistory.pop()
    }

    // Emit to all connected clients
    io.emit('newRequest', requestData)
    console.log(`Emitting newRequest event with data ID: ${requestData.id}`)

    return resEnd.apply(this, arguments)
  }

  // Only collect body for methods that typically have one
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const chunks = []

    // Pause the request to prevent data loss
    req.pause()

    req.on('data', (chunk) => {
      chunks.push(chunk)
    })

    req.on('end', () => {
      // Store the complete body
      const bodyBuffer = Buffer.concat(chunks)
      req.rawBody = bodyBuffer.toString('utf8')

      // Create a duplicate of the request body stream
      const s = new Readable()
      s._read = () => {} // Required for Readable streams
      s.push(bodyBuffer)
      s.push(null)

      // Replace the consumed stream with our new one for the proxy
      req.pipe = function (destination, options) {
        return s.pipe(destination, options)
      }

      // Continue with the request
      next()
    })

    // Resume the request to start receiving data
    req.resume()
    return // Don't call next() yet - wait for body
  }

  // For requests without body, continue immediately
  next()
})

// Set up proxy middleware
const proxyMiddleware = createProxyMiddleware({
  target: TARGET_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/': '/' // Remove base path
  },
  proxyTimeout: 60000, // 1 minute timeout
  timeout: 60000, // 1 minute timeout
  onError: (err, req, res) => {
    console.log(`Proxy error: ${err.message}`)

    // Handle proxy errors
    const requestData = {
      id:
        req.id ||
        Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers
      },
      error: {
        message: err.message,
        stack: err.stack
      }
    }

    // Add to history
    requestHistory.unshift(requestData)
    if (requestHistory.length > 100) {
      requestHistory.pop()
    }

    // Emit to all connected clients
    io.emit('proxyError', requestData)

    // Send error response
    res.writeHead(500, {
      'Content-Type': 'text/plain'
    })
    res.end(`Proxy Error: ${err.message}`)
  }
})

// Apply the proxy middleware
proxyApp.use('/', proxyMiddleware)

// Serve static files for the UI
uiApp.use(express.static(path.join(__dirname, '../public')))

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('New client connected')

  // Send the current request history to the new client
  socket.emit('requestHistory', requestHistory)
  console.log(
    `Sending request history to new client: ${requestHistory.length} items`
  )

  socket.on('disconnect', () => {
    console.log('Client disconnected')
  })

  // Add a handler for clearHistory event
  socket.on('clearHistory', () => {
    console.log('Clearing request history')
    requestHistory.length = 0
    io.emit('requestHistory', [])
  })
})

// Start the proxy server
proxyServer.listen(PORT, () => {
  console.log(`Proxy server listening on port ${PORT}`)
  console.log(`Forwarding requests to ${TARGET_URL}`)
})

// Start the UI server
uiServer.listen(UI_PORT, () => {
  console.log(`UI server listening on port ${UI_PORT}`)
  console.log(`Open http://localhost:${UI_PORT} to view the UI`)
})

// Handle graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...')
  
  // Close Socket.IO connections
  await new Promise(resolve => io.close(resolve))
  console.log('Socket.IO server closed')
  
  // Close HTTP servers
  await new Promise(resolve => uiServer.close(resolve))
  console.log('UI server closed')
  
  await new Promise(resolve => proxyServer.close(resolve))
  console.log('Proxy server closed')
  
  console.log('All servers closed, exiting process')
  process.exit(0)
}

// Listen for termination signals
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
