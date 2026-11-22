import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// El backend calcula el desplazamiento de la página con un entero de 32 bits.
const maxOffset = 2147483647;

export default function useListQuery({ statuses, pageSizes, defaultPageSize }) {
  const [params, setParams] = useSearchParams();
  const listQuery = params.toString();
  const appliedSearchTerm = params.get('search') ?? '';
  const requestedStatus = params.get('status');
  const status = statuses.includes(requestedStatus) ? requestedStatus : '';
  const requestedSize = Number(params.get('pageSize'));
  const pageSize = pageSizes.includes(requestedSize) ? requestedSize : defaultPageSize;
  const requestedPage = Number(params.get('page'));
  const pageNumber = Number.isInteger(requestedPage) && requestedPage > 0
    && (requestedPage - 1) * pageSize <= maxOffset ? requestedPage : 1;

  const updateQuery = useCallback((changes, { replace = false } = {}) => {
    const next = new URLSearchParams(params);

    for (const [key, value] of Object.entries(changes)) {
      if (!value || (key === 'page' && value === 1) || (key === 'pageSize' && value === defaultPageSize)) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    }

    if (next.toString() === listQuery) return false;

    // Los controles siguientes deben leer los parámetros recién aplicados.
    setParams(next, { flushSync: true, replace });

    return true;
  }, [defaultPageSize, listQuery, params, setParams]);

  return { appliedSearchTerm, status, pageNumber, pageSize, listQuery, updateQuery };
}
