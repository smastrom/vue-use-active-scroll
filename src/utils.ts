import { customRef, ref as vRef, computed as vComputed, type ComputedRef, type Ref } from 'vue'

import type { ShortRef } from './types'

export const isSSR = typeof window === 'undefined'

export const FIXED_OFFSET = 10

function setV<T>(ref: Ref<T>) {
   Reflect.defineProperty(ref, 'v', {
      get() {
         return ref.value
      },
      set(newValue) {
         ref.value = newValue
      },
   })
}

export function ref<T>(value: T): ShortRef<T> {
   const _ref = vRef(value)

   setV(_ref)
   return _ref as ShortRef<T>
}

export function computed<T>(getter: () => T) {
   const _computed = vComputed(getter)

   Reflect.defineProperty(_computed, 'v', {
      get() {
         return _computed.value
      },
   })

   return _computed as ComputedRef<T> & { v: T }
}

// When users set refs, if no media match, set default value
export function useMediaRef<T>(matchMedia: Ref<boolean>, defaultValue: T): ShortRef<T> {
   const _customRef = customRef<T>((track, trigger) => {
      let value = defaultValue
      return {
         get() {
            track()
            return value
         },
         set(newValue) {
            value = matchMedia.value ? newValue : defaultValue
            trigger()
         },
      }
   })

   setV(_customRef)
   return _customRef as ShortRef<T>
}

export function getEdges(root: HTMLElement) {
   // Mobile devices require window.innerHeight
   const clientHeight = root === document.documentElement ? window.innerHeight : root.clientHeight

   const isTop = root.scrollTop <= FIXED_OFFSET * 2
   const isBottom = Math.abs(root.scrollHeight - clientHeight - root.scrollTop) <= 1

   return {
      isTop,
      isBottom,
   }
}

export function isScrollbarClick(event: PointerEvent) {
   console.log('isScrollbarClick', event.clientX >= window.innerWidth - 17)

   return event.clientX >= window.innerWidth - 17
}

export const defaultOptions = {
   jumpToFirst: true,
   jumpToLast: true,
   overlayHeight: 0,
   minWidth: 0,
   replaceHash: false,
   root: null,
   boundaryOffset: {
      toTop: 0,
      toBottom: 0,
   },
   edgeOffset: {
      first: 100,
      last: -100,
   },
} as const
