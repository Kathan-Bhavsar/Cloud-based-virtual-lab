import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { User, LogOut, Play, Square, ExternalLink, Clock, Server, Cpu, HardDrive, Activity, Folder } from 'lucide-react';
import './App.css';

const VirtualLabDashboard = ({ user, signOut }) => {
  const [labStatus, setLabStatus] = useState('ready');
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [labUrl, setLabUrl] = useState('');
  const [taskArn, setTaskArn] = useState('');
  const [isJupyterReady, setIsJupyterReady] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // ✅ Extract user email from Cognito user object
  useEffect(() => {
    let email = null;
    if (user?.attributes?.email) {
      // Standard Cognito attribute path
      email = user.attributes.email;
    } else if (user?.signInDetails?.loginId) {
      // In your case, Cognito puts it here
      email = user.signInDetails.loginId;
    }
    if (email) {
      console.log("✅ Logged in user email:", email);
    } else {
      console.log("⚠️ No email found in user object:", user);
    }
  }, [user]);

  // Your API Gateway endpoints
  const API_BASE_URL = 'https://ijgdznqeh9.execute-api.ap-south-1.amazonaws.com/prod';
  const START_LAB_URL = `${API_BASE_URL}/lab/start`;
  const STOP_LAB_URL = `${API_BASE_URL}/lab/stop`;
  const FILES_URL = `${API_BASE_URL}/files`;

  // ✅ Always fetch fresh JWT token
  const getAuthToken = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (!token) throw new Error("No JWT token found in session");
      console.log("✅ JWT Token:", token);
      return token;
    } catch (err) {
      console.error("❌ Error fetching token:", err);
      throw new Error("User not authenticated, please sign in again.");
    }
  };

  // 📂 Handle "My Files" button
  const handleOpenFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const token = await getAuthToken();
      console.log("Calling files API:", FILES_URL);

      const response = await fetch(FILES_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log("Files response status:", response.status);

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log("Files API response:", responseData);

      const data = responseData.body ? JSON.parse(responseData.body) : responseData;

      if (data.s3ConsoleUrl) {
        window.open(data.s3ConsoleUrl, '_blank');
        console.log("Opened S3 console:", data.s3ConsoleUrl);
      } else {
        throw new Error('No S3 URL received');
      }

    } catch (error) {
      console.error('Error accessing files:', error);
      alert('Failed to open files. Please try again. Error: ' + error.message);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // ▶️ Start Lab
  const startLab = async () => {
    setLabStatus('starting');
    setIsJupyterReady(false);
    setTimeLeft(30 * 60);

    try {
      const token = await getAuthToken();
      console.log("Calling API:", START_LAB_URL);

      const response = await fetch(START_LAB_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log("Full API response:", responseData);

      const data = responseData.body ? JSON.parse(responseData.body) : responseData;

      if (data.publicIp && data.jupyterUrl) {
        setLabUrl(data.jupyterUrl);
        setTaskArn(data.taskArn);
        setLabStatus('running');
        console.log("Jupyter URL set to:", data.jupyterUrl);
        checkJupyterReady(data.jupyterUrl);
      } else {
        throw new Error('Invalid response format from server');
      }

    } catch (error) {
      console.error('Error starting lab:', error);
      setLabStatus('ready');
      alert('Failed to start lab: ' + error.message);
    }
  };

  // ⏳ Check Jupyter readiness (stable version, capped retries)
  const checkJupyterReady = async (url, retryCount = 0) => {
    if (retryCount > 36) { // ~6 minutes max
      console.log("⚠️ Jupyter readiness check timeout");
      setIsJupyterReady(true);
      startTimer();
      return;
    }

    try {
      console.log(`Checking Jupyter readiness (attempt ${retryCount + 1})...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(url, { method: 'GET', mode: 'no-cors', signal: controller.signal });

      clearTimeout(timeoutId);

      console.log("✅ Jupyter is ready!");
      setIsJupyterReady(true);
      startTimer();
    } catch {
      console.log("⏳ Jupyter not ready yet, waiting...");
      setTimeout(() => checkJupyterReady(url, retryCount + 1), 10000);
    }
  };

  // ⏱️ Start timer
  const startTimer = () => {
    setTimeLeft(30 * 60);
    console.log("⏱️ 30-minute timer started");
  };

  // ⏹️ Stop Lab
  const stopLab = async () => {
    try {
      if (!taskArn) throw new Error('No task ARN available to stop');
      const token = await getAuthToken();
      console.log("Stopping task:", taskArn);

      const requestBody = JSON.stringify({ taskArn });
      console.log("Request body:", requestBody);

      const response = await fetch(STOP_LAB_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: requestBody
      });

      console.log("Stop response status:", response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log("Stop response:", responseData);
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

  // Countdown timer effect
  useEffect(() => {
    let timer;
    if (labStatus === 'running' && isJupyterReady && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0) {
      stopLab();
    }
    return () => clearTimeout(timer);
  }, [labStatus, isJupyterReady, timeLeft]);

  // Format timer
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

              {/* My Files Button */}
              <button
                onClick={handleOpenFiles}
                disabled={isLoadingFiles}
                className="files-btn"
              >
                {isLoadingFiles ? (
                  <><div className="spinner-small" /><span>Opening Files...</span></>
                ) : (
                  <><Folder size={16} /><span>My Files</span></>
                )}
              </button>

              <button onClick={stopLab} className="stop-btn">
                <Square size={16} />
                <span>Stop Lab Session</span>
              </button>
            </div>
          )}

          {/* File Management Info */}
          {labStatus === 'running' && (
            <div className="file-info-box">
              <div style={{ fontSize: '14px', color: '#666', textAlign: 'center', marginTop: '15px' }}>
                💡 Your files are automatically backed up to Amazon S3 every 2 minutes
              </div>
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