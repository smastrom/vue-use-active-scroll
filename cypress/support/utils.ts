function getInt(max: number) {
   return Math.floor(Math.random() * max)
}

export function getRandomSequence(maxLength: number) {
   const sequence: number[] = []

   let newLength = maxLength
   let prev: number | undefined = undefined

   for (let i = 0; i < newLength; i++) {
      const next = getInt(maxLength)

      if (typeof prev === 'undefined') {
         prev = next
         continue
      }
      if (prev === next) {
         newLength++
         continue
      }

      prev = next
      sequence.push(next)
   }

   return sequence
}
