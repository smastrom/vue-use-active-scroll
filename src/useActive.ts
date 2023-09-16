import { onMounted, unref, watch, isRef, isReactive, onBeforeUnmount, shallowReactive } from 'vue'
import {
   computed,
   ref,
   getEdges,
   useMediaRef,
   isSSR,
   FIXED_OFFSET,
   defaultOptions as def,
} from './utils'
import type { UseActiveOptions, UseActiveReturn, ShortRef, Targets } from './types'

export function useActive(
   userTargets: Targets,
   {
      root: _root = def.root,
      jumpToFirst = def.jumpToFirst,
      jumpToLast = def.jumpToLast,
      overlayHeight = def.overlayHeight,
      minWidth = def.minWidth,
      replaceHash = def.replaceHash,
      boundaryOffset: {
         toTop = def.boundaryOffset.toTop,
         toBottom = def.boundaryOffset.toTop,
      } = def.boundaryOffset,
      edgeOffset: {
         first: firstOffset = def.edgeOffset.first,
         last: lastOffset = def.edgeOffset.last,
      } = def.edgeOffset,
   }: UseActiveOptions = def
): UseActiveReturn {
   /*
    * ====================================================================================
    * Reactivity
    * ==================================================================================== */

   // Root

   const root = computed(() =>
      isSSR ? null : unref(_root) instanceof HTMLElement ? unref(_root) : document.documentElement
   ) as ShortRef<HTMLElement>

   const isWindow = computed(() => root.v === document.documentElement)

   // Targets

   const targets = shallowReactive({
      els: [] as HTMLElement[],
      top: new Map<string, number>(),
      bottom: new Map<string, number>(),
   })

   // Controls

   const matchMedia = ref(isSSR || window.matchMedia(`(min-width: ${minWidth}px)`).matches)
   const isScrollFromClick = useMediaRef(matchMedia, false)
   const isScrollIdle = ref(false)

   const clickStartY = computed(() => (isScrollFromClick.v ? getCurrentY() : 0))

   // Returned

   const activeEl = useMediaRef(matchMedia, null as HTMLElement | null)

   const activeId = computed(() => activeEl.v?.id || '')
   const activeIndex = computed(() => targets.els.indexOf(activeEl.v as HTMLElement))

   // Non-reactive

   let prevY = isSSR ? 0 : getCurrentY()

   let resizeObserver: ResizeObserver
   let skipObserverCallback = true

   /* ====================================================================================
    * Utils
    * ==================================================================================== */

   function getCurrentY() {
      return isWindow.v ? window.scrollY : root.v.scrollTop
   }

   function getSentinel() {
      return isWindow.v ? root.v.getBoundingClientRect().top : -root.v.scrollTop
   }

   /* ====================================================================================
    * Utils - Targets
    * ==================================================================================== */

   function prepareTargets() {
      let _targets = <HTMLElement[]>[]

      if (userTargets.value[0] instanceof HTMLElement) {
         _targets = userTargets.value as HTMLElement[]
      } else {
         userTargets.value.forEach((id) => {
            const target = document.getElementById(id as string)
            if (target) _targets.push(target)
         })
      }

      _targets.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)

      targets.els = _targets

      const rootTop = root.v.getBoundingClientRect().top - (isWindow.v ? 0 : root.v.scrollTop)

      targets.top.clear()
      targets.bottom.clear()

      _targets.forEach((target) => {
         const { top, bottom } = target.getBoundingClientRect()

         const id = target.id || Math.random().toString(36).substr(2, 9)

         targets.top.set(id, top - rootTop)
         targets.bottom.set(id, bottom - rootTop)
      })
   }

   /* ====================================================================================
    * Utils - Scroll
    * ==================================================================================== */

   function setActive({ prevY, isCancel = false }: { prevY: number; isCancel?: boolean }) {
      const nextY = getCurrentY()

      if (nextY < prevY) {
         onScrollUp()
      } else {
         onScrollDown({ isCancel })
      }

      return nextY
   }

   const getLast = <T>(arr: T[]) => arr[arr.length - 1]

   function onEdgeReached() {
      if (!jumpToFirst && !jumpToLast) return false

      const { isBottom, isTop } = getEdges(root.v)

      if (jumpToFirst && isTop) {
         return (activeEl.v = targets.els[0]), true
      }

      if (jumpToLast && isBottom) {
         return (activeEl.v = getLast(targets.els)), true
      }
   }

   // Sets first target-top that LEFT the root
   function onScrollDown({ isCancel } = { isCancel: false }) {
      let firstOutEl = jumpToFirst ? targets.els[0] : null

      const sentinel = getSentinel()
      const offset = FIXED_OFFSET + overlayHeight + toBottom

      Array.from(targets.top).some(([_, top], idx) => {
         const _firstOffset = !jumpToFirst && idx === 0 ? firstOffset : 0

         if (sentinel + top < offset + _firstOffset) {
            return (firstOutEl = targets.els[idx]), false
         }

         return true // Return last
      })

      // Reset activeEl once last target-bottom is out of view
      if (!jumpToLast && firstOutEl === getLast(targets.els)) {
         const lastBottom = getLast(Array.from(targets.bottom.values()))

         if (sentinel + lastBottom < offset + lastOffset) {
            return (activeEl.v = null)
         }
      }

      // Highlight only next on smoothscroll/custom easings...
      const isNext =
         targets.els.indexOf(firstOutEl as HTMLElement) >
         targets.els.indexOf(activeEl.v as HTMLElement)

      if (isNext || (firstOutEl && !activeEl.v)) return (activeEl.v = firstOutEl)

      // ...but not on scroll cancel
      if (isCancel) activeEl.v = firstOutEl
   }

   // Sets first target-bottom that ENTERED the root
   function onScrollUp() {
      let firstInEl = jumpToLast ? getLast(targets.els) : null

      const sentinel = getSentinel()
      const offset = FIXED_OFFSET + overlayHeight + toTop

      Array.from(targets.bottom).some(([_, bottom], idx) => {
         const _lastOffset = !jumpToLast && idx === targets.bottom.size - 1 ? lastOffset : 0

         if (sentinel + bottom > offset + _lastOffset) {
            return (firstInEl = targets.els[idx]), true // Return first
         }
      })

      // Remove activeId once first target-top is in view
      if (!jumpToFirst) {
         if (firstInEl === targets.els[0]) {
            const firstTop = targets.top.values().next().value

            if (sentinel + firstTop > offset + firstOffset) return (activeEl.v = null)
         }
      }

      const isPrev = // Highlight only prev on smoothscroll/custom easings...
         targets.els.indexOf(firstInEl as HTMLElement) <
         targets.els.indexOf(activeEl.v as HTMLElement)

      if (isPrev || (firstInEl && !activeEl.v)) return (activeEl.v = firstInEl)
   }

   function onScroll() {
      if (!isScrollFromClick.v) {
         prevY = setActive({ prevY })
         onEdgeReached()
      }
   }

   function setIdleScroll(maxFrames = 20) {
      let rafId: DOMHighResTimeStamp | undefined = undefined
      let rafPrevY = getCurrentY()
      let frameCount = 0

      function scrollEnd() {
         frameCount++

         const rafNextY = getCurrentY()

         if (rafPrevY !== rafNextY) {
            frameCount = 0
            rafPrevY = rafNextY
            return requestAnimationFrame(scrollEnd)
         }

         // Wait for n frames after scroll to make sure is idle
         if (frameCount === maxFrames) {
            isScrollIdle.v = true
            isScrollFromClick.v = false
            cancelAnimationFrame(rafId as DOMHighResTimeStamp)
         } else {
            requestAnimationFrame(scrollEnd)
         }
      }

      rafId = requestAnimationFrame(scrollEnd)
   }

   function setMountIdle() {
      if (location.hash) {
         setIdleScroll(10)
      } else {
         isScrollIdle.v = true
      }
   }

   /* ====================================================================================
    * Utils - Hash
    * ==================================================================================== */

   function setFromHash() {
      const hashEl = targets.els.find(({ id }) => id === location.hash.slice(1))

      if (hashEl) {
         return (activeEl.v = hashEl), true
      }
   }

   function onPrevNext(event: PopStateEvent) {
      // If scrolled back to top

      if (!event?.state?.current.includes('#') && activeEl.v) {
         return (activeEl.v = jumpToFirst ? targets.els[0] : null)
      }

      setFromHash()
   }

   function addPrevNextListener() {
      window.addEventListener('popstate', onPrevNext)
   }

   function removePrevNextListener() {
      window.removeEventListener('popstate', onPrevNext)
   }

   /* ====================================================================================
    * Utils - Resize
    * ==================================================================================== */

   function onWindowResize() {
      matchMedia.v = window.matchMedia(`(min-width: ${minWidth}px)`).matches
   }

   function setResizeObserver() {
      resizeObserver = new ResizeObserver(() => {
         if (!skipObserverCallback) {
            prepareTargets()
            requestAnimationFrame(() => {
               if (!onEdgeReached()) onScrollDown()
            })
         } else {
            skipObserverCallback = false
         }
      })

      resizeObserver.observe(root.v)
   }

   function destroyResizeObserver() {
      resizeObserver?.disconnect()
   }

   /* ====================================================================================
    * Utils - Scroll cancel
    * ==================================================================================== */

   function restoreHighlight() {
      isScrollFromClick.v = false
   }

   function onSpaceBar(event: KeyboardEvent) {
      if (event.code === 'Space') restoreHighlight()
   }

   function onFirefoxCancel(event: PointerEvent) {
      const isAnchor = (event.target as HTMLElement).tagName === 'A'

      if (CSS.supports('-moz-appearance', 'none') && !isAnchor) {
         const { isBottom, isTop } = getEdges(root.v)

         if (!isTop && !isBottom) {
            restoreHighlight()
            setActive({ prevY: clickStartY.v, isCancel: true })
         }
      }
   }

   /* ====================================================================================
    * Lifecycle
    * ==================================================================================== */

   onMounted(async () => {
      window.addEventListener('resize', onWindowResize, { passive: true })

      // https://github.com/nuxt/content/issues/1799
      await new Promise((resolve) => setTimeout(resolve))

      if (matchMedia.v) {
         prepareTargets()
         setResizeObserver()
         setMountIdle()
         addPrevNextListener()

         // Hash has priority only on mount...
         if (!setFromHash() && !onEdgeReached()) onScrollDown()
      }
   })

   // Updates - Targets

   watch(root, prepareTargets, { flush: 'post' })

   watch(isRef(userTargets) || isReactive(userTargets) ? userTargets : () => null, prepareTargets, {
      flush: 'post',
   })

   // Updates - Resize

   watch(matchMedia, (_matchMedia) => {
      if (_matchMedia) {
         prepareTargets()
         setResizeObserver()
         addPrevNextListener()

         // ...but not on resize
         if (!onEdgeReached()) onScrollDown()
      } else {
         activeEl.v = null
         removePrevNextListener()
         destroyResizeObserver()
      }
   })

   // Updates - Hash

   watch(activeIndex, (newIndex) => {
      if (replaceHash) {
         const baseUrl = location.href.split('#')[0]
         const start = jumpToFirst ? 0 : -1
         const newHash = newIndex > start ? `#${activeId.v}` : ''

         history.replaceState(history.state, '', `${baseUrl}${newHash}`)
      }
   })

   // Destroy

   onBeforeUnmount(() => {
      window.removeEventListener('resize', onWindowResize)
      removePrevNextListener()
      destroyResizeObserver()
   })

   /* ====================================================================================
    * Scroll listeners
    * ==================================================================================== */

   // Main listener

   watch(
      [isScrollIdle, matchMedia, root, userTargets],
      ([_isScrollIdle, _matchMedia, _root, _userTargets], _, onCleanup) => {
         const rootEl = isWindow.v ? document : _root
         const isActive = rootEl && _isScrollIdle && _matchMedia && _userTargets.length > 0

         if (isActive) rootEl.addEventListener('scroll', onScroll, { passive: true })

         onCleanup(() => {
            if (isActive) rootEl.removeEventListener('scroll', onScroll)
         })
      }
   )

   // Dynamic behavior

   const events = [
      ['wheel', restoreHighlight, { once: true }],
      ['touchmove', restoreHighlight, { once: true }],
      ['keydown', onSpaceBar as EventListener, { once: true }],
      ['scroll', setIdleScroll as unknown as EventListener, { passive: true, once: true }],
      ['pointerdown', onFirefoxCancel as EventListener], // Must persist until next scroll
   ] as const

   watch(isScrollFromClick, (_isScrollFromClick, _, onCleanup) => {
      const rootEl = isWindow.v ? document : root.v
      const hasTargets = userTargets.value.length > 0

      if (_isScrollFromClick && hasTargets) {
         events.forEach(([e, cb, options]) => rootEl.addEventListener(e, cb, options))
      }

      onCleanup(() => {
         if (_isScrollFromClick && hasTargets) {
            events.forEach(([e, cb]) => rootEl.removeEventListener(e, cb))
         }
      })
   })

   /* ====================================================================================
    * Return
    * ==================================================================================== */

   function isActive(target: string | HTMLElement) {
      if (target instanceof HTMLElement) return target === activeEl.v
      if (typeof target === 'string') return target === activeId.v

      return false
   }

   function _setActive(target: string | HTMLElement) {
      if (target instanceof HTMLElement) activeEl.v = target

      if (typeof target === 'string') {
         activeEl.v = targets.els.find(({ id }) => id === target) || null
      }

      isScrollFromClick.v = true
   }

   return {
      isActive,
      setActive: _setActive,
      activeEl,
      activeId,
      activeIndex,
   }
}
