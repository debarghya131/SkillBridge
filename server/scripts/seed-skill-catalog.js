const crypto = require('crypto')
const { parseArgs } = require('node:util')
const { getEnvConfig } = require('../config/env')
const { connectToDatabase, disconnectFromDatabase } = require('../config/db')
const { buildDemoSkillCatalog } = require('../config/demoSkillCatalog')
const { normalizeCatalogPayload } = require('../controllers/adminController')
const Reviewer = require('../models/Reviewer')
const SkillCatalog = require('../models/SkillCatalog')
const { skillSlug } = require('../utils/skillCatalog')

function catalogSlug(name, normalizedName) {
  const suffix = crypto.createHash('sha1').update(normalizedName).digest('hex').slice(0, 7)
  return `${skillSlug(name) || 'skill'}-${suffix}`
}

async function main() {
  const { values } = parseArgs({
    options: {
      'admin-email': { type: 'string', default: 'admin@example.com' },
      confirm: { type: 'boolean', default: false },
    },
  })
  if (!values.confirm) {
    throw new Error('Usage: npm run seed:skill-catalog -- --admin-email admin@example.com --confirm')
  }

  const adminEmail = values['admin-email'].trim().toLowerCase()
  const config = getEnvConfig()
  try {
    await connectToDatabase(config.mongoUrl, config)
    const admin = await Reviewer.findOne({ email: adminEmail, role: 'admin', active: true })
    if (!admin) throw new Error(`Active admin account not found: ${adminEmail}`)

    const result = { inserted: [], skipped: [] }
    for (const definition of buildDemoSkillCatalog()) {
      const valuesToInsert = normalizeCatalogPayload(definition)
      const existing = await SkillCatalog.findOne({ normalizedTerms: { $in: valuesToInsert.normalizedTerms } })
      if (existing) {
        if (existing.normalizedName !== valuesToInsert.normalizedName) {
          throw new Error(`${definition.name} conflicts with existing catalog skill ${existing.name}`)
        }
        result.skipped.push(existing.name)
        continue
      }

      await SkillCatalog.create({
        ...valuesToInsert,
        slug: catalogSlug(valuesToInsert.name, valuesToInsert.normalizedName),
        createdBy: admin._id,
        updatedBy: admin._id,
        publishedAt: new Date(),
      })
      result.inserted.push(valuesToInsert.name)
    }

    const publishedTotal = await SkillCatalog.countDocuments({ status: 'published' })
    console.log(JSON.stringify({ ...result, publishedTotal }, null, 2))
  } finally {
    await disconnectFromDatabase()
  }
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
