const routes = [
  {
    path: '/',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      { path: 'login', name: 'login', component: () => import('pages/LoginPage.vue') },
      {
        path: 'accept-invite',
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
