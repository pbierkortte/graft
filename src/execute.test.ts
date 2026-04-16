import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runMagic } from './execute.js'

const makeWorkspace = (): string => mkdtempSync(join(tmpdir(), 'graft-exec-'))

const writeScript = (ws: string, name: string, content: string): void => {
  const runDir = join(ws, '_run')
  mkdirSync(runDir, { recursive: true })
  writeFileSync(join(runDir, name), content)
}

const readLog = (ws: string, name: string): string =>
  readFileSync(join(ws, '_output', `${name}.log`), 'utf-8')

describe('runMagic', () => {
  let ws: string

  before(() => {
    ws = makeWorkspace()
  })

  after(() => {
    rmSync(ws, { recursive: true, force: true })
  })

  it('returns false when _run/ does not exist', async () => {
    const result = await runMagic(ws)
    assert.equal(result, false)
  })

  it('returns false when _run/ is empty', async () => {
    const emptyWs = makeWorkspace()
    try {
      mkdirSync(join(emptyWs, '_run'))
      const result = await runMagic(emptyWs)
      assert.equal(result, false)
    } finally {
      rmSync(emptyWs, { recursive: true, force: true })
    }
  })

  it('captures stdout and exit code', async () => {
    const scriptWs = makeWorkspace()
    try {
      writeScript(scriptWs, 'echo.sh', '#!/bin/bash\necho "hello graft"')
      const result = await runMagic(scriptWs)
      assert.equal(result, true)
      const log = readLog(scriptWs, 'echo.sh')
      assert.ok(log.includes('hello graft'), `Expected stdout in log, got: ${log}`)
      assert.ok(log.includes('[exit:0]'), `Expected exit code in log, got: ${log}`)
    } finally {
      rmSync(scriptWs, { recursive: true, force: true })
    }
  })

  it('captures stderr output', async () => {
    const scriptWs = makeWorkspace()
    try {
      writeScript(scriptWs, 'err.sh', '#!/bin/bash\necho "oops" >&2')
      await runMagic(scriptWs)
      const log = readLog(scriptWs, 'err.sh')
      assert.ok(log.includes('[stderr]'), `Expected [stderr] section, got: ${log}`)
      assert.ok(log.includes('oops'), `Expected stderr content, got: ${log}`)
    } finally {
      rmSync(scriptWs, { recursive: true, force: true })
    }
  })

  it('removes _run/ directory after execution', async () => {
    const scriptWs = makeWorkspace()
    try {
      writeScript(scriptWs, 'clean.sh', '#!/bin/bash\necho "done"')
      await runMagic(scriptWs)
      assert.equal(existsSync(join(scriptWs, '_run')), false, '_run/ should be removed')
    } finally {
      rmSync(scriptWs, { recursive: true, force: true })
    }
  })

  it('creates _output/ directory with log files', async () => {
    const scriptWs = makeWorkspace()
    try {
      writeScript(scriptWs, 'out.sh', '#!/bin/bash\necho "output"')
      await runMagic(scriptWs)
      assert.ok(existsSync(join(scriptWs, '_output')), '_output/ should exist')
      assert.ok(existsSync(join(scriptWs, '_output', 'out.sh.log')), 'log file should exist')
    } finally {
      rmSync(scriptWs, { recursive: true, force: true })
    }
  })

  it('respects # timeout: N directive and kills long-running scripts', async () => {
    const scriptWs = makeWorkspace()
    try {
      // timeout: 1 second, script sleeps 60s
      writeScript(scriptWs, 'slow.sh', '# timeout: 1\n#!/bin/bash\nsleep 60')
      const start = Date.now()
      await runMagic(scriptWs)
      const elapsed = Date.now() - start
      const log = readLog(scriptWs, 'slow.sh')
      assert.ok(log.includes('[timeout after 1s]'), `Expected timeout message, got: ${log}`)
      // Should complete well under 10 seconds
      assert.ok(elapsed < 10_000, `Expected fast timeout, took ${elapsed}ms`)
    } finally {
      rmSync(scriptWs, { recursive: true, force: true })
    }
  })

  it('captures non-zero exit codes', async () => {
    const scriptWs = makeWorkspace()
    try {
      writeScript(scriptWs, 'fail.sh', '#!/bin/bash\nexit 42')
      await runMagic(scriptWs)
      const log = readLog(scriptWs, 'fail.sh')
      assert.ok(log.includes('[exit:42]'), `Expected exit:42 in log, got: ${log}`)
    } finally {
      rmSync(scriptWs, { recursive: true, force: true })
    }
  })

  it('runs multiple scripts in sorted order', async () => {
    const scriptWs = makeWorkspace()
    try {
      writeScript(scriptWs, 'b.sh', '#!/bin/bash\necho "second"')
      writeScript(scriptWs, 'a.sh', '#!/bin/bash\necho "first"')
      await runMagic(scriptWs)
      assert.ok(existsSync(join(scriptWs, '_output', 'a.sh.log')), 'a.sh.log should exist')
      assert.ok(existsSync(join(scriptWs, '_output', 'b.sh.log')), 'b.sh.log should exist')
      const aLog = readLog(scriptWs, 'a.sh')
      const bLog = readLog(scriptWs, 'b.sh')
      assert.ok(aLog.includes('first'), `Expected "first" in a.sh.log, got: ${aLog}`)
      assert.ok(bLog.includes('second'), `Expected "second" in b.sh.log, got: ${bLog}`)
    } finally {
      rmSync(scriptWs, { recursive: true, force: true })
    }
  })
})
