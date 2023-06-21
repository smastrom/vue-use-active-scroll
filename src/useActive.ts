import {
   onMounted,
   unref,
   watch,
   isRef,
   isReactive,
   onBeforeUnmount,
   reactive,
   type Ref,
} from 'vue'
import {
   computed,
   ref,
   getEdges,
   useMediaRef,
   isSSR,
   FIXED_OFFSET,
   defaultOptions as def,
} from './utils'
import type { UseActiveOptions, UseActiveReturn, ShortRef } from './types'

export function useActive(
   userIds: string[] | Ref<string[]>,
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
   // Reactivity - Internal - Root

   const root = computed(() =>
      isSSR ? null : unref(_root) instanceof HTMLElement ? unref(_root) : document.documentElement
   ) as ShortRef<HTMLElement>

   const isWindow = computed(() => root.v === document.documentElement)

   // Reactivity - Internal - Targets

   const targets = reactive({
      elements: [] as HTMLElement[],
      top: new Map<string, number>(),
      bottom: new Map<string, number>(),
   })

   const ids = computed(() => targets.elements.map(({ id }) => id))

   // Reactivity - Internal - Controls

   const matchMedia = ref(isSSR || window.matchMedia(`(min-width: ${minWidth}px)`).matches)
   const isScrollFromClick = useMediaRef(matchMedia, false)
   const isScrollIdle = ref(false)

   // Reactivity - Internal - Coords

   const clickStartY = computed(() => (isScrollFromClick.v ? getCurrentY() : 0))

   // Reactivity - Returned

   const activeId = useMediaRef(matchMedia, '')
   const activeIndex = computed(() => ids.v.indexOf(activeId.v))

   // Non-reactive

   let prevY = isSSR ? 0 : getCurrentY()

   let resizeObserver: ResizeObserver
   let skipObserverCallback = true

   // Functions - Coords

   function getCurrentY() {
      return isWindow.v ? window.scrollY : root.v.scrollTop
   }

   function getSentinel() {
      return isWindow.v ? root.v.getBoundingClientRect().top : -root.v.scrollTop
   }

   // Functions - Targets

   function setTargets() {
      const _targets = <HTMLElement[]>[]

      unref(userIds).forEach((id) => {
         const target = document.getElementById(id)
         if (target) {
            _targets.push(target)
         }
      })

      _targets.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
      targets.elements = _targets

      const rootTop = root.v.getBoundingClientRect().top - (isWindow.v ? 0 : root.v.scrollTop)

      targets.top.clear()
      targets.bottom.clear()

      targets.elements.forEach((target) => {
         const { top, bottom } = target.getBoundingClientRect()
         targets.top.set(target.id, top - rootTop)
         targets.bottom.set(target.id, bottom - rootTop)
      })
   }

   // Functions - Scroll

   function onEdgeReached() {
      if (!jumpToFirst && !jumpToLast) {
         return false
      }

      const { isBottom, isTop } = getEdges(root.v)

      if (jumpToFirst && isTop) {
         return (activeId.v = ids.v[0]), true
      }
      if (jumpToLast && isBottom) {
         return (activeId.v = ids.v[ids.v.length - 1]), true
      }
   }

   // Sets first target-top that LEFT the viewport
   function onScrollDown({ isCancel } = { isCancel: false }) {
      let firstOut = jumpToFirst ? ids.v[0] : ''

      const sentinel = getSentinel()
      const offset = FIXED_OFFSET + overlayHeight + toBottom

      Array.from(targets.top).some(([id, top], index) => {
         const _firstOffset = !jumpToFirst && index === 0 ? firstOffset : 0

         if (sentinel + top < offset + _firstOffset) {
            return (firstOut = id), false
         }
         return true // Return last
      })

      // Remove activeId once last target-bottom is out of view
      if (!jumpToLast && firstOut === ids.v[ids.v.length - 1]) {
         const lastBottom = Array.from(targets.bottom.values())[ids.v.length - 1]

         if (sentinel + lastBottom < offset + lastOffset) {
            return (activeId.v = '')
         }
      }

      // Highlight only next on smoothscroll/custom easings...
      if (ids.v.indexOf(firstOut) > ids.v.indexOf(activeId.v) || (firstOut && !activeId.v)) {
         return (activeId.v = firstOut)
      }

      // ...but not on scroll cancel
      if (isCancel) activeId.v = firstOut
   }

   // Sets first target-bottom that ENTERED the viewport
   function onScrollUp() {
      let firstIn = jumpToLast ? ids.v[ids.v.length - 1] : ''

      const sentinel = getSentinel()
      const offset = FIXED_OFFSET + overlayHeight + toTop

      Array.from(targets.bottom).some(([id, bottom], index) => {
         const _lastOffset = !jumpToLast && index === ids.v.length - 1 ? lastOffset : 0

         if (sentinel + bottom > offset + _lastOffset) {
            return (firstIn = id), true // Return first
         }
      })

      // Remove activeId once first target-top is in view
      if (!jumpToFirst && firstIn === ids.v[0]) {
         if (sentinel + targets.top.values().next().value > offset + firstOffset) {
            return (activeId.v = '')
         }
      }

      if (
         // Highlight only prev on smoothscroll/custom easings...
         ids.v.indexOf(firstIn) < ids.v.indexOf(activeId.v) ||
         (firstIn && !activeId.v)
      ) {
         return (activeId.v = firstIn)
      }
   }

   function setActive({ prevY, isCancel = false }: { prevY: number; isCancel?: boolean }) {
      const nextY = getCurrentY()

      if (nextY < prevY) {
         onScrollUp()
      } else {
         onScrollDown({ isCancel })
      }

      return nextY
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

   // Functions - Hash

   function setFromHash() {
      const hashId = targets.elements.find(({ id }) => id === location.hash.slice(1))?.id

      if (hashId) return (activeId.v = hashId), true
   }

   function onHashChange(event: HashChangeEvent) {
      // If scrolled back to top
      if (!event.newURL.includes('#') && activeId.v) {
         return (activeId.v = jumpToFirst ? ids.v[0] : '')
      }

      setFromHash()
   }

   function addHashChangeListener() {
      window.addEventListener('hashchange', onHashChange)
   }

   function removeHashChangeListener() {
      window.removeEventListener('hashchange', onHashChange)
   }

   // Functions - Resize

   function onWindowResize() {
      matchMedia.v = window.matchMedia(`(min-width: ${minWidth}px)`).matches
   }

   function setResizeObserver() {
      resizeObserver = new ResizeObserver(() => {
         if (!skipObserverCallback) {
            setTargets()
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

   // Functions - Scroll cancel

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

   // Functions - Returned

   function isActive(id: string) {
      return id === activeId.v
   }

   function _setActive(id: string) {
      activeId.v = id
      isScrollFromClick.v = true
   }

   // Mount - Non-scroll listeners, targets and first highlight

   onMounted(async () => {
      window.addEventListener('resize', onWindowResize, { passive: true })

      // https://github.com/nuxt/content/issues/1799
      await new Promise((resolve) => setTimeout(resolve))

      if (matchMedia.v) {
         setTargets()
         setResizeObserver()
         setMountIdle()
         addHashChangeListener()

         // Hash has priority only on mount...
         if (!setFromHash() && !onEdgeReached()) onScrollDown()
      }
   })

   // Updates - Targets

   watch(root, setTargets, { flush: 'post' })

   watch(isRef(userIds) || isReactive(userIds) ? userIds : () => null, setTargets, {
      flush: 'post',
   })

   // Updates - MatchMedia

   watch(matchMedia, (_matchMedia) => {
      if (_matchMedia) {
         setTargets()
         setResizeObserver()
         addHashChangeListener()

         // ...but not on resize
         if (!onEdgeReached()) onScrollDown()
      } else {
         activeId.v = ''
         removeHashChangeListener()
         destroyResizeObserver()
      }
   })

   // Updates - Default behavior

   watch(
      [isScrollIdle, matchMedia, root, userIds],
      ([_isScrollIdle, _matchMedia, _root, _userIds], _, onCleanup) => {
         const rootEl = isWindow.v ? document : _root
         const isActive = rootEl && _isScrollIdle && _matchMedia && unref(_userIds)?.length > 0

         if (isActive) {
            rootEl.addEventListener('scroll', onScroll, { passive: true })
         }

         onCleanup(() => {
            if (isActive) rootEl.removeEventListener('scroll', onScroll)
         })
      }
   )

   // Updates - Dynamic behavior

   watch(
      isScrollFromClick,
      (_isScrollFromClick, _, onCleanup) => {
         const rootEl = isWindow.v ? document : root.v
         const hasTargets = unref(userIds)?.length > 0

         if (_isScrollFromClick && hasTargets) {
            rootEl.addEventListener('wheel', restoreHighlight, { once: true })
            rootEl.addEventListener('touchmove', restoreHighlight, { once: true })
            rootEl.addEventListener('scroll', setIdleScroll as unknown as EventListener, {
               passive: true,
               once: true,
            })
            rootEl.addEventListener('keydown', onSpaceBar as EventListener, { once: true })
            rootEl.addEventListener('pointerdown', onFirefoxCancel as EventListener) // Must persist until next scroll
         }

         onCleanup(() => {
            if (_isScrollFromClick && hasTargets) {
               rootEl.removeEventListener('wheel', restoreHighlight)
               rootEl.removeEventListener('touchmove', restoreHighlight)
               rootEl.removeEventListener('scroll', setIdleScroll as unknown as EventListener)
               rootEl.removeEventListener('keydown', onSpaceBar as EventListener)
               rootEl.removeEventListener('pointerdown', onFirefoxCancel as EventListener)
            }
         })
      },
      { flush: 'sync' }
   )

   // Updates - Hash

   watch(activeId, (newId) => {
      if (replaceHash) {
         const start = jumpToFirst ? 0 : -1
         const newHash = `${location.pathname}${activeIndex.v > start ? `#${newId}` : ''}`
         history.replaceState(history.state, '', newHash)
      }
   })

   // Destroy

   onBeforeUnmount(() => {
      window.removeEventListener('resize', onWindowResize)
      removeHashChangeListener()
      destroyResizeObserver()
   })

   return {
      isActive,
      setActive: _setActive,
      activeId,
      activeIndex,
   }
}
