import { View, Text, FlatList, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, PanResponder, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { useState, useRef, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useAuthStore } from '../../../../lib/stores/authStore';
import { decryptMessage, encryptForMultipleDevices, deriveSharedKey } from '@securevibechat/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen() {
  const { id: chatId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const router = useRouter();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [myPrivateKey, setMyPrivateKey] = useState<string | null>(null);
  const [myDeviceId, setMyDeviceId] = useState<string | null>(null);
  const [recipientDevices, setRecipientDevices] = useState<Record<string, string>>({});
  const [myPublicKey, setMyPublicKey] = useState<string | null>(null);

  // Load encryption keys
  useEffect(() => {
    if (!user) return;
    const loadKeys = async () => {
      const pk = await AsyncStorage.getItem(`privateKey_${user.uid}`);
      const dId = await AsyncStorage.getItem(`deviceId_${user.uid}`);
      if (pk && dId) {
        setMyPrivateKey(pk);
        setMyDeviceId(dId);
        
        // Fetch my device doc to get my public key
        const myDevDoc = await getDoc(doc(db, `users/${user.uid}/devices/${dId}`));
        if (myDevDoc.exists()) {
          setMyPublicKey(myDevDoc.data().publicKey);
        }
      }
    };
    loadKeys();
  }, [user]);

  // Load chat and recipient keys
  useEffect(() => {
    if (!chatId || !user) return;

    const fetchChatInfo = async () => {
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (chatDoc.exists()) {
        const data = chatDoc.data();
        const otherUserId = data.participants?.find((uid: string) => uid !== user.uid);
        
        if (otherUserId) {
          // Fetch their devices
          const unsubDevices = onSnapshot(collection(db, `users/${otherUserId}/devices`), (snap) => {
            const devices: Record<string, string> = {};
            snap.forEach(d => {
              if (d.data().publicKey) {
                devices[d.id] = d.data().publicKey;
              }
            });
            setRecipientDevices(devices);
          });
          return unsubDevices;
        }
      }
    };
    fetchChatInfo();
  }, [chatId, user]);

  // Listen to messages
  useEffect(() => {
    if (!chatId || !user || !myPrivateKey || !myDeviceId) return;

    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList: any[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        let decryptedText = '';
        
        if (data.type === 'system') {
          decryptedText = data.systemText || '';
        } else if (data.ciphertexts && data.ciphertexts[myDeviceId]) {
          try {
            const cdata = data.ciphertexts[myDeviceId];
            const sharedKey = deriveSharedKey(myPrivateKey, cdata.senderPublicKey);
            decryptedText = decryptMessage(cdata, sharedKey);
          } catch (e) {
            decryptedText = '🔒 Error decrypting message';
          }
        } else {
          decryptedText = '🔒 Encrypted message';
        }

        msgList.push({
          id: docSnap.id,
          ...data,
          decryptedText,
          isSent: data.senderId === user.uid
        });
      });
      setMessages(msgList);
      setLoading(false);
    });

    return unsubscribe;
  }, [chatId, user, myPrivateKey, myDeviceId]);

  const handleSend = async () => {
    if (!inputText.trim() || !user || !myPrivateKey || !myPublicKey) return;
    
    const text = inputText;
    setInputText('');

    // Encrypt for recipients
    const allRecipientDevices = { ...recipientDevices };
    // Add our own device so we can read it too
    allRecipientDevices[myDeviceId!] = myPublicKey;

    const ciphertexts = encryptForMultipleDevices(text, myPrivateKey, myPublicKey, allRecipientDevices);

    await addDoc(collection(db, `chats/${chatId}/messages`), {
      senderId: user.uid,
      type: 'text',
      ciphertexts,
      status: 'sent',
      createdAt: serverTimestamp()
    });
  };

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

  const renderMessage = ({ item }: { item: any }) => {
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
              {item.decryptedText || item.text}
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
          <Text style={styles.hiddenTimestampText}>
            {item.createdAt ? new Date(item.createdAt?.toMillis?.() || item.createdAt?.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Now'}
          </Text>
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
          data={messages}
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
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
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
