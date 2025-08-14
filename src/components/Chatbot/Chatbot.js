import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Box, 
  IconButton, 
  TextField, 
  Typography, 
  Paper, 
  Fade, 
  Zoom, 
  CircularProgress, 
  Avatar,
  Tooltip,
  Badge,
  Button
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { profileAPI } from '../../services/api';
import { styled, keyframes } from '@mui/system';
import { alertAPI } from '../../services/api';

const bounce = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0); }
`;

const ChatbotContainer = styled(Box)({
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  zIndex: 1000,
});

const ChatButton = styled(IconButton)({
  backgroundColor: '#1976d2',
  color: 'white',
  '&:hover': {
    backgroundColor: '#1565c0',
  },
  animation: `${bounce} 2s infinite`,
});

const ChatWindow = styled(Paper)({
  width: '350px',
  maxHeight: '500px',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: '10px',
  overflow: 'hidden',
  boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
});

const ChatHeader = styled(Box)({
  backgroundColor: '#1976d2',
  color: 'white',
  padding: '8px 16px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  '& .header-actions': {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
});

const MessagesContainer = styled(Box)({
  flex: 1,
  padding: '16px',
  overflowY: 'auto',
  backgroundColor: '#f5f5f5',
});

const MessageContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  maxWidth: '100%',
  marginBottom: '16px',
  '&.user-message': {
    alignItems: 'flex-end',
  },
  '&.ai-message': {
    alignItems: 'flex-start',
  },
});

const MessageContent = styled(Box)(({ isUser }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px',
  maxWidth: '80%',
}));

const MessageBubble = styled(Box)(({ isUser }) => ({
  padding: '10px 14px',
  borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
  backgroundColor: isUser ? '#1976d2' : '#f0f0f0',
  color: isUser ? 'white' : 'inherit',
  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  wordBreak: 'break-word',
}));

const MessageText = styled(Typography)({
  fontSize: '0.9rem',
  lineHeight: 1.4,
  whiteSpace: 'pre-line',
});

const InputContainer = styled(Box)({
  display: 'flex',
  padding: '10px',
  borderTop: '1px solid #e0e0e0',
  backgroundColor: 'white',
});

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const initialMessages = [
    { 
      id: Date.now(),
      text: 'Hello! I\'m your Smart Environment Monitor assistant. Type "help" to see what I can do.', 
      isUser: false,
      timestamp: new Date()
    },
  ];
  
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { user, updateUser } = useAuth();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const resetChat = () => {
    setMessages(initialMessages);
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type and size (max 5MB)
    if (!file.type.startsWith('image/')) {
      setMessages(prev => [...prev, { 
        id: Date.now(),
        text: '❌ Please upload an image file (JPEG, PNG, etc.)', 
        isUser: false, 
        timestamp: new Date() 
      }]);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessages(prev => [...prev, { 
        id: Date.now(),
        text: '❌ Image size should be less than 5MB', 
        isUser: false, 
        timestamp: new Date() 
      }]);
      return;
    }

    setIsUploading(true);
    
    try {
      const response = await profileAPI.uploadAvatar(file, user?.profile?.twoFAEnabled ? prompt('Please enter your 2FA code:') : undefined);
      
      if (response.data.success) {
        // Update user context with new avatar
        const updatedUser = { ...user, profile: { ...user.profile, avatar: response.data.avatar } };
        updateUser(updatedUser);
        
        setAvatar(response.data.avatar);
        setMessages(prev => [...prev, { 
          id: Date.now(),
          text: '✅ Profile picture updated successfully!', 
          isUser: false, 
          timestamp: new Date() 
        }]);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setMessages(prev => [...prev, { 
        id: Date.now(),
        text: `❌ ${error.response?.data?.message || 'Failed to update profile picture. Please try again.'}`, 
        isUser: false, 
        timestamp: new Date() 
      }]);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Format date to display in chat
  const formatChatDate = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isLoading) return;

    // Get current timestamp for the message
    const currentTime = new Date();
    
    // Add user message
    const userMessage = { 
      id: Date.now(),
      text: inputValue, 
      isUser: true, 
      timestamp: currentTime,
      showTime: true
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const userMessage = inputValue.trim().toLowerCase();
      
      // Check if user wants to send an alert
      if (userMessage.includes('send alert')) {
        // Add a temporary message while processing
        const processingMsg = { 
          id: Date.now() + 1,
          text: '📤 Sending alert to your registered email...', 
          isUser: false,
          timestamp: new Date(),
          showTime: false
        };
        setMessages(prev => [...prev, processingMsg]);
        
        try {
          // Call the alert API
          const response = await alertAPI.sendAlert(
            userMessage.replace('send alert', '').trim() || 
            'Alert triggered from chatbot'
          );
          
          if (response && response.success) {
            // Create success message with image
            const successMessage = {
              id: Date.now() + 2,
              text: '✅ Alert has been sent successfully!',
              isUser: false,
              timestamp: new Date(),
              showTime: true,
              additionalInfo: {
                type: 'emailSent',
                email: response.email || user.email,
                message: 'The alert has been sent to your registered email address with the latest environment data.',
                timestamp: new Date().toLocaleString()
              }
            };
            
            // Update messages with success message
            setMessages(prev => [
              ...prev.filter(msg => msg.id !== processingMsg.id),
              successMessage
            ]);
          } else {
            throw new Error(response?.error || 'Failed to send alert');
          }
        } catch (error) {
          console.error('Alert API error:', error);
          setMessages(prev => [
            ...prev.filter(msg => msg !== processingMsg),
            { 
              text: `❌ ${error.response?.data?.message || 'Failed to send alert. Please try again later.'}`,
              isUser: false 
            }
          ]);
        }
      } else {
        // Process regular message
        const botResponse = getBotResponse(userMessage);
        setMessages(prev => [...prev, { 
          id: Date.now(),
          text: botResponse, 
          isUser: false,
          timestamp: new Date(),
          showTime: false
        }]);
      }
    } catch (error) {
      console.error('Error sending alert:', error);
      setMessages(prev => [...prev, { 
        text: '❌ Failed to send alert. Please try again later.', 
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getBotResponse = (message) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
      return '👋 Hello! How can I assist you with your environment monitoring today?';
    } else if (lowerMessage.includes('temperature') || lowerMessage.includes('temp')) {
      return '🌡️ The current temperature is 25°C. Would you like more detailed environmental data?';
    } else if (lowerMessage.includes('alert') || lowerMessage.includes('warning')) {
      return '🔔 You can type "send alert" to receive an email notification with the current status.';
    } else if (lowerMessage.includes('help')) {
      return '❓ I can help you with: \n\n' +
        '🌡️ Current environmental data \n' +
        '📊 Device status \n' +
        '📨 Alert notifications (type "send alert") \n' +
        'ℹ️ General information';
    } else if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
      return '😊 You\'re welcome! Is there anything else I can help you with?';
    } else if (lowerMessage.includes('time') || lowerMessage.includes('date')) {
      return `⏰ The current time is ${new Date().toLocaleTimeString()} on ${new Date().toLocaleDateString()}.`;
    }
    return '🤔 I\'m not sure how to respond to that. Try asking about temperature, alerts, or type "help" for more options.';
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  if (!user) return null; // Only show for logged-in users

  return (
    <ChatbotContainer>
      {isOpen ? (
        <Zoom in={isOpen}>
          <ChatWindow elevation={3}>
            <ChatHeader>
              <Typography variant="subtitle1">Smart Environment Assistant</Typography>
              <div className="header-actions">
                <Tooltip title="Refresh Chat">
                  <IconButton size="small" onClick={resetChat} style={{ color: 'white' }}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Update Profile Picture">
                  <IconButton 
                    component="label" 
                    size="small" 
                    style={{ color: 'white' }}
                    disabled={isUploading}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      hidden
                      accept="image/*"
                      onChange={handleAvatarUpload}
                    />
                    {isUploading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <PhotoCameraIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Close Chat">
                  <IconButton size="small" onClick={() => setIsOpen(false)} style={{ color: 'white' }}>
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
              </div>
            </ChatHeader>
            <MessagesContainer>
              {messages.map((msg) => (
                <Fade in={true} key={msg.id} timeout={300}>
                  <MessageContainer className={msg.isUser ? 'user-message' : 'ai-message'}>
                    <MessageContent isUser={msg.isUser}>
                      {!msg.isUser && (
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#1976d2' }}>
                          <SmartToyIcon fontSize="small" />
                        </Avatar>
                      )}
                      <MessageBubble isUser={msg.isUser}>
                        <MessageText variant="body2">
                          {msg.text}
                        </MessageText>
                        {msg.showTime && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              display: 'block',
                              textAlign: 'right',
                              mt: 0.5,
                              opacity: 0.7,
                              fontSize: '0.7rem',
                              color: msg.isUser ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)'
                            }}
                          >
                            {formatChatDate(msg.timestamp)} • {new Date(msg.timestamp).toLocaleDateString()}
                          </Typography>
                        )}
                        {msg.additionalInfo?.type === 'emailSent' && (
                          <Box sx={{ 
                            mt: 2,
                            p: 0,
                            borderRadius: 2,
                            overflow: 'hidden',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            border: '1px solid rgba(25, 118, 210, 0.12)'
                          }}>
                            {/* Header with success icon */}
                            <Box sx={{ 
                              bgcolor: 'rgba(46, 125, 50, 0.08)',
                              p: 2,
                              display: 'flex',
                              alignItems: 'center',
                              borderBottom: '1px solid rgba(46, 125, 50, 0.12)'
                            }}>
                              <CheckCircleOutlineIcon 
                                sx={{ 
                                  color: '#2e7d32', 
                                  fontSize: 24,
                                  mr: 1.5
                                }} 
                              />
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                                  Alert Email Sent Successfully!
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#2e7d32', opacity: 0.9 }}>
                                  {new Date(msg.additionalInfo.timestamp).toLocaleString()}
                                </Typography>
                              </Box>
                            </Box>
                            
                            {/* Email Preview */}
                            <Box sx={{ p: 2.5, bgcolor: 'white' }}>
                              <Box sx={{ display: 'flex', mb: 2, alignItems: 'center' }}>
                                <Box sx={{ 
                                  width: 48, 
                                  height: 48, 
                                  borderRadius: '50%',
                                  bgcolor: 'rgba(25, 118, 210, 0.1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mr: 2,
                                  flexShrink: 0
                                }}>
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#1976d2">
                                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                                  </svg>
                                </Box>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    Smart Environment Monitor
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    alert@yourenvmonitor.com
                                  </Typography>
                                </Box>
                              </Box>
                              
                              <Box sx={{ 
                                bgcolor: '#f8f9fa', 
                                p: 2, 
                                borderRadius: 1,
                                borderLeft: '3px solid #1976d2',
                                mb: 2
                              }}>
                                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                                  To: {msg.additionalInfo.email}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                  {msg.additionalInfo.message}
                                </Typography>
                              </Box>
                              
                              <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mt: 2,
                                pt: 2,
                                borderTop: '1px dashed rgba(0,0,0,0.1)'
                              }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  PDF report attached
                                </Typography>
                                <Button 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ 
                                    textTransform: 'none',
                                    fontSize: '0.75rem',
                                    color: 'primary.main',
                                    borderColor: 'primary.light',
                                    '&:hover': {
                                      bgcolor: 'rgba(25, 118, 210, 0.04)',
                                      borderColor: 'primary.main'
                                    }
                                  }}
                                >
                                  View in Inbox
                                </Button>
                              </Box>
                            </Box>
                          </Box>
                        )}
                      </MessageBubble>
                      {msg.isUser && (
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={
                            <IconButton 
                              component="label" 
                              size="small" 
                              sx={{ 
                                width: 24, 
                                height: 24, 
                                bgcolor: 'primary.main',
                                '&:hover': { bgcolor: 'primary.dark' },
                                position: 'absolute',
                                bottom: -8,
                                right: -8,
                              }}
                              disabled={isUploading}
                            >
                              <input
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={handleAvatarUpload}
                              />
                              <PhotoCameraIcon sx={{ fontSize: 12, color: 'white' }} />
                            </IconButton>
                          }
                        >
                          <Box sx={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '2px solid white',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'primary.main',
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: 500
                          }}>
                            {user?.profile?.avatar ? (
                              <img 
                                src={`${process.env.REACT_APP_API_URL}/uploads/avatars/${user.profile.avatar}?${new Date().getTime()}`} 
                                alt="Profile"
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  objectFit: 'cover' 
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <Box sx={{ 
                              display: user?.profile?.avatar ? 'none' : 'flex',
                              width: '100%',
                              height: '100%',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </Box>
                          </Box>
                        </Badge>
                      )}
                    </MessageContent>
                  </MessageContainer>
                </Fade>
              ))}
              <div ref={messagesEndRef} />
            </MessagesContainer>
            <InputContainer>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder={isLoading ? 'Sending...' : 'Type your message...'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
              <IconButton 
                color="primary" 
                onClick={handleSendMessage}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
              </IconButton>
            </InputContainer>
          </ChatWindow>
        </Zoom>
      ) : (
        <Fade in={!isOpen}>
          <ChatButton 
            color="primary" 
            aria-label="chat" 
            onClick={() => setIsOpen(true)}
          >
            <ChatIcon />
          </ChatButton>
        </Fade>
      )}
    </ChatbotContainer>
  );
};

export default Chatbot;
