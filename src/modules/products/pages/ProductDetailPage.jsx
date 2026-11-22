import { useParams } from 'react-router-dom';
import ResourceDetail from '../../shared/components/ResourceDetail';
import { formatPrice } from '../../shared/formatPrice';
import { getProductById } from '../services/list';

function ProductDetailPage() {
  const { id } = useParams();

  return (
    <ResourceDetail
      key={id}
      id={id}
      title="Detalle del producto"
      resourceLabel="el producto"
      backTo="/admin/products"
      backLabel="Volver a productos"
      load={getProductById}
    >
      {(product) => (
        <>
          <div className="space-y-2">
            <h2 className="break-words text-xl font-semibold text-gray-900">{product.name}</h2>
            <p className="whitespace-pre-wrap break-words text-gray-600">{product.description || 'Sin descripción.'}</p>
          </div>

          <dl className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-gray-600">SKU</dt>
              <dd className="break-words font-medium">{product.sku}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Código interno</dt>
              <dd className="break-words font-medium">{product.internalCode}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Precio unitario</dt>
              <dd className="font-medium">{formatPrice(product.currentUnitPrice)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Stock disponible</dt>
              <dd className="font-medium">{product.stockQuantity}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Estado</dt>
              <dd className="font-medium">{product.isActive ? 'Activo' : 'Inactivo'}</dd>
            </div>
          </dl>
        </>
      )}
    </ResourceDetail>
  );
}

export default ProductDetailPage;
