import React, { useState, useEffect } from 'react';
import { User, LogOut, Play, Square, ExternalLink, Clock, Server, Cpu, HardDrive, Activity } from 'lucide-react';
import './App.css';

const VirtualLabDashboard = ({ user, signOut }) => {
  const [labStatus, setLabStatus] = useState('ready');
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [labUrl, setLabUrl] = useState('');
  const [taskArn, setTaskArn] = useState('');
  const [isJupyterReady, setIsJupyterReady] = useState(false);

  // Your API Gateway endpoint
  const API_BASE_URL = 'https://ijgdznqeh9.execute-api.ap-south-1.amazonaws.com/prod';
  const START_LAB_URL = `${API_BASE_URL}/lab/start`;
  const STOP_LAB_URL = `${API_BASE_URL}/lab/stop`;

  const startLab = async () => {
    setLabStatus('starting');
    setIsJupyterReady(false);
    setTimeLeft(30 * 60); // Reset timer but don't start counting yet

    try {
      console.log("Calling API:", START_LAB_URL);

      const response = await fetch(START_LAB_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log("Response status:", response.status);

      // Check if the HTTP request was successful
      if (response.status >= 200 && response.status < 300) {
        const responseData = await response.json();
        console.log("Full API response:", responseData);

        // Parse the body string as JSON
        const data = JSON.parse(responseData.body);
        console.log("Parsed data:", data);

        if (data.publicIp && data.jupyterUrl) {
          // Lab started successfully with IP
          setLabUrl(data.jupyterUrl);
          setTaskArn(data.taskArn);
          setLabStatus('running');
          console.log("Jupyter URL set to:", data.jupyterUrl);
          
          // Wait for Jupyter to be fully ready (ping the URL)
          checkJupyterReady(data.jupyterUrl);
        } else if (data.error) {
          // Error from Lambda
          throw new Error(data.error);
        } else {
          throw new Error('Invalid response format from server');
        }
      } else {
        throw new Error(`Server returned status: ${response.status}`);
      }

    } catch (error) {
      console.error('Error starting lab:', error);
      setLabStatus('ready');
      alert('Failed to start lab. Please try again. Check console for details.');
    }
  };

  // Function to check if Jupyter is ready
  const checkJupyterReady = async (url, retryCount = 0) => {
    if (retryCount > 36) { // 6 minutes max (36 * 10 seconds)
      console.log("Jupyter readiness check timeout");
      setIsJupyterReady(true); // Still show button but warn user
      startTimer(); // Start the timer even if Jupyter isn't fully ready
      return;
    }

    try {
      console.log(`Checking Jupyter readiness (attempt ${retryCount + 1})...`);
      
      // Try to fetch the Jupyter URL with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, { 
        method: 'GET',
        mode: 'no-cors', // Avoid CORS issues
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // If we get here, Jupyter is ready!
      console.log("Jupyter is ready!");
      setIsJupyterReady(true);
      startTimer(); // Start the 30-minute timer only when Jupyter is ready
      
    } catch (error) {
      // Jupyter not ready yet, try again in 10 seconds
      console.log("Jupyter not ready yet, waiting...");
      setTimeout(() => checkJupyterReady(url, retryCount + 1), 10000);
    }
  };

  // Start the 30-minute timer
  const startTimer = () => {
    setTimeLeft(30 * 60); // Reset to 30 minutes
    console.log("30-minute timer started");
  };

  const stopLab = async () => {
    try {
      if (!taskArn) {
        throw new Error('No task ARN available to stop');
      }

      console.log("Stopping task:", taskArn);

      // Create the request body properly
      const requestBody = JSON.stringify({ taskArn });
      console.log("Request body:", requestBody);

      const response = await fetch(STOP_LAB_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody
      });

      console.log("Stop response status:", response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log("Stop response:", responseData);
        
        // Parse the nested body if it exists
        let result;
        if (responseData.body) {
          try {
            result = JSON.parse(responseData.body);
          } catch (e) {
            result = responseData;
          }
        } else {
          result = responseData;
        }
        
        console.log('Lab stopped successfully:', result);
        alert('Lab stopped successfully!');
      } else {
        const errorText = await response.text();
        console.error("Stop error:", errorText);
        throw new Error(`Failed to stop lab: ${response.status}`);
      }

    } catch (error) {
      console.error('Error stopping lab:', error);
      alert('Failed to stop lab. Please try again. Check console for details.');
    } finally {
      setLabStatus('stopped');
      setLabUrl('');
      setTaskArn('');
      setIsJupyterReady(false);
    }
  };

  useEffect(() => {
    let timer;
    if (labStatus === 'running' && isJupyterReady && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0) {
      stopLab();
    }
    return () => clearTimeout(timer);
  }, [labStatus, isJupyterReady, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusConfig = () => {
    switch (labStatus) {
      case 'starting': return { color: '#f59e0b', icon: '🟡', text: 'Initializing Lab Environment...' };
      case 'running': return { color: '#10b981', icon: '🟢', text: 'Lab Environment Active' };
      case 'stopped': return { color: '#ef4444', icon: '🔴', text: 'Lab Environment Stopped' };
      default: return { color: '#6b7280', icon: '⚪', text: 'Ready to Launch' };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        {/* Header */}
        <div className="dashboard-header">
          <div className="dashboard-user">
            <div className="user-avatar"><User size={18} /></div>
            <span>{user?.username || 'User Lab'}</span>
          </div>
          <button onClick={signOut} className="signout-btn">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="dashboard-main">
          <div className="lab-icon">🧪</div>
          <h1 className="lab-title">Virtual Lab</h1>
          <p className="lab-subtitle">
            Cloud-based Jupyter Lab environment for data science, machine learning,
            and development projects with pre-configured tools and libraries.
          </p>

          {/* Status */}
          {labStatus !== 'ready' && (
            <div className="lab-status-box" style={{ border: `2px solid ${statusConfig.color}20` }}>
              <div className="lab-status-indicator">
                <div className="lab-dot" style={{ background: statusConfig.color, animation: labStatus === 'starting' ? 'pulse 2s infinite' : 'none' }} />
                <span style={{ color: statusConfig.color }}>{statusConfig.text}</span>
              </div>
              {labStatus === 'running' && (
                <div className="lab-timer">
                  <Clock size={16} />
                  <span>Session expires in: {formatTime(timeLeft)}</span>
                  {!isJupyterReady && (
                    <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '5px' }}>
                      ⏳ Jupyter is starting up... (this may take 2-3 minutes)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-box blue">
              <Server size={24} />
              <div>{labStatus === 'running' ? '1' : '0'}</div>
              <div>Active Labs</div>
            </div>
            <div className="stat-box green">
              <Activity size={24} />
              <div>{labStatus === 'running' && isJupyterReady ? Math.floor((1800 - timeLeft) / 60) + 'm' : '0m'}</div>
              <div>Runtime</div>
            </div>
            <div className="stat-box yellow">
              <HardDrive size={24} />
              <div>2GB</div>
              <div>Storage</div>
            </div>
          </div>

          {/* Buttons */}
          {labStatus === 'ready' || labStatus === 'stopped' ? (
            <button onClick={startLab} disabled={labStatus === 'starting'} className="launch-btn">
              {labStatus === 'starting' ? <><div className="spinner" /><span>Launching Lab...</span></> : <><Play size={20} /><span>Launch Jupyter Lab</span></>}
            </button>
          ) : (
            <div className="lab-actions">
              {labUrl && isJupyterReady && (
                <a href={labUrl} target="_blank" rel="noopener noreferrer" className="open-btn">
                  <ExternalLink size={20} />
                  <span>Open Jupyter Lab</span>
                </a>
              )}
              {labUrl && !isJupyterReady && (
                <button className="open-btn" disabled style={{ opacity: 0.7, cursor: 'not-allowed' }}>
                  <ExternalLink size={20} />
                  <span>Jupyter Starting...</span>
                </button>
              )}
              <button onClick={stopLab} className="stop-btn">
                <Square size={16} />
                <span>Stop Lab Session</span>
              </button>
            </div>
          )}

          <div className="footer-box">
            <div>🐍 Python 3.11 • 📊 Pandas • 🤖 Scikit-learn • 📈 Matplotlib</div>
            <div>Pre-configured with popular data science and ML libraries</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualLabDashboard;