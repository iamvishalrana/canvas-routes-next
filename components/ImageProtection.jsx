'use client'
import { useEffect } from 'react'

function applyVideoProtection(el) {
  el.setAttribute('controlsList', 'nodownload nofullscreen')
  el.setAttribute('disablePictureInPicture', '')
  el.setAttribute('oncontextmenu', 'return false')
}

export default function ImageProtection() {
  useEffect(() => {
    // Block right-click on images and videos
    function block(e) {
      if (e.target.closest('img, video, [data-protect]')) {
        e.preventDefault()
        return false
      }
    }
    document.addEventListener('contextmenu', block)

    // Strip download button from any video already in the DOM
    document.querySelectorAll('video').forEach(applyVideoProtection)

    // Watch for videos added dynamically (e.g. lazy-loaded sections)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue
          if (node.tagName === 'VIDEO') applyVideoProtection(node)
          node.querySelectorAll?.('video').forEach(applyVideoProtection)
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      document.removeEventListener('contextmenu', block)
      observer.disconnect()
    }
  }, [])
  return null
}
