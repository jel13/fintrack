# FinTrack Mobile - Data Flow Diagram (DFD)

This document illustrates how data moves through the FinTrack Mobile application.

---

## Level 0: Context Diagram

The Context Diagram shows the entire system as a single process and its interaction with external entities.

```
+--------------------------+                                +---------------------------+
|                          |--(A) User Input & Credentials-->|                           |
|           User           |                                |       FinTrack Mobile     |
| (External Entity)        |<-(B) Displayed App Data---------|          (System)         |
|                          |                                |                           |
+--------------------------+                                +-------------+-------------+
                                                                         | ^
                                                                    (C) Auth Events
                                                                         | |
                                                                         v |
                                                           +---------------------------+
                                                           |                           |
                                                           |  Firebase Authentication  |
                                                           |   (External Entity)       |
                                                           |                           |
                                                           +---------------------------+
```

### Data Flows (Level 0):

*   **(A) User Input & Credentials**: User actions such as adding transactions, setting budgets, and entering login/registration details.
*   **(B) Displayed App Data**: The UI rendered for the user, including dashboards, charts, transaction lists, and reports.
*   **(C) Auth Events**: The flow of authentication requests (e.g., login/logout) to Firebase and the corresponding responses (e.g., user session state) back to the app.

---

## Level 1: System Breakdown

The Level 1 DFD breaks the "FinTrack Mobile" system into its major internal processes and shows how data flows between them and to the internal data store.

```
                                          +-----------------+
                                          |                 |
+-------------------+<---(F) User Auth----|     Firebase    |----(G) Auth Result--->+-------------------+
|                   |                     |  Authentication |                     |                   |
|       User        |--(E) Manage Data--->|   (External)    |                     |  1.0 Manage User  |
|                   |                     +-----------------+                     |      Session      |
+-------------------+------------------------------------------------------------>|                   |
        ^   |                                                                    +---------+---------+
        |   |                                                                              |
        |   | (D) UI Render                                                          (H) User Profile
        |   |                                                                              |
        |   +------------------------------------------------------------------------------+
        |                                                                                    |
        |                                                                                    v
        |                                       +-------------------+<---(J) Write Data---->+-------------------+
        +---------------------------------------|                   |                      |                   |
                                                |   Local App Data  |<---(L) Save Report---|  3.0 Generate     |
--(I) Read Data-->+--------------------+        |    (Data Store)   |                      |      Reports      |
|                 |                   |        |                   |                      |                   |
| 2.0 Display UI &|                   +------->+-------------------+--------------------->+-------------------+
|   Dashboards    |                                                                              ^
|                 |                                                                              |
+-----------------|<--------------------------------------(K) Read Data--------------------------+

```

### Processes (Level 1):

*   **1.0 Manage User Session**: Handles all interactions with Firebase Authentication, including login, registration, and session management.
*   **2.0 Display UI & Dashboards**: Renders all visual components, including transaction lists, budget cards, charts, and insights. This process reads from the `Local App Data` store.
*   **3.0 Generate Reports**: A time-triggered process that runs at the end of each month. It reads transaction data for the past month and generates a static `MonthlyReport` which is then written back to the `Local App Data` store.

### Data Stores (Level 1):

*   **Local App Data**: Represents the app's entire state persisted in the device's Local Storage. This includes:
    *   `transactions`
    *   `budgets`
    *   `categories`
    *   `savingGoals`
    *   `monthlyReports`
    *   `userSettings` (e.g., monthly income, onboarding status)

### Data Flows (Level 1):

*   **(D) UI Render**: The final rendered data presented to the user.
*   **(E) Manage Data**: User-initiated actions to create, update, or delete data (e.g., submitting a new transaction, creating a budget).
*   **(F) User Auth**: Credentials sent to Firebase for authentication.
*   **(G) Auth Result**: The success or failure response from Firebase.
*   **(H) User Profile**: The authenticated user's profile information (UID, display name), which is used across the app.
*   **(I) Read Data**: The flow of reading all necessary financial data from the data store to be rendered in the UI.
*   **(J) Write Data**: The flow of writing new or updated data (transactions, budgets, etc.) to the data store.
*   **(K) Read Data**: The `Generate Reports` process reads all of the previous month's transactions.
*   **(L) Save Report**: The `Generate Reports` process writes the newly created static report back to the `monthlyReports` array in the data store.
