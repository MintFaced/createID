// ID Generator Module
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const form = document.getElementById('passport-form');
  const canvas = document.getElementById('passport-canvas');
  const ctx = canvas.getContext('2d');
  const submitBtn = form.querySelector('button[type="submit"]');
  const avatarInput = document.getElementById('avatar');
  const avatarLabel = avatarInput.closest('.form-group');
  
  // Background image setup
  const BG_SRC = 'assets/id-please-bg-large.jpg'; // Background image from assets
  const bgImg = new Image();
  bgImg.src = BG_SRC;

  // ePassport logo setup
  const EPASSPORT_SRC = 'assets/epassport-logo.png';
  const epassportImg = new Image();
  epassportImg.src = EPASSPORT_SRC;

  // Layout constants
  const avatarX = 40;
  const avatarY = 160;
  const avatarSize = 256;
  
  // Date helpers
  const pad = n => n.toString().padStart(2, '0');
  const today = new Date();
  const expiryDate = new Date();
  expiryDate.setFullYear(today.getFullYear() + 10);
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  
  // Function to toggle form fields
  function toggleFormFields(enabled) {
    const fields = [
      'firstname',
      'linenumba',
      'tokenid',
      'reputation',
      'mintdate',
      'authority',
      'expirydate',
      'passnum',
      'avatar'
    ];
    
    fields.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.disabled = !enabled;
      }
    });
  }

  // Set default values in form and disable fields
  document.getElementById('mintdate').value = today.toISOString().split('T')[0];
  document.getElementById('expirydate').value = expiryDate.toISOString().split('T')[0];
  toggleFormFields(false);

  // Enable fields when ser-name is entered and blurred
  const sernameInput = document.getElementById('sername');
  sernameInput.addEventListener('blur', () => {
    if (sernameInput.value.trim()) {
      toggleFormFields(true);
    } else {
      toggleFormFields(false);
    }
  });
  document.getElementById('surname').value = 'DOE';
  document.getElementById('firstname').value = 'JOHN';
  document.getElementById('nationality').value = 'DIGITAL NOMAD';
  document.getElementById('tokenid').value = '6529-XXXX-XXXX';
  document.getElementById('reputation').value = 'GM';
  document.getElementById('authority').value = '6529';
  
  // Handle file input changes
  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileName = file.name.length > 20 
        ? file.name.substring(0, 17) + '...' 
        : file.name;
      
      const fileInfo = document.createElement('div');
      fileInfo.className = 'file-name';
      fileInfo.textContent = fileName;
      
      // Remove existing file info if any
      const existingInfo = avatarLabel.querySelector('.file-name');
      if (existingInfo) {
        existingInfo.remove();
      }
      
      avatarLabel.classList.add('has-file');
      avatarLabel.appendChild(fileInfo);
    }
  });
  
  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const today = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(today.getFullYear() + 10);
    
    const data = {
      firstname: formData.get('firstname') || 'JOHN',
      surname: formData.get('surname') || 'DOE',
      nationality: formData.get('nationality') || 'DIGITAL NOMAD',
      tokenid: formData.get('tokenid') || '6529-XXXX-XXXX',
      reputation: formData.get('reputation') || 'GM',
      authority: formData.get('authority') || '6529',
      mintdate: formData.get('mintdate') || today.toISOString().split('T')[0],
      expirydate: formData.get('expirydate') || expiryDate.toISOString().split('T')[0],
      passnum: formData.get('passnum') || '6529' + Math.floor(100000 + Math.random() * 900000).toString(),
      avatar: formData.get('avatar')
    };
    
    try {
      await renderPassport(data);
      
      // Auto-scroll to the canvas
      document.getElementById('passport-canvas').scrollIntoView({ behavior: 'smooth' });
      
      // Add generated class for visual feedback
      canvas.classList.add('generated');
      
      // No auto-download
      
    } catch (error) {
      console.error('Error generating passport:', error);
      alert('An error occurred while generating the passport. Please try again.');
    } finally {
      // Reset loading state
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  });
  
  // Download helper
  function downloadPNG(dataURL) {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `6529-passport-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // Main rendering function
  async function renderPassport(d) {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    await drawBackground();
    drawHeader(d);
    await drawTextBlock(d);
    drawMRZ(d);
    ctx.restore();
  }
  
  // Drawing functions
  async function drawBackground() {
    if (!bgImg.complete) {
      await new Promise((resolve) => {
        bgImg.onload = resolve;
      });
    }
    // Draw white background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the background image with 25% opacity
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  
  function drawHeader(d) {
    // 6529 NATION (centered at top)
    ctx.fillStyle = '#000';
    ctx.font = '32px "OCR B"';
    ctx.textAlign = 'center';
    ctx.fillText('6529 NATION', canvas.width / 2 - 213, 50);

    // Type / Country / Passport Numba (top row)
    ctx.font = '18px "OCR B"';
    ctx.textAlign = 'left';
    // Start all fields after avatar width
    const col1 = avatarX + avatarSize + 32;
    const col2 = col1 + 210;
    const col3 = col2 + 210;
    
    ctx.fillText('Type', col1, 85);
    ctx.fillText('Country', col2, 85);
    ctx.fillText('Passport Numba', col3, 85);
    ctx.font = '32px "OCR B"';
    ctx.fillText('IDENTITY', col1, 120);
    ctx.fillText('6529', col2, 120);
    ctx.fillText(d.passnum || 'AF07862', col3, 120);

    // ePassport logo (top right)
    if (epassportImg.complete) {
      ctx.drawImage(epassportImg, canvas.width - 110, 88, 56, 36);
    } else {
      epassportImg.onload = () => {
        ctx.drawImage(epassportImg, canvas.width - 110, 88, 56, 36);
      };
    }
    ctx.textAlign = 'left';
  }

  async function drawTextBlock(d) {
    // Draw avatar (left side)
    if (d.avatar && d.avatar.size) {
      await drawUserImage(d.avatar, avatarX, avatarY, avatarSize, avatarSize);
    } else {
      ctx.fillStyle = '#fff';
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 6;
      ctx.strokeRect(avatarX, avatarY, avatarSize, avatarSize);
    }

    // Field block (right of avatar)
    let x = avatarX + avatarSize + 32; // Slightly more spacing after larger avatar
    let y = avatarY + 6;
    const labelFont = '20px "OCR B"';
    const valueFont = '32px "OCR B"';
    const lineGap = 46;
    const blockGap = 24;

    // Ser-name
    ctx.font = labelFont;
    ctx.fillStyle = '#000';
    ctx.fillText('Ser-name', x, y);
    ctx.font = valueFont;
    ctx.fillText((d.surname || '').toUpperCase(), x, y + 30);
    y += lineGap + blockGap;

    // First Name
    ctx.font = labelFont;
    ctx.fillText('First Name', x, y);
    ctx.font = valueFont;
    ctx.fillText((d.firstname || '').toUpperCase(), x, y + 30);
    y += lineGap + blockGap;

    // Line Numba
    ctx.font = labelFont;
    ctx.fillText('Line Numba', x, y);
    ctx.font = valueFont;
    ctx.fillText((d.linenumba || '500').toUpperCase(), x, y + 30);
    y += lineGap + blockGap;

    // Token Identification
    ctx.font = labelFont;
    ctx.fillText('Token Identification', x, y);
    ctx.font = valueFont;
    ctx.fillText((d.tokenid || '40').toUpperCase(), x, y + 30);
    y += lineGap + blockGap;

    // Reputation
    ctx.font = labelFont;
    ctx.fillText('Reputation', x, y);
    ctx.font = valueFont;
    ctx.fillText((d.reputation || '').toUpperCase(), x, y + 30);
    y += lineGap + blockGap;

    // Mint Date
    ctx.font = labelFont;
    ctx.fillText('Mint Date', x, y);
    ctx.font = valueFont;
    ctx.fillText(formatDate(d.mintdate), x, y + 30);
    y += lineGap + blockGap;

    // Authority and ENS Expiry Date on same row
    ctx.font = labelFont;
    ctx.fillText('Authority', x, y);
    ctx.fillText('ENS Expiry Date', x + 420, y);
    ctx.font = valueFont;
    ctx.fillText((d.authority || '').toUpperCase(), x, y + 30);
    ctx.fillText(formatDate(d.expirydate), x + 420, y + 30);
  }

  function drawMRZ(d) {
    const mrzY = canvas.height - 90;
    ctx.fillStyle = '#000';
    ctx.font = '36px "OCR B"';
    ctx.textAlign = 'left';
    // MRZ line 1: <FIRSTNAME<SURNAME<REPUTATION<<<<<<<<<<<<<<<<<<<<<<
    // Calculate width to fill entire passport width
    const mrzWidth = canvas.width - 80; // Leave 40px margin on each side
    const charWidth = ctx.measureText('<').width;
    const maxChars = Math.floor(mrzWidth / charWidth);
    
    const ln1 = `<${(d.firstname || '').toUpperCase()}<${(d.surname || '').toUpperCase()}<${(d.reputation || '').toUpperCase()}`.padEnd(maxChars, '<');
    // MRZ line 2: <WALLET (or tokenid) padded
    let wallet = (d.wallet || d.tokenid || '').toUpperCase();
    if (!wallet.startsWith('0X') && wallet.length > 0) wallet = '0X' + wallet;
    const ln2 = `<${wallet}`.padEnd(maxChars, '<');
    ctx.fillText(ln1, 40, mrzY);
    ctx.fillText(ln2, 40, mrzY + 35);
  }

  function formatDate(isoStr) {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
  }

  function drawPassportSymbol(x, y) {
    ctx.save();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 6;
    
    // Circle
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.stroke();
    
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(x - 42, y);
    ctx.lineTo(x + 42, y);
    ctx.stroke();
    
    ctx.restore();
  }

  async function drawUserImage(file, x, y, w, h) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      
      img.onload = () => {
        try {
          // Crop to square and center
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2;
          const sy = (img.height - side) / 2;
          
          ctx.drawImage(img, sx, sy, side, side, x, y + 60, w, h);
          URL.revokeObjectURL(url);
          resolve();
        } catch (err) {
          console.error('Error drawing user image:', err);
          resolve();
        }
      };
      
      img.onerror = () => {
        console.error('Failed to load image');
        URL.revokeObjectURL(url);
        resolve();
      };
      
      img.src = url;
    });
  }
});
