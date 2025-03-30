# HTTP Proxy Monitor

A Node.js-based HTTP proxy server with a real-time monitoring interface that allows you to inspect, debug, and analyze HTTP/HTTPS traffic between your client and target server.

## Features

- **Real-time Request Monitoring**: View incoming requests and their responses in real-time
- **Interactive UI**: Modern web interface for monitoring and debugging
- **Request Filtering**: Filter requests by method, status code, and search terms
- **Detailed Request/Response Inspection**: View headers, body, timing, and more
- **Error Tracking**: Monitor and debug proxy errors
- **Request History**: Maintains a history of the last 100 requests
- **WebSocket Support**: Real-time updates using Socket.IO
- **CORS Support**: Built-in CORS handling for both proxy and UI servers

## Quick Start with Docker

The fastest way to use HTTP Proxy Monitor is with Docker:

1. Pull and run the container:
```bash
docker run -p 8000:8000 -p 8080:8080 -e TARGET_URL=http://host.docker.internal:12434 ilopezluna/proxy-app
```

2. Open your browser and navigate to http://localhost:8080 to access the UI

3. Send requests through the proxy (important!):
```bash
# Example: Using curl to send a request through the proxy
curl http://localhost:8000/your/api/endpoint -H "Content-Type: application/json" -d '{"key": "value"}'
```

> **Important**: You must send requests to the proxy server (port 8000), not directly to your target service. The proxy will forward these requests to your target service and capture them for display in the UI.

### Docker Environment Variables

Customize the proxy behavior with these environment variables:

- `PORT`: Port for the proxy server (default: 8000)
- `UI_PORT`: Port for the UI server (default: 8080)
- `TARGET_URL`: URL to forward requests to (default: http://localhost:12434)

Example with custom settings:
```bash
docker run -p 9000:9000 -p 9090:9090 \
  -e PORT=9000 -e UI_PORT=9090 -e TARGET_URL=http://host.docker.internal:3000 \
  ilopezluna/proxy-app
```

### Docker Host Access

When running in Docker, you cannot use `localhost` or `127.0.0.1` as the `TARGET_URL` because these refer to the container itself, not your host machine:

- **macOS and Windows**: Use `host.docker.internal` to access your host machine
  ```bash
  docker run -p 8000:8000 -p 8080:8080 -e TARGET_URL=http://host.docker.internal:3000 ilopezluna/proxy-app
  ```

- **Linux**: Add `--add-host=host.docker.internal:host-gateway` to the docker run command
  ```bash
  docker run -p 8000:8000 -p 8080:8080 --add-host=host.docker.internal:host-gateway \
    -e TARGET_URL=http://host.docker.internal:3000 ilopezluna/proxy-app
  ```

## Usage Instructions

1. Start the proxy using Docker as described above

2. Open your browser and navigate to the UI server (default: http://localhost:8080)

3. **Important**: Configure your client application to use the proxy server (default: http://localhost:8000) instead of directly accessing your target server

4. The UI will automatically show:
   - Real-time request/response monitoring
   - Request history
   - Detailed request/response information
   - Error tracking
   - Filtering options

### Common Use Cases

#### API Debugging

Monitor API requests and responses during development:
```bash
# Start the proxy targeting your API server
docker run -p 8000:8000 -p 8080:8080 -e TARGET_URL=http://host.docker.internal:3000 ilopezluna/proxy-app

# Send requests through the proxy
curl http://localhost:8000/api/users -H "Authorization: Bearer token123"
```

#### Testing Webhooks

Debug webhook payloads from external services:
```bash
# Start the proxy targeting your webhook handler
docker run -p 8000:8000 -p 8080:8080 -e TARGET_URL=http://host.docker.internal:5000 ilopezluna/proxy-app

# Configure the external service to send webhooks to your proxy
# e.g., http://your-public-ip:8000/webhook
```

#### Monitoring Third-Party API Interactions

Inspect requests to external APIs:
```bash
# Start the proxy targeting an external API
docker run -p 8000:8000 -p 8080:8080 -e TARGET_URL=https://api.example.com ilopezluna/proxy-app

# Configure your application to use the proxy
# e.g., set HTTP_PROXY=http://localhost:8000 in your environment
```

## Local Development

If you prefer to run the proxy without Docker:

### Prerequisites

- Node.js 20.x or later
- npm (Node Package Manager)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ilopezluna/http-proxy-monitor.git
cd http-proxy-monitor
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
node server/index.js
```

The application will start with default settings:
- Proxy server: http://localhost:8000
- UI server: http://localhost:8080
- Target URL: http://localhost:12434

### Environment Variables

You can customize the application behavior using environment variables:

```bash
PORT=9000 UI_PORT=9090 TARGET_URL=http://api.example.com node server/index.js
```

## UI Features

- **Request List**: Shows all requests with method, URL, status, and timing
- **Request Details**: View detailed information about selected requests
- **Search**: Filter requests by URL, method, or status code
- **Method Filter**: Filter by HTTP method (GET, POST, PUT, etc.)
- **Status Filter**: Filter by response status code range (2xx, 3xx, 4xx, 5xx)
- **Clear History**: Reset the request history
- **Real-time Updates**: New requests appear instantly in the UI

## Security Considerations

- The proxy server is designed for development and debugging purposes
- Exercise caution when using in production environments
- Be mindful of sensitive data in request/response bodies
- Consider implementing authentication for the UI in production

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
