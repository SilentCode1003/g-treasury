const fs = require('fs')
const path = require('path')

const migrationsDir = path.join(__dirname, '../', 'migrations')
const modelsDir = path.join(__dirname, '../models')

console.log(`📂 Scanning for migrations in: "${migrationsDir}"`)

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true })
}

const getAllFiles = (dirPath, arrayOfFiles = []) => {
  const files = fs.readdirSync(dirPath)

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file)
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles)
    } else {
      arrayOfFiles.push(fullPath)
    }
  })

  return arrayOfFiles
}

const databaseSchema = {}

try {
  const allFiles = getAllFiles(migrationsDir)

  const migrationFiles = allFiles
    .filter((f) => f.endsWith('.js'))
    .sort((a, b) => {
      const fileA = path.basename(a)
      const fileB = path.basename(b)
      return fileA.localeCompare(fileB)
    })

  if (migrationFiles.length === 0) {
    console.warn('⚠️  No .js files found in migrations folders!')
  }

  migrationFiles.forEach((fullPath) => {
    try {
      processMigrationState(fullPath, databaseSchema)
    } catch (error) {
      console.error(`  ❌ Error parsing ${path.basename(fullPath)}:`, error.message)
    }
  })

  const groupedModels = {}

  for (const [tableName, columns] of Object.entries(databaseSchema)) {
    if (Object.keys(columns).length === 0) continue

    const prefix = detectPrefix(Object.keys(columns))
    const prefix_ = prefix ? `${prefix}_` : ''

    const selectColumns = []
    const cols = {}
    const insertColumns = []
    let primaryKey = null

    Object.entries(columns).forEach(([name, def]) => {
      if (prefix_ && !name.startsWith(prefix_)) return

      const cleanName = prefix_ ? name.slice(prefix_.length) : name
      const isAuto = /autoIncrement\s*:\s*true/i.test(def)
      const isPk = /primaryKey\s*:\s*true/i.test(def)
      const isVirtual = def.includes('Sequelize.VIRTUAL')
      const isDate = /Sequelize\.DATE/.test(def) || /type\s*:\s*Sequelize\.DATE/.test(def)

      const isExcludedName = [
        'created_at',
        'updated_at',
        'deleted_at',
        'createdDate',
        'updatedDate',
        'isActive',
      ].includes(cleanName)

      selectColumns.push(name)
      cols[cleanName] = name

      const shouldInsert = !isAuto && !isVirtual && !isDate && !isExcludedName

      if (shouldInsert) insertColumns.push(name)
      if (isPk) primaryKey = name
    })

    const parts = tableName.split('_')
    const baseName = normalizeBaseName(parts[0])

    if (!groupedModels[baseName]) groupedModels[baseName] = {}

    let shortKey = tableName.replace(new RegExp(`^${baseName}_?`), '')
    if (!shortKey) shortKey = tableName
    const modelKey = toPascalCase(shortKey)

    groupedModels[baseName][modelKey] = {
      table: tableName,
      pk: primaryKey,
      prefix,
      cols,
      select: selectColumns,
      insert: insertColumns,
    }
    console.log(`  ✅ Processed: ${tableName} -> ${modelKey}`)
  }

  const modelGroups = Object.entries(groupedModels)
  if (modelGroups.length === 0) {
    console.error('\n❌ No models were extracted. Check your file paths.')
  } else {
    modelGroups.forEach(([baseName, models]) => {
      const capitalizedBase = capitalizeFirst(baseName)
      const fileName = `${capitalizedBase}.js`

      let content = `/**\n * ⚠️ AUTO-GENERATED FILE - DO NOT EDIT MANUALLY\n */\n\n`

      Object.entries(models).forEach(([key, model]) => {
        const typeName = key + 'Cols'
        content += `/**\n * @typedef {Object} ${typeName}\n`

        Object.entries(model.cols).forEach(([colKey, colVal]) => {
          content += ` * @property {'${colVal}'} ${colKey}\n`
        })

        content += ` */\n\n`
      })

      content += `const ${capitalizedBase} = {\n`

      for (const [modelKey, modelObj] of Object.entries(models)) {
        const typeName = modelKey + 'Cols'
        const serialized = serializeObjectWithDocs(modelObj, typeName)
        content += `  ${modelKey}: ${serialized},\n`
      }

      content += `};\n\nexports.${capitalizedBase} = ${capitalizedBase};`

      const filePath = path.join(modelsDir, fileName)
      fs.writeFileSync(filePath, content, 'utf-8')
      console.log(`🚀 Generated: ${fileName}`)
    })
  }
} catch (err) {
  console.error(`❌ Critical Error reading migrations directory: ${err.message}`)
}

function processMigrationState(migrationPath, schema) {
  let code = fs.readFileSync(migrationPath, 'utf8')
  code = code.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1')

  const upMatch = code.match(/(?:async\s+)?up\s*[:\(]/)
  const downMatch = code.match(/(?:async\s+)?down\s*[:\(]/)

  if (upMatch && downMatch && upMatch.index < downMatch.index) {
    code = code.substring(upMatch.index, downMatch.index)
  } else if (upMatch) {
    code = code.substring(upMatch.index)
  } else if (downMatch) {
    code = code.substring(0, downMatch.index)
  }

  let match

  const createRegex = /createTable\(\s*['"`]([\w-]+)['"`]\s*,/g
  while ((match = createRegex.exec(code)) !== null) {
    const tableName = match[1]
    const openBracePos = code.indexOf('{', match.index)
    if (openBracePos !== -1) {
      const columnsBody = extractBalancedBlock(code, openBracePos)
      if (columnsBody) {
        if (!schema[tableName]) schema[tableName] = {}
        const rawColumns = splitByTopLevelComma(columnsBody)
        rawColumns.forEach((colStr) => {
          const colonIndex = colStr.indexOf(':')
          if (colonIndex !== -1) {
            const name = colStr.substring(0, colonIndex).trim().replace(/['"`]/g, '')
            const def = colStr.substring(colonIndex + 1).trim()
            schema[tableName][name] = def
          }
        })
      }
    }
  }

  const addRegex = /addColumn\(\s*['"`]([\w-]+)['"`]\s*,\s*['"`]([\w-]+)['"`]\s*,/g
  while ((match = addRegex.exec(code)) !== null) {
    const tableName = match[1]
    const columnName = match[2]
    if (schema[tableName]) {
      const openBracePos = code.indexOf('{', match.index)
      if (openBracePos !== -1) {
        const def = extractBalancedBlock(code, openBracePos)
        if (def) schema[tableName][columnName] = def
      }
    }
  }

  const changeRegex = /changeColumn\(\s*['"`]([\w-]+)['"`]\s*,\s*['"`]([\w-]+)['"`]\s*,/g
  while ((match = changeRegex.exec(code)) !== null) {
    const tableName = match[1]
    const columnName = match[2]
    if (schema[tableName]) {
      const openBracePos = code.indexOf('{', match.index)
      if (openBracePos !== -1) {
        const def = extractBalancedBlock(code, openBracePos)
        if (def) schema[tableName][columnName] = def
      }
    }
  }

  const removeRegex = /removeColumn\(\s*['"`]([\w-]+)['"`]\s*,\s*['"`]([\w-]+)['"`]/g
  while ((match = removeRegex.exec(code)) !== null) {
    const tableName = match[1]
    const columnName = match[2]
    if (schema[tableName] && schema[tableName][columnName]) {
      delete schema[tableName][columnName]
    }
  }

  const dropRegex = /dropTable\(\s*['"`]([\w-]+)['"`]/g
  while ((match = dropRegex.exec(code)) !== null) {
    const tableName = match[1]
    if (schema[tableName]) {
      delete schema[tableName]
    }
  }
}

function extractBalancedBlock(str, startIndex) {
  let depth = 0
  let endIndex = -1
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '{') depth++
    else if (str[i] === '}') depth--
    if (depth === 0) {
      endIndex = i
      break
    }
  }
  if (endIndex === -1) return null
  return str.substring(startIndex + 1, endIndex)
}

function splitByTopLevelComma(str) {
  const parts = []
  let depth = 0
  let lastIndex = 0
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    if (char === '{' || char === '[') depth++
    else if (char === '}' || char === ']') depth--
    else if (char === ',' && depth === 0) {
      const part = str.substring(lastIndex, i).trim()
      if (part) parts.push(part)
      lastIndex = i + 1
    }
  }
  const lastPart = str.substring(lastIndex).trim()
  if (lastPart) parts.push(lastPart)
  return parts
}

function serializeObjectWithDocs(obj, typeName) {
  let str = '{\n'
  const indent = '    '
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'cols') str += `${indent}/** @type {${typeName}} */\n`
    str += `${indent}${key}: ${serializeObject(value, 4)},\n`
  }
  str += '  }'
  return str
}

function serializeObject(obj, indentLevel = 2) {
  const pad = ' '.repeat(indentLevel)
  if (Array.isArray(obj)) {
    const items = obj.map((v) => (typeof v === 'string' ? `'${v}'` : v)).join(', ')
    return `[${items}]`
  }
  if (typeof obj === 'object' && obj !== null) {
    let str = '{\n'
    for (const [k, v] of Object.entries(obj)) {
      str += `${pad}  ${k}: ${serializeObject(v, indentLevel + 2)},\n`
    }
    str += `${pad}}`
    return str
  }
  return typeof obj === 'string' ? `'${obj}'` : String(obj)
}

function detectPrefix(cols) {
  if (cols.length < 1) return ''
  const first = cols[0].split('_')
  return first.length > 1 ? first[0] : ''
}

function normalizeBaseName(name) {
  return name.endsWith('s') ? name.slice(0, -1) : name
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function toPascalCase(str) {
  return str.replace(/_(\w)/g, (m, c) => c.toUpperCase()).replace(/^\w/, (c) => c.toUpperCase())
}
