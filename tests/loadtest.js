import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.1.0/index.js';

// Configurable parameters
const USERS = 100;
const TODOS_PER_USER = 1000;
const BASE_URL = 'http://localhost:3000'; // Change to your app's base URL

export let options = {
  vus: USERS,
  iterations: USERS * TODOS_PER_USER,
  duration: '2m', // Adjust duration as needed
};

export default function () {
  // Simulate unique users by generating unique emails
  const email = `user_${__VU}@test.com`;
  const password = 'password';

  // Register the user
  let registerRes = http.post(`${BASE_URL}/register`, JSON.stringify({ email, password }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(registerRes, { 'registered successfully': (res) => res.status === 200 });

  // Login the user
  let loginRes = http.post(`${BASE_URL}/login`, JSON.stringify({ email, password }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(loginRes, { 'logged in successfully': (res) => res.status === 200 });

  // Extract the user's email from the login response
  const userEmail = loginRes.json('email');

  // Create todos for the user
  for (let i = 0; i < TODOS_PER_USER; i++) {
    const todoData = {
      email: userEmail,
      title: `Todo ${i + 1}`,
      description: `Description for Todo ${i + 1}`,
    };
    let createRes = http.post(`${BASE_URL}/addTodo`, JSON.stringify(todoData), {
      headers: { 'Content-Type': 'application/json' },
    });
    check(createRes, { 'todo created successfully': (res) => res.status === 200 });

    // Optionally sleep between requests to simulate real user behavior
    sleep(0.1); // Adjust as needed
  }
}
