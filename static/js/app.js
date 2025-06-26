// tier list application state
let tierData = [];
let uploadedFiles = [];
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
    //drag and drop for upload zone (both file uploads and returning items from tiers)
    uploadZone.addEventListener('dragover', handleUploadZoneDragOver);
    uploadZone.addEventListener('dragleave', handleUploadZoneDragLeave);
    uploadZone.addEventListener('drop', handleUploadZoneDrop);
}
function handleUploadZoneDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleUploadZoneDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
}

function handleUploadZoneDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    // Check if this is a file being dragged from a tier (has draggedElement)
    if (draggedElement) {
        const fileId = draggedElement.dataset.fileId;
        const file = findFileById(fileId);
        if (file) {
            // Remove file from its current location (tier)
            removeFileFromCurrentLocation(fileId);
            
            // Add back to uploaded files if not already there
            if (!uploadedFiles.find(f => f.filename === fileId)) {
                uploadedFiles.push(file);
            }
            
            // Refresh displays
            displayUploadedFiles();
            renderTiers();
            
            showNotification('Item returned to upload area', 'success');
            return;
        }
    }
    
    // Otherwise, handle as regular file upload
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        uploadFiles(files);
    }
}

// Keep the old function names for backward compatibility
function handleDragOver(e) {
    return handleUploadZoneDragOver(e);
}

function handleDragLeave(e) {
    return handleUploadZoneDragLeave(e);
}

function handleFileDrop(e) {
    return handleUploadZoneDrop(e);
}

function handleFileSelect(e) {
    const files = e.target.files;
    uploadFiles(files);
}

function uploadFiles(files) {
    console.log(`[DEBUG] uploadFiles called with ${files.length} files`);
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
    .then(async (data) => {
        console.log(`[DEBUG] Upload response received:`, data);
        if (data.error) {
            showNotification(data.error, 'error');
        } else {
            console.log(`[DEBUG] Adding ${data.files.length} files to uploadedFiles`);
            uploadedFiles = [...uploadedFiles, ...data.files];
            
            // Show uploaded files immediately
            displayUploadedFiles();
            
            console.log(`[DEBUG] Image recognition enabled: ${imageRecognitionEnabled}`);
            console.log(`[DEBUG] Uploaded files:`, data.files);
            
            // Analyze uploaded images with AI recognition
            if (imageRecognitionEnabled) {
                const imageFiles = data.files.filter(file => !file.is_audio);
                console.log(`[DEBUG] Image recognition enabled. Found ${imageFiles.length} image files to analyze:`, imageFiles.map(f => f.filename));
                console.log(`[DEBUG] All files with is_audio property:`, data.files.map(f => ({ filename: f.filename, is_audio: f.is_audio })));
                
                if (imageFiles.length > 0) {
                    showNotification(`Analyzing ${imageFiles.length} image(s)...`, 'info');
                    
                    // Analyze images sequentially to avoid overwhelming the API
                    for (const file of imageFiles) {
                        try {
                            console.log(`[DEBUG] Analyzing file: ${file.filename}`);
                            const recognition = await analyzeImage(file.url, file.filename);
                            if (recognition) {
                                console.log(`[DEBUG] Setting recognition "${recognition}" for file: ${file.filename}`);
                                file.recognition = recognition;
                                // Find the file in uploadedFiles and update it
                                const uploadedFile = uploadedFiles.find(f => f.filename === file.filename);
                                if (uploadedFile) {
                                    uploadedFile.recognition = recognition;
                                    console.log(`[DEBUG] Updated uploadedFile with recognition: ${uploadedFile.filename} -> ${uploadedFile.recognition}`);
                                }
                                // Update display after each analysis for real-time feedback
                                displayUploadedFiles();
                                // Show individual success notification
                                showNotification(`🔍 Recognized "${file.original_name}" as: ${recognition}`, 'success');
                            } else {
                                console.log(`[DEBUG] No recognition result for file: ${file.filename}`);
                                showNotification(`⚠️ Could not analyze: ${file.original_name}`, 'warning');
                            }
                        } catch (error) {
                            console.error(`[DEBUG] Failed to analyze ${file.filename}:`, error);
                        }
                    }
                    
                    const analyzedCount = imageFiles.filter(f => f.recognition).length;
                    showNotification(`✅ Successfully uploaded ${data.files.length} file(s)! Analyzed ${analyzedCount}/${imageFiles.length} images.`, 'success');
                } else {
                    showNotification(`Successfully uploaded ${data.files.length} file(s)!`, 'success');
                }
            } else {
                showNotification(`Successfully uploaded ${data.files.length} file(s)!`, 'success');
            }
        }
    })
    .catch(error => {
        console.error('Upload error:', error);
        showNotification('Upload failed. Please try again.', 'error');
    });
}
function validateFile(file) {
    const allowedTypes = [
        'image/png', 'image/jpeg', 'image/jpg', 'image/gif',
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac'
    ];
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
function displayUploadedFiles() {
    const preview = document.getElementById('upload-preview');
    preview.innerHTML = '';
    
    console.log(`[DEBUG] Displaying ${uploadedFiles.length} uploaded files`);
    uploadedFiles.forEach((file, index) => {
        console.log(`[DEBUG] File ${index}: ${file.filename}, recognition: ${file.recognition}`);
    });
    
    if (uploadedFiles.length === 0) {
        preview.classList.add('hidden');
        return;
    }

    preview.classList.remove('hidden');
    
    uploadedFiles.forEach(file => {
        const fileElement = createDraggableFile(file);
        preview.appendChild(fileElement);
    });
}
function createDraggableFile(file) {
    const container = document.createElement('div');
    container.className = 'tier-item relative group cursor-move';
    container.draggable = true;
    container.dataset.fileId = file.filename;
    
    if (file.is_audio) {
        container.innerHTML = `
            <div class="w-full h-20 bg-base-300 rounded border-2 border-base-300 group-hover:border-primary flex flex-col items-center justify-center p-2">
                <div class="text-2xl">🎵</div>
                <div class="text-xs text-center truncate w-full">${file.original_name}</div>
                <audio controls class="w-full mt-1" style="height: 20px;">
                    <source src="${file.url}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
            </div>
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded transition-all pointer-events-none"></div>
            <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="removeFile('${file.filename}')" 
                        class="btn btn-xs btn-circle btn-error">✕</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <img src="${file.url}" alt="${file.original_name}" 
                 class="max-w-full max-h-32 object-contain rounded border-2 border-base-300 group-hover:border-primary">
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded transition-all"></div>
            <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="removeFile('${file.filename}')" 
                        class="btn btn-xs btn-circle btn-error">✕</button>
            </div>
        `;
        
        // Add image recognition overlay if available
        if (file.recognition && imageRecognitionEnabled) {
            console.log(`[DEBUG] Adding overlay for file: ${file.filename}, recognition: ${file.recognition}`);
            addImageRecognitionOverlay(container, file.recognition);
        } else {
            console.log(`[DEBUG] No overlay for file: ${file.filename}, recognition: ${file.recognition}, enabled: ${imageRecognitionEnabled}`);
        }
    }
    
    //drag events
    container.addEventListener('dragstart', handleFileDragStart);
    container.addEventListener('dragend', handleFileDragEnd);
    return container;
}
function removeFile(filename) {
    uploadedFiles = uploadedFiles.filter(file => file.filename !== filename);
    //remove from tiers as well
    tierData.forEach(tier => {
        tier.files = tier.files.filter(file => file.filename !== filename);
    });
    displayUploadedFiles();
    renderTiers();
}
// tier controls
function setupTierControls() {
    const slider = document.getElementById('tier-slider');
    const countDisplay = document.getElementById('tier-count-display');
    const saveBtn = document.getElementById('save-btn');
    const importBtn = document.getElementById('import-btn');
    const importInput = document.getElementById('import-input');
    
    slider.addEventListener('input', (e) => {
        const count = parseInt(e.target.value);
        countDisplay.textContent = count;
        updateTierCount(count);
    });
    
    saveBtn.addEventListener('click', saveTierList);
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', handleImportFile);
}
function generateDefaultTiers() {
    const count = 5;
    tierData = [];
    for (let i = 0; i < count; i++) {
        tierData.push({
            id: `tier-${i}`,
            label: DEFAULT_TIER_LABELS[i],
            files: []
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
                files: []
            });
        }
    } else if (newCount < currentCount) {
        //remove excess tiers and move their files back to upload area
        const removedTiers = tierData.splice(newCount);
        removedTiers.forEach(tier => {
            uploadedFiles = [...uploadedFiles, ...tier.files];
        });
        displayUploadedFiles();
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
                <div class="tier-container flex-1 min-h-[80px] border-2 border-dashed border-base-300 rounded-lg p-3 flex flex-wrap gap-2"
                     data-tier-id="${tier.id}" 
                     ondrop="handleTierDrop(event, ${index})" 
                     ondragover="handleTierDragOver(event)"
                     ondragleave="handleTierDragLeave(event)">
                    ${tier.files.map(file => createTierFileHTML(file)).join('')}
                </div>
            </div>
        </div>
    `;
    return tierDiv;
}
function createTierFileHTML(file) {
    if (file.is_audio) {
        return `
            <div class="tier-item relative group cursor-move" 
                 draggable="true" 
                 data-file-id="${file.filename}"
                 onmousedown="handleFileDragStart(event)"
                 onmouseup="handleFileDragEnd(event)">
                <div class="w-16 h-16 bg-base-300 rounded border border-base-300 flex flex-col items-center justify-center p-1">
                    <div class="text-lg">🎵</div>
                    <div class="text-xs text-center truncate w-full">${file.original_name.substring(0, 8)}...</div>
                    <audio controls class="w-full mt-1" style="height: 16px; transform: scale(0.8);">
                        <source src="${file.url}" type="audio/mpeg">
                    </audio>
                </div>
                <!-- Delete button -->
                <div class="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="removeFile('${file.filename}')" 
                            class="btn btn-xs btn-circle btn-error" 
                            title="Delete file">✕</button>
                </div>
            </div>
        `;
    } else {
        const recognitionOverlay = (file.recognition && imageRecognitionEnabled) 
            ? `<div class="image-recognition-overlay absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded-b z-10 pointer-events-none" style="font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">🔍 ${file.recognition}</div>`
            : '';
            
        console.log(`[DEBUG] Creating tier file HTML for: ${file.filename}, recognition: ${file.recognition}, overlay: ${recognitionOverlay ? 'YES' : 'NO'}`);
            
        return `
            <div class="tier-item relative group cursor-move" 
                 draggable="true" 
                 data-file-id="${file.filename}"
                 onmousedown="handleFileDragStart(event)"
                 onmouseup="handleFileDragEnd(event)">
                <img src="${file.url}" alt="${file.original_name}" 
                     class="h-16 w-auto object-contain rounded border border-base-300">
                ${recognitionOverlay}
                <!-- Delete button -->
                <div class="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button onclick="removeFile('${file.filename}')" 
                            class="btn btn-xs btn-circle btn-error" 
                            title="Delete file">✕</button>
                </div>
            </div>
        `;
    }
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
function handleFileDragStart(e) {
    draggedElement = e.currentTarget;
    draggedElement.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', draggedElement.outerHTML);
}
function handleFileDragEnd(e) {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        draggedElement = null;
    }
}

// backward compatibility aliases
const handleImageDragStart = handleFileDragStart;
const handleImageDragEnd = handleFileDragEnd;
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
    const fileId = draggedElement.dataset.fileId;
    const file = findFileById(fileId);
    if (!file) return;
    //remove file from its current location
    removeFileFromCurrentLocation(fileId);
    //add to new tier
    tierData[tierIndex].files.push(file);
    //refresh displays
    displayUploadedFiles();
    renderTiers();
}
function findFileById(fileId) {
    return uploadedFiles.find(file => file.filename === fileId) ||
           tierData.flatMap(tier => tier.files).find(file => file.filename === fileId);
}
function removeFileFromCurrentLocation(fileId) {
    //remove from uploaded files
    uploadedFiles = uploadedFiles.filter(file => file.filename !== fileId);
    //remove from all tiers
    tierData.forEach(tier => {
        tier.files = tier.files.filter(file => file.filename !== fileId);
    });
}

// save functionality
function saveTierList() {
    const tierListData = {
        timestamp: new Date().toISOString(),
        tiers: tierData.map(tier => ({
            label: tier.label,
            files: tier.files.map(file => ({
                filename: file.filename,
                original_name: file.original_name,
                is_audio: file.is_audio
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

// import functionality
function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    
    showNotification('Importing tier list...', 'info');
    fetch('/import', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, 'error');
        } else {
            importTierList(data);
        }
    })
    .catch(error => {
        console.error('Import error:', error);
        showNotification('Import failed. Please try again.', 'error');
    })
    .finally(() => {
        //clear the file input
        e.target.value = '';
    });
}

function importTierList(data) {
    const { tierlist, available_files, missing_files } = data;
    
    //show warning for missing files
    if (missing_files.length > 0) {
        const missingList = missing_files.join(', ');
        showNotification(`Warning: ${missing_files.length} file(s) not found: ${missingList}`, 'warning');
    }
    
    //clear current state
    uploadedFiles = [];
    tierData = [];
    
    //add available files to uploaded files
    uploadedFiles = [...available_files];
    
    //reconstruct tier data
    tierlist.tiers.forEach((tier, index) => {
        const tierFiles = [];
        
        //support both new 'files' format and legacy 'images' format
        const mediaItems = tier.files || tier.images || [];
        mediaItems.forEach(fileData => {
            const availableFile = available_files.find(f => f.filename === fileData.filename);
            if (availableFile) {
                tierFiles.push(availableFile);
            }
        });
        
        tierData.push({
            id: `tier-${index}`,
            label: tier.label || DEFAULT_TIER_LABELS[index] || `T${index + 1}`,
            files: tierFiles
        });
    });
    
    //update UI
    const tierCount = tierData.length;
    document.getElementById('tier-slider').value = tierCount;
    document.getElementById('tier-count-display').textContent = tierCount;
    
    displayUploadedFiles();
    renderTiers();
    
    const successMsg = missing_files.length > 0 
        ? `Tier list imported with ${missing_files.length} missing file(s)`
        : 'Tier list imported successfully!';
    showNotification(successMsg, 'success');
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







































































