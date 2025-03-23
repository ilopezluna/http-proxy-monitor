// Connect to Socket.IO server
const socket = io()

// DOM Elements
const requestList = document.getElementById('request-list')
const requestDetails = document.getElementById('request-details')
const searchInput = document.getElementById('search-input')
const clearSearchBtn = document.getElementById('clear-search')
const methodFilter = document.getElementById('method-filter')
const statusFilter = document.getElementById('status-filter')
const clearHistoryBtn = document.getElementById('clear-history')

// Templates
const requestItemTemplate = document.getElementById('request-item-template')
const requestDetailsTemplate = document.getElementById(
  'request-details-template'
)

// Store all requests
let allRequests = []
let selectedRequestId = null

// Initialize the app
function init() {
  // Set up event listeners
  searchInput.addEventListener('input', filterRequests)
  clearSearchBtn.addEventListener('click', clearSearch)
  methodFilter.addEventListener('change', filterRequests)
  statusFilter.addEventListener('change', filterRequests)
  clearHistoryBtn.addEventListener('click', clearHistory)

  // Socket.IO event listeners
  socket.on('connect', () => {
    console.log('Connected to server')
  })

  socket.on('requestHistory', (history) => {
    allRequests = history
    renderRequestList()
  })

  socket.on('newRequest', (request) => {
    // Add to the beginning of the array
    allRequests.unshift(request)

    // Limit to 100 requests
    if (allRequests.length > 100) {
      allRequests.pop()
    }

    renderRequestList()
  })

  socket.on('proxyError', (error) => {
    // Add to the beginning of the array
    allRequests.unshift(error)

    // Limit to 100 requests
    if (allRequests.length > 100) {
      allRequests.pop()
    }

    renderRequestList()
  })
}

// Render the request list
function renderRequestList() {
  // Clear the list
  requestList.innerHTML = ''

  // Filter requests based on search and filters
  const filteredRequests = filterRequestList()

  // Render each request
  filteredRequests.forEach((request) => {
    const requestItem = createRequestItem(request)
    requestList.appendChild(requestItem)
  })

  // If we have a selected request, make sure it's still selected
  if (selectedRequestId) {
    const selectedItem = requestList.querySelector(
      `[data-id="${selectedRequestId}"]`
    )
    if (selectedItem) {
      selectedItem.classList.add('selected')
    } else {
      // If the selected request is no longer in the list, clear the details
      showEmptyState()
    }
  }
}

// Create a request item element
function createRequestItem(request) {
  const template = requestItemTemplate.content.cloneNode(true)
  const requestItem = template.querySelector('.request-item')

  // Set data attribute for identification
  requestItem.dataset.id = request.id

  // Set method
  const methodEl = requestItem.querySelector('.request-method')
  methodEl.textContent = request.request?.method || 'ERR'
  methodEl.classList.add(
    `method-${(request.request?.method || 'err').toLowerCase()}`
  )

  // Set URL
  requestItem.querySelector('.request-url').textContent =
    request.request?.url || 'Error'

  // Set status
  const statusEl = requestItem.querySelector('.request-status')
  if (request.error) {
    statusEl.textContent = 'Error'
    statusEl.classList.add('status-5xx')
  } else {
    statusEl.textContent = request.response?.statusCode || ''
    const statusClass = `status-${Math.floor((request.response?.statusCode || 0) / 100)}xx`
    statusEl.classList.add(statusClass)
  }

  // Set time
  const time = new Date(request.timestamp)
  requestItem.querySelector('.request-time').textContent =
    time.toLocaleTimeString()

  // Set duration
  if (request.duration) {
    requestItem.querySelector('.request-duration').textContent =
      `${request.duration}ms`
  }

  // Add click event
  requestItem.addEventListener('click', () => {
    // Deselect previous
    const selected = requestList.querySelector('.selected')
    if (selected) {
      selected.classList.remove('selected')
    }

    // Select this one
    requestItem.classList.add('selected')
    selectedRequestId = request.id

    // Show details
    showRequestDetails(request)
  })

  return requestItem
}

// Helper function to try parsing and beautifying JSON
function tryBeautifyJSON(content) {
  if (!content) return 'No body'

  try {
    // If it's already an object, stringify it
    if (typeof content === 'object') {
      return JSON.stringify(content, null, 2)
    }

    // Try to parse string as JSON
    const parsed = JSON.parse(content)
    return JSON.stringify(parsed, null, 2)
  } catch (e) {
    // If not valid JSON, return as is
    console.error(e)
    return content
  }
}

// Show request details
function showRequestDetails(request) {
  // Clear details
  requestDetails.innerHTML = ''

  // Clone template
  const template = requestDetailsTemplate.content.cloneNode(true)

  // Set title
  template.querySelector('.details-title').textContent =
    `${request.request?.method || 'ERROR'} ${request.request?.url || ''}`

  // Set time
  const time = new Date(request.timestamp)
  template.querySelector('.details-time').textContent = time.toLocaleString()

  // Set duration
  if (request.duration) {
    template.querySelector('.details-duration').textContent =
      `${request.duration}ms`
  }

  // Request details
  if (request.request) {
    template.querySelector('.details-method').textContent =
      request.request.method
    template.querySelector('.details-url').textContent = request.request.url

    // Headers
    const requestHeaders = template.querySelector('.request-headers')
    Object.entries(request.request.headers || {}).forEach(([name, value]) => {
      const headerItem = document.createElement('div')
      headerItem.classList.add('header-item')

      const headerName = document.createElement('span')
      headerName.classList.add('header-name')
      headerName.textContent = name + ':'

      const headerValue = document.createElement('span')
      headerValue.classList.add('header-value')
      headerValue.textContent = value

      headerItem.appendChild(headerName)
      headerItem.appendChild(headerValue)
      requestHeaders.appendChild(headerItem)
    })

    // Body
    const requestBody = template.querySelector('.request-body')
    if (request.request.body) {
      requestBody.textContent = tryBeautifyJSON(request.request.body)
    } else {
      requestBody.textContent = 'No body'
    }
  }

  // Response details
  if (request.response) {
    template.querySelector('.details-status').textContent =
      `${request.response.statusCode} ${request.response.statusMessage || ''}`

    // Headers
    const responseHeaders = template.querySelector('.response-headers')
    Object.entries(request.response.headers || {}).forEach(([name, value]) => {
      const headerItem = document.createElement('div')
      headerItem.classList.add('header-item')

      const headerName = document.createElement('span')
      headerName.classList.add('header-name')
      headerName.textContent = name + ':'

      const headerValue = document.createElement('span')
      headerValue.classList.add('header-value')
      headerValue.textContent = value

      headerItem.appendChild(headerName)
      headerItem.appendChild(headerValue)
      responseHeaders.appendChild(headerItem)
    })

    // Body
    const responseBody = template.querySelector('.response-body')
    if (request.response.body) {
      responseBody.textContent = tryBeautifyJSON(request.response.body)
    } else {
      responseBody.textContent = 'No body'
    }
  } else if (request.error) {
    // Show error
    template.querySelector('.details-status').textContent = 'Error'
    template.querySelector('.response-body').textContent =
      request.error.message || 'Unknown error'
  }

  // Set up tabs
  const tabButtons = template.querySelectorAll('.tab-button')
  const tabPanes = template.querySelectorAll('.tab-pane')

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      // Deactivate all tabs
      tabButtons.forEach((btn) => btn.classList.remove('active'))
      tabPanes.forEach((pane) => pane.classList.remove('active'))

      // Activate clicked tab
      button.classList.add('active')
      const tabId = button.dataset.tab
      const pane = document.getElementById(`${tabId}-pane`)
      if (pane) {
        pane.classList.add('active')
      }
    })
  })

  // Add to DOM
  requestDetails.appendChild(template)
}

// Show empty state
function showEmptyState() {
  requestDetails.innerHTML =
    '<div class="empty-state"><p>Select a request to view details</p></div>'
  selectedRequestId = null
}

// Filter the request list based on search and filters
function filterRequestList() {
  const searchTerm = searchInput.value.toLowerCase()
  const methodValue = methodFilter.value
  const statusValue = statusFilter.value

  return allRequests.filter((request) => {
    // Search filter
    if (searchTerm) {
      const url = request.request?.url?.toLowerCase() || ''
      const method = request.request?.method?.toLowerCase() || ''
      const status = request.response?.statusCode?.toString() || ''

      if (
        !url.includes(searchTerm) &&
        !method.includes(searchTerm) &&
        !status.includes(searchTerm)
      ) {
        return false
      }
    }

    // Method filter
    if (methodValue && request.request?.method !== methodValue) {
      return false
    }

    // Status filter
    if (statusValue) {
      const statusCode = request.response?.statusCode || 0
      const statusPrefix = Math.floor(statusCode / 100)
      if (statusPrefix.toString() !== statusValue) {
        return false
      }
    }

    return true
  })
}

// Filter requests based on search and filters
function filterRequests() {
  renderRequestList()
}

// Clear search
function clearSearch() {
  searchInput.value = ''
  methodFilter.value = ''
  statusFilter.value = ''
  filterRequests()
}

// Clear history
function clearHistory() {
  allRequests = []
  renderRequestList()
  showEmptyState()
  socket.emit('clearHistory')
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init)
