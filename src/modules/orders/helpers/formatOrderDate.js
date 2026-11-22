const isoDateTime = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
const dateOptions = {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
};
const wallTimeFormatter = new Intl.DateTimeFormat('es-AR', { ...dateOptions, timeZone: 'UTC' });
const localTimeFormatter = new Intl.DateTimeFormat('es-AR', { ...dateOptions, timeZoneName: 'short' });

export function formatOrderDate(value) {
  const match = isoDateTime.exec(value);

  if (!match) return null;

  const [, dateTime, offset] = match;
  // El formateador UTC conserva la fecha y hora recibidas cuando la API no informa el offset.
  const date = new Date(`${dateTime}${offset ?? 'Z'}`);

  if (Number.isNaN(date.getTime())) return null;

  return {
    text: (offset ? localTimeFormatter : wallTimeFormatter).format(date),
    hasOffset: Boolean(offset),
  };
}
