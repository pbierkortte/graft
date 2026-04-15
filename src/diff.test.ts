import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isDiff, stripFences } from './diff.js'

describe('isDiff', () => {
  it('treats empty string as valid', () => {
    assert.equal(isDiff(''), true)
  })

  it('treats whitespace-only as valid', () => {
    assert.equal(isDiff('   \n  '), true)
  })

  it('accepts a valid addition diff', () => {
    const diff = `--- /dev/null
+++ b/hello.txt
@@ -0,0 +1 @@
+hello world`
    assert.equal(isDiff(diff), true)
  })

  it('accepts a valid edit diff', () => {
    const diff = `--- a/hello.txt
+++ b/hello.txt
@@ -1 +1 @@
-hello world
+hello graft`
    assert.equal(isDiff(diff), true)
  })

  it('rejects plain prose', () => {
    assert.equal(isDiff('Here is a flask app for you.'), false)
  })

  it('rejects partial diff (missing ---)', () => {
    const partial = `+++ b/hello.txt
@@ -0,0 +1 @@
+hello`
    assert.equal(isDiff(partial), false)
  })

  it('rejects partial diff (missing +++ and @@)', () => {
    const partial = `--- a/hello.txt
some random text`
    assert.equal(isDiff(partial), false)
  })
})

describe('stripFences', () => {
  it('removes ```diff fences', () => {
    const input = '```diff\n--- a/f\n+++ b/f\n```'
    const result = stripFences(input)
    assert.equal(result, '--- a/f\n+++ b/f')
  })

  it('removes plain ``` fences', () => {
    const input = '```\n--- a/f\n+++ b/f\n```'
    const result = stripFences(input)
    assert.equal(result, '--- a/f\n+++ b/f')
  })

  it('passes through clean diff unchanged', () => {
    const input = '--- a/f\n+++ b/f'
    assert.equal(stripFences(input), input)
  })

  it('trims whitespace', () => {
    const input = '  \n--- a/f\n+++ b/f\n  '
    assert.equal(stripFences(input), '--- a/f\n+++ b/f')
  })
})
