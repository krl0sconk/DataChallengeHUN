# Cierre de correcciones de auditoría

Fecha: 19 de noviembre de 2026. Base local: `main`, commit
`665b0c1ec880d282fa8d67c373db2d07e9eb2549`. Los cambios se integran en una rama de Daniel para revisión.

## Correcciones locales

- La interfaz diferencia el escenario histórico retrospectivo del modo con perfil anterior
  al corte, envía `modo_demanda` y muestra el motivo de indisponibilidad sin inventar perfiles.
- El modo por corte usa dotación de referencia. La alternativa manual pertenece al modo
  histórico; no se envía como un control que el motor ignoraría.
- `/api/modelo` expone versión, SHA-256, corte, métricas archivadas de la variante cuantílica,
  presencia de perfiles y advertencia sobre la referencia híbrida de Little.
- Una falla de inferencia en producción informa indisponibilidad. No cae silenciosamente
  a una estimación paramétrica ni lee factores externos de Parquet.
- El PBIP local deja de equiparar la transición OMOP con espera por cama y elimina la
  promesa causal de que una mesa de gestión reduciría el p90. Los patrones horarios
  se presentan como descripción histórica.
- Informe y guías distinguen experimento Poisson, bundle cuantílico, ejemplo archivado,
  ejecución funcional y trabajo pendiente. El calentamiento no se presenta como una
  corrección del stock inicial omitido.

## Lo que no quedó resuelto con cambios de código

| Pendiente | Evidencia necesaria para cerrarlo | Estado |
|---|---|---|
| Bundle con perfiles por corte | Generar el formato v2.1 desde agregados autorizados, verificar perfiles anteriores a cada origen, reconciliación diaria y capacidad por fecha | No regenerado; v2.0 intacto |
| Little con población común | Recalcular desde entradas, salidas y duraciones alineadas; contrastar media con media y bordes temporales | SQL actualizado; bundle híbrido conservado |
| Calibración del artefacto servido | Backtest de la versión a entregar con cobertura por servicio, horizonte y día; separar cifras antes y después de redondear | Métricas archivadas expuestas; no reentrenado |
| Cortes de Power BI y demanda | Confirmar completitud por servicio y periodo; alinear el corte o justificar ambos | Power BI abril; bundle julio |
| Publicación del tablero | Abrir y revisar el PBIP, republicar con autorización y comprobar textos, filtros y enlaces | Solo definición local corregida |
| Correspondencia con GitHub | Revisar diferencias frente al remoto y acordar la versión de entrega | No fetch, commit ni push |
| Presentación final | Preparar diapositivas, ensayar demo y sustentar con el equipo | Guion en `reports/guion_sustentacion.md`; diapositivas y sustentación pendientes |
| Factibilidad y piloto | Dotación/capacidad reales, tres marcas HIS, resultados prospectivos y aprobación institucional | Pendientes; no sustituibles por fixtures |

## Verificación y límites

Las pruebas locales no consultan la base hospitalaria. El build de verificación se genera
fuera del repositorio, sin sustituir `app/dist` ni el bundle hospitalario. Los resultados de
pruebas se comunican al finalizar la ejecución; los conteos históricos de la documentación
no sustituyen ese resultado.

El enlace público de Power BI sigue representando su publicación anterior hasta que se
republique. No se deben presentar estas correcciones locales como una publicación,
aprobación clínica, nueva corrida hospitalaria o sustentación realizada.

## Secuencia de cierre pendiente

1. Revisar estos cambios locales y el PBIP sin publicar.
2. Autorizar por separado la regeneración con agregados disponibles y la validación del
   nuevo bundle; no requiere asumir acceso a PostgreSQL.
3. Revisar las métricas resultantes y el corte del tablero antes de elegir el artefacto final.
4. Preparar las diapositivas y comprobar la demo con ese artefacto.
5. Autorizar commit/push y publicación solo sobre la versión revisada.

La rúbrica aplicable es T&C, página 4, sección 14. Sus desempates figuran en la página 5,
sección 16. El enunciado técnico exige documentación, GitHub y enlace Power BI en página 3.

## Resultado de la verificación local

- Python: **180 aprobadas**, 211.30 s en la integración, sin conexiones externas.
- Contrato frontend: **3 aprobadas** con Node.
- Vite: compilación correcta en carpeta temporal externa, sin reemplazar `app/dist`.
- Ruff: comprobaciones de los archivos Python modificados y formato aprobados.
- API real: `/api/modelo` respondió 200; v2.0 y SHA-256 originales comprobados con lectura de Parquet bloqueada.
- API real: pronóstico por corte informó `disponible: false`, como corresponde al bundle actual.
- JSON de definiciones Power BI: sintaxis válida. Falta revisión visual en Power BI Desktop y republicación.

## Disponibilidad de insumos (`data/raw/`)

Los agregados hospitalarios en `data/raw/*.parquet` y `data/externos.parquet` están excluidos de Git por `.gitignore` (Sección 6 de Términos y Condiciones: ningún archivo de datos hospitalarios se sube al repositorio). Por ello, en un clon limpio sin conexión VPN no están presentes localmente y la aplicación opera directamente desde el artefacto empaquetado `models/modelos_web_bundle.joblib` (`HUN_MODO_PRODUCCION=1`). En el entorno local autorizado con VPN se ejecutaron las consultas de verificación contra PostgreSQL del HUN (stock inicial $N_0 = 0$ y reconciliación de poblaciones `p99.9` en `SQL14`, `SQL15` y `SQL16`), cuyos resultados quedaron registrados en la Sección 3 de `reports/informe_final.md`.

## Integración con el main revisado

La rama `feat/integracion-mediflow` parte de `6d4eb66bfd53a98aa6ddf0ae25f85e37bd04bc10`. Conserva el README simplificado, sus secciones, las cuatro capturas y el GIF de ese commit. Las aclaraciones de auditoría se incorporan en un bloque plegable y las imágenes se identifican como evidencia archivada. Se mantuvieron intactos el bundle hospitalario y los archivos de imagen. La integración se registra como commit local con la identidad Git configurada de Daniel (`WisDan`), sin modificar `main`.
