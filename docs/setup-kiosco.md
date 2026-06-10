# Setup de la PC de la entrada (modo kiosco)

Guía para dejar la notebook de la entrada como un **appliance**: se prende, levanta el
sistema sola y muestra el molinete a pantalla completa. Nadie tiene que tocar nada.

> Requisito previo: el repo ya clonado, Node.js instalado, el `.env` copiado y el `.exe`
> del proveedor funcionando (ver `CLAUDE.md` y la memoria de hardware).

---

## 1. Activar el modo offline-first

Abrí el `.env` (carpeta del repo) con el Bloc de notas y agregá al final:

```
MODO_LOCAL=1
```

Esto hace que el molinete valide desde el padrón cacheado en disco: si se cae el wifi,
**sigue abriendo**. Sincroniza con Supabase cada 5 minutos y sube los accesos pendientes
al recuperar conexión.

---

## 2. Probar el arranque manual

En la carpeta del repo, doble clic en **`iniciar-molinete.bat`**. Debería:

1. Abrir una ventana minimizada con el server (`npm start`)
2. Esperar a que responda
3. Abrir Chrome (o Edge) en **pantalla completa** en `molinete.html`

Pasá un llavero para confirmar que valida y dispara el relé.

> Para **salir** del modo pantalla completa (administración): `Alt + F4` cierra el navegador.
> El server sigue corriendo en su ventana minimizada (cerrala con `Ctrl + C` si querés frenarlo).

---

## 3. Que arranque solo al prender la PC

1. Apretá `Win + R`, escribí **`shell:startup`** y Enter (abre la carpeta de Inicio)
2. Click derecho sobre `iniciar-molinete.bat` → **Copiar**
3. En la carpeta de Inicio: click derecho → **Pegar acceso directo** (no el archivo, el *acceso directo*)

A partir de ahora, cada vez que inicie sesión el usuario `gamao`, arranca todo solo.

---

## 4. Auto-login (que no pida contraseña al prender)

Para que la PC llegue sola al escritorio sin que nadie escriba la contraseña:

1. `Win + R` → **`netplwiz`** → Enter
2. Seleccioná el usuario `gamao`
3. **Destildá** "Los usuarios deben escribir su nombre y contraseña para usar el equipo"
4. Aceptar → te pide la contraseña actual dos veces → confirmá

> ⚠️ Solo hacé esto si la PC está físicamente segura en la entrada (cualquiera que la prenda
> entra al escritorio). Para un appliance de molinete es lo habitual.

---

## 5. Que no se apague ni suspenda

La PC tiene que estar siempre despierta:

1. **Configuración → Sistema → Inicio/apagado y suspensión**
2. Poné **"Pantalla"** y **"Suspensión"** en **Nunca** (cuando está enchufada)
3. En notebooks: Configuración → Sistema → Inicio/apagado → "Al cerrar la tapa" → **No hacer nada**

---

## 6. Recuperarse de cortes de luz

- En el **BIOS/UEFI** de la notebook, si existe la opción, activá **"Restore on AC Power Loss = Power On"**
  para que se prenda sola al volver la luz. (En notebooks con batería esto es menos crítico —
  la batería actúa de UPS.)
- Si es una mini PC sin batería, conviene una **UPS** para que no se corte en seco.

---

## Resumen del flujo final

```
Prende la PC → auto-login → carpeta Inicio ejecuta iniciar-molinete.bat
   → npm start (server + offline-first) → espera health OK
   → Chrome --kiosk en molinete.html (pantalla completa)
   → listo para pasar llaveros
```
