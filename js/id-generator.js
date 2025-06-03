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
  

  // Set default values in form

  // Helper to reset extra fields
  function resetExtraFields() {
    const ids = [
      'firstname', 'nationality', 'tokenid', 'reputation', 'authority', 'mintdate', 'expirydate', 'passnum', 'wallet', 'avatar'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (el.type === 'date') {
          el.value = '';
        } else if (el.type === 'file') {
          el.value = null;
        } else {
          el.value = '';
        }
      }
    });
  }

  // Show/hide and fetch logic for ser-name
  const sernameInput = document.getElementById('surname');
  const sernameBtn = document.getElementById('sername-submit');
  const sendIcon = sernameBtn.querySelector('.send-icon');
  const spinner = sernameBtn.querySelector('.spinner');
  let lastSername = '';

  // Enable button only if ser-name is not empty
  sernameInput.addEventListener('input', () => {
    sernameBtn.disabled = !sernameInput.value.trim();
    if (!sernameInput.value.trim()) {
      // Hide and reset extra fields if ser-name is cleared
      const mainFields = document.getElementById('main-fields-row');
      if (mainFields) {
        mainFields.style.opacity = 0;
        setTimeout(() => {
          mainFields.style.display = 'none';
          resetExtraFields();
        }, 1500);
      }
      lastSername = '';
    }
  });

  // Error message element
  let errorMsg = document.getElementById('sername-error');
  if (!errorMsg) {
    errorMsg = document.createElement('div');
    errorMsg.id = 'sername-error';
    errorMsg.style.color = '#c00';
    errorMsg.style.marginTop = '4px';
    errorMsg.style.display = 'none';
    sernameInput.parentElement.appendChild(errorMsg);
  }

  // Allow Enter in Ser-name to trigger submit
  sernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sernameBtn.click();
    }
  });

  sernameBtn.addEventListener('click', async () => {
    const username = sernameInput.value.trim();
    if (!username || username === lastSername) return;
    lastSername = username;
    // Show spinner, disable button
    sernameBtn.disabled = true;
    sendIcon.style.display = 'none';
    spinner.style.display = 'inline-block';
    errorMsg.style.display = 'none';
    resetExtraFields();
    // Hide main fields and reset opacity
    let mainFields = document.getElementById('main-fields-row');
    if (mainFields) {
      mainFields.style.display = 'none';
      mainFields.style.opacity = 0;
    }

    // Fetch identity and rep in parallel (using correct endpoints)
    let identityData = null;
    let repData = null;
    let identityError = false;
    try {
      const [identityRes, repRes] = await Promise.all([
        fetch(`https://api.6529.io/api/identities/${encodeURIComponent(username)}`),
        fetch(`https://api.6529.io/api/profiles/${encodeURIComponent(username)}/rep/ratings/by-rater`)
      ]);
      if (identityRes.ok) {
        identityData = await identityRes.json();
      } else {
        identityError = true;
      }
      if (repRes.ok) {
        repData = await repRes.json();
      }
    } catch (err) {
      identityError = true;
    }

    if (!identityData || identityError) {
      errorMsg.textContent = 'Identity not found.';
      errorMsg.style.display = 'block';
      spinner.style.display = 'none';
      sendIcon.style.display = 'inline-block';
      sernameBtn.disabled = false;
      // Hide all main fields
      const mainFields = document.getElementById('main-fields-row');
      if (mainFields) {
        mainFields.style.display = 'none';
        mainFields.style.opacity = 0;
      }
      return;
    }

    // Show all main fields after successful lookup
    if (mainFields) {
      mainFields.style.display = 'block';
      mainFields.style.transition = 'opacity 1.5s';
      setTimeout(() => { mainFields.style.opacity = 1; }, 20);
    }
    spinner.style.display = 'none';
    sendIcon.style.display = 'inline-block';
    sernameBtn.disabled = false;

    // 1. Type: Already hardcoded to 'Identity' (readonly)
    const setField = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    setField('type', 'Identity');
    // 2. Ser-name: user input, no change
    // 3. First Name: leave blank (user-editable)
    // 4. Line number: extract from repData (look for category/description)
    let lineNum = '';
    if (repData && Array.isArray(repData.data)) {
      const match = repData.data.find(r => r.category && /Line (\d+) Artist/.test(r.category));
      if (match) {
        const digits = match.category.match(/Line (\d+) Artist/);
        if (digits && digits[1]) lineNum = digits[1];
      }
    }
    setField('linenumba', lineNum);
    // 5. Token Identification: use pfp token_id if present (or blank)
    setField('tokenid', identityData.pfp_token_id || '');
    // 6. Reputation: show text/description of highest rep given
    let highestRepText = '';
    if (repData && Array.isArray(repData.data) && repData.data.length > 0) {
      const highest = repData.data.reduce((a, b) => (a.rating > b.rating ? a : b));
      highestRepText = highest.description || highest.category || highest.rating;
    }
    setField('reputation', highestRepText);
    // 7. Mint Date: account creation date
    setField('mintdate', identityData.created_at ? identityData.created_at.split('T')[0] : '');
    // 8. Expiry Date: ENS expiry (if available, else blank)
    setField('expirydate', identityData.ens_expiry ? identityData.ens_expiry.split('T')[0] : '');
    // 9. Authority: ENS name of primary_wallet (if present)
    let authority = identityData.primary_wallet_ens || '';
    setField('authority', authority);
    // 10. Country: hardcode to '6529' if found, else blank (editable)
    setField('nationality', identityData ? '6529' : '');
    // 11. Passport Numba: last 7 chars of primary_wallet
    let passportNum = '';
    if (identityData.primary_wallet) passportNum = identityData.primary_wallet.slice(-7).toUpperCase();
    setField('passnum', passportNum);
    // Wallet ENS field: fill with ENS if available, else address
    if (identityData.primary_wallet_ens) {
      setField('wallet', identityData.primary_wallet_ens);
    } else if (identityData.primary_wallet) {
      setField('wallet', identityData.primary_wallet);
    }

    // Populate avatar preview if pfp image is available and store for later use
    if (identityData.pfp) {
      // If #avatar-preview exists, set its src
      const avatarImg = document.getElementById('avatar-preview');
      let pfpUrl = identityData.pfp;
      if (pfpUrl.startsWith('ipfs://')) {
        pfpUrl = 'https://dweb.link/ipfs/' + pfpUrl.replace('ipfs://', '');
      }
      window._6529_lastPfpUrl = pfpUrl;
      if (avatarImg) {
        avatarImg.src = pfpUrl;
        avatarImg.onload = () => console.log('[6529] Avatar image loaded:', pfpUrl);
        avatarImg.onerror = (e) => console.warn('[6529] Avatar image failed to load:', pfpUrl, e);
      } else {
        console.warn('[6529] #avatar-preview element not found in DOM');
      }
    } else {
      window._6529_lastPfpUrl = null;
      console.log('[6529] No pfp found in identityData');
    }

    // Hide spinner, enable button
    spinner.style.display = 'none';
    sendIcon.style.display = 'inline-block';
    sernameBtn.disabled = false;
    // Fade in extra fields
    extraFields.style.display = 'block';
    setTimeout(() => {
      extraFields.classList.add('fade-in');
      extraFields.style.opacity = 1;
    }, 10);
  });

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
  function renderPassportWithAvatar(img) {
    const formData = new FormData(form);
    const today = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(today.getFullYear() + 10);
    const data = {
      firstname: formData.get('firstname') || 'JOHN',
      surname: formData.get('surname') || 'DOE',
      nationality: formData.get('nationality') || 'DIGITAL NOMAD',
      tokenid: formData.get('tokenid') || '6529-XXXX-XXXX',
      reputation: formData.get('reputation') || '',
      authority: formData.get('authority') || '',
      mintdate: formData.get('mintdate') || iso(today),
      expirydate: formData.get('expirydate') || iso(expiryDate),
      passnum: formData.get('passnum') || '',
      wallet: formData.get('wallet') || '',
      avatarImg: img // pass loaded avatar image
    };
    // Call your actual passport rendering logic here, e.g.:
    renderPassport(data);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Get avatar: prefer local upload, else use 6529 API pfp
    let avatarImg = null;
    if (avatarInput && avatarInput.files && avatarInput.files[0]) {
      avatarImg = new Image();
      avatarImg.src = URL.createObjectURL(avatarInput.files[0]);
    } else if (window._6529_lastPfpUrl) {
      avatarImg = new Image();
      avatarImg.src = window._6529_lastPfpUrl;
    }
    // Wait for avatar to load if present, then proceed to render passport
    if (avatarImg) {
      avatarImg.onload = () => renderPassportWithAvatar(avatarImg);
      avatarImg.onerror = () => renderPassportWithAvatar(null);
    } else {
      renderPassportWithAvatar(null);
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
