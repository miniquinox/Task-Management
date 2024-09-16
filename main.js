// Import Firestore functions
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Reference to Firestore collection
const db = getFirestore();
const tasksCollectionRef = collection(db, 'tasks');

// Store tasks globally
let tasks = [];
let pastedImages = [];

// Load tasks from Firestore on page load
document.addEventListener('DOMContentLoaded', async function () {
    const modal = document.getElementById('file-modal');
    const mainContent = document.querySelector('main');

    // Fetch tasks from Firestore
    const querySnapshot = await getDocs(tasksCollectionRef);
    querySnapshot.forEach(doc => {
        tasks.push({ id: doc.id, ...doc.data() });
    });

    displayTasks(tasks);

    // Hide modal and show main content after tasks are loaded
    modal.style.display = 'none';
    mainContent.style.display = 'block';
});

// Add paste event listener to the paste box
document.getElementById('paste-box').addEventListener('paste', function (e) {
    const items = e.clipboardData.items;
    const pasteBox = document.getElementById('paste-box');

    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            const reader = new FileReader();

            reader.onload = function (event) {
                pastedImages.push(event.target.result);

                if (pasteBox.querySelector('p')) {
                    pasteBox.querySelector('p').style.display = 'none';
                }

                const imgElement = document.createElement('img');
                imgElement.src = event.target.result;
                imgElement.alt = "Pasted Image";
                imgElement.classList.add('preview-image');
                pasteBox.appendChild(imgElement);
            };

            reader.readAsDataURL(blob);
        }
    }
});

// Display tasks
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

    const docRef = await addDoc(tasksCollectionRef, newTask);

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
