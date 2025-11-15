// Array to store todo items
let todos = [];
let editingId = null;
let notificationInterval = null;
let isDarkMode = false;

// DOM elements
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const dueDateInput = document.getElementById('due-date-input');
const categorySelect = document.getElementById('category-select');
const prioritySelect = document.getElementById('priority-select');
const todoList = document.getElementById('todo-list');
const datetimeElement = document.getElementById('current-datetime');
const totalCountElement = document.getElementById('total-count');
const completedCountElement = document.getElementById('completed-count');
const pendingCountElement = document.getElementById('pending-count');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const searchInput = document.getElementById('search-input');
const filterCategory = document.getElementById('filter-category');
const filterPriority = document.getElementById('filter-priority');
const filterStatus = document.getElementById('filter-status');

// Set minimum date for due date input to today
function setMinDate() {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    dueDateInput.min = formattedDate;
}

// Toggle dark mode
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.querySelector('.container').classList.toggle('dark-mode', isDarkMode);
    document.querySelector('h1').classList.toggle('dark-mode', isDarkMode);
    document.querySelector('.datetime-container').classList.toggle('dark-mode', isDarkMode);
    document.querySelector('.empty-state').classList.toggle('dark-mode', isDarkMode);
    document.querySelector('.stats').classList.toggle('dark-mode', isDarkMode);
    
    // Update dark mode toggle button text
    darkModeToggle.textContent = isDarkMode ? '☀️' : '🌙';
    
    // Update form elements
    const formElements = document.querySelectorAll('#todo-input, #due-date-input, #category-select, #priority-select, #search-input, #filter-category, #filter-priority, #filter-status');
    formElements.forEach(element => {
        element.classList.toggle('dark-mode', isDarkMode);
    });
    
    // Save preference to localStorage
    localStorage.setItem('darkMode', isDarkMode);
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateStr = now.toLocaleDateString('en-US', options);
    const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    datetimeElement.textContent = `${dateStr} | ${timeStr}`;
}

// Check for upcoming tasks and show notifications
function checkUpcomingTasks() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    todos.forEach(todo => {
        if (!todo.completed && todo.dueDate) {
            const dueDate = new Date(todo.dueDate);
            
            // Check if due date is today
            if (dueDate.toDateString() === now.toDateString() && !todo.notifiedToday) {
                showNotification(`Reminder: "${todo.text}" is due today!`);
                // Mark as notified to prevent repeated notifications
                todo.notifiedToday = true;
                saveTodos();
            }
            // Check if due date is tomorrow
            else if (dueDate.toDateString() === tomorrow.toDateString() && !todo.notifiedTomorrow) {
                showNotification(`Reminder: "${todo.text}" is due tomorrow!`);
                // Mark as notified to prevent repeated notifications
                todo.notifiedTomorrow = true;
                saveTodos();
            }
        }
    });
}

// Show browser notification
function showNotification(message) {
    // Check if browser supports notifications
    if ("Notification" in window) {
        // Request permission if not granted
        if (Notification.permission === "granted") {
            new Notification("To-Do List Reminder", {
                body: message,
                icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✅</text></svg>"
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification("To-Do List Reminder", {
                        body: message,
                        icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✅</text></svg>"
                    });
                }
            });
        }
    }
    
    // Also show alert as fallback
    console.log("Notification:", message);
}

// Load todos from localStorage if available
function loadTodos() {
    const storedTodos = localStorage.getItem('todos');
    if (storedTodos) {
        todos = JSON.parse(storedTodos);
    }
    
    // Load dark mode preference
    const storedDarkMode = localStorage.getItem('darkMode');
    if (storedDarkMode === 'true') {
        toggleDarkMode();
    }
    
    renderTodos();
}

// Save todos to localStorage
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// Update statistics
function updateStats() {
    const total = todos.length;
    const completed = todos.filter(todo => todo.completed).length;
    const pending = total - completed;
    
    totalCountElement.textContent = total;
    completedCountElement.textContent = completed;
    pendingCountElement.textContent = pending;
}

// Filter and search todos
function getFilteredTodos() {
    const searchTerm = searchInput.value.toLowerCase();
    const categoryFilter = filterCategory.value;
    const priorityFilter = filterPriority.value;
    const statusFilter = filterStatus.value;
    
    return todos.filter(todo => {
        // Search filter
        const matchesSearch = todo.text.toLowerCase().includes(searchTerm);
        
        // Category filter
        const matchesCategory = categoryFilter === 'all' || todo.category === categoryFilter;
        
        // Priority filter
        const matchesPriority = priorityFilter === 'all' || todo.priority === priorityFilter;
        
        // Status filter
        const matchesStatus = statusFilter === 'all' || 
                             (statusFilter === 'completed' && todo.completed) || 
                             (statusFilter === 'pending' && !todo.completed);
        
        return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
    });
}

// Render todos to the DOM
function renderTodos() {
    todoList.innerHTML = '';
    
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        todoList.innerHTML = `
            <div class="empty-state ${isDarkMode ? 'dark-mode' : ''}">
                <p>No tasks found!</p>
                <p>Try changing your search or filter criteria.</p>
            </div>
        `;
        updateStats();
        return;
    }
    
    // Sort todos: incomplete first, then by due date
    const sortedTodos = [...filteredTodos].sort((a, b) => {
        // Completed tasks last
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        // Then sort by priority (high > medium > low)
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        // Then sort by due date
        if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate) - new Date(b.dueDate);
        }
        // Tasks with due dates first
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        // Then by creation date
        return new Date(a.createdAt) - new Date(b.createdAt);
    });
    
    sortedTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${isDarkMode ? 'dark-mode' : ''}`;
        li.dataset.id = todo.id;
        
        const textContainer = document.createElement('div');
        textContainer.style.display = 'flex';
        textContainer.style.alignItems = 'center';
        textContainer.style.flex = '1';
        
        const textSpan = document.createElement('span');
        textSpan.className = `todo-text ${todo.completed ? 'completed' : ''} ${isDarkMode ? 'dark-mode' : ''}`;
        textSpan.textContent = todo.text;
        
        textContainer.appendChild(textSpan);
        
        // Add category tag
        const categoryTag = document.createElement('span');
        categoryTag.className = `category-tag ${todo.category}`;
        categoryTag.textContent = todo.category.charAt(0).toUpperCase() + todo.category.slice(1);
        textContainer.appendChild(categoryTag);
        
        // Add priority tag
        const priorityTag = document.createElement('span');
        priorityTag.className = `priority-tag ${todo.priority}`;
        priorityTag.textContent = todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1);
        textContainer.appendChild(priorityTag);
        
        // Add due date if exists
        if (todo.dueDate) {
            const dueDateSpan = document.createElement('span');
            dueDateSpan.className = 'due-date';
            
            const dueDate = new Date(todo.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);
            
            // Format date for display
            const options = { month: 'short', day: 'numeric' };
            if (dueDate.getFullYear() !== today.getFullYear()) {
                options.year = 'numeric';
            }
            
            dueDateSpan.textContent = dueDate.toLocaleDateString('en-US', options);
            
            // Add styling based on due date
            const timeDiff = dueDate - today;
            const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
            
            if (daysDiff < 0) {
                dueDateSpan.classList.add('overdue');
            } else if (daysDiff === 0) {
                dueDateSpan.classList.add('today');
            }
            
            textContainer.appendChild(dueDateSpan);
        }
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions';
        
        const completeBtn = document.createElement('button');
        completeBtn.className = `complete-btn ${todo.completed ? 'completed' : ''}`;
        completeBtn.textContent = todo.completed ? 'Undo' : 'Complete';
        completeBtn.onclick = () => toggleComplete(todo.id);
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => editTodo(todo.id);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteTodo(todo.id);
        
        actionsDiv.appendChild(completeBtn);
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        
        li.appendChild(textContainer);
        li.appendChild(actionsDiv);
        
        // Add animation class
        li.classList.add('slide-in');
        
        todoList.appendChild(li);
    });
    
    updateStats();
}

// Add a new todo
function addTodo(text, dueDate = null, category = 'personal', priority = 'low') {
    const newTodo = {
        id: Date.now(),
        text: text,
        completed: false,
        createdAt: new Date().toISOString(),
        dueDate: dueDate,
        category: category,
        priority: priority,
        notifiedToday: false,
        notifiedTomorrow: false
    };
    
    todos.push(newTodo);
    saveTodos();
    renderTodos();
}

// Delete a todo
function deleteTodo(id) {
    const item = document.querySelector(`.todo-item[data-id="${id}"]`);
    if (item) {
        item.classList.add('slide-out');
        setTimeout(() => {
            todos = todos.filter(todo => todo.id !== id);
            saveTodos();
            renderTodos();
        }, 300);
    }
}

// Edit a todo
function editTodo(id) {
    const todo = todos.find(todo => todo.id === id);
    if (todo) {
        todoInput.value = todo.text;
        if (todo.dueDate) {
            dueDateInput.value = todo.dueDate.split('T')[0];
        } else {
            dueDateInput.value = '';
        }
        categorySelect.value = todo.category;
        prioritySelect.value = todo.priority;
        editingId = id;
        todoForm.querySelector('button').textContent = 'Update Task';
        todoInput.focus();
    }
}

// Update a todo
function updateTodo(id, newText, newDueDate = null, newCategory = 'personal', newPriority = 'low') {
    todos = todos.map(todo => {
        if (todo.id === id) {
            return { 
                ...todo, 
                text: newText,
                dueDate: newDueDate,
                category: newCategory,
                priority: newPriority,
                notifiedToday: false, // Reset notifications when updating
                notifiedTomorrow: false
            };
        }
        return todo;
    });
    
    saveTodos();
    renderTodos();
    editingId = null;
    todoForm.querySelector('button').textContent = 'Add Task';
}

// Toggle complete status
function toggleComplete(id) {
    todos = todos.map(todo => {
        if (todo.id === id) {
            return { ...todo, completed: !todo.completed };
        }
        return todo;
    });
    
    saveTodos();
    renderTodos();
}

// Event listeners for search and filters
searchInput.addEventListener('input', renderTodos);
filterCategory.addEventListener('change', renderTodos);
filterPriority.addEventListener('change', renderTodos);
filterStatus.addEventListener('change', renderTodos);

// Handle form submission
todoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const text = todoInput.value.trim();
    if (text === '') return;
    
    const dueDate = dueDateInput.value ? new Date(dueDateInput.value).toISOString() : null;
    const category = categorySelect.value;
    const priority = prioritySelect.value;
    
    if (editingId !== null) {
        updateTodo(editingId, text, dueDate, category, priority);
    } else {
        addTodo(text, dueDate, category, priority);
    }
    
    todoInput.value = '';
    dueDateInput.value = '';
    categorySelect.value = 'personal';
    prioritySelect.value = 'low';
    todoInput.focus();
});

// Dark mode toggle
darkModeToggle.addEventListener('click', toggleDarkMode);

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadTodos();
    todoInput.focus();
    setMinDate();
    
    // Update date/time immediately and then every second
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Check for upcoming tasks every minute
    checkUpcomingTasks();
    notificationInterval = setInterval(checkUpcomingTasks, 60000);
    
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
});