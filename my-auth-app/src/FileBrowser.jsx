import React, { useState } from 'react';
import { X, Download, Folder, File, Image, FileText, FileCode, Trash2 } from 'lucide-react';

const FileBrowser = ({ files, folders, onClose, onFileDelete }) => {
  const [deletingFile, setDeletingFile] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  // Function to get appropriate icon for file type
  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    const iconMap = {
      // Document files
      'ipynb': <FileCode size={18} className="file-icon" />,
      'py': <FileCode size={18} className="file-icon" />,
      'js': <FileCode size={18} className="file-icon" />,
      'html': <FileCode size={18} className="file-icon" />,
      'css': <FileCode size={18} className="file-icon" />,
      'json': <FileCode size={18} className="file-icon" />,
      'txt': <FileText size={18} className="file-icon" />,
      'md': <FileText size={18} className="file-icon" />,
      'pdf': <FileText size={18} className="file-icon" />,
      
      // Data files
      'csv': <FileText size={18} className="file-icon" />,
      'xlsx': <FileText size={18} className="file-icon" />,
      'xls': <FileText size={18} className="file-icon" />,
      
      // Image files
      'jpg': <Image size={18} className="file-icon" />,
      'jpeg': <Image size={18} className="file-icon" />,
      'png': <Image size={18} className="file-icon" />,
      'gif': <Image size={18} className="file-icon" />,
      'svg': <Image size={18} className="file-icon" />,
    };
    
    return iconMap[extension] || <File size={18} className="file-icon" />;
  };

  // Format file size to human readable format
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format date to readable format
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle file deletion
  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Are you sure you want to delete "${file.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingFile(file.fullPath);
    setDeleteError('');

    try {
      await onFileDelete(file.fullPath);
      // File will be removed from the list by parent component
    } catch (error) {
      setDeleteError(`Failed to delete file: ${error.message}`);
    } finally {
      setDeletingFile(null);
    }
  };

  return (
    <div className="file-browser-overlay">
      <div className="file-browser-modal">
        {/* Header */}
        <div className="file-browser-header">
          <h2>
            <Folder size={24} className="header-icon" />
            My Files
          </h2>
          <button onClick={onClose} className="close-btn" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="file-browser-content">
          {/* Delete Error Message */}
          {deleteError && (
            <div className="error-message">
              ⚠️ {deleteError}
            </div>
          )}

          {/* Folders Section */}
          {folders && folders.length > 0 && (
            <div className="section">
              <h3 className="section-title">Folders ({folders.length})</h3>
              <div className="file-list">
                {folders.map((folder) => (
                  <div key={folder.fullPath} className="file-item folder-item">
                    <Folder size={20} className="folder-icon" />
                    <div className="file-info">
                      <span className="file-name">{folder.name}</span>
                      <span className="file-path">{folder.fullPath}</span>
                    </div>
                    <span className="file-type">Folder</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files Section */}
          <div className="section">
            <h3 className="section-title">Files ({files ? files.length : 0})</h3>
            {files && files.length > 0 ? (
              <div className="file-list">
                {files.map((file) => (
                  <div key={file.fullPath} className="file-item">
                    {getFileIcon(file.name)}
                    <div className="file-info">
                      <span className="file-name">{file.name}</span>
                      <div className="file-details">
                        <span className="file-size">{formatFileSize(file.size)}</span>
                        <span className="file-date">{formatDate(file.lastModified)}</span>
                      </div>
                    </div>
                    <div className="file-actions">
                      <a
                        href={file.downloadUrl}
                        download={file.name}
                        className="download-btn"
                        title={`Download ${file.name}`}
                      >
                        <Download size={16} />
                        Download
                      </a>
                      <button
                        onClick={() => handleDeleteFile(file)}
                        disabled={deletingFile === file.fullPath}
                        className="delete-btn"
                        title={`Delete ${file.name}`}
                      >
                        {deletingFile === file.fullPath ? (
                          <div className="spinner-small"></div>
                        ) : (
                          <Trash2 size={16} />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <File size={48} className="empty-icon" />
                <p>No files found yet</p>
                <p className="empty-subtext">
                  Files will appear here after you save them in Jupyter Lab.
                  They are automatically backed up every 2 minutes.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="file-browser-footer">
          <p>💡 Files are automatically saved to your personal S3 folder</p>
        </div>
      </div>
    </div>
  );
};

export default FileBrowser;