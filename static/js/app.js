// tier list application state
let tierData = [];
let uploadedImages = [];
let draggedElement = null;
// default tier labels
const DEFAULT_TIER_LABELS = ['S', 'A', 'B', 'C', 'D', 'F', 'G', 'H'];
// initialize app when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});
function initializeApp() {
    setupFileUpload();
    setupTierControls();
    generateDefaultTiers();
    setupThemeToggle();
}
// theme management
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}
function setupThemeToggle() {
    //load saved theme or default to coffee
    const savedTheme = localStorage.getItem('theme') || 'coffee';
    setTheme(savedTheme);
}
// file upload functionality
function setupFileUpload() {
    const fileInput = document.getElementById('file-input');
    const uploadZone = document.getElementById('upload-zone');
    const browseBtn = document.getElementById('browse-btn');

    //click to browse files
    browseBtn.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('click', () => fileInput.click());
    //file input change handler
    fileInput.addEventListener('change', handleFileSelect);
    //drag and drop for upload zone
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleFileDrop);
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}
function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    uploadFiles(files);
}
function handleFileSelect(e) {
    const files = e.target.files;
    uploadFiles(files);
}

function uploadFiles(files) {
    const formData = new FormData();
    
    //validate files before upload
    let validFiles = 0;
    for (let file of files) {
        if (validateFile(file)) {
            formData.append('files', file);
            validFiles++;
        }
    }
    if (validFiles === 0) {
        showNotification('No valid files selected', 'error');
        return;
    }
    //show loading state
    showNotification(`Uploading ${validFiles} file(s)...`, 'info');

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, 'error');
        } else {
            uploadedImages = [...uploadedImages, ...data.files];
            displayUploadedImages();
            showNotification(`Successfully uploaded ${data.files.length} image(s)!`, 'success');
        }
    })
    .catch(error => {
        console.error('Upload error:', error);
        showNotification('Upload failed. Please try again.', 'error');
    });
}
function validateFile(file) {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; //5MB
    if (!allowedTypes.includes(file.type)) {
        showNotification(`Invalid file type: ${file.name}`, 'error');
        return false;
    }

    if (file.size > maxSize) {
        showNotification(`File too large: ${file.name} (max 5MB)`, 'error');
        return false;
    }

    return true;
}
function displayUploadedImages() {
    const preview = document.getElementById('upload-preview');
    preview.innerHTML = '';
    if (uploadedImages.length === 0) {
        preview.classList.add('hidden');
        return;
    }

    preview.classList.remove('hidden');
    uploadedImages.forEach(image => {
        const imgElement = createDraggableImage(image);
        preview.appendChild(imgElement);
    });
}

function createDraggableImage(image) {
    const container = document.createElement('div');
    container.className = 'tier-item relative group cursor-move';
    container.draggable = true;
    container.dataset.imageId = image.filename;
    container.innerHTML = `
        <img src="${image.url}" alt="${image.original_name}" 
             class="w-full h-20 object-cover rounded border-2 border-base-300 group-hover:border-primary">
        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded transition-all"></div>
        <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onclick="removeImage('${image.filename}')" 
                    class="btn btn-xs btn-circle btn-error">✕</button>
        </div>
    `;
    //drag events
    container.addEventListener('dragstart', handleImageDragStart);
    container.addEventListener('dragend', handleImageDragEnd);

    return container;
}

function removeImage(filename) {
    uploadedImages = uploadedImages.filter(img => img.filename !== filename);
    
    //remove from tiers as well
    tierData.forEach(tier => {
        tier.images = tier.images.filter(img => img.filename !== filename);
    });
    displayUploadedImages();
    renderTiers();
}
// tier controls
function setupTierControls() {
    const slider = document.getElementById('tier-slider');
    const countDisplay = document.getElementById('tier-count-display');
    const saveBtn = document.getElementById('save-btn');

    slider.addEventListener('input', (e) => {
        const count = parseInt(e.target.value);
        countDisplay.textContent = count;
        updateTierCount(count);
    });

    saveBtn.addEventListener('click', saveTierList);
}

function generateDefaultTiers() {
    const count = 5;
    tierData = [];
    
    for (let i = 0; i < count; i++) {
        tierData.push({
            id: `tier-${i}`,
            label: DEFAULT_TIER_LABELS[i],
            images: []
        });
    }
    renderTiers();
}

function updateTierCount(newCount) {
    const currentCount = tierData.length;
    if (newCount > currentCount) {
        //add new tiers
        for (let i = currentCount; i < newCount; i++) {
            tierData.push({
                id: `tier-${i}`,
                label: DEFAULT_TIER_LABELS[i] || `T${i + 1}`,
                images: []
            });
        }
    } else if (newCount < currentCount) {
        //remove excess tiers and move their images back to upload area
        const removedTiers = tierData.splice(newCount);
        removedTiers.forEach(tier => {
            uploadedImages = [...uploadedImages, ...tier.images];
        });
        displayUploadedImages();
    }
    
    renderTiers();
}
function renderTiers() {
    const container = document.getElementById('tier-list');
    container.innerHTML = '';
    tierData.forEach((tier, index) => {
        const tierElement = createTierElement(tier, index);
        container.appendChild(tierElement);
    });
}
function createTierElement(tier, index) {
    const tierDiv = document.createElement('div');
    tierDiv.className = 'card bg-base-200 shadow-lg';
    tierDiv.innerHTML = `
        <div class="card-body p-4">
            <div class="flex items-center gap-4">
                <!-- tier label -->
                <div class="flex-shrink-0 w-16">
                    <div class="badge badge-primary badge-lg p-4 text-lg font-bold cursor-pointer" 
                         onclick="editTierLabel(${index})">
                        ${tier.label}
                    </div>
                </div>
                <!-- tier items container -->
                <div class="tier-container flex-1 min-h-[100px] border-2 border-dashed border-base-300 rounded-lg p-4 flex flex-wrap gap-2"
                     data-tier-id="${tier.id}" 
                     ondrop="handleTierDrop(event, ${index})" 
                     ondragover="handleTierDragOver(event)"
                     ondragleave="handleTierDragLeave(event)">
                    ${tier.images.map(image => createTierImageHTML(image)).join('')}
                </div>
            </div>
        </div>
    `;
    return tierDiv;
}

function createTierImageHTML(image) {
    return `
        <div class="tier-item relative group cursor-move" 
             draggable="true" 
             data-image-id="${image.filename}"
             onmousedown="handleImageDragStart(event)"
             onmouseup="handleImageDragEnd(event)">
            <img src="${image.url}" alt="${image.original_name}" 
                 class="w-16 h-16 object-cover rounded border border-base-300">
        </div>
    `;
}
function editTierLabel(tierIndex) {
    const currentLabel = tierData[tierIndex].label;
    const newLabel = prompt('Enter new tier label:', currentLabel);
    
    if (newLabel !== null && newLabel.trim() !== '') {
        tierData[tierIndex].label = newLabel.trim();
        renderTiers();
    }
}
// drag and drop functionality
function handleImageDragStart(e) {
    draggedElement = e.currentTarget;
    draggedElement.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', draggedElement.outerHTML);
}

function handleImageDragEnd(e) {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        draggedElement = null;
    }
}
function handleTierDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}
function handleTierDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleTierDrop(e, tierIndex) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (!draggedElement) return;
    const imageId = draggedElement.dataset.imageId;
    const image = findImageById(imageId);
    if (!image) return;

    //remove image from its current location
    removeImageFromCurrentLocation(imageId);
    //add to new tier
    tierData[tierIndex].images.push(image);
    //refresh displays
    displayUploadedImages();
    renderTiers();
}
function findImageById(imageId) {
    return uploadedImages.find(img => img.filename === imageId) ||
           tierData.flatMap(tier => tier.images).find(img => img.filename === imageId);
}
function removeImageFromCurrentLocation(imageId) {
    //remove from uploaded images
    uploadedImages = uploadedImages.filter(img => img.filename !== imageId);
    //remove from all tiers
    tierData.forEach(tier => {
        tier.images = tier.images.filter(img => img.filename !== imageId);
    });
}

// save functionality
function saveTierList() {
    const tierListData = {
        timestamp: new Date().toISOString(),
        tiers: tierData.map(tier => ({
            label: tier.label,
            images: tier.images.map(img => ({
                filename: img.filename,
                original_name: img.original_name
            }))
        }))
    };

    const dataStr = JSON.stringify(tierListData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `tierlist-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    
    showNotification('Tier list saved successfully!', 'success');
}
// notification system
function showNotification(message, type = 'info') {
    //remove existing notifications
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `notification-toast alert alert-${type} fixed top-4 right-4 z-50 w-auto max-w-sm shadow-lg`;
    toast.innerHTML = `
        <div class="flex items-center gap-2">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="btn btn-ghost btn-xs">✕</button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    //auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
} 