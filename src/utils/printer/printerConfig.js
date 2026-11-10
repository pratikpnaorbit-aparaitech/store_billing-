export function normalizePrinter(input) {
  const name = String(input.name || "").trim();
  const type = input.type;
  if (!name) throw new Error("Enter a printer name.");
  if (!["system", "bluetooth", "network"].includes(type)) throw new Error("Choose a printer connection.");
  const paperWidth = Number(input.paperWidth);
  if (![58, 80].includes(paperWidth)) throw new Error("Choose 58mm or 80mm paper.");
  const address = String(input.address || "").trim();
  const port = Number(input.port ?? 9100);
  if (type === "bluetooth" && !/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(address)) throw new Error("Choose a paired Bluetooth printer or enter its MAC address.");
  if (type === "network") {
    const octets = address.split(".");
    if (octets.length !== 4 || octets.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255) || address === "0.0.0.0") throw new Error("Enter the printer IPv4 address, for example 192.168.1.100.");
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Enter a port between 1 and 65535.");
  }
  return { id: input.id, name, type, address: type === "system" ? "" : address.toUpperCase(), port, paperWidth, autoCut: Boolean(input.autoCut) };
}
