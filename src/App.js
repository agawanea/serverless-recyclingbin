import React, { useState, useEffect } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify';
import { uploadData } from '@aws-amplify/storage';
import { fetchUserAttributes, fetchAuthSession } from '@aws-amplify/auth';
import Webcam from 'react-webcam';
import { Button, Container, Row, Col, Card, ListGroup, Badge } from 'react-bootstrap';
import { Camera, Leaderboard, Redeem, RecyclingRounded } from '@mui/icons-material';
import config from './aws-exports';
import '@aws-amplify/ui-react/styles.css'; // Ensure Amplify UI styles are imported

Amplify.configure(config);

const API_ENDPOINT = 'https://axlnfr7ex4.execute-api.us-east-1.amazonaws.com/prod';

// Custom CSS for centering the entire app
const appStyles = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  justifyContent: 'center',
  background: '#f8f9fa'
};

// Added the missing containerStyles constant
const containerStyles = {
  maxWidth: '1000px',
  margin: '0 auto',
  padding: '20px',
  boxShadow: '0 .5rem 1rem rgba(0,0,0,.15)',
  borderRadius: '.5rem',
  background: '#fff'
};


const App = () => {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');

  // Simply add this comment before the useEffect
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // eslint-disable-next-line
  useEffect(() => {
    fetchLeaderboard();
    fetchUserPoints();
  }, []);

  // Get auth token for API calls
  const getAuthToken = async () => {
    try {
      const session = await fetchAuthSession();
      return session.tokens.accessToken.toString();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };
  
  // Helper function to get username from token
  const getUsernameFromToken = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.accessToken.toString();
      
      // Parse the token (simple approach - in production use a proper JWT library)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      console.log('Token payload:', payload);
      return payload.username || payload.sub;
    } catch (error) {
      console.error('Error extracting username from token:', error);
      return null;
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('No auth token available');
      
      const response = await fetch(`${API_ENDPOINT}/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Leaderboard data:', data);
      setLeaderboard(Array.isArray(data) ? data : []);
      setError(null);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboard([]);
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPoints = async () => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('No auth token available');
      
      const userAttributes = await fetchUserAttributes();
      console.log('User attributes from Cognito:', userAttributes);
      
      // First try to get username directly from the token
      const username = await getUsernameFromToken();
      console.log('Username from token:', username);
      setUsername(username);

      if (!username) {
        throw new Error('Could not determine username');
      }
      
      const response = await fetch(`${API_ENDPOINT}/users/${username}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('User points data:', data);
      
      // Ensure points is treated as a number
      const pointsValue = parseInt(data?.points || 0, 10);
      console.log('Setting user points to:', pointsValue);
      setUserPoints(pointsValue);
    } catch (error) {
      console.error('Error fetching points:', error);
      setUserPoints(0);
    }
  };

  const handleCapture = async (imageSrc) => {
    try {
      // Get username from token - most reliable source
      const username = await getUsernameFromToken();
      console.log('Username for S3 upload:', username);
      
      if (!username) {
        throw new Error('Could not determine username for upload');
      }
      
      // Convert base64 data URL to blob
      const fetchResponse = await fetch(imageSrc);
      const blob = await fetchResponse.blob();
      
      // Create S3 path with username and timestamp
      const timestamp = Date.now();
      const filePath = `uploads/${username}/${timestamp}.jpg`;
      console.log('Uploading image to path:', filePath);
      
      await uploadData({
        key: filePath,
        data: blob,
        options: {
          contentType: 'image/jpeg'
        }
      });
      
      console.log('Image uploaded successfully');
      setCameraOpen(false);
      fetchUserPoints();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image. Please try again.');
    }
  };

  const handleRedeem = async (rewardId) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('No auth token available');
      
      console.log(`Redeeming reward: ${rewardId}`);
      
      const response = await fetch(`${API_ENDPOINT}/redeem`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rewardId })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      alert(`Successfully redeemed ${rewardId}!`);
      fetchUserPoints();
    } catch (error) {
      console.error('Redemption failed:', error);
      alert('Failed to redeem reward. Please try again.');
    }
  };

  return (
    <div style={appStyles}>
      <Authenticator>
        {({ signOut }) => (
          <Container style={containerStyles}>
            {/* Header with gradient background */}
            {/* Header with gradient background */}
            <Card className="mb-4 border-0 shadow-sm">
              <Card.Body className="bg-gradient" style={{ 
                background: 'linear-gradient(135deg, #43a047 0%, #1de9b6 100%)',
                borderRadius: '0.5rem',
                padding: '0.5rem'
              }}>
                <div className="d-flex justify-content-between align-items-center flex-wrap">
                  <h1 className="m-0 text-white d-flex align-items-center">
                    <RecyclingRounded sx={{ fontSize: 38, marginRight: 1 }} /> 
                    <span>GreenWallet: Snap, Recycle, Reward</span>
                  </h1>
                  <div className="d-flex align-items-center mt-2 mt-sm-0">
                    <Card className="me-3 border-0">
                      <Card.Body className="py-1 px-3 d-flex align-items-center">
                        {username && (
                          <span className="text-dark bg-light px-2 py-1 rounded-pill me-2">
                            Hello {username}!
                          </span>
                        )}
                        <span className="fw-bold mx-2"> Your Points: </span>
                        <span className="fs-4 text-success fw-bold">{userPoints}</span>
                      </Card.Body>
                    </Card>
                    <Button variant="light" onClick={signOut}>Sign Out</Button>
                  </div>
                </div>
              </Card.Body>
            </Card>

            <Row className="g-4">
              {/* Main content area - Camera and instructions */}
              <Col md={8}>
                <Card className="shadow-sm h-100 border-0">
                  <Card.Header className="bg-white border-bottom-0 pb-0">
                    <h4 className="text-primary">Recycle &amp; Earn</h4>
                  </Card.Header>
                  <Card.Body>
                    {!cameraOpen ? (
                      <div className="text-center py-4">
                        <img 
                          src="https://img.icons8.com/color/96/000000/recycle-sign.png" 
                          alt="Recycle"
                          className="mb-3"
                        />
                        <h5 className="mb-3">Take a photo of your recyclable item</h5>
                        <p className="text-muted mb-4">
                          Our AI will identify recyclable materials and award you points!
                        </p>
                        <Button 
                          variant="success" 
                          size="lg" 
                          onClick={() => setCameraOpen(true)}
                          className="px-4"
                        >
                          <Camera className="me-2" />
                          Open Camera
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Webcam
                          audio={false}
                          screenshotFormat="image/jpeg"
                          className="rounded shadow-sm"
                          style={{ maxWidth: '100%', maxHeight: '350px' }}
                        >
                          {({ getScreenshot }) => (
                            <div className="mt-3">
                              <Button
                                variant="success"
                                size="lg"
                                onClick={() => handleCapture(getScreenshot())}
                                className="me-2"
                              >
                                <Camera className="me-2" />
                                Capture
                              </Button>
                              <Button
                                variant="outline-secondary"
                                onClick={() => setCameraOpen(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </Webcam>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>

            {/* Leaderboard */}
            <Col md={4}>
              <Card className="shadow-sm h-100 border-0">
                <Card.Header className="bg-primary text-white text-center">
                  <h2 className="m-0 d-flex align-items-center justify-content-center">
                   <Leaderboard style={{ marginRight: '5px' }} /> {/* Direct inline style */}
                  Leaderboard
                  </h2>
                </Card.Header>
                <Card.Body className="p-1">
                  {loading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="text-center text-danger p-3">{error}</div>
                  ) : Array.isArray(leaderboard) && leaderboard.length > 0 ? (
                <table className="table table-hover mb-0" style={{ tableLayout: 'fixed' }}>
                  <thead className="table-light">
                    <tr>
                      <th className="text-center align-left" style={{ width: "20%" }}>Rank</th>
                      <th className="text-center align-left" style={{ width: "50%" }}>User</th>
                      <th className="text-center align-left" style={{ width: "30%" }}>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard
                      .map((entry, index) => (
                        <tr key={entry.userId || index}>
                          <td className="text-center align-middle">
                            <span className="badge bg-primary rounded-circle">{index + 1}</span>
                          </td>
                          <td className="text-center align-middle">
                            {entry.userId}
                          </td>
                          <td className="text-center align-middle">
                            <Badge bg="success" pill className="px-3 py-2">
                              {entry.points} pts
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                  ) : (
                    <div className="text-center p-4">No leaderboard data available</div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            </Row>

            {/* Rewards Section */}
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-warning text-dark d-flex align-items-center">
                <h2 className="m-0">
                <Redeem style={{ marginRight: '5px' }} /> {/* Direct inline style */}
                Redeem Your Rewards
                </h2>
              </Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between" style={{ gap: '15px' }}>
                  {[
                    { id: 'BIO-BAG', points: 300, title: 'Bio-degradabe bamboo Bag', icon: '🛍️ ' },
                    { id: 'Dominos-50', points: 500, title: 'Dominos 50% Off coupon', icon: '🍕 ' },
                    { id: 'Tree', points: 1000, title: 'Plant a Tree', icon: '🌳 ' }
                  ].sort((a, b) => a.points - b.points).map(reward => {
                    const isDisabled = userPoints < reward.points;
                    
                    return (
                      <div key={reward.id} className="flex-grow-1" style={{ maxWidth: 'calc(100% - 10px)' }}>
                        <Card className={`h-100 ${!isDisabled ? 'border-success' : ''}`}>
                          <Card.Body className="text-center">
                            {/* Icon directly beside title in same line with better layout */}
                            <div className="text-center mb-3">
                              <h3 className="card-title d-inline-flex align-items-center justify-content-center">
                                <span className="fs-3">{reward.icon}</span>
                                {reward.title}
                              </h3>
                            </div>
                            {reward.points} points
                            <Button 
                              variant={isDisabled ? "outline-secondary" : "success"} 
                              disabled={isDisabled}
                              onClick={() => handleRedeem(reward.id)}
                              className="w-100"
                            >
                              {isDisabled ? `Need ${reward.points - userPoints} more` : 'Redeem Now'}
                            </Button>
                          </Card.Body>
                          {!isDisabled && (
                            <div className="position-absolute top-0 start-0 p-2">
                              <span className="badge bg-success">Available</span>
                            </div>
                          )}
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </Card.Body>
            </Card>
            
            <footer className="text-center mt-4 py-3">
              <small className="text-muted">GreenWallet © 2024 - Snap, Recycle, Reward</small>
            </footer>
          </Container>
        )}
      </Authenticator>
    </div>
  );
};
export default App;
