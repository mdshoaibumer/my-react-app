import React, { useState } from 'react';
import axios from 'axios';
import { 
  Button, 
  TextField, 
  Box, 
  Typography,
  Grid,
  Paper,
  InputAdornment
} from '@mui/material';
import { Link, Public } from '@mui/icons-material';

function ScannerForm({ onScanStart, onScanComplete, onError }) {
  const [url, setUrl] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [showExamples, setShowExamples] = useState(false);

  const validateUrl = (input) => {
    try {
      new URL(input);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateUrl(url)) {
      setIsValidUrl(false);
      return;
    }
    
    onScanStart(url);
    setIsValidUrl(true);
    
    try {
      const baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
      const response = await axios.post(`${baseURL}/api/scan`, { url });
      onScanComplete(response.data);
    } catch (err) {
      onError(err.response?.data?.error || err.message);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            variant="outlined"
            label="Website URL to scan"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            error={!isValidUrl}
            helperText={!isValidUrl ? 'Please enter a valid URL (e.g., https://example.com)' : ''}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Link sx={{ fontSize: 24 }} />
                </InputAdornment>
              ),
            }}
            placeholder="https://example.com"
            aria-label="Enter website URL to scan for accessibility issues"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            size="large"
            fullWidth
            sx={{ height: '100%' }}
          >
            Scan for Accessibility Issues
          </Button>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button 
          size="small" 
          color="primary"
          variant="outlined"
          onClick={() => setShowExamples(!showExamples)}
        >
          {showExamples ? 'Hide Examples' : 'See Example Government Sites'}
        </Button>
      </Box>
      
      {showExamples && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            Try scanning these government websites:
          </Typography>
          <Grid container spacing={2}>
            {[
              { name: 'SSA.gov', url: 'https://www.ssa.gov' },
              { name: 'Medicare.gov', url: 'https://www.medicare.gov' },
              { name: 'Veterans Affairs', url: 'https://www.va.gov' },
              { name: 'USDA', url: 'https://www.usda.gov' }
            ].map((site, index) => (
              <Grid item xs={6} sm={3} key={index}>
                <Paper 
                  variant="outlined" 
                  elevation={1}
                  sx={{ p: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                  onClick={() => setUrl(site.url)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Public sx={{ mr: 1, color: 'primary.main', fontSize: 24 }} />
                    <Typography>{site.name}</Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}

export default ScannerForm;