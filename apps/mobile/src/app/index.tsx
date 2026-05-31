import { View, Text, FlatList, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, PanResponder, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { useState, useRef } from 'react';

const DUMMY_MESSAGES = [
  { id: '1', text: 'Hey, did you see the new iOS 26 Glass UI?', isSent: false, time: '10:42 AM' },
  { id: '2', text: 'Yes! The mesh gradient looks amazing behind these frosted bubbles.', isSent: true, time: '10:45 AM' },
  { id: '3', text: 'Exactly what we wanted. And it uses the exact same shared crypto logic as the web app!', isSent: false, time: '10:47 AM' },
];

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const slideAnim = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx < 0) {
          // Limit the slide to -80
          slideAnim.setValue(Math.max(gestureState.dx, -80));
        }
      },
      onPanResponderRelease: () => {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 12,
        }).start();
      }
    })
  ).current;

  const renderMessage = ({ item }: { item: typeof DUMMY_MESSAGES[0] }) => {
    return (
      <View style={styles.messageWrapper}>
        <Animated.View style={[
          styles.messageRow, 
          item.isSent ? styles.messageRowSent : styles.messageRowReceived,
          { transform: [{ translateX: slideAnim }] }
        ]}>
          <BlurView 
            intensity={80} 
            tint={item.isSent ? "systemChromeMaterialLight" : "light"}
            style={[
              styles.messageBubble, 
              item.isSent ? styles.messageBubbleSent : styles.messageBubbleReceived
            ]}
          >
            <Text style={[styles.messageText, item.isSent ? styles.messageTextSent : styles.messageTextReceived]}>
              {item.text}
            </Text>
          </BlurView>
        </Animated.View>
        
        {/* Hidden Timestamp that reveals on swipe */}
        <Animated.View style={[
          styles.hiddenTimestamp,
          {
            opacity: slideAnim.interpolate({
              inputRange: [-60, 0],
              outputRange: [1, 0],
              extrapolate: 'clamp'
            })
          }
        ]}>
          <Text style={styles.hiddenTimestampText}>{item.time}</Text>
          {item.isSent && <Text style={styles.hiddenReadReceipt}>✓✓</Text>}
        </Animated.View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.container} {...panResponder.panHandlers}>
        <FlatList
          data={DUMMY_MESSAGES}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
        />
      </View>
      
      <BlurView intensity={90} tint="light" style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="iMessage"
          placeholderTextColor="#8e8e93"
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity style={styles.sendButton}>
          <Text style={styles.sendButtonText}>↑</Text>
        </TouchableOpacity>
      </BlurView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContent: {
    padding: 16,
    paddingTop: 100, // accommodate header
  },
  messageWrapper: {
    width: '100%',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
  },
  messageRowSent: {
    justifyContent: 'flex-end',
  },
  messageRowReceived: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  messageBubbleSent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4,
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    borderColor: 'rgba(10, 132, 255, 0.2)',
    borderWidth: 1,
  },
  messageBubbleReceived: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTextSent: {
    color: '#002f6c',
  },
  messageTextReceived: {
    color: '#1c1c1e',
  },
  hiddenTimestamp: {
    position: 'absolute',
    right: -60, // Start hidden off-screen to the right of the bubble
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 60,
  },
  hiddenTimestampText: {
    fontSize: 11,
    color: '#8e8e93',
  },
  hiddenReadReceipt: {
    fontSize: 12,
    color: '#0A84FF',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#0A84FF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  }
});
