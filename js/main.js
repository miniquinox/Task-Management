// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC5xd72NZj54glH0nzoI9tJ_dPCaidLBqM",
    authDomain: "task-manager-2025.firebaseapp.com",
    projectId: "task-manager-2025",
    storageBucket: "task-manager-2025.appspot.com",
    messagingSenderId: "1015096573035",
    appId: "1:1015096573035:web:35ed5a595b8bb4fef6452e",
    measurementId: "G-PJEP0EFSZ3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Store tasks globally
let tasks = [];
let pastedImages = [];

// Load tasks from Firestore on page load
document.addEventListener('DOMContentLoaded', async function () {
    const modal = document.getElementById('file-modal');
    const mainContent = document.querySelector('main');

    // Fetch tasks from Firestore
    const querySnapshot = await getDocs(collection(db, 'tasks'));
    querySnapshot.forEach(doc => {
        tasks.push({ id: doc.id, ...doc.data() });
    });

    displayTasks(tasks);

    // Hide modal and show main content after tasks are loaded
    modal.style.display = 'none';
    mainContent.style.display = 'block';
});

// Function to display tasks
function displayTasks(tasks) {
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';

    tasks.sort((a, b) => new Date(b.date) - new Date(a.date));

    let currentDay = null;
    let isLeft = true;

    tasks.forEach((task, index) => {
        const taskDate = new Date(task.date).toDateString();

        if (taskDate !== currentDay) {
            currentDay = taskDate;
            isLeft = !isLeft;

            const dayLabel = document.createElement('div');
            dayLabel.classList.add('day-label', isLeft ? 'left' : 'right');
            dayLabel.textContent = taskDate;
            taskList.appendChild(dayLabel);
        }

        const taskItem = document.createElement('div');
        taskItem.classList.add('task-item', isLeft ? 'left' : 'right');
        
        let statusColor = '#0a84ff';
        if (task.status === 'complete') statusColor = 'green';
        if (task.status === 'impossible') statusColor = 'red';

        let imagesHtml = '';
        if (task.images && task.images.length > 0) {
            task.images.forEach(image => {
                imagesHtml += `<img src="${image}" alt="Task Image" class="preview-image">`;
            });
        }

        taskItem.style.borderColor = statusColor;
        taskItem.innerHTML = `
            <h3 style="color: ${statusColor};">${task.name}</h3>
            <p>${task.description}</p>
            ${imagesHtml}
            <div class="action-buttons">
                <select id="status-select-${index}" style="border-color: ${statusColor};" onchange="updateStatus(${index}, this.value)">
                    <option value="inProgress" ${task.status === 'inProgress' ? 'selected' : ''}>In Progress</option>
                    <option value="complete" ${task.status === 'complete' ? 'selected' : ''}>Complete</option>
                    <option value="impossible" ${task.status === 'impossible' ? 'selected' : ''}>Impossible</option>
                </select>
                <button class="icon-btn icon-edit" onclick="editTask(${index})">&#9998;</button>
                <button class="icon-btn icon-delete" onclick="deleteTask(${index})">&#128465;</button>
            </div>
        `;

        taskList.appendChild(taskItem);
    });
}

// Add new task
document.getElementById('task-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const taskName = document.getElementById('task-name').value;
    const taskDesc = document.getElementById('task-desc').value;

    const newTask = {
        name: taskName,
        description: taskDesc,
        images: pastedImages || [],
        date: new Date().toLocaleString(),
        status: 'inProgress'
    };

    const docRef = await addDoc(collection(db, 'tasks'), newTask);

    tasks.push({ id: docRef.id, ...newTask });

    displayTasks(tasks);

    document.getElementById('task-form').reset();
    document.getElementById('paste-box').innerHTML = '<p>Paste your image here</p>';
    pastedImages = [];
});

// Update task status
async function updateStatus(taskIndex, newStatus) {
    tasks[taskIndex].status = newStatus;
    const taskRef = doc(db, 'tasks', tasks[taskIndex].id);
    await updateDoc(taskRef, { status: newStatus });
    displayTasks(tasks);
}

// Edit task
function editTask(index) {
    const task = tasks[index];
    const taskItem = document.querySelectorAll('.task-item')[index];

    taskItem.innerHTML = `
        <input type="text" id="edit-task-name-${index}" value="${task.name}" class="wide-input">
        <textarea id="edit-task-desc-${index}" rows="4" class="wide-input">${task.description}</textarea>
        <div class="action-buttons">
            <select id="status-select-${index}" style="border-color: ${task.status === 'inProgress' ? '#0a84ff' : task.status === 'complete' ? 'green' : 'red'};" onchange="updateStatus(${index}, this.value)">
                <option value="inProgress" ${task.status === 'inProgress' ? 'selected' : ''}>In Progress</option>
                <option value="complete" ${task.status === 'complete' ? 'selected' : ''}>Complete</option>
                <option value="impossible" ${task.status === 'impossible' ? 'selected' : ''}>Impossible</option>
            </select>
            <button class="icon-btn icon-edit" onclick="saveTask(${index})">&#10003;</button>
            <button class="icon-btn icon-delete" onclick="deleteTask(${index})">&#128465;</button>
        </div>
        ${task.images && task.images.length > 0 ? task.images.map(image => `<img src="${image}" alt="Task Image" class="preview-image">`).join('') : ''}
    `;
}

// Save edited task
async function saveTask(index) {
    const updatedName = document.getElementById(`edit-task-name-${index}`).value;
    const updatedDesc = document.getElementById(`edit-task-desc-${index}`).value;

    tasks[index].name = updatedName;
    tasks[index].description = updatedDesc;

    const taskRef = doc(db, 'tasks', tasks[index].id);
    await updateDoc(taskRef, {
        name: updatedName,
        description: updatedDesc
    });

    displayTasks(tasks);
}

// Delete task
async function deleteTask(index) {
    const taskRef = doc(db, 'tasks', tasks[index].id);
    await deleteDoc(taskRef);
    tasks.splice(index, 1);
    displayTasks(tasks);
}
