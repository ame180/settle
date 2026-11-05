import { createBrowserRouter } from 'react-router'
import { AppShell } from './AppShell'
import { RequireAuth } from './RequireAuth'
import { LoginPage } from '@/features/auth/LoginPage'
import { ActivityPage } from '@/features/activity/ActivityPage'
import { DetailPlaceholderPage } from '@/features/activity/DetailPlaceholderPage'
import { AddPage } from '@/features/feed/AddPage'
import { ContactsPage } from '@/features/contacts/ContactsPage'
import { AddContactPage } from '@/features/contacts/AddContactPage'
import { ProfilePage } from '@/features/profile/ProfilePage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <ContactsPage /> },
          { path: 'activity', element: <ActivityPage /> },
          { path: 'add', element: <AddPage /> },
          { path: 'profile', element: <ProfilePage /> },
        ],
      },
      { path: 'contacts/new', element: <AddContactPage /> },
      { path: 'expenses/:id', element: <DetailPlaceholderPage title="Expense" /> },
      { path: 'transfers/:id', element: <DetailPlaceholderPage title="Payment" /> },
    ],
  },
])
