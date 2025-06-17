import React, { useState } from 'react';
import { 
  Box, 
  Tabs, 
  Tab, 
  TextField, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  CircularProgress, 
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  Link,
  LinearProgress  // Add this import
} from '@mui/material';
import api from '../api';
import { Search, FilterList, Description } from '@mui/icons-material';

function SearchDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [query, setQuery] = useState('');
  const [minScore, setMinScore] = useState(80);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);

  const handleSearch = async () => {
    if (activeTab === 0 && !query.trim()) {
      setError('Please enter a search query');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResults([]);
    
    try {
      const baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
      let response;
      
      if (activeTab === 0) { // Semantic
        response = await api.post(`${baseURL}/api/search/semantic`, { query });
        // Add to search history
        setSearchHistory(prev => [{ type: 'semantic', query, date: new Date() }, ...prev.slice(0, 4)]);
      } else if (activeTab === 1) { // Compliance
        response = await api.get(`${baseURL}/api/search/compliance`, {
          params: { minScore }
        });
        setSearchHistory(prev => [{ type: 'compliance', minScore, date: new Date() }, ...prev.slice(0, 4)]);
      } else { // Violations
        response = await api.get(`${baseURL}/api/search/violations`, {
          params: { violationId: query }
        });
        setSearchHistory(prev => [{ type: 'violation', query, date: new Date() }, ...prev.slice(0, 4)]);
      }

      const responseData = response.data;
      
      if (activeTab === 0) {
        setResults(responseData.results || []);
      } else {
        setResults(responseData || []);
      }
      
      if ((activeTab === 0 && !responseData.results?.length) || 
          (activeTab !== 0 && !responseData.length)) {
        setError('No results found. Try different search terms.');
      }
    } catch (err) {
      console.error('Search error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSearchLabel = (item) => {
    if (item.type === 'semantic') return `"${item.query}"`;
    if (item.type === 'violation') return `Violation: ${item.query}`;
    return `Compliance ≥ ${item.minScore}%`;
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return '#e74c3c';
      case 'high': return '#f39c12';
      case 'medium': return '#3498db';
      default: return '#2ecc71';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3, color: '#2c3e50' }}>
        Accessibility Compliance Search
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Tabs 
                value={activeTab} 
                onChange={(e, newValue) => {
                  setActiveTab(newValue);
                  setResults([]);
                  setError(null);
                }}
                sx={{ mb: 2 }}
              >
                <Tab label="Semantic Search" />
                <Tab label="Compliance Ranking" />
                <Tab label="Violation Lookup" />
              </Tabs>

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {activeTab === 0 && (
                  <TextField
                    fullWidth
                    label="Search accessibility issues"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      ),
                    }}
                    placeholder="e.g., color contrast, keyboard navigation"
                  />
                )}
                
                {activeTab === 1 && (
                  <TextField
                    label="Minimum Compliance Score"
                    type="number"
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value)}
                    sx={{ width: 200 }}
                    inputProps={{ min: 0, max: 100 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FilterList />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                
                {activeTab === 2 && (
                  <TextField
                    fullWidth
                    label="Violation ID (e.g., 'color-contrast')"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="html-has-lang, aria-required-attr"
                  />
                )}
                
                <Button 
                  variant="contained" 
                  onClick={handleSearch}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={24} /> : <Search />}
                  sx={{ minWidth: 120 }}
                >
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </Box>

              {error && (
                <Typography color="error" sx={{ mt: 2 }}>
                  Error: {error}
                </Typography>
              )}
            </CardContent>
          </Card>
          
          {!loading && results.length > 0 && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {activeTab === 0 ? 'Semantic Search Results' : 
                   activeTab === 1 ? 'Top Compliant Websites' : 
                   'Violation Occurrences'}
                </Typography>
                
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        {activeTab === 1 ? (
                          <>
                            <TableCell>Website</TableCell>
                            <TableCell align="right">Compliance Score</TableCell>
                            <TableCell>Last Scanned</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>Website</TableCell>
                            <TableCell>Page</TableCell>
                            <TableCell>Violation</TableCell>
                            <TableCell>Severity</TableCell>
                            <TableCell>Description</TableCell>
                            {activeTab === 0 && <TableCell align="right">Similarity</TableCell>}
                          </>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {results.map((result, index) => (
                        <TableRow key={index}>
                          {activeTab === 1 ? (
                            <>
                              <TableCell>{result.domain}</TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                                  <Box sx={{ width: '100%', mr: 1 }}>
                                    <LinearProgress 
                                      variant="determinate" 
                                      value={result.compliance_score} 
                                      sx={{ height: 8, borderRadius: 4 }} 
                                    />
                                  </Box>
                                  <span>{result.compliance_score}%</span>
                                </Box>
                              </TableCell>
                              <TableCell>{new Date(result.last_scanned).toLocaleDateString()}</TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell>{result.domain}</TableCell>
                              <TableCell>
                                <Link href={result.url} target="_blank" rel="noopener">
                                  {result.title || result.url}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={result.violationId || result.violation_id} 
                                  size="small" 
                                  sx={{ fontWeight: 'bold' }} 
                                />
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={result.severity} 
                                  size="small" 
                                  sx={{ 
                                    backgroundColor: getSeverityColor(result.severity),
                                    color: 'white',
                                    fontWeight: 'bold'
                                  }} 
                                />
                              </TableCell>
                              <TableCell>{result.description}</TableCell>
                              {activeTab === 0 && result.similarity && (
                                <TableCell align="right">
                                  <Chip 
                                    label={`${(result.similarity * 100).toFixed(1)}%`} 
                                    variant="outlined" 
                                  />
                                </TableCell>
                              )}
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {!loading && results.length === 0 && !error && (
            <Card variant="outlined" sx={{ textAlign: 'center', p: 4 }}>
              <Description sx={{ fontSize: 60, color: '#bdc3c7', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No results yet
              </Typography>
              <Typography color="textSecondary">
                {activeTab === 0 ? 'Enter a query to search accessibility issues' : 
                 activeTab === 1 ? 'Adjust the compliance score filter' : 
                 'Enter a violation ID to search'}
              </Typography>
            </Card>
          )}
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Searches
              </Typography>
              
              {searchHistory.length > 0 ? (
                <Box>
                  {searchHistory.map((item, index) => (
                    <Box 
                      key={index} 
                      sx={{ 
                        p: 2, 
                        mb: 1, 
                        borderLeft: '3px solid #3498db',
                        backgroundColor: '#f8f9fa',
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#e3f2fd' }
                      }}
                      onClick={() => {
                        if (item.type === 'semantic' || item.type === 'violation') {
                          setQuery(item.query);
                        }
                        if (item.type === 'compliance') {
                          setMinScore(item.minScore);
                        }
                        setActiveTab(item.type === 'compliance' ? 1 : item.type === 'violation' ? 2 : 0);
                        setTimeout(handleSearch, 300);
                      }}
                    >
                      <Typography variant="body2" color="textSecondary">
                        {new Date(item.date).toLocaleTimeString()}
                      </Typography>
                      <Typography sx={{ fontWeight: '500' }}>
                        {getSearchLabel(item)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {item.type === 'semantic' ? 'Semantic Search' : 
                         item.type === 'compliance' ? 'Compliance Ranking' : 'Violation Lookup'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Your recent searches will appear here
                </Typography>
              )}
            </CardContent>
          </Card>
          
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Common Violation IDs
              </Typography>
              
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {[
                  'color-contrast', 
                  'image-alt', 
                  'html-has-lang', 
                  'aria-required-attr',
                  'label',
                  'link-name'
                ].map((id, index) => (
                  <Grid item key={index}>
                    <Chip 
                      label={id} 
                      size="small" 
                      variant="outlined"
                      onClick={() => {
                        setQuery(id);
                        setActiveTab(2);
                        setTimeout(handleSearch, 300);
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
              
              <Typography variant="body2" color="textSecondary">
                Try searching for these common issues or use semantic search for natural language queries.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SearchDashboard;