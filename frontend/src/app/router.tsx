import { createBrowserRouter } from 'react-router'
import { AppShell } from './AppShell'
import { RequireAuth } from './RequireAuth'
import { LoginPage } from '@/features/auth/LoginPage'
import { SignUpPage } from '@/features/auth/SignUpPage'
import { ActivityPage } from '@/features/activity/ActivityPage'
import { AddPage } from '@/features/add/AddPage'
import { EditExpensePage } from '@/features/add/EditExpensePage'
import { EditTransferPage } from '@/features/add/EditTransferPage'
import { ExpenseDetailPage } from '@/features/detail/ExpenseDetailPage'
import { TransferDetailPage } from '@/features/detail/TransferDetailPage'
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
          { path: 'profile', element: <ProfilePage /> },
          { path: 'contacts/:userId', element: <ContactPage /> },
        ],
      },
      { path: 'contacts/new', element: <AddContactPage /> },
      { path: 'contacts/:userId/edit', element: <EditContactPage /> },
      { path: 'profile/name', element: <EditNamePage /> },
      { path: 'expenses/:id', element: <ExpenseDetailPage /> },
      { path: 'transfers/:id', element: <TransferDetailPage /> },
      { path: 'add', element: <AddPage /> },
      { path: 'expenses/:id/edit', element: <EditExpensePage /> },
      { path: 'transfers/:id/edit', element: <EditTransferPage /> },
    ],
  },
])
