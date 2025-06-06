import { createPublicClient, http } from 'https://esm.sh/viem@2.30.6';
import { mainnet } from 'https://esm.sh/viem@2.30.6/chains';
import { keccak256, toHex } from 'https://esm.sh/viem@2.30.6/utils';

// Helper to set form field values
const setField = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.value = val;
};

// ID Generator Module
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  let _currentIdentityData = null; // Variable to store fetched identity data
  const form = document.getElementById('passport-form');
  const canvas = document.getElementById('passport-canvas');
  const ctx = canvas.getContext('2d');
  const avatarInput = document.getElementById('avatar');
  const sernameBtn = document.getElementById('sername-submit'); // Define sernameBtn once
  
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
      'firstname', 'nationality', 'tokenid', 'reputation', 'authority', 'mintdate', 'expirydate', 'passnum', 'avatar'
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

  // Show/hide and fetch logic for identity
  const identityInput = document.getElementById('identity');
  const sendIcon = sernameBtn.querySelector('.send-icon'); // Use defined sernameBtn
  const spinner = sernameBtn.querySelector('.spinner'); // Use defined sernameBtn
  let lastIdentity = '';

  // Enable button only if identity is not empty
  identityInput.addEventListener('input', () => {
    // sernameBtn is already defined
    sernameBtn.disabled = !identityInput.value.trim();
    
    // Hide preview, download button, and main fields when input changes
    const previewContainer = document.querySelector('.preview-container');
    const downloadSection = document.getElementById('download-section');
    const actionButtons = document.getElementById('action-buttons');
    const mainFields = document.getElementById('main-fields-row');
    
    if (previewContainer) previewContainer.style.display = 'none';
    if (downloadSection) downloadSection.style.display = 'none';
    if (actionButtons) actionButtons.style.display = 'none';
    
    // Hide main fields whenever there's typing (not just when cleared)
    if (mainFields) {
      mainFields.style.display = 'none';
      mainFields.style.opacity = 0;
    }
    
    if (!identityInput.value.trim()) {
      // Reset extra fields if identity is cleared
      resetExtraFields();
      canvas.style.display = 'none'; // Hide canvas
      if (downloadSection) {
        downloadSection.style.display = 'none';
      }
      if (actionButtons) {
        actionButtons.style.display = 'none';
      }
      _currentIdentityData = null; // Clear current identity data
      lastIdentity = '';
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
    identityInput.parentElement.appendChild(errorMsg);
  }

  // Function to fetch ENS name and expiry using Viem
  async function fetchEnsNameAndExpiry(walletAddress) {
    if (!walletAddress) {
      console.log('[6529] fetchEnsNameAndExpiry: No wallet address provided.');
      setField('authority', ''); // Authority should be ENS name
      setField('expirydate', '');
      return;
    }
    console.log(`[6529] fetchEnsNameAndExpiry: Fetching ENS for ${walletAddress}`);
    try {
      const publicClient = createPublicClient({
        chain: mainnet,
        transport: http(),
      });

      const ensName = await publicClient.getEnsName({
        address: walletAddress,
      });

      if (ensName) {
        setField('authority', ensName); // Authority field shows ENS name
        console.log(`[6529] fetchEnsNameAndExpiry: Found ENS Name: ${ensName}`);
        
        // Get the namehash for the ENS name
        const nameHash = keccak256(toHex(ensName.split('.').reverse().reduce((node, label) => 
          keccak256(node + keccak256(toHex(label)).slice(2)), '0x0000000000000000000000000000000000000000000000000000000000000000')));
        
        console.log(`[6529] Namehash for ${ensName}: ${nameHash}`);
        
        // Try to get expiry from the ENS registrar controller
        try {
          // ENS Base Registrar address on mainnet (for .eth names only)
          const baseRegistrarAddress = '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85';
          
          // Only try to get expiry for .eth names
          if (ensName.endsWith('.eth')) {
            // Get the token ID for the ENS name (for .eth names)
            // For subdomains like vault.brookr.eth, we need to get the parent domain brookr.eth
            const parts = ensName.split('.');
            let parentDomain = ensName;
            if (parts.length > 2 && parts[parts.length - 1] === 'eth') {
              // This is a subdomain, get the parent .eth domain
              parentDomain = parts[parts.length - 2] + '.eth';
              console.log(`[6529] ENS name ${ensName} is a subdomain, using parent domain ${parentDomain} for expiry lookup`);
            }
            
            const label = parentDomain.replace('.eth', '');
            const labelHash = keccak256(toHex(label));
            const tokenId = BigInt(labelHash);
            
            console.log(`[6529] Looking up expiry for .eth name: ${parentDomain}, token ID: ${tokenId}`);
            
            // Read nameExpires from the base registrar
            const expiryTimestamp = await publicClient.readContract({
              address: baseRegistrarAddress,
              abi: [{
                inputs: [{ name: 'id', type: 'uint256' }],
                name: 'nameExpires',
                outputs: [{ name: '', type: 'uint64' }],
                stateMutability: 'view',
                type: 'function',
              }],
              functionName: 'nameExpires',
              args: [tokenId],
            });
            
            if (expiryTimestamp && expiryTimestamp > 0) {
              const expiry = new Date(Number(expiryTimestamp) * 1000);
              setField('expirydate', iso(expiry));
              console.log(`[6529] fetchEnsNameAndExpiry: Found ENS Expiry: ${iso(expiry)}`);
            } else {
              setField('expirydate', '');
              console.log('[6529] fetchEnsNameAndExpiry: nameExpires returned 0 or invalid.');
            }
          } else {
            // Non-.eth names don't have expiry dates in the same way
            setField('expirydate', '');
            console.log('[6529] fetchEnsNameAndExpiry: Non-.eth ENS name, no expiry date available.');
          }
        } catch (expiryError) {
          console.error('[6529] Error fetching ENS expiry:', expiryError);
          setField('expirydate', '');
        }
      } else {
        setField('authority', ''); // No ENS name
        setField('expirydate', '');
        console.log('[6529] fetchEnsNameAndExpiry: No ENS name found for address.');
      }
    } catch (error) {
      console.error('[6529] fetchEnsNameAndExpiry: Error fetching ENS details:', error);
      setField('authority', '');
      setField('expirydate', '');
    }
  }

  // Allow Enter in Identity to trigger submit
  identityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sernameBtn.click(); // Use defined sernameBtn
    }
  });

  sernameBtn.addEventListener('click', async () => { // Use defined sernameBtn
    // Clear previous output fields to prevent stale data
    setField('type', '');
    setField('linenumba', '');
    setField('tokenid', '');
    setField('nationality', '');
    setField('reputation', '');
    setField('mintdate', '');
    setField('expirydate', '');
    setField('ensname', '');

    let identityData = null;
    let identityError = false;
    let inboundRepLog = null; // Declare inboundRepLog in the correct scope
    _currentIdentityData = null; // Reset identity data before new fetch
    const username = identityInput.value.trim();
    if (!username || username === lastIdentity) return;
    lastIdentity = username;
    // Show spinner, disable button
    // sernameBtn is already defined
    sernameBtn.disabled = true;
    sendIcon.style.display = 'none';
    spinner.style.display = 'inline-block';
    errorMsg.style.display = 'none';
    resetExtraFields();
    setField('authority', ''); // Reset authority too
    setField('ensname', '');
    // Hide main fields and reset opacity
    let mainFields = document.getElementById('main-fields-row');
    if (mainFields) {
      mainFields.style.display = 'none';
      mainFields.style.opacity = 0;
    }

    // Fetch all inbound rep for a user using /api/profile-logs
    async function fetchInboundRep(username) {
      let page = 1;
      const pageSize = 100;
      let items = [];
      let shouldContinue = true;
      while (shouldContinue) {
        try {
          const url = new URL('https://api.6529.io/api/profile-logs');
          url.searchParams.set('page', page);
          url.searchParams.set('page_size', pageSize);
          url.searchParams.set('include_incoming', 'true');
          url.searchParams.set('rating_matter', 'REP');
          url.searchParams.set('profile', username);
          const response = await fetch(url.toString());
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          const newItems = Array.isArray(data.data) ? data.data : [];
          items = items.concat(newItems);
          shouldContinue = newItems.length === pageSize;
          page += 1;
        } catch (error) {
          console.error('[6529] Error fetching inbound rep:', error);
          shouldContinue = false;
        }
      }
      // Filter and accumulate by category
      const filtered = items.filter(item =>
        item.profile_handle &&
        item.target_profile_handle &&
        item.contents &&
        item.contents.rating_matter === 'REP' &&
        item.target_profile_handle.toLowerCase() === username.toLowerCase() &&
        !/^Profile/.test(item.contents.change_reason || '') &&
        item.contents.rating_category
      );
      // Accumulate total by category and extract Line Numba
      const accumulator = {};
      let extractedLineNumber = null; // Initialize Line Numba
      for (const entry of filtered) {
        const cat = entry.contents.rating_category;
        if (!accumulator[cat]) accumulator[cat] = 0;
        accumulator[cat] += entry.contents.new_rating || 0; // Use new_rating as per API and established logic

        // Check for Line Numba pattern if not already found
        if (extractedLineNumber === null) {
          const lineMatch = cat.match(/^Line (\d+)\. Artist$/i);
          if (lineMatch && lineMatch[1]) {
            extractedLineNumber = parseInt(lineMatch[1], 10);
            console.log(`[6529] fetchInboundRep: Found Line Numba: ${extractedLineNumber} from category "${cat}"`);
          }
        }
      }
      console.log('[6529] Inbound rep by category (inside fetchInboundRep):', accumulator);

      // Find the category with the highest total from the accumulator
      let maxCat = null;
      let maxTotal = -Infinity;
      if (Object.keys(accumulator).length > 0) {
        for (const cat in accumulator) {
          if (accumulator[cat] > maxTotal) {
            maxCat = cat;
            maxTotal = accumulator[cat];
          }
        }
        console.log(`[6529] fetchInboundRep determined: highestCategory = "${maxCat}", highestTotal = ${maxTotal}`);
      } else {
        console.log('[6529] fetchInboundRep: Accumulator is empty, no highest category.');
      }

      return { items: filtered, accumulator, highestCategory: maxCat, highestTotal: maxTotal, lineNumber: extractedLineNumber };
    }


    try {
      // Fetch identity and inbound rep in parallel
      const [identityRes, fetchedInboundRep] = await Promise.all([
        fetch(`https://api.6529.io/api/identities/${encodeURIComponent(username)}`),
        fetchInboundRep(username)
      ]);
      inboundRepLog = fetchedInboundRep; 
      if (identityRes.ok) {
        identityData = await identityRes.json();
      } else {
        identityError = true;
      }
      // Log inbound rep from /profile-logs
      if (inboundRepLog) {
        console.log('[6529] /profile-logs inbound rep accumulator:', inboundRepLog.accumulator);
      }
      if (identityData && !identityError) {
      _currentIdentityData = identityData; // Store successfully fetched identity data
    }
    // UI update logic must be inside this block so inboundRepLog is in-scope
      if (!identityData || identityError) {
        errorMsg.textContent = 'Identity not found.';
        errorMsg.style.display = 'block';
        sernameBtn.disabled = false;
        spinner.style.display = 'none';
        sendIcon.style.display = 'inline-block';
        // Hide all main fields
        if (mainFields) {
          mainFields.style.display = 'none';
          mainFields.style.opacity = 0;
        }
        return;
      }
      // Store the fetched identity data before any rendering
      if (identityData && !identityError) {
        _currentIdentityData = identityData;
        console.log('[6529] _currentIdentityData updated:', _currentIdentityData);
      }
      
      // 11. Passport Numba: last 7 chars of primary_wallet
      let passportNum = '';
      if (identityData && identityData.primary_wallet) {
        passportNum = identityData.primary_wallet.slice(-7).toUpperCase();
      }
      setField('passnum', passportNum);
      
      // Show all main fields after successful lookup
      if (mainFields) {
        mainFields.style.display = 'block';
        mainFields.style.transition = 'opacity 1.5s';
        setTimeout(() => { mainFields.style.opacity = 1; }, 20);
      }
      spinner.style.display = 'none';
      sendIcon.style.display = 'inline-block';
      sernameBtn.disabled = false;
      setField('type', 'Identity');
      // 2. Ser-name: populate with the identity value
      setField('surname', username);
      // 3. First Name: leave blank (user-editable)
      // 4. Line number: not available from rep anymore, leave blank
      setField('linenumba', '');
      // Guard all identityData fields
      if (identityData) {
        // 5. Token Identification: pfp_token_id is not in the API, leave blank
        setField('tokenid', '');
        // 6. Nationality: set to '6529'
        setField('nationality', '6529');
      } else {
        setField('tokenid', '');
        setField('nationality', '');
        console.warn('[6529] identityData is null; setting fields to blank.');
      }
      // 7. Reputation: roll up totals by category using contents.rating_category and contents.new_rating
      let highestRepText = '';
      let repAccumulator = {};
      if (inboundRepLog && Array.isArray(inboundRepLog.items) && inboundRepLog.items.length > 0) {
        for (const entry of inboundRepLog.items) {
          const c = entry.contents;
          if (!c || typeof c.new_rating !== 'number' || !c.rating_category) continue;
          const cat = c.rating_category;
          // Roll up the latest new_rating for each category (sum all new_rating values for that category)
          if (!repAccumulator[cat]) repAccumulator[cat] = 0;
          repAccumulator[cat] += c.new_rating;
        }
        console.log('[6529] Inbound rep accumulator by category (using new_rating):', repAccumulator);
        // Find the category with the highest total
        let maxCat = null;
        let maxTotal = -Infinity;
        for (const cat in repAccumulator) {
          if (repAccumulator[cat] > maxTotal) {
            maxCat = cat;
            maxTotal = repAccumulator[cat];
          }
        }
        highestRepText = maxCat || '';
        console.log('[6529] Selected highest inbound rep category:', highestRepText, 'with total:', maxTotal);
      } else {
        console.log('[6529] No inbound rep found for user.');
      }
      setField('reputation', highestRepText);
      
      // 7. Citizen Since: Fetch from profile-logs API endpoint for PROFILE_CREATED event
      try {
        const profileLogsResponse = await fetch(`https://api.6529.io/api/profile-logs?profile=${username}&log_type=PROFILE_CREATED`);
        if (profileLogsResponse.ok) {
          const logsData = await profileLogsResponse.json();
          if (logsData.data && logsData.data.length > 0 && logsData.data[0].created_at) {
            const createdDate = new Date(logsData.data[0].created_at);
            setField('mintdate', createdDate.toISOString().split('T')[0]);
            console.log(`[6529] Profile created at: ${logsData.data[0].created_at}`);
          } else {
            setField('mintdate', '');
            console.log('[6529] No PROFILE_CREATED log found');
          }
        } else {
          setField('mintdate', '');
          console.log(`[6529] Failed to fetch profile logs: ${profileLogsResponse.status}`);
        }
      } catch (error) {
        console.error('[6529] Error fetching profile logs:', error);
        setField('mintdate', '');
      }
      
      // 8. ENS Name and Expiry Date
      if (identityData && identityData.primary_wallet) {
        await fetchEnsNameAndExpiry(identityData.primary_wallet);
      } else {
        setField('authority', ''); // Authority is ENS name
        setField('expirydate', '');
        console.log('[6529] No primary_wallet in identityData, skipping ENS fetch.');
      }
      
      // Remove the initial canvas update - it will be triggered after avatar loads
      // updatePassportCanvas();      // Initial render after fetching data
      canvas.style.display = 'block'; // Show the canvas now that it's rendered
      
      // Populate avatar preview if pfp image is available and store for later use
      if (identityData && identityData.pfp) {
        // If #avatar-preview exists, set its src
        const avatarImg = document.getElementById('avatar-preview');
        let pfpUrl = identityData.pfp;
        if (pfpUrl.startsWith('ipfs://')) {
          pfpUrl = 'https://dweb.link/ipfs/' + pfpUrl.replace('ipfs://', '');
        }
        window._6529_lastPfpUrl = pfpUrl;
        console.log('[6529] API PFP URL set in window:', window._6529_lastPfpUrl);
        if (avatarImg) {
          // Wait for avatar to load before updating canvas
          avatarImg.onload = () => {
            console.log('[6529] Avatar image loaded:', pfpUrl);
            // Update canvas again now that avatar is loaded
            updatePassportCanvas();
          };
          avatarImg.onerror = (e) => {
            console.warn('[6529] Avatar image failed to load:', pfpUrl, e);
            // Still update canvas even if avatar fails
            updatePassportCanvas();
          };
          avatarImg.src = pfpUrl;
        } else {
          console.warn('[6529] #avatar-preview element not found in DOM');
          // Update canvas anyway
          updatePassportCanvas();
        }
      } else {
        window._6529_lastPfpUrl = null;
        console.log('[6529] No pfp found in identityData');
        // Update canvas with no avatar
        updatePassportCanvas();
      }
    } catch (err) {
      console.error('[6529] Error in rep/identity fetch or UI update:', err);
      errorMsg.textContent = 'Error fetching identity or reputation.';
      errorMsg.style.display = 'block';
      sernameBtn.disabled = false;
      spinner.style.display = 'none';
      sendIcon.style.display = 'inline-block';
      if (mainFields) {
        mainFields.style.display = 'none';
        mainFields.style.opacity = 0;
      }
    }
  });

  // Function to update the passport canvas
  async function updatePassportCanvas() {
    console.log('[6529] updatePassportCanvas called');
    let avatarImg = null;
    const pfpFile = avatarInput.files && avatarInput.files[0];

    if (pfpFile) {
      console.log('[6529] updatePassportCanvas: Using uploaded PFP file:', pfpFile.name);
      avatarImg = new Image();
      avatarImg.crossOrigin = 'anonymous';
      avatarImg.src = URL.createObjectURL(pfpFile);
    } else if (window._6529_lastPfpUrl) {
      console.log('[6529] updatePassportCanvas: Using API PFP URL:', window._6529_lastPfpUrl);
      avatarImg = new Image();
      avatarImg.crossOrigin = 'anonymous';
      avatarImg.src = window._6529_lastPfpUrl;
    } else {
      console.log('[6529] updatePassportCanvas: No PFP available.');
      renderPassportWithAvatar(null); // Render immediately if no image to load
      return;
    }

    // Wait for avatar to load if present, then proceed to render passport
    if (avatarImg) {
      avatarImg.onload = () => {
        if (window._6529_lastPfpUrl && avatarImg.src === window._6529_lastPfpUrl) {
          console.log('[6529] updatePassportCanvas: API PFP loaded successfully for canvas. Src:', avatarImg.src);
        } else if (pfpFile && avatarImg.src.startsWith('blob:')) { 
           console.log('[6529] updatePassportCanvas: Uploaded PFP loaded successfully for canvas. Src:', avatarImg.src);
        } else {
           console.log('[6529] updatePassportCanvas: PFP (unknown source or already loaded) loaded for canvas. Src:', avatarImg.src);
        }
        renderPassportWithAvatar(avatarImg);
      };
      avatarImg.onerror = () => {
        console.error('[6529] updatePassportCanvas: Error loading avatar image. Src:', avatarImg.src);
        renderPassportWithAvatar(null); // Render with no avatar on error
      };
      // Handle cases where image might already be complete (e.g., cached or data URL)
      if (avatarImg.complete && avatarImg.naturalWidth !== 0) {
        console.log('[6529] updatePassportCanvas: Avatar image already complete, rendering. Src:', avatarImg.src);
        renderPassportWithAvatar(avatarImg); 
        // No return here, onload might still fire for some blob/cached scenarios, let renderPassportWithAvatar be idempotent or ensure it's called once.
        // For simplicity, we'll rely on onload for consistency, but this check can speed up display for already loaded images.
      } else if (!avatarImg.src) {
        // If src is empty after logic, means no image was chosen, render without.
        console.log('[6529] updatePassportCanvas: avatarImg.src is empty, rendering with null.');
        renderPassportWithAvatar(null);
      }
    }
  }

  // Function to render the passport with the loaded avatar
  function renderPassportWithAvatar(img) { // Add 'function' keyword
    const formData = new FormData(form);
    // today and expiryDate are already defined in the outer scope
    const data = {
      firstname: formData.get('firstname') || '-',
      surname: formData.get('surname') || '-',
      nationality: '6529', // Always hardcoded to 6529
      tokenid: formData.get('tokenid') || '-',
      reputation: formData.get('reputation') || '-',
      linenumba: formData.get('linenumba') || '-',
      authority: formData.get('authority') || '-',
      mintdate: formData.get('mintdate') || '-',
      expirydate: formData.get('expirydate') || '-',
      passnum: formData.get('passnum') || '-',
      primary_wallet: (_currentIdentityData && _currentIdentityData.primary_wallet) ? _currentIdentityData.primary_wallet : '-', // For MRZ only
      avatarImg: img // pass loaded avatar image
    };
    // Call your actual passport rendering logic here, e.g.:
    renderPassport(data);
  }

  // Include 'surname' since it's now a regular editable field, exclude 'nationality' since it's hardcoded
  const inputIdsToTrack = ['firstname', 'surname', 'tokenid', 'reputation', 'linenumba', 'authority', 'mintdate', 'expirydate'];
  inputIdsToTrack.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      const eventType = (element.type === 'date') ? 'change' : 'input';
      element.addEventListener(eventType, () => {
        if (canvas.style.display === 'block') { // Only update if canvas is visible
          console.log(`[6529] Input changed for ${id}, updating canvas because canvas is visible.`);
          updatePassportCanvas();
        } else {
          console.log(`[6529] Input changed for ${id}, but canvas is hidden. No update.`);
        }
      });
    }
  });

  avatarInput.addEventListener('change', () => {
    console.log('[6529] Avatar input changed, updating canvas.');
    updatePassportCanvas();
  });

  // Download button functionality
  const downloadBtn = document.getElementById('download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      const identity = document.getElementById('identity').value.trim() || 'passport';
      link.download = `6529-passport-${identity}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }

  // Event listeners for real-time form updates are set up after renderPassportWithAvatar

  // Main rendering function
  async function renderPassport(d) {
    // Show the preview container and download button when rendering
    const previewContainer = document.querySelector('.preview-container');
    const downloadSection = document.getElementById('download-section');
    const actionButtons = document.getElementById('action-buttons');
    if (previewContainer) {
      previewContainer.style.display = 'block';
    }
    if (downloadSection) {
      downloadSection.style.display = 'block';
    }
    if (actionButtons) {
      actionButtons.style.display = 'block';
    }
    
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
        bgImg.onload = () => {
          console.log('[6529] Background image loaded successfully:', bgImg.src);
          resolve(); // Resolve the promise once bgImg is loaded
        };
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
    ctx.fillText(d.passnum || '-', col3, 120);

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
  console.log('[6529] drawTextBlock received data.avatarImg:', d.avatarImg);
    // Draw avatar (left side)
    if (d.avatarImg) {
      await drawUserImage(d.avatarImg, avatarX, avatarY, avatarSize, avatarSize);
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
    ctx.fillText((d.linenumba || '-').toUpperCase(), x, y + 30); // Ensures '-' if somehow still empty, otherwise uses the value
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

    // Citizen Since
    ctx.font = labelFont;
    ctx.fillText('Citizen Since', x, y);
    ctx.font = valueFont;
    const formattedMintDate = formatDate(d.mintdate);
    ctx.fillText(formattedMintDate || '-', x, y + 30);
    y += lineGap + blockGap;

    // Authority and ENS Expiry Date on same row
    ctx.font = labelFont;
    ctx.fillText('Authority', x, y);
    ctx.fillText('ENS Expiry Date', x + 420, y);
    ctx.font = valueFont;
    ctx.fillText((d.authority || '').toUpperCase(), x, y + 30);
    const formattedExpiryDate = formatDate(d.expirydate);
    ctx.fillText(formattedExpiryDate || '-', x + 420, y + 30);
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
    
    // Replace spaces with < in all fields
    const firstname = (d.firstname || '').toUpperCase().replace(/ /g, '<');
    const surname = (d.surname || '').toUpperCase().replace(/ /g, '<');
    const reputation = (d.reputation || '').toUpperCase().replace(/ /g, '<');
    
    const ln1 = `<${firstname}<${surname}<${reputation}`.padEnd(maxChars, '<');
    // MRZ line 2: <WALLET (or tokenid) padded
    let wallet = (d.primary_wallet || d.tokenid || '').toUpperCase().replace(/ /g, '<');
    const ln2 = `<${wallet}`.padEnd(maxChars, '<');
    ctx.fillText(ln1, 40, mrzY);
    ctx.fillText(ln2, 40, mrzY + 35);
  }

  function formatDate(isoStr) {
    if (!isoStr || isoStr === '-') return ''; // If empty or just a hyphen, display nothing
    
    // Parse the YYYY-MM-DD format
    const parts = isoStr.split('-');
    if (parts.length !== 3) return ''; // Not a valid YYYY-MM-DD format
    
    const [y, m, d] = parts;
    const yearNum = parseInt(y);
    const monthNum = parseInt(m);
    const dayNum = parseInt(d);
    
    // Basic validation for date components
    if (isNaN(yearNum) || String(yearNum).length !== 4 || 
        isNaN(monthNum) || monthNum < 1 || monthNum > 12 || 
        isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      return ''; // Invalid date components
    }
    
    // Month names array
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Format the date as DD Mon YYYY
    const formattedDay = String(dayNum).padStart(2, '0');
    const monthName = monthNames[monthNum - 1];
    
    return `${formattedDay} ${monthName} ${yearNum}`;
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

  async function drawUserImage(source, x, y, w, h) {
    let imageToDraw;
    let needsLoading = false;

    if (source instanceof Image) {
      console.log('[6529] drawUserImage: Received Image object. Src:', source.src, 'Complete:', source.complete, 'NaturalW:', source.naturalWidth, 'NaturalH:', source.naturalHeight);
      imageToDraw = source;
      // Check if it's truly ready to be drawn
      if (!(source.complete && source.naturalWidth !== 0 && source.naturalHeight !== 0)) {
        console.log('[6529] drawUserImage: Image object not fully complete or has zero dimensions. Will attempt to await load.');
        needsLoading = true;
      }
    } else if (source instanceof File) {
      console.log('[6529] drawUserImage: Received File object:', source.name);
      imageToDraw = new Image();
      imageToDraw.crossOrigin = 'anonymous';
      imageToDraw.src = URL.createObjectURL(source);
      needsLoading = true;
    } else if (typeof source === 'string') {
      console.log('[6529] drawUserImage: Received URL string:', source);
      imageToDraw = new Image();
      imageToDraw.crossOrigin = 'anonymous';
      imageToDraw.src = source;
      needsLoading = true;
    } else {
      console.error('[6529] drawUserImage: Unknown source type received:', source);
      return;
    }

    if (needsLoading) {
      console.log('[6529] drawUserImage: Awaiting image load for src:', imageToDraw.src);
      try {
        await new Promise((resolve, reject) => {
          if (imageToDraw.complete && imageToDraw.naturalWidth !== 0 && imageToDraw.naturalHeight !== 0) {
            console.log('[6529] drawUserImage: Image was already complete before promise setup for src:', imageToDraw.src);
            resolve(); // Resolve the promise once bgImg is loaded
          }
          imageToDraw.onload = () => {
            console.log('[6529] drawUserImage: Image loaded successfully via promise. Src:', imageToDraw.src, 'W:', imageToDraw.naturalWidth, 'H:', imageToDraw.naturalHeight);
            if (imageToDraw.naturalWidth === 0 || imageToDraw.naturalHeight === 0) {
                 console.warn('[6529] drawUserImage: Image loaded but has zero dimensions. Src:', imageToDraw.src);
                 reject(new Error('Image loaded with zero dimensions'));
                 return;
            }
            resolve();
          };
          imageToDraw.onerror = (errEvent) => {
            console.error('[6529] drawUserImage: Image failed to load via promise. Src:', imageToDraw.src, 'Error event:', errEvent);
            reject(new Error('Image onerror triggered'));
          };
        });
      } catch (error) {
        console.error('[6529] drawUserImage: Error during image load await. Src:', imageToDraw.src, 'Error:', error);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = 'red';
        ctx.fillText('Load Error', x + 5, y + 20);
        return;
      }
    }

    // At this point, imageToDraw should be loaded if needsLoading was true, or was already complete.
    if (imageToDraw && imageToDraw.complete && imageToDraw.naturalWidth !== 0 && imageToDraw.naturalHeight !== 0) {
      console.log(`[6529] drawUserImage: Drawing image to canvas. Src: ${imageToDraw.src}, X: ${x}, Y: ${y}, W: ${w}, H: ${h}`);
      try {
        // Crop to square and center before drawing
        const side = Math.min(imageToDraw.naturalWidth, imageToDraw.naturalHeight);
        const sx = (imageToDraw.naturalWidth - side) / 2;
        const sy = (imageToDraw.naturalHeight - side) / 2;
        
        ctx.drawImage(imageToDraw, sx, sy, side, side, x, y, w, h); // Draw the cropped square section
        console.log('[6529] drawUserImage: ctx.drawImage call completed successfully.');
      } catch (e) {
        console.error('[6529] drawUserImage: Error during ctx.drawImage call. Src:', imageToDraw.src, 'Error:', e);
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = 'orange';
        ctx.fillText('Draw Error', x + 5, y + 20);
      }
    } else {
      console.warn('[6529] drawUserImage: Image not drawable (not complete or zero dimensions) after load attempt. Src:', imageToDraw ? imageToDraw.src : 'undefined');
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = 'blue';
      ctx.fillText('Not Drawable', x + 5, y + 20);
    }
  }
});
