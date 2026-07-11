const routes = [
  // `path` here is never itself navigated to — it exists only so this parent
  // record doesn't collide with the `/` MainLayout group below (two sibling
  // routes both at literal path '/' is ambiguous; Vue Router only reliably
  // matches one of them). The children below use *absolute* paths ('/login',
  // not 'login'), which Vue Router still renders nested inside AuthLayout's
  // <router-view> while giving them the URLs we actually want.
  {
    path: '/session',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      { path: '/login', name: 'login', component: () => import('pages/LoginPage.vue') },
      {
        path: '/accept-invite',
        name: 'accept-invite',
        component: () => import('pages/AcceptInvitePage.vue'),
      },
    ],
  },

  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'locations' } },
      {
        path: 'locations',
        name: 'locations',
        component: () => import('pages/LocationsListPage.vue'),
      },
      {
        path: 'locations/new',
        name: 'location-new',
        component: () => import('pages/LocationFormPage.vue'),
      },
      {
        path: 'locations/:id',
        name: 'location-edit',
        component: () => import('pages/LocationFormPage.vue'),
        props: true,
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('pages/UsersPage.vue'),
        meta: { roles: ['ADMIN'] },
      },
    ],
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
