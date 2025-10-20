document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('relativesUrl').value = 'https://you.23andme.com/p/de4801e7042d7210/family/relatives/ajax/?limit=100';
  document.getElementById('ancestryUrl').value = 'https://you.23andme.com/p/de4801e7042d7210/profile/f3ba59870a2a7a4a/ancestry_composition/?sort_by=remote&include_ibd_countries=false';
});

document.getElementById('getProfileId').addEventListener('click', async () => {
  const statusElement = document.getElementById('profileIdStatus');
  const dataElement = document.getElementById('profileIdData');

  statusElement.textContent = 'Loading...';
  statusElement.className = 'status loading';
  dataElement.textContent = '';

  try {
    console.log('Fetching profile ID from https://you.23andme.com/');

    // Don't include X-Requested-With header to avoid the ajax check
    const response = await fetch('https://you.23andme.com/', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'text/html'
      }
    });

    console.log('Profile ID response status:', response.status);

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}\nResponse: ${responseText.substring(0, 200)}`);
    }

    const html = await response.text();
    console.log('HTML length:', html.length);

    // Look for window.TTAM.currentProfileId in the HTML
    const match = html.match(/window\.TTAM\.currentProfileId\s*=\s*["']([a-f0-9]+)["']/);

    if (match && match[1]) {
      const profileId = match[1];
      console.log('Found profile ID:', profileId);

      statusElement.textContent = 'Success';
      statusElement.className = 'status success';
      dataElement.textContent = JSON.stringify({ profileId: profileId }, null, 2);
    } else {
      throw new Error('Could not find window.TTAM.currentProfileId in the page. Check console for HTML content.');
    }

  } catch (error) {
    console.error('Profile ID fetch error:', error);
    statusElement.textContent = `Error: ${error.message}`;
    statusElement.className = 'status error';
    dataElement.textContent = error.message;
  }
});

document.getElementById('fetchData').addEventListener('click', async () => {
  const relativesUrl = document.getElementById('relativesUrl').value.trim();
  const ancestryUrl = document.getElementById('ancestryUrl').value.trim();

  // Fetch family relatives data
  if (relativesUrl) {
    fetchAndDisplay(
      relativesUrl,
      'relativesStatus',
      'relativesData',
      'Family Relatives'
    );
  }

  // Fetch ancestry composition data
  if (ancestryUrl) {
    fetchAndDisplay(
      ancestryUrl,
      'ancestryStatus',
      'ancestryData',
      'Ancestry Composition'
    );
  }
});

async function fetchAndDisplay(url, statusElementId, dataElementId, label) {
  const statusElement = document.getElementById(statusElementId);
  const dataElement = document.getElementById(dataElementId);

  statusElement.textContent = 'Loading...';
  statusElement.className = 'status loading';
  dataElement.textContent = '';

  try {
    console.log(`Fetching ${label} from:`, url);

    // Extract CSRF token from cookies for the request
    const cookies = await chrome.cookies.getAll({ domain: '.23andme.com' });
    const csrfCookie = cookies.find(c => c.name === 'csrftoken');
    const csrfToken = csrfCookie ? csrfCookie.value : '';

    console.log(`CSRF Token:`, csrfToken);
    console.log(`All cookies:`, cookies);

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Accept': 'application/json',
        // 'Referer': 'https://you.23andme.com/',
        'X-Requested-With': 'XMLHttpRequest',
        // 'X-CSRFToken': csrfToken,
        // 'User-Agent': navigator.userAgent
      }
    });

    console.log(`${label} response status:`, response.status);
    console.log(`${label} response headers:`, [...response.headers.entries()]);

    if (!response.ok) {
      // Try to get response body for more details
      const responseText = await response.text();
      console.log(`${label} error response body:`, responseText);

      throw new Error(`HTTP ${response.status}: ${response.statusText}\nURL: ${url}\nResponse: ${responseText.substring(0, 200)}`);
    }

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Not JSON, show as text
      data = await response.text();
    }

    console.log(`${label} data:`, data);

    // Extract specific fields for relatives data
    let processedData = data;
    if (label === 'Family Relatives' && Array.isArray(data)) {
      processedData = extractRelativesData(data);
    } else if (label === 'Ancestry Composition' && data && data.population_trees) {
      processedData = await extractAncestryData(data, url);
    }

    statusElement.textContent = `Success (${response.status})`;
    statusElement.className = 'status success';

    if (typeof processedData === 'string') {
      dataElement.textContent = processedData;
    } else {
      dataElement.textContent = JSON.stringify(processedData, null, 2);
    }

  } catch (error) {
    console.error(`${label} error:`, error);
    statusElement.textContent = `Error: ${error.message}`;
    statusElement.className = 'status error';
    dataElement.textContent = error.message;
  }
}

function extractRelativesData(relatives) {
  return relatives.map(relative => ({
    profile_id: relative.profile_id,
    relative_profile_id: relative.relative_profile_id,
    first_name: relative.first_name,
    last_name: relative.last_name,
    is_open_sharing: relative.is_open_sharing,
    sex: relative.sex,
    predicted_relationship_id: relative.predicted_relationship_id,
    ibd_proportion: relative.ibd_proportion,
    num_segments: relative.num_segments,
    max_segment_length: relative.max_segment_length,
    is_maternal_side: relative.is_maternal_side,
    is_paternal_side: relative.is_paternal_side,
    grandparent_birth_locations: relative.grandparent_birth_locations || {
      maternal_gma: null,
      maternal_gpa: null,
      paternal_gma: null,
      paternal_gpa: null
    },
    date_opted_in: relative.date_opted_in
  }));
}

async function extractAncestryData(data, url) {
  // Extract profile_id from the URL
  const urlMatch = url.match(/\/profile\/([a-f0-9]+)\//);
  const targetProfileId = urlMatch ? urlMatch[1] : null;

  // Extract base profile_id from URL (the one before /profile/)
  const baseProfileMatch = url.match(/\/p\/([a-f0-9]+)\//);
  const baseProfileId = baseProfileMatch ? baseProfileMatch[1] : null;

  // Find the matching population tree
  const matchingTree = data.population_trees.find(tree => tree.profile_id === targetProfileId);

  if (!matchingTree) {
    console.log('No matching profile found in population_trees');
    return data;
  }

  // Recursively extract all nodes with totalPercent
  function extractNodes(node, results = {}) {
    // Skip the root "World" node
    if (node.totalPercent && parseFloat(node.totalPercent) > 0 && node.id !== 'root') {
      const demonym = node.demonym || 'Unknown';

      if (!results[demonym]) {
        results[demonym] = [];
      }

      results[demonym].push({
        id: node.id,
        label: node.label,
        totalPercent: node.totalPercent,
        color: node.color,
        parent_id: node.parent_id
      });
    }

    // Recursively process children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => extractNodes(child, results));
    }

    return results;
  }

  const ancestries = extractNodes(matchingTree.population_tree);

  // Fetch haplogroup data
  let haplogroups = null;
  if (baseProfileId && targetProfileId) {
    try {
      const haplogroupUrl = `https://you.23andme.com/p/${baseProfileId}/ancestry/compute-result/?profile_id=${targetProfileId}%2C${baseProfileId}&name=mthaplo_build_7%3Ahaplogroup%2Cyhaplo_2023%3Ahaplogroup`;

      const cookies = await chrome.cookies.getAll({ domain: '.23andme.com' });
      const csrfCookie = cookies.find(c => c.name === 'csrftoken');
      const csrfToken = csrfCookie ? csrfCookie.value : '';

      const response = await fetch(haplogroupUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': csrfToken
        }
      });

      if (response.ok) {
        const haplogroupData = await response.json();

        // Filter for the target profile
        const profileHaplogroups = haplogroupData.filter(h => h.profile_id === targetProfileId);

        haplogroups = {};
        profileHaplogroups.forEach(h => {
          if (h.name === 'yhaplo_2023:haplogroup') {
            const ydnaValue = h.result.haplogroup_id;
            // If it contains FEMALE, leave it empty
            if (ydnaValue && ydnaValue.includes('FEMALE')) {
              haplogroups.ydna = '';
            } else {
              // Extract after the colon
              const colonIndex = ydnaValue.indexOf(':');
              haplogroups.ydna = colonIndex !== -1 ? ydnaValue.substring(colonIndex + 1) : ydnaValue;
            }
          } else if (h.name === 'mthaplo_build_7:haplogroup') {
            const mtdnaValue = h.result.haplogroup_id;
            // Extract after the colon
            const colonIndex = mtdnaValue.indexOf(':');
            haplogroups.mtdna = colonIndex !== -1 ? mtdnaValue.substring(colonIndex + 1) : mtdnaValue;
          }
        });
      }
    } catch (error) {
      console.error('Error fetching haplogroups:', error);
    }
  }

  return {
    profile_id: matchingTree.profile_id,
    haplogroups: haplogroups,
    ancestries: ancestries
  };
}
