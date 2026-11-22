import { instance } from '../../shared/api/axiosInstance';

export const getOrderById = async (id, signal) => {
  const response = await instance.get(`/api/orders/${encodeURIComponent(id)}`, { signal });

  return response.data;
};

export const listOrders = async (filters = {}) => {
  const response = await instance.get('/api/orders', {
    params:{
      pageNumber: filters.page || 1,
      pageSize: filters.pageSize || 10,
      Search: filters.search || null,
      Status: filters.status == 'Todos' ? null : filters.status || null,
    }
    ,
  });

  return response.data;
};
