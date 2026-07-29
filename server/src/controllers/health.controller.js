const os = require('os')
const { checkConnection } = require('../database/utilities/queries.util')
const { formatMemoryUsage, formatTime } = require('../utilities/helper.util')
const env = require('../database/config/env')

const requestCounts = {
  GET: 0,
  POST: 0,
  PUT: 0,
  PATCH: 0,
  DELETE: 0,
  TOTAL: 0,
}

const trackRequestStats = (app) => {
  app.use((req, res, next) => {
    const method = req.method.toUpperCase()

    if (requestCounts.hasOwnProperty(method)) {
      requestCounts[method]++
      requestCounts.TOTAL++
    }

    next()
  })
}

const getRequestStats = () => {
  return { ...requestCounts }
}

const getSystemStats = async () => {
  const dbCheckResult = await checkConnection()
  const rawMemory = process.memoryUsage()

  const data = {
    status: 'Ok',
    uptime: formatTime(process.uptime()),
    date: new Date(),
    version: process.env.APP_VERSION || 'x.x.x',
    environment: process.env.VITE_ENV || 'development',
    cpuLoad: os.loadavg(),
    memoryUsage: formatMemoryUsage(rawMemory),
    dbStatus: dbCheckResult.status,
    dbLatency: dbCheckResult.latency,
    dbDetails: dbCheckResult.details,
  }

  const isHealthy = data.dbStatus !== 'Error'
  data.status = isHealthy ? 'Ok' : 'Degraded'

  return data
}

const getHealth = async (req, res, next) => {
  try {
    const data = await getSystemStats()
    const statusCode = data.status === 'Ok' ? 200 : 503

    return res.status(statusCode).json(data)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Server error' })
  }
}

// Export the new middleware and getter
module.exports = {
  getHealth,
  getSystemStats,
  trackRequestStats,
  getRequestStats,
}
