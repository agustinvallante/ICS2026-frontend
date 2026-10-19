import axios from 'axios';
import { SESSION_INVALIDATED } from '../../auth/helpers/session';

const instance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true,
});

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

instance.interceptors.response.use(
  (config) => { return config; },
  (error) => {
    const requestToken = error.config?.headers?.Authorization;

    if ((error.response?.status ?? error.status) === 401
      && requestToken && requestToken === `Bearer ${localStorage.getItem('token')}`) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event(SESSION_INVALIDATED));
    }

    return Promise.reject(error);
  },
);

export { instance };