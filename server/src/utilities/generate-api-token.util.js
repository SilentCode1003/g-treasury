require('dotenv').config()
const jwt = require('jsonwebtoken')

const name = process.argv[2] || 'api-integration'

const jwtSecret = process.env.SECRET_KEY || process.env._SECRET_KEY

if (!jwtSecret) {
  console.error('SECRET_KEY is not defined in the environment. Cannot generate a token.')
  process.exit(1)
}

const token = jwt.sign(
  {
    type: 'api',
    name,
    issued_for: 'external-system',
    iat: Math.floor(Date.now() / 1000),
  },
  jwtSecret,
)

console.log('Token name :', name)
console.log('Expiry     : never (no expiration set)')
console.log('')
console.log('Token      :')
console.log(token)
console.log('')
console.log('Usage      :')
console.log(`curl -H "Authorization: Bearer ${token}" http://<host>:5017/<endpoint>`)