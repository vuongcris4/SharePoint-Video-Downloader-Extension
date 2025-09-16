/**
 * Hàm mới để làm sạch URL, cắt bỏ các tham số không cần thiết.
 * Nó sẽ tìm chuỗi 'format=dash' và cắt bỏ mọi thứ đằng sau nó.
 * @param {string} url - URL gốc từ content.js
 * @returns {string} - URL đã được làm sạch
 */
function processManifestUrl(url) {
  if (!url) return null;
  const cutoffPoint = 'format=dash';
  const indexPos = url.indexOf(cutoffPoint);

  if (indexPos !== -1) {
    return url.substring(0, indexPos + cutoffPoint.length);
  }

  // Trả về URL gốc nếu không tìm thấy điểm cắt (dự phòng)
  return url;
}

// Lắng nghe sự kiện khi popup được tải xong
document.addEventListener('DOMContentLoaded', function() {
  const statusDiv = document.getElementById('status-message');

  // 1. Bắt đầu nhận diện video ngay lập tức
  statusDiv.textContent = 'Đang nhận diện video...';

  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs || tabs.length === 0) {
      statusDiv.textContent = 'Lỗi: Không tìm thấy tab hoạt động.';
      return;
    }
    const activeTab = tabs[0];

    // Gửi yêu cầu nhận diện đến content.js
    chrome.tabs.sendMessage(activeTab.id, { action: "detectVideo" }, function(response) {
      // 2. Xử lý kết quả nhận được
      if (response && response.videoManifestUrl) {
        
        // =======================================================
        // ====> SỬA LỖI NẰM Ở ĐÂY <====
        // Làm sạch URL trước khi sử dụng
        const videoUrl = processManifestUrl(response.videoManifestUrl);
        // =======================================================

        if (!videoUrl) {
          statusDiv.textContent = '❌ Lỗi: URL video không hợp lệ.';
          return;
        }

        const pageTitle = activeTab.title || 'audio';

        // Lấy cài đặt đã lưu
        chrome.storage.local.get(['ffmpegPath', 'downloadFolder'], function(result) {
          
          // 3. Tạo lệnh FFmpeg để tải file MP3
          let baseFilename = pageTitle.replace(/\.mp4|\.webm|\.mkv$/i, '').trim();
          const mp3Filename = `${baseFilename}.mp3`;
          const ffmpegPath = result.ffmpegPath || 'ffmpeg';
          const downloadFolder = result.downloadFolder || '.';
          const outputPath = downloadFolder ? `${downloadFolder}/${mp3Filename}` : mp3Filename;
          const command = `${ffmpegPath} -i "${videoUrl}" -vn -q:a 0 "${outputPath}"`;

          // 4. Tự động copy lệnh vào clipboard
          navigator.clipboard.writeText(command).then(() => {
            statusDiv.textContent = '✅ Đã copy lệnh tải MP3!';
            setTimeout(() => window.close(), 2500);
          }).catch(err => {
            statusDiv.textContent = '❌ Lỗi khi copy lệnh.';
            console.error('Lỗi copy:', err);
          });
        });
      } else {
        // Nếu không tìm thấy video
        statusDiv.textContent = '❌ Không tìm thấy video trên trang này.';
      }
    });
  });
});