require('dotenv').config()
const swaggerUi = require('swagger-ui-express')
const swaggerAutogen = require('swagger-autogen')()
const path = require('path')
const fs = require('fs')

const initDocs = async (app) => {
  const outputFilePath = path.join(__dirname, '../../src/docs/swagger-output.json')
  const routesDir = path.join(__dirname, '../../src/routes')
  const modelsDir = path.join(__dirname, '../../src/database/models')
  const tempLoaderPath = path.join(__dirname, '../utilities/swagger-temp-loader.util.js')

  const routeFiles = fs.readdirSync(routesDir).filter((file) => file.endsWith('.routes.js'))
  let fileContent = `const express = require('express'); const app = express();`
  routeFiles.forEach((file) => {
    const prefix = '/' + file.split('.')[0]
    const relativePath = `../routes/${file}`.replace(/\\/g, '/')
    fileContent += `\napp.use('${prefix}', require('${relativePath}'));`
  })
  fileContent += `\nmodule.exports = app;`
  fs.writeFileSync(tempLoaderPath, fileContent)
  const relativeLoaderPath = './' + path.relative(process.cwd(), tempLoaderPath).replace(/\\/g, '/')

  const definitions = {}
  if (fs.existsSync(modelsDir)) {
    const modelFiles = fs.readdirSync(modelsDir).filter((file) => file.endsWith('.js'))
    modelFiles.forEach((file) => {
      const filePath = path.join(modelsDir, file)
      const FileExport = require(filePath)

      const generateSchema = (modelName, modelConfig) => {
        definitions[modelName] = { type: 'object', properties: {} }
        if (modelConfig.cols) {
          Object.keys(modelConfig.cols).forEach((colKey) => {
            definitions[modelName].properties[colKey] = { type: 'string', example: 'any' }
          })
        }
        if (modelConfig.insert && modelConfig.cols) {
          definitions[`${modelName}Insert`] = { type: 'object', properties: {} }
          modelConfig.insert.forEach((colPath) => {
            const cleanKey = Object.keys(modelConfig.cols).find(
              (k) => modelConfig.cols[k] === colPath,
            )
            if (cleanKey)
              definitions[`${modelName}Insert`].properties[cleanKey] = {
                type: 'string',
                example: 'any',
              }
          })
        }
      }

      Object.keys(FileExport).forEach((key) => {
        const value = FileExport[key]
        if (value.cols) generateSchema(key, value)
        else if (typeof value === 'object') {
          Object.keys(value).forEach((subKey) => {
            if (value[subKey] && value[subKey].cols) generateSchema(subKey, value[subKey])
          })
        }
      })
    })
  }

  definitions['UniversalError'] = {
    type: 'object',
    properties: {
      status: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Resource not found or Server Error' },
    },
  }

  const title = process.env.DOCS_TITLE || 'Server API Documentation'
  const description = process.env.DOCS_DESCRIPTION || 'Auto-generated docs'

  const doc = {
    info: { title: title, description: 'Auto-generated docs' },
    host: `${process.env._HTTP_HOST || 'localhost'}:${process.env.VITE_SERVER_API_PORT || 3000}`,
    schemes: ['http'],
    definitions: definitions,
  }

  try {
    await swaggerAutogen(outputFilePath, [relativeLoaderPath], doc)

    const swaggerJson = require(outputFilePath)

    Object.keys(swaggerJson.paths).forEach((pathKey) => {
      const pathItem = swaggerJson.paths[pathKey]

      Object.keys(pathItem).forEach((method) => {
        const operation = pathItem[method]

        if (!operation.responses) operation.responses = {}

        if (!operation.responses['401']) {
          operation.responses['401'] = {
            description: 'Unauthorized',
            schema: { $ref: '#/definitions/UniversalError' },
          }
        }

        if (!operation.responses['404']) {
          operation.responses['404'] = {
            description: 'Resource Not Found',
            schema: { $ref: '#/definitions/UniversalError' },
          }
        }

        if (!operation.responses['500']) {
          operation.responses['500'] = {
            description: 'Internal Server Error',
            schema: { $ref: '#/definitions/UniversalError' },
          }
        }
      })
    })

    fs.writeFileSync(outputFilePath, JSON.stringify(swaggerJson, null, 2))
  } catch (err) {
    console.error('❌ Swagger Gen Failed:', err)
  }

  if (fs.existsSync(outputFilePath)) {
    delete require.cache[require.resolve(outputFilePath)]
    const swaggerFile = require(outputFilePath)
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile))
  }
}

module.exports = { initDocs }
