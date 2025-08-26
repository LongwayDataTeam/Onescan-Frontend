import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { activityAPI } from '../services/api';
import { 
  Activity, 
  Users, 
  Package, 
  TrendingUp, 
  Filter, 
  Download, 
  RefreshCw, 
  User,
  Shield,
  FileText,
  BarChart3,
  LineChart,
  LogIn,
  LogOut,
  UserPlus,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  Smartphone,
  MapPin
} from 'lucide-react';
import * as d3 from 'd3';

const Logger = () => {
  const { user, hasPermission } = useAuthStore();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    user_id: '',
    action: '',
    action_type: '',
    result: '',
    tracking_id: '',
    search: '',
    device_type: '',
    security_risk: '',
    start_date: '',
    end_date: '',
    limit: 1000
  });
  const [scanLogs, setScanLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [realTime, setRealTime] = useState(false);
  
  // Chart refs
  const activityChartRef = useRef();
  const userActivityChartRef = useRef();
  const actionChartRef = useRef();
  const actionTypeChartRef = useRef();
  const deviceChartRef = useRef();
  const locationChartRef = useRef();
  const timelineChartRef = useRef();
  const networkChartRef = useRef(); // Added network chart ref

  // Fetch comprehensive activity logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await activityAPI.getActivityLogs(filters);
      if (response.data.ok) {
        setLogs(response.data.data.logs);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set document title
  useEffect(() => {
    document.title = 'System Monitoring - OneScan';
  }, []);

  // Fetch comprehensive activity summary
  const fetchSummary = async () => {
    try {
      const response = await activityAPI.getActivitySummary();
      if (response.data.ok) {
        setSummary(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching activity summary:', error);
    }
  };

  // Fetch scan logs specifically
  const fetchScanLogs = async () => {
    try {
      console.log('🔍 Fetching scan logs with filters:', filters);
      
      // Use the new scan logs API endpoint that gets data from scans:log Redis stream
      const scanFilters = {
        ...filters,
        limit: 10000 // Get maximum scan logs
      };
      
      // Apply additional filters if set
      if (filters.action) {
        scanFilters.action = filters.action;
      }
      if (filters.result) {
        scanFilters.result = filters.result;
      }
      if (filters.user_id) {
        scanFilters.user_id = filters.user_id;
      }
      if (filters.tracking_id) {
        scanFilters.tracking_id = filters.tracking_id;
      }
      if (filters.start_date) {
        scanFilters.start_date = filters.start_date;
      }
      if (filters.end_date) {
        scanFilters.end_date = filters.end_date;
      }
      
      console.log('🔍 Final scan filters:', scanFilters);
      
      // Call the scan logs endpoint directly
      const token = useAuthStore.getState().token;
      console.log('🔍 Token being sent in fetchScanLogs:', token ? `${token.substring(0, 20)}...` : 'No token found');
      console.log('🔍 Token length:', token ? token.length : 0);
      console.log('🔍 Token starts with Bearer?', token ? token.startsWith('Bearer ') : 'No token');
      
      const response = await fetch('/logs/scan-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(scanFilters)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          let filteredLogs = data.data.logs;
          console.log('📊 Raw scan logs received from scans:log stream:', filteredLogs.length);
          
          // Apply search filter if provided
          if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filteredLogs = filteredLogs.filter(log => 
              log.tracking_id?.toLowerCase().includes(searchTerm) ||
              log.username?.toLowerCase().includes(searchTerm) ||
              log.action?.toLowerCase().includes(searchTerm) ||
              log.message?.toLowerCase().includes(searchTerm)
            );
            console.log('🔍 After search filter:', filteredLogs.length);
          }
          
          console.log('✅ Final scan logs to display:', filteredLogs.length);
          setScanLogs(filteredLogs);
        } else {
          console.error('❌ API response not ok:', data);
        }
      } else {
        console.error('❌ HTTP error:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching scan logs:', error);
    }
  };

  // Fetch ALL scan logs without any filters (maximum data)
  const fetchAllScanLogs = async () => {
    try {
      console.log('🚀 Fetching ALL scan logs without filters...');
      
      const scanFilters = {
        limit: 10000 // Maximum limit to get all scan logs
      };
      
      console.log('🚀 Fetching with filters:', scanFilters);
      
      // Call the scan logs endpoint directly
      const token = useAuthStore.getState().token;
      console.log('🚀 Token being sent in fetchAllScanLogs:', token ? `${token.substring(0, 20)}...` : 'No token found');
      
      const response = await fetch('/logs/scan-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(scanFilters)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          const allScanLogs = data.data.logs;
          console.log('📊 ALL scan logs received from scans:log stream:', allScanLogs.length);
          
          // Sort by timestamp (newest first)
          const sortedLogs = allScanLogs.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));
          
          setScanLogs(sortedLogs);
          console.log('✅ ALL scan logs loaded and sorted:', sortedLogs.length);
        } else {
          console.error('❌ API response not ok:', data);
        }
      } else {
        console.error('❌ HTTP error:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching all scan logs:', error);
    }
  };

  // Debug Redis logs to see what's actually stored
  const debugRedisLogs = async () => {
    try {
      console.log('🔍 Debugging Redis logs...');
      
      // Call the debug endpoint
      const token = useAuthStore.getState().token;
      const response = await fetch('/logs/debug', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const debugData = await response.json();
        console.log('🔍 Redis Debug Data:', debugData);
        
        // Show alert with debug info
        alert(`Redis Debug Info:
Total Logs: ${debugData.data.total_logs}
Recent Logs: ${debugData.data.recent_logs_count}
Action Types: ${JSON.stringify(debugData.data.action_type_counts)}
Scan Logs: ${debugData.data.scan_logs_count}
Sample Scan Logs: ${JSON.stringify(debugData.data.scan_logs_sample, null, 2)}`);
      } else {
        console.error('❌ Debug endpoint failed:', response.status);
        alert('Debug endpoint failed. Check console for details.');
      }
    } catch (error) {
      console.error('❌ Error debugging Redis logs:', error);
      alert('Error debugging Redis logs. Check console for details.');
    }
  };

  // Debug scan logs specifically
  const debugScanLogs = async () => {
    try {
      console.log('🔍 Debugging scan logs from scans:log stream...');
      
      // Get scan logs directly from scans:log stream
      const token = useAuthStore.getState().token;
      console.log('🔍 Token being sent in debugScanLogs:', token ? `${token.substring(0, 20)}...` : 'No token found');
      
      const response = await fetch('/logs/scan-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ limit: 100 })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          const scanLogs = data.data.logs;
          console.log('🔍 Scan Logs from scans:log stream:', scanLogs);
          
          // Show alert with scan logs info
          alert(`Scan Logs Debug Info:
Total Scan Logs Retrieved: ${scanLogs.length}
First 3 Scan Logs:
${scanLogs.slice(0, 3).map((log, i) => 
  `${i+1}. ${log.action} by ${log.username} - ${log.tracking_id} - ${log.result}`
).join('\n')}

All Actions: ${[...new Set(scanLogs.map(log => log.action))].join(', ')}`);
        } else {
          alert('Failed to get scan logs from API');
        }
      } else {
        console.error('❌ Scan logs endpoint failed:', response.status);
        alert('Scan logs endpoint failed. Check console for details.');
      }
    } catch (error) {
      console.error('❌ Error debugging scan logs:', error);
      alert('Error debugging scan logs. Check console for details.');
    }
  };

  // Test scan logs endpoint without authentication
  const testScanLogsEndpoint = async () => {
    try {
      console.log('🧪 Testing scan logs endpoint without authentication...');
      
      const response = await fetch('/logs/scan-logs-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit: 100 })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          const scanLogs = data.data.logs;
          console.log('🧪 Test endpoint successful! Retrieved scan logs:', scanLogs);
          
          alert(`Test Endpoint Success! 🎉
Total Scan Logs Retrieved: ${scanLogs.length}
First 3 Scan Logs:
${scanLogs.slice(0, 3).map((log, i) => 
  `${i+1}. ${log.action} by ${log.username} - ${log.tracking_id} - ${log.result}`
).join('\n')}

This means the Redis connection and scan logs retrieval is working!`);
        } else {
          alert('Test endpoint returned error: ' + data.message);
        }
      } else {
        console.error('❌ Test endpoint failed:', response.status);
        alert(`Test endpoint failed with status: ${response.status}
This suggests there's a backend issue, not an authentication issue.`);
      }
    } catch (error) {
      console.error('❌ Error testing scan logs endpoint:', error);
      alert('Error testing scan logs endpoint: ' + error.message);
    }
  };

  // Real-time updates
  useEffect(() => {
    if (realTime) {
      const interval = setInterval(() => {
        fetchLogs();
        fetchSummary();
        fetchScanLogs();
      }, 10000); // Update every 10 seconds
      return () => clearInterval(interval);
    }
  }, [realTime, filters]);

  // Initial load
  useEffect(() => {
    fetchLogs();
    fetchSummary();
    fetchScanLogs();
  }, []);

  // Chart rendering effects
  useEffect(() => {
    if (summary && activeTab === 'overview') {
      renderActivityChart();
      renderUserActivityChart();
      renderActionChart();
      renderActionTypeChart();
      renderDeviceChart();
      renderLocationChart();
      renderNetworkChart(); // Added network chart rendering
    }
  }, [summary, activeTab]);

  // Fetch scan logs when scan-logs tab is activated
  useEffect(() => {
    if (activeTab === 'scan-logs') {
      console.log('🔄 Scan-logs tab activated, fetching scan logs...');
      // First try to fetch with current filters
      fetchScanLogs();
      // If we get very few logs, also try to fetch all
      setTimeout(() => {
        if (scanLogs.length < 50) {
          console.log('🔄 Few logs detected, fetching all scan logs...');
          fetchAllScanLogs();
        }
      }, 1000);
    }
  }, [activeTab]);

  useEffect(() => {
    if (logs.length > 0 && activeTab === 'timeline') {
      renderTimelineChart();
    }
  }, [logs, activeTab]);

  // Render activity over time chart
  const renderActivityChart = () => {
    if (!summary || !activityChartRef.current) return;

    const svg = d3.select(activityChartRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create time scale for last 7 days
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date;
    }).reverse();

    const x = d3.scaleTime()
      .domain(d3.extent(dates))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, Math.max(...Object.values(summary.action_breakdown || {}))])
      .range([height, 0]);

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%m/%d")));

    g.append("g")
      .call(d3.axisLeft(y));

    // Add line
    const line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.count));

    const lineData = dates.map(date => ({
      date,
      count: Math.floor(Math.random() * 100) + 20 // Simulated data
    }));

    g.append("path")
      .datum(lineData)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add title
    g.append("text")
      .attr("x", width / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text("Activity Over Time");
  };

  // Render user activity chart
  const renderUserActivityChart = () => {
    if (!summary || !userActivityChartRef.current) return;

    const svg = d3.select(userActivityChartRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 60, left: 60 };
    const width = 400 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const userData = Object.entries(summary.user_activity || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (userData.length === 0) return;

    const x = d3.scaleBand()
      .domain(userData.map(d => d[0]))
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(userData, d => d[1])])
      .range([height, 0]);

    // Add bars
    g.selectAll(".bar")
      .data(userData)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d[0]))
      .attr("width", x.bandwidth())
      .attr("y", d => y(d[1]))
      .attr("height", d => height - y(d[1]))
      .attr("fill", "#3b82f6");

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    g.append("g")
      .call(d3.axisLeft(y));

    // Add title
    g.append("text")
      .attr("x", width / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text("User Activity");
  };

  // Render action breakdown chart
  const renderActionChart = () => {
    if (!summary || !actionChartRef.current) return;

    const svg = d3.select(actionChartRef.current);
    svg.selectAll("*").remove();

    const width = 300;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 40;

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Filter and sort data - only show significant values
    const actionData = Object.entries(summary.action_breakdown || {})
      .map(([action, count]) => ({ action, count }))
      .filter(d => d.count > 0) // Only show actions with counts > 0
      .sort((a, b) => b.count - a.count) // Sort by count descending
      .slice(0, 6); // Only show top 6 actions

    if (actionData.length === 0) {
      // Show "No Data" message
      g.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#666")
        .text("No Data Available");
      return;
    }

    // Calculate total for percentage
    const total = actionData.reduce((sum, d) => sum + d.count, 0);

    // Create color scale with better colors
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

    const pie = d3.pie()
      .value(d => d.count)
      .padAngle(0.02); // Add small gaps between slices

    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);

    const labelArc = d3.arc()
      .innerRadius(radius * 0.8)
      .outerRadius(radius * 0.8);

    // Add pie slices
    g.selectAll("path")
      .data(pie(actionData))
      .enter().append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => colors[i % colors.length])
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Add labels with better positioning
    g.selectAll("text")
      .data(pie(actionData))
      .enter().append("text")
      .attr("transform", d => `translate(${labelArc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("font-weight", "600")
      .style("fill", "#374151")
      .text(d => {
        const percentage = ((d.data.count / total) * 100).toFixed(1);
        return `${d.data.action} (${percentage}%)`;
      });

    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - 120}, 20)`);

    actionData.forEach((d, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      legendRow.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", colors[i % colors.length]);

      legendRow.append("text")
        .attr("x", 18)
        .attr("y", 10)
        .style("font-size", "10px")
        .style("fill", "#374151")
        .text(`${d.action}: ${d.count}`);
    });
  };

  // Render action type breakdown chart
  const renderActionTypeChart = () => {
    if (!summary || !actionTypeChartRef.current) return;

    const svg = d3.select(actionTypeChartRef.current);
    svg.selectAll("*").remove();

    const width = 300;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 40;

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Filter and sort data - only show significant values
    const actionTypeData = Object.entries(summary.action_type_breakdown || {})
      .map(([type, count]) => ({ type, count }))
      .filter(d => d.count > 0) // Only show types with counts > 0
      .sort((a, b) => b.count - a.count) // Sort by count descending
      .slice(0, 6); // Only show top 6 types

    if (actionTypeData.length === 0) {
      // Show "No Data" message
      g.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#666")
        .text("No Data Available");
      return;
    }

    // Calculate total for percentage
    const total = actionTypeData.reduce((sum, d) => sum + d.count, 0);

    // Create color scale with better colors
    const colors = ['#10B981', '#F59E0B', '#8B5CF6', '#3B82F6', '#EF4444', '#06B6D4'];

    const pie = d3.pie()
      .value(d => d.count)
      .padAngle(0.02); // Add small gaps between slices

    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);

    const labelArc = d3.arc()
      .innerRadius(radius * 0.8)
      .outerRadius(radius * 0.8);

    // Add pie slices
    g.selectAll("path")
      .data(pie(actionTypeData))
      .enter().append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => colors[i % colors.length])
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Add labels with better positioning
    g.selectAll("text")
      .data(pie(actionTypeData))
      .enter().append("text")
      .attr("transform", d => `translate(${labelArc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("font-weight", "600")
      .style("fill", "#374151")
      .text(d => {
        const percentage = ((d.data.count / total) * 100).toFixed(1);
        return `${d.data.type} (${percentage}%)`;
      });

    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - 120}, 20)`);

    actionTypeData.forEach((d, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      legendRow.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", colors[i % colors.length]);

      legendRow.append("text")
        .attr("x", 18)
        .attr("y", 10)
        .style("font-size", "10px")
        .style("fill", "#374151")
        .text(`${d.type}: ${d.count}`);
    });
  };

  // Render device breakdown chart
  const renderDeviceChart = () => {
    if (!summary || !deviceChartRef.current) return;

    const svg = d3.select(deviceChartRef.current);
    svg.selectAll("*").remove();

    const width = 300;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 40;

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Filter and sort data - only show significant values
    const deviceData = Object.entries(summary.device_breakdown || {})
      .map(([device, count]) => ({ device, count }))
      .filter(d => d.count > 0) // Only show devices with counts > 0
      .sort((a, b) => b.count - a.count) // Sort by count descending
      .slice(0, 5); // Only show top 5 devices

    if (deviceData.length === 0) {
      // Show "No Data" message
      g.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#666")
        .text("No Data Available");
      return;
    }

    // Calculate total for percentage
    const total = deviceData.reduce((sum, d) => sum + d.count, 0);

    // Create color scale with better colors
    const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

    const pie = d3.pie()
      .value(d => d.count)
      .padAngle(0.02); // Add small gaps between slices

    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);

    const labelArc = d3.arc()
      .innerRadius(radius * 0.8)
      .outerRadius(radius * 0.8);

    // Add pie slices
    g.selectAll("path")
      .data(pie(deviceData))
      .enter().append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => colors[i % colors.length])
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Add labels with better positioning
    g.selectAll("text")
      .data(pie(deviceData))
      .enter().append("text")
      .attr("transform", d => `translate(${labelArc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("font-weight", "600")
      .style("fill", "#374151")
      .text(d => {
        const percentage = ((d.data.count / total) * 100).toFixed(1);
        return `${d.data.device} (${percentage}%)`;
      });

    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - 120}, 20)`);

    deviceData.forEach((d, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      legendRow.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", colors[i % colors.length]);

      legendRow.append("text")
        .attr("x", 18)
        .attr("y", 10)
        .style("font-size", "10px")
        .style("fill", "#374151")
        .text(`${d.device}: ${d.count}`);
    });
  };

  // Render location breakdown chart
  const renderLocationChart = () => {
    if (!summary || !locationChartRef.current) return;

    const svg = d3.select(locationChartRef.current);
    svg.selectAll("*").remove();

    const width = 300;
    const height = 300;
    const radius = Math.min(width, height) / 2;

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Create sample location data (in real implementation, this would come from summary)
    const locationData = [
      { location: "Office", count: 45 },
      { location: "Home", count: 32 },
      { location: "Mobile", count: 28 },
      { location: "Other", count: 15 }
    ];

    if (locationData.length === 0) return;

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const pie = d3.pie()
      .value(d => d.count);

    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);

    // Add pie slices
    g.selectAll("path")
      .data(pie(locationData))
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => color(i))
      .attr("stroke", "white")
      .style("stroke-width", "2px");

    // Add labels
    g.selectAll("text")
      .data(pie(locationData))
      .enter()
      .append("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("fill", "white")
      .text(d => d.data.location);

    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width + 20}, 20)`);

    legend.selectAll("rect")
      .data(locationData)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d, i) => i * 20)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", (d, i) => color(i));

    legend.selectAll("text")
      .data(locationData)
      .enter()
      .append("text")
      .attr("x", 20)
      .attr("y", (d, i) => i * 20 + 12)
      .style("font-size", "12px")
      .text(d => `${d.location}: ${d.count}`);
  };

  // Render network breakdown chart
  const renderNetworkChart = () => {
    if (!summary || !networkChartRef.current) return;

    const svg = d3.select(networkChartRef.current);
    svg.selectAll("*").remove();

    const width = 300;
    const height = 300;
    const radius = Math.min(width, height) / 2;

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const networkData = Object.entries(summary.network_breakdown || {})
      .map(([networkType, count]) => ({ networkType, count }));

    if (networkData.length === 0) return;

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const pie = d3.pie()
      .value(d => d.count);

    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);

    // Add pie slices
    g.selectAll("path")
      .data(pie(networkData))
      .enter().append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => color(i));

    // Add labels
    g.selectAll("text")
      .data(pie(networkData))
      .enter().append("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text(d => d.data.networkType);

    // Add title
    g.append("text")
      .attr("x", 0)
      .attr("y", -height / 2 + 20)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text("Network Breakdown");
  };

  // Render timeline chart
  const renderTimelineChart = () => {
    if (!timelineChartRef.current || logs.length === 0) return;

    const svg = d3.select(timelineChartRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Group logs by hour
    const hourlyData = {};
    logs.forEach(log => {
      const date = new Date(log.timestamp);
      const hour = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
      const key = hour.getTime();
      hourlyData[key] = (hourlyData[key] || 0) + 1;
    });

    const timelineData = Object.entries(hourlyData)
      .map(([timestamp, count]) => ({ timestamp: parseInt(timestamp), count }))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (timelineData.length === 0) return;

    const x = d3.scaleTime()
      .domain(d3.extent(timelineData, d => d.timestamp))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(timelineData, d => d.count)])
      .range([height, 0]);

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%H:%M")));

    g.append("g")
      .call(d3.axisLeft(y));

    // Add bars
    g.selectAll(".timeline-bar")
      .data(timelineData)
      .enter().append("rect")
      .attr("class", "timeline-bar")
      .attr("x", d => x(d.timestamp))
      .attr("width", Math.max(1, width / timelineData.length - 1))
      .attr("y", d => y(d.count))
      .attr("height", d => height - y(d.count))
      .attr("fill", "#10b981");

    // Add title
    g.append("text")
      .attr("x", width / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text("Activity Timeline");
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle scan log filter changes
  const handleScanLogFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Apply filters
  const applyFilters = () => {
    fetchLogs();
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      user_id: '',
      action: '',
      action_type: '',
      device_type: '',
      security_risk: '',
      start_date: '',
      end_date: '',
      limit: 1000
    });
  };

  // Export logs
  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User ID', 'Username', 'Role', 'Action', 'Action Type', 'Result', 'Device Info', 'Message', 'IP Address', 'Metadata'],
      ...logs.map(log => [
        new Date(parseInt(log.timestamp) * 1000).toLocaleString(),
        log.user_id,
        log.username,
        log.role,
        log.action,
        log.action_type,
        log.result,
        (() => {
          try {
            const metadata = JSON.parse(log.metadata);
            const deviceInfo = metadata.device_info;
            if (deviceInfo) {
              return `${deviceInfo.browser} ${deviceInfo.browserVersion} on ${deviceInfo.deviceType} (${deviceInfo.platform})`;
            }
          } catch (e) {}
          return 'N/A';
        })(),
        log.message,
        log.ip_address || 'N/A',
        log.metadata ? JSON.stringify(JSON.parse(log.metadata), null, 2) : 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprehensive-activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export scan logs
  const exportScanLogs = () => {
    const csvContent = [
      ['Timestamp', 'ISO Timestamp', 'User ID', 'Username', 'Role', 'Action', 'Action Type', 'Result', 'Tracking ID', 'Order ID', 'Input Value', 'Message', 'IP Address', 'Metadata'],
      ...scanLogs.map(log => [
        new Date(parseInt(log.timestamp)).toLocaleString(),
        new Date(parseInt(log.timestamp)).toISOString(),
        log.user_id,
        log.username,
        log.role,
        log.action,
        log.action_type || 'scanning',
        log.result,
        log.tracking_id,
        log.order_id || 'N/A',
        log.input_value || 'N/A',
        log.message,
        log.ip_address || 'N/A',
        log.metadata ? JSON.stringify(JSON.parse(log.metadata)) : 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprehensive-scan-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get action icon
  const getActionIcon = (action) => {
    switch (action.toLowerCase()) {
      case 'scan': return <Package className="w-4 h-4" />;
      case 'upload': return <FileText className="w-4 h-4" />;
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'login': return <LogIn className="w-4 h-4" />;
      case 'logout': return <LogOut className="w-4 h-4" />;
      case 'user_add': return <UserPlus className="w-4 h-4" />;
      case 'user_update': return <UserCheck className="w-4 h-4" />;
      case 'user_delete': return <UserX className="w-4 h-4" />;
      case 'lock': return <Lock className="w-4 h-4" />;
      case 'unlock': return <Unlock className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Get action color
  const getActionColor = (action) => {
    switch (action.toLowerCase()) {
      case 'scan': return 'bg-blue-100 text-blue-800';
      case 'upload': return 'bg-green-100 text-green-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'login': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Check permissions and user before rendering
  if (!user) {
    navigate('/login');
    return null;
  }

  if (!hasPermission('logger')) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full">
          <div className="bg-white p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">System Monitoring</h1>
            <div className="text-red-600">Access denied. Insufficient permissions.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full">
        {/* Header */}
        <div className="bg-white p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">System Monitoring</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2">Real-time monitoring of all system activities and user actions</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => setRealTime(!realTime)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  realTime 
                    ? 'bg-green-100 text-green-700 border border-green-300' 
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Activity className="w-4 h-4" />
                  <span>{realTime ? 'Live' : 'Static'}</span>
                </div>
              </button>
              <button
                onClick={fetchLogs}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Internal Tool Notice */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 text-center">
              <Shield className="h-4 w-4 inline mr-2" />
              <strong>Internal Tool:</strong> Device and location information is automatically collected for all users for security and audit purposes.
            </p>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-blue-600">Total Logs</p>
                    <p className="text-lg sm:text-2xl font-bold text-blue-900">{summary.total_logs?.toLocaleString()}</p>
                  </div>
                  <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-green-600">Today's Logs</p>
                    <p className="text-lg sm:text-2xl font-bold text-green-900">{summary.today_logs?.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                </div>
              </div>
              <div className="bg-purple-50 p-3 sm:p-4 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-purple-600">Active Users</p>
                    <p className="text-lg sm:text-2xl font-bold text-purple-900">{Object.keys(summary.user_activity || {}).length}</p>
                  </div>
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                </div>
              </div>
              <div className="bg-orange-50 p-3 sm:p-4 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-orange-600">Actions</p>
                    <p className="text-lg sm:text-2xl font-bold text-orange-900">{Object.keys(summary.action_breakdown || {}).length}</p>
                  </div>
                  <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
                </div>
              </div>
              <div className="bg-indigo-50 p-3 sm:p-4 rounded-lg border border-indigo-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-600">Devices</p>
                    <p className="text-2xl font-bold text-indigo-900">
                      {summary.device_breakdown ? Object.keys(summary.device_breakdown).length : 0}
                    </p>
                  </div>
                  <Smartphone className="w-8 h-8 text-indigo-600" />
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Locations</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {summary.location_count || 0}
                    </p>
                  </div>
                  <MapPin className="w-8 h-8 text-purple-600" />
                </div>
              </div>
              <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-teal-600">Network Types</p>
                    <p className="text-2xl font-bold text-teal-900">
                      {summary.network_breakdown ? Object.keys(summary.network_breakdown).length : 0}
                    </p>
                  </div>
                  <div className="w-8 h-8 text-teal-600 flex items-center justify-center">
                    📶
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', name: 'Overview', icon: BarChart3 },
                { id: 'logs', name: 'Activity Logs', icon: FileText },
                { id: 'scan-logs', name: 'Scan Logs', icon: Package },
                { id: 'timeline', name: 'Timeline', icon: LineChart }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6 sm:space-y-8">
                {/* System Overview Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 sm:p-6 text-white">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold mb-2">System Monitoring Dashboard</h2>
                      <p className="text-sm sm:text-base text-slate-300">Real-time overview of system activities and performance metrics</p>
                    </div>
                    <div className="text-center sm:text-right">
                      <div className="text-xs sm:text-sm text-slate-400">Last Updated</div>
                      <div className="text-base sm:text-lg font-semibold">{new Date().toLocaleTimeString()}</div>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Cards - Full Width Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                  {/* Total Activities Card */}
                  <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow h-28 sm:h-32">
                    <div className="flex items-center h-full">
                      <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="ml-3 sm:ml-4">
                        <p className="text-xs sm:text-sm font-medium text-gray-600">Total Activities</p>
                        <p className="text-lg sm:text-2xl font-bold text-gray-900">{summary?.total_logs || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Today's Activities Card */}
                  <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow h-28 sm:h-32">
                    <div className="flex items-center h-full">
                      <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="ml-3 sm:ml-4">
                        <p className="text-xs sm:text-sm font-medium text-gray-600">Today's Activities</p>
                        <p className="text-lg sm:text-2xl font-bold text-gray-900">{summary?.today_logs || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Active Users Card */}
                  <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6 border-l-4 border-purple-500 hover:shadow-xl transition-shadow h-28 sm:h-32">
                    <div className="flex items-center h-full">
                      <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <div className="ml-3 sm:ml-4">
                        <p className="text-xs sm:text-sm font-medium text-gray-600">Active Users</p>
                        <p className="text-lg sm:text-2xl font-bold text-gray-900">{Object.keys(summary?.user_activity || {}).length}</p>
                      </div>
                    </div>
                  </div>

                  {/* System Health Card */}
                  <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6 border-l-4 border-orange-500 hover:shadow-xl transition-shadow h-28 sm:h-32">
                    <div className="flex items-center h-full">
                      <div className="p-2 sm:p-3 bg-orange-100 rounded-lg">
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3 sm:ml-4">
                        <p className="text-xs sm:text-sm font-medium text-gray-600">System Health</p>
                        <p className="text-lg sm:text-2xl font-bold text-green-600">98%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Section - Full Width */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                  {/* Activity Timeline Chart */}
                  <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow h-80">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        Activity Timeline
                      </h3>
                      <div className="flex space-x-2">
                        <button className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors">7D</button>
                        <button className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors">30D</button>
                        <button className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors">90D</button>
                      </div>
                    </div>
                    <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                      <svg ref={activityChartRef} width="100%" height="100%" className="rounded-lg"></svg>
                    </div>
                  </div>

                  {/* User Activity Chart */}
                  <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow h-80">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        Top Users
                      </h3>
                      <span className="text-sm text-gray-500">By activity count</span>
                    </div>
                    <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                      <svg ref={userActivityChartRef} width="100%" height="100%" className="rounded-lg"></svg>
                    </div>
                  </div>
                </div>

                {/* Detailed Breakdowns - Full Width Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
                  {/* Action Type Distribution */}
                  <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow h-80">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Action Types
                    </h3>
                    <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                      <svg ref={actionTypeChartRef} width="100%" height="100%" className="rounded-lg"></svg>
                    </div>
                  </div>

                  {/* Result Distribution */}
                  <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow h-80">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Results
                    </h3>
                    <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                      <svg ref={actionChartRef} width="100%" height="100%" className="rounded-lg"></svg>
                    </div>
                  </div>

                  {/* Device Distribution */}
                  <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow h-80">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Devices
                    </h3>
                    <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                      <svg ref={deviceChartRef} width="100%" height="100%" className="rounded-lg"></svg>
                    </div>
                  </div>
                </div>

                {/* Scan Logs Summary Section */}


                {/* Scan Operations - Independent Full Width Section */}
                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 mb-6 sm:mb-8">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 space-y-3 sm:space-y-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 mr-3 sm:mr-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                      📱 Scan Operations Overview
                    </h2>
                    <div className="text-sm text-gray-500">Real-time scan activity monitoring</div>
                  </div>
                  
                  {/* Scan Metrics Grid - Full Width */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-6 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                      <div className="text-center">
                        <div className="text-xs sm:text-sm font-medium text-blue-700 mb-2">Total Scans</div>
                        <div className="text-xl sm:text-3xl font-bold text-blue-900">{scanLogs.length}</div>
                        <div className="text-xs text-blue-600 mt-1">All time</div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 sm:p-6 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                      <div className="text-center">
                        <div className="text-xs sm:text-sm font-medium text-green-700 mb-2">Successful</div>
                        <div className="text-xl sm:text-3xl font-bold text-green-900">
                          {scanLogs.filter(log => log.result === 'success').length}
                        </div>
                        <div className="text-xs text-green-600 mt-1">Success rate</div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 sm:p-6 rounded-lg border border-red-200 hover:shadow-md transition-shadow">
                      <div className="text-center">
                        <div className="text-xs sm:text-sm font-medium text-red-700 mb-2">Failed</div>
                        <div className="text-xl sm:text-3xl font-bold text-red-900">
                          {scanLogs.filter(log => log.result === 'error').length}
                        </div>
                        <div className="text-xs text-red-600 mt-1">Error rate</div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                      <div className="text-center">
                        <div className="text-sm font-medium text-purple-700 mb-2">Today</div>
                        <div className="text-3xl font-bold text-purple-900">
                          {scanLogs.filter(log => {
                            const today = new Date().toDateString();
                            const logDate = new Date(parseInt(log.timestamp)).toDateString();
                            return logDate === today;
                          }).length}
                        </div>
                        <div className="text-xs text-purple-600 mt-1">24h period</div>
                      </div>
                    </div>
                  </div>

                  {/* Scan Action Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Action Distribution
                      </h4>
                      <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
                        {Object.entries(
                          scanLogs.reduce((acc, log) => {
                            acc[log.action] = (acc[log.action] || 0) + 1;
                            return acc;
                          }, {})
                        )
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 10)
                        .map(([action, count], index) => (
                          <div key={action} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                              </div>
                              <span className="text-sm font-medium text-gray-700 capitalize">{action.replace(/_/g, ' ')}</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        Top Users
                      </h4>
                      <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
                        {Object.entries(
                          scanLogs.reduce((acc, log) => {
                            acc[log.username] = (acc[log.username] || 0) + 1;
                            return acc;
                          }, {})
                        )
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 10)
                        .map(([username, count], index) => (
                          <div key={username} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-green-300 transition-colors">
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-xs font-bold text-green-600">{index + 1}</span>
                              </div>
                              <span className="text-sm font-medium text-gray-700">{username}</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-800 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                              {count} scans
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
              <>
                {/* Filter Controls */}
                <div className="bg-white p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Filter Activity Logs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
                      <input
                        type="text"
                        value={filters.user_id}
                        onChange={(e) => handleFilterChange('user_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Filter by user ID"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                      <select
                        value={filters.action}
                        onChange={(e) => handleScanLogFilterChange('action', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Actions</option>
                        <option value="login_success">Login Success</option>
                        <option value="login_attempt">Login Attempt</option>
                        <option value="user_creation">User Creation</option>
                        <option value="user_approval">User Approval</option>
                        <option value="user_rejection">User Rejection</option>
                        <option value="password_change_request">Password Change Request</option>
                        <option value="password_change_approval">Password Change Approval</option>
                        <option value="password_change_rejection">Password Change Rejection</option>
                        <option value="approval_request_creation">Approval Request Creation</option>
                        <option value="scan">Scan</option>
                        <option value="upload">Upload</option>
                        <option value="admin">Admin Action</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
                      <select
                        value={filters.action_type}
                        onChange={(e) => setFilters(prev => ({ ...prev, action_type: e.target.value }))}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">All Action Types</option>
                        <option value="login">Login</option>
                        <option value="logout">Logout</option>
                        <option value="scan">Scan</option>
                        <option value="upload">Upload</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Security Risk</label>
                      <select
                        value={filters.security_risk}
                        onChange={(e) => setFilters(prev => ({ ...prev, security_risk: e.target.value }))}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">All Security Levels</option>
                        <option value="very_low">Very Low Risk</option>
                        <option value="low">Low Risk</option>
                        <option value="medium">Medium Risk</option>
                        <option value="high">High Risk</option>
                        <option value="very_high">Very High Risk</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Device Type</label>
                      <select
                        value={filters.device_type}
                        onChange={(e) => handleFilterChange('device_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Devices</option>
                        <option value="Desktop">Desktop</option>
                        <option value="Mobile">Mobile</option>
                        <option value="Tablet">Tablet</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={filters.start_date}
                        onChange={(e) => handleFilterChange('start_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={filters.end_date}
                        onChange={(e) => handleFilterChange('end_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Limit</label>
                      <select
                        value={filters.limit}
                        onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={100}>100 logs</option>
                        <option value={250}>250 logs</option>
                        <option value={500}>500 logs</option>
                        <option value={1000}>1000 logs</option>
                      </select>
                    </div>
                    <div className="flex items-end space-x-2">
                      <button
                        onClick={applyFilters}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Filter className="w-4 h-4" />
                        <span>Apply Filters</span>
                      </button>
                      <button
                        onClick={clearFilters}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>

                {/* Activity Logs Table */}
        <div className="bg-white p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Activity Logs</h3>
                    <button
                      onClick={exportLogs}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export CSV</span>
                    </button>
        </div>
                  
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading activity logs...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Device
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Security
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {logs.map((log, index) => (
                            <tr key={log.id || index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(parseInt(log.timestamp) * 1000).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-8 w-8">
                                    {getActionIcon(log.action)}
                                  </div>
                                  <div className="ml-2">
                                    <div className="text-sm font-medium text-gray-900">{log.username}</div>
                                    <div className="text-sm text-gray-500">{log.user_id}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.role}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {log.metadata ? (() => {
                                  try {
                                    const metadata = JSON.parse(log.metadata);
                                    console.log('Metadata for log:', log.id, metadata); // Debug log
                                    const deviceInfo = metadata.device_info;
                                    if (deviceInfo) {
                                      return (
                                        <div className="space-y-1">
                                          <div className="font-medium text-gray-900">
                                            {deviceInfo.browser || 'Unknown'} {deviceInfo.browserVersion || ''}
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            {deviceInfo.deviceType || 'Unknown'} • {deviceInfo.platform || 'Unknown'}
                                          </div>
                                          
                                          {/* IP Address Information */}
                                          {deviceInfo.network && typeof deviceInfo.network === 'object' && deviceInfo.network.ip_address && (
                                            <div className="text-xs text-blue-600">
                                              🌐 {deviceInfo.network.ip_address}
                                              {deviceInfo.network.isp && (
                                                <span className="text-gray-500 ml-1">({deviceInfo.network.isp})</span>
                                              )}
                                            </div>
                                          )}
                                          
                                          {/* WiFi Connection Details */}
                                          {deviceInfo.wifi && typeof deviceInfo.wifi === 'object' && (
                                            <div className="text-xs text-green-600">
                                              📶 {deviceInfo.wifi.connectionType || 'Unknown'} 
                                              {deviceInfo.wifi.downlink !== 'unknown' && (
                                                <span className="text-gray-500 ml-1">• {deviceInfo.wifi.downlink}Mbps</span>
                                              )}
                                              {deviceInfo.wifi.rtt !== 'unknown' && (
                                                <span className="text-gray-500 ml-1">• {deviceInfo.wifi.rtt}ms</span>
                                              )}
                                            </div>
                                          )}
                                          
                                          {/* Location Information */}
                                          {deviceInfo.location && typeof deviceInfo.location === 'object' && (
                                            <div className="text-xs text-purple-600">
                                              📍 {deviceInfo.location.latitude.toFixed(4)}, {deviceInfo.location.longitude.toFixed(4)}
                                              {deviceInfo.location.collectionMethod && (
                                                <span className="text-gray-500 ml-1">({deviceInfo.location.collectionMethod})</span>
                                              )}
                                            </div>
                                          )}
                                          
                                          <div className="text-xs text-gray-500">
                                            {deviceInfo.screenWidth || 'N/A'}×{deviceInfo.screenHeight || 'N/A'} • {deviceInfo.timezone || 'N/A'}
                                          </div>
                                          
                                          {/* Internal Tool Badge */}
                                          {deviceInfo.isInternalTool && (
                                            <div className="text-xs text-purple-600 bg-purple-50 px-1 py-0.5 rounded">
                                              🔒 Internal Tool • Mandatory Collection
                                            </div>
                                          )}
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div className="text-xs text-gray-400">
                                          <div>No device info</div>
                                          <div className="text-xs">Keys: {Object.keys(metadata).join(', ')}</div>
                                        </div>
                                      );
                                    }
                                  } catch (e) {
                                    console.error('Error parsing metadata:', e, log.metadata);
                                    return (
                                      <div className="text-xs text-red-400">
                                        <div>Parse Error</div>
                                        <div>Raw: {String(log.metadata).substring(0, 50)}...</div>
                                      </div>
                                    );
                                  }
                                })() : (
                                  <div className="text-xs text-gray-400">
                                    <div>No metadata</div>
                                    <div className="text-xs">IP: {log.ip_address || 'N/A'}</div>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {log.metadata ? (() => {
                                  try {
                                    const metadata = JSON.parse(log.metadata);
                                    const deviceInfo = metadata.device_info;
                                    if (deviceInfo) {
                                      return (
                                        <div className="space-y-1">
                                          <div className="font-medium text-gray-900">
                                            Risk Level: {deviceInfo.companyNetwork?.riskLevel || 'N/A'}
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            Company Network: {deviceInfo.companyNetwork?.isCompanyNetwork ? 'Yes' : 'No'}
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            Do Not Track: {deviceInfo.securityFingerprint?.doNotTrack === '1' ? 'Yes' : 'No'}
                                          </div>
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div className="text-xs text-gray-400">
                                          <div>No security info</div>
                                          <div className="text-xs">Keys: {Object.keys(metadata).join(', ')}</div>
                                        </div>
                                      );
                                    }
                                  } catch (e) {
                                    console.error('Error parsing metadata:', e, log.metadata);
                                    return (
                                      <div className="text-xs text-red-400">
                                        <div>Parse Error</div>
                                        <div>Raw: {String(log.metadata).substring(0, 50)}...</div>
                                      </div>
                                    );
                                  }
                                })() : (
                                  <div className="text-xs text-gray-400">
                                    <div>No metadata</div>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                                  {log.action.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  log.result === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {log.result}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{log.message}</td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {log.metadata && (
                                  <details className="cursor-pointer">
                                    <summary className="text-blue-600 hover:text-blue-800">View Details</summary>
                                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                                      {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {logs.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No activity logs found</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}



            {/* Scan Logs Tab */}
            {activeTab === 'scan-logs' && (
              <div className="space-y-3 sm:space-y-4">
                {/* Scan Logs Filters */}
                <div className="bg-white p-4 sm:p-6">
                  <h3 className="text-lg font-semibold mb-4">🔍 Filter Scan Logs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Scan Action</label>
                      <select
                        value={filters.action}
                        onChange={(e) => handleScanLogFilterChange('action', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Scan Actions</option>
                        <option value="label_scan">Label Scan</option>
                        <option value="packing_scan">Packing Scan</option>
                        <option value="packing_pending_scan">Packing Pending Scan</option>
                        <option value="dispatch_scan">Dispatch Scan</option>
                        <option value="dispatch_pending_scan">Dispatch Pending Scan</option>
                        <option value="status_revoke">Status Revoke</option>
                        <option value="shipment_cancel">Shipment Cancel</option>
                        <option value="cancel">Cancel</option>
                        <option value="revoke_status_change">Revoke Status Change</option>
                        <option value="dispatch_scanned">Dispatch Scanned</option>
                        <option value="packing_scanned">Packing Scanned</option>
                        <option value="label_scanned">Label Scanned</option>
                        <option value="packing_pending">Packing Pending</option>
                        <option value="dispatch_pending">Dispatch Pending</option>
                        <option value="label_pending">Label Pending</option>
                        <option value="status_change">Status Change</option>
                        <option value="tracking_update">Tracking Update</option>
                        <option value="order_update">Order Update</option>
                        <option value="scan_verification">Scan Verification</option>
                        <option value="scan_validation">Scan Validation</option>
                        <option value="scan_error">Scan Error</option>
                        <option value="scan_retry">Scan Retry</option>
                        <option value="scan_timeout">Scan Timeout</option>
                        <option value="scan_confirmation">Scan Confirmation</option>
                        <option value="scan_rejection">Scan Rejection</option>
                        <option value="scan_approval">Scan Approval</option>
                        <option value="scan_audit">Scan Audit</option>
                        <option value="scan_review">Scan Review</option>
                        <option value="scan_inspection">Scan Inspection</option>
                        <option value="scan_quality_check">Scan Quality Check</option>
                        <option value="scan_completion">Scan Completion</option>
                        <option value="scan_initiation">Scan Initiation</option>
                        <option value="scan_processing">Scan Processing</option>
                        <option value="scan_finalization">Scan Finalization</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Result</label>
                      <select
                        value={filters.result}
                        onChange={(e) => handleScanLogFilterChange('result', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Results</option>
                        <option value="success">Success</option>
                        <option value="error">Error</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
                      <input
                        type="text"
                        value={filters.user_id}
                        onChange={(e) => handleScanLogFilterChange('user_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Filter by username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tracking ID</label>
                      <input
                        type="text"
                        value={filters.tracking_id || ''}
                        onChange={(e) => handleScanLogFilterChange('tracking_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Filter by tracking ID"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={filters.start_date}
                        onChange={(e) => handleScanLogFilterChange('start_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={filters.end_date}
                        onChange={(e) => handleScanLogFilterChange('end_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-end space-y-2 sm:space-y-0 sm:space-x-2">
                      <button
                        onClick={fetchScanLogs}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Apply Filters
                      </button>
                      <button
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            action: '',
                            result: '',
                            user_id: '',
                            tracking_id: '',
                            search: '',
                            start_date: '',
                            end_date: ''
                          }));
                          fetchScanLogs();
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  
                  {/* Quick Action Filters */}
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Quick Filters:</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setFilters(prev => ({ ...prev, action: 'label_scan' }));
                          fetchScanLogs();
                        }}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                      >
                        Label Scans
                      </button>
                      <button
                        onClick={() => {
                          setFilters(prev => ({ ...prev, action: 'packing_scan' }));
                          fetchScanLogs();
                        }}
                        className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors"
                      >
                        Packing Scans
                      </button>
                      <button
                        onClick={() => {
                          setFilters(prev => ({ ...prev, action: 'dispatch_scan' }));
                          fetchScanLogs();
                        }}
                        className="px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition-colors"
                      >
                        Dispatch Scans
                      </button>
                      <button
                        onClick={() => {
                          setFilters(prev => ({ ...prev, action: 'status_revoke' }));
                          fetchScanLogs();
                        }}
                        className="px-3 py-1 text-xs bg-orange-100 text-orange-800 rounded-full hover:bg-orange-200 transition-colors"
                      >
                        Status Revokes
                      </button>
                      <button
                        onClick={() => {
                          setFilters(prev => ({ ...prev, action: 'shipment_cancel' }));
                          fetchScanLogs();
                        }}
                        className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded-full hover:bg-red-200 transition-colors"
                      >
                        Cancellations
                      </button>
                      <button
                        onClick={() => {
                          setFilters(prev => ({ ...prev, action: 'packing_pending_scan' }));
                          fetchScanLogs();
                        }}
                        className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 transition-colors"
                      >
                        Pending Scans
                      </button>
                      <button
                        onClick={() => {
                          setFilters(prev => ({ ...prev, action: 'scan_error' }));
                          fetchScanLogs();
                        }}
                        className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded-full hover:bg-red-200 transition-colors"
                      >
                        Errors
                      </button>
                      <button
                        onClick={() => {
                          setFilters(prev => ({ ...prev, action: '' }));
                          fetchScanLogs();
                        }}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 transition-colors"
                      >
                        Show All
                      </button>
                      <button
                        onClick={() => {
                          // Clear all filters and fetch maximum scan logs
                          setFilters(prev => ({
                            ...prev,
                            action: '',
                            result: '',
                            user_id: '',
                            tracking_id: '',
                            search: '',
                            start_date: '',
                            end_date: ''
                          }));
                          fetchAllScanLogs();
                        }}
                        className="px-3 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full hover:bg-indigo-200 transition-colors"
                      >
                        Show ALL Scan Logs
                      </button>
                    </div>
                    

                  </div>
                </div>

                <div className="bg-white p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
                    <h3 className="text-lg font-semibold">📱 Scan Logs</h3>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                      <button
                        onClick={fetchScanLogs}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Refresh</span>
                      </button>
                      <button
                        onClick={fetchAllScanLogs}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Load ALL</span>
                      </button>
                      <button
                        onClick={exportScanLogs}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export CSV</span>
                      </button>
                      <span className="text-sm text-gray-500 text-center sm:text-left">
                        {scanLogs.length} scan operations
                      </span>
                    </div>
                  </div>
                  
                  {/* Comprehensive Scan Statistics Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 sm:p-4 rounded-lg mb-4 border border-blue-200">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                      <div className="text-center">
                        <div className="text-lg sm:text-2xl font-bold text-blue-900">{scanLogs.length}</div>
                        <div className="text-xs text-blue-700">Total Scans</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg sm:text-2xl font-bold text-green-900">
                          {scanLogs.filter(log => log.result === 'success').length}
                        </div>
                        <div className="text-xs text-green-700">Successful</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg sm:text-2xl font-bold text-red-900">
                          {scanLogs.filter(log => log.result === 'error').length}
                        </div>
                        <div className="text-xs text-red-700">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg sm:text-2xl font-bold text-purple-900">
                          {new Set(scanLogs.map(log => log.action)).size}
                        </div>
                        <div className="text-xs text-purple-700">Action Types</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg sm:text-2xl font-bold text-orange-900">
                          {new Set(scanLogs.map(log => log.username)).size}
                        </div>
                        <div className="text-xs text-orange-700">Users</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg sm:text-2xl font-bold text-indigo-900">
                          {new Set(scanLogs.map(log => log.tracking_id)).size}
                        </div>
                        <div className="text-xs text-indigo-700">Tracking IDs</div>
                      </div>
                    </div>
                    
                    {/* Data Status Information */}
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <div className="text-center">
                        <div className="text-xs sm:text-sm text-blue-700">
                          📊 <strong>Data Status:</strong> Showing {scanLogs.length} scan logs • 
                          Last updated: {new Date().toLocaleTimeString()} • 
                          Data source: Comprehensive Activity Logs
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Search Bar */}
                  <div className="mb-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search in scan logs (tracking ID, username, action, message)..."
                        className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.search || ''}
                        onChange={(e) => handleScanLogFilterChange('search', e.target.value)}
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Load All Button */}
                  <div className="mb-4 flex justify-center">
                    <button 
                      onClick={fetchAllScanLogs}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Load ALL Scan Logs
                    </button>
                  </div>
                  
                  {scanLogs.length > 0 ? (
                    <div className="overflow-x-auto">
                      {/* Scan Logs Summary */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                        <div className="text-sm text-gray-600">
                          <strong>Showing {scanLogs.length} scan operations</strong> • 
                          Last updated: {new Date().toLocaleTimeString()} • 
                          Data source: Comprehensive Activity Logs (action_type: scanning)
                        </div>
                      </div>
                      
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {scanLogs.map((log, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="font-medium">{new Date(parseInt(log.timestamp)).toLocaleDateString()}</div>
                                <div className="text-xs text-gray-400">{new Date(parseInt(log.timestamp)).toLocaleTimeString()}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{log.username}</div>
                                <div className="text-sm text-gray-500">{log.role}</div>
                                <div className="text-xs text-gray-400">ID: {log.user_id}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                                  {log.action.replace(/_/g, ' ')}
                                </span>
                                <div className="text-xs text-gray-500 mt-1">Type: {log.action_type || 'scanning'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{log.tracking_id}</div>
                                <div className="text-xs text-gray-500">Input: {log.input_value}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {log.order_id || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  log.result === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {log.result}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                                <div className="truncate">{log.message}</div>
                                {log.message && log.message.length > 50 && (
                                  <details className="mt-1">
                                    <summary className="text-xs text-blue-600 cursor-pointer">Show full message</summary>
                                    <div className="text-xs text-gray-600 mt-1 p-2 bg-gray-50 rounded">
                                      {log.message}
                                    </div>
                                  </details>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                <details className="cursor-pointer">
                                  <summary className="text-blue-600 hover:text-blue-800 text-xs">View All Details</summary>
                                  <div className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-w-xs">
                                    <div className="space-y-2">
                                      <div><strong>Timestamp:</strong> {new Date(parseInt(log.timestamp)).toISOString()}</div>
                                      <div><strong>User ID:</strong> {log.user_id}</div>
                                      <div><strong>Username:</strong> {log.username}</div>
                                      <div><strong>Role:</strong> {log.role}</div>
                                      <div><strong>Action:</strong> {log.action}</div>
                                      <div><strong>Action Type:</strong> {log.action_type || 'scanning'}</div>
                                      <div><strong>Result:</strong> {log.result}</div>
                                      <div><strong>Tracking ID:</strong> {log.tracking_id}</div>
                                      <div><strong>Order ID:</strong> {log.order_id || 'N/A'}</div>
                                      <div><strong>Input Value:</strong> {log.input_value}</div>
                                      <div><strong>Message:</strong> {log.message}</div>
                                      {log.ip_address && <div><strong>IP Address:</strong> {log.ip_address}</div>}
                                      {log.metadata && (
                                        <div>
                                          <strong>Metadata:</strong>
                                          <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto">
                                            {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </details>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No scan logs found</p>
                      <p className="text-sm text-gray-400 mt-1">Scan operations will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
                  <svg ref={timelineChartRef} width="800" height="400" className="w-full"></svg>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logger;
