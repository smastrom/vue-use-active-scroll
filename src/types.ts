import { Ref } from 'vue'

export declare type Targets = Ref<string[]> | Ref<HTMLElement[]>

export declare type UseActiveOptions = {
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

export declare type UseActiveReturn = {
   isActive: (id: string) => boolean
   setActive: (id: string) => void
   activeEl: Ref<HTMLElement | null>
   activeId: Ref<string>
   activeIndex: Ref<number>
}

export declare function useActive(
   userIds: string[] | Ref<string[]>,
   options?: UseActiveOptions
): UseActiveReturn

export interface ShortRef<T> extends Ref<T> {
   v: T
}
