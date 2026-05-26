export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const getApiUrl = (path = '/health') => `${apiBaseUrl}${path}`;
