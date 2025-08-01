// DOM elements
const uploadForm = document.getElementById('uploadForm');
const folderNameInput = document.getElementById('folderName');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const uploadBtn = document.getElementById('uploadBtn');
const btnText = document.getElementById('btnText');
const loading = document.getElementById('loading');
const status = document.getElementById('status');

// Google Apps Script configuration
const APPS_SCRIPT_CONFIG = {
    // Replace with your Google Apps Script web app URL after deployment
    WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzr28dWXcveUhVmmnKHaAd_fo8U3X_wBmglrbfya1vos7CpDy82wGWiWOxCcJ5LuMJ7/exec',
    
    // The target folder ID (set in the Apps Script)
    FOLDER_ID: '1cE0AOs1enh6f8vXYoNp2nB7kIrov3HOC'
};

// File input change handler
fileInput.addEventListener('change', function(e) {
    const files = e.target.files;
    displayFilePreview(files);
});

// Form submission handler
uploadForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const folderName = folderNameInput.value.trim();
    const files = fileInput.files;
    
    if (!folderName) {
        showStatus('❗ Lütfen bir klasör adı girin', 'error');
        return;
    }
    
    if (files.length === 0) {
        showStatus('📷 Lütfen en az bir fotoğraf/video seçin', 'warning');
        return;
    }
    
    uploadFiles(folderName, files);
});

// Display file preview
function displayFilePreview(files) {
    if (files.length === 0) {
        filePreview.classList.remove('show');
        return;
    }
    
    filePreview.innerHTML = '';
    filePreview.classList.add('show');
    
    Array.from(files).forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const fileIcon = document.createElement('div');
        fileIcon.className = 'file-icon';
        fileIcon.textContent = getFileIcon(file.type);
        
        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        
        const fileSize = document.createElement('div');
        fileSize.className = 'file-size';
        fileSize.textContent = formatFileSize(file.size);
        
        fileItem.appendChild(fileIcon);
        fileItem.appendChild(fileName);
        fileItem.appendChild(fileSize);
        filePreview.appendChild(fileItem);
    });
}

// Get file icon based on type
function getFileIcon(fileType) {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    return '📁';
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Upload files function - Google Apps Script integration with batch processing
async function uploadFiles(folderName, files) {
    setLoading(true);
    clearStatus(); // Clear any previous status messages
    showStatus('🎁 Anılarınız hazırlanıyor...', 'warning');
    
    try {
        // Check if Apps Script URL is configured
        if (APPS_SCRIPT_CONFIG.WEB_APP_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
            throw new Error('Please configure your Google Apps Script web app URL in script.js');
        }
        
        // Configuration for batch processing
        const BATCH_SIZE = 5; // Process 5 files at a time to avoid limits
        const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB limit per file
        
        // Check file sizes
        const oversizedFiles = Array.from(files).filter(file => file.size > MAX_FILE_SIZE);
        if (oversizedFiles.length > 0) {
            throw new Error(`Bazı dosyalar çok büyük (25MB üzeri): ${oversizedFiles.map(f => f.name).join(', ')}`);
        }
        
        showStatus(`📤 ${files.length} dosya "${folderName}" klasörüne yükleniyor...\n\nBu işlem biraz vakit alabilir lütfen bekleyiniz ⏳`, 'warning');
        
        // Split files into batches
        const batches = [];
        for (let i = 0; i < files.length; i += BATCH_SIZE) {
            batches.push(Array.from(files).slice(i, i + BATCH_SIZE));
        }
        
        let totalUploaded = 0;
        const failedFiles = [];
        
        // Process each batch
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            const batchNumber = batchIndex + 1;
            
            showStatus(`📤 Grup ${batchNumber}/${batches.length} yükleniyor... (${batch.length} dosya)\n\nBu işlem biraz vakit alabilir lütfen bekleyiniz ⏳`, 'warning');
            
            try {
                const batchResult = await uploadBatch(folderName, batch, batchIndex);
                totalUploaded += batchResult.uploadedCount;
                
                if (batchResult.failedFiles.length > 0) {
                    failedFiles.push(...batchResult.failedFiles);
                }
                
                // Show progress
                showStatus(`✅ Grup ${batchNumber}/${batches.length} tamamlandı. Toplam: ${totalUploaded}/${files.length} dosya`, 'warning');
                
                // Small delay between batches to avoid overwhelming the server
                if (batchIndex < batches.length - 1) {
                    await delay(1000);
                }
                
            } catch (batchError) {
                // If a batch fails, add all its files to failed list
                failedFiles.push(...batch.map(file => file.name));
                showStatus(`❌ Grup ${batchNumber} başarısız. Diğer gruplar devam ediyor...`, 'warning');
                await delay(2000);
            }
        }
        
        // Show final result
        if (totalUploaded > 0) {
            let resultMessage = `Bu mutlu günümüzde bizi yalnız bırakmadığınız için teşekkür ederiz. Seviliyorsunuz.\n\n-Gizem & Ege\n\n✨ ${totalUploaded} dosya "${folderName}" klasörüne başarıyla yüklendi.`;
            
            if (failedFiles.length > 0) {
                resultMessage += `\n\n⚠️ ${failedFiles.length} dosya yüklenemedi. Lütfen tekrar deneyin.`;
            }
            
            showStatus(resultMessage, totalUploaded === files.length ? 'success' : 'warning');
        } else {
            throw new Error('Hiçbir dosya yüklenemedi');
        }
        
        // Reset form after a delay
        setTimeout(() => {
            resetForm();
            clearStatus();
        }, 12000); // Keep message visible for 12 seconds for longer messages
        
    } catch (error) {
        if (error.message.includes('configure your Google Apps Script')) {
            showStatus('❌ Lütfen Google Apps Script URL\'ini yapılandırın', 'error');
        } else if (error.message.includes('Failed to fetch')) {
            showStatus('❌ Bağlantı hatası. Lütfen tekrar deneyin.', 'error');
        } else if (error.message.includes('çok büyük')) {
            showStatus(`❌ ${error.message}`, 'error');
        } else {
            showStatus('❌ Yükleme başarısız. Lütfen tekrar deneyin.', 'error');
        }
    } finally {
        setLoading(false);
    }
}

// Upload a single batch of files
async function uploadBatch(folderName, files, batchIndex) {
    const formData = new FormData();
    formData.append('folderName', folderName);
    formData.append('batchIndex', batchIndex.toString());
    
    // Convert files to base64 and add to FormData
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Convert file to base64
        const base64Data = await convertFileToBase64(file);
        
        // Add file data as separate form fields
        formData.append(`fileName_${i}`, file.name);
        formData.append(`fileData_${i}`, base64Data);
        formData.append(`fileMimeType_${i}`, file.type);
        formData.append(`fileSize_${i}`, file.size.toString());
    }
    
    formData.append('fileCount', files.length.toString());
    
    // Send batch to Google Apps Script
    const response = await fetch(APPS_SCRIPT_CONFIG.WEB_APP_URL, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.error || 'Batch upload failed');
    }
    
    return {
        uploadedCount: result.uploadedFiles ? result.uploadedFiles.length : files.length,
        failedFiles: [] // We could get this from the server response if needed
    };
}

// Helper functions
// Convert file to base64 for Google Apps Script compatibility
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove the data URL prefix (data:image/jpeg;base64,)
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function setLoading(isLoading) {
    uploadBtn.disabled = isLoading;
    if (isLoading) {
        btnText.classList.add('hidden');
        loading.classList.remove('hidden');
    } else {
        btnText.classList.remove('hidden');
        loading.classList.add('hidden');
    }
}

function showStatus(message, type) {
    // Convert \n to <br> for proper line breaks
    const formattedMessage = message.replace(/\n/g, '<br>');
    status.innerHTML = formattedMessage;
    status.className = `status show ${type}`;
}

function resetForm() {
    uploadForm.reset();
    filePreview.classList.remove('show');
    // Don't clear status message here - let it show for success/error messages
}

function clearStatus() {
    status.classList.remove('show');
}

// Helper function for delays between batches
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



// Display setup instructions on page load
window.addEventListener('load', function() {
    setTimeout(() => {
        if (APPS_SCRIPT_CONFIG.WEB_APP_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
            showStatus('Setup Required: Please deploy your Google Apps Script and add the web app URL to script.js', 'warning');
        } else {
            showStatus('🎉 Hoş geldiniz! Anılarınızı bizimle paylaşın.\n\nKlasör adı girin ve fotoğraflarınızı seçin. Giriş yapmanıza gerek yok!', 'success');
        }
    }, 1000);
});