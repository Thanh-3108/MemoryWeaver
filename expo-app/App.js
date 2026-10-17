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
  Keyboard,
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
import {
  requestRoom,
  validEndpoint,
  requestDiagnosis,
  extractTextures,
  fetchLatestSync,
  publishSync,
  sendSyncMessage,
  acknowledgeSync
} from './lib/room-api';
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
          routineLabel: 'Giờ ăn trưa 12:00',
          interaction: {
            type: 'desk_drawer',
            actionTitle: 'Kéo ngăn bàn học',
            drawerFeeling: 'Kéo ngăn bàn ra, bạn nhìn thấy cây bút máy Kim Tinh và cuốn sổ ghi chép thuở học trò.',
            insideItems: ['Cây bút máy Kim Tinh mực tím', 'Vở chép bài thơ bạn yêu thích', 'Thước kẻ gỗ khắc tên bạn']
          },
          memoryFragment: {
            id: 'frag-class-desk',
            title: 'Mảnh ký ức: Thời cắp sách chăm chỉ',
            questPrompt: 'Đến bên chiếc bàn học góc cửa sổ và kéo ngăn hộc bàn',
            story: 'Những năm tháng học trò miệt mài bên trang sách, luôn là niềm tự hào của cả gia đình.',
            senseOfSelf: 'Bạn là người ham học hỏi, cần cù và có nền tảng tri thức vững vàng.'
          }
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
          isInteractable: true,
          interaction: { type: 'bed_rest', actionTitle: 'Ngồi nghỉ ngơi', bedFeeling: 'Ngồi lên chiếc ghế gỗ thân thuộc, lắng nghe thanh âm bình yên của lớp học.' },
          memoryFragment: { id: 'frag-class-chair', title: 'Mảnh ký ức: Chỗ ngồi thân thương', questPrompt: 'Đến ngồi lên chiếc ghế học', story: 'Nơi bạn từng ngồi cùng bàn với những người bạn thân thuở thiếu thời.', senseOfSelf: 'Bạn trân trọng tình bạn và những gắn bó chân thành.' }
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
          isInteractable: true,
          interaction: { type: 'window_breeze', actionTitle: 'Đón gió sân trường', breezeFeeling: 'Tiếng ve râm ran và gió thoảng hương hoa phượng đỏ rực ngoài sân trường.' },
          memoryFragment: { id: 'frag-class-win', title: 'Mảnh ký ức: Khung trời tuổi trẻ', questPrompt: 'Đến bên khung cửa sổ ngắm sân trường', story: 'Khung cửa sổ nơi bạn từng mơ ước về những chuyến đi xa và tương lai tươi sáng.', senseOfSelf: 'Bạn mang trong mình tinh thần lạc quan và khát khao vươn lên.' }
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
          id: 'door-canteen',
          kind: 'door',
          label: 'Cửa bước sang Canteen',
          description: 'Cửa dẫn ra hành lang xuống nhà ăn canteen trường học',
          x: -3.85,
          y: 0,
          z: 0,
          yaw: 90,
          width: 1.1,
          height: 2.2,
          depth: 0.1,
          color: '#8B5A2B',
          isInteractable: true,
          targetRoomId: 'room-canteen',
          interaction: { type: 'door_transition', actionTitle: 'Xuống canteen', targetRoomId: 'room-canteen' }
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
      ],
      connectedRooms: [
        {
          id: 'room-canteen',
          title: 'Nhà Ăn Canteen Trường Học',
          roomType: 'kitchen',
          width: 6, depth: 5, height: 3,
          wallColor: '#FFFDF7', floorColor: '#DCD4C4',
          objects: [
            {
              id: 'canteen-table', kind: 'table', label: 'Bàn ăn tập thể rộn rã', description: 'Chiếc bàn ăn nơi nhóm bạn quây quần ăn trưa',
              x: 0, y: 0, z: 0, yaw: 0, width: 2.0, height: 0.75, depth: 1.0, color: '#C49A6C',
              isInteractable: true,
              interaction: { type: 'desk_drawer', actionTitle: 'Mở khay ăn', drawerFeeling: 'Mùi cơm canh nóng hổi thơm phức của canteen trường.', insideItems: ['Hộp cơm kim loại', 'Chiếc thìa nhôm quen thuộc', 'Cốc nước ấm'] },
              memoryFragment: { id: 'frag-canteen-1', title: 'Mảnh ký ức: Tình bạn thanh xuân', questPrompt: 'Khám phá bàn ăn canteen trường', story: 'Những bữa trưa rộn rã tiếng cười cùng bạn bè đồng môn.', senseOfSelf: 'Bạn là người bạn chân thành, luôn được bạn bè yêu quý.' }
            },
            {
              id: 'door-back-class', kind: 'door', label: 'Cửa về Lớp học', description: 'Quay lại lớp học',
              x: 0, y: 0, z: 2.35, yaw: 180, width: 1.1, height: 2.2, depth: 0.1, color: '#8B5A2B',
              isInteractable: true, targetRoomId: 'primary',
              interaction: { type: 'door_transition', actionTitle: 'Về lại lớp', targetRoomId: 'primary' }
            }
          ]
        },
        {
          id: 'room-library',
          title: 'Thư Viện Trường Yên Tĩnh',
          roomType: 'library',
          width: 7, depth: 6, height: 3,
          wallColor: '#FDFBF7', floorColor: '#B89772',
          objects: [
            {
              id: 'lib-book', kind: 'book', label: 'Sách Tuyển Tập Văn Học', description: 'Cuốn sách yêu thích bạn từng mượn đọc say sưa',
              x: 0, y: 0.75, z: 0, yaw: 0, width: 0.3, height: 0.05, depth: 0.2, color: '#8B2500',
              isInteractable: true,
              interaction: {
                type: 'book_read', actionTitle: 'Mở đọc sách',
                pages: [
                  'Trang 1: "Văn học là nhân học. Những trang sách nâng đỡ tâm hồn con người qua bao thăng trầm cuộc đời."',
                  'Trang 2: "Những buổi chiều ngồi đọc sách tại thư viện, bạn say sưa đắm mình vào từng câu chữ tinh hoa."',
                  'Trang 3: "Tri thức là tài sản quý giá nhất mà không ai có thể lấy đi được của bạn."'
                ]
              },
              memoryFragment: { id: 'frag-lib-1', title: 'Mảnh ký ức: Tình yêu tri thức', questPrompt: 'Mở đọc cuốn sách văn học tại thư viện', story: 'Tình yêu cái đẹp và tri thức đã bồi đắp tâm hồn bạn suốt cuộc đời.', senseOfSelf: 'Bạn có một tâm hồn cao đẹp, tinh tế và giàu lòng trắc ẩn.' }
            },
            {
              id: 'door-lib-class', kind: 'door', label: 'Cửa về Lớp học', description: 'Quay lại lớp học',
              x: 0, y: 0, z: 2.85, yaw: 180, width: 1.1, height: 2.2, depth: 0.1, color: '#8B5A2B',
              isInteractable: true, targetRoomId: 'primary',
              interaction: { type: 'door_transition', actionTitle: 'Về lại lớp', targetRoomId: 'primary' }
            }
          ]
        }
      ]
    }
  },
  {
    id: 'preset-living-room',
    title: 'Ngôi nhà xưa ấm cúng của gia đình',
    createdAt: 'Mẫu có sẵn',
    room: {
      title: 'Ngôi nhà xưa ấm cúng của gia đình',
      reply: 'Phòng khách thân thương với chiếc sofa êm ái, tủ gỗ đựng quần áo, bàn trà và ánh đèn vàng dịu nhẹ.',
      width: 7,
      depth: 6,
      height: 3,
      wallColor: '#FFFDF7',
      floorColor: '#C8A97E',
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
          color: '#8B5A2B',
          isInteractable: true,
          interaction: { type: 'bed_rest', actionTitle: 'Ngả lưng thư giãn', bedFeeling: 'Chiếc ghế sofa êm ái nâng niu lưng bạn, tiếng tivi quen thuộc vang vọng mang lại cảm giác an yên lạ thường.' },
          memoryFragment: { id: 'frag-liv-sofa', title: 'Mảnh ký ức: Hơi ấm gia đình quây quần', questPrompt: 'Đến ngồi ngả lưng trên chiếc ghế sofa kỷ niệm', story: 'Những buổi tối cả nhà quây quần bên nhau luôn là khoảng thời gian hạnh phúc nhất.', senseOfSelf: 'Bạn là trụ cột yêu thương, luôn đặt hạnh phúc của gia đình lên trên hết.' }
        },
        {
          id: 'wardrobe-living',
          kind: 'wardrobe',
          label: 'Tủ gỗ đựng quần áo',
          description: 'Tủ gỗ 2 cánh màu cánh gián chứa đầy những bộ trang phục kỷ niệm của cuộc đời bạn.',
          x: -2.8,
          y: 0,
          z: 0,
          yaw: -90,
          width: 1.4,
          height: 2.1,
          depth: 0.65,
          color: '#7A4E2D',
          isInteractable: true,
          interaction: {
            type: 'wardrobe_open',
            actionTitle: 'Mở cánh tủ gỗ',
            wardrobeFeeling: 'Cánh tủ mở ra thơm mùi gỗ trầm và sáp thơm, bên trong là những bộ đồ gắn với từng dấu mốc cuộc đời.',
            clothes: ['Bộ áo dài lụa màu mây thanh nhã', 'Chiếc áo sơ mi trắng phẳng phiu thời đi dạy', 'Chiếc áo len ấm mẹ đan thuở hàn vi'],
            mementos: ['Chiếc cặp sách da cũ thời đi học', 'Hộp gỗ đựng những lá thư tay thời thanh xuân']
          },
          memoryFragment: { id: 'frag-liv-ward', title: 'Mảnh ký ức: Phong cách sống thanh lịch', questPrompt: 'Đến mở cánh tủ gỗ đựng quần áo', story: 'Bạn luôn ăn mặc chỉn chu, lịch thiệp và giữ gìn nếp sống gia phong đáng kính trọng.', senseOfSelf: 'Bạn là người sống có nguyên tắc, trang nhã và tôn trọng mọi người xung quanh.' }
        },
        {
          id: 'desk-living',
          kind: 'desk',
          label: 'Bàn viết & hộc bàn kỷ vật',
          description: 'Bàn gỗ nơi bạn thường ghi chép sổ tay chi tiêu và viết thư cho người thân.',
          x: 2.4,
          y: 0,
          z: 0.5,
          yaw: 90,
          width: 1.3,
          height: 0.75,
          depth: 0.65,
          color: '#9E6938',
          isInteractable: true,
          interaction: {
            type: 'desk_drawer',
            actionTitle: 'Kéo ngăn hộc bàn',
            drawerFeeling: 'Kéo hộc bàn gỗ ra, bạn thấy những kỷ vật thân quý được xếp ngay ngắn.',
            insideItems: ['Cây bút máy Kim Tinh nắp vàng ba tặng', 'Chiếc đồng hồ Liên Xô kim trôi êm đềm', 'Tấm ảnh chụp cả nhà đi biển năm ấy']
          },
          memoryFragment: { id: 'frag-liv-desk', title: 'Mảnh ký ức: Bàn tay cần mẫn & kỷ vật thiêng liêng', questPrompt: 'Đến bên bàn viết và kéo ngăn hộc bàn', story: 'Những trang viết và kỷ vật là chứng nhân cho sự tận tụy của bạn suốt tháng năm.', senseOfSelf: 'Bạn là con người chu đáo, cẩn thận và giàu lòng biết ơn.' }
        },
        {
          id: 'diary-living',
          kind: 'book',
          label: 'Cuốn sổ nhật ký của tôi',
          description: 'Cuốn sổ bìa da ghi lại những dòng tâm tư sâu lắng nhất trong cuộc đời bạn.',
          x: 2.4,
          y: 0.75,
          z: 0.5,
          yaw: 0,
          width: 0.25,
          height: 0.05,
          depth: 0.18,
          color: '#3E2723',
          isInteractable: true,
          interaction: {
            type: 'book_read',
            actionTitle: 'Mở đọc nhật ký',
            pages: [
              'Trang 1: "Ngày... tháng... Cuộc đời dù có bao khó khăn thì lòng thiện lương và tình yêu thương con cái vẫn là ngọn hải đăng soi đường cho tôi."',
              'Trang 2: "Hôm nay các con đã khôn lớn trưởng thành. Nhìn chúng hạnh phúc, tôi biết mọi hy sinh của mình đều xứng đáng."',
              'Trang 3: "Nếu sau này trí nhớ có nhạt phai, xin hãy nhắc cho tôi nhớ rằng: Tôi đã sống một cuộc đời trọn vẹn và không hối tiếc."'
            ]
          },
          memoryFragment: { id: 'frag-liv-diary', title: 'Mảnh ký ức: Tâm hồn sâu sắc & thiện lương', questPrompt: 'Đến mở đọc cuốn nhật ký trên bàn', story: 'Những dòng tâm tư chân thật thể hiện tấm lòng bao dung và tình thương vô bờ bến của bạn.', senseOfSelf: 'Bạn có một tâm hồn cao quý, luôn hướng thiện và bao dung với đời.' }
        },
        {
          id: 'door-kitchen',
          kind: 'door',
          label: 'Cửa bước sang Gian Bếp',
          description: 'Cửa gỗ mở lối sang gian bếp ấm cúng thơm mùi cơm canh',
          x: 0,
          y: 0,
          z: -2.85,
          yaw: 0,
          width: 1.1,
          height: 2.2,
          depth: 0.1,
          color: '#7A4E2D',
          isInteractable: true,
          targetRoomId: 'room_kitchen',
          interaction: { type: 'door_transition', actionTitle: 'Bước sang gian bếp', targetRoomId: 'room_kitchen' }
        },
        {
          id: 'window-garden',
          kind: 'window',
          label: 'Cửa sổ đón nắng vườn',
          description: 'Khung cửa sổ nhìn ra vườn cây xanh mướt, đón từng làn gió mát rượi.',
          x: 3.4,
          y: 1.1,
          z: 0.5,
          yaw: -1.57,
          width: 1.8,
          height: 1.4,
          depth: 0.15,
          color: '#E8F5E9',
          isInteractable: true,
          interaction: { type: 'window_breeze', actionTitle: 'Mở cửa sổ ngắm vườn', breezeFeeling: 'Gió nhẹ thổi qua khung cửa, hương hoa ngọc lan thoang thoảng cùng tiếng chim hót líu lo.' },
          memoryFragment: { id: 'frag-liv-win', title: 'Mảnh ký ức: Chiều thanh thản bên khung cửa', questPrompt: 'Đến mở cửa sổ đón gió vườn', story: 'Những buổi chiều thảnh thơi bên khung cửa ngắm hoa nở đem lại sự an lạc sâu lắng.', senseOfSelf: 'Bạn là người yêu thiên nhiên, có tâm hồn thanh thản và yêu đời.' }
        }
      ],
      connectedRooms: [
        {
          id: 'room_kitchen',
          title: 'Gian Bếp Ấm Cúng',
          roomType: 'kitchen',
          width: 5.5, depth: 5, height: 3,
          wallColor: '#FFFDF7', floorColor: '#D2B48C',
          objects: [
            {
              id: 'dining-table', kind: 'table', label: 'Bàn ăn gia đình tròn vị', description: 'Chiếc bàn ăn bằng gỗ mít nơi cả nhà quây quần chia sẻ bát canh ấm nóng.',
              x: 0, y: 0, z: 0, yaw: 0, width: 1.6, height: 0.75, depth: 1.0, color: '#8B5A2B',
              isInteractable: true,
              interaction: { type: 'desk_drawer', actionTitle: 'Khám phá mâm cơm gia đình', drawerFeeling: 'Hương thơm của mâm cơm mẹ nấu: bát canh cua đồng, đĩa rau muống luộc, đĩa cá kho tộ...', insideItems: ['Bộ bát đĩa men lam Bát Tràng', 'Bình nước ấm giữ nhiệt', 'Chiếc ấm pha trà gốm Chu Đậu'] },
              memoryFragment: { id: 'frag-kit-1', title: 'Mảnh ký ức: Hương vị tình thân', questPrompt: 'Đến bên chiếc bàn ăn gia đình trong gian bếp', story: 'Từng bữa cơm do chính tay bạn chăm chút là suối nguồn nuôi dưỡng cả gia đình.', senseOfSelf: 'Bạn là người giữ lửa tổ ấm, chu toàn và hết lòng chăm sóc người thân.' }
            },
            {
              id: 'door-back-living', kind: 'door', label: 'Cửa về Phòng Khách', description: 'Quay lại phòng khách',
              x: 0, y: 0, z: 2.35, yaw: 180, width: 1.1, height: 2.2, depth: 0.1, color: '#7A4E2D',
              isInteractable: true, targetRoomId: 'primary',
              interaction: { type: 'door_transition', actionTitle: 'Về lại phòng khách', targetRoomId: 'primary' }
            }
          ]
        },
        {
          id: 'room_garden',
          title: 'Hiên Vườn Nắng Sớm',
          roomType: 'garden',
          width: 6, depth: 6, height: 3.5,
          wallColor: '#F7F3EB', floorColor: '#C8A97E',
          objects: [
            {
              id: 'rocking-chair', kind: 'chair', label: 'Chiếc ghế bập bênh hiên nhà', description: 'Ghế mây bập bênh nơi bạn ngồi đọc báo và ngắm hoa mỗi sớm mai',
              x: 0, y: 0, z: 0, yaw: 0, width: 0.8, height: 0.95, depth: 0.85, color: '#9E6938',
              isInteractable: true,
              interaction: { type: 'bed_rest', actionTitle: 'Ngồi đung đưa ghế mây', bedFeeling: 'Gió sớm hiu hiu thổi, tiếng lá cây xào xạc hòa cùng tiếng chim líu lo.' },
              memoryFragment: { id: 'frag-gard-1', title: 'Mảnh ký ức: Chiều thanh thản bên hiên nhà', questPrompt: 'Đến ngồi lên ghế bập bênh ngắm hoa', story: 'Sự bình yên khi chăm chút từng luống rau, chậu hoa đã làm phong phú tâm hồn bạn.', senseOfSelf: 'Bạn có một tâm hồn tự tại, yêu đời và luôn mang đến niềm vui cho người xung quanh.' }
            },
            {
              id: 'door-back-from-garden', kind: 'door', label: 'Cửa bước vào Phòng Khách', description: 'Quay vào phòng khách',
              x: 0, y: 0, z: 2.85, yaw: 180, width: 1.1, height: 2.2, depth: 0.1, color: '#7A4E2D',
              isInteractable: true, targetRoomId: 'primary',
              interaction: { type: 'door_transition', actionTitle: 'Vào lại phòng khách', targetRoomId: 'primary' }
            }
          ]
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
  const [navMode, setNavMode] = useState('point_and_explore'); // 'point_and_explore' | 'overview' | 'fpv'
  const [lockCamera, setLockCamera] = useState(true);
  const [resetOverviewToken, setResetOverviewToken] = useState(0);
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

  // Multi-Room & Senior Navigation State
  const [activeRoomId, setActiveRoomId] = useState('primary');
  const [glideLabel, setGlideLabel] = useState('');
  const [strollAction, setStrollAction] = useState(null);

  // Patient Mode Interactions & Memory Quests
  const [activeMemoryModal, setActiveMemoryModal] = useState(null); // { label, description, isInteractable, item }
  const [focusLabel, setFocusLabel] = useState('');
  const [speakingText, setSpeakingText] = useState(null);
  const [discoveredFragments, setDiscoveredFragments] = useState({});
  const [senseOfSelfModalVisible, setSenseOfSelfModalVisible] = useState(false);
  const [bookPageIndex, setBookPageIndex] = useState(0);
  const [aiAuditModalVisible, setAiAuditModalVisible] = useState(false);
  const [patientGuideModalVisible, setPatientGuideModalVisible] = useState(false);

  // Saved Rooms Library
  const [savedRooms, setSavedRooms] = useState(DEFAULT_SAVED_PRESETS);
  const [savedRoomsModalVisible, setSavedRoomsModalVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saveRoomInputTitle, setSaveRoomInputTitle] = useState('');

  // Live Sync & Caregiver Monitoring State
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const currentRoomRef = useRef(currentRoom);
  currentRoomRef.current = currentRoom;

  const [caregiverModalVisible, setCaregiverModalVisible] = useState(false);
  const [activeLiveNotification, setActiveLiveNotification] = useState(null);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [customMsgInput, setCustomMsgInput] = useState('');
  const [syncReminders, setSyncReminders] = useState([
    { id: 'rem-1', time: '08:00', label: 'Uống thuốc sáng', type: 'medicine', icon: '💊', message: 'Bác ơi, đến giờ uống thuốc buổi sáng rồi ạ.' },
    { id: 'rem-2', time: '11:30', label: 'Ăn cơm trưa & uống nước', type: 'meal', icon: '🍚', message: 'Đến giờ ăn trưa rồi bác ơi, chúc bác ngon miệng!' },
    { id: 'rem-3', time: '14:30', label: 'Uống một cốc nước ấm', type: 'water', icon: '💧', message: 'Bác nhớ uống một cốc nước ấm cho khỏe người nhé.' },
    { id: 'rem-4', time: '20:00', label: 'Uống thuốc tối & nghỉ ngơi', type: 'medicine', icon: '💊', message: 'Đến giờ uống thuốc tối và chuẩn bị đi ngủ rồi bác ạ.' }
  ]);

  // Keyboard Visibility Listener
  useEffect(() => {
    if (!Keyboard || typeof Keyboard.addListener !== 'function') return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));
    return () => {
      showSub?.remove?.();
      hideSub?.remove?.();
    };
  }, []);

  // Live Sync Poller for Patient Mode
  useEffect(() => {
    if (role !== 'patient' || !serverEndpoint || typeof fetchLatestSync !== 'function') return;
    let isMounted = true;
    const pollSync = async () => {
      try {
        const data = await fetchLatestSync({ endpoint: serverEndpoint, token: appToken });
        if (!isMounted || !data?.ok) return;
        if (data.room && (!currentRoomRef.current || JSON.stringify(data.room) !== JSON.stringify(currentRoomRef.current))) {
          setCurrentRoom(data.room);
          setRoomTitle(data.room.title || 'Không gian ký ức');
        }
        if (data.activeNotification) {
          setActiveLiveNotification(data.activeNotification);
        } else {
          setActiveLiveNotification(null);
        }
      } catch (_) {}
    };
    pollSync();
    const interval = setInterval(pollSync, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [role, serverEndpoint, appToken]);

  const handleAcknowledgeNotification = async () => {
    setActiveLiveNotification(null);
    if (serverEndpoint && typeof acknowledgeSync === 'function') {
      try {
        await acknowledgeSync({ endpoint: serverEndpoint, token: appToken });
      } catch (_) {}
    }
  };

  const handlePublishToPatient = async () => {
    if (!currentRoom) {
      Alert.alert('Chưa có phòng', 'Hãy tạo hoặc chọn một căn phòng trước khi xuất bản sang máy Người Bệnh.');
      return;
    }
    try {
      setSyncStatusMsg('Đang xuất bản...');
      await publishSync({
        endpoint: serverEndpoint,
        token: appToken,
        room: currentRoom,
        reminders: syncReminders
      });
      setSyncStatusMsg('✅ Đã đồng bộ phòng thành công sang máy Người Bệnh!');
    } catch (err) {
      setSyncStatusMsg(`❌ Lỗi đồng bộ: ${err.message}`);
    }
  };

  const handleSendReminderPing = async (reminder) => {
    try {
      setSyncStatusMsg(`Đang gửi "${reminder.label}"...`);
      await sendSyncMessage({
        endpoint: serverEndpoint,
        token: appToken,
        text: reminder.message,
        type: reminder.type,
        title: reminder.label,
        icon: reminder.icon
      });
      setSyncStatusMsg(`✅ Đã gửi nhắc "${reminder.label}" tới Người Bệnh!`);
    } catch (err) {
      setSyncStatusMsg(`❌ Không gửi được: ${err.message}`);
    }
  };

  const handleSendCustomMessage = async () => {
    const text = customMsgInput.trim();
    if (!text) return;
    try {
      setSyncStatusMsg('Đang gửi thông báo...');
      await sendSyncMessage({
        endpoint: serverEndpoint,
        token: appToken,
        text,
        type: 'custom',
        title: 'Lời nhắn từ người chăm sóc',
        icon: '💌'
      });
      setCustomMsgInput('');
      setSyncStatusMsg('✅ Đã gửi lời nhắn tới Người Bệnh!');
    } catch (err) {
      setSyncStatusMsg(`❌ Không gửi được: ${err.message}`);
    }
  };

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

  const getActiveRoom = () => {
    if (!currentRoom) return null;
    if (!activeRoomId || activeRoomId === 'primary') return currentRoom;
    const found = currentRoom.connectedRooms?.find(r => r.id === activeRoomId);
    return found || currentRoom;
  };

  const unlockMemoryFragment = (fragment) => {
    if (!fragment || !fragment.id) return;
    setDiscoveredFragments(prev => {
      if (prev[fragment.id]) return prev;
      return { ...prev, [fragment.id]: fragment };
    });
  };

  const triggerStroll = (action) => {
    setStrollAction(action);
    setTimeout(() => setStrollAction(null), 120);
  };

  const handleDoorTransition = (targetRoomId, doorLabel) => {
    if (!targetRoomId) return;
    if (targetRoomId === 'primary') {
      setActiveRoomId('primary');
      setStatus(`Đã bước qua cửa vào ${currentRoom?.title || 'phòng chính'}`);
    } else {
      const targetRoom = currentRoom?.connectedRooms?.find(r => r.id === targetRoomId);
      if (targetRoom) {
        setActiveRoomId(targetRoomId);
        setStatus(`Đã bước qua cửa vào ${targetRoom.title}`);
      }
    }
  };

  const handleSelectFurniture = (label, description, item) => {
    const activeR = getActiveRoom();
    const resolvedItem = item || activeR?.objects?.find(o => o.label === label);
    if (resolvedItem?.memoryFragment?.id) {
      unlockMemoryFragment(resolvedItem.memoryFragment);
    }
    setBookPageIndex(0);
    if (role === 'patient') {
      setActiveMemoryModal({
        label,
        description,
        isInteractable: resolvedItem ? resolvedItem.isInteractable !== false : true,
        item: resolvedItem
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

  const handleResetOverview = () => {
    setResetOverviewToken(t => t + 1);
    setFocusedLabel('');
    setPovMode('overview');
    setFocusLabel(null);
    setGlideLabel(null);
    setStatus('Đã trở về góc nhìn toàn cảnh phòng');
  };

  const handlePovChange = (mode, label) => {
    setPovMode(mode);
    setFocusedLabel(label || '');
    if (mode === 'focused') {
      setStatus(`Đang khám phá: ${label || 'đồ vật'} • Góc nhìn cố định an toàn`);
    } else {
      setStatus('Đã trở về góc nhìn tổng quan phòng');
    }
  };

  // Danh sách các vật thể tương tác để tạo các điểm neo ký ức dưới chân màn hình người bệnh
  const displayRoom = getActiveRoom();
  const interactiveObjects = (displayRoom && Array.isArray(displayRoom.objects))
    ? displayRoom.objects.filter(obj => obj && obj.label)
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

  const renderAttachmentBar = () => {
    if (!imageUri) return null;
    return (
      <View style={styles.attachmentBar}>
        <View style={styles.attachedRow}>
          <Image source={{ uri: imageUri }} style={styles.thumbImage} />
          <View style={styles.attachedTextGroup}>
            <Text style={styles.attachedText} numberOfLines={1}>
              {voiceLang === 'en' ? 'Photo attached' : 'Ảnh phòng đã đính kèm'}
            </Text>
            <Text style={styles.attachedSubtext} numberOfLines={1}>
              {voiceLang === 'en' ? 'Ready to analyze & generate 3D room' : 'Sẵn sàng phân tích bố cục & dựng không gian 3D'}
            </Text>
          </View>
          <TouchableOpacity disabled={isBusy} onPress={clearImage} style={styles.clearImgBtn}>
            <Text style={styles.clearImgText}>{voiceLang === 'en' ? '✕ Remove' : '✕ Bỏ ảnh'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderInputRow = () => (
    <View style={styles.inputContainer}>
      <View style={styles.inputBoxRow}>
        <TextInput
          style={styles.textInput}
          placeholder={
            voiceLang === 'en'
              ? 'Describe room (e.g.: Living room with sofa, warm sunlight)...'
              : 'Mô tả căn phòng bạn muốn tạo (hoặc chạm gợi ý ở trên)...'
          }
          placeholderTextColor="#8d9b94"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={4000}
          editable={!isBusy}
        />
      </View>

      <View style={styles.inputToolbarRow}>
        <View style={styles.actionLeftGroup}>
          <TouchableOpacity
            style={[styles.photoBtn, isBusy && styles.disabledBtn]}
            onPress={pickImage}
            disabled={isBusy || isPicking}
          >
            <Text style={styles.photoBtnText}>
              {isPicking ? (voiceLang === 'en' ? '⏳ Đợi…' : '⏳ Đợi…') : (voiceLang === 'en' ? '📷 + Photo' : '📷 + Ảnh')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.textureBtn, usePhotoTexture && styles.textureBtnActive]}
            disabled={isBusy}
            onPress={handleTogglePhotoTexture}
          >
            <Text style={[styles.textureBtnText, usePhotoTexture && styles.textureBtnTextActive]}>
              {usePhotoTexture ? (voiceLang === 'en' ? '✨ Texture: ON' : '✨ Texture: BẬT') : (voiceLang === 'en' ? 'Texture: OFF' : 'Texture: TẮT')}
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
              {isListeningVoice ? (voiceLang === 'en' ? '🔴 Đang nghe' : '🔴 Đang nghe') : (voiceLang === 'en' ? '🎙️ Nói' : '🎙️ Nói')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRightGroup}>
          {isKeyboardVisible && (
            <TouchableOpacity
              style={styles.dismissKeyboardBtn}
              onPress={() => Keyboard.dismiss()}
              accessibilityLabel="Đóng bàn phím"
            >
              <Text style={styles.dismissKeyboardBtnText}>⌄ Đóng</Text>
            </TouchableOpacity>
          )}

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
      </View>
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
      room={getActiveRoom()}
      textures={usePhotoTexture ? textures : null}
      navMode={role === 'patient' ? 'point_and_explore' : navMode}
      lockCamera={role === 'patient' ? true : lockCamera}
      resetOverviewToken={resetOverviewToken}
      onNavModeChange={setNavMode}
      onNavWarning={message => setStatus(message)}
      cameraView={cameraView}
      onSelectFurniture={handleSelectFurniture}
      onRestrictedTouch={handleRestrictedTouch}
      onDoorTransition={handleDoorTransition}
      onPovChange={handlePovChange}
      focusLabel={focusLabel}
      glideLabel={glideLabel}
      strollAction={strollAction}
      speakText={speakingText}
    />
  );

  const connectedRoomsList = [
    { id: 'primary', title: currentRoom?.title || 'Phòng chính', roomType: 'primary' },
    ...(currentRoom?.connectedRooms || [])
  ];
  const allFragments = [];
  if (currentRoom?.objects) {
    currentRoom.objects.forEach(o => {
      if (o.memoryFragment) allFragments.push({ ...o.memoryFragment, itemLabel: o.label, roomTitle: currentRoom.title || 'Phòng chính' });
    });
  }
  if (currentRoom?.connectedRooms) {
    currentRoom.connectedRooms.forEach(cr => {
      if (cr.objects) {
        cr.objects.forEach(o => {
          if (o.memoryFragment) allFragments.push({ ...o.memoryFragment, itemLabel: o.label, roomTitle: cr.title });
        });
      }
    });
  }
  const totalFragmentsCount = allFragments.length;
  const discoveredCount = Object.keys(discoveredFragments).length;

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
              <Text style={styles.patientTitleText} numberOfLines={1}>{displayRoom?.title || roomTitle}</Text>
            </View>

            <View style={styles.patientControls}>
              {povMode === 'focused' ? (
                <TouchableOpacity
                  style={styles.patientOverviewBtn}
                  onPress={handleResetOverview}
                  activeOpacity={0.8}
                >
                  <Text style={styles.patientOverviewBtnText}>🏠 Toàn cảnh phòng</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.patientPointExploreBadge}>
                  <Text style={styles.patientPointExploreBadgeText}>🔒 3D Point-and-Explore</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.patientGuideBtn}
                onPress={() => setPatientGuideModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.patientGuideBtnText}>💡 Hướng dẫn</Text>
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

          {/* Lời Chỉ Dẫn Khám Phá Êm Dịu (Mục 5.1 & 5.2) */}
          <View style={styles.patientGentleGuidanceBanner}>
            <Text style={styles.patientGentleGuidanceText}>
              🌸 Chạm vào các đốm sáng ✨ hoặc chọn góc phòng bên dưới để nhớ lại kỷ niệm xưa
            </Text>
          </View>

          {/* Thanh Chuyển Gian Phòng Nối Tiếp (Connected Multi-Room Switcher) */}
          {connectedRoomsList.length > 1 && (
            <View style={styles.patientRoomsSwitcherBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
                {connectedRoomsList.map(r => {
                  const isActive = (activeRoomId === r.id || (r.id === 'primary' && (!activeRoomId || activeRoomId === 'primary')));
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.patientRoomSwitchPill, isActive && styles.patientRoomSwitchPillActive]}
                      onPress={() => {
                        setActiveRoomId(r.id);
                        setStatus(`Đã chuyển sang ${r.title}`);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.patientRoomSwitchText, isActive && styles.patientRoomSwitchTextActive]}>
                        {r.roomType === 'kitchen' ? '🍳' : r.roomType === 'garden' ? '🌿' : r.roomType === 'library' ? '📚' : '🏡'} {r.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Thanh Tiến Trình Ký Ức Bản Thân (Sense of Self Quest Badge) */}
          <TouchableOpacity
            style={styles.senseOfSelfBadge}
            onPress={() => setSenseOfSelfModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.senseOfSelfBadgeText}>
              🌟 Ký ức bản thân: {discoveredCount}/{totalFragmentsCount} Mảnh Ghép {discoveredCount === totalFragmentsCount && totalFragmentsCount > 0 ? '✓ Đầy đủ!' : '• Chạm mở sổ tay'}
            </Text>
          </TouchableOpacity>

          {/* Gợi nhắc trực tiếp từ Người Chăm Sóc */}
          {activeLiveNotification && (
            <View style={styles.patientReminderCard}>
              <View style={styles.patientReminderHeader}>
                <Text style={styles.patientReminderIcon}>{activeLiveNotification.icon || '🔔'}</Text>
                <View style={{ flex: 1, marginHorizontal: 8 }}>
                  <Text style={styles.patientReminderTitle}>{activeLiveNotification.title || 'Lời nhắc nhở'}</Text>
                  <Text style={styles.patientReminderText}>{activeLiveNotification.text}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.patientReminderDismissBtn}
                onPress={handleAcknowledgeNotification}
                activeOpacity={0.8}
              >
                <Text style={styles.patientReminderDismissText}>✓ Dạ, tôi nhớ rồi</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Khung hiển thị 3D tràn viền */}
          <View style={styles.patientViewerWrap}>
            {render3DViewer()}
          </View>

          {/* Bảng Điều Khiển Điểm Chạm & Góc Nhìn Định Sẵn (3D Point-and-Explore) */}
          <View style={[styles.seniorWaypointsContainer, isLandscape && { paddingBottom: 6 }]}>
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.seniorWaypointsTitle}>✨ Điểm Chạm Ký Ức & Góc Nhìn Định Sẵn:</Text>
                {povMode === 'focused' && (
                  <TouchableOpacity
                    style={styles.seniorOverviewSmallBtn}
                    onPress={handleResetOverview}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.seniorOverviewSmallBtnText}>🏠 Về toàn cảnh</Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 4, gap: 10 }}
              >
                <TouchableOpacity
                  style={[
                    styles.seniorWaypointPill,
                    povMode === 'overview' && !activeMemoryModal && styles.seniorWaypointPillActive
                  ]}
                  onPress={handleResetOverview}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.seniorWaypointPillText,
                    povMode === 'overview' && !activeMemoryModal && styles.seniorWaypointPillTextActive
                  ]}>
                    🏠 Toàn cảnh phòng
                  </Text>
                </TouchableOpacity>
                {interactiveObjects.map((obj, idx) => (
                  <TouchableOpacity
                    key={'wp-' + idx}
                    style={[
                      styles.seniorWaypointPill,
                      activeMemoryModal?.label === obj.label && styles.seniorWaypointPillActive
                    ]}
                    onPress={() => {
                      setGlideLabel(obj.label);
                      setTimeout(() => setGlideLabel(''), 600);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.seniorWaypointPillText,
                      activeMemoryModal?.label === obj.label && styles.seniorWaypointPillTextActive
                    ]}>
                      {getObjectIcon(obj.kind)} {obj.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Thẻ Ký Ức & Tương Tác Cụ Thể (Interactive Tactile Modals) */}
          {activeMemoryModal && (
            <View style={styles.patientMemoryCardBackdrop}>
              <View style={[styles.patientMemoryCard, isLandscape && styles.patientMemoryCardLandscape]}>
                <View style={styles.patientCardHeader}>
                  <View style={styles.patientCardIconTitle}>
                    <Text style={styles.patientCardAvatar}>
                      {activeMemoryModal.item?.kind === 'wardrobe' ? '🚪'
                        : activeMemoryModal.item?.kind === 'desk' ? '📂'
                        : activeMemoryModal.item?.kind === 'book' ? '📖'
                        : activeMemoryModal.item?.kind === 'bed' ? '🛏️'
                        : activeMemoryModal.item?.kind === 'window' ? '🪟'
                        : activeMemoryModal.item?.kind === 'door' ? '🚪'
                        : activeMemoryModal.isInteractable ? '👵' : '🔒'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientCardTitle}>{activeMemoryModal.label}</Text>
                      <Text style={styles.patientCardSubtitle}>
                        {activeMemoryModal.item?.kind === 'wardrobe' ? 'Tủ quần áo kỷ niệm'
                          : activeMemoryModal.item?.kind === 'desk' ? 'Bàn viết & ngăn kéo kỷ vật'
                          : activeMemoryModal.item?.kind === 'book' ? 'Nhật ký tâm tư'
                          : activeMemoryModal.item?.kind === 'bed' ? 'Giường ấm nghỉ ngơi'
                          : activeMemoryModal.item?.kind === 'window' ? 'Cửa sổ đón nắng vườn'
                          : activeMemoryModal.item?.kind === 'door' ? 'Cửa sang phòng liền kề'
                          : activeMemoryModal.isInteractable ? 'Kỷ niệm thân thương' : 'Khu vực hạn chế'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.patientCardCloseBtn}
                    onPress={() => {
                      setSpeakingText(null);
                      setFocusLabel('');
                      setActiveMemoryModal(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.patientCardCloseText}>✕ Trở lại phòng</Text>
                  </TouchableOpacity>
                </View>

                {/* Huy hiệu Tính Xác Thực & Nguồn Ký Ức (Mục 3.3) */}
                {(activeMemoryModal.item?.source?.type === 'user_provided' || activeMemoryModal.item?.isCaregiverVerified !== false) ? (
                  <View style={styles.verifiedMemoryBadge}>
                    <Text style={styles.verifiedMemoryBadgeIcon}>🌟</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.verifiedMemoryBadgeTitle}>Ký ức do gia đình lưu giữ</Text>
                      <Text style={styles.verifiedMemoryBadgeDesc}>
                        {activeMemoryModal.item?.verifiedBy
                          ? `Ghi nhận bởi ${activeMemoryModal.item.verifiedBy}`
                          : 'Kỷ vật đời thực đã được người chăm sóc xác nhận'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.inferredMemoryBadge}>
                    <Text style={styles.inferredMemoryBadgeIcon}>💡</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inferredMemoryBadgeTitle}>Khu vực không gian ước đoán</Text>
                      <Text style={styles.inferredMemoryBadgeDesc}>
                        Gợi ý tái hiện của AI, chưa có xác nhận từ người thân
                      </Text>
                    </View>
                  </View>
                )}

                {/* Hình ảnh chính (Mục 3.2: Kích thước đủ lớn, dễ quan sát) */}
                {Boolean(activeMemoryModal.item?.photoUri || activeMemoryModal.item?.memoryFragment?.image || activeMemoryModal.item?.memoryFragment?.photoUrl) && (
                  <View style={styles.memoryMainImageContainer}>
                    <Image
                      source={{ uri: activeMemoryModal.item.photoUri || activeMemoryModal.item.memoryFragment.image || activeMemoryModal.item.memoryFragment.photoUrl }}
                      style={styles.memoryMainImage}
                      resizeMode="cover"
                    />
                  </View>
                )}

                <ScrollView style={[styles.patientCardBody, isLandscape && { maxHeight: 160 }]} contentContainerStyle={{ paddingBottom: 10 }}>
                  {/* 1. Tủ Quần Áo */}
                  {activeMemoryModal.item?.interaction?.type === 'wardrobe_open' && (
                    <View>
                      <Text style={styles.patientCardText}>
                        {activeMemoryModal.item.interaction.wardrobeFeeling}
                      </Text>
                      {Array.isArray(activeMemoryModal.item.interaction.clothes) && (
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.modalSubHeader}>👗 Quần áo thân quen:</Text>
                          {activeMemoryModal.item.interaction.clothes.map((c, i) => (
                            <View key={i} style={styles.itemDetailRow}>
                              <Text style={styles.itemDetailIcon}>👔</Text>
                              <Text style={styles.itemDetailText}>{c}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {Array.isArray(activeMemoryModal.item.interaction.mementos) && (
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.modalSubHeader}>🎒 Cặp sách & kỷ vật bên trong:</Text>
                          {activeMemoryModal.item.interaction.mementos.map((m, i) => (
                            <View key={i} style={styles.itemDetailRow}>
                              <Text style={styles.itemDetailIcon}>🎒</Text>
                              <Text style={styles.itemDetailText}>{m}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {/* 2. Ngăn Kéo Hộc Bàn */}
                  {activeMemoryModal.item?.interaction?.type === 'desk_drawer' && (
                    <View>
                      <Text style={styles.patientCardText}>
                        {activeMemoryModal.item.interaction.drawerFeeling}
                      </Text>
                      {Array.isArray(activeMemoryModal.item.interaction.insideItems) && (
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.modalSubHeader}>🗝️ Kỷ vật trong hộc bàn:</Text>
                          {activeMemoryModal.item.interaction.insideItems.map((it, i) => (
                            <View key={i} style={styles.itemDetailRow}>
                              <Text style={styles.itemDetailIcon}>✨</Text>
                              <Text style={styles.itemDetailText}>{it}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {/* 3. Cuốn Sách / Nhật Ký */}
                  {activeMemoryModal.item?.interaction?.type === 'book_read' && (
                    <View style={styles.bookReaderContainer}>
                      {(() => {
                        const pages = activeMemoryModal.item.interaction.pages || [activeMemoryModal.description];
                        const pageText = pages[bookPageIndex] || pages[0];
                        return (
                          <>
                            <View style={styles.bookPageCard}>
                              <Text style={styles.bookPageIndicator}>📖 Trang {bookPageIndex + 1} / {pages.length}</Text>
                              <Text style={styles.bookPageText}>{pageText}</Text>
                            </View>
                            <View style={styles.bookControlsRow}>
                              <TouchableOpacity
                                style={[styles.bookPageBtn, bookPageIndex <= 0 && { opacity: 0.4 }]}
                                disabled={bookPageIndex <= 0}
                                onPress={() => setBookPageIndex(p => Math.max(0, p - 1))}
                              >
                                <Text style={styles.bookPageBtnText}>⬅️ Trang trước</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.bookPageBtn, bookPageIndex >= pages.length - 1 && { opacity: 0.4 }]}
                                disabled={bookPageIndex >= pages.length - 1}
                                onPress={() => setBookPageIndex(p => Math.min(pages.length - 1, p + 1))}
                              >
                                <Text style={styles.bookPageBtnText}>Trang sau ➡️</Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        );
                      })()}
                    </View>
                  )}

                  {/* 4. Giường Nghỉ Ngơi */}
                  {activeMemoryModal.item?.interaction?.type === 'bed_rest' && (
                    <View style={styles.bedRelaxBox}>
                      <Text style={styles.patientCardText}>
                        {activeMemoryModal.item.interaction.bedFeeling}
                      </Text>
                      <View style={styles.bedBreathCircle}>
                        <Text style={styles.bedBreathDot}>🌸 Hít sâu... thở đều... Bạn luôn được che chở và bình an 🌸</Text>
                      </View>
                    </View>
                  )}

                  {/* 5. Cửa Sổ */}
                  {activeMemoryModal.item?.interaction?.type === 'window_breeze' && (
                    <View>
                      <Text style={styles.patientCardText}>
                        {activeMemoryModal.item.interaction.breezeFeeling}
                      </Text>
                      <Text style={[styles.patientCardText, { marginTop: 6, fontStyle: 'italic', color: '#4B6B58' }]}>
                        🌿 Tầm nhìn rộng mở ra thiên nhiên giúp tâm trí nhẹ nhõm, xóa tan mọi cảm giác ngột ngạt.
                      </Text>
                    </View>
                  )}

                  {/* 6. Cửa Sang Phòng Khác */}
                  {(activeMemoryModal.item?.kind === 'door' || activeMemoryModal.item?.targetRoomId || activeMemoryModal.item?.interaction?.type === 'door_transition') && (
                    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                      <Text style={styles.patientCardText}>
                        {activeMemoryModal.description || 'Cửa nối sang gian phòng tiếp theo của ngôi nhà.'}
                      </Text>
                      <TouchableOpacity
                        style={styles.doorTransitionBtn}
                        onPress={() => {
                          const tId = activeMemoryModal.item?.targetRoomId || activeMemoryModal.item?.interaction?.targetRoomId;
                          handleDoorTransition(tId, activeMemoryModal.label);
                          setActiveMemoryModal(null);
                        }}
                      >
                        <Text style={styles.doorTransitionBtnText}>🚶 Bước Qua Cửa Ngay</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* 7. Default description */}
                  {!activeMemoryModal.item?.interaction && activeMemoryModal.item?.kind !== 'door' && (
                    <Text style={styles.patientCardText}>
                      {activeMemoryModal.description}
                    </Text>
                  )}

                  {/* Mảnh Ký Ức Đã Mở Khóa (Memory Fragment Box) */}
                  {activeMemoryModal.item?.memoryFragment && (
                    <View style={styles.unlockedFragmentBox}>
                      <Text style={styles.unlockedFragmentTitle}>
                        🌟 {activeMemoryModal.item.memoryFragment.title}
                      </Text>
                      <Text style={styles.unlockedFragmentStory}>
                        {activeMemoryModal.item.memoryFragment.story}
                      </Text>
                      <Text style={styles.unlockedFragmentSelf}>
                        💡 Về bản thân bạn: {activeMemoryModal.item.memoryFragment.senseOfSelf}
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* Card Actions (Mục 3.2 & 4.3: Phát, tạm dừng, phát lại, đóng rõ ràng, vùng chạm >= 48px) */}
                <View style={styles.patientCardActions}>
                  <TouchableOpacity
                    style={[
                      styles.patientSpeakBtn,
                      speakingText && styles.patientSpeakBtnActive
                    ]}
                    onPress={() => {
                      const textToRead = activeMemoryModal.item?.interaction?.type === 'book_read'
                        ? (activeMemoryModal.item.interaction.pages?.[bookPageIndex] || activeMemoryModal.description)
                        : (activeMemoryModal.item?.memoryFragment?.story
                            ? `${activeMemoryModal.label}. ${activeMemoryModal.item.memoryFragment.story}. ${activeMemoryModal.item.memoryFragment.senseOfSelf || ''}`
                            : activeMemoryModal.description);
                      if (speakingText) {
                        setSpeakingText(null);
                      } else {
                        setSpeakingText(textToRead);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.patientSpeakBtnText}>
                      {speakingText ? '⏸️ Tạm dừng' : '🔊 Nghe kể lại'}
                    </Text>
                  </TouchableOpacity>

                  {speakingText && (
                    <TouchableOpacity
                      style={styles.patientReplayBtn}
                      onPress={() => {
                        const textToRead = activeMemoryModal.item?.interaction?.type === 'book_read'
                          ? (activeMemoryModal.item.interaction.pages?.[bookPageIndex] || activeMemoryModal.description)
                          : (activeMemoryModal.item?.memoryFragment?.story
                              ? `${activeMemoryModal.label}. ${activeMemoryModal.item.memoryFragment.story}. ${activeMemoryModal.item.memoryFragment.senseOfSelf || ''}`
                              : activeMemoryModal.description);
                        setSpeakingText(null);
                        setTimeout(() => setSpeakingText(textToRead), 60);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.patientReplayBtnText}>🔁 Nghe lại</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.patientBackRoomBtn}
                    onPress={() => {
                      setSpeakingText(null);
                      setFocusLabel('');
                      setActiveMemoryModal(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.patientBackRoomBtnText}>✕ Trở lại phòng</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Modal Hướng Dẫn Khám Phá Dành Cho Người Cao Tuổi (Mục 5.2) */}
          <Modal
            onRequestClose={() => setPatientGuideModalVisible(false)}
            visible={patientGuideModalVisible}
            animationType="fade"
            transparent
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, styles.patientGuideCard]}>
                <Text style={styles.patientGuideHeader}>🌸 KHÔNG GIAN KÝ ỨC CỦA BÁC</Text>
                <Text style={styles.patientGuideSubheader}>
                  Nơi Bác tự do dạo ngắm và tìm lại những mẩu chuyện thân thương nhất
                </Text>

                <View style={styles.patientGuideItemsList}>
                  <View style={styles.patientGuideRow}>
                    <Text style={styles.patientGuideRowIcon}>✨</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientGuideRowTitle}>Chạm vào đồ vật</Text>
                      <Text style={styles.patientGuideRowDesc}>
                        Các đồ vật có đốm sáng lấp lánh lưu giữ hình ảnh và kỷ niệm gia đình thân thuộc.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.patientGuideRow}>
                    <Text style={styles.patientGuideRowIcon}>🔊</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientGuideRowTitle}>Nghe giọng kể ấm áp</Text>
                      <Text style={styles.patientGuideRowDesc}>
                        Nhấn nút 'Nghe kể lại' để lắng nghe lời kể thong thả, có thể tạm dừng hoặc nghe lại bất cứ lúc nào.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.patientGuideRow}>
                    <Text style={styles.patientGuideRowIcon}>🏠</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientGuideRowTitle}>Góc nhìn định sẵn, không sợ lạc</Text>
                      <Text style={styles.patientGuideRowDesc}>
                        Bác luôn có thể nhấn 'Toàn cảnh phòng' hoặc chọn các góc phòng bên dưới để quan sát căn phòng một cách vững vàng, không bị chóng mặt.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.patientGuideRow}>
                    <Text style={styles.patientGuideRowIcon}>🌿</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientGuideRowTitle}>Tự chủ và thư thái</Text>
                      <Text style={styles.patientGuideRowDesc}>
                        Không tính giờ, không tính điểm, không có câu hỏi kiểm tra. Bác cứ thong thả dạo ngắm theo nhịp sống của riêng mình.
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.patientGuideCloseBtn}
                  onPress={() => setPatientGuideModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.patientGuideCloseBtnText}>🌸 Tôi đã hiểu, tiếp tục dạo phòng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Modal Sổ Tay Ký Ức Bản Thân (Sense of Self Modal) */}
          <Modal
            onRequestClose={() => setSenseOfSelfModalVisible(false)}
            visible={senseOfSelfModalVisible}
            animationType="slide"
            transparent
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, styles.senseOfSelfModalCard]}>
                <Text style={styles.senseOfSelfTitle}>🌟 SỔ TAY KÝ ỨC BẢN THÂN</Text>
                <Text style={styles.senseOfSelfSubtitle}>
                  Hành trình kết nối các mảnh ghép để tìm lại sự trọn vẹn và niềm tự hào về chính mình
                </Text>

                <View style={styles.senseOfSelfProgressBox}>
                  <Text style={styles.senseOfSelfProgressText}>
                    Tiến trình: {discoveredCount} / {totalFragmentsCount} Mảnh ghép ký ức đã mở khóa
                  </Text>
                </View>

                {/* Celebration Banner when completed */}
                {discoveredCount === totalFragmentsCount && totalFragmentsCount > 0 && (
                  <View style={styles.senseCelebrationBox}>
                    <Text style={styles.senseCelebrationTitle}>🎉 BỨC TRANH KÝ ỨC TOÀN VẸN: TÌM LẠI CHÍNH MÌNH!</Text>
                    <Text style={styles.senseCelebrationText}>
                      Bạn là một người có tâm hồn nhân hậu, sâu sắc và tràn đầy tình yêu thương với gia đình. Mọi kỷ niệm đẹp đẽ, những cống hiến và tình cảm của mọi người đều đang ở đây bên bạn.
                    </Text>
                  </View>
                )}

                <ScrollView style={{ maxHeight: 360, marginVertical: 10 }}>
                  <Text style={styles.modalSubHeader}>✨ Những mảnh ký ức bạn đã nhớ lại:</Text>
                  {Object.values(discoveredFragments).map((frag, idx) => (
                    <View key={'disc-' + idx} style={styles.fragmentCard}>
                      <Text style={styles.fragmentCardTitle}>🌟 {frag.title}</Text>
                      <Text style={styles.fragmentCardStory}>{frag.story}</Text>
                      <Text style={styles.fragmentCardInsight}>💡 {frag.senseOfSelf}</Text>
                    </View>
                  ))}

                  {/* Gợi ý các mảnh chưa tìm thấy */}
                  {allFragments.filter(f => !discoveredFragments[f.id]).length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.modalSubHeader}>🔍 Gợi ý nơi tìm thêm ký ức:</Text>
                      {allFragments.filter(f => !discoveredFragments[f.id]).map((frag, idx) => (
                        <View key={'clue-' + idx} style={styles.questClueCard}>
                          <Text style={styles.questClueText}>👉 {frag.questPrompt || `Tìm đến đồ vật ${frag.itemLabel}`}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setSenseOfSelfModalVisible(false)}
                >
                  <Text style={styles.closeBtnText}>Đóng Sổ Tay</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

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

                <TouchableOpacity
                  style={[styles.actionPillBtn, styles.liveSyncPillBtn]}
                  onPress={() => setCaregiverModalVisible(true)}
                >
                  <Text style={[styles.actionPillText, styles.liveSyncPillText]}>📡 Live</Text>
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
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.roomTitleText} numberOfLines={1}>{roomTitle}</Text>
                    {povMode === 'focused' ? (
                      <Text style={styles.povSubtitleText} numberOfLines={1}>👁️ {focusedLabel}</Text>
                    ) : null}
                  </View>
                  <View style={styles.viewerControls}>
                    <TouchableOpacity
                      style={styles.expandBtn}
                      onPress={() => setIsExpanded(prev => !prev)}
                      accessibilityLabel="Phóng to hoặc thu nhỏ căn phòng"
                    >
                      <Text style={styles.expandBtnText}>{isExpanded ? '🗗 Thu' : '⛶ Mở'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.resetBtn, !currentRoom && styles.disabledControlBtn]}
                      disabled={!currentRoom}
                      onPress={() => setLockCamera(v => !v)}
                    >
                      <Text style={styles.resetBtnText}>{lockCamera ? '🔒 Khóa góc' : '🔄 Tự do'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.resetBtn} onPress={resetRoom}>
                      <Text style={styles.resetBtnText}>↺ Mới</Text>
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

              <TouchableOpacity
                style={[styles.actionPillBtn, styles.liveSyncPillBtn]}
                onPress={() => setCaregiverModalVisible(true)}
              >
                <Text style={[styles.actionPillText, styles.liveSyncPillText]}>📡 Đồng bộ Live ({syncReminders.length})</Text>
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

            {/* Thanh chuyển gian phòng kết nối cho Người Soạn Phòng */}
            {currentRoom?.connectedRooms?.length > 0 && (
              <View style={[styles.creatorActionBar, { marginTop: 4 }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.actionPillBtn, (!activeRoomId || activeRoomId === 'primary') && styles.patientRoomSwitchPillActive]}
                    onPress={() => setActiveRoomId('primary')}
                  >
                    <Text style={[styles.actionPillText, (!activeRoomId || activeRoomId === 'primary') && styles.patientRoomSwitchTextActive]}>
                      🏡 {currentRoom.title || 'Phòng chính'}
                    </Text>
                  </TouchableOpacity>
                  {currentRoom.connectedRooms.map(cr => (
                    <TouchableOpacity
                      key={cr.id}
                      style={[styles.actionPillBtn, activeRoomId === cr.id && styles.patientRoomSwitchPillActive]}
                      onPress={() => setActiveRoomId(cr.id)}
                    >
                      <Text style={[styles.actionPillText, activeRoomId === cr.id && styles.patientRoomSwitchTextActive]}>
                        {cr.roomType === 'kitchen' ? '🍳' : cr.roomType === 'garden' ? '🌿' : cr.roomType === 'library' ? '📚' : '🚪'} {cr.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Huy hiệu AI Tự Kiểm Định & Tối Ưu Bố Cục */}
            {currentRoom?.aiVerification && (
              <TouchableOpacity
                style={styles.aiVerificationBadge}
                onPress={() => setAiAuditModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.aiVerificationText}>
                  🛡️ AI Đã Kiểm Tra & Tối Ưu Logic Không Gian ({currentRoom.aiVerification.checks?.length || 7} Tiêu Chuẩn Đạt)
                </Text>
              </TouchableOpacity>
            )}

            {/* === 3D Room Viewer (Tập trung không gian 3D trực quan) === */}
            {isKeyboardVisible ? (
              <TouchableOpacity
                style={styles.keyboardCollapsedViewerBar}
                onPress={() => Keyboard.dismiss()}
                activeOpacity={0.8}
              >
                <Text style={styles.keyboardCollapsedViewerText}>
                  📐 3D tạm thu gọn khi soạn thảo • <Text style={{ fontWeight: '700', textDecorationLine: 'underline' }}>Chạm để thu bàn phím ⌄</Text>
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.viewerContainer, isExpanded ? styles.viewerContainerExpanded : styles.viewerContainerNormal]}>
                <View style={styles.viewerHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.roomTitleText} numberOfLines={1}>{roomTitle}</Text>
                    {povMode === 'focused' ? (
                      <Text style={styles.povSubtitleText} numberOfLines={1}>👁️ Đang đứng cạnh: {focusedLabel} (Vuốt để nhìn quanh)</Text>
                    ) : currentRoom ? (
                      <Text style={styles.povSubtitleText} numberOfLines={1}>🧠 Đã lưu vị trí • Tiếp tục gõ để tinh chỉnh</Text>
                    ) : null}
                  </View>
                  <View style={styles.viewerControls}>
                    <TouchableOpacity
                      style={styles.expandBtn}
                      onPress={() => setIsExpanded(prev => !prev)}
                      accessibilityLabel="Phóng to hoặc thu nhỏ căn phòng"
                    >
                      <Text style={styles.expandBtnText}>{isExpanded ? '🗗 Thu' : '⛶ Mở'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.resetBtn, !currentRoom && styles.disabledControlBtn]}
                      disabled={!currentRoom}
                      onPress={() => setLockCamera(v => !v)}
                    >
                      <Text style={styles.resetBtnText}>{lockCamera ? '🔒 Khóa góc' : '🔄 Tự do'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.resetBtn} onPress={resetRoom}>
                      <Text style={styles.resetBtnText}>↺ Mới</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {render3DViewer()}
              </View>
            )}

            {/* Chat & Controls Area */}
            <View style={[styles.chatSection, isExpanded && styles.chatSectionCollapsed, isKeyboardVisible && styles.chatSectionTyping]}>
              {!isKeyboardVisible && (
                <View style={styles.statusBar}>
                  <Text style={styles.statusText}>{status}</Text>
                </View>
              )}

              {renderMemoryBar()}
              {!isKeyboardVisible && renderMessagesList()}
              {!isKeyboardVisible && renderSuggestionsList()}
              {renderAttachmentBar()}
              {renderVoiceBanner()}
              {renderInputRow()}

              {!isKeyboardVisible && (
                <Text style={styles.hintFooter}>
                  {currentRoom
                    ? '🌟 Phòng đã sẵn sàng! Bấm "Bắt đầu cho người bệnh" ở trên để vào chế độ trị liệu.'
                    : '💡 Gõ mô tả hoặc bấm "+ Ảnh" để gửi ảnh kỷ niệm, AI sẽ tự động dựng phòng 3D.'}
                </Text>
              )}
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

      {/* Modal Điều Khiển Live & Gợi Nhắc Của Người Chăm Sóc */}
      <Modal
        onRequestClose={() => setCaregiverModalVisible(false)}
        visible={caregiverModalVisible}
        animationType="slide"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '88%' }]}>
            <Text style={styles.modalTitle}>📡 Đồng Bộ Live & Gợi Nhắc</Text>
            <Text style={styles.modalHelp}>
              Điều khiển từ xa: Xuất bản căn phòng 3D và gửi thông báo nhắc nhở đến thiết bị Người Bệnh.
            </Text>

            {syncStatusMsg ? (
              <View style={styles.syncStatusBanner}>
                <Text style={styles.syncStatusBannerText}>{syncStatusMsg}</Text>
              </View>
            ) : null}

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {/* 1. Xuất bản phòng 3D */}
              <View style={styles.caregiverSectionBox}>
                <Text style={styles.caregiverSectionTitle}>🏠 1. Xuất bản không gian 3D hiện tại</Text>
                <Text style={styles.caregiverSectionDesc}>
                  Phòng đang mở: <Text style={{ fontWeight: '700', color: '#165b40' }}>{roomTitle || currentRoom?.title || '(Chưa có phòng)'}</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.publishRoomBtn, !currentRoom && styles.disabledControlBtn]}
                  disabled={!currentRoom}
                  onPress={handlePublishToPatient}
                >
                  <Text style={styles.publishRoomBtnText}>🚀 Đồng bộ phòng này sang máy Người Bệnh</Text>
                </TouchableOpacity>
              </View>

              {/* 2. Gợi nhắc nhanh theo thời gian biểu */}
              <View style={styles.caregiverSectionBox}>
                <Text style={styles.caregiverSectionTitle}>⏰ 2. Gợi nhắc theo lịch trình hàng ngày</Text>
                <Text style={styles.caregiverSectionDesc}>Bấm "Gửi ngay" để hiện lời nhắc lớn trên máy người bệnh:</Text>
                {syncReminders.map(rem => (
                  <View key={rem.id} style={styles.caregiverReminderItem}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.caregiverReminderLabel}>{rem.icon} {rem.time} • {rem.label}</Text>
                      <Text style={styles.caregiverReminderMsg} numberOfLines={2}>"{rem.message}"</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.caregiverSendPingBtn}
                      onPress={() => handleSendReminderPing(rem)}
                    >
                      <Text style={styles.caregiverSendPingText}>Gửi ngay</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* 3. Gửi thông báo / tin nhắn tức thì */}
              <View style={styles.caregiverSectionBox}>
                <Text style={styles.caregiverSectionTitle}>⚡ 3. Gửi thông báo tức thì tùy chỉnh</Text>
                <View style={styles.caregiverQuickPingRow}>
                  <TouchableOpacity
                    style={styles.caregiverQuickPingChip}
                    onPress={() => handleSendReminderPing({ label: 'Uống thuốc', icon: '💊', message: 'Bác ơi, đến giờ uống thuốc rồi ạ!', type: 'medicine' })}
                  >
                    <Text style={styles.caregiverQuickPingText}>💊 Báo uống thuốc</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.caregiverQuickPingChip}
                    onPress={() => handleSendReminderPing({ label: 'Uống nước', icon: '💧', message: 'Bác uống một cốc nước ấm cho khỏe nhé.', type: 'water' })}
                  >
                    <Text style={styles.caregiverQuickPingText}>💧 Nhắc uống nước</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.caregiverQuickPingChip}
                    onPress={() => handleSendReminderPing({ label: 'Ăn cơm', icon: '🍚', message: 'Đến giờ ăn trưa/tối rồi bác ơi!', type: 'meal' })}
                  >
                    <Text style={styles.caregiverQuickPingText}>🍚 Đến giờ ăn</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.caregiverQuickPingChip}
                    onPress={() => handleSendReminderPing({ label: 'Hỏi thăm', icon: '❤️', message: 'Bác có thấy căn phòng này thân thuộc không?', type: 'custom' })}
                  >
                    <Text style={styles.caregiverQuickPingText}>❤️ Lời hỏi thăm</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.caregiverCustomMsgRow}>
                  <TextInput
                    style={styles.caregiverMsgInput}
                    placeholder="Nhập lời nhắc hoặc tin nhắn tức thì..."
                    value={customMsgInput}
                    onChangeText={setCustomMsgInput}
                  />
                  <TouchableOpacity
                    style={styles.caregiverMsgSendBtn}
                    onPress={handleSendCustomMessage}
                  >
                    <Text style={styles.caregiverMsgSendText}>Gửi</Text>
                  </TouchableOpacity>
                </View>
                {/* 4. Mảnh ghép ký ức & Quest định hình bản thân */}
                {allFragments.length > 0 && (
                  <View style={styles.caregiverSectionBox}>
                    <Text style={styles.caregiverSectionTitle}>🌟 4. Ký ức bản thân (Quest cho người bệnh)</Text>
                    <Text style={styles.caregiverSectionDesc}>
                      Các kỷ vật chứa đựng câu chuyện cuộc đời giúp người bệnh tìm lại chính mình ({allFragments.length} mảnh ghép):
                    </Text>
                    {allFragments.map((frag, i) => (
                      <View key={i} style={[styles.caregiverReminderItem, { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 8 }]}>
                        <Text style={{ fontWeight: '700', color: '#85581A' }}>✨ {frag.itemLabel} - {frag.title}</Text>
                        <Text style={{ fontSize: 13, color: '#444', marginTop: 2 }}>{frag.story}</Text>
                        <Text style={{ fontSize: 12, color: '#137333', fontStyle: 'italic', marginTop: 2 }}>💡 {frag.senseOfSelf}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalBtn, styles.closeBtn, { marginTop: 14 }]}
              onPress={() => {
                setSyncStatusMsg('');
                setCaregiverModalVisible(false);
              }}
            >
              <Text style={styles.closeBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Báo Cáo Kiểm Định AI */}
      <Modal
        onRequestClose={() => setAiAuditModalVisible(false)}
        visible={aiAuditModalVisible}
        animationType="slide"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.aiAuditModalContent]}>
            <Text style={styles.modalTitle}>🛡️ Kiểm Định Logic Không Gian AI</Text>
            <Text style={styles.modalHelp}>
              Hệ thống AI tự động quan sát và phản tư (Self-Reflection) để đảm bảo thế giới tạo lập logic, chuẩn xác và êm dịu cho người cao tuổi.
            </Text>
            <ScrollView style={{ maxHeight: 380, marginVertical: 10 }}>
              {currentRoom?.aiVerification?.checks?.map((chk, i) => (
                <View key={i} style={styles.aiAuditItem}>
                  <View style={styles.aiAuditItemHeader}>
                    <Text style={styles.aiAuditItemName}>
                      {chk.name === 'bed_orientation' ? '🛏️ Đầu Giường Áp Tường'
                        : chk.name === 'wardrobe_clearance' ? '🚪 Khoảng Trống Mở Cánh Tủ'
                        : chk.name === 'tabletop_accessories' ? '📐 Gá Vật Dụng Mặt Bàn/Tủ'
                        : chk.name === 'geriatric_color_and_lighting' ? '👁️ Thị Giác Người Cao Tuổi'
                        : chk.name === 'spacious_environment' ? '🪟 Không Gian Mở Thoáng Đãng'
                        : chk.name === 'connected_spaces' ? '🏡 Không Gian Đa Phòng Nối Tiếp'
                        : chk.name === 'memory_fragment_quests' ? '🌟 Mảnh Ghép Ký Ức & Tương Tác'
                        : chk.name}
                    </Text>
                    <Text style={styles.aiAuditItemStatus}>✓ Đạt</Text>
                  </View>
                  <Text style={styles.aiAuditItemDetails}>{chk.details}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setAiAuditModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Đóng Báo Cáo</Text>
            </TouchableOpacity>
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

  // ===== Multi-Room Navigation & Geriatric Ergonomics =====
  patientRoomsSwitcherBar: {
    backgroundColor: '#1a2420',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#263830',
  },
  patientRoomSwitchPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#263830',
    borderWidth: 1,
    borderColor: '#395347',
  },
  patientRoomSwitchPillActive: {
    backgroundColor: '#34a853',
    borderColor: '#46c268',
  },
  patientRoomSwitchText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a3c2b4',
  },
  patientRoomSwitchTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  senseOfSelfBadge: {
    backgroundColor: '#2d2417',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#453521',
    alignItems: 'center',
  },
  senseOfSelfBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#f9ab00',
    letterSpacing: 0.3,
  },
  seniorWaypointsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(16, 26, 21, 0.94)',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#3a5447',
  },
  seniorWaypointsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#a3f0c4',
    marginBottom: 4,
  },
  seniorOverviewSmallBtn: {
    backgroundColor: '#254436',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3f7057',
  },
  seniorOverviewSmallBtnText: {
    color: '#a3f0c4',
    fontSize: 13,
    fontWeight: '700',
  },
  seniorWaypointPill: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: '#21382e',
    borderWidth: 1.2,
    borderColor: '#395c4c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seniorWaypointPillActive: {
    backgroundColor: '#2e7d4d',
    borderColor: '#4ade80',
  },
  seniorWaypointPillText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e4efe9',
  },
  seniorWaypointPillTextActive: {
    color: '#ffffff',
  },
  seniorStrollRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  seniorStrollBtn: {
    flex: 1,
    backgroundColor: '#263b32',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3d5c4e',
  },
  seniorStrollBtnPrimary: {
    backgroundColor: '#2e7d32',
    borderColor: '#43a047',
    flex: 1.3,
  },
  seniorStrollBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#c2e0d1',
  },
  seniorStrollBtnTextPrimary: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalSubHeader: {
    fontSize: 17,
    fontWeight: '700',
    color: '#e2ba86',
    marginBottom: 6,
  },
  itemDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbf8f1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginVertical: 3,
    borderWidth: 1,
    borderColor: '#eee5d8',
  },
  itemDetailIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  itemDetailText: {
    fontSize: 16,
    color: '#222222',
    lineHeight: 24,
    flex: 1,
  },
  unlockedFragmentBox: {
    marginTop: 12,
    backgroundColor: '#fffdf0',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#f9ab00',
  },
  unlockedFragmentTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#b06000',
    marginBottom: 4,
  },
  unlockedFragmentStory: {
    fontSize: 17,
    color: '#333333',
    lineHeight: 26,
  },
  unlockedFragmentSelf: {
    fontSize: 16,
    color: '#137333',
    fontWeight: '700',
    fontStyle: 'italic',
    marginTop: 6,
  },
  bookReaderContainer: {
    marginVertical: 4,
  },
  bookPageCard: {
    backgroundColor: '#fffef7',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e8dcbe',
    minHeight: 120,
  },
  bookPageIndicator: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8b5a2b',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  bookPageText: {
    fontSize: 18,
    color: '#2a2218',
    lineHeight: 28,
  },
  bookControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },
  bookPageBtn: {
    flex: 1,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#f5eee1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#d8c7ac',
  },
  bookPageBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5c4524',
  },
  bedRelaxBox: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  bedBreathCircle: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#e8f5e9',
    borderWidth: 1.2,
    borderColor: '#a5d6a7',
  },
  bedBreathDot: {
    fontSize: 15,
    color: '#2e7d32',
    fontWeight: '700',
    textAlign: 'center',
  },
  doorTransitionBtn: {
    marginTop: 12,
    backgroundColor: '#2e7d32',
    paddingHorizontal: 22,
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doorTransitionBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  senseOfSelfModalCard: {
    maxHeight: '85%',
    backgroundColor: '#fdfbf7',
    borderColor: '#d6c4a5',
  },
  senseOfSelfTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#8b5a2b',
    textAlign: 'center',
  },
  senseOfSelfSubtitle: {
    fontSize: 12.5,
    color: '#666666',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  senseOfSelfProgressBox: {
    backgroundColor: '#fff4db',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f9ab00',
    alignItems: 'center',
    marginBottom: 8,
  },
  senseOfSelfProgressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b06000',
  },
  senseCelebrationBox: {
    backgroundColor: '#e6f4ea',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#34a853',
    marginBottom: 10,
  },
  senseCelebrationTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#137333',
    textAlign: 'center',
    marginBottom: 4,
  },
  senseCelebrationText: {
    fontSize: 13,
    color: '#202124',
    lineHeight: 19,
    textAlign: 'center',
  },
  fragmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#e8dcbe',
  },
  fragmentCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#8b5a2b',
  },
  fragmentCardStory: {
    fontSize: 12.5,
    color: '#444444',
    marginTop: 2,
    lineHeight: 18,
  },
  fragmentCardInsight: {
    fontSize: 12,
    color: '#137333',
    fontWeight: '700',
    fontStyle: 'italic',
    marginTop: 4,
  },
  questClueCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
    marginVertical: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#f9ab00',
  },
  questClueText: {
    fontSize: 12.5,
    color: '#555555',
  },
  aiVerificationBadge: {
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 4,
    backgroundColor: '#e8f0fe',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#4285f4',
    alignItems: 'center',
  },
  aiVerificationText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1a73e8',
  },
  aiAuditModalContent: {
    maxHeight: '85%',
    backgroundColor: '#ffffff',
  },
  aiAuditItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 10,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  aiAuditItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiAuditItemName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#202124',
  },
  aiAuditItemStatus: {
    fontSize: 12,
    fontWeight: '800',
    color: '#137333',
    backgroundColor: '#e6f4ea',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiAuditItemDetails: {
    fontSize: 12.5,
    color: '#5f6368',
    lineHeight: 18,
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
    flex: 1.15,
  },
  viewerContainerExpanded: {
    flex: 3.5,
  },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#161e1b',
    borderBottomWidth: 1,
    borderBottomColor: '#25302c',
  },
  roomTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#95d1bd',
    letterSpacing: 0.5,
  },
  viewerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  expandBtn: {
    backgroundColor: '#273e35',
    borderColor: '#436154',
    borderWidth: 1,
    paddingHorizontal: 7,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  resetBtnText: {
    color: '#e4ece8',
    fontSize: 10.5,
    fontWeight: '600',
  },
  disabledControlBtn: {
    opacity: 0.4,
  },
  povSubtitleText: {
    fontSize: 10.5,
    color: '#a3c2b5',
    fontWeight: '600',
    marginTop: 2,
  },

  // ===== Chat & Design Section =====
  chatSection: {
    flex: 1.25,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e7f0e9',
    borderTopWidth: 1,
    borderTopColor: '#c8d8ce',
  },
  unattachedText: {
    fontSize: 11,
    color: '#71857c',
  },
  attachedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thumbImage: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2e6151',
  },
  attachedTextGroup: {
    flex: 1,
  },
  attachedText: {
    fontSize: 11.5,
    color: '#214f40',
    fontWeight: '700',
  },
  attachedSubtext: {
    fontSize: 10,
    color: '#4f7266',
  },
  clearImgBtn: {
    backgroundColor: '#d85140',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearImgText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  inputContainer: {
    backgroundColor: '#fbfcfb',
    borderTopWidth: 1,
    borderTopColor: '#d6dfd9',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 6,
  },
  inputBoxRow: {
    width: '100%',
  },
  inputToolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  photoBtn: {
    backgroundColor: '#2e6151',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  photoBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  textureBtn: {
    backgroundColor: '#e6eee9',
    borderWidth: 1,
    borderColor: '#c1d4c8',
    paddingHorizontal: 7,
    paddingVertical: 5.5,
    borderRadius: 6,
  },
  textureBtnActive: {
    backgroundColor: '#2e6151',
    borderColor: '#2e6151',
  },
  textureBtnText: {
    color: '#2c594b',
    fontSize: 10.5,
    fontWeight: '600',
  },
  textureBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  voiceBtn: {
    backgroundColor: '#386c87',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
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
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c4d3ca',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    lineHeight: 18,
    minHeight: 46,
    maxHeight: 85,
    color: '#1a2e29',
    textAlignVertical: 'top',
  },
  sendBtn: {
    backgroundColor: '#1b4d3e',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  cancelBtn: {
    backgroundColor: '#c44536',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  hintFooter: {
    fontSize: 10.5,
    textAlign: 'center',
    color: '#496b61',
    paddingVertical: 4,
    paddingHorizontal: 10,
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
  patientPointExploreBadge: {
    backgroundColor: '#1b3328',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#3e6a54',
  },
  patientPointExploreBadgeText: {
    color: '#a8dfc1',
    fontSize: 12,
    fontWeight: '700',
  },
  patientOverviewBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#34d399',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 3,
  },
  patientOverviewBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
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
    maxWidth: 480,
    maxHeight: '84%',
    backgroundColor: '#16241e',
    borderRadius: 20,
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
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2b4036',
    paddingBottom: 12,
    marginBottom: 10,
  },
  patientCardIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  patientCardAvatar: {
    fontSize: 34,
  },
  patientCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  patientCardSubtitle: {
    fontSize: 15,
    color: '#9ed3bd',
    fontWeight: '600',
    marginTop: 3,
  },
  patientCardCloseBtn: {
    backgroundColor: '#273b32',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3c5a4b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientCardCloseText: {
    color: '#e4f5ed',
    fontSize: 14,
    fontWeight: '800',
  },
  verifiedMemoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#193326',
    borderColor: '#2e7d4d',
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 10,
  },
  verifiedMemoryBadgeIcon: {
    fontSize: 22,
  },
  verifiedMemoryBadgeTitle: {
    color: '#6ee7b7',
    fontSize: 14.5,
    fontWeight: '800',
  },
  verifiedMemoryBadgeDesc: {
    color: '#d1fae5',
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 1,
  },
  inferredMemoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#332b17',
    borderColor: '#b48328',
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 10,
  },
  inferredMemoryBadgeIcon: {
    fontSize: 22,
  },
  inferredMemoryBadgeTitle: {
    color: '#fcd34d',
    fontSize: 14.5,
    fontWeight: '800',
  },
  inferredMemoryBadgeDesc: {
    color: '#fef3c7',
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 1,
  },
  memoryMainImageContainer: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#0f1713',
    borderWidth: 1.5,
    borderColor: '#3a5447',
  },
  memoryMainImage: {
    width: '100%',
    height: '100%',
  },
  patientCardBody: {
    maxHeight: 280,
    marginBottom: 14,
  },
  patientCardText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#ffffff',
  },
  patientCardActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  patientSpeakBtn: {
    flex: 1.2,
    backgroundColor: '#2e6b54',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#499074',
  },
  patientSpeakBtnActive: {
    backgroundColor: '#c44536',
    borderColor: '#e56b5d',
  },
  patientSpeakBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  patientReplayBtn: {
    flex: 0.9,
    backgroundColor: '#1f4838',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#3c7059',
  },
  patientReplayBtnText: {
    color: '#a3f0c4',
    fontSize: 15,
    fontWeight: '800',
  },
  patientBackRoomBtn: {
    flex: 1.1,
    backgroundColor: '#263b32',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#3c5a4b',
  },
  patientBackRoomBtnText: {
    color: '#e4efe9',
    fontSize: 15,
    fontWeight: '800',
  },
  patientGentleGuidanceBanner: {
    backgroundColor: 'rgba(20, 32, 26, 0.94)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2b4036',
    alignItems: 'center',
  },
  patientGentleGuidanceText: {
    color: '#b6e3cf',
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  patientGuideBtn: {
    backgroundColor: '#203d30',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3a6650',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientGuideBtnText: {
    color: '#d4ebd9',
    fontSize: 13,
    fontWeight: '700',
  },
  patientGuideCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#16241e',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#4d7563',
    padding: 20,
  },
  patientGuideHeader: {
    fontSize: 19,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  patientGuideSubheader: {
    fontSize: 14,
    color: '#9ed3bd',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  patientGuideItemsList: {
    gap: 12,
    marginBottom: 18,
  },
  patientGuideRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#1b2c25',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d453a',
  },
  patientGuideRowIcon: {
    fontSize: 24,
  },
  patientGuideRowTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  patientGuideRowDesc: {
    color: '#d0e5da',
    fontSize: 14,
    lineHeight: 20,
  },
  patientGuideCloseBtn: {
    backgroundColor: '#2e6b54',
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#499074',
  },
  patientGuideCloseBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
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
    paddingVertical: 5.5,
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

  // ===== Bàn phím & Tối ưu Soạn Thảo (Keyboard Visibility Fix) =====
  keyboardCollapsedViewerBar: {
    backgroundColor: '#1c2421',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2b3833',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardCollapsedViewerText: {
    color: '#95d1bd',
    fontSize: 12,
  },
  chatSectionTyping: {
    flex: 1,
  },
  actionRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dismissKeyboardBtn: {
    backgroundColor: '#e2ece6',
    borderColor: '#b4c9bf',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dismissKeyboardBtnText: {
    color: '#2d5a49',
    fontSize: 12,
    fontWeight: '700',
  },

  // ===== Caregiver Live Sync Hub =====
  liveSyncPillBtn: {
    backgroundColor: '#e6f4ea',
    borderColor: '#34a853',
    borderWidth: 1.2,
  },
  liveSyncPillText: {
    color: '#137333',
    fontWeight: '700',
  },
  syncStatusBanner: {
    backgroundColor: '#e6f4ea',
    borderColor: '#a8dab5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  syncStatusBannerText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#137333',
  },
  caregiverSectionBox: {
    backgroundColor: '#f8faf9',
    borderColor: '#dbe4df',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  caregiverSectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1e382b',
    marginBottom: 4,
  },
  caregiverSectionDesc: {
    fontSize: 11.5,
    color: '#52665b',
    marginBottom: 10,
  },
  publishRoomBtn: {
    backgroundColor: '#1b4d3e',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  publishRoomBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  caregiverReminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderColor: '#e5ece8',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  caregiverReminderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#203d30',
  },
  caregiverReminderMsg: {
    fontSize: 11,
    color: '#556b60',
    marginTop: 2,
    fontStyle: 'italic',
  },
  caregiverSendPingBtn: {
    backgroundColor: '#34a853',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  caregiverSendPingText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  caregiverQuickPingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  caregiverQuickPingChip: {
    backgroundColor: '#ffffff',
    borderColor: '#c6d8cf',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  caregiverQuickPingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2a4d3d',
  },
  caregiverCustomMsgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  caregiverMsgInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderColor: '#cfded6',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#1a2e24',
  },
  caregiverMsgSendBtn: {
    backgroundColor: '#1b4d3e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  caregiverMsgSendText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // ===== Patient Mode Gentle Reminder Banner =====
  patientReminderCard: {
    backgroundColor: '#fffdf5',
    borderColor: '#e8c976',
    borderWidth: 2,
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  patientReminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientReminderIcon: {
    fontSize: 28,
  },
  patientReminderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7a4e0a',
    letterSpacing: 0.3,
  },
  patientReminderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2e2617',
    marginTop: 2,
    lineHeight: 20,
  },
  patientReminderDismissBtn: {
    backgroundColor: '#2e7d32',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  patientReminderDismissText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
