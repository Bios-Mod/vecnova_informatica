/*!
 * Scroll Reveal Effect
 * Based on: "Reveal animations based on scroll direction"
 * Author: GSAP
 * URL: https://codepen.io/GreenSock/pen/pojzxwZ
 * License: MIT
 *
 * Copyright (c) 2026 by GSAP (https://codepen.io/GreenSock/pen/pojzxwZ)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Parámetros globales del efecto de revelado bidireccional (único punto de ajuste).
 */
const SCROLL_REVEAL_CONFIG = {
  triggerStart: 'top 78%',
  triggerEnd: 'bottom 22%',
  offsetX: 100,
  offsetY: 100,
  mobileBreakpoint: 768,
  enterDuration: 1.9,
  leaveDuration: 0.35,
  heroDuration: 0.85,
  heroStagger: 0.12,
  heroDelay: 0.05,
};

/**
 * Marca el documento como JS-activo para que los estilos de ocultación
 * de .gs_reveal solo se apliquen con JavaScript disponible.
 * Sin JS, los elementos permanecen visibles.
 */
document.documentElement.classList.add('js-enabled');

/**
 * Respeta prefers-reduced-motion: si el usuario prefiere
 * movimiento reducido, muestra todo sin animación.
 */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReducedMotion) {
  gsap.utils.toArray('.gs_reveal').forEach(function (elem) {
    gsap.set(/** @type {Element} */ (elem), { autoAlpha: 1, x: 0, y: 0 });
  });
  gsap.utils.toArray('.hero-blur-in').forEach(function (elem) {
    gsap.set(/** @type {Element} */ (elem), { autoAlpha: 1, filter: 'none', y: 0 });
  });
} else {
  /**
   * Animación de entrada inicial con difuminado progresivo para la cabecera (#inicio)
   */
  const heroElements = gsap.utils.toArray('.hero-blur-in');
  if (heroElements.length > 0) {
    gsap.fromTo(
      heroElements,
      { autoAlpha: 0, filter: 'blur(10px)', y: 20 },
      {
        duration: SCROLL_REVEAL_CONFIG.heroDuration,
        autoAlpha: 1,
        filter: 'blur(0px)',
        y: 0,
        ease: 'power2.out',
        stagger: SCROLL_REVEAL_CONFIG.heroStagger,
        delay: SCROLL_REVEAL_CONFIG.heroDelay,
      }
    );
  }

  /**
   * Entrada animada desde izquierda/derecha (en móvil, vertical según dirección).
   */
  function animateIn(elem, direction) {
    var dir = direction || 1;
    var x = 0;
    var y = dir * SCROLL_REVEAL_CONFIG.offsetY;
    var isMobile = window.innerWidth < SCROLL_REVEAL_CONFIG.mobileBreakpoint;

    if (!isMobile && elem.classList.contains('gs_reveal_fromLeft')) {
      x = -SCROLL_REVEAL_CONFIG.offsetX;
      y = 0;
    } else if (!isMobile && elem.classList.contains('gs_reveal_fromRight')) {
      x = SCROLL_REVEAL_CONFIG.offsetX;
      y = 0;
    }

    gsap.killTweensOf(elem);
    elem.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    elem.style.opacity = '0';

    gsap.fromTo(
      elem,
      { x: x, y: y, autoAlpha: 0 },
      {
        duration: SCROLL_REVEAL_CONFIG.enterDuration,
        x: 0,
        y: 0,
        autoAlpha: 1,
        ease: 'power3.out',
        overwrite: 'auto',
        clearProps: 'transform',
      }
    );
  }

  /**
   * Desvanecido rápido al salir del viewport (solo opacidad, sin transform).
   */
  function fadeOut(elem) {
    gsap.killTweensOf(elem);
    gsap.to(elem, {
      duration: SCROLL_REVEAL_CONFIG.leaveDuration,
      autoAlpha: 0,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }

  function isProgrammaticAnchorScroll() {
    return Boolean(/** @type {any} */ (window).__vecnovaAnchorScrolling);
  }

  /** @type {Array<{ syncAfterAnchorJump: () => void }>} */
  const registry = [];

  gsap.utils.toArray('.gs_reveal').forEach(function (elem) {
    const el = /** @type {HTMLElement} */ (elem);
    let isVisible = false;

    function syncImmediate(triggerSelf) {
      gsap.killTweensOf(el);
      if (triggerSelf.isActive) {
        isVisible = true;
        gsap.set(el, { autoAlpha: 1, x: 0, y: 0, clearProps: 'transform' });
      } else {
        isVisible = false;
        gsap.set(el, { autoAlpha: 0, x: 0, y: 0, clearProps: 'transform' });
      }
    }

    const st = ScrollTrigger.create({
      trigger: el,
      start: SCROLL_REVEAL_CONFIG.triggerStart,
      end: SCROLL_REVEAL_CONFIG.triggerEnd,
      onEnter: function () {
        if (isProgrammaticAnchorScroll()) return;
        isVisible = true;
        animateIn(el, 1);
      },
      onEnterBack: function () {
        if (isProgrammaticAnchorScroll()) return;
        isVisible = true;
        animateIn(el, -1);
      },
      onLeave: function () {
        if (isProgrammaticAnchorScroll()) return;
        isVisible = false;
        fadeOut(el);
      },
      onLeaveBack: function () {
        if (isProgrammaticAnchorScroll()) return;
        isVisible = false;
        fadeOut(el);
      },
      onRefresh: function (self) {
        if (isProgrammaticAnchorScroll()) return;
        syncImmediate(self);
      },
    });

    // Estado inicial derivado de self.isActive (recarga en /#contacto, entrada directa o /)
    if (st.isActive) {
      isVisible = true;
      animateIn(el, 1);
    } else {
      isVisible = false;
      gsap.set(el, { autoAlpha: 0, x: 0, y: 0, clearProps: 'transform' });
    }

    registry.push({
      syncAfterAnchorJump: function () {
        if (st.isActive) {
          if (!isVisible) {
            isVisible = true;
            animateIn(el, 1);
          }
        } else {
          isVisible = false;
          gsap.killTweensOf(el);
          gsap.set(el, { autoAlpha: 0, x: 0, y: 0, clearProps: 'transform' });
        }
      },
    });
  });

  window.addEventListener('vecnova:anchor-scroll-end', function () {
    ScrollTrigger.update(true);
    registry.forEach(function (entry) {
      entry.syncAfterAnchorJump();
    });
  });

  window.addEventListener('load', function () {
    ScrollTrigger.refresh();
  });
}
