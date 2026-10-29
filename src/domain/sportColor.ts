// A stable hue per sport. Unknown sports get one derived from the name.
const KNOWN: Record<string, number> = {
  Soccer: 145,
  Basketball: 28,
  Motorsport: 262, // not red: red is the brand accent
  'American Football': 20,
  Baseball: 210,
  'Ice Hockey': 195,
  Tennis: 75,
  Rugby: 285,
  Cricket: 50,
  Fighting: 320,
}

export const sportHue = (sport: string): number => {
  const known = KNOWN[sport]
  if (known !== undefined) return known
  let hash = 0
  for (const char of sport) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash % 360
}
