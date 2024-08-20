# Todo Application with Subtodos

## Overview

This is a simple yet powerful Todo application built using vanilla Node.js (no frameworks). The application allows users to register, log in, and manage their todos and subtodos. All data is stored in the file system in a structured manner, ensuring simplicity and efficiency.

## Features

- **User Registration & Login:**
  - Users can register with their email and a password.
  - Passwords are hashed using SHA-256 before storage.
  - Upon successful login, the user's session is managed through local storage.

- **Todo Management:**
  - Users can create, update, and delete todos.
  - Each todo has a title, description, status (`not_started`, `in_progress`, `completed`), created_at, and updated_at fields.
  - Todos are stored in a binary file with a fixed record size for efficient random access.

- **Subtodo Management:**
  - Each todo can have multiple subtodos.
  - Subtodos inherit the same structure as todos (title, description, status, created_at, updated_at).
  - Subtodos can be added, listed, and deleted individually.
  - Subtodos are stored in a binary file within a directory named after the parent todo's ID.

- **Optimized Data Storage:**
  - Data is stored in binary format, allowing efficient random access operations.
  - Todos and subtodos marked for deletion are prefixed with `DEL_`, allowing the data to remain until a full cleanup is performed.

## Application Architecture

The application is structured as follows:

- **Server:**
  - A simple HTTP server built with Node.js handles all requests.
  - Routes manage user registration, login, and CRUD operations for todos and subtodos.
  - No external libraries or frameworks are used.

- **Frontend:**
  - The frontend is built with vanilla HTML, CSS, and JavaScript.
  - The UI is dynamic, allowing users to interact with their todos and subtodos in real-time.

## Storage Structure

### User Registration and Login

- **Directory:** `todo/system`
- **File:** `user.bin`
  - **Format:** `<email>:<hashed_password>\n`
  - **Purpose:** Stores user credentials.

### Todo Storage

- **Directory Structure:** `todo/<email>`
  - **File:** `todo.bin`
    - **Format:** Fixed-size records for each todo.
    - **Fields:**
      - `id` (20 chars): Unique identifier for the todo.
      - `title` (50 chars): Title of the todo.
      - `description` (100 chars): Description of the todo.
      - `status` (12 chars): Status of the todo (e.g., `not_started`).
      - `created_at` (24 chars): Creation timestamp.
      - `updated_at` (24 chars): Last update timestamp.

### Subtodo Storage

- **Directory Structure:** `todo/<email>/<todo_id>`
  - **File:** `subtodos.bin`
    - **Format:** Fixed-size records for each subtodo.
    - **Fields:**
      - `id` (20 chars): Unique identifier for the subtodo.
      - `title` (50 chars): Title of the subtodo.
      - `description` (100 chars): Description of the subtodo.
      - `status` (12 chars): Status of the subtodo (e.g., `not_started`).
      - `created_at` (24 chars): Creation timestamp.
      - `updated_at` (24 chars): Last update timestamp.

## CRUD Operations

### Todos

- **Create Todo:**
  - Adds a new todo to `todo.bin` in the user's directory.
  - Default status is `not_started`.

- **Read Todos:**
  - Reads all todos from `todo.bin` for the logged-in user.
  - Skips todos marked as deleted (`DEL_` prefix).

- **Update Todo:**
  - Updates an existing todo's title, description, status, and timestamps.
  - Random access allows efficient updates.

- **Delete Todo:**
  - Marks the todo as deleted by prefixing the `id` with `DEL_`.
  - The todo remains in the file until a full cleanup is performed.

### Subtodos

- **Create Subtodo:**
  - Adds a new subtodo to `subtodos.bin` within the todo's directory.
  - Default status is `not_started`.

- **Read Subtodos:**
  - Reads all subtodos for a specific todo.
  - Skips subtodos marked as deleted (`DEL_` prefix).

- **Delete Subtodo:**
  - Marks the subtodo as deleted by prefixing the `id` with `DEL_`.
  - The subtodo remains in the file until a full cleanup is performed.

## How to Run

1. **Install Node.js:** Ensure Node.js is installed on your machine.
2. **Clone the Repository:** `git clone <repository-url>`
3. **Navigate to the Project Directory:** `cd <project-directory>`
4. **Start the Server:** `node server.js`
5. **Access the Application:** Open a browser and navigate to `http://localhost:3000/`.

## Future Enhancements

- Implement user sessions with cookies for better security.
- Add a cleanup mechanism to remove records marked with `DEL_`.
- Implement a search feature to filter todos and subtodos based on title, description, or status.
- Add unit tests for server-side operations.

## License

This project is licensed under the MIT License.
