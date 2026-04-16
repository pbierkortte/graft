import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { bootstrap } from './harness.js'

const makeDir = (): string => mkdtempSync(join(tmpdir(), 'graft-harness-'))

describe('bootstrap', () => {
  let ws: string

  before(() => {
    ws = makeDir()
  })

  after(() => {
    rmSync(ws, { recursive: true, force: true })
  })

  it('creates the workspace directory if it does not exist', () => {
    const newDir = join(ws, 'new-workspace')
    assert.equal(existsSync(newDir), false)
    bootstrap(newDir)
    assert.equal(existsSync(newDir), true)
    rmSync(newDir, { recursive: true, force: true })
  })

  it('initializes a git repo in the workspace', () => {
    const gitWs = makeDir()
    try {
      bootstrap(gitWs)
      assert.ok(existsSync(join(gitWs, '.git')), '.git directory should exist')
    } finally {
      rmSync(gitWs, { recursive: true, force: true })
    }
  })

  it('creates an initial empty commit', () => {
    const gitWs = makeDir()
    try {
      bootstrap(gitWs)
      const log = execSync('git log --oneline', { cwd: gitWs, encoding: 'utf-8' })
      assert.ok(log.includes('init'), `Expected "init" commit, got: ${log}`)
    } finally {
      rmSync(gitWs, { recursive: true, force: true })
    }
  })

  it('is idempotent — does not reinitialize an existing repo', () => {
    const gitWs = makeDir()
    try {
      bootstrap(gitWs)
      // Add a file and commit so we can verify the repo is not wiped
      execSync('git config user.email "test@test.com"', { cwd: gitWs, stdio: 'pipe' })
      execSync('git config user.name "Test"', { cwd: gitWs, stdio: 'pipe' })
      execSync('touch marker.txt && git add marker.txt && git commit -m "marker"', {
        cwd: gitWs,
        stdio: 'pipe',
        shell: true,
      })
      // Call bootstrap again — should not wipe the repo
      bootstrap(gitWs)
      const log = execSync('git log --oneline', { cwd: gitWs, encoding: 'utf-8' })
      assert.ok(log.includes('marker'), `Expected marker commit to survive, got: ${log}`)
    } finally {
      rmSync(gitWs, { recursive: true, force: true })
    }
  })

  it('works when workspace already exists as a directory', () => {
    const existingWs = makeDir()
    try {
      // Directory already exists — bootstrap should not throw
      assert.doesNotThrow(() => bootstrap(existingWs))
      assert.ok(existsSync(join(existingWs, '.git')), '.git should be created')
    } finally {
      rmSync(existingWs, { recursive: true, force: true })
    }
  })
})
