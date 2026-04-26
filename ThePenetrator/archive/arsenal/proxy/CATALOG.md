# HTTP/HTTPS Interception Proxy (hoxy)
# Source: C:\Users\natha\v4w_website\hoxy

## OVERVIEW
Node.js HTTP/HTTPS proxy with full request/response interception,
DOM manipulation, TLS spoofing, and middleware chain support.

## CORE CLASSES

### Proxy (src/proxy.js)
- Main server class, created via `createServer(opts)`
- Intercept phases: request → request-sent → response
- Handler types: $ (DOM/cheerio parsing), json, params, buffer, string
- Features: route pattern matching, request throttling (stream-throttle)
- TLS: SNISpoofer for HTTPS interception (man-in-the-middle capable)

### Request (src/request.js) extends Body
- Properties: protocol, hostname, port, method, path, query, headers, body
- URL manipulation: getters/setters for full URL construction
- Validation: protocol whitelist, non-entity method filtering

### Response (src/response.js) extends Body
- Properties: statusCode (default 200), headers, httpVersion, body
- Phase control: prevents writes during response phase
- Source copying: _setHttpSource() from native Node response

### Body (src/body.js) — Base Class
- Shared payload handling for Request and Response
- Buffer management, content type detection

## UTILITY MODULES
- buffer-reader.js — Buffer streaming
- chunker.js — Chunk-based data handling
- streams.js — Stream utilities
- cycle.js — Request/response lifecycle
- dom-reader.js — HTML DOM parsing (cheerio)
- is-xml.js — XML content detection
- json-reader.js — JSON payload parsing
- logger.js — Logging system
- param-reader.js — Query string parsing
- sni-spoofer.js — TLS/SNI spoofing for HTTPS interception
- task.js — Task scheduling
- url-path.js — URL manipulation
- wait.js — Async wait utilities

## CAPABILITIES
1. Intercept and modify ANY HTTP/HTTPS request or response
2. Parse and modify DOM (HTML), JSON, query params in-flight
3. TLS spoofing — intercept HTTPS without cert warnings (with CA cert)
4. Request throttling — rate limit outbound requests
5. Route matching — target specific URLs/patterns
6. Middleware chain — stack multiple handlers per phase

## AGENT USE CASE
Wire as a proxy layer between agents and target APIs.
Agent → hoxy → modify headers/auth/payload → target service → hoxy → parse response → agent
