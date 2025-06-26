// tier list application state
let tierData = [];
let uploadedFiles = [];
let draggedElement = null;

// voice function state
let isVoiceControlActive = false;
let recognition = null;
let voiceControlButton = null;
let isProcessingVoiceCommand = false;
let currentBrowser = null;
let speechKittReady = false;

// Image recognition state
let imageRecognitionEnabled = true;
// browser detection -- for VF
function detectBrowser() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.indexOf('firefox') > -1) {
        return 'firefox';
    } else if (userAgent.indexOf('chrome') > -1) {
        return 'chrome';
    } else if (userAgent.indexOf('safari') > -1) {
        return 'safari';
    } else if (userAgent.indexOf('edge') > -1) {
        return 'edge';
    }
    return 'other';
}
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
    setupVoiceControl();
    setupLofiMusic();
    setupPrintButton();
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
            
            // show uploaded files immediately
            displayUploadedFiles();
            
            console.log(`[DEBUG] Image recognition enabled: ${imageRecognitionEnabled}`);
            console.log(`[DEBUG] Uploaded files:`, data.files);
            
            // call image recogition
            if (imageRecognitionEnabled) {
                const imageFiles = data.files.filter(file => !file.is_audio);
                console.log(`[DEBUG] Image recognition enabled. Found ${imageFiles.length} image files to analyze:`, imageFiles.map(f => f.filename));
                console.log(`[DEBUG] All files with is_audio property:`, data.files.map(f => ({ filename: f.filename, is_audio: f.is_audio })));
                
                if (imageFiles.length > 0) {
                    showNotification(`Analyzing ${imageFiles.length} image(s)...`, 'info');
                    // rate limit
                    for (const file of imageFiles) {
                        try {
                            console.log(`[DEBUG] Analyzing file: ${file.filename}`);
                            const recognition = await analyzeImage(file.url, file.filename);
                            if (recognition) {
                                console.log(`[DEBUG] Setting recognition "${recognition}" for file: ${file.filename}`);
                                file.recognition = recognition;
                                const uploadedFile = uploadedFiles.find(f => f.filename === file.filename);
                                if (uploadedFile) {
                                    uploadedFile.recognition = recognition;
                                    console.log(`[DEBUG] Updated uploadedFile with recognition: ${uploadedFile.filename} -> ${uploadedFile.recognition}`);
                                }
                                displayUploadedFiles();
                                showNotification(`Recognized "${file.original_name}" as: ${recognition}`, 'success');
                            } else {
                                console.log(`[DEBUG] No recognition result for file: ${file.filename}`);
                                showNotification(`Could not analyze: ${file.original_name}`, 'warning');
                            }
                        } catch (error) {
                            console.error(`[DEBUG] Failed to analyze ${file.filename}:`, error);
                        }
                    }
                    
                    const analyzedCount = imageFiles.filter(f => f.recognition).length;
                    showNotification(`Successfully uploaded ${data.files.length} file(s)! Analyzed ${analyzedCount}/${imageFiles.length} images.`, 'success');
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
        // add overlay - dependent on toggle states
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
    const imageRecognitionBtn = document.getElementById('image-recognition-btn');
    const printBtn = document.getElementById('print-btn');
    slider.addEventListener('input', (e) => {
        const count = parseInt(e.target.value);
        countDisplay.textContent = count;
        updateTierCount(count);
    });
    
    saveBtn.addEventListener('click', saveTierList);
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', handleImportFile);
    printBtn.addEventListener('click', printTierList);

    if (imageRecognitionBtn) {
        imageRecognitionBtn.addEventListener('click', toggleImageRecognition);
    }
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
// voice control
function setupVoiceControl() {
    currentBrowser = detectBrowser();
    console.log('Detected browser:', currentBrowser);
    
    // initialize SpeechKITT if available
    if (typeof SpeechKITT !== 'undefined') {
        SpeechKITT.annyang();
        SpeechKITT.setStylesheet('//cdnjs.cloudflare.com/ajax/libs/SpeechKITT/1.0.0/themes/flat.css');
        speechKittReady = true;
    }
    
    // firefox-specific setup
    if (currentBrowser === 'firefox') {
        setupFirefoxVoiceControl(); // asks the user to enable voice recogition in Firefox config
    }
    // Try Annyang.js first, then fall back to native Web Speech API
    else if (typeof annyang !== 'undefined') {
        setupAnnyangVoiceControl();
    } else if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        setupNativeVoiceControl();
    } else {
        console.warn('Speech recognition not supported in this browser');
        showFirefoxInstructions();
        return;
    }
}

function setupFirefoxVoiceControl() {
    console.log('Setting up Firefox-specific voice recognition');
    
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        setupNativeVoiceControlWithFirefoxTweaks();
    } else {
        setupFirefoxFallback();
    }
}

function setupNativeVoiceControlWithFirefoxTweaks() {
    console.log('Using native Web Speech API with Firefox optimizations');
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        setupFirefoxFallback();
        return;
    }
    recognition = new SpeechRecognition();
    
    recognition.continuous = false; 
    recognition.interimResults = true; 
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 5; 
    
    recognition.onstart = () => {
        console.log('Firefox voice recognition started');
        updateVoiceControlUI(true);
        showNotification('Firefox voice recognition active - speak clearly!', 'info');
    };
    recognition.onend = () => {
        console.log('Firefox voice recognition ended');
        if (isVoiceControlActive) {
            setTimeout(() => {
                if (isVoiceControlActive) {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.log('Firefox restart delayed');
                        setTimeout(() => {
                            if (isVoiceControlActive) recognition.start();
                        }, 1000);
                    }
                }
            }, 500);
        } else {
            updateVoiceControlUI(false);
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Firefox speech recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
            showNotification('Microphone access denied. Please enable microphone permissions in Firefox.', 'error');
            showFirefoxPermissionInstructions();
        } else {
            showNotification(`Firefox voice error: ${event.error}`, 'warning');
                setTimeout(() => {
                if (isVoiceControlActive) {
                    recognition.start();
                }
            }, 2000);
        }
    };
    recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            
            if (result.isFinal) {
                const transcript = result[0].transcript.toLowerCase().trim();
                const confidence = result[0].confidence;
                console.log(`Firefox final transcript: "${transcript}" (confidence: ${confidence})`);
                if (confidence > 0.5 || currentBrowser === 'firefox') { 
                    processVoiceCommand(transcript);
                }
            } else if (result[0].confidence > 0.8) {
                const interimTranscript = result[0].transcript.toLowerCase().trim();
                console.log(`Firefox interim: "${interimTranscript}"`);
                showNotification(`Hearing: "${interimTranscript}"`, 'info');
            }
        }
    };
}

function setupFirefoxFallback() {
    console.log('Setting up Firefox fallback options');
    
    // Text input instead of voice
    const fallbackContainer = document.createElement('div');
    fallbackContainer.id = 'firefox-voice-fallback';
    fallbackContainer.className = 'fixed bottom-4 right-4 z-50 bg-base-200 p-4 rounded-lg shadow-xl max-w-sm';
    fallbackContainer.innerHTML = `
        <div class="text-sm font-medium mb-2">🦊 Firefox Voice Input</div>
        <div class="flex gap-2">
            <input type="text" id="firefox-voice-input" placeholder="Type: Move item to S tier" 
                   class="input input-sm input-primary flex-1">
            <button onclick="processFirefoxTextCommand()" class="btn btn-sm btn-primary">▶</button>
        </div>
        <div class="text-xs text-base-content/70 mt-1">
            Type voice commands or <a href="#" onclick="showFirefoxInstructions()" class="link">enable speech</a>
        </div>
    `;
    
    document.body.appendChild(fallbackContainer);
    
    const input = document.getElementById('firefox-voice-input');
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            processFirefoxTextCommand();
        }
    });
    
    recognition = { firefoxFallback: true };
}

window.processFirefoxTextCommand = processFirefoxTextCommand;
window.showFirefoxInstructions = showFirefoxInstructions;
window.toggleImageRecognition = toggleImageRecognition;

function processFirefoxTextCommand() {
    const input = document.getElementById('firefox-voice-input');
    const command = input.value.trim();
    
    if (command) {
        console.log('Firefox text command:', command);
        processVoiceCommand(command);
        input.value = '';
    }
}

function showFirefoxInstructions() {
    const instructions = `
    🦊 Firefox Voice Recognition Setup:
    
    1. Type "about:config" in Firefox address bar
    2. Search for "media.webspeech.recognition"
    3. Set "media.webspeech.recognition.enable" to true
    4. Set "media.webspeech.recognition.force_enable" to true
    5. Restart Firefox
    6. Grant microphone permissions when prompted
    
    Alternative: Use the text input box for voice commands!
    `;
    showNotification(instructions, 'info');
    
    console.log('Firefox Setup Instructions:', instructions);
}

function showFirefoxPermissionInstructions() {
    const instructions = `
    🎤 Firefox Microphone Permissions:
    
    1. Click the microphone icon in the address bar
    2. Select "Allow" for microphone access
    3. Or go to Firefox Settings > Privacy & Security > Permissions
    4. Find "Microphone" and allow this site
    Then click the voice control button again!
    `;
    showNotification(instructions, 'warning');
}
function setupAnnyangVoiceControl() {
    console.log('Using Annyang.js for voice recognition');
    
    function updateAnnyangCommands() {
        const commands = {};
        const tierLabels = tierData.map(t => t.label.toLowerCase());
        const allFiles = [...uploadedFiles, ...tierData.flatMap(t => t.files)];
        
        allFiles.forEach(file => {
            if (file.recognition) {
                const recognition = file.recognition.toLowerCase();
                tierLabels.forEach(tier => {
                    commands[`move ${recognition} to ${tier} tier`] = () => processVoiceMove(recognition, tier);
                    commands[`put ${recognition} in ${tier} tier`] = () => processVoiceMove(recognition, tier);
                    commands[`${recognition} goes to ${tier} tier`] = () => processVoiceMove(recognition, tier);
                });
            }
        });
        
        // dynamic parsing for ease
        tierLabels.forEach(tier => {
            commands[`move * to ${tier} tier`] = (item) => processVoiceMove(item, tier);
            commands[`put * in ${tier} tier`] = (item) => processVoiceMove(item, tier);
            commands[`move * into ${tier} tier`] = (item) => processVoiceMove(item, tier);
            commands[`* goes to ${tier} tier`] = (item) => processVoiceMove(item, tier);
            commands[`* should go to ${tier} tier`] = (item) => processVoiceMove(item, tier);
        });
        
        // optimize api call
        commands['move * to * tier'] = (item, tier) => processVoiceMove(item, tier);
        commands['put * in * tier'] = (item, tier) => processVoiceMove(item, tier);
        commands['* goes to * tier'] = (item, tier) => processVoiceMove(item, tier);
        console.log('[DEBUG] Updated Annyang commands with recognition labels:', Object.keys(commands).filter(cmd => !cmd.includes('*')));
        annyang.removeCommands();
        annyang.addCommands(commands);
    }
    
    annyang.addCallback('start', () => {
        console.log('Annyang voice recognition started');
        updateVoiceControlUI(true);
        updateAnnyangCommands();
    });
    
    annyang.addCallback('end', () => {
        console.log('Annyang voice recognition ended');
        if (isVoiceControlActive) {
            setTimeout(() => {
                if (isVoiceControlActive) {
                    annyang.start();
                }
            }, 100);
        } else {
            updateVoiceControlUI(false);
        }
    });
    
    annyang.addCallback('error', (error) => {
        console.error('Annyang error:', error);
        showNotification(`Voice recognition error: ${error.error || 'Unknown error'}`, 'error');
    });
    annyang.addCallback('resultMatch', (userSaid, commandText, phrases) => {
        console.log('Voice command matched:', userSaid);
        showNotification(`Command recognized: "${userSaid}"`, 'info');
    });
    
    annyang.addCallback('resultNoMatch', (phrases) => {
        console.log('No command match for:', phrases);
        if (phrases && phrases.length > 0) {
            processVoiceCommand(phrases[0]);
        }
    });
    
    annyang.setLanguage('en-US');
    recognition = annyang; 
}
function setupNativeVoiceControl() {
    console.log('Using native Web Speech API');
    
    // check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Speech recognition not supported in this browser');
        return;
    }

    // initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3; 
    recognition.onstart = () => {
        console.log('Native voice recognition started');
        updateVoiceControlUI(true);
    };
    
    recognition.onend = () => {
        console.log('Native voice recognition ended');
        if (isVoiceControlActive) {
            setTimeout(() => {
                if (isVoiceControlActive) {
                    recognition.start();
                }
            }, 100);
        } else {
            updateVoiceControlUI(false);
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        showNotification(`Voice recognition error: ${event.error}`, 'error');
        
        if (event.error === 'network' || event.error === 'audio-capture') {
            setTimeout(() => {
                if (isVoiceControlActive) {
                    recognition.start();
                }
            }, 2000);
        }
    };
    
    recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        if (result.isFinal) {
            // try the most confident result first
            for (let i = 0; i < result.length; i++) {
                const transcript = result[i].transcript.toLowerCase().trim();
                const confidence = result[i].confidence;
                console.log(`Voice transcript ${i+1}: "${transcript}" (confidence: ${confidence})`);
                
                if (i === 0 || confidence > 0.7) { // use first result
                    processVoiceCommand(transcript);
                    break;
                }
            }
        }
    };
}
function processVoiceMove(item, tier) {
    // if Annyang matched --> perform action
    if (!isProcessingVoiceCommand) {
        isProcessingVoiceCommand = true;
        
        const allFiles = [...uploadedFiles, ...tierData.flatMap(t => t.files)];
        const file = findFileByName(allFiles, item);
        if (!file) {
            showNotification(`Could not find file: ${item}`, 'error');
            isProcessingVoiceCommand = false;
            return;
        }

        const targetTierIndex = tierData.findIndex(t => 
            t.label.toLowerCase() === tier.toLowerCase()
        );
        
        if (targetTierIndex === -1) {
            showNotification(`Could not find tier: ${tier}`, 'error');
            isProcessingVoiceCommand = false;
            return;
        }

        moveItemToTier(file.filename, targetTierIndex);
        
        const displayName = file.recognition ? `"${file.recognition}" (${file.original_name})` : `"${file.original_name}"`;
        showNotification(`Moved ${displayName} to ${tier.toUpperCase()} tier`, 'success');
        isProcessingVoiceCommand = false;
    }
}

function toggleVoiceControl() {
    if (!recognition) {
        showNotification('Voice recognition not supported in this browser', 'error');
        if (currentBrowser === 'firefox') {
            showFirefoxInstructions();
        }
        return;
    }

    isVoiceControlActive = !isVoiceControlActive;
    
    if (isVoiceControlActive) {
        try {
            if (recognition.firefoxFallback) {
                // Firefox text mode
                const fallback = document.getElementById('firefox-voice-fallback');
                if (fallback) {
                    fallback.style.display = 'block';
                    const input = document.getElementById('firefox-voice-input');
                    if (input) input.focus();
                }
                showNotification('🦊 Firefox text input mode activated!', 'success');
            } else if (typeof annyang !== 'undefined' && recognition === annyang) {
                annyang.start();
                if (speechKittReady) SpeechKITT.show();
                showNotification('Enhanced voice control activated! Try: "Move cat photo to S tier"', 'success');
            } else {
                recognition.start();
                showNotification(`${currentBrowser === 'firefox' ? '🦊 Firefox' : ''} Voice control activated! Say: "Move [item] to [tier] tier"`, 'success');
            }
        } catch (error) {
            console.error('Failed to start voice recognition:', error);
            isVoiceControlActive = false;
            
            if (currentBrowser === 'firefox') {
                showNotification('Firefox voice failed. Try enabling speech recognition in about:config', 'error');
                showFirefoxInstructions();
            } else {
                showNotification('Failed to start voice control', 'error');
            }
        }
    } else {
        try {
            if (recognition.firefoxFallback) {
                const fallback = document.getElementById('firefox-voice-fallback');
                if (fallback) fallback.style.display = 'none';
                showNotification('Firefox text input mode deactivated', 'info');
            } else if (typeof annyang !== 'undefined' && recognition === annyang) {
                annyang.abort();
                if (speechKittReady) SpeechKITT.hide();
            } else {
                recognition.stop();
            }
            showNotification('Voice control deactivated', 'info');
        } catch (error) {
            console.error('Failed to stop voice recognition:', error);
        }
    }
    
    updateVoiceControlUI(isVoiceControlActive);
}

function updateVoiceControlUI(isActive) {
    voiceControlButton = voiceControlButton || document.getElementById('voice-control-btn');
    if (voiceControlButton) {
        if (isActive) {
            voiceControlButton.classList.add('btn-success');
            voiceControlButton.classList.remove('btn-accent');
            
            let systemType = 'Standard';
            if (recognition && recognition.firefoxFallback) {
                systemType = '🦊 Text Input';
            } else if (typeof annyang !== 'undefined' && recognition === annyang) {
                systemType = 'Enhanced';
            } else if (currentBrowser === 'firefox') {
                systemType = '🦊 Firefox';
            }
            voiceControlButton.innerHTML = `🎤 ${systemType} Active`;
        } else {
            voiceControlButton.classList.remove('btn-success');
            voiceControlButton.classList.add('btn-accent');
            
            // Show available system type
            if (recognition && recognition.firefoxFallback) {
                systemType = '🦊 Text Input';
            } else if (typeof annyang !== 'undefined') {
                systemType = 'Enhanced Voice';
            } else if (currentBrowser === 'firefox') {
                systemType = '🦊 Firefox Voice';
            }
            voiceControlButton.innerHTML = `🎤 ${systemType}`;
        }
    }
}

async function processVoiceCommand(transcript) {
    if (isProcessingVoiceCommand) {
        console.log('Already processing a command, skipping...');
        return;
    }

    isProcessingVoiceCommand = true;
    showNotification('Processing voice command...', 'info');

    try {
        // use AI to parse the voice command --> triggers when Annyang isn't used
        const command = await parseVoiceCommandWithAI(transcript);
        
        if (command) {
            await executeVoiceCommand(command);
        } else {
            showNotification('Could not understand voice command', 'warning');
        }
    } catch (error) {
        console.error('Error processing voice command:', error);
        showNotification('Error processing voice command', 'error');
    } finally {
        isProcessingVoiceCommand = false;
    }
}

async function parseVoiceCommandWithAI(transcript) {
    const MAX_RETRIES = 2;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            // get current tier labels and uploaded files for context
            const tierLabels = tierData.map(t => t.label);
            const allFiles = [...uploadedFiles, ...tierData.flatMap(t => t.files)];
            
            // create a list of file identifiers prioritizing recognition labels
            const fileIdentifiers = allFiles.map(f => {
                if (f.recognition) {
                    return `"${f.recognition}" (AI-identified as ${f.recognition}, filename: ${f.original_name})`;
                } else {
                    return `"${f.original_name}" (filename: ${f.original_name})`;
                }
            });

            const prompt = `You are a voice command parser for a tier list application. Parse the following voice command and extract the action, item name, and target tier.

Available tier labels: ${tierLabels.join(', ')}
Available files and their identifiers: ${fileIdentifiers.join(', ')}

Voice command: "${transcript}"

IMPORTANT: Users can refer to files by their AI-identified labels (like "nature", "person", "food") OR by their original filenames. Always prefer the AI-identified labels when available.

Please respond with a JSON object in this exact format:
{
  "action": "move", 
  "itemName": "the identifier the user referred to (recognition label or filename)",
  "targetTier": "exact tier label from available tiers"
}

Only respond if the command is clearly asking to move an item to a tier. Common patterns:
- "Move [item] to [tier] tier"
- "Put [item] in [tier] tier" 
- "Let's move [item] into [tier] tier"
- "[item] should go to [tier] tier"
Examples:
- If user says "Move nature to S tier" and there's a file identified as "nature", use itemName: "nature"
- If user says "Move cat photo to A tier" and there's a file identified as "animal", use itemName: "animal"
- If user says "Move document.pdf to B tier", use itemName: "document.pdf"

For fuzzy matching:
- If the user says "cat", match files like "cat_photo.jpg" or "cute_cat.png"
- If the user says "song", match files like "my_song.mp3" or "favorite_song.wav"

If the command is not clear or doesn't match these patterns, respond with: {"action": "unknown"}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            // Hack Club AI API call
            const response = await fetch('https://ai.hackclub.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.1 
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`AI API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from AI API');
            }
            
            const aiResponse = data.choices[0].message.content.trim();
            // clean up response 
            const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
            
            // parse the JSON response
            const command = JSON.parse(cleanResponse);
            
            console.log(`AI parsed command (attempt ${attempt}):`, command);
            if (command.action === 'unknown') {
                return null;
            }
            
            // validate the response structure
            if (!command.action || !command.itemName || !command.targetTier) {
                throw new Error('Invalid command structure returned by AI');
            }
            
            return command;
            
        } catch (error) {
            console.error(`Error parsing voice command with AI (attempt ${attempt}):`, error);
            
            if (attempt === MAX_RETRIES) {
                return parseVoiceCommandSimple(transcript);
            }
            
            //  rate limit handling
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    return null;
}

function parseVoiceCommandSimple(transcript) {
    const tierLabels = tierData.map(t => t.label.toLowerCase());
    const allFiles = [...uploadedFiles, ...tierData.flatMap(t => t.files)];
    
    // try to find patterns like "move X to Y tier"
    const patterns = [
        /move (.+) to ([a-z]+) tier/i,
        /put (.+) in ([a-z]+) tier/i,
        /(.+) goes? to ([a-z]+) tier/i,
        /(.+) should go to ([a-z]+) tier/i
    ];
    
    for (const pattern of patterns) {
        const match = transcript.match(pattern);
        if (match) {
            const itemName = match[1].trim();
            const tierName = match[2].trim().toLowerCase();
            
            // check if tier exists
            if (tierLabels.includes(tierName)) {
                // try to find the file
                const file = findFileByName(allFiles, itemName);
                if (file) {
                    return {
                        action: 'move',
                        itemName: itemName, // use the search term
                        targetTier: tierName.toUpperCase()
                    };
                }
            }
        }
    }
    return null;
}

async function executeVoiceCommand(command) {
    const { action, itemName, targetTier } = command;
    
    if (action !== 'move') {
        showNotification('Only move commands are supported', 'warning');
        return;
    }

    const allFiles = [...uploadedFiles, ...tierData.flatMap(t => t.files)];
    const file = findFileByName(allFiles, itemName);
    if (!file) {
        showNotification(`Could not find file: ${itemName}`, 'error');
        return;
    }

    // find the target tier
    const targetTierIndex = tierData.findIndex(tier => 
        tier.label.toLowerCase() === targetTier.toLowerCase()
    );
    
    if (targetTierIndex === -1) {
        showNotification(`Could not find tier: ${targetTier}`, 'error');
        return;
    }

    // execute the move
    moveItemToTier(file.filename, targetTierIndex);
    
    // show success message with recognition label if available
    const displayName = file.recognition ? `"${file.recognition}" (${file.original_name})` : `"${file.original_name}"`;
    showNotification(`Moved ${displayName} to ${targetTier} tier`, 'success');
}

function findFileByName(files, searchName) {
    searchName = searchName.toLowerCase();
    
    // first priority: Try to match recognition labels 
    let match = files.find(f => f.recognition && f.recognition.toLowerCase() === searchName);
    if (match) {
        console.log(`[DEBUG] Found file by recognition label: "${match.recognition}" -> ${match.filename}`);
        return match;
    }
    
    // second priority: Try partial match with recognition labels
    match = files.find(f => f.recognition && f.recognition.toLowerCase().includes(searchName));
    if (match) {
        console.log(`[DEBUG] Found file by partial recognition match: "${match.recognition}" contains "${searchName}" -> ${match.filename}`);
        return match;
    }
    
    // third priority: Try exact match with original filename
    match = files.find(f => f.original_name.toLowerCase() === searchName);
    if (match) {
        console.log(`[DEBUG] Found file by exact filename: "${f.original_name}" -> ${match.filename}`);
        return match;
    }
    
    // fourth priority: Try partial match with original filename
    match = files.find(f => f.original_name.toLowerCase().includes(searchName));
    if (match) {
        console.log(`[DEBUG] Found file by partial filename: "${f.original_name}" contains "${searchName}" -> ${match.filename}`);
        return match;
    }
    // final fallback: Fuzzy matching with original filename
    match = files.find(f => {
        const fileName = f.original_name.toLowerCase();
        const words = searchName.split(' ');
        return words.every(word => fileName.includes(word));
    });
    
    if (match) {
        console.log(`[DEBUG] Found file by fuzzy filename match: "${match.original_name}" -> ${match.filename}`);
    } else {
        console.log(`[DEBUG] No file found for search: "${searchName}"`);
    }
    return match;
}

function moveItemToTier(fileId, targetTierIndex) {
    const file = findFileById(fileId);
    if (!file) return;
    
    removeFileFromCurrentLocation(fileId);
    
    tierData[targetTierIndex].files.push(file);
    
    displayUploadedFiles();
    renderTiers();
}

function handleVoiceInputKeypress(event) {
    if (event.key === 'Enter') {
        processTextCommand();
    }
}

function processTextCommand() {
    const input = document.getElementById('voice-command-input');
    const command = input.value.trim();
    
    if (command) {
        console.log('Text command entered:', command);
        showNotification('Processing text command...', 'info');
        processVoiceCommand(command);
        input.value = '';
    } else {
        showNotification('Please enter a command', 'warning');
        input.focus();
    }
}

// image Recognition Functions
async function analyzeImage(imageUrl, filename) {
    if (!imageRecognitionEnabled) {
        console.log(`[DEBUG] Image recognition disabled, skipping: ${filename}`);
        return null;
    }
    
    try {
        console.log(`[DEBUG] Starting AI analysis for: ${filename}`);
        console.log(`[DEBUG] Image URL: ${imageUrl}`);
        // try multiple approaches for image analysis
        let recognition = await tryHackClubAPI(imageUrl, filename);
        
        if (!recognition) {
            console.log(`[DEBUG] Hack Club API failed, trying filename-based fallback...`);
            recognition = getFilenameBasedLabel(filename);
        }
        return recognition;
        
    } catch (error) {
        console.error(`[DEBUG] Error analyzing image ${filename}:`, error);
        console.error(`[DEBUG] Full error details:`, {
            message: error.message,
            stack: error.stack,
            filename: filename,
            imageUrl: imageUrl
        });
        
        // fallback to filename-based recognition
        return getFilenameBasedLabel(filename);
    }
}

async function tryHackClubAPI(imageUrl, filename) {
    try {
        // convert image to base64 for AI API
        console.log(`[DEBUG] Converting image to base64...`);
        const base64Image = await imageToBase64(imageUrl);
        console.log(`[DEBUG] Base64 conversion complete, length: ${base64Image.length}`);
        const prompt = `Analyze this image and provide a single word that best describes what it shows. Examples:
- If it's a store/shop: "shop"
- If it's a street/road: "street" 
- If it's a person: "person"
- If it's food: "food"
- If it's an animal: "animal"
- If it's a vehicle: "vehicle"
- If it's text/document: "document"
- If it's art/drawing: "art"

Respond with only ONE word, no explanations or additional text.`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const formats = [
            {
                model: "gpt-4-vision-preview",
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: prompt
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: base64Image
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 100,
                temperature: 0.1
            },
            {
                model: "gpt-4-vision-preview",
                messages: [
                    {
                        role: 'user',
                        content: `${prompt}\n\nImage data: ${base64Image}`
                    }
                ],
                max_tokens: 100,
                temperature: 0.1
            },
            {
                messages: [
                    {
                        role: 'user',
                        content: `Analyze the filename "${filename}" and provide a single word that best describes what type of image it might be. Examples: shop, street, person, food, animal, building, nature, vehicle, document, art. Respond with only ONE word.`
                    }
                ],
                max_tokens: 100,
                temperature: 0.1
            }
        ];

        for (let i = 0; i < formats.length; i++) {
            console.log(`[DEBUG] Trying API format ${i + 1}...`);
            
            try {
                const response = await fetch('https://ai.hackclub.com/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formats[i]),
                    signal: controller.signal
                });

                console.log(`[DEBUG] AI API response status (format ${i + 1}): ${response.status}`);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.choices && data.choices[0] && data.choices[0].message) {
                        const recognition = data.choices[0].message.content.trim().toLowerCase();
                        console.log(`[DEBUG] Image recognition successful for ${filename}: "${recognition}" (using format ${i + 1})`);
                        clearTimeout(timeoutId);
                        return recognition;
                    } else {
                        console.log(`[DEBUG] Format ${i + 1} returned invalid response structure`);
                    }
                } else {
                    const errorText = await response.text().catch(() => 'Unknown error');
                    console.log(`[DEBUG] Format ${i + 1} failed with status ${response.status}: ${errorText.substring(0, 100)}`);
                    if (i < formats.length - 1) {
                        console.log(`[DEBUG] Trying next format...`);
                        continue;
                    }
                }
            } catch (formatError) {
                console.log(`[DEBUG] Format ${i + 1} threw error:`, formatError.message);
                if (i < formats.length - 1) {
                    console.log(`[DEBUG] Trying next format...`);
                    continue;
                }
            }
        }

        clearTimeout(timeoutId);

        console.log(`[DEBUG] All API formats failed for ${filename}`);
        return null;
        
    } catch (error) {
        console.error(`[DEBUG] tryHackClubAPI error for ${filename}:`, error);
        return null;
    }
}

function getFilenameBasedLabel(filename) {
    console.log(`[DEBUG] Using filename-based recognition for: ${filename}`);
    
    const name = filename.toLowerCase();
    // common word checking
    const patterns = {
        'shop': ['shop', 'store', 'market', 'mall', 'retail'],
        'street': ['street', 'road', 'avenue', 'path', 'sidewalk'],
        'person': ['person', 'people', 'human', 'man', 'woman', 'child'],
        'food': ['food', 'pizza', 'burger', 'cake', 'meal', 'restaurant'],
        'animal': ['cat', 'dog', 'bird', 'fish', 'pet', 'animal'],
        'building': ['building', 'house', 'home', 'office', 'tower'],
        'nature': ['tree', 'forest', 'mountain', 'beach', 'sky', 'nature'],
        'vehicle': ['car', 'truck', 'bike', 'vehicle', 'auto'],
        'document': ['document', 'text', 'paper', 'note'],
        'art': ['art', 'paint', 'draw', 'sketch', 'design']
    };
    
    for (const [label, keywords] of Object.entries(patterns)) {
        if (keywords.some(keyword => name.includes(keyword))) {
            console.log(`[DEBUG] Filename matched pattern "${label}" for: ${filename}`);
            return label;
        }
    }
    const defaultLabels = ['image', 'photo', 'picture', 'item'];
    const randomLabel = defaultLabels[Math.floor(Math.random() * defaultLabels.length)];
    console.log(`[DEBUG] No pattern match, using default label "${randomLabel}" for: ${filename}`);
    return randomLabel;
}

async function imageToBase64(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const maxSize = 512;
            let { width, height } = img;
            
            if (width > height) {
                if (width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            ctx.drawImage(img, 0, 0, width, height);
            
            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            resolve(base64);
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
    });
}

function addImageRecognitionOverlay(container, recognition) {
    if (!recognition) {
        console.log('[DEBUG] No recognition data provided to addImageRecognitionOverlay');
        return;
    }
    
    console.log(`[DEBUG] Adding recognition overlay: "${recognition}" to container:`, container);
    
    const existingOverlay = container.querySelector('.image-recognition-overlay');
    if (existingOverlay) {
        console.log('[DEBUG] Removing existing overlay');
        existingOverlay.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'image-recognition-overlay absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded-b z-10 pointer-events-none';
    overlay.textContent = `🔍 ${recognition}`;
    overlay.style.fontWeight = 'bold';
    overlay.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
    console.log(`[DEBUG] Created overlay element:`, overlay);
    
    container.appendChild(overlay);
    console.log(`[DEBUG] Overlay appended to container. Container children count:`, container.children.length);
}
function toggleImageRecognition() {
    imageRecognitionEnabled = !imageRecognitionEnabled;
    const button = document.getElementById('image-recognition-btn');
    
    if (imageRecognitionEnabled) {
        button.classList.remove('btn-outline');
        button.classList.add('btn-success');
        showNotification('Image recognition enabled', 'success');
        
        // re-analyze all existing -- already uploaded
        const allFiles = [...uploadedFiles, ...tierData.flatMap(tier => tier.files)];
        const imageFiles = allFiles.filter(file => !file.is_audio && !file.recognition);
        if (imageFiles.length > 0) {
            showNotification(`Analyzing ${imageFiles.length} existing image(s)...`, 'info');
            
            // process images sequentially
            (async () => {
                for (const file of imageFiles) {
                    try {
                        const recognition = await analyzeImage(file.url, file.filename);
                        if (recognition) {
                            file.recognition = recognition;
                            // update the same file in uploadedFiles if it exists there
                            const uploadedFile = uploadedFiles.find(f => f.filename === file.filename);
                            if (uploadedFile) {
                                uploadedFile.recognition = recognition;
                            }
                            
                            // update the same file in tiers if it exists there
                            tierData.forEach(tier => {
                                const tierFile = tier.files.find(f => f.filename === file.filename);
                                if (tierFile) {
                                    tierFile.recognition = recognition;
                                }
                            });
                            
                            // update displays in real-time
                            displayUploadedFiles();
                            renderTiers();
                        }
                    } catch (error) {
                        console.error(`Failed to analyze ${file.filename}:`, error);
                    }
                }
                showNotification('Existing images analyzed!', 'success');
            })();
        }
    } else {
        button.classList.remove('btn-success');
        button.classList.add('btn-outline');
        showNotification('Image recognition disabled', 'info');
        // remove recognition data from all files
        uploadedFiles.forEach(file => {
            delete file.recognition;
        });
        tierData.forEach(tier => {
            tier.files.forEach(file => {
                delete file.recognition;
            });
        });
        
        document.querySelectorAll('.image-recognition-overlay').forEach(overlay => {
            overlay.remove();
        });
        
        // refresh displays
        displayUploadedFiles();
        renderTiers();
    }
}

//lofi music functionality
function setupLofiMusic() {
    const lofiBtn = document.getElementById('lofi-btn');
    const lofiIcon = document.getElementById('lofi-icon');
    const lofiAudio = document.getElementById('lofi-audio');
    
    if (!lofiBtn || !lofiIcon || !lofiAudio) {
        console.error('Lofi music elements not found in DOM');
        return;
    }
    
    let isPlaying = false;
    lofiBtn.addEventListener('click', toggleLofiMusic);

    function toggleLofiMusic() {
        if (isPlaying) {
            lofiAudio.pause();
            lofiIcon.textContent = '🎵';
            lofiBtn.classList.remove('btn-accent');
            lofiBtn.classList.add('btn-ghost');
            isPlaying = false;
            showNotification('Lofi music paused', 'info');
        } else {
            //load audio if not already loaded
            if (lofiAudio.readyState === 0) {
                lofiAudio.load();
            }
            
            lofiAudio.play().then(() => {
                lofiIcon.textContent = '🎶';
                lofiBtn.classList.remove('btn-ghost');
                lofiBtn.classList.add('btn-accent');
                isPlaying = true;
                showNotification('Lofi music playing...', 'success');
            }).catch((error) => {
                console.error('Error playing lofi music:', error);
                showNotification('Could not play lofi music', 'error');
            });
        }
    }
    //handle audio events
    lofiAudio.addEventListener('ended', () => {
        //audio will loop automatically due to loop attribute
        console.log('Lofi audio looped');
    });

    lofiAudio.addEventListener('error', (e) => {
        console.error('Lofi audio error:', e);
        showNotification('Error loading lofi music', 'error');
        lofiIcon.textContent = '🎵';
        lofiBtn.classList.remove('btn-accent');
        lofiBtn.classList.add('btn-ghost');
        isPlaying = false;
    });
}

//print functionality
function setupPrintButton() {
    const printBtn = document.getElementById('print-btn');
    if (!printBtn) {
        console.error('Print button not found in DOM');
        return;
    }
    printBtn.addEventListener('click', printTierList);
}
function printTierList() {
    //create print-friendly version
    const printWindow = window.open('', '_blank');
    
    const printContent = generatePrintableHTML();
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    //wait for images to load then print
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };
    
    showNotification('Opening print dialog...', 'info');
}

function generatePrintableHTML() {
    const timestamp = new Date().toLocaleString();
    
    let tierHTML = '';
    tierData.forEach(tier => {
        tierHTML += `
            <div style="page-break-inside: avoid; margin-bottom: 20px; border: 2px solid #333; border-radius: 8px;">
                <div style="display: flex; align-items: center; min-height: 80px;">
                    <div style="background: #333; color: white; padding: 20px; font-size: 24px; font-weight: bold; min-width: 80px; text-align: center;">
                        ${tier.label}
                    </div>
                    <div style="flex: 1; padding: 10px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
                        ${tier.files.map(file => {
                            if (file.is_audio) {
                                return `
                                    <div style="width: 60px; height: 60px; border: 1px solid #ccc; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 12px; text-align: center;">
                                        <div style="font-size: 20px;">🎵</div>
                                        <div style="font-size: 8px; overflow: hidden; text-overflow: ellipsis;">${file.original_name.substring(0, 10)}</div>
                                    </div>
                                `;
                            } else {
                                return `<img src="${file.url}" style="height: 60px; width: auto; object-fit: contain; border: 1px solid #ccc;">`;
                            }
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Tier List - ${timestamp}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 20px; 
                    color: #333;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 30px; 
                    border-bottom: 2px solid #333; 
                    padding-bottom: 20px;
                }
                .header h1 { 
                    margin: 0; 
                    font-size: 28px; 
                }
                .header .timestamp { 
                    margin: 10px 0 0 0; 
                    color: #666; 
                    font-size: 14px; 
                }
                @media print {
                    body { margin: 0; }
                    .header { page-break-after: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🏆 Tier List</h1>
                <p class="timestamp">Generated on ${timestamp}</p>
            </div>
            ${tierHTML}
        </body>
                 </html>
     `;
}





















































































