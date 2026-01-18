# Authentication System Implementation Plan

## 1. Overview
This document outlines the architectural plan for implementing User Registration and Login (US-001, US-002) in the FlashCard AI application. The system will leverage Supabase Auth for identity management, integrated into Astro 5's server-side rendering (SSR) capabilities via `@supabase/ssr`.

## 2. User Interface Architecture

### 2.1 Layouts
We will introduce a dedicated authentication layout to distinguish between the public/marketing views, the application views, and the authentication flows.

*   **`AuthLayout.astro`**: A focused, distraction-free layout.
    *   **Structure**: Centered content container on a neutral background.
    *   **Elements**: Application Logo, minimalistic footer. No navigation sidebar.
    *   **Usage**: Wraps Login, Register, and Forgot Password pages.

### 2.2 Astro Pages (Routes)
New pages will be added to handle the authentication entry points. These pages will be server-rendered (SSR) to check session state before rendering (redirecting if already logged in).

*   `/login`: Entry point for existing users.
*   `/register`: Entry point for new users.

### 2.3 React Components (Client-Side)
Interactive forms will be built using React 19 to handle validation, loading states, and user feedback efficiently.

*   **`LoginForm.tsx`**:
    *   Fields: Email, Password.
    *   Actions: Submit (calls Astro Action), "Forgot Password?" link, "Create Account" link.
*   **`RegisterForm.tsx`**:
    *   Fields: Email, Password, Confirm Password.
    *   Actions: Submit (calls Astro Action), "Already have an account?" link.

### 2.4 Validation & Feedback
*   **Library**: `react-hook-form` paired with `zod` for schema validation.
*   **Schemas**: Shared Zod schemas (in `src/lib/validators/auth.validator.ts`) to ensure consistency between client-side pre-check and server-side action validation.
*   **Error Handling**:
    *   Field-level errors (e.g., "Invalid email format") displayed inline.
    *   Global errors (e.g., "Invalid credentials") displayed via a dismissible Alert component (Shadcn UI) at the top of the form.
*   **Success Feedback**:
    *   Redirects upon successful login/registration.

## 3. Backend Logic & Data Architecture

### 3.1 Dependencies
We must introduce `@supabase/ssr` and `react-hook-form` to the tech stack. The existing `@supabase/supabase-js` client is insufficient for secure SSR cookie management.

### 3.2 Astro Actions (Server-Side Logic)
We will utilize Astro 5's **Actions** API to handle form submissions securely. This avoids creating ad-hoc API endpoints and provides type-safety.

*   **Location**: `src/actions/index.ts` (or `src/actions/auth.ts`)
*   **Defined Actions**:
    *   `auth.login`: Accepts email/password. Returns session or error.
    *   `auth.register`: Accepts email/password. Creates user.
    *   `auth.logout`: Signs out and clears cookies.

### 3.3 Middleware (`src/middleware/index.ts`)
The middleware needs a complete refactor to support `@supabase/ssr`.

*   **Responsibility**:
    1.  **Cookie Management**: Intercept requests to get the access/refresh tokens from cookies.
    2.  **Client Initialization**: Create a `createServerClient` instance for *every request*.
    3.  **Session Refresh**: Automatically refresh expired tokens and update the response cookies.
    4.  **Route Protection**:
        *   Redirect unauthenticated users trying to access `/app/*` to `/login`.
        *   Redirect authenticated users trying to access `/login` or `/register` to `/app/decks` (or dashboard).
    5.  **Context Injection**: Store the `supabase` client and `user` object in `Astro.locals` for use in pages and actions.

### 3.4 Data Models
*   **`auth.users`**: Managed by Supabase (Email, Password hash, ID).
*   **`public.profiles`**: Stores application-specific user data.
    *   **Trigger**: A PostgreSQL trigger on `auth.users` (INSERT) -> `public.profiles` (INSERT) is already planned/implemented. This ensures every registered user has a corresponding profile without requiring an extra API call from the frontend.

## 4. Authentication System Implementation

### 4.1 Supabase Integration
*   **Client Types**:
    *   **Server Client**: Created in Middleware using `@supabase/ssr`. Handles cookies.
    *   **Browser Client**: Created in React components (if strictly necessary for real-time) using `@supabase/ssr`'s `createBrowserClient`. *Note: For this MVP, we will primarily rely on Server Actions, so a browser client may not be needed.*
    
### 4.2 Key Flows

#### Registration Flow (US-001)
1.  User enters Email/Password in `RegisterForm`.
2.  React validates format (Zod).
3.  Form submits to `actions.auth.register`.
4.  Server calls `supabase.auth.signUp()`.
5.  **If success**:
    *   Supabase creates user in `auth.users`.
    *   DB Trigger creates row in `public.profiles`.
    *   Action returns success.
    *   Middleware handles the new session (if "Auto Confirm" is on) or User is told to check email.
    *   *Note based on PRD US-001:* "User is automatically logged in after registration". This requires "Enable Email Confirmations" to be OFF in Supabase or utilizing the session returned immediately if allowed. We will assume the session is returned.

#### Login Flow (US-002)
1.  User enters credentials in `LoginForm`.
2.  Form submits to `actions.auth.login`.
3.  Server calls `supabase.auth.signInWithPassword()`.
4.  **If success**:
    *   Supabase returns Session (Access + Refresh Token).
    *   Cookies are set via the `createServerClient` context.
    *   Action returns success.
    *   Client redirects to `/app/dashboard` (or `/app/generate` per US-001).

#### Logout Flow
1.  User clicks "Logout" in UI.
2.  Button triggers `actions.auth.logout`.
3.  Server calls `supabase.auth.signOut()`.
4.  Cookies are cleared.
5.  Client redirects to `/login`.

## 5. Technical Specifications Summary

| Component | Technology | Responsibility |
| :--- | :--- | :--- |
| **Auth Middleware** | Astro Middleware + `@supabase/ssr` | Cookie parsing, Token Refresh, Route Guarding (`/app/*`). |
| **Auth Actions** | Astro Actions | Server-side execution of Login/Register logic. |
| **Forms** | React 19 + Hook Form | Client-side validation, UI feedback. |
| **Validation** | Zod | Schema definition shared between client and server. |
| **Database** | PostgreSQL (Supabase) | User data storage. |
| **Auth Provider** | Supabase Auth | Identity Provider (IDP). |

## 6. Proposed File Structure Changes

```text
src/
├── actions/
│   └── auth.ts              # New: Server actions for auth
├── components/
│   └── auth/                # New: Auth-specific components
│       ├── AuthLayout.astro
│       ├── LoginForm.tsx
│       └── RegisterForm.tsx
├── lib/
│   └── validators/
│       └── auth.validator.ts # New: Zod schemas
├── middleware/
│   └── index.ts             # Update: Full rewrite for @supabase/ssr
└── pages/
    ├── login.astro          # New
    ├── register.astro       # New
    └── auth/
        └── callback.ts      # New: API route for OAuth/Email redirects
```
