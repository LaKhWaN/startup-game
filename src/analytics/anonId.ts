const KEY = 'failunicorn-anon-id'

/** A random id kept in localStorage: the same browser = the same id, so recurring players can be counted. Nothing personal in it. */
export function getAnonId(): string | undefined {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return undefined // storage blocked (private mode): skip it, analytics still work
  }
}
