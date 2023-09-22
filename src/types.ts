import { Ref } from 'vue'

export type Targets = Ref<string[]> | Ref<HTMLElement[]>

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

export interface ShortRef<T> extends Ref<T> {
   v: T
}
