const statuses = new Map([
  ['PENDING', { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' }],
  ['PROCESSING', { label: 'Procesando', color: 'bg-blue-100 text-blue-800' }],
  ['SHIPPED', { label: 'Enviado', color: 'bg-indigo-100 text-indigo-800' }],
  ['DELIVERED', { label: 'Entregado', color: 'bg-green-100 text-green-800' }],
  ['CANCELLED', { label: 'Cancelado', color: 'bg-red-100 text-red-800' }],
]);

function OrderStatusBadge({ status }) {
  const { label, color } = statuses.get(status) ?? { label: 'Desconocido', color: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${color}`}>
      {label}
    </span>
  );
}

export default OrderStatusBadge;
