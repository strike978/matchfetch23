// Generate HTML viewer for matches
function generateMatchesHTML(matches) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>23andMe Matches Viewer</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #1a1a1a;
      color: #e0e0e0;
      padding: 20px;
      line-height: 1.6;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    h1 {
      color: #fff;
      margin-bottom: 10px;
      font-size: 28px;
    }

    .summary {
      background: #2a2a2a;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      gap: 30px;
      flex-wrap: wrap;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
    }

    .summary-label {
      color: #999;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-value {
      color: #fff;
      font-size: 24px;
      font-weight: 600;
    }

    .filters {
      background: #2a2a2a;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .filter-group {
      display: flex;
      gap: 15px;
      align-items: center;
      flex-wrap: wrap;
    }

    .filter-group label {
      color: #999;
      font-size: 14px;
    }

    .filter-group input[type="text"],
    .filter-group select {
      background: #1a1a1a;
      border: 1px solid #444;
      color: #fff;
      padding: 8px 12px;
      border-radius: 5px;
      font-size: 14px;
    }

    .matches-table {
      background: #2a2a2a;
      border-radius: 8px;
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: #333;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #fff;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      user-select: none;
    }

    th:hover {
      background: #3a3a3a;
    }

    th.sortable::after {
      content: ' ⇅';
      color: #666;
    }

    tbody tr {
      border-bottom: 1px solid #333;
      cursor: pointer;
      transition: background 0.2s;
    }

    tbody tr:hover {
      background: #333;
    }

    tbody tr.expanded {
      background: #2d2d2d;
    }

    td {
      padding: 12px;
      font-size: 14px;
    }

    .name-cell {
      font-weight: 500;
      color: #4CAF50;
    }

    .relationship-cell {
      color: #64B5F6;
    }

    .dna-cell {
      font-weight: 600;
    }

    .haplogroup {
      display: inline-block;
      background: #3a3a3a;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-right: 5px;
      font-family: 'Courier New', monospace;
    }

    .haplogroup.ydna {
      border-left: 3px solid #2196F3;
    }

    .haplogroup.mtdna {
      border-left: 3px solid #FF9800;
    }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge.latest {
      background: #4CAF50;
      color: white;
    }

    .badge.old {
      background: #f44336;
      color: white;
    }

    .detail-row {
      display: none;
      background: #1a1a1a;
    }

    .detail-row.show {
      display: table-row;
    }

    .detail-cell {
      padding: 20px;
      border-top: 2px solid #4CAF50;
    }

    .detail-content {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 30px;
    }

    .detail-sidebar {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .detail-card {
      background: #2a2a2a;
      padding: 15px;
      border-radius: 8px;
    }

    .detail-card h3 {
      color: #fff;
      font-size: 14px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-item {
      margin-bottom: 8px;
      font-size: 13px;
    }

    .detail-label {
      color: #999;
      display: inline-block;
      width: 140px;
    }

    .detail-value {
      color: #fff;
      font-weight: 500;
    }

    .ancestry-content {
      background: #2a2a2a;
      padding: 20px;
      border-radius: 8px;
    }

    .ancestry-content h3 {
      color: #fff;
      font-size: 18px;
      margin-bottom: 15px;
    }

    .region-group {
      margin-bottom: 20px;
    }

    .region-header {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 10px;
      padding: 10px;
      background: #333;
      border-radius: 5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .region-percent {
      color: #4CAF50;
      font-size: 20px;
    }

    .subregion {
      margin-left: 20px;
      margin-top: 8px;
      padding: 8px 12px;
      background: #252525;
      border-radius: 5px;
      border-left: 3px solid #4CAF50;
    }

    .subregion-name {
      color: #e0e0e0;
      font-weight: 500;
    }

    .subregion-percent {
      color: #4CAF50;
      font-weight: 600;
      float: right;
    }

    .sub-subregion {
      margin-left: 20px;
      margin-top: 5px;
      font-size: 13px;
      color: #aaa;
      padding: 5px 10px;
      background: #1f1f1f;
      border-radius: 4px;
      border-left: 2px solid #666;
    }

    .no-ancestry {
      color: #999;
      font-style: italic;
      text-align: center;
      padding: 40px;
    }

    .expand-icon {
      float: right;
      color: #666;
      font-size: 12px;
      transition: transform 0.3s;
    }

    tr.expanded .expand-icon {
      transform: rotate(90deg);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>23andMe DNA Matches</h1>

    <div class="summary">
      <div class="summary-item">
        <span class="summary-label">Total Matches</span>
        <span class="summary-value" id="totalMatches">${matches.length}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Latest Compute</span>
        <span class="summary-value" id="latestCompute">${matches.filter(m => m.ancestry?.using_latest_compute === true).length}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Old Compute</span>
        <span class="summary-value" id="oldCompute">${matches.filter(m => m.ancestry?.using_latest_compute === false).length}</span>
      </div>
    </div>

    <div class="filters">
      <div class="filter-group">
        <label>Search:</label>
        <input type="text" id="searchInput" placeholder="Search by name or relationship...">

        <label>Version:</label>
        <select id="computeFilter">
          <option value="all">All</option>
          <option value="latest">Latest Only</option>
          <option value="old">Old Only</option>
        </select>
      </div>
    </div>

    <div class="matches-table">
      <table>
        <thead>
          <tr>
            <th class="sortable" data-sort="name">Name</th>
            <th class="sortable" data-sort="relationship">Relationship</th>
            <th class="sortable" data-sort="dna">DNA Shared</th>
            <th class="sortable" data-sort="segments">Segments</th>
            <th>Haplogroups</th>
            <th>Version</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="matchesBody">
        </tbody>
      </table>
    </div>
  </div>

  <script>
    const matchesData = ${JSON.stringify(matches)};
    console.log('Matches data loaded:', matchesData.length, 'matches');

    // Generate match row HTML
    function generateMatchRowClient(match, index) {
      const name = match.first_name && match.last_name ?
        match.first_name + ' ' + match.last_name :
        match.initials;

      const relationship = match.predicted_relationship_id.replace(/_/g, ' ');
      const dnaPercent = (match.ibd_proportion * 100).toFixed(2);

      const ydna = match.ancestry?.haplogroups?.ydna || '';
      const mtdna = match.ancestry?.haplogroups?.mtdna || '';

      const usingLatest = match.ancestry?.using_latest_compute;
      let computeBadge;
      if (usingLatest === true) {
        computeBadge = '<span class="badge latest">Latest</span>';
      } else if (usingLatest === false) {
        computeBadge = '<span class="badge old">Old</span>';
      } else {
        computeBadge = '<span class="badge" style="background: #666;">Unknown</span>';
      }

      const ydnaHtml = ydna ? '<span class="haplogroup ydna">Y: ' + ydna + '</span>' : '';
      const mtdnaHtml = mtdna ? '<span class="haplogroup mtdna">mt: ' + mtdna + '</span>' : '';
      const haplogroupHtml = !ydna && !mtdna ? '<span style="color: #666;">-</span>' : ydnaHtml + mtdnaHtml;

      return {
        name: name,
        relationship: relationship,
        dnaPercent: dnaPercent,
        segments: match.num_segments,
        haplogroupHtml: haplogroupHtml,
        computeBadge: computeBadge
      };
    }

    // Generate detail view HTML
    function generateDetailViewClient(match) {
      const fullName = (match.first_name || '') + ' ' + (match.last_name || '');
      const relationship = match.predicted_relationship_id.replace(/_/g, ' ');
      const dnaPercent = (match.ibd_proportion * 100).toFixed(2);
      const maxSegment = match.max_segment_length.toFixed(2);
      const maternalSide = match.is_maternal_side === null ? 'Unknown' : match.is_maternal_side ? 'Yes' : 'No';
      const paternalSide = match.is_paternal_side === null ? 'Unknown' : match.is_paternal_side ? 'Yes' : 'No';
      const ydna = match.ancestry?.haplogroups?.ydna || 'N/A';
      const mtdna = match.ancestry?.haplogroups?.mtdna || 'N/A';
      const computeVersion = match.ancestry?.using_latest_compute === true ? 'Latest' : match.ancestry?.using_latest_compute === false ? 'Old' : 'Unknown';

      let ancestryHtml = '<div class="no-ancestry">No ancestry data available</div>';

      if (match.ancestry && match.ancestry.regions) {
        ancestryHtml = '';
        for (const [regionName, regionArray] of Object.entries(match.ancestry.regions)) {
          regionArray.forEach(region => {
            ancestryHtml += '<div class="region-group"><div class="region-header"><span>' + region.label + '</span><span class="region-percent">' + region.totalPercent + '%</span></div>';

            if (region.regions) {
              for (const [subRegionName, subRegionArray] of Object.entries(region.regions)) {
                subRegionArray.forEach(subRegion => {
                  ancestryHtml += '<div class="subregion"><span class="subregion-name">' + subRegion.label + '</span><span class="subregion-percent">' + subRegion.totalPercent + '%</span>';

                  if (subRegion.regions) {
                    for (const [subSubRegionName, subSubRegionArray] of Object.entries(subRegion.regions)) {
                      subSubRegionArray.forEach(subSubRegion => {
                        ancestryHtml += '<div class="sub-subregion">' + subSubRegion.label + ': <strong>' + subSubRegion.totalPercent + '%</strong></div>';
                      });
                    }
                  }

                  ancestryHtml += '</div>';
                });
              }
            }

            ancestryHtml += '</div>';
          });
        }
      }

      return '<div class="detail-content"><div class="detail-sidebar"><div class="detail-card"><h3>Match Information</h3>' +
        '<div class="detail-item"><span class="detail-label">Full Name:</span><span class="detail-value">' + fullName + '</span></div>' +
        '<div class="detail-item"><span class="detail-label">Initials:</span><span class="detail-value">' + match.initials + '</span></div>' +
        '<div class="detail-item"><span class="detail-label">Sex:</span><span class="detail-value">' + match.sex + '</span></div>' +
        '<div class="detail-item"><span class="detail-label">Relationship:</span><span class="detail-value">' + relationship + '</span></div>' +
        '<div class="detail-item"><span class="detail-label">DNA Shared:</span><span class="detail-value">' + dnaPercent + '%</span></div>' +
        '<div class="detail-item"><span class="detail-label">Segments:</span><span class="detail-value">' + match.num_segments + '</span></div>' +
        '<div class="detail-item"><span class="detail-label">Max Segment:</span><span class="detail-value">' + maxSegment + ' cM</span></div>' +
        '<div class="detail-item"><span class="detail-label">Maternal Side:</span><span class="detail-value">' + maternalSide + '</span></div>' +
        '<div class="detail-item"><span class="detail-label">Paternal Side:</span><span class="detail-value">' + paternalSide + '</span></div>' +
        '<div class="detail-item"><span class="detail-label">Opted In:</span><span class="detail-value">' + match.date_opted_in + '</span></div>' +
        '</div><div class="detail-card"><h3>Haplogroups</h3>' +
        '<div class="detail-item"><span class="detail-label">Y-DNA:</span><span class="detail-value">' + ydna + '</span></div>' +
        '<div class="detail-item"><span class="detail-label">mtDNA:</span><span class="detail-value">' + mtdna + '</span></div>' +
        '<div class="detail-item"><span class="detail-label">Compute Version:</span><span class="detail-value">' + computeVersion + '</span></div>' +
        '</div></div><div class="ancestry-content"><h3>Ancestry Composition</h3>' + ancestryHtml + '</div></div>';
    }

    // Render all matches initially
    function renderMatches() {
      console.log('renderMatches called');
      const tbody = document.getElementById('matchesBody');
      if (!tbody) {
        console.error('matchesBody element not found!');
        return;
      }
      tbody.innerHTML = '';

      console.log('Rendering', matchesData.length, 'matches');
      matchesData.forEach((match, index) => {
        const rowData = generateMatchRowClient(match, index);

        const tr = document.createElement('tr');
        tr.className = 'match-row';
        tr.dataset.index = index;
        tr.innerHTML = '<td class="name-cell">' + rowData.name + '</td>' +
          '<td class="relationship-cell">' + rowData.relationship + '</td>' +
          '<td class="dna-cell">' + rowData.dnaPercent + '%</td>' +
          '<td>' + rowData.segments + '</td>' +
          '<td>' + rowData.haplogroupHtml + '</td>' +
          '<td>' + rowData.computeBadge + '</td>' +
          '<td><span class="expand-icon">▶</span></td>';

        const detailTr = document.createElement('tr');
        detailTr.className = 'detail-row';
        detailTr.innerHTML = '<td colspan="7" class="detail-cell">' + generateDetailViewClient(match) + '</td>';

        tbody.appendChild(tr);
        tbody.appendChild(detailTr);
      });

      console.log('Finished rendering. Total rows:', tbody.children.length);

      // Add click handlers
      document.querySelectorAll('.match-row').forEach(row => {
        row.addEventListener('click', (e) => {
          if (e.target.tagName === 'A') return;

          const detailRow = row.nextElementSibling;
          const isExpanded = row.classList.contains('expanded');

          // Close all other rows
          document.querySelectorAll('.match-row.expanded').forEach(r => {
            r.classList.remove('expanded');
            r.nextElementSibling.classList.remove('show');
          });

          // Toggle this row
          if (!isExpanded) {
            row.classList.add('expanded');
            detailRow.classList.add('show');
          }
        });
      });
    }

    // Initial render
    renderMatches();

    // Search functionality
    document.getElementById('searchInput').addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      filterMatches();
    });

    // Compute filter
    document.getElementById('computeFilter').addEventListener('change', () => {
      filterMatches();
    });

    function filterMatches() {
      const searchTerm = document.getElementById('searchInput').value.toLowerCase();
      const computeFilter = document.getElementById('computeFilter').value;

      document.querySelectorAll('.match-row').forEach((row, index) => {
        const match = matchesData[index];
        const detailRow = row.nextElementSibling;

        const nameMatch = (match.first_name + ' ' + match.last_name).toLowerCase().includes(searchTerm) ||
                         match.initials.toLowerCase().includes(searchTerm) ||
                         match.predicted_relationship_id.toLowerCase().includes(searchTerm);

        let computeMatch = true;
        if (computeFilter === 'latest') {
          computeMatch = match.ancestry?.using_latest_compute === true;
        } else if (computeFilter === 'old') {
          computeMatch = match.ancestry?.using_latest_compute === false;
        }

        if (nameMatch && computeMatch) {
          row.style.display = '';
          detailRow.style.display = row.classList.contains('expanded') ? 'table-row' : 'none';
        } else {
          row.style.display = 'none';
          detailRow.style.display = 'none';
          row.classList.remove('expanded');
        }
      });
    }

    // Sorting functionality
    let currentSort = { column: null, ascending: true };

    document.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const column = th.dataset.sort;
        const ascending = currentSort.column === column ? !currentSort.ascending : true;
        currentSort = { column, ascending };

        sortMatches(column, ascending);
      });
    });

    function sortMatches(column, ascending) {
      const tbody = document.getElementById('matchesBody');
      const rows = Array.from(tbody.querySelectorAll('.match-row'));
      const detailRows = Array.from(tbody.querySelectorAll('.detail-row'));

      rows.sort((a, b) => {
        const indexA = parseInt(a.dataset.index);
        const indexB = parseInt(b.dataset.index);
        const matchA = matchesData[indexA];
        const matchB = matchesData[indexB];

        let valA, valB;

        switch(column) {
          case 'name':
            valA = (matchA.first_name + ' ' + matchA.last_name).toLowerCase();
            valB = (matchB.first_name + ' ' + matchB.last_name).toLowerCase();
            break;
          case 'relationship':
            valA = matchA.predicted_relationship_id;
            valB = matchB.predicted_relationship_id;
            break;
          case 'dna':
            valA = matchA.ibd_proportion;
            valB = matchB.ibd_proportion;
            break;
          case 'segments':
            valA = matchA.num_segments;
            valB = matchB.num_segments;
            break;
        }

        if (valA < valB) return ascending ? -1 : 1;
        if (valA > valB) return ascending ? 1 : -1;
        return 0;
      });

      // Clear and re-append in sorted order
      tbody.innerHTML = '';
      rows.forEach((row, i) => {
        const index = parseInt(row.dataset.index);
        tbody.appendChild(row);
        tbody.appendChild(detailRows[index]);
      });
    }
  </script>
</body>
</html>`;
}

function generateMatchRow(match, index) {
  const name = match.first_name && match.last_name ?
    match.first_name + ' ' + match.last_name :
    match.initials;

  const relationship = match.predicted_relationship_id.replace(/_/g, ' ');
  const dnaPercent = (match.ibd_proportion * 100).toFixed(2);

  const ydna = match.ancestry?.haplogroups?.ydna || '';
  const mtdna = match.ancestry?.haplogroups?.mtdna || '';

  const usingLatest = match.ancestry?.using_latest_compute;
  const computeBadge = usingLatest === true ?
    '<span class="badge latest">Latest</span>' :
    usingLatest === false ?
    '<span class="badge old">Old</span>' :
    '<span class="badge" style="background: #666;">Unknown</span>';

  const ydnaHtml = ydna ? '<span class="haplogroup ydna">Y: ' + ydna + '</span>' : '';
  const mtdnaHtml = mtdna ? '<span class="haplogroup mtdna">mt: ' + mtdna + '</span>' : '';
  const haplogroupHtml = !ydna && !mtdna ? '<span style="color: #666;">-</span>' : ydnaHtml + mtdnaHtml;

  return `
    <tr class="match-row" data-index="${index}">
      <td class="name-cell">${name}</td>
      <td class="relationship-cell">${relationship}</td>
      <td class="dna-cell">${dnaPercent}%</td>
      <td>${match.num_segments}</td>
      <td>${haplogroupHtml}</td>
      <td>${computeBadge}</td>
      <td><span class="expand-icon">▶</span></td>
    </tr>
    <tr class="detail-row">
      <td colspan="7" class="detail-cell">
        ${generateDetailView(match)}
      </td>
    </tr>
  `;
}

function generateDetailView(match) {
  const fullName = (match.first_name || '') + ' ' + (match.last_name || '');
  const relationship = match.predicted_relationship_id.replace(/_/g, ' ');
  const dnaPercent = (match.ibd_proportion * 100).toFixed(2);
  const maxSegment = match.max_segment_length.toFixed(2);
  const maternalSide = match.is_maternal_side === null ? 'Unknown' : match.is_maternal_side ? 'Yes' : 'No';
  const paternalSide = match.is_paternal_side === null ? 'Unknown' : match.is_paternal_side ? 'Yes' : 'No';
  const ydna = match.ancestry?.haplogroups?.ydna || 'N/A';
  const mtdna = match.ancestry?.haplogroups?.mtdna || 'N/A';
  const computeVersion = match.ancestry?.using_latest_compute === true ? 'Latest' : match.ancestry?.using_latest_compute === false ? 'Old' : 'Unknown';

  return `
    <div class="detail-content">
      <div class="detail-sidebar">
        <div class="detail-card">
          <h3>Match Information</h3>
          <div class="detail-item">
            <span class="detail-label">Full Name:</span>
            <span class="detail-value">${fullName}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Initials:</span>
            <span class="detail-value">${match.initials}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Sex:</span>
            <span class="detail-value">${match.sex}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Relationship:</span>
            <span class="detail-value">${relationship}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">DNA Shared:</span>
            <span class="detail-value">${dnaPercent}%</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Segments:</span>
            <span class="detail-value">${match.num_segments}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Max Segment:</span>
            <span class="detail-value">${maxSegment} cM</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Maternal Side:</span>
            <span class="detail-value">${maternalSide}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Paternal Side:</span>
            <span class="detail-value">${paternalSide}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Opted In:</span>
            <span class="detail-value">${match.date_opted_in}</span>
          </div>
        </div>

        <div class="detail-card">
          <h3>Haplogroups</h3>
          <div class="detail-item">
            <span class="detail-label">Y-DNA:</span>
            <span class="detail-value">${ydna}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">mtDNA:</span>
            <span class="detail-value">${mtdna}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Compute Version:</span>
            <span class="detail-value">${computeVersion}</span>
          </div>
        </div>
      </div>

      <div class="ancestry-content">
        <h3>Ancestry Composition</h3>
        ${generateAncestryView(match.ancestry)}
      </div>
    </div>
  `;
}

function generateAncestryView(ancestry) {
  if (!ancestry || !ancestry.regions) {
    return '<div class="no-ancestry">No ancestry data available</div>';
  }

  let html = '';

  for (const [regionName, regionArray] of Object.entries(ancestry.regions)) {
    regionArray.forEach(region => {
      html += `
        <div class="region-group">
          <div class="region-header">
            <span>${region.label}</span>
            <span class="region-percent">${region.totalPercent}%</span>
          </div>
      `;

      if (region.regions) {
        for (const [subRegionName, subRegionArray] of Object.entries(region.regions)) {
          subRegionArray.forEach(subRegion => {
            html += `
              <div class="subregion">
                <span class="subregion-name">${subRegion.label}</span>
                <span class="subregion-percent">${subRegion.totalPercent}%</span>
            `;

            if (subRegion.regions) {
              for (const [subSubRegionName, subSubRegionArray] of Object.entries(subRegion.regions)) {
                subSubRegionArray.forEach(subSubRegion => {
                  html += `
                    <div class="sub-subregion">
                      ${subSubRegion.label}: <strong>${subSubRegion.totalPercent}%</strong>
                    </div>
                  `;
                });
              }
            }

            html += '</div>';
          });
        }
      }

      html += '</div>';
    });
  }

  return html;
}
