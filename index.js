// Store profile ID in memory
let currentProfileId = null;
let allRelativesData = [];
let enrichedMatchesData = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Enable/disable custom amount input based on radio selection
  document.querySelectorAll('input[name="fetchType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      document.getElementById('customAmount').disabled = e.target.value !== 'custom';
    });
  });

  // Automatically fetch profile ID and relatives data on load
  await autoFetchProfileAndRelatives();
});

async function autoFetchProfileAndRelatives() {
  try {
    console.log('Auto-fetching profile ID from https://you.23andme.com/');

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
      currentProfileId = match[1];
      console.log('Found profile ID:', currentProfileId);

      // Automatically fetch relatives data
      await fetchRelativesData(currentProfileId);
    } else {
      throw new Error('Could not find window.TTAM.currentProfileId in the page. Check console for HTML content.');
    }

  } catch (error) {
    console.error('Profile ID fetch error:', error);
    const relativesStatusElement = document.getElementById('relativesStatus');
    if (relativesStatusElement) {
      relativesStatusElement.textContent = `Error fetching profile: ${error.message}`;
      relativesStatusElement.className = 'status error';
    }
  }
}

async function fetchRelativesData(profileId) {
  const relativesUrl = `https://you.23andme.com/p/${profileId}/family/relatives/ajax/`;

  await fetchAndDisplay(
    relativesUrl,
    'relativesStatus',
    null,
    'Family Relatives'
  );
}


async function fetchAndDisplay(url, statusElementId, dataElementId, label) {
  const statusElement = document.getElementById(statusElementId);
  const dataElement = dataElementId ? document.getElementById(dataElementId) : null;

  statusElement.textContent = 'Loading...';
  statusElement.className = 'status loading';
  if (dataElement) {
    dataElement.textContent = '';
  }

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
      // Store all relatives data for later use
      allRelativesData = data;
      processedData = extractRelativesData(data);

      // Calculate and display sharing statistics
      const totalMatches = data.length;
      const sharingMatches = data.filter(r => r.is_open_sharing === true).length;
      const notSharingMatches = data.filter(r => r.is_open_sharing === false).length;

      const sharingStatsElement = document.getElementById('sharingStats');
      if (sharingStatsElement) {
        sharingStatsElement.innerHTML = `
          <div style="display: flex; gap: 20px; justify-content: center; padding: 15px; background: #f5f5f5; border-radius: 8px; margin: 10px 0;">
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #333;">${totalMatches}</div>
              <div style="font-size: 12px; color: #666;">Total Matches</div>
            </div>
            <div style="border-left: 2px solid #ddd;"></div>
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #4CAF50;">${sharingMatches}</div>
              <div style="font-size: 12px; color: #666;">Matches Sharing Data</div>
            </div>
            <div style="border-left: 2px solid #ddd;"></div>
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #f44336;">${notSharingMatches}</div>
              <div style="font-size: 12px; color: #666;">Not Sharing</div>
            </div>
          </div>
        `;
      }
    } else if (label === 'Ancestry Composition' && data && data.population_trees) {
      processedData = await extractAncestryData(data, url);
    }

    statusElement.textContent = `Success (${response.status})`;
    statusElement.className = 'status success';

    // Only display JSON data for non-relatives data
    if (label !== 'Family Relatives' && dataElement) {
      if (typeof processedData === 'string') {
        dataElement.textContent = processedData;
      } else {
        dataElement.textContent = JSON.stringify(processedData, null, 2);
      }
    }

  } catch (error) {
    console.error(`${label} error:`, error);
    statusElement.textContent = `Error: ${error.message}`;
    statusElement.className = 'status error';
    if (dataElement) {
      dataElement.textContent = error.message;
    }
  }
}

function extractRelativesData(relatives) {
  return relatives.map(relative => ({
    relative_profile_id: relative.relative_profile_id,
    initials: relative.initials,
    first_name: relative.first_name,
    last_name: relative.last_name,
    surnames: relative.surnames,
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

  // Recursively extract all nodes with totalPercent into hierarchical structure
  function extractNodes(node, allNodes = []) {
    // Skip the root "World" node
    if (node.totalPercent && parseFloat(node.totalPercent) > 0 && node.id !== 'root') {
      allNodes.push({
        id: node.id,
        label: node.label,
        totalPercent: node.totalPercent,
        color: node.color,
        parent_id: node.parent_id
      });
    }

    // Recursively process children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => extractNodes(child, allNodes));
    }

    return allNodes;
  }

  // Build hierarchical structure
  function buildHierarchy(nodes) {
    const nodeMap = {};
    const result = {};

    // Create a map of all nodes by ID
    nodes.forEach(node => {
      nodeMap[node.id] = { ...node, regions: {} };
    });

    // Build hierarchy
    nodes.forEach(node => {
      const hierarchyNode = nodeMap[node.id];

      if (node.parent_id === 'root') {
        // Top level region
        result[node.label] = [hierarchyNode];
      } else if (nodeMap[node.parent_id]) {
        // Child region - add to parent's regions
        const parent = nodeMap[node.parent_id];
        if (!parent.regions[node.label]) {
          parent.regions[node.label] = [];
        }
        parent.regions[node.label].push(hierarchyNode);
      }
    });

    // Clean up empty regions objects
    Object.values(nodeMap).forEach(node => {
      if (Object.keys(node.regions).length === 0) {
        delete node.regions;
      }
    });

    return result;
  }

  const allNodes = extractNodes(matchingTree.population_tree);
  const regions = buildHierarchy(allNodes);

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
    using_latest_compute: matchingTree.using_latest_compute,
    haplogroups: haplogroups,
    regions: regions
  };
}

// Fetch matches button handler
document.getElementById('fetchMatches').addEventListener('click', async () => {
  const fetchType = document.querySelector('input[name="fetchType"]:checked').value;
  const customAmount = parseInt(document.getElementById('customAmount').value);
  const progressElement = document.getElementById('fetchProgress');
  const saveButton = document.getElementById('saveJson');

  // Determine which matches to fetch
  let matchesToFetch = [];
  if (fetchType === 'sharing') {
    matchesToFetch = allRelativesData.filter(r => r.is_open_sharing === true);
  } else {
    // Filter for sharing matches first, then take the custom amount
    matchesToFetch = allRelativesData
      .filter(r => r.is_open_sharing === true)
      .slice(0, customAmount);
  }

  if (matchesToFetch.length === 0) {
    progressElement.textContent = 'No matches to fetch. Please wait for relatives data to load first.';
    return;
  }

  progressElement.textContent = `Fetching data for ${matchesToFetch.length} matches...`;
  saveButton.disabled = true;
  enrichedMatchesData = [];

  for (let i = 0; i < matchesToFetch.length; i++) {
    const match = matchesToFetch[i];
    progressElement.textContent = `Fetching ${i + 1} of ${matchesToFetch.length}: ${match.initials || match.first_name || 'Unknown'}`;

    try {
      const enrichedMatch = await fetchMatchDetails(match);
      enrichedMatchesData.push(enrichedMatch);
    } catch (error) {
      console.error(`Error fetching data for match ${match.relative_profile_id}:`, error);
      // Still add the match with basic info
      enrichedMatchesData.push({
        ...match,
        ancestry_error: error.message
      });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  progressElement.textContent = `✓ Completed! Fetched ${enrichedMatchesData.length} matches.`;
  saveButton.disabled = false;
});

// Fetch detailed data for a single match
async function fetchMatchDetails(match) {
  const relativeProfileId = match.relative_profile_id;

  // Start with basic match info
  const enrichedMatch = {
    relative_profile_id: relativeProfileId,
    initials: match.initials,
    first_name: match.first_name,
    last_name: match.last_name,
    surnames: match.surnames,
    is_open_sharing: match.is_open_sharing,
    sex: match.sex,
    predicted_relationship_id: match.predicted_relationship_id,
    ibd_proportion: match.ibd_proportion,
    num_segments: match.num_segments,
    max_segment_length: match.max_segment_length,
    is_maternal_side: match.is_maternal_side,
    is_paternal_side: match.is_paternal_side,
    grandparent_birth_locations: match.grandparent_birth_locations,
    date_opted_in: match.date_opted_in
  };

  // Fetch ancestry composition
  try {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const ancestryUrl = `https://you.23andme.com/p/${currentProfileId}/profile/${relativeProfileId}/ancestry_composition/?sort_by=remote&include_ibd_countries=false`;

    const response = await fetch(ancestryUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (response.ok) {
      const ancestryData = await response.json();
      const extractedAncestry = await extractAncestryDataForMatch(ancestryData, relativeProfileId);
      enrichedMatch.ancestry = extractedAncestry;
    }
  } catch (error) {
    console.error(`Error fetching ancestry for ${relativeProfileId}:`, error);
    enrichedMatch.ancestry_error = error.message;
  }

  return enrichedMatch;
}

// Extract ancestry data for a specific match
async function extractAncestryDataForMatch(data, targetProfileId) {
  if (!data.population_trees) {
    return null;
  }

  const matchingTree = data.population_trees.find(tree => tree.profile_id === targetProfileId);
  if (!matchingTree) {
    return null;
  }

  // Extract ancestry nodes into hierarchical structure
  function extractNodes(node, allNodes = []) {
    if (node.totalPercent && parseFloat(node.totalPercent) > 0 && node.id !== 'root') {
      allNodes.push({
        id: node.id,
        label: node.label,
        totalPercent: node.totalPercent,
        color: node.color,
        parent_id: node.parent_id
      });
    }
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => extractNodes(child, allNodes));
    }
    return allNodes;
  }

  // Build hierarchical structure
  function buildHierarchy(nodes) {
    const nodeMap = {};
    const result = {};

    // Create a map of all nodes by ID
    nodes.forEach(node => {
      nodeMap[node.id] = { ...node, regions: {} };
    });

    // Build hierarchy
    nodes.forEach(node => {
      const hierarchyNode = nodeMap[node.id];

      if (node.parent_id === 'root') {
        // Top level region
        result[node.label] = [hierarchyNode];
      } else if (nodeMap[node.parent_id]) {
        // Child region - add to parent's regions
        const parent = nodeMap[node.parent_id];
        if (!parent.regions[node.label]) {
          parent.regions[node.label] = [];
        }
        parent.regions[node.label].push(hierarchyNode);
      }
    });

    // Clean up empty regions objects
    Object.values(nodeMap).forEach(node => {
      if (Object.keys(node.regions).length === 0) {
        delete node.regions;
      }
    });

    return result;
  }

  const allNodes = extractNodes(matchingTree.population_tree);
  const regions = buildHierarchy(allNodes);

  // Fetch haplogroups
  let haplogroups = null;
  try {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const haplogroupUrl = `https://you.23andme.com/p/${currentProfileId}/ancestry/compute-result/?profile_id=${targetProfileId}%2C${currentProfileId}&name=mthaplo_build_7%3Ahaplogroup%2Cyhaplo_2023%3Ahaplogroup`;

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
      const profileHaplogroups = haplogroupData.filter(h => h.profile_id === targetProfileId);

      haplogroups = {};
      profileHaplogroups.forEach(h => {
        if (h.name === 'yhaplo_2023:haplogroup') {
          const ydnaValue = h.result.haplogroup_id;
          if (ydnaValue && ydnaValue.includes('FEMALE')) {
            haplogroups.ydna = '';
          } else {
            const colonIndex = ydnaValue.indexOf(':');
            haplogroups.ydna = colonIndex !== -1 ? ydnaValue.substring(colonIndex + 1) : ydnaValue;
          }
        } else if (h.name === 'mthaplo_build_7:haplogroup') {
          const mtdnaValue = h.result.haplogroup_id;
          const colonIndex = mtdnaValue.indexOf(':');
          haplogroups.mtdna = colonIndex !== -1 ? mtdnaValue.substring(colonIndex + 1) : mtdnaValue;
        }
      });
    }
  } catch (error) {
    console.error('Error fetching haplogroups:', error);
  }

  return {
    using_latest_compute: matchingTree.using_latest_compute,
    haplogroups: haplogroups,
    regions: regions
  };
}

// Calculate statistics from enriched matches data
function calculateMatchStatistics(matches) {
  const stats = {
    totalMatches: matches.length,
    averageRegions: {},
    haplogroups: {
      ydna: {},
      mtdna: {}
    }
  };

  // Collect all region data and haplogroup data
  const regionData = {};
  let matchesWithYDNA = 0;

  matches.forEach(match => {
    // Process haplogroups - ignore empty Y-DNA (females)
    if (match.ancestry && match.ancestry.haplogroups) {
      const { ydna, mtdna } = match.ancestry.haplogroups;

      // Only count Y-DNA if it exists and is not empty
      if (ydna && ydna.trim() !== '') {
        stats.haplogroups.ydna[ydna] = (stats.haplogroups.ydna[ydna] || 0) + 1;
        matchesWithYDNA++;
      }

      if (mtdna && mtdna.trim() !== '') {
        stats.haplogroups.mtdna[mtdna] = (stats.haplogroups.mtdna[mtdna] || 0) + 1;
      }
    }

    // Process regions - collect hierarchical data
    if (match.ancestry && match.ancestry.regions) {
      collectRegionData(match.ancestry.regions, regionData);
    }
  });

  // Build hierarchical average regions
  stats.averageRegions = buildAverageRegionHierarchy(regionData, matches.length);

  // Find most common haplogroups
  // For Y-DNA, calculate percentage based on matches that have Y-DNA
  stats.mostCommonYDNA = Object.entries(stats.haplogroups.ydna)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([haplogroup, count]) => ({
      haplogroup,
      count,
      percentage: matchesWithYDNA > 0 ? ((count / matchesWithYDNA) * 100).toFixed(1) : '0.0'
    }));

  stats.mostCommonMtDNA = Object.entries(stats.haplogroups.mtdna)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([haplogroup, count]) => ({ haplogroup, count, percentage: ((count / matches.length) * 100).toFixed(1) }));

  return stats;
}

// Collect region data while preserving hierarchy
function collectRegionData(regions, regionData) {
  Object.keys(regions).forEach(regionLabel => {
    const regionArray = regions[regionLabel];

    regionArray.forEach(region => {
      if (region.totalPercent) {
        const percent = parseFloat(region.totalPercent);
        const key = `${region.id}:${region.label}:${region.parent_id}`;

        if (!regionData[key]) {
          regionData[key] = {
            id: region.id,
            label: region.label,
            parent_id: region.parent_id,
            values: [],
            children: {}
          };
        }
        regionData[key].values.push(percent);
      }

      // Process nested regions
      if (region.regions) {
        collectRegionData(region.regions, regionData);
      }
    });
  });
}

// Build hierarchical average region structure
function buildAverageRegionHierarchy(regionData, totalMatches) {
  const result = {};

  // Convert regionData to array and calculate averages
  const regionsArray = Object.values(regionData).map(region => ({
    id: region.id,
    label: region.label,
    parent_id: region.parent_id,
    average: (region.values.reduce((a, b) => a + b, 0) / totalMatches).toFixed(2)
  }));

  // Build hierarchy
  const nodeMap = {};
  regionsArray.forEach(region => {
    nodeMap[region.id] = { ...region, children: {} };
  });

  // Organize into hierarchy
  regionsArray.forEach(region => {
    const node = nodeMap[region.id];

    if (region.parent_id === 'root') {
      // Top-level region
      if (!result[region.label]) {
        result[region.label] = [];
      }
      result[region.label].push(node);
    } else if (nodeMap[region.parent_id]) {
      // Child region
      const parent = nodeMap[region.parent_id];
      if (!parent.children[region.label]) {
        parent.children[region.label] = [];
      }
      parent.children[region.label].push(node);
    }
  });

  return result;
}

// Display match statistics
function displayMatchStatistics(stats) {
  const statsContainer = document.getElementById('matchStats');
  if (!statsContainer) return;

  let html = '<div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin: 20px 0;">';

  // Header
  html += '<h3 style="margin-top: 0; color: #fff;">Match Statistics</h3>';
  html += `<p style="color: #aaa;">Based on ${stats.totalMatches} processed matches</p>`;

  // Average Regions - Hierarchical Display
  html += '<div style="margin: 20px 0;"><h4 style="color: #fff;">Average Region Percentages</h4>';
  html += '<div style="background: #1a1a1a; padding: 15px; border-radius: 4px;">';
  html += renderRegionHierarchy(stats.averageRegions, 0);
  html += '</div></div>';

  // Most Common Y-DNA
  if (stats.mostCommonYDNA.length > 0) {
    html += '<div style="margin: 20px 0;"><h4 style="color: #fff;">Most Common Y-DNA Haplogroups</h4>';
    html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">';

    stats.mostCommonYDNA.forEach(({ haplogroup, count, percentage }) => {
      html += `
        <div style="background: #1a1a1a; padding: 10px; border-radius: 4px; border-left: 4px solid #2196F3;">
          <div style="font-weight: bold; color: #64B5F6;">${haplogroup}</div>
          <div style="font-size: 14px; color: #aaa;">${count} matches (${percentage}%)</div>
        </div>
      `;
    });
    html += '</div></div>';
  }

  // Most Common mtDNA
  if (stats.mostCommonMtDNA.length > 0) {
    html += '<div style="margin: 20px 0;"><h4 style="color: #fff;">Most Common mtDNA Haplogroups</h4>';
    html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">';

    stats.mostCommonMtDNA.forEach(({ haplogroup, count, percentage }) => {
      html += `
        <div style="background: #1a1a1a; padding: 10px; border-radius: 4px; border-left: 4px solid #FF9800;">
          <div style="font-weight: bold; color: #FFB74D;">${haplogroup}</div>
          <div style="font-size: 14px; color: #aaa;">${count} matches (${percentage}%)</div>
        </div>
      `;
    });
    html += '</div></div>';
  }

  html += '</div>';
  statsContainer.innerHTML = html;
}

// Render hierarchical region structure
function renderRegionHierarchy(regions, depth) {
  let html = '';
  const indent = depth * 20;

  Object.entries(regions).forEach(([regionLabel, regionArray]) => {
    regionArray.forEach(region => {
      html += `
        <div style="margin-left: ${indent}px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: ${depth === 0 ? '#2a2a2a' : '#1e1e1e'}; border-radius: 4px; border-left: 3px solid #4CAF50;">
            <span style="color: #fff; font-weight: ${depth === 0 ? 'bold' : 'normal'};">${region.label}</span>
            <span style="color: #4CAF50; font-weight: bold; margin-left: 15px;">${region.average}%</span>
          </div>
      `;

      // Render children if they exist
      if (region.children && Object.keys(region.children).length > 0) {
        html += renderRegionHierarchy(region.children, depth + 1);
      }

      html += '</div>';
    });
  });

  return html;
}

// Save and View Matches button handler
document.getElementById('saveJson').addEventListener('click', () => {
  if (enrichedMatchesData.length === 0) {
    alert('No data to save. Please fetch matches first.');
    return;
  }

  // Generate HTML viewer and save as file
  const htmlContent = generateMatchesHTML(enrichedMatchesData);
  const dateStr = new Date().toISOString().split('T')[0];

  const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
  const htmlUrl = URL.createObjectURL(htmlBlob);

  const htmlLink = document.createElement('a');
  htmlLink.href = htmlUrl;
  htmlLink.download = `23andme-matches-${dateStr}.html`;
  document.body.appendChild(htmlLink);
  htmlLink.click();
  document.body.removeChild(htmlLink);
  URL.revokeObjectURL(htmlUrl);

  // Code for saving files (commented out for now)
  



  // Download JSON file
  const jsonStr = JSON.stringify(enrichedMatchesData, null, 2);
  const jsonBlob = new Blob([jsonStr], { type: 'application/json' });
  const jsonUrl = URL.createObjectURL(jsonBlob);
  const jsonLink = document.createElement('a');
  jsonLink.href = jsonUrl;
  jsonLink.download = `23andme-matches-${dateStr}.json`;
  document.body.appendChild(jsonLink);
  jsonLink.click();
  document.body.removeChild(jsonLink);
  URL.revokeObjectURL(jsonUrl);
  
});
