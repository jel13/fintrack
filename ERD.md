# FinTrack Mobile - Entity-Relationship Diagram (ERD)

This document outlines the logical data structure for the FinTrack Mobile application. Since the app currently uses local storage, this ERD represents the conceptual model that would be used in a relational database system.

## Entities

### 1. User
Represents an authenticated user of the application. This is primarily managed by Firebase Authentication.

-   **userId** (Primary Key): Unique identifier from Firebase Auth (e.g., UID).
-   **email**: User's email address (for login).
-   **displayName**: User's chosen username.
-   **emailVerified**: Boolean indicating if the user has verified their email.

### 2. Category
Represents a classification for income or expenses.

-   **categoryId** (Primary Key): Unique identifier for the category (e.g., `cat-groceries-1629...`).
-   **label**: The display name of the category (e.g., "Groceries").
-   **icon**: The name of the `lucide-react` icon to display.
-   **isIncomeSource**: Boolean, `true` if it's an income category, `false` for expenses.
-   **parentId** (Foreign Key -> Category.categoryId): Self-referencing key for creating sub-categories. `NULL` if it's a top-level category.

### 3. Transaction
Represents a single financial event (either income or expense).

-   **transactionId** (Primary Key): Unique identifier for the transaction (e.g., `tx-1629...`).
-   **type**: The type of transaction ('income' or 'expense').
-   **amount**: The monetary value of the transaction.
-   **date**: The date and time the transaction occurred.
-   **description**: An optional note about the transaction.
-   **receiptDataUrl**: An optional data URL for an attached receipt image/PDF.
-   **categoryId** (Foreign Key -> Category.categoryId OR SavingGoal.goalId): The category or saving goal this transaction is assigned to.

### 4. Budget
Represents a spending limit for an expense category for a specific month.

-   **budgetId** (Primary Key): Unique identifier for the budget entry.
-   **month**: The month this budget applies to (format: "YYYY-MM").
-   **limit**: The calculated monetary spending limit for the month.
-   **percentage**: The user-defined percentage of monthly income allocated to this budget.
-   **spent**: The calculated total of expenses for this category in the given month.
-   **categoryId** (Foreign Key -> Category.categoryId): The expense category this budget is for.

### 5. SavingGoalCategory
Represents a pre-defined type or classification for a saving goal.

-   **goalCategoryId** (Primary Key): Unique identifier (e.g., `travel-sg`).
-   **label**: The display name (e.g., "Travel").
-   **icon**: The name of the `lucide-react` icon.

### 6. SavingGoal
Represents a user-defined financial goal.

-   **goalId** (Primary Key): Unique identifier for the goal (e.g., `goal-1629...`).
-   **name**: The user-defined name for the goal (e.g., "Trip to Japan").
-   **targetAmount**: The total amount the user aims to save.
-   **savedAmount**: The current accumulated amount for the goal.
-   **percentageAllocation**: The percentage of the monthly "Savings" budget allocated to this goal.
-   **description**: An optional note about the goal.
-   **goalCategoryId** (Foreign Key -> SavingGoalCategory.goalCategoryId): The type of goal this is.

## Relationships

-   **User to Data**: A **User** implicitly owns all their **Transactions**, **Budgets**, **Categories**, and **SavingGoals**. In a database, all these tables would have a `userId` foreign key.

-   **Category to Itself** (Recursive Relationship):
    -   A **Category** can have one parent **Category**.
    -   A parent **Category** can have many child **Categories**.
    -   This is a `One-to-Many` relationship implemented via the `parentId` field.

-   **Category to Budget**:
    -   Each **Budget** is for exactly one **Category**.
    -   A **Category** can have many **Budgets** (one for each month).
    -   This is a `One-to-Many` relationship.

-   **Category/SavingGoal to Transaction**:
    -   Each **Transaction** is assigned to exactly one **Category** OR one **SavingGoal**. This is a polymorphic relationship.
    -   A **Category** can be associated with many **Transactions**.
    -   A **SavingGoal** can be associated with many **Transactions** (specifically, expense transactions that represent contributions).
    -   This is a `Many-to-One` relationship from Transaction to Category/SavingGoal.

-   **SavingGoalCategory to SavingGoal**:
    -   Each **SavingGoal** belongs to exactly one **SavingGoalCategory**.
    -   A **SavingGoalCategory** can be applied to many **SavingGoals**.
    -   This is a `One-to-Many` relationship.
