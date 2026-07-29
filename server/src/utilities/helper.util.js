/**
 * Helper function to convert bytes to a human-readable format (MB, GB).
 * @param {number} bytes - The number of bytes to convert.
 * @returns {string} - Formatted string (e.g., "72.8 MB").
 */
const formatBytes = (bytes) => {
  // Defined as a local function 'const'
  if (bytes === 0) {
    return '0 Bytes'
  }
  const k = 1024
  const dm = 1 // Decimal places
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Helper function to convert seconds to HH:MM:SS format.
 * @param {number} seconds - The number of seconds (e.g., from process.uptime()).
 * @returns {string} - Formatted string (e.g., "00:14:55").
 */
const formatTime = (seconds) => {
  const totalSeconds = Math.floor(seconds)

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  const pad = (num) => num.toString().padStart(2, '0')

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
}

/**
 * Helper function to format all memory usage metrics from bytes to MB/GB.
 * @param {object} memoryUsage - The object returned by process.memoryUsage().
 * @returns {object} - An object with memory metrics formatted as strings.
 */
const formatMemoryUsage = (memoryUsage) => {
  return {
    rss: formatBytes(memoryUsage.rss),
    heapTotal: formatBytes(memoryUsage.heapTotal),
    heapUsed: formatBytes(memoryUsage.heapUsed),
    external: formatBytes(memoryUsage.external),
    arrayBuffers: formatBytes(memoryUsage.arrayBuffers),
  }
}

module.exports = {
  formatTime,
  formatMemoryUsage,
}
