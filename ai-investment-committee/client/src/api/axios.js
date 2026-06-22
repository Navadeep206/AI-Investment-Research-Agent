import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor (e.g. for injecting auth tokens later)
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor (e.g. for handling errors globally)
api.interceptors.response.use(
  (response) => {
    if (response.config && response.config.responseType === 'blob') {
      return response.data;
    }
    const body = response.data;
    if (body && (body.success === true || body.success === false) && Object.prototype.hasOwnProperty.call(body, 'data')) {
      const payload = body.data;
      if (payload && typeof payload === 'object') {
        payload.requestId = body.requestId;
        payload.success = body.success;
        payload.timestamp = body.timestamp;
      }
      return payload;
    }
    return body;
  },
  (error) => {
    const errBody = error.response?.data;
    if (errBody && errBody.success === false && errBody.error) {
      console.error('API Standardized Error:', errBody.error.message);
      error.response.data = errBody.error;
    } else {
      console.error('API Error:', error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
