# Vecnova Informática

Sitio web oficial y arquitectura de servicios profesionales de **Vecnova Informática**.

- **URL de producción:** [https://vecnovainformatica.com](https://vecnovainformatica.com)

El proyecto funciona como escaparate de servicios profesionales para particulares y pequeñas empresas (soporte informático presencial en Barcelona, mantenimiento de sistemas, puestas a punto e infraestructura cloud), y al mismo tiempo como caso de estudio técnico y portfolio de arquitectura reproducible con infraestructura como código.

---

## Arquitectura Cloud

La infraestructura de alojamiento en Amazon Web Services (AWS) está diseñada como una arquitectura estática serverless, de alta disponibilidad, mínimo coste operativo y sin servidores que mantener ni parchear:

- **Almacenamiento privado:** Bucket Amazon S3 con bloqueo total de acceso público (Block Public Access) y versionado de objetos activado.
- **Distribución perimetral:** Amazon CloudFront como punto único de entrada global con aceleración HTTPS, compresión gzip/brotli y acceso a S3 exclusivamente mediante Origin Access Control (OAC).
- **Certificados y TLS:** AWS Certificate Manager (ACM) en `us-east-1` con validación DNS automática.
- **Gestión de DNS:** Amazon Route 53 gestionando los registros alias (`A` y `AAAA`) para el dominio ápice y subdominio `www`.
- **Lógica en el borde (Edge Computing):** CloudFront Function para resolución síncrona de URLs limpias (mapeo de subcarpetas a `index.html`) y redirección 301 canónica de `www` al dominio ápice.
- **Infraestructura como Código (IaC):** Declarada y gestionada íntegramente con [Terraform](https://www.terraform.io/).
- **Integración y Despliegue Continuo (CI/CD):** Flujo de GitHub Actions que autentica con AWS asumiendo un rol IAM temporal mediante OpenID Connect (OIDC) federado con *subject* inmutable, sin utilizar credenciales de larga duración almacenadas en el repositorio.

Para más detalles sobre la configuración, variables y provisión de la infraestructura, consulta [infra/site/README.md](infra/site/README.md).

---

## Stack Tecnológico

- **Generador de sitio estático:** [Astro 5](https://astro.build/) — compilación a HTML estático de alto rendimiento y cero JavaScript innecesario en cliente.
- **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/) — utilidades y diseño reactivo.
- **Animaciones e interactividad:** [GSAP](https://greensock.com/gsap/) con ScrollTrigger — revelado suave de secciones respetando `prefers-reduced-motion`.
- **Lienzo gráfico:** [Three.js](https://threejs.org/) — visualización de la esfera geodésica interactiva del hero.
- **Tipografía:** [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk).

---

## Comandos de Desarrollo

El proyecto requiere Node.js 22 (especificado en `.nvmrc`).

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo local
npm run dev

# Compilar para producción (genera la carpeta dist/)
npm run build

# Previsualizar la compilación de producción localmente
npm run preview

# Verificar integridad de recursos físicos en dist/
npm run check:assets
```

---

## Prácticas de Seguridad

- **Control de secretos:** Cero credenciales de larga duración en GitHub o en el código fuente. Despliegues automatizados mediante roles temporales asumidos por OIDC.
- **Hooks de pre-commit:** Ejecución automática de escaneo de secretos con [Gitleaks](https://github.com/gitleaks/gitleaks), control de claves privadas, fin de línea y validación de sintaxis antes de cada commit.
- **Integración continua:** Cada pull request y push verifica la compilación estática, valida la existencia de recursos, escanea secretos y comprueba la sintaxis de Terraform.
- **Cabeceras HTTP seguras:** Configuración de cabeceras en CloudFront (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`).

---

## Licencia

El código de este proyecto (infraestructura, scripts, flujos y componentes) está disponible bajo la licencia [MIT](LICENSE).

Los textos, logotipos y la marca «Vecnova Informática» son propiedad del titular y no están cubiertos por esa licencia.

GSAP y ScrollTrigger conservan su propia licencia (no MIT) y el resto de terceros están en [public/third-party-notices.txt](public/third-party-notices.txt).
