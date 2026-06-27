import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";


const api = axios.create({ 
  baseURL: API_URL, 
  headers: { 'Content-Type': 'application/json' },
  // withCredentials: true,  
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false, failedQueue = [];
const processQueue = (err, token = null) => { failedQueue.forEach(p => err ? p.reject(err) : p.resolve(token)); failedQueue = []; };

api.interceptors.response.use(r => r, async (error) => {
  const orig = error.config;
  if (error.response?.status === 401 && !orig._retry) {
    if (isRefreshing) return new Promise((res, rej) => failedQueue.push({ resolve: res, reject: rej })).then(t => { orig.headers.Authorization = `Bearer ${t}`; return api(orig); });
    orig._retry = true; isRefreshing = true;
    try {
      const rt = localStorage.getItem('refreshToken');
      if (!rt) throw new Error('no rt');
      const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: rt });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      api.defaults.headers.Authorization = `Bearer ${data.accessToken}`;
      processQueue(null, data.accessToken); return api(orig);
    } catch (err) {
      processQueue(err, null);
      if (typeof window !== 'undefined') { ['accessToken','refreshToken','user'].forEach(k => localStorage.removeItem(k)); window.location.href = '/auth/login'; }
      return Promise.reject(err);
    } finally { isRefreshing = false; }
  }
  return Promise.reject(error);
});

export default api;

export const authApi = {
  register: d => api.post('/auth/register', d),
  login:    d => api.post('/auth/login', d),
  logout:   () => api.post('/auth/logout'),
  getMe:    () => api.get('/auth/me'),
  refresh:  rt => api.post('/auth/refresh', { refreshToken: rt }),
};

export const userApi = {
  updateProfile: d   => api.put('/users/profile', d),
  uploadResume:  fd  => api.post('/users/resume', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAllStudents: p   => api.get('/users', { params: p }),
  getStudentById:id  => api.get(`/users/${id}`),
};

export const companyApi = {
  getAll:           p           => api.get('/companies', { params: p }),
  getById:          id          => api.get(`/companies/${id}`),
  create:           d           => api.post('/companies', d),
  update:           (id, d)     => api.put(`/companies/${id}`, d),
  delete:           id          => api.delete(`/companies/${id}`),
  addRole:          (cid, d)    => api.post(`/companies/${cid}/roles`, d),
  updateRole:       (cid,rid,d) => api.put(`/companies/${cid}/roles/${rid}`, d),
  deleteRole:       (cid, rid)  => api.delete(`/companies/${cid}/roles/${rid}`),
  postUpdate:       (cid, d)    => api.post(`/companies/${cid}/updates`, d),
  checkEligibility: id          => api.get(`/companies/${id}/eligibility`),
};

export const applicationApi = {
  apply:            d     => api.post('/applications', d),
  getMyApplications:()    => api.get('/applications/my'),
  getAll:           p     => api.get('/applications', { params: p }),
  getById:          id    => api.get(`/applications/${id}`),
  updateStatus:     (id,d)=> api.put(`/applications/${id}/status`, d),
  withdraw:         id    => api.delete(`/applications/${id}`),
};

export const aiApi = {
  analyzeResume:         d => api.post('/ai/analyze-resume', d),
  analyzeJD:             d => api.post('/ai/analyze-jd', d),
  generateInterviewPrep: d => api.post('/ai/generate-interview-prep', d),
  mockInterview:         d => api.post('/ai/mock-interview', d),
  findSimilarResumes:    d => api.post('/ai/find-similar-resumes', d),
  getMyAnalyses:         () => api.get('/ai/my-analyses'),
};

export const analyticsApi = {
  adminOverview:           () => api.get('/analytics/admin/overview'),
  departmentParticipation: () => api.get('/analytics/admin/department-participation'),
  applicationsPerCompany:  () => api.get('/analytics/admin/applications-per-company'),
  fitScoreDistribution:    () => api.get('/analytics/admin/fit-score-distribution'),
  placementTrends:         () => api.get('/analytics/admin/placement-trends'),
  studentAnalytics:        () => api.get('/analytics/student/me'),
};

export const notificationApi = {
  getAll:      p  => api.get('/notifications', { params: p }),
  markRead:    id => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete:      id => api.delete(`/notifications/${id}`),
};