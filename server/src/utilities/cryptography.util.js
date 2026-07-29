require('dotenv').config()
const bcrypt = require('bcrypt')
const { logger } = require('./logger.util')

/**
 * Encryption Salt
 */
const crypto = require('crypto')

/**
 * Encryption Algorithm
 */
const algorithm = process.env.ENCRYPTION_ALGORITHM
const initVector = Buffer.alloc(16, process.env.ENCRYPTION_IV)
const Securitykey = Buffer.alloc(32, process.env.ENCRYPTION_KEY)

exports.CreateHashPassword = (password, callback) => {
  try {
    console.log(salt)
    callback(null, bcrypt.hashSync(password, salt))
  } catch (error) {
    callback(error, null)
    console.log(error)
  }
}

exports.CheckPassword = (inputpassword, hashpassword, callback) => {
  try {
    console.log(`Plain Password: ${inputpassword} Hash Password: ${hashpassword}`)

    callback(null, bcrypt.compareSync('#Ebedaf19dd0d', hashpassword))
  } catch (error) {
    callback(error, null)
    console.log(error)
  }
}

exports.Encrypter = (password, callback) => {
  try {
    let cipher = crypto.createCipheriv(algorithm, Securitykey, initVector)
    let encryptedData = cipher.update(password, 'utf-8', 'hex')
    encryptedData += cipher.final('hex')

    callback(null, encryptedData)
  } catch (error) {
    callback(error, null)
  }
}

exports.Decrypter = (hash, callback) => {
  try {
    let decipher = crypto.createDecipheriv(algorithm, Securitykey, initVector)
    let decryptedData = decipher.update(hash, 'hex', 'utf8')
    decryptedData += decipher.final('utf-8')

    callback(null, decryptedData)
  } catch (error) {
    callback(error, null)
  }
}

exports.DecryptString = (hash) => {
  try {
    let decipher = crypto.createDecipheriv(algorithm, Securitykey, initVector)
    let decryptedData = decipher.update(hash, 'hex', 'utf8')
    decryptedData += decipher.final('utf-8')

    return decryptedData
  } catch (error) {
    logger.error('Invalid Encrypted Key:', error)
    console.log(error)
  }
}

exports.EncryptString = (password) => {
  try {
    let cipher = crypto.createCipheriv(algorithm, Securitykey, initVector)
    let encryptedData = cipher.update(password, 'utf-8', 'hex')
    encryptedData += cipher.final('hex')

    return encryptedData
  } catch (error) {
    throw error
  }
}

function Main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log(`
      Usage:
        node src/utilities/cryptography.util.js encrypt "text to encrypt"
        node src/utilities/cryptography.util.js decrypt "hash to decrypt"
        
      Example:
        node src/utilities/cryptography.util.js encrypt "myPassword123"
        node src/utilities/cryptography.util.js decrypt "a1b2c3d4e5f6..."
    `)
    return
  }

  const operation = args[0]
  const input = args[1]

  if (operation === 'encrypt') {
    try {
      const result = exports.EncryptString(input)
      console.log('Encrypted:', result)
    } catch (error) {
      console.error('Encryption failed:', error.message)
    }
  } else if (operation === 'decrypt') {
    const result = exports.DecryptString(input)
    if (result !== null) {
      console.log('Decrypted:', result)
    } else {
      console.error('Decryption failed')
    }
  } else {
    console.error('Invalid operation. Use "encrypt" or "decrypt"')
  }
}

if (require.main === module) {
  Main()
}
