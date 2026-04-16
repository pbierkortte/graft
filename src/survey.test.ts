import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { survey } from './survey.js'

const initGitRepo = (dir: string): void => {
  execSync('git init', { cwd: dir, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' })
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' })
}

const addTracked = (dir: string, rel: string, content: string): void => {
  writeFileSync(join(dir, rel), content)
  execSync(`git add "${rel}"`, { cwd: dir, stdio: 'pipe' })
}

describe('survey', () => {
  let ws: string

  before(() => {
    ws = mkdtempSync(join(tmpdir(), 'graft-survey-'))
    initGitRepo(ws)
  })

  after(() => {
    rmSync(ws, { recursive: true, force: true })
  })

  it('returns (empty workspace) when no files are tracked', () => {
    const result = survey(ws)
    assert.equal(result, '(empty workspace)')
  })

  it('includes tracked files with === header ===', () => {
    addTracked(ws, 'hello.txt', 'hello world\n')
    const result = survey(ws)
    assert.ok(result.includes('=== hello.txt ==='), `Expected header, got: ${result}`)
    assert.ok(result.includes('hello world'), `Expected content, got: ${result}`)
  })

  it('lists files in sorted order', () => {
    addTracked(ws, 'zebra.txt', 'z\n')
    addTracked(ws, 'apple.txt', 'a\n')
    addTracked(ws, 'mango.txt', 'm\n')
    const result = survey(ws)
    const appleIdx = result.indexOf('apple.txt')
    const mangoIdx = result.indexOf('mango.txt')
    const zebraIdx = result.indexOf('zebra.txt')
    assert.ok(appleIdx < mangoIdx, 'apple should come before mango')
    assert.ok(mangoIdx < zebraIdx, 'mango should come before zebra')
  })

  it('truncates files larger than 5000 bytes', () => {
    // 2000 A's + 1000 B's + 2500 C's = 5500 bytes total
    const bigContent = 'A'.repeat(2000) + 'B'.repeat(1000) + 'C'.repeat(2500)
    addTracked(ws, 'big.txt', bigContent)
    const result = survey(ws)
    assert.ok(result.includes('[…truncated,'), `Expected truncation marker, got: ${result}`)
    assert.ok(result.includes('bytes total…]'), `Expected bytes total, got: ${result}`)
    // First 2000 chars are A's — should appear
    assert.ok(result.includes('A'.repeat(100)), 'Expected start of file (A chars)')
    // Last 500 chars are C's — should appear
    assert.ok(result.includes('C'.repeat(100)), 'Expected end of file (C chars)')
    // Middle B's should NOT appear (they're in the truncated section)
    assert.ok(!result.includes('B'.repeat(100)), 'Middle section should be truncated')
  })

  it('handles binary files gracefully', () => {
    // Write a buffer with null bytes — Node reads these as replacement chars in utf-8
    // but the file is still listed in the survey output
    const binaryPath = join(ws, 'data.bin')
    const buf = Buffer.from([0x00, 0xff, 0xfe, 0x00, 0x01, 0x02])
    writeFileSync(binaryPath, buf)
    execSync('git add data.bin', { cwd: ws, stdio: 'pipe' })
    const result = survey(ws)
    // The file should appear in the survey output in some form
    assert.ok(result.includes('data.bin'), `Expected data.bin in output, got: ${result}`)
  })
})
