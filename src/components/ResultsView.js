import React, { useRef, useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Grid,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material';
import { Chart, ArcElement, DoughnutController } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { Error as ErrorIcon, Warning, Info, CheckCircle } from '@mui/icons-material';
import api from '../api';

// Register required Chart.js components
Chart.register(ArcElement, DoughnutController);

function parseSuggestion(suggestion) {
  if (!suggestion) return null;

  const sections = {
    explanation: '',
    fixedHTML: '',
    steps: [],
    wcag: ''
  };

  // Try to split by section headers
  const explanationMatch = suggestion.match(/### Concise Technical Explanation([\s\S]*?)(?=###)/i) || 
                         suggestion.match(/1\. Explanation of this [\w-]+ violation([\s\S]*?)(?=2\.)/i);
  const fixedHTMLMatch = suggestion.match(/### Fixed HTML Snippet([\s\S]*?)(?=###)/i) || 
                        suggestion.match(/2\. Fixed HTML code([\s\S]*?)(?=3\.)/i);
  const stepsMatch = suggestion.match(/### Implementation Steps([\s\S]*?)(?=###)/i) || 
                    suggestion.match(/3\. Implementation steps([\s\S]*?)(?=WCAG reference)/i);
  const wcagMatch = suggestion.match(/### WCAG Reference([\s\S]*)/i) || 
                   suggestion.match(/WCAG reference:?([\s\S]*)/i);

  if (explanationMatch) sections.explanation = explanationMatch[1].trim();
  if (fixedHTMLMatch) sections.fixedHTML = fixedHTMLMatch[1].trim();
  if (stepsMatch) {
    const stepsText = stepsMatch[1].trim();
    sections.steps = stepsText.split('\n')
      .map(step => step.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
      .filter(step => step.length > 0 && !step.match(/implementation steps/i));
  }
  if (wcagMatch) sections.wcag = wcagMatch[1].trim();

  // Fallback to raw suggestion if parsing fails
  if (!sections.explanation && !sections.fixedHTML) {
    return {
      explanation: suggestion,
      fixedHTML: '',
      steps: [],
      wcag: ''
    };
  }

  return sections;
}

function ResultsView({ data }) {
  const chartRef = useRef(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [expanded, setExpanded] = useState(false);
  const [severityCounts, setSeverityCounts] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  });

  const scanData = data;

  const getSeverityIcon = (severity) => {
    switch(severity) {
      case 'critical': return <ErrorIcon sx={{ color: '#e74c3c' }} />;
      case 'high': return <Warning sx={{ color: '#f39c12' }} />;
      case 'medium': return <Info sx={{ color: '#3498db' }} />;
      default: return <CheckCircle sx={{ color: '#2ecc71' }} />;
    }
  };

  useEffect(() => {
    if (data?.violations) {
      const counts = data.violations.reduce((acc, violation) => {
        acc[violation.severity] = (acc[violation.severity] || 0) + 1;
        return acc;
      }, { critical: 0, high: 0, medium: 0, low: 0 });
      setSeverityCounts(counts);
    }
  }, [data]);

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleDownloadPDF = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Create enhanced data with ALL findings
      const enhancedData = {
        ...scanData,
        violations: scanData.violations.map(v => ({
          ...v,
          parsedSuggestion: parseSuggestion(v.suggestion?.suggestion)
        })),
        // Explicitly include keyboard and screen reader issues
        keyboardIssues: scanData.keyboardIssues || [],
        screenReaderIssues: (scanData.screenReaderIssues || []).map(issue => ({
          ...issue,
          parsedSuggestion: parseSuggestion(issue.suggestion?.suggestion)
        }))
      };

      const response = await api.post(
        '/generate-pdf',
        { data: enhancedData },
        { 
          responseType: 'blob',
          timeout: 60000
        }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download', 
        `accessibility-report-${scanData.url.replace(/^https?:\/\//, '')}.pdf`
      );
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

    } catch (err) {
      console.error('PDF download failed:', err);
      let errorMsg = 'Failed to download PDF';
      
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const json = JSON.parse(text);
          errorMsg += `: ${json.error || json.message || 'Unknown error'}`;
        } catch {
          errorMsg += ': Invalid server response';
        }
      } else {
        errorMsg += `: ${err.message}`;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return '#e74c3c';
      case 'high': return '#f39c12';
      case 'medium': return '#3498db';
      default: return '#2ecc71';
    }
  };

  if (!data) return null;

  const chartData = {
    labels: Object.keys(severityCounts).map(k => k.toUpperCase()),
    datasets: [{
      data: Object.values(severityCounts),
      backgroundColor: ['#e74c3c', '#f39c12', '#3498db', '#2ecc71'],
      borderWidth: 0
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'right',
        labels: {
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Typography variant="h4" gutterBottom>
            Scan Results for {data.url}
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Compliance Summary
              </Typography>
              <Typography>
                Risk Score: <span style={{ 
                  color: data.metrics.riskScore > 70 ? '#e74c3c' : 
                        data.metrics.riskScore > 40 ? '#f39c12' : '#2ecc71',
                  fontWeight: 'bold',
                  fontSize: '1.2rem'
                }}>
                  {data.metrics.riskScore}
                </span>
                <span style={{ marginLeft: 8, color: '#7f8c8d' }}>
                  (0 = perfect, 100 = completely inaccessible)
                </span>
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Scanned on: {new Date(data.scannedAt).toLocaleString()}
              </Typography>
            </Box>
            
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleDownloadPDF}
              startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <PictureAsPdfIcon />}
              disabled={loading}
              sx={{ alignSelf: 'flex-start' }}
            >
              {loading ? 'Generating...' : 'Download PDF Report'}
            </Button>
          </Box>
          
          <Box sx={{ height: '300px', mb: 4 }}>
            <Doughnut 
              data={chartData} 
              options={chartOptions}
              ref={chartRef}
            />
          </Box>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Severity Distribution
              </Typography>
              
              {Object.entries(severityCounts).map(([severity, count]) => (
                <Box key={severity} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    {getSeverityIcon(severity)}
                    <Typography variant="body1" sx={{ ml: 1, fontWeight: 'bold', textTransform: 'capitalize' }}>
                      {severity}
                    </Typography>
                    <Chip 
                      label={count} 
                      size="small" 
                      sx={{ 
                        ml: 'auto', 
                        backgroundColor: getSeverityColor(severity), 
                        color: 'white',
                        fontWeight: 'bold'
                      }} 
                    />
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(count / data.violations.length) * 100} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: '#ecf0f1',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getSeverityColor(severity)
                      }
                    }} 
                  />
                </Box>
              ))}
              
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Issues:</span>
                  <span style={{ fontWeight: 'bold' }}>{data.violations.length}</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Page Elements Scanned:</span>
                  <span style={{ fontWeight: 'bold' }}>{data.metrics.elementsScanned || 'N/A'}</span>
                </Typography>
              </Box>
            </CardContent>
          </Card>
          
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Compliance Standards
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip label="Section 508" color="primary" variant="outlined" />
                <Chip label="WCAG 2.1 AA" color="primary" variant="outlined" />
                <Chip label="WCAG 2.2" color="primary" variant="outlined" />
                <Chip label="ATAG 2.0" color="primary" variant="outlined" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Typography variant="h5" gutterBottom>
        Detailed Findings
      </Typography>
      
      {data.violations.map((violation, index) => {
        const parsedSuggestion = parseSuggestion(violation.suggestion?.suggestion);
        
        return (
          <Accordion 
            key={index} 
            sx={{ mb: 2, borderLeft: `4px solid ${getSeverityColor(violation.severity)}` }}
            expanded={expanded === `panel${index}`}
            onChange={handleChange(`panel${index}`)}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                {getSeverityIcon(violation.severity)}
                <Typography sx={{ fontWeight: 'bold', ml: 1 }}>
                  {violation.id} ({violation.severity.toUpperCase()})
                </Typography>
                <Typography sx={{ ml: 2, color: '#7f8c8d' }}>
                  {violation.description}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Description:
                  </Typography>
                  <Typography paragraph sx={{ mb: 2 }}>
                    {violation.description}
                  </Typography>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Affected Element:
                  </Typography>
                  <Box component="pre" sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 1, overflowX: 'auto' }}>
                    <code>{violation.nodes[0].html}</code>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Recommended Fix:
                  </Typography>
                  <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                    {parsedSuggestion ? (
                      <>
                        {parsedSuggestion.explanation && (
                          <>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              Explanation:
                            </Typography>
                            <Typography paragraph sx={{ mb: 2 }}>
                              {parsedSuggestion.explanation}
                            </Typography>
                          </>
                        )}
                        
                        {parsedSuggestion.fixedHTML && (
                          <>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              Fixed HTML:
                            </Typography>
                            <Box component="pre" sx={{ p: 1, bgcolor: '#f0f0f0', borderRadius: 1, overflowX: 'auto', mb: 2 }}>
                              <code>{parsedSuggestion.fixedHTML}</code>
                            </Box>
                          </>
                        )}
                        
                        {parsedSuggestion.steps.length > 0 && (
                          <>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              Implementation Steps:
                            </Typography>
                            <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
                              {parsedSuggestion.steps.map((step, i) => (
                                <li key={i} style={{ marginBottom: '8px' }}>
                                  <Typography variant="body2">{step}</Typography>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                        
                        {parsedSuggestion.wcag && (
                          <>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              WCAG Reference:
                            </Typography>
                            <Typography>{parsedSuggestion.wcag}</Typography>
                          </>
                        )}
                      </>
                    ) : (
                      <Typography paragraph>
                        {violation.suggestion?.suggestion || violation.suggestion?.fallback || 'No suggestion available'}
                      </Typography>
                    )}
                  </Box>
                  
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Standards Affected:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {violation.tags?.map((tag, i) => (
                      <Chip key={i} label={tag} size="small" color="primary" />
                    )) || <Chip label="WCAG 2.1 AA" size="small" color="primary" />}
                  </Box>
                  
                  {violation.helpUrl && (
                    <Button 
                      variant="outlined" 
                      color="primary" 
                      size="small"
                      href={violation.helpUrl}
                      target="_blank"
                    >
                      Learn More
                    </Button>
                  )}
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        );
      })}
      
      {data.keyboardIssues?.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Keyboard Navigation Issues
          </Typography>
          {data.keyboardIssues.map((issue, i) => (
            <Accordion key={`keyboard-${i}`} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 'bold' }}>{issue.type}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>{issue.message}</Typography>
                <Typography variant="subtitle2" gutterBottom>Affected Element:</Typography>
                <Typography>{issue.element}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
      
      {data.screenReaderIssues?.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Screen Reader Issues
          </Typography>
          {data.screenReaderIssues.map((issue, i) => {
            const parsedSuggestion = parseSuggestion(issue.suggestion?.suggestion);
            return (
              <Accordion key={`screenreader-${i}`} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 'bold' }}>{issue.type}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>{issue.message}</Typography>
                  <Typography variant="subtitle2" gutterBottom>
                    Affected Element:
                  </Typography>
                  <Typography>{issue.element}</Typography>
                  
                  {/* Add suggestion display */}
                  {parsedSuggestion && (
                    <>
                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        Recommended Fix:
                      </Typography>
                      <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                        {parsedSuggestion.explanation && (
                          <>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              Explanation:
                            </Typography>
                            <Typography paragraph sx={{ mb: 2 }}>
                              {parsedSuggestion.explanation}
                            </Typography>
                          </>
                        )}
                        
                        {parsedSuggestion.fixedHTML && (
                          <>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              Fixed HTML:
                            </Typography>
                            <Box component="pre" sx={{ p: 1, bgcolor: '#f0f0f0', borderRadius: 1, overflowX: 'auto', mb: 2 }}>
                              <code>{parsedSuggestion.fixedHTML}</code>
                            </Box>
                          </>
                        )}
                        
                        {parsedSuggestion.steps.length > 0 && (
                          <>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              Implementation Steps:
                            </Typography>
                            <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
                              {parsedSuggestion.steps.map((step, j) => (
                                <li key={j} style={{ marginBottom: '8px' }}>
                                  <Typography variant="body2">{step}</Typography>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                        
                        {parsedSuggestion.wcag && (
                          <>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              WCAG Reference:
                            </Typography>
                            <Typography>{parsedSuggestion.wcag}</Typography>
                          </>
                        )}
                      </Box>
                    </>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}
      
      {data.violations.length === 0 && (
        <Box sx={{ textAlign: 'center', p: 4, border: '1px dashed #ddd', borderRadius: 2 }}>
          <CheckCircle sx={{ fontSize: 60, color: '#2ecc71', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            No Accessibility Issues Found!
          </Typography>
          <Typography variant="body1" color="textSecondary">
            This page meets Section 508 and WCAG 2.1 accessibility standards.
          </Typography>
        </Box>
      )}

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ResultsView;