import { describe, expect, it } from 'bun:test'
import type { ActionConfig } from '../../core'
import { CommandParser } from '../command-parser'
import { CommandType } from '../types'

const defaultConfig: Partial<ActionConfig> = {
  selfAssignCmd: '/assign-me',
  selfUnassignCmd: '/unassign-me',
  assignUserCmd: '/assign',
  unassignUserCmd: '/unassign',
  enableAutoSuggestion: false,
  maintainers: [],
}

describe('CommandParser', () => {
  describe('parse', () => {
    it('should parse self-assign command', () => {
      const parser = new CommandParser(defaultConfig as ActionConfig)
      const result = parser.parse('/assign-me', 'user')

      expect(result).toEqual({ type: CommandType.SELF_ASSIGN })
    })

    it('should parse self-assign command with text', () => {
      const parser = new CommandParser(defaultConfig as ActionConfig)
      const result = parser.parse('/assign-me please', 'user')

      expect(result).toEqual({ type: CommandType.SELF_ASSIGN })
    })

    it('should parse self-unassign command', () => {
      const parser = new CommandParser(defaultConfig as ActionConfig)
      const result = parser.parse('/unassign-me', 'user')

      expect(result).toEqual({ type: CommandType.SELF_UNASSIGN })
    })

    it('should parse assign user command with target', () => {
      const parser = new CommandParser(defaultConfig as ActionConfig)
      const result = parser.parse('/assign @targetuser', 'maintainer')

      expect(result).toEqual({
        type: CommandType.ASSIGN_USER,
        targetUsername: 'targetuser',
      })
    })

    it('should parse unassign user command with target', () => {
      const parser = new CommandParser(defaultConfig as ActionConfig)
      const result = parser.parse('/unassign @targetuser', 'maintainer')

      expect(result).toEqual({
        type: CommandType.UNASSIGN_USER,
        targetUsername: 'targetuser',
      })
    })

    it('should return null for quoted replies', () => {
      const parser = new CommandParser(defaultConfig as ActionConfig)
      const result = parser.parse('> /assign-me', 'user')

      expect(result).toBeNull()
    })

    it('should return null for unrecognized commands', () => {
      const parser = new CommandParser(defaultConfig as ActionConfig)
      const result = parser.parse('hello world', 'user')

      expect(result).toBeNull()
    })

    it('should ignore maintainers using self-assign', () => {
      const parser = new CommandParser({
        ...defaultConfig,
        maintainers: ['maintainer-user'],
      } as ActionConfig)
      const result = parser.parse('/assign-me', 'maintainer-user')

      expect(result).toBeNull()
    })

    it('should handle backslash prefix', () => {
      const parser = new CommandParser(defaultConfig as ActionConfig)
      const result = parser.parse('\\assign-me', 'user')

      expect(result).toEqual({ type: CommandType.SELF_ASSIGN })
    })

    it('should detect auto-suggestion phrases', () => {
      const parser = new CommandParser({
        ...defaultConfig,
        enableAutoSuggestion: true,
      } as ActionConfig)
      const result = parser.parse('I would like to work on this issue', 'user')

      expect(result).toEqual({ type: CommandType.AUTO_SUGGEST })
    })

    it('should not detect auto-suggestion when disabled', () => {
      const parser = new CommandParser(defaultConfig as ActionConfig)
      const result = parser.parse('Can I work on this issue?', 'user')

      expect(result).toBeNull()
    })
  })

  describe('isMaintainerCommand', () => {
    it('should return true for assign_user', () => {
      const parser = new CommandParser(defaultConfig as ActionConfig)
      expect(
        parser.isMaintainerCommand({ type: CommandType.ASSIGN_USER }),
      ).toBe(true)
    })

    it('should return true for unassign_user', () => {
      const parser = new CommandParser(defaultConfig as ActionConfig)
      expect(
        parser.isMaintainerCommand({ type: CommandType.UNASSIGN_USER }),
      ).toBe(true)
    })

    it('should return false for self_assign', () => {
      const parser = new CommandParser(defaultConfig as ActionConfig)
      expect(
        parser.isMaintainerCommand({ type: CommandType.SELF_ASSIGN }),
      ).toBe(false)
    })
  })
})
