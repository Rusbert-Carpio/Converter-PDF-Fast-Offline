# Release hardening plan

Este proyecto fue consolidado para avanzar hacia una publicación seria en Play Store, pero antes de release final todavía deben verificarse manualmente estos puntos en dispositivos reales y build release:

## Ads y monetización
- Validar carga de banner adaptativo en Android release.
- Verificar que el banner no aparezca en `plans`, `premium`, `pdf-viewer`, `language-setup` ni `privacy-policy`.
- Confirmar rewarded e interstitial con unit IDs reales en build release.
- Revisar frecuencia percibida de interstitial para evitar fatiga publicitaria.

## Premium / IAP
- Confirmar productos activos en Play Console.
- Probar compra mensual y anual en entorno de test interno.
- Probar restauración de compras.
- Confirmar sincronización correcta entre cache local y store tras reinstalación.

## Funcionalidad núcleo
- Probar image-to-pdf con lotes pequeños y grandes.
- Probar pdf-to-image con PDFs de varias páginas, PDFs pesados y PDFs inválidos.
- Probar merge con archivos locales y desde historial.
- Probar visor con archivos recientes, compartidos y rutas persistidas.

## Play Store
- Revisar disclosures de ads y billing.
- Validar política de privacidad publicada.
- Revisar screenshots, descripción, categorías y data safety.
- Generar AAB release y verificar logs nativos.
