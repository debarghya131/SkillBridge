import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import net from 'node:net'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const clientRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const serverRoot = path.resolve(clientRoot, '../server')
const serverRequire = createRequire(path.join(serverRoot, 'package.json'))
const { getEnvConfig } = serverRequire('./config/env')
const { hashPassword } = serverRequire('./utils/auth')
const mongoose = serverRequire('mongoose')
const Reviewer = serverRequire('./models/Reviewer')

const databaseName = `sbqa_${randomUUID().replaceAll('-', '').slice(0, 16)}`
const mongoUrl = new URL(getEnvConfig().mongoUrl)
mongoUrl.pathname = `/${databaseName}`
const isolatedMongoUrl = mongoUrl.toString()
const managedProcesses = []
let browser

function startProcess(command, args, cwd, env) {
  const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
  const entry = { child, output: '' }
  const capture = chunk => { entry.output = `${entry.output}${chunk}`.slice(-4000) }
  child.stdout.on('data', capture)
  child.stderr.on('data', capture)
  managedProcesses.push(entry)
  return entry
}

async function freePort() {
  const server = net.createServer()
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))
  return port
}

async function waitForServer(url, entry) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (entry.child.exitCode !== null) throw new Error(`Server exited before ready:\n${entry.output}`)
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) })
      if (response.ok) return
    } catch {
      // A cold database connection or Vite startup may still be in progress.
    }
    await delay(500)
  }
  throw new Error(`Server did not become ready: ${url}\n${entry.output}`)
}

async function stopProcess(entry) {
  const { child } = entry
  if (child.exitCode !== null || child.signalCode !== null) return
  child.kill('SIGTERM')
  await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(5000)])
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL')
    await new Promise(resolve => child.once('exit', resolve))
  }
}

async function dropIsolatedDatabase() {
  assert.match(databaseName, /^sbqa_[a-f0-9]{16}$/)
  await mongoose.connect(isolatedMongoUrl, { dbName: databaseName, autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10000 })
  try {
    assert.equal(mongoose.connection.name, databaseName, 'refuse to drop an unexpected database')
    await mongoose.connection.dropDatabase()
  } finally {
    await mongoose.disconnect()
  }
}

async function assertNoPageOverflow(page, label) {
  const size = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }))
  assert.ok(size.document <= size.viewport + 2, `${label} overflows horizontally: ${size.document}px > ${size.viewport}px`)
}

function watchPageErrors(page, label, errors) {
  page.on('pageerror', error => errors.push(`${label}: ${error.message}`))
}

async function run() {
  const apiPort = await freePort()
  const webPort = await freePort()
  const apiOrigin = `http://127.0.0.1:${apiPort}`
  const webOrigin = `http://127.0.0.1:${webPort}`
  const qaSuffix = randomUUID().slice(0, 8)
  const adminEmail = `qa-admin-${qaSuffix}@example.com`
  const adminPassword = `QaAdmin!${qaSuffix}`
  const companyEmail = `qa-company-${qaSuffix}@example.com`
  const studentEmail = `qa-student-${qaSuffix}@example.com`
  const accountPassword = `QaAccount!${qaSuffix}`
  const gigTitle = `QA Frontend GIG ${qaSuffix}`
  const pageErrors = []
  const backendEnv = {
    ...process.env,
    NODE_ENV: 'development',
    MONGO_URL: isolatedMongoUrl,
    MONGO_DB_NAME: databaseName,
    PORT: String(apiPort),
    CORS_ORIGIN: webOrigin,
    LOG_LEVEL: 'error',
  }

  await mongoose.connect(isolatedMongoUrl, { dbName: databaseName, serverSelectionTimeoutMS: 10000 })
  try {
    await Reviewer.create({ name: 'QA Platform Admin', email: adminEmail, passwordHash: hashPassword(adminPassword), role: 'admin', active: true })
  } finally {
    await mongoose.disconnect()
  }

  const seeded = spawnSync(process.execPath, ['scripts/seed-skill-catalog.js', '--admin-email', adminEmail, '--db-name', databaseName, '--confirm'], {
    cwd: serverRoot, env: backendEnv, encoding: 'utf8', timeout: 30000,
  })
  if (seeded.status !== 0) throw new Error(`Isolated catalog seed failed: ${seeded.stderr || seeded.stdout}`)

  const backend = startProcess(process.execPath, ['server.js'], serverRoot, backendEnv)
  await waitForServer(`${apiOrigin}/ready`, backend)
  const frontend = startProcess(process.execPath, [path.join(clientRoot, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(webPort), '--strictPort'], clientRoot, {
    ...process.env, VITE_API_URL: apiOrigin,
  })
  await waitForServer(webOrigin, frontend)
  browser = await chromium.launch({ headless: true })

  const companyContext = await browser.newContext({ viewport: { width: 1366, height: 850 } })
  const companyPage = await companyContext.newPage()
  watchPageErrors(companyPage, 'company', pageErrors)
  await companyPage.goto(`${webOrigin}/company?mode=signup`)
  await companyPage.getByRole('textbox', { name: 'Company or business name' }).fill('QA Browser Company')
  await companyPage.getByRole('textbox', { name: 'Business email' }).fill(companyEmail)
  await companyPage.getByRole('button', { name: /Udyam Reg/ }).click()
  await companyPage.getByRole('textbox', { name: 'Udyam registration reference' }).fill(`QA-UDYAM-${qaSuffix}`)
  await companyPage.getByRole('textbox', { name: 'Business location' }).fill('Kolkata, West Bengal')
  await companyPage.getByLabel('Create password').fill(accountPassword)
  await companyPage.getByRole('button', { name: /Register & Find Talent/ }).click()
  await companyPage.waitForURL('**/company/dashboard', { timeout: 15000 })
  await companyPage.getByRole('button', { name: /GIG Management/ }).click()
  await companyPage.getByRole('button', { name: /Create New GIG/ }).click()
  await companyPage.getByPlaceholder('e.g. Frontend Internship').fill(gigTitle)
  await companyPage.getByPlaceholder('e.g. Kolkata, West Bengal').fill('Kolkata, West Bengal')
  await companyPage.getByPlaceholder('e.g. 10000').fill('10000')
  await companyPage.getByPlaceholder('React, UI/UX Design').fill('React, JavaScript')
  await companyPage.getByRole('button', { name: 'Create GIG', exact: true }).click()
  await companyPage.getByText(gigTitle, { exact: true }).first().waitFor({ timeout: 15000 })
  console.log('Company browser flow passed: registration, dashboard, and GIG publication.')

  const studentContext = await browser.newContext({ viewport: { width: 1366, height: 850 } })
  const studentPage = await studentContext.newPage()
  watchPageErrors(studentPage, 'student', pageErrors)
  await studentPage.goto(`${webOrigin}/student?mode=signup`)
  await studentPage.getByRole('textbox', { name: 'Full name' }).fill('QA Browser Student')
  await studentPage.getByRole('textbox', { name: 'College email' }).fill(studentEmail)
  await studentPage.getByRole('button', { name: /DigiLocker/ }).click()
  await studentPage.getByRole('textbox', { name: 'DigiLocker username or ID' }).fill(`QA-DIGI-${qaSuffix}`)
  await studentPage.getByRole('button', { name: 'Preferred language' }).click()
  await studentPage.getByRole('option', { name: 'English' }).click()
  await studentPage.getByRole('textbox', { name: 'Location' }).fill('Kolkata, West Bengal')
  await studentPage.getByLabel('Create password').fill(accountPassword)
  await studentPage.getByRole('button', { name: /Create Account & Continue/ }).click()
  await studentPage.waitForURL('**/student/dashboard', { timeout: 15000 })
  await studentPage.getByRole('button', { name: /GIG Center/ }).click()
  await studentPage.getByRole('button', { name: /Browse GIGs/ }).click()
  let gigCard = studentPage.locator('.student-gig-card').filter({ hasText: gigTitle }).first()
  await gigCard.waitFor({ timeout: 15000 })
  await gigCard.getByRole('button', { name: 'Apply Now' }).click()
  await gigCard.getByRole('button', { name: /Applied/ }).waitFor({ timeout: 15000 })
  await studentPage.reload()
  await studentPage.getByRole('button', { name: /Browse GIGs/ }).click()
  gigCard = studentPage.locator('.student-gig-card').filter({ hasText: gigTitle }).first()
  await gigCard.waitFor({ timeout: 15000 })
  console.log('Student browser flow passed: registration, real GIG application, and refresh persistence.')

  await companyPage.reload()
  await companyPage.getByRole('button', { name: /GIG Management/ }).click()
  const postedGig = companyPage.locator('.gig-posted-card').filter({ hasText: gigTitle }).first()
  await postedGig.waitFor({ timeout: 15000 })
  await postedGig.getByRole('button', { name: 'View Applicants' }).click()
  await companyPage.locator('.applicant-card').filter({ hasText: 'QA Browser Student' }).first().waitFor({ timeout: 15000 })
  console.log('Cross-role browser check passed: the company sees the real student applicant.')

  const adminContext = await browser.newContext({ viewport: { width: 1366, height: 850 } })
  const adminPage = await adminContext.newPage()
  watchPageErrors(adminPage, 'admin', pageErrors)
  await adminPage.goto(`${webOrigin}/admin`)
  await adminPage.getByLabel('Email').fill(adminEmail)
  await adminPage.getByLabel('Password').fill(adminPassword)
  await adminPage.getByRole('button', { name: /Sign in to operations/ }).click()
  await adminPage.waitForURL('**/admin/dashboard', { timeout: 15000 })
  await adminPage.getByRole('button', { name: 'Skill Catalog' }).click()
  await adminPage.getByText('React', { exact: true }).first().waitFor({ timeout: 15000 })
  await adminPage.getByRole('button', { name: 'Skill Requests' }).click()
  await adminPage.getByRole('button', { name: 'Review Queue' }).click()
  console.log('Admin browser flow passed: sign-in, published catalog, requests, and review queue navigation.')

  for (const [label, page] of [['student', studentPage], ['company', companyPage], ['admin', adminPage]]) {
    await page.setViewportSize({ width: 360, height: 740 })
    await assertNoPageOverflow(page, `${label} mobile`)
    await page.setViewportSize({ width: 768, height: 900 })
    await assertNoPageOverflow(page, `${label} tablet`)
    await page.setViewportSize({ width: 1366, height: 850 })
    await assertNoPageOverflow(page, `${label} desktop`)
  }
  assert.deepEqual(pageErrors, [], `Uncaught browser errors: ${pageErrors.join(' | ')}`)
  console.log('Responsive/browser checks passed at 360px, 768px, and 1366px; no uncaught page errors.')
}

try {
  await run()
} catch (error) {
  console.error(`Browser E2E failed: ${error.message}`)
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  for (const entry of managedProcesses.reverse()) await stopProcess(entry)
  try {
    await dropIsolatedDatabase()
    console.log(`Removed isolated QA database ${databaseName}.`)
  } catch (error) {
    console.error(`Could not remove isolated QA database ${databaseName}: ${error.message}`)
    process.exitCode = 1
  }
}
