import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Box, IconButton, TextField, Typography, Paper, Slide, Fade, Zoom, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
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
  padding: '12px 16px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const MessagesContainer = styled(Box)({
  flex: 1,
  padding: '16px',
  overflowY: 'auto',
  backgroundColor: '#f5f5f5',
});

const Message = styled(Box)(({ isUser }) => ({
  maxWidth: '80%',
  marginBottom: '8px',
  padding: '8px 12px',
  borderRadius: '15px',
  backgroundColor: isUser ? '#e3f2fd' : '#ffffff',
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
}));

const InputContainer = styled(Box)({
  display: 'flex',
  padding: '10px',
  borderTop: '1px solid #e0e0e0',
  backgroundColor: 'white',
});

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: 'Hello! I\'m your Smart Environment Monitor assistant. Type "help" to see what I can do.', isUser: false },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isLoading) return;

    // Add user message
    const userMessage = { text: inputValue, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const userMessage = inputValue.trim().toLowerCase();
      
      // Check if user wants to send an alert
      if (userMessage.includes('send alert')) {
        // Add a temporary message while processing
        const processingMsg = { 
          text: 'Sending alert to your registered email...', 
          isUser: false 
        };
        setMessages(prev => [...prev, processingMsg]);
        
        try {
          // Call the alert API
          const response = await alertAPI.sendAlert(
            userMessage.replace('send alert', '').trim() || 
            'Alert triggered from chatbot'
          );
          
          if (response && response.success) {
            // Update with success message
            setMessages(prev => [
              ...prev.filter(msg => msg !== processingMsg),
              { 
                text: `✅ Alert has been sent to ${response.email || 'your registered email address'}!`,
                isUser: false 
              }
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
        setMessages(prev => [...prev, { text: botResponse, isUser: false }]);
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
    if (message.includes('hi') || message.includes('hello') || message.includes('hey')) {
      return 'Hello! How can I assist you with your environment monitoring today?';
    } else if (message.includes('temperature') || message.includes('temp')) {
      return 'The current temperature is 25°C. Would you like more detailed environmental data?';
    } else if (message.includes('alert') || message.includes('warning')) {
      return 'You can type "send alert" to receive an email notification with the current status.';
    } else if (message.includes('help')) {
      return 'I can help you with: \n- Current environmental data \n- Device status \n- Alert notifications (type "send alert") \n- General information';
    }
    return 'I\'m not sure how to respond to that. Try asking about temperature, alerts, or type "help" for more options.';
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
              <IconButton size="small" onClick={() => setIsOpen(false)} style={{ color: 'white' }}>
                <CloseIcon />
              </IconButton>
            </ChatHeader>
            <MessagesContainer>
              {messages.map((msg, index) => (
                <Fade in={true} key={index} timeout={500}>
                  <Message isUser={msg.isUser}>
                    <Typography variant="body2">{msg.text}</Typography>
                  </Message>
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
