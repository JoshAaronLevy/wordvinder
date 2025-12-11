export const toAlphaUpper = (value: string) => value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1)
