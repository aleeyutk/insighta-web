require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const path = require('path');
const csurf = require('csurf');
const morgan = require('morgan');

const app = express();
const BACKEND_URL = process.env.INSIGHTA_API_URL || 'http://localhost:3000';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(morgan(':method :url :status :response-time ms'));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const csrfProtection = csurf({ cookie: true });

function requireAuth(req, res, next) {
    if (!req.cookies.access_token) {
        return res.redirect('/login');
    }
    next();
}

async function apiFetch(method, endpoint, req, data = null) {
    const headers = { 'X-API-Version': '1' };
    if (req.cookies.access_token) headers['Authorization'] = `Bearer ${req.cookies.access_token}`;
    
    const response = await axios({
        method,
        url: `${BACKEND_URL}${endpoint}`,
        headers,
        data
    });
    return response.data;
}

app.get('/', (req, res) => res.redirect('/dashboard'));

app.get('/login', (req, res) => {
    res.render('login', { backendUrl: BACKEND_URL, error: req.query.error });
});

app.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const data = await apiFetch('GET', '/api/profiles?limit=5', req);
        res.render('dashboard', { profiles: data.data, total: data.total });
    } catch(e) {
        if (e.response?.status === 401 || e.response?.status === 403) return res.redirect('/login');
        res.render('error', { message: 'Failed to load dashboard' });
    }
});

app.get('/profiles', requireAuth, csrfProtection, async (req, res) => {
    try {
        const qs = new URLSearchParams(req.query).toString();
        const data = await apiFetch('GET', `/api/profiles?${qs}`, req);
        res.render('profiles', { 
            profiles: data.data, 
            links: data.links, 
            page: data.page, 
            query: req.query,
            total_pages: data.total_pages,
            csrfToken: req.csrfToken()
        });
    } catch(e) {
        if (e.response?.status === 401 || e.response?.status === 403) return res.redirect('/login');
        res.render('error', { message: 'Failed to load profiles' });
    }
});

app.get('/profiles/export', requireAuth, async (req, res) => {
    try {
        const qs = new URLSearchParams(req.query).toString();
        const response = await axios({
            method: 'GET',
            url: `${BACKEND_URL}/api/profiles/export?${qs}`,
            headers: { 
                'X-API-Version': '1',
                'Authorization': `Bearer ${req.cookies.access_token}` 
            },
            responseType: 'arraybuffer'
        });
        
        res.setHeader('Content-Type', 'text/csv');
        const disposition = response.headers['content-disposition'] || 'attachment; filename="export.csv"';
        res.setHeader('Content-Disposition', disposition);
        res.status(200).send(response.data);
    } catch(e) {
        if (e.response?.status === 401 || e.response?.status === 403) return res.redirect('/login');
        res.render('error', { message: 'CSV Export failed' });
    }
});

app.get('/profiles/:id', requireAuth, csrfProtection, async (req, res) => {
    try {
        const data = await apiFetch('GET', `/api/profiles/${req.params.id}`, req);
        res.render('detail', { profile: data.data, csrfToken: req.csrfToken() });
    } catch(e) {
        res.render('error', { message: 'Profile not found' });
    }
});

app.get('/search', requireAuth, csrfProtection, async (req, res) => {
    try {
        const qs = new URLSearchParams({ q: req.query.q || '' }).toString();
        const endpoint = req.query.q ? `/api/profiles/search?${qs}` : '/api/profiles?limit=0';
        const data = req.query.q ? await apiFetch('GET', endpoint, req) : { data: [], total: 0 };
        res.render('search', { profiles: data.data, q: req.query.q, csrfToken: req.csrfToken() });
    } catch(e) {
         if (e.response?.status === 401 || e.response?.status === 403) return res.redirect('/login');
         res.render('search', { profiles: [], q: req.query.q, error: 'Cannot interpret query', csrfToken: req.csrfToken() });
    }
});

app.get('/account', requireAuth, csrfProtection, async (req, res) => {
    res.render('account', { csrfToken: req.csrfToken() });
});

app.post('/logout', requireAuth, csrfProtection, async (req, res) => {
    try {
        await apiFetch('POST', '/auth/logout', req, { refresh_token: req.cookies.refresh_token });
    } catch (e) {
        console.error('Logout API failure:', e.message);
    }
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.redirect('/login');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`Web portal on port ${PORT}`));
