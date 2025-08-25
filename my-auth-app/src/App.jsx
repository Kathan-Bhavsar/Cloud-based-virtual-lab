import React from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import awsExports from './aws-exports';
import VirtualLabDashboard from './Home.jsx';
import './App.css';

Amplify.configure(awsExports);

function App() {
  return (
    <div className="app-container">
      <Authenticator
        components={{
          SignIn: {
            Header: () => (
              <div className="auth-header">
                <div className="logo-container">
                  <div className="logo-icon">🧪</div>
                  <h1>Virtual Lab</h1>
                </div>
              </div>
            ),
          },
          SignUp: {
            Header: () => (
              <div className="auth-header">
                <div className="logo-container">
                  <div className="logo-icon">🧪</div>
                  <h1>Virtual Lab</h1>
                </div>
              </div>
            ),
          },
          ConfirmSignUp: {
            Header: () => (
              <div className="auth-header">
                <div className="logo-container">
                  <div className="logo-icon">🧪</div>
                  <h1>Virtual Lab</h1>
                </div>
                <h2>Verify Email</h2>
                <p>Check your email for verification code</p>
              </div>
            ),
          }
        }}
      >
        {({ signOut, user }) => (
          <VirtualLabDashboard user={user} signOut={signOut} />
        )}
      </Authenticator>
    </div>
  );
}

export default App;