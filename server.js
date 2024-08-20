const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const RECORD_SIZE = 230; // Define fixed record size for todos

// Utility Functions
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function serializeTodo(todo) {
  const id = todo.id.padEnd(20, ' ');
  const title = todo.title.padEnd(50, ' ');
  const description = todo.description.padEnd(100, ' ');
  const status = todo.status.padEnd(12, ' ');
  const createdAt = todo.created_at.padEnd(24, ' ');
  const updatedAt = todo.updated_at.padEnd(24, ' ');

  return `${id}${title}${description}${status}${createdAt}${updatedAt}`;
}

function deserializeTodo(record) {
  return {
    id: record.slice(0, 20).trim(),
    title: record.slice(20, 70).trim(),
    description: record.slice(70, 170).trim(),
    status: record.slice(170, 182).trim(),
    created_at: record.slice(182, 206).trim(),
    updated_at: record.slice(206, 230).trim(),
  };
}

function registerUser(email, password) {
  const systemDir = path.join(__dirname, 'todo', 'system');
  if (!fs.existsSync(systemDir)) {
    fs.mkdirSync(systemDir, { recursive: true });
  }

  const hashedPassword = hashPassword(password);
  const userData = `${email}:${hashedPassword}\n`;

  fs.appendFileSync(path.join(systemDir, 'user.bin'), userData);
}

function loginUser(email, password) {
  const systemDir = path.join(__dirname, 'todo', 'system');
  const userFile = path.join(systemDir, 'user.bin');

  if (!fs.existsSync(userFile)) {
    return false;
  }

  const hashedPassword = hashPassword(password);
  const users = fs.readFileSync(userFile, 'utf8').split('\n');

  for (const user of users) {
    const [storedEmail, storedHash] = user.split(':');
    if (storedEmail === email && storedHash === hashedPassword) {
      return true;
    }
  }
  return false;
}

function addTodo(email, todoData) {
  const userDir = path.join(__dirname, 'todo', email.replace(/@/g, '_').replace(/\./g, '_'));
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  const todoFile = path.join(userDir, 'todo.bin');
  const buffer = Buffer.from(serializeTodo(todoData), 'utf8');
  
  fs.appendFileSync(todoFile, buffer);
}

function readTodos(email) {
  const userDir = path.join(__dirname, 'todo', email.replace(/@/g, '_').replace(/\./g, '_'));
  const todoFile = path.join(userDir, 'todo.bin');

  if (!fs.existsSync(todoFile)) {
    return [];
  }

  const todos = [];
  const fd = fs.openSync(todoFile, 'r');
  const buffer = Buffer.alloc(RECORD_SIZE);
  let bytesRead = 0;
  let position = 0;

  while ((bytesRead = fs.readSync(fd, buffer, 0, RECORD_SIZE, position)) > 0) {
    const todo = deserializeTodo(buffer.toString('utf8', 0, bytesRead));
    if (!todo.id.startsWith('DEL_')) {
      todos.push(todo);
    }
    position += RECORD_SIZE;
  }
  fs.closeSync(fd);

  return todos;
}

function updateTodo(email, todoId, updatedData) {
  const userDir = path.join(__dirname, 'todo', email.replace(/@/g, '_').replace(/\./g, '_'));
  const todoFile = path.join(userDir, 'todo.bin');

  if (!fs.existsSync(todoFile)) {
    return false;
  }

  const fd = fs.openSync(todoFile, 'r+');
  const buffer = Buffer.alloc(RECORD_SIZE);
  let bytesRead = 0;
  let position = 0;

  while ((bytesRead = fs.readSync(fd, buffer, 0, RECORD_SIZE, position)) > 0) {
    const todo = deserializeTodo(buffer.toString('utf8', 0, bytesRead));
    if (todo.id === todoId) {
      const updatedTodo = {
        ...todo,
        ...updatedData,
        updated_at: new Date().toISOString(),
      };
      const updatedRecord = Buffer.from(serializeTodo(updatedTodo), 'utf8');
      fs.writeSync(fd, updatedRecord, 0, RECORD_SIZE, position);
      fs.closeSync(fd);
      return true;
    }
    position += RECORD_SIZE;
  }

  fs.closeSync(fd);
  return false;
}

function deleteTodo(email, todoId) {
  const userDir = path.join(__dirname, 'todo', email.replace(/@/g, '_').replace(/\./g, '_'));
  const todoFile = path.join(userDir, 'todo.bin');

  if (!fs.existsSync(todoFile)) {
    return false;
  }

  const fd = fs.openSync(todoFile, 'r+');
  const buffer = Buffer.alloc(RECORD_SIZE);
  let bytesRead = 0;
  let position = 0;

  while ((bytesRead = fs.readSync(fd, buffer, 0, RECORD_SIZE, position)) > 0) {
    const todo = deserializeTodo(buffer.toString('utf8', 0, bytesRead));
    if (todo.id === todoId) {
      const deletedTodo = { ...todo, id: `DEL_${todo.id}` };
      const deletedRecord = Buffer.from(serializeTodo(deletedTodo), 'utf8');
      fs.writeSync(fd, deletedRecord, 0, RECORD_SIZE, position);
      fs.closeSync(fd);
      return true;
    }
    position += RECORD_SIZE;
  }

  fs.closeSync(fd);
  return false;
}

// Subtodo Operations
function addSubtodo(email, todoId, subtodoData) {
  const userDir = path.join(__dirname, 'todo', email.replace(/@/g, '_').replace(/\./g, '_'));
  const subtodoDir = path.join(userDir, todoId);

  if (!fs.existsSync(subtodoDir)) {
    fs.mkdirSync(subtodoDir, { recursive: true });
  }

  const subtodoFile = path.join(subtodoDir, 'subtodos.bin');
  const buffer = Buffer.from(serializeTodo(subtodoData), 'utf8');
  
  fs.appendFileSync(subtodoFile, buffer);
}

function readSubtodos(email, todoId) {
  const userDir = path.join(__dirname, 'todo', email.replace(/@/g, '_').replace(/\./g, '_'));
  const subtodoDir = path.join(userDir, todoId);
  const subtodoFile = path.join(subtodoDir, 'subtodos.bin');

  if (!fs.existsSync(subtodoFile)) {
    return [];
  }

  const subtodos = [];
  const fd = fs.openSync(subtodoFile, 'r');
  const buffer = Buffer.alloc(RECORD_SIZE);
  let bytesRead = 0;
  let position = 0;

  while ((bytesRead = fs.readSync(fd, buffer, 0, RECORD_SIZE, position)) > 0) {
    const subtodo = deserializeTodo(buffer.toString('utf8', 0, bytesRead));
    subtodos.push(subtodo);
    position += RECORD_SIZE;
  }
  fs.closeSync(fd);

  return subtodos;
}

// Server Setup
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Serve static files (like index.html)
  if (pathname === '/' || pathname.endsWith('.html') || pathname.endsWith('.js') || pathname.endsWith('.css')) {
    let filepath = '.' + pathname;
    if (pathname === '/') filepath = './login.html';

    const ext = path.parse(filepath).ext;
    const map = {
      '.ico': 'image/x-icon',
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword'
    };

    fs.exists(filepath, function (exist) {
      if (!exist) {
        res.statusCode = 404;
        res.end(`File ${filepath} not found!`);
        return;
      }

      fs.readFile(filepath, function (err, data) {
        if (err) {
          res.statusCode = 500;
          res.end(`Error getting the file: ${err}.`);
        } else {
          res.setHeader('Content-type', map[ext] || 'text/plain');
          res.end(data);
        }
      });
    });
  } 

  // Register User
  else if (req.method === 'POST' && pathname === '/register') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const { email, password } = JSON.parse(body);

      registerUser(email, password);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
  }

  // Login User
  else if (req.method === 'POST' && pathname === '/login') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const { email, password } = JSON.parse(body);

      if (loginUser(email, password)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, email }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      }
    });
  }

  // CRUD Operations

  // Create Todo
  else if (req.method === 'POST' && pathname === '/addTodo') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const { email, title, description } = JSON.parse(body);
      const todoData = { id: Date.now().toString(), title, description, status: 'notstarted', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };

      addTodo(email, todoData);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
  }

  // Read Todos
  else if (req.method === 'GET' && pathname === '/todos') {
    const { email } = parsedUrl.query;
    const todos = readTodos(email);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(todos));
  }

  // Update Todo
  else if (req.method === 'POST' && pathname === '/updateTodo') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const { email, todoId, updatedData } = JSON.parse(body);

      const success = updateTodo(email, todoId, updatedData);
      res.writeHead(success ? 200 : 404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success }));
    });
  }

  // Delete Todo
  else if (req.method === 'POST' && pathname === '/deleteTodo') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const { email, todoId } = JSON.parse(body);

      const success = deleteTodo(email, todoId);
      res.writeHead(success ? 200 : 404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success }));
    });
  }

  // Add Subtodo
  else if (req.method === 'POST' && pathname === '/addSubtodo') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const { email, todoId, title, description } = JSON.parse(body);
      const subtodoData = { id: Date.now().toString(), title, description, status: 'notstarted', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };

      addSubtodo(email, todoId, subtodoData);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
  }

  // Read Subtodos
  else if (req.method === 'GET' && pathname === '/subtodos') {
    const { email, todoId } = parsedUrl.query;
    const subtodos = readSubtodos(email, todoId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(subtodos));
  }

  // Route not found
  else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Listen on port 3000
server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});
