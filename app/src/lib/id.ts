import { customAlphabet } from 'nanoid'

const gen = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 10)

export function newTaskId(): string {
  return gen()
}
