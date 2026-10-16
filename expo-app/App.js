import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  NativeModules,
  NativeEventEmitter,
  PermissionsAndroid,
  useWindowDimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { requestRoom, validEndpoint, requestDiagnosis, extractTextures } from './lib/room-api';
import RoomViewer3D from './components/RoomViewer3D';

const { VoiceRecognition } = NativeModules;
const voiceEmitter = VoiceRecognition ? new NativeEventEmitter(VoiceRecognition) : null;

const DEFAULT_APP_TOKEN = 'f5634d78c2437a8171514944e2ca5c657917267aea61fe77';
const DEFAULT_REMOTE_ENDPOINT = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL
  : 'http://192.168.1.207:8787';

const SUGGESTIONS = [
  'Lớp học bận rộn lúc 12h trưa, bàn học của Thành ở góc phải ngay cửa sổ',
  'Phòng khách ấm cúng thời xưa có ghế sofa nâu và tivi màu',
  'Gian bếp quê hương mộc mạc với bàn ăn gỗ và ấm trà',
  'Góc phòng đọc sách yên bình cạnh cửa sổ lớn đón nắng'
];

const CAREGIVER_SUGGESTIONS = [];

const DEFAULT_SAVED_PRESETS = [
  {
    id: 'preset-classroom-thanh',
    title: 'Lớp học của Thành (Giờ ăn trưa 12h)',
    createdAt: 'Mẫu có sẵn',
    room: {
      title: 'Lớp học của Thành (Giờ ăn trưa 12h)',
      reply: 'Không gian lớp học thân quen với bàn học của Thành cạnh cửa sổ, bảng từ trắng và cặp sách của bạn bè.',
      width: 8,
      depth: 7,
      height: 3.2,
      wallColor: '#F5F5F0',
      floorColor: '#E6E6DF',
      floorTextureStyle: 'classroom_tile',
      lightingStyle: 'morning_sun',
      objects: [
        {
          id: 'desk-thanh',
          kind: 'desk',
          label: 'Bàn học của Thành',
          description: 'Bàn học của Thành nằm ở góc phải ngay cạnh cửa sổ nhiều ánh nắng. Giờ ăn trưa 12h, cặp sách của các bạn học rải rác xung quanh khi mọi người cùng nhau xuống lấy cơm.',
          x: 2.2,
          y: 0,
          z: 1.5,
          yaw: 0,
          width: 1.2,
          height: 0.75,
          depth: 0.65,
          color: '#C49A6C',
          isInteractable: true,
          routineLabel: 'Giờ ăn trưa 12:00'
        },
        {
          id: 'chair-thanh',
          kind: 'chair',
          label: 'Ghế ngồi của Thành',
          description: 'Chiếc ghế gỗ quen thuộc nơi Thành ngồi nghe giảng và trò chuyện cùng bạn bè suốt những năm tháng học trò.',
          x: 2.2,
          y: 0,
          z: 2.1,
          yaw: 0,
          width: 0.45,
          height: 0.82,
          depth: 0.45,
          color: '#A67B4F',
          isInteractable: true
        },
        {
          id: 'window-classroom',
          kind: 'window',
          label: 'Cửa sổ đón nắng',
          description: 'Cửa sổ lớn nhìn ra sân trường với hàng cây xanh mát, nơi gió thổi nhẹ vào mỗi buổi trưa hè mát rượi.',
          x: 3.9,
          y: 1.1,
          z: 1.5,
          yaw: -1.57,
          width: 1.8,
          height: 1.4,
          depth: 0.15,
          color: '#E0E7FF',
          isInteractable: true
        },
        {
          id: 'whiteboard-main',
          kind: 'whiteboard',
          label: 'Bảng lớp học',
          description: 'Bảng lớp học ghi rõ thời khóa biểu: Tiết 4 - 12h xuống canteen ăn trưa, sau đó quay lại lớp học để nghỉ trưa.',
          x: 0,
          y: 1.1,
          z: -3.4,
          yaw: 0,
          width: 3.2,
          height: 1.3,
          depth: 0.1,
          color: '#FFFFFF',
          isInteractable: true
        },
        {
          id: 'backpack-friend',
          kind: 'backpack',
          label: 'Cặp sách của bạn',
          description: 'Chiếc cặp sách của người bạn cùng bàn để lại trên bàn trước khi vội vã chạy xuống canteen lấy đồ ăn.',
          x: 1.9,
          y: 0.75,
          z: 1.4,
          yaw: 0.3,
          width: 0.35,
          height: 0.4,
          depth: 0.25,
          color: '#1E3A8A',
          isInteractable: true
        }
      ]
    }
  },
  {
    id: 'preset-living-room',
    title: 'Phòng khách gia đình ấm cúng',
    createdAt: 'Mẫu có sẵn',
    room: {
      title: 'Phòng khách gia đình ấm cúng',
      reply: 'Phòng khách thân thương với chiếc sofa êm ái, bàn trà và ánh đèn vàng dịu nhẹ.',
      width: 6.5,
      depth: 6,
      height: 3,
      wallColor: '#FFFDF7',
      floorColor: '#6B4423',
      floorTextureStyle: 'wood_planks',
      lightingStyle: 'warm_evening',
      objects: [
        {
          id: 'sofa-living',
          kind: 'sofa',
          label: 'Ghế sofa kỷ niệm',
          description: 'Chiếc sofa nâu êm ái nơi cả gia đình quây quần mỗi tối xem truyền hình và uống trà.',
          x: 0,
          y: 0,
          z: 1.5,
          yaw: 0,
          width: 2.1,
          height: 0.85,
          depth: 0.9,
          color: '#5C3826',
          isInteractable: true
        },
        {
          id: 'tv-vintage',
          kind: 'television',
          label: 'Chiếc tivi màu xưa',
          description: 'Chiếc tivi màu gắn bó với bao buổi tối đầm ấm cùng những chương trình thời sự lúc 19h.',
          x: 0,
          y: 0.6,
          z: -2.4,
          yaw: 3.14,
          width: 1.1,
          height: 0.8,
          depth: 0.4,
          color: '#2B2B2B',
          isInteractable: true
        },
        {
          id: 'tea-table',
          kind: 'table',
          label: 'Bàn trà gỗ',
          description: 'Chiếc bàn trà bằng gỗ mun mộc mạc nơi bố vẫn thường pha trà ấm đón khách quý.',
          x: 0,
          y: 0,
          z: -0.2,
          yaw: 0,
          width: 1.2,
          height: 0.45,
          depth: 0.7,
          color: '#4A2E1B',
          isInteractable: true
        }
      ]
    }
  }
];

function getObjectIcon(kind) {
  const map = {
    desk: '🪑',
    table: '🪑',
    chair: '💺',
    sofa: '🛋️',
    window: '🪟',
    door: '🚪',
    whiteboard: '📋',
    blackboard: '📋',
    backpack: '🎒',
    bag: '👜',
    curtain: '🪟',
    television: '📺',
    clock: '⏰',
    bookshelf: '📚',
    bed: '🛏️',
    lamp: '💡',
    plant: '🪴',
    notebook: '📓',
    water_bottle: '🍶',
    lunchbox: '🍱',
    cup: '🍵',
    mug: '☕',
    fan: '🪭',
    air_conditioner: '❄️'
  };
  return map[kind] || '✨';
}

export default function App() {
  const dims = typeof useWindowDimensions === 'function' ? useWindowDimensions() : { width: 390, height: 844 };
  const width = dims?.width || 390;
  const height = dims?.height || 844;
  const isLandscape = width > height;

  // Trải nghiệm người dùng: 'creator' (Người soạn phòng) | 'patient' (Người bệnh Alzheimer)
  const [role, setRole] = useState('creator');
  const [voiceLang, setVoiceLang] = useState('vi'); // 'vi' | 'en'

  const [messages, setMessages] = useState([
    {
      id: '1',
      author: 'MemoryWeaver',
      text: 'Mô tả căn phòng hoặc chọn ảnh rồi bấm Gửi. AI tạo bản phác thảo 3D, không phải phục dựng chính xác. Phần ước đoán sẽ được ghi rõ khi chạm vào đồ vật.',
      isUser: false,
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null); // base64 string
  const [imageUri, setImageUri] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [navMode, setNavMode] = useState('overview'); // 'overview' | 'fpv'
  const [textures, setTextures] = useState(null);
  const [usePhotoTexture, setUsePhotoTexture] = useState(true);
  const [lastImagePayload, setLastImagePayload] = useState(null);
  const [roomTitle, setRoomTitle] = useState('KHÔNG GIAN CỦA BẠN');
  const [cameraView, setCameraView] = useState('isometric');
  const [povMode, setPovMode] = useState('overview'); // 'overview' | 'focused'
  const [focusedLabel, setFocusedLabel] = useState('');
  const [status, setStatus] = useState('Sẵn sàng • Chữ + ảnh');
  const [isBusy, setIsBusy] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const pickingRef = useRef(false);

  // Settings
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [serverEndpoint, setServerEndpoint] = useState('');
  const [appToken, setAppToken] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [inputEndpoint, setInputEndpoint] = useState('');
  const [inputToken, setInputToken] = useState('');
  const [inputApiKey, setInputApiKey] = useState('');

  // Voice Interaction & Smart Placement
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [pendingPlacement, setPendingPlacement] = useState(null); // { item, rawPrompt }
  const voiceTimeoutRef = useRef(null);

  // Patient Mode Interactions
  const [activeMemoryModal, setActiveMemoryModal] = useState(null); // { label, description, isInteractable }
  const [focusLabel, setFocusLabel] = useState('');
  const [speakingText, setSpeakingText] = useState(null);

  // Saved Rooms Library
  const [savedRooms, setSavedRooms] = useState(DEFAULT_SAVED_PRESETS);
  const [savedRoomsModalVisible, setSavedRoomsModalVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saveRoomInputTitle, setSaveRoomInputTitle] = useState('');

  const scrollViewRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    loadSettings();
    loadSavedRooms();
    AsyncStorage.getItem('mw_voice_lang').then(saved => {
      if (saved === 'en' || saved === 'vi') {
        setVoiceLang(saved);
        if (VoiceRecognition && typeof VoiceRecognition.setLanguage === 'function') {
          VoiceRecognition.setLanguage(saved).catch(() => {});
        }
      }
    }).catch(() => {});

    if (!voiceEmitter) return;
    const subReady = voiceEmitter.addListener('onSpeechReady', () => {
      setStatus('Đang lắng nghe giọng nói...');
    });
    const subStart = voiceEmitter.addListener('onSpeechStart', () => {
      setStatus('Đang ghi nhận giọng nói...');
    });
    const subPartial = voiceEmitter.addListener('onSpeechPartialResults', (e) => {
      if (e?.text) setInputText(e.text);
    });
    const subResults = voiceEmitter.addListener('onSpeechResults', (e) => {
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      setIsListeningVoice(false);
      if (e?.text) {
        setInputText(e.text);
        sendMessage(e.text, { isVoice: true });
      }
    });
    const subError = voiceEmitter.addListener('onSpeechError', (e) => {
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      setIsListeningVoice(false);
      setStatus(e?.message || 'Đã tắt micro.');
    });
    const subEnd = voiceEmitter.addListener('onSpeechEnd', () => {
      setIsListeningVoice(false);
    });

    return () => {
      abortControllerRef.current?.abort();
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      subReady.remove();
      subStart.remove();
      subPartial.remove();
      subResults.remove();
      subError.remove();
      subEnd.remove();
    };
  }, []);

  const loadSavedRooms = async () => {
    try {
      const raw = await AsyncStorage.getItem('mw_saved_rooms');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedRooms(parsed);
          return;
        }
      }
      setSavedRooms(DEFAULT_SAVED_PRESETS);
    } catch {
      setSavedRooms(DEFAULT_SAVED_PRESETS);
    }
  };

  const saveCurrentRoomToLibrary = async () => {
    if (!currentRoom) return;
    const title = (saveRoomInputTitle || roomTitle || currentRoom.title || 'Căn phòng kỷ niệm').trim();
    const newEntry = {
      id: Date.now().toString(),
      title,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      room: currentRoom,
      textures: textures || null
    };
    const updated = [newEntry, ...savedRooms.filter(r => r.title !== title)].slice(0, 30);
    setSavedRooms(updated);
    try {
      await AsyncStorage.setItem('mw_saved_rooms', JSON.stringify(updated));
      setSaveModalVisible(false);
      setSaveRoomInputTitle('');
      Alert.alert('Đã lưu phòng', `Đã lưu "${title}" vào Thư viện phòng ký ức.`);
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu phòng vào bộ nhớ máy.');
    }
  };

  const deleteSavedRoom = async (id) => {
    const updated = savedRooms.filter(r => r.id !== id);
    setSavedRooms(updated);
    try {
      await AsyncStorage.setItem('mw_saved_rooms', JSON.stringify(updated));
    } catch {}
  };

  const selectSavedRoom = (entry) => {
    setCurrentRoom(entry.room);
    setTextures(entry.textures || null);
    setRoomTitle(entry.title || entry.room.title || 'CĂN PHÒNG KÝ ỨC');
    setSavedRoomsModalVisible(false);
    setStatus(`Đã mở phòng: ${entry.title}`);
  };

  const loadDiagnosis = async () => {
    try {
      if (!serverEndpoint) throw new Error('Hãy lưu địa chỉ server trước.');
      const result = await requestDiagnosis({ endpoint: serverEndpoint, signal: AbortSignal.timeout(15000) });
      Alert.alert('Khả năng xử lý hiện tại', result.modules.map(m => `${m.name}: ${m.status}\n${m.description}`).join('\n\n'));
    } catch (error) { Alert.alert('Không kiểm tra được', error.message); }
  };

  const loadSettings = async () => {
    try {
      const savedEndpoint = await AsyncStorage.getItem('mw_server_endpoint');
      const savedToken = await SecureStore.getItemAsync('mw_app_token');
      const savedKey = await SecureStore.getItemAsync('mw_gemini_api_key');
      await AsyncStorage.removeItem('mw_app_token');

      let effectiveEndpoint = DEFAULT_REMOTE_ENDPOINT;
      if (savedEndpoint && validEndpoint(savedEndpoint)) {
        effectiveEndpoint = savedEndpoint;
      }

      setServerEndpoint(effectiveEndpoint);
      setAppToken(savedToken || DEFAULT_APP_TOKEN);
      if (savedKey && savedKey !== 'test') setGeminiApiKey(savedKey);
    } catch (e) {
      setServerEndpoint(DEFAULT_REMOTE_ENDPOINT);
      setAppToken(DEFAULT_APP_TOKEN);
    }
  };

  const openSettings = () => {
    setInputEndpoint(serverEndpoint || DEFAULT_REMOTE_ENDPOINT);
    setInputToken(appToken || DEFAULT_APP_TOKEN);
    setInputApiKey(geminiApiKey || '');
    setSettingsVisible(true);
  };

  const saveSettings = async () => {
    let ep = inputEndpoint.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(ep)) {
      ep = `http://${ep}`;
    }
    if (/^https?:\/\/102\.168\./i.test(ep)) {
      Alert.alert('Gõ nhầm IP', 'Bạn đang nhập 102.168... (phím số 0 cạnh số 9). Hãy sửa lại thành 192.168.1.207:8787 hoặc dùng link HTTPS Cloudflare (https://...trycloudflare.com).');
      return;
    }
    if (!validEndpoint(ep)) {
      Alert.alert('Lỗi địa chỉ', 'Dùng URL HTTPS của Cloudflare hoặc IP mạng nội bộ dạng http://192.168.x.x:8787 (ví dụ: http://192.168.1.207:8787).');
      return;
    }
    const probe = new AbortController();
    const probeTimer = setTimeout(() => probe.abort(), 15000);
    try {
      const response = await fetch(`${ep}/api/connection`, { signal: probe.signal,
        headers: {
          Authorization: `Bearer ${inputToken.trim()}`,
          ...(inputApiKey.trim() && inputApiKey.trim() !== 'test' ? { 'X-Gemini-API-Key': inputApiKey.trim() } : {})
        }
      });
      const health = await response.json();
      if (response.status === 401) throw new Error('APP_ACCESS_TOKEN chưa đúng. Sao chép token của server đang chạy.');
      if (!response.ok || health.provider !== 'gemini') throw new Error('Sai server hoặc server chưa cập nhật Gemini.');
      if (health.contractVersion !== 2) throw new Error('Server cũ không tương thích. Hãy chạy server trong thư mục MemoryWeaver.');
      if (!health.configured && !inputApiKey.trim()) throw new Error('Server chưa có khóa Gemini.');
    } catch (error) {
      Alert.alert('Chưa lưu kết nối', `Không kết nối được server ${ep}.\n\n• Mạng Wi-Fi: Đảm bảo điện thoại cùng mạng Wi-Fi và nhập đúng IP máy tính (hiện tại là http://192.168.1.207:8787).\n• Khuyên dùng: Dán link Cloudflare https://...trycloudflare.com hiển thị ở cửa sổ CHAY_SERVER.bat.\n\nChi tiết: ${error.message}`);
      return;
    } finally { clearTimeout(probeTimer); }
    try {
      await SecureStore.setItemAsync('mw_app_token', inputToken.trim());
      await AsyncStorage.setItem('mw_server_endpoint', ep);
      if (inputApiKey.trim() && inputApiKey.trim() !== 'test') {
        await SecureStore.setItemAsync('mw_gemini_api_key', inputApiKey.trim());
        setGeminiApiKey(inputApiKey.trim());
      } else if (!inputApiKey.trim() && geminiApiKey) {
        await SecureStore.deleteItemAsync('mw_gemini_api_key').catch(() => {});
        setGeminiApiKey('');
      }
    } catch (e) { Alert.alert('Chưa lưu cài đặt', 'Không ghi được cấu hình trên thiết bị. Hãy thử lại.'); return; }
    setServerEndpoint(ep);
    setAppToken(inputToken.trim());
    setSettingsVisible(false);
    setStatus('Đã lưu kết nối server');
  };

  const pickImage = async () => {
    if (abortControllerRef.current || pickingRef.current) return;
    pickingRef.current = true; setIsPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const context = ImageManipulator.manipulate(asset.uri);
        if (Math.max(asset.width, asset.height) > 1280) {
          context.resize(asset.width >= asset.height ? { width: 1280 } : { height: 1280 });
        }
        let rendered;
        let image;
        try {
          rendered = await context.renderAsync();
          image = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: .8, base64: true });
        } finally { rendered?.release(); context.release(); }
        if (!image.base64 || image.base64.length > 5_300_000) throw new Error('Ảnh quá lớn, hãy chọn ảnh nhỏ hơn.');
        setSelectedImage(image.base64);
        setImageUri(image.uri);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không mở được thư viện ảnh: ' + err.message);
    } finally {
      pickingRef.current = false; setIsPicking(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImageUri(null);
  };

  const handleTogglePhotoTexture = async () => {
    const nextVal = !usePhotoTexture;
    setUsePhotoTexture(nextVal);
    if (nextVal && !textures && lastImagePayload && !isBusy) {
      setStatus('Đang lấy texture ảnh…');
      try {
        const textureResult = await extractTextures({
          endpoint: serverEndpoint,
          token: appToken || undefined,
          image: lastImagePayload,
          signal: AbortSignal.timeout(30000)
        });
        setTextures(textureResult.textures);
        setStatus('Đã áp texture ước lượng từ ảnh');
      } catch {
        setStatus('Phòng đã sẵn sàng • Chưa áp được texture');
      }
    }
  };

  const resetRoom = () => {
    if (pickingRef.current) return;
    if (abortControllerRef.current) {
      Alert.alert('Thông báo', 'Hãy hủy yêu cầu đang chạy trước khi làm mới.');
      return;
    }
    setNavMode('overview');
    setTextures(null);
    setLastImagePayload(null);
    setCurrentRoom(null);
    setRoomTitle('KHÔNG GIAN CỦA BẠN');
    setCameraView('isometric');
    clearImage();
    setInputText('');
    setMessages([
      {
        id: Date.now().toString(),
        author: 'MemoryWeaver',
        text: 'Một khởi đầu mới. Bạn muốn tạo căn phòng nào?',
        isUser: false,
      }
    ]);
    setStatus('Đã làm mới không gian');
  };

  // Kiểm tra câu lệnh thêm đồ vật xem đã có thông tin vị trí tương đối/nơi đặt hay chưa (Hỗ trợ Song ngữ VI & EN)
  const checkPlacementQuery = (text, lang = voiceLang) => {
    if (!text || typeof text !== 'string') return null;
    const lower = text.toLowerCase().trim();

    // Vietnamese keywords
    const viAddKeywords = ['thêm', 'bổ sung', 'đặt thêm', 'cho thêm', 'kê thêm', 'tạo thêm', 'lắp thêm', 'treo thêm'];
    const viLocKeywords = [
      'đằng trước', 'phía trước', 'trước', 'đằng sau', 'phía sau', 'sau',
      'bên cạnh', 'cạnh', 'sát', 'gần', 'ở giữa', 'giữa', 'góc',
      'trên tường', 'lên tường', 'vào tường', 'tường', 'bên trái', 'bên phải',
      'trên bàn', 'trên sàn', 'dưới', 'đối diện', 'ngang'
    ];

    // English keywords
    const enAddKeywords = ['add', 'place', 'put', 'insert', 'create', 'install', 'hang', 'set up'];
    const enLocKeywords = [
      'in front of', 'front of', 'behind', 'back of', 'next to', 'beside', 'near',
      'close to', 'in the middle of', 'middle of', 'center of', 'in the corner',
      'corner', 'on the wall', 'against the wall', 'on wall', 'to the left of',
      'to the right of', 'left of', 'right of', 'on the table', 'on the floor',
      'under', 'opposite', 'across from'
    ];

    const isEn = lang === 'en' || (!viAddKeywords.some(kw => lower.includes(kw)) && enAddKeywords.some(kw => lower.includes(kw)));
    const addKeywords = isEn ? enAddKeywords : viAddKeywords;
    const locKeywords = isEn ? enLocKeywords : viLocKeywords;

    const isAdd = addKeywords.some(kw => lower.includes(kw));
    if (!isAdd) return null;

    const hasLocation = locKeywords.some(kw => lower.includes(kw));
    if (hasLocation) return null;

    let objectName = isEn ? 'this item' : 'đồ vật này';
    for (const kw of addKeywords) {
      const idx = lower.indexOf(kw);
      if (idx !== -1) {
        let remainder = lower.slice(idx + kw.length).trim();
        remainder = remainder.replace(/^(một\s+|chiếc\s+|cái\s+|1\s+|a\s+|an\s+|the\s+|some\s+)/i, '').trim();
        if (remainder) {
          objectName = remainder;
          break;
        }
      }
    }
    return { objectName, isEn };
  };

  const generateConfirmationSpeech = (promptText, roomReply, lang = voiceLang) => {
    const lower = (promptText || '').toLowerCase();
    const isEn = lang === 'en' || /^[a-zA-Z0-9\s.,!?'"-]+$/.test(promptText || '');

    if (isEn) {
      if (lower.includes('add') || lower.includes('place') || lower.includes('put') || lower.includes('hang')) {
        return `Added ${promptText.trim()}.`;
      }
      if (lower.includes('move') || lower.includes('shift') || lower.includes('slide')) {
        return 'Moved the item to your requested position.';
      }
      if (lower.includes('expand') || lower.includes('wider') || lower.includes('longer') || lower.includes('size') || lower.includes('meter')) {
        return 'Adjusted the room size.';
      }
      if (lower.includes('color') || lower.includes('paint')) {
        return 'Changed the room colors.';
      }
      return roomReply || 'Updated the room according to your request.';
    }

    if (lower.includes('thêm') || lower.includes('kê') || lower.includes('đặt') || lower.includes('treo')) {
      return `Đã ${promptText.trim()}.`;
    }
    if (lower.includes('dịch') || lower.includes('chuyển') || lower.includes('dời')) {
      return `Đã dịch chuyển đồ vật theo vị trí bạn yêu cầu.`;
    }
    if (lower.includes('mở rộng') || lower.includes('thu nhỏ') || lower.includes('kích thước') || lower.includes('mét')) {
      return `Đã điều chỉnh kích thước căn phòng.`;
    }
    if (lower.includes('đổi màu') || lower.includes('sơn')) {
      return `Đã thay đổi màu sắc không gian.`;
    }
    return roomReply || 'Đã cập nhật căn phòng theo ý bạn.';
  };

  const toggleVoiceLanguage = async () => {
    const nextLang = voiceLang === 'vi' ? 'en' : 'vi';
    setVoiceLang(nextLang);
    if (VoiceRecognition && typeof VoiceRecognition.setLanguage === 'function') {
      VoiceRecognition.setLanguage(nextLang).catch(() => {});
    }
    await AsyncStorage.setItem('mw_voice_lang', nextLang).catch(() => {});
    setStatus(nextLang === 'en' ? 'Voice language set to English 🇺🇸' : 'Đã chuyển giọng nói sang Tiếng Việt 🇻🇳');
  };

  const requestMicrophonePermission = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const isEn = voiceLang === 'en';
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: isEn ? 'Microphone Permission' : 'Quyền sử dụng Micro',
          message: isEn
            ? 'MemoryWeaver needs microphone permission so you can place objects and command the room with voice.'
            : 'MemoryWeaver cần quyền micro để bạn có thể ra lệnh và sắp xếp phòng bằng giọng nói.',
          buttonPositive: isEn ? 'Allow' : 'Cho phép',
          buttonNegative: isEn ? 'Deny' : 'Từ chối'
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      console.warn('Microphone permission request error:', e);
      return false;
    }
  };

  const startVoiceListening = async () => {
    if (isBusy) return;
    const hasPerm = await requestMicrophonePermission();
    if (!hasPerm) {
      const isEn = voiceLang === 'en';
      Alert.alert(
        isEn ? 'Microphone Permission Needed' : 'Cần quyền Micro',
        isEn
          ? 'Please grant microphone permission to use voice commands.'
          : 'Vui lòng cấp quyền micro để sử dụng tính năng giọng nói.'
      );
      return;
    }

    const isEn = voiceLang === 'en';
    const promptText = isEn ? 'I am listening' : 'Tôi đang nghe';
    setIsListeningVoice(true);
    setSpeakingText(promptText);
    setStatus(isEn ? 'Listening to voice...' : 'Đang lắng nghe giọng nói…');

    if (VoiceRecognition && typeof VoiceRecognition.startListening === 'function') {
      try {
        await VoiceRecognition.startListening({ language: voiceLang, promptText });
      } catch (err) {
        console.warn('VoiceRecognition start error:', err);
        if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = setTimeout(() => {
          setIsListeningVoice(false);
          setStatus(isEn ? 'Microphone turned off.' : 'Đã tắt micro.');
        }, 10000);
      }
    } else {
      setStatus(isEn ? 'Expo Go mode: Tap sample voice chips below (use APK for hardware mic).' : 'Chế độ Expo Go: Chạm gợi ý giọng nói bên dưới (dùng APK để thu mic thật).');
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = setTimeout(() => {
        setIsListeningVoice(false);
      }, 15000);
    }
  };

  const stopVoiceListening = () => {
    if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    setIsListeningVoice(false);
    setStatus(voiceLang === 'en' ? 'Microphone turned off.' : 'Đã tắt micro.');
    if (VoiceRecognition && typeof VoiceRecognition.stopListening === 'function') {
      VoiceRecognition.stopListening().catch(() => {});
    }
  };

  const toggleVoiceListening = () => {
    if (isListeningVoice) {
      stopVoiceListening();
    } else {
      startVoiceListening();
    }
  };

  const handleVoiceInput = (text) => {
    stopVoiceListening();
    setInputText(text);
    sendMessage(text, { isVoice: true });
  };

  const handleSendOrCancel = () => {
    if (pickingRef.current) return;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      return;
    }

    if (!inputText.trim() && !selectedImage) {
      Alert.alert(
        voiceLang === 'en' ? 'Notice' : 'Nhắc nhở',
        voiceLang === 'en'
          ? 'Please enter a description or pick an image before sending.'
          : 'Hãy nhập mô tả hoặc chọn một bức ảnh trước khi gửi.'
      );
      return;
    }

    sendMessage();
  };

  const sendMessage = async (overridePrompt, options = {}) => {
    const rawPrompt = (typeof overridePrompt === 'string' ? overridePrompt : inputText).trim();
    const imagePayload = selectedImage;

    if (!rawPrompt && !imagePayload) {
      Alert.alert(
        voiceLang === 'en' ? 'Notice' : 'Nhắc nhở',
        voiceLang === 'en'
          ? 'Please enter a description or pick an image before sending.'
          : 'Hãy nhập mô tả hoặc chọn một bức ảnh trước khi gửi.'
      );
      return;
    }

    let prompt = rawPrompt;
    if (pendingPlacement) {
      prompt = pendingPlacement.isEn
        ? `Add ${pendingPlacement.item} ${rawPrompt}`
        : `Thêm ${pendingPlacement.item} ${rawPrompt}`;
      setPendingPlacement(null);
    } else if (rawPrompt) {
      const placementCheck = checkPlacementQuery(rawPrompt, voiceLang);
      if (placementCheck) {
        const { objectName: missingItem, isEn } = placementCheck;
        const userMsgClarify = {
          id: Date.now().toString(),
          author: isEn ? 'You' : 'Bạn',
          text: rawPrompt,
          isUser: true,
        };
        const botQuestion = isEn
          ? `Where would you like to place ${missingItem} in the room? (e.g. behind the desk, next to the window, or on the wall?)`
          : `Bạn muốn đặt ${missingItem} vào vị trí nào trong phòng? (ví dụ: đằng trước cái bàn, bên cạnh cửa sổ, hay trên tường?)`;
        const aiQuestionMsg = {
          id: (Date.now() + 1).toString(),
          author: 'MemoryWeaver',
          text: botQuestion,
          isUser: false,
        };
        setMessages(prev => [...prev.slice(-39), userMsgClarify, aiQuestionMsg]);
        setPendingPlacement({ item: missingItem, rawPrompt, isEn });
        setStatus(isEn ? `Asking placement: Where to place ${missingItem}?` : `Hỏi thêm vị trí: Bạn muốn đặt ${missingItem} vào đâu?`);
        if (options.isVoice || isListeningVoice) {
          const askText = isEn ? 'Where would you like to place it?' : 'Bạn muốn đặt nó vào đâu?';
          setSpeakingText(askText);
          if (VoiceRecognition && typeof VoiceRecognition.speak === 'function') {
            VoiceRecognition.speak(askText).catch(() => {});
          }
        }
        setInputText('');
        return;
      }
    }

    const userMsg = {
      id: Date.now().toString(),
      author: 'Bạn',
      text: prompt + (imagePayload ? '\n[Đã đính kèm ảnh]' : ''),
      isUser: true,
    };

    setMessages(prev => [...prev.slice(-39), userMsg]);
    setIsBusy(true);
    setStatus('AI đang thiết kế căn phòng…');

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 165000);

    const primaryEp = serverEndpoint;
    const tokenToUse = appToken || DEFAULT_APP_TOKEN;

    try {
      if (!primaryEp) throw new Error('Hãy nhập địa chỉ server và token trong Cài đặt. Nội dung của bạn được giữ để gửi lại.');
      const data = await requestRoom({
        endpoint: primaryEp,
        token: tokenToUse,
        prompt,
        image: imagePayload,
        previousRoom: currentRoom,
        signal: controller.signal,
        geminiApiKey: geminiApiKey || undefined
      });
      if (controller.signal.aborted) throw Object.assign(new Error(), { name: 'AbortError' });
      setInputText('');
      clearImage();

      if (imagePayload) {
        setTextures(null);
        setLastImagePayload(imagePayload);
      }
      // Success
      setCurrentRoom(data);
      setRoomTitle(data.title || 'CĂN PHÒNG KÝ ỨC');
      setMessages(prev => [
        ...prev.slice(-39),
        {
          id: (Date.now() + 1).toString(),
          author: 'MemoryWeaver',
          text: data.reply || 'Căn phòng đã được tạo thành công.',
          isUser: false,
        }
      ]);
      setStatus('Đã dựng bản phác thảo 3D • Chạm đồ vật để xem nguồn thông tin');

      // Giọng đọc chốt lại kết quả khi thao tác bằng giọng nói hoặc hoàn thành lệnh
      const closingConfirmation = generateConfirmationSpeech(prompt, data.reply);
      if (options.isVoice || isListeningVoice) {
        setSpeakingText(closingConfirmation);
        if (VoiceRecognition && typeof VoiceRecognition.speak === 'function') {
          VoiceRecognition.speak(closingConfirmation).catch(() => {});
        }
      }

      if (usePhotoTexture && imagePayload) {
        setStatus('Phòng đã sẵn sàng • Đang lấy texture ảnh…');
        try {
          const textureResult = await extractTextures({ endpoint: primaryEp, token: tokenToUse, image: imagePayload, signal: controller.signal });
          if (!controller.signal.aborted) { setTextures(textureResult.textures); setStatus('Đã áp texture ước lượng từ ảnh • Có thể không khớp thực tế'); }
        } catch {
          setStatus('Phòng đã sẵn sàng • Chưa áp được texture, đang dùng vật liệu mặc định');
        }
      }

    } catch (err) {
      let errMsg = err.name === 'AbortError'
        ? (timedOut ? 'AI phản hồi quá lâu. Nội dung được giữ để thử lại.' : 'Đã hủy. Nội dung được giữ để gửi lại.')
        : (err.message || 'Không xử lý được yêu cầu. Hãy thử lại.');

      setMessages(prev => [
        ...prev.slice(-39),
        {
          id: (Date.now() + 1).toString(),
          author: 'Thông báo',
          text: errMsg,
          isUser: false,
        }
      ]);
      setStatus('Chưa tạo được phòng • Có thể gửi lại');
    } finally {
      clearTimeout(timeout);
      setIsBusy(false);
      abortControllerRef.current = null;
    }
  };

  const handleSelectFurniture = (label, description) => {
    if (role === 'patient') {
      setFocusLabel(label);
      setActiveMemoryModal({
        label,
        description,
        isInteractable: true
      });
    } else {
      setMessages(prev => [
        ...prev.slice(-39),
        {
          id: Date.now().toString(),
          author: 'Đồ vật: ' + label,
          text: description,
          isUser: false,
        }
      ]);
    }
  };

  const handleRestrictedTouch = (label, dialogue) => {
    const diag = dialogue || 'Chưa có đủ thông tin về khu vực này; đây là phần AI ước đoán.';
    if (role === 'patient') {
      setActiveMemoryModal({
        label,
        description: diag,
        isInteractable: false
      });
    } else {
      setStatus(`Vùng hạn chế: ${label}`);
      setMessages(prev => [
        ...prev.slice(-39),
        {
          id: Date.now().toString(),
          author: '👵 Bạn đồng hành',
          text: diag,
          isUser: false,
        }
      ]);
    }
  };

  const handlePovChange = (mode, label) => {
    setPovMode(mode);
    setFocusedLabel(label || '');
    if (mode === 'focused') {
      setStatus(`Đang đứng tại: ${label || 'đồ vật'} • Vuốt để ngắm nhìn quanh phòng`);
    } else {
      setStatus('Đã trở về góc nhìn tổng quan phòng');
    }
  };

  // Danh sách các vật thể tương tác để tạo các điểm neo ký ức dưới chân màn hình người bệnh
  const interactiveObjects = (currentRoom && Array.isArray(currentRoom.objects))
    ? currentRoom.objects.filter(obj => obj && obj.label)
    : [];

  const renderVoiceBanner = () => {
    if (!isListeningVoice) return null;
    const isEn = voiceLang === 'en';
    return (
      <View style={styles.voiceListeningBanner}>
        <View style={styles.voiceHeaderRow}>
          <View style={styles.voicePulseIndicator}>
            <Text style={styles.voicePulseDot}>🔴</Text>
            <Text style={styles.voiceStatusTitle}>
              {isEn ? '"I am listening..."' : '"Tôi đang nghe..."'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.voiceLangToggleRow}>
              <TouchableOpacity
                style={[styles.voiceLangBadge, voiceLang === 'vi' && styles.voiceLangBadgeActive]}
                onPress={() => voiceLang !== 'vi' && toggleVoiceLanguage()}
              >
                <Text style={[styles.voiceLangBadgeText, voiceLang === 'vi' && styles.voiceLangBadgeTextActive]}>🇻🇳 VI</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voiceLangBadge, voiceLang === 'en' && styles.voiceLangBadgeActive]}
                onPress={() => voiceLang !== 'en' && toggleVoiceLanguage()}
              >
                <Text style={[styles.voiceLangBadgeText, voiceLang === 'en' && styles.voiceLangBadgeTextActive]}>🇺🇸 EN</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.voiceCloseBtn} onPress={stopVoiceListening}>
              <Text style={styles.voiceCloseBtnText}>{isEn ? '✕ Close' : '✕ Tắt'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.voiceInstructionText}>
          {isEn
            ? 'Speak command to add, move, or resize room (or tap quick examples):'
            : 'Nói lệnh thêm đồ vật, di chuyển hoặc mở rộng phòng (hoặc chạm nhanh mẫu):'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.voiceChipsScroll}>
          {isEn ? (
            <>
              <TouchableOpacity style={styles.voiceChip} onPress={() => handleVoiceInput('Add a shelf behind the desk')}>
                <Text style={styles.voiceChipText}>🎙️ "Add shelf behind desk"</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.voiceChip} onPress={() => handleVoiceInput('Move chair closer to the window')}>
                <Text style={styles.voiceChipText}>🎙️ "Move chair near window"</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.voiceChip} onPress={() => handleVoiceInput('Expand room by 1 meter')}>
                <Text style={styles.voiceChipText}>🎙️ "Expand room by 1m"</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.voiceChip} onPress={() => handleVoiceInput('Hang painting on the right wall')}>
                <Text style={styles.voiceChipText}>🎙️ "Hang painting on wall"</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.voiceChip} onPress={() => handleVoiceInput('Add a chair')}>
                <Text style={styles.voiceChipText}>⚠️ "Add a chair" (Location test)</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.voiceChip} onPress={() => handleVoiceInput('Thêm một cái kệ đằng sau cái bàn')}>
                <Text style={styles.voiceChipText}>🎙️ "Thêm kệ đằng sau bàn"</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.voiceChip} onPress={() => handleVoiceInput('Dịch chuyển ghế lại gần cửa sổ')}>
                <Text style={styles.voiceChipText}>🎙️ "Dịch ghế lại gần cửa sổ"</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.voiceChip} onPress={() => handleVoiceInput('Mở rộng căn phòng thêm 1 mét')}>
                <Text style={styles.voiceChipText}>🎙️ "Mở rộng phòng thêm 1m"</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.voiceChip} onPress={() => handleVoiceInput('Treo bức tranh lên bức tường bên phải')}>
                <Text style={styles.voiceChipText}>🎙️ "Treo tranh lên tường"</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.voiceChip} onPress={() => handleVoiceInput('Thêm một cái ghế')}>
                <Text style={styles.voiceChipText}>⚠️ "Thêm một cái ghế" (Test vị trí)</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderAttachmentBar = () => (
    <View style={styles.attachmentBar}>
      {imageUri ? (
        <View style={styles.attachedRow}>
          <Image source={{ uri: imageUri }} style={styles.thumbImage} />
          <Text style={styles.attachedText}>
            {voiceLang === 'en' ? 'Image attached • Ready to send' : 'Đã chọn ảnh • Sẵn sàng gửi'}
          </Text>
          <TouchableOpacity disabled={isBusy} onPress={clearImage} style={styles.clearImgBtn}>
            <Text style={styles.clearImgText}>{voiceLang === 'en' ? 'Remove' : 'Bỏ ảnh'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.unattachedText}>
          {voiceLang === 'en' ? 'No image attached' : 'Chưa chọn ảnh'}
        </Text>
      )}
    </View>
  );

  const renderInputRow = () => (
    <View style={styles.inputRow}>
      <TouchableOpacity
        style={[styles.photoBtn, isBusy && styles.disabledBtn]}
        onPress={pickImage}
        disabled={isBusy || isPicking}
      >
        <Text style={styles.photoBtnText}>
          {isPicking ? (voiceLang === 'en' ? 'Wait…' : 'Đợi…') : (voiceLang === 'en' ? '+ Photo' : '+ Ảnh')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.textureBtn, usePhotoTexture && styles.textureBtnActive]}
        disabled={isBusy}
        onPress={handleTogglePhotoTexture}
      >
        <Text style={[styles.textureBtnText, usePhotoTexture && styles.textureBtnTextActive]}>
          {usePhotoTexture ? 'Texture: ON' : 'Texture: OFF'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.langPillBtn}
        onPress={toggleVoiceLanguage}
        accessibilityLabel="Đổi ngôn ngữ giọng nói"
      >
        <Text style={styles.langPillText}>{voiceLang === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.voiceBtn, isListeningVoice && styles.voiceBtnActive]}
        disabled={isBusy}
        onPress={toggleVoiceListening}
        accessibilityRole="button"
        accessibilityLabel={voiceLang === 'en' ? 'Tap to speak' : 'Bấm để nói'}
      >
        <Text style={styles.voiceBtnText}>
          {isListeningVoice ? (voiceLang === 'en' ? '🔴 Listening' : '🔴 Đang nghe') : (voiceLang === 'en' ? '🎙️ Speak' : '🎙️ Nói')}
        </Text>
      </TouchableOpacity>

      <TextInput
        style={styles.textInput}
        placeholder={
          voiceLang === 'en'
            ? 'e.g.: Classroom at 12pm, Thanh desk by window…'
            : 'Ví dụ: Phòng học của Thành lúc 12h trưa, bàn ở góc cửa sổ…'
        }
        placeholderTextColor="#8d9b94"
        value={inputText}
        onChangeText={setInputText}
        multiline
        maxLength={4000}
        editable={!isBusy}
      />

      <TouchableOpacity
        style={[styles.sendBtn, isBusy && styles.cancelBtn]}
        accessibilityLabel={isBusy ? 'Hủy yêu cầu' : 'Gửi mô tả phòng'}
        onPress={handleSendOrCancel}
        disabled={isPicking}
      >
        <Text style={styles.sendBtnText}>
          {isBusy ? (voiceLang === 'en' ? 'Cancel' : 'Hủy') : (voiceLang === 'en' ? 'Send' : 'Gửi')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderMemoryBar = () => {
    if (!currentRoom) return null;
    return (
      <View style={styles.memoryBar}>
        <View style={styles.memoryLeft}>
          <Text style={styles.memoryIcon}>🧠</Text>
          <Text style={styles.memoryText} numberOfLines={1}>
            {voiceLang === 'en' ? 'Room in session • Edit anytime' : 'Phòng trong phiên này • Gõ để chỉnh sửa tiếp'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newRoomBtn}
          onPress={() => {
            Alert.alert(
              voiceLang === 'en' ? 'New Room' : 'Tạo phòng mới',
              voiceLang === 'en'
                ? 'Do you want to reset the room memory to start fresh?'
                : 'Bạn có muốn làm mới bộ nhớ để thiết kế căn phòng mới từ đầu không?',
              [
                { text: voiceLang === 'en' ? 'Cancel' : 'Hủy', style: 'cancel' },
                {
                  text: voiceLang === 'en' ? 'New Room' : 'Tạo phòng mới',
                  style: 'destructive',
                  onPress: () => {
                    resetRoom();
                    setStatus(voiceLang === 'en' ? 'Reset memory • Enter description' : 'Đã làm mới bộ nhớ • Nhập mô tả để tạo phòng mới');
                  }
                }
              ]
            );
          }}
        >
          <Text style={styles.newRoomBtnText}>{voiceLang === 'en' ? '↺ Reset' : '↺ Phòng mới'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMessagesList = () => (
    <ScrollView
      ref={scrollViewRef}
      style={styles.messageList}
      contentContainerStyle={styles.messageListContent}
      onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
    >
      {messages.map(msg => (
        <View
          key={msg.id}
          style={[
            styles.messageBubble,
            msg.isUser ? styles.userBubble : styles.aiBubble
          ]}
        >
          <Text style={[styles.messageAuthor, msg.isUser && { color: '#d9eee3' }]}>{msg.author}</Text>
          <Text style={[styles.messageText, msg.isUser && { color: '#ffffff' }]}>{msg.text}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderSuggestionsList = () => {
    if (currentRoom || isBusy) return null;
    return (
      <View style={styles.suggestionsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsContainer}
        >
          {CAREGIVER_SUGGESTIONS.map((sug, idx) => (
            <TouchableOpacity
              key={'cg-' + idx}
              style={styles.caregiverChip}
              onPress={() => setInputText(sug.text)}
              activeOpacity={0.7}
            >
              <Text style={styles.caregiverChipText}>{sug.label}</Text>
            </TouchableOpacity>
          ))}
          {SUGGESTIONS.map((sug, idx) => (
            <TouchableOpacity
              key={'sug-' + idx}
              style={styles.suggestionChip}
              onPress={() => setInputText(sug)}
              activeOpacity={0.7}
            >
              <Text style={styles.suggestionText}>💡 {sug}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const render3DViewer = () => (
    <RoomViewer3D
      room={currentRoom}
      textures={usePhotoTexture ? textures : null}
      navMode={navMode}
      onNavModeChange={setNavMode}
      onNavWarning={message => setStatus(message)}
      cameraView={cameraView}
      onSelectFurniture={handleSelectFurniture}
      onRestrictedTouch={handleRestrictedTouch}
      onPovChange={handlePovChange}
      focusLabel={focusLabel}
      speakText={speakingText}
    />
  );

  // =========================================================================
  // GIAO DIỆN 1: DÀNH CHO NGƯỜI BỆNH ALZHEIMER (PATIENT MEMORY EXPERIENCE)
  // Toàn màn hình 3D, không hộp chat, chữ to rõ, thẻ ký ức nổi, hỗ trợ đọc giọng
  // Hỗ trợ mượt mà cả màn hình Dọc và Ngang (Portrait & Landscape)
  // =========================================================================
  if (role === 'patient') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.patientSafeArea}>
          <StatusBar barStyle="light-content" backgroundColor="#121a16" />

          {/* Thanh tiêu đề & điều hướng tĩnh lặng cho Người Bệnh */}
          <View style={[styles.patientTopBar, isLandscape && styles.patientTopBarLandscape]}>
            <View style={styles.patientTitleBlock}>
              <Text style={styles.patientBadge}>👵 KHÔNG GIAN KÝ ỨC THÂN THUỘC</Text>
              <Text style={styles.patientTitleText} numberOfLines={1}>{roomTitle}</Text>
            </View>

            <View style={styles.patientControls}>
              <TouchableOpacity
                style={styles.patientNavToggleBtn}
                onPress={() => setNavMode(mode => mode === 'fpv' ? 'overview' : 'fpv')}
                activeOpacity={0.8}
              >
                <Text style={styles.patientNavToggleText}>
                  {navMode === 'fpv' ? '🏰 Toàn cảnh phòng' : '🕹️ Bước vào trải nghiệm'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.patientChangeRoomBtn}
                onPress={() => setSavedRoomsModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.patientChangeRoomText}>📂 Đổi phòng</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.patientExitBtn}
                activeOpacity={0.8}
                onPress={() => {
                  Alert.alert(
                    'Trở về màn hình Người Soạn Phòng?',
                    'Bạn có muốn tạm dừng buổi khám phá ký ức để trở về màn hình biên soạn và cài đặt không?',
                    [
                      { text: 'Ở lại ngắm phòng', style: 'cancel' },
                      {
                        text: 'Quay lại',
                        onPress: () => {
                          setSpeakingText(null);
                          setActiveMemoryModal(null);
                          setRole('creator');
                        }
                      }
                    ]
                  );
                }}
              >
                <Text style={styles.patientExitText}>🔒 Thoát</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Khung hiển thị 3D tràn viền */}
          <View style={styles.patientViewerWrap}>
            {render3DViewer()}
          </View>

          {/* Thanh Neo Kỷ Niệm Thân Quen (Bottom Highlights Carousel) - Ẩn khi đang đi lại bằng Joystick */}
          {interactiveObjects.length > 0 && navMode !== 'fpv' && (
            <View style={[styles.patientMemoryPillsBar, isLandscape && styles.patientMemoryPillsBarLandscape]}>
              <Text style={styles.patientPillsTitle}>✨ Chạm vào kỷ niệm để gợi nhớ:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.patientPillsScroll}
              >
                {interactiveObjects.map((obj, idx) => (
                  <TouchableOpacity
                    key={'pill-' + idx}
                    style={[
                      styles.patientMemoryPill,
                      activeMemoryModal?.label === obj.label && styles.patientMemoryPillActive
                    ]}
                    onPress={() => {
                      setFocusLabel(obj.label);
                      setActiveMemoryModal({
                        label: obj.label,
                        description: obj.description,
                        isInteractable: obj.isInteractable !== false
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.patientMemoryPillText}>
                      {getObjectIcon(obj.kind)} {obj.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Thẻ Ký Ức Nổi To Rõ (Patient Memory Card Modal) */}
          {activeMemoryModal && (
            <View style={styles.patientMemoryCardBackdrop}>
              <View style={[styles.patientMemoryCard, isLandscape && styles.patientMemoryCardLandscape]}>
                <View style={styles.patientCardHeader}>
                  <View style={styles.patientCardIconTitle}>
                    <Text style={styles.patientCardAvatar}>{activeMemoryModal.isInteractable ? '👵' : '🔒'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientCardTitle}>{activeMemoryModal.label}</Text>
                      <Text style={styles.patientCardSubtitle}>
                        {activeMemoryModal.isInteractable ? 'Kỷ niệm thân thương' : 'Khu vực hạn chế'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.patientCardCloseBtn}
                    onPress={() => {
                      setSpeakingText(null);
                      setActiveMemoryModal(null);
                    }}
                  >
                    <Text style={styles.patientCardCloseText}>✕ Đóng</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={[styles.patientCardBody, isLandscape && { maxHeight: 110 }]} contentContainerStyle={{ paddingBottom: 6 }}>
                  <Text style={styles.patientCardText}>
                    {activeMemoryModal.description}
                  </Text>
                </ScrollView>

                <View style={styles.patientCardActions}>
                  <TouchableOpacity
                    style={[
                      styles.patientSpeakBtn,
                      speakingText === activeMemoryModal.description && styles.patientSpeakBtnActive
                    ]}
                    onPress={() => {
                      if (speakingText === activeMemoryModal.description) {
                        setSpeakingText(null);
                      } else {
                        setSpeakingText(activeMemoryModal.description);
                      }
                    }}
                  >
                    <Text style={styles.patientSpeakBtnText}>
                      {speakingText === activeMemoryModal.description ? '⏹ Dừng đọc' : '🔊 Nghe giọng đọc'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.patientFocusBtn}
                    onPress={() => {
                      setFocusLabel(activeMemoryModal.label);
                    }}
                  >
                    <Text style={styles.patientFocusBtnText}>👁️ Đến ngắm cự ly gần</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Modal Đổi phòng trong chế độ người bệnh */}
          <Modal
            onRequestClose={() => setSavedRoomsModalVisible(false)}
            visible={savedRoomsModalVisible}
            animationType="slide"
            transparent
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxHeight: isLandscape ? '92%' : '80%' }]}>
                <Text style={styles.modalTitle}>Chọn Không Gian Ký Ức</Text>
                <ScrollView style={{ maxHeight: isLandscape ? 200 : 350 }}>
                  {savedRooms.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.savedRoomCard}
                      onPress={() => selectSavedRoom(item)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.savedRoomTitle}>🏡 {item.title}</Text>
                        <Text style={styles.savedRoomDate}>{item.createdAt} • {item.room?.objects?.length || 0} đồ vật</Text>
                      </View>
                      <Text style={styles.savedRoomOpenBadge}>Mở phòng</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.closeBtn, { marginTop: 14 }]}
                  onPress={() => setSavedRoomsModalVisible(false)}
                >
                  <Text style={styles.closeBtnText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // =========================================================================
  // GIAO DIỆN 2: DÀNH CHO NGƯỜI SOẠN PHÒNG (CREATOR / CAREGIVER STUDIO)
  // Đầy đủ công cụ soạn phòng, ảnh, texture, bộ nhớ phòng, lưu trữ và nút khởi động
  // Thiết kế thông minh hỗ trợ cả màn hình DỌC (Portrait) và NGANG (Landscape)
  // =========================================================================
  return (
    <SafeAreaProvider><SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4efe8" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isLandscape ? (
          /* ===== BỐ CỤC MÀN HÌNH NGANG (LANDSCAPE STUDIO) ===== */
          <View style={styles.landscapeContainer}>
            {/* Header Màn hình Ngang Thu Gọn */}
            <View style={styles.landscapeHeader}>
              <View style={styles.brandRow}>
                <Text style={styles.appTitle}>MEMORYWEAVER</Text>
                <Text style={styles.roleBadge}>🧑‍⚕️ Studio</Text>
              </View>
              <View style={styles.landscapeHeaderActions}>
                <TouchableOpacity
                  style={styles.actionPillBtn}
                  onPress={() => setSavedRoomsModalVisible(true)}
                >
                  <Text style={styles.actionPillText}>📂 Thư viện ({savedRooms.length})</Text>
                </TouchableOpacity>

                {currentRoom && (
                  <TouchableOpacity
                    style={[styles.actionPillBtn, styles.saveRoomPillBtn]}
                    onPress={() => {
                      setSaveRoomInputTitle(roomTitle || currentRoom.title || '');
                      setSaveModalVisible(true);
                    }}
                  >
                    <Text style={[styles.actionPillText, styles.saveRoomPillText]}>💾 Lưu</Text>
                  </TouchableOpacity>
                )}

                {currentRoom && (
                  <TouchableOpacity
                    style={styles.startTherapyBtn}
                    onPress={() => {
                      setSpeakingText(null);
                      setActiveMemoryModal(null);
                      setRole('patient');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.startTherapyBtnText}>🌟 Cho người bệnh</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.settingsBtn} onPress={openSettings}>
                  <Text style={styles.settingsBtnText}>⚙️</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Thân Màn Hình Ngang: Cột Trái 3D (62%) & Cột Phải Bảng Điều Khiển (38%) */}
            <View style={styles.landscapeBody}>
              {/* Cột Trái: Bộ xem phòng 3D */}
              <View style={[styles.landscapeViewerCol, isExpanded && { flex: 1 }]}>
                <View style={styles.viewerHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roomTitleText} numberOfLines={1}>{roomTitle}</Text>
                    {povMode === 'focused' ? (
                      <Text style={styles.povSubtitleText}>👁️ {focusedLabel}</Text>
                    ) : null}
                  </View>
                  <View style={styles.viewerControls}>
                    <TouchableOpacity
                      style={styles.expandBtn}
                      onPress={() => setIsExpanded(prev => !prev)}
                      accessibilityLabel="Phóng to hoặc thu nhỏ căn phòng"
                    >
                      <Text style={styles.expandBtnText}>{isExpanded ? '🗗 Thu gọn' : '⛶ Mở rộng'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.resetBtn}
                      disabled={!currentRoom}
                      onPress={() => setNavMode(mode => {
                        const next = mode === 'fpv' ? 'overview' : 'fpv';
                        if (next === 'fpv') setIsExpanded(true);
                        return next;
                      })}
                    >
                      <Text style={styles.resetBtnText}>{navMode === 'fpv' ? 'Toàn cảnh' : '🕹️ Bước vào'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.resetBtn} onPress={resetRoom}>
                      <Text style={styles.resetBtnText}>Làm mới</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  {render3DViewer()}
                </View>
              </View>

              {/* Cột Phải: Chat, Giọng nói và Bảng điều khiển (Tự động ẩn khi phóng to) */}
              {!isExpanded && (
                <View style={styles.landscapeChatCol}>
                  <View style={styles.statusBar}>
                    <Text style={styles.statusText} numberOfLines={1}>{status}</Text>
                  </View>

                  {renderMemoryBar()}
                  {renderMessagesList()}
                  {renderSuggestionsList()}
                  {renderVoiceBanner()}
                  {renderAttachmentBar()}
                  {renderInputRow()}
                </View>
              )}
            </View>
          </View>
        ) : (
          /* ===== BỐ CỤC MÀN HÌNH DỌC (PORTRAIT STUDIO) ===== */
          <>
            {/* Header Người Soạn Phòng */}
            <View style={styles.header}>
              <View>
                <View style={styles.brandRow}>
                  <Text style={styles.appTitle}>MEMORYWEAVER</Text>
                  <Text style={styles.roleBadge}>🧑‍⚕️ Người Soạn Phòng</Text>
                </View>
                <Text style={styles.appSubtitle}>Biên soạn & chuẩn bị không gian gợi nhớ ký ức</Text>
              </View>
              <View style={styles.headerActionRow}>
                {currentRoom && (
                  <TouchableOpacity
                    style={styles.startTherapyBtn}
                    onPress={() => {
                      setSpeakingText(null);
                      setActiveMemoryModal(null);
                      setRole('patient');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.startTherapyBtnText}>🌟 Bắt đầu cho người bệnh</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.settingsBtn} onPress={openSettings}>
                  <Text style={styles.settingsBtnText}>Cài đặt</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Thanh quản lý Thư viện phòng ký ức & Khởi động */}
            <View style={styles.creatorActionBar}>
              <TouchableOpacity
                style={styles.actionPillBtn}
                onPress={() => setSavedRoomsModalVisible(true)}
              >
                <Text style={styles.actionPillText}>📂 Thư viện phòng ({savedRooms.length})</Text>
              </TouchableOpacity>

              {currentRoom && (
                <TouchableOpacity
                  style={[styles.actionPillBtn, styles.saveRoomPillBtn]}
                  onPress={() => {
                    setSaveRoomInputTitle(roomTitle || currentRoom.title || '');
                    setSaveModalVisible(true);
                  }}
                >
                  <Text style={[styles.actionPillText, styles.saveRoomPillText]}>💾 Lưu phòng này</Text>
                </TouchableOpacity>
              )}

              {!currentRoom && savedRooms.length > 0 && (
                <TouchableOpacity
                  style={[styles.actionPillBtn, styles.launchPillBtn]}
                  onPress={() => selectSavedRoom(savedRooms[0])}
                >
                  <Text style={styles.launchPillText}>⚡ Nạp mẫu "{savedRooms[0].title.slice(0, 18)}…"</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* === 3D Room Viewer (Tập trung không gian 3D trực quan) === */}
            <View style={[styles.viewerContainer, isExpanded ? styles.viewerContainerExpanded : styles.viewerContainerNormal]}>
              <View style={styles.viewerHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roomTitleText} numberOfLines={1}>{roomTitle}</Text>
                  {povMode === 'focused' ? (
                    <Text style={styles.povSubtitleText}>👁️ Đang đứng cạnh: {focusedLabel} (Vuốt để nhìn quanh)</Text>
                  ) : currentRoom ? (
                    <Text style={styles.povSubtitleText}>🧠 Bộ nhớ bật • Gõ để chỉnh sửa tiếp đến khi đúng ý</Text>
                  ) : null}
                </View>
                <View style={styles.viewerControls}>
                  <TouchableOpacity
                    style={styles.expandBtn}
                    onPress={() => setIsExpanded(prev => !prev)}
                    accessibilityLabel="Phóng to hoặc thu nhỏ căn phòng"
                  >
                    <Text style={styles.expandBtnText}>{isExpanded ? '🗗 Thu gọn' : '⛶ Mở rộng'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.resetBtn}
                    disabled={!currentRoom}
                    onPress={() => setNavMode(mode => {
                      const next = mode === 'fpv' ? 'overview' : 'fpv';
                      if (next === 'fpv') setIsExpanded(true);
                      return next;
                    })}
                  >
                    <Text style={styles.resetBtnText}>{navMode === 'fpv' ? 'Toàn cảnh' : '🕹️ Bước vào'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.resetBtn} onPress={resetRoom}>
                    <Text style={styles.resetBtnText}>Làm mới</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {render3DViewer()}
            </View>

            {/* Chat & Controls Area */}
            <View style={[styles.chatSection, isExpanded && styles.chatSectionCollapsed]}>
              <View style={styles.statusBar}>
                <Text style={styles.statusText}>{status}</Text>
              </View>

              {renderMemoryBar()}
              {renderMessagesList()}
              {renderSuggestionsList()}
              {renderAttachmentBar()}
              {renderVoiceBanner()}
              {renderInputRow()}

              <Text style={styles.hintFooter}>
                Soạn xong phòng? Bấm "🌟 Bắt đầu cho người bệnh" ở trên để vào chế độ trị liệu!
              </Text>
            </View>
          </>
        )}
      </KeyboardAvoidingView>

      {/* Settings Modal */}
      <Modal onRequestClose={() => setSettingsVisible(false)} visible={settingsVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Kết nối Server & Cài đặt AI</Text>

            <Text style={styles.inputLabel}>Địa chỉ Server:</Text>
            <TextInput
              style={styles.modalInput}
              value={inputEndpoint}
              onChangeText={setInputEndpoint}
              placeholder="http://192.168.1.207:8787 hoặc https://..."
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>Mã truy cập APP_ACCESS_TOKEN:</Text>
            <TextInput
              style={styles.modalInput}
              value={inputToken}
              onChangeText={setInputToken}
              placeholder="Mã 48 ký tự trong file server/.env"
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Khóa Gemini API (Tùy chọn cho Cloud Server):</Text>
            <TextInput
              style={styles.modalInput}
              value={inputApiKey}
              onChangeText={setInputApiKey}
              placeholder="AIzaSy... (nếu dùng server Cloud hoặc key riêng)"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.modalHelp}>
              • Mạng nội bộ: Nhập IP máy tính (http://192.168.1.207:8787).{'\n'}
              • Cloudflare (Khuyên dùng): Dán link https://...trycloudflare.com từ CHAY_SERVER.bat.{'\n'}
              • Khóa Gemini API: Tùy chọn khi cần server gọi AI qua quota tài khoản riêng.
            </Text>

            <TouchableOpacity
              style={styles.diagModalBtn}
              onPress={() => {
                setSettingsVisible(false);
                loadDiagnosis();
              }}
            >
              <Text style={styles.diagModalBtnText}>Kiểm tra khả năng xử lý ảnh</Text>
            </TouchableOpacity>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={saveSettings}>
                <Text style={styles.saveBtnText}>Lưu kết nối</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.closeBtn]} onPress={() => setSettingsVisible(false)}>
                <Text style={styles.closeBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Thư viện phòng ký ức đã lưu */}
      <Modal
        onRequestClose={() => setSavedRoomsModalVisible(false)}
        visible={savedRoomsModalVisible}
        animationType="slide"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '82%' }]}>
            <Text style={styles.modalTitle}>Thư Viện Phòng Ký Ức</Text>
            <Text style={styles.modalHelp}>Chọn phòng đã lưu để mở lại ngay hoặc đem cho người bệnh trải nghiệm:</Text>

            <ScrollView style={{ maxHeight: 360 }}>
              {savedRooms.map(item => (
                <View key={item.id} style={styles.savedRoomCardRow}>
                  <TouchableOpacity
                    style={styles.savedRoomCardMain}
                    onPress={() => selectSavedRoom(item)}
                  >
                    <Text style={styles.savedRoomTitle}>🏡 {item.title}</Text>
                    <Text style={styles.savedRoomDate}>{item.createdAt} • {item.room?.objects?.length || 0} đồ vật</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.savedRoomDeleteBtn}
                    onPress={() => {
                      Alert.alert('Xóa phòng', `Bạn có chắc muốn xóa "${item.title}" khỏi thư viện không?`, [
                        { text: 'Hủy', style: 'cancel' },
                        { text: 'Xóa', style: 'destructive', onPress: () => deleteSavedRoom(item.id) }
                      ]);
                    }}
                  >
                    <Text style={styles.savedRoomDeleteText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalBtn, styles.closeBtn, { marginTop: 14 }]}
              onPress={() => setSavedRoomsModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Lưu phòng */}
      <Modal
        onRequestClose={() => setSaveModalVisible(false)}
        visible={saveModalVisible}
        animationType="fade"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Lưu Phòng Vào Thư Viện</Text>
            <Text style={styles.inputLabel}>Tên gợi nhớ cho căn phòng:</Text>
            <TextInput
              style={styles.modalInput}
              value={saveRoomInputTitle}
              onChangeText={setSaveRoomInputTitle}
              placeholder="Ví dụ: Lớp học 12A • Bàn học của Thành"
            />
            <View style={[styles.modalBtnRow, { marginTop: 16 }]}>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={saveCurrentRoomToLibrary}>
                <Text style={styles.saveBtnText}>Lưu phòng</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.closeBtn]} onPress={() => setSaveModalVisible(false)}>
                <Text style={styles.closeBtnText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView></SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4efe8',
  },
  container: {
    flex: 1,
  },

  // ===== Giao diện Người Soạn Phòng (Creator) =====
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f4efe8',
    borderBottomWidth: 1,
    borderBottomColor: '#e5ded4',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#213835',
    letterSpacing: 0.5,
  },
  roleBadge: {
    fontSize: 10.5,
    fontWeight: '700',
    backgroundColor: '#d8e8df',
    color: '#245946',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  appSubtitle: {
    fontSize: 11,
    color: '#496b61',
    marginTop: 1,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  startTherapyBtn: {
    backgroundColor: '#277054',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  startTherapyBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  settingsBtn: {
    backgroundColor: '#436155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  settingsBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '600',
  },
  creatorActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e9f0eb',
    borderBottomWidth: 1,
    borderBottomColor: '#d6e2da',
    gap: 6,
  },
  actionPillBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c0d4c8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  actionPillText: {
    fontSize: 11,
    color: '#285444',
    fontWeight: '600',
  },
  saveRoomPillBtn: {
    backgroundColor: '#e0efe7',
    borderColor: '#98cbb0',
  },
  saveRoomPillText: {
    color: '#1b5a3e',
    fontWeight: '700',
  },
  launchPillBtn: {
    backgroundColor: '#f7f2ea',
    borderColor: '#d8cbb8',
    flex: 1,
  },
  launchPillText: {
    fontSize: 11,
    color: '#7a5a32',
    fontWeight: '600',
  },

  // ===== 3D Viewer Section (Creator Mode) =====
  viewerContainer: {
    backgroundColor: '#1c2421',
  },
  viewerContainerNormal: {
    flex: 1.55,
  },
  viewerContainerExpanded: {
    flex: 3.5,
  },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#161e1b',
    borderBottomWidth: 1,
    borderBottomColor: '#25302c',
  },
  roomTitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#95d1bd',
    letterSpacing: 0.5,
    flexShrink: 1,
    marginRight: 6,
  },
  viewerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expandBtn: {
    backgroundColor: '#273e35',
    borderColor: '#436154',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  expandBtnText: {
    color: '#a8d5c4',
    fontWeight: '700',
    fontSize: 10.5,
  },
  resetBtn: {
    backgroundColor: '#2e4e42',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  resetBtnText: {
    color: '#e4ece8',
    fontSize: 11,
    fontWeight: '600',
  },
  povSubtitleText: {
    fontSize: 10.5,
    color: '#a3c2b5',
    fontWeight: '600',
    marginTop: 2,
  },

  // ===== Chat & Design Section =====
  chatSection: {
    flex: 0.9,
    backgroundColor: '#f3f6f3',
    borderTopWidth: 1,
    borderTopColor: '#d6ded8',
  },
  chatSectionCollapsed: {
    flex: 0.55,
  },
  statusBar: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: '#e5ece7',
  },
  statusText: {
    fontSize: 11,
    color: '#34554b',
  },
  memoryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e3ece6',
    borderBottomWidth: 1,
    borderBottomColor: '#d0ddd4',
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 8,
  },
  memoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  memoryIcon: {
    fontSize: 13,
  },
  memoryText: {
    fontSize: 11,
    color: '#264a3e',
    fontWeight: '600',
    flex: 1,
  },
  newRoomBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#b4c9be',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newRoomBtnText: {
    fontSize: 10.5,
    color: '#2c594b',
    fontWeight: '700',
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  messageListContent: {
    paddingVertical: 8,
  },
  messageBubble: {
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
    maxWidth: '90%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2e6151',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d4ded8',
  },
  messageAuthor: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    color: '#87948e',
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#1a2624',
  },
  suggestionsWrapper: {
    backgroundColor: '#ebf1ec',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#d6dfd9',
  },
  suggestionsContainer: {
    paddingHorizontal: 10,
    gap: 6,
    flexDirection: 'row',
  },
  suggestionChip: {
    backgroundColor: '#ffffff',
    borderColor: '#c6d4cc',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  suggestionText: {
    fontSize: 11,
    color: '#214036',
    fontWeight: '500',
  },
  caregiverChip: {
    backgroundColor: '#2e6151',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 6,
  },
  caregiverChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  attachmentBar: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: '#e9efe9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  unattachedText: {
    fontSize: 11,
    color: '#71857c',
  },
  attachedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  thumbImage: {
    width: 22,
    height: 22,
    borderRadius: 3,
    marginRight: 8,
  },
  attachedText: {
    fontSize: 11,
    color: '#2e6151',
    fontWeight: '600',
    flex: 1,
  },
  clearImgBtn: {
    backgroundColor: '#d85140',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  clearImgText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fbfcfb',
  },
  photoBtn: {
    backgroundColor: '#2e6151',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 6,
    marginRight: 6,
  },
  photoBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  textureBtn: {
    backgroundColor: '#e6eee9',
    borderWidth: 1,
    borderColor: '#c1d4c8',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 6,
  },
  textureBtnActive: {
    backgroundColor: '#2e6151',
    borderColor: '#2e6151',
  },
  textureBtnText: {
    color: '#2c594b',
    fontSize: 11,
    fontWeight: '600',
  },
  textureBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  voiceBtn: {
    backgroundColor: '#386c87',
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 6,
  },
  voiceBtnActive: {
    backgroundColor: '#dc2626',
  },
  voiceBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  voiceListeningBanner: {
    backgroundColor: '#f0f9ff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  voiceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  voicePulseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  voicePulseDot: {
    fontSize: 12,
  },
  voiceStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369a1',
  },
  voiceCloseBtn: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  voiceCloseBtnText: {
    fontSize: 11,
    color: '#0369a1',
    fontWeight: '600',
  },
  voiceInstructionText: {
    fontSize: 11,
    color: '#334155',
    marginBottom: 6,
  },
  voiceChipsScroll: {
    flexDirection: 'row',
  },
  voiceChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#7dd3fc',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
  },
  voiceChipText: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '600',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cad4ce',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    maxHeight: 70,
    color: '#213835',
  },
  sendBtn: {
    backgroundColor: '#2e6151',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 6,
    marginLeft: 6,
  },
  cancelBtn: {
    backgroundColor: '#c44536',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  hintFooter: {
    fontSize: 10,
    textAlign: 'center',
    color: '#496b61',
    paddingVertical: 4,
    backgroundColor: '#edf4ef',
  },

  // ===== GIAO DIỆN NGƯỜI BỆNH ALZHEIMER (PATIENT) =====
  patientSafeArea: {
    flex: 1,
    backgroundColor: '#121a16',
  },
  patientTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#182520',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2b3f36',
  },
  patientTitleBlock: {
    flex: 1,
    marginRight: 10,
  },
  patientBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#a3d9c3',
    letterSpacing: 0.5,
  },
  patientTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  patientControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  patientNavToggleBtn: {
    backgroundColor: '#2d4b3f',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#4d7564',
  },
  patientNavToggleText: {
    color: '#e8f5ee',
    fontSize: 12,
    fontWeight: '700',
  },
  patientChangeRoomBtn: {
    backgroundColor: '#20342c',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#385548',
  },
  patientChangeRoomText: {
    color: '#b6d7c8',
    fontSize: 11.5,
    fontWeight: '600',
  },
  patientExitBtn: {
    backgroundColor: '#382b27',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#59443e',
  },
  patientExitText: {
    color: '#f0c7bc',
    fontSize: 11.5,
    fontWeight: '700',
  },
  patientViewerWrap: {
    flex: 1,
    backgroundColor: '#101714',
  },

  // Thanh Neo Kỷ Niệm (Patient Memory Highlights Carousel)
  patientMemoryPillsBar: {
    position: 'absolute',
    bottom: 16,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(18, 28, 24, 0.94)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#395347',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  patientPillsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ad0b8',
    marginBottom: 6,
  },
  patientPillsScroll: {
    gap: 8,
    flexDirection: 'row',
  },
  patientMemoryPill: {
    backgroundColor: '#253931',
    borderWidth: 1,
    borderColor: '#426154',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  patientMemoryPillActive: {
    backgroundColor: '#2a5b48',
    borderColor: '#82c9a9',
  },
  patientMemoryPillText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Thẻ Ký Ức Nổi (Patient Memory Card)
  patientMemoryCardBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    zIndex: 999,
  },
  patientMemoryCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '75%',
    backgroundColor: '#1b2a24',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#4d7563',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  patientCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#2b4036',
    paddingBottom: 12,
    marginBottom: 12,
  },
  patientCardIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  patientCardAvatar: {
    fontSize: 32,
  },
  patientCardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#ffffff',
  },
  patientCardSubtitle: {
    fontSize: 12,
    color: '#8dc5ad',
    fontWeight: '600',
    marginTop: 2,
  },
  patientCardCloseBtn: {
    backgroundColor: '#2b3f36',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  patientCardCloseText: {
    color: '#d4eae0',
    fontSize: 12,
    fontWeight: '700',
  },
  patientCardBody: {
    maxHeight: 180,
    marginBottom: 14,
  },
  patientCardText: {
    fontSize: 15.5,
    lineHeight: 25,
    color: '#e4f2eb',
  },
  patientCardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  patientSpeakBtn: {
    flex: 1,
    backgroundColor: '#2e6b54',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#499074',
  },
  patientSpeakBtnActive: {
    backgroundColor: '#c44536',
    borderColor: '#e56b5d',
  },
  patientSpeakBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  patientFocusBtn: {
    flex: 1,
    backgroundColor: '#22382e',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3c5a4b',
  },
  patientFocusBtnText: {
    color: '#a3d9c3',
    fontSize: 13,
    fontWeight: '700',
  },

  // ===== Modals & Settings =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#213835',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#496b61',
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#c6d1cb',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#213835',
  },
  modalHelp: {
    fontSize: 11,
    lineHeight: 16,
    color: '#6e8078',
    marginVertical: 10,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  saveBtn: {
    backgroundColor: '#2e6151',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  closeBtn: {
    backgroundColor: '#e6ece8',
  },
  closeBtnText: {
    color: '#344741',
    fontWeight: '600',
    fontSize: 13,
  },
  diagModalBtn: {
    backgroundColor: '#ebf4ef',
    borderWidth: 1,
    borderColor: '#a8c6b6',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  diagModalBtnText: {
    color: '#215343',
    fontSize: 12.5,
    fontWeight: '600',
  },

  // Saved Rooms Card List
  savedRoomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f8f5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#cfe0d6',
  },
  savedRoomCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f8f5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#cfe0d6',
    gap: 8,
  },
  savedRoomCardMain: {
    flex: 1,
  },
  savedRoomTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d3e33',
  },
  savedRoomDate: {
    fontSize: 11,
    color: '#608577',
    marginTop: 2,
  },
  savedRoomOpenBadge: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#26654e',
    backgroundColor: '#d6ede1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  savedRoomDeleteBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#faebe9',
  },
  savedRoomDeleteText: {
    fontSize: 14,
  },

  // ===== BILINGUAL VOICE & TOGGLES =====
  langPillBtn: {
    backgroundColor: '#e8f3ee',
    borderWidth: 1,
    borderColor: '#98c0ac',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 8,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d5440',
  },
  voiceLangToggleRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  voiceLangBadge: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  voiceLangBadgeActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  voiceLangBadgeText: {
    fontSize: 11,
    color: '#0369a1',
    fontWeight: '600',
  },
  voiceLangBadgeTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // ===== RESPONSIVE LANDSCAPE LAYOUT (CREATOR) =====
  landscapeContainer: {
    flex: 1,
    backgroundColor: '#f4efe8',
  },
  landscapeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#f4efe8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0d8cc',
  },
  landscapeHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  landscapeBody: {
    flex: 1,
    flexDirection: 'row',
  },
  landscapeViewerCol: {
    flex: 1.25,
    backgroundColor: '#1c2421',
    borderRightWidth: 1,
    borderRightColor: '#2d3b36',
  },
  landscapeChatCol: {
    flex: 0.85,
    backgroundColor: '#f3f6f3',
    display: 'flex',
    flexDirection: 'column',
  },

  // ===== RESPONSIVE LANDSCAPE LAYOUT (PATIENT) =====
  patientTopBarLandscape: {
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  patientMemoryPillsBarLandscape: {
    bottom: 8,
    left: 16,
    right: 16,
    paddingVertical: 5,
  },
  patientMemoryCardLandscape: {
    maxHeight: '90%',
    maxWidth: 520,
    padding: 14,
  },
});
