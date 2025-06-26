// tier list application state
let tierData = [];
let uploadedFiles = [];
let draggedElement = null;
let lofiPlaying = false;
let lofiAudio = null;
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
            uploadedFiles = [...uploadedFiles, ...data.files];
            displayUploadedFiles();
            showNotification(`Successfully uploaded ${data.files.length} file(s)!`, 'success');
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
                 class="w-full h-20 object-cover rounded border-2 border-base-300 group-hover:border-primary">
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded transition-all"></div>
            <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="removeFile('${file.filename}')" 
                        class="btn btn-xs btn-circle btn-error">✕</button>
            </div>
        `;
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
                <div class="tier-container flex-1 min-h-[100px] border-2 border-dashed border-base-300 rounded-lg p-4 flex flex-wrap gap-2"
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
            </div>
        `;
    } else {
        return `
            <div class="tier-item relative group cursor-move" 
                 draggable="true" 
                 data-file-id="${file.filename}"
                 onmousedown="handleFileDragStart(event)"
                 onmouseup="handleFileDragEnd(event)">
                <img src="${file.url}" alt="${file.original_name}" 
                     class="w-16 h-16 object-cover rounded border border-base-300">
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

//lofi music functionality
function setupLofiMusic() {
    const lofiBtn = document.getElementById('lofi-btn');
    const lofiIcon = document.getElementById('lofi-icon');
    lofiAudio = document.getElementById('lofi-audio');
    
    if (!lofiAudio) {
        console.warn('Lofi audio element not found');
        return;
    }
    
    lofiBtn.addEventListener('click', toggleLofiMusic);
    
    //handle audio errors with fallback
    lofiAudio.addEventListener('error', (e) => {
        console.warn('Audio source failed:', e);
        handleAudioFallback();
    });
    
    //handle successful load
    lofiAudio.addEventListener('canplay', () => {
        console.log('Audio ready to play');
    });
    
    //handle loading errors
    lofiAudio.addEventListener('loadstart', () => {
        console.log('Loading audio...');
    });
    
    //handle network errors
    lofiAudio.addEventListener('stalled', () => {
        console.warn('Audio loading stalled');
        handleAudioFallback();
    });
}

function toggleLofiMusic() {
    if (lofiPlaying) {
        pauseLofiMusic();
    } else {
        //user interaction required for autoplay policy
        playLofiMusicWithUserGesture();
    }
}

function playLofiMusicWithUserGesture() {
    const lofiIcon = document.getElementById('lofi-icon');
    const lofiBtn = document.getElementById('lofi-btn');
    
    //create or use Web Audio API as primary method
    if (!window.lofiAudioContext) {
        createLofiAudioContext();
        return;
    }
    
    //try to play regular audio with proper user gesture
    if (lofiAudio && lofiAudio.readyState >= 2) {
        const playPromise = lofiAudio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                lofiPlaying = true;
                lofiIcon.textContent = '🎵';
                lofiBtn.classList.add('btn-active');
                lofiBtn.title = 'Pause Lofi Music';
                showNotification('Lofi music started 🎵', 'success');
            }).catch(error => {
                console.error('Audio play failed:', error);
                //fallback to Web Audio API
                createLofiAudioContext();
            });
        }
    } else {
        //audio not ready, use Web Audio API
        createLofiAudioContext();
    }
}

function createLofiAudioContext() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        //create a proper lofi ambient soundscape
        const masterGain = audioContext.createGain();
        masterGain.gain.setValueAtTime(0.2, audioContext.currentTime);
        masterGain.connect(audioContext.destination);
        
        //create low-pass filter for warmth
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, audioContext.currentTime);
        filter.Q.setValueAtTime(1, audioContext.currentTime);
        filter.connect(masterGain);
        
        //create reverb for ambient space
        const convolver = audioContext.createConvolver();
        const impulseBuffer = createReverbImpulse(audioContext, 2, 0.3);
        convolver.buffer = impulseBuffer;
        filter.connect(convolver);
        convolver.connect(masterGain);
        
        //chord progression for lofi (Am - F - C - G)
        const chordProgression = [
            [220.00, 261.63, 329.63], //Am
            [174.61, 220.00, 261.63], //F
            [261.63, 329.63, 392.00], //C
            [196.00, 246.94, 293.66]  //G
        ];
        
        let currentChord = 0;
        const oscillators = [];
        const gainNodes = [];
        
        function playChord(chordIndex) {
            //stop previous chord
            oscillators.forEach(osc => {
                try { osc.stop(); } catch(e) {}
            });
            oscillators.length = 0;
            gainNodes.length = 0;
            
            const chord = chordProgression[chordIndex];
            
            chord.forEach((freq, i) => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                
                //vary waveforms for texture
                osc.type = i === 0 ? 'sawtooth' : (i === 1 ? 'triangle' : 'sine');
                osc.frequency.setValueAtTime(freq, audioContext.currentTime);
                
                //different volumes for each note
                const volumes = [0.15, 0.1, 0.12];
                gain.gain.setValueAtTime(volumes[i], audioContext.currentTime);
                
                //add subtle detuning for warmth
                const detune = (Math.random() - 0.5) * 10;
                osc.detune.setValueAtTime(detune, audioContext.currentTime);
                
                osc.connect(gain);
                gain.connect(filter);
                
                //fade in the note
                gain.gain.setValueAtTime(0, audioContext.currentTime);
                gain.gain.linearRampToValueAtTime(volumes[i], audioContext.currentTime + 0.5);
                
                osc.start();
                
                oscillators.push(osc);
                gainNodes.push(gain);
            });
        }
        
        //add subtle background texture
        const noiseGain = audioContext.createGain();
        noiseGain.gain.setValueAtTime(0.03, audioContext.currentTime);
        noiseGain.connect(filter);
        
        const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.1;
        }
        
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;
        noiseSource.connect(noiseGain);
        noiseSource.start();
        
        //start with first chord
        playChord(0);
        
        //change chords every 8 seconds for ambient progression
        const chordInterval = setInterval(() => {
            if (!window.lofiAudioContext) {
                clearInterval(chordInterval);
                return;
            }
            currentChord = (currentChord + 1) % chordProgression.length;
            playChord(currentChord);
        }, 8000);
        
        //add subtle LFO for movement
        const lfo = audioContext.createOscillator();
        const lfoGain = audioContext.createGain();
        lfo.frequency.setValueAtTime(0.1, audioContext.currentTime);
        lfo.type = 'sine';
        lfoGain.gain.setValueAtTime(0.02, audioContext.currentTime);
        
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
        
        //update UI
        lofiPlaying = true;
        const lofiIcon = document.getElementById('lofi-icon');
        const lofiBtn = document.getElementById('lofi-btn');
        lofiIcon.textContent = '🎵';
        lofiBtn.classList.add('btn-active');
        lofiBtn.title = 'Pause Lofi Music';
        
        showNotification('Ambient lofi music started 🎵', 'success');
        
        //store for cleanup
        window.lofiAudioContext = audioContext;
        window.lofiOscillators = [...oscillators, lfo, noiseSource];
        window.lofiChordInterval = chordInterval;
        
    } catch (error) {
        console.error('Failed to create audio context:', error);
        handleAudioFallback();
    }
}

//helper function to create reverb impulse
function createReverbImpulse(audioContext, duration, decay) {
    const impulse = audioContext.createBuffer(2, audioContext.sampleRate * duration, audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < channelData.length; i++) {
            const n = channelData.length - i;
            channelData[i] = (Math.random() * 2 - 1) * Math.pow(n / channelData.length, decay);
        }
    }
    
    return impulse;
}

function handleAudioFallback() {
    //provide user with options as before, but with better messaging
    const message = `Audio playback blocked by browser security.\n\nThis is normal - browsers block audio to prevent spam.\n\nChoose an option:\n\n1. YouTube Lofi Playlist (Recommended)\n2. Spotify Lo-Fi Beats\n3. Continue without music\n\nEnter number (1-3):`;
    
    const choice = prompt(message, '1');
    
    if (choice === '1') {
        window.open('https://www.youtube.com/watch?v=jfKfPfyJRdk&list=PLOHoVaTp8R7dWOScs4a6IoYN9yiEV6WpW', '_blank', 'noopener,noreferrer');
        showNotification('Opened YouTube lofi playlist - enjoy! 🎵', 'success');
    } else if (choice === '2') {
        window.open('https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn', '_blank', 'noopener,noreferrer');
        showNotification('Opened Spotify lofi playlist - enjoy! 🎵', 'success');
    } else {
        showNotification('Continuing without background music', 'info');
    }
    
    resetLofiButton();
}

function pauseLofiMusic() {
    const lofiIcon = document.getElementById('lofi-icon');
    const lofiBtn = document.getElementById('lofi-btn');
    
    //pause regular audio if available
    if (lofiAudio && !lofiAudio.paused) {
        lofiAudio.pause();
    }
    
    //stop oscillators and intervals if active
    if (window.lofiOscillators) {
        try {
            window.lofiOscillators.forEach(oscillator => {
                try { oscillator.stop(); } catch(e) {}
            });
        } catch (error) {
            console.warn('Error stopping oscillators:', error);
        }
    }
    
    //clear chord progression interval
    if (window.lofiChordInterval) {
        clearInterval(window.lofiChordInterval);
        window.lofiChordInterval = null;
    }
    
    //close audio context
    if (window.lofiAudioContext) {
        try {
            window.lofiAudioContext.close();
            window.lofiAudioContext = null;
            window.lofiOscillators = null;
        } catch (error) {
            console.warn('Error closing audio context:', error);
        }
    }
    
    lofiPlaying = false;
    lofiIcon.textContent = '⏸️';
    lofiBtn.classList.remove('btn-active');
    lofiBtn.title = 'Play Lofi Music';
    showNotification('Lofi music paused', 'info');
}

function resetLofiButton() {
    const lofiIcon = document.getElementById('lofi-icon');
    const lofiBtn = document.getElementById('lofi-btn');
    
    //cleanup any active audio
    if (window.lofiOscillators) {
        try {
            window.lofiOscillators.forEach(oscillator => {
                try { oscillator.stop(); } catch(e) {}
            });
        } catch (error) {
            console.warn('Error cleaning up oscillators:', error);
        }
    }
    
    //clear chord progression interval
    if (window.lofiChordInterval) {
        clearInterval(window.lofiChordInterval);
        window.lofiChordInterval = null;
    }
    
    //close audio context
    if (window.lofiAudioContext) {
        try {
            window.lofiAudioContext.close();
            window.lofiAudioContext = null;
            window.lofiOscillators = null;
        } catch (error) {
            console.warn('Error cleaning up audio context:', error);
        }
    }
    
    lofiPlaying = false;
    lofiIcon.textContent = '🎵';
    lofiBtn.classList.remove('btn-active');
    lofiBtn.title = 'Toggle Lofi Music';
}

function playLofiMusic() {
    //use the new method with user gesture handling
    playLofiMusicWithUserGesture();
}

//print functionality
function setupPrintButton() {
    //ensure print button exists
    const printBtn = document.getElementById('print-btn');
    if (!printBtn) {
        console.warn('Print button not found');
        return;
    }
}

function printTierList() {
    //pause lofi music if playing
    if (lofiPlaying) {
        pauseLofiMusic();
    }
    
    //check if there are tiers to print
    if (tierData.length === 0) {
        showNotification('No tiers to print. Create some tiers first!', 'warning');
        return;
    }
    
    //check if any tiers have content
    const hasContent = tierData.some(tier => tier.files.length > 0);
    if (!hasContent) {
        const proceed = confirm('Your tier list appears to be empty. Print anyway?');
        if (!proceed) return;
    }
    
    showNotification('Preparing tier list for printing...', 'info');
    
    //brief delay to show notification then print
    setTimeout(() => {
        window.print();
    }, 500);
}














































































































