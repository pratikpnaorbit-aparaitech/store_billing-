# Receipt printers

Open **Profile > Receipt printers**, or **Add / select printer** on a receipt.
Add a name, connection and paper width. Save selects the default printer. Saved
printers and the default are retained on this device. Test print before billing.

- **Android Bluetooth:** Pair an ESC/POS Classic Bluetooth printer in phone
  settings, load paired devices, select the printer, then save. Allow Nearby
  devices permission. BLE-only printers are not supported by this bridge.
- **Android Wi-Fi/LAN:** Phone and printer must share the local network. Enter
  the printer's IPv4 address and raw ESC/POS port (usually 9100). A DHCP
  reservation avoids the saved IP changing. This traffic stays on the phone's
  local network; it does not pass through Render.
- **System print:** Available on Android, iOS and web. Select an installed printer
  in the system/browser dialog. USB printers require the vendor's driver or
  Android print service. iOS needs an AirPrint-compatible printer. Set the
  printer driver's paper size to the selected 58mm/80mm width and disable browser
  headers/footers. The operating system owns the final printer selection.

On a new receipt or a bill opened from history, tap **Print thermal receipt**.
Printing does not complete a sale, alter stock, or create another order. Reprints
use the same invoice. If sending fails, inspect the printer before retrying: a
printer may have received some data before the connection failed. A successful
send reports that the job was sent, not that paper output was physically verified.

## Build and compatibility

Direct Bluetooth/LAN printing requires a **new Android development/release APK**;
it cannot be added to an existing APK by a JavaScript refresh or used in Expo Go.
System print remains available without the new bridge. Run `npm ci` normally;
the root postinstall prepares the pinned Android bridge for modern Gradle
(namespace, repositories and React Android dependency) and fixes duplicate paired
connection tracking. Do not disable install scripts in native build pipelines.

Receipt formatting supports 58mm (32 columns) and 80mm (48 columns), wraps full
product names, and uses Rs for currency. Direct ESC/POS text character support
depends on printer firmware/code page. For Marathi/Hindi or other Unicode names,
use System print with a suitable printer driver. Automatic paper cutting is off
by default and should be enabled only for printers with a cutter.

Validation covers printer destinations, receipt widths/totals and escaping of
HTML/ESC/POS formatter input. A physical printer and Android release build still
need device testing before rollout; JavaScript bundle export is not an APK build.
