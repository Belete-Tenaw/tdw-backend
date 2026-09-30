import axios from 'axios';

const defaultProdUrl = 'https://edwl-backend-1.onrender.com';
const envApiUrl = import.meta.env.VITE_API_URL;

export const API_BASE_URL = envApiUrl 
    ? envApiUrl.replace(/\/api\/?$/, '') 
    : (import.meta.env.MODE === 'production' ? defaultProdUrl : 'http://localhost:5000');

const api = axios.create({
    baseURL: envApiUrl || (import.meta.env.MODE === 'production' ? `${defaultProdUrl}/api` : '/api'),
});

// Add a request interceptor to add the auth token to headers
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for global error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Session expired
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login?expired=true';
            }
        }
        return Promise.reject(error);
    }
);

export default api;