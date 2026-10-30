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
 * Marca el documento como JS-activo para que los estilos de ocultación
 * de .gs_reveal solo se apliquen con JavaScript disponible.
 * Sin JS, los elementos permanecen visibles (ajuste 4).
 */
document.documentElement.classList.add('js-enabled');

/**
 * Respeta prefers-reduced-motion: si el usuario prefiere
 * movimiento reducido, muestra todo sin animación.
 */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReducedMotion) {
  // Mostrar todos los elementos sin animación
  gsap.utils.toArray('.gs_reveal').forEach(function (elem) {
    gsap.set(/** @type {Element} */ (elem), { autoAlpha: 1, x: 0, y: 0 });
  });
  gsap.utils.toArray('.hero-blur-in').forEach(function (elem) {
    gsap.set(/** @type {Element} */ (elem), { autoAlpha: 1, filter: 'none', y: 0 });
  });
} else {
  /**
   * Animación de entrada inicial con difuminado progresivo para la cabecera (pantallazo 1)
   */
  const heroElements = gsap.utils.toArray('.hero-blur-in');
  if (heroElements.length > 0) {
    gsap.fromTo(
      heroElements,
      { autoAlpha: 0, filter: 'blur(10px)', y: 20 },
      {
        duration: 0.85,
        autoAlpha: 1,
        filter: 'blur(0px)',
        y: 0,
        ease: 'power2.out',
        stagger: 0.12,
        delay: 0.05
      }
    );
  }
  /**
   * Determina la dirección de entrada y el desplazamiento del elemento.
   * En pantallas estrechas (< 768px), las animaciones laterales pasan a
   * verticales para evitar overflow horizontal.
   */
  function animateFrom(elem, direction) {
    direction = direction || 1;
    var x = 0,
        y = direction * 100;

    var isMobile = window.innerWidth < 768;

    if (!isMobile && elem.classList.contains('gs_reveal_fromLeft')) {
      x = -100;
      y = 0;
    } else if (!isMobile && elem.classList.contains('gs_reveal_fromRight')) {
      x = 100;
      y = 0;
    }

    elem.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    elem.style.opacity = '0';

    gsap.fromTo(elem, { x: x, y: y, autoAlpha: 0 }, {
      duration: 1.9,
      x: 0,
      y: 0,
      autoAlpha: 1,
      ease: 'power3.out',
      overwrite: 'auto'
    });
  }

  function hide(elem) {
    gsap.set(elem, { autoAlpha: 0 });
  }

  gsap.utils.toArray('.gs_reveal').forEach(function (elem) {
    hide(elem);

    ScrollTrigger.create({
      trigger: /** @type {Element} */ (elem),
      start: 'top 78%',
      onEnter: function () { animateFrom(/** @type {Element} */ (elem)); },
      onEnterBack: function () { animateFrom(/** @type {Element} */ (elem), -1); },
      onLeave: function () { hide(/** @type {Element} */ (elem)); }
    });
  });
}
