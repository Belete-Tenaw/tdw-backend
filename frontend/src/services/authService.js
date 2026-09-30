import api from './api';

const authService = {
    login: async (credentials, type) => {
        // type: 'seeker', 'employer', 'admin'
        const endpoint = `/auth/${type}/login`;
        const response = await api.post(endpoint, credentials);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    register: async (data, type) => {
        // type: 'seeker', 'employer'
        const endpoint = `/auth/${type}/register`;
        const response = await api.post(endpoint, data);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            const userObj = response.data.user || {
                id: response.data.userId,
                role: type === 'seeker' ? 'JOB_SEEKER' : 'EMPLOYER'
            };
            localStorage.setItem('user', JSON.stringify(userObj));
        }
        return response.data;
    },

    loginWithFirebase: async (data) => {
        // data contains { idToken, role }
        const response = await api.post('/auth/firebase-login', data);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getCurrentUser: () => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr && userStr !== 'undefined') {
                return JSON.parse(userStr);
            }
        } catch (error) {
            console.error('Error parsing user from localStorage:', error);
            localStorage.removeItem('user'); // Clean up corrupted data
        }
        return null;
    },

    forgotPassword: async (identifier) => {
        const response = await api.post('/auth/forgot-password', { identifier });
        return response.data;
    },

    resetPassword: async (data) => {
        // data: { identifier, token, newPassword }
        const response = await api.post('/auth/reset-password', data);
        return response.data;
    }
};

export default authService;
