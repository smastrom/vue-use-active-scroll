import type { Ref } from 'vue'

export type UseActiveOptions = {
   root?: Ref<HTMLElement | null> | HTMLElement | null
   jumpToFirst?: boolean
   jumpToLast?: boolean
   overlayHeight?: number
   minWidth?: number
   replaceHash?: boolean
   edgeOffset?: {
      first?: number
      last?: number
   }
   boundaryOffset?: {
      toTop?: number
      toBottom?: number
   }
}

export type UseActiveReturn = {
   isActive: (id: string) => boolean
   setActive: (id: string) => void
   activeId: Ref<string>
   activeIndex: Ref<number>
}
