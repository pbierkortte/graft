import { main } from './harness.js'

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
