const fs = require('fs')
const path = require('path')

const modelGroup = process.argv[2]
const modelEntity = process.argv[3]

if (!modelGroup || !modelEntity) {
  console.error(
    '❌ Please provide a Model Group and Entity (e.g., npm run make:feature Master Company)',
  )
  process.exit(1)
}

if (/^[a-z]/.test(modelGroup) || /^[a-z]/.test(modelEntity)) {
  console.error(`❌ Case Error: Model Group and Entity must start with a capital letter.`)
  process.exit(1)
}

const baseFileName = `${modelGroup.toLowerCase()}-${modelEntity.toLowerCase()}`
const camelName = `${modelGroup.toLowerCase()}${modelEntity}`
const pascalName = `${modelGroup}${modelEntity}`
const routerName = `${camelName}Router`

const modelsDir = path.join(__dirname, '../database/models')
const controllersDir = path.join(__dirname, '../controllers')
const routesDir = path.join(__dirname, '../routes')
const startupFile = path.join(__dirname, '../startup/routes.startup.js')

const modelPath = path.join(modelsDir, `${modelGroup}.js`)
const controllerPath = path.join(controllersDir, `${baseFileName}.controller.js`)
const routePath = path.join(routesDir, `${baseFileName}.routes.js`)

if (!fs.existsSync(modelPath)) {
  console.error(`❌ Model file not found at ${modelPath}`)
  process.exit(1)
}

const loadedModels = require(modelPath)
const modelDef = loadedModels[modelGroup]?.[modelEntity]

if (!modelDef) {
  console.error(`❌ Entity '${modelEntity}' not found in ${modelGroup}.js`)
  process.exit(1)
}

const { cols, pk, table } = modelDef
const colKeys = Object.keys(cols)
const pkKey = colKeys.find((key) => cols[key] === pk) || 'id'

// --- SYSTEM FIELDS FILTERING ---
const systemFields = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'isActive']

const swaggerKeys = colKeys.filter((key) => !systemFields.includes(key))

const editableKeys = colKeys.filter((key) => key !== pkKey && !systemFields.includes(key))
// -----------------------------------

const swaggerParams = swaggerKeys
  .map((key) => {
    return `  //   #swagger.parameters['${key}'] = {
  //     in: 'formData',
  //     type: '${key.toLowerCase().includes('is') ? 'boolean' : 'string'}',
  //     required: false,
  //     description: '${modelEntity} ${key}'
  //   }`
  })
  .join('\n')

const updateLogic = editableKeys
  .map((key) => {
    return `      if (${key} !== undefined) updateData[${modelGroup}.${modelEntity}.cols.${key}] = ${key}`
  })
  .join('\n')

const insertLogic = editableKeys
  .map((key) => {
    return `          [${modelGroup}.${modelEntity}.cols.${key}]: ${key},`
  })
  .join('\n')

const controllerTemplate = `const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { ${modelGroup} } = require('../database/models/${modelGroup}')
const SQL = new SQLQueryBuilder()

/**
 * @name Upsert${pascalName}
 * @description Update and insert ${modelEntity}
 */
const upsert${pascalName} = async (req, res) => {
  // #swagger.tags = ['${modelEntity}']
  // #swagger.description = 'Upsert ${modelEntity}'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded']
  /* 
${swaggerParams}
  */
  
  // Destructure only the non-system keys from req.body
  const { ${swaggerKeys.join(', ')} } = req.body
  
  let query

  try {
    if (${pkKey}) {
      let updateData = {}
${updateLogic}

      if (${modelGroup}.${modelEntity}.cols.updatedAt) updateData[${modelGroup}.${modelEntity}.cols.updatedAt] = new Date()
      if (${modelGroup}.${modelEntity}.cols.updatedBy) updateData[${modelGroup}.${modelEntity}.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(${modelGroup}.${modelEntity})
          .update(updateData)
          .where(${modelGroup}.${modelEntity}.pk, ${pkKey})
          .build()
      }
    } else {
      // Basic validation for inserts (modify as needed)
      if (!${editableKeys[0]}) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(${modelGroup}.${modelEntity})
        .insert({
          [${modelGroup}.${modelEntity}.pk]: uuidv4(),
${insertLogic}
          ...( ${modelGroup}.${modelEntity}.cols.companyId ? { [${modelGroup}.${modelEntity}.cols.companyId]: companyId } : {} ),
          ...( ${modelGroup}.${modelEntity}.cols.createdBy ? { [${modelGroup}.${modelEntity}.cols.createdBy]: userId } : {} ),
          ...( ${modelGroup}.${modelEntity}.cols.createdAt ? { [${modelGroup}.${modelEntity}.cols.createdAt]: new Date() } : {} ),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (${pkKey} && result.affectedRows === 0) {
      return res.status(404).json({ message: '${modelEntity} not found' })
    }

    res.status(200).json({
      message: ${pkKey} ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error processing ${modelEntity}' })
  }
}

/**
 * @name get${pascalName}
 * @description Get all ${modelEntity} records
 */
const get${pascalName} = async (req, res) => {
  // #swagger.tags = ['${modelEntity}']
  // #swagger.description = 'Get all ${modelEntity} records'

  try {
    const { sql, bindings } = SQL.model(${modelGroup}.${modelEntity})
      .select([
        ${colKeys.map((key) => `${modelGroup}.${modelEntity}.cols.${key}`).join(',\n        ')}
      ])
      // .where(${modelGroup}.${modelEntity}.cols.companyId, companyId) // Uncomment if company-scoped
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving ${modelEntity} records' })
  }
}

module.exports = {
  get${pascalName},
  upsert${pascalName}
}
`

const routeTemplate = `const express = require('express')
const { get${pascalName}, upsert${pascalName} } = require('../controllers/${baseFileName}.controller')

const ${routerName} = express.Router()

${routerName}.get('/', get${pascalName})
${routerName}.post('/', upsert${pascalName})

module.exports = {
  ${routerName},
}
`

try {
  if (fs.existsSync(controllerPath) || fs.existsSync(routePath)) {
    console.error(`❌ Feature '${baseFileName}' already exists! Aborting to prevent overwrite.`)
    process.exit(1)
  }

  fs.writeFileSync(controllerPath, controllerTemplate, 'utf8')
  console.log(`✅ Created Controller: src/controllers/${baseFileName}.controller.js`)

  fs.writeFileSync(routePath, routeTemplate, 'utf8')
  console.log(`✅ Created Route: src/routes/${baseFileName}.routes.js`)

  let startupContent = fs.readFileSync(startupFile, 'utf8')

  const importStatement = `const { ${routerName} } = require('../routes/${baseFileName}.routes')\n`
  const lastRequireIndex = startupContent.lastIndexOf('require')

  if (lastRequireIndex !== -1) {
    const endOfLineIndex = startupContent.indexOf('\n', lastRequireIndex)
    const insertPos = endOfLineIndex !== -1 ? endOfLineIndex + 1 : startupContent.length
    startupContent =
      startupContent.slice(0, insertPos) + importStatement + startupContent.slice(insertPos)
  } else {
    startupContent = importStatement + '\n' + startupContent
  }

  const useRegex = /(const\s+initRoutes\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?)(\n\})/
  const useStatement = `  app.use('/${baseFileName}', ${routerName})`
  startupContent = startupContent.replace(useRegex, `$1\n${useStatement}$2`)

  fs.writeFileSync(startupFile, startupContent, 'utf8')
  console.log(`💉 Injected '${baseFileName}' into src/startup/routes.startup.js`)

  console.log(
    `\n🎉 Scaffold complete! Try hitting http://${process.env.SERVER_HOST}:${process.env.VITE_SERVER_API_PORT}/${baseFileName}`,
  )
} catch (error) {
  console.error('❌ Error generating feature:', error)
}
