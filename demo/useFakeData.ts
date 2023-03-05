import { watch, computed, reactive } from 'vue'

export function useFakeData(length = 10) {
   const parsedStart = parseInt(sessionStorage.getItem('firstNumber') || '0')
   const parsedEnd = parseInt(sessionStorage.getItem('lastNumber') || '0')
   const parsedLength = parsedEnd - parsedStart + 1

   const isMobile = window.matchMedia('(max-width: 610px)').matches

   const minText = isMobile ? 50 : 80
   const maxText = isMobile ? 100 : 320

   const sections = reactive(
      Array.from({ length: parsedLength <= 1 ? length : parsedLength }, (_, index) => ({
         id: `title_${parsedStart + index}`,
         title: `${parsedStart + index} `.repeat(6).toUpperCase(),
         text: 'Text '.repeat(getInt(minText, maxText)),
      }))
   )

   const lastNum = computed(() => parseInt(sections[sections.length - 1]?.title ?? '-1'))
   const firstNum = computed(() => parseInt(sections[0]?.title ?? '-1'))

   const menuItems = computed(() =>
      sections.map((item) => ({
         label: item.title,
         href: item.id,
      }))
   )

   function shiftSection() {
      sections.shift()
   }

   function pushSection() {
      sections.push({
         id: `title_${lastNum.value + 1}`,
         title: `${lastNum.value + 1} `.repeat(6).toUpperCase(),
         text: 'Text '.repeat(getInt(50, 100)),
      })
   }

   watch(
      [firstNum, lastNum],
      ([newFirst, newLast]) => {
         sessionStorage.setItem('firstNumber', `${newFirst}`)
         sessionStorage.setItem('lastNumber', `${newLast}`)
      },
      { immediate: true }
   )

   return { sections, menuItems, pushSection, shiftSection }
}

function getInt(min: number, max: number) {
   min = Math.ceil(min)
   max = Math.floor(max)
   return Math.floor(Math.random() * (max - min + 1) + min)
}
