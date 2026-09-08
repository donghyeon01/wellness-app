import axios from 'axios'
import { getCsrfToken } from './csrf'

const MUTATION_METHODS = new Set(['post', 'put', 'delete', 'patch'])

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(async (config) => {
  const method = config.method?.toLowerCase()
  if (method && MUTATION_METHODS.has(method)) {
    const token = await getCsrfToken()
    config.headers = config.headers || {}
    config.headers['X-CSRF-Token'] = token
  }
  return config
})

export default api
