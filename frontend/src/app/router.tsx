import { createBrowserRouter } from 'react-router'
import { AppShell } from './AppShell'
import { RequireAuth } from './RequireAuth'
import { LoginPage } from '@/features/auth/LoginPage'
import { SignUpPage } from '@/features/auth/SignUpPage'
import { ActivityPage } from '@/features/activity/ActivityPage'
import { DetailPlaceholderPage } from '@/features/activity/DetailPlaceholderPage'
import { AddPage } from '@/features/feed/AddPage'
import { ContactsPage } from '@/features/contacts/ContactsPage'
import { AddContactPage } from '@/features/contacts/AddContactPage'
import { ContactPage } from '@/features/contacts/ContactPage'
import { EditContactPage } from '@/features/contacts/EditContactPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { EditNamePage } from '@/features/profile/EditNamePage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignUpPage /> },
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
          { path: 'contacts/:userId', element: <ContactPage /> },
        ],
      },
      { path: 'contacts/new', element: <AddContactPage /> },
      { path: 'contacts/:userId/edit', element: <EditContactPage /> },
      { path: 'profile/name', element: <EditNamePage /> },
      { path: 'expenses/:id', element: <DetailPlaceholderPage title="Expense" /> },
      { path: 'transfers/:id', element: <DetailPlaceholderPage title="Payment" /> },
    ],
  },
])
