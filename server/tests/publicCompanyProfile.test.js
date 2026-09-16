const test = require('node:test')
const assert = require('node:assert/strict')
const Company = require('../models/Company')
const { getPublicCompanyProfile } = require('../controllers/companyController')

test('demo GIG companies publish complete fictional profiles and local logos', async () => {
  const profile = await getPublicCompanyProfile('Northstar Retail Labs')
  assert.equal(profile.logo, '/demo-companies/northstar.svg')
  assert.equal(profile.location, 'Kolkata, West Bengal')
  assert.equal(profile.industry, 'Retail Technology')
  assert.deepEqual(profile.workModes, ['Remote'])
  assert.equal(profile.requiredSkills, 'React, Node.js, SQL')
  assert.equal(profile.contactEmail, 'hello@northstar-retail.test')
})

test('public company lookup uses stable ID and returns current cleared profile fields', async t => {
  const id = 'aaaaaaaaaaaaaaaaaaaaaaaa'
  const company = { businessName: 'Renamed company', location: 'Kolkata', contactMethod: 'phone', verificationMethod: 'udyam', businessProfile: { description: 'Current description', logo: '', website: '', requiredSkills: 'SQL', contactEmail: '', introVideoUrl: 'https://example.com/company-intro.mp4' } }
  t.mock.method(Company, 'findOne', async query => {
    assert.deepEqual(query, { _id: id })
    return company
  })
  const profile = await getPublicCompanyProfile(id)
  assert.equal(profile.businessName, 'Renamed company')
  assert.equal(profile.description, 'Current description')
  assert.equal(profile.contactMethod, 'phone')
  assert.equal(profile.verificationMethod, 'udyam')
  assert.equal(profile.logo, '')
  assert.equal(profile.website, '')
  assert.equal(profile.introVideoUrl, 'https://example.com/company-intro.mp4')
  company.businessProfile.description = ''
  assert.equal((await getPublicCompanyProfile(id)).description, '')
})
