# FinTrack Mobile - System Architecture & Context Diagram

This document provides a high-level overview of the FinTrack Mobile application's architecture, its components, and its interactions with external systems.

## System Architecture

FinTrack Mobile is designed as a local-first, statically generated mobile application. It leverages modern web technologies and is packaged for native mobile deployment using Capacitor.

### Key Components:

1.  **Frontend Framework (Next.js & React)**:
    *   The user interface is built with **React** and the **Next.js App Router**.
    *   The application is configured for **Static Site Generation (SSG)** (`output: 'export'`), meaning the entire frontend is pre-built into static HTML, CSS, and JavaScript files. This is ideal for performance and for packaging within a native wrapper.

2.  **UI & Styling**:
    *   **ShadCN UI**: Provides the core set of accessible and composable UI components (Buttons, Cards, Dialogs, etc.).
    *   **Tailwind CSS**: Used for all styling, providing a utility-first approach for rapid and consistent design.
    *   **Recharts**: Used for creating interactive charts for financial data visualization (e.g., spending pie chart, budget bars).
    *   **Lucide React**: Provides the icon set used throughout the application.

3.  **State & Data Management (Local-First)**:
    *   **Local Storage**: All application data—including transactions, budgets, categories, and goals—is persisted directly on the user's device using the browser's Local Storage.
    *   **`src/lib/storage.ts`**: This custom module acts as the data access layer, handling all serialization (saving) and deserialization (loading) of the application state to and from Local Storage. This approach ensures the app is fully functional offline.

4.  **Authentication**:
    *   **Firebase Authentication**: User registration and login are handled exclusively by Firebase Auth. The application communicates with Firebase servers to verify credentials, sign up new users, and manage user sessions. The user's authentication state (logged in/out) is managed via the `AuthContext`.

5.  **Native Mobile Packaging (Capacitor)**:
    *   **Capacitor**: This tool wraps the statically generated Next.js application into a native Android project.
    *   The web assets (`out` directory) are bundled into the Android App Bundle (AAB) or APK.
    *   Capacitor allows the web app to be installed and run like a native app and provides the bridge to access native device features (like notifications, which are planned for the future).

---

## Context Diagram

The Context Diagram illustrates the boundaries of the FinTrack Mobile system and how it interacts with external entities (users and services).

```
+--------------------------+      +---------------------------+
|                          |      |                           |
|           User           |<---->|     FinTrack Mobile App   |
| (App User)               |      |      (The System)         |
|                          |      |                           |
+--------------------------+      +-------------+-------------+
                                                |
                                                | (Manages Data)
                                                v
                                  +---------------------------+
                                  |                           |
                                  |   Device Local Storage    |
                                  |                           |
                                  +---------------------------+
                                                |
                                                ^
                                                | (Auth Credentials & State)
                                                v
                                  +---------------------------+
                                  |                           |
                                  |  Firebase Authentication  |
                                  |      (External Service)   |
                                  +---------------------------+
```

### Entities:

1.  **FinTrack Mobile App (The System)**: The application itself, running on the user's device. Its responsibilities include rendering the UI, managing application state, handling user input, and performing all financial calculations.

2.  **User**: The person interacting with the application.

3.  **Device Local Storage**: The storage mechanism on the user's device where all application data is saved. From the system's perspective, this is its database.

4.  **Firebase Authentication**: An external, cloud-based service that handles user identity.

### Interactions:

1.  **User <--> FinTrack Mobile App**:
    *   **User to App**: The user provides input by adding/editing transactions, setting budgets, creating goals, and managing categories.
    *   **App to User**: The app displays financial dashboards, charts, transaction lists, reports, and alerts to the user.

2.  **FinTrack Mobile App <--> Device Local Storage**:
    *   **App to Storage**: The app saves (writes) the entire application state (transactions, budgets, settings) to Local Storage whenever a change is made.
    *   **Storage to App**: The app loads (reads) the saved state from Local Storage when it first starts up.

3.  **FinTrack Mobile App <--> Firebase Authentication**:
    *   **App to Firebase**: The app sends the user's email/password for login or registration. It also requests password reset emails.
    *   **Firebase to App**: Firebase returns the authentication result (success/failure), a user token/profile upon successful login, and handles the sending of verification/reset emails on its own servers. The app listens for changes in the auth state.
