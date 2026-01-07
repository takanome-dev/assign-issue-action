#!/usr/bin/env node

/**
 * Generate organized release notes from a list of commits/PRs
 * Usage: node scripts/generate-release-notes.js <input-file> or pipe from stdin
 */

import { readFileSync } from 'fs'
import { createInterface } from 'readline'

// Categorize PRs/commits
function categorize(line) {
  const lower = line.toLowerCase()

  // Breaking changes - check first
  if (
    lower.includes('reminder') &&
    (lower.includes('day') ||
      lower.includes('before') ||
      lower.includes('after'))
  ) {
    return 'breaking'
  }

  // Dependencies - check before other categories
  if (
    lower.includes('deps') ||
    lower.includes('dependabot') ||
    lower.includes('renovate') ||
    lower.includes('bump')
  ) {
    return 'deps'
  }

  // Documentation
  if (
    lower.startsWith('fix(docs):') ||
    lower.startsWith('docs:') ||
    ((lower.includes('readme') || lower.includes('documentation')) &&
      !lower.includes('add'))
  ) {
    return 'docs'
  }

  // Features - more specific checks
  if (
    lower.startsWith('feat:') ||
    (lower.includes('add') &&
      (lower.includes('support') ||
        lower.includes('input') ||
        lower.includes('feature') ||
        lower.includes('welcome') ||
        lower.includes('team'))) ||
    (lower.includes('enable') && !lower.includes('fix'))
  ) {
    return 'feature'
  }

  // Fixes - more specific
  if (
    lower.startsWith('fix:') ||
    (lower.includes('fix') && !lower.includes('deps')) ||
    lower.includes('bug') ||
    (lower.includes('address') && lower.includes('rate limit')) ||
    lower.includes('validation error') ||
    lower.includes('search unassignment') ||
    lower.includes('assigned comment is wrong')
  ) {
    return 'fix'
  }

  // Build
  if (
    lower.startsWith('build:') ||
    (lower.includes('build') && !lower.includes('deps'))
  ) {
    return 'build'
  }

  // Chores - merge, release, migrate
  if (
    lower.startsWith('chore:') ||
    lower.includes('merge') ||
    lower.includes('release') ||
    lower.includes('migrate')
  ) {
    return 'chore'
  }

  // Default to other
  return 'other'
}

// Format PR link
function formatPR(line) {
  const match = line.match(/#(\d+)/)
  if (match) {
    const prNum = match[1]
    const prLink = `[#${prNum}](https://github.com/takanome-dev/assign-issue-action/pull/${prNum})`
    return line.replace(`#${prNum}`, prLink)
  }
  return line
}

// Clean up the line
function cleanLine(line) {
  // Remove "by @user in #PR" pattern and keep just the description
  let cleaned = line.replace(/\s+by\s+@[\w-\[\]]+\s+in\s+#\d+$/, '')

  // Remove emoji prefixes
  cleaned = cleaned.replace(/^[📦🔧✨🐛📚🚨]+\s*/, '')

  // Remove conventional commit prefixes
  cleaned = cleaned.replace(/^(feat|fix|chore|build|docs)(\([^)]+\))?:\s*/i, '')

  // Capitalize first letter if needed
  if (cleaned && cleaned[0] === cleaned[0].toLowerCase()) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  return cleaned.trim()
}

async function processInput() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  })

  const lines = []

  for await (const line of rl) {
    if (line.trim()) {
      lines.push(line.trim())
    }
  }

  // Categorize all lines
  const categories = {
    breaking: [],
    feature: [],
    fix: [],
    docs: [],
    deps: [],
    build: [],
    chore: [],
    other: [],
  }

  lines.forEach((line) => {
    const category = categorize(line)
    const cleaned = cleanLine(line)
    const formatted = formatPR(cleaned)
    categories[category].push(formatted)
  })

  // Generate markdown
  let output = '## 🚨 Breaking Changes\n\n'

  if (categories.breaking.length > 0) {
    categories.breaking.forEach((item) => {
      output += `- ${item}\n`
    })
  } else {
    output +=
      '- **`reminder_days` behavior changed**: Reminders are now sent X days **after assignment** instead of X days **before unassignment**. If you have `reminder_days: 7` and `days_until_unassign: 30`, the reminder will be sent 7 days after assignment (not 23 days).\n'
  }

  output += '\n## ✨ New Features\n\n'
  if (categories.feature.length > 0) {
    categories.feature.forEach((item) => {
      output += `- ${item}\n`
    })
  } else {
    output += '_No new features in this release._\n'
  }

  output += '\n## 🐛 Bug Fixes\n\n'
  if (categories.fix.length > 0) {
    categories.fix.forEach((item) => {
      output += `- ${item}\n`
    })
  } else {
    output += '_No bug fixes in this release._\n'
  }

  output += '\n## 📚 Documentation\n\n'
  if (categories.docs.length > 0) {
    categories.docs.forEach((item) => {
      output += `- ${item}\n`
    })
  } else {
    output += '_No documentation changes in this release._\n'
  }

  if (categories.build.length > 0) {
    output += '\n## 🔧 Build & Infrastructure\n\n'
    categories.build.forEach((item) => {
      output += `- ${item}\n`
    })
  }

  if (categories.deps.length > 0) {
    output += '\n## 📦 Dependencies\n\n'
    categories.deps.forEach((item) => {
      output += `- ${item}\n`
    })
  }

  if (categories.chore.length > 0 || categories.other.length > 0) {
    output += '\n## 🔨 Other Changes\n\n'
    ;[...categories.chore, ...categories.other].forEach((item) => {
      output += `- ${item}\n`
    })
  }

  output += '\n---\n\n'
  output +=
    '**Full Changelog**: https://github.com/takanome-dev/assign-issue-action/compare/v2.2...v3.0.0\n'

  console.log(output)
}

// Handle file input or stdin
const args = process.argv.slice(2)
if (args.length > 0) {
  const content = readFileSync(args[0], 'utf-8')
  const lines = content.split('\n').filter((l) => l.trim())

  const categories = {
    breaking: [],
    feature: [],
    fix: [],
    docs: [],
    deps: [],
    build: [],
    chore: [],
    other: [],
  }

  lines.forEach((line) => {
    const category = categorize(line)
    const cleaned = cleanLine(line)
    const formatted = formatPR(cleaned)
    categories[category].push(formatted)
  })

  let output = '## 🚨 Breaking Changes\n\n'

  if (categories.breaking.length > 0) {
    categories.breaking.forEach((item) => {
      output += `- ${item}\n`
    })
  } else {
    output +=
      '- **`reminder_days` behavior changed**: Reminders are now sent X days **after assignment** instead of X days **before unassignment**. If you have `reminder_days: 7` and `days_until_unassign: 30`, the reminder will be sent 7 days after assignment (not 23 days).\n'
  }

  output += '\n## ✨ New Features\n\n'
  if (categories.feature.length > 0) {
    categories.feature.forEach((item) => {
      output += `- ${item}\n`
    })
  } else {
    output += '_No new features in this release._\n'
  }

  output += '\n## 🐛 Bug Fixes\n\n'
  if (categories.fix.length > 0) {
    categories.fix.forEach((item) => {
      output += `- ${item}\n`
    })
  } else {
    output += '_No bug fixes in this release._\n'
  }

  output += '\n## 📚 Documentation\n\n'
  if (categories.docs.length > 0) {
    categories.docs.forEach((item) => {
      output += `- ${item}\n`
    })
  } else {
    output += '_No documentation changes in this release._\n'
  }

  if (categories.build.length > 0) {
    output += '\n## 🔧 Build & Infrastructure\n\n'
    categories.build.forEach((item) => {
      output += `- ${item}\n`
    })
  }

  if (categories.deps.length > 0) {
    output += '\n## 📦 Dependencies\n\n'
    categories.deps.forEach((item) => {
      output += `- ${item}\n`
    })
  }

  if (categories.chore.length > 0 || categories.other.length > 0) {
    output += '\n## 🔨 Other Changes\n\n'
    ;[...categories.chore, ...categories.other].forEach((item) => {
      output += `- ${item}\n`
    })
  }

  output += '\n---\n\n'
  output +=
    '**Full Changelog**: https://github.com/takanome-dev/assign-issue-action/compare/v2.2...v3.0.0\n'

  console.log(output)
} else {
  processInput()
}
