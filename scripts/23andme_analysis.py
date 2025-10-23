#!/usr/bin/env python3
"""
Script to calculate average ancestry percentages for 23andMe DNA relatives
who have all 4 grandparent birth locations in a specified country/region.
"""

import json
import os
import sys
from collections import defaultdict
from typing import Dict, List, Any, Optional
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.colors import to_rgba


def has_all_grandparents_in_location(relative: Dict[str, Any], country_code: str) -> bool:
    """
    Check if a relative has all 4 grandparent birth locations in the specified country.

    Args:
        relative: Dictionary containing relative information
        country_code: Two-letter country code (e.g., 'PR', 'US', 'MX')

    Returns:
        bool: True if all 4 grandparents were born in the specified country, False otherwise
    """
    gp_locations = relative.get('grandparent_birth_locations', {})

    # Check if all 4 grandparent locations exist and are in the specified country
    required_gps = ['maternal_gma', 'maternal_gpa',
                    'paternal_gma', 'paternal_gpa']

    for gp in required_gps:
        gp_info = gp_locations.get(gp)
        if not gp_info or gp_info.get('country') != country_code:
            return False

    return True


def analyze_haplogroups(relatives: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyze Y-DNA and mtDNA haplogroups from relatives.

    Args:
        relatives: List of relative dictionaries

    Returns:
        Dict containing haplogroup analysis results
    """
    ydna_counts = defaultdict(int)
    mtdna_counts = defaultdict(int)
    ydna_relatives = []
    mtdna_relatives = []

    for relative in relatives:
        ancestry_data = relative.get('ancestry', {})
        haplogroups = ancestry_data.get('haplogroups', {})

        # Analyze Y-DNA (paternal line)
        ydna = haplogroups.get('ydna', '').strip()
        if ydna and ydna != '' and ydna != 'N/A':
            ydna_counts[ydna] += 1
            ydna_relatives.append({
                'initials': relative.get('initials', 'N/A'),
                'haplogroup': ydna,
                'relationship': relative.get('predicted_relationship_id', 'Unknown')
            })

        # Analyze mtDNA (maternal line)
        mtdna = haplogroups.get('mtdna', '').strip()
        if mtdna and mtdna != '' and mtdna != 'N/A':
            mtdna_counts[mtdna] += 1
            mtdna_relatives.append({
                'initials': relative.get('initials', 'N/A'),
                'haplogroup': mtdna,
                'relationship': relative.get('predicted_relationship_id', 'Unknown')
            })

    return {
        'ydna_counts': dict(ydna_counts),
        'mtdna_counts': dict(mtdna_counts),
        'ydna_relatives': ydna_relatives,
        'mtdna_relatives': mtdna_relatives,
        'total_ydna': len(ydna_relatives),
        'total_mtdna': len(mtdna_relatives)
    }


def extract_ancestry_colors(ancestry_data: Dict[str, Any]) -> Dict[str, str]:
    """
    Extract colors from ancestry data structure.

    Args:
        ancestry_data: Dictionary containing ancestry information

    Returns:
        Dict mapping ancestry region names to their colors
    """
    colors = {}

    def traverse_for_colors(regions_data: Dict[str, List[Dict]]):
        """Recursively traverse ancestry regions to extract colors."""
        for main_category, region_list in regions_data.items():
            for region in region_list:
                region_name = region.get('label', '')
                # Default gray if no color
                color = region.get('color', '#808080')

                if region_name:
                    colors[region_name] = color

                # Recursively process sub-regions
                sub_regions = region.get('regions', {})
                if sub_regions:
                    traverse_for_colors(sub_regions)

    # Start traversing from the main regions
    regions = ancestry_data.get('regions', {})
    traverse_for_colors(regions)

    return colors


def build_color_mapping(relatives: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Build a comprehensive color mapping from all relatives' ancestry data.

    Args:
        relatives: List of relative dictionaries

    Returns:
        Dict mapping ancestry region names to colors
    """
    all_colors = {}

    for relative in relatives:
        ancestry_data = relative.get('ancestry', {})
        if ancestry_data:
            relative_colors = extract_ancestry_colors(ancestry_data)
            all_colors.update(relative_colors)

    return all_colors


def create_haplogroup_charts(haplogroup_data: Dict[str, Any], location_label: str) -> List[str]:
    """
    Create bar charts for haplogroup distributions.

    Args:
        haplogroup_data: Results from analyze_haplogroups()
        location_label: Label for the location (e.g., 'Puerto Rico', 'Mexico')

    Returns:
        List of filenames of saved charts
    """
    chart_files = []

    # Y-DNA Chart
    if haplogroup_data['ydna_counts']:
        sorted_ydna = sorted(
            haplogroup_data['ydna_counts'].items(), key=lambda x: x[1], reverse=True)
        ydna_groups = [item[0] for item in sorted_ydna]
        ydna_counts = [item[1] for item in sorted_ydna]
        # Colors for Y-DNA (blues and greens for paternal)
        ydna_colors = ['#1f4e79', '#2e5a8a', '#3d659a', '#4c70aa', '#5b7bba',
                       '#2f7030', '#3f8040', '#4f9050', '#5fa060', '#6fb070']
        # Reverse for top-to-bottom display (highest counts at top)
        ydna_groups.reverse()
        ydna_counts.reverse()
        # Dynamically set figure height
        fig_height = max(8, 0.5 * len(ydna_groups))
        plt.figure(figsize=(12, fig_height))
        bars = plt.barh(ydna_groups, ydna_counts,
                        color=ydna_colors * ((len(ydna_groups) // len(ydna_colors)) + 1))
        # Add count labels
        for bar, count in zip(bars, ydna_counts):
            plt.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height()/2,
                     f'{count}', va='center', fontweight='bold')
        plt.xlabel('Number of Relatives', fontsize=12, fontweight='bold')
        plt.title(f'Y-DNA Haplogroup Distribution\nRelatives with 4 Grandparents Born in {location_label} (n={haplogroup_data["total_ydna"]})',
                  fontsize=14, fontweight='bold', pad=20)
        # Customize appearance
        plt.gca().spines['top'].set_visible(False)
        plt.gca().spines['right'].set_visible(False)
        plt.gca().spines['left'].set_visible(False)
        plt.grid(axis='x', alpha=0.3, linestyle='--')
        plt.tight_layout()
        ydna_filename = f'{location_label.lower().replace(" ", "_")}_ydna_haplogroups.png'
        plt.savefig(ydna_filename, dpi=300, bbox_inches='tight')
        plt.close()
        chart_files.append(ydna_filename)

    # mtDNA Chart
    if haplogroup_data['mtdna_counts']:
        sorted_mtdna = sorted(
            haplogroup_data['mtdna_counts'].items(), key=lambda x: x[1], reverse=True)
        mtdna_groups = [item[0] for item in sorted_mtdna]
        mtdna_counts = [item[1] for item in sorted_mtdna]
        # Colors for mtDNA (purples and reds for maternal)
        mtdna_colors = ['#7030a0', '#8040b0', '#9050c0', '#a060d0', '#b070e0',
                        '#c55a11', '#d56a21', '#e57a31', '#f58a41', '#ff9a51',
                        '#843c0c', '#944c1c', '#a45c2c', '#b46c3c', '#c47c4c',
                        '#2f5597', '#3f65a7', '#4f75b7', '#5f85c7', '#6f95d7']
        # Reverse for top-to-bottom display (highest counts at top)
        mtdna_groups.reverse()
        mtdna_counts.reverse()
        # Dynamically set figure height
        fig_height = max(10, 0.5 * len(mtdna_groups))
        plt.figure(figsize=(12, fig_height))
        bars = plt.barh(mtdna_groups, mtdna_counts,
                        color=mtdna_colors * ((len(mtdna_groups) // len(mtdna_colors)) + 1))
        # Add count labels
        for bar, count in zip(bars, mtdna_counts):
            plt.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height()/2,
                     f'{count}', va='center', fontweight='bold')
        plt.xlabel('Number of Relatives', fontsize=12, fontweight='bold')
        plt.title(f'mtDNA Haplogroup Distribution\nRelatives with 4 Grandparents Born in {location_label} (n={haplogroup_data["total_mtdna"]})',
                  fontsize=14, fontweight='bold', pad=20)
        # Customize appearance
        plt.gca().spines['top'].set_visible(False)
        plt.gca().spines['right'].set_visible(False)
        plt.gca().spines['left'].set_visible(False)
        plt.grid(axis='x', alpha=0.3, linestyle='--')
        plt.tight_layout()
        mtdna_filename = f'{location_label.lower().replace(" ", "_")}_mtdna_haplogroups.png'
        plt.savefig(mtdna_filename, dpi=300, bbox_inches='tight')
        plt.close()
        chart_files.append(mtdna_filename)

    return chart_files


def display_haplogroup_analysis(haplogroup_data: Dict[str, Any], total_relatives: int, output_lines: List[str]) -> None:
    """
    Display haplogroup analysis results.

    Args:
        haplogroup_data: Results from analyze_haplogroups()
        total_relatives: Total number of relatives analyzed
        output_lines: List to append output lines to
    """
    print("\n" + "="*60)
    print("HAPLOGROUP ANALYSIS")
    print("="*60)
    output_lines.append("\n" + "="*60)
    output_lines.append("HAPLOGROUP ANALYSIS")
    output_lines.append("="*60)

    # Y-DNA Analysis
    print(f"\n🧬 Y-DNA HAPLOGROUPS (Paternal Line)")
    print(
        f"Available data: {haplogroup_data['total_ydna']}/{total_relatives} relatives")
    print("-" * 40)
    output_lines.append(f"\n🧬 Y-DNA HAPLOGROUPS (Paternal Line)")
    output_lines.append(
        f"Available data: {haplogroup_data['total_ydna']}/{total_relatives} relatives")
    output_lines.append("-" * 40)

    # Sort Y-DNA by frequency
    sorted_ydna = sorted(
        haplogroup_data['ydna_counts'].items(), key=lambda x: x[1], reverse=True)

    if sorted_ydna:
        for haplogroup, count in sorted_ydna:
            percentage = (count / haplogroup_data['total_ydna']) * 100
            line = f"{haplogroup:<15} {count:>3} relatives ({percentage:>5.1f}%)"
            print(line)
            output_lines.append(line)

        # Show most common Y-DNA details
        if sorted_ydna:
            most_common_ydna = sorted_ydna[0][0]
            print(f"\nMost common Y-DNA: {most_common_ydna}")
            output_lines.append(f"\nMost common Y-DNA: {most_common_ydna}")

            # Show relatives with this haplogroup
            matching_relatives = [
                r for r in haplogroup_data['ydna_relatives'] if r['haplogroup'] == most_common_ydna]
            if len(matching_relatives) <= 5:
                for rel in matching_relatives:
                    rel_line = f"  • {rel['initials']} ({rel['relationship'].replace('_', ' ').title()})"
                    print(rel_line)
                    output_lines.append(rel_line)
            else:
                for rel in matching_relatives[:3]:
                    rel_line = f"  • {rel['initials']} ({rel['relationship'].replace('_', ' ').title()})"
                    print(rel_line)
                    output_lines.append(rel_line)
                more_line = f"  • ... and {len(matching_relatives) - 3} more"
                print(more_line)
                output_lines.append(more_line)
    else:
        no_data_line = "No Y-DNA data available"
        print(no_data_line)
        output_lines.append(no_data_line)

    # mtDNA Analysis
    print(f"\n🧬 mtDNA HAPLOGROUPS (Maternal Line)")
    print(
        f"Available data: {haplogroup_data['total_mtdna']}/{total_relatives} relatives")
    print("-" * 40)
    output_lines.append(f"\n🧬 mtDNA HAPLOGROUPS (Maternal Line)")
    output_lines.append(
        f"Available data: {haplogroup_data['total_mtdna']}/{total_relatives} relatives")
    output_lines.append("-" * 40)

    # Sort mtDNA by frequency
    sorted_mtdna = sorted(
        haplogroup_data['mtdna_counts'].items(), key=lambda x: x[1], reverse=True)

    if sorted_mtdna:
        for haplogroup, count in sorted_mtdna:
            percentage = (count / haplogroup_data['total_mtdna']) * 100
            line = f"{haplogroup:<15} {count:>3} relatives ({percentage:>5.1f}%)"
            print(line)
            output_lines.append(line)

        # Show most common mtDNA details
        if sorted_mtdna:
            most_common_mtdna = sorted_mtdna[0][0]
            print(f"\nMost common mtDNA: {most_common_mtdna}")
            output_lines.append(f"\nMost common mtDNA: {most_common_mtdna}")

            # Show relatives with this haplogroup
            matching_relatives = [
                r for r in haplogroup_data['mtdna_relatives'] if r['haplogroup'] == most_common_mtdna]
            if len(matching_relatives) <= 5:
                for rel in matching_relatives:
                    rel_line = f"  • {rel['initials']} ({rel['relationship'].replace('_', ' ').title()})"
                    print(rel_line)
                    output_lines.append(rel_line)
            else:
                for rel in matching_relatives[:3]:
                    rel_line = f"  • {rel['initials']} ({rel['relationship'].replace('_', ' ').title()})"
                    print(rel_line)
                    output_lines.append(rel_line)
                more_line = f"  • ... and {len(matching_relatives) - 3} more"
                print(more_line)
                output_lines.append(more_line)
    else:
        no_data_line = "No mtDNA data available"
        print(no_data_line)
        output_lines.append(no_data_line)


def extract_ancestry_percentages(ancestry_data: Dict[str, Any]) -> Dict[str, float]:
    """
    Extract ancestry percentages from the nested ancestry structure.

    Args:
        ancestry_data: Dictionary containing ancestry information

    Returns:
        Dict mapping ancestry region names to percentages
    """
    percentages = {}

    def traverse_regions(regions_data: Dict[str, List[Dict]], prefix: str = ""):
        """Recursively traverse ancestry regions to extract percentages."""
        for main_category, region_list in regions_data.items():
            for region in region_list:
                region_name = region.get('label', '')
                total_percent = region.get('totalPercent', '0')

                # Convert percentage string to float
                try:
                    percent_value = float(total_percent)
                    full_name = f"{prefix}{region_name}" if prefix else region_name
                    percentages[full_name] = percent_value
                except (ValueError, TypeError):
                    continue

                # Recursively process sub-regions
                sub_regions = region.get('regions', {})
                if sub_regions:
                    sub_prefix = f"{region_name} > " if region_name else ""
                    traverse_regions(sub_regions, sub_prefix)

    # Start traversing from the main regions
    regions = ancestry_data.get('regions', {})
    traverse_regions(regions)

    return percentages


def organize_ancestry_hierarchically(ancestry_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Organize ancestry data in a hierarchical structure for better display.

    Args:
        ancestry_data: Dictionary containing ancestry information

    Returns:
        Dict with hierarchical ancestry structure
    """
    hierarchy = {}

    def build_hierarchy(regions_data: Dict[str, List[Dict]], parent_dict: Dict):
        """Recursively build hierarchy from ancestry regions."""
        for main_category, region_list in regions_data.items():
            for region in region_list:
                region_name = region.get('label', '')
                total_percent = region.get('totalPercent', '0')

                try:
                    percent_value = float(total_percent)
                except (ValueError, TypeError):
                    percent_value = 0.0

                if region_name:
                    parent_dict[region_name] = {
                        'percentage': percent_value,
                        'children': {}
                    }

                    # Recursively process sub-regions
                    sub_regions = region.get('regions', {})
                    if sub_regions:
                        build_hierarchy(
                            sub_regions, parent_dict[region_name]['children'])

    # Start building from the main regions
    regions = ancestry_data.get('regions', {})
    build_hierarchy(regions, hierarchy)

    return hierarchy


def display_hierarchy(hierarchy: Dict[str, Any], indent: int = 0, output_lines: List[str] = None) -> List[str]:
    """
    Display ancestry hierarchy in a tree-like format with avg and max percentages.

    Args:
        hierarchy: Hierarchical ancestry data
        indent: Current indentation level
        output_lines: List to collect output lines

    Returns:
        List of formatted output lines
    """
    if output_lines is None:
        output_lines = []

    # Sort by percentage (descending)
    sorted_items = sorted(
        hierarchy.items(), key=lambda x: x[1]['percentage'], reverse=True)

    for region_name, data in sorted_items:
        percentage = data['percentage']
        max_percentage = data.get('max_percentage', percentage)

        if percentage > 0.1:  # Only show regions with > 0.1%
            prefix = "  " * indent
            if indent == 0:
                # Main categories
                line = f"{prefix}● {region_name:<40} avg: {percentage:>5.1f}%  max: {max_percentage:>5.1f}%"
            elif indent == 1:
                # Sub-categories
                line = f"{prefix}├─ {region_name:<37} avg: {percentage:>5.1f}%  max: {max_percentage:>5.1f}%"
            else:
                # Sub-sub-categories
                line = f"{prefix}└─ {region_name:<34} avg: {percentage:>5.1f}%  max: {max_percentage:>5.1f}%"

            print(line)
            output_lines.append(line)

            # Recursively display children
            children = data.get('children', {})
            if children:
                display_hierarchy(children, indent + 1, output_lines)

    return output_lines


def create_main_categories_bar_chart(hierarchy: Dict[str, Any], num_relatives: int, color_mapping: Dict[str, str], location_label: str) -> str:
    """
    Create a bar chart for main ancestry categories showing avg and max using actual 23andMe colors.

    Args:
        hierarchy: Hierarchical ancestry data
        num_relatives: Number of relatives in the analysis
        color_mapping: Mapping of region names to their actual colors

    Returns:
        str: Filename of the saved chart
    """
    # Extract main categories and their percentages
    categories = []
    avg_percentages = []
    max_percentages = []
    chart_colors = []

    # Sort by percentage (descending) and reverse for top-to-bottom display
    sorted_items = sorted(
        hierarchy.items(), key=lambda x: x[1]['percentage'], reverse=True)

    for i, (region_name, data) in enumerate(sorted_items):
        avg_percentage = data['percentage']
        max_percentage = data.get('max_percentage', avg_percentage)
        if avg_percentage > 0.5:  # Only show categories with > 0.5%
            categories.append(region_name)
            avg_percentages.append(avg_percentage)
            max_percentages.append(max_percentage)
            # Use actual color from data, fallback to default if not found
            chart_colors.append(color_mapping.get(region_name, '#808080'))

    # Reverse the lists to display from top to bottom (highest to lowest)
    categories.reverse()
    avg_percentages.reverse()
    max_percentages.reverse()
    chart_colors.reverse()

    # Create the figure with grouped bars
    fig, ax = plt.subplots(figsize=(14, 8))

    # Set up positions for grouped bars
    y_pos = range(len(categories))
    bar_height = 0.35

    # Create bars for average and maximum
    bars_avg = ax.barh([y - bar_height/2 for y in y_pos], avg_percentages,
                       bar_height, label='Average', color=chart_colors, alpha=0.8)
    bars_max = ax.barh([y + bar_height/2 for y in y_pos], max_percentages,
                       bar_height, label='Maximum', color=chart_colors, alpha=0.5)

    # Add percentage labels
    for bar, percentage in zip(bars_avg, avg_percentages):
        ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height()/2,
                f'{percentage:.1f}%', va='center', fontweight='bold', fontsize=9)

    for bar, percentage in zip(bars_max, max_percentages):
        ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height()/2,
                f'{percentage:.1f}%', va='center', fontsize=9, style='italic')

    # Customize appearance
    ax.set_yticks(y_pos)
    ax.set_yticklabels(categories)
    ax.set_xlabel('Percentage (%)', fontsize=12, fontweight='bold')
    ax.set_title(f'Main Ancestry Categories (Avg vs Max)\nRelatives with 4 Grandparents Born in {location_label} (n={num_relatives})',
                 fontsize=14, fontweight='bold', pad=20)
    ax.legend(loc='lower right', frameon=False)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_visible(False)
    ax.grid(axis='x', alpha=0.3, linestyle='--')
    plt.tight_layout()

    # Save the chart
    filename = f'{location_label.lower().replace(" ", "_")}_ancestry_main_categories.png'
    plt.savefig(filename, dpi=300, bbox_inches='tight')
    plt.close()

    return filename


def create_detailed_ancestry_chart(hierarchy: Dict[str, Any], num_relatives: int, color_mapping: Dict[str, str], location_label: str) -> str:
    """
    Create a detailed hierarchical chart showing all subcategories with avg and max using actual 23andMe colors.

    Args:
        hierarchy: Hierarchical ancestry data
        num_relatives: Number of relatives in the analysis
        color_mapping: Mapping of region names to their actual colors

    Returns:
        str: Filename of the saved chart
    """
    # First, count total items to determine appropriate figure size
    def count_items(hier_dict, level=0):
        count = 0
        sorted_items = sorted(hier_dict.items(), key=lambda x: x[1]['percentage'], reverse=True)
        for item_name, item_data in sorted_items:
            if item_data['percentage'] > 0.1:
                count += 1
                children = item_data.get('children', {})
                if children:
                    count += count_items(children, level + 1)
        return count

    total_items_count = count_items(hierarchy)

    # Dynamically set figure height based on number of items (0.4 inches per item, minimum 12)
    fig_height = max(12, total_items_count * 0.4)
    fig, ax = plt.subplots(figsize=(20, fig_height))

    # Collect all items in hierarchical order (matching text output exactly)
    all_items = []

    def add_hierarchy_items(hier_dict, level=0, parent_color='#808080'):
        """Recursively add all hierarchy items."""
        sorted_items = sorted(
            hier_dict.items(), key=lambda x: x[1]['percentage'], reverse=True)

        for item_name, item_data in sorted_items:
            avg_percentage = item_data['percentage']
            max_percentage = item_data.get('max_percentage', avg_percentage)

            # Show all items above 0.1% threshold (matching text output)
            if avg_percentage > 0.1:
                # Use actual color from mapping, fallback to parent color
                item_color = color_mapping.get(item_name, parent_color)

                all_items.append({
                    'level': level,
                    'name': item_name,
                    'avg_percentage': avg_percentage,
                    'max_percentage': max_percentage,
                    'color': item_color
                })

                # Recursively add children
                children = item_data.get('children', {})
                if children:
                    add_hierarchy_items(children, level + 1, item_color)

    # Sort main categories by percentage
    sorted_main = sorted(
        hierarchy.items(), key=lambda x: x[1]['percentage'], reverse=True)
    main_hierarchy = {name: data for name,
                      data in sorted_main if data['percentage'] > 0.5}

    # Add all hierarchy items
    add_hierarchy_items(main_hierarchy)

    # Calculate total height needed and assign positions from top to bottom
    total_items = len(all_items)
    y_positions = []
    labels = []

    for i, item in enumerate(all_items):
        y_pos = total_items - i - 1  # Reverse the order for top-to-bottom
        level = item['level']

        # Dynamically adjust sizes based on total items
        base_font_size = max(7, min(10, 200 / total_items))  # Scale down font for many items

        # Determine bar height and alpha based on level
        if level == 0:  # Main category
            bar_height = 0.7
            alpha_avg = 0.9
            alpha_max = 0.5
            font_weight = 'bold'
            font_size = base_font_size + 1
            label_font_size = base_font_size + 1
            prefix = "● "
        elif level == 1:  # Sub-category
            bar_height = 0.55
            alpha_avg = 0.8
            alpha_max = 0.4
            font_weight = 'normal'
            font_size = base_font_size
            label_font_size = base_font_size
            prefix = "  ├─ "
        else:  # Sub-sub-category
            bar_height = 0.45
            alpha_avg = 0.7
            alpha_max = 0.3
            font_weight = 'normal'
            font_size = base_font_size - 0.5
            label_font_size = base_font_size - 0.5
            prefix = "    └─ "

        # Draw bars for avg and max with better spacing (avg on top, max on bottom)
        ax.barh(y_pos + bar_height/3, item['avg_percentage'], color=item['color'],
                height=bar_height/2, alpha=alpha_avg)
        ax.barh(y_pos - bar_height/3, item['max_percentage'], color=item['color'],
                height=bar_height/2, alpha=alpha_max)

        # Add percentage labels with better positioning (avg on top, max on bottom)
        label_offset = max(1.5, item['avg_percentage'] * 0.02)
        ax.text(item['avg_percentage'] + label_offset, y_pos + bar_height/3,
                f"{item['avg_percentage']:.1f}%",
                va='center', fontweight=font_weight, fontsize=font_size,
                bbox=dict(boxstyle='round,pad=0.3', facecolor='white', edgecolor='none', alpha=0.7))
        ax.text(item['max_percentage'] + label_offset, y_pos - bar_height/3,
                f"{item['max_percentage']:.1f}%",
                va='center', fontsize=font_size-0.5, style='italic', alpha=0.9,
                bbox=dict(boxstyle='round,pad=0.3', facecolor='white', edgecolor='none', alpha=0.5))

        y_positions.append(y_pos)

        # Create label with appropriate indentation
        labels.append(f"{prefix}{item['name']}")

    # Customize the chart
    ax.set_yticks(y_positions)
    ax.set_yticklabels(labels, fontsize=max(7, base_font_size))
    ax.set_xlabel('Percentage (%)', fontsize=12, fontweight='bold')
    ax.set_title(f'Complete Ancestry Hierarchy (Avg vs Max)\nRelatives with 4 Grandparents Born in {location_label} (n={num_relatives})',
                 fontsize=14, fontweight='bold', pad=20)

    # Add legend
    from matplotlib.patches import Patch
    legend_elements = [
        Patch(facecolor='gray', alpha=0.8, label='Average'),
        Patch(facecolor='gray', alpha=0.4, label='Maximum')
    ]
    ax.legend(handles=legend_elements, loc='lower right', frameon=False)

    # Remove spines and add grid
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_visible(False)
    ax.grid(axis='x', alpha=0.3, linestyle='--')

    # Set appropriate margins to prevent label cutoff
    ax.set_ylim(-0.5, total_items - 0.5)
    ax.margins(y=0.01)  # Tight margins vertically

    # Adjust layout to accommodate all labels with dynamic left margin
    left_margin = min(0.35, max(0.25, 80 / fig.get_figwidth()))
    plt.subplots_adjust(left=left_margin, right=0.96, top=0.97, bottom=0.05)

    # Save the chart
    filename = f'{location_label.lower().replace(" ", "_")}_ancestry_complete_hierarchy.png'
    plt.savefig(filename, dpi=300, bbox_inches='tight')
    plt.close()

    return filename


def calculate_average_ancestry(json_file_path: str, country_code: str, location_label: str) -> None:
    """
    Calculate and display average ancestry for relatives with all grandparents in specified location.

    Args:
        json_file_path: Path to the 23andMe matches JSON file
        country_code: Two-letter country code (e.g., 'PR', 'US', 'MX')
        location_label: Display name for the location (e.g., 'Puerto Rico', 'Mexico')
    """
    print("Loading 23andMe matches data...")

    try:
        with open(json_file_path, 'r', encoding='utf-8') as file:
            relatives_data = json.load(file)
    except FileNotFoundError:
        print(f"Error: File not found at {json_file_path}")
        return
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON format - {e}")
        return

    print(f"Total relatives in dataset: {len(relatives_data)}")

    # Filter relatives with all grandparents in specified location AND using latest compute
    filtered_relatives = []
    hierarchy_sums = defaultdict(lambda: defaultdict(float))
    hierarchy_maxes = defaultdict(lambda: defaultdict(float))
    total_filtered_relatives = 0
    latest_compute_count = 0

    for relative in relatives_data:
        if has_all_grandparents_in_location(relative, country_code):
            total_filtered_relatives += 1

            # Check if using latest compute
            ancestry_data = relative.get('ancestry', {})
            using_latest_compute = ancestry_data.get(
                'using_latest_compute', False)

            if using_latest_compute:
                latest_compute_count += 1
                filtered_relatives.append(relative)

                if ancestry_data:
                    # Get hierarchical organization for this relative
                    hierarchy = organize_ancestry_hierarchically(ancestry_data)

                    # Add to running sums and track maximums for each level
                    def sum_hierarchy(hier_dict, path=""):
                        for region_name, data in hier_dict.items():
                            percentage = data['percentage']
                            hierarchy_sums[path][region_name] += percentage

                            # Track maximum percentage for this region
                            if percentage > hierarchy_maxes[path][region_name]:
                                hierarchy_maxes[path][region_name] = percentage

                            # Recursively sum children
                            children = data.get('children', {})
                            if children:
                                new_path = f"{path}/{region_name}" if path else region_name
                                sum_hierarchy(children, new_path)

                    sum_hierarchy(hierarchy)

    print(
        f"Relatives with all 4 grandparents born in {country_code}: {total_filtered_relatives}")
    print(
        f"Relatives with {country_code} grandparents AND using latest compute: {len(filtered_relatives)}")

    if len(filtered_relatives) == 0:
        print(f"No relatives found with all 4 grandparents born in {country_code} and using latest compute.")
        return

    # Calculate averages and create hierarchical structure
    output_lines = []

    print("\n" + "="*60)
    print(f"AVERAGE ANCESTRY PERCENTAGES FOR {location_label.upper()} RELATIVES (LATEST COMPUTE)")
    print("="*60)
    output_lines.append(
        f"AVERAGE ANCESTRY PERCENTAGES FOR {location_label.upper()} RELATIVES (LATEST COMPUTE)")
    output_lines.append("="*60)

    # Build average hierarchy with maximums
    average_hierarchy = {}

    # Calculate averages and maximums for main categories (level 0)
    for region_name, total_sum in hierarchy_sums[""].items():
        avg_percentage = total_sum / len(filtered_relatives)
        max_percentage = hierarchy_maxes[""][region_name]
        average_hierarchy[region_name] = {
            'percentage': avg_percentage,
            'max_percentage': max_percentage,
            'children': {}
        }

        # Calculate averages and maximums for sub-categories
        if region_name in hierarchy_sums:
            for sub_region, sub_total in hierarchy_sums[region_name].items():
                sub_avg = sub_total / len(filtered_relatives)
                sub_max = hierarchy_maxes[region_name][sub_region]
                average_hierarchy[region_name]['children'][sub_region] = {
                    'percentage': sub_avg,
                    'max_percentage': sub_max,
                    'children': {}
                }

                # Calculate averages and maximums for sub-sub-categories
                sub_path = f"{region_name}/{sub_region}"
                if sub_path in hierarchy_sums:
                    for subsub_region, subsub_total in hierarchy_sums[sub_path].items():
                        subsub_avg = subsub_total / len(filtered_relatives)
                        subsub_max = hierarchy_maxes[sub_path][subsub_region]
                        average_hierarchy[region_name]['children'][sub_region]['children'][subsub_region] = {
                            'percentage': subsub_avg,
                            'max_percentage': subsub_max,
                            'children': {}
                        }

    header_text = f"\nBased on {len(filtered_relatives)} relatives with all grandparents born in {country_code} and using latest compute:\n"
    print(header_text)
    output_lines.append(header_text)

    # Display hierarchical ancestry
    hierarchy_lines = display_hierarchy(average_hierarchy, 0, [])
    output_lines.extend(hierarchy_lines)

    # Calculate total percentage from main categories
    total_percentage = sum(data['percentage']
                           for data in average_hierarchy.values())

    # Add summary
    print(f"\n" + "-"*60)
    summary_line = f"Total main categories: {total_percentage:.1f}%"
    print(summary_line)
    output_lines.append(f"\n" + "-"*60)
    output_lines.append(summary_line)

    if abs(total_percentage - 100.0) < 1.0:
        status_line = "✓ Percentages approximately add up to 100%"
    else:
        status_line = f"⚠ Note: Total exceeds 100% due to overlapping subcategories"

    print(status_line)
    output_lines.append(status_line)

    # Analyze haplogroups (needed for chart generation)
    haplogroup_data = analyze_haplogroups(filtered_relatives)

    # Generate bar chart visualizations
    print(f"\n" + "="*60)
    print("GENERATING ANCESTRY VISUALIZATIONS")
    print("="*60)

    try:
        # Build color mapping from actual 23andMe data
        color_mapping = build_color_mapping(filtered_relatives)

        # Create main categories bar chart
        main_chart_file = create_main_categories_bar_chart(
            average_hierarchy, len(filtered_relatives), color_mapping, location_label)
        print(f"✓ Main categories chart saved: {main_chart_file}")

        # Create detailed breakdown chart
        detailed_chart_file = create_detailed_ancestry_chart(
            average_hierarchy, len(filtered_relatives), color_mapping, location_label)
        print(f"✓ Detailed breakdown chart saved: {detailed_chart_file}")

        # Create haplogroup charts
        haplogroup_chart_files = create_haplogroup_charts(haplogroup_data, location_label)
        for chart_file in haplogroup_chart_files:
            print(f"✓ Haplogroup chart saved: {chart_file}")

        output_lines.append(f"\n" + "="*60)
        output_lines.append("CHARTS GENERATED:")
        output_lines.append(f"✓ Main categories: {main_chart_file}")
        output_lines.append(f"✓ Detailed breakdown: {detailed_chart_file}")
        for chart_file in haplogroup_chart_files:
            output_lines.append(f"✓ Haplogroup chart: {chart_file}")

    except ImportError:
        error_msg = "⚠ matplotlib not installed. Run: pip install matplotlib"
        print(error_msg)
        output_lines.append(f"\n{error_msg}")
    except Exception as e:
        error_msg = f"✗ Error creating charts: {e}"
        print(error_msg)
        output_lines.append(f"\n{error_msg}")

    # Display haplogroup analysis
    display_haplogroup_analysis(
        haplogroup_data, len(filtered_relatives), output_lines)

    # Show some details about the relatives
    print("\n" + "-"*60)
    print("RELATIVE DETAILS:")
    print("-"*60)
    output_lines.append("\n" + "-"*60)
    output_lines.append("RELATIVE DETAILS:")
    output_lines.append("-"*60)

    for i, relative in enumerate(filtered_relatives[:10], 1):  # Show first 10
        initials = relative.get('initials', 'N/A')
        relationship = relative.get(
            'predicted_relationship_id', 'Unknown').replace('_', ' ').title()
        ibd = relative.get('ibd_proportion', 0) * 100
        line = f"{i:2d}. {initials:<4} - {relationship:<25} (IBD: {ibd:.1f}%)"
        print(line)
        output_lines.append(line)

    if len(filtered_relatives) > 10:
        line = f"... and {len(filtered_relatives) - 10} more relatives"
        print(line)
        output_lines.append(line)

    # Save results to text file
    output_file = f"{location_label.lower().replace(' ', '_')}_ancestry_hierarchical_results.txt"
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(output_lines))
        print(f"\n✓ Results saved to: {output_file}")
    except Exception as e:
        print(f"\n✗ Error saving to file: {e}")


def get_json_files_in_directory():
    """Get list of JSON files in the current directory."""
    return [f for f in os.listdir('.') if f.endswith('.json')]


def select_json_file():
    """Interactively select a JSON file from available options."""
    json_files = get_json_files_in_directory()

    if not json_files:
        print("No JSON files found in the current directory.")
        manual_path = input("Enter the full path to your JSON file: ").strip()
        if os.path.exists(manual_path):
            return manual_path
        else:
            print(f"Error: File not found at {manual_path}")
            sys.exit(1)

    print("\nAvailable JSON files:")
    print("=" * 50)
    for i, filename in enumerate(json_files, 1):
        file_size = os.path.getsize(filename)
        size_kb = file_size / 1024
        print(f"{i}. {filename} ({size_kb:.1f} KB)")

    print(f"{len(json_files) + 1}. Enter custom path")

    while True:
        try:
            choice = input(f"\nSelect a file (1-{len(json_files) + 1}): ").strip()
            choice_num = int(choice)

            if 1 <= choice_num <= len(json_files):
                return json_files[choice_num - 1]
            elif choice_num == len(json_files) + 1:
                manual_path = input("Enter the full path to your JSON file: ").strip()
                if os.path.exists(manual_path):
                    return manual_path
                else:
                    print(f"Error: File not found at {manual_path}")
                    continue
            else:
                print(f"Please enter a number between 1 and {len(json_files) + 1}")
        except ValueError:
            print("Please enter a valid number")
        except KeyboardInterrupt:
            print("\n\nOperation cancelled by user")
            sys.exit(0)


def analyze_grandparent_locations(relatives_data):
    """
    Analyze all grandparent locations in the dataset and count matches.

    Args:
        relatives_data: List of relative dictionaries from JSON

    Returns:
        Dict mapping country codes to match counts and location names
    """
    from collections import Counter

    location_counts = Counter()
    location_names = {}  # Store full location names

    for relative in relatives_data:
        gp_locations = relative.get('grandparent_birth_locations', {})
        required_gps = ['maternal_gma', 'maternal_gpa', 'paternal_gma', 'paternal_gpa']

        # Check if all 4 grandparents exist
        all_gps_present = all(gp in gp_locations and gp_locations[gp] for gp in required_gps)

        if all_gps_present:
            # Get all country codes
            countries = [gp_locations[gp].get('country') for gp in required_gps]

            # Check if all 4 are the same
            if len(set(countries)) == 1 and countries[0]:
                country_code = countries[0]
                location_counts[country_code] += 1

                # Try to get full location name from first grandparent
                if country_code not in location_names:
                    gp_info = gp_locations[required_gps[0]]
                    # Try to get location name (city, state, or country name)
                    location_name = gp_info.get('location', country_code)
                    location_names[country_code] = location_name

    return location_counts, location_names


def get_location_input(relatives_data):
    """
    Get country code and location label from user based on available data.

    Args:
        relatives_data: List of relative dictionaries from JSON

    Returns:
        Tuple of (country_code, location_label)
    """
    print("\n" + "=" * 50)
    print("GRANDPARENT LOCATION FILTER")
    print("=" * 50)
    print("\nAnalyzing grandparent locations in your data...")

    location_counts, location_names = analyze_grandparent_locations(relatives_data)

    if not location_counts:
        print("\nNo relatives found with all 4 grandparents from the same location.")
        print("Please check your data.")
        sys.exit(1)

    # Sort by count (descending)
    sorted_locations = sorted(location_counts.items(), key=lambda x: x[1], reverse=True)

    print(f"\nFound relatives with all 4 grandparents from these locations:")
    print("-" * 50)

    for i, (country_code, count) in enumerate(sorted_locations, 1):
        location_display = location_names.get(country_code, country_code)
        print(f"{i}. {country_code:3} - {count:4} matches ({location_display})")

    print(f"{len(sorted_locations) + 1}. Enter custom country code")

    while True:
        try:
            choice = input(f"\nSelect a location (1-{len(sorted_locations) + 1}): ").strip()
            choice_num = int(choice)

            if 1 <= choice_num <= len(sorted_locations):
                country_code = sorted_locations[choice_num - 1][0]

                # Ask if user wants to customize the display name
                default_label = location_names.get(country_code, country_code)
                custom = input(f"Display name [{default_label}]: ").strip()
                location_label = custom if custom else default_label

                return country_code, location_label

            elif choice_num == len(sorted_locations) + 1:
                country_code = input("Enter country code (2 letters): ").strip().upper()
                if len(country_code) == 2 and country_code.isalpha():
                    location_label = input("Display name for location: ").strip()
                    if not location_label:
                        location_label = country_code
                    return country_code, location_label
                else:
                    print("Please enter a valid 2-letter country code")
                    continue
            else:
                print(f"Please enter a number between 1 and {len(sorted_locations) + 1}")
        except ValueError:
            print("Please enter a valid number")
        except KeyboardInterrupt:
            print("\n\nOperation cancelled by user")
            sys.exit(0)


if __name__ == "__main__":
    print("=" * 50)
    print("23andMe Ancestry Calculator by Grandparent Location")
    print("=" * 50)

    # Select JSON file
    json_file = select_json_file()
    print(f"\nSelected file: {json_file}")

    # Load the JSON data
    print("\nLoading JSON data...")
    try:
        with open(json_file, 'r', encoding='utf-8') as file:
            relatives_data = json.load(file)
        print(f"Loaded {len(relatives_data)} relatives from file")
    except FileNotFoundError:
        print(f"Error: File not found at {json_file}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON format - {e}")
        sys.exit(1)

    # Get location filter based on the actual data
    country_code, location_label = get_location_input(relatives_data)

    print(f"\nFiltering for relatives with all 4 grandparents born in {country_code} ({location_label})")
    print("=" * 50)

    # Run the analysis
    calculate_average_ancestry(json_file, country_code, location_label)
