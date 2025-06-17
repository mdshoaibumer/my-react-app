import React, { useState } from 'react';
import axios from 'axios';
import { 
  AppBar, 
  Toolbar, 
  Tabs, 
  Tab, 
  Box, 
  CircularProgress, 
  Snackbar, 
  Alert,
  Typography,
  ThemeProvider,
  createTheme,
  Container
} from '@mui/material';
import ScannerForm from './components/ScannerForm';
import ResultsView from './components/ResultsView';
import SearchDashboard from './components/SearchDashboard';
import './App.css';

// Set axios default baseURL to the current origin (e.g., Azure URL)
axios.defaults.baseURL = window.location.origin;

const theme = createTheme({
  palette: {
    primary: {
      main: '#0052cc', // Professional blue inspired by accessibility-focused branding
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#4a4a4a', // Dark gray for secondary elements
    },
    background: {
      default: '#f5f7fa', // Clean, light background
      paper: '#ffffff',
    },
    error: {
      main: '#d32f2f',
    },
    text: {
      primary: '#1a1a1a', // Dark text for readability
      secondary: '#6b7280',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif', // Modern, clean font
    h4: {
      fontWeight: 700,
      fontSize: '2.25rem',
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none', // Professional button text style
      fontWeight: 600,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)', // Subtle shadow for depth
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8, // Rounded corners for modern look
          padding: '8px 16px',
          transition: 'all 0.2s ease-in-out', // Smooth hover effects
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)', // Soft shadow for cards
        },
      },
    },
  },
});

function App() {
  const [scanData, setScanData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentURL, setCurrentURL] = useState('');
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('scanner');

  const handleScanComplete = (data) => {
    setScanData(data);
    setIsLoading(false);
    setError(null);
  };

  const handleError = (err) => {
    setError(err.message || 'Scan failed');
    setIsLoading(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="app">
        <AppBar position="static" color="primary">
          <Toolbar sx={{ py: 1.5 }}>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
              <img 
                src="/complyai-logo.png" 
                alt="ComplyAI Logo" 
                style={{ height: 48, marginRight: 16, objectFit: 'contain' }} 
              />
              <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                ComplyAI Accessibility Scanner
              </Typography>
            </Box>
            <Tabs 
              value={activeView === 'scanner' ? 0 : 1} 
              onChange={(e, newValue) => setActiveView(newValue === 0 ? 'scanner' : 'search')}
              textColor="inherit"
              sx={{
                '& .MuiTab-root': {
                  fontSize: '1rem',
                  fontWeight: 500,
                  px: 3,
                  py: 1,
                },
              }}
            >
              <Tab label="Accessibility Scanner" aria-label="Accessibility Scanner Tab" />
              <Tab label="Compliance Search" aria-label="Compliance Search Tab" />
            </Tabs>
          </Toolbar>
        </AppBar>
        
        <main className="app-main">
          <Container maxWidth="xl" sx={{ py: 4 }}>
            {activeView === 'scanner' && (
              <Box>
                <Typography 
                  variant="h4" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 700, 
                    color: 'text.primary', 
                    mb: 4,
                    textAlign: { xs: 'center', md: 'left' },
                  }}
                >
                  Website Accessibility Scanner
                </Typography>
                
                <ScannerForm 
                  onScanStart={(url) => {
                    setIsLoading(true);
                    setCurrentURL(url);
                    setError(null);
                    setScanData(null);
                  }}
                  onScanComplete={handleScanComplete}
                  onError={handleError}
                />
                
                {isLoading && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 6, py: 4 }}>
                    <CircularProgress size={80} thickness={4} aria-label="Scanning in progress" />
                    <Typography variant="h6" sx={{ mt: 3, color: 'text.primary' }}>
                      Scanning {currentURL}...
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                      Analyzing accessibility compliance (Section 508, WCAG 2.1)
                    </Typography>
                  </Box>
                )}
                
                {error && (
                  <Alert severity="error" sx={{ mt: 4, mb: 4, borderRadius: 2 }}>
                    <Typography variant="body1">Scan Failed</Typography>
                    <Typography variant="body2">{error}</Typography>
                  </Alert>
                )}

                {scanData && <ResultsView data={scanData} />}
              </Box>
            )}
            
            {activeView === 'search' && (
              <Box>
                <SearchDashboard />
              </Box>
            )}
          </Container>
        </main>
        
        <Box 
          component="footer" 
          sx={{ 
            py: 3, 
            px: 2, 
            mt: 'auto', 
            backgroundColor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} ComplyAI - Automated Accessibility Compliance
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Built for Government Section 508 Compliance
          </Typography>
        </Box>
      </div>
    </ThemeProvider>
  );
}

export default App;