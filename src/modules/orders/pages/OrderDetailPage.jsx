import { useParams } from 'react-router-dom';
import ResourceDetail from '../../shared/components/ResourceDetail';
import { formatPrice } from '../../shared/formatPrice';
import OrderStatusBadge from '../components/OrderStatusBadge';
import { getOrderById } from '../services/listServices';

const dateOptions = { dateStyle: 'medium', timeStyle: 'short' };

function OrderDetails({ order }) {
  const items = order.items ?? [];

  return (
    <>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-gray-600">Número de orden</dt>
          <dd className="break-all font-medium">{order.orderId}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-600">Cliente</dt>
          <dd className="break-words font-medium">{order.clientName || 'Sin identificar'}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-600">Fecha</dt>
          <dd className="font-medium">
            <time dateTime={order.date}>{new Date(order.date).toLocaleString('es-AR', dateOptions)}</time>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-gray-600">Estado</dt>
          <dd className="mt-1"><OrderStatusBadge status={order.status} /></dd>
        </div>
        <div>
          <dt className="text-sm text-gray-600">Dirección de envío</dt>
          <dd className="break-words font-medium">{order.shippingAddress}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-600">Dirección de facturación</dt>
          <dd className="break-words font-medium">{order.billingAddress}</dd>
        </div>
        {order.notes && (
          <div className="sm:col-span-2">
            <dt className="text-sm text-gray-600">Notas</dt>
            <dd className="whitespace-pre-wrap break-words">{order.notes}</dd>
          </div>
        )}
      </dl>

      <section className="space-y-3 border-t border-gray-200 pt-4">
        <h2 className="text-lg font-semibold text-gray-900">Productos de la orden</h2>
        {items.length === 0 ? (
          <p className="text-gray-600">La orden no tiene productos.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {items.map((item, index) => (
              <li key={`${item.productId}-${index}`} className="space-y-2 py-3">
                <h3 className="break-words font-semibold">{item.productName}</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-gray-600">Cantidad</dt>
                    <dd>{item.quantity}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Precio unitario</dt>
                    <dd>{formatPrice(item.unitPrice)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Subtotal</dt>
                    <dd>{formatPrice(item.subtotal)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex flex-wrap justify-between gap-2 border-t border-gray-200 pt-4 text-lg font-bold">
        <span>Total</span>
        <span>{formatPrice(order.totalAmount)}</span>
      </p>
    </>
  );
}

function OrderDetailPage() {
  const { id } = useParams();

  return (
    <ResourceDetail
      key={id}
      id={id}
      title="Detalle de la orden"
      resourceLabel="la orden"
      backTo="/admin/orders"
      backLabel="Volver a órdenes"
      load={getOrderById}
    >
      {(order) => <OrderDetails order={order} />}
    </ResourceDetail>
  );
}

export default OrderDetailPage;
